// VessieLang Core - Códigos de erro padronizados
export class VLError extends Error {
    constructor(code, message, line = null) {
        super(`${code}: ${message}${line ? ` (linha ${line})` : ''}`);
        this.code = code;
        this.line = line;
    }
}

export const ErrorCodes = {
    SYNTAX: 'ErroDeSintaxe',
    RUNTIME: 'ErroDeExecucao',
    TYPE: 'ErroDeTipo',
    REFERENCE: 'ErroDeReferencia',
    MEMORY: 'ErroDeMemoria',
    FILE: 'ErroDeArquivo',
    NETWORK: 'ErroDeRede',
    PERMISSION: 'ErroDePermissao',
    TIMEOUT: 'ErroDeTimeout'
};