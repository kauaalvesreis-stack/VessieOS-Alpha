import { createWindow } from './windowManager.js';
import { launchApp } from '../apps/launcher.js';

export function initUI() {
    // Ícones da área de trabalho
    const icons = [
        { name: 'Explorador', icon: '📁', app: 'explorer' },
        { name: 'Terminal', icon: '⬛', app: 'terminal' },
        { name: 'GameHub', icon: '🎮', app: 'gamehub' },
        { name: 'Calculadora', icon: '🔢', app: 'calculator' },
        { name: 'Bloco de Notas', icon: '📝', app: 'notepad' }
    ];
    const container = document.getElementById('desktopIcons');
    for (const item of icons) {
        const el = document.createElement('div');
        el.className = 'desktop-icon';
        el.innerHTML = `<div class="icon">${item.icon}</div><div class="label">${item.name}</div>`;
        el.addEventListener('dblclick', () => launchApp(item.app));
        container.appendChild(el);
    }

    // Barra de tarefas
    document.getElementById('startBtn').addEventListener('click', () => {
        document.getElementById('startMenu').classList.toggle('open');
    });

    // Menu iniciar
    const menuLeft = document.getElementById('startMenuLeft');
    for (const item of icons) {
        const div = document.createElement('div');
        div.className = 'start-app-item';
        div.innerHTML = `<span class="icon">${item.icon}</span><span class="name">${item.name}</span>`;
        div.addEventListener('click', () => {
            document.getElementById('startMenu').classList.remove('open');
            launchApp(item.app);
        });
        menuLeft.appendChild(div);
    }

    // Ações de energia
    document.querySelectorAll('.start-power-btn').forEach(el => {
        el.addEventListener('click', () => {
            const action = el.dataset.action;
            document.getElementById('startMenu').classList.remove('open');
            if (action === 'shutdown') window.__vessie.power.shutdown();
            else if (action === 'reboot') window.__vessie.power.reboot();
            else if (action === 'logout') window.__vessie.power.logout();
        });
    });
}