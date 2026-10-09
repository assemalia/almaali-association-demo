/**
 * مخزن البيانات الوهمي: يحمّل البذور ويحفظ التغييرات في localStorage
 * حتى تبقى بعد تحديث الصفحة. كل العمليات تتحمّل غياب localStorage بأمان.
 */
import { buildSeed } from './seedData';

type Row = Record<string, unknown>;
type Database = Record<string, Row[]>;

const STORAGE_KEY = 'almaali-demo-db-v1';

let db: Database | null = null;

function readFromStorage(): Database | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Database;
  } catch {
    /* localStorage غير متاح — نعمل في الذاكرة فقط */
  }
  return null;
}

function writeToStorage(data: Database): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* تجاهل أخطاء الحفظ (وضع التصفّح الخاص مثلاً) */
  }
}

function ensureLoaded(): Database {
  if (db) return db;
  const stored = readFromStorage();
  if (stored) {
    db = stored;
  } else {
    db = buildSeed();
    writeToStorage(db);
  }
  return db;
}

export const store = {
  /** يعيد مرجع مصفوفة الجدول (قابلة للتعديل المباشر). */
  table(name: string): Row[] {
    const data = ensureLoaded();
    if (!data[name]) data[name] = [];
    return data[name];
  },
  /** يستبدل محتوى جدول كاملًا (يُستعمل في الحذف). */
  setTable(name: string, rows: Row[]): void {
    const data = ensureLoaded();
    data[name] = rows;
    writeToStorage(data);
  },
  /** يحفظ الحالة الحالية إلى localStorage. */
  persist(): void {
    if (db) writeToStorage(db);
  },
  /** يعيد البيانات إلى حالتها الأصلية. */
  reset(): void {
    db = buildSeed();
    writeToStorage(db);
  },
};

/** إعادة ضبط بيانات الديمو (يستعملها زر إعادة الضبط في الواجهة). */
export function resetDemoData(): void {
  store.reset();
}
