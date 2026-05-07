---
mode: agent
description: >
  Añade el endpoint GET /conversations/agent/:agentId/all al backend.
  Devuelve TODAS las conversaciones de un agente (widget anónimas + backoffice autenticadas),
  verificando que el agente pertenece al usuario que hace la petición.
tools:
  - createFile
  - editFile
---

# Conversations History — Endpoint de historial completo (backend)

Implementa el nuevo endpoint de historial en el backend siguiendo exactamente la arquitectura en capas del proyecto (service → controller → route). **No modifiques ningún endpoint existente.**

---

## PASO 1 — Actualizar el servicio de conversaciones

Edita `/backend/src/services/conversation.service.ts`.

Añade al principio del fichero, junto a la importación existente de `Conversation`, la importación del modelo `Agent`:

```typescript
import Agent from '../models/Agent';
```

Añade la siguiente función **antes** de la función `getConversationsByAgentAndUser` que ya existe:

```typescript
export const getAllConversationsByAgent = async (
  agentId: number,
  requestingUserId: number
): Promise<Conversation[]> => {
  // Verifica que el agente pertenece al usuario que hace la petición
  const agent = await Agent.findOne({ where: { id: agentId, userId: requestingUserId } });
  if (!agent) throw new Error('Agente no encontrado o no autorizado');

  return await Conversation.findAll({
    where: { agentId },
    order: [['createdAt', 'ASC']],
  });
};
```

> **Por qué así:** la autorización se hace comprobando que el agente tiene el `userId` del token, no filtrando por `userId` en las conversaciones. Esto permite devolver tanto las anónimas (`userId: null`) como las autenticadas.

---

## PASO 2 — Añadir el handler en el controller

Edita `/backend/src/controllers/conversation.controller.ts`.

Añade el siguiente handler al final del fichero, después del handler `getByAgent` existente:

```typescript
export const getAllByAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = +req.params.agentId;
    const userId = req.user!.userId;
    const conversations = await conversationService.getAllConversationsByAgent(agentId, userId);
    res.json(conversations);
  } catch (error: any) {
    if (error.message === 'Agente no encontrado o no autorizado') {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al obtener las conversaciones' });
    }
  }
};
```

---

## PASO 3 — Registrar la nueva ruta

Edita `/backend/src/routes/conversation.routes.ts`.

Añade la nueva ruta **después** de la existente, sin tocar la ruta `GET /agent/:agentId`:

```typescript
// GET /conversations/agent/:agentId/all — TODAS las conversaciones del agente (widget + backoffice)
router.get('/agent/:agentId/all', conversationController.getAllByAgent);
```

El fichero completo debe quedar así:

```typescript
import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';

const router = Router();

// GET /conversations/agent/:agentId — conversaciones del usuario autenticado para ese agente
router.get('/agent/:agentId', conversationController.getByAgent);

// GET /conversations/agent/:agentId/all — todas las conversaciones del agente (widget + backoffice)
router.get('/agent/:agentId/all', conversationController.getAllByAgent);

export default router;
```

> **Nota de seguridad:** la ruta `/all` está protegida por el middleware `authenticate` que ya se aplica globalmente en `api.router.ts` con `router.use('/conversations', authenticate, conversationRoutes)`. No hace falta añadir el middleware en la ruta individual.

---

## Verificación

El endpoint resultante tiene este comportamiento:

| Situación | Respuesta |
|---|---|
| Token válido, agente pertenece al usuario | `200` con array de todas las conversaciones |
| Token válido, agente de otro usuario | `403 Agente no encontrado o no autorizado` |
| Sin token | `401` (por el middleware `authenticate` en `api.router.ts`) |

```
GET /conversations/agent/3/all
Authorization: Bearer <JWT>

→ Conversation.findAll({ where: { agentId: 3 } })
  Sin filtro de userId → devuelve todas:
  [{ userId: 1, ... }, { userId: null, ... }, { userId: null, ... }]
```
