import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Calendar, ClipboardCheck, CreditCard, FolderKanban, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function QuickActions() {
  const navigate = useNavigate();
  const { isAdmin, roles } = useAuth();

  const hasEducatorRole = roles.some(r => r.role === 'educator');
  const hasSubscriptionRole = roles.some(r => r.role === 'subscription_manager');

  const actions = [
    {
      label: 'إضافة عضو',
      icon: UserPlus,
      href: '/members',
      color: 'bg-primary/10 text-primary hover:bg-primary/20',
      show: isAdmin || hasEducatorRole,
    },
    {
      label: 'إنشاء لقاء',
      icon: Calendar,
      href: '/attendance',
      color: 'bg-info/10 text-info hover:bg-info/20',
      show: isAdmin || hasEducatorRole,
    },
    {
      label: 'تسجيل حضور',
      icon: ClipboardCheck,
      href: '/attendance',
      color: 'bg-success/10 text-success hover:bg-success/20',
      show: isAdmin || hasEducatorRole,
    },
    {
      label: 'إدارة الاشتراكات',
      icon: CreditCard,
      href: '/subscriptions',
      color: 'bg-warning/10 text-warning hover:bg-warning/20',
      show: isAdmin || hasSubscriptionRole,
    },
    {
      label: 'إدارة الأفواج',
      icon: FolderKanban,
      href: '/groups',
      color: 'bg-accent/10 text-accent-foreground hover:bg-accent/20',
      show: isAdmin,
    },
  ];

  const visibleActions = actions.filter(action => action.show);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          إجراءات سريعة
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">وصول سريع للمهام الشائعة</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {visibleActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="ghost"
                className={`flex flex-col items-center gap-1.5 sm:gap-2 h-auto py-3 sm:py-4 px-2 ${action.color} transition-all min-w-0`}
                onClick={() => navigate(action.href)}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
