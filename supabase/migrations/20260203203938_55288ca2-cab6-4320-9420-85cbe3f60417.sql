-- 1. إنشاء جدول ربط المستخدمين بالأفواج (للصلاحيات المخصصة)
CREATE TABLE public.user_group_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL CHECK (permission_type IN ('educator', 'subscription_manager')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, group_id, permission_type)
);

-- 2. إضافة عمود is_global للأدوار (مربي عام / مسؤول اشتراكات عام)
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 3. تفعيل RLS على الجدول الجديد
ALTER TABLE public.user_group_permissions ENABLE ROW LEVEL SECURITY;

-- 4. سياسات RLS لجدول صلاحيات الأفواج
CREATE POLICY "Admins can manage user_group_permissions"
ON public.user_group_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own group permissions"
ON public.user_group_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- 5. دالة للتحقق من صلاحية المستخدم على فوج معين
CREATE OR REPLACE FUNCTION public.has_group_permission(_user_id uuid, _group_id uuid, _permission_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_group_permissions
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND permission_type = _permission_type
  )
$$;

-- 6. دالة للتحقق من كون المستخدم لديه صلاحية عامة
CREATE OR REPLACE FUNCTION public.is_global_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_global FROM public.user_roles WHERE user_id = _user_id AND role::text = _role),
    FALSE
  )
$$;

-- 7. دالة شاملة للتحقق من صلاحية المستخدم (عام أو مخصص)
CREATE OR REPLACE FUNCTION public.can_access_group(_user_id uuid, _group_id uuid, _permission_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- المدير لديه وصول كامل
    has_role(_user_id, 'admin')
    OR
    -- صلاحية عامة (مربي عام)
    (CASE 
      WHEN _permission_type = 'educator' THEN 
        (has_role(_user_id, 'educator') AND is_global_role(_user_id, 'educator'))
      ELSE FALSE
    END)
    OR
    -- صلاحية مخصصة على الفوج
    has_group_permission(_user_id, _group_id, _permission_type)
    OR
    -- المربي المسند للفوج (educator_id في جدول groups)
    (SELECT educator_id = _user_id FROM public.groups WHERE id = _group_id)
$$;