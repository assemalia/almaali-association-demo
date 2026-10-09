-- ================================================================
-- Migration: Add guardian fields to members + Skills system
-- ================================================================

-- 1. Add guardian fields to members table
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS guardian_name TEXT,
  ADD COLUMN IF NOT EXISTS guardian_phone TEXT;

-- 2. Create skills table (same pattern as topics)
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read skills"
  ON public.skills FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Admins can manage skills"
  ON public.skills FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Create member_skills junction table (same pattern as member_topics)
CREATE TABLE IF NOT EXISTS public.member_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  UNIQUE(member_id, skill_id)
);

ALTER TABLE public.member_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read member_skills"
  ON public.member_skills FOR SELECT
  TO authenticated
  USING (public.is_approved(auth.uid()));

CREATE POLICY "Approved users can manage member_skills"
  ON public.member_skills FOR ALL
  TO authenticated
  USING (public.is_approved(auth.uid()))
  WITH CHECK (public.is_approved(auth.uid()));

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_member_skills_member_id ON public.member_skills(member_id);
CREATE INDEX IF NOT EXISTS idx_member_skills_skill_id ON public.member_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_skills_name ON public.skills(name);
