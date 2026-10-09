// Supabase client entry point.
// في الوضع التجريبي (VITE_DEMO_BACKEND=mock) نُصدِّر عميلًا وهميًّا يعمل في
// ذاكرة المتصفح دون أي قاعدة بيانات؛ وإلا نُصدِّر عميل Supabase الحقيقي.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { MOCK_BACKEND } from '@/lib/demo';
import { createMockClient } from './mock';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase: SupabaseClient<Database> = MOCK_BACKEND
  ? (createMockClient() as unknown as SupabaseClient<Database>)
  : createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
