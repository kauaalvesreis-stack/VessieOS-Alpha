// VessieLang Standard Library - funcionalidades estendidas
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
  format: (s, ...args) => { let i = 0; return String(s).replace(/\{\}/g, () => args[i++]); },
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
