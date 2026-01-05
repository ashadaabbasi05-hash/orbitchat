import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import OnlineIndicator from '@/components/ui/OnlineIndicator';
import { MessageCircle, UserPlus, Lock } from 'lucide-react';

interface UserCardProps {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  visibility: 'public' | 'private';
  isOnline: boolean;
  onMessage: () => void;
  onRequest?: () => void;
  hasExistingChat?: boolean;
  hasPendingRequest?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({
  username,
  displayName,
  avatarUrl,
  bio,
  visibility,
  isOnline,
  onMessage,
  onRequest,
  hasExistingChat = false,
  hasPendingRequest = false,
}) => {
  const isPrivate = visibility === 'private';
  const canMessage = !isPrivate || hasExistingChat;

  return (
    <div className="p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-200 hover:shadow-glow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="w-14 h-14 ring-2 ring-border">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-lg font-medium">
              {(displayName || username)[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-0.5 -right-0.5">
            <OnlineIndicator isOnline={isOnline} size="md" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {displayName || username}
            </h3>
            {isPrivate && (
              <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{username}</p>
          {bio && (
            <p className="text-sm text-foreground/80 mt-2 line-clamp-2">{bio}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {canMessage ? (
          <Button
            onClick={onMessage}
            className="flex-1 gap-2"
            variant="default"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </Button>
        ) : hasPendingRequest ? (
          <Button
            disabled
            className="flex-1 gap-2"
            variant="secondary"
          >
            <UserPlus className="w-4 h-4" />
            Request Pending
          </Button>
        ) : (
          <Button
            onClick={onRequest}
            className="flex-1 gap-2"
            variant="secondary"
          >
            <UserPlus className="w-4 h-4" />
            Request to Message
          </Button>
        )}
      </div>
    </div>
  );
};

export default UserCard;
