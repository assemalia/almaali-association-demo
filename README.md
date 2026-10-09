<div align="center">

<img src="./public/logo.jpg" alt="شعار جمعية المعالي" width="110" />

# 🕌 منظومة العمل الجمعوي

### نظام إدارة متكامل للجمعيات والمنظمات التطوعية

إدارة الأعضاء، الأفواج، اللقاءات، الحضور، الدروس، والاشتراكات — في مكان واحد.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **نسخة تجريبية (Demo) عامة** ببيانات افتراضية جاهزة لتجربة البرنامج فورًا — دون أي إعداد.

</div>

---

## 🚀 تجربة سريعة — بلا قاعدة بيانات (صفر إعداد)

النسخة التجريبية تعمل افتراضيًا بـ **خلفية وهمية (Mock)** في ذاكرة المتصفح — **دون Supabase ولا Docker ولا أي خادم**، ودون إنشاء مستخدم أو تسجيل دخول:

```bash
npm install
cp .env.example .env     # الافتراضي فيه VITE_DEMO_BACKEND=mock
npm run dev              # http://localhost:8080 — دخول تلقائي كمدير، وبيانات جاهزة
```

- كل الصفحات تعرض بيانات واقعية، والإضافة/التعديل/الحذف تعمل وتُحفظ في متصفّحك (مع زر **«إعادة ضبط البيانات»**).
- جاهزة للنشر كـ **صفحة ثابتة** على Vercel / Netlify / GitHub Pages (انشر مجلد `dist/` بعد `npm run build`).

> **الدخول التلقائي:** يُسجَّل دخولك تلقائيًا كـ «مدير» عند فتح الموقع (يتحكّم به `VITE_DEMO_MODE`).

---

## 📚 الأدلة

| الدليل | المحتوى |
|--------|---------|
| 📖 [دليل الاستعمال](./docs/USER_GUIDE.md) | **كيف تستعمل الموقع** وتستفيد من كل ميزة، وسير عمل من البداية — خطوة بخطوة. |
| ⚙️ [دليل التجهيز والنشر](./DEMO_SETUP.md) | ربط Supabase حقيقي (سحابي بدون Docker أو محلي)، إنشاء أول مدير، والنشر للإنتاج. |

> **للاستعمال الفعلي ببيانات دائمة:** بدّل الخلفية إلى Supabase بتغيير `.env` فقط
> (`VITE_DEMO_BACKEND=supabase` و`VITE_DEMO_MODE=false` + رابط المشروع والمفتاح) — **دون أي تعديل في الكود**.
> الخطوات الكاملة في [`DEMO_SETUP.md`](./DEMO_SETUP.md).

---

## ✨ المميزات

- **إدارة الأعضاء** — تسجيل وتتبّع بيانات الأعضاء وأولياء أمورهم وحالتهم.
- **إدارة الأفواج** — تنظيم الأعضاء في مجموعات مع تعيين مربّين ورسوم شهرية/لقاء.
- **اللقاءات والحضور** — تسجيل اللقاءات وضبط الحضور (حاضر / غائب / بعذر).
- **الدروس والمواضيع والمهارات** — ربط الدروس باللقاءات ومتابعة المحتوى التعليمي.
- **الاشتراكات والمدفوعات** — متابعة الاشتراكات الشهرية ومدفوعات اللقاءات والديون.
- **نظام صلاحيات دقيق** — أدوار متعددة (`admin` / `educator` / `subscription_manager`) وصلاحيات على مستوى الفوج.
- **الإشعارات الآنية** — تنبيهات فورية (غياب متكرر، اشتراك متأخّر).
- **تصدير PDF** — تقارير الحضور والأعضاء.
- **الوضع الليلي ودعم RTL** — واجهة عربية قابلة للتخصيص.

---

## 🖼️ لقطات الشاشة

> أضف لقطاتك في مجلد `docs/screenshots/` بأسماء مثل `dashboard.png` ثم فعّل الصور أدناه (أزل تعليق HTML).

<!--
![لوحة التحكم](./docs/screenshots/dashboard.png)
![الأعضاء](./docs/screenshots/members.png)
![الحضور](./docs/screenshots/attendance.png)
![الاشتراكات](./docs/screenshots/subscriptions.png)
-->
_(ستُضاف قريبًا)_

---

## 🧱 المكدّس التقني

| الجانب | التقنية |
|--------|---------|
| الواجهة | React 18 + TypeScript + Vite |
| الـ UI | shadcn/ui + Tailwind CSS + Radix UI |
| الخادم | Supabase (PostgreSQL + Auth + Realtime) |
| الوضع التجريبي | خلفية وهمية (Mock) في المتصفح — بلا خادم |
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
notifications           ← الإشعارات الآنية
```

المخطط في [`supabase/migrations/`](./supabase/migrations)، والبيانات التجريبية في [`supabase/seed.sql`](./supabase/seed.sql)، وبيانات الوضع الوهمي في [`src/integrations/supabase/mock/`](./src/integrations/supabase/mock).

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

- في الوضع الوهمي (Mock) لا يوجد أي اتصال بقاعدة بيانات — البيانات في المتصفح فقط.
- عند استعمال Supabase: المفتاح `anon` **آمن** للواجهة (الحماية من **RLS**)، بينما **لا تكشف أبدًا** مفتاح `service_role`، ولا ترفع `.env` إلى git.
- البيانات في `supabase/seed.sql` **تجريبية فقط** — لا تُشغّلها على قاعدة الإنتاج. التفاصيل في [`DEMO_SETUP.md`](./DEMO_SETUP.md).

---

## 📄 الاستخدام والترخيص

نسخة **تجريبية عامة** لأغراض **العرض والتعلّم**، وبياناتها وهمية بالكامل.
المشروع مرخّص تحت رخصة **MIT** — انظر ملف [`LICENSE`](./LICENSE).
