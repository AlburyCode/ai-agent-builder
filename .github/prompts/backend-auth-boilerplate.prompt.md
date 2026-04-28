---
mode: agent
description: >
  Genera desde cero el boilerplate completo de un backend Node.js con Express, TypeScript,
  Sequelize (PostgreSQL) y autenticación JWT. Incluye: instalación de dependencias, tsconfig,
  configuración de base de datos, modelo User con bcrypt, servicio de auth, controlador,
  rutas y middleware de verificación JWT. Listo para arrancar con `npm run dev`.
tools:
  - createFile
  - runCommand
---

# Backend Auth Boilerplate — Node.js + Express + TypeScript + Sequelize + JWT

Genera el boilerplate completo de un backend Node.js con autenticación JWT en la carpeta `/backend`.
Sigue exactamente los pasos indicados y **no omitas ningún archivo**.

---

## PASO 1 — Inicializar proyecto e instalar dependencias

Ejecuta los siguientes comandos desde la carpeta `/backend`:

```bash
npm init -y
```

```bash
npm install express sequelize pg pg-hstore bcryptjs jsonwebtoken dotenv cors
```

```bash
npm install -D typescript ts-node nodemon @types/node @types/express @types/bcryptjs @types/jsonwebtoken @types/cors
```

---

## PASO 2 — Archivos de configuración del proyecto

Crea `/backend/tsconfig.json` con exactamente esta configuración (no modificar las opciones):

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

> **Por qué esta configuración:**
> - `target: ES2020` + `module: commonjs` — Node.js ≥ 14 soporta ES2020 de forma nativa; CommonJS es el sistema de módulos de Node (no ESM).
> - `lib: ["ES2020"]` — solo APIs de servidor; sin `dom` porque no hay navegador.
> - `strict: true` — activa todas las comprobaciones de tipos estrictas. Detecta errores antes de ejecutar.
> - `esModuleInterop: true` — permite `import x from 'paquete'` con paquetes CommonJS (express, sequelize…).
> - `skipLibCheck: true` — omite la verificación de tipos en archivos `.d.ts` de `node_modules`. Acelera la compilación.
> - `forceConsistentCasingInFileNames` — evita errores de mayúsculas/minúsculas en rutas que solo aparecen en Linux.
> - `resolveJsonModule: true` — permite hacer `import config from './config.json'`.
> - `outDir/rootDir` — separa el código fuente (`src/`) del JavaScript compilado (`dist/`).

Actualiza los scripts en `/backend/package.json` para añadir **exactamente** estos tres scripts:

```json
{
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

> Estos scripts son estándar para todos los proyectos Node.js + TypeScript con este stack:
> - `dev`: nodemon observa `src/` y reinicia con ts-node al guardar (desarrollo)
> - `build`: compila TypeScript → JavaScript en `dist/` (pre-producción)
> - `start`: arranca desde el JS compilado (producción)
> No variarlos entre proyectos.

Crea `/backend/.env` con las siguientes variables de entorno de ejemplo:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aiagentbuilder
DB_USER=postgres
DB_PASSWORD=

JWT_SECRET=mi_secreto_super_seguro_cambiar_en_produccion
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
```

Crea `/backend/.gitignore`:

```
node_modules/
dist/
.env
```

---

## PASO 3 — Estructura de carpetas

Crea los siguientes directorios vacíos con archivos `.gitkeep` en `/backend/src/`:

- `src/config/`
- `src/models/`
- `src/services/`
- `src/controllers/`
- `src/routes/`
- `src/middlewares/`

---

## PASO 4 — Configuración de la base de datos con Sequelize

Crea `/backend/src/config/database.ts`:

```typescript
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'aiagentbuilder',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  logging: false,
});

export default sequelize;
```

> Usa siempre el formato de objeto con variables individuales (`DB_HOST`, `DB_PORT`, etc.).
> **Nunca** uses `DATABASE_URL` como string de conexión: dificulta cambiar host/puerto/nombre
> de forma independiente y es más difícil de leer en equipos.

---

## PASO 5 — Modelo User con bcrypt

Crea `/backend/src/models/User.ts`:

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import bcryptjs from 'bcryptjs';
import sequelize from '../config/database';

interface UserAttributes {
  id: number;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public role!: 'admin' | 'user';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'admin',
    },
  },
  {
    sequelize,
    tableName: 'users',
    hooks: {
      // IMPORTANTE: usar beforeValidate (NO beforeCreate) para que el hash
      // esté calculado antes de que Sequelize valide allowNull: false en password
      beforeValidate: async (user: User) => {
        if (user.changed('password') && user.password && !user.password.startsWith('$2')) {
          const salt = await bcryptjs.genSalt(10);
          user.password = await bcryptjs.hash(user.password, salt);
        }
      },
    },
  }
);

export default User;
```

---

## PASO 6 — Servicio de autenticación

Crea `/backend/src/services/auth.service.ts`:

```typescript
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthResult {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

export const register = async (email: string, password: string): Promise<AuthResult> => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new Error('Email ya registrado');
  }

  const user = await User.create({ email, password });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return { token, user: { id: user.id, email: user.email, role: user.role } };
};

export const login = async (email: string, password: string): Promise<AuthResult> => {
  const user = await User.findOne({ where: { email } });

  // Mismo mensaje para usuario no encontrado y contraseña incorrecta
  // para no revelar si el email existe en el sistema
  const INVALID_CREDENTIALS = 'Credenciales inválidas';

  if (!user) {
    throw new Error(INVALID_CREDENTIALS);
  }

  const bcryptjs = await import('bcryptjs');
  const isValid = await bcryptjs.compare(password, user.password);

  if (!isValid) {
    throw new Error(INVALID_CREDENTIALS);
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  return { token, user: { id: user.id, email: user.email, role: user.role } };
};
```

---

## PASO 7 — Controlador de autenticación

Crea `/backend/src/controllers/auth.controller.ts`:

```typescript
import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    return;
  }

  try {
    const result = await authService.register(email, password);
    res.status(201).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al registrar usuario';
    res.status(400).json({ error: message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    return;
  }

  try {
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
    res.status(401).json({ error: message });
  }
};
```

---

## PASO 8 — Rutas de autenticación y router central

Crea `/backend/src/routes/auth.routes.ts`:

```typescript
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);

export default router;
```

Crea `/backend/src/routes/api.router.ts` — **agregador central de todas las rutas**.
Este es el único archivo que `index.ts` importa. Cuando se añadan nuevas rutas al proyecto,
se registran aquí, nunca directamente en `index.ts`:

```typescript
import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

// Rutas públicas — sin middleware de autenticación
router.use('/auth', authRoutes);

// Las rutas protegidas se añadirán aquí cuando se creen
// router.use('/agents', authenticate, agentRoutes);
// router.use('/chat', chatRoutes);

export default router;
```

> **Patrón clave**: `index.ts` solo importa `apiRouter`. Todas las rutas se gestionan
> en `api.router.ts`. Esto mantiene `index.ts` limpio y todo el registro de rutas
> centralizado en un único lugar.

---

## PASO 9 — Middleware de verificación JWT

Crea `/backend/src/middlewares/auth.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Ampliación de tipos de Express para incluir req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // Formato esperado: "Bearer <token>"

  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: number;
      email: string;
      role: string;
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
```

---

## PASO 10 — Punto de entrada de la aplicación

Crea `/backend/src/index.ts`:

```typescript
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import sequelize from './config/database';
import './models/User'; // Registrar modelo
import apiRouter from './routes/api.router';

const app = express();
const PORT = process.env.PORT ?? 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas (todas gestionadas en api.router.ts)
app.use(apiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Arranque del servidor
const start = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('✅ Base de datos sincronizada');
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al arrancar el servidor:', error);
    process.exit(1);
  }
};

start();

export default app;
```

---

## ✅ VERIFICACIÓN FINAL

Arranca el servidor:

```bash
cd backend
npm run dev
```

Debes ver en la consola:
```
✅ Base de datos sincronizada
🚀 Servidor corriendo en http://localhost:3000
```

Prueba los endpoints:

```bash
# Registro
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

El login debe devolver:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "admin@test.com", "role": "admin" }
}
```

---

> **Este boilerplate es la base para cualquier backend Node.js + Express + TypeScript + Sequelize + PostgreSQL con autenticación JWT.**
> A partir de aquí solo hay que añadir los modelos, servicios y endpoints propios de cada aplicación.
