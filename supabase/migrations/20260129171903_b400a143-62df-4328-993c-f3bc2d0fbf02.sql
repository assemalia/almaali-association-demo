-- 1. إنشاء نوع الصلاحيات
CREATE TYPE public.app_role AS ENUM ('admin', 'educator');

-- 2. إنشاء نوع حالة العضو
CREATE TYPE public.member_status AS ENUM ('active', 'inactive');

-- 3. إنشاء نوع حالة الحضور
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'excused');

-- 4. جدول الملفات الشخصية للمستخدمين
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. جدول صلاحيات المستخدمين (منفصل للأمان)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL DEFAULT 'educator',
    UNIQUE (user_id, role)
);

-- 6. جدول المشاريع
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 7. جدول المواضيع
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 8. جدول الأفواج
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    educator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    monthly_fee DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 9. جدول الأعضاء (الطلاب)
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    status public.member_status DEFAULT 'active' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 10. جدول ربط الأعضاء بالمواضيع (علاقة متعدد لمتعدد)
CREATE TABLE public.member_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
    UNIQUE (member_id, topic_id)
);

-- 11. جدول اللقاءات
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    meeting_date DATE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 12. جدول الدروس
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    key_points TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 13. جدول الحضور
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    status public.attendance_status NOT NULL DEFAULT 'absent',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (meeting_id, member_id)
);

-- 14. جدول الاشتراكات والمدفوعات
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (member_id, month, year)
);

-- تفعيل RLS على جميع الجداول
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- دالة للتحقق من الصلاحية (security definer لتجنب التكرار اللانهائي)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- دالة للتحقق من الموافقة على المستخدم
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.profiles WHERE user_id = _user_id),
    FALSE
  )
$$;

-- سياسات profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- سياسات user_roles
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- سياسات المشاريع والمواضيع (قراءة للمعتمدين، إدارة للمدير)
CREATE POLICY "Approved users can view projects" ON public.projects
    FOR SELECT USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage projects" ON public.projects
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved users can view topics" ON public.topics
    FOR SELECT USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage topics" ON public.topics
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- سياسات الأفواج
CREATE POLICY "Approved users can view groups" ON public.groups
    FOR SELECT USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage groups" ON public.groups
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Educators can manage their groups" ON public.groups
    FOR UPDATE USING (auth.uid() = educator_id AND public.is_approved(auth.uid()));

-- سياسات الأعضاء
CREATE POLICY "Approved users can view members" ON public.members
    FOR SELECT USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can manage members" ON public.members
    FOR ALL USING (public.is_approved(auth.uid()));

-- سياسات member_topics
CREATE POLICY "Approved users can view member_topics" ON public.member_topics
    FOR SELECT USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can manage member_topics" ON public.member_topics
    FOR ALL USING (public.is_approved(auth.uid()));

-- سياسات اللقاءات
CREATE POLICY "Approved users can view meetings" ON public.meetings
    FOR SELECT USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can manage meetings" ON public.meetings
    FOR ALL USING (public.is_approved(auth.uid()));

-- سياسات الدروس
CREATE POLICY "Approved users can view lessons" ON public.lessons
    FOR SELECT USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can manage lessons" ON public.lessons
    FOR ALL USING (public.is_approved(auth.uid()));

-- سياسات الحضور
CREATE POLICY "Approved users can view attendance" ON public.attendance
    FOR SELECT USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can manage attendance" ON public.attendance
    FOR ALL USING (public.is_approved(auth.uid()));

-- سياسات الاشتراكات
CREATE POLICY "Approved users can view subscriptions" ON public.subscriptions
    FOR SELECT USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- دالة لتحديث updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers لتحديث updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- دالة لإنشاء ملف شخصي تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'educator');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger لإنشاء ملف شخصي عند التسجيل
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();