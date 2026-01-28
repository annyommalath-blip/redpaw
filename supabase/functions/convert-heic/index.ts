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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tempPath, userId } = await req.json();

    if (!tempPath || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing tempPath or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[convert-heic] Processing: ${tempPath}`);

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

    // For server-side HEIC conversion, we use a different approach
    // Since Deno doesn't have native HEIC support, we'll try using sharp via npm
    // However, sharp requires native binaries which don't work in edge functions
    
    // Alternative: Use a canvas-based approach or external API
    // For now, we'll use the file as-is if it's small enough to be displayable
    // This is a fallback - the client-side heic2any should handle most cases
    
    // The best server-side solution would be to:
    // 1. Use an external HEIC conversion API
    // 2. Or use a separate backend service with sharp/libheif
    
    // For this implementation, we'll resize/compress the file assuming
    // modern browsers/CDNs can sometimes handle HEIC transcoding
    
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
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
