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

export function exists(path) {
    return !!files[normalizePath(path)];
}

export function fileSize(path) {
    const n = files[normalizePath(path)];
    return n && n.type === 'file' ? n.size : 0;
}

export function moveFile(src, dest) {
    const s = normalizePath(src), d = normalizePath(dest);
    if (!files[s]) return false;
    files[d] = { ...files[s] };
    delete files[s];
    // Move filhos se diretório
    for (const key of Object.keys(files)) {
        if (key.startsWith(s + '/')) {
            files[d + key.slice(s.length)] = files[key];
            delete files[key];
        }
    }
    save({ files, trash });
    return true;
}

export function copyFile(src, dest) {
    const s = normalizePath(src), d = normalizePath(dest);
    if (!files[s]) return false;
    files[d] = { ...files[s] };
    for (const key of Object.keys(files)) {
        if (key.startsWith(s + '/')) files[d + key.slice(s.length)] = { ...files[key] };
    }
    save({ files, trash });
    return true;
}

export function removeDir(path) {
    const p = normalizePath(path);
    const node = files[p];
    if (!node || node.type !== 'dir') return false;
    // Verifica se vazio
    for (const key of Object.keys(files)) {
        if (key.startsWith(p + '/')) return false;
    }
    delete files[p];
    save({ files, trash });
    return true;
}

export function chmod(path, mode) {
    const n = files[normalizePath(path)];
    if (!n) return false;
    n.permissions = mode;
    save({ files, trash });
    return true;
}

export function stat(path) {
    const n = files[normalizePath(path)];
    if (!n) return null;
    return { path: normalizePath(path), ...n };
}

export function emptyTrash() {
    trash = {};
    save({ files, trash });
    return true;
}

export function compressFile(path) {
    const n = files[normalizePath(path)];
    if (!n || n.type !== 'file') return false;
    if (n.compressed) return true;
    n.content = compress(n.content);
    n.compressed = true;
    n.size = n.content.length;
    save({ files, trash });
    return true;
}

export function decompressFile(path) {
    const n = files[normalizePath(path)];
    if (!n || n.type !== 'file' || !n.compressed) return false;
    n.content = decompress(n.content);
    n.compressed = false;
    n.size = n.content.length;
    save({ files, trash });
    return true;
}

export function readFileChecked(path) {
    const c = readFile(path);
    if (c === null) throw new Error(`ErroDeArquivo: '${path}' não encontrado`);
    return c;
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
    files[d] = { ...files[s] };
    delete files[s];
    // Move filhos se diretório
    for (const key of Object.keys(files)) {
        if (key.startsWith(s + '/')) {
            files[d + key.slice(s.length)] = files[key];
            delete files[key];
        }
    }
    save({ files, trash });
    return true;
}

export function copyFile(src, dest) {
    const s = normalizePath(src), d = normalizePath(dest);
    if (!files[s]) return false;
    files[d] = { ...files[s] };
    for (const key of Object.keys(files)) {
        if (key.startsWith(s + '/')) files[d + key.slice(s.length)] = { ...files[key] };
    }
    save({ files, trash });
    return true;
}

export function removeDir(path) {
    const p = normalizePath(path);
    const node = files[p];
    if (!node || node.type !== 'dir') return false;
    // Verifica se vazio
    for (const key of Object.keys(files)) {
        if (key.startsWith(p + '/')) return false;
    }
    delete files[p];
    save({ files, trash });
    return true;
}

export function chmod(path, mode) {
    const n = files[normalizePath(path)];
    if (!n) return false;
    n.permissions = mode;
    save({ files, trash });
    return true;
}

export function stat(path) {
    const n = files[normalizePath(path)];
    if (!n) return null;
    return { path: normalizePath(path), ...n };
}

export function emptyTrash() {
    trash = {};
    save({ files, trash });
    return true;
}

export function compressFile(path) {
    const n = files[normalizePath(path)];
    if (!n || n.type !== 'file') return false;
    if (n.compressed) return true;
    n.content = compress(n.content);
    n.compressed = true;
    n.size = n.content.length;
    save({ files, trash });
    return true;
}

export function decompressFile(path) {
    const n = files[normalizePath(path)];
    if (!n || n.type !== 'file' || !n.compressed) return false;
    n.content = decompress(n.content);
    n.compressed = false;
    n.size = n.content.length;
    save({ files, trash });
    return true;
}

export function readFileChecked(path) {
    const c = readFile(path);
    if (c === null) throw new Error(`ErroDeArquivo: '${path}' não encontrado`);
    return c;
}

export function deleteFile(path) {
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

