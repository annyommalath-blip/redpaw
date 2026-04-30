import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SellerProfile {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  store_logo_url: string | null;
  contact_info: string | null;
  is_active: boolean;
  status: string;
}

export function useSellerProfile(userId?: string) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id ?? null;
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!targetId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("seller_profiles")
      .select("*")
      .eq("user_id", targetId)
      .maybeSingle();
    setProfile((data as SellerProfile) || null);
    setLoading(false);
  }, [targetId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sellerProfile: profile, loading, refresh };
}
