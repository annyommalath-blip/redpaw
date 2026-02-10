import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool definitions for the AI to call
const tools = [
  {
    type: "function",
    function: {
      name: "get_my_dogs",
      description: "Get all dogs owned by the current user. Call this when user asks about their dogs, pets, or needs to select a dog.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dog_details",
      description: "Get detailed information about a specific dog including health logs.",
      parameters: {
        type: "object",
        properties: { dog_id: { type: "string", description: "The UUID of the dog" } },
        required: ["dog_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_medication_records",
      description: "Get medication and vaccine records for the user's dogs. Call this when user asks about vaccines, medications, expiring treatments, or health records.",
      parameters: {
        type: "object",
        properties: { dog_id: { type: "string", description: "Optional: specific dog UUID. If omitted, returns records for all user's dogs." } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_care_requests",
      description: "Get care requests created by or assigned to the user.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["open", "closed", "all"], description: "Filter by status. Defaults to 'open'." },
          role: { type: "string", enum: ["owner", "sitter", "all"], description: "Filter by user's role. Defaults to 'all'." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_lost_alerts",
      description: "Get lost dog alerts for the user's dogs and any sightings.",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: ["active", "resolved", "all"], description: "Filter by status. Defaults to 'active'." } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sitter_logs",
      description: "Get sitter activity logs for a care request.",
      parameters: {
        type: "object",
        properties: { request_id: { type: "string", description: "The UUID of the care request" } },
        required: ["request_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_found_dogs_nearby",
      description: "Get found dog posts. Call this when user asks about found dogs in the community.",
      parameters: {
        type: "object",
        properties: { status: { type: "string", enum: ["active", "reunited", "all"], description: "Filter by status. Defaults to 'active'." } },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_found_dogs_by_attributes",
      description: "Search found dog posts by visual attributes extracted from a photo. Call this ONLY when the user uploads a photo of a dog and wants to find matching found-dog posts. First analyze the photo visually, then call this tool with the extracted attributes.",
      parameters: {
        type: "object",
        properties: {
          breed_guess: { type: "string", description: "Best guess of the breed or type (e.g., 'Pomeranian', 'Labrador mix', 'small terrier')" },
          color: { type: "string", description: "Primary coat color (e.g., 'brown', 'black and white', 'golden')" },
          size: { type: "string", enum: ["small", "medium", "large"], description: "Estimated size category" },
          markings: { type: "string", description: "Notable visual markings, patterns, collar color, etc." },
          days_back: { type: "number", description: "How many days back to search. Default 30." },
        },
        required: ["breed_guess", "color", "size"],
      },
    },
  },
];

// Tool execution functions
async function executeGetMyDogs(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("dogs")
    .select("id, name, breed, age, date_of_birth, weight, weight_unit, is_lost, photo_url, notes")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { message: "No dogs found.", suggestion: "Add a dog via Create → Add Dog." };
  return { dogs: data, count: data.length };
}

async function executeGetDogDetails(supabase: any, userId: string, dogId: string) {
  const { data: dog, error: dogError } = await supabase
    .from("dogs").select("*").eq("id", dogId).eq("owner_id", userId).maybeSingle();
  if (dogError || !dog) return { error: "Dog not found or access denied" };
  const { data: healthLogs } = await supabase
    .from("health_logs").select("*").eq("dog_id", dogId).eq("owner_id", userId)
    .order("created_at", { ascending: false }).limit(10);
  return { dog, healthLogs: healthLogs || [] };
}

async function executeGetMedicationRecords(supabase: any, userId: string, dogId?: string) {
  let query = supabase
    .from("med_records")
    .select(`id, name, record_type, date_given, expires_on, duration_value, duration_unit, notes, dogs!inner(id, name)`)
    .eq("owner_id", userId).order("expires_on", { ascending: true });
  if (dogId) query = query.eq("dog_id", dogId);
  const { data, error } = await query.limit(50);
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { message: "No medication or vaccine records found.", suggestion: "Add records via Create → Add Medication Record." };
  const now = new Date();
  const recordsWithStatus = data.map((record: any) => {
    const expiresOn = new Date(record.expires_on);
    const daysUntilExpiry = Math.ceil((expiresOn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let status = "active";
    if (daysUntilExpiry < 0) status = "expired";
    else if (daysUntilExpiry <= 30) status = "expiring_soon";
    return { ...record, dog_name: record.dogs?.name, days_until_expiry: daysUntilExpiry, status, status_text: daysUntilExpiry < 0 ? `Expired ${Math.abs(daysUntilExpiry)} days ago` : daysUntilExpiry === 0 ? "Expires today" : `Expires in ${daysUntilExpiry} days` };
  });
  return { records: recordsWithStatus, count: data.length, expiring_soon_count: recordsWithStatus.filter((r: any) => r.status === "expiring_soon").length, expired_count: recordsWithStatus.filter((r: any) => r.status === "expired").length };
}

async function executeGetCareRequests(supabase: any, userId: string, status = "open", role = "all") {
  let query = supabase.from("care_requests")
    .select(`id, care_type, time_window, request_date, start_time, end_time, location_label, location_text, notes, pay_offered, pay_amount, pay_currency, status, assigned_sitter_id, owner_id, created_at, dogs!inner(id, name, breed)`)
    .order("created_at", { ascending: false }).limit(20);
  if (status !== "all") query = query.eq("status", status);
  if (role === "owner") query = query.eq("owner_id", userId);
  else if (role === "sitter") query = query.eq("assigned_sitter_id", userId);
  else query = query.or(`owner_id.eq.${userId},assigned_sitter_id.eq.${userId}`);
  const { data, error } = await query;
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { message: "No care requests found." };
  return { requests: data.map((req: any) => ({ ...req, dog_name: req.dogs?.name, user_role: req.owner_id === userId ? "owner" : "sitter" })), count: data.length };
}

async function executeGetLostAlerts(supabase: any, userId: string, status = "active") {
  let query = supabase.from("lost_alerts")
    .select(`id, title, description, last_seen_location, location_label, status, created_at, dogs!inner(id, name, breed, photo_url)`)
    .eq("owner_id", userId).order("created_at", { ascending: false }).limit(10);
  if (status !== "all") query = query.eq("status", status);
  const { data: alerts, error } = await query;
  if (error) return { error: error.message };
  let sightings: any[] = [];
  if (alerts && alerts.length > 0) {
    const { data: s } = await supabase.from("sightings").select("id, alert_id, message, location_text, created_at")
      .in("alert_id", alerts.map((a: any) => a.id)).order("created_at", { ascending: false }).limit(20);
    sightings = s || [];
  }
  if (!alerts || alerts.length === 0) return { message: "No lost dog alerts found for your dogs." };
  return { alerts: alerts.map((a: any) => ({ ...a, dog_name: a.dogs?.name, sightings_count: sightings.filter((s: any) => s.alert_id === a.id).length })), count: alerts.length };
}

async function executeGetSitterLogs(supabase: any, userId: string, requestId: string) {
  const { data: request, error: reqError } = await supabase
    .from("care_requests").select("id, owner_id, assigned_sitter_id, dogs(name)").eq("id", requestId).maybeSingle();
  if (reqError || !request) return { error: "Care request not found" };
  if (request.owner_id !== userId && request.assigned_sitter_id !== userId) return { error: "Access denied" };
  const { data: logs, error } = await supabase.from("sitter_logs").select("id, log_type, note_text, media_urls, created_at")
    .eq("request_id", requestId).order("created_at", { ascending: false }).limit(50);
  if (error) return { error: error.message };
  if (!logs || logs.length === 0) return { message: "No activity logs found.", dog_name: request.dogs?.name };
  return { logs, count: logs.length, dog_name: request.dogs?.name };
}

async function executeGetFoundDogsNearby(supabase: any, _userId: string, status = "active") {
  let query = supabase.from("found_dogs")
    .select("id, description, location_label, found_at, status, created_at, photo_urls, latitude, longitude")
    .order("created_at", { ascending: false }).limit(10);
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { message: "No found dog posts in the community right now." };
  return { found_dogs: data.map((fd: any) => ({ ...fd, has_photos: fd.photo_urls && fd.photo_urls.length > 0 })), count: data.length };
}

async function executeSearchFoundDogsByAttributes(supabase: any, args: any) {
  const daysBack = args.days_back || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const { data, error } = await supabase
    .from("found_dogs")
    .select("id, description, location_label, found_at, status, created_at, photo_urls, latitude, longitude")
    .eq("status", "active")
    .gte("created_at", cutoffDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { message: "No active found dog posts in the last " + daysBack + " days.", matches: [] };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  const posts = data.map((fd: any) => {
    const coverPhoto = fd.photo_urls && fd.photo_urls.length > 0
      ? (fd.photo_urls[0].startsWith("http") ? fd.photo_urls[0] : `${supabaseUrl}/storage/v1/object/public/found-dog-photos/${fd.photo_urls[0]}`)
      : null;
    return {
      id: fd.id,
      description: fd.description || "No description",
      location_label: fd.location_label,
      found_at: fd.found_at,
      created_at: fd.created_at,
      cover_photo_url: coverPhoto,
      latitude: fd.latitude,
      longitude: fd.longitude,
    };
  });

  return {
    search_criteria: {
      breed_guess: args.breed_guess,
      color: args.color,
      size: args.size,
      markings: args.markings || "none specified",
    },
    posts,
    count: posts.length,
    instruction: `CRITICAL MATCHING RULES:
- Color is the MOST important attribute. If the user's dog is brown, do NOT match white/black/other colored dogs. Color mismatch = NO match.
- Size mismatch = NO match.
- Breed similarity is secondary to color match.
- Only return posts that genuinely match the uploaded photo's color AND size.
- If NO posts match, say "No matching found dogs right now" — do NOT force bad matches.

For each genuine match, format as:
**#N - [Location] — [Found date]**
Reason: [explain color/size/breed similarity]
👉 [Open Post](/found-dog/POST_ID) · [Message Reporter](/messages)

If the post has a cover_photo_url, show it as: ![Found dog](cover_photo_url)`,
  };
}

// Execute a tool call
async function executeTool(supabase: any, userId: string, toolName: string, args: any) {
  console.log("Executing tool:", toolName);
  switch (toolName) {
    case "get_my_dogs": return await executeGetMyDogs(supabase, userId);
    case "get_dog_details": return await executeGetDogDetails(supabase, userId, args.dog_id);
    case "get_medication_records": return await executeGetMedicationRecords(supabase, userId, args.dog_id);
    case "get_care_requests": return await executeGetCareRequests(supabase, userId, args.status, args.role);
    case "get_lost_alerts": return await executeGetLostAlerts(supabase, userId, args.status);
    case "get_sitter_logs": return await executeGetSitterLogs(supabase, userId, args.request_id);
    case "get_found_dogs_nearby": return await executeGetFoundDogsNearby(supabase, userId, args.status);
    case "search_found_dogs_by_attributes": return await executeSearchFoundDogsByAttributes(supabase, args);
    default: return { error: `Unknown tool: ${toolName}` };
  }
}

const systemPrompt = `You are RedPaw Assistant, a personalized AI companion for dog owners using the RedPaw app. You have access to the user's personal data through tools.

IMPORTANT BEHAVIOR:
1. When the user asks about their dogs, medications, care requests, or any personal data, ALWAYS call the appropriate tool first.
2. Never say "I don't have access to your records" - you DO have access via tools.
3. If a user has multiple dogs and asks about "my dog", call get_my_dogs first, then ask which dog they mean.
4. Be specific with data: include exact dates, countdowns, and status information.
5. When mentioning specific items, suggest deep links in markdown format.

PHOTO MATCH FEATURE:
- When a user uploads a photo of a dog (especially with messages like "help me find", "my dog is lost", "have you seen", "match this dog"), you MUST:
  1. ANALYZE the photo carefully: identify breed/type, coat color/pattern, size estimate, markings, collar/harness details
  2. Call search_found_dogs_by_attributes with the extracted attributes
  3. STRICT COLOR MATCHING: The dog's color is the #1 filter. If the user's dog is brown, do NOT match white or black dogs. Different color = NOT a match. Never force matches.
  4. Return ONLY genuine matches ranked by similarity with:
     - Match reason (e.g., "Similar brown coat + small size + matches Pomeranian description")
     - Found location + time
     - Links: [Open Post](/found-dog/POST_ID) and [Message Reporter](/messages)
  5. If confidence is low for all matches, say so honestly and suggest widening the search or checking back later
  6. If NO matches found, reassure the user and suggest posting a Lost alert

DEEP LINKS FORMAT (use EXACT route paths):
- Always use relative paths starting with / for in-app links
- Dog profile: [Dog Name](/dog/DOG_ID)
- Found dog post: [Open Post](/found-dog/POST_ID)  ← NOTE: /found-dog/ not /found/
- Lost alert: [View Alert](/lost-alert/ALERT_ID)  ← NOTE: /lost-alert/ not /lost/
- Care request: [View Request](/care-request/REQUEST_ID)  ← NOTE: /care-request/ not /care/
- Messages: [Message](/messages)
- NEVER use full URLs for app pages

CAPABILITIES:
- get_my_dogs, get_dog_details, get_medication_records, get_care_requests, get_lost_alerts, get_sitter_logs, get_found_dogs_nearby
- search_found_dogs_by_attributes: Search found dog posts by visual attributes from a photo

RESPONSE FORMAT:
- Be friendly, concise, and helpful 🐕
- Use markdown for formatting
- Include specific data from tool results

PRIVACY:
- Only share the user's own data
- Never reveal other users' private information (no phone, no home address)
- For community posts, share public info only`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let supabase: any = null;

    if (authHeader?.startsWith("Bearer ")) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
      if (!claimsError && claimsData?.user) {
        userId = claimsData.user.id;
      }
    }

    // Messages may contain multimodal content (text + images)
    // The Gemini model supports vision natively, so we pass them through
    console.log("AI request - messages:", messages.length, "userId:", userId);

    // First API call with tools (non-streaming to handle tool calls)
    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: userId ? tools : undefined,
        tool_choice: userId ? "auto" : undefined,
        stream: false,
      }),
    });

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      console.error("AI gateway error:", initialResponse.status, errorText);
      if (initialResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (initialResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI service requires payment." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const initialData = await initialResponse.json();
    const assistantMessage = initialData.choices?.[0]?.message;

    // Handle tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0 && userId && supabase) {
      console.log("Processing tool calls:", assistantMessage.tool_calls.length);
      const toolResults: any[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let args = {};
        try { args = JSON.parse(toolCall.function.arguments || "{}"); } catch { /* ignore */ }
        const result = await executeTool(supabase, userId, toolName, args);
        toolResults.push({ tool_call_id: toolCall.id, role: "tool", content: JSON.stringify(result) });
      }

      // Second call with tool results - streaming
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, ...messages, assistantMessage, ...toolResults],
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(finalResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
    }

    // No tool calls - stream directly
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(streamResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
