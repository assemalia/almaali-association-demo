-- ============================================
-- FIX: Cross-Group Data Access Vulnerability
-- Restrict educators to only access data for their assigned groups
-- Admins retain full access
-- ============================================

-- 1. FIX SUBSCRIPTIONS - Educators can only view subscriptions for members in their groups
DROP POLICY IF EXISTS "Approved users can view subscriptions" ON subscriptions;

CREATE POLICY "Group-scoped subscription viewing" ON subscriptions
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  member_id IN (
    SELECT m.id FROM members m
    JOIN groups g ON m.group_id = g.id
    WHERE g.educator_id = auth.uid() AND is_approved(auth.uid())
  )
);

-- 2. FIX MEETINGS - Educators can only manage meetings for their groups
DROP POLICY IF EXISTS "Approved users can manage meetings" ON meetings;
DROP POLICY IF EXISTS "Approved users can view meetings" ON meetings;

CREATE POLICY "Educators can manage their group meetings" ON meetings
FOR ALL USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND group_id IN (
    SELECT id FROM groups WHERE educator_id = auth.uid()
  ))
);

CREATE POLICY "Educators can view their group meetings" ON meetings
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND group_id IN (
    SELECT id FROM groups WHERE educator_id = auth.uid()
  ))
);

-- 3. FIX ATTENDANCE - Educators can only manage attendance for meetings in their groups
DROP POLICY IF EXISTS "Approved users can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Approved users can view attendance" ON attendance;

CREATE POLICY "Educators can manage attendance for their group meetings" ON attendance
FOR ALL USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND meeting_id IN (
    SELECT m.id FROM meetings m
    JOIN groups g ON m.group_id = g.id
    WHERE g.educator_id = auth.uid()
  ))
);

CREATE POLICY "Educators can view attendance for their group meetings" ON attendance
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND meeting_id IN (
    SELECT m.id FROM meetings m
    JOIN groups g ON m.group_id = g.id
    WHERE g.educator_id = auth.uid()
  ))
);

-- 4. FIX LESSONS - Educators can only manage lessons for meetings in their groups
DROP POLICY IF EXISTS "Approved users can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Approved users can view lessons" ON lessons;

CREATE POLICY "Educators can manage lessons for their group meetings" ON lessons
FOR ALL USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND meeting_id IN (
    SELECT m.id FROM meetings m
    JOIN groups g ON m.group_id = g.id
    WHERE g.educator_id = auth.uid()
  ))
);

CREATE POLICY "Educators can view lessons for their group meetings" ON lessons
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND meeting_id IN (
    SELECT m.id FROM meetings m
    JOIN groups g ON m.group_id = g.id
    WHERE g.educator_id = auth.uid()
  ))
);

-- 5. FIX MEMBER_TOPICS - Educators can only manage member_topics for members in their groups
DROP POLICY IF EXISTS "Approved users can manage member_topics" ON member_topics;
DROP POLICY IF EXISTS "Approved users can view member_topics" ON member_topics;

CREATE POLICY "Educators can manage member_topics for their group members" ON member_topics
FOR ALL USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND member_id IN (
    SELECT m.id FROM members m
    JOIN groups g ON m.group_id = g.id
    WHERE g.educator_id = auth.uid()
  ))
);

CREATE POLICY "Educators can view member_topics for their group members" ON member_topics
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND member_id IN (
    SELECT m.id FROM members m
    JOIN groups g ON m.group_id = g.id
    WHERE g.educator_id = auth.uid()
  ))
);

-- 6. FIX MEMBERS - Educators can only manage members in their groups
DROP POLICY IF EXISTS "Approved users can manage members" ON members;
DROP POLICY IF EXISTS "Approved users can view members" ON members;

CREATE POLICY "Educators can manage their group members" ON members
FOR ALL USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND group_id IN (
    SELECT id FROM groups WHERE educator_id = auth.uid()
  ))
);

CREATE POLICY "Educators can view their group members" ON members
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  (is_approved(auth.uid()) AND group_id IN (
    SELECT id FROM groups WHERE educator_id = auth.uid()
  ))
);