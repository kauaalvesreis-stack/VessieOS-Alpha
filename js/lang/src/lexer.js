// VessieLang Lexer (src)
const KEYWORDS = new Set(['var','func','if','else','while','for','return','import','export','try','catch','finally','class','extends','new','true','false','null','undefined','break','continue']);

export function tokenize(code) {
    const tokens = [];
    let i = 0, line = 1;
    const n = code.length;
    const push = (type, value) => tokens.push({ type, value, line });

    while (i < n) {
        const c = code[i];
        if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
        if (c === '\n') { line++; i++; continue; }
        if (c === '/' && code[i+1] === '/') { while (i < n && code[i] !== '\n') i++; continue; }
        if (c === '/' && code[i+1] === '*') {
            i += 2;
            while (i < n && !(code[i] === '*' && code[i+1] === '/')) {
                if (code[i] === '\n') line++;
                i++;
            }
            i += 2; continue;
        }
        if (c === '"' || c === "'" || c === '`') {
            const q = c; let s = ''; i++;
            while (i < n && code[i] !== q) {
                if (code[i] === '\\') { s += code[i+1]; i += 2; continue; }
                s += code[i++];
            }
            i++; push('string', s); continue;
        }
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(code[i+1]))) {
            let s = '';
            while (i < n && /[0-9.eE]/.test(code[i])) s += code[i++];
            push('number', parseFloat(s)); continue;
        }
        if (/[a-zA-Z_$]/.test(c)) {
            let s = '';
            while (i < n && /[a-zA-Z0-9_$]/.test(code[i])) s += code[i++];
            push(KEYWORDS.has(s) ? 'keyword' : 'ident', s); continue;
        }
        const sym = code.slice(i, i+2);
        if (['==','!=','<=','>=','&&','||','++','--','+=','-=','*=','/=','=>'].includes(sym)) { push('punct', sym); i += 2; continue; }
        if (/[{}()\[\],.;+\-*/%<>!?:=]/.test(c)) { push('punct', c); i++; continue; }
        throw new Error(`ErroDeSintaxe: caractere inesperado '${c}' na linha ${line}`);
    }
    push('eof', null);
    return tokens;
}