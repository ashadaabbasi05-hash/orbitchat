import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showPulse?: boolean;
}

const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  isOnline,
  size = 'md',
  className,
  showPulse = true,
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-full',
          sizeClasses[size],
          isOnline ? 'bg-online' : 'bg-muted-foreground'
        )}
      />
      {isOnline && showPulse && (
        <div
          className={cn(
            'absolute inset-0 rounded-full bg-online animate-ping opacity-75',
            sizeClasses[size]
          )}
        />
      )}
    </div>
  );
};

export default OnlineIndicator;
