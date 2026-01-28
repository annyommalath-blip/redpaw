/**
 * Image utility functions for HEIC conversion and compression
 */

// Check if file is HEIC/HEIF based on extension or MIME type
export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  // Check extension first (most reliable for HEIC)
  if (name.endsWith(".heic") || name.endsWith(".heif")) {
    return true;
  }
  // Check MIME type (iOS sometimes sends empty MIME for HEIC)
  if (file.type === "image/heic" || file.type === "image/heif") {
    return true;
  }
  // If MIME is empty and extension suggests image, might be HEIC from iOS
  if (file.type === "" && /\.(heic|heif)$/i.test(name)) {
    return true;
  }
  return false;
}

// Check if file is a valid image type we can handle
export function isValidImageType(file: File): boolean {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "", // Allow empty MIME (common for HEIC on iOS)
  ];
  const validExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"];
  const name = file.name.toLowerCase();
  return validTypes.includes(file.type) || validExtensions.some((ext) => name.endsWith(ext));
}

// Convert HEIC/HEIF to JPEG using heic2any library
export async function convertHeicToJpeg(file: File): Promise<File> {
  console.log("Starting HEIC conversion for:", file.name, "Type:", file.type, "Size:", file.size);
  
  try {
    // Dynamically import heic2any
    const heic2anyModule = await import("heic2any");
    const heic2any = heic2anyModule.default;

    // Try conversion with different quality settings
    const qualitySettings = [0.92, 0.85, 0.7, 0.5];

    for (const quality of qualitySettings) {
      try {
        console.log(`Attempting HEIC conversion with quality ${quality}...`);
        
        const result = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality,
        });

        const resultBlob = Array.isArray(result) ? result[0] : result;
        
        if (resultBlob && resultBlob.size > 0) {
          const newFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
          const convertedFile = new File([resultBlob], newFileName, { type: "image/jpeg" });
          console.log("HEIC conversion successful! New size:", convertedFile.size);
          return convertedFile;
        }
      } catch (error) {
        console.warn(`HEIC conversion with quality ${quality} failed:`, error);
        continue;
      }
    }

    // Final attempt without quality parameter
    console.log("Attempting HEIC conversion without quality parameter...");
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
    });

    const resultBlob = Array.isArray(result) ? result[0] : result;
    if (resultBlob && resultBlob.size > 0) {
      const newFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
      const convertedFile = new File([resultBlob], newFileName, { type: "image/jpeg" });
      console.log("HEIC conversion successful (no quality)! New size:", convertedFile.size);
      return convertedFile;
    }

    throw new Error("Conversion produced empty result");
  } catch (error) {
    console.error("All HEIC conversion attempts failed:", error);
    throw new Error("Could not convert HEIC file. Please try a JPG or PNG image instead.");
  }
}

// Compress image using canvas (works for JPG, PNG, WebP)
export async function compressImage(file: File, maxSizeKB: number = 2048, maxDim: number = 1200): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip if file is small enough
    if (file.size <= maxSizeKB * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Progressive quality reduction until file is small enough
      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // If still too large and quality > 0.3, try lower
            if (blob.size > maxSizeKB * 1024 && quality > 0.3) {
              tryQuality(quality - 0.1);
              return;
            }

            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const newFileName = file.name.replace(/\.[^.]+$/, `.${ext === "png" ? "png" : "jpg"}`);
            const mimeType = ext === "png" ? "image/png" : "image/jpeg";
            resolve(new File([blob], newFileName, { type: mimeType }));
          },
          file.type.includes("png") ? "image/png" : "image/jpeg",
          quality
        );
      };

      tryQuality(0.85);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = url;
  });
}

// Process an image file - convert HEIC if needed, then compress
export async function processImageFile(
  file: File,
  onProgress?: (status: string) => void
): Promise<File> {
  let processedFile = file;

  // Convert HEIC/HEIF to JPEG first
  if (isHeicFile(file)) {
    onProgress?.("Converting photo format...");
    processedFile = await convertHeicToJpeg(file);
  }

  // Compress if file is large
  if (processedFile.size > 2 * 1024 * 1024) {
    onProgress?.("Optimizing photo...");
    try {
      processedFile = await compressImage(processedFile);
    } catch (error) {
      console.warn("Compression failed, using original:", error);
    }
  }

  return processedFile;
}
