export default function systemModule(kernel) {
    return {
        print: (...args) => {
            const str = args.map(a => String(a)).join(' ');
            console.log('[VL]', str);
            // Envia para terminal se aberto
            return str;
        },
        sleep: (ms) => new Promise(r => setTimeout(r, ms)),
        exec: (cmd) => {
            if (cmd === 'shutdown') kernel.power.shutdown();
            else if (cmd === 'reboot') kernel.power.reboot();
            else if (cmd === 'clear') console.clear();
            else console.log('Comando desconhecido:', cmd);
        },
        env: (key) => {
            const env = { USER: 'admin', HOME: '/C/Users/admin', PATH: '/bin' };
            return env[key] || null;
        },
        memory: () => ({ used: 128*1024*1024, total: 512*1024*1024, free: 384*1024*1024 }),
        cpu: () => Math.floor(Math.random() * 30) + 5,
        user: () => 'admin',
        datetime: () => {
            const d = new Date();
            return { year: d.getFullYear(), month: d.getMonth()+1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
        },
        exit: (code) => { /* mata processo atual */ },
        pid: () => kernel.currentPid || 0,
        kernelVersion: () => 'VessieLang v1.0',
        platform: () => 'web',
        arch: () => 'js'
    };
}