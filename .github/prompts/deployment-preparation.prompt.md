---
mode: agent
description: Prepara el proyecto completo (backend, frontend, widget) para despliegue en Vercel. Aplica todas las configuraciones necesarias de variables de entorno, vercel.json, y ajustes de código para que funcione correctamente tanto en local como en producción.
---

Prepara este proyecto para despliegue en Vercel. Son tres proyectos independientes: `backend/`, `frontend/` y `widget/`. Aplica TODOS los cambios siguientes sin preguntar, en el orden indicado.

---

## 1. BACKEND

### 1.1 `backend/src/config/database.ts`
Asegúrate de que usa `dialectModule: pg` (para evitar el error "Please install pg package manually" en Vercel) y `dialectOptions` con SSL condicional según `DB_SSL`:

```typescript
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  dialectModule: pg,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'aiagentbuilder',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  logging: false,
  dialectOptions: process.env.DB_SSL === 'false' ? {} : {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export default sequelize;
```

### 1.2 `backend/src/index.ts`
- CORS dinámico con `FRONTEND_URL` (nunca `origin: '*'`).
- `app.listen()` y `sequelize.sync()` SOLO cuando `!process.env.VERCEL`.
- NO importar `path` ni servir archivos estáticos del widget (el widget tiene su propio proyecto).
- `export default app` al final.

```typescript
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import sequelize from './config/database';
import './models/index';
import apiRouter from './routes/api.router';

const app = express();
const PORT = process.env.PORT ?? 3000;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para el origen: ${origin}`));
  },
  credentials: true
}));
app.use(express.json());

app.use(apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

if (!process.env.VERCEL) {
  sequelize.authenticate()
    .then(() => sequelize.sync({ alter: true }))
    .then(() => {
      console.log('✅ Base de datos sincronizada');
      app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
    })
    .catch((error) => {
      console.error('❌ Error al arrancar el servidor:', error);
      process.exit(1);
    });
}

export default app;
```

### 1.3 `backend/vercel.json`
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node",
      "config": { "bundle": false }
    }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "src/index.ts" }
  ]
}
```

> `"bundle": false` es obligatorio. Sin él ncc no resuelve el `require('pg')` dinámico de Sequelize.
> `src/index.ts` (no `dist/index.js`) porque `dist/` está en `.gitignore`.

### 1.4 `backend/.env.example`
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aiagentbuilder
DB_USER=postgres
DB_PASSWORD=
DB_SSL=false
JWT_SECRET=cambia_esto_por_un_secreto_seguro
OPENAI_API_KEY=sk-...
FRONTEND_URL=http://localhost:4200
```

### 1.5 `backend/src/config/schema.sql` (crear tablas en producción)
Crea este archivo para ejecutarlo manualmente en el SQL Editor de Neon/Supabase:

```sql
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         user_role    NOT NULL DEFAULT 'admin',
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  instructions          TEXT,
  "openaiVectorStoreId" VARCHAR(255),
  "userId"              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id             SERIAL PRIMARY KEY,
  "agentId"      INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "fileName"     VARCHAR(255) NOT NULL,
  "fileType"     VARCHAR(255),
  "openaiFileId" VARCHAR(255) NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id          SERIAL PRIMARY KEY,
  "agentId"   INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "userId"    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  messages    JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. FRONTEND

### 2.1 `frontend/src/environments/environment.ts` (local)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  widgetUrl: 'http://localhost:5173'
};
```

### 2.2 `frontend/src/environments/environment.prod.ts` (generado por set-env.js)
```typescript
// Este fichero se genera automáticamente antes del build mediante scripts/set-env.js
// No editar manualmente — los cambios se sobreescriben en cada npm run build
export const environment = {
  production: true,
  apiUrl: 'http://localhost:3000',
  widgetUrl: 'http://localhost:5173'
};
```

### 2.3 `frontend/scripts/set-env.js` (crear directorio scripts/ si no existe)
```js
const fs   = require('fs');
const path = require('path');

const apiUrl    = process.env.API_URL    || 'http://localhost:3000';
const widgetUrl = process.env.WIDGET_URL || 'http://localhost:5173';

const content = `// Este fichero se genera automáticamente antes del build mediante scripts/set-env.js
// No editar manualmente — los cambios se sobreescriben en cada npm run build
export const environment = {
  production: true,
  apiUrl: '${apiUrl}',
  widgetUrl: '${widgetUrl}'
};
`;

const targetPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(targetPath, content, 'utf8');
console.log('✅ environment.prod.ts generado con API_URL:', apiUrl, '| WIDGET_URL:', widgetUrl);
```

### 2.4 `frontend/package.json` — actualizar script build
```json
"build": "node scripts/set-env.js && ng build"
```

### 2.5 `frontend/angular.json` — añadir fileReplacements en configuración production
Dentro de `architect.build.configurations.production`, añadir:
```json
"fileReplacements": [
  {
    "replace": "src/environments/environment.ts",
    "with": "src/environments/environment.prod.ts"
  }
]
```

### 2.6 `frontend/vercel.json`
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 2.7 Componentes que usan URLs hardcodeadas
Busca en `frontend/src/` cualquier aparición de `http://localhost:5173` o `http://localhost:3000` hardcodeada en componentes TypeScript y sustitúyelas por `environment.apiUrl` o `environment.widgetUrl` importando desde `../../../environments/environment`.

---

## 3. WIDGET

### 3.1 `widget/src/widget.js` — primera línea del IIFE
```js
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
```

### 3.2 `widget/.env`
```env
VITE_BACKEND_URL=http://localhost:3000
```

### 3.3 `widget/.env.example`
```env
VITE_BACKEND_URL=http://localhost:3000
```

### 3.4 `widget/vercel.json`
```json
{
  "headers": [
    {
      "source": "/widget.js",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Cache-Control", "value": "public, max-age=86400" }
      ]
    }
  ]
}
```

---

## 4. VERIFICACIÓN FINAL

Después de aplicar todos los cambios, comprueba que no hay errores TypeScript en:
- `backend/src/config/database.ts`
- `backend/src/index.ts`
- `frontend/src/environments/environment.ts`
- Cualquier componente que importe `environment`

---

## 5. INSTRUCCIONES PARA VERCEL (NO modificar código — solo configurar en el dashboard)

### Proyecto backend
| Variable | Valor en producción |
|---|---|
| `DB_HOST` | host de Neon/Supabase |
| `DB_PORT` | `5432` |
| `DB_NAME` | nombre de la BD |
| `DB_USER` | usuario |
| `DB_PASSWORD` | contraseña |
| `JWT_SECRET` | secreto seguro de 64+ chars |
| `OPENAI_API_KEY` | `sk-proj-...` |
| `FRONTEND_URL` | `https://tu-frontend.vercel.app` |
| `DB_SSL` | **NO añadir** — su ausencia activa SSL |

En **Settings → Deployment Protection**: desactivar **Vercel Authentication**.  
En **Settings → General → Build & Development Settings**: Build Command y Output Directory **vacíos**.

### Proyecto frontend
| Variable | Valor en producción |
|---|---|
| `API_URL` | `https://tu-backend.vercel.app` |
| `WIDGET_URL` | `https://tu-widget.vercel.app` |

Build Command: `npm run build` — Output Directory: `dist/frontend/browser`

### Proyecto widget
| Variable | Valor en producción |
|---|---|
| `VITE_BACKEND_URL` | `https://tu-backend.vercel.app` |

Build Command: `npm run build` — Output Directory: `dist`
