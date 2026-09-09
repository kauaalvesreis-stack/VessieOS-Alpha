import { parse } from './parser.js';

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