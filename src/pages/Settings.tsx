import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import RequireAuth from '@/components/layout/RequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, FolderKanban, BookOpen, UserCircle, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface Topic {
  id: string;
  name: string;
  description: string | null;
}

interface Skill {
  id: string;
  name: string;
  description: string | null;
}

export default function SettingsPage() {
  return <RequireAuth><SettingsContent /></RequireAuth>;
}

function SettingsContent() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // حالة النوافذ المنبثقة
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'project' | 'topic' | 'skill'; item: Project | Topic | Skill } | null>(null);

  // حالة النماذج
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [topicForm, setTopicForm] = useState({ name: '', description: '' });
  const [skillForm, setSkillForm] = useState({ name: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, topicsRes, skillsRes] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('topics').select('*').order('created_at', { ascending: false }),
        supabase.from('skills').select('*').order('created_at', { ascending: false }),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (topicsRes.data) setTopics(topicsRes.data);
      if (skillsRes.data) setSkills(skillsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!projectForm.name.trim()) {
      toast({ title: 'خطأ', description: 'الرجاء إدخال اسم المشروع', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update({ name: projectForm.name, description: projectForm.description || null })
          .eq('id', editingProject.id);

        if (error) throw error;

        setProjects(projects.map(p => p.id === editingProject.id ? { ...p, ...projectForm } : p));
        toast({ title: 'تم التحديث', description: 'تم تحديث المشروع بنجاح' });
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert({ name: projectForm.name, description: projectForm.description || null })
          .select()
          .single();

        if (error) throw error;

        setProjects([data, ...projects]);
        toast({ title: 'تمت الإضافة', description: 'تم إضافة المشروع بنجاح' });
      }

      setProjectDialogOpen(false);
      setEditingProject(null);
      setProjectForm({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving project:', error);
      toast({ title: 'خطأ', description: 'فشل في حفظ المشروع', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTopic = async () => {
    if (!topicForm.name.trim()) {
      toast({ title: 'خطأ', description: 'الرجاء إدخال اسم الموضوع', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingTopic) {
        const { error } = await supabase
          .from('topics')
          .update({ name: topicForm.name, description: topicForm.description || null })
          .eq('id', editingTopic.id);

        if (error) throw error;

        setTopics(topics.map(t => t.id === editingTopic.id ? { ...t, ...topicForm } : t));
        toast({ title: 'تم التحديث', description: 'تم تحديث الموضوع بنجاح' });
      } else {
        const { data, error } = await supabase
          .from('topics')
          .insert({ name: topicForm.name, description: topicForm.description || null })
          .select()
          .single();

        if (error) throw error;

        setTopics([data, ...topics]);
        toast({ title: 'تمت الإضافة', description: 'تم إضافة الموضوع بنجاح' });
      }

      setTopicDialogOpen(false);
      setEditingTopic(null);
      setTopicForm({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving topic:', error);
      toast({ title: 'خطأ', description: 'فشل في حفظ الموضوع', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSkill = async () => {
    if (!skillForm.name.trim()) {
      toast({ title: 'خطأ', description: 'الرجاء إدخال اسم المهارة', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      if (editingSkill) {
        const { error } = await supabase
          .from('skills')
          .update({ name: skillForm.name, description: skillForm.description || null })
          .eq('id', editingSkill.id);

        if (error) throw error;

        setSkills(skills.map(s => s.id === editingSkill.id ? { ...s, ...skillForm } : s));
        toast({ title: 'تم التحديث', description: 'تم تحديث المهارة بنجاح' });
      } else {
        const { data, error } = await supabase
          .from('skills')
          .insert({ name: skillForm.name, description: skillForm.description || null })
          .select()
          .single();

        if (error) throw error;

        setSkills([data, ...skills]);
        toast({ title: 'تمت الإضافة', description: 'تم إضافة المهارة بنجاح' });
      }

      setSkillDialogOpen(false);
      setEditingSkill(null);
      setSkillForm({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving skill:', error);
      toast({ title: 'خطأ', description: 'فشل في حفظ المهارة', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsSaving(true);
    try {
      const table = deleteTarget.type === 'project' ? 'projects' : deleteTarget.type === 'topic' ? 'topics' : 'skills';
      const { error } = await supabase.from(table).delete().eq('id', deleteTarget.item.id);

      if (error) throw error;

      if (deleteTarget.type === 'project') {
        setProjects(projects.filter(p => p.id !== deleteTarget.item.id));
      } else if (deleteTarget.type === 'topic') {
        setTopics(topics.filter(t => t.id !== deleteTarget.item.id));
      } else {
        setSkills(skills.filter(s => s.id !== deleteTarget.item.id));
      }

      toast({ title: 'تم الحذف', description: 'تم حذف العنصر بنجاح' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: 'خطأ', description: 'فشل في حذف العنصر', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectForm({ name: project.name, description: project.description || '' });
    setProjectDialogOpen(true);
  };

  const openEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setTopicForm({ name: topic.name, description: topic.description || '' });
    setTopicDialogOpen(true);
  };

  const openEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillForm({ name: skill.name, description: skill.description || '' });
    setSkillDialogOpen(true);
  };



  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-full">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <SettingsIcon className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
            الإعدادات العامة
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">إدارة المشاريع والمواضيع والتصنيفات</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* المشاريع */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-primary" />
                    المشاريع
                  </CardTitle>
                  <CardDescription>إدارة المشاريع التربوية</CardDescription>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingProject(null);
                      setProjectForm({ name: '', description: '' });
                      setProjectDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد مشاريع
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        {project.description && (
                          <p className="text-sm text-muted-foreground">{project.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditProject(project)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteTarget({ type: 'project', item: project });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* المواضيع */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    المواضيع
                  </CardTitle>
                  <CardDescription>إدارة المواضيع التعليمية والتربوية</CardDescription>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingTopic(null);
                      setTopicForm({ name: '', description: '' });
                      setTopicDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : topics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد مواضيع
                </div>
              ) : (
                <div className="space-y-3">
                  {topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{topic.name}</p>
                        {topic.description && (
                          <p className="text-sm text-muted-foreground">{topic.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditTopic(topic)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteTarget({ type: 'topic', item: topic });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* المهارات */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle className="h-5 w-5 text-primary" />
                    المهارات
                  </CardTitle>
                  <CardDescription>إدارة المهارات والقدرات للأعضاء</CardDescription>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingSkill(null);
                      setSkillForm({ name: '', description: '' });
                      setSkillDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    إضافة
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : skills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد مهارات
                </div>
              ) : (
                <div className="space-y-3">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{skill.name}</p>
                        {skill.description && (
                          <p className="text-sm text-muted-foreground">{skill.description}</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditSkill(skill)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteTarget({ type: 'skill', item: skill });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* نافذة إضافة/تعديل مشروع */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProject ? 'تعديل المشروع' : 'إضافة مشروع جديد'}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات المشروع التربوي
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">اسم المشروع</Label>
              <Input
                id="projectName"
                placeholder="مثال: شباب القيم"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDesc">الوصف (اختياري)</Label>
              <Textarea
                id="projectDesc"
                placeholder="وصف مختصر للمشروع..."
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveProject} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {editingProject ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة/تعديل موضوع */}
      <Dialog open={topicDialogOpen} onOpenChange={setTopicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTopic ? 'تعديل الموضوع' : 'إضافة موضوع جديد'}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات الموضوع التعليمي
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topicName">اسم الموضوع</Label>
              <Input
                id="topicName"
                placeholder="مثال: بناء العقيدة"
                value={topicForm.name}
                onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topicDesc">الوصف (اختياري)</Label>
              <Textarea
                id="topicDesc"
                placeholder="وصف مختصر للموضوع..."
                value={topicForm.description}
                onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopicDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveTopic} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {editingTopic ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة/تعديل مهارة */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSkill ? 'تعديل المهارة' : 'إضافة مهارة جديدة'}
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات المهارة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skillName">اسم المهارة</Label>
              <Input
                id="skillName"
                placeholder="مثال: التصميم الجرافيكي"
                value={skillForm.name}
                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skillDesc">الوصف (اختياري)</Label>
              <Textarea
                id="skillDesc"
                placeholder="وصف مختصر للمهارة..."
                value={skillForm.description}
                onChange={(e) => setSkillForm({ ...skillForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveSkill} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              {editingSkill ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteTarget?.item.name}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
