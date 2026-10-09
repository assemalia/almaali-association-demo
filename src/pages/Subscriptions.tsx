import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import RequireAuth from '@/components/layout/RequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { CreditCard, Loader2, Plus, Check, X, AlertTriangle, Filter, DollarSign, Users, Calendar, Building2, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Subscription, Member, Project } from '@/types';
import {
  registerPayment, cancelPayment, generateMonthlySubscriptions,
  fetchSubscriptions, fetchGroupDebts, fetchGroupActiveMembers,
  generateYearsRange,
} from '@/services/subscriptions';
import MeetingPaymentsTab from '@/components/subscriptions/MeetingPaymentsTab';
import DebtsTab from '@/components/subscriptions/DebtsTab';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const MONTHS = [
  { value: 1, label: 'يناير' }, { value: 2, label: 'فبراير' },
  { value: 3, label: 'مارس' }, { value: 4, label: 'أبريل' },
  { value: 5, label: 'مايو' }, { value: 6, label: 'يونيو' },
  { value: 7, label: 'يوليو' }, { value: 8, label: 'أغسطس' },
  { value: 9, label: 'سبتمبر' }, { value: 10, label: 'أكتوبر' },
  { value: 11, label: 'نوفمبر' }, { value: 12, label: 'ديسمبر' },
];

const YEARS = generateYearsRange();

type PaymentStatusFilter = 'all' | 'paid' | 'unpaid';

interface SubscriptionGroup {
  id: string;
  name: string;
  monthly_fee: number | null;
  meeting_fee: number | null;
  project_id: string | null;
}

// ──────────────────────────────────────────────
// Statistics Cards (extracted)
// ──────────────────────────────────────────────
interface StatsProps {
  totalMembers: number;
  paidCount: number;
  unpaidCount: number;
  totalCollected: number;
  totalExpected: number;
}

function StatsCards({ totalMembers, paidCount, unpaidCount, totalCollected, totalExpected }: StatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">أعضاء الفوج</CardTitle>
          <Users className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent><div className="text-2xl font-bold">{totalMembers}</div></CardContent>
      </Card>
      <Card className="border-success/30 bg-success/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-success">مسددين</CardTitle>
          <Check className="h-5 w-5 text-success" />
        </CardHeader>
        <CardContent><div className="text-2xl font-bold text-success">{paidCount}</div></CardContent>
      </Card>
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-destructive">غير مسددين</CardTitle>
          <X className="h-5 w-5 text-destructive" />
        </CardHeader>
        <CardContent><div className="text-2xl font-bold text-destructive">{unpaidCount}</div></CardContent>
      </Card>
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-primary">المحصل</CardTitle>
          <DollarSign className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCollected.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">من {totalExpected.toLocaleString()} دج</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function SubscriptionsPage() {
  return (
    <RequireAuth>
      <SubscriptionsContent />
    </RequireAuth>
  );
}

function SubscriptionsContent() {
  const queryClient = useQueryClient();
  const currentDate = new Date();
  
  // Filters
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusFilter>('all');
  
  // Payment dialog
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<(Member & { monthlyFee: number }) | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // ── Queries (using services) ──
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name').order('name');
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: allGroups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups').select('id, name, monthly_fee, meeting_fee, project_id').order('name');
      if (error) throw error;
      return data as SubscriptionGroup[];
    },
  });

  const filteredGroups = useMemo(() => {
    if (!selectedProject) return [];
    return allGroups.filter((g) => g.project_id === selectedProject);
  }, [allGroups, selectedProject]);

  const selectedGroupData = useMemo(() => allGroups.find((g) => g.id === selectedGroup), [allGroups, selectedGroup]);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', selectedGroup],
    queryFn: () => fetchGroupActiveMembers(selectedGroup),
    enabled: !!selectedGroup,
  });

  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['subscriptions', selectedGroup, selectedMonth, selectedYear],
    queryFn: () => fetchSubscriptions(members.map(m => m.id), selectedMonth, selectedYear),
    enabled: !!selectedGroup && members.length > 0,
  });

  const { data: groupDebts = [] } = useQuery({
    queryKey: ['group-debts', selectedGroup],
    queryFn: () => fetchGroupDebts(members.map(m => m.id)),
    enabled: !!selectedGroup && members.length > 0,
  });

  // ── Derived data ──
  const membersWithSubscriptions = useMemo(() => {
    const monthlyFee = selectedGroupData?.monthly_fee || 0;
    return members.map((member) => ({
      ...member,
      subscription: subscriptions.find((s) => s.member_id === member.id),
      monthlyFee,
    }));
  }, [members, subscriptions, selectedGroupData]);

  const filteredMembersWithSubscriptions = useMemo(() => {
    if (paymentStatus === 'all') return membersWithSubscriptions;
    if (paymentStatus === 'paid') return membersWithSubscriptions.filter((m) => m.subscription?.is_paid);
    return membersWithSubscriptions.filter((m) => !m.subscription?.is_paid);
  }, [membersWithSubscriptions, paymentStatus]);

  const stats = useMemo(() => {
    const totalMembers = members.length;
    const paidCount = membersWithSubscriptions.filter((m) => m.subscription?.is_paid).length;
    const unpaidCount = totalMembers - paidCount;
    const totalCollected = membersWithSubscriptions
      .filter((m) => m.subscription?.is_paid)
      .reduce((sum, m) => sum + (m.subscription?.amount || 0), 0);
    const monthlyFee = selectedGroupData?.monthly_fee || 0;
    const totalExpected = totalMembers * monthlyFee;
    const totalDebts = groupDebts.reduce((sum, d) => sum + d.amount, 0);
    return { totalMembers, paidCount, unpaidCount, totalCollected, totalExpected, totalDebts };
  }, [members, membersWithSubscriptions, selectedGroupData, groupDebts]);

  // ── Mutations (using services) ──
  const paymentMutation = useMutation({
    mutationFn: ({ memberId, amount, notes }: { memberId: string; amount: number; notes: string }) =>
      registerPayment(memberId, selectedMonth, selectedYear, amount, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['group-debts'] });
      toast({ title: 'تم تسجيل الدفع بنجاح' });
      setIsPaymentDialogOpen(false);
      setSelectedMember(null);
      setPaymentAmount('');
      setPaymentNotes('');
    },
    onError: (error) => toast({ title: 'خطأ في تسجيل الدفع', description: error.message, variant: 'destructive' }),
  });

  const cancelPaymentMutation = useMutation({
    mutationFn: cancelPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['group-debts'] });
      toast({ title: 'تم إلغاء الدفع' });
    },
    onError: (error) => toast({ title: 'خطأ في إلغاء الدفع', description: error.message, variant: 'destructive' }),
  });

  const generateSubscriptionsMutation = useMutation({
    mutationFn: () => generateMonthlySubscriptions(
      members, subscriptions, selectedMonth, selectedYear, selectedGroupData?.monthly_fee || 0
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['group-debts'] });
      toast({ title: 'تم إنشاء اشتراكات الشهر بنجاح' });
    },
    onError: (error) => toast({ title: 'خطأ', description: error.message, variant: 'destructive' }),
  });

  // ── Handlers ──
  const openPaymentDialog = (member: Member & { monthlyFee: number }) => {
    setSelectedMember(member);
    setPaymentAmount(String(member.monthlyFee));
    setPaymentNotes('');
    setIsPaymentDialogOpen(true);
  };

  const handlePayment = () => {
    if (!selectedMember) return;
    paymentMutation.mutate({ memberId: selectedMember.id, amount: Number(paymentAmount), notes: paymentNotes });
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    setSelectedGroup('');
  };

  const isLoading = membersLoading || subscriptionsLoading;
  const showContent = selectedProject && selectedGroup;

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 max-w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <CreditCard className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
              الاشتراكات والمدفوعات
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">إدارة الرسوم الشهرية والمدفوعات</p>
          </div>
        </div>

        {/* Project & Group Selection */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />اختر المشروع والفوج
            </CardTitle>
            <CardDescription>حدد المشروع أولاً ثم اختر الفوج لعرض اشتراكات أعضائه</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />المشروع
                </Label>
                <Select value={selectedProject} onValueChange={handleProjectChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="اختر المشروع..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />الفوج
                </Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={!selectedProject}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedProject ? "اختر الفوج..." : "اختر المشروع أولاً"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} - {g.monthly_fee?.toLocaleString() || 0} دج/شهر
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {showContent ? (
          <Tabs defaultValue="monthly" className="w-full space-y-6">
            <TabsList className={`grid w-full mx-auto ${selectedGroupData?.meeting_fee ? 'max-w-xl grid-cols-3' : 'max-w-md grid-cols-2'}`}>
              <TabsTrigger value="monthly">الاشتراكات الشهرية</TabsTrigger>
              {selectedGroupData?.meeting_fee && (
                <TabsTrigger value="meeting">
                  اشتراكات اللقاءات
                </TabsTrigger>
              )}
              <TabsTrigger value="debts">الديون والمستحقات</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="space-y-4 sm:space-y-6 mt-0">
              {/* Group Info */}
              <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">{selectedGroupData?.name}</h2>
                    <p className="text-muted-foreground">
                      الرسوم الشهرية: <span className="font-bold text-primary">{selectedGroupData?.monthly_fee?.toLocaleString() || 0} دج</span>
                    </p>
                  </div>
                  <Button onClick={() => generateSubscriptionsMutation.mutate()}
                    disabled={generateSubscriptionsMutation.isPending || members.length === 0}>
                    {generateSubscriptionsMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      : <Plus className="h-4 w-4 ml-2" />}
                    إنشاء اشتراكات الشهر
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Debts Alert */}
            {groupDebts.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>ديون متراكمة في هذا الفوج</AlertTitle>
                <AlertDescription>
                  يوجد {groupDebts.length} اشتراك غير مسدد بإجمالي {stats.totalDebts.toLocaleString()} دج
                </AlertDescription>
              </Alert>
            )}

            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5" />فلترة الاشتراكات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>الشهر</Label>
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>السنة</Label>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>حالة الدفع</Label>
                    <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatusFilter)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="paid">مسددين فقط</SelectItem>
                        <SelectItem value="unpaid">غير مسددين فقط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <StatsCards {...stats} />

            {/* Subscriptions Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  اشتراكات {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                </CardTitle>
                <CardDescription>قائمة أعضاء الفوج وحالة الدفع</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredMembersWithSubscriptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                    <Users className="h-12 w-12 opacity-30" />
                    <p>لا يوجد أعضاء نشطين في هذا الفوج</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8 sm:w-12">#</TableHead>
                          <TableHead>العضو</TableHead>
                          <TableHead className="hidden sm:table-cell">المبلغ</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="hidden md:table-cell">تاريخ الدفع</TableHead>
                          <TableHead className="hidden lg:table-cell">ملاحظات</TableHead>
                          <TableHead className="text-left">الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMembersWithSubscriptions.map((member, index) => (
                          <TableRow key={member.id} className={member.subscription?.is_paid ? 'bg-success/5' : ''}>
                            <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                            <TableCell className="font-medium">{member.first_name} {member.last_name}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {member.subscription?.amount?.toLocaleString() || member.monthlyFee.toLocaleString()} دج
                            </TableCell>
                            <TableCell>
                              {member.subscription?.is_paid ? (
                                <Badge className="bg-success hover:bg-success/90"><Check className="h-3 w-3 ml-1" />مسدد</Badge>
                              ) : (
                                <Badge variant="destructive"><X className="h-3 w-3 ml-1" />غير مسدد</Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {member.subscription?.paid_at
                                ? format(new Date(member.subscription.paid_at), 'dd/MM/yyyy', { locale: ar })
                                : '-'}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground max-w-[150px] truncate">
                              {member.subscription?.notes || '-'}
                            </TableCell>
                            <TableCell>
                              {member.subscription?.is_paid ? (
                                <Button variant="outline" size="sm"
                                  onClick={() => cancelPaymentMutation.mutate(member.subscription!.id)}
                                  disabled={cancelPaymentMutation.isPending}
                                  className="text-destructive border-destructive/30 hover:bg-destructive/10">
                                  {cancelPaymentMutation.isPending
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <><X className="h-4 w-4 ml-1" />إلغاء</>}
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => openPaymentDialog(member)}
                                  className="bg-success hover:bg-success/90">
                                  <Check className="h-4 w-4 ml-1" />تسجيل دفع
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
            </TabsContent>

            {selectedGroupData?.meeting_fee && (
              <TabsContent value="meeting" className="mt-0">
                <MeetingPaymentsTab 
                  groupId={selectedGroup} 
                  members={members} 
                  meetingFee={selectedGroupData.meeting_fee} 
                />
              </TabsContent>
            )}

            <TabsContent value="debts" className="mt-0">
              <DebtsTab groupId={selectedGroup} members={members} monthlyFee={selectedGroupData?.monthly_fee || 0} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">اختر المشروع والفوج</h3>
              <p className="text-muted-foreground max-w-md">
                قم باختيار المشروع ثم الفوج من القوائم أعلاه لعرض اشتراكات الأعضاء وإدارة المدفوعات
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تسجيل دفع</DialogTitle>
              <DialogDescription>
                تسجيل دفع اشتراك {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear} للعضو{' '}
                <span className="font-semibold">{selectedMember?.first_name} {selectedMember?.last_name}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">المبلغ (دج)</Label>
                <Input id="amount" type="number" value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)} placeholder="أدخل المبلغ" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                <Textarea id="notes" value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handlePayment} disabled={paymentMutation.isPending || !paymentAmount}
                className="bg-success hover:bg-success/90">
                {paymentMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  : <Check className="h-4 w-4 ml-2" />}
                تأكيد الدفع
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
