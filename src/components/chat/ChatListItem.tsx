import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import OnlineIndicator from '@/components/ui/OnlineIndicator';
import { formatDistanceToNow } from 'date-fns';

interface ChatListItemProps {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  isOnline: boolean;
  hasUnread?: boolean;
  unreadCount?: number;
  lastMessageFromMe?: boolean;
  isActive?: boolean;
  onClick: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  username,
  displayName,
  avatarUrl,
  lastMessage,
  lastMessageTime,
  isOnline,
  hasUnread = false,
  unreadCount = 0,
  lastMessageFromMe = false,
  isActive = false,
  onClick,
}) => {
  // Format unread count display
  const getUnreadLabel = () => {
    if (!unreadCount || unreadCount === 0) return '';
    if (unreadCount === 1) return '1 new message';
    if (unreadCount <= 3) return `${unreadCount} new m..`;
    return '3+ new mes..';
  };

  // Format last message preview
  const getMessagePreview = () => {
    if (!lastMessage) return '';
    const prefix = lastMessageFromMe ? 'you: ' : '';
    return prefix + lastMessage;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl transition-all duration-200',
        'hover:bg-card/80 border border-transparent',
        isActive && 'bg-card border-primary/30 shadow-glow-sm'
      )}
    >
      {/* Avatar with online indicator */}
      <div className="relative shrink-0">
        <Avatar className="w-10 md:w-12 h-10 md:h-12 ring-2 ring-border">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary font-medium">
            {(displayName || username)[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineIndicator isOnline={isOnline} size="md" />
        </div>
        
        {/* Unread indicator dot - bright white */}
        {hasUnread && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse shadow-lg shadow-white/50" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('font-medium truncate text-sm md:text-base', hasUnread ? 'text-white font-semibold' : 'text-foreground')}>
            {displayName || username}
          </p>
          {lastMessageTime && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(lastMessageTime), { addSuffix: false })}
            </span>
          )}
        </div>
        
        {/* Message preview or unread count */}
        <p className={cn(
          'text-sm truncate mt-0.5',
          hasUnread 
            ? 'text-primary font-medium italic' 
            : 'text-muted-foreground'
        )}>
          {hasUnread ? getUnreadLabel() : getMessagePreview()}
        </p>
      </div>
    </button>
  );
};

export default ChatListItem;
