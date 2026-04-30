import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SellerStatus = "draft" | "pending_verification" | "approved" | "rejected" | "suspended";
export type IdentityStatus = "not_started" | "pending" | "verified" | "rejected";

export interface SellerProfile {
  id: string;
  user_id: string;
  store_name: string;
  store_description: string | null;
  store_logo_url: string | null;
  contact_info: string | null;
  is_active: boolean;
  status: string;
  seller_status: SellerStatus;
  identity_status: IdentityStatus;
  phone_e164: string | null;
  phone_verified_at: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
  date_of_birth: string | null;
  id_type: string | null;
  id_number_last4: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
  address_country: string | null;
  business_type: "individual" | "business" | null;
  business_name: string | null;
  tax_id: string | null;
  policy_accepted_at: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
  suspension_reason: string | null;
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
    setProfile((data as unknown as SellerProfile) || null);
    setLoading(false);
  }, [targetId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isApprovedSeller = profile?.seller_status === "approved";

  return { sellerProfile: profile, loading, refresh, isApprovedSeller };
}
