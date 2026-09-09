// VessieLang - Parser: tokens -> AST (recursivo descendente)
import { tokenize } from './lexer.js';

class Parser {
    constructor(tokens) {
        this.toks = tokens;
        this.pos = 0;
    }
    peek(o = 0) { return this.toks[this.pos + o]; }
    next() { return this.toks[this.pos++]; }
    isPunct(v, o = 0) { const t = this.peek(o); return t && t.type === 'punct' && t.value === v; }
    isKw(v, o = 0) { const t = this.peek(o); return t && t.type === 'keyword' && (v === undefined || t.value === v); }
    expectPunct(v) {
        if (!this.isPunct(v)) this.err(`esperado '${v}'`);
        return this.next();
    }
    err(msg) {
        const t = this.peek();
        throw new Error(`ErroDeSintaxe: ${msg} (linha ${t ? t.line : '?'}, encontrado ${t ? JSON.stringify(t.value) : 'fim'})`);
    }

    parseProgram() {
        const body = [];
        while (this.peek().type !== 'eof') body.push(this.parseStatement());
        return { type: 'Program', body };
    }

    parseStatement() {
        if (this.isKw()) {
            const kw = this.peek().value;
            switch (kw) {
                case 'var': return this.parseVar();
                case 'func': return this.parseFunc();
                case 'if': return this.parseIf();
                case 'while': return this.parseWhile();
                case 'for': return this.parseFor();
                case 'return': return this.parseReturn();
                case 'import': return this.parseImport();
                case 'export': { this.next(); const s = this.parseStatement(); s.exported = true; return s; }
                case 'try': return this.parseTry();
                case 'class': return this.parseClass();
                case 'break': this.next(); this.optSemi(); return { type: 'Break' };
                case 'continue': this.next(); this.optSemi(); return { type: 'Continue' };
            }
        }
        const e = this.parseExpression();
        this.optSemi();
        return { type: 'ExprStmt', expr: e };
    }

    optSemi() { if (this.isPunct(';')) this.next(); }

    parseBlock() {
        this.expectPunct('{');
        const body = [];
        while (!this.isPunct('}')) {
            if (this.peek().type === 'eof') this.err("esperado '}'");
            body.push(this.parseStatement());
        }
        this.next();
        return body;
    }

    parseVar() {
        this.next();
        const name = this.next();
        if (name.type !== 'ident') this.err('esperado nome de variavel');
        let typeAnnot = null;
        if (this.isPunct(':')) { this.next(); typeAnnot = this.next().value; }
        let init = null;
        if (this.isPunct('=')) { this.next(); init = this.parseExpression(); }
        this.optSemi();
        return { type: 'VarDecl', name: name.value, init, typeAnnot };
    }

    parseFunc() {
        this.next();
        const name = this.next();
        if (name.type !== 'ident') this.err('esperado nome de funcao');
        return this.parseFuncRest(name.value, true);
    }

    parseFuncRest(name, consumeSemi) {
        this.expectPunct('(');
        const params = [];
        while (!this.isPunct(')')) {
            const p = this.next();
            if (p.type !== 'ident') this.err('esperado parametro');
            params.push(p.value);
            if (this.isPunct(',')) this.next();
        }
        this.next();
        const body = this.parseBlock();
        if (consumeSemi) this.optSemi();
        return { type: 'FunctionDecl', name, params, body };
    }

    parseIf() {
        this.next();
        this.expectPunct('(');
        const cond = this.parseExpression();
        this.expectPunct(')');
        const then = this.parseBlock();
        let els = null;
        if (this.isKw('else')) {
            this.next();
            if (this.isKw('if')) els = [this.parseIf()];
            else els = this.parseBlock();
        }
        return { type: 'If', cond, then, else: els };
    }

    parseWhile() {
        this.next();
        this.expectPunct('(');
        const cond = this.parseExpression();
        this.expectPunct(')');
        const body = this.parseBlock();
        return { type: 'While', cond, body };
    }

    parseFor() {
        this.next();
        this.expectPunct('(');
        if (this.isKw('var')) {
            const varPos = this.pos;
            const init = this.parseVar();
            // for (var x in lista) — for-in com declaração
            if (this.isKw('in')) {
                this.next();
                const iterable = this.parseExpression();
                this.expectPunct(')');
                const body = this.parseBlock();
                return { type: 'ForIn', name: init.name, iterable, body };
            }
            this.optSemi();
            const cond = this.parseExpression();
            this.expectPunct(';');
            const step = this.parseStatement();
            this.expectPunct(')');
            const body = this.parseBlock();
            return { type: 'For', init, cond, step, body };
        }
        const name = this.next();
        if (!this.isKw('in')) this.err("esperado 'in'");
        this.next();
        const iterable = this.parseExpression();
        this.expectPunct(')');
        const body = this.parseBlock();
        return { type: 'ForIn', name: name.value, iterable, body };
    }

    parseReturn() {
        this.next();
        let value = null;
        if (!this.isPunct(';') && !this.isPunct('}') && this.peek().type !== 'eof') {
            value = this.parseExpression();
        }
        this.optSemi();
        return { type: 'Return', value };
    }

    parseImport() {
        this.next();
        const t = this.next();
        if (t.type !== 'string' && t.type !== 'ident') this.err('esperado nome de modulo');
        let alias = null;
        if (this.isKw('as')) { this.next(); alias = this.next().value; }
        this.optSemi();
        return { type: 'Import', module: t.value, alias: alias || t.value };
    }

    parseTry() {
        this.next();
        const block = this.parseBlock();
        let param = null, handler = null, finalizer = null;
        if (this.isKw('catch')) {
            this.next();
            if (this.isPunct('(')) { this.next(); param = this.next().value; this.expectPunct(')'); }
            handler = this.parseBlock();
        }
        if (this.isKw('finally')) { this.next(); finalizer = this.parseBlock(); }
        return { type: 'Try', block, param, handler, finalizer };
    }

    parseClass() {
        this.next();
        const name = this.next().value;
        let parent = null;
        if (this.isKw('extends')) { this.next(); parent = this.next().value; }
        this.expectPunct('{');
        const methods = [];
        while (!this.isPunct('}')) {
            if (this.isKw('var')) {
                const v = this.parseVar();
                methods.push({ type: 'ClassField', name: v.name, init: v.init });
            } else if (this.isKw('func')) {
                this.next();
                const mname = this.next().value;
                methods.push(this.parseFuncRest(mname, false));
            } else this.err('esperado campo ou metodo de classe');
        }
        this.next();
        this.optSemi();
        return { type: 'ClassDecl', name, parent, methods };
    }

    parseExpression() { return this.parseAssignment(); }

    parseAssignment() {
        const left = this.parseTernary();
        if (this.isPunct('=') || this.isPunct('+=') || this.isPunct('-=') ||
            this.isPunct('*=') || this.isPunct('/=')) {
            const op = this.next().value;
            const right = this.parseAssignment();
            return { type: 'Assign', op, target: left, value: right };
        }
        if (this.isPunct('++') || this.isPunct('--')) {
            const op = this.next().value;
            return { type: 'Update', op, target: left, prefix: false };
        }
        return left;
    }

    parseTernary() {
        const cond = this.parseOr();
        if (this.isPunct('?')) {
            this.next();
            const then = this.parseAssignment();
            this.expectPunct(':');
            const els = this.parseAssignment();
            return { type: 'Ternary', cond, then, else: els };
        }
        return cond;
    }

    parseOr() {
        let left = this.parseAnd();
        while (this.isPunct('||')) { this.next(); left = { type: 'Binary', op: '||', left, right: this.parseAnd() }; }
        return left;
    }
    parseAnd() {
        let left = this.parseEquality();
        while (this.isPunct('&&')) { this.next(); left = { type: 'Binary', op: '&&', left, right: this.parseEquality() }; }
        return left;
    }
    parseEquality() {
        let left = this.parseComparison();
        while (this.isPunct('==') || this.isPunct('!=')) {
            const op = this.next().value;
            left = { type: 'Binary', op, left, right: this.parseComparison() };
        }
        return left;
    }
    parseComparison() {
        let left = this.parseAdditive();
        while (this.isPunct('<') || this.isPunct('>') || this.isPunct('<=') || this.isPunct('>=')) {
            const op = this.next().value;
            left = { type: 'Binary', op, left, right: this.parseAdditive() };
        }
        return left;
    }
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (this.isPunct('+') || this.isPunct('-')) {
            const op = this.next().value;
            left = { type: 'Binary', op, left, right: this.parseMultiplicative() };
        }
        return left;
    }
    parseMultiplicative() {
        let left = this.parseUnary();
        while (this.isPunct('*') || this.isPunct('/') || this.isPunct('%')) {
            const op = this.next().value;
            left = { type: 'Binary', op, left, right: this.parseUnary() };
        }
        return left;
    }

    parseUnary() {
        if (this.isPunct('-') || this.isPunct('!')) {
            const op = this.next().value;
            return { type: 'Unary', op, operand: this.parseUnary() };
        }
        if (this.isPunct('++') || this.isPunct('--')) {
            const op = this.next().value;
            return { type: 'Update', op, target: this.parseUnary(), prefix: true };
        }
        return this.parseCallMember();
    }

    parseCallMember() {
        let expr = this.parsePrimary();
        while (true) {
            if (this.isPunct('.')) {
                this.next();
                const prop = this.next();
                if (prop.type !== 'ident' && prop.type !== 'keyword') this.err('esperado propriedade');
                expr = { type: 'Member', object: expr, prop: prop.value };
            } else if (this.isPunct('[')) {
                this.next();
                const idx = this.parseExpression();
                this.expectPunct(']');
                expr = { type: 'Index', object: expr, index: idx };
            } else if (this.isPunct('(')) {
                this.next();
                const args = [];
                while (!this.isPunct(')')) {
                    args.push(this.parseExpression());
                    if (this.isPunct(',')) this.next();
                }
                this.next();
                expr = { type: 'Call', callee: expr, args };
            } else break;
        }
        return expr;
    }

    parsePrimary() {
        const t = this.peek();
        if (t.type === 'number') { this.next(); return { type: 'Number', value: t.value }; }
        if (t.type === 'string') { this.next(); return { type: 'String', value: t.value }; }
        if (this.isKw('true')) { this.next(); return { type: 'Bool', value: true }; }
        if (this.isKw('false')) { this.next(); return { type: 'Bool', value: false }; }
        if (this.isKw('null')) { this.next(); return { type: 'Null' }; }
        if (this.isKw('undefined')) { this.next(); return { type: 'Undefined' }; }
        if (this.isKw('func')) {
            this.next();
            if (this.peek().type === 'ident') {
                const name = this.next().value;
                return this.parseFuncRest(name, false);
            }
            return this.parseFuncRest(null, false);
        }
        if (this.isKw('new')) {
            this.next();
            const callee = this.parseCallMember();
            return { type: 'New', callee };
        }
        if (this.isPunct('[')) {
            this.next();
            const items = [];
            while (!this.isPunct(']')) {
                items.push(this.parseExpression());
                if (this.isPunct(',')) this.next();
            }
            this.next();
            return { type: 'ArrayLit', items };
        }
        if (this.isPunct('{')) {
            this.next();
            const pairs = [];
            while (!this.isPunct('}')) {
                const k = this.next();
                let key;
                if (k.type === 'string' || k.type === 'ident') key = k.value;
                else if (k.type === 'number') key = String(k.value);
                else this.err('esperado chave de dicionario');
                this.expectPunct(':');
                pairs.push([key, this.parseExpression()]);
                if (this.isPunct(',')) this.next();
            }
            this.next();
            return { type: 'ObjectLit', pairs };
        }
        if (this.isPunct('(')) {
            this.next();
            const e = this.parseExpression();
            this.expectPunct(')');
            return e;
        }
        if (t.type === 'ident') { this.next(); return { type: 'Ident', name: t.value }; }
        this.err('expressao inesperada');
    }
}

export function parse(code) {
    return new Parser(tokenize(code)).parseProgram();
}
/*
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
*/
