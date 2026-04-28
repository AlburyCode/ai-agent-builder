---
applyTo: "backend/src/routes/**"
---

# Instrucciones para routes Express — AI Agent Builder

Aplica estas reglas a TODOS los archivos en `backend/src/routes/`.

---

## Responsabilidad de las rutas

Los archivos de rutas **solo** definen:
1. La URL y el método HTTP
2. Los middlewares que se aplican
3. El controlador que maneja la petición

No contienen lógica de negocio.

---

## Patrón estándar de un router

```typescript
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import * as controller from '../controllers/my.controller';

const router = Router();

// Rutas protegidas (requieren token JWT)
router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getOne);
router.post('/', authenticate, controller.create);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.remove);

export default router;
```

---

## Qué rutas son públicas vs protegidas en este proyecto

| Ruta                  | ¿Lleva `authenticate`? | Razón                              |
|-----------------------|------------------------|------------------------------------|
| `POST /auth/register` | ❌ No                  | Ruta pública para registro         |
| `POST /auth/login`    | ❌ No                  | Ruta pública para login            |
| `POST /chat/message`  | ❌ No                  | La usa el widget sin autenticación |
| `GET /agents`         | ✅ Sí                  | Solo el dueño ve sus agentes       |
| `POST /agents`        | ✅ Sí                  | Requiere usuario autenticado       |
| `PUT /agents/:id`     | ✅ Sí                  | Requiere usuario autenticado       |
| `DELETE /agents/:id`  | ✅ Sí                  | Requiere usuario autenticado       |
| `GET /documents/:agentId` | ✅ Sí             | Requiere usuario autenticado       |
| `POST /documents/upload` | ✅ Sí              | Requiere usuario autenticado       |

---

## Registro de rutas — `api.router.ts` + `index.ts`

Las rutas **no se registran directamente en `index.ts`**. En su lugar existe un archivo
`src/routes/api.router.ts` que actúa como agregador central de todos los routers.
`index.ts` solo importa ese único router.

### `src/routes/api.router.ts`

```typescript
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import authRoutes from './auth.routes';
import agentRoutes from './agent.routes';
import documentRoutes from './document.routes';
import conversationRoutes from './conversation.routes';
import chatRoutes from './chat.routes';

const router = Router();

// Rutas públicas — sin middleware de autenticación
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes); // el widget la usa sin usuario autenticado

// Rutas protegidas — con middleware de autenticación
router.use('/agents', authenticate, agentRoutes);
router.use('/documents', authenticate, documentRoutes);
router.use('/conversations', authenticate, conversationRoutes);

export default router;
```

### `src/index.ts` — solo importa `apiRouter`

```typescript
import apiRouter from './routes/api.router';

// ...

app.use(apiRouter);
```

> **Regla**: cuando se añade una nueva funcionalidad con su propio router, se registra
> en `api.router.ts`, nunca directamente en `index.ts`.

---

## ⚠️ REGLA CRÍTICA — Las rutas NUNCA llaman al service directamente

Siempre debe existir un controller que actúe de intermediario entre la ruta y el service.
Llamar al service directamente desde una ruta viola la separación de capas, mezcla
responsabilidades y deja el manejo de errores HTTP fuera del lugar correcto.

```typescript
// ✅ CORRECTO — la ruta solo delega al controller
import * as myController from '../controllers/my.controller';
router.get('/agent/:agentId', myController.getByAgent);
router.get('/:id', myController.getById);

// ❌ INCORRECTO — la ruta accede al service directamente
import * as myService from '../services/my.service';
router.get('/agent/:agentId', async (req, res) => {
  const items = await myService.getByAgent(+req.params.agentId);
  res.json(items);
});
```

Para **cada** router (auth, agents, documents, conversations, chat) debe existir
su controller correspondiente en `backend/src/controllers/`.

---

## Multer para upload de archivos

Configurar `multer` con `memoryStorage()` — **nunca** `diskStorage()`.
Los archivos se envían directamente a OpenAI desde el buffer en memoria.

```typescript
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB máximo
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain',
                     'application/msword',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// Aplicar a la ruta de upload
router.post('/upload', authenticate, upload.single('file'), documentController.upload);
```
