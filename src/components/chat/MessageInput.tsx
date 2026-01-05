import React, { useState } from 'react';
import { Send, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 md:gap-3 p-3 md:p-4 border-t border-border bg-card/50 backdrop-blur-sm"
    >
      <div className="hidden md:flex items-center gap-2 text-muted-foreground text-xs shrink-0">
        <Lock className="w-3.5 h-3.5" />
        <span>E2E</span>
      </div>
      
      <div className="flex-1 relative">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'w-full resize-none rounded-xl bg-input border border-border px-4 py-3',
            'text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
            'transition-all duration-200',
            'max-h-32 min-h-[48px]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{
            height: 'auto',
            minHeight: '48px',
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
          }}
        />
      </div>

      <Button
        type="submit"
        size="icon"
        disabled={!message.trim() || disabled}
        className="h-12 w-12 md:h-12 md:w-12 rounded-xl shadow-button shrink-0"
      >
        <Send className="w-5 h-5" />
      </Button>
    </form>
  );
};

export default MessageInput;
