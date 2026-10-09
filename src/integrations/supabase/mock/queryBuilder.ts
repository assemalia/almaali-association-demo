/**
 * منشئ استعلامات وهمي يحاكي واجهة supabase-js المستعملة في التطبيق:
 * from().select()/insert()/update()/delete() + eq/in/gte/lte/order/limit
 * + single/maybeSingle + count/head، وهو awaitable (thenable).
 */
import { store } from './store';
import { resolveEmbeds } from './embed';

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

interface MockResult {
  data: unknown;
  error: { message: string } | null;
  count: number | null;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

function toComparable(v: unknown): number | string {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (v == null) return '';
  const s = String(v);
  const t = Date.parse(s);
  if (!Number.isNaN(t) && /[-:T]/.test(s)) return t;
  const n = Number(s);
  if (s.trim() !== '' && !Number.isNaN(n)) return n;
  return s;
}

function compare(a: unknown, b: unknown): number {
  const ca = toComparable(a);
  const cb = toComparable(b);
  if (typeof ca === 'number' && typeof cb === 'number') return ca - cb;
  const sa = String(ca);
  const sb = String(cb);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class MockQuery implements PromiseLike<MockResult> {
  private table: string;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private limitN: number | null = null;
  private selectStr = '*';
  private selectCalled = false;
  private countMode = false;
  private headMode = false;
  private singleMode: false | 'single' | 'maybe' = false;
  private payload: Row | Row[] | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(str = '*', opts?: { count?: string; head?: boolean }): this {
    this.selectCalled = true;
    this.selectStr = str;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.headMode = true;
    return this;
  }

  insert(payload: Row | Row[]): this { this.op = 'insert'; this.payload = payload; return this; }
  update(payload: Row): this { this.op = 'update'; this.payload = payload; return this; }
  delete(): this { this.op = 'delete'; return this; }

  eq(col: string, val: unknown): this { this.filters.push((r) => r[col] === val); return this; }
  neq(col: string, val: unknown): this { this.filters.push((r) => r[col] !== val); return this; }
  in(col: string, vals: unknown[]): this { this.filters.push((r) => vals.includes(r[col])); return this; }
  gte(col: string, val: unknown): this { this.filters.push((r) => compare(r[col], val) >= 0); return this; }
  lte(col: string, val: unknown): this { this.filters.push((r) => compare(r[col], val) <= 0); return this; }
  gt(col: string, val: unknown): this { this.filters.push((r) => compare(r[col], val) > 0); return this; }
  lt(col: string, val: unknown): this { this.filters.push((r) => compare(r[col], val) < 0); return this; }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number): this { this.limitN = n; return this; }
  single(): this { this.singleMode = 'single'; return this; }
  maybeSingle(): this { this.singleMode = 'maybe'; return this; }

  private matched(): Row[] {
    const rows = store.table(this.table);
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  private finalizeSelect(rows: Row[]): MockResult {
    const count = rows.length;

    let ordered = rows;
    for (const o of [...this.orders].reverse()) {
      ordered = [...ordered].sort((a, b) => (o.asc ? 1 : -1) * compare(a[o.col], b[o.col]));
    }
    if (this.limitN != null) ordered = ordered.slice(0, this.limitN);

    if (this.headMode) {
      return { data: null, error: null, count };
    }

    let data: unknown = resolveEmbeds(this.table, ordered, this.selectStr);

    if (this.singleMode === 'single') {
      if ((data as Row[]).length === 0) {
        return { data: null, error: { message: 'No rows found' }, count };
      }
      data = (data as Row[])[0];
    } else if (this.singleMode === 'maybe') {
      data = (data as Row[])[0] ?? null;
    }

    return { data, error: null, count: this.countMode ? count : null };
  }

  private run(): MockResult {
    if (this.op === 'select') {
      return this.finalizeSelect(this.matched());
    }

    if (this.op === 'insert') {
      const rowsIn = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const now = new Date().toISOString();
      const inserted = rowsIn.map((r) => ({ id: uuid(), created_at: now, ...r }));
      const tbl = store.table(this.table);
      tbl.push(...inserted);
      store.persist();
      return this.outputRows(inserted);
    }

    if (this.op === 'update') {
      const toUpdate = this.matched();
      for (const row of toUpdate) Object.assign(row, this.payload);
      store.persist();
      return this.outputRows(toUpdate);
    }

    // delete
    const toDelete = this.matched();
    const deleteSet = new Set(toDelete);
    store.setTable(this.table, store.table(this.table).filter((r) => !deleteSet.has(r)));
    return this.outputRows(toDelete);
  }

  /** يُرجع صفوف الكتابة فقط إذا استُدعيت select() بعد العملية (كما في supabase). */
  private outputRows(rows: Row[]): MockResult {
    if (!this.selectCalled) return { data: null, error: null, count: null };
    const data = resolveEmbeds(this.table, rows, this.selectStr);
    if (this.singleMode === 'single') return { data: data[0] ?? null, error: null, count: null };
    if (this.singleMode === 'maybe') return { data: data[0] ?? null, error: null, count: null };
    return { data, error: null, count: null };
  }

  then<TResult1 = MockResult, TResult2 = never>(
    onfulfilled?: ((value: MockResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    let result: MockResult;
    try {
      result = this.run();
    } catch (e) {
      result = { data: null, error: { message: String(e) }, count: null };
    }
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

export { clone };
