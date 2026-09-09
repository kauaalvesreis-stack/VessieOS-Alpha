// VessieLang - Lexer: converte código .vl em tokens
const KEYWORDS = new Set([
    'var','func','if','else','while','for','return','import','export',
    'try','catch','finally','class','extends','new','true','false','null','undefined',
    'break','continue','in'
]);

const PUNCT = ['==','!=','<=','>=','&&','||','++','--','+=','-=','*=','/=','=>',
    '{','}','(',')','[',']',',',';','.','+','-','*','/','%','<','>','=','!',':'];

export function tokenize(code) {
    const tokens = [];
    let i = 0, line = 1;
    const n = code.length;

    const push = (type, value) => tokens.push({ type, value, line });

    while (i < n) {
        const c = code[i];

        // Espaços
        if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
        if (c === '\n') { line++; i++; continue; }

        // Comentários
        if (c === '/' && code[i+1] === '/') {
            while (i < n && code[i] !== '\n') i++;
            continue;
        }
        if (c === '/' && code[i+1] === '*') {
            i += 2;
            while (i < n && !(code[i] === '*' && code[i+1] === '/')) {
                if (code[i] === '\n') line++;
                i++;
            }
            i += 2;
            continue;
        }

        // Strings
        if (c === '"' || c === "'" || c === '`') {
            const quote = c;
            let s = '';
            i++;
            while (i < n && code[i] !== quote) {
                if (code[i] === '\\') {
                    const esc = code[i+1];
                    s += esc === 'n' ? '\n' : esc === 't' ? '\t' : esc;
                    i += 2;
                } else {
                    if (code[i] === '\n') line++;
                    s += code[i++];
                }
            }
            i++; // fecha aspas
            push('string', s);
            continue;
        }

        // Números
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i+1]))) {
            let s = '';
            while (i < n && /[0-9.eE]/.test(code[i])) {
                if ((code[i] === 'e' || code[i] === 'E') && !/[0-9+\-]/.test(code[i+1] || '')) break;
                if (code[i] === '.' && s.includes('.')) break;
                s += code[i++];
            }
            push('number', parseFloat(s));
            continue;
        }

        // Identificadores / palavras-chave
        if (/[a-zA-Z_$]/.test(c)) {
            let s = '';
            while (i < n && /[a-zA-Z0-9_$]/.test(code[i])) s += code[i++];
            push(KEYWORDS.has(s) ? 'keyword' : 'ident', s);
            continue;
        }

        // Pontuação / operadores
        let matched = null;
        for (const p of PUNCT) {
            if (code.startsWith(p, i)) { matched = p; break; }
        }
        if (matched) {
            push('punct', matched);
            i += matched.length;
            continue;
        }

        throw new Error(`ErroDeSintaxe: caractere inesperado '${c}' na linha ${line}`);
    }

    push('eof', null);
    return tokens;
}