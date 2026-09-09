import Scheduler from './scheduler.js';
import IPC from './ipc.js';

export default class Kernel {
    constructor() {
        this.pidCounter = 1;
        this.processes = new Map();
        this.scheduler = new Scheduler(this);
        this.ipc = new IPC(this);
        this.modules = {};
        this.loadModules();
        this.initBuiltins();
    }

    loadModules() {
        // Importa módulos nativos
        import('../modules/system.js').then(m => this.modules.system = m.default);
        import('../modules/file.js').then(m => this.modules.file = m.default);
        import('../modules/process.js').then(m => this.modules.process = m.default);
        import('../modules/gui.js').then(m => this.modules.gui = m.default);
        import('../modules/network.js').then(m => this.modules.network = m.default);
        import('../modules/crypto.js').then(m => this.modules.crypto = m.default);
        import('../modules/storage.js').then(m => this.modules.storage = m.default);
        import('../modules/audio.js').then(m => this.modules.audio = m.default);
        import('../modules/clipboard.js').then(m => this.modules.clipboard = m.default);
        import('../modules/power.js').then(m => this.modules.power = m.default);
        import('../modules/backup.js').then(m => this.modules.backup = m.default);
        import('../modules/diagnostic.js').then(m => this.modules.diagnostic = m.default);
        import('../modules/math.js').then(m => this.modules.math = m.default);
        import('../modules/string.js').then(m => this.modules.string = m.default);
        import('../modules/json.js').then(m => this.modules.json = m.default);
        import('../modules/date.js').then(m => this.modules.date = m.default);
        import('../modules/color.js').then(m => this.modules.color = m.default);
        import('../modules/css.js').then(m => this.modules.css = m.default);
    }

    initBuiltins() {
        // Expõe módulos no contexto global do interpretador
        // (será usado pelo executor)
    }

    createProcess(name, scriptPath, args, background = false) {
        const pid = this.pidCounter++;
        const proc = {
            pid,
            name,
            scriptPath,
            args,
            status: 'running',
            background,
            user: 'admin',
            messages: [],
            priority: 'normal'
        };
        this.processes.set(pid, proc);
        this.scheduler.add(proc);
        return pid;
    }

    killProcess(pid) {
        const proc = this.processes.get(pid);
        if (proc) {
            proc.status = 'stopped';
            this.processes.delete(pid);
            this.scheduler.remove(pid);
            return true;
        }
        return false;
    }

    getProcesses() {
        return Array.from(this.processes.values());
    }
}