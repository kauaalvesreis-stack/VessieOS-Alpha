// Script gerador - cria todos os arquivos faltantes de js/lang
import { writeFileSync, statSync, mkdirSync } from 'fs';

function w(name, content) {
    const p = `js/lang/src/${name}`;
    writeFileSync(p, content);
    console.log(`${name}: ${statSync(p).size} bytes`);
}

mkdirSync('js/lang/src', { recursive: true });

// 7 - interpreter
w('interpreter.js', `// VessieLang Interpreter (src)
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
`);

// 8 - builtins
w('builtins.js', `// VessieLang Builtins - funcoes nativas
export const VLBuiltins = {
  print: (...args) => console.log('[VL]', args.map(String).join(' ')),
  println: (...args) => console.log(args.map(String).join('')),
  warn: (...a) => console.warn('[VL]', a), error: (...a) => console.error('[VL]', a),
  type: (v) => (v === null ? 'null' : v === undefined ? 'undefined' : Array.isArray(v) ? 'array' : typeof v),
  int: (v) => parseInt(Number(v)), float: (v) => parseFloat(v), str: (v) => String(v), bool: (v) => !!v,
  range: (f, t, s = 1) => { const r = []; for (let i = f; i < t; i += s) r.push(i); return r; },
  keys: (obj) => obj ? Object.keys(obj) : [], vals: (obj) => obj ? Object.values(obj) : [],
  len: (v) => (v == null ? 0 : (Array.isArray(v) || typeof v === 'string' ? v.length : Object.keys(v).length)),
  exit: (code = 0) => { process?.exit?.(code); },
  assert: (cond, msg = 'assertion failed') => { if (!cond) throw new Error('ErroDeExecucao: ' + msg); },
  eval: (s) => { try { return Function('"use strict"; return (' + String(s) + ')')(); } catch (e) { throw new Error('ErroDeExecucao: eval inválido'); } },
  jsonParse: (s) => JSON.parse(s), jsonStringify: (o, i = 0) => JSON.stringify(o, null, i || 0),
  dateNow: () => Date.now(),
  sqrt: Math.sqrt, pow: Math.pow, abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, PI: Math.PI, E: Math.E,
  random: () => Math.random(), sin: Math.sin, cos: Math.cos, tan: Math.tan,
  strUpper: (s) => String(s).toUpperCase(), strLower: (s) => String(s).toLowerCase(),
  strTrim: (s) => String(s).trim(), strSplit: (s, sep) => String(s).split(sep), strJoin: (a, sep) => (a||[]).join(sep),
  strLen: (s) => String(s).length, strFind: (s, sub) => String(s).indexOf(sub),
  hash: async (data) => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(data)));
      return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
    let h = 0; for (const c of String(data)) h = ((h << 5) - h + c.charCodeAt(0)) | 0; return Math.abs(h).toString(16).padStart(8,'0');
  }
};

export function installBuiltins(env) {
  for (const [name, fn] of Object.entries(VLBuiltins)) {
    if (env && env.define) env.define(name, fn); else if (env) env[name] = fn;
  }
  return VLBuiltins;
}
`);

// 9 - stdlib
w('stdlib.js', `// VessieLang Standard Library - funcionalidades estendidas
export const StdLib = {
  map: (fn, arr) => (arr || []).map(fn),
  filter: (pred, arr) => (arr || []).filter(pred),
  reduce: (fn, arr, init) => arr.reduce(fn, init),
  forEach: (fn, arr) => { (arr||[]).forEach(fn); },
  find: (pred, arr) => (arr || []).find(pred),
  sort: (arr, cmp = (a,b) => a-b) => [...(arr||[])].sort(cmp),
  reverse: (arr) => [...(arr||[])].reverse(),
  clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  gcd: (a, b) => b === 0 ? a : gcd(b, a % b),
  objKeys: (o) => o ? Object.keys(o) : [], objVals: (o) => o ? Object.values(o) : [],
  objEntries: (o) => o ? Object.entries(o) : [],
  merge: (...objs) => Object.assign({}, ...objs),
  deepClone: (v) => JSON.parse(JSON.stringify(v)),
  format: (s, ...args) => { let i = 0; return String(s).replace(/\\{\\}/g, () => args[i++]); },
  sleep: (ms) => { const s = Date.now(); while (Date.now() - s < ms); },
  debounce: (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },
  throttle: (fn, ms) => { let last = 0; return (...a) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...a); } }; }
};

export function installStdlib(env) {
  for (const [name, fn] of Object.entries(StdLib)) {
    if (env && env.define) env.define(name, fn); else if (env) env[name] = fn;
  }
  return StdLib;
}
`);

// 10 - transpiler
w('transpiler.js', `// VessieLang Transpiler - .vl para JS
import { tokenize } from './lexer.js';
import { parse } from './parser.js';

export function transpile(code) {
  const ast = parse(code);
  const parts = translate(ast);
  parts.unshift('(() => {');
  parts.push('})();');
  return parts.join('\\n');
}

function translate(node) {
  if (!node || typeof node !== 'object') return ['/* null */'];
  if (Array.isArray(node)) return node.flatMap(translate);
  switch (node.type) {
    case 'Program': return node.body.flatMap(translate);
    case 'VarDecl':
      return [\\\"let \\\" + node.name + \\\" = \\\" + (node.init ? expr(node.init) : 'null') + \\\";\\\"];
    case 'FunctionDecl':
      return [\\\"function \\\" + node.name + \\\"(\\\" + node.params.join(', ') + \\\") { \\\" + block(node.body) + \\\" }\\\"];
    case 'If': {
      let s = 'if (' + expr(node.cond) + ') { ' + block(node.then) + ' }';
      if (node.else) s += ' else { ' + (node.else[0]?.type === 'If' ? block(node.else).replace(/^/, '') : block(node.else) ) + ' }';
      return [s];
    }
    case 'While': return ['while (' + expr(node.cond) + ') { ' + block(node.body) + ' }'];
    case 'For': return ['for (' + translate(node.init)[0] + '; ' + expr(node.cond) + '; ' + expr(node.step?.expr || node.step || 'null') + ') { ' + block(node.body) + ' }'];
    case 'ForIn': return ['for (const ' + node.name + ' of ' + expr(node.iterable) + ') { ' + block(node.body) + ' }'];
    case 'Return': return ['return ' + (node.value ? expr(node.value) : '') + ';'];
    case 'ExprStmt': return [expr(node.expr) + ';'];
    case 'Import':
      return node.module ? ['import ' + (node.alias ? node.alias : (node.module)) + ' from \"' + node.module.replace(/\\\"/g,'') + '";'] : [];
    default: return ['/* TODO: ' + node.type + ' */'];
  }
}

function expr(node) {
  if (!node || typeof node !== 'object') return String(node ?? 'null');
  switch (node.type) {
    case 'Number': return String(node.value);
    case 'String': return JSON.stringify(node.value);
    case 'Bool': return String(node.value);
    case 'Null': return 'null';
    case 'Undefined': return 'undefined';
    case 'Ident': return node.name;
    case 'ArrayLit': return '[' + node.items.map(expr).join(', ') + ']';
    case 'ObjectLit': return '{' + node.pairs.map(([k,v]) => JSON.stringify(k) + ':' + expr(v)).join(', ') + '}';
    case 'Binary': return '(' + expr(node.left) + ' ' + node.op + ' ' + expr(node.right) + ')';
    case 'Unary': return node.op + expr(node.operand);
    case 'Ternary': return '(' + expr(node.cond) + ' ? ' + expr(node.then) + ' : ' + expr(node.else) + ')';
    case 'Assign': return node.target.name + ' = ' + expr(node.value);
    case 'Member': return expr(node.object) + '.' + node.prop;
    case 'Index': return expr(node.object) + '[' + expr(node.index) + ']';
    case 'Call': return expr(node.callee) + '(' + node.args.map(expr).join(', ') + ')';
    default: return 'null';
  }
}

function block(stmts) { return stmts ? stmts.flatMap(translate).join(' ') : ''; }
`);

// 11 - types
w('types.js', `'use strict';
// VessieLang Types - sistema de tipos opcional

export const PRIMITIVES = new Set(['int', 'float', 'bool', 'string', 'null', 'undefined', 'void', 'array', 'object', 'function']);

export const TYPE_MAP = {
  number: (n) => Number.isInteger(n) ? 'int' : 'float',
  string: 'string',
  boolean: 'bool',
  object: (v) => Array.isArray(v) ? 'array' : (v === null ? 'null' : 'object'),
  undefined: 'undefined',
  function: 'function',
  bigint: 'int'
};

export function typeofV(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  const t = typeof value;
  if (t === 'number') return Number.isInteger(value) ? 'int' : 'float';
  if (t === 'object') return 'object';
  if (t === 'boolean') return 'bool';
  if (t === 'string') return 'string';
  if (t === 'function') return 'function';
  return 'unknown';
}

export function checkType(value, expected) {
  if (expected === 'any' || expected === 'void') return true;
  if (expected === 'number' || expected === 'int' || expected === 'float') {
    if (typeof value !== 'number') return false;
    if (expected === 'int' && !Number.isInteger(value)) return false;
    return true;
  }
  return typeofV(value) === expected;
}

export function coerce(value, target) {
  switch (target) {
    case 'int': return parseInt(Number(value)) || 0;
    case 'float': return parseFloat(Number(value)) || 0;
    case 'string': return String(value);
    case 'bool': return !!value;
    default: return value;
  }
}

export function typeInfo(value) {
  return { type: typeofV(value), jsType: typeof value, serializable: typeof value !== 'function' && typeof value !== 'object' };
}
`);

// 3 - tokens
w('tokens.js', `'use strict';
// VessieLang Tokens
export const KEYWORDS = new Set(['var','func','if','else','while','for','return','import','export','try','catch','finally','class','extends','new','true','false','null','undefined','break','continue','in']);

export const SYMBOLS = new Map([
  ['{','lbrace'],['}','rbrace'],['(','lparen'],[')','rparen'],
  ['[','lbracket'],[']','rbracket'],[',','comma'],[';',';'],['.', '.'],['+','plus'],['-','minus'],['*','star'],['/','slash'],['%','percent'],['<','lt'],['>','gt'],['=','eq'],['!','bang'],
  ['==','eqeq'],['!=','neq'],['<=','lte'],['>=','gte'],['&&','ampamp'],['||','pipip'],['++','inc'],['--','dec'],['+=','addeq'],['-=','subeq'],['*=','muleq'],['/=','diveq'],['=>','arrow'],['?','ternary'],[':',':']
]);

export function classify(token) {
  if (KEYWORDS.has(token.value)) token.type = 'keyword';
  return token;
}
`);

// 5 - ast
w('ast.js', `'use strict';
// VessieLang AST - helpers

export function node(type, props = {}) {
  return { type, ...props };
}

export function isExpression(node) {
  if (!node) return false;
  return ['Number','String','Bool','Null','Undefined','ArrayLit','ObjectLit',
          'Ident','Member','Index','Call','Unary','Binary','Ternary','Assign',
          'Block','ExprStmt','New'].includes(node.type);
}

export function isStatement(node) {
  if (!node) return false;
  return ['VarDecl','FunctionDecl','If','While','For','ForIn','Return','Break',
          'Continue','Import','Export','Try','ClassDecl','ExprStmt'].includes(node.type);
}

export function walk(ast, onEnter, onExit) {
  const stack = [ast];
  const visited = new WeakSet();
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (visited.has(node)) continue;
    visited.add(node);
    if (onEnter) onEnter(node);
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (Array.isArray(v)) stack.push(...v.reverse());
      else if (v && typeof v === 'object') stack.push(v);
    }
    if (onExit) onExit(node);
  }
}

export function cloneAst(ast) {
  if (!ast || typeof ast !== 'object') return ast;
  if (Array.isArray(ast)) return ast.map(cloneAst);
  const o = {}; for (const k of Object.keys(ast)) o[k] = cloneAst(ast[k]); return o;
}

export function countNodes(ast) {
  let n = 0; walk(ast, () => n++); return n;
}

export function findNode(ast, predicate) {
  let found = null;
  walk(ast, (n) => { if (!found && predicate(n)) found = n; });
  return found;
}
`);

// Environment já existe - não reescrever
console.log('Gerando arquivos src do VessieLang Core...');
console.log('Concluído.');
