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
// ✅ CORRECTO
User.addHook('beforeValidate', async (user: User) => {
  if (user.changed('password') && user.password && !user.password.startsWith('$2')) {
    user.password = await bcryptjs.hash(user.password, 10);
  }
});

// ❌ INCORRECTO — passwordHash es null cuando Sequelize valida allowNull: false
User.addHook('beforeCreate', async (user: User) => { ... });
```

**Razón**: Sequelize ejecuta el orden `beforeValidate → validate (allowNull) → beforeCreate → INSERT`.
Si el hash está en `beforeCreate`, la validación `allowNull: false` ya ha fallado antes.

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
- El endpoint `/chat/message` es **público** (no lleva middleware `authenticate`). Lo usa el widget embebible sin autenticación.

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
