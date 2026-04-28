# Plantilla de Pull Request

Usada por la skill `pull-request` en el Paso 6 para generar el cuerpo del PR.

---

## Título

```
<tipo>(<alcance>): <descripción concisa del cambio principal>
```

Ejemplos:
- `feat(appointments): add overlap validation and appointment management UI`
- `fix(auth): resolve JWT expiry and guard redirect loop`
- `chore(copilot): add pull-request skill with automated PR generation`

---

## Cuerpo

```markdown
## ¿Qué hace este PR?

<!-- 2-3 frases explicando el objetivo del cambio. Qué problema resuelve o qué funcionalidad añade. -->

## Cambios realizados

### Backend
- [ ] <!-- descripción del cambio 1 -->
- [ ] <!-- descripción del cambio 2 -->

### Frontend
- [ ] <!-- descripción del cambio 1 -->
- [ ] <!-- descripción del cambio 2 -->

### Configuración / Documentación
- [ ] <!-- descripción del cambio 1 -->

## Archivos modificados

| Archivo | Tipo de cambio | Motivo |
|---|---|---|
| `ruta/al/archivo.ts` | Nuevo / Modificado / Eliminado | Por qué se tocó |

## Cómo probar

1. <!-- paso 1 -->
2. <!-- paso 2 -->
3. <!-- resultado esperado -->

## Notas adicionales

<!-- Breaking changes, migraciones de base de datos pendientes, variables de entorno nuevas, dependencias añadidas, etc. -->
<!-- Si no hay nada especial, escribir: "Sin breaking changes ni dependencias adicionales." -->
```

---

## Checklist de revisión (añadir al PR si aplica)

```markdown
## Checklist

- [ ] El código compila sin errores TypeScript
- [ ] Las rutas están protegidas con `authMiddleware`
- [ ] Los `findByPk` usan `+req.params.id`
- [ ] No hay `console.log` de debug en el código final
- [ ] Los modelos nuevos tienen sus associations definidas
- [ ] El frontend usa `inject()` en lugar de inyección por constructor
- [ ] Se ha probado manualmente el flujo completo
```
