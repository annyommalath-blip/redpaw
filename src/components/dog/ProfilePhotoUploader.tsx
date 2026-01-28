import { useState, useRef } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  isValidImageType, 
  isHeicFile, 
  processImageForUpload, 
  uploadProcessedImage 
} from "@/lib/imageUtils";

interface ProfilePhotoUploaderProps {
  userId: string;
  photoUrl: string | null;
  onChange: (url: string | null) => void;
}

export function ProfilePhotoUploader({ userId, photoUrl, onChange }: ProfilePhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isValidImageType(file)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please use JPG, PNG, WebP, or HEIC.",
      });
      return;
    }

    // Allow up to 50MB raw input (will be compressed)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 50MB.",
      });
      return;
    }

    setUploading(true);
    setStatusText(isHeicFile(file) ? "Converting..." : "Processing...");

    try {
      // Process the image (convert HEIC, resize, compress)
      const result = await processImageForUpload(file, {
        userId,
        supabase,
        onProgress: setStatusText,
        targetSize: 2 * 1024 * 1024, // 2MB max
      });

      // Upload the processed image
      const publicUrl = await uploadProcessedImage(result, {
        userId,
        supabase,
        pathPrefix: "profile-",
        onProgress: setStatusText,
      });

      // Update state with the new URL
      onChange(publicUrl);
      
      toast({ title: "Photo uploaded! 📸" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Please try again with a JPG or PNG image.",
      });
    } finally {
      setUploading(false);
      setStatusText("");
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
        await supabase.storage.from("dog-photos").remove([decodeURIComponent(pathParts[1])]);
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
          className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
        >
          <Avatar className="h-28 w-28 border-4 border-primary/20">
            <AvatarImage 
              src={photoUrl || undefined} 
              alt="Dog profile photo"
              className="object-cover"
            />
            <AvatarFallback className="bg-muted">
              {uploading ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                  <span className="text-[10px] text-muted-foreground text-center px-2 leading-tight">
                    {statusText}
                  </span>
                </div>
              ) : (
                <Plus className="h-8 w-8 text-muted-foreground" />
              )}
            </AvatarFallback>
          </Avatar>

          {/* Upload overlay when uploading and photo exists */}
          {uploading && photoUrl && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
              <span className="text-[10px] text-white mt-1 text-center px-2">
                {statusText}
              </span>
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
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
