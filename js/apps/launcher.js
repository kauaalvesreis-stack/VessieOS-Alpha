import { readFile } from '../fs/filesystem.js';
import { runScript } from '../interpreter/executor.js';

export function launchApp(name) {
    const kernel = window.__vessie;
    const scriptPath = `/apps/${name}.vl`;
    const script = readFile(scriptPath);
    if (script === null) {
        kernel.notify('Erro', `Aplicativo '${name}' não encontrado em ${scriptPath}`, '❌');
        return;
    }
    const pid = kernel.createProcess(name, scriptPath, []);
    try {
        kernel.runScript(script);
    } catch (e) {
        kernel.notify('Erro', `Erro ao executar ${name}: ${e.message}`, '❌');
    } finally {
        kernel.killProcess(pid);
    }
}
