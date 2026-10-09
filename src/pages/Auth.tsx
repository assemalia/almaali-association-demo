import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_MODE, DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/demo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, Users, Star, Eye, EyeOff, PlayCircle } from 'lucide-react';

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    setIsLoading(true);
    const { error } = await signIn(DEMO_EMAIL, DEMO_PASSWORD);
    if (error) {
      toast({
        title: 'تعذّر الدخول إلى النسخة التجريبية',
        description: 'لم يُنشأ حساب الديمو بعد. راجع DEMO_SETUP.md §4.3 لإنشائه وترقيته إلى مدير.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
    // عند النجاح: onAuthStateChange يضبط الجلسة ثم يُعاد التوجيه تلقائيًا للوحة التحكم
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
        } else {
          toast({ title: 'تم الإرسال', description: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني' });
          setMode('login');
        }
      } else if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'خطأ في تسجيل الدخول',
            description: error.message === 'Invalid login credentials' 
              ? 'بيانات الدخول غير صحيحة' 
              : error.message,
            variant: 'destructive',
          });
        } else {
          navigate('/');
        }
      } else {
        if (!fullName.trim()) {
          toast({ title: 'خطأ', description: 'الرجاء إدخال الاسم الكامل', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({ title: 'خطأ', description: 'هذا البريد الإلكتروني مسجل مسبقاً', variant: 'destructive' });
          } else {
            toast({ title: 'خطأ في إنشاء الحساب', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: 'تم إنشاء الحساب بنجاح', description: 'حسابك الآن بانتظار موافقة المدير' });
          navigate('/');
        }
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ غير متوقع', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'forgot') return 'نسيت كلمة المرور';
    if (mode === 'login') return 'تسجيل الدخول';
    return 'إنشاء حساب جديد';
  };

  const getDescription = () => {
    if (mode === 'forgot') return 'أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين';
    if (mode === 'login') return 'أدخل بياناتك للوصول إلى لوحة التحكم';
    return 'أنشئ حسابك للانضمام إلى فريق العمل';
  };

  // ── وضع النسخة التجريبية: لا صفحة دخول/إنشاء حساب ──
  // الدخول التلقائي يتم من AuthContext عند فتح التطبيق؛ هذه الشاشة
  // تظهر فقط كاحتياط (بعد تسجيل الخروج مثلاً) للدخول بنقرة واحدة.
  if (DEMO_MODE) {
    if (user) {
      return <Navigate to="/" replace />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center p-4 green-gradient" dir="rtl">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader className="text-center space-y-3 pb-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">النسخة التجريبية</CardTitle>
              <CardDescription className="mt-2 text-sm">
                جرّب منظومة العمل الجمعوي فورًا — دون تسجيل دخول. البيانات الظاهرة وهمية بالكامل.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 space-y-4">
            <Button
              onClick={handleDemoLogin}
              className="w-full h-12 text-base font-medium"
              disabled={isLoading || authLoading}
            >
              {isLoading || authLoading ? (
                <><Loader2 className="ml-2 h-5 w-5 animate-spin" />جارٍ الدخول إلى النسخة التجريبية...</>
              ) : (
                <><PlayCircle className="ml-2 h-5 w-5" />ابدأ التجربة الآن</>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              تدخل كـ «مدير» للاطّلاع على كامل الميزات.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* الجزء الأيمن - الترحيب (يظهر أولاً في الهاتف كـ header) */}
      <div className="lg:hidden green-gradient p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-primary-foreground">جمعية المعالي التربوية</h1>
        </div>
        <p className="text-sm text-primary-foreground/80">
          نظام إداري متكامل لإدارة الأفواج التربوية
        </p>
      </div>

      {/* الجزء الأيسر - النموذج */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader className="text-center space-y-3 pb-4">
            <div className="mx-auto h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl">{getTitle()}</CardTitle>
              <CardDescription className="mt-2 text-sm">{getDescription()}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">الاسم الكامل</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="محمد أحمد"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="h-11 text-base"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 text-base"
                  dir="ltr"
                />
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">كلمة المرور</Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-11 text-base pl-10"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base font-medium mt-2" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="ml-2 h-4 w-4 animate-spin" />جارٍ المعالجة...</>
                ) : mode === 'forgot' ? 'إرسال رابط إعادة التعيين' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              {mode === 'forgot' ? (
                <button type="button" onClick={() => setMode('login')} className="text-sm text-primary hover:underline font-medium">
                  العودة لتسجيل الدخول
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {mode === 'login' 
                    ? 'ليس لديك حساب؟ أنشئ حساباً جديداً' 
                    : 'لديك حساب بالفعل؟ سجّل الدخول'}
                </button>
              )}
            </div>

            {mode === 'register' && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs text-center text-muted-foreground">
                  ملاحظة: سيتم مراجعة حسابك من قبل المدير قبل تفعيله
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* الجزء الأيمن - الترحيب (للشاشات الكبيرة) */}
      <div className="hidden lg:flex flex-1 green-gradient items-center justify-center p-8">
        <div className="max-w-md text-center text-primary-foreground">
          <h1 className="text-4xl font-bold mb-6">جمعية المعالي التربوية</h1>
          <p className="text-xl mb-8 opacity-90">
            نظام إداري متكامل لإدارة الأفواج التربوية والحضور والاشتراكات
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold">إدارة الأفواج</h3>
                <p className="text-sm opacity-80">تنظيم الطلاب في مجموعات تربوية</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold">تتبع الحضور</h3>
                <p className="text-sm opacity-80">تسجيل الحضور والغياب لكل لقاء</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-primary-foreground/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                <Star className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div className="text-right">
                <h3 className="font-semibold">المتابعة المالية</h3>
                <p className="text-sm opacity-80">إدارة الاشتراكات والمدفوعات</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
