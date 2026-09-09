'use strict';
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
