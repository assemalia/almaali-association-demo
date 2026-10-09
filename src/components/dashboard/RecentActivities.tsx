import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, BookOpen, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'meeting' | 'lesson';
  title: string;
  date: string;
  groupName: string;
}

interface RecentActivitiesProps {
  accessibleGroupIds?: string[];
  isGlobalAccess?: boolean;
}

export default function RecentActivities({ accessibleGroupIds, isGlobalAccess }: RecentActivitiesProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // جلب آخر اللقاءات
        let meetingsQuery = supabase
          .from('meetings')
          .select('id, title, meeting_date, groups!inner(name)')
          .order('meeting_date', { ascending: false })
          .limit(5);

        if (!isGlobalAccess && accessibleGroupIds && accessibleGroupIds.length > 0) {
          meetingsQuery = meetingsQuery.in('group_id', accessibleGroupIds);
        }

        const { data: meetings } = await meetingsQuery;

        // جلب آخر الدروس
        const lessonsQuery = supabase
          .from('lessons')
          .select('id, title, created_at, meetings!inner(meeting_date, groups!inner(name))')
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: lessons } = await lessonsQuery;

        const allActivities: Activity[] = [];

        if (meetings) {
          (meetings as unknown as Array<{ id: string; title: string; meeting_date: string; groups?: { name?: string } | null }>).forEach((meeting) => {
            allActivities.push({
              id: meeting.id,
              type: 'meeting',
              title: meeting.title,
              date: meeting.meeting_date,
              groupName: meeting.groups?.name || 'غير محدد',
            });
          });
        }

        if (lessons) {
          (lessons as unknown as Array<{ id: string; title: string; created_at: string; meetings?: { meeting_date?: string; groups?: { name?: string } | null } | null }>).forEach((lesson) => {
            allActivities.push({
              id: lesson.id,
              type: 'lesson',
              title: lesson.title,
              date: lesson.meetings?.meeting_date || lesson.created_at,
              groupName: lesson.meetings?.groups?.name || 'غير محدد',
            });
          });
        }

        // ترتيب حسب التاريخ
        allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setActivities(allActivities.slice(0, 6));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [accessibleGroupIds, isGlobalAccess]);

  const getIcon = (type: 'meeting' | 'lesson') => {
    return type === 'meeting' ? Calendar : BookOpen;
  };

  const getTypeLabel = (type: 'meeting' | 'lesson') => {
    return type === 'meeting' ? 'لقاء' : 'درس';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          آخر النشاطات
        </CardTitle>
        <CardDescription>أحدث اللقاءات والدروس</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <p>جارٍ التحميل...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            <p>لا توجد نشاطات حديثة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getIcon(activity.type);
              return (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                    activity.type === 'meeting' ? 'bg-primary/10' : 'bg-info/10'
                  }`}>
                    <Icon className={`h-4 w-4 ${
                      activity.type === 'meeting' ? 'text-primary' : 'text-info'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{activity.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {activity.groupName}
                      </span>
                      <span>•</span>
                      <span>{format(new Date(activity.date), 'dd MMM yyyy', { locale: ar })}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    activity.type === 'meeting' ? 'bg-primary/10 text-primary' : 'bg-info/10 text-info'
                  }`}>
                    {getTypeLabel(activity.type)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
