import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: ('admin' | 'educator' | 'subscription_manager')[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { isAdmin, isEducator, isSubscriptionManager, isLoading } = useAuth();

  if (isLoading) return null;

  const userRoles = new Set<string>();
  if (isAdmin) userRoles.add('admin');
  if (isEducator) userRoles.add('educator');
  if (isSubscriptionManager) userRoles.add('subscription_manager');

  const hasAccess = allowedRoles.some(role => userRoles.has(role));

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
