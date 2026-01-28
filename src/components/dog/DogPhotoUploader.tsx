import { useState, useRef } from "react";
import { Plus, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  isValidImageType, 
  isHeicFile, 
  processImageForUpload, 
  uploadProcessedImage 
} from "@/lib/imageUtils";

interface DogPhotoUploaderProps {
  userId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function DogPhotoUploader({
  userId,
  photos,
  onChange,
  maxPhotos = 5,
}: DogPhotoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [statusText, setStatusText] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      toast({
        variant: "destructive",
        title: "Photo limit reached",
        description: `You can only upload up to ${maxPhotos} photos.`,
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    const newUrls: string[] = [];
    let successCount = 0;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setStatusText(`Photo ${i + 1}/${filesToUpload.length}...`);

      // Validate file type
      if (!isValidImageType(file)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name} is not supported. Use JPG, PNG, WebP, or HEIC.`,
        });
        continue;
      }

      // Allow up to 50MB raw input (will be compressed)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name} exceeds the 50MB limit.`,
        });
        continue;
      }

      try {
        // Process the image (convert HEIC, resize, compress)
        setStatusText(
          isHeicFile(file) 
            ? `Converting ${i + 1}/${filesToUpload.length}...` 
            : `Processing ${i + 1}/${filesToUpload.length}...`
        );
        
        const result = await processImageForUpload(file, {
          userId,
          supabase,
          onProgress: (status) => setStatusText(`${i + 1}/${filesToUpload.length}: ${status}`),
          targetSize: 2 * 1024 * 1024, // 2MB max
        });

        // Upload the processed image
        const publicUrl = await uploadProcessedImage(result, {
          userId,
          supabase,
          pathPrefix: "gallery-",
          onProgress: (status) => setStatusText(`${i + 1}/${filesToUpload.length}: ${status}`),
        });

        newUrls.push(publicUrl);
        successCount++;
      } catch (error: any) {
        console.error("Upload error:", error);
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: error.message || `Failed to upload ${file.name}. Try JPG or PNG.`,
        });
      }
    }

    if (newUrls.length > 0) {
      const updatedPhotos = [...photos, ...newUrls];
      onChange(updatedPhotos);
      toast({
        title: "Photos uploaded! 📸",
        description: `${successCount} photo(s) added successfully.`,
      });
    }

    setUploading(false);
    setStatusText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (index: number) => {
    const urlToRemove = photos[index];
    
    // Extract path from URL for deletion
    try {
      const url = new URL(urlToRemove);
      const pathParts = url.pathname.split("/dog-photos/");
      if (pathParts[1]) {
        await supabase.storage.from("dog-photos").remove([decodeURIComponent(pathParts[1])]);
      }
    } catch (error) {
      console.error("Error removing file from storage:", error);
    }

    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {photos.map((url, index) => (
          <div
            key={url}
            className="relative aspect-square rounded-lg overflow-hidden border-2 border-border group"
          >
            <img
              src={url}
              alt={`Dog photo ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Remove button overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="h-8 w-8"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add photo button */}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30",
              "flex flex-col items-center justify-center gap-1",
              "text-muted-foreground hover:border-primary hover:text-primary",
              "transition-colors cursor-pointer",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs text-center px-1 leading-tight">{statusText}</span>
              </>
            ) : (
              <>
                <Plus className="h-6 w-6" />
                <span className="text-xs">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Empty state */}
      {photos.length === 0 && !uploading && (
        <div className="text-center py-4 text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Add additional photos of your dog</p>
          <p className="text-xs">Supports JPG, PNG, WebP, HEIC • Up to {maxPhotos} photos</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <p className="text-xs text-muted-foreground text-center">
        {photos.length}/{maxPhotos} additional photos
      </p>
    </div>
  );
}
