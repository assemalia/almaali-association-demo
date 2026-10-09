-- ============================================================================
--  ترقية مستخدم الديمو إلى «مدير» (Admin)
-- ----------------------------------------------------------------------------
--  متى؟  بعد إنشاء المستخدم من قسم Authentication في Supabase
--         (Studio محليًا، أو Dashboard سحابيًا).
--  أين؟   SQL Editor في Supabase → الصق هذا الملف كاملًا ثم Run.
--  لماذا؟ عند التسجيل يُنشأ الحساب تلقائيًا بحالة "بانتظار الموافقة" ودور
--         "educator" فقط. هذا الملف (1) يوافق عليه و(2) يمنحه دور admin.
--  ملاحظة: إن استخدمت بريدًا آخر، غيّر 'admin@demo.local' في الأسطر الثلاثة.
-- ============================================================================

-- (1) الموافقة على الحساب حتى يتمكّن من استخدام البرنامج
update public.profiles
set is_approved = true
where user_id = (select id from auth.users where email = 'admin@demo.local');

-- (2) منح الحساب دور «مدير»
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where email = 'admin@demo.local'
on conflict (user_id, role) do nothing;

-- (3) تحقّق: يجب أن يظهر is_approved = true و {admin} ضمن الأدوار
select p.full_name,
       p.is_approved,
       array_agg(r.role) as roles
from public.profiles p
left join public.user_roles r on r.user_id = p.user_id
where p.user_id = (select id from auth.users where email = 'admin@demo.local')
group by p.full_name, p.is_approved;
