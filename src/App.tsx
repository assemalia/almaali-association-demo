import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import RoleGuard from "@/components/layout/RoleGuard";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Users = lazy(() => import("./pages/Users"));
const Settings = lazy(() => import("./pages/Settings"));
const Groups = lazy(() => import("./pages/Groups"));
const Members = lazy(() => import("./pages/Members"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Lessons = lazy(() => import("./pages/Lessons"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
  </div>
);

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/groups" element={<RoleGuard allowedRoles={['admin', 'educator']}><Groups /></RoleGuard>} />
              <Route path="/members" element={<RoleGuard allowedRoles={['admin', 'educator', 'subscription_manager']}><Members /></RoleGuard>} />
              <Route path="/attendance" element={<RoleGuard allowedRoles={['admin', 'educator']}><Attendance /></RoleGuard>} />
              <Route path="/lessons" element={<RoleGuard allowedRoles={['admin', 'educator']}><Lessons /></RoleGuard>} />
              <Route path="/subscriptions" element={<RoleGuard allowedRoles={['admin', 'subscription_manager']}><Subscriptions /></RoleGuard>} />
              <Route path="/settings" element={<RoleGuard allowedRoles={['admin']}><Settings /></RoleGuard>} />
              <Route path="/users" element={<RoleGuard allowedRoles={['admin']}><Users /></RoleGuard>} />
              <Route path="/calendar" element={<RoleGuard allowedRoles={['admin', 'educator']}><CalendarPage /></RoleGuard>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
