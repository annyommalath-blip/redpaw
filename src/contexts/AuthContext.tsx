import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem("redpaw_guest") === "true");

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("[Auth] State change:", event, currentSession ? "session exists" : "no session");
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        // Only clear guest mode for real (non-anonymous) sign-ins
        if (currentSession && !currentSession.user.is_anonymous) {
          setIsGuest(false);
          localStorage.removeItem("redpaw_guest");
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      console.log("[Auth] Initial session:", existingSession ? "exists" : "none");
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    console.log("[Auth] Signing out...");
    setIsGuest(false);
    localStorage.removeItem("redpaw_guest");
    await supabase.auth.signOut();
  };

  const enterGuestMode = async () => {
    setIsGuest(true);
    localStorage.setItem("redpaw_guest", "true");
    // Sign in anonymously so RLS policies allow read access
    await supabase.auth.signInAnonymously();
  };

  const exitGuestMode = async () => {
    setIsGuest(false);
    localStorage.removeItem("redpaw_guest");
    // Sign out the anonymous session
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isGuest, signOut, enterGuestMode, exitGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
