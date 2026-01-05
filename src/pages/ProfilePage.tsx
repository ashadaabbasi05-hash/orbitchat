import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Camera, Globe, Lock, Calendar, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  visibility: string;
  is_online: boolean;
  created_at: string;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  // Fetch profile from public_users table
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('public_users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load profile');
          return;
        }
        
        if (data) {
          setProfile(data as UserProfile);
          setDisplayName(data.display_name || '');
          setBio(data.bio || '');
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">You must be logged in to view your profile</p>
          <Button onClick={() => window.location.href = '/auth'}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update the public_users table directly
      const { error } = await supabase
        .from('public_users')
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile({
        ...profile,
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
      });

      toast.success('Profile updated!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto scrollbar-thin pb-20 md:pb-0">
      {/* Header with gradient */}
      <div className="relative h-32 md:h-48 bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30">
        <div className="absolute inset-0 bg-space-pattern opacity-50" />
      </div>

      {/* Profile Content */}
      <div className="relative max-w-2xl mx-auto px-4 md:px-6 -mt-16 md:-mt-20">
        {/* Avatar */}
        <div className="relative inline-block">
          <Avatar className="w-24 md:w-32 h-24 md:h-32 ring-4 ring-background shadow-glow">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl md:text-4xl font-bold">
              {profile.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button className="absolute bottom-2 right-2 p-2 rounded-full bg-primary text-primary-foreground shadow-button hover:scale-105 transition-transform">
            <Camera className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="mt-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold">
                {profile.display_name || profile.username}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">@{profile.username}</p>
            </div>
            
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="gap-2 w-full md:w-auto"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm">
              {profile.visibility === 'public' ? (
                <>
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-xs md:text-sm">Public Account</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-primary" />
                  <span className="text-xs md:text-sm">Private Account</span>
                </>
              )}
            </div>
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs md:text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Joined {format(new Date(profile.created_at), 'MMM yyyy')}</span>
            </div>
          </div>
        </div>

        {/* Edit Form or Bio Display */}
        <div className="mt-6 md:mt-8">
          {isEditing ? (
            <div className="space-y-6 p-4 md:p-6 rounded-2xl bg-card border border-border">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={160}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/160
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-card border border-border">
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">
                {profile.bio || 'No bio yet. Click "Edit Profile" to add one!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
