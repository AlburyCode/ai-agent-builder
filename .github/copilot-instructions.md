# GitHub Copilot — Instrucciones globales del proyecto AI Agent Builder

Este fichero se carga automáticamente en cada conversación con GitHub Copilot
dentro de este workspace. Respeta estas instrucciones en TODAS las respuestas.

---

## 🗂️ Stack tecnológico

| Capa        | Tecnología                                              |
|-------------|---------------------------------------------------------|
| Backend     | Node.js · Express · TypeScript (ES2020/commonjs)        |
| ORM         | Sequelize v6 + PostgreSQL (pg, pg-hstore)               |
| Auth        | bcryptjs (saltRounds: 10) + jsonwebtoken (expiración 7d)|
| Frontend    | Angular 17+ standalone components                       |
| UI          | Angular Material (tema Indigo/Pink)                     |
| IA          | OpenAI Responses API — `file_search` + Vector Stores, nunca `code_interpreter` |
| Widget      | JavaScript nativo + Vite (sin frameworks)               |

---

## 📁 Estructura de carpetas del proyecto

```
/
├── backend/
│   └── src/
│       ├── config/       ← conexión Sequelize (database.ts)
│       ├── models/       ← modelos Sequelize (User, Agent, Document, Conversation)
│       ├── services/     ← lógica de negocio (auth, agent, document, conversation, openai)
│       ├── controllers/  ← handlers HTTP (extrae req/res, delega a services)
│       ├── routes/       ← mapeo URL → controller (auth, agents, documents, chat)
│       ├── middlewares/  ← authenticate JWT
│       └── index.ts      ← entry point, sync Sequelize, registra rutas
├── frontend/
│   └── src/app/
│       ├── features/     ← pantallas (auth, agents, documents, chat, widget-config)
│       ├── core/
│       │   ├── services/      ← api.service, auth.service, agent.service, etc.
│       │   ├── interceptors/  ← auth.interceptor.ts
│       │   ├── guards/        ← auth.guard.ts
│       │   └── models/        ← interfaces TypeScript (User, Agent, Document, etc.)
│       └── shared/
│           └── components/    ← componentes reutilizables
└── widget/
    └── src/               ← JavaScript nativo, CSS puro, Shadow DOM
```

---

## 📦 SCRIPTS DE `package.json` — Backend Node.js/TypeScript

Siempre que se cree o configure un backend Node.js + TypeScript, el `package.json` debe incluir **exactamente** estos tres scripts:

```json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

| Script | Uso |
|--------|-----|
| `dev` | Desarrollo: nodemon observa `src/` y reinicia automáticamente al guardar; ts-node ejecuta TypeScript sin compilar |
| `build` | Pre-producción: compila TypeScript → JavaScript en `dist/` |
| `start` | Producción: arranca el servidor desde el JS compilado |

No variar estos scripts entre proyectos. Siempre `npm run dev` para desarrollo local.

---

## ⚙️ CONFIGURACIÓN `tsconfig.json`

### Backend (Node.js + Express + TypeScript)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

| Opción | Por qué |
|--------|---------|
| `target: ES2020` | Node.js ≥ 14 soporta ES2020 nativo; no hace falta bajar a ES5 |
| `module: commonjs` | Sistema de módulos de Node.js (`require`/`module.exports`) |
| `lib: ["ES2020"]` | Solo APIs de servidor; sin `dom` (no hay navegador) |
| `strict: true` | Activa todas las comprobaciones de tipos estrictas |
| `esModuleInterop: true` | Permite `import x from 'paquete'` con paquetes CommonJS |
| `skipLibCheck: true` | Omite la verificación de `.d.ts` en `node_modules`; acelera la compilación |
| `forceConsistentCasingInFileNames` | Evita errores de mayúsculas/minúsculas entre Windows y Linux |
| `resolveJsonModule: true` | Permite importar archivos `.json` |

### Frontend (Angular 17+)

`ng new` genera el `tsconfig.json` automáticamente. Las opciones clave que deben estar presentes:

| Opción | Por qué |
|--------|---------|
| `target/module: ES2022` | Angular CLI usa esbuild; no necesita bajar a ES5 (el bundler lo hace para los navegadores objetivo) |
| `moduleResolution: bundler` | Delega la resolución de módulos a esbuild; obligatorio con `module: ES2022` |
| `lib: ["ES2022", "dom"]` | Incluye las APIs del navegador (DOM, fetch, localStorage…) |
| `isolatedModules: true` | Cada archivo se compila independientemente; requerido por esbuild, acelera la compilación incremental |
| `experimentalDecorators: true` | Requerido para `@Component`, `@Injectable`, `@Input`, etc. |
| `sourceMap: true` | Permite depurar TypeScript directamente en las DevTools del navegador |
| `strictTemplates: true` | Detecta errores de tipos dentro de las plantillas HTML |

---

## ⚠️ ERRORES CONOCIDOS — Respetar SIEMPRE

Estas restricciones son el resultado de errores detectados en proyectos anteriores
con este mismo stack. Aplicar en TODOS los archivos generados.

### 1. Hook Sequelize: `beforeValidate`, NUNCA `beforeCreate`

```typescript
// ✅ CORRECTO — cubre creación Y actualización
User.addHook('beforeValidate', async (user: User) => {
  if (user.changed('password') && user.password && !user.password.startsWith('$2')) {
    user.password = await bcryptjs.hash(user.password, 10);
  }
});

// ❌ INCORRECTO
User.addHook('beforeCreate', async (user: User) => { ... });
```

**Razón doble** (aplica independientemente del esquema):

| Escenario | Por qué `beforeValidate` |
|-----------|--------------------------|
| `password` VIRTUAL + `passwordHash` real | `passwordHash` es `null` durante `validate(allowNull)` si se usa `beforeCreate`; resultado: `notNull Violation` |
| `password` columna real (esquema actual) | `beforeCreate` no se dispara en updates; una contraseña cambiada con `user.save()` quedaría en texto plano en la BD |

---

### 2. `req.params.id` siempre convertir a número

```typescript
// ✅ CORRECTO
const item = await Model.findByPk(+req.params.id);
const item = await Model.findByPk(parseInt(req.params.id, 10));

// ❌ INCORRECTO — req.params.id es string, Sequelize puede devolver null o comportarse mal
const item = await Model.findByPk(req.params.id);
```

---

### 3. Conexión Sequelize: formato objeto con variables individuales, NUNCA `DATABASE_URL`

```typescript
// ✅ CORRECTO
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'aiagentbuilder',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  logging: false,
});

// ❌ INCORRECTO — DATABASE_URL como string dificulta cambiar parámetros individuales
const sequelize = new Sequelize(process.env.DATABASE_URL as string, { dialect: 'postgres' });
```

Variables de entorno correspondientes en `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aiagentbuilder
DB_USER=postgres
DB_PASSWORD=
```

---

### 5. Angular FormGroup: declarar con `!` e inicializar en el constructor

```typescript
// ✅ CORRECTO
export class MyComponent {
  form!: FormGroup;
  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({ ... });
  }
}

// ❌ INCORRECTO — TS2729: property used before initialization
export class MyComponent {
  form = this.fb.group({ ... }); // fb no existe todavía como propiedad inyectada
}
```

---

### 5. Angular: interceptor funcional (`HttpInterceptorFn`), NUNCA clase

```typescript
// ✅ CORRECTO
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
// Registrar: provideHttpClient(withInterceptors([authInterceptor]))

// ❌ INCORRECTO — clase HttpInterceptor deprecada en Angular 14+
```

---

### 6. Angular: guard funcional (`CanActivateFn`), NUNCA clase

```typescript
// ✅ CORRECTO
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

// ❌ INCORRECTO — clase CanActivate deprecada
```

---

### 5. Angular interceptor — capturar 401 y llamar `authService.logout()`

El interceptor de autenticación **debe** capturar las respuestas 401 y cerrar la sesión automáticamente.
Sin esto, un token inválido o expirado en `localStorage` provoca que todas las peticiones fallen
con 401 indefinidamente sin redirigir al login.

```typescript
// ✅ CORRECTO — authInterceptor con manejo de 401
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();  // ← limpia localStorage y redirige al login
      }
      return throwError(() => error);
    })
  );
};

// ❌ INCORRECTO — interceptor sin manejo de 401
// El usuario queda atrapado con un token inválido sin poder navegar
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);  // ← nunca llama a logout() si el servidor devuelve 401
};
```

**Razón**: el token JWT tiene 7 días de expiración. Si el usuario cierra sesión desde otro dispositivo
o se invalida el token manualmente, el navegador seguirá usando el token del `localStorage`.
Cada petición devolverá 401 y la app quedará bloqueada sin feedback visible.

---

### 6. Routes Express — NUNCA llamar al service directamente, siempre a través del controller

```typescript
// ✅ CORRECTO — la ruta delega al controller
import * as conversationController from '../controllers/conversation.controller';
router.get('/agent/:agentId', conversationController.getByAgent);

// ❌ INCORRECTO — la ruta llama al service directamente
import * as conversationService from '../services/conversation.service';
router.get('/agent/:agentId', async (req, res) => {
  const conversations = await conversationService.getConversationsByAgent(+req.params.agentId);
  res.json(conversations);
});
```

**Razón**: la arquitectura de capas exige que el controller sea el único punto de contacto entre
HTTP y la lógica de negocio. Saltarse el controller mezcla responsabilidades, dificulta el
testing y provoca que el manejo de errores quede inconsistente.

---

### 7. Angular `provideAnimationsAsync()`, no `provideAnimations()`

```typescript
// ✅ CORRECTO
bootstrapApplication(AppComponent, {
  providers: [
    provideAnimationsAsync(),  // requerido por Angular Material
    provideHttpClient(withInterceptors([authInterceptor])),
    ...
  ]
});
```

---

## 🏗️ CONVENCIONES DE ARQUITECTURA

### Backend — separación en capas

```
Route (HTTP)  →  Controller (extrae req/res)  →  Service (lógica)  →  Model (BD)
```

- **Routes**: solo definen URL, método HTTP y middleware aplicado. No contienen lógica.
- **Controllers**: extraen datos de req.body/params/user, validan presencia, llaman al service, devuelven res.
- **Services**: contienen toda la lógica de negocio. Reciben parámetros planos (no req/res). Lanzan Error si algo falla.
- **Models**: definición de entidades Sequelize. Solo contienen la definición del modelo y sus hooks.

### Frontend Angular — reglas de componentes

- Todos los componentes: `standalone: true`
- Nunca `NgModules`
- Siempre 3 ficheros por componente: `.component.ts`, `.component.html`, `.component.scss`
- Nunca templates inline (`template: '...'`)
- Nunca estilos inline (`styles: ['...']`)
- Importar dependencias en el `imports[]` del decorador `@Component`

---

## 🔒 SEGURIDAD

- **JWT_SECRET**: leer siempre de `process.env.JWT_SECRET`. Nunca hardcoded.
- **Credenciales de auth**: usar el mismo mensaje de error para "usuario no encontrado" y "contraseña incorrecta" (`'Credenciales inválidas'`). No revelar qué campo es incorrecto.
- **req.body**: no actualizar entidades directamente con `Model.update(req.body)`. Extraer solo los campos permitidos explícitamente.
- **OpenAI files**: los archivos se suben directamente a OpenAI API. El backend solo guarda el `fileId` en PostgreSQL. Nunca almacenar archivos en disco o en el servidor.
- **CORS**: en producción, no usar `origin: '*'`. Usar la variable de entorno `FRONTEND_URL`.

---

## 🤖 INTEGRACIÓN OPENAI

- Usar `openai.responses.create` con historial en `input[]`, `instructions` y `tools: [{ type: 'file_search', vector_store_ids }]` para el chat
- Herramienta habilitada: solo `file_search` vía `tools: [{ type: 'file_search', vector_store_ids: [...] }]`. **Nunca** `code_interpreter`.
- El campo `openaiVectorStoreId` en el modelo `Agent` puede ser `null` inicialmente. Se rellena automáticamente al subir el primer documento al agente.
- Los `openaiFileId` de los documentos se necesitan para configurar el `vector_store` del Assistant.
- El endpoint `/chat/message` usa `optionalAuthenticate`, **no** `authenticate`. Esto permite que el widget lo llame sin token y que el backoffice lo llame con token, grabando `userId` en la conversación en ambos casos correctamente.

---

### 8. `/chat/message`: `optionalAuthenticate`, NUNCA `authenticate` ni sin middleware

El endpoint de chat es consumido tanto por el widget (sin JWT) como por el backoffice (con JWT). El middleware correcto es `optionalAuthenticate`: parsea el token si existe pero nunca rechaza la petición si falta.

```typescript
// ✅ CORRECTO — auth.middleware.ts
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: number; email: string; role: string };
    } catch { /* token inválido — se ignora, req.user queda undefined */ }
  }
  next(); // siempre continúa
};

// ✅ CORRECTO — chat.routes.ts
router.post('/message', optionalAuthenticate, chatController.sendMessage);

// ✅ CORRECTO — conversation.service.ts
// getOrCreateConversation acepta userId opcional
export const getOrCreateConversation = async (
  conversationId: number | undefined,
  agentId: number,
  userId?: number       // ← undefined si widget anónimo, número si backoffice autenticado
): Promise<Conversation> => {
  ...
  return await Conversation.create({ agentId, userId: userId ?? null, messages: [] });
};

// ✅ CORRECTO — chat.controller.ts
const conversation = await conversationService.getOrCreateConversation(
  conversationId, agentId, req.user?.userId  // undefined si widget, número si backoffice
);

// ❌ INCORRECTO — sin middleware: req.user siempre undefined → userId nunca se graba
router.post('/message', chatController.sendMessage);

// ❌ INCORRECTO — con authenticate: el widget (sin token) recibe 401
router.post('/message', authenticate, chatController.sendMessage);
```

**Resultado en BD:**
| Origen | `userId` en `conversations` |
|--------|---------------------------|
| Widget (sin JWT) | `NULL` |
| Backoffice (con JWT) | `<id del usuario>` |

Esto permite que `GET /conversations/agent/:id` (ruta protegida con `authenticate`) filtre con `WHERE agentId=X AND userId=<token.userId>` y devuelva solo las conversaciones del usuario autenticado, nunca las anónimas del widget.

---

### 9. Proceso Node.js zombie — cambios de código sin efecto en el backend

Si modificas código del backend y los cambios no tienen ningún efecto en las respuestas HTTP, la causa más probable es que haya **dos procesos Node.js** corriendo en el mismo puerto: el antiguo (con código obsoleto) y el nuevo (con el código correcto). El proceso antiguo gana y todas las peticiones van a él.

**Diagnóstico en Windows (PowerShell):**

```powershell
# Ver qué procesos escuchan en el puerto 3000
netstat -ano | findstr :3000

# Comprobar cuándo arrancó cada proceso (el más antiguo es el zombie)
Get-Process -Id <PID> | Select-Object StartTime

# Matar el proceso antiguo
Stop-Process -Id <PID> -Force
```

**Síntoma característico:** nodemon muestra "restarting due to changes" pero el comportamiento de la API no cambia (ej. `userId` sigue siendo `null` tras añadir `optionalAuthenticate`).

**Solución rápida:** matar todos los procesos node y reiniciar:

```powershell
taskkill /f /im node.exe   # Windows
```

**Regla:** cuando un cambio de backend no se refleja en las pruebas, verificar SIEMPRE que solo hay un proceso escuchando en el puerto antes de buscar el error en el código.

---

### 10. Angular `ngOnInit`: nunca dejarlo vacío tras un refactor

Si un componente que carga datos en `ngOnInit` se refactoriza y la llamada a la API desaparece accidentalmente, el resultado es una pantalla en blanco sin error en consola (el array `[]` es válido para Angular).

```typescript
// ❌ INCORRECTO — ngOnInit vacío tras refactor: pantalla en blanco, sin error
ngOnInit(): void {
  this.agentId = +this.route.snapshot.params['id'];
  // la llamada a la API fue borrada durante el refactor
}

// ✅ CORRECTO — ngOnInit siempre carga los datos del componente
ngOnInit(): void {
  this.agentId = +this.route.snapshot.params['id'];
  this.loadData();  // ← nunca olvidar esto al refactorizar
}
```

**Regla:** después de cualquier refactor de un componente que usa datos remotos, verificar que `ngOnInit` sigue teniendo la llamada de carga de datos.

---

### 11. Chat viewer — aplanar TODAS las conversaciones con `flatMap`

El visor de chat del backoffice debe mostrar todos los mensajes de todas las conversaciones pasadas del usuario en orden cronológico, no solo los de la más reciente.

```typescript
// ❌ INCORRECTO — solo muestra la conversación más reciente
this.messages = conversations[0].messages;

// ✅ CORRECTO — aplanar todas las conversaciones en orden cronológico (ASC)
// El backend devuelve en DESC (más reciente primero), invertir para mostrar ASC
const sorted = [...conversations].reverse();
this.conversationId = conversations[0].id;  // más reciente para nuevos mensajes
this.messages = sorted.flatMap(c => c.messages);
```

El `conversationId` apunta a la conversación más reciente (para que los mensajes nuevos se añadan a ella), pero el historial mostrado incluye todos los intercambios anteriores del usuario con ese agente.

---

### 12. Widget — `__AI_WIDGET_CONFIG__` tiene prioridad sobre `data-*`

Cuando el backoffice abre el widget de prueba con `window.open('/widget/index.html?agentId=X&...')`, el `widget.js` debe leer los parámetros de la URL **con prioridad** sobre los atributos `data-*` del script tag. Si no, el `data-agent-id` hardcodeado en `index.html` siempre gana.

**En `widget/index.html`:** exponer los query params como `window.__AI_WIDGET_CONFIG__` antes de cargar el script:

```html
<script>
  const p = new URLSearchParams(location.search);
  if (p.get('agentId')) {
    window.__AI_WIDGET_CONFIG__ = {
      agentId:  p.get('agentId'),
      color:    p.get('color')    || '#1976d2',
      position: p.get('position') || 'bottom-right',
      title:    p.get('title')    || '¿En qué puedo ayudarte?'
    };
  }
</script>
<script src="/src/widget.js" data-agent-id="1" data-color="#1976d2"></script>
```

**En `widget/src/widget.js`:** dar prioridad a `__AI_WIDGET_CONFIG__` sobre los `data-*`:

```javascript
// ✅ CORRECTO — __AI_WIDGET_CONFIG__ tiene prioridad (lo envía el backoffice)
const cfg = window.__AI_WIDGET_CONFIG__ || {};
const agentId = parseInt(
  cfg.agentId || currentScript.getAttribute('data-agent-id') || '1', 10
);
const color = cfg.color || currentScript.getAttribute('data-color') || '#1976d2';

// ❌ INCORRECTO — data-agent-id siempre gana, el parámetro del backoffice se ignora
const agentId = parseInt(currentScript.getAttribute('data-agent-id'), 10);
```

---

### 13. Widget — versión de Vite según versión de Node.js

Vite 6+ usa Rolldown (bundler en Rust) y requiere Node.js ≥ 20.19 o ≥ 22.12. Con versiones anteriores (ej. v20.15) falla con `Cannot find native binding (@rolldown/binding-win32-x64-msvc)`.

| Node.js instalado | Vite a instalar | Comando |
|---|---|---|
| < 20.19 (ej. v20.15) | Vite 5.4.x | `npm install -D vite@^5.4.0` |
| ≥ 20.19 o ≥ 22.12 | Vite 5, 6 u 8 | `npm install -D vite` |

```bash
# Verificar versión de Node antes de instalar:
node --version

# ✅ CORRECTO para Node < 20.19
npm install -D vite@^5.4.0

# ❌ INCORRECTO con Node < 20.19 — puede instalar Vite 6/8 y fallar
npm install -D vite
```

Si ya se instaló la versión incorrecta:
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install -D vite@^5.4.0
```

---

## 🗄️ SEQUELIZE — Convenciones de modelos

```typescript
// Estructura estándar de un modelo
class EntityName extends Model<EntityNameAttributes, EntityNameCreationAttributes>
  implements EntityNameAttributes {
  public id!: number;
  // ... campos

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EntityName.init({ ... }, {
  sequelize,
  tableName: 'entity_names',  // snake_case plural
  hooks: {
    beforeValidate: async (instance) => { ... }  // SIEMPRE beforeValidate para mutaciones
  }
});
```

---

## 📐 MODELO DE DATOS

```
User  1─────────N  Agent  1────────N  Document
                    │
                    └──────────N  Conversation
```

| Modelo       | Tabla           | Relación                         |
|--------------|-----------------|----------------------------------|
| User         | users           | hasMany Agent                    |
| Agent        | agents          | belongsTo User; hasMany Document; hasMany Conversation |
| Document     | documents       | belongsTo Agent; fileId en OpenAI|
| Conversation | conversations   | belongsTo Agent; messages: JSON[]|

---

## 🔗 RUTAS DE LA API

| Método | Ruta                    | Auth | Descripción                        |
|--------|-------------------------|------|------------------------------------|
| POST   | /auth/register          | No   | Registro de usuario                |
| POST   | /auth/login             | No   | Login, devuelve JWT                |
| GET    | /agents                 | Sí   | Agentes del usuario autenticado    |
| POST   | /agents                 | Sí   | Crear agente                       |
| PUT    | /agents/:id             | Sí   | Actualizar agente                  |
| DELETE | /agents/:id             | Sí   | Eliminar agente                    |
| GET    | /documents/:agentId     | Sí   | Documentos de un agente            |
| POST   | /documents/upload       | Sí   | Subir doc a OpenAI, guardar fileId |
| POST   | /chat/message           | No   | Chat con el agente (widget + backoffice) |
