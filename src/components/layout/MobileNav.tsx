import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { navItems } from './AppSidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingRequestsCount } from '@/hooks/use-pending-requests';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages';

const MobileNav: React.FC = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const pendingRequestsCount = usePendingRequestsCount();
  const unreadMessagesCount = useUnreadMessagesCount();

  const visibleNavItems = navItems.filter((item) => {
    if (item.path === '/requests' && profile?.visibility === 'public') {
      return false;
    }
    return true;
  });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/90 backdrop-blur"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.path === '/requests' && pendingRequestsCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse shadow-glow-sm" />
                )}
                {item.path === '/home' && unreadMessagesCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse shadow-glow-sm" />
                )}
              </div>
              <span className="text-[11px] leading-none font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
