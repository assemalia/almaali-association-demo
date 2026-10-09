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
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Loader2, Plus, Calendar, Edit, Trash2, 
  Mic, GraduationCap, FileText, User, ChevronDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Meeting, Lesson, Topic } from '@/types';
import { createMeeting } from '@/services/meetings';

// ──────────────────────────────────────────────
// Extracted: Opening Speech Section
// ──────────────────────────────────────────────
interface OpeningSpeechSectionProps {
  meeting: Meeting;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => void;
}

function OpeningSpeechSection({ meeting, onEdit, onDelete }: OpeningSpeechSectionProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">الكلمة التوجيهية</h3>
        </div>
        <div className="flex items-center gap-2">
          {meeting.opening_speech_title && (
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/20" 
              onClick={(e) => { e.stopPropagation(); onDelete(meeting.id); }}>
              <Trash2 className="h-4 w-4 ml-1" />
              حذف
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(meeting); }}>
            <Edit className="h-4 w-4 ml-2" />
            {meeting.opening_speech_title ? 'تعديل' : 'إضافة'}
          </Button>
        </div>
      </div>
      {meeting.opening_speech_title ? (
        <div className="bg-accent/50 p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{meeting.opening_speech_title}</h4>
            {meeting.opening_speech_presenter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <User className="h-3 w-3" />{meeting.opening_speech_presenter}
              </Badge>
            )}
          </div>
          {meeting.opening_speech_content && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{meeting.opening_speech_content}</p>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لم يتم تسجيل كلمة توجيهية</p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Extracted: Lesson Card
// ──────────────────────────────────────────────
interface LessonCardProps {
  lesson: Lesson;
  index: number;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lessonId: string, meetingId: string) => void;
}

function LessonCard({ lesson, index, onEdit, onDelete }: LessonCardProps) {
  return (
    <div className="bg-accent/30 p-4 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary font-bold text-sm">{index + 1}</span>
          </div>
          <div className="space-y-1">
            <h4 className="font-medium">{lesson.title}</h4>
            <div className="flex items-center gap-2 flex-wrap">
              {lesson.topics?.name && (
                <Badge variant="outline" className="text-xs">{lesson.topics.name}</Badge>
              )}
              {lesson.presenter && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />{lesson.presenter}
                </span>
              )}
            </div>
            {lesson.content && (
              <div className="mt-2 bg-background/50 p-2 rounded text-sm text-muted-foreground">
                <div className="flex items-center gap-1 mb-1 font-medium text-foreground">
                  <FileText className="h-3 w-3" />محتوى الدرس
                </div>
                <p className="whitespace-pre-wrap">{lesson.content}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onEdit(lesson); }}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(lesson.id, lesson.meeting_id); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Form data types
// ──────────────────────────────────────────────
interface OpeningSpeechForm {
  title: string;
  content: string;
  presenter: string;
}

interface LessonForm {
  title: string;
  content: string;
  presenter: string;
  topic_id: string;
}

interface GroupBasic {
  id: string;
  name: string;
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function LessonsPage() {
  return (
    <RequireAuth>
      <LessonsContent />
    </RequireAuth>
  );
}

function LessonsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Filters
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [expandedMeetingId, setExpandedMeetingId] = useState<string>('');
  
  // Dialog states
  const [isOpeningSpeechDialogOpen, setIsOpeningSpeechDialogOpen] = useState(false);
  const [editingMeetingId, setEditingMeetingId] = useState<string>('');
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonMeetingId, setLessonMeetingId] = useState<string>('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<{ id: string; meetingId: string } | null>(null);
  const [deleteMeetingConfirmOpen, setDeleteMeetingConfirmOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const [deleteSpeechConfirmOpen, setDeleteSpeechConfirmOpen] = useState(false);
  const [speechToDeleteMeetingId, setSpeechToDeleteMeetingId] = useState<string | null>(null);
  const [isAddMeetingDialogOpen, setIsAddMeetingDialogOpen] = useState(false);
  
  // Form data
  const [addMeetingForm, setAddMeetingForm] = useState({ title: '', meeting_date: format(new Date(), 'yyyy-MM-dd'), group_id: '' });
  const [meetingForm, setMeetingForm] = useState({ title: '', meeting_date: '' });
  const [openingSpeechForm, setOpeningSpeechForm] = useState<OpeningSpeechForm>({
    title: '', content: '', presenter: ''
  });
  const [lessonForm, setLessonForm] = useState<LessonForm>({
    title: '', content: '', presenter: '', topic_id: ''
  });

  // ── Queries ──
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id, name').order('name');
      if (error) throw error;
      return data as GroupBasic[];
    },
  });

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings-for-lessons', selectedGroupId],
    enabled: !!selectedGroupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select(`id, title, meeting_date, group_id,
          opening_speech_title, opening_speech_content, opening_speech_presenter,
          groups:group_id(name)`)
        .eq('group_id', selectedGroupId)
        .order('meeting_date', { ascending: false });
      if (error) throw error;
      return data as Meeting[];
    },
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('topics').select('id, name').order('name');
      if (error) throw error;
      return data as Topic[];
    },
  });

  const { data: lessonsForMeeting = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons', expandedMeetingId],
    enabled: !!expandedMeetingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select(`id, meeting_id, topic_id, title, content, presenter, key_points, topics:topic_id(name)`)
        .eq('meeting_id', expandedMeetingId)
        .order('created_at');
      if (error) throw error;
      return data as Lesson[];
    },
  });

  const { data: lessonsCount = {} } = useQuery({
    queryKey: ['lessons-count', selectedGroupId],
    enabled: !!selectedGroupId && meetings.length > 0,
    queryFn: async () => {
      const meetingIds = meetings.map(m => m.id);
      const { data, error } = await supabase
        .from('lessons').select('meeting_id').in('meeting_id', meetingIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach(lesson => { counts[lesson.meeting_id] = (counts[lesson.meeting_id] || 0) + 1; });
      return counts;
    },
  });

  // ── Mutations ──
  const createMeetingMutation = useMutation({
    mutationFn: (data: typeof addMeetingForm) => createMeeting({ ...data, created_by: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings-for-lessons'] });
      toast.success('تم إنشاء اللقاء بنجاح');
      resetAddMeetingForm();
    },
    onError: (error) => toast.error('فشل في إنشاء اللقاء: ' + error.message),
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({ meetingId, data }: { meetingId: string; data: { title: string; meeting_date: string } }) => {
      const { error } = await supabase.from('meetings').update({
        title: data.title,
        meeting_date: data.meeting_date,
      }).eq('id', meetingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings-for-lessons'] });
      toast.success('تم تحديث اللقاء بنجاح');
      setIsMeetingDialogOpen(false);
      setEditingMeeting(null);
    },
    onError: (error) => toast.error('فشل في تحديث اللقاء: ' + error.message),
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase.from('meetings').delete().eq('id', meetingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings-for-lessons'] });
      queryClient.invalidateQueries({ queryKey: ['lessons-count'] });
      toast.success('تم حذف اللقاء بنجاح');
      setDeleteMeetingConfirmOpen(false);
      setMeetingToDelete(null);
      setExpandedMeetingId('');
    },
    onError: (error) => toast.error('فشل في حذف اللقاء: ' + error.message),
  });

  const deleteOpeningSpeechMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const { error } = await supabase.from('meetings').update({
        opening_speech_title: null,
        opening_speech_content: null,
        opening_speech_presenter: null,
      }).eq('id', meetingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings-for-lessons'] });
      toast.success('تم حذف الكلمة التوجيهية بنجاح');
      setDeleteSpeechConfirmOpen(false);
      setSpeechToDeleteMeetingId(null);
    },
    onError: (error) => toast.error('فشل في حذف الكلمة التوجيهية: ' + error.message),
  });

  const updateOpeningSpeechMutation = useMutation({
    mutationFn: async ({ meetingId, data }: { meetingId: string; data: OpeningSpeechForm }) => {
      const { error } = await supabase.from('meetings').update({
        opening_speech_title: data.title || null,
        opening_speech_content: data.content || null,
        opening_speech_presenter: data.presenter || null,
      }).eq('id', meetingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings-for-lessons'] });
      toast.success('تم حفظ الكلمة التوجيهية بنجاح');
      setIsOpeningSpeechDialogOpen(false);
      setEditingMeetingId('');
    },
    onError: (error) => toast.error('فشل في حفظ الكلمة التوجيهية: ' + error.message),
  });

  const saveLessonMutation = useMutation({
    mutationFn: async ({ meetingId, data }: { meetingId: string; data: LessonForm & { id?: string } }) => {
      const payload = {
        title: data.title,
        content: data.content || null,
        presenter: data.presenter || null,
        topic_id: data.topic_id && data.topic_id !== 'none' ? data.topic_id : null,
      };
      if (data.id) {
        const { error } = await supabase.from('lessons').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lessons').insert({ ...payload, meeting_id: meetingId });
        if (error) throw error;
      }
      return meetingId;
    },
    onSuccess: (meetingId) => {
      queryClient.invalidateQueries({ queryKey: ['lessons', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['lessons-count'] });
      toast.success(editingLesson ? 'تم تحديث الدرس بنجاح' : 'تم إضافة الدرس بنجاح');
      resetLessonForm();
    },
    onError: (error) => toast.error('فشل في حفظ الدرس: ' + error.message),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async ({ lessonId, meetingId }: { lessonId: string; meetingId: string }) => {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
      return meetingId;
    },
    onSuccess: (meetingId) => {
      queryClient.invalidateQueries({ queryKey: ['lessons', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['lessons-count'] });
      toast.success('تم حذف الدرس بنجاح');
      setDeleteConfirmOpen(false);
      setLessonToDelete(null);
    },
    onError: (error) => toast.error('فشل في حذف الدرس: ' + error.message),
  });

  // ── Handlers ──
  const openEditMeetingDialog = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setMeetingForm({
      title: meeting.title,
      meeting_date: meeting.meeting_date ? new Date(meeting.meeting_date).toISOString().split('T')[0] : '',
    });
    setIsMeetingDialogOpen(true);
  };

  const handleSaveMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title.trim()) { toast.error('يرجى إدخال عنوان اللقاء'); return; }
    if (!meetingForm.meeting_date) { toast.error('يرجى تحديد تاريخ اللقاء'); return; }
    if (!editingMeeting) return;
    updateMeetingMutation.mutate({ meetingId: editingMeeting.id, data: meetingForm });
  };

  const handleDeleteMeeting = (meetingId: string) => {
    setMeetingToDelete(meetingId);
    setDeleteMeetingConfirmOpen(true);
  };

  const handleDeleteOpeningSpeech = (meetingId: string) => {
    setSpeechToDeleteMeetingId(meetingId);
    setDeleteSpeechConfirmOpen(true);
  };

  const handleAddMeetingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMeetingForm.title.trim()) { toast.error('يرجى إدخال عنوان اللقاء'); return; }
    if (!addMeetingForm.group_id) { toast.error('يرجى اختيار الفوج'); return; }
    createMeetingMutation.mutate(addMeetingForm);
  };

  const resetAddMeetingForm = () => {
    setAddMeetingForm({ title: '', meeting_date: format(new Date(), 'yyyy-MM-dd'), group_id: '' });
    setIsAddMeetingDialogOpen(false);
  };

  const resetLessonForm = () => {
    setLessonForm({ title: '', content: '', presenter: '', topic_id: '' });
    setEditingLesson(null);
    setLessonMeetingId('');
    setIsLessonDialogOpen(false);
  };

  const openEditLessonDialog = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonMeetingId(lesson.meeting_id);
    setLessonForm({
      title: lesson.title,
      content: lesson.content || '',
      presenter: lesson.presenter || '',
      topic_id: lesson.topic_id || '',
    });
    setIsLessonDialogOpen(true);
  };

  const openAddLessonDialog = (meetingId: string) => {
    setLessonMeetingId(meetingId);
    setLessonForm({ title: '', content: '', presenter: '', topic_id: '' });
    setEditingLesson(null);
    setIsLessonDialogOpen(true);
  };

  const openOpeningSpeechDialog = (meeting: Meeting) => {
    setEditingMeetingId(meeting.id);
    setOpeningSpeechForm({
      title: meeting.opening_speech_title || '',
      content: meeting.opening_speech_content || '',
      presenter: meeting.opening_speech_presenter || '',
    });
    setIsOpeningSpeechDialogOpen(true);
  };

  const handleSaveOpeningSpeech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeetingId) return;
    updateOpeningSpeechMutation.mutate({ meetingId: editingMeetingId, data: openingSpeechForm });
  };

  const handleSaveLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) { toast.error('يرجى إدخال عنوان الدرس'); return; }
    if (!lessonMeetingId) return;
    saveLessonMutation.mutate({ meetingId: lessonMeetingId, data: { ...lessonForm, id: editingLesson?.id } });
  };

  const handleDeleteLesson = (lessonId: string, meetingId: string) => {
    setLessonToDelete({ id: lessonId, meetingId });
    setDeleteConfirmOpen(true);
  };

  const toggleMeeting = (meetingId: string) => {
    setExpandedMeetingId(prev => prev === meetingId ? '' : meetingId);
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 max-w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
              <BookOpen className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
              نظام الدروس
            </h1>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">تسجيل الدروس والكلمات التوجيهية في اللقاءات</p>
          </div>
          <Button className="gap-2" onClick={() => {
            setAddMeetingForm(prev => ({ ...prev, group_id: selectedGroupId || '' }));
            setIsAddMeetingDialogOpen(true);
          }}>
            <Plus className="h-4 w-4" />
            لقاء جديد
          </Button>
        </div>

        {/* Group Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">اختر الفوج التربوي</CardTitle>
            <CardDescription>اختر الفوج لعرض جميع اللقاءات والدروس</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label>الفوج التربوي</Label>
              <Select value={selectedGroupId} onValueChange={(val) => { setSelectedGroupId(val); setExpandedMeetingId(''); }}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="اختر الفوج" /></SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Meetings List */}
        {selectedGroupId && (
          <div className="space-y-4">
            {meetingsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : meetings.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center text-muted-foreground">
                  <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium mb-2">لا توجد لقاءات</h3>
                  <p>لم يتم إنشاء أي لقاءات لهذا الفوج بعد</p>
                </CardContent>
              </Card>
            ) : (
              meetings.map((meeting) => {
                const isExpanded = expandedMeetingId === meeting.id;
                const lessonCount = lessonsCount[meeting.id] || 0;
                const lessons = isExpanded ? lessonsForMeeting : [];
                
                return (
                  <Collapsible key={meeting.id} open={isExpanded} onOpenChange={() => toggleMeeting(meeting.id)}>
                    <Card className={cn("transition-all duration-200", isExpanded && "ring-2 ring-primary/20")}>
                      <CollapsibleTrigger className="w-full text-right">
                        <CardHeader className="cursor-pointer hover:bg-accent/50 rounded-t-lg transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-primary/10">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{meeting.title}</CardTitle>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(meeting.meeting_date), 'EEEE d MMMM yyyy', { locale: ar })}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {lessonCount} {lessonCount === 1 ? 'درس' : 'دروس'}
                                  </Badge>
                                  {meeting.opening_speech_title && (
                                    <Badge variant="outline" className="text-xs">
                                      <Mic className="h-3 w-3 ml-1" />كلمة توجيهية
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary z-10"
                                onClick={(e) => { e.stopPropagation(); openEditMeetingDialog(meeting); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive z-10"
                                onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(meeting.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <ChevronDown className={cn("h-5 w-5 ml-1 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-6">
                          <OpeningSpeechSection meeting={meeting} onEdit={openOpeningSpeechDialog} onDelete={handleDeleteOpeningSpeech} />
                          
                          {/* Lessons Section */}
                          <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">الدروس المقدمة</h3>
                              </div>
                              <Button size="sm" onClick={(e) => { e.stopPropagation(); openAddLessonDialog(meeting.id); }}>
                                <Plus className="h-4 w-4 ml-2" />إضافة درس
                              </Button>
                            </div>

                            {lessonsLoading && isExpanded ? (
                              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                            ) : lessons.length === 0 ? (
                              <div className="text-center py-6 text-muted-foreground">
                                <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">لم يتم تسجيل دروس لهذا اللقاء</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {lessons.map((lesson, index) => (
                                  <LessonCard key={lesson.id} lesson={lesson} index={index}
                                    onEdit={openEditLessonDialog} onDelete={handleDeleteLesson} />
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedGroupId && (
          <Card className="py-12">
            <CardContent className="text-center text-muted-foreground">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">اختر فوجاً لعرض اللقاءات</h3>
              <p>ابدأ باختيار الفوج التربوي من القائمة أعلاه</p>
            </CardContent>
          </Card>
        )}

        {/* Opening Speech Dialog */}
        <Dialog open={isOpeningSpeechDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingMeetingId('');
          setIsOpeningSpeechDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSaveOpeningSpeech}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Mic className="h-5 w-5" />الكلمة التوجيهية</DialogTitle>
                <DialogDescription>أدخل تفاصيل الكلمة التوجيهية للقاء</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="speech_title">عنوان الكلمة</Label>
                  <Input id="speech_title" value={openingSpeechForm.title}
                    onChange={(e) => setOpeningSpeechForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="عنوان الكلمة التوجيهية" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="speech_presenter">مقدم الكلمة</Label>
                  <Input id="speech_presenter" value={openingSpeechForm.presenter}
                    onChange={(e) => setOpeningSpeechForm(prev => ({ ...prev, presenter: e.target.value }))}
                    placeholder="اسم مقدم الكلمة" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="speech_content">محتوى الكلمة</Label>
                  <Textarea id="speech_content" value={openingSpeechForm.content}
                    onChange={(e) => setOpeningSpeechForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="اكتب محتوى الكلمة التوجيهية..." rows={5} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpeningSpeechDialogOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={updateOpeningSpeechMutation.isPending}>
                  {updateOpeningSpeechMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                  حفظ
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Lesson Dialog */}
        <Dialog open={isLessonDialogOpen} onOpenChange={(open) => { if (!open) resetLessonForm(); setIsLessonDialogOpen(open); }}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSaveLesson}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {editingLesson ? 'تعديل الدرس' : 'إضافة درس جديد'}
                </DialogTitle>
                <DialogDescription>أدخل تفاصيل الدرس المقدم في هذا اللقاء</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson_title">عنوان الدرس *</Label>
                  <Input id="lesson_title" value={lessonForm.title}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="عنوان الدرس" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson_topic">الموضوع التعليمي</Label>
                  <Select value={lessonForm.topic_id} onValueChange={(val) => setLessonForm(prev => ({ ...prev, topic_id: val }))}>
                    <SelectTrigger><SelectValue placeholder="اختر الموضوع (اختياري)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون موضوع</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson_presenter">مقدم الدرس</Label>
                  <Input id="lesson_presenter" value={lessonForm.presenter}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, presenter: e.target.value }))}
                    placeholder="اسم مقدم الدرس" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson_content">محتوى الدرس</Label>
                  <Textarea id="lesson_content" value={lessonForm.content}
                    onChange={(e) => setLessonForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="اكتب محتوى الدرس وملخصه..." rows={5} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetLessonForm}>إلغاء</Button>
                <Button type="submit" disabled={saveLessonMutation.isPending}>
                  {saveLessonMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                  {editingLesson ? 'تحديث' : 'إضافة'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف هذا الدرس؟</AlertDialogTitle>
              <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء بعد التأكيد.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => lessonToDelete && deleteLessonMutation.mutate({
                  lessonId: lessonToDelete.id, meetingId: lessonToDelete.meetingId
                })}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteLessonMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Meeting Details Dialog */}
        <Dialog open={isMeetingDialogOpen} onOpenChange={(open) => {
          if (!open) setEditingMeeting(null);
          setIsMeetingDialogOpen(open);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSaveMeeting}>
              <DialogHeader>
                <DialogTitle>تعديل بيانات اللقاء</DialogTitle>
                <DialogDescription>قم بتعديل عنوان أو تاريخ اللقاء</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="meeting_title">عنوان اللقاء *</Label>
                  <Input id="meeting_title" value={meetingForm.title}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="عنوان اللقاء" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting_date">تاريخ اللقاء *</Label>
                  <Input id="meeting_date" type="date" value={meetingForm.meeting_date}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, meeting_date: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsMeetingDialogOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={updateMeetingMutation.isPending}>
                  {updateMeetingMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                  حفظ التعديلات
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Meeting Confirmation */}
        <AlertDialog open={deleteMeetingConfirmOpen} onOpenChange={setDeleteMeetingConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف هذا اللقاء؟</AlertDialogTitle>
              <AlertDialogDescription>سيتم الحذف نهائياً، وهذا قد يؤدي إلى حذف جميع الدروس والكلمات وسجلات الحضور المرتبطة به. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => meetingToDelete && deleteMeetingMutation.mutate(meetingToDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteMeetingMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                حذف اللقاء
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Opening Speech Confirmation */}
        <AlertDialog open={deleteSpeechConfirmOpen} onOpenChange={setDeleteSpeechConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من حذف الكلمة التوجيهية؟</AlertDialogTitle>
              <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء بعد التأكيد.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => speechToDeleteMeetingId && deleteOpeningSpeechMutation.mutate(speechToDeleteMeetingId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleteOpeningSpeechMutation.isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                حذف الكلمة
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Meeting Dialog */}
        <Dialog open={isAddMeetingDialogOpen} onOpenChange={(open) => { if (!open) resetAddMeetingForm(); setIsAddMeetingDialogOpen(open); }}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddMeetingSubmit}>
              <DialogHeader>
                <DialogTitle>إنشاء لقاء جديد</DialogTitle>
                <DialogDescription>أدخل بيانات اللقاء التربوي الجديد</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new_meeting_title">عنوان اللقاء *</Label>
                  <Input id="new_meeting_title" value={addMeetingForm.title}
                    onChange={(e) => setAddMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="اللقاء الأسبوعي" maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_meeting_date">تاريخ اللقاء *</Label>
                  <Input id="new_meeting_date" type="date" value={addMeetingForm.meeting_date}
                    onChange={(e) => setAddMeetingForm(prev => ({ ...prev, meeting_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_meeting_group">الفوج *</Label>
                  <Select value={addMeetingForm.group_id || "none"}
                    onValueChange={(value) => setAddMeetingForm(prev => ({ ...prev, group_id: value === "none" ? "" : value }))}>
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
                <Button type="button" variant="outline" onClick={resetAddMeetingForm}>إلغاء</Button>
                <Button type="submit" disabled={createMeetingMutation.isPending}>
                  {createMeetingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  إنشاء
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
