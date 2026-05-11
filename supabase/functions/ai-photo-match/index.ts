import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ExtractedAttrs {
  pet_type: string;
  breed_guess: string;
  primary_color: string;
  secondary_colors: string[];
  size: string; // small | medium | large
  markings: string;
  key_features: string;
}

async function extractAttributes(imageDataUrl: string, apiKey: string): Promise<ExtractedAttrs | null> {
  const resp = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert pet identification specialist. Analyze pet photos with high accuracy.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this pet photo and extract identifying features. Be precise about color and size." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_pet_attributes",
            description: "Extract structured attributes from the pet photo",
            parameters: {
              type: "object",
              properties: {
                pet_type: { type: "string", description: "dog, cat, bird, rabbit, reptile, fish, or other" },
                breed_guess: { type: "string", description: "Most likely breed (specific name) or 'mixed' / 'unknown'" },
                primary_color: { type: "string", description: "Single dominant coat color (e.g. 'brown', 'black', 'white', 'tan', 'golden')" },
                secondary_colors: { type: "array", items: { type: "string" }, description: "Other visible colors" },
                size: { type: "string", enum: ["small", "medium", "large"] },
                markings: { type: "string", description: "Distinctive markings, spots, patches" },
                key_features: { type: "string", description: "Other unique features: collar, ear shape, tail, coat texture" },
              },
              required: ["pet_type", "breed_guess", "primary_color", "size", "markings", "key_features"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_pet_attributes" } },
    }),
  });

  if (!resp.ok) {
    console.error("Vision extraction failed:", resp.status, await resp.text());
    return null;
  }
  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    return null;
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreCandidate(attrs: ExtractedAttrs, fd: any, userLat?: number, userLon?: number): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const desc = ((fd.description || "") + " " + JSON.stringify(fd.finder_observations || {})).toLowerCase();
  const fdPetType = (fd.pet_type || "dog").toLowerCase();
  const userPetType = (attrs.pet_type || "").toLowerCase();
  const userColor = (attrs.primary_color || "").toLowerCase();
  const userBreed = (attrs.breed_guess || "").toLowerCase();
  const userSize = (attrs.size || "").toLowerCase();

  // Pet type — hard filter
  if (userPetType && fdPetType && userPetType !== fdPetType && userPetType !== "other" && fdPetType !== "other") {
    return { score: -1, reasons: [] };
  }
  if (userPetType === fdPetType) {
    score += 20;
    reasons.push(`Same pet type (${fdPetType})`);
  }

  // Color — heaviest weight
  if (userColor && desc.includes(userColor)) {
    score += 40;
    reasons.push(`Matching ${userColor} color`);
  } else {
    for (const sc of attrs.secondary_colors || []) {
      if (sc && desc.includes(sc.toLowerCase())) {
        score += 15;
        reasons.push(`Matching ${sc} color`);
        break;
      }
    }
  }

  // Breed
  if (userBreed && userBreed !== "unknown" && userBreed !== "mixed") {
    const breedWords = userBreed.split(/[\s/]+/).filter((w) => w.length > 3);
    if (breedWords.some((w) => desc.includes(w))) {
      score += 25;
      reasons.push(`Breed similarity (${userBreed})`);
    }
  }

  // Size
  if (userSize && desc.includes(userSize)) {
    score += 10;
    reasons.push(`Same size (${userSize})`);
  }

  // Markings
  if (attrs.markings && attrs.markings.length > 3) {
    const markWords = attrs.markings.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 3);
    if (markWords.some((w) => desc.includes(w))) {
      score += 15;
      reasons.push("Similar markings");
    }
  }

  // Recency boost
  const ageDays = (Date.now() - new Date(fd.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 3) score += 8;
  else if (ageDays < 7) score += 4;

  // Distance boost
  if (userLat && userLon && fd.latitude && fd.longitude) {
    const dist = haversine(userLat, userLon, fd.latitude, fd.longitude);
    if (dist < 5) {
      score += 15;
      reasons.push(`Very close (${dist.toFixed(1)} km away)`);
    } else if (dist < 25) {
      score += 8;
      reasons.push(`Nearby (${dist.toFixed(0)} km away)`);
    }
  }

  return { score, reasons };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { image_data_url, latitude, longitude, days_back = 30 } = body;

    if (!image_data_url || typeof image_data_url !== "string" || !image_data_url.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "image_data_url (data URL) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Extract attributes from photo
    const attrs = await extractAttributes(image_data_url, apiKey);
    if (!attrs) {
      return new Response(JSON.stringify({ error: "Could not analyze photo. Please try a clearer image." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch active found pets in window
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days_back);

    const { data: foundPets, error } = await supabase
      .from("found_dogs")
      .select("id, description, location_label, found_at, created_at, photo_urls, latitude, longitude, reporter_id, pet_type, finder_observations, status")
      .eq("status", "active")
      .gte("created_at", cutoff.toISOString())
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      console.error("DB error:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch found pets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Score candidates
    const scored = (foundPets || [])
      .map((fd: any) => {
        const { score, reasons } = scoreCandidate(attrs, fd, latitude, longitude);
        const cover = fd.photo_urls && fd.photo_urls.length > 0
          ? (fd.photo_urls[0].startsWith("http")
              ? fd.photo_urls[0]
              : `${supabaseUrl}/storage/v1/object/public/found-dog-photos/${fd.photo_urls[0]}`)
          : null;
        return {
          id: fd.id,
          score,
          reasons,
          cover_photo_url: cover,
          location_label: fd.location_label,
          found_at: fd.found_at,
          created_at: fd.created_at,
          description: fd.description,
          reporter_id: fd.reporter_id,
          pet_type: fd.pet_type || "dog",
        };
      })
      .filter((m: any) => m.score >= 30)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 8);

    return new Response(
      JSON.stringify({
        attributes: attrs,
        matches: scored,
        total_candidates: foundPets?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-photo-match error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
