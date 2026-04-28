# Conventional Commits — Referencia rápida

Usado por la skill `pull-request` en los pasos 2 y 4 para generar mensajes de commit y títulos de PR.

## Formato del commit

```
<tipo>(<alcance>): <descripción corta en imperativo, minúsculas, sin punto final>

[body opcional: explica el QUÉ y el POR QUÉ, no el cómo. Párrafos separados por línea en blanco.]

[footer opcional: BREAKING CHANGE: ..., Closes #123]
```

## Tipos permitidos

| Tipo | Cuándo usarlo |
|---|---|
| `feat` | Nueva funcionalidad visible para el usuario o la API |
| `fix` | Corrección de un bug |
| `docs` | Solo cambios en documentación |
| `style` | Cambios de formato/estilo que no afectan la lógica (CSS, espacios) |
| `refactor` | Refactoring sin añadir features ni corregir bugs |
| `test` | Añadir o corregir tests |
| `chore` | Tareas de mantenimiento: dependencias, configuración, scripts |
| `ci` | Cambios en la configuración de CI/CD |
| `perf` | Mejoras de rendimiento |

## Alcances habituales en este proyecto

| Alcance | Área |
|---|---|
| `auth` | Autenticación JWT, login, guards |
| `patients` | Módulo de pacientes |
| `appointments` | Módulo de citas |
| `doctors` | Módulo de médicos |
| `models` | Modelos Sequelize |
| `frontend` | Cambios generales en Angular |
| `ui` | Componentes de Angular Material |
| `config` | Configuración de proyecto, `.env`, `tsconfig` |
| `copilot` | Archivos `.github/` de personalización de Copilot |

## Ejemplos

```
feat(appointments): add overlap validation before creating appointment

Checks if the doctor already has an appointment in the same time slot
before persisting. Returns 409 Conflict when overlap is detected.
```

```
fix(auth): cast req.params.id to number in findByPk calls

req.params.id is always a string. Without +id cast, TypeScript raises
TS2345 and Sequelize may return null on numeric primary keys.
```

```
chore(copilot): add pull-request skill and update copilot-instructions

Adds .github/skills/pull-request/ with SKILL.md, analyze-changes.ps1
and reference docs to automate PR preparation from Copilot agent mode.
```

```
docs: add modern-ai-driven-development tutorial and script
```

## Reglas de oro

- Descripción en **imperativo presente**: "add", "fix", "update" — no "added", "fixed"
- Máximo **72 caracteres** en la primera línea
- El body responde **qué y por qué**, no cómo
- Un commit = un cambio lógico. Si tienes dos features distintas, dos commits
- `BREAKING CHANGE:` en el footer cuando cambia la API pública o el esquema de DB
