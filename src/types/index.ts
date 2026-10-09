// ============================================
// Shared TypeScript types for the application
// ============================================

import { Database } from '@/integrations/supabase/types';

// Database enum types
export type AppRole = Database['public']['Enums']['app_role'];
export type AttendanceStatus = Database['public']['Enums']['attendance_status'];
export type MemberStatus = Database['public']['Enums']['member_status'];
export type NotificationType = Database['public']['Enums']['notification_type'];

// Core entities
export interface Member {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: string | null;
  group_id: string | null;
  status: MemberStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  groups?: { name: string } | null;
  topics?: Topic[];
  skills?: Skill[];
  guardian_name?: string | null;
  guardian_phone?: string | null;
}

export interface Group {
  id: string;
  name: string;
  project_id: string | null;
  educator_id: string | null;
  monthly_fee: number | null;
  meeting_fee: number | null;
  created_at: string;
  projects?: { name: string } | null;
  educator_profile?: { full_name: string } | null;
  members_count?: number;
}

export interface MeetingPayment {
  id: string;
  meeting_id: string;
  member_id: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  meetings?: { title: string; meeting_date: string } | null;
}

export interface GroupWithCount {
  id: string;
  name: string;
  members: { count: number }[];
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
}

export interface Topic {
  id: string;
  name: string;
  description?: string | null;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  group_id: string;
  created_by: string | null;
  created_at: string;
  opening_speech_title: string | null;
  opening_speech_content: string | null;
  opening_speech_presenter: string | null;
  groups?: { name: string } | null;
  attendance_count?: number;
  members_count?: number;
}

export interface Lesson {
  id: string;
  meeting_id: string;
  topic_id: string | null;
  title: string;
  content: string | null;
  presenter: string | null;
  key_points: string | null;
  topics?: { name: string } | null;
}

export interface Subscription {
  id: string;
  member_id: string;
  month: number;
  year: number;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
}

export interface Skill {
  id: string;
  name: string;
  description: string | null;
}

export interface AttendanceRecord {
  id: string;
  member_id: string;
  meeting_id: string;
  status: AttendanceStatus;
  notes: string | null;
}

export interface Educator {
  user_id: string;
  full_name: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_member_id: string | null;
  related_group_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Absence alert type (used in Attendance page)
export interface MemberAbsenceAlert {
  count: number;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    group_id: string | null;
    groups?: { name: string } | null;
  };
}
