import { supabase } from '@/integrations/supabase/client';
import type { Meeting, AttendanceRecord, MemberAbsenceAlert } from '@/types';

/**
 * Fetch meetings with attendance and member counts (batch — no N+1).
 */
export async function fetchMeetingsWithCounts(): Promise<Meeting[]> {
  // 1. Fetch all meetings with group names
  const { data: meetingsData, error } = await supabase
    .from('meetings')
    .select('*, groups:group_id(name)')
    .order('meeting_date', { ascending: false });
  if (error) throw error;
  if (!meetingsData || meetingsData.length === 0) return [];

  // 2. Batch-fetch attendance counts per meeting
  const meetingIds = meetingsData.map(m => m.id);
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('meeting_id, status')
    .in('meeting_id', meetingIds);

  const attendanceCounts = new Map<string, number>();
  (attendanceData || []).forEach(a => {
    if (a.status === 'present') {
      attendanceCounts.set(a.meeting_id, (attendanceCounts.get(a.meeting_id) || 0) + 1);
    }
  });

  // 3. Batch-fetch active member counts per group
  const groupIds = [...new Set(meetingsData.map(m => m.group_id))];
  const memberCountsMap = new Map<string, number>();
  
  for (const groupId of groupIds) {
    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('status', 'active');
    memberCountsMap.set(groupId, count || 0);
  }

  return meetingsData.map(meeting => ({
    ...meeting,
    attendance_count: attendanceCounts.get(meeting.id) || 0,
    members_count: memberCountsMap.get(meeting.group_id) || 0,
  })) as Meeting[];
}

/**
 * Create a new meeting.
 */
export async function createMeeting(data: {
  title: string;
  meeting_date: string;
  group_id: string;
  created_by?: string;
}) {
  const { error } = await supabase.from('meetings').insert({
    title: data.title.trim(),
    meeting_date: data.meeting_date,
    group_id: data.group_id,
    created_by: data.created_by || null,
  });
  if (error) throw error;
}

/**
 * Fetch meetings for a specific group.
 */
export async function fetchGroupMeetings(groupId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('group_id', groupId)
    .order('meeting_date', { ascending: false });
  if (error) throw error;
  return data as Meeting[];
}

/**
 * Fetch attendance records for a specific meeting.
 */
export async function fetchAttendance(meetingId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('meeting_id', meetingId);
  if (error) throw error;
  return data as AttendanceRecord[];
}

/**
 * Upsert attendance for a member in a meeting.
 */
export async function upsertAttendance(
  existingRecords: AttendanceRecord[],
  meetingId: string,
  memberId: string,
  status: 'present' | 'absent' | 'excused',
  notes?: string
) {
  const existing = existingRecords.find(r => r.member_id === memberId);

  if (existing) {
    const { error } = await supabase
      .from('attendance')
      .update({ status, notes: notes || null })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('attendance').insert({
      meeting_id: meetingId,
      member_id: memberId,
      status,
      notes: notes || null,
    });
    if (error) throw error;
  }
}

/**
 * Fetch member absence alerts (members with 3+ absences).
 */
export async function fetchMemberAbsences(): Promise<MemberAbsenceAlert[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      member_id,
      members:member_id(id, first_name, last_name, group_id, groups:group_id(name))
    `)
    .eq('status', 'absent');
  if (error) throw error;

  const absenceCounts: Record<string, MemberAbsenceAlert> = {};
  (data || []).forEach((record: unknown) => {
    const r = record as { member_id: string; members: MemberAbsenceAlert['member'] };
    if (r.members) {
      if (!absenceCounts[r.member_id]) {
        absenceCounts[r.member_id] = { count: 0, member: r.members };
      }
      absenceCounts[r.member_id].count++;
    }
  });

  return Object.values(absenceCounts).filter(item => item.count >= 3);
}
