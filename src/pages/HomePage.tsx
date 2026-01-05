import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ChatListItem from '@/components/chat/ChatListItem';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare, Loader2 } from 'lucide-react';
import { decryptMessage, getSymmetricKey } from '@/lib/crypto';

interface ChatWithParticipant {
  chatId: string;
  participant: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_online: boolean;
  };
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  lastMessageFromMe?: boolean;
}

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatWithParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchChats();
      updateOnlineStatus();
    }
  }, [user]);

  const updateOnlineStatus = async () => {
    if (user) {
      // Update in public_users table
      await supabase
        .from('public_users')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }
  };

  const fetchChats = async () => {
    if (!user) return;

    try {
      // Get all chats the user participates in
      const { data: participations, error: partError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      const chatIds = participations.map(p => p.chat_id);

      // Get other participants in these chats
      const { data: allParticipants, error: othersError } = await supabase
        .from('chat_participants')
        .select('chat_id, user_id')
        .in('chat_id', chatIds);

      if (othersError) throw othersError;

      // Filter out current user's participations
      const otherParticipants = (allParticipants || []).filter(p => p.user_id !== user.id);
      
      if (otherParticipants.length === 0) {
        setChats([]);
        setLoading(false);
        return;
      }

      // Get profiles for these participants
      const userIds = otherParticipants.map(p => p.user_id);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_online')
        .in('id', userIds);

      if (profilesError) {
        console.error('Profile fetch error:', profilesError);
        throw profilesError;
      }

      // Create a map of userId -> profile
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Get chat access times from session storage
      const getChatLastOpenedTime = (chatId: string): string | null => {
        const stored = sessionStorage.getItem(`chat_opened_${chatId}`);
        return stored;
      };

      // Get last message for each chat
      const chatData: ChatWithParticipant[] = [];

      for (const participant of otherParticipants || []) {
        const profile = profileMap.get(participant.user_id);
        if (!profile) continue;

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('encrypted_content, nonce, created_at, id, sender_id, is_system')
          .eq('chat_id', participant.chat_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Decrypt the last message if it exists
        let decryptedMessage: string | undefined = undefined;
        let isFromMe = false;
        if (lastMsg) {
          isFromMe = lastMsg.sender_id === user?.id;
          try {
            // System messages are not encrypted
            if (lastMsg.is_system) {
              decryptedMessage = lastMsg.encrypted_content;
            } else {
              const key = getSymmetricKey(participant.chat_id);
              if (key) {
                decryptedMessage = decryptMessage(lastMsg.encrypted_content, lastMsg.nonce, key);
              }
            }
          } catch (error) {
            console.warn('Failed to decrypt message:', error);
            decryptedMessage = '[Encrypted]';
          }
        }

        // Count unread messages (newer than last opened time)
        let unreadCount = 0;
        const lastOpenedTime = getChatLastOpenedTime(participant.chat_id);
        
        if (lastOpenedTime) {
          const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', participant.chat_id)
            .gt('created_at', lastOpenedTime);

          if (!countError) {
            unreadCount = count || 0;
          }
        }

        chatData.push({
          chatId: participant.chat_id,
          participant: {
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            is_online: profile.is_online,
          },
          lastMessage: decryptedMessage ? decryptedMessage.substring(0, 50) : undefined,
          lastMessageTime: lastMsg?.created_at,
          unreadCount: unreadCount,
          lastMessageFromMe: isFromMe,
        });
      }

      // Sort by last message time
      chatData.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setChats(chatData);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    const query = searchQuery.toLowerCase();
    return (
      chat.participant.username.toLowerCase().includes(query) ||
      (chat.participant.display_name?.toLowerCase().includes(query) ?? false)
    );
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 md:px-6 py-4 border-b border-border bg-card/30 backdrop-blur-sm shrink-0">
        <h1 className="text-xl md:text-2xl font-display font-bold text-primary">Home</h1>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 w-full"
          />
        </div>
      </header>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-6 md:w-8 h-6 md:h-8 text-primary" />
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-2">No conversations yet</h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-sm px-4">
              Search for users to start a new encrypted conversation
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <ChatListItem
                key={chat.chatId}
                id={chat.chatId}
                username={chat.participant.username}
                displayName={chat.participant.display_name}
                avatarUrl={chat.participant.avatar_url}
                lastMessage={chat.lastMessage}
                lastMessageTime={chat.lastMessageTime}
                isOnline={chat.participant.is_online}
                hasUnread={chat.unreadCount ? chat.unreadCount > 0 : false}
                unreadCount={chat.unreadCount}
                lastMessageFromMe={chat.lastMessageFromMe}
                onClick={() => {
                  // Record when chat was opened
                  sessionStorage.setItem(`chat_opened_${chat.chatId}`, new Date().toISOString());
                  navigate(`/chat/${chat.chatId}`);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
