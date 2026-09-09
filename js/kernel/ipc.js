// VessieOS - Comunicação entre processos (IPC)
export default class IPC {
    constructor(kernel) {
        this.kernel = kernel;
    }

    send(pid, message) {
        const proc = this.kernel.processes.get(pid);
        if (!proc) return false;
        proc.messages.push({ from: 'system', data: message, at: Date.now() });
        return true;
    }

    receive(pid) {
        const proc = this.kernel.processes.get(pid);
        if (!proc) return null;
        return proc.messages.shift() ?? null;
    }

    broadcast(message) {
        for (const proc of this.kernel.processes.values()) {
            proc.messages.push({ from: 'system', data: message, at: Date.now() });
        }
    }
}