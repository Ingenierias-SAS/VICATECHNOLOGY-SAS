(function () {
  if (window.__chatbootEmbedded) return; // idempotente
  window.__chatbootEmbedded = true;

  function getBasePath() {
    const s = document.currentScript;
    if (!s) return './chatboot/';
    const url = new URL(s.src, window.location.href);
    // Remove file name
    return url.href.replace(/[^/]+$/, '');
  }

  function ensureCSS(base) {
    const href = base + 'chatboot.css';
    const exists = Array.from(document.styleSheets || []).some(ss => {
      try { return ss.href && ss.href.endsWith('chatboot.css'); } catch (_) { return false; }
    });
    if (!exists) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  }

  function ensureMarkup() {
    if (document.getElementById('chatToggle') || document.getElementById('chatContainer')) return;
    const btn = document.createElement('button');
    btn.className = 'chat-toggle';
    btn.id = 'chatToggle';
    btn.setAttribute('aria-label', 'Abrir chat');
    // Inline SVG de burbuja de chat
    btn.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z" fill="#fff"/><circle cx="8" cy="11" r="1.5" fill="#4b7bec"/><circle cx="12" cy="11" r="1.5" fill="#4b7bec"/><circle cx="16" cy="11" r="1.5" fill="#4b7bec"/></svg>';

    const container = document.createElement('div');
    container.className = 'chat-container';
    container.id = 'chatContainer';
    container.innerHTML = `
      <div class="chat-header">
        <div class="chat-title">Safyra</div>
        <div class="chat-subtitle">asistente virtual</div>
        <span class="chat-close" id="chatClose" aria-label="Cerrar chat" role="button" tabindex="0">&times;</span>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-input">
        <input type="text" id="userInput" placeholder="Escribe tu mensaje..." aria-label="Mensaje" />
        <button type="button">Enviar</button>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(container);
  }

  function loadCore(base) {
    return new Promise((resolve) => {
      if (window.Chatboot && typeof window.Chatboot.init === 'function') return resolve();
      const s = document.createElement('script');
      s.src = base + 'chatboot.js';
      s.async = true;
      s.onload = () => resolve();
      document.head.appendChild(s);
    });
  }

  function initAfterDOM() {
    const base = getBasePath();
    ensureCSS(base);
    ensureMarkup();
    loadCore(base).then(() => {
      try { window.Chatboot && window.Chatboot.init({ baseUrl: base }); } catch (_) { /* noop */ }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAfterDOM);
  } else {
    initAfterDOM();
  }
})();
