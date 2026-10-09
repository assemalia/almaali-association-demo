import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  group_id: string;
  group_name?: string;
}

const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function CalendarPage() {
  const { isAdmin, isEducator, isSubscriptionManager, roles, groupPermissions } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      setIsLoading(true);
      try {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);

        const { data, error } = await supabase
          .from('meetings')
          .select('id, title, meeting_date, group_id, groups(name)')
          .gte('meeting_date', format(start, 'yyyy-MM-dd'))
          .lte('meeting_date', format(end, 'yyyy-MM-dd'))
          .order('meeting_date', { ascending: true });

        if (error) throw error;

        setMeetings(
          ((data || []) as unknown as Array<{ id: string; title: string; meeting_date: string; group_id: string; groups?: { name?: string } | null }>).map((m) => ({
            id: m.id,
            title: m.title,
            meeting_date: m.meeting_date,
            group_id: m.group_id,
            group_name: m.groups?.name,
          }))
        );
      } catch (error) {
        console.error('Error fetching meetings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeetings();
  }, [currentMonth]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const getMeetingsForDay = (date: Date) => {
    return meetings.filter((m) => isSameDay(new Date(m.meeting_date), date));
  };

  const selectedDayMeetings = selectedDate ? getMeetingsForDay(selectedDate) : [];

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 max-w-full">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            التقويم
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            عرض اللقاءات والأحداث
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
                <CardTitle className="text-lg">
                  {format(currentMonth, 'MMMM yyyy', { locale: ar })}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dayMeetings = getMeetingsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all',
                        !isCurrentMonth && 'text-muted-foreground/30',
                        isCurrentMonth && 'hover:bg-accent',
                        isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90',
                        isTodayDate && !isSelected && 'ring-2 ring-primary/50'
                      )}
                    >
                      <span>{format(day, 'd')}</span>
                      {dayMeetings.length > 0 && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayMeetings.slice(0, 3).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                'h-1 w-1 rounded-full',
                                isSelected ? 'bg-primary-foreground' : 'bg-primary'
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedDate
                  ? format(selectedDate, 'EEEE d MMMM', { locale: ar })
                  : 'اختر يوماً'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  انقر على يوم لعرض اللقاءات
                </p>
              ) : selectedDayMeetings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  لا توجد لقاءات في هذا اليوم
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDayMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <p className="font-medium text-sm">{meeting.title}</p>
                      {meeting.group_name && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {meeting.group_name}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
