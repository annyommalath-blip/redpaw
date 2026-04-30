import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const E164_RE = /^\+[1-9]\d{6,14}$/;

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
    if (!E164_RE.test(phone)) {
      return new Response(JSON.stringify({ error: "Phone must be in E.164 format (e.g. +14155551234)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Fraud check: phone already used by another seller
    const { data: existing } = await admin
      .from("seller_profiles")
      .select("user_id")
      .eq("phone_e164", phone)
      .neq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "This phone number is already linked to another seller account." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate limit: max 3 OTPs per 10 min per user
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("phone_otps")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", tenMinAgo);
    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many requests. Try again in a few minutes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await sha256Hex(`${user.id}:${phone}:${code}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insErr } = await admin.from("phone_otps").insert({
      user_id: user.id,
      phone_e164: phone,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insErr) throw insErr;

    // Send SMS via Twilio if configured, else dev mode
    const twilioApiKey = Deno.env.get("TWILIO_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    let mode: "sent" | "dev" = "dev";

    if (twilioApiKey && lovableKey && twilioFrom) {
      const resp = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": twilioApiKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phone,
          From: twilioFrom,
          Body: `Your RedPaw seller verification code is ${code}. Expires in 10 min.`,
        }),
      });
      if (!resp.ok) {
        console.error("Twilio error:", resp.status, await resp.text());
        // Fall back to dev mode rather than failing the user
      } else {
        mode = "sent";
      }
    }

    const responseBody: Record<string, unknown> = { ok: true, mode };
    if (mode === "dev") {
      // In dev mode return the code so the user can test without SMS provider
      responseBody.devCode = code;
    }
    return new Response(JSON.stringify(responseBody), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("send-phone-otp error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
