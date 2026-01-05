import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import OrbitLogo from '@/components/OrbitLogo';
import { Button } from '@/components/ui/button';
import { Lock, MessageSquare, Shield, Sparkles } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const Index: React.FC = () => {
  const { user, loading } = useAuth();

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

  return (
    <div className="min-h-screen bg-background bg-space-pattern overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-6">
        {/* Logo */}
        <div className="mb-8 animate-fade-in">
          <OrbitLogo size="lg" />
        </div>

        {/* Hero Text */}
        <div className="text-center mb-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl md:text-6xl font-display font-bold mb-4 glow-text">
            Secure Messaging
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Beyond the Stars
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            End-to-end encrypted conversations that stay private. 
            Your messages, your privacy.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mb-16 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Button
            onClick={() => window.location.href = '/auth'}
            size="lg"
            className="h-14 px-8 text-lg font-semibold shadow-button hover:shadow-glow transition-all duration-300 hover:scale-105"
          >
            Get Started
            <Sparkles className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm text-center hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">End-to-End Encrypted</h3>
            <p className="text-sm text-muted-foreground">
              Messages are encrypted on your device. Only you and the recipient can read them.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm text-center hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Privacy Controls</h3>
            <p className="text-sm text-muted-foreground">
              Choose who can message you with public or private account settings.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card/50 border border-border backdrop-blur-sm text-center hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Real-Time Chat</h3>
            <p className="text-sm text-muted-foreground">
              Instant messaging with live presence indicators and typing status.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center text-sm text-muted-foreground">
          <p>Powered by secure encryption technology</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
