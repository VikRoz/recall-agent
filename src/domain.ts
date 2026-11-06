export type Network = 'mainnet' | 'testnet';

export class Fault extends Error {
  code: string;
  constructor(code: string) { super(code); this.name = 'Fault'; this.code = code; }
}
export function assert(ok: unknown, code: string): asserts ok { if (!ok) throw new Fault(code); }

export function time(s: unknown): number {
  assert(typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s), 'INVALID_TIME');
  const n = Date.parse(s); assert(Number.isFinite(n), 'INVALID_TIME');
  assert(new Date(n).toISOString() === (s.length === 20 ? s.replace('Z', '.000Z') : s), 'INVALID_TIME'); return n;
}
export function object(v: unknown): Record<string, any> {
  assert(v !== null && typeof v === 'object' && !Array.isArray(v), 'INVALID_OBJECT');
  return v as Record<string, any>;
}
export function exactKeys(v: Record<string, any>, names: string[]) {
  assert(Object.keys(v).sort().join('|') === [...names].sort().join('|'), 'INVALID_KEYS');
}

export function canonical(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical((v as any)[k])).join(',') + '}';
  return JSON.stringify(v);
}
