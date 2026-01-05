import React from 'react';
import { cn } from '@/lib/utils';

interface OrbitLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

const OrbitLogo: React.FC<OrbitLogoProps> = ({ 
  size = 'md', 
  className,
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('relative', sizeClasses[size])}>
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/60 animate-pulse" />
        
        {/* Inner glowing orb */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary via-accent to-primary animate-glow-pulse" />
        
        {/* Center dot */}
        <div className="absolute inset-[35%] rounded-full bg-primary-foreground shadow-glow" />
        
        {/* Orbiting dot */}
        <div 
          className="absolute w-2 h-2 rounded-full bg-accent"
          style={{
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'orbit 8s linear infinite',
          }}
        />
      </div>
      
      {showText && (
        <span className={cn(
          'font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent',
          textSizeClasses[size]
        )}>
          Orbit
        </span>
      )}
    </div>
  );
};

export default OrbitLogo;
