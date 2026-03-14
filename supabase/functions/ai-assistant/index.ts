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
      description: "Get lost dog alerts for the CURRENT USER's own dogs only. DO NOT use this for matching found dogs — use match_found_dog_to_lost instead.",
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
      description: "Get found dog posts for browsing. DO NOT use this for matching lost dogs — use reverse_match_lost_to_found instead.",
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
          markings: { type: "string", description: "Notable visual markings, patterns, collar/harness details" },
          days_back: { type: "number", description: "How many days back to search. Default 30." },
        },
        required: ["breed_guess", "color", "size"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_lost_dogs_by_attributes",
      description: "Search lost dog alerts by visual attributes. Call this when someone reports finding a dog (photo or description) and you want to check if it matches any lost dog. This tool has breed elimination — it will NOT return a Pomeranian when you describe a Husky. Use this instead of get_lost_alerts for ANY matching scenario.",
      parameters: {
        type: "object",
        properties: {
          breed_guess: { type: "string", description: "Best guess of the breed (e.g., 'Siberian Husky', 'Pomeranian', 'Labrador mix')" },
          color: { type: "string", description: "Primary coat color (e.g., 'black and white', 'golden', 'brown')" },
          size: { type: "string", enum: ["small", "medium", "large"], description: "Estimated size category" },
          latitude: { type: "number", description: "Latitude where the dog was found (optional)" },
          longitude: { type: "number", description: "Longitude where the dog was found (optional)" },
          markings: { type: "string", description: "Notable markings, collar, harness details" },
          days_back: { type: "number", description: "How many days back to search. Default 14." },
        },
        required: ["breed_guess", "color", "size"],
      },
    },
  },
  // --- NEW MATCHING PIPELINE TOOLS ---
  {
    type: "function",
    function: {
      name: "analyze_found_dog_photo",
      description: "Analyze a found dog photo to extract identifying features. Call this when processing a found dog report or when a finder uploads a photo. Returns structured attributes with confidence levels.",
      parameters: {
        type: "object",
        properties: {
          image_description: { type: "string", description: "Detailed description of the dog photo as seen by the AI vision model" },
          image_quality: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"], description: "Quality of the uploaded image" },
        },
        required: ["image_description", "image_quality"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_found_dog_attributes",
      description: "Save AI-extracted attributes and finder observations to a found dog post. Call this after analyzing a found dog photo and collecting finder observations.",
      parameters: {
        type: "object",
        properties: {
          found_dog_id: { type: "string", description: "UUID of the found dog post" },
          ai_attributes: { type: "object", description: "The AI-extracted attributes JSON" },
          finder_observations: { type: "object", description: "Finder's manual answers" },
          image_quality: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"], description: "Quality of the uploaded image" },
          confidence_level: { type: "string", enum: ["high", "medium", "low"], description: "Overall confidence level of the analysis" },
        },
        required: ["found_dog_id", "ai_attributes", "image_quality", "confidence_level"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "match_found_dog_to_lost",
      description: "THE ONLY WAY to match a found dog to lost alerts. Uses breed elimination, weighted scoring, and identity verification. You MUST call this tool (not get_lost_alerts) whenever someone reports finding a dog or asks if a found dog matches any lost dog.",
      parameters: {
        type: "object",
        properties: {
          found_dog_id: { type: "string", description: "UUID of the found dog post" },
          max_results: { type: "number", description: "Maximum number of match results to return. Default 3." },
        },
        required: ["found_dog_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_dog_identity_details",
      description: "Save detailed identity fingerprint for a dog. Call this when the owner provides distinctive details about their dog for matching — coat shade, markings, collar, behavior, unique traits, and a verification secret.",
      parameters: {
        type: "object",
        properties: {
          dog_id: { type: "string", description: "UUID of the dog" },
          coat_shade: { type: "string", description: "Detailed coat shade description" },
          markings: { type: "array", items: { type: "string" }, description: "List of distinctive markings" },
          collar_description: { type: "string", description: "Description of collar/harness" },
          visible_conditions: { type: "string", description: "Visible health conditions" },
          behavior_description: { type: "string", description: "Behavior when approached by strangers" },
          unique_traits: { type: "array", items: { type: "string" }, description: "List of unique traits" },
          verification_secret: { type: "string", description: "Secret detail only the owner would know, used for ownership verification" },
        },
        required: ["dog_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verify_dog_ownership",
      description: "Verify a dog owner's identity by checking their verification secret. Call this when an owner claims a found dog matches theirs, to prevent fraudulent claims.",
      parameters: {
        type: "object",
        properties: {
          dog_id: { type: "string", description: "UUID of the dog" },
          owner_secret_answer: { type: "string", description: "What the owner provides as their secret" },
        },
        required: ["dog_id", "owner_secret_answer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_match_candidates",
      description: "Get existing match candidates for a lost alert or found dog post. Call this when an owner wants to see potential matches for their lost dog, or to check status of existing matches.",
      parameters: {
        type: "object",
        properties: {
          lost_alert_id: { type: "string", description: "UUID of the lost alert" },
          found_dog_id: { type: "string", description: "UUID of the found dog post" },
          status: { type: "string", enum: ["pending", "owner_confirmed", "owner_rejected", "finder_confirmed", "verified", "dismissed", "all"], description: "Filter by match status. Defaults to 'pending'." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_match_status",
      description: "Update the status of a dog match. Call this when an owner confirms or rejects a match, or when a finder confirms.",
      parameters: {
        type: "object",
        properties: {
          match_id: { type: "string", description: "UUID of the match record" },
          new_status: { type: "string", enum: ["owner_confirmed", "owner_rejected", "finder_confirmed", "verified", "dismissed"], description: "New status for the match" },
        },
        required: ["match_id", "new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reverse_match_lost_to_found",
      description: "When a new lost dog alert is filed, search existing found dog posts for potential matches. This is the reverse of match_found_dog_to_lost. Call this when a user reports their dog lost.",
      parameters: {
        type: "object",
        properties: {
          lost_alert_id: { type: "string", description: "UUID of the lost alert" },
        },
        required: ["lost_alert_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estimate_search_radius",
      description: "Estimate how far a lost dog may have traveled based on breed, time elapsed, and terrain. Returns a search radius in km and advice. Call this when the user shares details about a lost dog (breed, time lost, location). The result includes map data the frontend will render as an interactive map.",
      parameters: {
        type: "object",
        properties: {
          breed: { type: "string", description: "The breed of the lost dog" },
          hours_lost: { type: "number", description: "Approximate number of hours since the dog was last seen" },
          last_seen_lat: { type: "number", description: "Latitude of the last seen location" },
          last_seen_lon: { type: "number", description: "Longitude of the last seen location" },
          last_seen_label: { type: "string", description: "Human-readable description of last seen location" },
          dog_size: { type: "string", enum: ["small", "medium", "large"], description: "Size of the dog if breed is unknown" },
          is_leashed: { type: "boolean", description: "Whether the dog escaped while leashed (limits range)" },
          terrain: { type: "string", enum: ["urban", "suburban", "rural", "wilderness"], description: "Type of terrain around last seen location. Default: suburban" },
        },
        required: ["breed", "hours_lost", "last_seen_lat", "last_seen_lon"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_lost_alert",
      description: "Create a lost dog alert in the community. Call this when a user wants to post/create a lost alert for their dog. Requires the dog_id, a title, description, and last seen location. Optionally accepts coordinates, last_seen_time, and search_radius_km.",
      parameters: {
        type: "object",
        properties: {
          dog_id: { type: "string", description: "UUID of the dog to report lost" },
          title: { type: "string", description: "Alert title, e.g. 'Mochi is Missing!'" },
          description: { type: "string", description: "Description including key identifiers like breed, color, collar" },
          last_seen_location: { type: "string", description: "Text description of where the dog was last seen" },
          latitude: { type: "number", description: "Latitude of last seen location" },
          longitude: { type: "number", description: "Longitude of last seen location" },
          last_seen_time: { type: "string", description: "ISO timestamp of when the dog was last seen" },
          search_radius_km: { type: "number", description: "Estimated search radius in km" },
        },
        required: ["dog_id", "title", "description", "last_seen_location"],
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
    .select("id, description, location_label, found_at, status, created_at, photo_urls, latitude, longitude, reporter_id")
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
      reporter_id: fd.reporter_id,
      view_link: `/found-dog/${fd.id}`,
      message_link: `/messages/new/${fd.reporter_id}`,
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
👉 [Open Post](/found-dog/POST_ID) · [Message Reporter](/messages/new/REPORTER_ID)

Use the view_link and message_link from each post object for the actual links.
If the post has a cover_photo_url, show it as: ![Found dog](cover_photo_url)`,
  };
}

async function executeSearchLostDogsByAttributes(supabase: any, args: any) {
  const daysBack = args.days_back || 14;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  const { data: alerts, error } = await supabase
    .from("lost_alerts")
    .select(`id, title, description, location_label, latitude, longitude, created_at, status,
             dogs!inner(id, name, breed, photo_url, coat_shade, markings, collar_description, weight, weight_unit)`)
    .eq("status", "active")
    .gte("created_at", cutoffDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { error: error.message };
  if (!alerts || alerts.length === 0) return { matches: [], count: 0, message: "No active lost dog alerts in the last " + daysBack + " days." };

  const foundBreed = (args.breed_guess || "").toLowerCase();
  const foundColor = (args.color || "").toLowerCase();
  const foundSize = (args.size || "").toLowerCase();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  const matches = alerts.map((alert: any) => {
    const dog = alert.dogs;
    const lostBreed = (dog.breed || "").toLowerCase();

    // HARD BREED ELIMINATION — different known breeds = instant reject
    if (foundBreed && lostBreed) {
      const breedMatch = foundBreed.includes(lostBreed) || lostBreed.includes(foundBreed) ||
        foundBreed.split(/[\s/]+/).filter((w: string) => w.length > 2).some((w: string) => lostBreed.includes(w)) ||
        lostBreed.split(/[\s/]+/).filter((w: string) => w.length > 2).some((w: string) => foundBreed.includes(w));
      if (!breedMatch && !foundBreed.includes("mix") && !lostBreed.includes("mix") &&
          !foundBreed.includes("unknown") && !lostBreed.includes("unknown")) {
        return null; // Husky ≠ Pomeranian → eliminated
      }
    }

    // SIZE ELIMINATION
    if (foundSize && dog.weight) {
      const w = parseFloat(dog.weight);
      const lostSize = w < 10 ? "small" : w > 25 ? "large" : "medium";
      if (foundSize !== lostSize) return null;
    }

    // Score remaining candidates
    let score = 0;
    if (foundBreed && lostBreed && (foundBreed.includes(lostBreed) || lostBreed.includes(foundBreed))) score += 40;
    const lostColor = (dog.coat_shade || "").toLowerCase();
    if (foundColor && lostColor && (foundColor.includes(lostColor) || lostColor.includes(foundColor))) score += 30;
    else if (foundColor && lostColor) score -= 10;

    // Location proximity bonus
    if (args.latitude && args.longitude && alert.latitude && alert.longitude) {
      const R = 6371;
      const dLat = (args.latitude - alert.latitude) * Math.PI / 180;
      const dLon = (args.longitude - alert.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(alert.latitude * Math.PI / 180) * Math.cos(args.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist <= 5) score += 20;
      else if (dist <= 15) score += 10;
    }

    if (score <= 0) return null;

    const confidence = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
    const dogPhoto = dog.photo_url
      ? (dog.photo_url.startsWith("http") ? dog.photo_url : `${supabaseUrl}/storage/v1/object/public/dog-photos/${dog.photo_url}`)
      : null;

    return {
      alert_id: alert.id,
      dog_name: dog.name,
      dog_breed: dog.breed,
      dog_photo_url: dogPhoto,
      location_label: alert.location_label,
      created_at: alert.created_at,
      score,
      confidence,
      display_title: `🐕 ${dog.name} (${dog.breed || "unknown"}) — **${score}% match (${confidence} confidence)**`,
      view_link: `/lost-alert/${alert.id}`,
      message_link: `/messages/new/${alert.owner_id}`,
    };
  }).filter(Boolean);

  matches.sort((a: any, b: any) => b.score - a.score);
  const top = matches.slice(0, 5);

  return {
    search_criteria: { breed: args.breed_guess, color: args.color, size: args.size },
    matches: top,
    count: top.length,
    instruction: top.length > 0
      ? `Use EXACTLY this format for each match:

### Match #N
{display_title}
Location: {location_label}
Date: {created_at}
{dog_photo_url ? "![Dog photo](dog_photo_url)" : ""}
👉 [Open Post]({view_link}) · [Message Reporter]({message_link})

DO NOT show dogs that were eliminated by breed. If you only see 1 match, show only 1. Do NOT pad with unrelated dogs.
After listing, ask "Does this look like the dog you found?"`
      : "No matching lost dogs found. Suggest the user post a Found Dog alert so owners can find them.",
  };
}

// --- NEW TOOL EXECUTION FUNCTIONS ---

async function executeAnalyzeFoundDogPhoto(_supabase: any, args: any) {
  const { image_description, image_quality } = args;
  return {
    image_description,
    image_quality,
    instruction: "Based on your visual analysis, structure the findings as: breed_guess, primary_color, secondary_color, size (small/medium/large), coat_length (short/medium/long), coat_texture (smooth/wiry/curly/fluffy), ear_type (floppy/semi-erect/erect), tail_type (long/short/curly/docked/bushy), visible_markings, collar_or_harness (description or 'none visible'), visible_conditions, age_appearance (puppy/young_adult/adult/senior), nose_color, distinguishing_features. For each field include confidence: HIGH/MEDIUM/LOW/CANNOT_DETERMINE. If image_quality is LOW, still attempt all fields with appropriate confidence ratings.",
  };
}

async function executeSaveFoundDogAttributes(supabase: any, args: any) {
  const { found_dog_id, ai_attributes, finder_observations, image_quality, confidence_level } = args;
  const { error } = await supabase
    .from("found_dogs")
    .update({
      ai_attributes: ai_attributes || {},
      finder_observations: finder_observations || {},
      image_quality: image_quality,
      confidence_level: confidence_level,
    })
    .eq("id", found_dog_id);
  if (error) return { error: error.message };
  return { success: true, message: "Attributes saved successfully" };
}

async function executeMatchFoundDogToLost(supabase: any, args: any) {
  const { found_dog_id, max_results = 3 } = args;

  // 1. Get the found dog with its AI attributes
  const { data: foundDog, error: fdError } = await supabase
    .from("found_dogs")
    .select("*")
    .eq("id", found_dog_id)
    .maybeSingle();
  if (fdError || !foundDog) return { error: "Found dog post not found" };

  const aiAttrs = foundDog.ai_attributes || {};
  const finderObs = foundDog.finder_observations || {};

  // 2. Get all active lost alerts with full dog details
  const { data: lostAlerts, error: laError } = await supabase
    .from("lost_alerts")
    .select(`id, title, description, last_seen_location, location_label, latitude, longitude,
             last_seen_time, search_radius_km, created_at, status, owner_id,
             dogs!inner(id, name, breed, age, date_of_birth, weight, weight_unit, photo_url, photo_urls,
                        coat_shade, markings, collar_description, visible_conditions,
                        behavior_description, unique_traits)`)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (laError) return { error: laError.message };
  if (!lostAlerts || lostAlerts.length === 0) {
    return {
      matches: [],
      count: 0,
      message: "No active lost dog alerts right now. We've saved this found dog report and will automatically check when new lost dogs are reported.",
    };
  }

  // 3. Build candidates with scoring breakdown
  const candidates = lostAlerts.map((alert: any) => {
    const dog = alert.dogs;
    const scores: any = {};
    let totalScore = 0;
    let maxPossibleScore = 0;

    // --- COLOR MATCH (weight: 25%) ---
    const foundColor = (aiAttrs.primary_color || "").toLowerCase();
    const lostCoatShade = (dog.coat_shade || "").toLowerCase();
    const lostBreed = (dog.breed || "").toLowerCase();
    if (foundColor && lostCoatShade) {
      if (foundColor === lostCoatShade || lostCoatShade.includes(foundColor) || foundColor.includes(lostCoatShade)) {
        scores.color = { score: 1, weight: 0.25, detail: `Match: "${foundColor}" ≈ "${lostCoatShade}"` };
      } else {
        scores.color = { score: 0, weight: 0.25, detail: `Mismatch: found "${foundColor}" vs lost "${lostCoatShade}"` };
      }
      totalScore += scores.color.score * scores.color.weight;
      maxPossibleScore += 0.25;
    }

    // --- SIZE MATCH (weight: 15%) ---
    const foundSize = (aiAttrs.size || "").toLowerCase();
    if (foundSize && dog.weight) {
      const weightNum = parseFloat(dog.weight);
      let lostSize = "medium";
      if (weightNum < 10) lostSize = "small";
      else if (weightNum > 25) lostSize = "large";
      scores.size = {
        score: foundSize === lostSize ? 1 : 0,
        weight: 0.15,
        detail: `Found: ${foundSize}, Lost: ${lostSize} (${dog.weight} ${dog.weight_unit || "kg"})`,
      };
      totalScore += scores.size.score * scores.size.weight;
      maxPossibleScore += 0.15;
    }

    // --- BREED MATCH (weight: 15%) — ELIMINATES on clear mismatch ---
    const foundBreed = (aiAttrs.breed_guess || "").toLowerCase();
    if (foundBreed && lostBreed) {
      const foundWords = foundBreed.split(/[\s/]+/).filter((w: string) => w.length > 2);
      const lostWords = lostBreed.split(/[\s/]+/).filter((w: string) => w.length > 2);
      const breedMatch = foundBreed.includes(lostBreed) || lostBreed.includes(foundBreed) ||
        foundWords.some((w: string) => lostBreed.includes(w)) ||
        lostWords.some((w: string) => foundBreed.includes(w));

      // If both breeds are known and clearly different, ELIMINATE this candidate
      if (!breedMatch && !foundBreed.includes("mix") && !lostBreed.includes("mix") &&
          !foundBreed.includes("unknown") && !lostBreed.includes("unknown")) {
        return null; // Hard elimination — Husky ≠ Pomeranian
      }

      scores.breed = { score: breedMatch ? 1 : 0, weight: 0.15, detail: `Found: "${foundBreed}" vs Lost: "${lostBreed}"` };
      totalScore += scores.breed.score * scores.breed.weight;
      maxPossibleScore += 0.15;
    }

    // --- LOCATION PROXIMITY (weight: 20%) ---
    if (foundDog.latitude && foundDog.longitude && alert.latitude && alert.longitude) {
      const R = 6371;
      const dLat = (foundDog.latitude - alert.latitude) * Math.PI / 180;
      const dLon = (foundDog.longitude - alert.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(alert.latitude * Math.PI / 180) * Math.cos(foundDog.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      let locScore = 0;
      if (distKm <= 2) locScore = 1;
      else if (distKm <= 5) locScore = 0.7;
      else if (distKm <= 15) locScore = 0.4;
      else if (distKm <= 30) locScore = 0.1;

      scores.location = { score: locScore, weight: 0.20, detail: `${distKm.toFixed(1)} km apart`, distance_km: distKm };
      totalScore += scores.location.score * scores.location.weight;
      maxPossibleScore += 0.20;
    }

    // --- MARKINGS MATCH (weight: 10%) ---
    const foundMarkings = (aiAttrs.visible_markings || "").toLowerCase();
    const lostMarkings = (dog.markings || []).map((m: string) => m.toLowerCase());
    if (foundMarkings && lostMarkings.length > 0) {
      const markingHits = lostMarkings.filter((m: string) => foundMarkings.includes(m) || m.split(" ").some((w: string) => foundMarkings.includes(w)));
      const markScore = markingHits.length / lostMarkings.length;
      scores.markings = { score: markScore, weight: 0.10, detail: `${markingHits.length}/${lostMarkings.length} markings matched` };
      totalScore += scores.markings.score * scores.markings.weight;
      maxPossibleScore += 0.10;
    }

    // --- COLLAR MATCH (weight: 10%) ---
    const foundCollar = (aiAttrs.collar_or_harness || "").toLowerCase();
    const lostCollar = (dog.collar_description || "").toLowerCase();
    if (foundCollar && lostCollar && foundCollar !== "none visible") {
      const collarMatch = foundCollar.split(" ").some((w: string) => w.length > 2 && lostCollar.includes(w));
      scores.collar = { score: collarMatch ? 1 : 0, weight: 0.10, detail: `Found: "${foundCollar}" vs Lost: "${lostCollar}"` };
      totalScore += scores.collar.score * scores.collar.weight;
      maxPossibleScore += 0.10;
    }

    // --- TIME PLAUSIBILITY (weight: 5%) ---
    const lostTime = alert.last_seen_time ? new Date(alert.last_seen_time) : new Date(alert.created_at);
    const foundTime = new Date(foundDog.found_at);
    const hoursElapsed = (foundTime.getTime() - lostTime.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed >= 0 && hoursElapsed < 168) { // within 7 days
      const timeScore = hoursElapsed <= 24 ? 1 : hoursElapsed <= 72 ? 0.6 : 0.3;
      scores.time = { score: timeScore, weight: 0.05, detail: `${hoursElapsed.toFixed(0)} hours elapsed` };
      totalScore += scores.time.score * scores.time.weight;
      maxPossibleScore += 0.05;
    } else if (hoursElapsed < 0) {
      scores.time = { score: 0, weight: 0.05, detail: "Found before lost — impossible, eliminating" };
      return null; // eliminate
    }

    // Normalize score
    const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;

    let confidence = "low";
    if (normalizedScore >= 0.7) confidence = "high";
    else if (normalizedScore >= 0.4) confidence = "medium";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const dogPhotoUrl = dog.photo_url
      ? (dog.photo_url.startsWith("http") ? dog.photo_url : `${supabaseUrl}/storage/v1/object/public/dog-photos/${dog.photo_url}`)
      : null;

    const confPct = Math.round(normalizedScore * 100);
    return {
      alert_id: alert.id,
      dog_name: dog.name,
      dog_breed: dog.breed,
      dog_photo_url: dogPhotoUrl,
      owner_id: alert.owner_id,
      match_score: Math.round(normalizedScore * 100) / 100,
      confidence,
      confidence_pct: `${confPct}%`,
      display_title: `🐕 ${dog.name} (${dog.breed || "unknown breed"}) — **${confPct}% match (${confidence} confidence)**`,
      view_link: `/lost-alert/${alert.id}`,
      scores,
      last_seen_location: alert.location_label || alert.last_seen_location,
      lost_since: alert.created_at,
    };
  }).filter(Boolean);

  // Sort by score descending, take top N
  candidates.sort((a: any, b: any) => b.match_score - a.match_score);
  const topMatches = candidates.slice(0, max_results).filter((c: any) => c.match_score > 0.3);

  // Save matches to dog_matches table
  for (const match of topMatches) {
    await supabase.from("dog_matches").insert({
      found_dog_id,
      lost_alert_id: match.alert_id,
      match_score: match.match_score,
      confidence: match.confidence,
      match_details: match.scores,
      status: "pending",
    }).catch(() => {}); // ignore duplicate errors
  }

  if (topMatches.length === 0) {
    return {
      matches: [],
      count: 0,
      message: "No matching lost dogs found right now. We've saved this report — if a matching lost dog is reported later, the owner will be notified automatically.",
      instruction: "Tell the user no matches were found but their report is saved. If they saw the dog recently and it's still nearby, suggest they try to keep the dog safe or check back.",
    };
  }

  // Detect same-breed collision and build disambiguation questions
  const sameBreedCollision = topMatches.filter((m: any) => m.dog_breed === topMatches[0]?.dog_breed).length > 1;
  let disambiguationQuestions: string[] = [];

  if (sameBreedCollision && topMatches.length > 1) {
    // Find differentiating features between candidates
    const candidates = topMatches.filter((m: any) => m.dog_breed === topMatches[0]?.dog_breed);
    const names = candidates.map((c: any) => c.dog_name);

    // Compare coat shades
    const coatShades = candidates.map((c: any) => c.scores?.color?.detail || "unknown");
    if (new Set(coatShades).size > 1) {
      disambiguationQuestions.push(`Was the dog's coat more light/pale or dark/deep in color?`);
    }

    // Compare collar info
    const collarInfos = candidates.map((c: any) => c.scores?.collar?.detail || "unknown");
    if (new Set(collarInfos).size > 1) {
      disambiguationQuestions.push(`What color was the collar or harness? Any tags or dangling charms?`);
    }

    // Compare locations
    const locations = candidates.map((c: any) => c.last_seen_location || "unknown");
    if (new Set(locations).size > 1) {
      disambiguationQuestions.push(`Where exactly did you see the dog? (${locations.join(" vs ")})`);
    }

    // Always ask about size/age appearance for same-breed
    disambiguationQuestions.push(`Did the dog look young and energetic, or older and calm?`);
    disambiguationQuestions.push(`Compared to average for the breed, was it smaller, average, or bigger?`);

    // Limit to 3 most useful questions
    disambiguationQuestions = disambiguationQuestions.slice(0, 3);
  }

  return {
    matches: topMatches,
    count: topMatches.length,
    same_breed_collision: sameBreedCollision,
    disambiguation_questions: disambiguationQuestions,
    instruction: sameBreedCollision
      ? `STOP — DO NOT just list matches and stop. You MUST ask disambiguation questions before concluding.

Say: "I found ${topMatches.length} ${topMatches[0]?.dog_breed || "dogs"} reported lost nearby. Before I can narrow it down, I need a few quick details about the dog you found:"

Then ask these questions ONE BY ONE (wait for answers):
${disambiguationQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Show the match photos so the finder can visually compare:
${topMatches.map((m: any) => `- ${m.dog_name} (${m.confidence} confidence): ${m.dog_photo_url ? `![${m.dog_name}](${m.dog_photo_url})` : "no photo"}`).join("\n")}

After the finder answers, re-evaluate which match fits best and present your recommendation with reasoning.
DO NOT just dump all matches and say "does any of these look like the dog you found?" — that's not helpful.`
      : `For EACH match you MUST include ALL of these:
1. Dog name, breed, and photo (if available as ![Dog](url))
2. **Confidence: X% (high/medium/low)** — NEVER skip this
3. Key reasons WHY it matched (color, location proximity, breed)
4. Key differences or uncertainties
5. [View Alert](/lost-alert/ALERT_ID) — link to the lost alert
6. Ask the finder: "Does this look like the dog you found?"
If confidence is low, say so honestly.`,
  };
}

async function executeSaveDogIdentityDetails(supabase: any, userId: string, args: any) {
  const { dog_id, ...details } = args;
  // Verify ownership
  const { data: dog, error: dogErr } = await supabase
    .from("dogs").select("id").eq("id", dog_id).eq("owner_id", userId).maybeSingle();
  if (dogErr || !dog) return { error: "Dog not found or access denied" };

  const updateData: any = {};
  if (details.coat_shade !== undefined) updateData.coat_shade = details.coat_shade;
  if (details.markings !== undefined) updateData.markings = details.markings;
  if (details.collar_description !== undefined) updateData.collar_description = details.collar_description;
  if (details.visible_conditions !== undefined) updateData.visible_conditions = details.visible_conditions;
  if (details.behavior_description !== undefined) updateData.behavior_description = details.behavior_description;
  if (details.unique_traits !== undefined) updateData.unique_traits = details.unique_traits;
  if (details.verification_secret !== undefined) updateData.verification_secret = details.verification_secret;

  const { error } = await supabase.from("dogs").update(updateData).eq("id", dog_id);
  if (error) return { error: error.message };
  return { success: true, message: "Dog identity details saved. These will be used for matching if your dog is ever reported found." };
}

async function executeVerifyDogOwnership(supabase: any, userId: string, args: any) {
  const { dog_id, owner_secret_answer } = args;
  const { data: dog, error } = await supabase
    .from("dogs").select("verification_secret, name").eq("id", dog_id).eq("owner_id", userId).maybeSingle();
  if (error || !dog) return { error: "Dog not found or access denied" };
  if (!dog.verification_secret) return { verified: true, message: "No verification secret was set for this dog. Consider adding one for security.", needs_secret: true };

  const secretMatch = dog.verification_secret.toLowerCase().trim() === owner_secret_answer.toLowerCase().trim();
  return {
    verified: secretMatch,
    message: secretMatch
      ? `Verification successful! You've confirmed ownership of ${dog.name}.`
      : "Verification failed. The answer doesn't match. Please try again or contact support.",
  };
}

async function executeGetMatchCandidates(supabase: any, args: any) {
  let query = supabase.from("dog_matches")
    .select(`id, match_score, confidence, match_details, status, created_at,
             found_dogs!inner(id, photo_urls, description, location_label, found_at, ai_attributes, latitude, longitude),
             lost_alerts!inner(id, title, location_label, dogs!inner(name, breed, photo_url))`)
    .order("match_score", { ascending: false })
    .limit(10);

  if (args.lost_alert_id) query = query.eq("lost_alert_id", args.lost_alert_id);
  if (args.found_dog_id) query = query.eq("found_dog_id", args.found_dog_id);
  if (args.status && args.status !== "all") query = query.eq("status", args.status);

  const { data, error } = await query;
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { message: "No match candidates found.", matches: [] };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return {
    matches: data.map((m: any) => ({
      ...m,
      found_dog_cover_photo: m.found_dogs?.photo_urls?.[0]
        ? (m.found_dogs.photo_urls[0].startsWith("http") ? m.found_dogs.photo_urls[0] : `${supabaseUrl}/storage/v1/object/public/found-dog-photos/${m.found_dogs.photo_urls[0]}`)
        : null,
    })),
    count: data.length,
  };
}

async function executeUpdateMatchStatus(supabase: any, args: any) {
  const { match_id, new_status } = args;
  const { error } = await supabase.from("dog_matches")
    .update({ status: new_status, updated_at: new Date().toISOString() })
    .eq("id", match_id);
  if (error) return { error: error.message };
  return { success: true, message: `Match status updated to ${new_status}` };
}

async function executeReverseMatchLostToFound(supabase: any, args: any) {
  const { lost_alert_id } = args;

  const { data: alert, error: alertErr } = await supabase
    .from("lost_alerts")
    .select(`*, dogs!inner(*)`)
    .eq("id", lost_alert_id)
    .maybeSingle();
  if (alertErr || !alert) return { error: "Lost alert not found" };

  const dog = alert.dogs;

  // Get recent active found dogs with AI attributes
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14); // 2 weeks back
  const { data: foundDogs, error: fdErr } = await supabase
    .from("found_dogs")
    .select("*")
    .eq("status", "active")
    .gte("created_at", cutoff.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  if (fdErr) return { error: fdErr.message };
  if (!foundDogs || foundDogs.length === 0) {
    return { matches: [], count: 0, message: "No recent found dog posts to match against. We'll notify you if a matching dog is found." };
  }

  const candidates = foundDogs.map((fd: any) => {
    const aiAttrs = fd.ai_attributes || {};
    let score = 0;
    let maxScore = 0;
    const details: any = {};

    // Color
    const fdColor = (aiAttrs.primary_color || "").toLowerCase();
    const dogShade = (dog.coat_shade || "").toLowerCase();
    if (fdColor && dogShade) {
      maxScore += 0.25;
      const colorMatch = fdColor.includes(dogShade) || dogShade.includes(fdColor) ||
        fdColor.split(" ").some((w: string) => dogShade.includes(w));
      score += colorMatch ? 0.25 : 0;
      details.color = { matched: colorMatch, found: fdColor, lost: dogShade };
    }

    // Breed — ELIMINATES on clear mismatch
    const fdBreed = (aiAttrs.breed_guess || "").toLowerCase();
    const dogBreed = (dog.breed || "").toLowerCase();
    if (fdBreed && dogBreed) {
      const breedMatch = fdBreed.includes(dogBreed) || dogBreed.includes(fdBreed) ||
        fdBreed.split(/[\s/]+/).filter((w: string) => w.length > 2).some((w: string) => dogBreed.includes(w)) ||
        dogBreed.split(/[\s/]+/).filter((w: string) => w.length > 2).some((w: string) => fdBreed.includes(w));

      // Hard elimination for clearly different breeds
      if (!breedMatch && !fdBreed.includes("mix") && !dogBreed.includes("mix") &&
          !fdBreed.includes("unknown") && !dogBreed.includes("unknown")) {
        return null;
      }

      maxScore += 0.15;
      score += breedMatch ? 0.15 : 0;
      details.breed = { matched: breedMatch, found: fdBreed, lost: dogBreed };
    }

    // Location
    if (fd.latitude && fd.longitude && alert.latitude && alert.longitude) {
      maxScore += 0.20;
      const R = 6371;
      const dLat = (fd.latitude - alert.latitude) * Math.PI / 180;
      const dLon = (fd.longitude - alert.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(alert.latitude * Math.PI / 180) * Math.cos(fd.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const locScore = dist <= 2 ? 1 : dist <= 5 ? 0.7 : dist <= 15 ? 0.4 : dist <= 30 ? 0.1 : 0;
      score += locScore * 0.20;
      details.location = { distance_km: dist.toFixed(1), score: locScore };
    }

    // Size
    const fdSize = (aiAttrs.size || "").toLowerCase();
    if (fdSize && dog.weight) {
      maxScore += 0.15;
      const w = parseFloat(dog.weight);
      const dogSize = w < 10 ? "small" : w > 25 ? "large" : "medium";
      score += fdSize === dogSize ? 0.15 : 0;
      details.size = { matched: fdSize === dogSize, found: fdSize, lost: dogSize };
    }

    const normalizedScore = maxScore > 0 ? score / maxScore : 0;
    if (normalizedScore < 0.3) return null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const coverPhoto = fd.photo_urls?.[0]
      ? (fd.photo_urls[0].startsWith("http") ? fd.photo_urls[0] : `${supabaseUrl}/storage/v1/object/public/found-dog-photos/${fd.photo_urls[0]}`)
      : null;

    const conf = normalizedScore >= 0.7 ? "high" : normalizedScore >= 0.4 ? "medium" : "low";
    const confPct = Math.round(normalizedScore * 100);
    return {
      found_dog_id: fd.id,
      reporter_id: fd.reporter_id,
      cover_photo_url: coverPhoto,
      description: fd.description,
      location_label: fd.location_label,
      found_at: fd.found_at,
      match_score: Math.round(normalizedScore * 100) / 100,
      confidence: conf,
      confidence_pct: `${confPct}%`,
      display_title: `📍 ${fd.location_label} — **${confPct}% match (${conf} confidence)**`,
      view_link: `/found-dog/${fd.id}`,
      message_link: `/messages/new/${fd.reporter_id}`,
      details,
    };
  }).filter(Boolean);

  candidates.sort((a: any, b: any) => b.match_score - a.match_score);
  const top = candidates.slice(0, 5);

  for (const match of top) {
    await supabase.from("dog_matches").insert({
      found_dog_id: match.found_dog_id,
      lost_alert_id,
      match_score: match.match_score,
      confidence: match.confidence,
      match_details: match.details,
      status: "pending",
    }).catch(() => {});
  }

  return {
    matches: top,
    count: top.length,
    instruction: top.length > 0
      ? `Use EXACTLY this format for each match (copy the display_title, view_link, message_link from the data):

### Match #N
{display_title}
Found: {found_at date}
Description: {description}
👉 [Open Post]({view_link}) · [Message Reporter]({message_link})

The display_title already contains the confidence %. DO NOT omit it. DO NOT rephrase it.
After all matches, ask "Does any of these look like your dog?"`
      : "No matches found yet. Reassure the owner their alert is live and they'll be notified when found dogs are reported.",
  };
}

// Breed speed/range data for search radius estimation
const BREED_RANGE_DATA: Record<string, { speed_kmh: number; endurance: "low" | "medium" | "high" }> = {
  // High endurance / fast breeds
  "Siberian Husky": { speed_kmh: 8, endurance: "high" },
  "Alaskan Malamute": { speed_kmh: 7, endurance: "high" },
  "German Shepherd Dog": { speed_kmh: 7, endurance: "high" },
  "Belgian Malinois": { speed_kmh: 8, endurance: "high" },
  "Border Collie": { speed_kmh: 8, endurance: "high" },
  "Australian Shepherd": { speed_kmh: 7, endurance: "high" },
  "Labrador Retriever": { speed_kmh: 6, endurance: "high" },
  "Golden Retriever": { speed_kmh: 6, endurance: "high" },
  "Weimaraner": { speed_kmh: 8, endurance: "high" },
  "Vizsla": { speed_kmh: 8, endurance: "high" },
  "Rhodesian Ridgeback": { speed_kmh: 7, endurance: "high" },
  "Greyhound": { speed_kmh: 10, endurance: "medium" },
  "Whippet": { speed_kmh: 9, endurance: "medium" },
  "Dalmatian": { speed_kmh: 7, endurance: "high" },
  "Jack Russell Terrier": { speed_kmh: 6, endurance: "high" },
  // Medium endurance
  "Beagle": { speed_kmh: 5, endurance: "medium" },
  "Boxer": { speed_kmh: 6, endurance: "medium" },
  "Cocker Spaniel": { speed_kmh: 5, endurance: "medium" },
  "Poodle": { speed_kmh: 5, endurance: "medium" },
  "Rottweiler": { speed_kmh: 5, endurance: "medium" },
  "Doberman Pinscher": { speed_kmh: 7, endurance: "medium" },
  "Great Dane": { speed_kmh: 5, endurance: "medium" },
  // Low endurance / small breeds
  "Chihuahua": { speed_kmh: 3, endurance: "low" },
  "Pomeranian": { speed_kmh: 3, endurance: "low" },
  "Shih Tzu": { speed_kmh: 3, endurance: "low" },
  "French Bulldog": { speed_kmh: 3, endurance: "low" },
  "Bulldog": { speed_kmh: 3, endurance: "low" },
  "Pug": { speed_kmh: 3, endurance: "low" },
  "Maltese": { speed_kmh: 3, endurance: "low" },
  "Yorkshire Terrier": { speed_kmh: 3, endurance: "low" },
  "Dachshund": { speed_kmh: 3, endurance: "low" },
  "Cavalier King Charles Spaniel": { speed_kmh: 4, endurance: "low" },
  "Bichon Frise": { speed_kmh: 3, endurance: "low" },
};

function getSizeDefaults(size: string): { speed_kmh: number; endurance: "low" | "medium" | "high" } {
  switch (size) {
    case "small": return { speed_kmh: 3, endurance: "low" };
    case "large": return { speed_kmh: 7, endurance: "high" };
    default: return { speed_kmh: 5, endurance: "medium" };
  }
}

function executeEstimateSearchRadius(args: any) {
  const { breed, hours_lost, last_seen_lat, last_seen_lon, last_seen_label, dog_size, is_leashed, terrain } = args;
  
  // Get breed data or use size defaults
  let breedData = BREED_RANGE_DATA[breed];
  if (!breedData) {
    // Try partial match
    const breedLower = (breed || "").toLowerCase();
    for (const [key, val] of Object.entries(BREED_RANGE_DATA)) {
      if (key.toLowerCase().includes(breedLower) || breedLower.includes(key.toLowerCase())) {
        breedData = val;
        break;
      }
    }
  }
  if (!breedData) breedData = getSizeDefaults(dog_size || "medium");
  
  const { speed_kmh, endurance } = breedData;
  
  // Terrain multiplier
  const terrainMult: Record<string, number> = { urban: 0.5, suburban: 0.7, rural: 1.0, wilderness: 1.3 };
  const tMult = terrainMult[terrain || "suburban"] || 0.7;
  
  // Time-decay: dogs slow down over time (fatigue, sleeping, hiding)
  // First 6h: active travel. 6-24h: intermittent. 24h+: mostly stationary with occasional movement
  let effectiveHours: number;
  if (hours_lost <= 6) {
    effectiveHours = hours_lost * 0.6; // 60% of time actively moving
  } else if (hours_lost <= 24) {
    effectiveHours = 6 * 0.6 + (hours_lost - 6) * 0.2; // Slows down significantly
  } else if (hours_lost <= 72) {
    effectiveHours = 6 * 0.6 + 18 * 0.2 + (hours_lost - 24) * 0.1;
  } else {
    effectiveHours = 6 * 0.6 + 18 * 0.2 + 48 * 0.1 + (hours_lost - 72) * 0.05;
  }
  
  // Endurance multiplier  
  const enduranceMult = endurance === "high" ? 1.3 : endurance === "low" ? 0.6 : 1.0;
  
  // Leash escape usually means dog is closer
  const leashMult = is_leashed ? 0.7 : 1.0;
  
  // Calculate radius
  let radiusKm = speed_kmh * effectiveHours * tMult * enduranceMult * leashMult;
  
  // Minimum 0.3km, maximum cap based on time
  radiusKm = Math.max(0.3, Math.min(radiusKm, hours_lost <= 6 ? 15 : hours_lost <= 24 ? 30 : 50));
  
  // Calculate zones
  const innerRadius = radiusKm * 0.4; // Most likely zone
  const outerRadius = radiusKm; // Extended search zone
  
  // Time-based advice
  let advice: string;
  if (hours_lost <= 2) {
    advice = "Your dog is very likely still nearby. Search within the immediate neighborhood, check familiar walking routes, parks, and spots where treats are given.";
  } else if (hours_lost <= 6) {
    advice = "Dogs often follow familiar scents in the first few hours. Check regular walking routes, nearby parks, and neighbors' yards. Leave your front door open with food and a worn clothing item outside.";
  } else if (hours_lost <= 24) {
    advice = "Your dog may have settled in a hiding spot. Search quieter areas, under porches, in bushes. Leave strong-smelling food and a worn piece of clothing at the last seen location.";
  } else if (hours_lost <= 72) {
    advice = "Dogs in survival mode become skittish. Don't chase — sit quietly with food in the area. Contact local shelters and vets. Post on community boards.";
  } else {
    advice = "Expand your search significantly. Dogs at this stage may have been taken in by someone, or found shelter far from home. Contact all local shelters, post flyers with photos, and check online lost/found databases.";
  }

  return {
    search_radius_km: Math.round(outerRadius * 10) / 10,
    inner_radius_km: Math.round(innerRadius * 10) / 10,
    center_lat: last_seen_lat,
    center_lon: last_seen_lon,
    location_label: last_seen_label || `${last_seen_lat.toFixed(4)}, ${last_seen_lon.toFixed(4)}`,
    hours_lost,
    breed,
    advice,
    breed_speed_kmh: speed_kmh,
    endurance_level: endurance,
    terrain: terrain || "suburban",
    map_data: {
      type: "search_radius_map",
      center: [last_seen_lat, last_seen_lon],
      inner_radius_km: Math.round(innerRadius * 10) / 10,
      outer_radius_km: Math.round(outerRadius * 10) / 10,
      label: last_seen_label || "Last seen location",
    },
    instruction: `IMPORTANT: Include this EXACT code block in your response so the map renders:

\`\`\`map-data
${JSON.stringify({ type: "search_radius_map", center: [last_seen_lat, last_seen_lon], inner_radius_km: Math.round(innerRadius * 10) / 10, outer_radius_km: Math.round(outerRadius * 10) / 10, label: last_seen_label || "Last seen location" })}
\`\`\`

Present the search radius info BEFORE the map block, then add the map block, then the advice AFTER.`,
  };
}

async function executeCreateLostAlert(supabase: any, userId: string, args: any) {
  const { dog_id, last_seen_location, latitude, longitude, last_seen_time, search_radius_km } = args;

  // Fetch full dog profile to auto-fill details
  const { data: dog, error: dogErr } = await supabase
    .from("dogs").select("*").eq("id", dog_id).eq("owner_id", userId).maybeSingle();
  if (dogErr || !dog) return { error: "Dog not found or you don't own this dog." };

  // Check for existing active alert for this dog
  const { data: existing } = await supabase
    .from("lost_alerts").select("id").eq("dog_id", dog_id).eq("status", "active").maybeSingle();
  if (existing) {
    return {
      already_exists: true,
      alert_id: existing.id,
      dog_name: dog.name,
      message: `An active lost alert already exists for ${dog.name}.`,
      view_link: `/lost-alert/${existing.id}`,
    };
  }

  // Auto-generate title from dog name
  const title = args.title || `${dog.name} is Missing!`;

  // Auto-generate description from dog profile if not provided
  let description = args.description;
  if (!description) {
    const parts: string[] = [];
    if (dog.breed) parts.push(`Breed: ${dog.breed}`);
    if (dog.coat_shade) parts.push(`Color: ${dog.coat_shade}`);
    if (dog.weight && dog.weight_unit) parts.push(`Weight: ${dog.weight} ${dog.weight_unit}`);
    if (dog.markings?.length) parts.push(`Markings: ${dog.markings.join(", ")}`);
    if (dog.collar_description) parts.push(`Collar: ${dog.collar_description}`);
    if (dog.visible_conditions) parts.push(`Visible conditions: ${dog.visible_conditions}`);
    if (dog.behavior_description) parts.push(`Behavior: ${dog.behavior_description}`);
    if (dog.unique_traits?.length) parts.push(`Unique traits: ${dog.unique_traits.join(", ")}`);
    if (dog.microchip_no) parts.push(`Microchip: ${dog.microchip_no}`);
    if (dog.notes) parts.push(dog.notes);
    description = parts.length > 0 ? parts.join(". ") + "." : `${dog.name} is missing. Please help find them!`;
  }

  // Create the alert
  const insertData: any = {
    dog_id,
    owner_id: userId,
    title,
    description,
    last_seen_location,
    location_label: last_seen_location,
    status: "active",
  };
  if (latitude != null) insertData.latitude = latitude;
  if (longitude != null) insertData.longitude = longitude;
  if (last_seen_time) insertData.last_seen_time = last_seen_time;
  if (search_radius_km != null) insertData.search_radius_km = search_radius_km;
  if (dog.photo_url) insertData.photo_url = dog.photo_url;

  const { data: alert, error: insertErr } = await supabase
    .from("lost_alerts").insert(insertData).select("id").single();
  if (insertErr) return { error: insertErr.message };

  // Mark the dog as lost
  await supabase.from("dogs").update({ is_lost: true }).eq("id", dog_id);

  return {
    success: true,
    alert_id: alert.id,
    dog_name: dog.name,
    auto_filled_from_profile: true,
    message: `Lost alert created for ${dog.name}! All identity details were auto-filled from their profile.`,
    view_link: `/lost-alert/${alert.id}`,
  };
}

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
    case "search_lost_dogs_by_attributes": return await executeSearchLostDogsByAttributes(supabase, args);
    case "analyze_found_dog_photo": return await executeAnalyzeFoundDogPhoto(supabase, args);
    case "save_found_dog_attributes": return await executeSaveFoundDogAttributes(supabase, args);
    case "match_found_dog_to_lost": return await executeMatchFoundDogToLost(supabase, args);
    case "save_dog_identity_details": return await executeSaveDogIdentityDetails(supabase, userId, args);
    case "verify_dog_ownership": return await executeVerifyDogOwnership(supabase, userId, args);
    case "get_match_candidates": return await executeGetMatchCandidates(supabase, args);
    case "update_match_status": return await executeUpdateMatchStatus(supabase, args);
    case "reverse_match_lost_to_found": return await executeReverseMatchLostToFound(supabase, args);
    case "estimate_search_radius": return executeEstimateSearchRadius(args);
    case "create_lost_alert": return await executeCreateLostAlert(supabase, userId, args);
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
     - Links: Use the view_link and message_link from the tool results for [Open Post] and [Message Reporter]
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
- analyze_found_dog_photo: Extract structured identifying features from a found dog photo
- save_found_dog_attributes: Save AI-extracted attributes to a found dog post
- match_found_dog_to_lost: Run the matching pipeline (found dog → lost alerts)
- save_dog_identity_details: Save detailed identity fingerprint for a dog
- verify_dog_ownership: Verify owner identity via secret
- get_match_candidates: Get existing match candidates for a lost alert or found dog
- update_match_status: Update match status (confirm/reject/dismiss)
- reverse_match_lost_to_found: Search existing found dog posts when a new lost alert is filed
- estimate_search_radius: Calculate how far a lost dog may have traveled based on breed, time, terrain
- create_lost_alert: Create a lost dog alert in the community feed. ALWAYS use this tool when the user asks to create/post a lost alert. Never pretend to create an alert without calling this tool.

CRITICAL - CREATING LOST ALERTS:
- When a user asks to create a lost alert, you MUST call the create_lost_alert tool. NEVER say you created an alert without actually calling this tool.
- You need: dog_id (get from get_my_dogs if needed), title, description, and last_seen_location.
- If you have coordinates from a previous estimate_search_radius call, include latitude and longitude.
- After creating the alert, use the returned view_link to show the user the correct link to their alert.
- If the tool returns already_exists, tell the user an alert already exists and show the link.

SEARCH RADIUS MAP FEATURE:
- When a user reports a lost dog with location info (coordinates or place name), ALWAYS call estimate_search_radius.
- You need: breed (from dog profile or user input), hours since lost, last seen coordinates.
- If the user uploads a photo and shares location, first identify the breed from the photo, ask how long ago the dog was lost, then call estimate_search_radius.
- The tool returns a \`instruction\` field — you MUST follow it exactly to include the map-data code block in your response.
- The frontend will render the map-data code block as an interactive map showing search zones.
- ALWAYS include the map-data code block when the tool provides one. Do NOT omit it or rephrase it.
- After the map, provide the search advice from the tool result.

MATCHING PIPELINE (CRITICAL - follow these steps exactly):

⚠️ ABSOLUTE RULE: NEVER use get_lost_alerts or get_found_dogs_nearby for matching.
- When someone says "I found a dog" or uploads a photo of a found dog:
  → call search_lost_dogs_by_attributes with the breed, color, and size you see in the photo.
  → This tool has BREED ELIMINATION. Husky ≠ Pomeranian. It will only return same-breed matches.
- If you have a saved found_dog_id, you can also use match_found_dog_to_lost.
- To match a LOST dog → call reverse_match_lost_to_found.
- NEVER call get_lost_alerts and then manually pick matches. That tool has NO breed filtering and WILL show wrong breeds.

When a FINDER reports a found dog with a photo:
1. First, assess the image quality and extract all possible features from the photo.
   Call analyze_found_dog_photo with your visual analysis.

2. Check which fields have LOW confidence or CANNOT_DETERMINE.
   Ask the finder ONLY about uncertain fields, using these SIMPLE questions:
   - For movement/behavior: "Did the dog come toward you, stay still, or run away when it noticed you?"
   - For walking: "Did the dog seem to walk normally, or was it favoring one leg?"
   - For collar: "Did you notice anything around the dog's neck — a collar, harness, or bandana? What color?"
   - For size: "Compared to a Labrador, would you say this dog was smaller, about the same, or bigger?"
   - For age: "Was the dog moving quickly and energetically, or slowly and calmly?"
   - For aggression: "Did the dog bark, growl, or show teeth when you got near?"
   - For direction: "Which direction was the dog heading?"
   - For status: "Is the dog still there, or did it move on?"
   DO NOT ask about things you already determined with HIGH/MEDIUM confidence.

3. If the finder says the dog is still there, switch to URGENT MODE:
   "Stay where you are if safe. We're checking for matching lost dogs RIGHT NOW. Can you keep the dog in sight?"

4. Save the attributes using save_found_dog_attributes (if you have a found_dog_id).

5. Run match_found_dog_to_lost to find candidates.

6. Present results clearly.
   **CRITICAL: If same_breed_collision is true in the response, you MUST NOT just list matches and stop.**
   You MUST ask the disambiguation_questions provided in the tool response, one at a time.
   Wait for the finder's answers, then re-evaluate and recommend the best match.
   This is the difference between a useful assistant and a useless one — don't skip this step.

When an OWNER reports a lost dog:
1. Collect identity details by asking:
   - "What color shade is [dog]'s coat? (e.g., 'deep reddish gold' not just 'brown')"
   - "Does [dog] have any distinctive markings? White patches, spots, scars?"
   - "What was [dog] wearing? Describe the collar/harness — color, material, tags?"
   - "How does [dog] react when a stranger approaches? Come up, stay still, or hide?"
   - "Any visible health conditions? Limp, cloudy eye, skin condition?"
   - "Anything unique about [dog] that most people wouldn't know? Hidden birthmarks, quirks?"
   - "For security: tell me one thing about [dog] that ONLY you would know — we'll use this to verify ownership if someone claims to have found [dog]." (This is the verification_secret)

2. Save these details using save_dog_identity_details.

3. Run reverse_match_lost_to_found to check existing found dog posts.

4. Provide proactive search advice based on elapsed time:
   - 0-6 hours: "Most dogs stay within a few blocks early on. Walk your usual routes — [dog] may retrace familiar paths."
   - 6-24 hours: "Leave a worn piece of your clothing and [dog]'s bed outside your door — dogs can smell their owner from over a mile away."
   - 24-72 hours: "Dogs lost for more than a day often become skittish. Try sitting quietly with strong-smelling food in the last sighting area. Don't chase."
   - 72+ hours: "Expand your search. Contact local shelters. Dogs at this stage are in survival mode."

VERIFICATION FLOW:
When an owner says "that's my dog" about a match:
1. Ask: "To confirm ownership, please tell me your verification detail for [dog name]."
2. Call verify_dog_ownership with their answer.
3. If verified: "Verification successful! Let me connect you with the finder."
   Then help them message the finder.
4. If failed: "That doesn't match our records. Would you like to try again?"

ERROR HANDLING:
- If any tool call fails, tell the user there was a temporary issue and suggest trying again.
- If image quality is LOW and analysis has mostly CANNOT_DETERMINE fields:
  "The photo is quite blurry. Let me ask you some questions about the dog instead."
  Then ask ALL observation questions, not just gap-filling ones.
- If zero matches found: "No matches yet, but your report is saved. When a matching dog is reported, you'll be notified."
  Do NOT say "no matches found" and stop — always reassure and explain next steps.

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
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      // User-scoped client for auth verification
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await userClient.auth.getUser(token);
      if (!claimsError && claimsData?.user) {
        userId = claimsData.user.id;
      }
      // Service-role client for tool execution — bypasses RLS so cross-user
      // queries (e.g. Account B searching Account A's lost alerts/dogs) work
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    }

    // Detect if the latest user message contains an image
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const hasImage = lastUserMsg && Array.isArray(lastUserMsg.content) &&
      lastUserMsg.content.some((c: any) => c.type === "image_url");
    const lastText = lastUserMsg
      ? (typeof lastUserMsg.content === "string" ? lastUserMsg.content : lastUserMsg.content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join(" ") || "")
      : "";
    const mentionsFound = /found|spotted|saw|seen|stray|loose/i.test(lastText);
    const mentionsLost = /lost|missing|escaped|ran away/i.test(lastText);

    // Force tool call when image + found/lost context detected
    const forceToolChoice = userId && hasImage && (mentionsFound || mentionsLost)
      ? { type: "function", function: { name: "search_lost_dogs_by_attributes" } }
      : (userId ? "auto" : undefined);

    console.log("AI request - messages:", messages.length, "userId:", userId, "hasImage:", !!hasImage, "forceToolChoice:", JSON.stringify(forceToolChoice));

    // If we're forcing search_lost_dogs_by_attributes, inject a system message telling AI to extract breed/color/size first
    const extraSystemMsg = forceToolChoice && typeof forceToolChoice === "object"
      ? [{ role: "system", content: "You MUST call search_lost_dogs_by_attributes now. Look at the photo and extract: breed_guess (specific breed name), color (primary coat color), and size (small/medium/large). Pass these as arguments to the tool. Do NOT skip the tool call." }]
      : [];

    // First API call with tools (non-streaming to handle tool calls)
    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...extraSystemMsg, ...messages],
        tools: userId ? tools : undefined,
        tool_choice: forceToolChoice,
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

      const toolResults: Array<{ toolName: string; result: any }> = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          // ignore malformed args and execute with empty object
        }
        const result = await executeTool(supabase, userId, toolName, args);
        toolResults.push({ toolName, result });
      }

      const toolContext = toolResults
        .map(({ toolName, result }, index) => `Tool #${index + 1} (${toolName}) result:\n${JSON.stringify(result)}`)
        .join("\n\n");

      // Generate final user-facing answer from tool output
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            {
              role: "system",
              content: `TOOL RESULTS (trusted app data):\n${toolContext}\n\nIMPORTANT: Use ONLY these tool results to answer. Do NOT reference matches or dogs from earlier in the conversation — they may be outdated. Only present dogs that appear in the tool results above. Do not call tools in this response.`,
            },
          ],
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error("Final AI response error:", finalResponse.status, errorText);
        if (finalResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (finalResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI service requires payment." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
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
