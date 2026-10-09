import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Plus, Check, X, Calendar, DollarSign, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Member, Meeting } from '@/types';
import { fetchGroupMeetings } from '@/services/meetings';
import {
  fetchMeetingPayments,
  registerMeetingPayment,
  cancelMeetingPayment,
  generateMeetingPayments,
  generateYearsRange,
} from '@/services/subscriptions';

const MONTHS = [
  { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' },
  { value: 3, label: 'مارس' }, { value: 4, label: 'أبريل' },
  { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
  { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' },
  { value: 9, label: 'سبتمبر' }, { value: 10, label: 'أكتوبر' },
  { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' },
];

const YEARS = generateYearsRange();

interface MeetingPaymentsTabProps {
  groupId: string;
  members: Member[];
  meetingFee: number;
}

export default function MeetingPaymentsTab({ groupId, members, meetingFee }: MeetingPaymentsTabProps) {
  const queryClient = useQueryClient();
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  // Payment dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // ── Queries ──
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['group-meetings', groupId],
    queryFn: () => fetchGroupMeetings(groupId),
    enabled: !!groupId,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['meeting-payments', selectedMeeting],
    queryFn: () => fetchMeetingPayments(selectedMeeting),
    enabled: !!selectedMeeting && members.length > 0,
  });

  // ── Derived Data ──
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      const date = new Date(m.meeting_date);
      const mMonth = date.getMonth() + 1;
      const mYear = date.getFullYear();
      if (selectedMonth !== 'all' && mMonth !== selectedMonth) return false;
      if (selectedYear !== 'all' && mYear !== selectedYear) return false;
      return true;
    });
  }, [meetings, selectedMonth, selectedYear]);

  const selectedMeetingData = useMemo(() => meetings.find(m => m.id === selectedMeeting), [meetings, selectedMeeting]);

  const membersWithPayments = useMemo(() => {
    return members.map((member) => ({
      ...member,
      payment: payments.find((p) => p.member_id === member.id),
    }));
  }, [members, payments]);

  const filteredMembers = useMemo(() => {
    if (paymentStatus === 'all') return membersWithPayments;
    if (paymentStatus === 'paid') return membersWithPayments.filter((m) => m.payment?.is_paid);
    return membersWithPayments.filter((m) => !m.payment?.is_paid);
  }, [membersWithPayments, paymentStatus]);

  const stats = useMemo(() => {
    const totalMembers = members.length;
    const paidCount = membersWithPayments.filter((m) => m.payment?.is_paid).length;
    const unpaidCount = totalMembers - paidCount;
    const totalCollected = membersWithPayments
      .filter((m) => m.payment?.is_paid)
      .reduce((sum, m) => sum + (m.payment?.amount || 0), 0);
    const totalExpected = totalMembers * meetingFee;
    return { totalMembers, paidCount, unpaidCount, totalCollected, totalExpected };
  }, [members, membersWithPayments, meetingFee]);

  // ── Mutations ──
  const paymentMutation = useMutation({
    mutationFn: ({ memberId, amount, notes }: { memberId: string; amount: number; notes: string }) =>
      registerMeetingPayment(selectedMeeting, memberId, amount, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-payments', selectedMeeting] });
      toast({ title: 'تم تسجيل الدفع بنجاح' });
      setIsPaymentDialogOpen(false);
      setSelectedMember(null);
      setPaymentAmount('');
      setPaymentNotes('');
    },
    onError: (error) => toast({ title: 'خطأ في تسجيل الدفع', description: error.message, variant: 'destructive' }),
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: cancelMeetingPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-payments', selectedMeeting] });
      toast({ title: 'تم إلغاء الدفع' });
    },
    onError: (error) => toast({ title: 'خطأ في إلغاء الدفع', description: error.message, variant: 'destructive' }),
  });

  const generatePaymentsMutation = useMutation({
    mutationFn: () => generateMeetingPayments(selectedMeeting, members, payments, meetingFee),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-payments', selectedMeeting] });
      toast({ title: 'تم إنشاء سجلات الدفع للقاء بنجاح' });
    },
    onError: (error) => toast({ title: 'خطأ', description: error.message, variant: 'destructive' }),
  });

  // ── Handlers ──
  const openPaymentDialog = (member: Member) => {
    setSelectedMember(member);
    setPaymentAmount(String(meetingFee));
    setPaymentNotes('');
    setIsPaymentDialogOpen(true);
  };

  const handlePayment = () => {
    if (!selectedMember) return;
    paymentMutation.mutate({ memberId: selectedMember.id, amount: Number(paymentAmount), notes: paymentNotes });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">اشتراكات اللقاءات</h2>
              <p className="text-muted-foreground">
                رسوم اللقاء الافتراضية للفوج: <span className="font-bold text-primary">{meetingFee.toLocaleString()} دج</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5" />فلترة وعرض اللقاءات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>الشهر</Label>
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(v === 'all' ? 'all' : Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>السنة</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(v === 'all' ? 'all' : Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>اختر اللقاء</Label>
              <Select value={selectedMeeting} onValueChange={setSelectedMeeting}>
                <SelectTrigger>
                  <SelectValue placeholder={meetingsLoading ? "جاري تحميل اللقاءات..." : "اختر لقاء بناءً على التاريخ"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredMeetings.length === 0 ? (
                    <div className="p-2 text-sm text-center text-muted-foreground">لا توجد لقاءات لمحددات البحث</div>
                  ) : (
                    filteredMeetings.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title} - {format(new Date(m.meeting_date), 'dd MMMM yyyy', { locale: ar })}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedMeeting && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-2 md:col-span-2">
                <Label>حالة الدفع</Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as 'all' | 'paid' | 'unpaid')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="paid">مسددين فقط</SelectItem>
                    <SelectItem value="unpaid">غير مسددين فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMeeting && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => generatePaymentsMutation.mutate()}
              disabled={generatePaymentsMutation.isPending || members.length === 0}>
              {generatePaymentsMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin ml-2" />
                : <Plus className="h-4 w-4 ml-2" />}
              توليد سجل الدفع لجميع الأعضاء
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">أعضاء الفوج</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats.totalMembers}</div></CardContent>
            </Card>
            <Card className="border-success/30 bg-success/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-success">مسددين</CardTitle>
                <Check className="h-5 w-5 text-success" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-success">{stats.paidCount}</div></CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-destructive">غير مسددين</CardTitle>
                <X className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-destructive">{stats.unpaidCount}</div></CardContent>
            </Card>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-primary">المحصل</CardTitle>
                <DollarSign className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCollected.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">من {stats.totalExpected.toLocaleString()} دج</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>سجلات الدفع: {selectedMeetingData?.title}</CardTitle>
              <CardDescription>إدارة مدفوعات اللقاء لكل عضو</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">لا يوجد أعضاء مطابقين للبحث</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>العضو</TableHead>
                        <TableHead className="text-center">حالة الدفع</TableHead>
                        <TableHead className="text-center">المبلغ</TableHead>
                        <TableHead className="hidden md:table-cell">ملاحظات</TableHead>
                        <TableHead className="text-left whitespace-nowrap">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow key={member.id} className={member.payment?.is_paid ? 'bg-success/5' : ''}>
                          <TableCell className="font-medium">{member.first_name} {member.last_name}</TableCell>
                          <TableCell className="text-center">
                            {member.payment?.is_paid ? (
                              <Badge className="bg-success text-success-foreground border-success hover:bg-success">مسدد</Badge>
                            ) : (
                              <Badge variant="destructive">غير مسدد</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {member.payment?.is_paid ? (
                              <span className="font-bold text-success">{member.payment.amount.toLocaleString()} دج</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                            {member.payment?.notes || '-'}
                          </TableCell>
                          <TableCell className="text-left">
                            {member.payment?.is_paid ? (
                              <Button variant="outline" size="sm"
                                onClick={() => cancelPaymentMutation.mutate(member.payment!.id)}
                                disabled={cancelPaymentMutation.isPending}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto">
                                إلغاء الدفع
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => openPaymentDialog(member)} className="w-full sm:w-auto">
                                <DollarSign className="h-4 w-4 ml-1" />
                                تسجيل الدفع
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل دفع لقاء للعضو</DialogTitle>
            <DialogDescription>
              تسديد رسوم اللقاء للعضو: <span className="font-bold text-foreground">{selectedMember?.first_name} {selectedMember?.last_name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">المبلغ (دج)</Label>
              <Input id="amount" type="number" min="0" step="100" className="col-span-3"
                value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">ملاحظات</Label>
              <Textarea id="notes" placeholder="أي تفاصيل إضافية عن الدفع..." className="col-span-3"
                value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handlePayment} disabled={paymentMutation.isPending || !paymentAmount}>
              {paymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              تأكيد الدفع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
