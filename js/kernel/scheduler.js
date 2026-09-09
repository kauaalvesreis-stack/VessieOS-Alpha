// VessieOS - Escalonador de processos
export default class Scheduler {
    constructor(kernel) {
        this.kernel = kernel;
        this.queue = [];
    }

    add(proc) {
        this.queue.push(proc.pid);
        this.queue.sort((a, b) => {
            const pa = this.kernel.processes.get(a);
            const pb = this.kernel.processes.get(b);
            const order = { high: 0, normal: 1, low: 2 };
            return (order[pa?.priority] ?? 1) - (order[pb?.priority] ?? 1);
        });
    }

    remove(pid) {
        this.queue = this.queue.filter(id => id !== pid);
    }

    next() {
        return this.queue.shift() ?? null;
    }

    get size() {
        return this.queue.length;
    }
}