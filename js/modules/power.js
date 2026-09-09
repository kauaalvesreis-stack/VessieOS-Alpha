// Módulo power - energia do sistema
import { outputChannel } from '../utils/output.js';

export default function powerModule(kernel) {
    return {
        shutdown() {
            outputChannel.write('Desligando o sistema...');
            document.body.style.transition = 'opacity 1s';
            document.body.style.opacity = '0';
            setTimeout(() => {
                document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#888;font-family:sans-serif;">⏻ Sistema desligado. Recarregue a página para ligar novamente.</div>';
                document.body.style.opacity = '1';
            }, 1000);
        },
        reboot() { location.reload(); },
        suspend() {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999999;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#555;font-size:14px;';
            overlay.textContent = '💤 Suspenso — clique para despertar';
            overlay.addEventListener('click', () => overlay.remove());
            document.body.appendChild(overlay);
        },
        scheduleShutdown(seconds = 60) {
            kernel._shutdownTimer = setTimeout(() => powerModule(kernel).shutdown(), seconds * 1000);
            return true;
        },
        cancelShutdown() {
            if (kernel._shutdownTimer) { clearTimeout(kernel._shutdownTimer); kernel._shutdownTimer = null; return true; }
            return false;
        },
        logout() { location.reload(); }
    };
}