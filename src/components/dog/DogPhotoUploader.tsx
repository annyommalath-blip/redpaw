import { useState, useRef } from "react";
import { Plus, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import heic2any from "heic2any";

interface DogPhotoUploaderProps {
  userId: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

// Convert HEIC/HEIF to JPEG
async function convertHeicToJpeg(file: File): Promise<File> {
  const blob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });
  
  // heic2any can return a single blob or an array
  const resultBlob = Array.isArray(blob) ? blob[0] : blob;
  
  // Create a new file with .jpg extension
  const newFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
  return new File([resultBlob], newFileName, { type: "image/jpeg" });
}

// Check if file is HEIC/HEIF
function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith('.heic') || name.endsWith('.heif') || 
         file.type === 'image/heic' || file.type === 'image/heif';
}

// Check if file is a valid image type
function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];
  const name = file.name.toLowerCase();
  
  return validTypes.includes(file.type) || 
         validExtensions.some(ext => name.endsWith(ext));
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
  const [convertingHeic, setConvertingHeic] = useState(false);

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
      let file = filesToUpload[i];

      // Validate file type
      if (!isValidImageType(file)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: `${file.name} is not a supported image file. Use JPG, PNG, WebP, or HEIC.`,
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
        // Convert HEIC/HEIF to JPEG
        if (isHeicFile(file)) {
          setConvertingHeic(true);
          toast({
            title: "Converting photo...",
            description: `Converting ${file.name} to JPEG format.`,
          });
          
          try {
            file = await convertHeicToJpeg(file);
          } catch (convError) {
            console.error("HEIC conversion error:", convError);
            toast({
              variant: "destructive",
              title: "Conversion failed",
              description: `Could not convert ${file.name}. Please convert to JPG/PNG manually.`,
            });
            setConvertingHeic(false);
            continue;
          }
          setConvertingHeic(false);
        }

        const fileExt = file.name.split(".").pop() || "jpg";
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
      const updatedPhotos = [...photos, ...newUrls];
      onChange(updatedPhotos);
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
            />

            {/* Actions overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
            {uploading || convertingHeic ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs">
                  {convertingHeic ? "Converting..." : `${Math.round(uploadProgress)}%`}
                </span>
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
          <p className="text-xs">Supports JPG, PNG, WebP, HEIC • Up to {maxPhotos} photos, 10MB each</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
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
