import Scheduler from './scheduler.js';
import IPC from './ipc.js';
import { Interpreter } from '../interpreter/executor.js';
import systemModule from '../modules/system.js';
import fileModule from '../modules/file.js';
import processModule from '../modules/process.js';
import guiModule from '../modules/gui.js';
import networkModule from '../modules/network.js';
import cryptoModule from '../modules/crypto.js';
import storageModule from '../modules/storage.js';
import clipboardModule from '../modules/clipboard.js';
import powerModule from '../modules/power.js';
import mathModule from '../modules/math.js';
import stringModule from '../modules/string.js';
import jsonModule from '../modules/json.js';
import dateModule from '../modules/date.js';
import colorModule from '../modules/color.js';
import cssModule from '../modules/css.js';
import optimizerModule from '../modules/optimizer.js';
import memoryModule from '../modules/memory.js';
import { notify } from '../ui/notifications.js';
import { outputChannel } from '../utils/output.js';

export default class Kernel {
    constructor() {
        this.pidCounter = 1;
        this.currentPid = 0;
        this.processes = new Map();
        this.scheduler = new Scheduler(this);
        this.ipc = new IPC(this);
        this.modules = {};
        this.interpreter = new Interpreter(this);
        this.loadModules();
    }

    // Canal de saída usado por system.print / apps
    write(line) {
        outputChannel.write(line);
    }

    notify(title, body, icon = '🔔') {
        notify(title, body, icon);
    }

    loadModules() {
        const defs = {
            system: systemModule, file: fileModule, process: processModule,
            gui: guiModule, network: networkModule, crypto: cryptoModule,
            storage: storageModule, clipboard: clipboardModule, power: powerModule,
            math: mathModule, string: stringModule, json: jsonModule,
            date: dateModule, color: colorModule, css: cssModule,
            optimizer: optimizerModule, memory: memoryModule
        };
        for (const [name, factory] of Object.entries(defs)) {
            try {
                this.modules[name] = factory(this);
            } catch (e) {
                console.error(`Falha ao carregar módulo '${name}':`, e);
                this.modules[name] = {};
            }
        }
        this.power = this.modules.power;
    }

    createProcess(name, scriptPath, args = [], background = false) {
        const pid = this.pidCounter++;
        const proc = {
            pid,
            name,
            scriptPath,
            args,
            status: 'running',
            background,
            user: 'admin',
            cpu: Math.floor(Math.random() * 8) + 1,
            memory: Math.floor(Math.random() * 50000) + 8000,
            virtualMemory: Math.floor(Math.random() * 100000) + 20000,
            machine: false,
            messages: [],
            priority: 'normal'
        };
        this.processes.set(pid, proc);
        this.scheduler.add(proc);
        return pid;
    }

    runScript(code, timeoutMs) {
        this.currentPid = this.currentPid || 0;
        return this.interpreter.run(code, timeoutMs);
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