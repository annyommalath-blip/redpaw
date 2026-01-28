import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[convert-heic] Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth to verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      console.error("[convert-heic] Auth verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = userData.user.id;
    console.log(`[convert-heic] Authenticated user: ${authenticatedUserId}`);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tempPath } = body as { tempPath?: unknown };

    // Validate tempPath exists and is a string
    if (!tempPath || typeof tempPath !== "string") {
      console.error("[convert-heic] Invalid or missing tempPath");
      return new Response(
        JSON.stringify({ error: "Invalid tempPath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize and validate path - prevent path traversal attacks
    if (tempPath.includes("..") || tempPath.includes("//")) {
      console.error("[convert-heic] Path traversal attempt detected:", tempPath);
      return new Response(
        JSON.stringify({ error: "Invalid path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure path is within the authenticated user's temp folder
    const expectedPrefix = `temp/${authenticatedUserId}/`;
    if (!tempPath.startsWith(expectedPrefix)) {
      console.error("[convert-heic] Path not in user's folder:", tempPath, "expected prefix:", expectedPrefix);
      return new Response(
        JSON.stringify({ error: "Access denied - path not in your folder" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[convert-heic] Processing validated path: ${tempPath}`);

    // Use service role client for storage operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download the HEIC file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("dog-photos")
      .download(tempPath);

    if (downloadError || !fileData) {
      console.error("[convert-heic] Download failed:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[convert-heic] Downloaded file, size: ${fileData.size}`);

    // Since true server-side HEIC conversion requires native libraries not available in edge functions,
    // we return an error indicating client-side conversion is required
    
    // Clean up the temp file
    await supabase.storage.from("dog-photos").remove([tempPath]);
    
    return new Response(
      JSON.stringify({ 
        error: "Server-side HEIC conversion not available. Please use a JPG or PNG image.",
        requiresClientConversion: true 
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[convert-heic] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
