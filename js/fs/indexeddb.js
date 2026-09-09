// VessieOS - Persistência via IndexedDB (com fallback para localStorage)
const DB_NAME = 'vessie-fs';
const STORE = 'state';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function txPromise(db, mode, fn) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const req = fn(store);
        tx.oncomplete = () => resolve(req?.result);
        tx.onerror = () => reject(tx.error);
    });
}

export async function save(state) {
    try {
        const db = await openDB();
        await txPromise(db, 'readwrite', store => store.put(state, 'fs'));
    } catch (e) {
        try { localStorage.setItem('vessie.fs', JSON.stringify(state)); } catch (_) {}
    }
}

export async function load() {
    try {
        const db = await openDB();
        const result = await txPromise(db, 'readonly', store => store.get('fs'));
        if (result) return result;
    } catch (e) { /* fallback */ }
    try {
        const raw = localStorage.getItem('vessie.fs');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}