/**
 * مصادقة وهمية: تبدأ الجلسة مسجَّلة الدخول بحساب العرض (admin)،
 * فلا حاجة لأي خادم. تدعم الدوال المستعملة في التطبيق فقط.
 */
import { DEMO_USER_ID } from './seedData';

type AuthEvent = 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED';
type Session = Record<string, unknown> | null;
type Listener = (event: AuthEvent, session: Session) => void;

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL ?? 'admin@demo.local';

function makeSession(): Record<string, unknown> {
  const user = {
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: { provider: 'demo' },
    user_metadata: { full_name: 'مدير العرض' },
    created_at: new Date().toISOString(),
  };
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  };
}

// تبدأ مسجّلة الدخول افتراضيًا (تجربة فورية بلا صفحة دخول)
let currentSession: Session = makeSession();
const listeners = new Set<Listener>();

function notify(event: AuthEvent): void {
  for (const cb of listeners) {
    try { cb(event, currentSession); } catch { /* ignore */ }
  }
}

export const mockAuth = {
  async getSession() {
    return { data: { session: currentSession }, error: null };
  },

  async getUser() {
    return { data: { user: currentSession ? currentSession.user : null }, error: null };
  },

  onAuthStateChange(callback: Listener) {
    listeners.add(callback);
    // مثل supabase: نُطلق الحدث الأولي بشكل غير متزامن
    Promise.resolve().then(() => callback('INITIAL_SESSION', currentSession));
    return {
      data: {
        subscription: {
          id: 'demo-sub',
          callback,
          unsubscribe() { listeners.delete(callback); },
        },
      },
    };
  },

  async signInWithPassword(_credentials: { email: string; password: string }) {
    currentSession = makeSession();
    notify('SIGNED_IN');
    return { data: { session: currentSession, user: currentSession.user }, error: null };
  },

  async signUp(_credentials: { email: string; password: string }) {
    // في الوضع التجريبي لا إنشاء حسابات حقيقية — نُرجع نجاحًا رمزيًا
    const session = makeSession();
    return { data: { user: session.user, session: null }, error: null };
  },

  async signOut() {
    currentSession = null;
    notify('SIGNED_OUT');
    return { error: null };
  },

  async updateUser(_attributes: Record<string, unknown>) {
    return { data: { user: currentSession ? currentSession.user : null }, error: null };
  },

  async resetPasswordForEmail(_email: string, _options?: Record<string, unknown>) {
    return { data: {}, error: null };
  },
};
