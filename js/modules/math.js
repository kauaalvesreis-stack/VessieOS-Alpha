// Módulo math
export default function mathModule(kernel) {
    return {
        random: (min = 0, max = 1) => Math.random() * (max - min) + min,
        floor: Math.floor, ceil: Math.ceil, round: Math.round,
        abs: Math.abs, sign: Math.sign,
        sin: Math.sin, cos: Math.cos, tan: Math.tan,
        sqrt: Math.sqrt, pow: Math.pow,
        log: Math.log, exp: Math.exp,
        min: (...a) => Math.min(...a),
        max: (...a) => Math.max(...a),
        PI: Math.PI, E: Math.E,
        evalExpr: (expr) => {
            // Avaliador seguro: apenas números e operadores
            const clean = String(expr).replace(/[^0-9+\-*/%.()\s]/g, '');
            if (!clean.trim()) throw new Error('ErroDeExecucao: expressão inválida');
            const val = Function('"use strict"; return (' + clean + ')')();
            if (typeof val !== 'number' || !isFinite(val)) throw new Error('ErroDeExecucao: resultado inválido');
            return val;
        }
    };
}
