---
applyTo: "widget/**"
---

# Instrucciones para el Widget embebible — AI Agent Builder

Aplica estas reglas a TODOS los archivos en `widget/`.

---

## Estructura del proyecto widget

```
widget/
├── index.html        ← página de prueba local (Vite dev server)
├── package.json      ← scripts: dev (port 5173) y build (iife)
├── vite.config.js    ← build lib, formato iife, output widget.js
└── src/
    └── widget.js     ← único archivo fuente, IIFE autoejecutada
```

---

## ⚠️ REGLA CRÍTICA — Prioridad de configuración: `__AI_WIDGET_CONFIG__` > `data-*`

El widget puede recibir configuración de dos fuentes:
1. Atributos `data-*` del tag `<script>` que lo carga (caso embed en web real)
2. `window.__AI_WIDGET_CONFIG__` inyectado antes de cargar el script (caso preview del backoffice)

**`window.__AI_WIDGET_CONFIG__` siempre tiene prioridad** sobre los `data-*`. Sin esta regla,
el `data-agent-id` hardcodeado en `index.html` (que apunta al agente 1) siempre ganaría,
ignorando el agente seleccionado en el backoffice al abrir el preview.

```javascript
// ✅ CORRECTO — __AI_WIDGET_CONFIG__ tiene prioridad
(function () {
  const currentScript = document.currentScript;
  const cfg = window.__AI_WIDGET_CONFIG__ || {};

  const agentId = parseInt(
    cfg.agentId || (currentScript && currentScript.getAttribute('data-agent-id')) || '1',
    10
  );
  const title =
    cfg.title || (currentScript && currentScript.getAttribute('data-title')) || 'Asistente';
  const primaryColor =
    cfg.color || (currentScript && currentScript.getAttribute('data-color')) || '#1976d2';
  const position =
    cfg.position || (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';

  // ...resto del widget
})();

// ❌ INCORRECTO — data-* gana sobre __AI_WIDGET_CONFIG__
// Si index.html tiene data-agent-id="1", el preview del backoffice con agentId=3 nunca funcionará
const agentId = parseInt(
  (currentScript && currentScript.getAttribute('data-agent-id')) || cfg.agentId || '1',
  10
);
```

---

## ⚠️ REGLA CRÍTICA — `index.html` debe leer query params y setear `__AI_WIDGET_CONFIG__` ANTES del script

El botón "Probar widget" del backoffice abre `http://localhost:5173?agentId=X&title=...&color=...&position=...`.
Para que el widget reciba esos parámetros, `index.html` debe leer la query string y construir
`window.__AI_WIDGET_CONFIG__` **antes** de que el tag `<script src="/src/widget.js">` se evalúe.

```html
<!-- ✅ CORRECTO — el bloque inline va ANTES del script del widget -->
<script>
  const params = new URLSearchParams(window.location.search);
  if (params.has('agentId') || params.has('title') || params.has('color') || params.has('position')) {
    window.__AI_WIDGET_CONFIG__ = {
      agentId:  params.get('agentId')   || '1',
      title:    params.get('title')     || 'Asistente',
      color:    params.get('color')     || '#1976d2',
      position: params.get('position') || 'bottom-right',
    };
  }
</script>
<script
  src="/src/widget.js"
  data-agent-id="1"
  data-title="Asistente"
  data-color="#1976d2"
  data-position="bottom-right">
</script>

<!-- ❌ INCORRECTO — el script del widget se carga antes de construir __AI_WIDGET_CONFIG__ -->
<script src="/src/widget.js" data-agent-id="1"></script>
<script>
  window.__AI_WIDGET_CONFIG__ = { agentId: params.get('agentId') };  // demasiado tarde
</script>
```

---

## ⚠️ REGLA CRÍTICA — Manejo de errores HTTP: mostrar el status real, nunca mensajes genéricos

El bloque `catch` del widget **debe mostrar el código HTTP y el mensaje real** del backend.
Un mensaje genérico como "Error al conectar" oculta la causa raíz y hace imposible depurar.

```javascript
// ✅ CORRECTO — muestra status HTTP real y mensaje del backend
const response = await fetch(`${apiBase}/chat/message`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agentId, message: text, conversationId }),
});

if (!response.ok) {
  const errBody = await response.json().catch(() => ({}));
  throw new Error(`${response.status}: ${errBody.error || response.statusText}`);
}

// en el catch:
} catch (err) {
  const msg = err instanceof Error ? err.message : 'Error desconocido';
  appendMessage('assistant', `Error al conectar con el servidor: ${msg}`);
}

// ❌ INCORRECTO — oculta el código HTTP real
if (!response.ok) throw new Error('Network error');
} catch (_) {
  appendMessage('assistant', 'Error al conectar con el servidor. Inténtalo de nuevo.');
}
```

---

## Configuración de Vite — `vite.config.js`

El widget se compila como una librería IIFE (Immediately Invoked Function Expression)
para poder cargarse con un simple tag `<script>` sin module bundler.

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/widget.js',
      name: 'AIWidget',
      fileName: 'widget',
      formats: ['iife'],          // ← IIFE para compatibilidad con <script> directo
    },
    rollupOptions: {
      output: { entryFileNames: 'widget.js' }
    }
  }
});
```

---

## Scripts de `package.json` del widget

```json
{
  "scripts": {
    "dev":   "vite --port 5173",
    "build": "vite build"
  }
}
```

---

## Versión de Vite compatible con Node.js

| Node.js instalado       | Versión Vite       | Comando                          |
|-------------------------|--------------------|----------------------------------|
| < 20.19 (ej. v20.15)    | **Vite 5.4.x** ✅  | `npm install -D vite@^5.4.0`    |
| ≥ 20.19 o ≥ 22.12       | Vite 5, 6 u 8      | `npm install -D vite`            |

Instalar Vite 8 con Node < 20.19 produce `Cannot find native binding (@rolldown/binding-win32-x64-msvc)`.

---

## Persistencia con localStorage — claves por agente

Las claves deben incluir el `agentId` para que distintos agentes no compartan historial.

```javascript
const STORAGE_MSGS_KEY = `ai_widget_msgs_${agentId}`;
const STORAGE_CONV_KEY = `ai_widget_conv_${agentId}`;

// Al cargar
let messages       = JSON.parse(localStorage.getItem(STORAGE_MSGS_KEY) || '[]');
let conversationId = localStorage.getItem(STORAGE_CONV_KEY) || null;

// Al guardar (después de cada respuesta)
localStorage.setItem(STORAGE_MSGS_KEY, JSON.stringify(messages));
localStorage.setItem(STORAGE_CONV_KEY, String(conversationId));
```

---

## Endpoint de chat — siempre `POST /chat/message`

```javascript
const apiBase = 'http://localhost:3000'; // en producción, usar la URL real del backend

const response = await fetch(`${apiBase}/chat/message`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ agentId, message: text, conversationId }),
});
```

Este endpoint es **público** (sin autenticación). El backend usa `agentId` para cargar
el Vector Store del agente y `conversationId` para mantener el historial de la conversación.

---

## Shadow DOM — aislamiento obligatorio de estilos

Todo el HTML y CSS del widget **debe vivir dentro de un Shadow Root**. Sin esto,
los estilos de la web anfitriona colisionan con los del widget.

```javascript
const container = document.createElement('div');
container.id = 'ai-chat-widget';
document.body.appendChild(container);

const shadow = container.attachShadow({ mode: 'open' });
shadow.innerHTML = `<style>/* estilos aislados */</style><div id="chat-panel">...</div>`;
```
