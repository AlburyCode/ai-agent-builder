
### Bienvenida

> "Hola a todos y bienvenidos. Hoy vamos a hacer algo diferente a lo que estáis acostumbrados: vamos a construir una aplicación real, completa, funcional, en menos de cuatro horas. Pero no a lo loco, sino con un método: vibe coding con GitHub Copilot.
>
> El proyecto que vamos a construir se llama **AI Agent Builder**. Básicamente es una plataforma SaaS que permite a cualquier empresa crear su propio asistente de inteligencia artificial, entrenarlo con sus documentos, probarlo, y luego obtener un script para incrustarlo en su web como si fuera un chat de atención al cliente.
>
> Pensad en un e-commerce que quiere un chatbot que responda preguntas sobre sus productos basándose en su catálogo en PDF. O una clínica que quiere un asistente que responda dudas frecuentes de sus pacientes. Eso es lo que vamos a construir hoy.
>
> Antes de tocar una sola línea de código, quiero que entendáis perfectamente qué vamos a hacer y por qué. Así que vamos con la arquitectura."


## 📋 RESUMEN DEL PROYECTO

**Producto:** SaaS para crear y gestionar agentes de IA embebibles en webs externas.

**Lo que vamos a construir hoy:**
1. Un **backoffice en Angular** para gestionar agentes, documentos y conversaciones
2. Un **backend en Node.js + TypeScript** con API REST, autenticación JWT y conexión a OpenAI
3. Un **widget embebible en JavaScript nativo** (tipo burbuja de chat flotante) que cualquier web puede usar

**Stack tecnológico:**
| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 17+ · Angular Material · RxJS |
| Backend | Node.js · Express · TypeScript · Sequelize |
| Base de datos | PostgreSQL |
| IA | OpenAI Responses API · file_search · Vector Stores |
| Widget | JavaScript nativo · Vite |

**Restricciones de la sesión:** sin Docker, sin tests, sin logging avanzado. Solo lo esencial para que funcione y se entienda.

---

## ✅ BLOQUE 0: PREPARACIÓN PREVIA

**Checklist obligatorio:**
- [ ] Node.js 20.x LTS instalado → `node --version`
- [ ] npm instalado → `npm --version`

> ⚠️ **Compatibilidad Node.js / Vite** — Vite 8 requiere Node ≥ 20.19.0 o ≥ 22.12.0. Si tu versión es inferior (ej. v20.15 o cualquier v18.x), el `npm run build` del widget fallará con un error de *native binding*. Solución: usa **Vite 5.4.x** en el proyecto del widget (ver PROMPT #12). Comprueba con `node --version` antes de empezar.
- [ ] Angular CLI instalado globalmente → `npm install -g @angular/cli` (versión 17+)
- [ ] PostgreSQL corriendo en local (puerto 5432 por defecto)
- [ ] Base de datos `aiagentbuilder` creada en PostgreSQL
- [ ] Una clave API de OpenAI activa (en https://platform.openai.com/api-keys)
- [ ] VS Code instalado con la extensión de GitHub Copilot activa y en modo **Agent**
- [ ] Carpeta vacía preparada donde va a vivir el proyecto (ej: `~/proyectos/ai-agent-builder`)

**Cómo crear la base de datos en PostgreSQL:**
```sql
-- Desde psql o cualquier cliente (DBeaver, TablePlus, pgAdmin):
CREATE DATABASE aiagentbuilder;
```

**Abre Copilot en modo Agent:**
En VS Code pulsa `Ctrl+Shift+P` → "GitHub Copilot: Open Agent" o usa el icono del chat y asegúrate de que aparece "Agent" en el selector de modo, no "Chat" ni "Edit".

---

### 💡 CONCEPTO TEÓRICO #1 — ¿Qué es un SaaS?

**🖥️ Diagrama comparativo: Proyecto a medida vs SaaS**

```
╔══════════════════════════════════╗   ╔══════════════════════════════════════════╗
║     PROYECTO A MEDIDA            ║   ║              SaaS (nuestro caso)         ║
╠══════════════════════════════════╣   ╠══════════════════════════════════════════╣
║                                  ║   ║                                          ║
║  Cliente A  →  App A (custom)    ║   ║  Cliente A ──┐                           ║
║                                  ║   ║              │                           ║
║  Cliente B  →  App B (custom)    ║   ║  Cliente B ──┼──▶  Un solo producto  ──▶ ║
║                                  ║   ║              │     (nuestro SaaS)        ║
║  Cliente C  →  App C (custom)    ║   ║  Cliente C ──┘                           ║
║                                  ║   ║                                          ║
║  3 clientes = 3 proyectos        ║   ║  Datos separados por tenant_id en BD     ║
║  3 veces el trabajo              ║   ║  Una sola base de código                ║
╚══════════════════════════════════╝   ╚══════════════════════════════════════════╝

Ejemplos reales de SaaS:  Notion · Slack · Shopify · Figma · GitHub · Vercel
```

**🖥️ El concepto multi-tenant en base de datos**

```sql
-- Sin multi-tenant: cada cliente tiene su propia BD (costoso)
BASE_DATOS_CLIENTE_A  →  tabla agents
BASE_DATOS_CLIENTE_B  →  tabla agents

-- Con multi-tenant (nuestro enfoque): una sola BD, datos separados por userId
BASE_DATOS_SAAS  →  tabla agents
  id | name           | userId   ← userId actúa como "tenant_id"
  1  | "Bot de ventas" | 1        ← Datos de la empresa A
  2  | "Soporte"       | 1        ← Datos de la empresa A
  3  | "FAQ Bot"       | 2        ← Datos de la empresa B
  4  | "Asistente"     | 2        ← Datos de la empresa B
```


### 💡 CONCEPTO TEÓRICO #2 — ¿Qué es un AI Agent?

**Chatbot clásico vs AI Agent**

```
╔═══════════════════════════════════╗   ╔═══════════════════════════════════════════╗
║       CHATBOT CLÁSICO             ║   ║            AI AGENT (nuestro caso)        ║
╠═══════════════════════════════════╣   ╠═══════════════════════════════════════════╣
║ Usuario: "¿Tenéis talla M?"       ║   ║ Usuario: "¿Tenéis talla M del modelo X?"  ║
║                                   ║   ║                                           ║
║ → Árbol de decisiones fijo        ║   ║ → Razona sobre la pregunta                ║
║   IF pregunta == "talla"          ║   ║ → Busca en documentos subidos             ║
║      → "Disponemos de S, M, L"    ║   ║   (catálogo, stock, FAQ)                  ║
║                                   ║   ║ → Construye respuesta contextual          ║
║ Sin contexto de conversación      ║   ║ → "Sí, el modelo X está disponible        ║
║ No entiende matices               ║   ║    en M según nuestro catálogo.           ║
║ Solo respuestas predefinidas      ║   ║    ¿Te lo añado al carrito?"              ║
╚═══════════════════════════════════╝   ╚═══════════════════════════════════════════╝
```

**Flujo de una pregunta al agente**

```
  Usuario hace pregunta
         │
         ▼
  ┌─────────────────┐
  │   AI AGENT      │  ← Tiene: system prompt + historial + tools
  │  (OpenAI gpt-4o)│
  └────────┬────────┘
           │ decide usar file_search
           ▼
  ┌─────────────────────────────┐
  │   Vector Store (OpenAI)     │  ← Nuestros documentos indexados
  │   Búsqueda semántica        │
  └────────────┬────────────────┘
               │ fragmentos relevantes
               ▼
  ┌─────────────────┐
  │   Genera        │
  │   respuesta     │  ← Basada en los fragmentos encontrados
  └────────┬────────┘
           │
           ▼
      Usuario recibe
      respuesta precisa
```

### 💡 CONCEPTO TEÓRICO #3 — Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    NUESTRO SISTEMA                          │
│                                                             │
│  ┌──────────────┐        ┌─────────────────────────────┐    │
│  │   BACKOFFICE │◄──────►│         BACKEND             │    │
│  │   (Angular)  │  HTTP  │  (Node.js + Express + TS)   │    │
│  └──────────────┘        └──────────────┬──────────────┘    │
│                                         │                   │
│  ┌──────────────┐                       │                   │
│  │    WIDGET    │◄──────┐               │                   │
│  │  (JS Nativo) │  HTTP │               │                   │
│  └──────────────┘       │               ▼                   │
│                         │    ┌──────────────────┐           │
│                         └────│    PostgreSQL    │           │
│                              └──────────────────┘           │
│                                         │                   │
│                              ┌──────────▼─────────┐         │
│                              │   OpenAI API        │        │
│                              │ (Assistants + files)│        │
│                              └────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```


### 💡 CONCEPTO TEÓRICO #4 — ¿Qué es el Vibe Coding con GitHub Copilot?

> **⏱ Duración estimada: 3 minutos**

> "El **vibe coding** es una forma de programar donde tú describes en lenguaje natural lo que quieres construir y la IA genera el código. No es que la IA lo haga todo sola: el rol del desarrollador cambia. Pasas de escribir cada línea a ser el **arquitecto** que toma decisiones, revisa lo que genera la IA, detecta errores y guía el proceso.
>
> Hoy usamos **GitHub Copilot en modo Agent**, que es diferente al modo chat normal. En modo Agent, Copilot puede:
> - Leer los ficheros de tu proyecto
> - Crear y modificar múltiples archivos a la vez
> - Ejecutar comandos en la terminal
> - Navegar por el código para entender el contexto
>
> La clave es dar prompts precisos. Un prompt vago da código vago. Un prompt detallado da código que funciona. Hoy os voy a dar los prompts exactos que usaré."

**🖥️ MOSTRAR EN PANTALLA — Desarrollo tradicional vs Vibe Coding**

```
╔══════════════════════════════════╗   ╔══════════════════════════════════════════╗
║   DESARROLLO TRADICIONAL         ║   ║           VIBE CODING                    ║
╠══════════════════════════════════╣   ╠══════════════════════════════════════════╣
║                                  ║   ║                                          ║
║  Tú escribes línea a línea       ║   ║  Tú describes lo que quieres             ║
║  Tú buscas en Stack Overflow     ║   ║  Copilot genera el código                ║
║  Tú recuerdas la sintaxis        ║   ║  Tú revisas, corriges y guías            ║
║  Tú piensas la arquitectura      ║   ║  Tú tomas todas las decisiones           ║
║                                  ║   ║                                          ║
║  Rol: Desarrollador-escritor     ║   ║  Rol: Arquitecto-revisor                 ║
║  Velocidad: normal               ║   ║  Velocidad: x5-x10 más rápido            ║
╚══════════════════════════════════╝   ╚══════════════════════════════════════════╝
```

### Ai Driven software development con GitHub Copilot

```
❌ PROMPT VAGO (resultado mediocre):
"Crea un endpoint de login"

→ Copilot genera algo genérico, sin tipos, sin validaciones,
  puede que no use tu stack ni tu estructura de archivos.


✅ PROMPT PRECISO (lo que usamos hoy):
"Crea /backend/src/services/auth.service.ts en TypeScript.
 Función login(email: string, password: string) que:
 - Busca el usuario en la BD con Sequelize
 - Compara password con bcryptjs
 - Devuelve JWT firmado con JWT_SECRET del .env
 - Usa el mismo mensaje de error para usuario no encontrado y
   contraseña incorrecta (por seguridad)
 - Retorna { token, user: { id, email, role } }"

→ Copilot genera exactamente lo que necesitas, integrado
  en tu proyecto real.
```

---

### 🤖 PROMPT COPILOT #1 — Crear estructura del monorepo

```
Crea la estructura de carpetas para un monorepo con tres proyectos independientes:

1. /backend — API REST en Node.js con Express y TypeScript
2. /frontend — Aplicación Angular 17 (se creará después con Angular CLI)
3. /widget — Widget embebible con JavaScript nativo y Vite

En la raíz del proyecto crea un archivo README.md explicando brevemente qué es cada carpeta.

En /backend crea únicamente la estructura de carpetas vacía:
- src/
  - controllers/
  - services/
  - models/
  - routes/
  - middlewares/
  - config/
- No crees ningún archivo .ts todavía, solo la estructura de directorios con archivos .gitkeep

En la carpeta /widget crea únicamente la estructura:
- src/
- No crees archivos de código todavía.

Solo crea la estructura básica y el README. No instales nada todavía.
```


##  BLOQUE 1.5: CONFIGURAR EL AGENTE — GitHub Copilot Instructions


---


### 💡 CONCEPTO TEÓRICO #5 — GitHub Copilot Instructions: los tres tipos de ficheros de instrucciones


> "GitHub Copilot tiene un sistema de personalización basado en tres tipos de ficheros. Todos viven dentro de la carpeta `.github/` del proyecto:
>
> **Tipo 1 — `copilot-instructions.md`** (contexto global)
> Se carga en **cada conversación**, automáticamente, sin que hagas nada. Aquí va el contexto del proyecto que siempre debe estar activo: el stack tecnológico, la estructura de carpetas, las convenciones de arquitectura y los errores críticos a evitar.
>
> **Tipo 2 — `instructions/*.instructions.md`** (contexto por carpeta)
> Son ficheros de instrucciones que se activan **automáticamente cuando Copilot edita ficheros de una ruta específica**, declarada en el frontmatter con `applyTo`. Por ejemplo, el fichero `backend-models.instructions.md` con `applyTo: 'backend/src/models/**'` se activa cuando Copilot está generando o editando un modelo de Sequelize. Copilot sabe, sin que tú se lo digas, que debe usar `beforeValidate` en lugar de `beforeCreate`.
>
> **Tipo 3 — `prompts/*.prompt.md`** (plantillas reutilizables)
> Son plantillas que aparecen como comandos slash en el chat. Como el `backend-auth-boilerplate.prompt.md` que ya hemos creado.
>
> Los tipos 1 y 2 juntos son los que garantizan **reproducibilidad**: que si abres este proyecto en cualquier momento, en cualquier entorno, Copilot va a generar código consistente con lo ya hecho."

**Los tres tipos de fichero y cuándo se activa cada uno**

```
.github/
├── copilot-instructions.md            ← se carga en TODA conversación
│                                         (stack, arquitectura, errores conocidos)
│
└── instructions/
│   ├── backend-models.instructions.md      ← activo al editar backend/src/models/**
│   ├── backend-controllers.instructions.md ← activo al editar backend/src/controllers/**
│   ├── backend-services.instructions.md    ← activo al editar backend/src/services/**
│   ├── backend-routes.instructions.md      ← activo al editar backend/src/routes/**
│   ├── angular-components.instructions.md  ← activo al editar *.component.ts
│   └── angular-services.instructions.md    ← activo al editar *.service.ts
│
└── (prompts/ — ficheros .prompt.md como el boilerplate ya creado)
```

**Qué diferencia hace en la práctica**

```
  SIN instructions                      CON instructions
  ─────────────────────────────         ─────────────────────────────────────────
  "Crea el modelo User"                 "Crea el modelo User"
   │                                     │
   ▼                                     ▼
  Copilot genera bcrypt en             Copilot genera bcrypt en beforeValidate ✅
  beforeCreate ❌                       porque lee backend-models.instructions.md

  "Crea el componente de login"         "Crea el componente de login"
   │                                     │
   ▼                                     ▼
  Copilot puede crear template          Copilot crea templateUrl externo ✅
  inline ❌                              porque lee angular-components.instructions.md

  "Crea el interceptor JWT"             "Crea el interceptor JWT"
   │                                     │
   ▼                                     ▼
  Copilot puede crear una clase         Copilot crea HttpInterceptorFn ✅
  HttpInterceptor ❌                     porque lee angular-components.instructions.md
```


---

### ¿Qué es un ORM? Sequelize en 3 minutos


> "ORM son las siglas de **Object-Relational Mapper**. Es una librería que actúa como puente entre tu código orientado a objetos y una base de datos relacional.
>
> Sin ORM, para guardar un agente escribirías SQL puro:
> ```sql
> INSERT INTO agents (name, description, instructions) VALUES ('Mi agente', 'Descripción', 'Eres un asistente...');
> ```
>
> Con **Sequelize**, escribes JavaScript/TypeScript:
> ```typescript
> await Agent.create({ name: 'Mi agente', description: 'Descripción', instructions: 'Eres un asistente...' });
> ```

**Cómo funciona el ORM (capas)**

```
  Tu código TypeScript
  ─────────────────────────────────────────
  const agents = await Agent.findAll({     ←  Escribes esto
    where: { userId: 1 }                   ←  Condición en TypeScript
  });

            │  Sequelize traduce automáticamente
            ▼

  SELECT * FROM "agents"                   ←  Sequelize genera esto
  WHERE "userId" = 1;                      ←  SQL real enviado a PostgreSQL

            │
            ▼

  PostgreSQL ejecuta la consulta y devuelve filas

            │
            ▼

  Sequelize convierte las filas en objetos Agent[]  ←  Recibes esto
```

**Las 4 operaciones CRUD con Sequelize**

```typescript
// CREATE — Crear un agente
const agent = await Agent.create({
  name: 'Bot de soporte',
  instructions: 'Eres un asistente amable...',
  userId: 1
});

// READ — Buscar todos los agentes de un usuario
const agents = await Agent.findAll({ where: { userId: 1 } });

// UPDATE — Actualizar el nombre
await agent.update({ name: 'Bot de ventas actualizado' });
// o bien: await Agent.update({ name: '...' }, { where: { id: 1 } });

// DELETE — Eliminar
await agent.destroy();
// o bien: await Agent.destroy({ where: { id: 1 } });
```


### CONCEPTO TEÓRICO #9 — Prompts reutilizables de GitHub Copilot: qué son y cómo funcionan



```
--- 
mode: agent           ← se ejecuta en modo agente (puede crear archivos y ejecutar comandos)
description: '...'   ← descripción del prompt para que Copilot lo identifique
tools:
  - createFile       ← Copilot puede crear archivos
  - runCommand       ← Copilot puede ejecutar comandos de terminal
---

# Título del prompt

Las instrucciones exactas que seguirá Copilot...
```

---


### 💡 CONCEPTO TEÓRICO #10 — Modelo de datos: diagrama entidad-relación


```
┌──────────────┐       ┌──────────────────┐
│     User     │──1:N──│      Agent       │
│──────────────│       │──────────────────│
│ id (PK)      │       │ id (PK)          │
│ email        │       │ name             │
│ password     │       │ description      │
│ role         │       │ instructions     │
│ createdAt    │       │ openaiVectorStoreId│
└──────────────┘       │ userId (FK)      │
                       │ createdAt        │
                       └────────┬─────────┘
                                │ 1:N
              ┌─────────────────┴──────────────────┐
              │                                    │
   ┌──────────▼──────────┐           ┌─────────────▼───────────┐
   │      Document       │           │      Conversation       │
   │─────────────────────│           │─────────────────────────│
   │ id (PK)             │           │ id (PK)                 │
   │ agentId (FK)        │           │ agentId (FK)            │
   │ fileName            │           │ messages (JSON)         │
   │ fileType            │           │ createdAt               │
   │ openaiFileId        │           └─────────────────────────┘
   │ createdAt           │
   └─────────────────────┘
```


**Cómo Sequelize define las relaciones entre modelos**

```typescript
// En /backend/src/models/index.ts
import { User } from './User';
import { Agent } from './Agent';
import { Document } from './Document';
import { Conversation } from './Conversation';

// 1 User → N Agents
User.hasMany(Agent, { foreignKey: 'userId', onDelete: 'CASCADE' });
Agent.belongsTo(User, { foreignKey: 'userId' });

// 1 Agent → N Documents
Agent.hasMany(Document, { foreignKey: 'agentId', onDelete: 'CASCADE' });
Document.belongsTo(Agent, { foreignKey: 'agentId' });

// 1 Agent → N Conversations
Agent.hasMany(Conversation, { foreignKey: 'agentId', onDelete: 'CASCADE' });
Conversation.belongsTo(Agent, { foreignKey: 'agentId' });

// Gracias a las asociaciones, podemos hacer queries como:
const agentWithDocs = await Agent.findByPk(1, {
  include: [Document, Conversation]  // JOIN automático
});
```

**Flujo de subida de documento (la clave de la arquitectura)**

```
  Usuario sube PDF desde Angular
          │
          ▼
  Backend recibe el archivo en memoria (buffer)
  SIN guardarlo en disco
          │
          ▼
  Backend → OpenAI Files API
  openai.files.create({ file: buffer, purpose: 'assistants' })
          │
          ▼
  OpenAI devuelve → { id: "file-abc123xyz" }
          │
          ▼
  Backend → añade el archivo al Vector Store del agente
  openai.vectorStores.files.create(vsId, { file_id: "file-abc123xyz" })
  (El Vector Store se crea automáticamente si el agente aún no tiene uno)
          │
          ▼
  Backend guarda en PostgreSQL SOLO:
  { agentId: 1, fileName: "catalogo.pdf",
    fileType: "application/pdf",
    openaiFileId: "file-abc123xyz" }  ← Solo el ID
          │
          ▼
  El archivo físico NUNCA toca nuestro servidor ✅
```


### 🤖 PROMPT COPILOT #2 — Crear modelos de la aplicación

> *El modelo `User` y la config de Sequelize ya existen gracias al boilerplate. Solo creamos los modelos del dominio propio de esta app:*

```
En la carpeta /backend/src/models/, crea los tres modelos de dominio de la aplicación.
El modelo User.ts y la configuración de Sequelize en config/database.ts ya existen, no los toques.

Crea los siguientes modelos:

1. Agent.ts - Modelo de agente:
   - id: INTEGER, autoIncrement, primaryKey
   - name: STRING, allowNull false
   - description: TEXT
   - instructions: TEXT (el system prompt del agente)
   - openaiVectorStoreId: STRING (ID del Vector Store en OpenAI, nullable, se rellena al subir el primer documento)
   - userId: INTEGER, FK a User
   - Timestamps: createdAt, updatedAt

2. Document.ts - Modelo de documento:
   - id: INTEGER, autoIncrement, primaryKey
   - agentId: INTEGER, FK a Agent
   - fileName: STRING, allowNull false
   - fileType: STRING
   - openaiFileId: STRING, allowNull false (el ID del archivo subido a OpenAI)
   - Timestamps: createdAt (solo createdAt, no updatedAt)

3. Conversation.ts - Modelo de conversación:
   - id: INTEGER, autoIncrement, primaryKey
   - agentId: INTEGER, FK a Agent
   - userId: INTEGER, nullable (null si es sesión de widget anónima; número si es usuario autenticado del backoffice)
   - messages: JSON (array de {role: 'user'|'assistant', content: string})
   - Timestamps: createdAt, updatedAt

Actualiza /backend/src/models/index.ts para:
- Importar User (que ya existe) y los tres modelos nuevos
- Definir las asociaciones:
  * User hasMany Agent (FK: userId, onDelete CASCADE)
  * Agent belongsTo User
  * Agent hasMany Document (FK: agentId, onDelete CASCADE)
  * Document belongsTo Agent
  * Agent hasMany Conversation (FK: agentId, onDelete CASCADE)
  * Conversation belongsTo Agent
- Exportar todos los modelos

Usa TypeScript con tipos correctos. Usa la clase Model de Sequelize con genéricos.
```
### 🤖 PROMPT COPILOT #3 — Actualizar el servidor con los nuevos modelos y dependencias

```
1. Importa todos los modelos desde models/index.ts (esto registra las asociaciones)

2. Sincronizar Sequelize con { alter: true } para que cree/actualice las tablas automáticamente

3. Arrancar el servidor solo después de que la sincronización haya sido exitosa

```

### 💡 CONCEPTO TEÓRICO #11 — Arquitectura en capas: routes → controllers → services

> ```
> Route (HTTP)  →  Controller (orquesta)  →  Service (lógica de negocio)  →  Model (BD)
> ```

**Las mismas capas en código real**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CAPA 1: ROUTE — solo define URL y método HTTP
// agent.routes.ts
router.post('/agents', authenticate, agentController.create);
//                       ↑                  ↑
//                  middleware JWT      llama al controller


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CAPA 2: CONTROLLER — orquesta request/response
// agent.controller.ts
export const create = async (req: Request, res: Response) => {
  const { name, description, instructions } = req.body;  // extrae datos
  if (!name) return res.status(400).json({ error: 'Nombre requerido' }); // valida
  try {
    const agent = await agentService.createAgent(        // delega al service
      { name, description, instructions },
      req.user.userId
    );
    res.status(201).json(agent);                         // responde
  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
};


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CAPA 3: SERVICE — lógica de negocio real
// agent.service.ts
export const createAgent = async (
  data: { name: string; description?: string; instructions?: string },
  userId: number
): Promise<Agent> => {
  return await Agent.create({ ...data, userId }); // habla con la BD
};
```

**¿Por qué importa la separación?**

```
  Mañana cambias Express por Fastify:
  ☑ Solo tocas:  routes/*.ts
  ✗ No tocas:    controllers/*.ts, services/*.ts, models/*.ts

  Mañana cambias Sequelize por Prisma:
  ☑ Solo tocas:  services/*.ts, models/*.ts
  ✗ No tocas:    routes/*.ts, controllers/*.ts

  Mañana añades tests:
  ☑ Solo testeas: services/*.ts (la lógica real)
  ✗ No necesitas: simular HTTP requests para probar la lógica
```

---

### 💡 CONCEPTO TEÓRICO #12 — Recuerda: JWT ya funciona (lo creó el boilerplate)


**Rutas públicas vs rutas protegidas**

```typescript
// En api.router.ts — el agregador central de rutas:
router.use('/auth', authRoutes);         // ← rutas PÚBLICAS (login, register)

// Lo que añadiremos:
router.use('/agents', authenticate, agentRoutes);       // ← requiere token
router.use('/documents', authenticate, documentRoutes); // ← requiere token
router.use('/chat', chatRoutes);                        // ← pública (la usa el widget)

// index.ts solo hace:
app.use(apiRouter); // una única línea — index.ts no sabe nada de rutas individuales
```


---

### 🤖 PROMPT COPILOT #4 — CRUD de agentes

```
Crea el CRUD completo de agentes en /backend/src/.

Crea /backend/src/services/agent.service.ts:
- Importa Agent y User desde models/index.ts
- getAgentsByUser(userId: number): retorna todos los agentes del usuario
- getAgentById(agentId: number, userId: number): retorna el agente si pertenece al usuario, si no lanza 'No encontrado'
- createAgent(data: { name, description, instructions }, userId: number): crea el agente con userId asociado
- updateAgent(agentId: number, data: Partial<{ name, description, instructions }>, userId: number): actualiza si pertenece al usuario
- deleteAgent(agentId: number, userId: number): elimina si pertenece al usuario

Crea /backend/src/controllers/agent.controller.ts:
- getAll: llama a getAgentsByUser con req.user.userId, devuelve 200 con array
- getOne: llama a getAgentById, devuelve 200 o 404
- create: extrae name (obligatorio), description, instructions del body. Llama a createAgent. Devuelve 201.
- update: extrae el id de req.params y los campos del body. Llama a updateAgent. Devuelve 200.
- remove: extrae id de req.params. Llama a deleteAgent. Devuelve 204.
- Todos los métodos usan try/catch y devuelven errores apropiados

Crea /backend/src/routes/agent.routes.ts:
- Todas las rutas requieren el middleware 'authenticate'
- GET /agents → agent.controller.getAll
- GET /agents/:id → agent.controller.getOne
- POST /agents → agent.controller.create
- PUT /agents/:id → agent.controller.update
- DELETE /agents/:id → agent.controller.remove

Actualiza /backend/src/routes/api.router.ts para registrar la nueva ruta:
router.use('/agents', authenticate, agentRoutes)
```

---


### 💡 CONCEPTO TEÓRICO #13 — OpenAI Responses API y Vector Stores: el reemplazo de Assistants


**Assistants API (antes) vs Responses API (ahora)**

```
  ANTES: ASSISTANTS API (deprecada agosto 2026)
  ─────────────────────────────────────────────
  openai.beta.assistants.create(...)    ← Crear Assistant en OpenAI (guardamos su ID)
  openai.beta.threads.create(...)       ← Crear Thread por conversación
  openai.beta.threads.messages.create(...) ← Añadir mensaje al Thread
  openai.beta.threads.runs.create(...)  ← Lanzar Run
  poll... poll... poll...               ← Esperar a que el Run complete
  openai.beta.threads.messages.list()  ← Leer respuesta

  AHORA: RESPONSES API ✅
  ─────────────────────────────────────────────
  openai.responses.create({
    model: 'gpt-4o',
    instructions: systemPrompt,
    input: [...historial, { role: 'user', content: mensaje }],
    tools: [{ type: 'file_search', vector_store_ids: [vsId] }]
  })
  response.output_text                  ← Respuesta directa ✅
```

**Cómo funciona el Vector Store con la Responses API**

```
  AGENTE EN NUESTRA BD
  ┌──────────────────────────────┐
  │ id: 1                        │
  │ name: "Bot de soporte"       │
  │ instructions: "Eres..."      │
  │ openaiVectorStoreId: "vs_xyz"│ ← único vínculo con OpenAI
  └──────────────────────────────┘
           │ contiene (1:N en documents)
           ▼
  DOCUMENTOS EN NUESTRA BD         VECTOR STORE EN OPENAI
  ┌───────────────────────┐        ┌───────────────────────┐
  │ openaiFileId: "f-a1"  │──────▶ │ "vs_xyz" contiene     │
  │ openaiFileId: "f-b2"  │──────▶ │  embeddings de f-a1   │
  │ openaiFileId: "f-c3"  │──────▶ │  embeddings de f-b2   │
  └───────────────────────┘        │  embeddings de f-c3   │
                                   └───────────────────────┘

  En cada llamada al chat:
  tools: [{ type: 'file_search', vector_store_ids: ['vs_xyz'] }]
  → OpenAI busca en ESE Vector Store y solo en ese ✅
```

**Nuestra gestión del historial (igual que antes)**

```typescript
// Guardamos el historial en nuestra BD (tabla Conversation):
// { agentId: 1, messages: [
//   { role: 'user',      content: '¿Cuál es vuestro horario?' },
//   { role: 'assistant', content: 'Nuestro horario es...' },
// ]}

// Llamada a la Responses API con historial + file_search:
const response = await openai.responses.create({
  model: 'gpt-4o',
  instructions: agent.instructions,   // system prompt del agente
  input: [
    ...conversationHistory,            // historial guardado en BD
    { role: 'user', content: nuevoMensaje }
  ],
  tools: [{ type: 'file_search', vector_store_ids: [agent.openaiVectorStoreId] }]
});

const reply = response.output_text;   // acceso directo, sin choices[0].message.content
```

**¿Qué historial se envía cuando el usuario es anónimo (widget)?**

El widget no envía "toda la conversación con `userId == null`" — eso mezclaría los mensajes de todos los visitantes anónimos de ese agente. En cambio, usa un `conversationId` como **token de sesión anónima**:

```
PRIMERA VISITA del usuario al widget
─────────────────────────────────────
Widget envía:  { agentId: 1, message: "Hola", conversationId: null }
Backend:       → crea nueva Conversation { agentId: 1, userId: null, messages: [] }
               → devuelve { conversationId: 42, reply: "¡Hola! ¿En qué te ayudo?" }
Widget:        → guarda conversationId=42 en localStorage

VISITAS SIGUIENTES (misma sesión o regresa días después)
─────────────────────────────────────────────────────────
Widget envía:  { agentId: 1, message: "¿Y los envíos?", conversationId: 42 }
Backend:       → carga Conversation id=42 con su historial completo
               → envía ese historial a OpenAI como contexto
               → devuelve { conversationId: 42, reply: "Los envíos tardan..." }
```

| Situación | Comportamiento |
|---|---|
| `conversationId` guardado en localStorage | Continúa esa conversación específica |
| localStorage vacío / primera visita | Crea conversación nueva y guarda el ID |
| Usuario borra localStorage | Nueva conversación (pierde el historial) |
| Usuario abre otro navegador | Nueva conversación independiente |

El request body del endpoint `/chat/message` incluye `conversationId` como campo opcional:

```typescript
// Request del widget al backend
{ agentId: 1, message: "¿Cuál es vuestro horario?", conversationId: 42 }  // null si es el primer mensaje

// Response del backend
{ conversationId: 42, reply: "Nuestro horario es..." }  // siempre devuelve el ID (nuevo o existente)
```

**Los dos escenarios completos: widget anónimo vs backoffice autenticado**

> "Imaginad que sois el dueño de una tienda online. Habéis creado un agente y subido vuestro catálogo. Ahora tenéis dos formas de hablar con él:
>
> **Escenario 1 — Probando el agente en el backoffice (userId existe)**
> Entráis en vuestra cuenta, abrís el agente y le hacéis una pregunta de prueba. El componente Angular arranca, no tiene ningún `conversationId` en memoria, así que el backend crea una conversación nueva con vuestro `userId`. Cada mensaje que enviáis se acumula en esa conversación en la base de datos. 
>
> **Escenario 2 — Un cliente real usando el widget en vuestra web (userId null)**
> Un visitante llega a vuestra tienda, abre el chat y escribe su primera pregunta. El widget no tiene ningún `conversationId` en `localStorage`, así que el backend crea una conversación nueva con `userId: null`. El ID de esa conversación se guarda en el `localStorage` del navegador del visitante. Si cierra el chat, navega por la web y vuelve a abrirlo, el widget recupera el `conversationId` del `localStorage` y el backend carga el historial completo de esa conversación. Para el visitante es una experiencia continua: el agente 'recuerda' todo lo que le dijo antes. Si borra el localStorage o usa otro navegador, empieza de cero."

**Por qué enviamos el historial: Context Engineering**

> "Aquí entra un concepto importante: **context engineering**. Los modelos de lenguaje como GPT-4o son, por naturaleza, sin estado: cada llamada es independiente y el modelo no recuerda nada de la llamada anterior. Si queremos que el agente responda con coherencia a lo largo de una conversación, tenemos que ser nosotros quienes le proporcionemos el contexto en cada llamada.
>
> En lugar de enviar solo el último mensaje del usuario, enviamos el historial completo: todos los turnos anteriores de esa conversación. Así el modelo puede entender referencias implícitas ('¿y el otro modelo del que hablábamos?'), no repetir información que ya dio, y construir respuestas que tienen en cuenta lo que el usuario ya sabe.
>
> Esto, combinado con el `file_search` sobre los documentos del agente, es lo que hace que la respuesta sea realmente útil: el modelo tiene a la vez el contexto de la conversación (quién es el usuario, qué ha preguntado antes) y el conocimiento específico del negocio (el catálogo, el manual, la FAQ). Eso es context engineering aplicado."

```
Sin historial (sin context engineering):
─────────────────────────────────────────
Usuario: "¿Tenéis talla M del abrigo negro?"
Agente:  "Sí, disponemos de talla M."
Usuario: "¿Y en azul?"
Agente:  "¿De qué producto me hablas?"   ← no tiene contexto, pregunta de qué producto

Con historial (context engineering):
─────────────────────────────────────────
input: [
  { role: 'user',      content: '¿Tenéis talla M del abrigo negro?' },
  { role: 'assistant', content: 'Sí, disponemos de talla M.' },
  { role: 'user',      content: '¿Y en azul?' },   ← nuevo mensaje
]
Agente: "El abrigo también está disponible en azul marino en talla M."  ✅
```

---


### 💡 CONCEPTO TEÓRICO #14 — ¿Qué es RAG? 


**Pipeline RAG completo (lo que hace file_search internamente)**

```
  FASE 1: INDEXADO (ocurre al subir el documento)
  ─────────────────────────────────────────────────────────────────

  catalogo.pdf (100 páginas)
       │
       ▼  Chunking (fragmentación)
  ["El producto A cuesta 99€..."] ["Disponible en tallas S, M, L..."] ["..."]
       │
       ▼  Embedding (vectorización)
  [0.23, -0.87, 0.41, ...]  [0.91, 0.12, -0.63, ...]  [...]   ← vectores de 1536 dims
       │
       ▼  Almacenamiento en Vector Store
  OpenAI lo guarda en su infraestructura (Vector Store ID: "vs_xxx")


  FASE 2: CONSULTA (ocurre en cada mensaje del usuario)
  ─────────────────────────────────────────────────────────────────

  Usuario: "¿Tienen camisetas en talla M?"
       │
       ▼  La pregunta se vuelve vector
  [0.88, 0.09, -0.71, ...]
       │
       ▼  Búsqueda de similitud coseno en el Vector Store
  → Fragmento 2: "Disponible en tallas S, M, L"  (similitud: 0.94) ✅
  → Fragmento 7: "Las camisetas están en sección B" (similitud: 0.81) ✅
       │
       ▼  Esos fragmentos + la pregunta van al LLM
  "Basándome en el catálogo: Sí, disponemos de talla M."
```


---

### 🤖 PROMPT COPILOT #6 — Servicio de OpenAI

```
Crea el servicio de integración con OpenAI en /backend/src/services/openai.service.ts.

Importa OpenAI de 'openai' y { toFile } de 'openai'. Crea una instancia con la API key del .env.

Implementa las siguientes funciones exportadas:

1. uploadFileToOpenAI(buffer: Buffer, fileName: string, mimeType: string):
   - Convierte el buffer a File usando toFile()
   - Sube el archivo con openai.files.create({ file, purpose: 'assistants' })
   - Retorna el fileId devuelto por OpenAI (file.id)

2. addFileToVectorStore(agentId: number, openaiFileId: string):
   - Busca el Agent en BD
   - Si el agente no tiene openaiVectorStoreId, crea un vector store con
     openai.vectorStores.create({ name: 'agent-{agentId}-vs' })
     y guarda el ID en el modelo Agent: agent.update({ openaiVectorStoreId: vectorStore.id })
   - Añade el archivo al vector store:
     openai.vectorStores.files.create(vsId, { file_id: openaiFileId })

3. removeFileFromVectorStore(_agentId: number, openaiFileId: string):
   - Llama a openai.files.delete(openaiFileId)
   - Al borrar el archivo de OpenAI Files, se elimina automáticamente de todos sus vector stores
   - Capturar errores silenciosamente si el archivo ya no existe

4. chat(agentId: number, userMessage: string, conversationHistory: Array<{role: string, content: string}>, systemPrompt: string):
   - Busca el Agent en BD para obtener openaiVectorStoreId
   - Construye el array input con conversationHistory + el nuevo userMessage
   - Si el agente tiene openaiVectorStoreId, añade tools: [{ type: 'file_search', vector_store_ids: [vsId] }]
   - Llama a openai.responses.create({ model: 'gpt-4o', instructions: systemPrompt, input, tools })
   - Retorna response.output_text

Usa try/catch en todas las funciones con errores descriptivos.
```

---


### 🤖 PROMPT COPILOT #7 — Endpoint de chat y upload completos

```
Actualiza los controladores para integrar OpenAI.

Actualiza /backend/src/controllers/document.controller.ts, método 'upload':
- Usa multer con memoryStorage para recibir el archivo
- El endpoint recibe: el archivo (multipart/form-data) y agentId en el body
- Orden estricto de operaciones:
  1. Llama a openai.service.uploadFileToOpenAI con buffer, originalname y mimetype
  2. Llama a openai.service.addFileToVectorStore(agentId, openaiFileId)
     - Si falla: llama a openai.service.removeFileFromVectorStore para hacer limpieza y devuelve 502
  3. Solo si OpenAI tuvo éxito: guarda en BD { agentId, fileName, fileType, openaiFileId }
- Devuelve 201 con el documento creado
- Maneja errores de tipo de archivo (solo pdf, doc, docx, txt)

Añade método 'deleteDocument' en /backend/src/controllers/document.controller.ts:
- Obtiene el documento por ID desde la BD
- Si no existe devuelve 404
- Llama a openai.service.removeFileFromVectorStore(doc.agentId, doc.openaiFileId)
- Borra el registro de BD con document.service.deleteDocument
- Devuelve 204

Actualiza /backend/src/routes/document.routes.ts:
- Configura multer con memoryStorage para el endpoint POST /upload
- Añade: DELETE /:id → documentController.deleteDocument

Crea /backend/src/controllers/chat.controller.ts:
- Importa conversation.service y openai.service
- Función sendMessage:
  * Extrae agentId, message, conversationId (opcional) del body
  * Valida que agentId y message existan
  * Busca el agente en BD (necesita: instructions, openaiVectorStoreId, name)
  * Si no existe devuelve 404
  * Llama a conversation.service.getOrCreateConversation(conversationId, agentId)
  * Lee el historial de mensajes de la conversación (conversation.messages)
  * Llama a openai.service.chat(agentId, message, conversation.messages, agent.instructions)
    (NO hay llamada a createOrUpdateAssistant — el Vector Store ya existe o se crea en addFileToVectorStore)
  * Guarda el mensaje del usuario y la respuesta con conversation.service.addMessage
  * Devuelve { reply: respuestaIA, conversationId: conversation.id }

Crea /backend/src/routes/chat.routes.ts:
- POST /chat/message → chat.controller.sendMessage
- Esta ruta NO requiere autenticación (el widget la usa sin usuario logueado)

Actualiza /backend/src/routes/api.router.ts:
router.use('/chat', chatRoutes)  // sin authenticate — la usa el widget sin token
```

---

### 💡 CONCEPTO — Identificación del origen: widget público vs backoffice privado


**El campo `userId` como discriminador de origen**

```
  tabla conversations
  ────────────────────────────────────────────────────────────────────────
  id │ agentId │ userId │ messages             │ origen identificado
  ───┼─────────┼────────┼──────────────────────┼────────────────────────
  10 │    3    │   1    │ [{role:'user',...}]   │ 🔒 Backoffice (userId=1)
  11 │    3    │   1    │ [{role:'user',...}]   │ 🔒 Backoffice (userId=1)
  12 │    3    │  NULL  │ [{role:'user',...}]   │ 🌐 Widget público
  13 │    3    │  NULL  │ [{role:'user',...}]   │ 🌐 Widget público
  14 │    3    │  NULL  │ [{role:'user',...}]   │ 🌐 Widget público
  ────────────────────────────────────────────────────────────────────────

  userId === null  →  Widget público (anónimo)
  userId !== null  →  Backoffice (usuario autenticado)
```

---

### 💡 CONCEPTO — Nuevo endpoint: `GET /conversations/agent/:id/all`

> "El endpoint existente `GET /conversations/agent/:id` filtra por `WHERE agentId=X AND userId=<token>`. Perfecto para el chat de prueba del backoffice: solo tus conversaciones.
>
> Pero el creador del agente también necesita ver **todas** las conversaciones: las suyas de prueba y las de todos los visitantes anónimos del widget.

**Comparativa de los dos endpoints**

```
  GET /conversations/agent/:id              GET /conversations/agent/:id/all
  ─────────────────────────────────────     ─────────────────────────────────────────
  Auth: authenticate (obligatorio)          Auth: authenticate (obligatorio)

  SQL generado:                             SQL generado:
  SELECT * FROM conversations               SELECT * FROM conversations
  WHERE agentId = :id                       WHERE agentId = :id
  AND userId = :tokenUserId                 -- (sin filtro de userId)

  Devuelve:                                 Verifica primero:
  Solo las conversaciones del              SELECT * FROM agents
  usuario autenticado                       WHERE id = :id AND userId = :tokenUserId
  (sus pruebas en el backoffice)            → Si no existe: 403 Forbidden

                                            Devuelve:
                                            TODAS las conversaciones (widget + backoffice)
```

---

### 🤖 PROMPT COPILOT #15 — Endpoint de historial completo (backend)

```
Necesito un nuevo endpoint en el backend que devuelva TODAS las conversaciones
de un agente (incluyendo las anónimas del widget) solo si el agente pertenece
al usuario autenticado que hace la petición.

1. En /backend/src/services/conversation.service.ts, añade la función:

   getAllConversationsByAgent(agentId: number, requestingUserId: number):
   - Importa el modelo Agent además de Conversation
   - Busca el agente con Agent.findOne({ where: { id: agentId, userId: requestingUserId } })
   - Si no existe, lanza new Error('Agente no encontrado o no autorizado')
   - Si existe, retorna Conversation.findAll({ where: { agentId }, order: [['createdAt', 'ASC']] })
   - No filtra por userId en conversations — devuelve todas (null y no null)

2. En /backend/src/controllers/conversation.controller.ts, añade el handler:

   getAllByAgent:
   - Extrae agentId de req.params (convertir a número con +)
   - Extrae userId de req.user!.userId
   - Llama a conversationService.getAllConversationsByAgent(agentId, userId)
   - Si el error es 'Agente no encontrado o no autorizado', responde 403
   - Si hay otro error, responde 500
   - En éxito, responde 200 con el array de conversaciones

3. En /backend/src/routes/conversation.routes.ts, añade:
   GET /agent/:agentId/all → conversationController.getAllByAgent
   (la ruta ya está protegida con authenticate en api.router.ts)

La ruta existente GET /agent/:agentId no debe modificarse.
```

---

## 🔷 BLOQUE 5: FRONTEND ANGULAR — SETUP


---

### 💡 CONCEPTO TEÓRICO #15 — Angular Standalone Components: el cambio más importante de Angular moderno

**Standalone Components**.

> Ejemplo antes (con NgModule):
> ```typescript
> // app.module.ts
> @NgModule({
>   declarations: [LoginComponent],
>   imports: [BrowserModule, ReactiveFormsModule, MatButtonModule]
> })
> export class AppModule { }
> ```
>
> Ejemplo ahora (Standalone):
> ```typescript
> // login.component.ts
> @Component({
>   standalone: true,
>   imports: [ReactiveFormsModule, MatButtonModule],
>   templateUrl: './login.component.html'
> })
> export class LoginComponent { }
> ```


**Estructura de archivos: un componente = 3 archivos**

```
  Regla de este proyecto: cada componente siempre tiene EXACTAMENTE 3 archivos

  features/agents/agent-form/
  ├── agent-form.component.ts     ← lógica (TypeScript)
  ├── agent-form.component.html   ← plantilla (HTML)
  └── agent-form.component.scss   ← estilos (SCSS, solo para este componente)

  ┌─────────────────────────────────────────────────────────────┐
  │ agent-form.component.ts                                     │
  │                                                             │
  │  @Component({                                               │
  │    standalone: true,          ← autónomo, sin NgModule      │
  │    selector: 'app-agent-form',                              │
  │    templateUrl: './agent-form.component.html', ← externo    │
  │    styleUrl:    './agent-form.component.scss',  ← externo   │
  │    imports: [                 ← dependencias declaradas aquí│
  │      ReactiveFormsModule,                                   │
  │      MatInputModule,                                        │
  │      MatButtonModule,                                       │
  │      MatCardModule,                                         │
  │      RouterLink                                             │
  │    ]                                                        │
  │  })                                                         │
  │  export class AgentFormComponent {                          │
  │    form = this.fb.group({ name: ['', Validators.required],  │
  │                           instructions: [''] });            │
  │  }                                                          │
  └─────────────────────────────────────────────────────────────┘
```

**Estructura de carpetas del backoffice Angular**

```
src/app/
├── features/             ← pantallas de la aplicación
│   ├── auth/
│   │   ├── login/        (login.component.ts/html/scss)
│   │   └── register/     (register.component.ts/html/scss)
│   ├── agents/
│   │   ├── agent-list/   (agent-list.component.ts/html/scss)
│   │   └── agent-form/   (agent-form.component.ts/html/scss)
│   ├── documents/        (documents.component.ts/html/scss)
│   ├── chat/             (chat-viewer.component.ts/html/scss)
│   └── widget-config/    (widget-config.component.ts/html/scss)
├── core/                 ← servicios, guards, interceptores (singleton)
│   ├── services/         (auth.service.ts, agent.service.ts, ...)
│   ├── interceptors/     (auth.interceptor.ts)
│   ├── guards/           (auth.guard.ts)
│   └── models/           (index.ts: interfaces User, Agent, ...)
└── shared/               ← componentes reutilizables entre features
    └── components/
```

---

### 💡 CONCEPTO TEÓRICO #16 — RxJS y Observables: la columna vertebral de Angular

>
> Los operadores más usados que verás en nuestro código:
>
> ```typescript
> // switchMap: cancela la suscripción anterior y hace una nueva
> this.searchTerm$.pipe(
>   switchMap(term => this.api.searchAgents(term))
> ).subscribe(results => this.agents = results);
>
> // catchError: maneja errores sin romper el stream
> this.api.getAgents().pipe(
>   catchError(err => of([]))  // si falla, devuelve array vacío
> ).subscribe(agents => this.agents = agents);
>
> // takeUntilDestroyed: limpia subscripciones automáticamente
> this.api.getAgents().pipe(takeUntilDestroyed()).subscribe(...);
> ```


**Promise vs Observable: la diferencia clave**

```
  PROMISE                              OBSERVABLE
  ──────────────────────────           ──────────────────────────────────
  Un único valor en el futuro          Múltiples valores a lo largo del tiempo

  ──────────────────────────           ──────────────────────────────────
  Tiempo:  ────────────●               Tiempo:  ──●──●──●──●──●──▶
           creado  resuelto                       valor valor valor valor...

  ──────────────────────────           ──────────────────────────────────
  No cancelable                        Cancelable (unsubscribe)
  Siempre se ejecuta al crear          Lazy: no emite hasta que alguien se suscribe

  Perfecto para:                       Perfecto para:
  - Una llamada HTTP                   - Eventos del usuario (clicks, input)
  - Leer un archivo                    - WebSockets en tiempo real
  - Una operación async puntual        - Formularios reactivos en Angular
                                       - Múltiples llamadas HTTP encadenadas
```

**Patrón que usamos en los componentes Angular**

```typescript
// agent-list.component.ts — patrón habitual en este proyecto

export class AgentListComponent implements OnInit {
  agents: Agent[] = [];          // estado local del componente
  isLoading = false;
  errorMessage = '';

  constructor(private agentService: AgentService) {}

  ngOnInit() {
    this.isLoading = true;
    this.agentService.getAgents()     // devuelve Observable<Agent[]>
      .pipe(
        catchError(err => {
          this.errorMessage = 'Error al cargar agentes';  // maneja errores
          return of([]);                                  // emite array vacío
        })
      )
      .subscribe(agents => {          // nos suscribimos al Observable
        this.agents = agents;         // guardamos en propiedad local
        this.isLoading = false;
      });
  }
}

// En la plantilla HTML:
// <mat-progress-bar *ngIf="isLoading"></mat-progress-bar>
// <mat-row *matRowDef="let agent; columns: displayedColumns">...</mat-row>
```

**BehaviorSubject para estado del usuario autenticado**

```typescript
// auth.service.ts — BehaviorSubject comparte estado entre componentes

@Injectable({ providedIn: 'root' })
export class AuthService {
  // BehaviorSubject: Observable que recuerda su último valor
  // Cualquier componente puede suscribirse y saber si hay usuario logueado
  private currentUser$ = new BehaviorSubject<User | null>(null);

  // El toolbar se suscribe a esto para mostrar/ocultar el botón de logout
  isLoggedIn$ = this.currentUser$.pipe(map(user => user !== null));

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', { email, password })
      .pipe(
        tap(response => {
          localStorage.setItem('token', response.token);
          this.currentUser$.next(response.user);  // notifica a todos los suscriptores
        })
      );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUser$.next(null);  // todos los componentes suscritos se actualizan
    this.router.navigate(['/login']);
  }
}
```

---



### 🤖 PROMPT COPILOT #8 — Lista de agentes y formulario

```
Crea los componentes de gestión de agentes para el backoffice Angular.

Primero, crea /frontend/src/app/core/services/agent.service.ts:
- Injectable
- Inyecta ApiService
- getAgents(): Observable<Agent[]> → GET /agents
- getAgent(id: number): Observable<Agent> → GET /agents/:id
- createAgent(data): Observable<Agent> → POST /agents
- updateAgent(id, data): Observable<Agent> → PUT /agents/:id
- deleteAgent(id): Observable<void> → DELETE /agents/:id

Crea AgentListComponent en /frontend/src/app/features/agents/agent-list/:
- agent-list.component.ts: standalone, imports: MatTableModule, MatButtonModule, MatIconModule, MatCardModule, RouterLink, AsyncPipe, NgIf
  * Carga los agentes en ngOnInit con agentService.getAgents()
  * displayedColumns: ['name', 'description', 'actions']
  * Método deleteAgent(id) con confirmación usando window.confirm y llamada a agentService.deleteAgent
  * Navega a /agents/new con Router
- agent-list.component.html:
  * Botón "Nuevo Agente" con mat-raised-button color="primary" y routerLink="/agents/new"
  * mat-table con las columnas: Nombre, Descripción, y columna de acciones con iconos (edit, description para docs, chat, settings para widget, delete)
  * Los iconos de acción navegan a las rutas correspondientes (/agents/:id/edit, /agents/:id/documents, etc.)
  * Mensaje "No hay agentes" cuando la lista está vacía con NgIf
- agent-list.component.scss: estilos de tabla material con spacing adecuado

Crea AgentFormComponent en /frontend/src/app/features/agents/agent-form/:
- agent-form.component.ts: standalone, imports ReactiveFormsModule, MatInputModule, MatButtonModule, MatCardModule, RouterLink
  * Lee el parámetro :id de la URL con ActivatedRoute
  * Si hay id, es modo edición: carga el agente y rellena el formulario
  * FormGroup con: name (required), description, instructions (textarea)
  * onSubmit(): si edición llama a updateAgent, si creación llama a createAgent. Navega a /agents en éxito.
  * Propiedad isEditMode y agentId
- agent-form.component.html:
  * mat-card con título dinámico "Crear Agente" o "Editar Agente"
  * mat-form-field para name con validación de required
  * mat-form-field para description (textarea, cdkTextareaAutosize)
  * mat-form-field para instructions con textarea grande (10 rows mínimo) y hint explicando que es el system prompt
  * Botones: "Cancelar" (routerLink='/agents') y "Guardar" (type="submit")
- agent-form.component.scss: formulario con max-width 800px centrado
```

---

### 🤖 PROMPT COPILOT #9 — Componente de documentos

```
Crea el componente de gestión de documentos para el backoffice Angular.

Crea /frontend/src/app/core/services/document.service.ts:
- getDocuments(agentId: number): Observable<Document[]> → GET /documents/:agentId
- uploadDocument(agentId: number, file: File): Observable<Document>:
  * Crea un FormData con el archivo (campo 'file') y agentId
  * Hace POST /documents/upload con ese FormData
  * IMPORTANTE: no poner Content-Type manualmente en el header, dejar que el navegador lo gestione con el boundary del multipart
- deleteDocument(documentId: number): Observable<void> → DELETE /documents/:documentId

Crea DocumentsComponent en /frontend/src/app/features/documents/documents/:
- documents.component.ts: standalone, imports: MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressBarModule, NgIf, NgFor, DatePipe, AsyncPipe
  * Lee agentId de ActivatedRoute params
  * Carga documentos en ngOnInit
  * Propiedades: isUploading: boolean, deletingId: number | null = null
  * displayedColumns: ['fileName', 'fileType', 'createdAt', 'actions']
  * Método onFileSelected(event: Event): extrae el archivo del input, llama a documentService.uploadDocument, gestiona isUploading, recarga la lista
  * Método deleteDocument(doc): pide confirmación con window.confirm, llama a documentService.deleteDocument, gestiona deletingId, recarga la lista
- documents.component.html:
  * Título "Documentos del Agente"
  * Sección de upload: label como botón (mat-raised-button), input type="file" oculto que acepta .pdf,.doc,.docx,.txt, mat-progress-bar cuando isUploading
  * mat-table con columnas Nombre, Tipo, Fecha y Acciones
  * Columna Acciones: mat-icon-button color="warn" con icono 'delete', disabled cuando deletingId === doc.id
  * Texto: "Los archivos se envían directamente a OpenAI. Solo guardamos el identificador en nuestra base de datos."
  * Botón "Volver a agentes" con routerLink
- documents.component.scss: estilos para la zona de upload con borde punteado
```

---

### 🤖 PROMPT COPILOT #10 — Visor de chat interno

```
Crea el visor de chat interno del backoffice Angular.

Crea /frontend/src/app/core/services/chat.service.ts:
- sendMessage(agentId: number, message: string, conversationId?: number): Observable<{reply: string, conversationId: number}>
  → POST /chat/message con body { agentId, message, conversationId }

Crea ChatViewerComponent en /frontend/src/app/features/chat/chat-viewer/:
- chat-viewer.component.ts: standalone, imports: MatInputModule, MatButtonModule, MatIconModule, MatCardModule, NgFor, NgIf, FormsModule
  * Lee agentId de ActivatedRoute params
  * Propiedades: messages: ChatMessage[], messageInput: string, conversationId: number | undefined, isLoading: boolean
  * Método sendMessage():
    - Si messageInput vacío, no hace nada
    - Añade el mensaje del usuario a messages inmediatamente
    - Limpia messageInput
    - Pone isLoading a true
    - Llama a chatService.sendMessage()
    - Al recibir respuesta: añade el mensaje del assistant a messages, guarda conversationId, pone isLoading a false
    - Hace scroll al final del chat usando ViewChild y scrollIntoView
  * Método onKeyDown(event): si Enter (sin Shift), llama a sendMessage()
- chat-viewer.component.html:
  * Contenedor principal con dos zonas:
    1. Área de mensajes: lista de burbujas con ngFor, burbujas distintas para 'user' y 'assistant' (clases CSS diferentes), indicador de "escribiendo..." cuando isLoading es true
    2. Área de input: mat-form-field con textarea + botón de enviar (mat-icon-button con icono 'send')
  * El textarea captura el evento keydown y llama a onKeyDown
- chat-viewer.component.scss:
  * Diseño tipo chat: área de mensajes flex-grow con overflow-y: auto
  * Burbujas de usuario: alineadas a la derecha, fondo color primario de Material
  * Burbujas del asistente: alineadas a la izquierda, fondo gris claro
  * Input pegado al fondo del contenedor
  * El componente ocupa el 100% del viewport disponible (height: calc(100vh - 64px) para descontar el toolbar)
  - Añade en la cabecera un botón con  <button mat-button routerLink="/agents">
      <mat-icon>arrow_back</mat-icon> Volver a agentes
    </button>
  - En el backoffice, el visor de chat llama a `GET /conversations/agent/:id` con el JWT del usuario. El backend filtra con `WHERE agentId=X AND userId=<id del token>`. Solo ves tus propias conversaciones — nunca las de otro usuario del sistema.

```

### 💡 CONCEPTO — Visibilidad de mensajes: backoffice vs widget


> "Ahora que el chat funciona, quiero explicaros un detalle de arquitectura importante: cómo se separan los mensajes del backoffice y los del widget.
>
> En el backoffice, el visor de chat llama a `GET /conversations/agent/:id` con el JWT del usuario. El backend filtra con `WHERE agentId=X AND userId=<id del token>`. Solo ves tus propias conversaciones — nunca las de otro usuario del sistema.
>
> En el widget, no hay autenticación. Las conversaciones se crean con `userId=null` (sesión anónima). El historial no viene de una llamada a la API: el widget lo lee directamente de `localStorage` (clave `ai_widget_msgs_AGENTID`). Cada visitante solo ve su propio historial en su propio navegador — nunca los mensajes de otros visitantes.
>
> Esta separación está aplicada a nivel de base de datos: campo `userId` en la tabla `conversations`, nullable. `null` = widget anónimo. Un número = usuario autenticado del backoffice."

**Diagrama de separación de mensajes**

```
  BACKOFFICE (usuario autenticado)         WIDGET (visitante anónimo)
  ──────────────────────────────────       ──────────────────────────────────

  1. Angular carga el visor de chat        1. Widget carga
  2. GET /conversations/agent/:id          2. localStorage.getItem('ai_widget_msgs_1')
     + Authorization: Bearer <JWT>            → mensajes previos del navegador
  3. Backend: WHERE agentId=X              3. Nuevo mensaje → POST /chat/message
              AND userId=<token.userId>        sin Authorization header
  4. Solo tus conversaciones ✅            4. Backend crea conversación con userId=null
                                           5. Respuesta guardada en localStorage ✅

  ─────────────────────────────────────────────────────────────────────────────
  Base de datos:
  conversations:
  │ id │ agentId │ userId │ messages │
  │ 10 │    3    │   1    │ [...]    │  ← backoffice, usuario 1
  │ 11 │    3    │   1    │ [...]    │  ← backoffice, usuario 1 (otra sesión)
  │ 12 │    3    │ NULL   │ [...]    │  ← widget anónimo
  │ 13 │    3    │ NULL   │ [...]    │  ← widget anónimo (otro visitante)
```

**Implementación clave — `authenticateOptional`:**

```typescript
// auth.middleware.ts — middleware que NO rechaza si falta el token
export const authenticateOptional = (req, _res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET as string);
    } catch { /* token inválido — continuar sin usuario */ }
  }
  next(); // siempre continúa, sea cual sea el resultado
};

// chat.routes.ts
router.post('/message', authenticateOptional, chatController.sendMessage);
//                       ↑ NO 'authenticate': no rechaza peticiones del widget sin token

// chat.controller.ts — pasar userId opcional al service
const conversation = await conversationService.getOrCreateConversation(
  conversationId, agentId, req.user?.userId  // undefined si es widget anónimo
);
```

---

### 💡 CONCEPTO TEÓRICO — ¿Por qué separar el visor de chat del historial de conversaciones?

**Dos pantallas, dos propósitos**

```
  ChatViewerComponent                   ConversationsHistoryComponent
  ──────────────────────────────────    ──────────────────────────────────────────
  Propósito: PROBAR el agente           Propósito: SUPERVISAR las conversaciones

  Interactivo: escribe mensajes         Solo lectura: navega el historial
  Solo tus conversaciones de prueba     TODAS las conversaciones del agente
  (userId = tu ID de usuario)           (userId = cualquier valor, incluido null)

  Ruta: /agents/:id/chat                Ruta: /agents/:id/conversations
  Icono en tabla: chat                  Icono en tabla: forum
```

---

### 🤖 PROMPT COPILOT #16 — Componente ConversationsHistory (frontend)

```
Crea el componente de historial de conversaciones en el backoffice Angular.

1. Actualiza /frontend/src/app/core/models/index.ts:
   - Añade userId: number | null al interfaz Conversation (actualmente no tiene ese campo)

2. Actualiza /frontend/src/app/core/services/conversation.service.ts:
   - Añade el método getAllByAgent(agentId: number): Observable<Conversation[]>
     que hace GET /conversations/agent/${agentId}/all

3. Crea ConversationsHistoryComponent en /frontend/src/app/features/conversations/:
   - conversations-history.component.ts:
     * standalone: true
     * Imports: NgFor, NgIf, NgClass, DatePipe, RouterLink,
       MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
       MatExpansionModule, MatProgressSpinnerModule, MatTooltipModule
     * Lee agentId de ActivatedRoute params
     * En ngOnInit: llama a conversationService.getAllByAgent(agentId)
     * Propiedades calculadas:
       - widgetConversations: conversaciones donde userId === null
       - privateConversations: conversaciones donde userId !== null
     * Propiedad isLoading: boolean

   - conversations-history.component.html:
     * Cabecera con botón de volver a /agents y título "Historial de conversaciones"
     * Badges de resumen: "X widget" (azul) y "X backoffice" (morado) con iconos public/lock
     * Spinner mientras isLoading
     * Mensaje de estado vacío si no hay conversaciones
     * mat-accordion multi con un mat-expansion-panel por conversación:
       - En el panel header: número de conversación, chip de origen (Widget público / Backoffice)
         con color diferente según userId === null, número de mensajes, fecha de creación
       - El panel tiene borde izquierdo de color diferente según el origen (azul / morado)
         usando [ngClass]
       - Dentro del panel: lista de mensajes con burbuja visual para usuario y asistente

   - conversations-history.component.scss:
     * Badges de origen con colores: azul (#e3f2fd / #1565c0) para widget, morado (#f3e5f5 / #6a1b9a) para backoffice
     * Panel con borde izquierdo de color
     * Burbujas de mensajes: usuario alineado a la izquierda con fondo azul claro,
       asistente alineado a la derecha con fondo verde claro

4. Añade la ruta en /frontend/src/app/app.routes.ts:
   path: 'agents/:id/conversations'
   loadComponent: ConversationsHistoryComponent
   canActivate: [authGuard]

5. En /frontend/src/app/features/agents/agent-list/agent-list.component.html,
   añade un botón icono entre "Documentos" y "Chat":
   <button mat-icon-button [routerLink]="['/agents', agent.id, 'conversations']" matTooltip="Conversaciones">
     <mat-icon>forum</mat-icon>
   </button>

   También añade MatTooltipModule a los imports del AgentListComponent.
```

---

### 💡 RESUMEN — Flujo completo del historial de conversaciones

```
  Usuario autenticado hace clic en el icono "forum" (Conversaciones) de un agente
                │
                ▼
  Angular navega a /agents/3/conversations
  ConversationsHistoryComponent.ngOnInit()
                │
                ▼
  GET /conversations/agent/3/all
  Authorization: Bearer <JWT>
                │
                ▼  Backend
  authenticate middleware → extrae userId del token
  conversationService.getAllConversationsByAgent(3, userId)
                │
                ├── Agent.findOne({ id: 3, userId }) → ¿existe? → si no: 403
                │
                └── Conversation.findAll({ where: { agentId: 3 } })
                    (SIN filtro de userId → devuelve todas)
                │
                ▼
  Angular recibe el array de conversaciones
                │
                ├── conv.userId === null  →  chip "Widget público"   (azul)
                └── conv.userId !== null  →  chip "Backoffice"       (morado)

  El usuario puede expandir cada conversación para leer el hilo completo
  de mensajes tal como ocurrió en tiempo real.
```

---

### 🤖 PROMPT #11 — Configuración del widget y snippet

```
Crea el componente de configuración del widget.

Crea WidgetConfigComponent en /frontend/src/app/features/widget-config/widget-config/:
- widget-config.component.ts: standalone
  * form!: FormGroup en constructor: primaryColor (default '#1976d2'),
    position ('bottom-right'/'bottom-left'), title (default 'Chat con nosotros')
  * snippetCode: string que se regenera al cambiar el formulario (valueChanges)
  * Formato del snippet:
    <script
      src="http://localhost:5173/widget.js"
      data-agent-id="AGENT_ID"
      data-color="COLOR"
      data-position="POSITION"
      data-title="TITLE">
    </script>
  * copySnippet(): navigator.clipboard.writeText + MatSnackBar 'Copiado al portapapeles'
- widget-config.component.html:
  * input type="color" + texto hex para el color
  * mat-select para posición
  * Caja de código (pre/code) fondo oscuro con el snippet generado
  * Botón "Copiar código" con icono 'content_copy'
  * Instrucciones de uso: pegar el script antes de </body>
  * Añade en la cabecera un botón con  <button mat-button routerLink="/agents">
      <mat-icon>arrow_back</mat-icon> Volver a agentes
    </button>
- widget-config.component.scss: caja código con fondo #1e1e1e, texto #d4d4d4
* Quiero que añadas un botón para probar el widget que haga una redirección a la ruta /widget/index.html para poder probar el widget en un html externo

```


---

## 🟠 BLOQUE 7: WIDGET EMBEBIBLE

---

### Shadow DOM: por qué es crítico para un widget embebible

>
> Con Shadow DOM:
> ```javascript
> const shadowRoot = container.attachShadow({ mode: 'open' });
> // Todo lo que añadas a shadowRoot está aislado
> shadowRoot.innerHTML = `
>   <style>
>     /* Estos estilos solo se aplican dentro del shadow DOM */
>     .btn { background: blue; }
>   </style>
>   <button class='btn'>Click</button>
> `;
> `

**El problema sin Shadow DOM (colisión de estilos)**

```
  WEB DEL CLIENTE                        CON NUESTRO WIDGET EMBEBIDO
  ─────────────────────                  ──────────────────────────────────────

  CSS del cliente:                       CSS del cliente afecta al widget:
  .btn {                                  El botón de nuestro widget hereda
    background: red;       ─────────▶     background: red, border-radius: 0px
    border-radius: 0px;                   y se ve completamente roto 💥
    font-size: 24px;
  }
```

**La solución: Shadow DOM**

```
  DOCUMENT (web del cliente)
  ├── <html>
  │   ├── <head> (CSS del cliente: .btn { background: red })
  │   └── <body>
  │       ├── <h1>Web del cliente</h1>       ← estilos del cliente aplican aquí
  │       ├── <button class="btn">...</button> ← rojo, sin border-radius
  │       │
  │       └── <div id="ai-widget-container">
  │            └── #shadow-root ← BARRERA de aislamiento
  │                ├── <style> .btn { background: blue } </style>  ← estilos propios
  │                ├── <button class="btn">Chat</button>  ← azul, independiente ✅
  │                └── <div id="chat-panel">...</div>
  │
  └── Los estilos NO cruzan la barrera del Shadow DOM en ninguna dirección
```

**Cómo lo implementamos en nuestro widget**

```javascript
// widget.js — inicialización con Shadow DOM
function initWidget() {
  const scriptTag = document.currentScript;
  const agentId   = scriptTag.getAttribute('data-agent-id');
  const color     = scriptTag.getAttribute('data-color') || '#1976d2';

  // 1. Crear el contenedor en el DOM principal (sin estilos)
  const container = document.createElement('div');
  container.id = 'ai-chat-widget';
  document.body.appendChild(container);

  // 2. Crear el Shadow Root → todo lo que añadamos aquí está aislado
  const shadow = container.attachShadow({ mode: 'open' });

  // 3. Inyectar HTML + CSS dentro del shadow DOM
  shadow.innerHTML = `
    <style>
      /* Este CSS solo existe dentro del widget, nunca afecta a la web del cliente */
      #chat-bubble {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: ${color};  /* color configurable */
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
    </style>
    <button id="chat-bubble">💬</button>
    <div id="chat-panel" style="display:none">...</div>
  `;
}

initWidget();
```

---

### 💡 CONCEPTO TEÓRICO #18 — localStorage para persistencia entre recargas


> "El `localStorage` es un almacenamiento en el navegador que persiste entre recargas de página y entre pestañas del mismo origen. Es perfecto para guardar el historial de conversación del widget.
>
> ```javascript
> // Guardar
> localStorage.setItem('chat_history_AGENT_ID', JSON.stringify(messages));
> // Recuperar
> const messages = JSON.parse(localStorage.getItem('chat_history_AGENT_ID') || '[]');
> ```
>
> La diferencia con `sessionStorage` es que `sessionStorage` se borra cuando el usuario cierra la pestaña. `localStorage` persiste indefinidamente.
>
> Para el widget, el flujo es:
> 1. Al cargar el widget, leer el historial de localStorage
> 2. Al recibir cada mensaje, guardar el conversationId y el historial en localStorage
> 3. Si al recargar hay un conversationId guardado, lo enviamos con cada mensaje y el backend recupera la conversación
>
> Así, aunque el usuario recargue la página, el chat mantiene el contexto."

**Comparativa de almacenamientos en el navegador**

```
╔══════════════╦══════════════════════╦═══════════════════════╦════════════════════════╗
║              ║    localStorage      ║    sessionStorage     ║   In-memory (variable) ║
╠══════════════╬══════════════════════╬═══════════════════════╬════════════════════════╣
║ Persiste al  ║                      ║                       ║                        ║
║ recargar     ║         ✅           ║          ✅           ║          ❌            ║
╠══════════════╬══════════════════════╬═══════════════════════╬════════════════════════╣
║ Persiste al  ║                      ║                       ║                        ║
║ cerrar tab   ║         ✅           ║          ❌           ║          ❌            ║
╠══════════════╬══════════════════════╬═══════════════════════╬════════════════════════╣
║ Compartido   ║                      ║                       ║                        ║
║ entre tabs   ║         ✅           ║          ❌           ║          ❌            ║
╠══════════════╬══════════════════════╬═══════════════════════╬════════════════════════╣
║ Capacidad    ║       ~5-10 MB       ║        ~5-10 MB       ║       Sin límite       ║
╠══════════════╬══════════════════════╬═══════════════════════╬════════════════════════╣
║ Nuestro uso  ║  historial del chat  ║                       ║                        ║
║              ║  conversationId      ║         —             ║    durante la sesión   ║
║              ║  token JWT (Angular) ║                       ║                        ║
╚══════════════╩══════════════════════╩═══════════════════════╩════════════════════════╝
```

**Flujo completo de persistencia del widget**

```javascript
// widget.js — gestión de persistencia con localStorage

const STORAGE_KEY_MSGS = `ai_widget_msgs_${agentId}`;
const STORAGE_KEY_CONV = `ai_widget_conv_${agentId}`;

// AL CARGAR el widget: recuperar historial previo
let messages = JSON.parse(localStorage.getItem(STORAGE_KEY_MSGS) || '[]');
let conversationId = localStorage.getItem(STORAGE_KEY_CONV) || null;
// Si había 5 mensajes antes de recargar → se muestran inmediatamente ✅

// AL ENVIAR un mensaje y recibir respuesta:
async function sendMessage(text) {
  messages.push({ role: 'user', content: text });

  const response = await fetch('http://localhost:3000/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message: text, conversationId })
  });

  const data = await response.json();
  conversationId = data.conversationId;          // guardar el ID de conversación
  messages.push({ role: 'assistant', content: data.reply });

  // PERSISTIR en localStorage después de cada intercambio
  localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(messages));  // historial
  localStorage.setItem(STORAGE_KEY_CONV, conversationId);            // ID

  renderMessages();
}
// Próxima recarga: se recupera conversationId y el backend retoma el contexto ✅
```

### ⚠️ NOTA — Versión de Vite compatible con Node.js

> El widget usa **Vite 5.4.x** por compatibilidad. La tabla siguiente muestra qué versión instalar según tu versión de Node:
>
> | Node.js instalado | Vite a instalar | Comando de instalación |
> |-------------------|-----------------|------------------------|
> | < 20.19 (ej. v20.15, v18.x) | **Vite 5.4.x** ✅ | `npm install -D vite@^5.4.0` |
> | ≥ 20.19 o ≥ 22.12 | Vite 5, 6 u 8 | `npm install -D vite` |
>
> Instalar Vite 8 con Node < 20.19 produce el error `Cannot find native binding (@rolldown/binding-win32-x64-msvc)`. Si ocurre, borra `node_modules` y `package-lock.json` y reinstala con `vite@^5.4.0`.


### 🤖 PROMPT COPILOT #12 — Setup del widget con Vite

```
Inicializa el proyecto del widget embebible en /widget.

Ejecuta estos comandos desde la carpeta /widget:
1. npm init -y
2. npm install -D vite@^5.4.0

En package.json añade estos scripts:
{
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vite build"
  }
}

Crea /widget/vite.config.js:
import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    lib: {
      entry: 'src/widget.js',
      name: 'AIWidget',
      fileName: 'widget',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'widget.js'
      }
    }
  }
});

Crea /widget/index.html (solo para desarrollo/prueba local):
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Test Widget</title>
</head>
<body>
  <h1>Página de prueba del widget</h1>
  <p>Esta es una web de ejemplo donde probaremos el widget embebido.</p>
  <script
    src="/src/widget.js"
    data-agent-id="1"
    data-color="#1976d2"
    data-position="bottom-right"
    data-title="¿En qué puedo ayudarte?">
  </script>
</body>
</html>
```


---

### 🤖 PROMPT COPILOT #13 — Widget JS nativo completo

```
Crea el widget de chat en JavaScript nativo en /widget/src/widget.js.

El widget debe:

1. INICIALIZACIÓN:
   - Leer los atributos data del script tag actual: data-agent-id, data-color, data-position, data-title
   - La URL del backend es 'http://localhost:3000' (hardcoded para ahora)
   - Recuperar de localStorage: conversationId (key: 'ai_widget_conv_AGENTID') y messages (key: 'ai_widget_msgs_AGENTID')
   - Si no hay datos previos, inicializar conversationId como null y messages como array vacío

2. ESTRUCTURA DEL DOM (con Shadow DOM):
   - Crear un div contenedor y adjuntarle un Shadow Root con mode: 'open'
   - Añadir al body del documento el contenedor
   - Dentro del Shadow Root, insertar el HTML del widget y una etiqueta <style> con todos los estilos CSS

3. HTML DEL WIDGET (dentro del shadow DOM):
   - Un botón circular flotante (#chat-bubble) en la esquina (position: fixed, bottom: 20px, configurado según data-position)
     * Icono SVG de chat (puedes usar un icono de chat simple como dos líneas)
     * Color de fondo: el data-color
   - Un panel de chat (#chat-panel) oculto por defecto:
     * Header con el data-title y un botón X de cerrar
     * Área de mensajes (#messages-container) con overflow-y: auto
     * Footer con textarea (#message-input) y botón de enviar (#send-btn)
     * El color del header usa data-color
     * Width: 350px, height: 500px, posición fija en la misma esquina que la burbuja

4. CSS (encapsulado en el shadow DOM):
   - Todos los estilos usan selectores sin clases externas
   - Fuente: system-ui, sans-serif
   - La burbuja tiene width/height 56px, border-radius 50%, sombra
   - El panel tiene border-radius 12px, sombra, animación de aparición (transition)
   - Mensajes del usuario: alineados a la derecha, fondo con data-color, texto blanco, border-radius
   - Mensajes del asistente: alineados a la izquierda, fondo #f1f1f1, texto negro, border-radius
   - Indicador "escribiendo..." pulsante con animación CSS

5. LÓGICA JAVASCRIPT:
   - Click en la burbuja: toggle show/hide del panel
   - Click en X: cierra el panel
   - Función renderMessages(): recorre el array messages y actualiza el innerHTML del área de mensajes, hace scroll al final
   - Función sendMessage():
     * Lee el texto del textarea
     * Si vacío, no hace nada
     * Añade { role: 'user', content: text } a messages
     * Limpia el textarea
     * Renderiza los mensajes
     * Muestra el indicador "escribiendo..."
     * Hace fetch POST a http://localhost:3000/chat/message con { agentId, message: text, conversationId }
     * Al recibir respuesta: guarda conversationId, añade { role: 'assistant', content: reply } a messages
     * Oculta el indicador, renderiza mensajes
     * Guarda messages y conversationId en localStorage
   - Enter en el textarea envía el mensaje (sin Shift)
   - Al cargar: si hay messages previos, los renderiza

6. Al final del archivo, autoejecutar la función de inicialización (IIFE o llamada directa)
```


### 🎮 Botón "Probar widget" — del backoffice directo al widget

---

### 🤖 PROMPT COPILOT #14 — Botón "Probar widget" con paso de configuración por URL

```
Añade el botón "Probar widget" al componente WidgetConfigComponent y configura
el paso de parámetros a través de la URL de Vite.

1. En /frontend/src/app/features/widget-config/widget-config.component.ts,
   añade el método openPreview():

   openPreview(): void {
     const { title, primaryColor, position } = this.form.value;
     const params = new URLSearchParams({
       agentId: String(this.agentId),
       title,
       color: primaryColor,
       position,
     });
     window.open(`http://localhost:5173?${params.toString()}`, '_blank');
   }

2. En la plantilla /frontend/src/app/features/widget-config/widget-config.component.html,
   añade el botón junto al de copiar snippet:

   <button mat-raised-button color="accent" (click)="openPreview()">
     <mat-icon>open_in_new</mat-icon>
     Probar widget
   </button>

3. En /widget/index.html, añade un bloque <script> ANTES del script que carga widget.js.
   Este script lee los query params de la URL y los expone como window.__AI_WIDGET_CONFIG__:

   <script>
     const params = new URLSearchParams(window.location.search);
     if (params.has('agentId') || params.has('title') || params.has('color') || params.has('position')) {
       window.__AI_WIDGET_CONFIG__ = {
         agentId:  params.get('agentId')  || '1',
         title:    params.get('title')    || 'Asistente',
         color:    params.get('color')    || '#1976d2',
         position: params.get('position') || 'bottom-right',
       };
     }
   </script>

4. En /widget/src/widget.js, al inicio del IIFE, asegúrate de que __AI_WIDGET_CONFIG__
   tiene prioridad sobre los atributos data-* del script tag:

   const cfg = window.__AI_WIDGET_CONFIG__ || {};
   const agentId = parseInt(
     cfg.agentId || (currentScript && currentScript.getAttribute('data-agent-id')) || '1',
     10
   );
   const title    = cfg.title    || (currentScript && currentScript.getAttribute('data-title'))    || 'Asistente';
   const primaryColor = cfg.color || (currentScript && currentScript.getAttribute('data-color'))   || '#1976d2';
   const position = cfg.position || (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';
```

---

**Flujo completo del botón "Probar widget"**

```
  WidgetConfigComponent (Angular)
  ─────────────────────────────────────────────
  form.value = { title, primaryColor, position }
  agentId = 3
          │
          │  openPreview()
          ▼
  window.open('http://localhost:5173?agentId=3&title=Asistente&color=%231976d2&position=bottom-right')
          │
          ▼
  widget/index.html — script lee params ANTES de cargar widget.js
  ─────────────────────────────────────────────
  window.__AI_WIDGET_CONFIG__ = { agentId: '3', title: 'Asistente', color: '#1976d2', position: 'bottom-right' }
          │
          ▼
  widget.js — cfg = window.__AI_WIDGET_CONFIG__ (tiene prioridad sobre data-*)
  → agentId = 3, color = '#1976d2'  ← el agente del backoffice ✅
```

**Por qué necesitamos `window.__AI_WIDGET_CONFIG__`**

```
  PROBLEMA: el widget se carga con un <script> tag estático en index.html.
  Cuando ese script se ejecuta, document.currentScript devuelve el elemento <script>,
  y los atributos data-* están disponibles. Hasta aquí todo bien.

  PERO: el script de query params también necesita ejecutarse antes que widget.js.
  No podemos pasar los params directamente a widget.js porque los atributos data-*
  del <script> tag son estáticos — no se pueden generar dinámicamente en tiempo de carga.

  SOLUCIÓN — secuencia de ejecución garantizada:
  ┌─────────────────────────────────────────────────────────────────┐
  │  1. <script>                                                    │
  │       const params = new URLSearchParams(...)                   │
  │       window.__AI_WIDGET_CONFIG__ = { agentId: '3', ... }  ✅  │
  │     </script>                                                   │
  │                                                                 │
  │  2. <script src="/src/widget.js"                               │
  │         data-agent-id="1"           ← fallback, siempre agente 1│
  │         data-color="#1976d2">                                   │
  │     </script>                                                   │
  │                                                                 │
  │  widget.js lee __AI_WIDGET_CONFIG__ PRIMERO → agentId = 3 ✅   │
  │  Si no existe __AI_WIDGET_CONFIG__ → data-agent-id = 1 (fallback)│
  └─────────────────────────────────────────────────────────────────┘

  Sin esta separación, el data-agent-id="1" hardcodeado siempre ganaría.
```

**Regla de prioridad en `widget.js`:**

```javascript
// Siempre al inicio del IIFE, antes de usar agentId, title, color o position:
const cfg = window.__AI_WIDGET_CONFIG__ || {};

// cfg gana sobre data-* → el backoffice puede inyectar cualquier configuración
const agentId = parseInt(
  cfg.agentId || (currentScript && currentScript.getAttribute('data-agent-id')) || '1',
  10
);
const title        = cfg.title    || (currentScript && currentScript.getAttribute('data-title'))    || 'Asistente';
const primaryColor = cfg.color    || (currentScript && currentScript.getAttribute('data-color'))    || '#1976d2';
const position     = cfg.position || (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';
```

> ⚠️ **Requisito:** el servidor de desarrollo del widget debe estar corriendo (`cd widget && npm run dev`, puerto 5173). Si el puerto está cerrado, `window.open` abrirá una página en blanco.

---


---

### 📋 Cómo embeber el widget en una web real


> "Durante la sesión usamos `npm run dev` y el snippet apunta a `http://localhost:5173/widget.js`. Para entregárselo a un cliente real hay que compilar el widget y servirlo desde una URL accesible en internet."

**Paso 1 — Compilar el widget a un único archivo:**
```bash
cd widget
npm run build
# → Genera dist/widget.js (archivo IIFE autocontenido, ~6 kB)
```

**Paso 2 — Servir el widget desde el backend (opción más simple para el MVP):**

En `backend/src/index.ts`, añade esta línea antes de las rutas:
```typescript
import path from 'path';
// ...
app.use('/widget.js', express.static(path.join(__dirname, '../../widget/dist/widget.js')));
```
Así `http://localhost:3000/widget.js` sirve el archivo compilado. En producción, la URL sería `https://tu-dominio.com/widget.js`.

**Paso 3 — El cliente pega el snippet en su web (antes de `</body>`):**
```html
<script
  src="https://tu-dominio.com/widget.js"
  data-agent-id="1"
  data-color="#1976d2"
  data-position="bottom-right"
  data-title="¿En qué puedo ayudarte?">
</script>
```

El componente `WidgetConfigComponent` ya genera este snippet automáticamente. Solo hay que cambiar la URL base de `http://localhost:5173` a la URL de producción del backend.

**Del desarrollo a la entrega al cliente**

```
  DESARROLLO (sesión de hoy)            ENTREGA AL CLIENTE
  ──────────────────────────────        ────────────────────────────────────────

  npm run dev                           npm run build
  │                                     │
  ▼                                     ▼ widget/dist/widget.js (~6 kB, un archivo)
  Vite dev server                       │
  http://localhost:5173/widget.js       ▼ copiar al servidor / CDN
  │                                     http://tu-dominio.com/widget.js
  Solo funciona en local                │
                                        ▼ cliente pega en su web:
                                        <script src="https://tu-dominio.com/widget.js"
                                          data-agent-id="1"
                                          data-color="#1976d2">
                                        </script>
                                        ✅ Funciona en cualquier navegador
```


---

### 💡 CONCEPTO TEÓRICO FINAL — ¿Qué falta para producción?

> "Lo que hemos construido hoy es un MVP completamente funcional. Pero para llevarlo a producción real habría que añadir:
>
> **A corto plazo:**
> - Tests unitarios y de integración
> - Variables de entorno separadas para producción
> - HTTPS en el backend (certificado SSL)
> - Rate limiting en el endpoint de chat (para evitar costes disparados de OpenAI)
> - Validación robusta de inputs con Zod o Joi
>
> **A medio plazo:**
> - Streaming de respuestas (que el texto aparezca letra a letra como en ChatGPT)
> - Multi-tenant real: cada empresa tiene sus propias credenciales de OpenAI
> - Analytics: cuántas conversaciones, qué preguntas se hacen más
> - Gestión de facturación con Stripe
> - CDN para el widget (actualmente sirve desde localhost)
>
> **Arquitectura avanzada:**
> - Docker para despliegue reproducible
> - CI/CD con GitHub Actions
> - Monitorización con Datadog o Sentry
> - Caché de respuestas para preguntas frecuentes"

**Roadmap visual del MVP al producto de producción**

```
  HOY (MVP funcional)          PRÓXIMO SPRINT              PRODUCCIÓN REAL
  ────────────────────         ────────────────────        ─────────────────────────

  ✅ CRUD agentes              🔲 Rate limiting             🔲 Stripe (facturación)
  ✅ Upload PDF → OpenAI       🔲 Validación con Zod        🔲 Multi-tenant avanzado
  ✅ Chat con IA               🔲 Variables de entorno      🔲 CDN para widget
  ✅ Widget embebible          🔲 HTTPS + SSL               🔲 CI/CD automático
  ✅ Auth JWT                  🔲 Streaming respuestas      🔲 Monitorización
  ✅ Persistencia localStorage 🔲 Tests unitarios           🔲 Analytics dashboard


```

**Arquitectura target a 6 meses**

```
                         ┌─────────────────────────────────┐
                         │        CLIENTE FINAL            │
                         │   Web con widget embebido       │
                         └──────────────┬──────────────────┘
                                        │ HTTPS
                              ┌─────────▼─────────┐
  ┌──────────────────┐        │    CDN / Cloudflare│
  │   BACKOFFICE     │        │  (widget.js global)│
  │   Angular        │        └─────────┬──────────┘
  │  (Vercel/Netlify)│                  │
  └────────┬─────────┘                  │
           │ HTTPS API calls            │ HTTPS API calls
           └─────────────┬─────────────┘
                         │
              ┌──────────▼──────────┐
              │  BACKEND (Node.js)  │  ← Railway / Render / AWS
              │  + Rate Limiting    │
              │  + Validación Zod   │
              └──────────┬──────────┘
                         │
             ┌───────────┴────────────┐
             │                        │
  ┌──────────▼──────┐      ┌──────────▼──────┐
  │  PostgreSQL      │      │   OpenAI API    │
  │  (Supabase/      │      │  (Assistants +  │
  │   Neon.tech)     │      │   file_search)  │
  └──────────────────┘      └─────────────────┘
```

---