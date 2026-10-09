import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CreditCard, UserX, Calendar } from 'lucide-react';

interface AlertsCardProps {
  unpaidSubscriptions: number;
  accessibleGroupIds?: string[];
  isGlobalAccess?: boolean;
}

interface Alert {
  id: string;
  type: 'payment' | 'absence' | 'meeting';
  message: string;
  icon: typeof CreditCard;
  color: string;
}

export default function AlertsCard({ unpaidSubscriptions, accessibleGroupIds, isGlobalAccess }: AlertsCardProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      const alertsList: Alert[] = [];

      try {
        // تنبيه الاشتراكات غير المدفوعة
        if (unpaidSubscriptions > 0) {
          alertsList.push({
            id: 'unpaid',
            type: 'payment',
            message: `${unpaidSubscriptions} عضو لم يسدد رسوم هذا الشهر`,
            icon: CreditCard,
            color: 'bg-warning/10 text-warning',
          });
        }

        // جلب الأعضاء الذين لديهم 3 غيابات متتالية أو أكثر
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: absenceData } = await supabase
          .from('attendance')
          .select('member_id, status, members!inner(first_name, last_name, group_id)')
          .eq('status', 'absent')
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (absenceData) {
          // حساب عدد الغيابات لكل عضو
          const absenceCounts: Record<string, { count: number; name: string }> = {};
          (absenceData as unknown as Array<{ member_id: string; members?: { first_name?: string; last_name?: string } | null }>).forEach((record) => {
            const memberId = record.member_id;
            if (!absenceCounts[memberId]) {
              absenceCounts[memberId] = {
                count: 0,
                name: `${record.members?.first_name} ${record.members?.last_name}`,
              };
            }
            absenceCounts[memberId].count++;
          });

          const frequentAbsences = Object.entries(absenceCounts)
            .filter(([_, data]) => data.count >= 3)
            .length;

          if (frequentAbsences > 0) {
            alertsList.push({
              id: 'absence',
              type: 'absence',
              message: `${frequentAbsences} عضو لديه 3 غيابات أو أكثر هذا الشهر`,
              icon: UserX,
              color: 'bg-destructive/10 text-destructive',
            });
          }
        }

        // تنبيه إذا لم يكن هناك لقاءات مجدولة في الأسبوع القادم
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        let meetingsQuery = supabase
          .from('meetings')
          .select('id')
          .gte('meeting_date', new Date().toISOString().split('T')[0])
          .lte('meeting_date', nextWeek.toISOString().split('T')[0]);

        if (!isGlobalAccess && accessibleGroupIds && accessibleGroupIds.length > 0) {
          meetingsQuery = meetingsQuery.in('group_id', accessibleGroupIds);
        }

        const { data: upcomingMeetings } = await meetingsQuery;

        if (!upcomingMeetings || upcomingMeetings.length === 0) {
          alertsList.push({
            id: 'no-meetings',
            type: 'meeting',
            message: 'لا توجد لقاءات مجدولة في الأسبوع القادم',
            icon: Calendar,
            color: 'bg-info/10 text-info',
          });
        }

        setAlerts(alertsList);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();
  }, [unpaidSubscriptions, accessibleGroupIds, isGlobalAccess]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-warning" />
          التنبيهات
        </CardTitle>
        <CardDescription>أمور تحتاج انتباهك</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>جارٍ التحميل...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p>لا توجد تنبيهات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${alert.color}`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{alert.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
