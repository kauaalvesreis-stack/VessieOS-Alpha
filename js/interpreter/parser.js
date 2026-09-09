import { tokenize } from './lexer.js';

export function parse(code) {
    const tokens = tokenize(code);
    const ast = { type: 'Program', body: [] };
    let i = 0;

    while (i < tokens.length) {
        const token = tokens[i];
        if (token === 'func') {
            // func nome(params) { ... }
            const name = tokens[++i];
            i++; // '('
            const params = [];
            while (tokens[i] !== ')') {
                if (tokens[i] !== ',') params.push(tokens[i]);
                i++;
            }
            i++; // ')'
            i++; // '{'
            const body = [];
            let depth = 1;
            while (depth > 0 && i < tokens.length) {
                if (tokens[i] === '{') depth++;
                else if (tokens[i] === '}') depth--;
                if (depth > 0) body.push(tokens[i]);
                i++;
            }
            ast.body.push({ type: 'Function', name, params, body: body.join(' ') });
        } else if (token === 'var') {
            const name = tokens[++i];
            i++; // '='
            const value = tokens[++i];
            ast.body.push({ type: 'VarDecl', name, value });
        } else if (token === 'if') {
            // simplificado
            i++;
            const condition = tokens[i];
            i += 2; // ') {'
            const body = [];
            let depth = 1;
            while (depth > 0 && i < tokens.length) {
                if (tokens[i] === '{') depth++;
                else if (tokens[i] === '}') depth--;
                if (depth > 0) body.push(tokens[i]);
                i++;
            }
            ast.body.push({ type: 'If', condition, body: body.join(' ') });
        } else if (token === 'return') {
            const value = tokens[++i] || null;
            ast.body.push({ type: 'Return', value });
        } else if (token === 'import') {
            const module = tokens[++i];
            i++; // 'as'
            const alias = tokens[++i];
            ast.body.push({ type: 'Import', module, alias });
        } else {
            // expressão
            ast.body.push({ type: 'Expr', value: token });
        }
        i++;
    }
    return ast;
}