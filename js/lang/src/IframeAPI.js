// VessieLang Iframe Module - manipulação e comunicação com iframes
// Uso: import { createIframe, getIframe, sendMessage, onMessage, setSrc, removeIframe } from 'iframe';

/**
 * Cria um novo iframe e o insere no documento.
 * @param {string} src - URL a ser carregada.
 * @param {Object} [options] - Atributos opcionais (id, width, height, class, style, etc.)
 * @returns {Object} - Objeto com métodos para controlar o iframe.
 */
export function createIframe(src, options = {}) {
  if (typeof document === 'undefined') {
    throw new Error('Iframe module requires a browser environment (document)');
  }
  const iframe = document.createElement('iframe');
  iframe.src = src;

  // Aplica atributos fornecidos
  for (const [key, value] of Object.entries(options)) {
    iframe.setAttribute(key, value);
  }
  // Garante um ID se não fornecido
  if (!iframe.id) {
    iframe.id = `vl-iframe-${Date.now()}`;
  }

  document.body.appendChild(iframe);
  return wrapIframe(iframe);
}

/**
 * Obtém um iframe existente pelo seu ID ou elemento.
 * @param {string|HTMLIFrameElement} ref - ID do iframe ou o próprio elemento.
 * @returns {Object} - Objeto wrapper ou null se não encontrado.
 */
export function getIframe(ref) {
  if (typeof ref === 'string') {
    const el = document.getElementById(ref);
    if (!el || el.tagName !== 'IFRAME') return null;
    return wrapIframe(el);
  }
  if (ref && ref.tagName === 'IFRAME') {
    return wrapIframe(ref);
  }
  return null;
}

/**
 * Envia uma mensagem para o iframe via postMessage.
 * @param {Object} iframeWrapper - Wrapper retornado por createIframe ou getIframe.
 * @param {*} message - Dados a serem enviados.
 * @param {string} [targetOrigin='*'] - Origem alvo (segurança).
 */
export function sendMessage(iframeWrapper, message, targetOrigin = '*') {
  if (!iframeWrapper || !iframeWrapper._element) {
    throw new Error('Iframe inválido');
  }
  const iframe = iframeWrapper._element;
  if (iframe.contentWindow) {
    iframe.contentWindow.postMessage(message, targetOrigin);
  } else {
    throw new Error('Iframe não tem contentWindow (não carregado?)');
  }
}

/**
 * Registra um callback para mensagens recebidas do iframe.
 * @param {Function} callback - Função que recebe (event, iframeWrapper).
 * @returns {Function} - Função para remover o listener.
 */
export function onMessage(callback) {
  if (typeof window === 'undefined') {
    throw new Error('onMessage requires a browser environment (window)');
  }
  const handler = (event) => {
    // Opcional: filtrar por origem, mas deixamos a critério do usuário
    const iframeEl = event.source && event.source.frameElement;
    const wrapper = iframeEl ? wrapIframe(iframeEl) : null;
    callback(event, wrapper);
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

/**
 * Altera a URL carregada no iframe.
 * @param {Object} iframeWrapper - Wrapper do iframe.
 * @param {string} newSrc - Nova URL.
 */
export function setSrc(iframeWrapper, newSrc) {
  if (!iframeWrapper || !iframeWrapper._element) {
    throw new Error('Iframe inválido');
  }
  iframeWrapper._element.src = newSrc;
}

/**
 * Remove o iframe do DOM.
 * @param {Object} iframeWrapper - Wrapper do iframe.
 */
export function removeIframe(iframeWrapper) {
  if (!iframeWrapper || !iframeWrapper._element) {
    throw new Error('Iframe inválido');
  }
  const parent = iframeWrapper._element.parentNode;
  if (parent) parent.removeChild(iframeWrapper._element);
}

// ------------------- Funções auxiliares internas -------------------
function wrapIframe(element) {
  return {
    _element: element,
    id: element.id,
    src: element.src,
    sendMessage: (msg, origin) => sendMessage({ _element: element }, msg, origin),
    setSrc: (newSrc) => setSrc({ _element: element }, newSrc),
    remove: () => removeIframe({ _element: element }),
    getWindow: () => element.contentWindow,
    getDocument: () => element.contentDocument,
    reload: () => { element.src = element.src; },
    onLoad: (callback) => {
      element.addEventListener('load', callback);
      return () => element.removeEventListener('load', callback);
    },
    onError: (callback) => {
      element.addEventListener('error', callback);
      return () => element.removeEventListener('error', callback);
    }
  };
}

// Opcional: exportar também um objeto com todas as funções para uso como built-in
export const IframeAPI = {
  createIframe,
  getIframe,
  sendMessage,
  onMessage,
  setSrc,
  removeIframe
};

// Se o módulo for carregado como script, expõe globalmente
if (typeof window !== 'undefined') {
  window.VLIframe = IframeAPI;
}