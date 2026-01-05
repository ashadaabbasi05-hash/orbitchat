import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';
import { Loader2, Menu, X } from 'lucide-react';
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

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background bg-space-pattern flex flex-col md:flex-row">
      {/* Mobile header with menu button */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between h-16 bg-sidebar border-b border-sidebar-border px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-sidebar-accent/50 rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6 text-sidebar-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-sidebar-foreground" />
            )}
          </button>
        </div>
      )}

      {/* Sidebar - Fixed on desktop, overlay on mobile */}
      <div
        className={`fixed md:relative inset-0 z-30 md:z-auto transition-transform duration-300 ${
          isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'
        }`}
      >
        <AppSidebar onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
        {isMobile && sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/50 -right-full w-screen"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>

      {/* Main content */}
      <main className="w-full flex-1 md:flex-1 pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
