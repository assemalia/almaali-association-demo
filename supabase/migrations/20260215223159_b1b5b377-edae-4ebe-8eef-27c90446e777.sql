
-- Allow subscription managers to view members they have access to
CREATE POLICY "Subscription managers can view members"
ON public.members
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    is_approved(auth.uid())
    AND has_role(auth.uid(), 'subscription_manager'::app_role)
    AND (
      is_global_role(auth.uid(), 'subscription_manager'::text)
      OR has_group_permission(auth.uid(), group_id, 'subscription_manager'::text)
    )
  )
);
