import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Globe, Lock, LogOut, Shield, Bell, Palette } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { profile, updateProfile, signOut } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    profile?.visibility || 'public'
  );

  const handleVisibilityChange = async (newVisibility: 'public' | 'private') => {
    setVisibility(newVisibility);
    setIsSaving(true);

    try {
      const { error } = await updateProfile({ visibility: newVisibility });
      if (error) throw error;
      toast.success('Account visibility updated!');
    } catch (error) {
      toast.error('Failed to update visibility');
      setVisibility(profile?.visibility || 'public');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="h-screen overflow-y-auto scrollbar-thin">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card/30 backdrop-blur-sm">
        <h1 className="text-2xl font-display font-bold text-primary">Settings</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Privacy Settings */}
        <section className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Privacy</h2>
              <p className="text-sm text-muted-foreground">Control who can message you</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <Label className="text-base">Account Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={handleVisibilityChange as any}
              disabled={isSaving}
              className="space-y-3"
            >
              <label
                htmlFor="setting-public"
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  visibility === 'public'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RadioGroupItem value="public" id="setting-public" />
                <Globe className={`w-5 h-5 ${visibility === 'public' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <p className="font-medium">Public Account</p>
                  <p className="text-sm text-muted-foreground">
                    Anyone can send you messages directly
                  </p>
                </div>
              </label>

              <label
                htmlFor="setting-private"
                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  visibility === 'private'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RadioGroupItem value="private" id="setting-private" />
                <Lock className={`w-5 h-5 ${visibility === 'private' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <p className="font-medium">Private Account</p>
                  <p className="text-sm text-muted-foreground">
                    Users must send a request before messaging you
                  </p>
                </div>
              </label>
            </RadioGroup>

            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
          </div>
        </section>

        {/* Notifications (placeholder) */}
        <section className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground">Manage notification preferences</p>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            Notification settings coming soon...
          </p>
        </section>

        {/* Appearance (placeholder) */}
        <section className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground">Customize your experience</p>
            </div>
          </div>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            Theme customization coming soon...
          </p>
        </section>

        {/* Sign Out */}
        <section className="p-6 rounded-2xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Sign Out</h2>
              <p className="text-sm text-muted-foreground">
                Sign out of your account on this device
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="destructive"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </section>

        {/* Security Info */}
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          <span>All messages are end-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
