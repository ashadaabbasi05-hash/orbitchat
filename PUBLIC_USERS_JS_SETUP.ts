// @ts-nocheck
// ==========================================
// PUBLIC USERS - COMPLETE JS/TS SETUP
// Copy-paste ready code snippets
// ==========================================

import { createClient } from "@supabase/supabase-js";

// ==========================================
// 1. SUPABASE CLIENT SETUP
// ==========================================

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 2. TYPES
// ==========================================

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

// ==========================================
// 3. SEARCH USERS (NO AUTH NEEDED)
// ==========================================

export async function searchUsers(query: string): Promise<PublicUser[]> {
  try {
    const { data, error } = await supabase
      .from("public_users")
      .select("id, username, display_name, avatar_url, bio, visibility, is_online")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .eq("visibility", "public")
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

// ==========================================
// 4. GET SINGLE USER PROFILE (NO AUTH NEEDED)
// ==========================================

export async function getUserProfile(userId: string): Promise<PublicUser | null> {
  try {
    const { data, error } = await supabase
      .from("public_users")
      .select("*")
      .eq("id", userId)
      .eq("visibility", "public")
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

// ==========================================
// 5. GET ALL PUBLIC USERS (PAGINATED)
// ==========================================

export async function getAllPublicUsers(
  page: number = 1,
  pageSize: number = 20
): Promise<PublicUser[]> {
  try {
    const start = (page - 1) * pageSize;

    const { data, error } = await supabase
      .from("public_users")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .range(start, start + pageSize - 1);

    if (error) {
      console.error("[GET ALL USERS ERROR]", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[GET ALL USERS EXCEPTION]", err);
    return [];
  }
}

// ==========================================
// 6. CREATE USER ENTRY IN PUBLIC_USERS
// (Call this after auth signup)
// ==========================================

export async function createPublicUserEntry(
  userId: string,
  username: string,
  displayName?: string,
  email?: string,
  avatarUrl?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from("public_users").insert([
      {
        id: userId,
        username,
        display_name: displayName || null,
        email: email || null,
        avatar_url: avatarUrl || null,
        bio: null,
        visibility: "public",
        is_online: false,
        last_seen: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("[CREATE USER ERROR]", error);
      return false;
    }

    console.log("[CREATE USER SUCCESS]", username);
    return true;
  } catch (err) {
    console.error("[CREATE USER EXCEPTION]", err);
    return false;
  }
}

// ==========================================
// 7. UPDATE USER PROFILE
// (Only auth'd user can update their own)
// ==========================================

export async function updateUserProfile(
  userId: string,
  updates: Partial<PublicUser>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("public_users")
      .update({
        display_name: updates.display_name || undefined,
        bio: updates.bio || undefined,
        avatar_url: updates.avatar_url || undefined,
        visibility: updates.visibility || undefined,
      })
      .eq("id", userId);

    if (error) {
      console.error("[UPDATE PROFILE ERROR]", error);
      return false;
    }

    console.log("[UPDATE PROFILE SUCCESS]", userId);
    return true;
  } catch (err) {
    console.error("[UPDATE PROFILE EXCEPTION]", err);
    return false;
  }
}

// ==========================================
// 8. UPDATE ONLINE STATUS
// ==========================================

export async function updateOnlineStatus(
  userId: string,
  isOnline: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("public_users")
      .update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("[UPDATE ONLINE ERROR]", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[UPDATE ONLINE EXCEPTION]", err);
    return false;
  }
}

// ==========================================
// 9. GET ONLINE USERS
// ==========================================

export async function getOnlineUsers(): Promise<PublicUser[]> {
  try {
    const { data, error } = await supabase
      .from("public_users")
      .select("id, username, display_name, avatar_url, is_online")
      .eq("is_online", true)
      .eq("visibility", "public");

    if (error) {
      console.error("[GET ONLINE ERROR]", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("[GET ONLINE EXCEPTION]", err);
    return [];
  }
}

// ==========================================
// 10. SUBSCRIBE TO REAL-TIME UPDATES
// ==========================================

export function subscribeToPublicUsers(
  onUpdate: (payload: any) => void
): () => void {
  const subscription = supabase
    .channel("public_users_channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "public_users",
      },
      onUpdate
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(subscription);
  };
}

// ==========================================
// 11. REACT HOOK: USE SEARCH USERS
// ==========================================

import { useState, useCallback } from "react";

export function useSearchUsers() {
  const [results, setResults] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const users = await searchUsers(query);
      setResults(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

// ==========================================
// 12. REACT HOOK: USE USER PROFILE
// ==========================================

export function useUserProfile(userId: string | null) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await getUserProfile(userId);
      setUser(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { user, loading, error, fetchProfile };
}

// ==========================================
// 13. REACT HOOK: USE ONLINE STATUS
// ==========================================

export function useOnlineStatus(userId: string | null) {
  const [isOnline, setIsOnline] = useState(false);

  const setOnline = useCallback(
    async (online: boolean) => {
      if (!userId) return;
      await updateOnlineStatus(userId, online);
      setIsOnline(online);
    },
    [userId]
  );

  return { isOnline, setOnline };
}

// ==========================================
// 14. EXAMPLE USAGE IN COMPONENT
// ==========================================

/*
import React, { useEffect } from 'react';
import { useSearchUsers, useUserProfile, useOnlineStatus } from './PUBLIC_USERS_JS_SETUP';

export function SearchExample() {
  const { results, loading, search } = useSearchUsers();
  
  const handleSearch = (query: string) => {
    search(query);
  };

  return (
    <div>
      <input 
        placeholder="Search users..." 
        onChange={(e) => handleSearch(e.target.value)}
      />
      {loading && <p>Searching...</p>}
      {results.map((user) => (
        <div key={user.id}>
          <h3>{user.display_name || user.username}</h3>
          <p>{user.bio}</p>
          {user.is_online && <span>🟢 Online</span>}
        </div>
      ))}
    </div>
  );
}

export function ProfileExample({ userId }: { userId: string }) {
  const { user, loading, fetchProfile } = useUserProfile(userId);
  const { isOnline, setOnline } = useOnlineStatus(userId);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not found</p>;

  return (
    <div>
      <h1>{user.display_name || user.username}</h1>
      <p>{user.bio}</p>
      <img src={user.avatar_url} alt={user.username} />
      <button onClick={() => setOnline(!isOnline)}>
        {isOnline ? 'Go Offline' : 'Go Online'}
      </button>
    </div>
  );
}
*/

// ==========================================
// 15. SUPABASE QUERIES FOR SQL EDITOR
// ==========================================

/*
-- View all users
SELECT * FROM public_users;

-- Search users
SELECT * FROM public_users 
WHERE username ILIKE '%alice%' 
   OR display_name ILIKE '%alice%'
AND visibility = 'public';

-- Get online users
SELECT id, username, display_name, is_online 
FROM public_users 
WHERE is_online = true;

-- Count total users
SELECT COUNT(*) FROM public_users;

-- Get new users (last 7 days)
SELECT * FROM public_users 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Update user (as admin)
UPDATE public_users 
SET display_name = 'New Name', bio = 'New bio'
WHERE id = 'user-uuid';

-- Delete user (as admin)
DELETE FROM public_users WHERE id = 'user-uuid';

-- Check RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'public_users';

-- Check indexes
SELECT * FROM pg_indexes 
WHERE tablename = 'public_users';

-- Monitor table size
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename = 'public_users';
*/

// ==========================================
// EXPORT ALL
// ==========================================

export default {
  searchUsers,
  getUserProfile,
  getAllPublicUsers,
  createPublicUserEntry,
  updateUserProfile,
  updateOnlineStatus,
  getOnlineUsers,
  subscribeToPublicUsers,
  useSearchUsers,
  useUserProfile,
  useOnlineStatus,
};
