import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import RequireAuth from '@/components/layout/RequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Loader2, Plus, Edit, Trash2, Phone, Calendar, BookOpen, MessageCircle, ArrowRight, FolderKanban } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Member, Topic, Skill, GroupWithCount } from '@/types';
import { fetchGroupsWithCount, fetchMembersWithTopicsAndSkills, createMember, updateMember, deleteMember } from '@/services/members';

// ──────────────────────────────────────────────
// Member Form Dialog (extracted component)
// ──────────────────────────────────────────────
interface MemberFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingMember: Member | null;
  formData: MemberFormData;
  setFormData: React.Dispatch<React.SetStateAction<MemberFormData>>;
  selectedTopics: string[];
  onTopicToggle: (id: string) => void;
  selectedSkills: string[];
  onSkillToggle: (id: string) => void;
  groups: { id: string; name: string }[];
  topics: Topic[];
  skills: Skill[];
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  isPending: boolean;
}

interface MemberFormData {
  first_name: string;
  last_name: string;
  phone: string;
  guardian_name: string;
  guardian_phone: string;
  date_of_birth: string;
  group_id: string;
  status: 'active' | 'inactive';
  notes: string;
}

function MemberFormDialog({
  isOpen, onOpenChange, editingMember, formData, setFormData,
  selectedTopics, onTopicToggle, selectedSkills, onSkillToggle,
  groups, topics, skills, onSubmit, onReset, isPending
}: MemberFormDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onReset(); onOpenChange(open); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto w-[95vw]">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{editingMember ? 'تعديل بيانات العضو' : 'إضافة عضو جديد'}</DialogTitle>
            <DialogDescription>
              {editingMember ? 'قم بتعديل بيانات العضو' : 'أدخل بيانات العضو الجديد'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">الاسم الأول *</Label>
                <Input id="first_name" value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="محمد" maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">اللقب *</Label>
                <Input id="last_name" value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="أحمد" maxLength={50} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم هاتف العضو</Label>
                <Input id="phone" type="tel" value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="0555123456" maxLength={20} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">تاريخ الميلاد</Label>
                <Input id="date_of_birth" type="date" value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardian_name">اسم الولي</Label>
                <Input id="guardian_name" value={formData.guardian_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, guardian_name: e.target.value }))}
                  placeholder="اسم الولي (اختياري)" maxLength={50} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardian_phone">رقم هاتف الولي</Label>
                <Input id="guardian_phone" type="tel" value={formData.guardian_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, guardian_phone: e.target.value }))}
                  placeholder="0555123456" maxLength={20} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="group">الفوج</Label>
                <Select value={formData.group_id || "none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, group_id: value === "none" ? "" : value }))}>
                  <SelectTrigger><SelectValue placeholder="اختر الفوج" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فوج</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">الحالة</Label>
                <Select value={formData.status}
                  onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {topics.length > 0 && (
              <div className="space-y-2">
                <Label>المواضيع المتابعة</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 max-h-32 overflow-y-auto">
                  {topics.map((topic) => (
                    <div key={topic.id} className="flex items-center gap-2">
                      <Checkbox id={`topic-${topic.id}`}
                        checked={selectedTopics.includes(topic.id)}
                        onCheckedChange={() => onTopicToggle(topic.id)} />
                      <label htmlFor={`topic-${topic.id}`} className="text-sm cursor-pointer">
                        {topic.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {skills.length > 0 && (
              <div className="space-y-2">
                <Label>المهارات</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 max-h-32 overflow-y-auto">
                  {skills.map((skill) => (
                    <div key={skill.id} className="flex items-center gap-2">
                      <Checkbox id={`skill-${skill.id}`}
                        checked={selectedSkills.includes(skill.id)}
                        onCheckedChange={() => onSkillToggle(skill.id)} />
                      <label htmlFor={`skill-${skill.id}`} className="text-sm cursor-pointer">
                        {skill.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea id="notes" value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="ملاحظات إضافية عن العضو..." rows={3} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onReset}>إلغاء</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {editingMember ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Utility
// ──────────────────────────────────────────────
function formatWhatsAppLink(phone: string) {
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  const formattedPhone = cleanPhone.startsWith('+')
    ? cleanPhone.substring(1)
    : `213${cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone}`;
  return `https://wa.me/${encodeURIComponent(formattedPhone)}`;
}

const EMPTY_FORM: MemberFormData = {
  first_name: '', last_name: '', phone: '', guardian_name: '', guardian_phone: '', date_of_birth: '',
  group_id: '', status: 'active', notes: ''
};

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function MembersPage() {
  return (
    <RequireAuth>
      <MembersContent />
    </RequireAuth>
  );
}

function MembersContent() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [formData, setFormData] = useState<MemberFormData>({ ...EMPTY_FORM });

  // ── Queries (using services) ──
  const { data: groupsWithCount = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups-with-count'],
    queryFn: fetchGroupsWithCount,
  });

  const selectedGroup = groupsWithCount.find(g => g.id === selectedGroupId);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members', selectedGroupId],
    queryFn: () => fetchMembersWithTopicsAndSkills(selectedGroupId!),
    enabled: !!selectedGroupId,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('topics').select('id, name, description').order('name');
      if (error) throw error;
      return data as Topic[];
    },
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase.from('skills').select('id, name, description').order('name');
      if (error) throw error;
      return data as Skill[];
    },
  });

  // ── Mutations (using services) ──
  const createMutation = useMutation({
    mutationFn: async (d: { formData: MemberFormData; topicIds: string[]; skillIds: string[] }) =>
      createMember(d.formData, d.topicIds, d.skillIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['groups-with-count'] });
      toast.success('تم إضافة العضو بنجاح');
      resetForm();
    },
    onError: (error) => toast.error('فشل في إضافة العضو: ' + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: d }: { id: string; data: { formData: MemberFormData; topicIds: string[]; skillIds: string[] } }) =>
      updateMember(id, d.formData, d.topicIds, d.skillIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['groups-with-count'] });
      toast.success('تم تحديث بيانات العضو بنجاح');
      resetForm();
    },
    onError: (error) => toast.error('فشل في تحديث بيانات العضو: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['groups-with-count'] });
      toast.success('تم حذف العضو بنجاح');
    },
    onError: (error) => toast.error('فشل في حذف العضو: ' + error.message),
  });

  // ── Handlers ──
  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setSelectedTopics([]);
    setSelectedSkills([]);
    setEditingMember(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      phone: member.phone || '',
      guardian_name: member.guardian_name || '',
      guardian_phone: member.guardian_phone || '',
      date_of_birth: member.date_of_birth || '',
      group_id: member.group_id || '',
      status: member.status as 'active' | 'inactive',
      notes: member.notes || '',
    });
    setSelectedTopics(member.topics?.map(t => t.id) || []);
    setSelectedSkills(member.skills?.map(s => s.id) || []);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('يرجى إدخال الاسم الأول واللقب');
      return;
    }
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: { formData, topicIds: selectedTopics, skillIds: selectedSkills } });
    } else {
      createMutation.mutate({ formData, topicIds: selectedTopics, skillIds: selectedSkills });
    }
  };

  const handleTopicToggle = (topicId: string) => {
    setSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(id => id !== skillId) : [...prev, skillId]
    );
  };

  const handleOpenAddMember = () => {
    if (selectedGroupId) setFormData(prev => ({ ...prev, group_id: selectedGroupId }));
    setIsDialogOpen(true);
  };

  // ── Render: Groups view ──
  if (!selectedGroupId) {
    return (
      <MainLayout>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-full">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
              إدارة الأعضاء
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">اختر فوجاً لعرض أعضائه</p>
          </div>

          {groupsLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : groupsWithCount.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground pt-6">
                <FolderKanban className="h-12 w-12 mb-4 opacity-50" />
                <p>لا توجد أفواج بعد</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groupsWithCount.map((group) => {
                const memberCount = group.members?.[0]?.count ?? 0;
                return (
                  <Card key={group.id} className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                    onClick={() => setSelectedGroupId(group.id)}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="flex items-center gap-2">
                          <FolderKanban className="h-5 w-5 text-primary" />
                          {group.name}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">{memberCount} عضو</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  // ── Render: Members list view ──
  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 gap-2 -mr-2"
              onClick={() => setSelectedGroupId(null)}>
              <ArrowRight className="h-4 w-4 rotate-180" />
              العودة للأفواج
            </Button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
              {selectedGroup?.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">أعضاء الفوج</p>
          </div>
          <Button className="gap-2" onClick={handleOpenAddMember}>
            <Plus className="h-4 w-4" />
            إضافة عضو جديد
          </Button>
        </div>

        <MemberFormDialog
          isOpen={isDialogOpen} onOpenChange={setIsDialogOpen}
          editingMember={editingMember} formData={formData} setFormData={setFormData}
          selectedTopics={selectedTopics} onTopicToggle={handleTopicToggle}
          selectedSkills={selectedSkills} onSkillToggle={handleSkillToggle}
          groups={groups} topics={topics} skills={skills} onSubmit={handleSubmit} onReset={resetForm}
          isPending={createMutation.isPending || updateMutation.isPending}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              قائمة الأعضاء
            </CardTitle>
            <CardDescription>أعضاء {selectedGroup?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p>لا يوجد أعضاء في هذا الفوج</p>
                <p className="text-sm">اضغط على "إضافة عضو جديد" للبدء</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم الكامل</TableHead>
                      <TableHead className="hidden md:table-cell">الهاتف (ولي الأمر)</TableHead>
                      <TableHead className="hidden lg:table-cell">تاريخ الميلاد</TableHead>
                      <TableHead className="hidden lg:table-cell">المواضيع/المهارات</TableHead>
                      <TableHead className="text-center">الحالة</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.first_name} {member.last_name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {member.phone || member.guardian_phone ? (
                            <div className="flex flex-col gap-1">
                              {member.phone && (
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-xs">
                                    <Phone className="h-3 w-3" />
                                    {member.phone}
                                  </span>
                                  <a href={formatWhatsAppLink(member.phone)} target="_blank" rel="noopener noreferrer"
                                    className="text-green-600 hover:text-green-700" title="تواصل عبر واتساب">
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                </div>
                              )}
                              {member.guardian_phone && (
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className="font-semibold">{member.guardian_name ? `${member.guardian_name}: ` : 'ولي: '}</span>
                                    {member.guardian_phone}
                                  </span>
                                  <a href={formatWhatsAppLink(member.guardian_phone)} target="_blank" rel="noopener noreferrer"
                                    className="text-green-600 hover:text-green-700" title="تواصل عبر واتساب">
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {member.date_of_birth ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(member.date_of_birth), 'yyyy/MM/dd', { locale: ar })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {member.topics && member.topics.length > 0 && member.topics.map((topic) => (
                              <Badge key={`t-${topic.id}`} variant="outline" className="text-xs">
                                <BookOpen className="h-3 w-3 ml-1" />
                                {topic.name}
                              </Badge>
                            ))}
                            {member.skills && member.skills.length > 0 && member.skills.map((skill) => (
                              <Badge key={`s-${skill.id}`} variant="secondary" className="text-xs">
                                {skill.name}
                              </Badge>
                            ))}
                            {(!member.topics || member.topics.length === 0) && (!member.skills || member.skills.length === 0) && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                            {member.status === 'active' ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(member)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    سيتم حذف العضو "{member.first_name} {member.last_name}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate(member.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    حذف
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
