import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUsername() {
  const { user } = useAuth();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    supabase
      .from("profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const un = data?.username || null;
        setUsername(un);
        setNeedsSetup(!un);
        setLoading(false);
      });
  }, [user]);

  const setUsernameValue = (val: string) => {
    setUsername(val);
    setNeedsSetup(false);
  };

  return { username, loading, needsSetup, setUsername: setUsernameValue };
}
