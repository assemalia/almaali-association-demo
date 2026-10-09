/* eslint-disable @typescript-eslint/no-explicit-any -- اختبارات: العميل الوهمي غير مُنمّط بشدة فنستعمل any للتبسيط */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockClient, resetDemoData } from './index';

const supabase = createMockClient();

const GROUP_FURQAN = '44444444-4444-4444-4444-444444444441'; // 3 members, all active

beforeEach(() => resetDemoData());

describe('mock query builder', () => {
  it('embeds to-many count: groups(members(count))', async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, members(count)')
      .order('name');
    expect(error).toBeNull();
    const furqan = (data as any[]).find((g) => g.id === GROUP_FURQAN);
    expect(furqan.members[0].count).toBe(3);
  });

  it('embeds to-one alias: members(*, groups:group_id(name))', async () => {
    const { data } = await supabase
      .from('members')
      .select('*, groups:group_id(name)')
      .eq('group_id', GROUP_FURQAN)
      .order('created_at', { ascending: false });
    expect((data as any[]).length).toBe(3);
    for (const m of data as any[]) expect(m.groups.name).toBe('فوج الفرقان');
  });

  it('embeds to-one + to-many together: groups(*, projects:project_id(name), members(count))', async () => {
    const { data } = await supabase
      .from('groups')
      .select('*, projects:project_id(name), members(count)')
      .order('created_at', { ascending: false });
    const furqan = (data as any[]).find((g) => g.id === GROUP_FURQAN);
    expect(furqan.projects.name).toBe('مشروع تحفيظ القرآن الكريم');
    expect(furqan.members[0].count).toBe(3);
  });

  it('count + head returns count and null data', async () => {
    const { data, count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', GROUP_FURQAN)
      .eq('status', 'active');
    expect(data).toBeNull();
    expect(count).toBe(3);
  });

  it('nested embed with !inner (absence alerts shape)', async () => {
    const { data } = await supabase
      .from('attendance')
      .select('member_id, members:member_id(id, first_name, last_name, group_id, groups:group_id(name))')
      .eq('status', 'absent');
    expect((data as any[]).length).toBeGreaterThan(0);
    const rec = (data as any[])[0];
    expect(rec.members).toBeTruthy();
    expect(rec.members.groups.name).toBeTruthy();
  });

  it('meetings ordered by date desc with group name embed', async () => {
    const { data } = await supabase
      .from('meetings')
      .select('*, groups:group_id(name)')
      .order('meeting_date', { ascending: false });
    const dates = (data as any[]).map((m) => m.meeting_date);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
    expect((data as any[])[0].groups.name).toBeTruthy();
  });

  it('insert returns row with generated id, and persists', async () => {
    const { data: created, error } = await supabase
      .from('members')
      .insert({ first_name: 'جديد', last_name: 'تجريبي', group_id: GROUP_FURQAN, status: 'active' })
      .select()
      .single();
    expect(error).toBeNull();
    expect((created as any).id).toBeTruthy();

    const { count } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', GROUP_FURQAN);
    expect(count).toBe(4);
  });

  it('update mutates matching rows', async () => {
    const id = '55555555-5555-5555-5555-555555555551';
    await supabase.from('members').update({ status: 'inactive' }).eq('id', id);
    const { data } = await supabase.from('members').select('*').eq('id', id).single();
    expect((data as any).status).toBe('inactive');
  });

  it('delete removes matching rows', async () => {
    const id = '55555555-5555-5555-5555-555555555551';
    await supabase.from('member_topics').delete().eq('member_id', id);
    const { data } = await supabase.from('member_topics').select('*').eq('member_id', id);
    expect((data as any[]).length).toBe(0);
  });

  it('in() filter + maybeSingle', async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .in('member_id', ['55555555-5555-5555-5555-555555555551']);
    expect((data as any[]).length).toBeGreaterThanOrEqual(1);

    const { data: none } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('member_id', 'does-not-exist')
      .maybeSingle();
    expect(none).toBeNull();
  });

  it('auth: starts signed in as demo admin', async () => {
    const { data } = await supabase.auth.getSession();
    expect((data.session as any).user.id).toBeTruthy();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', (data.session as any).user.id)
      .single();
    expect((profile as any).is_approved).toBe(true);

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role, is_global')
      .eq('user_id', (data.session as any).user.id);
    expect((roles as any[]).some((r) => r.role === 'admin')).toBe(true);
  });
});
