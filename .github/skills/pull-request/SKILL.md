---
name: pull-request
description: "Use when creating a pull request, preparing a merge request, committing pending changes, or opening a PR to main. Triggers: pull request, PR, merge request, commit and push, preparar PR, crear PR, subir cambios, commit pendientes, merge a main."
argument-hint: "Rama destino (defecto: main)"
---

# Skill: Preparar Pull Request

Analiza todos los cambios pendientes del repositorio, los agrupa, genera un commit semántico y redacta un Pull Request completo listo para abrir en GitHub.

## Cuándo usar

- Hay archivos sin commitear y quieres subirlos con un PR bien documentado
- Quieres que Copilot analice qué se ha hecho y genere el título + descripción del PR
- Preparar una merge request hacia `main` (o cualquier otra rama destino)

## Procedimiento

### Paso 1 — Verificar estado del repositorio

Ejecutar el script de análisis para obtener un resumen completo de los cambios:

```powershell
.github/skills/pull-request/scripts/analyze-changes.ps1
```

Si git no está inicializado, detener y avisar al usuario.

### Paso 2 — Analizar los cambios

Con la salida del script, identificar:

1. **Archivos nuevos** (`??` en git status) — funcionalidades añadidas
2. **Archivos modificados** (`M`) — cambios en código existente
3. **Archivos eliminados** (`D`) — código removido
4. **Área afectada** — agrupar por prefijo de ruta:
   - `backend/` → cambios en API, modelos, controladores
   - `clinic-frontend/` → cambios en UI, componentes,servicios
   - `.github/` → cambios en configuración de Copilot / CI
   - raíz → documentación, configuración general

Leer el contenido de los archivos más relevantes con `read_file` para entender en detalle qué se implementó. Ver las convenciones de commits en [references/conventional-commits.md](./references/conventional-commits.md).

### Paso 3 — Determinar la rama actual y rama destino

```powershell
git branch --show-current           # rama actual
git log --oneline main..HEAD        # commits ya hechos desde main
```

Si la rama actual es `main`, avisar al usuario que debería trabajar en una feature branch y preguntar si crear una nueva.

> ⚠️ **No usar `git diff main --stat` para describir el PR.** Ese comando muestra *todos* los cambios de la rama desde `main`, incluyendo commits anteriores ya publicados. El cuerpo del PR debe describir **únicamente los archivos del `git status` inicial** (Paso 1 y 2) — es decir, los cambios que se van a commitear en esta ejecución del skill.

### Paso 4 — Generar el commit para los cambios pending

Basándose en el análisis, construir un mensaje de commit semántico siguiendo [Conventional Commits](./references/conventional-commits.md):

```powershell
git add .
git commit -m "<tipo>(<alcance>): <descripción corta>

<body con detalle de qué se implementó y por qué>

<footer con breaking changes o referencias si aplica>"
```

Usar el tipo correcto: `feat`, `fix`, `docs`, `chore`, `refactor`, `style`, `test`.

### Paso 5 — Push a la rama remota

```powershell
git push origin HEAD
```

Si el remote no existe o hay error de upstream, ejecutar:

```powershell
git push --set-upstream origin <nombre-rama>
```

### Paso 6 — Redactar el Pull Request

Generar el título y el cuerpo del PR siguiendo la plantilla en [references/pr-template.md](./references/pr-template.md).

**Título del PR** — formato: `<tipo>: <descripción concisa del cambio principal>`

**Alcance del PR**: el cuerpo debe describir **exclusivamente** los archivos identificados en el Paso 2 (los que estaban en `git status` al inicio de esta ejecución). No incluir ni mencionar commits ni archivos anteriores que ya estuvieran en la rama.

**Cuerpo del PR** con estas secciones:
- `## ¿Qué hace este PR?` — resumen en 2-3 frases
- `## Cambios realizados` — lista agrupada por area (backend / frontend / config)
- `## Archivos modificados` — tabla con archivo y motivo del cambio
- `## Cómo probar` — pasos para verificar que funciona
- `## Notas adicionales` — breaking changes, dependencias, migraciones pendientes

### Paso 7 — Abrir el PR (si GitHub CLI está disponible)

Verificar si `gh` está disponible:

```powershell
gh --version
```

Si está disponible, construir el comando y mostrárselo al usuario para que lo confirme antes de ejecutar:

```powershell
gh pr create --base main --title "<título>" --body "<cuerpo>"
```

Si `gh` no está disponible, mostrar al usuario el título y cuerpo listos para pegar en la interfaz web de GitHub.

## Notas importantes

- **Nunca hacer `git push --force`** sin confirmación explícita del usuario
- **Nunca borrar ramas** en este proceso
- Si hay conflictos con `main`, mostrar los archivos en conflicto y detener. No intentar resolver conflictos automáticamente
- Si el usuario no ha configurado un remote, avisar y detener en el Paso 5
