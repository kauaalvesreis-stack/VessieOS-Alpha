import Kernel from './kernel.js';
import { initFS } from '../fs/filesystem.js';
import { initAuth } from '../security/auth.js';
import { initUI } from '../ui/desktop.js';

// Inicialização global
const kernel = new Kernel();
window.__vessie = kernel;

// Carregar sistema de arquivos
initFS();

// Autenticação
initAuth();

// Iniciar interface
initUI();

// Iniciar relógio
function updateClock() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('taskbarClock').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
}
updateClock();
setInterval(updateClock, 10000);

console.log('🖥️ VessieLang OS v1.0 carregado!');