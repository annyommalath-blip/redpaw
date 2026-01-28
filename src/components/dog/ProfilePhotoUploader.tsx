import { useState, useRef } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ProfilePhotoUploaderProps {
  userId: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}

// Check if file is HEIC/HEIF
function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  // Check extension and MIME type (some browsers report empty MIME for HEIC)
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.type === ""  // iOS sometimes sends empty MIME for HEIC
  );
}

function isValidImageType(file: File): boolean {
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

// Convert HEIC/HEIF to JPEG using heic2any with multiple fallback approaches
async function convertHeicToJpeg(file: File): Promise<File> {
  // Dynamically import heic2any to ensure proper loading
  const heic2any = (await import("heic2any")).default;

  // Try with different quality settings
  const qualitySettings = [0.85, 0.7, 0.5];

  for (const quality of qualitySettings) {
    try {
      const blob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality,
      });

      const resultBlob = Array.isArray(blob) ? blob[0] : blob;
      const newFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
      return new File([resultBlob], newFileName, { type: "image/jpeg" });
    } catch (error) {
      console.warn(`HEIC conversion failed with quality ${quality}:`, error);
      // Continue to next quality setting
    }
  }

  // Final fallback: try to convert without specifying quality
  try {
    const heic2anyFallback = (await import("heic2any")).default;
    const blob = await heic2anyFallback({
      blob: file,
      toType: "image/jpeg",
    });
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    const newFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([resultBlob], newFileName, { type: "image/jpeg" });
  } catch (error) {
    console.error("All HEIC conversion attempts failed:", error);
    throw new Error("Could not convert HEIC file");
  }
}

// Compress image using canvas
async function compressImage(file: File, maxSizeKB: number = 2048): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions (max 1200px on longest side)
      const maxDim = 1200;
      let { width, height } = img;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
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

      // Try different quality levels
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

            const newFileName = file.name.replace(/\.[^.]+$/, ".jpg");
            resolve(new File([blob], newFileName, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };

      tryQuality(0.85);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function ProfilePhotoUploader({ userId, photoUrl, onChange }: ProfilePhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check extension-based validity
    const name = file.name.toLowerCase();
    const hasValidExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"].some((ext) =>
      name.endsWith(ext)
    );

    if (!isValidImageType(file) && !hasValidExt) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please use JPG, PNG, WebP, or HEIC.",
      });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum size is 15MB.",
      });
      return;
    }

    setUploading(true);

    try {
      let processedFile = file;

      // Convert HEIC to JPEG
      const needsHeicConversion = isHeicFile(file) || name.endsWith(".heic") || name.endsWith(".heif");

      if (needsHeicConversion) {
        toast({
          title: "Processing photo...",
          description: "Converting to compatible format.",
        });

        try {
          processedFile = await convertHeicToJpeg(file);
          toast({
            title: "Conversion complete! ✓",
            description: "Photo converted successfully.",
          });
        } catch (convError) {
          console.error("HEIC conversion error:", convError);

          // Try uploading as-is as last resort (some storage can handle it)
          toast({
            title: "Trying alternative upload...",
            description: "Using original format.",
          });

          // Proceed with original file - storage might accept it
          processedFile = file;
        }
      }

      // Compress if file is large (> 2MB)
      if (processedFile.size > 2 * 1024 * 1024 && processedFile.type.startsWith("image/")) {
        try {
          processedFile = await compressImage(processedFile);
        } catch (compressError) {
          console.warn("Compression failed, using original:", compressError);
        }
      }

      const fileExt = processedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("dog-photos").upload(fileName, processedFile, {
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("dog-photos").getPublicUrl(fileName);

      onChange(urlData.publicUrl);
      toast({ title: "Photo uploaded! 📸" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Please try again.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!photoUrl) return;

    try {
      const url = new URL(photoUrl);
      const pathParts = url.pathname.split("/dog-photos/");
      if (pathParts[1]) {
        await supabase.storage.from("dog-photos").remove([pathParts[1]]);
      }
    } catch (error) {
      console.error("Error removing file:", error);
    }

    onChange(null);
  };

  const handleAvatarClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Clickable Avatar */}
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploading}
          className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Avatar className="h-28 w-28 border-4 border-primary/20">
            <AvatarImage src={photoUrl || undefined} alt="Dog profile photo" />
            <AvatarFallback className="bg-muted">
              {uploading ? (
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              ) : (
                <Plus className="h-8 w-8 text-muted-foreground" />
              )}
            </AvatarFallback>
          </Avatar>

          {/* Upload overlay when uploading */}
          {uploading && photoUrl && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}

          {/* Plus button overlay (bottom-right) */}
          {!uploading && (
            <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-background">
              <Plus className="h-4 w-4" />
            </div>
          )}
        </button>

        {/* Remove button (top-right, only when photo exists) */}
        {photoUrl && !uploading && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
