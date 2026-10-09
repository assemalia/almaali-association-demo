import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Check, AlertTriangle, Calculator, DollarSign } from 'lucide-react';
import type { Member, Subscription, MeetingPayment } from '@/types';
import {
  fetchAllSubscriptionsForMembers,
  fetchGroupMeetingDebts,
  payAllMemberDebts,
  generateMonthlySubscriptions,
} from '@/services/subscriptions';

interface DebtsTabProps {
  groupId: string;
  members: Member[];
  monthlyFee: number;
}

/**
 * Generate all month/year pairs from a start date to the current date.
 */
function getExpectedMonths(memberCreatedAt: string): { month: number; year: number }[] {
  const startDate = new Date(memberCreatedAt);
  const now = new Date();

  const startMonth = startDate.getMonth() + 1; // 1-indexed
  const startYear = startDate.getFullYear();
  const endMonth = now.getMonth() + 1;
  const endYear = now.getFullYear();

  const months: { month: number; year: number }[] = [];
  let y = startYear;
  let m = startMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ month: m, year: y });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

const MONTH_NAMES = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export default function DebtsTab({ groupId, members, monthlyFee }: DebtsTabProps) {
  const queryClient = useQueryClient();
  const [isPayAllDialogOpen, setIsPayAllDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // ── Queries ──
  const memberIds = members.map(m => m.id);

  // Fetch ALL subscriptions (paid and unpaid) to detect missing months
  const { data: allSubscriptions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['all-subscriptions', groupId],
    queryFn: () => fetchAllSubscriptionsForMembers(memberIds),
    enabled: !!groupId && memberIds.length > 0,
  });

  const { data: meetingDebts = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['meeting-debts', groupId],
    queryFn: () => fetchGroupMeetingDebts(memberIds),
    enabled: !!groupId && memberIds.length > 0,
  });

  // ── Auto-generate missing subscriptions ──
  const autoGenerateMutation = useMutation({
    mutationFn: async ({ memberId, month, year }: { memberId: string; month: number; year: number }) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase.from('subscriptions').insert({
        member_id: memberId,
        month,
        year,
        amount: monthlyFee,
        is_paid: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['group-debts'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  // ── Derived Data: compute real debts including missing months ──
  const membersWithDebts = useMemo(() => {
    return members.map(member => {
      // Get all subscriptions for this member
      const memberSubscriptions = allSubscriptions.filter(s => s.member_id === member.id);

      // Calculate expected months from member's creation date
      const expectedMonths = member.created_at ? getExpectedMonths(member.created_at) : [];

      // Find explicitly unpaid subscriptions
      const explicitDebts = memberSubscriptions.filter(s => !s.is_paid);

      // Find months with NO subscription record at all (missing = also a debt)
      const missingMonths = expectedMonths.filter(em =>
        !memberSubscriptions.find(s => s.month === em.month && s.year === em.year)
      );

      // Create virtual debt objects for missing months
      const missingDebts: Subscription[] = missingMonths.map(mm => ({
        id: `missing-${member.id}-${mm.year}-${mm.month}`,
        member_id: member.id,
        month: mm.month,
        year: mm.year,
        amount: monthlyFee,
        is_paid: false,
        paid_at: null,
        notes: null,
      }));

      // Combine explicit unpaid + missing months = total monthly debts
      const allMonthlyDebts = [...explicitDebts, ...missingDebts].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      // Meeting debts
      const memberMeetingDebts = meetingDebts.filter(d => d.member_id === member.id);

      const totalMonthlyAmount = allMonthlyDebts.reduce((sum, d) => sum + d.amount, 0);
      const totalMeetingAmount = memberMeetingDebts.reduce((sum, d) => sum + d.amount, 0);
      const totalAmount = totalMonthlyAmount + totalMeetingAmount;

      return {
        ...member,
        monthlyDebts: allMonthlyDebts,
        explicitDebts,
        missingDebts,
        meetingDebts: memberMeetingDebts,
        totalMonthlyAmount,
        totalMeetingAmount,
        totalAmount,
        hasDebts: totalAmount > 0,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [members, allSubscriptions, meetingDebts, monthlyFee]);

  const stats = useMemo(() => {
    const membersWithAnyDebt = membersWithDebts.filter(m => m.hasDebts).length;
    const totalMonthlyDebts = membersWithDebts.reduce((sum, m) => sum + m.totalMonthlyAmount, 0);
    const totalMeetingDebts = membersWithDebts.reduce((sum, m) => sum + m.totalMeetingAmount, 0);
    const totalAllDebts = totalMonthlyDebts + totalMeetingDebts;

    return { membersWithAnyDebt, totalMonthlyDebts, totalMeetingDebts, totalAllDebts };
  }, [membersWithDebts]);

  // ── Mutations ──
  const payAllMutation = useMutation({
    mutationFn: async ({
      member,
      notes,
    }: {
      member: typeof membersWithDebts[0];
      notes: string;
    }) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const now = new Date().toISOString();

      // First, create subscription records for missing months
      if (member.missingDebts.length > 0) {
        const newSubs = member.missingDebts.map(d => ({
          member_id: d.member_id,
          month: d.month,
          year: d.year,
          amount: d.amount,
          is_paid: true,
          paid_at: now,
          notes: notes || null,
        }));
        const { error } = await supabase.from('subscriptions').insert(newSubs);
        if (error) throw error;
      }

      // Then mark existing unpaid subscriptions as paid
      const existingSubIds = member.explicitDebts.map(d => d.id);
      if (existingSubIds.length > 0) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ is_paid: true, paid_at: now, notes: notes || null })
          .in('id', existingSubIds);
        if (error) throw error;
      }

      // Mark meeting debts as paid
      const meetingPayIds = member.meetingDebts.map(d => d.id);
      if (meetingPayIds.length > 0) {
        const { error } = await supabase
          .from('meeting_payments')
          .update({ is_paid: true, paid_at: now, notes: notes || null })
          .in('id', meetingPayIds);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['group-debts'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-debts'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-payments'] });
      toast({ title: 'تمت تصفية مستحقات العضو بنجاح' });
      setIsPayAllDialogOpen(false);
      setSelectedMember(null);
      setPaymentNotes('');
    },
    onError: (error) => toast({ title: 'خطأ في تصفية المستحقات', description: error.message, variant: 'destructive' }),
  });

  // ── Handlers ──
  const openPayAllDialog = (member: Member) => {
    setSelectedMember(member);
    setPaymentNotes('تصفية شاملة للمستحقات');
    setIsPayAllDialogOpen(true);
  };

  const handlePayAll = () => {
    if (!selectedMember) return;
    const memberData = membersWithDebts.find(m => m.id === selectedMember.id);
    if (!memberData) return;

    payAllMutation.mutate({ member: memberData, notes: paymentNotes });
  };

  const toggleExpand = (memberId: string) => {
    setExpandedMember(expandedMember === memberId ? null : memberId);
  };

  const isLoading = subsLoading || meetingsLoading;

  return (
    <div className="space-y-6">
      <Card className="bg-destructive/5 border-destructive/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                المستحقات والديون المجمعة
              </h2>
              <p className="text-muted-foreground">
                تتبع ديون واشتراكات الأعضاء عبر الأشهر واللقاءات وتصفيتها دفعة واحدة.
                <br />
                <span className="text-xs">يتم احتساب الأشهر التي لم تُنشأ فيها اشتراكات تلقائياً كديون.</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">مدينون</CardTitle>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.membersWithAnyDebt} أعضاء</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ديون الأشهر</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalMonthlyDebts.toLocaleString()} دج</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ديون اللقاءات</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.totalMeetingDebts.toLocaleString()} دج</div></CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">الديون الكلية</CardTitle>
            <Calculator className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{stats.totalAllDebts.toLocaleString()} دج</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل الديون</CardTitle>
          <CardDescription>قائمة الأعضاء الذين لديهم مستحقات مالية غير مسددة (بما في ذلك الأشهر التي لم تُنشأ فيها اشتراكات)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : membersWithDebts.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">لا يوجد أعضاء في هذا الفوج</div>
          ) : stats.membersWithAnyDebt === 0 ? (
             <div className="text-center p-8 text-success font-semibold">لا توجد أي ديون على أعضاء الفوج! جميعهم سددوا ما عليهم.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>العضو</TableHead>
                    <TableHead className="text-center">ديون الأشهر</TableHead>
                    <TableHead className="text-center">ديون اللقاءات</TableHead>
                    <TableHead className="text-center">المجموع</TableHead>
                    <TableHead className="text-left whitespace-nowrap">تصفية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersWithDebts.map((member) => (
                    member.hasDebts ? (
                      <>
                        <TableRow key={member.id} className="bg-destructive/5 cursor-pointer" onClick={() => toggleExpand(member.id)}>
                          <TableCell className="font-medium">
                            {member.first_name} {member.last_name}
                            {member.missingDebts.length > 0 && (
                              <span className="block text-xs text-orange-500 mt-0.5">
                                ⚠ {member.missingDebts.length} شهر بدون سجل اشتراك
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-muted-foreground">
                              {member.monthlyDebts.length > 0 ? (
                                <span className="font-medium text-foreground">{member.totalMonthlyAmount.toLocaleString()} دج ({member.monthlyDebts.length})</span>
                              ) : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-muted-foreground">
                              {member.meetingDebts.length > 0 ? (
                                <span className="font-medium text-foreground">{member.totalMeetingAmount.toLocaleString()} دج ({member.meetingDebts.length})</span>
                              ) : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-bold text-destructive">
                            {member.totalAmount.toLocaleString()} دج
                          </TableCell>
                          <TableCell className="text-left">
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); openPayAllDialog(member); }} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                              <Check className="h-4 w-4 ml-1" />
                              تصفية كاملة
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedMember === member.id && (
                          <TableRow key={`${member.id}-details`}>
                            <TableCell colSpan={5} className="bg-muted/30 p-4">
                              <div className="space-y-3">
                                {member.monthlyDebts.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">📅 ديون الأشهر:</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {member.monthlyDebts.map((d) => (
                                        <span
                                          key={d.id}
                                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                                            d.id.startsWith('missing-')
                                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                          }`}
                                        >
                                          {MONTH_NAMES[d.month]} {d.year} - {d.amount.toLocaleString()} دج
                                          {d.id.startsWith('missing-') && ' (غير مُنشأ)'}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {member.meetingDebts.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">🤝 ديون اللقاءات:</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {member.meetingDebts.map((d) => (
                                        <span key={d.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                          {d.meetings?.title || 'لقاء'} - {d.amount.toLocaleString()} دج
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ) : null
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay All Dialog */}
      <Dialog open={isPayAllDialogOpen} onOpenChange={setIsPayAllDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تصفية ديون العضو</DialogTitle>
            <DialogDescription>
              أنت على وشك تسجيل دفع جميع المستحقات للعضو: <span className="font-bold text-foreground">{selectedMember?.first_name} {selectedMember?.last_name}</span>
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (() => {
            const mData = membersWithDebts.find(m => m.id === selectedMember.id);
            return mData && (
              <div className="grid gap-4 py-4">
                <div className="bg-muted p-4 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span>ديون الأشهر ({mData.monthlyDebts.length}):</span>
                    <span className="font-semibold">{mData.totalMonthlyAmount.toLocaleString()} دج</span>
                  </div>
                  {mData.missingDebts.length > 0 && (
                    <div className="flex justify-between text-xs text-orange-600">
                      <span>↳ منها {mData.missingDebts.length} شهر بدون سجل (سيتم إنشاؤها تلقائياً)</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>ديون اللقاءات ({mData.meetingDebts.length}):</span>
                    <span className="font-semibold">{mData.totalMeetingAmount.toLocaleString()} دج</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-bold">المجموع الكلي:</span>
                    <span className="font-bold text-destructive text-lg">{mData.totalAmount.toLocaleString()} دج</span>
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  <Label htmlFor="payall-notes">ملاحظات التصفية (اختياري)</Label>
                  <Textarea id="payall-notes" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayAllDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handlePayAll} disabled={payAllMutation.isPending}>
              {payAllMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد الدفع والتصفية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
