// Tokeniza código fonte .vl
export function tokenize(code) {
    const tokens = [];
    let i = 0;
    const lines = code.split('\n');
    for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('//')) continue;
        // Simples: quebra por espaços e símbolos
        const parts = line.split(/\s+/);
        for (const part of parts) {
            if (part) tokens.push(part);
        }
        tokens.push(';'); // fim de linha
    }
    return tokens;
}