import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const phone: string = (body.phone || "").trim();
    const code: string = (body.code || "").trim();
    if (!/^\+[1-9]\d{6,14}$/.test(phone) || !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid phone or code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Get latest unverified OTP
    const { data: otp } = await admin
      .from("phone_otps")
      .select("*")
      .eq("user_id", user.id)
      .eq("phone_e164", phone)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) {
      return new Response(JSON.stringify({ error: "No active OTP. Request a new code." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (new Date(otp.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Code expired. Request a new one." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (otp.attempts >= 5) {
      return new Response(JSON.stringify({ error: "Too many attempts. Request a new code." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const codeHash = await sha256Hex(`${user.id}:${phone}:${code}`);
    if (codeHash !== otp.code_hash) {
      await admin.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "Incorrect code" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark OTP verified
    await admin.from("phone_otps").update({ verified: true }).eq("id", otp.id);

    // Update seller profile (create if missing as draft)
    const { data: existingProfile } = await admin
      .from("seller_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfile) {
      const { error: updErr } = await admin
        .from("seller_profiles")
        .update({ phone_e164: phone, phone_verified_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await admin.from("seller_profiles").insert({
        user_id: user.id,
        store_name: "",
        seller_status: "draft",
        is_active: false,
        status: "draft",
        phone_e164: phone,
        phone_verified_at: new Date().toISOString(),
      });
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("verify-phone-otp error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
