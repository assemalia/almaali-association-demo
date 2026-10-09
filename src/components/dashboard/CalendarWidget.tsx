import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { ar } from 'date-fns/locale';

interface Meeting {
  id: string;
  title: string;
  meeting_date: string;
  group_name?: string;
}

const WEEKDAYS_SHORT = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];

export default function CalendarWidget() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    const fetchMeetings = async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const { data } = await supabase
        .from('meetings')
        .select('id, title, meeting_date, groups(name)')
        .gte('meeting_date', format(start, 'yyyy-MM-dd'))
        .lte('meeting_date', format(end, 'yyyy-MM-dd'))
        .order('meeting_date', { ascending: true });

      setMeetings(
        ((data || []) as unknown as Array<{ id: string; title: string; meeting_date: string; groups?: { name?: string } | null }>).map((m) => ({
          id: m.id,
          title: m.title,
          meeting_date: m.meeting_date,
          group_name: m.groups?.name,
        }))
      );
    };

    fetchMeetings();
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [currentMonth]);

  const getMeetingsForDay = (date: Date) =>
    meetings.filter((m) => isSameDay(new Date(m.meeting_date), date));

  // Upcoming meetings (today or future)
  const today = new Date();
  const upcomingMeetings = meetings
    .filter((m) => new Date(m.meeting_date) >= new Date(format(today, 'yyyy-MM-dd')))
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            التقويم
          </CardTitle>
          <Link to="/calendar">
            <Button variant="ghost" size="sm" className="text-xs h-7">
              عرض الكل
            </Button>
          </Link>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronRight className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium">
            {format(currentMonth, 'MMMM yyyy', { locale: ar })}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Mini calendar */}
        <div className="grid grid-cols-7 gap-0.5 mb-3">
          {WEEKDAYS_SHORT.map((day) => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
          {calendarDays.map((day) => {
            const hasMeetings = getMeetingsForDay(day).length > 0;
            const isCurrentMonth = isSameMonth(day, currentMonth);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'aspect-square flex items-center justify-center rounded text-[11px] relative',
                  !isCurrentMonth && 'text-muted-foreground/20',
                  isToday(day) && 'bg-primary text-primary-foreground font-bold',
                  hasMeetings && !isToday(day) && 'font-semibold'
                )}
              >
                {format(day, 'd')}
                {hasMeetings && (
                  <div className={cn(
                    'absolute bottom-0.5 h-1 w-1 rounded-full',
                    isToday(day) ? 'bg-primary-foreground' : 'bg-primary'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Upcoming meetings */}
        {upcomingMeetings.length > 0 && (
          <div className="space-y-2 border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground">لقاءات قادمة</p>
            {upcomingMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{meeting.title}</span>
                <Badge variant="outline" className="text-[10px] shrink-0 mr-2">
                  {format(new Date(meeting.meeting_date), 'd MMM', { locale: ar })}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
