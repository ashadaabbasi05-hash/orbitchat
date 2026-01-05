import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import RequestCard from '@/components/chat/RequestCard';
import { Loader2, Inbox } from 'lucide-react';
import { toast } from 'sonner';

interface MessageRequest {
  id: string;
  from_user_id: string;
  message: string | null;
  created_at: string;
  from_user: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

const RequestsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRequests();
      
      // Subscribe to new requests
      const channel = supabase
        .channel('message-requests')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_requests',
            filter: `to_user_id=eq.${user.id}`,
          },
          () => {
            fetchRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('message_requests')
        .select('id, from_user_id, message, created_at')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch sender profiles from public_users (no RLS issues)
      const senderIds = data?.map(r => r.from_user_id) || [];
      const { data: senders } = await supabase
        .from('public_users')
        .select('id, username, display_name, avatar_url')
        .in('id', senderIds);

      const sendersMap = new Map(senders?.map(s => [s.id, s]) || []);

      const formattedRequests: MessageRequest[] = (data || []).map(req => {
        const sender = sendersMap.get(req.from_user_id);
        return {
          id: req.id,
          from_user_id: req.from_user_id,
          message: req.message,
          created_at: req.created_at,
          from_user: {
            username: sender?.username || 'Unknown',
            displayName: sender?.display_name || null,
            avatarUrl: sender?.avatar_url || null,
          },
        };
      });

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (request: MessageRequest) => {
    if (!user) return;
    setProcessingId(request.id);

    try {
      // Create a new chat
      console.log('🎉 Starting request acceptance for:', request.id);
      
      // Create a new chat
      console.log('📝 Creating chat via RPC create_chat_with_participants...');
      const { data: chatId, error: chatError } = await supabase
        .rpc('create_chat_with_participants', { target_user_id: request.from_user_id });

      if (chatError || !chatId) {
        console.error('❌ Chat creation failed:', chatError);
        throw chatError || new Error('Chat creation failed');
      }
      console.log('✅ Chat created:', chatId);

      // Get current user's username
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      const myUsername = myProfile?.username || 'Someone';

      // Create system messages for both users
      console.log('💬 Creating system messages...');
      const { error: msgError } = await supabase
        .from('messages')
        .insert([
          {
            chat_id: chatId as string,
            sender_id: user.id,
            encrypted_content: `You accepted ${request.from_user.username}'s message request. Start chatting!`,
            nonce: 'system',
            is_system: true,
          },
          {
            chat_id: chatId as string,
            sender_id: request.from_user_id,
            encrypted_content: `${myUsername} accepted your request. Say hi to start a convo!`,
            nonce: 'system',
            is_system: true,
          },
        ]);

      if (msgError) {
        console.error('⚠️ System message creation failed:', msgError);
        // Don't throw - system messages are optional
      } else {
        console.log('✅ System messages created');
      }

      // Delete the request after accepting
      console.log('🗑️ Deleting request...');
      const { error: deleteError, data: deletedData } = await supabase
        .from('message_requests')
        .delete()
        .eq('id', request.id);

      if (deleteError) {
        console.error('❌ Request deletion failed:', deleteError);
        throw deleteError;
      }
      console.log('✅ Request deleted:', deletedData);

      toast.success('Request accepted!');
      setRequests(prev => prev.filter(r => r.id !== request.id));
      navigate(`/chat/${chatId}`);
    } catch (error: any) {
      console.error('❌ Error accepting request:', error);
      toast.error(error?.message || 'Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: MessageRequest) => {
    setProcessingId(request.id);

    try {
      console.log('🗑️ Attempting to delete request:', request.id);
      
      // Delete the request (sender will have to request again)
      const { error, data } = await supabase
        .from('message_requests')
        .delete()
        .eq('id', request.id)
        .select();

      console.log('🗑️ Delete result:', { data, error });

      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('❌ No rows deleted - RLS policy may be blocking');
        toast.error('Failed to delete: Permission denied. Make sure you ran the updated SQL script!');
        return;
      }

      toast.success('Request deleted');
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error?.message || 'Failed to delete request');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card/30 backdrop-blur-sm">
        <h1 className="text-2xl font-display font-bold text-primary">Message Requests</h1>
        <p className="text-muted-foreground mt-1">
          {requests.length} pending {requests.length === 1 ? 'request' : 'requests'}
        </p>
      </header>

      {/* Requests List */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
            <p className="text-muted-foreground max-w-sm">
              When someone with a private account wants to message you, their request will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                id={request.id}
                fromUser={request.from_user}
                message={request.message}
                createdAt={request.created_at}
                onAccept={() => handleAccept(request)}
                onReject={() => handleReject(request)}
                isLoading={processingId === request.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestsPage;
