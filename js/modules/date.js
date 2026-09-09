// Módulo date
export default function dateModule(kernel) {
    return {
        now: () => Date.now(),
        format: (ts, fmt = 'YYYY-MM-DD HH:mm:ss') => {
            const d = ts instanceof Date ? ts : new Date(ts || Date.now());
            const pad = n => String(n).padStart(2, '0');
            return fmt
                .replace('YYYY', d.getFullYear())
                .replace('MM', pad(d.getMonth() + 1))
                .replace('DD', pad(d.getDate()))
                .replace('HH', pad(d.getHours()))
                .replace('mm', pad(d.getMinutes()))
                .replace('ss', pad(d.getSeconds()));
        },
        parse: (str) => new Date(str).getTime(),
        addDays: (ts, days) => ts + days * 86400000,
        diffDays: (a, b) => Math.floor((a - b) / 86400000)
    };
}