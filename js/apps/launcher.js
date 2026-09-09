import { readFile } from '../fs/filesystem.js';
import { createProcess } from '../kernel/kernel.js';

export function launchApp(name) {
    const scriptPath = `/apps/${name}.vl`;
    const script = readFile(scriptPath);
    if (!script) {
        window.__vessie.notify('Erro', `Aplicativo ${name} não encontrado`, '❌');
        return;
    }
    // Cria processo e executa
    const kernel = window.__vessie;
    const pid = kernel.createProcess(name, scriptPath, []);
    // O interpretador será executado no processo
    // (a implementação real usaria Web Worker ou eval)
    console.log(`Lançando ${name} (PID ${pid})`);
    // Executa script no contexto atual (simplificado)
    // Na prática, seria isolado em Worker
    try {
        const ast = kernel.interpreter.parse(script);
        const context = { ...kernel.modules, _kernel: kernel };
        kernel.interpreter.execute(ast, context);
    } catch (e) {
        kernel.notify('Erro', `Erro ao executar ${name}: ${e.message}`, '❌');
    }
}