// VessieLang Interpreter (src)
import { Environment } from './environment.js';
export const VL_BREAK = { signal: 'break' };
export const VL_CONTINUE = { signal: 'continue' };
export class VLFunction {
    constructor(decl, closure, interpreter) {
        this.decl = decl; this.closure = closure; this.interpreter = interpreter;
    }
    call(args = []) {
        const env = new Environment(this.closure);
        for (let i = 0; i < this.decl.params.length; i++) env.define(this.decl.params[i], args[i] === undefined ? null : args[i]);
        try { this.interpreter.block(this.decl.body, env); return null; }
        catch (e) { if (e && e._vlReturn) return e.value; throw e; }
    }
}
export class Interpreter {
    constructor(timeoutMs = 30000) {
        this.globals = new Environment(); this.timeoutMs = timeoutMs; this.deadline = Infinity; this.output = []; this.env = null;
    }
    run(ast) {
        this.deadline = Date.now() + this.timeoutMs;
        if (ast.type === 'Program') this.block(ast.body, this.globals);
        else this.exec(ast);
        return this.output;
    }
    check() { if (Date.now() > this.deadline) throw new Error('ErroDeTimeout: limite 30s'); }
    block(stmts, env) { const prev = this.env; this.env = env; for (const s of stmts) this.exec(s); this.env = prev; }
    exec(node) {
        if (!node || typeof node !== 'object') return node;
        this.check();
        const e = this.env || this.globals;
        switch (node.type) {
            case 'VarDecl': e.define(node.name, node.init ? this.eval(node.init) : null); return;
            case 'FunctionDecl': e.define(node.name, new VLFunction(node, e, this)); return;
            case 'ClassDecl': {
                const k = { __vlClass: true, name: node.name, parentName: node.parent, methods: new Map(), fields: [] };
                for (const m of node.methods) { if (m.type === 'ClassField') k.fields.push(m); else k.methods.set(m.name, m); }
                e.define(node.name, k); return;
            }
            case 'If': if (this.truthy(this.eval(node.cond))) this.block(node.then, new Environment(e)); else if (node.else) for (const s of node.else) this.exec(s); return;
            case 'While': while (this.truthy(this.eval(node.cond))) { this.check(); this.block(node.body, new Environment(e)); } return;
            case 'For': {
                const fe = new Environment(e); if (node.init) this.exec(node.init);
                while (this.truthy(this.eval(node.cond))) { this.check(); this.block(node.body, new Environment(fe)); if (node.step) this.exec(node.step); }
                return;
            }
            case 'ForIn': {
                const it = this.eval(node.iterable);
                const items = Array.isArray(it) ? it : (it && typeof it === 'object' ? Object.keys(it) : []);
                for (const k of items) { this.check(); const be = new Environment(e); be.define(node.name, k); this.block(node.body, be); }
                return;
            }
            case 'Return': throw { _vlReturn: true, value: node.value ? this.eval(node.value) : null };
            case 'Import': e.define(node.alias || node.module, {}); return;
            case 'Try': try { this.block(node.block, new Environment(e)); } catch (err) {
                if (err === VL_BREAK || err === VL_CONTINUE) throw err;
                if (node.handler) { const ce = new Environment(e); ce.define(node.param || 'erro', err && err.message ? err.message : String(err)); this.block(node.handler, ce); }
            } finally { if (node.finalizer) this.block(node.finalizer, new Environment(e)); } return;
            case 'ExprStmt': this.eval(node.expr); return;
            default: return this.eval(node);
        }
    }
    truthy(v) { return !(v === false || v === null || v === undefined || v === 0 || v === ''); }
    eval(node) {
        if (!node || typeof node !== 'object') return node;
        const e = this.env || this.globals;
        this.check();
        switch (node.type) {
            case 'Number': return node.value;
            case 'String': return node.value;
            case 'Bool': return node.value;
            case 'Null': return null;
            case 'Undefined': return undefined;
            case 'Ident': return e.has(node.name) ? e.get(node.name) : null;
            case 'ArrayLit': return node.items.map(i => this.eval(i));
            case 'ObjectLit': { const o = {}; for (const [k, v] of node.pairs) o[k] = this.eval(v); return o; }
            case 'Unary': { const v = this.eval(node.operand); return node.op === '-' ? -v : !this.truthy(v); }
            case 'Binary': {
                if (node.op === '&&') return this.truthy(this.eval(node.left)) ? this.eval(node.right) : this.eval(node.left);
                if (node.op === '||') { const l = this.eval(node.left); return this.truthy(l) ? l : this.eval(node.right); }
                const l = this.eval(node.left), r = this.eval(node.right);
                switch (node.op) {
                    case '+': return (l == null) ? r : (typeof l === 'string' || typeof r === 'string') ? String(l)+String(r) : l+r;
                    case '-': return l - r; case '*': return l * r;
                    case '/': if (r === 0) throw new Error('ErroDeExecucao: divisao por zero'); return l / r;
                    case '%': return l % r;
                    case '==': return l === r;
                    case '!=': return l !== r;
                    case '<': return l < r; case '>': return l > r; case '<=': return l <= r; case '>=': return l >= r;
                }
                throw new Error('ErroDeExecucao: operador ' + node.op);
            }
            case 'Ternary': return this.truthy(this.eval(node.cond)) ? this.eval(node.then) : this.eval(node.else);
            case 'Assign': {
                const v = this.eval(node.value);
                if (node.target.type === 'Ident') { if (node.op === '=') e.set(node.target.name, v); else { const c = e.get(node.target.name); e.set(node.target.name, applyOp(node.op, c, v)); } }
                return v;
            }
            case 'Member': { const obj = this.eval(node.object); if (obj == null) return null; const val = obj[node.prop]; return typeof val === 'function' ? val.bind(obj) : (val === undefined ? null : val); }
            case 'Index': { const obj = this.eval(node.object); const idx = this.eval(node.index); if (obj == null) return null; return obj[idx] === undefined ? null : obj[idx]; }
            case 'Call': {
                const fn = this.eval(node.callee); const args = node.args.map(a => this.eval(a));
                if (fn instanceof VLFunction) return fn.call(args);
                if (typeof fn === 'function') return fn(...args);
                throw new Error('ErroDeExecucao: nao e funcao');
            }
            default: return null;
        }
    }
}
function applyOp(op, cur, val) { const o = { '+=': cur+val, '-=': cur-val, '*=': cur*val, '/=': cur/val }; return o[op] ?? val; }
export function run(ast, timeoutMs = 30000) { const i = new Interpreter(timeoutMs); return i.run(ast); }
