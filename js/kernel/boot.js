import Kernel from './kernel.js';
import { initFS, writeFile, exists } from '../fs/filesystem.js';
import { initAuth, login } from '../security/auth.js';
import { initUI } from '../ui/desktop.js';

// Inicialização global
const kernel = new Kernel();
window.__vessie = kernel;

// Carregar sistema de arquivos
initFS();

// Instalar apps .vl no FS virtual
const APPS = ['terminal', 'calculator', 'notepad'];
for (const app of APPS) {
    const path = `/apps/${app}.vl`;
    if (!exists(path)) {
        fetch(`apps/${app}.vl`)
            .then(r => r.ok ? r.text() : null)
            .then(text => { if (text) writeFile(path, text); })
            .catch(() => {});
    }
}

// Autenticação
initAuth();

// Iniciar interface
initUI();

// Mostrar desktop após login
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
    const doLogin = () => {
        const user = document.getElementById('loginUser').value.trim() || 'admin';
        const pass = document.getElementById('loginPass').value;
        // Login aceito (admin/admin ou qualquer usuário local)
        login(user);
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('desktop').style.display = 'block';
        kernel.notify('VessieLang', `Bem-vindo, ${user}!`, '👋');
    };
    loginBtn.addEventListener('click', doLogin);
    document.getElementById('loginPass').addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
    });
}

// Iniciar relógio
function updateClock() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('taskbarClock').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
}
updateClock();
setInterval(updateClock, 10000);

// Notificação de boot
kernel.notify('VessieLang', 'Sistema iniciado com sucesso!', '✅');

console.log('🖥️ VessieLang OS v1.0 carregado!');
