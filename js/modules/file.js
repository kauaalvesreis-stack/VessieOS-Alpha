// Módulo file - sistema de arquivos para .vl
import * as fs from '../fs/filesystem.js';
import * as ops from '../fs/ops.js';

export default function fileModule(kernel) {
    const guard = (path) => {
        if (typeof path !== 'string' || !path) throw new Error('ErroDeArquivo: caminho inválido');
        return path;
    };
    return {
        read: (path) => {
            const c = fs.readFile(guard(path));
            if (c === null) throw new Error(`ErroDeArquivo: '${path}' não encontrado`);
            return c;
        },
        write: (path, content) => fs.writeFile(guard(path), content),
        append: (path, content) => {
            const cur = fs.readFile(guard(path)) ?? '';
            return fs.writeFile(path, cur + content);
        },
        delete: (path) => fs.deleteFile(guard(path)),
        move: (src, dest) => ops.moveFile(guard(src), guard(dest)),
        copy: (src, dest) => ops.copyFile(guard(src), guard(dest)),
        exists: (path) => ops.exists(guard(path)),
        size: (path) => ops.fileSize(guard(path)),
        list: (dir = '/') => fs.listDirectory(dir) || [],
        mkdir: (path) => fs.mkdir(guard(path)),
        rmdir: (path) => ops.removeDir(guard(path)),
        chmod: (path, mode) => ops.chmod(guard(path), mode),
        stat: (path) => ops.stat(guard(path)),
        trash: (path) => fs.deleteFile(guard(path)),
        emptyTrash: () => ops.emptyTrash(),
        compress: (path) => ops.compressFile(guard(path)),
        decompress: (path) => ops.decompressFile(guard(path))
    };
}