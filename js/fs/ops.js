// Operações estendidas do sistema de arquivos (usadas pelo módulo file)
import { readFile, writeFile, deleteFile, mkdir, listDirectory } from './filesystem.js';
import { compress, decompress } from './compression.js';

export function exists(path) {
    return listDirectory(parentOf(path))?.some(n => n.name === baseName(path)) ?? false;
}
function parentOf(p) {
    const parts = String(p).replace(/\\/g, '/').split('/');
    parts.pop();
    return parts.join('/') || '/';
}
function baseName(p) {
    return String(p).replace(/\\/g, '/').split('/').filter(Boolean).pop() || '';
}

export function fileSize(path) {
    const item = listDirectory(parentOf(path))?.find(n => n.name === baseName(path));
    return item ? item.size : 0;
}

export function stat(path) {
    const item = listDirectory(parentOf(path))?.find(n => n.name === baseName(path));
    if (!item) return null;
    return { path, name: baseName(path), ...item };
}

export function moveFile(src, dest) {
    const content = readFile(src);
    if (content === null) {
        if (!mkdir(dest)) return false;
        const items = listDirectory(src) || [];
        for (const it of items) {
            moveFile(src + '/' + it.name, dest + '/' + it.name);
        }
        deleteFile(src);
        return true;
    }
    if (!writeFile(dest, content)) return false;
    return deleteFile(src);
}

export function copyFile(src, dest) {
    const content = readFile(src);
    if (content === null) {
        if (!mkdir(dest)) return false;
        for (const it of (listDirectory(src) || [])) {
            copyFile(src + '/' + it.name, dest + '/' + it.name);
        }
        return true;
    }
    return writeFile(dest, content);
}

export function removeDir(path) {
    const items = listDirectory(path);
    if (items === null) return false;
    if (items.length > 0) return false;
    return deleteFile(path);
}

export function chmod(path, mode) {
    // Permissões simuladas: registra em arquivo de metadados
    const meta = readFile('/C/Windows/meta-permissions.json');
    let perms = {};
    try { perms = meta ? JSON.parse(meta) : {}; } catch (e) { perms = {}; }
    perms[path] = mode;
    return writeFile('/C/Windows/meta-permissions.json', JSON.stringify(perms));
}

export function emptyTrash() {
    return true;
}

export function compressFile(path) {
    const content = readFile(path);
    if (content === null) return false;
    return writeFile(path + '.vlz', compress(content));
}

export function decompressFile(path) {
    if (!path.endsWith('.vlz')) return false;
    const content = readFile(path);
    if (content === null) return false;
    return writeFile(path.slice(0, -4), decompress(content));
}