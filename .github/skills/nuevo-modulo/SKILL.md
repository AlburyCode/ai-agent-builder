---
name: nuevo-modulo
description: "Use when adding a new entity or module to the project from scratch. Covers full-stack scaffolding: Sequelize model, Express CRUD, Angular service and components. Triggers: new entity, nuevo módulo, nueva entidad, scaffolding, CRUD completo full-stack, añadir módulo, crear módulo, agregar entidad."
argument-hint: "Nombre de la entidad en PascalCase (ej: Treatment, Invoice, Room)"
---

# Skill: Nuevo Módulo Full-Stack

Crea una entidad nueva de extremo a extremo: modelo Sequelize, CRUD Express y módulo Angular completo (servicio + lista + formulario + rutas).

## Cuándo usar

- Hay que añadir una entidad nueva que no existe en el proyecto
- Se necesita el ciclo completo: backend + frontend
- Scaffolding de un CRUD full-stack siguiendo los patrones del proyecto

---

## Procedimiento

### Paso 1 — Crear el modelo Sequelize

Invocar el prompt `/new-model` pasando el nombre de la entidad:

```
/new-model <NombreEntidad>
```

El prompt creará `backend/src/models/<entidad>.ts` con:
- La interfaz de atributos y de atributos de creación
- La clase que extiende `Model`
- `Model.init()` con todos los campos
- Las asociaciones necesarias (si las hay)

Importar el nuevo modelo en `backend/src/index.ts` junto a los demás modelos para que `sequelize.sync()` lo incluya.

---

### Paso 2 — Crear el CRUD de backend

Invocar el prompt `/new-crud` pasando el nombre de la entidad:

```
/new-crud <NombreEntidad>
```

El prompt creará:
- `backend/src/controllers/<entidad>.controller.ts` — funciones `getAll`, `getById`, `create`, `update`, `remove`
- `backend/src/routes/<entidad>.routes.ts` — rutas REST estándar
- Registro del router en `backend/src/index.ts` bajo `authMiddleware`

**Verificar** que el controlador usa `+req.params.id` en todos los `findByPk()`.

---

### Paso 3 — Crear el servicio Angular

Crear `clinic-frontend/src/app/services/<entidad>.service.ts` usando la plantilla en [./assets/service.template.ts](./assets/service.template.ts).

Sustituir:
- `EntityName` → nombre de la entidad en PascalCase (ej: `Treatment`)
- `entity` → nombre en camelCase (ej: `treatment`)
- `entities` → plural en camelCase (ej: `treatments`)
- El segmento de URL `/api/entities` → la ruta real del backend (ej: `/api/treatments`)
- Los campos de la interfaz → los campos reales del modelo

---

### Paso 4 — Crear los componentes Angular

Crear dos componentes standalone en `clinic-frontend/src/app/components/<entidad>/`:

#### `<entidad>-list/<entidad>-list.component.ts`
- Carga los registros con `ngOnInit()` llamando a `service.getAll()`
- Muestra los datos en `<mat-card>` o `<mat-table>`
- Botón "Nueva <entidad>" que navega al formulario con `router.navigate(['/entidades/new'])`
- Botón "Editar" que navega a `/entidades/:id/edit`
- Botón "Eliminar" que llama a `service.delete(id)` y recarga la lista

#### `<entidad>-form/<entidad>-form.component.ts`
- `FormGroup` declarado como propiedad `form!: FormGroup` e inicializado en el `constructor`
- Lee `:id` de la ruta con `ActivatedRoute`; si existe, carga el registro y rellena el formulario
- `onSubmit()`: llama a `create` o `update` según si hay id, navega de vuelta a la lista tras el éxito
- Usa `MatSnackBar` para notificar errores

Importar `MATERIAL_IMPORTS` de `material.imports.ts` en los dos componentes.

---

### Paso 5 — Añadir las rutas en Angular

En `clinic-frontend/src/app/app.routes.ts`, añadir bajo las rutas protegidas por `authGuard`:

```typescript
{
  path: 'entidades',
  canActivate: [authGuard],
  children: [
    { path: '', component: EntidadListComponent },
    { path: 'new', component: EntidadFormComponent },
    { path: ':id/edit', component: EntidadFormComponent },
  ]
},
```

Añadir un enlace de navegación en el menú del `AppComponent` (mat-toolbar) apuntando a `/entidades`.

---

## Checklist de finalización

- [ ] Modelo Sequelize creado e importado en `index.ts`
- [ ] Controller y routes creados, router registrado en `index.ts`
- [ ] `findByPk` usa `+req.params.id` en todos los casos
- [ ] Servicio Angular creado con los métodos CRUD
- [ ] Componente lista y componente formulario creados como standalone
- [ ] `FormGroup` inicializado en el constructor (no como propiedad de clase)
- [ ] Rutas añadidas en `app.routes.ts` protegidas con `authGuard`
- [ ] Enlace añadido en la navbar
