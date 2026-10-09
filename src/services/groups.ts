import { supabase } from '@/integrations/supabase/client';
import type { Group, Educator } from '@/types';

/**
 * Fetch all groups with project, educator profile, and member counts (batch — no N+1).
 */
export async function fetchGroupsWithDetails(): Promise<Group[]> {
  // 1. Fetch groups with project names and member counts in one query
  const { data: groupsData, error } = await supabase
    .from('groups')
    .select('*, projects:project_id(name), members(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!groupsData || groupsData.length === 0) return [];

  // 2. Batch-fetch educator profiles for groups that have educator_id
  const educatorIds = [...new Set(
    groupsData
      .filter(g => g.educator_id)
      .map(g => g.educator_id as string)
  )];

  const educatorMap = new Map<string, { full_name: string }>();
  if (educatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', educatorIds);
    (profiles || []).forEach(p => educatorMap.set(p.user_id, { full_name: p.full_name }));
  }

  // 3. Combine
  return groupsData.map(group => ({
    ...group,
    members_count: (group.members as unknown as [{ count: number }])?.[0]?.count ?? 0,
    educator_profile: group.educator_id ? educatorMap.get(group.educator_id) || null : null,
  })) as Group[];
}

/**
 * Fetch educators (users with any role).
 */
export async function fetchEducators(): Promise<Educator[]> {
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id');
  if (rolesError) throw rolesError;

  const userIds = roles?.map(r => r.user_id) || [];
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);
  if (profilesError) throw profilesError;

  return profiles as Educator[];
}

/**
 * Create a new group.
 */
export async function createGroup(data: {
  name: string;
  project_id: string;
  educator_id: string;
  monthly_fee: string;
  meeting_fee: string;
}) {
  const { error } = await supabase.from('groups').insert({
    name: data.name,
    project_id: data.project_id || null,
    educator_id: data.educator_id || null,
    monthly_fee: data.monthly_fee ? parseFloat(data.monthly_fee) : 0,
    meeting_fee: data.meeting_fee ? parseFloat(data.meeting_fee) : null,
  });
  if (error) throw error;
}

/**
 * Update group.
 */
export async function updateGroup(
  id: string,
  data: { name: string; project_id: string; educator_id: string; monthly_fee: string; meeting_fee: string; }
) {
  const { error } = await supabase
    .from('groups')
    .update({
      name: data.name,
      project_id: data.project_id || null,
      educator_id: data.educator_id || null,
      monthly_fee: data.monthly_fee ? parseFloat(data.monthly_fee) : 0,
      meeting_fee: data.meeting_fee ? parseFloat(data.meeting_fee) : null,
    })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Delete group.
 */
export async function deleteGroup(id: string) {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}
