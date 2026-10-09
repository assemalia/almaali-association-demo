import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import RequireAuth from '@/components/layout/RequireAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Loader2, Shield, Users as UsersIcon, UserCheck, Clock, Settings2 } from 'lucide-react';
import { UserRoleManager } from '@/components/users/UserRoleManager';
import { UserRoleBadges } from '@/components/users/UserRoleBadges';

interface UserRole {
  role: 'admin' | 'educator' | 'subscription_manager';
  is_global: boolean;
}

interface GroupPermission {
  group_id: string;
  permission_type: string;
  group_name?: string;
}

interface UserWithRoles {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  is_approved: boolean;
  created_at: string;
  roles: UserRole[];
  groupPermissions: GroupPermission[];
}

export default function UsersPage() {
  return <RequireAuth><UsersContent /></RequireAuth>;
}

function UsersContent() {
  const { isAdmin, user } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [roleManagerOpen, setRoleManagerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; name: string; roles: UserRole[] } | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch group permissions with group names
      const { data: permissions, error: permissionsError } = await supabase
        .from('user_group_permissions')
        .select(`
          *,
          groups:group_id (name)
        `);

      if (permissionsError) throw permissionsError;

      // Combine data
      const usersWithRoles: UserWithRoles[] = profiles?.map(profile => {
        const userRoles = roles
          ?.filter(r => r.user_id === profile.user_id)
          .map(r => ({ 
            role: r.role as 'admin' | 'educator' | 'subscription_manager', 
            is_global: r.is_global ?? false 
          })) || [];
        
        const userPermissions = permissions
          ?.filter(p => p.user_id === profile.user_id)
          .map(p => ({
            group_id: p.group_id,
            permission_type: p.permission_type,
            group_name: (p.groups as { name: string } | null)?.name
          })) || [];

        return {
          ...profile,
          roles: userRoles.length > 0 ? userRoles : [{ role: 'educator' as const, is_global: false }],
          groupPermissions: userPermissions,
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب قائمة المستخدمين',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleApproval = async (userId: string, approve: boolean) => {
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: approve })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === userId ? { ...u, is_approved: approve } : u
      ));

      toast({
        title: approve ? 'تمت الموافقة' : 'تم الرفض',
        description: approve ? 'تم اعتماد المستخدم بنجاح' : 'تم رفض المستخدم',
      });
    } catch (error) {
      console.error('Error updating approval:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث حالة المستخدم',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openRoleManager = (u: UserWithRoles) => {
    setSelectedUser({
      userId: u.user_id,
      name: u.full_name,
      roles: u.roles
    });
    setRoleManagerOpen(true);
  };



  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 max-w-full">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2 sm:gap-3">
            <Shield className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary flex-shrink-0" />
            <span>إدارة المستخدمين</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm lg:text-base">إدارة صلاحيات المستخدمين والموافقة على الطلبات الجديدة</p>
        </div>

        {/* طلبات معلقة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              طلبات بانتظار الموافقة
              {pendingUsers.length > 0 && (
                <span className="bg-secondary text-secondary-foreground text-sm px-2 py-0.5 rounded-full mr-2">
                  {pendingUsers.length}
                </span>
              )}
            </CardTitle>
            <CardDescription>المستخدمون الذين سجلوا حديثاً وينتظرون الموافقة</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد طلبات معلقة
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {pendingUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{u.full_name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          تسجل في: {new Date(u.created_at).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        size="sm"
                        className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                        onClick={() => handleApproval(u.user_id, true)}
                        disabled={processingId === u.user_id}
                      >
                        {processingId === u.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
                            موافقة
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                        onClick={() => handleApproval(u.user_id, false)}
                        disabled={processingId === u.user_id}
                      >
                        <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
                        رفض
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* المستخدمون المعتمدون */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              المستخدمون المعتمدون
              <span className="bg-secondary text-secondary-foreground text-sm px-2 py-0.5 rounded-full mr-2">
                {approvedUsers.length}
              </span>
            </CardTitle>
            <CardDescription>إدارة صلاحيات المستخدمين النشطين</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : approvedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد مستخدمون معتمدون
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {approvedUsers.map((u) => {
                  const isCurrentUserAdmin = u.roles.some(r => r.role === 'admin');
                  
                  return (
                    <div
                      key={u.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg border bg-card gap-3 sm:gap-4"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCurrentUserAdmin ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          {isCurrentUserAdmin ? (
                            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          ) : (
                            <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{u.full_name}</p>
                          <UserRoleBadges 
                            roles={u.roles} 
                            groupPermissions={u.groupPermissions}
                            compact 
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                          onClick={() => openRoleManager(u)}
                          disabled={u.user_id === user?.id}
                        >
                          <Settings2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1" />
                          <span className="hidden xs:inline">إدارة</span> الصلاحيات
                        </Button>
                        {u.user_id !== user?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
                            onClick={() => handleApproval(u.user_id, false)}
                            disabled={processingId === u.user_id}
                          >
                            إلغاء الموافقة
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* نافذة إدارة الصلاحيات */}
      {selectedUser && (
        <UserRoleManager
          open={roleManagerOpen}
          onOpenChange={setRoleManagerOpen}
          userId={selectedUser.userId}
          userName={selectedUser.name}
          currentRoles={selectedUser.roles}
          onUpdate={fetchUsers}
        />
      )}
    </MainLayout>
  );
}
