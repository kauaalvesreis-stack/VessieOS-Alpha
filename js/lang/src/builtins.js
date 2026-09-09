// VessieLang Builtins - funcoes nativas
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
