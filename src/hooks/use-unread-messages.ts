import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the total count of unread messages across all chats for the current user
 */
export const useUnreadMessagesCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    // Initial fetch
    fetchCount();

    // Subscribe to changes in messages
    const channel = supabase
      .channel('unread-messages-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchCount = async () => {
    if (!user) return;

    try {
      // Get all chats the user is in
      const { data: myChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (!myChats || myChats.length === 0) {
        setCount(0);
        return;
      }

      const chatIds = myChats.map(c => c.chat_id);

      // Count unread messages across all chats
      let totalUnread = 0;

      for (const chatId of chatIds) {
        const lastOpenedTime = sessionStorage.getItem(`chat_opened_${chatId}`);
        
        if (lastOpenedTime) {
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chatId)
            .gt('created_at', lastOpenedTime);

          totalUnread += unreadCount || 0;
        } else {
          // If never opened, count all messages in this chat
          const { count: allCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chatId);

          totalUnread += allCount || 0;
        }
      }

      setCount(totalUnread);
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
      setCount(0);
    }
  };

  return count;
};
