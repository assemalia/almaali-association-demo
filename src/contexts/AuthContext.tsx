import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  is_approved: boolean;
}

interface UserRole {
  role: 'admin' | 'educator' | 'subscription_manager';
  is_global: boolean;
}

interface GroupPermission {
  group_id: string;
  permission_type: 'educator' | 'subscription_manager';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRole[];
  groupPermissions: GroupPermission[];
  isApproved: boolean;
  isAdmin: boolean;
  isEducator: boolean;
  isSubscriptionManager: boolean;
  isGlobalEducator: boolean;
  isGlobalSubscriptionManager: boolean;
  isLoading: boolean;
  // Helper functions
  canAccessGroupAsEducator: (groupId: string) => boolean;
  canAccessGroupForSubscriptions: (groupId: string) => boolean;
  // Auth methods
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [groupPermissions, setGroupPermissions] = useState<GroupPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (profileData) {
        setProfile(profileData as UserProfile);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role, is_global')
        .eq('user_id', userId);
      
      if (rolesData) {
        setRoles(rolesData.map(r => ({
          role: r.role as 'admin' | 'educator' | 'subscription_manager',
          is_global: r.is_global ?? false
        })));
      }

      // Fetch group permissions
      const { data: permissionsData } = await supabase
        .from('user_group_permissions')
        .select('group_id, permission_type')
        .eq('user_id', userId);
      
      if (permissionsData) {
        setGroupPermissions(permissionsData.map(p => ({
          group_id: p.group_id,
          permission_type: p.permission_type as 'educator' | 'subscription_manager'
        })));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Setup auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer data fetch to avoid race conditions
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setGroupPermissions([]);
        }
        setIsLoading(false);
      }
    );

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
    setGroupPermissions([]);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  // Computed values
  const isAdmin = roles.some(r => r.role === 'admin');
  const isEducator = roles.some(r => r.role === 'educator');
  const isSubscriptionManager = roles.some(r => r.role === 'subscription_manager');
  const isGlobalEducator = roles.some(r => r.role === 'educator' && r.is_global);
  const isGlobalSubscriptionManager = roles.some(r => r.role === 'subscription_manager' && r.is_global);

  // Helper functions
  const canAccessGroupAsEducator = (groupId: string): boolean => {
    if (isAdmin) return true;
    if (isGlobalEducator) return true;
    return groupPermissions.some(p => p.group_id === groupId && p.permission_type === 'educator');
  };

  const canAccessGroupForSubscriptions = (groupId: string): boolean => {
    if (isAdmin) return true;
    if (isGlobalSubscriptionManager) return true;
    return groupPermissions.some(p => p.group_id === groupId && p.permission_type === 'subscription_manager');
  };

  const value = {
    user,
    session,
    profile,
    roles,
    groupPermissions,
    isApproved: profile?.is_approved ?? false,
    isAdmin,
    isEducator,
    isSubscriptionManager,
    isGlobalEducator,
    isGlobalSubscriptionManager,
    isLoading,
    canAccessGroupAsEducator,
    canAccessGroupForSubscriptions,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
