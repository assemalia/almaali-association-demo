import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Wrapper component that handles the authentication check pattern.
 * Replaces the repeated if(isLoading)/if(!user||!isApproved) pattern in every page.
 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, isApproved, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isApproved) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
