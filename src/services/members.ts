import { supabase } from '@/integrations/supabase/client';
import type { Member, Topic, Skill, GroupWithCount } from '@/types';

/**
 * Fetch groups with their member counts.
 */
export async function fetchGroupsWithCount(): Promise<GroupWithCount[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, members(count)')
    .order('name');
  if (error) throw error;
  return data as GroupWithCount[];
}

/**
 * Fetch members for a specific group, including topics and skills (batch — no N+1).
 */
export async function fetchMembersWithTopicsAndSkills(groupId: string): Promise<Member[]> {
  // 1. Fetch members
  const { data: membersData, error } = await supabase
    .from('members')
    .select('*, groups:group_id(name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!membersData || membersData.length === 0) return [];

  const memberIds = membersData.map(m => m.id);

  // 2. Batch-fetch all member_topics
  const { data: allMemberTopics } = await supabase
    .from('member_topics')
    .select('member_id, topic_id')
    .in('member_id', memberIds);

  const memberTopicsMap = new Map<string, Topic[]>();
  if (allMemberTopics && allMemberTopics.length > 0) {
    const uniqueTopicIds = [...new Set(allMemberTopics.map(mt => mt.topic_id))];
    const { data: topicsData } = await supabase
      .from('topics')
      .select('id, name, description')
      .in('id', uniqueTopicIds);

    const topicsMap = new Map<string, Topic>();
    (topicsData || []).forEach(t => topicsMap.set(t.id, t));

    allMemberTopics.forEach(mt => {
      const topic = topicsMap.get(mt.topic_id);
      if (topic) {
        const existing = memberTopicsMap.get(mt.member_id) || [];
        existing.push(topic);
        memberTopicsMap.set(mt.member_id, existing);
      }
    });
  }

  // 3. Batch-fetch all member_skills
  const { data: allMemberSkills } = await supabase
    .from('member_skills')
    .select('member_id, skill_id')
    .in('member_id', memberIds);

  const memberSkillsMap = new Map<string, Skill[]>();
  if (allMemberSkills && allMemberSkills.length > 0) {
    const uniqueSkillIds = [...new Set(allMemberSkills.map(ms => ms.skill_id))];
    const { data: skillsData } = await supabase
      .from('skills')
      .select('id, name, description')
      .in('id', uniqueSkillIds);

    const skillsMap = new Map<string, Skill>();
    (skillsData || []).forEach(s => skillsMap.set(s.id, s));

    allMemberSkills.forEach(ms => {
      const skill = skillsMap.get(ms.skill_id);
      if (skill) {
        const existing = memberSkillsMap.get(ms.member_id) || [];
        existing.push(skill);
        memberSkillsMap.set(ms.member_id, existing);
      }
    });
  }

  return membersData.map(m => ({
    ...m,
    topics: memberTopicsMap.get(m.id) || [],
    skills: memberSkillsMap.get(m.id) || [],
  })) as Member[];
}

/**
 * Create a new member with topics and skills.
 */
export async function createMember(
  data: {
    first_name: string;
    last_name: string;
    phone: string;
    guardian_name?: string;
    guardian_phone?: string;
    date_of_birth: string;
    group_id: string;
    status: 'active' | 'inactive';
    notes: string;
  },
  topicIds: string[],
  skillIds: string[]
) {
  const { data: newMember, error } = await supabase
    .from('members')
    .insert({
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone.trim() || null,
      guardian_name: data.guardian_name?.trim() || null,
      guardian_phone: data.guardian_phone?.trim() || null,
      date_of_birth: data.date_of_birth || null,
      group_id: data.group_id || null,
      status: data.status,
      notes: data.notes.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;

  if (topicIds.length > 0) {
    const memberTopics = topicIds.map(topicId => ({
      member_id: newMember.id,
      topic_id: topicId,
    }));
    const { error: topicsError } = await supabase.from('member_topics').insert(memberTopics);
    if (topicsError) throw topicsError;
  }

  if (skillIds.length > 0) {
    const memberSkills = skillIds.map(skillId => ({
      member_id: newMember.id,
      skill_id: skillId,
    }));
    const { error: skillsError } = await supabase.from('member_skills').insert(memberSkills);
    if (skillsError) throw skillsError;
  }
}

/**
 * Update an existing member and their topics & skills.
 */
export async function updateMember(
  id: string,
  data: {
    first_name: string;
    last_name: string;
    phone: string;
    guardian_name?: string;
    guardian_phone?: string;
    date_of_birth: string;
    group_id: string;
    status: 'active' | 'inactive';
    notes: string;
  },
  topicIds: string[],
  skillIds: string[]
) {
  const { error } = await supabase
    .from('members')
    .update({
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      phone: data.phone.trim() || null,
      guardian_name: data.guardian_name?.trim() || null,
      guardian_phone: data.guardian_phone?.trim() || null,
      date_of_birth: data.date_of_birth || null,
      group_id: data.group_id || null,
      status: data.status,
      notes: data.notes.trim() || null,
    })
    .eq('id', id);
  if (error) throw error;

  // Replace topics
  const { error: deleteTopicsError } = await supabase.from('member_topics').delete().eq('member_id', id);
  if (deleteTopicsError) throw deleteTopicsError;

  if (topicIds.length > 0) {
    const memberTopics = topicIds.map(topicId => ({
      member_id: id,
      topic_id: topicId,
    }));
    const { error: topicsError } = await supabase.from('member_topics').insert(memberTopics);
    if (topicsError) throw topicsError;
  }

  // Replace skills
  const { error: deleteSkillsError } = await supabase.from('member_skills').delete().eq('member_id', id);
  if (deleteSkillsError) throw deleteSkillsError;

  if (skillIds.length > 0) {
    const memberSkills = skillIds.map(skillId => ({
      member_id: id,
      skill_id: skillId,
    }));
    const { error: skillsError } = await supabase.from('member_skills').insert(memberSkills);
    if (skillsError) throw skillsError;
  }
}

export async function deleteMember(id: string) {
  await supabase.from('member_topics').delete().eq('member_id', id);
  await supabase.from('member_skills').delete().eq('member_id', id);
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
}
