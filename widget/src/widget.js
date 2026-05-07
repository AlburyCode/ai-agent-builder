(function () {
  // En local: valor de .env (VITE_BACKEND_URL=http://localhost:3000)
  // En Vercel: variable de entorno VITE_BACKEND_URL del proyecto widget
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  // --- Config: __AI_WIDGET_CONFIG__ tiene prioridad sobre data-* ---
  const cfg = window.__AI_WIDGET_CONFIG__ || {};
  const currentScript = document.currentScript;

  const agentId = parseInt(
    cfg.agentId || (currentScript && currentScript.getAttribute('data-agent-id')) || '1',
    10
  );
  const color = cfg.color || (currentScript && currentScript.getAttribute('data-color')) || '#1976d2';
  const position = cfg.position || (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right';
  const title = cfg.title || (currentScript && currentScript.getAttribute('data-title')) || '¿En qué puedo ayudarte?';

  // --- Persistencia ---
  const STORAGE_KEY_MSGS = `ai_widget_msgs_${agentId}`;
  const STORAGE_KEY_CONV = `ai_widget_conv_${agentId}`;

  let messages = [];
  let conversationId = null;

  try {
    messages = JSON.parse(localStorage.getItem(STORAGE_KEY_MSGS) || '[]');
    conversationId = localStorage.getItem(STORAGE_KEY_CONV) || null;
  } catch (_) {
    messages = [];
    conversationId = null;
  }

  // --- Posición ---
  const isLeft = position === 'bottom-left';
  const hPos = isLeft ? 'left: 20px;' : 'right: 20px;';

  // --- Shadow DOM ---
  const container = document.createElement('div');
  container.id = 'ai-chat-widget';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  shadow.innerHTML = `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      #chat-bubble {
        position: fixed;
        bottom: 20px;
        ${hPos}
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: ${color};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,0.28);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      #chat-bubble:hover {
        transform: scale(1.08);
        box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      }

      #chat-bubble svg {
        width: 28px;
        height: 28px;
        fill: #fff;
        pointer-events: none;
      }

      #chat-panel {
        position: fixed;
        bottom: 88px;
        ${hPos}
        width: 350px;
        height: 500px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483646;
        font-family: system-ui, sans-serif;
        opacity: 0;
        transform: translateY(12px) scale(0.97);
        pointer-events: none;
        transition: opacity 0.22s ease, transform 0.22s ease;
      }

      #chat-panel.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }

      #chat-header {
        background: ${color};
        color: #fff;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 15px;
        font-weight: 600;
        flex-shrink: 0;
      }

      #close-btn {
        background: none;
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        padding: 2px 6px;
        border-radius: 4px;
        opacity: 0.85;
        transition: opacity 0.15s;
      }
      #close-btn:hover { opacity: 1; }

      #messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 14px 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        scroll-behavior: smooth;
      }

      .msg {
        max-width: 80%;
        padding: 9px 13px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.45;
        word-break: break-word;
        white-space: pre-wrap;
      }

      .msg.user {
        align-self: flex-end;
        background: ${color};
        color: #fff;
        border-bottom-right-radius: 4px;
      }

      .msg.assistant {
        align-self: flex-start;
        background: #f1f1f1;
        color: #1a1a1a;
        border-bottom-left-radius: 4px;
      }

      #typing-indicator {
        display: none;
        align-self: flex-start;
        background: #f1f1f1;
        border-radius: 16px;
        border-bottom-left-radius: 4px;
        padding: 10px 14px;
        gap: 5px;
        align-items: center;
      }

      #typing-indicator.visible {
        display: flex;
      }

      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #999;
        animation: pulse 1.2s infinite ease-in-out;
      }
      .dot:nth-child(2) { animation-delay: 0.2s; }
      .dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes pulse {
        0%, 60%, 100% { transform: scale(1); opacity: 0.6; }
        30% { transform: scale(1.35); opacity: 1; }
      }

      #chat-footer {
        border-top: 1px solid #e8e8e8;
        padding: 10px;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        flex-shrink: 0;
        background: #fff;
      }

      #message-input {
        flex: 1;
        resize: none;
        border: 1px solid #d4d4d4;
        border-radius: 8px;
        padding: 8px 11px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        max-height: 100px;
        min-height: 38px;
        outline: none;
        transition: border-color 0.15s;
      }

      #message-input:focus { border-color: ${color}; }

      #send-btn {
        width: 38px;
        height: 38px;
        border-radius: 8px;
        border: none;
        background: ${color};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: opacity 0.15s;
      }
      #send-btn:hover { opacity: 0.85; }
      #send-btn svg { width: 18px; height: 18px; fill: #fff; }
    </style>

    <!-- Burbuja flotante -->
    <button id="chat-bubble" aria-label="Abrir chat">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-2 10H6v-2h12v2zm0-4H6V6h12v2z"/>
      </svg>
    </button>

    <!-- Panel de chat -->
    <div id="chat-panel" role="dialog" aria-label="${title}">
      <div id="chat-header">
        <span>${title}</span>
        <button id="close-btn" aria-label="Cerrar chat">&times;</button>
      </div>
      <div id="messages-container">
        <div id="typing-indicator" aria-live="polite">
          <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        </div>
      </div>
      <div id="chat-footer">
        <textarea
          id="message-input"
          rows="1"
          placeholder="Escribe tu mensaje..."
          aria-label="Mensaje"
        ></textarea>
        <button id="send-btn" aria-label="Enviar">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // --- Referencias ---
  const bubble = shadow.getElementById('chat-bubble');
  const panel = shadow.getElementById('chat-panel');
  const closeBtn = shadow.getElementById('close-btn');
  const messagesContainer = shadow.getElementById('messages-container');
  const typingIndicator = shadow.getElementById('typing-indicator');
  const messageInput = shadow.getElementById('message-input');
  const sendBtn = shadow.getElementById('send-btn');

  // --- Render ---
  function renderMessages() {
    // Eliminar burbujas previas (no el typing indicator)
    Array.from(messagesContainer.children).forEach(child => {
      if (child.id !== 'typing-indicator') child.remove();
    });

    messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = `msg ${msg.role}`;
      div.textContent = msg.content;
      messagesContainer.insertBefore(div, typingIndicator);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showTyping() {
    typingIndicator.classList.add('visible');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTyping() {
    typingIndicator.classList.remove('visible');
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(messages));
      if (conversationId !== null) {
        localStorage.setItem(STORAGE_KEY_CONV, String(conversationId));
      }
    } catch (_) { /* cuota superada o modo privado */ }
  }

  // --- sendMessage ---
  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    messages.push({ role: 'user', content: text });
    messageInput.value = '';
    messageInput.style.height = 'auto';
    renderMessages();
    showTyping();

    try {
      const response = await fetch(`${BACKEND_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          message: text,
          conversationId: conversationId ? Number(conversationId) : null
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      conversationId = data.conversationId;
      messages.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      messages.push({ role: 'assistant', content: 'Lo siento, hubo un error al contactar con el servidor.' });
    } finally {
      hideTyping();
      renderMessages();
      saveToStorage();
    }
  }

  // --- Eventos ---
  bubble.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      messageInput.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open');
  });

  sendBtn.addEventListener('click', sendMessage);

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 100) + 'px';
  });

  // --- Init: renderizar mensajes previos ---
  if (messages.length > 0) {
    renderMessages();
  }
})();
