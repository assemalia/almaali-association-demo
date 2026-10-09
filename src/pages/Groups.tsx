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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, Loader2, Plus, Users, Edit, Trash2, DollarSign } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Group, Project, Educator } from '@/types';
import { fetchGroupsWithDetails, fetchEducators, createGroup, updateGroup, deleteGroup } from '@/services/groups';

interface GroupFormData {
  name: string;
  project_id: string;
  educator_id: string;
  monthly_fee: string;
  meeting_fee: string;
}

const EMPTY_FORM: GroupFormData = { name: '', project_id: '', educator_id: '', monthly_fee: '', meeting_fee: '' };

export default function GroupsPage() {
  return (
    <RequireAuth>
      <GroupsContent />
    </RequireAuth>
  );
}

function GroupsContent() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState<GroupFormData>({ ...EMPTY_FORM });

  // ── Queries (using services — no N+1) ──
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroupsWithDetails,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name').order('name');
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: educators = [] } = useQuery({
    queryKey: ['educators'],
    queryFn: fetchEducators,
  });

  // ── Mutations (using services) ──
  const createMutation = useMutation({
    mutationFn: (data: GroupFormData) => createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('تم إنشاء الفوج بنجاح');
      resetForm();
    },
    onError: (error) => toast.error('فشل في إنشاء الفوج: ' + error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GroupFormData }) => updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('تم تحديث الفوج بنجاح');
      resetForm();
    },
    onError: (error) => toast.error('فشل في تحديث الفوج: ' + error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('تم حذف الفوج بنجاح');
    },
    onError: (error) => toast.error('فشل في حذف الفوج: ' + error.message),
  });

  // ── Handlers ──
  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingGroup(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      project_id: group.project_id || '',
      educator_id: group.educator_id || '',
      monthly_fee: group.monthly_fee?.toString() || '',
      meeting_fee: group.meeting_fee?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('يرجى إدخال اسم الفوج');
      return;
    }
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <FolderKanban className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
              إدارة الأفواج
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">إنشاء وإدارة المجموعات التربوية</p>
          </div>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة فوج جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingGroup ? 'تعديل الفوج' : 'إضافة فوج جديد'}</DialogTitle>
                    <DialogDescription>
                      {editingGroup ? 'قم بتعديل بيانات الفوج' : 'أدخل بيانات الفوج الجديد'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">اسم الفوج *</Label>
                      <Input id="name" value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="مثال: فوج النور" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project">المشروع</Label>
                      <Select value={formData.project_id || "none"}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value === "none" ? "" : value }))}>
                        <SelectTrigger><SelectValue placeholder="اختر المشروع" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون مشروع</SelectItem>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="educator">المربي المسؤول</Label>
                      <Select value={formData.educator_id || "none"}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, educator_id: value === "none" ? "" : value }))}>
                        <SelectTrigger><SelectValue placeholder="اختر المربي" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">بدون مربي</SelectItem>
                          {educators.map((e) => (
                            <SelectItem key={e.user_id} value={e.user_id}>{e.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthly_fee">الرسوم الشهرية (دج)</Label>
                        <Input id="monthly_fee" type="number" min="0" step="100"
                          value={formData.monthly_fee}
                          onChange={(e) => setFormData(prev => ({ ...prev, monthly_fee: e.target.value }))}
                          placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meeting_fee">رسوم اللقاء (دج)</Label>
                        <Input id="meeting_fee" type="number" min="0" step="50"
                          value={formData.meeting_fee}
                          onChange={(e) => setFormData(prev => ({ ...prev, meeting_fee: e.target.value }))}
                          placeholder="0 (اختياري)" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>إلغاء</Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {(createMutation.isPending || updateMutation.isPending) && (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      )}
                      {editingGroup ? 'تحديث' : 'إضافة'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              قائمة الأفواج
            </CardTitle>
            <CardDescription>جميع الأفواج التربوية المسجلة في النظام</CardDescription>
          </CardHeader>
          <CardContent>
            {groupsLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mb-4 opacity-50" />
                <p>لا توجد أفواج مسجلة بعد</p>
                {isAdmin && <p className="text-sm">اضغط على "إضافة فوج جديد" للبدء</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم الفوج</TableHead>
                      <TableHead className="hidden sm:table-cell">المشروع</TableHead>
                      <TableHead className="hidden md:table-cell">المربي المسؤول</TableHead>
                      <TableHead className="text-center">عدد الأعضاء</TableHead>
                      <TableHead className="hidden sm:table-cell text-center">الرسوم</TableHead>
                      {isAdmin && <TableHead className="text-center">الإجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {group.projects?.name ? (
                            <Badge variant="secondary">{group.projects.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {group.educator_profile?.full_name || (
                            <span className="text-muted-foreground">غير معين</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="gap-1">
                            <Users className="h-3 w-3" />
                            {group.members_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-center">
                          <div className="flex flex-col gap-1 items-center">
                            <Badge variant="outline" className="gap-1 bg-primary/5">
                              <DollarSign className="h-3 w-3" />
                              {group.monthly_fee || 0} دج <span className="text-[10px] text-muted-foreground ml-1">(شهري)</span>
                            </Badge>
                            {group.meeting_fee ? (
                              <Badge variant="outline" className="gap-1 bg-secondary/10">
                                <DollarSign className="h-3 w-3" />
                                {group.meeting_fee} دج <span className="text-[10px] text-muted-foreground ml-1">(للقاء)</span>
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(group)}>
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
                                      سيتم حذف الفوج "{group.name}" نهائياً. هذا الإجراء لا يمكن التراجع عنه.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(group.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      حذف
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
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
