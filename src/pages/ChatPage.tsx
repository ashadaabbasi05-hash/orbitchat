import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageInput from '@/components/chat/MessageInput';
import OnlineIndicator from '@/components/ui/OnlineIndicator';
import { ArrowLeft, Loader2, Lock, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  encryptMessage,
  decryptMessage,
  getOrCreateChatKey,
} from '@/lib/crypto';

interface ChatMessage {
  id: string;
  sender_id: string;
  encrypted_content: string;
  nonce: string;
  created_at: string;
  is_system?: boolean;
  decryptedContent?: string;
}

interface Participant {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

const ChatPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyExchanging, setKeyExchanging] = useState(false);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const symmetricKey = useRef<Uint8Array | null>(null);
  const messageCountRef = useRef(0); // Track messages to prevent duplicate scroll triggers

  useEffect(() => {
    if (user && chatId) {
      initializeChat();
    }
  }, [user, chatId]);

  useEffect(() => {
    // Only scroll if we actually added new messages
    if (messages.length > messageCountRef.current) {
      messageCountRef.current = messages.length;
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages]);

  const initializeChat = async () => {
    if (!user || !chatId) return;

    setLoading(true);
    setKeyExchanging(true);

    try {
      // Ensure session is ready before any operations
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session');
        throw new Error('Not authenticated');
      }

      // Perform key exchange first (with fallback to local-only key)
      try {
        symmetricKey.current = await getOrCreateChatKey(chatId);
      } catch (keyError) {
        console.error('Key exchange failed, using local-only key:', keyError);
        // Fallback: generate and store locally (messages won't sync across devices)
        const { getSymmetricKey } = await import('@/lib/crypto');
        let localKey = getSymmetricKey(chatId);
        if (!localKey) {
          const { generateSymmetricKey, storeSymmetricKey } = await import('@/lib/crypto');
          localKey = generateSymmetricKey();
          storeSymmetricKey(chatId, localKey);
        }
        symmetricKey.current = localKey;
      }
      setKeyExchanging(false);
      
      // Now fetch chat data
      await fetchChatData();
      
      // Subscribe to new messages AFTER initial load
      const channel = supabase
        .channel(`chat-${chatId}`, { config: { broadcast: { self: true } } })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}`,
          },
          (payload) => {
            console.log('New message received via realtime:', payload);
            const newMessage = payload.new as ChatMessage;
            
            // Decrypt the new message
            if (symmetricKey.current) {
              try {
                newMessage.decryptedContent = decryptMessage(
                  newMessage.encrypted_content,
                  newMessage.nonce,
                  symmetricKey.current
                );
              } catch {
                newMessage.decryptedContent = '[Decryption failed]';
              }
            }
            
            // Only add if not already in list
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMessage.id);
              return exists ? prev : [...prev, newMessage];
            });
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast.error('Failed to load chat');
      setLoading(false);
      setKeyExchanging(false);
    }
  };

  const fetchChatData = async () => {
    if (!user || !chatId) return;

    try {
      console.log('🔍 [fetchChatData] Starting - chatId:', chatId, 'userId:', user.id);

      // STEP 1: Fetch all participants in this chat
      console.log('📌 STEP 1: Fetching chat_participants...');
      const { data: allParticipants, error: partError } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId);

      console.log('📌 STEP 1 RESULT:', { participantsCount: allParticipants?.length || 0, partError });
      if (partError) {
        console.error('❌ STEP 1 FAILED:', partError);
        throw partError;
      }

      // STEP 2: Find the other participant (not the current user)
      console.log('📌 STEP 2: Finding other participant...');
      const otherParticipant = (allParticipants || []).find(p => p.user_id !== user.id);
      console.log('📌 STEP 2 RESULT:', { found: !!otherParticipant, otherParticipantId: otherParticipant?.user_id });
      
      if (otherParticipant) {
        const participantUserId = otherParticipant.user_id;
        
        // STEP 3: Fetch the profile for this user
        console.log('📌 STEP 3: Fetching profile for userId:', participantUserId);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, is_online')
          .eq('id', participantUserId)
          .maybeSingle();

        console.log('📌 STEP 3 RESULT:', { profileFound: !!profile, profileError });
        if (profileError) {
          console.error('❌ STEP 3 FAILED:', profileError);
          throw profileError;
        }

        if (profile) {
          console.log('✅ Setting participant:', profile.username);
          setParticipant({
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
            is_online: profile.is_online,
          });
        } else {
          console.warn('⚠️ STEP 3: Profile not found for userId:', participantUserId);
          // Still set basic participant info from chat_participants
          setParticipant({
            id: participantUserId,
            username: 'User',
            display_name: 'Unknown User',
            avatar_url: null,
            is_online: false,
          });
        }
      }

      // STEP 4: Fetch messages
      console.log('📌 STEP 4: Fetching messages for chatId:', chatId);
      const { data: messagesData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      console.log('📌 STEP 4 RESULT:', { messageCount: messagesData?.length || 0, msgError });
      if (msgError) {
        console.error('❌ STEP 4 FAILED:', msgError);
        throw msgError;
      }

      // STEP 5: Decrypt messages (skip system messages)
      console.log('📌 STEP 5: Decrypting messages (has key:', !!symmetricKey.current, ')');
      const decryptedMessages: ChatMessage[] = (messagesData || []).map(msg => {
        // System messages are not encrypted
        if (msg.is_system) {
          return { ...msg, decryptedContent: msg.encrypted_content };
        }

        let decryptedContent = msg.encrypted_content;
        if (symmetricKey.current) {
          try {
            decryptedContent = decryptMessage(
              msg.encrypted_content,
              msg.nonce,
              symmetricKey.current
            );
          } catch (decryptError) {
            console.warn('⚠️ Decryption failed for message', msg.id, decryptError);
            decryptedContent = '[Decryption failed]';
          }
        }
        return { ...msg, decryptedContent };
      });

      console.log('✅ STEP 5 COMPLETE: Decrypted', decryptedMessages.length, 'messages');
      setMessages(decryptedMessages);
      console.log('✅ [fetchChatData] ALL STEPS COMPLETED SUCCESSFULLY');
    } catch (error) {
      console.error('❌ [fetchChatData] ERROR:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!user || !chatId || !symmetricKey.current) return;

    setSending(true);
    try {
      // Encrypt the message
      const { encryptedContent, nonce } = encryptMessage(content, symmetricKey.current);

      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          encrypted_content: encryptedContent,
          nonce,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3">
        {keyExchanging ? (
          <>
            <KeyRound className="w-8 h-8 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground">Establishing secure connection...</p>
          </>
        ) : (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-3 border-b border-border bg-card/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/home')}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {participant && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative">
              <Avatar className="w-10 h-10 ring-2 ring-border">
                <AvatarImage src={participant.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {(participant.display_name || participant.username)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineIndicator isOnline={participant.is_online} size="sm" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold truncate">
                {participant.display_name || participant.username}
              </h2>
              <p className="text-xs text-muted-foreground">
                {participant.is_online ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-xs text-primary">
          <Lock className="w-3.5 h-3.5" />
          <span>E2E Encrypted</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-fade-in">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2 animate-fade-in">Start of your encrypted chat</h3>
            <p className="text-muted-foreground max-w-sm animate-fade-in">
              Messages are end-to-end encrypted. No one outside of this chat can read them.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg) => (
              <div key={msg.id} className="animate-slide-up">
                <MessageBubble
                  content={msg.decryptedContent || msg.encrypted_content}
                  timestamp={msg.created_at}
                  isSender={msg.sender_id === user?.id}
                  isEncrypted={!msg.is_system}
                  isSystem={msg.is_system}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={sending}
        placeholder="Type an encrypted message..."
      />
    </div>
  );
};

export default ChatPage;
