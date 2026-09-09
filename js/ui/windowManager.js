// VessieOS - Gerenciador de janelas
let zCounter = 100;
const windows = new Map();
let winCounter = 1;

export function createWindow({ title = 'Janela', icon = '🪟', width = 480, height = 360, content = '', onClose = null } = {}) {
    const id = 'win-' + winCounter++;
    const el = document.createElement('div');
    el.className = 'window';
    el.id = id;
    el.style.width = width + 'px';
    el.style.height = height + 'px';
    el.style.zIndex = ++zCounter;
    el.innerHTML = `
        <div class="window-titlebar">
            <span class="window-title">${icon} ${title}</span>
            <div class="window-controls">
                <button class="win-btn win-close" title="Fechar">✕</button>
            </div>
        </div>
        <div class="window-content">${content}</div>
    `;

    // Arrastar janela
    const titlebar = el.querySelector('.window-titlebar');
    let dragging = false, ox = 0, oy = 0;
    titlebar.addEventListener('mousedown', (e) => {
        dragging = true;
        ox = e.clientX - el.offsetLeft;
        oy = e.clientY - el.offsetTop;
        el.style.zIndex = ++zCounter;
    });
    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        el.style.left = (e.clientX - ox) + 'px';
        el.style.top = (e.clientY - oy) + 'px';
    });
    document.addEventListener('mouseup', () => dragging = false);

    // Fechar
    const close = () => {
        el.remove();
        windows.delete(id);
        if (onClose) onClose();
    };
    el.querySelector('.win-close').addEventListener('click', close);

    document.getElementById('windowsContainer')?.appendChild(el) ?? document.body.appendChild(el);
    windows.set(id, { el, title, close });
    return { id, el, close };
}

export function closeWindow(id) {
    windows.get(id)?.close();
}

export function getWindows() {
    return Array.from(windows.keys());
}