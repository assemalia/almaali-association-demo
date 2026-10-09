import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import Dashboard from './Dashboard';
import PendingApproval from '@/components/PendingApproval';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, isLoading, isApproved } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isApproved) {
    return <PendingApproval />;
  }

  return (
    <MainLayout>
      <Dashboard />
    </MainLayout>
  );
}
