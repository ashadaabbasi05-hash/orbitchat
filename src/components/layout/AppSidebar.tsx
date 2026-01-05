import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, Inbox, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import OrbitLogo from '@/components/OrbitLogo';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePendingRequestsCount } from '@/hooks/use-pending-requests';
import { useUnreadMessagesCount } from '@/hooks/use-unread-messages';

const navItems = [
  { icon: Home, label: 'DMs', path: '/home' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Inbox, label: 'Requests', path: '/requests' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const AppSidebar: React.FC = () => {
  const location = useLocation();
  const { profile } = useAuth();
  const pendingRequestsCount = usePendingRequestsCount();
    const unreadMessagesCount = useUnreadMessagesCount();
  
  // Filter nav items based on account visibility
  const visibleNavItems = navItems.filter(item => {
    // Hide Requests tab for public accounts
    if (item.path === '/requests' && profile?.visibility === 'public') {
      return false;
    }
    return true;
  });

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <OrbitLogo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    'text-sidebar-foreground hover:text-sidebar-accent-foreground',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-glow-sm'
                      : 'hover:bg-sidebar-accent/50'
                  )}
                >
                  <div className="relative">
                    <Icon 
                      className={cn(
                        'w-5 h-5 transition-colors',
                        isActive && 'text-primary'
                      )} 
                    />
                    {/* White indicator for pending requests (only if > 0) */}
                    {item.path === '/requests' && pendingRequestsCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse shadow-lg shadow-white/50" />
                    )}
                    {/* White indicator for unread DMs (only if > 0) */}
                    {item.path === '/home' && unreadMessagesCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse shadow-lg shadow-white/50" />
                    )}
                  </div>
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile Mini */}
      {profile && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/30">
            <Avatar className="w-10 h-10 ring-2 ring-primary/30">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {profile.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.display_name || profile.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                @{profile.username}
              </p>
            </div>
            <div className={cn(
              'w-2.5 h-2.5 rounded-full',
              profile.is_online ? 'bg-online' : 'bg-muted-foreground'
            )} />
          </div>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
