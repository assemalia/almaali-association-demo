/**
 * خريطة المفاتيح الأجنبية (FK) لحلّ الوصلات المضمّنة في select
 * مثل: groups(name)، members(count)، groups:group_id(name) ...
 *
 * الشكل: { الجدول: { عمود_FK: الجدول_المُشار_إليه } }
 * كل الوصلات المستعملة في التطبيق تُطابَق عبر عمود id في الجدول الهدف.
 */
export const FOREIGN_KEYS: Record<string, Record<string, string>> = {
  groups: { project_id: 'projects', educator_id: 'profiles' },
  members: { group_id: 'groups' },
  meetings: { group_id: 'groups' },
  lessons: { meeting_id: 'meetings', topic_id: 'topics' },
  attendance: { meeting_id: 'meetings', member_id: 'members' },
  subscriptions: { member_id: 'members' },
  meeting_payments: { meeting_id: 'meetings', member_id: 'members' },
  member_topics: { member_id: 'members', topic_id: 'topics' },
  member_skills: { member_id: 'members', skill_id: 'skills' },
  notifications: { related_member_id: 'members', related_group_id: 'groups' },
  user_group_permissions: { group_id: 'groups' },
  user_roles: {},
  profiles: {},
  projects: {},
  topics: {},
  skills: {},
};

/** يجد عمود FK في جدول `base` يُشير إلى جدول `target` (to-one). */
export function findForeignKeyTo(base: string, target: string): string | null {
  const fks = FOREIGN_KEYS[base] || {};
  for (const [col, ref] of Object.entries(fks)) {
    if (ref === target) return col;
  }
  return null;
}

/** يجد عمود FK في جدول `target` يُشير إلى جدول `base` (to-many). */
export function findReverseForeignKey(base: string, target: string): string | null {
  return findForeignKeyTo(target, base);
}
