---
applyTo: "backend/src/models/**"
---

# Instrucciones para modelos Sequelize — AI Agent Builder

Aplica estas reglas a TODOS los archivos en `backend/src/models/`.

---

## Estructura obligatoria de un modelo

```typescript
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// 1. Interfaz completa (todos los campos incluido id)
interface EntityAttributes {
  id: number;
  campo: string;
  // ...
  createdAt?: Date;
  updatedAt?: Date;
}

// 2. Interfaz de creación (id siempre Optional)
interface EntityCreationAttributes extends Optional<EntityAttributes, 'id'> {}

// 3. Clase que extiende Model con ambas interfaces
class Entity extends Model<EntityAttributes, EntityCreationAttributes>
  implements EntityAttributes {
  public id!: number;
  // ... campos con !

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// 4. Entity.init con tableName en snake_case plural
Entity.init(
  { /* definición de campos */ },
  {
    sequelize,
    tableName: 'entities', // snake_case plural
  }
);

export default Entity;
```

---

## ⚠️ REGLA CRÍTICA — Hook de bcrypt: `beforeValidate`, NUNCA `beforeCreate`

**Por qué**: Sequelize ejecuta `beforeValidate → validate(allowNull) → beforeCreate → INSERT`.
Si el hash de la contraseña se calcula en `beforeCreate`, la validación `allowNull: false`
ya ha fallado antes con `null`. Resultado: `SequelizeValidationError: notNull Violation`.

```typescript
// ✅ CORRECTO — el hash existe cuando Sequelize valida allowNull: false
hooks: {
  beforeValidate: async (user: User) => {
    if (user.changed('password') && user.password && !user.password.startsWith('$2')) {
      const salt = await bcryptjs.genSalt(10);
      user.password = await bcryptjs.hash(user.password, salt);
    }
  },
},

// ❌ INCORRECTO — password aún es null durante la validación
hooks: {
  beforeCreate: async (user: User) => {
    user.password = await bcryptjs.hash(user.password, 10); // ← llega null
  },
},
```

---

## Tipos de datos por caso de uso

```typescript
// Strings cortos (nombre, email, token)
campo: { type: DataTypes.STRING, allowNull: false }

// Texto largo (instrucciones, descripción, notas)
campo: { type: DataTypes.TEXT, allowNull: true }

// Enumerados
role: { type: DataTypes.ENUM('admin', 'user'), defaultValue: 'admin' }

// JSON (historial de mensajes, arrays)
messages: { type: DataTypes.JSON, defaultValue: [] }

// IDs externos (OpenAI)
openaiVectorStoreId: { type: DataTypes.STRING, allowNull: true } // puede ser null inicialmente
openaiFileId: { type: DataTypes.STRING, allowNull: false }

// Claves foráneas
userId: { type: DataTypes.INTEGER, allowNull: false }

// FK nullable — para separar sesiones autenticadas de sesiones anónimas (widget)
userId: { type: DataTypes.INTEGER, allowNull: true }
// null = visitante anónimo del widget; número = usuario autenticado del backoffice
```

---

## ⚠️ REGLA CRÍTICA — Registro de modelos en `models/index.ts`

**Cada modelo nuevo DEBE importarse en `models/index.ts` o su tabla NUNCA se creará.**

Sequelize solo sincroniza (y crea tablas con `sequelize.sync()`) los modelos que han sido
importados al menos una vez antes de que se ejecute `sync`. El punto de entrada
`backend/src/index.ts` importa `./models/index` para asegurarse de que todos los modelos
quedan registrados antes del `sync`.

**Si un modelo no aparece en `models/index.ts`, su tabla no existirá en la BD.**

```typescript
// models/index.ts — IMPORTAR SIEMPRE TODOS LOS MODELOS AQUÍ
import User from './User';
import Agent from './Agent';
import Document from './Document';
import Conversation from './Conversation';
// ← Cada modelo nuevo que se cree debe añadirse aquí

// Asociaciones ...
```

**Checklist al crear un modelo nuevo:**
1. Crear el archivo `NuevoModelo.ts` con su definición
2. Añadir `import NuevoModelo from './NuevoModelo';` en `models/index.ts`
3. Definir sus asociaciones en `models/index.ts`
4. Exportarlo desde `models/index.ts`

Sin el paso 2, `sequelize.sync()` no creará la tabla y obtendrás errores de "tabla no existe".

---

## Definición de asociaciones — SIEMPRE en `models/index.ts`

Nunca definir asociaciones dentro del archivo de cada modelo.
Centralizarlas todas en `models/index.ts`:

```typescript
// models/index.ts
User.hasMany(Agent, { foreignKey: 'userId', onDelete: 'CASCADE' });
Agent.belongsTo(User, { foreignKey: 'userId' });

Agent.hasMany(Document, { foreignKey: 'agentId', onDelete: 'CASCADE' });
Document.belongsTo(Agent, { foreignKey: 'agentId' });

Agent.hasMany(Conversation, { foreignKey: 'agentId', onDelete: 'CASCADE' });
Conversation.belongsTo(Agent, { foreignKey: 'agentId' });
```

---

## Archivos de modelos de este proyecto

| Archivo       | Entidad      | Tabla          | Notas clave                              |
|---------------|--------------|----------------|------------------------------------------|
| `User.ts`     | Usuario      | `users`        | bcrypt en `beforeValidate`               |
| `Agent.ts`    | Agente IA    | `agents`       | `openaiVectorStoreId` puede ser `null`   |
| `Document.ts` | Documento    | `documents`    | Solo guarda `openaiFileId`, nunca el file|
| `Conversation.ts` | Conversación | `conversations` | `messages` es `DataTypes.JSON`; `userId` nullable: null=widget anónimo, número=backoffice |
