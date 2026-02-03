import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dog, Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard, GlassCardContent, GlassCardDescription, GlassCardHeader, GlassCardTitle } from "@/components/ui/glass-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, loading: authLoading } = useAuthContext();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && session) {
      console.log("[Auth] Already authenticated, redirecting to /");
      navigate("/", { replace: true });
    }
  }, [session, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign in failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Welcome back! 🐕",
        description: "Successfully signed in",
      });
      navigate("/", { replace: true });
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign up failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Welcome to RedPaw! 🐾",
        description: "Account created successfully",
      });
      navigate("/", { replace: true });
    }

    setLoading(false);
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-redpaw flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg animate-pulse-soft"
              style={{ boxShadow: '0 8px 32px -4px hsl(0 78% 52% / 0.3)' }}
            >
              <Dog className="h-12 w-12 text-primary-foreground" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground font-medium">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-redpaw flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-8"
      >
        <div className="relative mb-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center"
            style={{ boxShadow: '0 8px 32px -4px hsl(0 78% 52% / 0.3)' }}
          >
            <Dog className="h-12 w-12 text-primary-foreground" />
          </motion.div>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary" />
          </motion.div>
        </div>
        <h1 className="text-4xl font-bold text-foreground tracking-tight">RedPaw</h1>
        <p className="text-muted-foreground mt-2 flex items-center gap-2">
          Your dog's best companion
          <span className="text-xl">🐾</span>
        </p>
      </motion.div>

      <GlassCard className="w-full max-w-md" variant="modal" delay={0.2}>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 m-4 mb-0 w-[calc(100%-2rem)] bg-muted/50">
            <TabsTrigger value="signin" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn}>
              <GlassCardHeader className="pb-2">
                <GlassCardTitle className="text-xl">Welcome back</GlassCardTitle>
                <GlassCardDescription>Sign in to access your dog's profile</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl bg-muted/30 border-muted focus:bg-white transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 rounded-xl bg-muted/30 border-muted focus:bg-white transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base font-semibold btn-glow" 
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </GlassCardContent>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp}>
              <GlassCardHeader className="pb-2">
                <GlassCardTitle className="text-xl">Create account</GlassCardTitle>
                <GlassCardDescription>Join RedPaw to manage your dog's health & safety</GlassCardDescription>
              </GlassCardHeader>
              <GlassCardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl bg-muted/30 border-muted focus:bg-white transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 rounded-xl bg-muted/30 border-muted focus:bg-white transition-colors"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base font-semibold btn-glow" 
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </GlassCardContent>
            </form>
          </TabsContent>
        </Tabs>
      </GlassCard>
    </div>
  );
}
