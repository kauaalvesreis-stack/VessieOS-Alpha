// Módulo storage - LocalStorage
export default function storageModule(kernel) {
    return {
        set: (key, value) => { localStorage.setItem('vl.' + key, JSON.stringify(value ?? null)); return true; },
        get: (key) => {
            const raw = localStorage.getItem('vl.' + key);
            if (raw === null) return null;
            try { return JSON.parse(raw); } catch (e) { return raw; }
        },
        remove: (key) => { localStorage.removeItem('vl.' + key); return true; },
        clear: () => {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k.startsWith('vl.')) keys.push(k);
            }
            keys.forEach(k => localStorage.removeItem(k));
            return true;
        },
        keys: () => {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k.startsWith('vl.')) keys.push(k.slice(3));
            }
            return keys;
        }
    };
}