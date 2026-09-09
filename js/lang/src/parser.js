// VessieLang Parser (recursivo descendente) - src
import { tokenize } from './lexer.js';

class Parser {
    constructor(tokens) { this.toks = tokens; this.pos = 0; }
    peek(o = 0) { return this.toks[this.pos + o]; }
    next() { return this.toks[this.pos++]; }
    expectP(c) {
        const t = this.peek();
        if (!t || t.type !== 'punct' || t.value !== c) this.err(`esperado '${c}'`);
        this.next();
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
            switch (this.peek().value) {
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
                case 'break': this.next(); return { type: 'Break' };
                case 'continue': this.next(); return { type: 'Continue' };
            }
        }
        const e = this.parseExpression();
        if (this.peek().value === ';') this.next();
        return { type: 'ExprStmt', expr: e };
    }

    optSemi() { if (this.peek().value === ';') this.next(); }

    parseBlock() {
        this.expectP('{');
        const body = [];
        while (this.peek().value !== '}') body.push(this.parseStatement());
        this.next();
        return body;
    }

    isKw(v) { const t = this.peek(); return t && t.type === 'keyword' && (v === undefined || t.value === v); }

    parseVar() {
        this.next();
        const name = this.next();
        if (name.type !== 'ident') this.err('esperado nome de variável');
        let typeAnnot = null;
        if (this.peek().value === ':') { this.next(); typeAnnot = this.next().value; }
        let init = null;
        if (this.peek().value === '=') { this.next(); init = this.parseExpression(); }
        this.optSemi();
        return { type: 'VarDecl', name: name.value, init, typeAnnot };
    }

    parseFunc() {
        this.next();
        const name = this.next();
        if (name.type !== 'ident') this.err('esperado nome de função');
        this.expectP('(');
        const params = [];
        while (this.peek().value !== ')') {
            const p = this.next();
            if (p.type !== 'ident') this.err('esperado parâmetro');
            params.push(p.value);
            if (this.peek().value === ',') this.next();
        }
        this.next();
        const body = this.parseBlock();
        this.optSemi();
        return { type: 'FunctionDecl', name, params, body };
    }

    parseIf() {
        this.next();
        this.expectP('(');
        const cond = this.parseExpression();
        this.expectP(')');
        const then = this.parseBlock();
        let els = null;
        if (this.peek().value === 'else') {
            this.next();
            if (this.peek().value === 'if') els = [this.parseIf()];
            else els = this.parseBlock();
        }
        return { type: 'If', cond, then, else: els };
    }

    parseWhile() {
        this.next();
        this.expectP('(');
        const cond = this.parseExpression();
        this.expectP(')');
        return { type: 'While', cond, body: this.parseBlock() };
    }

    parseFor() {
        this.next();
        this.expectP('(');
        if (this.peek().value === 'var') {
            const init = this.parseVar();
            this.optSemi();
            const cond = this.parseExpression();
            this.expectP(';');
            const step = this.parseStatement();
            this.expectP(')');
            return { type: 'For', init, cond, step, body: this.parseBlock() };
        }
        const name = this.next();
        this.expectKw('in');
        const iterable = this.parseExpression();
        this.expectP(')');
        return { type: 'ForIn', name: name.value, iterable, body: this.parseBlock() };
    }

    expectKw(v) {
        if (!this.isKw(v)) this.err(`esperado '${v}'`);
        this.next();
    }

    parseReturn() {
        this.next();
        let value = null;
        if (this.peek().value !== ';' && this.peek().type !== 'eof') value = this.parseExpression();
        this.optSemi();
        return { type: 'Return', value };
    }

    parseImport() {
        this.next();
        const t = this.next();
        if (t.type !== 'string' && t.type !== 'ident') this.err('esperado nome de módulo');
        let alias = null;
        if (this.peek().value === 'as') { this.next(); alias = this.next().value; }
        this.optSemi();
        return { type: 'Import', module: t.value, alias: alias || t.value };
    }

    parseTry() {
        this.next();
        const block = this.parseBlock();
        let param = null, handler = null, finalizer = null;
        if (this.peek().value === 'catch') {
            this.next();
            if (this.peek().value === '(') { this.next(); param = this.next().value; this.expectP(')'); }
            handler = this.parseBlock();
        }
        if (this.peek().value === 'finally') { this.next(); finalizer = this.parseBlock(); }
        return { type: 'Try', block, param, handler, finalizer };
    }

    parseClass() {
        this.next();
        const name = this.next().value;
        let parent = null;
        if (this.peek().value === 'extends') { this.next(); parent = this.next().value; }
        this.expectP('{');
        const methods = [];
        while (this.peek().value !== '}') {
            if (this.peek().value === 'var') {
                const v = this.parseVar();
                methods.push({ type: 'ClassField', name: v.name, init: v.init });
            } else if (this.peek().value === 'func') {
                this.next();
                methods.push(this.parseFunc());
            } else this.err('esperado campo ou método de classe');
        }
        this.next();
        this.optSemi();
        return { type: 'ClassDecl', name, parent, methods };
    }

    parseExpression() { return this.parseAssignment(); }

    parseAssignment() {
        const left = this.parseTernary();
        if (['=', '+=', '-=', '*=', '/='].includes(this.peek().value || '')) {
            const op = this.next().value;
            const right = this.parseAssignment();
            return { type: 'Assign', op, target: left, value: right };
        }
        return left;
    }

    parseTernary() {
        const cond = this.parseOr();
        if (this.peek().value === '?') {
            this.next();
            const then = this.parseAssignment();
            this.expectP(':');
            const els = this.parseAssignment();
            return { type: 'Ternary', cond, then, else: els };
        }
        return cond;
    }

    parseOr() {
        let left = this.parseAnd();
        while (this.peek().value === '||') { this.next(); left = { type: 'Binary', op: '||', left, right: this.parseAnd() }; }
        return left;
    }
    parseAnd() {
        let left = this.parseEquality();
        while (this.peek().value === '&&') { this.next(); left = { type: 'Binary', op: '&&', left, right: this.parseEquality() }; }
        return left;
    }
    parseEquality() {
        let left = this.parseComparison();
        while (this.peek().value === '==' || this.peek().value === '!=') {
            const op = this.next().value;
            left = { type: 'Binary', op, left, right: this.parseComparison() };
        }
        return left;
    }
    parseComparison() {
        let left = this.parseAdditive();
        while (['<', '>', '<=', '>='].includes(this.peek().value || '')) {
            const op = this.next().value;
            left = { type: 'Binary', op, left, right: this.parseAdditive() };
        }
        return left;
    }
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (this.peek().value === '+' || this.peek().value === '-') {
            const op = this.next().value;
            left = { type: 'Binary', op, left, right: this.parseMultiplicative() };
        }
        return left;
    }
    parseMultiplicative() {
        let left = this.parseUnary();
        while (['*', '/', '%'].includes(this.peek().value || '')) {
            const op = this.next().value;
            left = { type: 'Binary', op, left, right: this.parseUnary() };
        }
        return left;
    }

    parseUnary() {
        if (this.peek().value === '-' || this.peek().value === '!') {
            const op = this.next().value;
            return { type: 'Unary', op, operand: this.parseUnary() };
        }
        return this.parseCallMember();
    }

    parseCallMember() {
        let expr = this.parsePrimary();
        while (true) {
            if (this.peek().value === '.') {
                this.next();
                const prop = this.next();
                if (prop.type !== 'ident') this.err('esperado propriedade');
                expr = { type: 'Member', object: expr, prop: prop.value };
            } else if (this.peek().value === '[') {
                this.next();
                const idx = this.parseExpression();
                this.expectP(']');
                expr = { type: 'Index', object: expr, index: idx };
            } else if (this.peek().value === '(') {
                this.next();
                const args = [];
                while (this.peek().value !== ')') {
                    args.push(this.parseExpression());
                    if (this.peek().value === ',') this.next();
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
        if (this.peek().value === 'true') { this.next(); return { type: 'Bool', value: true }; }
        if (this.peek().value === 'false') { this.next(); return { type: 'Bool', value: false }; }
        if (this.peek().value === 'null') { this.next(); return { type: 'Null' }; }
        if (this.peek().value === 'undefined') { this.next(); return { type: 'Undefined' }; }
        if (this.peek().value === 'new') {
            this.next();
            const callee = this.parseCallMember();
            return { type: 'New', callee };
        }
        if (this.peek().value === '[') {
            this.next();
            const items = [];
            while (this.peek().value !== ']') {
                items.push(this.parseExpression());
                if (this.peek().value === ',') this.next();
            }
            this.next();
            return { type: 'ArrayLit', items };
        }
        if (this.peek().value === '{') {
            this.next();
            const pairs = [];
            while (this.peek().value !== '}') {
                const k = this.next();
                let key;
                if (k.type === 'string' || (k.type === 'ident')) key = k.value;
                else if (k.type === 'number') key = String(k.value);
                else this.err('esperado chave de dicionário');
                this.expectP(':');
                pairs.push([key, this.parseExpression()]);
                if (this.peek().value === ',') this.next();
            }
            this.next();
            return { type: 'ObjectLit', pairs };
        }
        if (this.peek().value === '(') {
            this.next();
            const e = this.parseExpression();
            this.expectP(')');
            return e;
        }
        if (t.type === 'ident') { this.next(); return { type: 'Ident', name: t.value }; }
        this.err('expressão inesperada');
    }
}

export function parse(code) {
    return new Parser(tokenize(code)).parseProgram();
}
</arg_value></tool_call>