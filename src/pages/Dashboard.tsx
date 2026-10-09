import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban, CalendarCheck, CreditCard } from 'lucide-react';
import RecentActivities from '@/components/dashboard/RecentActivities';
import AttendanceChart from '@/components/dashboard/AttendanceChart';
import MemberDistributionChart from '@/components/dashboard/MemberDistributionChart';
import QuickActions from '@/components/dashboard/QuickActions';
import AlertsCard from '@/components/dashboard/AlertsCard';
import DashboardPdfExport from '@/components/dashboard/DashboardPdfExport';
import CalendarWidget from '@/components/dashboard/CalendarWidget';

interface Stats {
  totalMembers: number;
  activeMembers: number;
  totalGroups: number;
  attendanceRate: number;
  unpaidSubscriptions: number;
}

export default function Dashboard() {
  const { isAdmin, isEducator, isSubscriptionManager, roles, groupPermissions } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    totalGroups: 0,
    attendanceRate: 0,
    unpaidSubscriptions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [accessibleGroupIds, setAccessibleGroupIds] = useState<string[]>([]);
  const [isGlobalAccess, setIsGlobalAccess] = useState(false);

  useEffect(() => {
    // تحديد الأفواج المتاحة بناءً على الصلاحيات
    const calculateAccessibleGroups = () => {
      if (isAdmin) {
        setIsGlobalAccess(true);
        return;
      }

      const isGlobalEducator = roles.some(r => r.role === 'educator' && r.is_global);
      const isGlobalSubManager = roles.some(r => r.role === 'subscription_manager' && r.is_global);

      if (isGlobalEducator || isGlobalSubManager) {
        setIsGlobalAccess(true);
        return;
      }

      // جمع الأفواج من صلاحيات المستخدم
      const groupIds = new Set<string>();
      groupPermissions.forEach(perm => groupIds.add(perm.group_id));

      setAccessibleGroupIds(Array.from(groupIds));
      setIsGlobalAccess(false);
    };

    calculateAccessibleGroups();
  }, [isAdmin, roles, groupPermissions]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // جلب عدد الأعضاء
        let membersQuery = supabase
          .from('members')
          .select('*', { count: 'exact', head: true });

        if (!isGlobalAccess && accessibleGroupIds.length > 0) {
          membersQuery = membersQuery.in('group_id', accessibleGroupIds);
        }

        const { count: totalMembers } = await membersQuery;

        let activeMembersQuery = supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        if (!isGlobalAccess && accessibleGroupIds.length > 0) {
          activeMembersQuery = activeMembersQuery.in('group_id', accessibleGroupIds);
        }

        const { count: activeMembers } = await activeMembersQuery;

        // جلب عدد الأفواج
        let groupsQuery = supabase
          .from('groups')
          .select('*', { count: 'exact', head: true });

        if (!isGlobalAccess && accessibleGroupIds.length > 0) {
          groupsQuery = groupsQuery.in('id', accessibleGroupIds);
        }

        const { count: totalGroups } = await groupsQuery;

        // حساب نسبة الحضور (آخر 30 يوم)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('status, meetings!inner(meeting_date)')
          .gte('meetings.meeting_date', thirtyDaysAgo.toISOString().split('T')[0]);

        let attendanceRate = 0;
        if (attendanceData && attendanceData.length > 0) {
          const presentCount = attendanceData.filter(a => a.status === 'present').length;
          attendanceRate = Math.round((presentCount / attendanceData.length) * 100);
        }

        // جلب الاشتراكات غير المدفوعة
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const subscriptionsQuery = supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('is_paid', false)
          .eq('month', currentMonth)
          .eq('year', currentYear);

        const { count: unpaidSubscriptions } = await subscriptionsQuery;

        setStats({
          totalMembers: totalMembers || 0,
          activeMembers: activeMembers || 0,
          totalGroups: totalGroups || 0,
          attendanceRate,
          unpaidSubscriptions: unpaidSubscriptions || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isGlobalAccess, accessibleGroupIds]);

  const statCards = [
    {
      title: 'إجمالي الأعضاء',
      value: stats.totalMembers,
      description: `${stats.activeMembers} نشط`,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      show: true,
    },
    {
      title: 'الأفواج',
      value: stats.totalGroups,
      description: 'مجموعة تربوية',
      icon: FolderKanban,
      color: 'text-info',
      bgColor: 'bg-info/10',
      show: isAdmin || isEducator,
    },
    {
      title: 'نسبة الحضور',
      value: `${stats.attendanceRate}%`,
      description: 'آخر 30 يوم',
      icon: CalendarCheck,
      color: 'text-success',
      bgColor: 'bg-success/10',
      show: isAdmin || isEducator,
    },
    {
      title: 'رسوم غير محصلة',
      value: stats.unpaidSubscriptions,
      description: 'هذا الشهر',
      icon: CreditCard,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      show: isAdmin || isSubscriptionManager,
    },
  ].filter(card => card.show);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full">
      {/* العنوان */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">نظرة عامة على الأنشطة والإحصائيات</p>
        </div>
        <DashboardPdfExport 
          accessibleGroupIds={accessibleGroupIds}
          isGlobalAccess={isGlobalAccess}
          stats={stats}
        />
      </div>

      {/* أزرار الإجراءات السريعة */}
      <QuickActions />

      {/* بطاقات الإحصائيات */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`h-10 w-10 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? '...' : stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* الرسوم البيانية */}
      {(isAdmin || isEducator) && (
        <div className="grid gap-6 md:grid-cols-2">
          <AttendanceChart 
            accessibleGroupIds={accessibleGroupIds} 
            isGlobalAccess={isGlobalAccess} 
          />
          <MemberDistributionChart 
            accessibleGroupIds={accessibleGroupIds} 
            isGlobalAccess={isGlobalAccess} 
          />
        </div>
      )}

      {/* التقويم وآخر النشاطات والتنبيهات */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(isAdmin || isEducator) && <CalendarWidget />}
        <RecentActivities 
          accessibleGroupIds={accessibleGroupIds} 
          isGlobalAccess={isGlobalAccess} 
        />
        {(isAdmin || isSubscriptionManager) && (
          <AlertsCard 
            unpaidSubscriptions={stats.unpaidSubscriptions}
            accessibleGroupIds={accessibleGroupIds}
            isGlobalAccess={isGlobalAccess}
          />
        )}
      </div>
    </div>
  );
}
