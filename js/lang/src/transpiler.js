// VessieLang Transpiler - .vl para JS
import { tokenize } from './lexer.js';
import { parse } from './parser.js';

export function transpile(code) {
  const ast = parse(code);
  const parts = translate(ast);
  parts.unshift('(() => {');
  parts.push('})();');
  return parts.join('\n');
}

function translate(node) {
  if (!node || typeof node !== 'object') return ['/* null */'];
  if (Array.isArray(node)) return node.flatMap(translate);
  switch (node.type) {
    case 'Program': return node.body.flatMap(translate);
    case 'VarDecl':
      return [\"let \" + node.name + \" = \" + (node.init ? expr(node.init) : 'null') + \";\"];
    case 'FunctionDecl':
      return [\"function \" + node.name + \"(\" + node.params.join(', ') + \") { \" + block(node.body) + \" }\"];
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
      return node.module ? ['import ' + (node.alias ? node.alias : (node.module)) + ' from "' + node.module.replace(/\"/g,'') + '";'] : [];
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
