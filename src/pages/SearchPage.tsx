import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import UserCard from '@/components/chat/UserCard';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  visibility: 'public' | 'private';
  is_online: boolean;
}

const SearchPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingChats, setExistingChats] = useState<Map<string, string>>(new Map());
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchExistingChats();
      fetchPendingRequests();

      // Subscribe to request changes to update pending state
      const channel = supabase
        .channel('my-requests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_requests',
            filter: `from_user_id=eq.${user.id}`,
          },
          () => {
            fetchPendingRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        searchUsers();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchExistingChats = async () => {
    if (!user) return;

    try {
      const { data: myParticipations } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (!myParticipations) return;

      const chatIds = myParticipations.map(p => p.chat_id);

      const { data: allParticipants } = await supabase
        .from('chat_participants')
        .select('chat_id, user_id')
        .in('chat_id', chatIds);

      const chatMap = new Map<string, string>();
      allParticipants?.forEach(p => {
        // Only add if not the current user
        if (p.user_id !== user.id) {
          chatMap.set(p.user_id, p.chat_id);
        }
      });

      setExistingChats(chatMap);
    } catch (error) {
      console.error('Error fetching existing chats:', error);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('message_requests')
      .select('to_user_id')
      .eq('from_user_id', user.id)
      .eq('status', 'pending');

    const pendingSet = new Set(data?.map(r => r.to_user_id) || []);
    setPendingRequests(pendingSet);
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Search the public users table - no auth needed!
      const { data, error } = await supabase
        .from('public_users')
        .select('id, username, display_name, avatar_url, bio, visibility, is_online')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .neq('id', user?.id || '')
        .limit(20);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (data) {
        setUsers((data as UserProfile[]) || []);
      } else {
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      toast.error(`Failed to search users: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async (userId: string) => {
    if (!user) {
      toast.error('You must be logged in to message');
      return;
    }

    // Check if chat already exists
    const existingChatId = existingChats.get(userId);
    if (existingChatId) {
      navigate(`/chat/${existingChatId}`);
      return;
    }

    // Check if recipient is private - if so, send request instead
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.visibility === 'private') {
      handleRequest(userId);
      return;
    }

    // Create new chat using secure RPC function
    try {
      const { data: chatId, error } = await supabase
        .rpc('create_chat_with_participants', { target_user_id: userId });

      if (error) throw error;

      navigate(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleRequest = async (userId: string) => {
    if (!user) {
      toast.error('You must be logged in to send a request');
      return;
    }

    try {
      const { error } = await supabase
        .from('message_requests')
        .insert({
          from_user_id: user!.id,
          to_user_id: userId,
        });

      if (error) throw error;

      setPendingRequests(prev => new Set(prev).add(userId));
      toast.success('Message request sent!');
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Request already sent');
      } else {
        toast.error('Failed to send request');
      }
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card/30 backdrop-blur-sm">
        <h1 className="text-2xl font-display font-bold text-primary mb-4">Search Users</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by username or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>
      </header>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : !searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Find people to chat with</h3>
            <p className="text-muted-foreground max-w-sm">
              Search for users by their username or display name
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <h3 className="text-lg font-semibold mb-2">No users found</h3>
            <p className="text-muted-foreground">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((userProfile) => (
              <UserCard
                key={userProfile.id}
                id={userProfile.id}
                username={userProfile.username}
                displayName={userProfile.display_name}
                avatarUrl={userProfile.avatar_url}
                bio={userProfile.bio}
                visibility={userProfile.visibility}
                isOnline={userProfile.is_online}
                hasExistingChat={existingChats.has(userProfile.id)}
                hasPendingRequest={pendingRequests.has(userProfile.id)}
                onMessage={() => handleMessage(userProfile.id)}
                onRequest={() => handleRequest(userProfile.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
