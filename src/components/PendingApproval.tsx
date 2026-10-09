import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function PendingApproval() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="h-10 w-10 text-warning" />
          </div>
          <CardTitle className="text-2xl">بانتظار الموافقة</CardTitle>
          <CardDescription className="text-base mt-2">
            مرحباً <span className="font-semibold text-foreground">{profile?.full_name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            تم إنشاء حسابك بنجاح. يُرجى الانتظار حتى يقوم المدير بمراجعة طلبك والموافقة عليه.
          </p>
          
          <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
            <p>سيتم إشعارك عند الموافقة على حسابك. يمكنك أيضاً التحقق يدوياً بالضغط على زر "تحديث".</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              تحديث الحالة
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => signOut()}
              className="w-full text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4 ml-2" />
              تسجيل الخروج
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
