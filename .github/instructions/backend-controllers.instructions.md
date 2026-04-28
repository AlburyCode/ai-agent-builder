---
applyTo: "backend/src/controllers/**"
---

# Instrucciones para controllers Express — AI Agent Builder

Aplica estas reglas a TODOS los archivos en `backend/src/controllers/`.

---

## Responsabilidad del controller

El controller solo hace tres cosas:
1. **Extraer** datos de `req.body`, `req.params`, `req.query`, `req.user`
2. **Validar presencia** de campos obligatorios
3. **Delegar** al service y **devolver** la respuesta

No debe contener lógica de negocio. Eso va en el service.

```typescript
// ✅ PATRÓN CORRECTO
export const create = async (req: Request, res: Response): Promise<void> => {
  const { name, description, instructions } = req.body;   // 1. EXTRAE

  if (!name) {                                              // 2. VALIDA
    res.status(400).json({ error: 'El nombre es obligatorio' });
    return;
  }

  try {
    const result = await myService.create(                 // 3. DELEGA
      { name, description, instructions },
      req.user!.userId
    );
    res.status(201).json(result);                          // 4. RESPONDE
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    res.status(500).json({ error: message });
  }
};
```

---

## ⚠️ REGLA CRÍTICA — `req.params.id` siempre convertir a número

`req.params.id` es siempre un `string`. El ORM Sequelize puede comportarse de forma
inesperada o devolver `null` si se le pasa un string cuando espera un número.

```typescript
// ✅ CORRECTO
const agent = await Agent.findByPk(+req.params.id);
const agent = await Agent.findByPk(parseInt(req.params.id, 10));

// ❌ INCORRECTO — aunque TypeScript no lo marque como error, Sequelize puede fallar
const agent = await Agent.findByPk(req.params.id);
```

Aplicar también en `userId`:
```typescript
// ✅ CORRECTO
const userId: number = req.user!.userId; // ya es number si se tipó bien en el middleware
```

---

## Códigos HTTP a usar

| Situación                          | Status Code |
|------------------------------------|-------------|
| Creación exitosa                   | `201`       |
| Lectura/actualización exitosa      | `200`       |
| Eliminación exitosa (sin body)     | `204`       |
| Campo obligatorio ausente          | `400`       |
| No autenticado (sin token)         | `401`       |
| Autenticado pero sin permiso       | `403`       |
| Recurso no encontrado              | `404`       |
| Conflicto (email duplicado, etc.)  | `409`       |
| Error de servidor                  | `500`       |

---

## Seguridad — nunca actualizar con `req.body` directo

```typescript
// ✅ CORRECTO — solo campos permitidos explícitamente
const { name, description, instructions } = req.body;
await agentService.update(+req.params.id, { name, description, instructions }, req.user!.userId);

// ❌ INCORRECTO — un atacante podría modificar userId u openaiVectorStoreId
await Agent.update(req.body, { where: { id: req.params.id } });
```

---

## Patrón para controllers de este proyecto

```typescript
import { Request, Response } from 'express';
import * as myService from '../services/my.service';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const items = await myService.getAll(req.user!.userId);
    res.status(200).json(items);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    res.status(500).json({ error: message });
  }
};

export const getOne = async (req: Request, res: Response): Promise<void> => {
  try {
    const item = await myService.getById(+req.params.id, req.user!.userId);
    res.status(200).json(item);
  } catch (error: unknown) {
    res.status(404).json({ error: 'No encontrado' });
  }
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const { requiredField } = req.body;
  if (!requiredField) {
    res.status(400).json({ error: 'requiredField es obligatorio' });
    return;
  }
  try {
    const item = await myService.create({ requiredField }, req.user!.userId);
    res.status(201).json(item);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al crear';
    res.status(400).json({ error: message });
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const { field1, field2 } = req.body; // extraer solo los campos permitidos
  try {
    const item = await myService.update(+req.params.id, { field1, field2 }, req.user!.userId);
    res.status(200).json(item);
  } catch (error: unknown) {
    res.status(404).json({ error: 'No encontrado o sin permiso' });
  }
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  try {
    await myService.remove(+req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (error: unknown) {
    res.status(404).json({ error: 'No encontrado o sin permiso' });
  }
};
```
