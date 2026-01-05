import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RequestCardProps {
  id: string;
  fromUser: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  message?: string | null;
  createdAt: string;
  onAccept: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

const RequestCard: React.FC<RequestCardProps> = ({
  fromUser,
  message,
  createdAt,
  onAccept,
  onReject,
  isLoading = false,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="w-12 h-12 ring-2 ring-border">
          <AvatarImage src={fromUser.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/20 text-primary font-medium">
            {(fromUser.displayName || fromUser.username)[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground">
                {fromUser.displayName || fromUser.username}
              </h3>
              <p className="text-sm text-muted-foreground">@{fromUser.username}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
          </div>
          
          {message && (
            <p className="text-sm text-foreground/80 mt-2 p-3 rounded-lg bg-muted/50">
              "{message}"
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <Button
              onClick={onAccept}
              disabled={isLoading}
              size="sm"
              className="gap-1.5"
            >
              <Check className="w-4 h-4" />
              Accept
            </Button>
            <Button
              onClick={onReject}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="gap-1.5"
            >
              <X className="w-4 h-4" />
              Decline
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
