// Módulo system - comandos do sistema
import { outputChannel } from '../utils/output.js';

export default function systemModule(kernel) {
    return {
        print: (...args) => {
            const str = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            outputChannel.write(str);
            return str;
        },
        sleep: (ms) => {
            const start = Date.now();
            while (Date.now() - start < ms) { /* bloqueante simples */ }
        },
        exec: (cmd) => {
            if (cmd === 'shutdown') kernel.modules.power.shutdown();
            else if (cmd === 'reboot') kernel.modules.power.reboot();
            else if (cmd === 'clear') outputChannel.clear();
            else outputChannel.write('Comando desconhecido: ' + cmd);
        },
        env: (key) => {
            const env = { USER: 'admin', HOME: '/C/Users/admin', PATH: '/bin', OS: 'VessieLang' };
            return env[key] || null;
        },
        memory: () => {
            const used = performance.memory ? performance.memory.usedJSHeapSize : 128 * 1024 * 1024;
            const total = performance.memory ? performance.memory.jsHeapSizeLimit : 512 * 1024 * 1024;
            return { used, total, free: total - used };
        },
        cpu: () => Math.floor(Math.random() * 30) + 5,
        user: () => 'admin',
        datetime: () => {
            const d = new Date();
            return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
        },
        exit: (code = 0) => {
            if (kernel.currentPid) kernel.killProcess(kernel.currentPid);
        },
        pid: () => kernel.currentPid || 0,
        kernelVersion: () => 'VessieLang v1.0',
        platform: () => 'web',
        arch: () => 'js'
    };
}