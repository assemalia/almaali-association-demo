import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Sidebar />
      {/* Main content - positioned to the left of sidebar on desktop */}
      <main className="min-h-screen transition-all duration-300 lg:ml-0 lg:mr-72">
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 pt-16 lg:pt-6 xl:pt-8 max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}