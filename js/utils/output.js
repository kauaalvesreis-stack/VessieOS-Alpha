// Canal de saída global do sistema (usado por system.print e o terminal)
const listeners = new Set();
const buffer = [];

export const outputChannel = {
    write(line) {
        const text = typeof line === 'string' ? line : JSON.stringify(line);
        buffer.push(text);
        if (buffer.length > 500) buffer.shift();
        for (const fn of listeners) {
            try { fn(text); } catch (e) { /* ignore */ }
        }
    },
    subscribe(fn) {
        listeners.add(fn);
        // Reproduz histórico
        for (const l of buffer) fn(l);
        return () => listeners.delete(fn);
    },
    clear() { buffer.length = 0; for (const fn of listeners) try { fn(null); } catch (e) {} },
    history() { return [...buffer]; }
};