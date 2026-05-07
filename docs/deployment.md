# Guía de despliegue — AI Agent Builder

Este proyecto se compone de tres aplicaciones independientes que se despliegan por separado en Vercel:

| Proyecto | Directorio | Tipo |
|---|---|---|
| **Backend** | `backend/` | Node.js + Express + TypeScript |
| **Frontend** | `frontend/` | Angular 17 SPA |
| **Widget** | `widget/` | Vite IIFE (JavaScript nativo) |

---

## Arquitectura de URLs en producción

```
Usuario final
  └── Widget embebido  →  https://widget.vercel.app/widget.js
  └── Backoffice        →  https://frontend.vercel.app
                               └──→ API  →  https://backend.vercel.app
```

---

## 1. Preparación previa: base de datos PostgreSQL

El backend requiere una instancia de PostgreSQL accesible desde Vercel. Las opciones recomendadas son:

- **Neon** (https://neon.tech) — plan gratuito, serverless, compatible con Vercel.
- **Supabase** (https://supabase.com) — plan gratuito con PostgreSQL administrado.
- **Vercel Postgres** — integración nativa dentro del dashboard de Vercel.

Una vez creada la base de datos, tendrás las credenciales (`host`, `port`, `database`, `user`, `password`) que necesitarás en las variables de entorno del backend.

---

## 2. Despliegue del Backend

### 2.1 Configuración en Vercel

1. Importa el repositorio en Vercel.
2. En **Root Directory** escribe: `backend`
3. En **Framework Preset** selecciona: `Other`
4. Establece los siguientes valores de build:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. En **Settings → Environment Variables** añade:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DB_HOST` | Host de PostgreSQL | `ep-xxx.neon.tech` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_NAME` | Nombre de la base de datos | `aiagentbuilder` |
| `DB_USER` | Usuario de la base de datos | `postgres` |
| `DB_PASSWORD` | Contraseña de la base de datos | `supersecreta` |
| `JWT_SECRET` | Secreto para firmar JWT (mín. 64 chars) | `genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `OPENAI_API_KEY` | Clave de API de OpenAI | `sk-proj-...` |
| `FRONTEND_URL` | URL del frontend en producción | `https://tu-frontend.vercel.app` |

> Para múltiples orígenes en `FRONTEND_URL`, separa con comas:  
> `https://tu-frontend.vercel.app,https://tu-dominio-custom.com`

### 2.2 Archivo `vercel.json` recomendado

Crea `backend/vercel.json` para que Vercel enrute todas las peticiones al servidor Express:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ]
}
```

### 2.3 Cómo funciona en local

1. Copia `.env.example` como `.env` en `backend/`.
2. Rellena las variables con tus valores locales.
3. Arranca con `npm run dev`.

---

## 3. Despliegue del Frontend (Angular)

### 3.1 Cómo funciona el build con variables de entorno

Antes de compilar, el script `scripts/set-env.js` lee la variable de entorno `API_URL` y genera automáticamente `src/environments/environment.prod.ts`. Angular sustituye `environment.ts` por `environment.prod.ts` durante el build de producción gracias al `fileReplacements` configurado en `angular.json`.

Flujo completo del build:
```
API_URL=https://tu-backend.vercel.app
  └── npm run build
        └── node scripts/set-env.js   ← escribe environment.prod.ts
        └── ng build                  ← compila usando environment.prod.ts
```

### 3.2 Configuración en Vercel

1. Importa el repositorio en Vercel.
2. En **Root Directory** escribe: `frontend`
3. En **Framework Preset** selecciona: `Angular`
4. Establece los siguientes valores de build:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/frontend/browser`
   - **Install Command**: `npm install`
5. En **Settings → Environment Variables** añade:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `API_URL` | URL del backend en producción | `https://tu-backend.vercel.app` |

### 3.3 Archivo `vercel.json` recomendado

Crea `frontend/vercel.json` para que Angular Router funcione correctamente (SPA con rutas cliente):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 3.4 Cómo funciona en local

- `environment.ts` (desarrollo) apunta siempre a `http://localhost:3000`.
- `environment.prod.ts` solo se usa en `npm run build` (producción).
- Arranca con `npm start` (ng serve usa `environment.ts` directamente).

---

## 4. Despliegue del Widget

### 4.1 Cómo funciona la variable de entorno

Vite sustituye `import.meta.env.VITE_BACKEND_URL` en tiempo de build por el valor real de la variable. El resultado es un archivo `widget.js` IIFE con la URL hardcodeada correctamente para cada entorno.

### 4.2 Configuración en Vercel

1. Importa el repositorio en Vercel.
2. En **Root Directory** escribe: `widget`
3. En **Framework Preset** selecciona: `Vite`
4. Establece los siguientes valores de build:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. En **Settings → Environment Variables** añade:

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_BACKEND_URL` | URL del backend en producción | `https://tu-backend.vercel.app` |

### 4.3 Cómo embeber el widget en una web externa

Una vez desplegado, el propietario de la web embebe el widget añadiendo:

```html
<script
  src="https://tu-widget.vercel.app/widget.js"
  data-agent-id="1"
  data-color="#1976d2"
  data-position="bottom-right"
  data-title="¿En qué puedo ayudarte?">
</script>
```

### 4.4 Cómo funciona en local

1. Copia `.env.example` como `.env` en `widget/`.
2. El valor por defecto es `VITE_BACKEND_URL=http://localhost:3000`.
3. Arranca con `npm run dev` para desarrollo o `npm run build` para compilar.

---

## 5. Orden de despliegue recomendado

Despliega siempre en este orden para tener las URLs finales disponibles al configurar las dependencias:

```
1. Base de datos (Neon / Supabase)   ← primero: necesitas las credenciales
2. Backend                           ← segundo: obtienes la URL del backend
3. Widget                            ← tercero: usa la URL del backend
4. Frontend                          ← cuarto: usa la URL del backend
5. Vuelve al Backend                 ← actualiza FRONTEND_URL con la URL del frontend
```

---

## 6. Variables de entorno — resumen global

### `backend/.env` (local) / Vercel Environment Variables (producción)

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aiagentbuilder
DB_USER=postgres
DB_PASSWORD=
JWT_SECRET=cambia_esto_por_un_secreto_seguro
OPENAI_API_KEY=sk-...
FRONTEND_URL=http://localhost:4200
```

### `frontend/` — solo en Vercel (no hay archivo .env en Angular)

```env
API_URL=https://tu-backend.vercel.app
```

> En local no se necesita: `ng serve` usa `environment.ts` directamente con `http://localhost:3000`.

### `widget/.env` (local) / Vercel Environment Variables (producción)

```env
VITE_BACKEND_URL=http://localhost:3000
```

---

## 7. Verificación post-despliegue

Comprueba que todo funciona correctamente en este orden:

1. **Backend health check**  
   `GET https://tu-backend.vercel.app/health`  
   → Debe devolver `{ "status": "ok", "timestamp": "..." }`

2. **Frontend login**  
   Abre `https://tu-frontend.vercel.app/login` y verifica que el formulario conecta con el backend.

3. **Widget embebido**  
   Abre `https://tu-widget.vercel.app` (el `index.html` de prueba) y verifica que el chat responde.
