import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Missing Supabase credentials in environment variables");
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// ================================================
// TYPES
// ================================================

export interface PublicUser {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  visibility: "public" | "private";
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  encrypted_content: string;
  nonce: string;
  created_at: string;
  updated_at: string;
}

// ================================================
// AUTH FUNCTIONS
// ================================================

export async function signUpUser(
  email: string,
  password: string,
  username: string,
  displayName?: string
) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase().trim(),
          display_name: (displayName || username).trim(),
        },
      },
    });

    if (error) {
      console.error("[SIGNUP ERROR]", error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SIGNUP EXCEPTION]", msg);
    return { success: false, error: msg };
  }
}

export async function signInUser(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[SIGNIN ERROR]", error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SIGNIN EXCEPTION]", msg);
    return { success: false, error: msg };
  }
}

export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[SIGNOUT ERROR]", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[SIGNOUT EXCEPTION]", err);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (err) {
    console.error("[GET USER ERROR]", err);
    return null;
  }
}

export function onAuthStateChange(callback: (user: any | null) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });

  return () => subscription?.unsubscribe();
}

// ================================================
// PROFILE FUNCTIONS
// ================================================

export async function getPublicProfile(userId: string): Promise<PublicUser | null> {
  try {
    const { data, error } = await supabase
      .from("public_users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[GET PROFILE ERROR]", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[GET PROFILE EXCEPTION]", err);
    return null;
  }
}

export async function updateProfile(updates: Partial<PublicUser>): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error("[UPDATE PROFILE] Not logged in");
      return false;
    }

    const { error } = await supabase
      .from("public_users")
      .update({
        display_name: updates.display_name,
        bio: updates.bio,
        avatar_url: updates.avatar_url,
      })
      .eq("id", user.id);

    if (error) {
      console.error("[UPDATE PROFILE ERROR]", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[UPDATE PROFILE EXCEPTION]", err);
    return false;
  }
}

export async function searchPublicUsers(query: string): Promise<PublicUser[]> {
  try {
    if (!query.trim()) return [];

    const searchTerm = `%${query.toLowerCase()}%`;

    const { data, error } = await supabase
      .from("public_users")
      .select("*")
      .or(`username.ilike.${searchTerm},display_name.ilike.${searchTerm}`)
      .limit(20);

    if (error) {
      console.error("[SEARCH ERROR]", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[SEARCH EXCEPTION]", err);
    return [];
  }
}

export async function setOnlineStatus(isOnline: boolean): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    const { error } = await supabase
      .from("public_users")
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("[SET ONLINE ERROR]", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[SET ONLINE EXCEPTION]", err);
    return false;
  }
}

// ================================================
// CHAT FUNCTIONS
// ================================================

export async function getOrCreateChat(otherUserId: string): Promise<Chat | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error("[CHAT] Not logged in");
      return null;
    }

    // Check if chat already exists
    const { data: existingChat, error: checkError } = await supabase
      .from("chats")
      .select("*")
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existingChat) {
      return existingChat;
    }

    // Create new chat
    const { data: newChat, error: createError } = await supabase
      .from("chats")
      .insert({
        user1_id: user.id,
        user2_id: otherUserId,
      })
      .select()
      .single();

    if (createError) {
      console.error("[CREATE CHAT ERROR]", createError);
      return null;
    }

    return newChat;
  } catch (err) {
    console.error("[GET/CREATE CHAT EXCEPTION]", err);
    return null;
  }
}

export async function getUserChats(): Promise<Chat[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[GET CHATS ERROR]", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[GET CHATS EXCEPTION]", err);
    return [];
  }
}

// ================================================
// MESSAGE FUNCTIONS
// ================================================

export async function sendMessage(
  chatId: string,
  encryptedContent: string,
  nonce: string
): Promise<Message | null> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error("[SEND MESSAGE] Not logged in");
      return null;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        encrypted_content: encryptedContent,
        nonce: nonce,
      })
      .select()
      .single();

    if (error) {
      console.error("[SEND MESSAGE ERROR]", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[SEND MESSAGE EXCEPTION]", err);
    return null;
  }
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[GET MESSAGES ERROR]", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[GET MESSAGES EXCEPTION]", err);
    return [];
  }
}

// ================================================
// SUBSCRIPTIONS
// ================================================

export function subscribeToMessages(
  chatId: string,
  onNewMessage: (message: Message) => void
) {
  const subscription = supabase
    .channel(`messages:${chatId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

export function subscribeToProfileChanges(
  userId: string,
  onUpdate: (profile: PublicUser) => void
) {
  const subscription = supabase
    .channel(`profiles:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "public_users",
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload.new as PublicUser);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}