import { save, load } from './indexeddb.js';
import { compress, decompress } from './compression.js';

let files = {};
let trash = {};

export function initFS() {
    const data = load();
    if (data) {
        files = data.files || {};
        trash = data.trash || {};
    } else {
        // Cria diretórios padrão
        const defaults = ['/', '/C', '/C/Users', '/C/Users/admin', '/C/Program Files', '/C/Windows', '/C/Windows/Logs', '/apps'];
        for (const d of defaults) {
            files[d] = { type: 'dir', size: 0, modified: Date.now(), permissions: 'rwxr-xr-x', owner: 'admin', group: 'users' };
        }
        save({ files, trash });
    }
}

function normalizePath(path) {
    if (!path) return '/';
    let p = path.replace(/\\/g, '/');
    if (!p.startsWith('/')) p = '/' + p;
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p;
}

export function readFile(path) {
    const p = normalizePath(path);
    const node = files[p];
    if (node && node.type === 'file') return node.content || '';
    return null;
}

export function writeFile(path, content) {
    const p = normalizePath(path);
    const parent = p.substring(0, p.lastIndexOf('/')) || '/';
    if (!files[parent]) {
        files[parent] = { type: 'dir', size: 0, modified: Date.now(), permissions: 'rwxr-xr-x', owner: 'admin', group: 'users' };
    }
    files[p] = {
        type: 'file',
        content: String(content),
        size: String(content).length,
        modified: Date.now(),
        permissions: 'rw-r--r--',
        owner: 'admin',
        group: 'users'
    };
    save({ files, trash });
    return true;
}

export function listDirectory(path) {
    const p = normalizePath(path);
    const node = files[p];
    if (!node || node.type !== 'dir') return null;
    const items = [];
    const prefix = p === '/' ? '/' : p + '/';
    for (const key of Object.keys(files)) {
        if (key.startsWith(prefix) && key !== p) {
            const rest = key.slice(prefix.length);
            if (!rest.includes('/')) {
                const n = files[key];
                items.push({ name: rest, type: n.type, size: n.size, modified: n.modified, permissions: n.permissions });
            }
        }
    }
    return items;
}

export function mkdir(path) {
    const p = normalizePath(path);
    if (files[p]) return false;
    files[p] = { type: 'dir', size: 0, modified: Date.now(), permissions: 'rwxr-xr-x', owner: 'admin', group: 'users' };
    save({ files, trash });
    return true;
}

export function deleteFile(path) {
    const p = normalizePath(path);
    if (files[p]) {
        trash[p] = files[p];
        delete files[p];
        save({ files, trash });
        return true;
    }
    return false;
}

// Demais funções (move, copy, chmod, etc.) seguem o mesmo padrão...