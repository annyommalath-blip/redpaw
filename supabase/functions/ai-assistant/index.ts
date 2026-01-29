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
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dog_details",
      description: "Get detailed information about a specific dog including health logs.",
      parameters: {
        type: "object",
        properties: {
          dog_id: { type: "string", description: "The UUID of the dog" },
        },
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
        properties: {
          dog_id: { type: "string", description: "Optional: specific dog UUID. If omitted, returns records for all user's dogs." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_care_requests",
      description: "Get care requests created by or assigned to the user. Call this when user asks about their care requests, sitter jobs, walks, or watch requests.",
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
      description: "Get lost dog alerts for the user's dogs and any sightings. Call this when user asks about lost dogs, missing pets, or sightings.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["active", "resolved", "all"], description: "Filter by status. Defaults to 'active'." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sitter_logs",
      description: "Get sitter activity logs for a care request. Call this when user asks about what happened during a sitter job, walks, or care activities.",
      parameters: {
        type: "object",
        properties: {
          request_id: { type: "string", description: "The UUID of the care request" },
        },
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
        properties: {
          status: { type: "string", enum: ["active", "reunited", "all"], description: "Filter by status. Defaults to 'active'." },
        },
        required: [],
      },
    },
  },
];

// Tool execution functions
async function executeGetMyDogs(supabase: any, userId: string) {
  console.log("Executing get_my_dogs for user:", userId);
  const { data, error } = await supabase
    .from("dogs")
    .select("id, name, breed, age, date_of_birth, weight, weight_unit, is_lost, photo_url, notes")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching dogs:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { 
      message: "No dogs found. The user hasn't added any dogs yet.",
      suggestion: "You can add a dog by going to Create → Add Dog in the app."
    };
  }

  return { dogs: data, count: data.length };
}

async function executeGetDogDetails(supabase: any, userId: string, dogId: string) {
  console.log("Executing get_dog_details for dog:", dogId);
  
  // Verify ownership
  const { data: dog, error: dogError } = await supabase
    .from("dogs")
    .select("*")
    .eq("id", dogId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (dogError || !dog) {
    return { error: "Dog not found or access denied" };
  }

  // Get recent health logs
  const { data: healthLogs } = await supabase
    .from("health_logs")
    .select("*")
    .eq("dog_id", dogId)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return { dog, healthLogs: healthLogs || [] };
}

async function executeGetMedicationRecords(supabase: any, userId: string, dogId?: string) {
  console.log("Executing get_medication_records for user:", userId, "dog:", dogId);
  
  let query = supabase
    .from("med_records")
    .select(`
      id, name, record_type, date_given, expires_on, duration_value, duration_unit, notes,
      dogs!inner(id, name)
    `)
    .eq("owner_id", userId)
    .order("expires_on", { ascending: true });

  if (dogId) {
    query = query.eq("dog_id", dogId);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error("Error fetching med records:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { 
      message: "No medication or vaccine records found.",
      suggestion: "You can add records by going to Create → Add Medication Record in the app."
    };
  }

  // Calculate status for each record
  const now = new Date();
  const recordsWithStatus = data.map((record: any) => {
    const expiresOn = new Date(record.expires_on);
    const daysUntilExpiry = Math.ceil((expiresOn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let status = "active";
    if (daysUntilExpiry < 0) status = "expired";
    else if (daysUntilExpiry <= 30) status = "expiring_soon";

    return {
      ...record,
      dog_name: record.dogs?.name,
      days_until_expiry: daysUntilExpiry,
      status,
      status_text: daysUntilExpiry < 0 
        ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
        : daysUntilExpiry === 0 
          ? "Expires today"
          : `Expires in ${daysUntilExpiry} days`,
    };
  });

  const expiringSoon = recordsWithStatus.filter((r: any) => r.status === "expiring_soon");
  const expired = recordsWithStatus.filter((r: any) => r.status === "expired");

  return { 
    records: recordsWithStatus, 
    count: data.length,
    expiring_soon_count: expiringSoon.length,
    expired_count: expired.length,
    summary: {
      expiring_soon: expiringSoon.map((r: any) => `${r.dog_name}'s ${r.name} (${r.status_text})`),
      expired: expired.map((r: any) => `${r.dog_name}'s ${r.name} (${r.status_text})`),
    }
  };
}

async function executeGetCareRequests(supabase: any, userId: string, status: string = "open", role: string = "all") {
  console.log("Executing get_care_requests for user:", userId, "status:", status, "role:", role);
  
  let query = supabase
    .from("care_requests")
    .select(`
      id, care_type, time_window, request_date, start_time, end_time, 
      location_label, location_text, notes, pay_offered, pay_amount, pay_currency,
      status, assigned_sitter_id, owner_id, created_at,
      dogs!inner(id, name, breed)
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (role === "owner") {
    query = query.eq("owner_id", userId);
  } else if (role === "sitter") {
    query = query.eq("assigned_sitter_id", userId);
  } else {
    query = query.or(`owner_id.eq.${userId},assigned_sitter_id.eq.${userId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching care requests:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { 
      message: "No care requests found.",
      suggestion: "You can create a care request by going to Create → Request Care in the app."
    };
  }

  const requestsWithRole = data.map((req: any) => ({
    ...req,
    dog_name: req.dogs?.name,
    dog_breed: req.dogs?.breed,
    user_role: req.owner_id === userId ? "owner" : "sitter",
    is_assigned: !!req.assigned_sitter_id,
  }));

  return { 
    requests: requestsWithRole, 
    count: data.length,
    as_owner: requestsWithRole.filter((r: any) => r.user_role === "owner").length,
    as_sitter: requestsWithRole.filter((r: any) => r.user_role === "sitter").length,
  };
}

async function executeGetLostAlerts(supabase: any, userId: string, status: string = "active") {
  console.log("Executing get_lost_alerts for user:", userId, "status:", status);
  
  let query = supabase
    .from("lost_alerts")
    .select(`
      id, title, description, last_seen_location, location_label, status, created_at,
      dogs!inner(id, name, breed, photo_url)
    `)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: alerts, error } = await query;

  if (error) {
    console.error("Error fetching lost alerts:", error);
    return { error: error.message };
  }

  // Get sightings for active alerts
  let sightings: any[] = [];
  if (alerts && alerts.length > 0) {
    const alertIds = alerts.map((a: any) => a.id);
    const { data: sightingsData } = await supabase
      .from("sightings")
      .select("id, alert_id, message, location_text, created_at")
      .in("alert_id", alertIds)
      .order("created_at", { ascending: false })
      .limit(20);
    
    sightings = sightingsData || [];
  }

  if (!alerts || alerts.length === 0) {
    return { 
      message: "No lost dog alerts found for your dogs.",
      suggestion: "If your dog is lost, go to their profile and tap 'Mark as Lost' to create an alert."
    };
  }

  const alertsWithDetails = alerts.map((alert: any) => ({
    ...alert,
    dog_name: alert.dogs?.name,
    dog_breed: alert.dogs?.breed,
    sightings_count: sightings.filter((s: any) => s.alert_id === alert.id).length,
    recent_sightings: sightings.filter((s: any) => s.alert_id === alert.id).slice(0, 3),
  }));

  return { 
    alerts: alertsWithDetails, 
    count: alerts.length,
    total_sightings: sightings.length,
  };
}

async function executeGetSitterLogs(supabase: any, userId: string, requestId: string) {
  console.log("Executing get_sitter_logs for request:", requestId);
  
  // Verify access (user must be owner or sitter)
  const { data: request, error: reqError } = await supabase
    .from("care_requests")
    .select("id, owner_id, assigned_sitter_id, dogs(name)")
    .eq("id", requestId)
    .maybeSingle();

  if (reqError || !request) {
    return { error: "Care request not found" };
  }

  if (request.owner_id !== userId && request.assigned_sitter_id !== userId) {
    return { error: "Access denied to this care request" };
  }

  const { data: logs, error } = await supabase
    .from("sitter_logs")
    .select("id, log_type, note_text, media_urls, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching sitter logs:", error);
    return { error: error.message };
  }

  if (!logs || logs.length === 0) {
    return { 
      message: "No activity logs found for this care request yet.",
      dog_name: request.dogs?.name,
    };
  }

  return { 
    logs, 
    count: logs.length,
    dog_name: request.dogs?.name,
    summary: {
      walks: logs.filter((l: any) => l.log_type === "walk").length,
      meals: logs.filter((l: any) => l.log_type === "meal").length,
      potty: logs.filter((l: any) => l.log_type === "potty").length,
      play: logs.filter((l: any) => l.log_type === "play").length,
      notes: logs.filter((l: any) => l.log_type === "note").length,
    }
  };
}

async function executeGetFoundDogsNearby(supabase: any, userId: string, status: string = "active") {
  console.log("Executing get_found_dogs_nearby, status:", status);
  
  let query = supabase
    .from("found_dogs")
    .select("id, description, location_label, found_at, status, created_at, photo_urls")
    .order("created_at", { ascending: false })
    .limit(10);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching found dogs:", error);
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { message: "No found dog posts in the community right now." };
  }

  return { 
    found_dogs: data.map((fd: any) => ({
      ...fd,
      has_photos: fd.photo_urls && fd.photo_urls.length > 0,
    })), 
    count: data.length 
  };
}

// Execute a tool call
async function executeTool(supabase: any, userId: string, toolName: string, args: any) {
  console.log("Executing tool:", toolName, "with args:", args);
  
  switch (toolName) {
    case "get_my_dogs":
      return await executeGetMyDogs(supabase, userId);
    case "get_dog_details":
      return await executeGetDogDetails(supabase, userId, args.dog_id);
    case "get_medication_records":
      return await executeGetMedicationRecords(supabase, userId, args.dog_id);
    case "get_care_requests":
      return await executeGetCareRequests(supabase, userId, args.status, args.role);
    case "get_lost_alerts":
      return await executeGetLostAlerts(supabase, userId, args.status);
    case "get_sitter_logs":
      return await executeGetSitterLogs(supabase, userId, args.request_id);
    case "get_found_dogs_nearby":
      return await executeGetFoundDogsNearby(supabase, userId, args.status);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

const systemPrompt = `You are RedPaw Assistant, a personalized AI companion for dog owners using the RedPaw app. You have access to the user's personal data through tools.

IMPORTANT BEHAVIOR:
1. When the user asks about their dogs, medications, care requests, or any personal data, ALWAYS call the appropriate tool first.
2. Never say "I don't have access to your records" - you DO have access via tools.
3. If a user has multiple dogs and asks about "my dog", call get_my_dogs first, then ask which dog they mean (listing the names).
4. Be specific with data: include exact dates, countdowns, and status information.
5. When mentioning specific items, suggest deep links in markdown format.

CAPABILITIES:
- get_my_dogs: List all user's dogs
- get_dog_details: Get details about a specific dog
- get_medication_records: Get vaccine/medication records with expiration info
- get_care_requests: Get care requests (as owner or assigned sitter)
- get_lost_alerts: Get lost dog alerts and sightings for user's dogs
- get_sitter_logs: Get activity logs from sitter jobs
- get_found_dogs_nearby: Get found dog posts from the community

RESPONSE FORMAT:
- Be friendly, concise, and helpful 🐕
- Use markdown for formatting
- Include specific data from tool results
- Suggest actions with deep links like: "**[Open Mochi's Profile](/dog/DOG_ID)**"
- For expiring medications, always include the countdown

PRIVACY:
- Only share the user's own data
- Never reveal other users' private information
- For community posts (found dogs), share public info only

EMPTY STATES:
- If no dogs: "You haven't added any dogs yet! Go to **Create → Add Dog** to get started 🐕"
- If no records: "No medication records found. Add them via **Create → Add Medication Record**"`;

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
      console.error("LOVABLE_API_KEY is not configured");
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

      // Get user ID from token
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
      
      if (!claimsError && claimsData?.user) {
        userId = claimsData.user.id;
        console.log("Authenticated user:", userId);
      }
    }

    console.log("Sending request to AI gateway with messages:", messages.length, "userId:", userId);

    // First API call with tools
    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: userId ? tools : undefined, // Only provide tools if user is authenticated
        tool_choice: userId ? "auto" : undefined,
        stream: false, // Don't stream the first call to handle tool calls
      }),
    });

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      console.error("AI gateway error:", initialResponse.status, errorText);
      
      if (initialResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (initialResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service requires payment. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const initialData = await initialResponse.json();
    const assistantMessage = initialData.choices?.[0]?.message;

    // Check if there are tool calls to execute
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0 && userId && supabase) {
      console.log("Processing tool calls:", assistantMessage.tool_calls.length);
      
      const toolResults: any[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch (e) {
          console.error("Failed to parse tool arguments:", e);
        }
        
        const result = await executeTool(supabase, userId, toolName, args);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result),
        });
      }

      // Second API call with tool results - this one streams
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            assistantMessage,
            ...toolResults,
          ],
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error("AI gateway error on final response:", finalResponse.status, errorText);
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Streaming final response after tool execution");
      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - stream the response directly
    // We need to make another request with streaming since the first was non-streaming
    console.log("No tool calls, streaming response directly");
    
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
