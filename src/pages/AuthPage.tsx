import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import OrbitLogo from '@/components/OrbitLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, Globe, Lock, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be at most 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const AuthPage: React.FC = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-space-pattern">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const validation = signUpSchema.safeParse({ email, username, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, username, visibility);
        if (error) {
          const errorMessage = (error as any)?.message ? String((error as any).message) : String(error);

          if (errorMessage.toLowerCase().includes('already registered')) {
            toast.error('An account with this email already exists');
          } else {
            toast.error(errorMessage);
          }
        } else {
          toast.success('Account created successfully! Redirecting...');
          // Wait for auth state to update
          setTimeout(() => {}, 1000);
        }
      } else {
        const validation = signInSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          const errorMessage = (error as any)?.message ? String((error as any).message) : String(error);

          if (errorMessage.toLowerCase().includes('invalid')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(errorMessage);
          }
        } else {
          toast.success('Signed in successfully!');
        }
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-space-pattern p-4">
      {/* Background glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <OrbitLogo size="lg" />
          </div>
          <p className="text-muted-foreground">Secure, encrypted messaging</p>
        </div>

        {/* Auth Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-card animate-fade-in">
          <h1 className="text-2xl font-display font-bold text-center mb-6">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-12"
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="cooluser"
                  required
                  className="h-12"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-3">
                <Label>Account Visibility</Label>
                <RadioGroup value={visibility} onValueChange={(val) => setVisibility(val as 'public' | 'private')}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="public" id="public" />
                    <Label htmlFor="public" className="flex-1 cursor-pointer flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-medium text-sm">Public Profile</div>
                        <div className="text-xs text-muted-foreground">Anyone can find and message you</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="flex-1 cursor-pointer flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      <div>
                        <div className="font-medium text-sm">Private Profile</div>
                        <div className="text-xs text-muted-foreground">Only people you approve can message you</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold shadow-button"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setEmail('');
                setPassword('');
                setUsername('');
                setVisibility('public');
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isSignUp ? (
                <>Already have an account? <span className="text-primary font-medium">Sign in</span></>
              ) : (
                <>Don't have an account? <span className="text-primary font-medium">Sign up</span></>
              )}
            </button>
          </div>
        </div>

        {/* E2E Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-border text-sm text-muted-foreground">
            <Lock className="w-4 h-4 text-primary" />
            End-to-end encrypted
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
