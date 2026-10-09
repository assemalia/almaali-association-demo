<div align="center">

# 🕌 منظومة العمل الجمعوي

### نظام إدارة متكامل للجمعيات والمنظمات التطوعية

إدارة الأعضاء، الأفواج، اللقاءات، الحضور، الدروس، والاشتراكات — في مكان واحد.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)

> **هذه نسخة تجريبية (Demo) عامة** مزوّدة ببيانات افتراضية جاهزة لتجربة البرنامج فورًا.
> لتحويلها إلى قاعدة بيانات حقيقية راجع دليل [`DEMO_SETUP.md`](./DEMO_SETUP.md).

</div>

---

## 🚀 تجربة سريعة (نسخة تجريبية محلية)

النسخة التجريبية تعمل على قاعدة بيانات **Supabase محلية** مملوءة ببيانات افتراضية (أفواج، أعضاء، لقاءات، اشتراكات...).

```bash
# 1) المتطلبات: Node.js 18+ و Docker Desktop و Supabase CLI
npm install -g supabase

# 2) تثبيت الحزم
npm install

# 3) تشغيل قاعدة البيانات المحلية + تطبيق المخطط والبيانات التجريبية
supabase start
supabase db reset        # يطبّق migrations ثم supabase/seed.sql

# 4) إعداد متغيّرات البيئة
cp .env.example .env
#   ثم ضع في .env قيمتَي  API URL  و  anon key  الظاهرتين بعد "supabase start"

# 5) تشغيل التطبيق
npm run dev              # http://localhost:8080
```

### 🔑 بيانات الدخول التجريبية

أنشئ مستخدم الديمو وامنحه دور المدير (خطوة لمرة واحدة — التفاصيل في [`DEMO_SETUP.md` §4.3](./DEMO_SETUP.md)):

| الحقل | القيمة |
|-------|--------|
| البريد | `admin@demo.local` |
| كلمة المرور | `Demo12345` |

> 📘 **الدليل الكامل** خطوة بخطوة (التجهيز، البذور، إنشاء المستخدم، التحويل إلى الإنتاج، والنشر) في ملف [`DEMO_SETUP.md`](./DEMO_SETUP.md).

---

## ✨ المميزات

- **إدارة الأعضاء** — تسجيل وتتبّع بيانات الأعضاء وأولياء أمورهم وحالتهم.
- **إدارة الأفواج** — تنظيم الأعضاء في مجموعات مع تعيين مربّين ورسوم شهرية/لقاء.
- **اللقاءات والحضور** — تسجيل اللقاءات وضبط الحضور (حاضر / غائب / بعذر).
- **الدروس والمواضيع والمهارات** — ربط الدروس باللقاءات ومتابعة المحتوى التعليمي.
- **الاشتراكات والمدفوعات** — متابعة الاشتراكات الشهرية ومدفوعات اللقاءات والديون.
- **نظام صلاحيات دقيق** — أدوار متعددة (`admin` / `educator` / `subscription_manager`) وصلاحيات على مستوى الفوج.
- **الإشعارات الآنية** — تنبيهات فورية عبر Supabase Realtime (غياب متكرر، اشتراك متأخّر).
- **تصدير PDF** — تقارير الحضور والأعضاء.
- **الوضع الليلي ودعم RTL** — واجهة عربية قابلة للتخصيص.

---

## 🧱 المكدّس التقني

| الجانب | التقنية |
|--------|---------|
| الواجهة | React 18 + TypeScript + Vite |
| الـ UI | shadcn/ui + Tailwind CSS + Radix UI |
| الخادم | Supabase (PostgreSQL + Auth + Realtime) |
| الحماية | Row Level Security (RLS) على كل الجداول |
| النماذج | React Hook Form + Zod |
| إدارة الحالة | TanStack Query (React Query) |
| الرسوم البيانية | Recharts |
| تصدير PDF | jsPDF + html2canvas |
| الاختبارات | Vitest + Testing Library |

---

## 🗄️ هيكل قاعدة البيانات

```
profiles                ← بيانات المستخدمين الشخصية + حالة الموافقة
user_roles              ← الأدوار (admin / educator / subscription_manager)
user_group_permissions  ← صلاحيات على مستوى فوج معيّن
projects                ← المشاريع
topics / skills         ← المواضيع التعليمية والمهارات
groups                  ← الأفواج (monthly_fee / meeting_fee / educator_id)
members                 ← الأعضاء/الطلاب + بيانات الولي
member_topics / member_skills ← روابط متعدد-لمتعدد
meetings                ← اللقاءات
lessons                 ← الدروس المرتبطة باللقاءات
attendance              ← الحضور (present / absent / excused)
subscriptions           ← الاشتراكات الشهرية
meeting_payments        ← مدفوعات اللقاءات
notifications           ← الإشعارات الآنية (Realtime)
```

كل ملفات المخطط في [`supabase/migrations/`](./supabase/migrations)، والبيانات التجريبية في [`supabase/seed.sql`](./supabase/seed.sql).

---

## 🧑‍💻 الأوامر المتاحة

```bash
npm run dev        # تشغيل بيئة التطوير على المنفذ 8080
npm run build      # بناء للإنتاج (مجلد dist/)
npm run preview    # معاينة البناء
npm run test       # تشغيل الاختبارات
npm run lint       # فحص الكود
```

---

## 🔐 ملاحظات أمنية

- المفتاح `anon` / publishable **آمن** للكشف في الواجهة؛ الحماية الحقيقية من **RLS** على مستوى قاعدة البيانات.
- **لا تكشف أبدًا** مفتاح `service_role`، ولا ترفع ملف `.env` إلى git (مُستبعَد في `.gitignore`).
- البيانات في `supabase/seed.sql` **تجريبية فقط** — لا تُشغّلها على قاعدة الإنتاج.
- للتفاصيل الكاملة انظر [`DEMO_SETUP.md` §7](./DEMO_SETUP.md).

---

## 📦 التحويل إلى الإنتاج والنشر

التبديل بين الديمو والقاعدة الحقيقية = مجرد تغيير قيم `.env` (دون أي تعديل في الكود).
الخطوات الكاملة (إنشاء مشروع Supabase سحابي، `supabase db push`، إنشاء أول مدير، ثم النشر على Vercel / Netlify / Cloudflare Pages) موثّقة في [`DEMO_SETUP.md` §6](./DEMO_SETUP.md).

---

## 📄 الاستخدام والترخيص

هذه نسخة **تجريبية عامة** متاحة لأغراض **العرض والتعلّم**. البيانات الظاهرة فيها وهمية بالكامل.
يمكنك إضافة ملف ترخيص رسمي (مثل MIT) إن رغبت في فتحه للمساهمات.
