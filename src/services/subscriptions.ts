import { supabase } from '@/integrations/supabase/client';
import type { Subscription, Member, MeetingPayment } from '@/types';

/**
 * Fetch active members for a group.
 */
export async function fetchGroupActiveMembers(groupId: string): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('id, first_name, last_name, status, group_id, created_at')
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('first_name');
  if (error) throw error;
  return data as Member[];
}

/**
 * Fetch subscriptions for given members in a specific month/year.
 */
export async function fetchSubscriptions(
  memberIds: string[],
  month: number,
  year: number
): Promise<Subscription[]> {
  if (memberIds.length === 0) return [];
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < memberIds.length; i += chunkSize) {
    chunks.push(memberIds.slice(i, i + chunkSize));
  }

  const promises = chunks.map(async (chunk) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .in('member_id', chunk)
      .eq('month', month)
      .eq('year', year);
    if (error) throw error;
    return data as Subscription[];
  });

  const results = await Promise.all(promises);
  return results.flat();
}

/**
 * Fetch ALL subscriptions (paid and unpaid) for given members.
 */
export async function fetchAllSubscriptionsForMembers(memberIds: string[]): Promise<Subscription[]> {
  if (memberIds.length === 0) return [];
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < memberIds.length; i += chunkSize) {
    chunks.push(memberIds.slice(i, i + chunkSize));
  }

  const promises = chunks.map(async (chunk) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .in('member_id', chunk);
    if (error) throw error;
    return data as Subscription[];
  });

  const results = await Promise.all(promises);
  return results.flat();
}

/**
 * Fetch all unpaid subscriptions for given members (debts).
 */
export async function fetchGroupDebts(memberIds: string[]): Promise<Subscription[]> {
  if (memberIds.length === 0) return [];
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < memberIds.length; i += chunkSize) {
    chunks.push(memberIds.slice(i, i + chunkSize));
  }

  const promises = chunks.map(async (chunk) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .in('member_id', chunk)
      .eq('is_paid', false);
    if (error) throw error;
    return data as Subscription[];
  });

  const results = await Promise.all(promises);
  const allDebts = results.flat();

  return allDebts.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

/**
 * Fetch all unpaid meeting payments for given members (debts).
 */
export async function fetchGroupMeetingDebts(memberIds: string[]): Promise<MeetingPayment[]> {
  if (memberIds.length === 0) return [];
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < memberIds.length; i += chunkSize) {
    chunks.push(memberIds.slice(i, i + chunkSize));
  }

  const promises = chunks.map(async (chunk) => {
    const { data, error } = await supabase
      .from('meeting_payments')
      .select('*, meetings:meeting_id(title, meeting_date)')
      .in('member_id', chunk)
      .eq('is_paid', false);
    if (error) throw error;
    return data as MeetingPayment[];
  });

  const results = await Promise.all(promises);
  const allDebts = results.flat();

  return allDebts.sort((a, b) => {
    const dateA = a.created_at || '';
    const dateB = b.created_at || '';
    return dateA.localeCompare(dateB);
  });
}

/**
 * Register a payment (upsert subscription).
 */
export async function registerPayment(
  memberId: string,
  month: number,
  year: number,
  amount: number,
  notes: string
) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('member_id', memberId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        is_paid: true,
        amount,
        paid_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('subscriptions').insert({
      member_id: memberId,
      month,
      year,
      amount,
      is_paid: true,
      paid_at: new Date().toISOString(),
      notes: notes || null,
    });
    if (error) throw error;
  }
}

/**
 * Cancel a payment.
 */
export async function cancelPayment(subscriptionId: string) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ is_paid: false, paid_at: null })
    .eq('id', subscriptionId);
  if (error) throw error;
}

/**
 * Generate subscriptions for a month.
 */
export async function generateMonthlySubscriptions(
  members: Member[],
  existingSubscriptions: Subscription[],
  month: number,
  year: number,
  monthlyFee: number
) {
  const membersWithoutSubs = members.filter(
    m => !existingSubscriptions.find(s => s.member_id === m.id)
  );

  if (membersWithoutSubs.length === 0) {
    throw new Error('جميع الأعضاء لديهم اشتراكات لهذا الشهر');
  }

  const newSubs = membersWithoutSubs.map(member => ({
    member_id: member.id,
    month,
    year,
    amount: monthlyFee,
    is_paid: false,
  }));

  const { error } = await supabase.from('subscriptions').insert(newSubs);
  if (error) throw error;
}

/**
 * Generate dynamic YEARS array from 2024 to current year + 1.
 */
export function generateYearsRange(): number[] {
  const currentYear = new Date().getFullYear();
  const startYear = 2024;
  const endYear = currentYear + 1;
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }
  return years;
}

/**
 * Process mass payment for all debts of a member.
 */
export async function payAllMemberDebts(
  subscriptionIds: string[],
  meetingPaymentIds: string[],
  notes: string
) {
  const promises = [];
  const now = new Date().toISOString();

  if (subscriptionIds.length > 0) {
    promises.push(
      supabase
        .from('subscriptions')
        .update({ is_paid: true, paid_at: now, notes: notes || null })
        .in('id', subscriptionIds)
    );
  }

  if (meetingPaymentIds.length > 0) {
    promises.push(
      supabase
        .from('meeting_payments')
        .update({ is_paid: true, paid_at: now, notes: notes || null })
        .in('id', meetingPaymentIds)
    );
  }

  if (promises.length === 0) return;

  const results = await Promise.all(promises);
  for (const { error } of results) {
    if (error) throw error;
  }
}

// ──────────────────────────────────────────────
// Meeting Payments
// ──────────────────────────────────────────────

/**
 * Fetch payments for a specific meeting.
 */
export async function fetchMeetingPayments(meetingId: string): Promise<MeetingPayment[]> {
  const { data, error } = await supabase
    .from('meeting_payments')
    .select('*')
    .eq('meeting_id', meetingId);
  if (error) throw error;
  return data as MeetingPayment[];
}

/**
 * Register a meeting payment.
 */
export async function registerMeetingPayment(
  meetingId: string,
  memberId: string,
  amount: number,
  notes: string
) {
  const { data: existing } = await supabase
    .from('meeting_payments')
    .select('id')
    .eq('meeting_id', meetingId)
    .eq('member_id', memberId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('meeting_payments')
      .update({
        is_paid: true,
        amount,
        paid_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('meeting_payments').insert({
      meeting_id: meetingId,
      member_id: memberId,
      amount,
      is_paid: true,
      paid_at: new Date().toISOString(),
      notes: notes || null,
    });
    if (error) throw error;
  }
}

/**
 * Cancel a meeting payment.
 */
export async function cancelMeetingPayment(paymentId: string) {
  const { error } = await supabase
    .from('meeting_payments')
    .update({ is_paid: false, paid_at: null })
    .eq('id', paymentId);
  if (error) throw error;
}

/**
 * Generate payments for a meeting for all members.
 */
export async function generateMeetingPayments(
  meetingId: string,
  members: Member[],
  existingPayments: MeetingPayment[],
  meetingFee: number
) {
  const membersWithoutPayments = members.filter(
    m => !existingPayments.find(p => p.member_id === m.id)
  );

  if (membersWithoutPayments.length === 0) {
    throw new Error('جميع الأعضاء لديهم سجلات دفع لهذا اللقاء');
  }

  const newPayments = membersWithoutPayments.map(member => ({
    meeting_id: meetingId,
    member_id: member.id,
    amount: meetingFee,
    is_paid: false,
  }));

  const { error } = await supabase.from('meeting_payments').insert(newPayments);
  if (error) throw error;
}
