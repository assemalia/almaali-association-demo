import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import RequireAuth from '@/components/layout/RequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, Loader2, Plus, ChevronRight, Users, Calendar, Check, X, Clock, ArrowLeft, AlertTriangle, Search, Filter } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Meeting, AttendanceRecord, MemberAbsenceAlert } from '@/types';
import { fetchMeetingsWithCounts, createMeeting, fetchAttendance, upsertAttendance, fetchMemberAbsences } from '@/services/meetings';
import type { AttendanceStatus } from '@/types';

// ──────────────────────────────────────────────
// Attendance Status Badge (extracted)
// ──────────────────────────────────────────────
function StatusBadge({ status }: { status: AttendanceStatus | null }) {
  switch (status) {
    case 'present':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">حاضر</Badge>;
    case 'absent':
      return <Badge variant="destructive">غائب</Badge>;
    case 'excused':
      return <Badge variant="secondary">معذور</Badge>;
    default:
      return <Badge variant="outline">غير مسجل</Badge>;
  }
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function AttendancePage() {
  return (
    <RequireAuth>
      <AttendanceContent />
    </RequireAuth>
  );
}

interface GroupBasic {
  id: string;
  name: string;
}

interface MemberBasic {
  id: string;
  first_name: string;
  last_name: string;
}

function AttendanceContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    meeting_date: format(new Date(), 'yyyy-MM-dd'),
    group_id: '',
  });

  // ── Queries (using services — no N+1) ──
  const { data: memberAbsences = [] } = useQuery({
    queryKey: ['member-absences'],
    queryFn: fetchMemberAbsences,
  });

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: fetchMeetingsWithCounts,
  });

  const filteredMeetings = meetings.filter(meeting => {
    const matchesDate = !dateFilter || meeting.meeting_date === dateFilter;
    const matchesGroup = !groupFilter || meeting.group_id === groupFilter;
    return matchesDate && matchesGroup;
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id, name').order('name');
      if (error) throw error;
      return data as GroupBasic[];
    },
  });

  const { data: groupMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', selectedMeeting?.group_id],
    enabled: !!selectedMeeting?.group_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, first_name, last_name')
        .eq('group_id', selectedMeeting!.group_id)
        .eq('status', 'active')
        .order('first_name');
      if (error) throw error;
      return data as MemberBasic[];
    },
  });

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', selectedMeeting?.id],
    enabled: !!selectedMeeting?.id,
    queryFn: () => fetchAttendance(selectedMeeting!.id),
  });

  // ── Mutations (using services) ──
  const createMeetingMutation = useMutation({
    mutationFn: (data: typeof formData) => createMeeting({ ...data, created_by: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('تم إنشاء اللقاء بنجاح');
      resetForm();
    },
    onError: (error) => toast.error('فشل في إنشاء اللقاء: ' + error.message),
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ memberId, status, notes }: { memberId: string; status: AttendanceStatus; notes?: string }) =>
      upsertAttendance(attendanceRecords, selectedMeeting!.id, memberId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', selectedMeeting?.id] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
    onError: (error) => toast.error('فشل في تحديث الحضور: ' + error.message),
  });

  // ── Handlers ──
  const resetForm = () => {
    setFormData({ title: '', meeting_date: format(new Date(), 'yyyy-MM-dd'), group_id: '' });
    setIsDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('يرجى إدخال عنوان اللقاء'); return; }
    if (!formData.group_id) { toast.error('يرجى اختيار الفوج'); return; }
    createMeetingMutation.mutate(formData);
  };

  const getAttendanceStatus = (memberId: string): AttendanceStatus | null => {
    return attendanceRecords.find(r => r.member_id === memberId)?.status || null;
  };

  // ── Render: Meeting detail view ──
  if (selectedMeeting) {
    return (
      <MainLayout>
        <div className="space-y-4 sm:space-y-6 max-w-full">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedMeeting(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">{selectedMeeting.title}</h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-muted-foreground text-xs sm:text-sm mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedMeeting.meeting_date), 'EEEE d MMMM yyyy', { locale: ar })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {selectedMeeting.groups?.name}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {attendanceRecords.filter(r => r.status === 'present').length}
              </div>
              <div className="text-xs text-muted-foreground">حاضر</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-destructive">
                {attendanceRecords.filter(r => r.status === 'absent').length}
              </div>
              <div className="text-xs text-muted-foreground">غائب</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {attendanceRecords.filter(r => r.status === 'excused').length}
              </div>
              <div className="text-xs text-muted-foreground">معذور</div>
            </Card>
          </div>

          {/* Members list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تسجيل الحضور</CardTitle>
              <CardDescription>اختر حالة الحضور لكل عضو</CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading || attendanceLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : groupMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا يوجد أعضاء في هذا الفوج</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupMembers.map((member) => {
                    const status = getAttendanceStatus(member.id);
                    return (
                      <div key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-medium">{member.first_name[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium">{member.first_name} {member.last_name}</p>
                            <StatusBadge status={status} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="icon" variant={status === 'present' ? 'default' : 'outline'}
                            className={status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                            onClick={() => updateAttendanceMutation.mutate({ memberId: member.id, status: 'present' })}
                            disabled={updateAttendanceMutation.isPending}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant={status === 'absent' ? 'destructive' : 'outline'}
                            onClick={() => updateAttendanceMutation.mutate({ memberId: member.id, status: 'absent' })}
                            disabled={updateAttendanceMutation.isPending}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant={status === 'excused' ? 'secondary' : 'outline'}
                            onClick={() => updateAttendanceMutation.mutate({ memberId: member.id, status: 'excused' })}
                            disabled={updateAttendanceMutation.isPending}>
                            <Clock className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // ── Render: Meetings list view ──
  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <CalendarCheck className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
              نظام الحضور
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">إدارة اللقاءات وتسجيل الحضور</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                لقاء جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>إنشاء لقاء جديد</DialogTitle>
                  <DialogDescription>أدخل بيانات اللقاء التربوي الجديد</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">عنوان اللقاء *</Label>
                    <Input id="title" value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="اللقاء الأسبوعي" maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting_date">تاريخ اللقاء *</Label>
                    <Input id="meeting_date" type="date" value={formData.meeting_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, meeting_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group">الفوج *</Label>
                    <Select value={formData.group_id || "none"}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, group_id: value === "none" ? "" : value }))}>
                      <SelectTrigger><SelectValue placeholder="اختر الفوج" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">اختر الفوج</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button>
                  <Button type="submit" disabled={createMeetingMutation.isPending}>
                    {createMeetingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                    إنشاء
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Absence Alerts */}
        {memberAbsences.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>تنبيه: غيابات متكررة</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {memberAbsences.map((item) => (
                  <div key={item.member.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{item.member.first_name} {item.member.last_name}</span>
                    <span>({item.member.groups?.name})</span>
                    <Badge variant="destructive" className="text-xs">{item.count} غيابات</Badge>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Search className="h-4 w-4" />
                البحث بالتاريخ
              </Label>
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} placeholder="اختر التاريخ" />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Filter className="h-4 w-4" />
                فلترة حسب الفوج
              </Label>
              <Select value={groupFilter || "all"} onValueChange={(value) => setGroupFilter(value === "all" ? "" : value)}>
                <SelectTrigger><SelectValue placeholder="جميع الأفواج" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأفواج</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(dateFilter || groupFilter) && (
              <div className="flex items-end">
                <Button variant="outline" onClick={() => { setDateFilter(''); setGroupFilter(''); }}>
                  مسح الفلاتر
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Meetings List */}
        <Card>
          <CardHeader>
            <CardTitle>اللقاءات</CardTitle>
            <CardDescription>
              {filteredMeetings.length} لقاء {(dateFilter || groupFilter) && `(من ${meetings.length})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {meetingsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredMeetings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{meetings.length === 0 ? 'لا توجد لقاءات بعد' : 'لا توجد لقاءات مطابقة للفلاتر'}</p>
                <p className="text-sm">{meetings.length === 0 ? 'ابدأ بإنشاء لقاء جديد' : 'جرب تغيير معايير البحث'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMeetings.map((meeting) => (
                  <div key={meeting.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedMeeting(meeting)}>
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{meeting.title}</p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                          <span>{format(new Date(meeting.meeting_date), 'd MMMM yyyy', { locale: ar })}</span>
                          <span>•</span>
                          <span>{meeting.groups?.name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {meeting.attendance_count}/{meeting.members_count}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
