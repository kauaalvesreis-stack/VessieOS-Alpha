// Notificações do sistema
import { createWindow } from './windowManager.js';

export function notify(title, body, icon = '🔔') {
    const container = document.getElementById('notifications');
    if (!container) { console.log(`[${title}] ${body}`); return; }
    const el = document.createElement('div');
    el.className = 'notification';
    el.innerHTML = `
        <span class="icon">${icon}</span>
        <div class="content">
            <div class="title">${escapeHtml(title)}</div>
            <div class="body">${escapeHtml(body)}</div>
        </div>
        <button class="close-notif">✕</button>
    `;
    el.querySelector('.close-notif').addEventListener('click', () => el.remove());
    container.appendChild(el);
    setTimeout(() => el.remove(), 5000);
}

function escapeHtml(s) {
    return String(s)
        .replaceAll('&', '\x26amp;').replaceAll('<', '\x26lt;').replaceAll('>', '\x26gt;')
        .replaceAll('"', '\x26quot;').replaceAll("'", '\x26#39;');
}

export { createWindow };