import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Shield, 
  Users as UsersIcon, 
  CreditCard, 
  Loader2, 
  Settings2,
  Globe,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Group {
  id: string;
  name: string;
}

interface UserRole {
  role: 'admin' | 'educator' | 'subscription_manager';
  is_global: boolean;
}

interface UserGroupPermission {
  id: string;
  group_id: string;
  permission_type: string;
}

interface UserRoleManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRoles: UserRole[];
  onUpdate: () => void;
}

type RoleType = 'admin' | 'educator' | 'subscription_manager';

export function UserRoleManager({
  open,
  onOpenChange,
  userId,
  userName,
  currentRoles,
  onUpdate,
}: UserRoleManagerProps) {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Role states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEducator, setIsEducator] = useState(false);
  const [isSubscriptionManager, setIsSubscriptionManager] = useState(false);
  
  // Scope states
  const [educatorScope, setEducatorScope] = useState<'global' | 'specific'>('specific');
  const [subscriptionScope, setSubscriptionScope] = useState<'global' | 'specific'>('specific');
  
  // Selected groups
  const [educatorGroups, setEducatorGroups] = useState<string[]>([]);
  const [subscriptionGroups, setSubscriptionGroups] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name')
        .order('name');
      
      setGroups(groupsData || []);

      // Fetch current roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role, is_global')
        .eq('user_id', userId);

      const roles = rolesData || [];
      
      setIsAdmin(roles.some(r => r.role === 'admin'));
      
      const educatorRole = roles.find(r => r.role === 'educator');
      setIsEducator(!!educatorRole);
      setEducatorScope(educatorRole?.is_global ? 'global' : 'specific');
      
      const subscriptionRole = roles.find(r => r.role === 'subscription_manager');
      setIsSubscriptionManager(!!subscriptionRole);
      setSubscriptionScope(subscriptionRole?.is_global ? 'global' : 'specific');

      // Fetch group permissions
      const { data: permissionsData } = await supabase
        .from('user_group_permissions')
        .select('*')
        .eq('user_id', userId);

      const permissions = permissionsData || [];
      
      setEducatorGroups(
        permissions
          .filter(p => p.permission_type === 'educator')
          .map(p => p.group_id)
      );
      
      setSubscriptionGroups(
        permissions
          .filter(p => p.permission_type === 'subscription_manager')
          .map(p => p.group_id)
      );

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Delete existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // 2. Delete existing group permissions
      await supabase
        .from('user_group_permissions')
        .delete()
        .eq('user_id', userId);

      // 3. Insert new roles
      const newRoles: { user_id: string; role: RoleType; is_global: boolean }[] = [];
      
      if (isAdmin) {
        newRoles.push({ user_id: userId, role: 'admin', is_global: true });
      }
      
      if (isEducator) {
        newRoles.push({ 
          user_id: userId, 
          role: 'educator', 
          is_global: educatorScope === 'global' 
        });
      }
      
      if (isSubscriptionManager) {
        newRoles.push({ 
          user_id: userId, 
          role: 'subscription_manager', 
          is_global: subscriptionScope === 'global' 
        });
      }

      // Ensure at least one role (default to educator if none selected)
      if (newRoles.length === 0) {
        newRoles.push({ user_id: userId, role: 'educator', is_global: false });
      }

      if (newRoles.length > 0) {
        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(newRoles);
        
        if (rolesError) throw rolesError;
      }

      // 4. Insert group permissions
      const newPermissions: { user_id: string; group_id: string; permission_type: string }[] = [];
      
      if (isEducator && educatorScope === 'specific') {
        educatorGroups.forEach(groupId => {
          newPermissions.push({
            user_id: userId,
            group_id: groupId,
            permission_type: 'educator'
          });
        });
      }
      
      if (isSubscriptionManager && subscriptionScope === 'specific') {
        subscriptionGroups.forEach(groupId => {
          newPermissions.push({
            user_id: userId,
            group_id: groupId,
            permission_type: 'subscription_manager'
          });
        });
      }

      if (newPermissions.length > 0) {
        const { error: permissionsError } = await supabase
          .from('user_group_permissions')
          .insert(newPermissions);
        
        if (permissionsError) throw permissionsError;
      }

      toast({
        title: 'تم الحفظ',
        description: 'تم تحديث صلاحيات المستخدم بنجاح',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving roles:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ الصلاحيات',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEducatorGroup = (groupId: string) => {
    setEducatorGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleSubscriptionGroup = (groupId: string) => {
    setSubscriptionGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            إدارة صلاحيات: {userName}
          </DialogTitle>
          <DialogDescription>
            حدد الأدوار والصلاحيات المناسبة لهذا المستخدم
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* دور المدير العام */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="admin-role"
                  checked={isAdmin}
                  onCheckedChange={(checked) => setIsAdmin(!!checked)}
                />
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <Label htmlFor="admin-role" className="font-medium cursor-pointer">
                    مدير عام
                  </Label>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2 mr-8">
                صلاحيات كاملة على جميع الأفواج والإعدادات والمستخدمين
              </p>
            </div>

            {/* دور المربي */}
            <div className="p-4 rounded-lg border bg-card space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="educator-role"
                  checked={isEducator}
                  onCheckedChange={(checked) => setIsEducator(!!checked)}
                  disabled={isAdmin}
                />
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-emerald-600" />
                  <Label htmlFor="educator-role" className="font-medium cursor-pointer">
                    مربي
                  </Label>
                </div>
              </div>
              
              {isEducator && !isAdmin && (
                <div className="mr-8 space-y-4">
                  <RadioGroup
                    value={educatorScope}
                    onValueChange={(value) => setEducatorScope(value as 'global' | 'specific')}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="global" id="educator-global" />
                      <Label htmlFor="educator-global" className="flex items-center gap-2 cursor-pointer">
                        <Globe className="h-4 w-4 text-blue-500" />
                        مربي عام (جميع الأفواج)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="specific" id="educator-specific" />
                      <Label htmlFor="educator-specific" className="flex items-center gap-2 cursor-pointer">
                        <Target className="h-4 w-4 text-orange-500" />
                        مربي أفواج محددة
                      </Label>
                    </div>
                  </RadioGroup>

                  {educatorScope === 'specific' && (
                    <div className="p-3 rounded-md border bg-muted/30 space-y-2">
                      <Label className="text-sm font-medium">اختر الأفواج:</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {groups.map(group => (
                          <div key={group.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`educator-${group.id}`}
                              checked={educatorGroups.includes(group.id)}
                              onCheckedChange={() => toggleEducatorGroup(group.id)}
                            />
                            <Label 
                              htmlFor={`educator-${group.id}`} 
                              className="text-sm cursor-pointer"
                            >
                              {group.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {groups.length === 0 && (
                        <p className="text-sm text-muted-foreground">لا توجد أفواج</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* دور مسؤول الاشتراكات */}
            <div className="p-4 rounded-lg border bg-card space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="subscription-role"
                  checked={isSubscriptionManager}
                  onCheckedChange={(checked) => setIsSubscriptionManager(!!checked)}
                  disabled={isAdmin}
                />
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-violet-600" />
                  <Label htmlFor="subscription-role" className="font-medium cursor-pointer">
                    مسؤول الاشتراكات
                  </Label>
                </div>
              </div>
              
              {isSubscriptionManager && !isAdmin && (
                <div className="mr-8 space-y-4">
                  <RadioGroup
                    value={subscriptionScope}
                    onValueChange={(value) => setSubscriptionScope(value as 'global' | 'specific')}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="global" id="subscription-global" />
                      <Label htmlFor="subscription-global" className="flex items-center gap-2 cursor-pointer">
                        <Globe className="h-4 w-4 text-blue-500" />
                        مسؤول اشتراكات عام (جميع الأفواج)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="specific" id="subscription-specific" />
                      <Label htmlFor="subscription-specific" className="flex items-center gap-2 cursor-pointer">
                        <Target className="h-4 w-4 text-orange-500" />
                        مسؤول اشتراكات أفواج محددة
                      </Label>
                    </div>
                  </RadioGroup>

                  {subscriptionScope === 'specific' && (
                    <div className="p-3 rounded-md border bg-muted/30 space-y-2">
                      <Label className="text-sm font-medium">اختر الأفواج:</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {groups.map(group => (
                          <div key={group.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`subscription-${group.id}`}
                              checked={subscriptionGroups.includes(group.id)}
                              onCheckedChange={() => toggleSubscriptionGroup(group.id)}
                            />
                            <Label 
                              htmlFor={`subscription-${group.id}`} 
                              className="text-sm cursor-pointer"
                            >
                              {group.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                      {groups.length === 0 && (
                        <p className="text-sm text-muted-foreground">لا توجد أفواج</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ملاحظة */}
            {isAdmin && (
              <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                <p className="text-sm text-primary">
                  <Shield className="h-4 w-4 inline ml-1" />
                  المدير العام لديه صلاحيات كاملة على جميع الأفواج تلقائياً
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            حفظ الصلاحيات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
