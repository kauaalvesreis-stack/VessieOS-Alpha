'use strict';
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
