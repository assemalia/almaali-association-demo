import { Badge } from '@/components/ui/badge';
import { Shield, Users, CreditCard, Globe, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserRole {
  role: 'admin' | 'educator' | 'subscription_manager';
  is_global: boolean;
}

interface GroupPermission {
  group_id: string;
  permission_type: string;
  group_name?: string;
}

interface UserRoleBadgesProps {
  roles: UserRole[];
  groupPermissions?: GroupPermission[];
  compact?: boolean;
}

export function UserRoleBadges({ roles, groupPermissions = [], compact = false }: UserRoleBadgesProps) {
  const isAdmin = roles.some(r => r.role === 'admin');
  const educatorRole = roles.find(r => r.role === 'educator');
  const subscriptionRole = roles.find(r => r.role === 'subscription_manager');

  const educatorGroups = groupPermissions
    .filter(p => p.permission_type === 'educator')
    .map(p => p.group_name || p.group_id);

  const subscriptionGroups = groupPermissions
    .filter(p => p.permission_type === 'subscription_manager')
    .map(p => p.group_name || p.group_id);

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-1">
          {isAdmin && (
            <Badge variant="default" className="gap-1">
              <Shield className="h-3 w-3" />
              مدير
            </Badge>
          )}
          
          {educatorRole && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="secondary" 
                  className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  <Users className="h-3 w-3" />
                  مربي
                  {educatorRole.is_global ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Target className="h-3 w-3" />
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {educatorRole.is_global 
                  ? 'مربي عام - جميع الأفواج' 
                  : `مربي: ${educatorGroups.join('، ') || 'لم يتم تحديد أفواج'}`}
              </TooltipContent>
            </Tooltip>
          )}
          
          {subscriptionRole && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="secondary" 
                  className="gap-1 bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400"
                >
                  <CreditCard className="h-3 w-3" />
                  اشتراكات
                  {subscriptionRole.is_global ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Target className="h-3 w-3" />
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {subscriptionRole.is_global 
                  ? 'مسؤول اشتراكات عام - جميع الأفواج' 
                  : `اشتراكات: ${subscriptionGroups.join('، ') || 'لم يتم تحديد أفواج'}`}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      {isAdmin && (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1">
            <Shield className="h-3 w-3" />
            مدير عام
          </Badge>
          <span className="text-sm text-muted-foreground">
            صلاحيات كاملة
          </span>
        </div>
      )}
      
      {educatorRole && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant="secondary" 
            className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            <Users className="h-3 w-3" />
            مربي
          </Badge>
          {educatorRole.is_global ? (
            <Badge variant="outline" className="gap-1">
              <Globe className="h-3 w-3" />
              عام
            </Badge>
          ) : (
            educatorGroups.map(group => (
              <Badge key={group} variant="outline" className="gap-1">
                <Target className="h-3 w-3" />
                {group}
              </Badge>
            ))
          )}
        </div>
      )}
      
      {subscriptionRole && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            variant="secondary" 
            className="gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
          >
            <CreditCard className="h-3 w-3" />
            مسؤول اشتراكات
          </Badge>
          {subscriptionRole.is_global ? (
            <Badge variant="outline" className="gap-1">
              <Globe className="h-3 w-3" />
              عام
            </Badge>
          ) : (
            subscriptionGroups.map(group => (
              <Badge key={group} variant="outline" className="gap-1">
                <Target className="h-3 w-3" />
                {group}
              </Badge>
            ))
          )}
        </div>
      )}
    </div>
  );
}
