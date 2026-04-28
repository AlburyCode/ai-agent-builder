---
applyTo: "backend/src/services/**"
---

# Instrucciones para services — AI Agent Builder

Aplica estas reglas a TODOS los archivos en `backend/src/services/`.

---

## Responsabilidad del service

El service contiene **toda la lógica de negocio**. No tiene acceso a `req` ni `res`.
Recibe **parámetros planos** (números, strings, objetos simples) y devuelve datos o lanza `Error`.

```
Controller  →  Service  →  Model (BD) / API externa
               ↑
               solo lógica, sin HTTP
```

---

## Patrón general de un service

```typescript
import ModelName from '../models/ModelName';

export const getAll = async (userId: number): Promise<ModelName[]> => {
  return await ModelName.findAll({ where: { userId } });
};

export const getById = async (id: number, userId: number): Promise<ModelName> => {
  const item = await ModelName.findOne({ where: { id, userId } });
  if (!item) throw new Error('No encontrado');
  return item;
};

export const create = async (
  data: { name: string; description?: string },
  userId: number
): Promise<ModelName> => {
  return await ModelName.create({ ...data, userId });
};

export const update = async (
  id: number,
  data: Partial<{ name: string; description: string }>,
  userId: number
): Promise<ModelName> => {
  const item = await ModelName.findOne({ where: { id, userId } });
  if (!item) throw new Error('No encontrado o sin permiso');
  return await item.update(data);
};

export const remove = async (id: number, userId: number): Promise<void> => {
  const item = await ModelName.findOne({ where: { id, userId } });
  if (!item) throw new Error('No encontrado o sin permiso');
  await item.destroy();
};
```

---

## Reglas específicas de seguridad para `auth.service.ts`

```typescript
// ✅ CORRECTO — mismo mensaje para usuario no encontrado y contraseña incorrecta
// No revelar si el email existe en el sistema
const INVALID = 'Credenciales inválidas';

if (!user) throw new Error(INVALID);

const isValid = await bcryptjs.compare(password, user.password);
if (!isValid) throw new Error(INVALID); // mismo mensaje, no 'Contraseña incorrecta'
```

---

## Reglas para `openai.service.ts`

- **Nunca usar `code_interpreter`**. Solo `file_search` vía `tools: [{ type: 'file_search', vector_store_ids: [...] }]`.
- Los archivos se suben a OpenAI con `purpose: 'assistants'`. El servicio devuelve el `fileId`.
- El backend **nunca escribe archivos en disco**. Usa `multer memoryStorage` para recibir el buffer.
- Para el chat, usar `openai.responses.create` con `input[]`, `instructions` y `tools` con `vector_store_ids`.
  No usar Assistants API (deprecada agosto 2026).

### Patrón correcto — Vector Store incremental

El Vector Store se crea **una sola vez** por agente y se reutiliza. Los archivos se añaden/eliminan individualmente.

```typescript
// ✅ CORRECTO — crear VS la primera vez y reutilizar
// vectorStores es top-level en SDK v6: openai.vectorStores (NO openai.beta.vectorStores)
const vectorStore = await openai.vectorStores.create({ name: `agent-${agentId}-vs` });
await agent.update({ openaiVectorStoreId: vectorStore.id });

// Añadir archivo al VS existente
await openai.vectorStores.files.create(vsId, { file_id: openaiFileId });

// Eliminar archivo (al borrar de openai.files, se elimina automáticamente del VS)
await openai.files.delete(openaiFileId);

// ✅ CORRECTO — chat con Responses API
const response = await openai.responses.create({
  model: 'gpt-4o',
  instructions: agent.instructions,
  input: [...conversationHistory, { role: 'user', content: userMessage }],
  tools: [{ type: 'file_search', vector_store_ids: [agent.openaiVectorStoreId] }]
});
const reply = response.output_text;

// ❌ INCORRECTO — no usar code_interpreter
tools: [{ type: 'code_interpreter' }]
```

---

## Reglas para `document.service.ts`

- Nunca guardar el archivo físico. Solo guardar el `openaiFileId` en la BD.
- `multer` debe configurarse con `memoryStorage()`, no `diskStorage()`.

```typescript
// ✅ CORRECTO — solo metadatos en BD
export const createDocument = async (data: {
  agentId: number;
  fileName: string;
  fileType: string;
  openaiFileId: string;  // ← el ID de OpenAI, no el archivo
}): Promise<Document> => {
  return await Document.create(data);
};
```

---

## Reglas para `conversation.service.ts`

```typescript
// Los mensajes se almacenan en un campo JSON de la tabla conversations
// Estructura: [{ role: 'user'|'assistant', content: string }, ...]

// ✅ CORRECTO — getOrCreateConversation acepta userId opcional
// userId=undefined → widget anónimo → se guarda null en BD
// userId=número  → usuario del backoffice
export const getOrCreateConversation = async (
  conversationId: number | undefined,
  agentId: number,
  userId?: number
): Promise<Conversation> => {
  if (conversationId) {
    const existing = await Conversation.findOne({ where: { id: conversationId, agentId } });
    if (existing) return existing;
  }
  return await Conversation.create({ agentId, messages: [], userId: userId ?? null });
};

// ✅ CORRECTO — getConversationsByAgent filtra por userId
// Solo devuelve las conversaciones del usuario autenticado, nunca las del widget (userId=null)
export const getConversationsByAgent = async (
  agentId: number,
  userId: number
): Promise<Conversation[]> => {
  return await Conversation.findAll({
    where: { agentId, userId },
    order: [['createdAt', 'DESC']],
  });
};

export const addMessage = async (
  conversationId: number,
  role: 'user' | 'assistant',
  content: string
): Promise<void> => {
  const conv = await Conversation.findByPk(conversationId);
  if (!conv) throw new Error('Conversación no encontrada');

  const messages = (conv.messages as Array<{ role: string; content: string }>) || [];
  messages.push({ role, content });
  await conv.update({ messages });
};
```

### Separación backoffice / widget — resumen

| Quién llama | Middleware en `/chat/message` | userId en BD | Historial |
|-------------|-------------------------------|-------------|-----------|
| Backoffice (Angular con JWT) | `authenticateOptional` → `req.user` disponible | número | API: `GET /conversations/agent/:id` filtra por userId |
| Widget (sin token) | `authenticateOptional` → `req.user` undefined | `null` | localStorage del navegador |

**El middleware correcto para `/chat/message` es `authenticateOptional`, no `authenticate`.**
`authenticate` rechazaría las peticiones del widget con 401. `authenticateOptional` establece
`req.user` si hay token válido y continúa sin error si no lo hay.
