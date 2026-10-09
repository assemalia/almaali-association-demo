/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  /** وضع النسخة التجريبية: "true" يفعّل الدخول التلقائي بحساب العرض. */
  readonly VITE_DEMO_MODE?: string;
  /** بريد حساب العرض (افتراضيًا admin@demo.local). */
  readonly VITE_DEMO_EMAIL?: string;
  /** كلمة مرور حساب العرض (افتراضيًا Demo12345). */
  readonly VITE_DEMO_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
