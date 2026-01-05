import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the count of pending message requests for the current user
 */
export const usePendingRequestsCount = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    // Initial fetch
    fetchCount();

    // Subscribe to changes
    const channel = supabase
      .channel('pending-requests-count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_requests',
          filter: `to_user_id=eq.${user.id}`,
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
      const { count: pendingCount, error } = await supabase
        .from('message_requests')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;

      setCount(pendingCount || 0);
    } catch (error) {
      console.error('Error fetching pending requests count:', error);
      setCount(0);
    }
  };

  return count;
};
