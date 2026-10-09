import { Info } from 'lucide-react';
import { DEMO_MODE } from '@/lib/demo';

/**
 * شريط تنبيه يظهر في أعلى المحتوى عندما يكون التطبيق في وضع النسخة التجريبية.
 * لا يظهر شيء في الإنتاج (عندما VITE_DEMO_MODE ليست "true").
 */
export default function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div
      dir="rtl"
      className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <Info className="h-4 w-4 shrink-0" />
      <span>
        أنت تستعرض <strong>نسخة تجريبية</strong> ببيانات وهمية — تم تسجيل دخولك تلقائيًا بحساب العرض.
      </span>
    </div>
  );
}
