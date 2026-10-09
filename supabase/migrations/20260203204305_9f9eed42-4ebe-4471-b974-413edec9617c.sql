-- تحديث سياسات RLS للاشتراكات لتدعم مسؤول الاشتراكات
DROP POLICY IF EXISTS "Group-scoped subscription viewing" ON public.subscriptions;

CREATE POLICY "Users can view subscriptions based on permissions"
ON public.subscriptions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin')
  OR
  -- مسؤول اشتراكات عام
  (has_role(auth.uid(), 'subscription_manager') AND is_global_role(auth.uid(), 'subscription_manager'))
  OR
  -- مسؤول اشتراكات لأفواج محددة
  (member_id IN (
    SELECT m.id
    FROM members m
    JOIN groups g ON m.group_id = g.id
    WHERE has_group_permission(auth.uid(), g.id, 'subscription_manager')
  ))
  OR
  -- المربي يمكنه رؤية اشتراكات فوجه
  (member_id IN (
    SELECT m.id
    FROM members m
    JOIN groups g ON m.group_id = g.id
    WHERE g.educator_id = auth.uid() AND is_approved(auth.uid())
  ))
);

-- إضافة سياسة لإدارة الاشتراكات (إضافة/تعديل/حذف)
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Subscription managers can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (
  has_role(auth.uid(), 'admin')
  OR
  -- مسؤول اشتراكات عام
  (has_role(auth.uid(), 'subscription_manager') AND is_global_role(auth.uid(), 'subscription_manager'))
  OR
  -- مسؤول اشتراكات لأفواج محددة
  (member_id IN (
    SELECT m.id
    FROM members m
    JOIN groups g ON m.group_id = g.id
    WHERE has_group_permission(auth.uid(), g.id, 'subscription_manager')
  ))
);