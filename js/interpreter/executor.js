// VessieLang - Executor: avalia a AST
import { parse } from './parser.js';

export const BREAK = { signal: 'break' };
export const CONTINUE = { signal: 'continue' };

export class Environment {
    constructor(parent = null) {
        this.vars = new Map();
        this.parent = parent;
    }
    get(name) {
        let env = this;
        while (env) {
            if (env.vars.has(name)) return env.vars.get(name);
            env = env.parent;
        }
        return undefined;
    }
    has(name) {
        let env = this;
        while (env) {
            if (env.vars.has(name)) return true;
            env = env.parent;
        }
        return false;
    }
    set(name, value) {
        let env = this;
        while (env) {
            if (env.vars.has(name)) { env.vars.set(name, value); return; }
            env = env.parent;
        }
        this.vars.set(name, value);
    }
    define(name, value) { this.vars.set(name, value); }
}

export class VLFunction {
    constructor(decl, closureEnv, interpreter, thisVal = null) {
        this.decl = decl;
        this.closure = closureEnv;
        this.interpreter = interpreter;
        this.thisVal = thisVal;
    }
    call(args) {
        const env = new Environment(this.closure);
        for (let i = 0; i < this.decl.params.length; i++) {
            env.define(this.decl.params[i], args[i] === undefined ? null : args[i]);
        }
        env.define('this', this.thisVal);
        try {
            this.interpreter.execBlock(this.decl.body, env);
        } catch (e) {
            if (e && e._vlReturn) return e.value;
            throw e;
        }
        return null;
    }
}

export class VLInstance {
    constructor(klass) {
        this.__class = klass;
        this.fields = new Map();
    }
}

export class Interpreter {
    constructor(kernel, timeoutMs = 30000) {
        this.kernel = kernel;
        this.globals = new Environment();
        this.timeoutMs = timeoutMs;
        this.deadline = 0;
        this.output = [];
    }

    run(code, timeoutMs = null) {
        const ast = parse(code);
        this.deadline = Date.now() + (timeoutMs || this.timeoutMs);
        for (const [name, mod] of Object.entries(this.kernel.modules)) {
            this.globals.define(name, mod);
        }
        let result = null;
        try {
            this.execBlock(ast.body, this.globals);
        } catch (e) {
            if (e && e._vlReturn) result = e.value;
            else throw e;
        }
        const main = this.globals.get('main');
        if (main instanceof VLFunction) result = main.call([]);
        return result;
    }

    checkTime() {
        if (Date.now() > this.deadline) {
            throw new Error('ErroDeExecucao: timeout de execucao (30s) - possivel loop infinito');
        }
    }

    execBlock(stmts, env) {
        for (const s of stmts) this.exec(s, env);
    }

    exec(node, env) {
        this.checkTime();
        switch (node.type) {
            case 'VarDecl':
                env.define(node.name, node.init ? this.eval(node.init, env) : null);
                return;
            case 'FunctionDecl':
                env.define(node.name, new VLFunction(node, env, this));
                return;
            case 'ClassDecl': {
                const klass = { __vlClass: true, name: node.name, parentName: node.parent, parent: null, methods: new Map(), fields: [] };
                for (const m of node.methods) {
                    if (m.type === 'ClassField') klass.fields.push(m);
                    else klass.methods.set(m.name, m);
                }
                env.define(node.name, klass);
                return;
            }
            case 'If':
                if (this.truthy(this.eval(node.cond, env))) this.execBlock(node.then, new Environment(env));
                else if (node.else) for (const s of node.else) this.exec(s, env);
                return;
            case 'While':
                while (this.truthy(this.eval(node.cond, env))) {
                    this.checkTime();
                    try { this.execBlock(node.body, new Environment(env)); }
                    catch (e) {
                        if (e === BREAK) break;
                        if (e === CONTINUE) continue;
                        throw e;
                    }
                }
                return;
            case 'For': {
                const fenv = new Environment(env);
                this.exec(node.init, fenv);
                while (this.truthy(this.eval(node.cond, fenv))) {
                    this.checkTime();
                    try { this.execBlock(node.body, new Environment(fenv)); }
                    catch (e) {
                        if (e === BREAK) break;
                        if (e !== CONTINUE) throw e;
                    }
                    this.exec(node.step, fenv);
                }
                return;
            }
            case 'ForIn': {
                const iterable = this.eval(node.iterable, env);
                const items = Array.isArray(iterable) ? iterable :
                    iterable && typeof iterable === 'object' ? Object.keys(iterable) : [];
                for (const item of items) {
                    this.checkTime();
                    const benv = new Environment(env);
                    benv.define(node.name, item);
                    try { this.execBlock(node.body, benv); }
                    catch (e) {
                        if (e === BREAK) break;
                        if (e !== CONTINUE) throw e;
                    }
                }
                return;
            }
            case 'Return': {
                const value = node.value ? this.eval(node.value, env) : null;
                throw { _vlReturn: true, value };
            }
            case 'Break': throw BREAK;
            case 'Continue': throw CONTINUE;
            case 'Import': {
                env.define(node.alias, this.kernel.modules[node.module] || {});
                return;
            }
            case 'Try': {
                try { this.execBlock(node.block, new Environment(env)); }
                catch (e) {
                    if (e === BREAK || e === CONTINUE) throw e;
                    if (node.handler) {
                        const cenv = new Environment(env);
                        cenv.define(node.param || 'erro', e instanceof Error ? e.message : String(e && (e.message || e)));
                        this.execBlock(node.handler, cenv);
                    }
                } finally {
                    if (node.finalizer) this.execBlock(node.finalizer, new Environment(env));
                }
                return;
            }
            case 'ExprStmt':
                this.eval(node.expr, env);
                return;
            default:
                this.eval(node, env);
                return;
        }
    }

    truthy(v) {
        return !(v === false || v === null || v === undefined || v === 0 || v === '');
    }

    eval(node, env) {
        switch (node.type) {
            case 'Number': case 'String': case 'Bool':
                return node.value;
            case 'Null': return null;
            case 'Undefined': return undefined;
            case 'Ident': {
                if (env.has(node.name)) return env.get(node.name);
                throw new Error(`ErroDeExecucao: variavel '${node.name}' nao definida`);
            }
            case 'ArrayLit':
                return node.items.map(i => this.eval(i, env));
            case 'ObjectLit': {
                const obj = {};
                for (const [k, v] of node.pairs) obj[k] = this.eval(v, env);
                return obj;
            }
            case 'Unary': {
                const v = this.eval(node.operand, env);
                return node.op === '-' ? -v : !this.truthy(v);
            }
            case 'Binary': {
                if (node.op === '&&') return this.truthy(this.eval(node.left, env)) ? this.eval(node.right, env) : this.eval(node.left, env);
                if (node.op === '||') {
                    const l = this.eval(node.left, env);
                    return this.truthy(l) ? l : this.eval(node.right, env);
                }
                const l = this.eval(node.left, env);
                const r = this.eval(node.right, env);
                switch (node.op) {
                    case '+': return (l === null || l === undefined) ? r :
                        (typeof l === 'string' || typeof r === 'string') ? String(l) + String(r) : l + r;
                    case '-': return l - r;
                    case '*': return l * r;
                    case '/': if (r === 0) throw new Error('ErroDeExecucao: divisao por zero'); return l / r;
                    case '%': return l % r;
                    case '==': return l === r || (l == r && typeof l !== 'object' && typeof r !== 'object');
                    case '!=': return !(l === r || (l == r && typeof l !== 'object' && typeof r !== 'object'));
                    case '<': return l < r;
                    case '>': return l > r;
                    case '<=': return l <= r;
                    case '>=': return l >= r;
                }
                throw new Error(`ErroDeExecucao: operador desconhecido '${node.op}'`);
            }
            case 'Ternary':
                return this.truthy(this.eval(node.cond, env)) ? this.eval(node.then, env) : this.eval(node.else, env);
            case 'Assign': {
                let value;
                if (node.op === '=') value = this.eval(node.value, env);
                else {
                    const cur = this.eval(node.target, env);
                    const val = this.eval(node.value, env);
                    value = node.op === '+=' ? ((typeof cur === 'string' || typeof val === 'string') ? String(cur) + String(val) : cur + val)
                        : node.op === '-=' ? cur - val
                        : node.op === '*=' ? cur * val : cur / val;
                }
                this.assignTo(node.target, value, env);
                return value;
            }
            case 'Update': {
                const cur = this.eval(node.target, env);
                const value = node.op === '++' ? cur + 1 : cur - 1;
                this.assignTo(node.target, value, env);
                return node.prefix ? value : cur;
            }
            case 'Member': {
                const obj = this.eval(node.object, env);
                if (obj === null || obj === undefined) throw new Error(`ErroDeExecucao: propriedade '${node.prop}' de valor nulo`);
                if (obj instanceof VLInstance) {
                    if (obj.fields.has(node.prop)) return obj.fields.get(node.prop);
                    return null;
                }
                const val = obj[node.prop];
                if (typeof val === 'function') return val.bind(obj);
                return val === undefined ? null : val;
            }
            case 'Index': {
                const obj = this.eval(node.object, env);
                const idx = this.eval(node.index, env);
                if (obj === null || obj === undefined) return null;
                const val = obj[idx];
                return val === undefined ? null : val;
            }
            case 'Call': {
                const callee = node.callee;
                if (callee.type === 'Member') {
                    const obj = this.eval(callee.object, env);
                    if (obj === null || obj === undefined) throw new Error('ErroDeExecucao: chamada de metodo em valor nulo');
                    const args = node.args.map(a => this.eval(a, env));
                    if (obj instanceof VLInstance) {
                        return this.callInstanceMethod(obj, callee.prop, args);
                    }
                    const fn = obj[callee.prop];
                    if (typeof fn === 'function') return fn.apply(obj, args);
                    throw new Error(`ErroDeExecucao: metodo '${callee.prop}' nao encontrado`);
                }
                const fn = this.eval(callee, env);
                const args = node.args.map(a => this.eval(a, env));
                if (fn instanceof VLFunction) return fn.call(args);
                if (typeof fn === 'function') return fn(...args);
                throw new Error(`ErroDeExecucao: '${this.calleeName(callee)}' nao e uma funcao`);
            }
            case 'New': {
                let klassExpr = node.callee;
                let args = [];
                if (klassExpr.type === 'Call') {
                    args = klassExpr.args.map(a => this.eval(a, env));
                    klassExpr = klassExpr.callee;
                }
                const klass = this.eval(klassExpr, env);
                if (!klass || !klass.__vlClass) throw new Error('ErroDeExecucao: nao e uma classe');
                const inst = new VLInstance(klass);
                // resolve heranca
                let chain = [];
                let k = klass;
                while (k) {
                    chain.unshift(k);
                    k = k.parentName ? this.lookupClass(k.parentName, env) : null;
                }
                inst.__chain = chain;
                for (const cls of chain) {
                    for (const f of cls.fields) {
                        inst.fields.set(f.name, f.init ? this.eval(f.init, env) : null);
                    }
                }
                const initFn = this.findMethod(klass, 'init');
                if (initFn) this.callMethodOn(inst, initFn, args);
                return inst;
            }
            default:
                this.exec(node, env);
                return null;
        }
    }

    lookupClass(name, env) {
        let e = env;
        while (e) {
            const v = e.vars.get(name);
            if (v && v.__vlClass) return v;
            e = e.parent;
        }
        return null;
    }

    findMethod(klass, name) {
        let k = klass;
        while (k) {
            const m = k.methods.get(name);
            if (m) return m;
            k = k.__resolvedParent || null;
        }
        return null;
    }

    callInstanceMethod(inst, name, args) {
        const m = this.findMethod(inst.__class, name);
        if (!m) throw new Error(`ErroDeExecucao: metodo '${name}' nao encontrado`);
        return this.callMethodOn(inst, m, args);
    }

    callMethodOn(inst, method, args) {
        const env = new Environment(this.globals);
        for (let i = 0; i < method.params.length; i++) {
            env.define(method.params[i], args[i] === undefined ? null : args[i]);
        }
        env.define('this', inst);
        try {
            this.execBlock(method.body, env);
        } catch (e) {
            if (e && e._vlReturn) return e.value;
            throw e;
        }
        return null;
    }

    calleeName(callee) {
        if (callee.type === 'Ident') return callee.name;
        if (callee.type === 'Member') return callee.prop;
        return 'expressao';
    }

    assignTo(target, value, env) {
        if (target.type === 'Ident') {
            if (env.has(target.name)) env.set(target.name, value);
            else env.define(target.name, value);
            return;
        }
        if (target.type === 'Member') {
            const obj = this.eval(target.object, env);
            if (obj instanceof VLInstance) {
                obj.fields.set(target.prop, value);
            } else if (obj && typeof obj === 'object') {
                obj[target.prop] = value;
            }
            return;
        }
        if (target.type === 'Index') {
            const obj = this.eval(target.object, env);
            const idx = this.eval(target.index, env);
            if (obj && typeof obj === 'object') obj[idx] = value;
            return;
        }
        throw new Error('ErroDeExecucao: alvo de atribuicao invalido');
    }
}

// Executa codigo .vl no contexto do kernel
export function runScript(code, kernel, timeoutMs = 30000) {
    const interp = new Interpreter(kernel, timeoutMs);
    return interp.run(code);
}

/*
export function execute(ast, context) {
    if (Array.isArray(ast)) {
        let last = null;
        for (const node of ast) {
            last = execute(node, context);
            if (last && last._return) break;
        }
        return last;
    }
    if (ast.type === 'Program') {
        let last = null;
        for (const node of ast.body) {
            last = execute(node, context);
            if (last && last._return) break;
        }
        return last;
    }
    if (ast.type === 'Function') {
        context[ast.name] = function(...args) {
            const localCtx = { ...context };
            for (let i = 0; i < ast.params.length; i++) {
                localCtx[ast.params[i]] = args[i];
            }
            const bodyAst = parse(ast.body);
            return execute(bodyAst, localCtx);
        };
        return context[ast.name];
    }
    if (ast.type === 'VarDecl') {
        const val = ast.value !== null ? evaluateExpr(ast.value, context) : null;
        context[ast.name] = val;
        return val;
    }
    if (ast.type === 'If') {
        const cond = evaluateExpr(ast.condition, context);
        if (cond) {
            const bodyAst = parse(ast.body);
            return execute(bodyAst, context);
        }
        return null;
    }
    if (ast.type === 'Return') {
        const val = ast.value !== null ? evaluateExpr(ast.value, context) : null;
        return { _return: true, value: val };
    }
    if (ast.type === 'Import') {
        // O módulo já deve estar carregado no kernel
        const mod = context._kernel.modules[ast.module] || {};
        context[ast.alias] = mod;
        return mod;
    }
    if (ast.type === 'Expr') {
        return evaluateExpr(ast.value, context);
    }
    return null;
}

function evaluateExpr(expr, context) {
    if (typeof expr === 'string') {
        // Tenta avaliar como número
        if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);
        if (expr === 'true') return true;
        if (expr === 'false') return false;
        if (expr === 'null') return null;
        // Variável
        if (/^[a-zA-Z_]\w*$/.test(expr)) {
            return context[expr] !== undefined ? context[expr] : null;
        }
        // Chamada de função: func(args)
        const callMatch = expr.match(/^(\w+)\(([^)]*)\)$/);
        if (callMatch) {
            const [, name, argsStr] = callMatch;
            const func = context[name];
            if (typeof func === 'function') {
                const args = argsStr ? argsStr.split(',').map(a => evaluateExpr(a.trim(), context)) : [];
                return func(...args);
            }
            return null;
        }
        // Objeto: obj.prop
        const propMatch = expr.match(/^(\w+)\.(\w+)$/);
        if (propMatch) {
            const [, objName, prop] = propMatch;
            const obj = context[objName];
            return obj ? obj[prop] : null;
        }
        // Tenta operador aritmético
        try {
            return Function('"use strict"; return (' + expr + ')')();
        } catch (e) {
            return null;
        }
    }
    return expr;
}
*/
