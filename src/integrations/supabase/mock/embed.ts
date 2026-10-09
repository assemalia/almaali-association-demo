/**
 * محلّل الوصلات المضمّنة (PostgREST embedding) للعميل الوهمي.
 * يدعم: table(cols) ، alias:fk(cols) ، table(count) ، !inner ، والتداخل.
 */
import { store } from './store';
import { FOREIGN_KEYS, findForeignKeyTo, findReverseForeignKey } from './schema';

type Row = Record<string, unknown>;

interface EmbedSpec {
  key: string;
  targetTable: string;
  direction: 'to-one' | 'to-many';
  viaCol: string | null;
  inner: boolean;
  count: boolean;
  sub: string;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** يقسّم نص select على الفواصل من المستوى الأعلى فقط (يحترم الأقواس). */
function splitTopLevel(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of str) {
    if (ch === '(') { depth++; cur += ch; }
    else if (ch === ')') { depth--; cur += ch; }
    else if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** يستخرج مواصفات الوصلات المضمّنة فقط (يتجاهل الأعمدة العادية). */
function parseEmbeds(base: string, selectStr: string): EmbedSpec[] {
  const tokens = splitTopLevel(selectStr);
  const embeds: EmbedSpec[] = [];

  for (const token of tokens) {
    const paren = token.indexOf('(');
    if (paren === -1) continue; // عمود عادي

    let prefix = token.slice(0, paren).trim();
    const sub = token.slice(paren + 1, token.lastIndexOf(')')).trim();

    let inner = false;
    if (prefix.includes('!inner')) { inner = true; prefix = prefix.replace('!inner', ''); }
    prefix = prefix.replace('!left', '').trim();

    let alias = prefix;
    let hint: string | null = null;
    if (prefix.includes(':')) {
      const [a, h] = prefix.split(':');
      alias = a.trim();
      hint = h.trim();
    }

    let targetTable: string;
    let direction: 'to-one' | 'to-many';
    let viaCol: string | null;

    if (hint) {
      viaCol = hint;
      targetTable = FOREIGN_KEYS[base]?.[hint] ?? alias;
      direction = 'to-one';
    } else {
      targetTable = alias;
      const toOne = findForeignKeyTo(base, targetTable);
      if (toOne) {
        direction = 'to-one';
        viaCol = toOne;
      } else {
        const toMany = findReverseForeignKey(base, targetTable);
        direction = toMany ? 'to-many' : 'to-one';
        viaCol = toMany;
      }
    }

    embeds.push({ key: alias, targetTable, direction, viaCol, inner, count: sub === 'count', sub });
  }

  return embeds;
}

/** يطبّق الوصلات على مجموعة صفوف، ويُرجع نسخًا جديدة (مع إسقاط صفوف !inner الفارغة). */
export function resolveEmbeds(base: string, rows: Row[], selectStr: string): Row[] {
  const embeds = parseEmbeds(base, selectStr);
  if (embeds.length === 0) return rows.map((r) => clone(r));

  const result: Row[] = [];

  for (const row of rows) {
    const out = clone(row);
    let drop = false;

    for (const e of embeds) {
      if (e.direction === 'to-one') {
        const fkVal = e.viaCol ? row[e.viaCol] : null;
        const target = store.table(e.targetTable);
        const found = fkVal != null ? target.find((r) => r.id === fkVal) ?? null : null;

        if (e.count) {
          out[e.key] = [{ count: found ? 1 : 0 }];
        } else {
          out[e.key] = found ? resolveOne(e.targetTable, found, e.sub) : null;
        }
        if (e.inner && !found) drop = true;
      } else {
        const related = e.viaCol
          ? store.table(e.targetTable).filter((r) => r[e.viaCol as string] === row.id)
          : [];
        if (e.count) {
          out[e.key] = [{ count: related.length }];
        } else {
          out[e.key] = resolveEmbeds(e.targetTable, related, e.sub);
        }
        if (e.inner && related.length === 0) drop = true;
      }
    }

    if (!drop) result.push(out);
  }

  return result;
}

function resolveOne(table: string, row: Row, sub: string): Row {
  const [res] = resolveEmbeds(table, [row], sub);
  return res ?? clone(row);
}
