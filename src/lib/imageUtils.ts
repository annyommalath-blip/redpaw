/**
 * Robust image processing utilities for photo uploads
 * Handles HEIC conversion, resizing, and compression
 */

const MAX_DIMENSION = 1600;
const TARGET_FILE_SIZE = 2 * 1024 * 1024; // 2MB target
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];
const DIMENSION_STEPS = [1600, 1280, 1024, 800];

export type ProgressCallback = (status: string) => void;

/**
 * Check if file is HEIC/HEIF based on extension or MIME type
 */
export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  
  // Check extension first (most reliable)
  if (name.endsWith(".heic") || name.endsWith(".heif")) {
    return true;
  }
  
  // Check MIME type
  if (type === "image/heic" || type === "image/heif") {
    return true;
  }
  
  // iOS sometimes sends empty MIME for HEIC
  if (type === "" && (name.endsWith(".heic") || name.endsWith(".heif"))) {
    return true;
  }
  
  return false;
}

/**
 * Check if file is a valid image type we can handle
 */
export function isValidImageType(file: File): boolean {
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "", // iOS sometimes sends empty MIME
  ];
  const validExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"];
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  
  return validTypes.includes(type) || validExtensions.some((ext) => name.endsWith(ext));
}

/**
 * Convert HEIC to JPEG using heic2any library
 */
async function convertHeicWithLibrary(file: File): Promise<Blob | null> {
  try {
    console.log("[imageUtils] Attempting heic2any conversion...");
    const heic2anyModule = await import("heic2any");
    const heic2any = heic2anyModule.default;

    // Try with different quality settings
    for (const quality of [0.92, 0.85, 0.7]) {
      try {
        const result = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality,
        });

        const resultBlob = Array.isArray(result) ? result[0] : result;
        if (resultBlob && resultBlob.size > 0) {
          console.log(`[imageUtils] heic2any success at quality ${quality}, size: ${resultBlob.size}`);
          return resultBlob;
        }
      } catch (e) {
        console.warn(`[imageUtils] heic2any failed at quality ${quality}:`, e);
      }
    }

    // Try without quality parameter
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
    });
    const resultBlob = Array.isArray(result) ? result[0] : result;
    if (resultBlob && resultBlob.size > 0) {
      console.log(`[imageUtils] heic2any success (no quality), size: ${resultBlob.size}`);
      return resultBlob;
    }
  } catch (error) {
    console.error("[imageUtils] heic2any conversion failed:", error);
  }
  
  return null;
}

/**
 * Convert HEIC using server-side edge function (fallback)
 */
async function convertHeicWithServer(
  file: File, 
  supabase: any,
  userId: string
): Promise<string | null> {
  try {
    console.log("[imageUtils] Attempting server-side HEIC conversion...");
    
    // Upload original HEIC to temp path
    const tempPath = `temp/${userId}/${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from("dog-photos")
      .upload(tempPath, file, { cacheControl: "60", upsert: true });

    if (uploadError) {
      console.error("[imageUtils] Failed to upload temp HEIC:", uploadError);
      return null;
    }

    // Call edge function to convert
    const { data, error } = await supabase.functions.invoke("convert-heic", {
      body: { tempPath, userId },
    });

    if (error || !data?.url) {
      console.error("[imageUtils] Server conversion failed:", error || "No URL returned");
      // Clean up temp file
      await supabase.storage.from("dog-photos").remove([tempPath]);
      return null;
    }

    console.log("[imageUtils] Server conversion successful:", data.url);
    return data.url;
  } catch (error) {
    console.error("[imageUtils] Server conversion error:", error);
    return null;
  }
}

/**
 * Load image from file and return dimensions
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    
    img.src = url;
  });
}

/**
 * Resize and compress image using canvas
 */
async function resizeAndCompress(
  file: File | Blob,
  maxDimension: number,
  quality: number
): Promise<Blob> {
  const img = await loadImage(file);
  
  let { width, height } = img;
  
  // Calculate new dimensions maintaining aspect ratio
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height / width) * maxDimension);
      width = maxDimension;
    } else {
      width = Math.round((width / height) * maxDimension);
      height = maxDimension;
    }
  }
  
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }
  
  // Use high quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  
  ctx.drawImage(img, 0, 0, width, height);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas toBlob failed"));
        }
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Aggressively compress image to meet target size
 */
async function compressToTarget(
  file: File | Blob,
  targetSize: number = TARGET_FILE_SIZE,
  onProgress?: ProgressCallback
): Promise<Blob> {
  console.log(`[imageUtils] Starting compression. Original size: ${file.size}, target: ${targetSize}`);
  
  // Try each dimension step
  for (const maxDim of DIMENSION_STEPS) {
    // Try each quality step
    for (const quality of QUALITY_STEPS) {
      onProgress?.(`Optimizing (${maxDim}px, ${Math.round(quality * 100)}%)...`);
      
      try {
        const compressed = await resizeAndCompress(file, maxDim, quality);
        console.log(`[imageUtils] Compressed at ${maxDim}px, q${quality}: ${compressed.size} bytes`);
        
        if (compressed.size <= targetSize) {
          console.log(`[imageUtils] Target achieved: ${compressed.size} bytes`);
          return compressed;
        }
      } catch (e) {
        console.warn(`[imageUtils] Compression failed at ${maxDim}px, q${quality}:`, e);
      }
    }
  }
  
  // Last resort: very aggressive compression
  onProgress?.("Final compression...");
  const lastResort = await resizeAndCompress(file, 640, 0.3);
  console.log(`[imageUtils] Last resort compression: ${lastResort.size} bytes`);
  return lastResort;
}

/**
 * Main processing function - handles HEIC conversion and compression
 */
export async function processImageForUpload(
  file: File,
  options: {
    userId: string;
    supabase?: any;
    onProgress?: ProgressCallback;
    targetSize?: number;
  }
): Promise<{ blob: Blob; filename: string } | { serverUrl: string }> {
  const { userId, supabase, onProgress, targetSize = TARGET_FILE_SIZE } = options;
  
  console.log(`[imageUtils] Processing: ${file.name}, type: ${file.type}, size: ${file.size}`);
  
  let processedBlob: Blob | null = null;
  let filename = file.name;
  
  // Handle HEIC/HEIF files
  if (isHeicFile(file)) {
    onProgress?.("Converting photo format...");
    console.log("[imageUtils] Detected HEIC file, attempting conversion...");
    
    // Try client-side conversion first
    processedBlob = await convertHeicWithLibrary(file);
    
    // If client-side failed and we have supabase, try server-side
    if (!processedBlob && supabase) {
      onProgress?.("Using server conversion...");
      const serverUrl = await convertHeicWithServer(file, supabase, userId);
      
      if (serverUrl) {
        // Server handled everything, return the URL directly
        return { serverUrl };
      }
    }
    
    if (!processedBlob) {
      throw new Error("Could not convert HEIC file. Please try a JPG or PNG image.");
    }
    
    // Update filename to .jpg
    filename = filename.replace(/\.(heic|heif)$/i, ".jpg");
  } else {
    // Non-HEIC file, use as-is for processing
    processedBlob = file;
  }
  
  // Now compress to target size
  onProgress?.("Optimizing photo...");
  const compressedBlob = await compressToTarget(processedBlob, targetSize, onProgress);
  
  // Ensure filename has .jpg extension (we always output JPEG)
  if (!filename.toLowerCase().endsWith(".jpg") && !filename.toLowerCase().endsWith(".jpeg")) {
    filename = filename.replace(/\.[^.]+$/, ".jpg");
  }
  
  console.log(`[imageUtils] Final output: ${filename}, size: ${compressedBlob.size}`);
  
  return { blob: compressedBlob, filename };
}

/**
 * Upload processed image to storage
 */
export async function uploadProcessedImage(
  result: { blob: Blob; filename: string } | { serverUrl: string },
  options: {
    userId: string;
    supabase: any;
    pathPrefix?: string;
    onProgress?: ProgressCallback;
  }
): Promise<string> {
  const { userId, supabase, pathPrefix = "", onProgress } = options;
  
  // If server already handled it, return the URL
  if ("serverUrl" in result) {
    return result.serverUrl;
  }
  
  const { blob, filename } = result;
  
  onProgress?.("Uploading...");
  
  // Generate storage path
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const storagePath = `${userId}/${pathPrefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  
  console.log(`[imageUtils] Uploading to: ${storagePath}, size: ${blob.size}`);
  
  const { error: uploadError } = await supabase.storage
    .from("dog-photos")
    .upload(storagePath, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: "image/jpeg",
    });

  if (uploadError) {
    console.error("[imageUtils] Upload failed:", uploadError);
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("dog-photos")
    .getPublicUrl(storagePath);

  console.log(`[imageUtils] Upload complete: ${urlData.publicUrl}`);
  
  return urlData.publicUrl;
}

/**
 * Simple image processing for generic uploads (without supabase dependency)
 * Handles HEIC conversion and compression, returns a File ready for upload
 */
export async function processImageFile(
  file: File,
  options: {
    onProgress?: ProgressCallback;
    targetSize?: number;
  } = {}
): Promise<File> {
  const { onProgress, targetSize = TARGET_FILE_SIZE } = options;
  
  console.log(`[imageUtils] Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);
  
  let processedBlob: Blob | null = null;
  let filename = file.name;
  
  // Handle HEIC/HEIF files
  if (isHeicFile(file)) {
    onProgress?.("Converting photo format...");
    console.log("[imageUtils] Detected HEIC file, attempting conversion...");
    
    // Try client-side conversion
    processedBlob = await convertHeicWithLibrary(file);
    
    if (!processedBlob) {
      throw new Error("Could not convert HEIC file. Please try a JPG or PNG image.");
    }
    
    // Update filename to .jpg
    filename = filename.replace(/\.(heic|heif)$/i, ".jpg");
  } else {
    processedBlob = file;
  }
  
  // Compress to target size
  onProgress?.("Optimizing photo...");
  const compressedBlob = await compressToTarget(processedBlob, targetSize, onProgress);
  
  // Ensure filename has .jpg extension
  if (!filename.toLowerCase().endsWith(".jpg") && !filename.toLowerCase().endsWith(".jpeg")) {
    filename = filename.replace(/\.[^.]+$/, ".jpg");
  }
  
  // Create a new File from the blob
  const processedFile = new File([compressedBlob], filename, { type: "image/jpeg" });
  
  console.log(`[imageUtils] Processed file: ${processedFile.name}, size: ${processedFile.size}`);
  
  return processedFile;
}
