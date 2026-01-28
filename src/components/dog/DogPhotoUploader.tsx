import { useState, useRef } from "react";
import { Plus, X, Star, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setUploadProgress(0);

    const newUrls: string[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name} is not an image file.`,
        });
        continue;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `${file.name} exceeds the 10MB limit.`,
        });
        continue;
      }

      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("dog-photos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("dog-photos")
          .getPublicUrl(fileName);

        newUrls.push(urlData.publicUrl);
        setUploadProgress(((i + 1) / filesToUpload.length) * 100);
      } catch (error: any) {
        console.error("Upload error:", error);
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: error.message || `Failed to upload ${file.name}`,
        });
      }
    }

    if (newUrls.length > 0) {
      onChange([...photos, ...newUrls]);
      toast({
        title: "Photos uploaded! 📸",
        description: `${newUrls.length} photo(s) added successfully.`,
      });
    }

    setUploading(false);
    setUploadProgress(0);
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
        await supabase.storage.from("dog-photos").remove([pathParts[1]]);
      }
    } catch (error) {
      console.error("Error removing file from storage:", error);
    }

    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return; // Already the cover
    const newPhotos = [...photos];
    const [photo] = newPhotos.splice(index, 1);
    newPhotos.unshift(photo);
    onChange(newPhotos);
    toast({
      title: "Cover photo set! ⭐",
      description: "This photo will be your dog's main profile picture.",
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {photos.map((url, index) => (
          <div
            key={url}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden border-2 group",
              index === 0 ? "border-primary" : "border-border"
            )}
          >
            <img
              src={url}
              alt={`Dog photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Cover badge */}
            {index === 0 && (
              <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                <Star className="h-3 w-3" />
                Cover
              </div>
            )}

            {/* Actions overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {index !== 0 && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => handleSetCover(index)}
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
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
                <span className="text-xs">{Math.round(uploadProgress)}%</span>
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
          <p className="text-sm">Add photos of your dog</p>
          <p className="text-xs">Up to {maxPhotos} photos, 10MB each</p>
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
        {photos.length}/{maxPhotos} photos • First photo is the cover
      </p>
    </div>
  );
}
