import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  FolderKanban,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import logo from '@/assets/logo.jpg';
import { ThemeToggle } from '@/components/ThemeToggle';
import NotificationBell from '@/components/notifications/NotificationBell';

interface NavItem {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  roles: ('admin' | 'educator' | 'subscription_manager')[];
}

const allNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', href: '/', roles: ['admin', 'educator', 'subscription_manager'] },
  { icon: FolderKanban, label: 'الأفواج', href: '/groups', roles: ['admin', 'educator'] },
  { icon: Users, label: 'الأعضاء', href: '/members', roles: ['admin', 'educator', 'subscription_manager'] },
  { icon: CalendarCheck, label: 'الحضور', href: '/attendance', roles: ['admin', 'educator'] },
  { icon: GraduationCap, label: 'الدروس', href: '/lessons', roles: ['admin', 'educator'] },
  { icon: CreditCard, label: 'الاشتراكات', href: '/subscriptions', roles: ['admin', 'subscription_manager'] },
  { icon: CalendarDays, label: 'التقويم', href: '/calendar', roles: ['admin', 'educator'] },
  { icon: Settings, label: 'الإعدادات', href: '/settings', roles: ['admin'] },
  { icon: Shield, label: 'إدارة المستخدمين', href: '/users', roles: ['admin'] },
];

export default function Sidebar() {
  const location = useLocation();
  const { profile, isAdmin, isEducator, isSubscriptionManager, signOut } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const userRoles = new Set<string>();
  if (isAdmin) userRoles.add('admin');
  if (isEducator) userRoles.add('educator');
  if (isSubscriptionManager) userRoles.add('subscription_manager');

  const allItems = allNavItems.filter(item =>
    item.roles.some(role => userRoles.has(role))
  );

  return (
    <>
      {/* زر القائمة للموبايل - تصميم محسن */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 z-50 lg:hidden bg-card shadow-lg border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* الخلفية المعتمة للموبايل */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* الشريط الجانبي - تصميم محسن */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-40 h-full w-72 bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 shadow-xl',
          isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-full flex-col">
          {/* الشعار والعنوان - تصميم محسن */}
          <div className="relative p-6 border-b border-sidebar-border bg-gradient-to-l from-sidebar-accent/50 to-transparent">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-card p-1 shadow-lg ring-2 ring-sidebar-primary/50">
                  <img 
                    src={logo} 
                    alt="شعار جمعية المعالي" 
                    className="h-full w-full rounded-full object-contain"
                  />
                </div>
                {/* الإضاءة الذهبية */}
                <div className="absolute -inset-1 rounded-full bg-sidebar-primary/20 blur-md -z-10" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-sidebar-foreground">جمعية المعالي</h2>
                <p className="text-sm text-sidebar-primary font-medium">للعلوم والتربية</p>
              </div>
            </div>
          </div>

          {/* روابط التنقل - تصميم محسن */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <p className="text-xs font-medium text-sidebar-foreground/60 px-4 py-2 uppercase tracking-wider">
              القائمة الرئيسية
            </p>
            <ul className="space-y-1">
              {allItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                          : 'hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground'
                      )}
                    >
                      <div className={cn(
                        'h-8 w-8 rounded-lg flex items-center justify-center transition-all',
                        isActive 
                          ? 'bg-sidebar-primary-foreground/20' 
                          : 'bg-sidebar-accent/50'
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* معلومات المستخدم - تصميم محسن */}
          <div className="border-t border-sidebar-border p-4 bg-sidebar-accent/30">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-sidebar-accent/50">
              <div className="h-12 w-12 rounded-full bg-sidebar-primary/20 flex items-center justify-center ring-2 ring-sidebar-primary/30">
                <UserCircle className="h-7 w-7 text-sidebar-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate text-sidebar-foreground">{profile?.full_name || 'مستخدم'}</p>
                <p className="text-xs text-sidebar-primary font-medium">
                  {isAdmin ? 'مدير عام' : isEducator && isSubscriptionManager ? 'مربي / مسؤول اشتراكات' : isSubscriptionManager ? 'مسؤول اشتراكات' : 'مربي'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <NotificationBell />
              <ThemeToggle variant="sidebar" className="flex-1" />
            </div>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5 ml-3" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}