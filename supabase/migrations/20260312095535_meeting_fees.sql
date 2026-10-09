-- ================================================================
-- Migration: Add meeting_fee to groups + Meeting Payments system
-- ================================================================

-- 1. Add meeting_fee to groups table
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS meeting_fee NUMERIC;

-- 2. Create meeting_payments table
CREATE TABLE IF NOT EXISTS public.meeting_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(meeting_id, member_id)
);

ALTER TABLE public.meeting_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read meeting_payments"
  ON public.meeting_payments FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Subscription managers and admins can manage meeting_payments"
  ON public.meeting_payments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR (public.has_role(auth.uid(), 'subscription_manager'::app_role) AND public.is_global_role(auth.uid(), 'subscription_manager'::text)))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR (public.has_role(auth.uid(), 'subscription_manager'::app_role) AND public.is_global_role(auth.uid(), 'subscription_manager'::text)));

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_payments_meeting_id ON public.meeting_payments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_payments_member_id ON public.meeting_payments(member_id);
