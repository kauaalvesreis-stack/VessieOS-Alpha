// Módulo process - gerenciamento de processos para .vl
import { runScript } from '../interpreter/executor.js';
import { readFile } from '../fs/filesystem.js';

export default function processModule(kernel) {
    return {
        start: (name, scriptPath, args = []) => {
            const pid = kernel.createProcess(name, scriptPath, args);
            const script = readFile(scriptPath);
            if (script) {
                setTimeout(() => {
                    try { kernel.runScript(script); }
                    catch (e) { kernel.notify('Erro', `${name}: ${e.message}`, '❌'); }
                }, 0);
            }
            return pid;
        },
        startBackground: (name, scriptPath, args = []) =>
            processModule(kernel).start(name, scriptPath, args),
        kill: (pid) => kernel.killProcess(pid),
        list: () => kernel.getProcesses().map(p => ({
            pid: p.pid, name: p.name, status: p.status, user: p.user,
            cpu: p.cpu, memory: p.memory, virtualMemory: p.virtualMemory, machine: p.machine
        })),
        wait: (pid) => {
            // Simples: aguarda até processo sair da lista (síncrono não é possível; checa uma vez)
            return !kernel.processes.has(pid);
        },
        send: (pid, message) => kernel.ipc.send(pid, message),
        onMessage: (callback) => {
            // Registra handler para o processo atual
            kernel._messageHandler = callback;
        },
        getEnv: (pid) => ({ PID: pid, USER: 'admin' }),
        setPriority: (pid, priority) => {
            const p = kernel.processes.get(pid);
            if (p) { p.priority = priority; kernel.scheduler.add(p); return true; }
            return false;
        },
        suspend: (pid) => {
            const p = kernel.processes.get(pid);
            if (p) { p.status = 'suspended'; return true; }
            return false;
        },
        resume: (pid) => {
            const p = kernel.processes.get(pid);
            if (p) { p.status = 'running'; return true; }
            return false;
        }
    };
}