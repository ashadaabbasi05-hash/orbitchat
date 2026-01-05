import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  visibility: 'public' | 'private';
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, visibility: 'public' | 'private') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const attemptedProfileCreateRef = useRef<Set<string>>(new Set());

  const ensureProfileExists = async (u: User) => {
    if (attemptedProfileCreateRef.current.has(u.id)) return;
    attemptedProfileCreateRef.current.add(u.id);

    const meta = (u.user_metadata || {}) as Record<string, any>;
    const rawUsername = typeof meta.username === 'string' ? meta.username : '';
    const baseUsername = (rawUsername || u.email?.split('@')[0] || u.id.slice(0, 8))
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 20);

    const displayName = (typeof meta.display_name === 'string' ? meta.display_name : '') || baseUsername;
    const visibility = meta.visibility === 'private' ? 'private' : 'public';

    const tryInsert = async (usernameToTry: string) => {
      return supabase.from('profiles').insert({
        id: u.id,
        username: usernameToTry,
        display_name: displayName,
        email: u.email,
        visibility,
      });
    };

    // Try base username, then a few suffixed attempts on unique violation.
    let res = await tryInsert(baseUsername);
    for (let i = 0; res.error && (res.error as any).code === '23505' && i < 3; i++) {
      const suffix = Math.random().toString(36).slice(2, 6);
      const candidate = `${baseUsername.slice(0, 15)}_${suffix}`;
      res = await tryInsert(candidate);
    }

    if (res.error) {
      console.error('Failed to auto-create profile:', {
        message: (res.error as any).message,
        code: (res.error as any).code,
        details: (res.error as any).details,
      });
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', {
          message: error.message,
          code: error.code,
          details: error.details,
          userId,
        });
      }
      
      if (data) {
        setProfile(data as Profile);
      } else {
        console.warn('No profile found for user:', userId);
        // Profile might be created async via trigger; if not, create it client-side.
        if (session?.user?.id === userId) {
          await ensureProfileExists(session.user);
          const retry = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
          if (retry.data) setProfile(retry.data as Profile);
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    username: string,
    visibility: 'public' | 'private'
  ): Promise<{ error: Error | null }> => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          display_name: username,
          visibility,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signOut = async (): Promise<void> => {
    // Update online status before signing out
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', user.id);
    }
    
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (
    updates: Partial<Profile>
  ): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('No user logged in') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      await refreshProfile();
    }

    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
