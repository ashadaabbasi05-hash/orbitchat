import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import MobileNav from './MobileNav';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const AppLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background bg-space-pattern flex">
      {!isMobile && <AppSidebar />}

      <main className={`flex-1 min-h-screen ${isMobile ? 'pb-20' : ''}`}>
        <Outlet />
      </main>

      {isMobile && <MobileNav />}
    </div>
  );
};

export default AppLayout;
