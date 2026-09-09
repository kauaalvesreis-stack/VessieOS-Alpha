// VessieLang Advanced Iframe Module - controle total e scripts customizados
// Uso: import { createIframe, ... } from 'iframe-advanced';

/**
 * Controlador avançado para um iframe.
 * Mantém referência, fila de mensagens, listeners e estado.
 */
class IframeController {
  constructor(element, options = {}) {
    this._element = element;
    this._id = element.id || `vl-iframe-${Date.now()}`;
    this._ready = false;
    this._messageQueue = [];
    this._listeners = new Map();
    this._pendingRequests = new Map();
    this._requestId = 0;
    this._consoleCapture = false;
    this._consoleBuffer = [];

    // Configurações
    this._options = options;
    this._autoConnect = options.autoConnect !== false;

    // Listener para mensagens do iframe
    this._messageHandler = this._handleMessage.bind(this);
    window.addEventListener('message', this._messageHandler);

    // Aguarda carregamento
    if (this._autoConnect) {
      this._element.addEventListener('load', () => {
        this._ready = true;
        this._flushQueue();
        if (options.onReady) options.onReady(this);
      });
    }

    // Opcional: capturar console
    if (options.captureConsole) {
      this.captureConsole(true);
    }
  }

  // --- Métodos públicos ---

  /** Executa um script arbitrário dentro do iframe e retorna o resultado. */
  executeScript(script, ...args) {
    return this._sendRequest('__vl_exec', { script, args });
  }

  /** Injeta CSS no iframe. */
  injectCSS(css) {
    return this.executeScript(`
      (function(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return 'CSS injetado';
      })(arguments[0])
    `, css);
  }

  /** Carrega um script externo dentro do iframe (via <script src>). */
  loadScript(url) {
    return this.executeScript(`
      (function(url) {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = url;
          script.onload = () => resolve('Script carregado');
          script.onerror = () => reject('Erro ao carregar script');
          document.head.appendChild(script);
        });
      })(arguments[0])
    `, url);
  }

  /** Envia uma mensagem e aguarda resposta (Promise). */
  sendMessageAndWait(message, timeout = 5000) {
    return this._sendRequest('__vl_message', { message }, timeout);
  }

  /** Envia mensagem "fire-and-forget". */
  sendMessage(message) {
    this._postMessage({ type: '__vl_message', payload: message });
  }

  /** Registra um listener para mensagens específicas (filtro opcional). */
  onMessage(callback, filter = null) {
    const id = Symbol('listener');
    this._listeners.set(id, { callback, filter });
    return () => this._listeners.delete(id); // retorna função para remover
  }

  /** Ativa/desativa a captura do console do iframe. */
  captureConsole(enable = true) {
    this._consoleCapture = enable;
    if (enable) {
      this.executeScript(`
        (function() {
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          console.log = function(...args) {
            window.parent.postMessage({ type: '__vl_console', level: 'log', args }, '*');
            originalLog.apply(console, args);
          };
          console.error = function(...args) {
            window.parent.postMessage({ type: '__vl_console', level: 'error', args }, '*');
            originalError.apply(console, args);
          };
          console.warn = function(...args) {
            window.parent.postMessage({ type: '__vl_console', level: 'warn', args }, '*');
            originalWarn.apply(console, args);
          };
          return 'Console capturado';
        })()
      `);
    } else {
      this.executeScript(`
        (function() {
          // Restaura console (simplificado - apenas recarrega a página para restaurar)
          location.reload();
        })()
      `);
    }
  }

  /** Obtém o buffer do console capturado. */
  getConsoleBuffer() {
    return this._consoleBuffer.slice();
  }

  /** Obtém a URL atual do iframe. */
  getSrc() { return this._element.src; }

  /** Altera a URL. */
  setSrc(url) {
    this._element.src = url;
    this._ready = false;
  }

  /** Recarrega o iframe. */
  reload() {
    this._element.src = this._element.src;
    this._ready = false;
  }

  /** Remove o iframe do DOM. */
  destroy() {
    window.removeEventListener('message', this._messageHandler);
    this._element.parentNode?.removeChild(this._element);
    this._ready = false;
    // Rejeita todas as requisições pendentes
    for (const [id, { reject }] of this._pendingRequests) {
      reject(new Error('Iframe destruído'));
    }
    this._pendingRequests.clear();
  }

  /** Verifica se o iframe está pronto. */
  isReady() { return this._ready; }

  // --- Métodos internos ---

  _postMessage(data) {
    if (this._element.contentWindow) {
      this._element.contentWindow.postMessage(data, '*');
    } else {
      throw new Error('Iframe não possui contentWindow');
    }
  }

  _sendRequest(type, payload, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (!this._ready) {
        // Enfileira até estar pronto
        this._messageQueue.push({ type, payload, resolve, reject, timeout });
        return;
      }
      this._doSendRequest(type, payload, resolve, reject, timeout);
    });
  }

  _doSendRequest(type, payload, resolve, reject, timeout) {
    const id = ++this._requestId;
    const timer = setTimeout(() => {
      this._pendingRequests.delete(id);
      reject(new Error('Timeout na requisição para o iframe'));
    }, timeout);

    this._pendingRequests.set(id, { resolve, reject, timer });
    this._postMessage({ type, payload, _reqId: id });
  }

  _handleMessage(event) {
    // Ignora mensagens de outros iframes
    if (event.source !== this._element.contentWindow) return;

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // Resposta a uma requisição
    if (data._reqId && this._pendingRequests.has(data._reqId)) {
      const { resolve, reject, timer } = this._pendingRequests.get(data._reqId);
      clearTimeout(timer);
      this._pendingRequests.delete(data._reqId);
      if (data._error) {
        reject(new Error(data._error));
      } else {
        resolve(data._result);
      }
      return;
    }

    // Mensagem de console capturada
    if (data.type === '__vl_console') {
      this._consoleBuffer.push({ level: data.level, args: data.args, time: Date.now() });
      // Chama listeners de console se houver
      this._listeners.forEach(({ callback, filter }) => {
        if (!filter || filter === 'console') {
          callback({ type: 'console', level: data.level, args: data.args });
        }
      });
      return;
    }

    // Mensagem genérica
    if (data.type === '__vl_message') {
      this._listeners.forEach(({ callback, filter }) => {
        if (!filter || filter === 'message') {
          callback({ type: 'message', payload: data.payload });
        }
      });
      return;
    }

    // Execução de script (resposta)
    if (data.type === '__vl_exec_result') {
      // já tratado acima via _reqId
      return;
    }
  }

  _flushQueue() {
    while (this._messageQueue.length) {
      const item = this._messageQueue.shift();
      this._doSendRequest(item.type, item.payload, item.resolve, item.reject, item.timeout);
    }
  }
}

// ------------------- API pública -------------------

/** Cria um iframe avançado. */
export function createAdvancedIframe(src, options = {}) {
  if (typeof document === 'undefined') {
    throw new Error('Este módulo requer ambiente browser');
  }
  const iframe = document.createElement('iframe');
  iframe.src = src;

  // Atributos padrão
  const defaults = {
    id: `vl-iframe-${Date.now()}`,
    width: '100%',
    height: '500px',
    sandbox: 'allow-scripts allow-same-origin allow-forms',
    allow: 'microphone; camera; autoplay'
  };
  const merged = { ...defaults, ...options };
  for (const [key, value] of Object.entries(merged)) {
    if (key === 'onReady' || key === 'captureConsole' || key === 'autoConnect') continue;
    iframe.setAttribute(key, value);
  }
  // ID garantido
  if (!iframe.id) iframe.id = `vl-iframe-${Date.now()}`;

  document.body.appendChild(iframe);
  const controller = new IframeController(iframe, {
    onReady: options.onReady,
    captureConsole: options.captureConsole || false,
    autoConnect: options.autoConnect !== false
  });
  return controller;
}

/** Obtém um controlador existente pelo ID do iframe. */
export function getIframeController(id) {
  const el = document.getElementById(id);
  if (!el || el.tagName !== 'IFRAME') return null;
  // Criamos um novo controller (não reutiliza o antigo, mas funciona)
  return new IframeController(el, { autoConnect: false });
}

/** Lista todos os iframes controlados (identificados pelo atributo data-vl). */
export function listIframes() {
  const frames = document.querySelectorAll('iframe[data-vl]');
  return Array.from(frames).map(el => new IframeController(el, { autoConnect: false }));
}

/** Remove todos os iframes controlados. */
export function removeAllIframes() {
  const frames = document.querySelectorAll('iframe[data-vl]');
  frames.forEach(el => el.parentNode?.removeChild(el));
}

/** API para expor como built-in da linguagem */
export const IframeAdvancedAPI = {
  createIframe: createAdvancedIframe,
  getIframe: getIframeController,
  listIframes,
  removeAllIframes,
  // também podemos expor a classe para uso avançado
  IframeController
};

// Exposição global (opcional)
if (typeof window !== 'undefined') {
  window.VLIframeAdvanced = IframeAdvancedAPI;
}