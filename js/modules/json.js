// Módulo json
export default function jsonModule(kernel) {
    return {
        stringify: (obj, indent = 0) => JSON.stringify(obj, null, indent || 0),
        parse: (str) => {
            try { return JSON.parse(str); }
            catch (e) { throw new Error('ErroDeExecucao: JSON inválido'); }
        }
    };
}