import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isSender: boolean;
  isEncrypted?: boolean;
  isSystem?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  timestamp,
  isSender,
  isEncrypted = true,
  isSystem = false,
}) => {
  // System messages have different styling
  if (isSystem) {
    return (
      <div className="flex w-full mb-3 justify-center">
        <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-muted/50 border border-border/50 text-center animate-fade-in">
          <p className="text-sm text-muted-foreground italic">{content}</p>
          <span className="text-xs text-muted-foreground/60 mt-1 block">
            {format(new Date(timestamp), 'p')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full mb-3',
        isSender ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 animate-fade-in',
          isSender
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card border border-border text-card-foreground rounded-bl-md'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        <div
          className={cn(
            'flex items-center gap-1.5 mt-1',
            isSender ? 'justify-end' : 'justify-start'
          )}
        >
          {isEncrypted && (
            <svg
              className={cn(
                'w-3 h-3',
                isSender ? 'text-primary-foreground/60' : 'text-muted-foreground'
              )}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          <span
            className={cn(
              'text-xs',
              isSender ? 'text-primary-foreground/60' : 'text-muted-foreground'
            )}
          >
            {format(new Date(timestamp), 'HH:mm')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
