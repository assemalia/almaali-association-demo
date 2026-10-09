import { Info, RotateCcw } from 'lucide-react';
import { DEMO_MODE, MOCK_BACKEND } from '@/lib/demo';
import { resetDemoData } from '@/integrations/supabase/mock';

/**
 * شريط تنبيه يظهر في أعلى المحتوى عندما يكون التطبيق في وضع النسخة التجريبية.
 * في وضع mock يُظهر أيضًا زر إعادة ضبط البيانات.
 * لا يظهر شيء في الإنتاج (عندما VITE_DEMO_MODE ليست "true").
 */
export default function DemoBanner() {
  if (!DEMO_MODE && !MOCK_BACKEND) return null;

  const handleReset = () => {
    resetDemoData();
    window.location.reload();
  };

  return (
    <div
      dir="rtl"
      className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <Info className="h-4 w-4 shrink-0" />
      <span className="flex-1 min-w-0">
        أنت تستعرض <strong>نسخة تجريبية</strong> ببيانات وهمية
        {MOCK_BACKEND ? ' — تُحفظ تعديلاتك في هذا المتصفّح فقط.' : '.'}
      </span>
      {MOCK_BACKEND && (
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 rounded-md border border-amber-400/60 px-2 py-1 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          إعادة ضبط البيانات
        </button>
      )}
    </div>
  );
}
