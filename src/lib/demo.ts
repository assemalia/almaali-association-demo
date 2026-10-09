/**
 * وضع النسخة التجريبية (Demo Mode)
 * ------------------------------------------------------------------
 * يُفعّل بضبط `VITE_DEMO_MODE=true` في ملف `.env`.
 *
 * عند التفعيل يقوم التطبيق بتسجيل الدخول تلقائيًا بحساب العرض،
 * فلا يرى الزائر صفحة تسجيل الدخول أو إنشاء الحساب إطلاقًا.
 *
 * للإنتاج: اضبط `VITE_DEMO_MODE=false` أو احذف المتغيّر، فيعود
 * نظام المصادقة الكامل (تسجيل الدخول/إنشاء حساب/الموافقة) كما هو
 * دون أي تعديل في الكود.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/**
 * نوع الخلفية (Backend) في الوضع التجريبي:
 *  - 'mock'     : بيانات وهمية في ذاكرة المتصفح — دون أي قاعدة بيانات أو Supabase.
 *  - 'supabase' : عميل Supabase الحقيقي (للإنتاج أو ديمو سحابي).
 * يُضبط عبر VITE_DEMO_BACKEND في .env.
 *
 * السلوك الافتراضي الآمن: يُفعَّل الوضع الوهمي صراحةً عبر 'mock'، أو تلقائيًا
 * عند غياب رابط Supabase (VITE_SUPABASE_URL) — حتى يعمل الموقع فور استنساخه
 * (clone ثم npm run dev) دون أي إعداد. وجود رابط حقيقي يعني استخدام Supabase
 * ما لم تُطلب 'mock' صراحةً.
 */
export const MOCK_BACKEND =
  import.meta.env.VITE_DEMO_BACKEND === 'mock' || !import.meta.env.VITE_SUPABASE_URL;

/** بريد حساب العرض المستخدم للدخول التلقائي في الوضع التجريبي. */
export const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL ?? 'admin@demo.local';

/** كلمة مرور حساب العرض المستخدمة للدخول التلقائي في الوضع التجريبي. */
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? 'Demo12345';
