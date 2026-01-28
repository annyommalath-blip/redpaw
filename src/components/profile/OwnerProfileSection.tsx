import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Dog {
  id: string;
  name: string;
  breed: string | null;
}

interface OwnerProfileSectionProps {
  userId: string;
  dogs: Dog[];
}

interface ProfileData {
  first_name: string;
  last_name: string;
  city: string;
  postal_code: string;
}

export function OwnerProfileSection({ userId, dogs }: OwnerProfileSectionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    city: "",
    postal_code: "",
  });

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, city, postal_code")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) {
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          city: data.city || "",
          postal_code: data.postal_code || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: profile.first_name.trim() || null,
          last_name: profile.last_name.trim() || null,
          city: profile.city.trim() || null,
          postal_code: profile.postal_code.trim() || null,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved! 🐾",
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const locationDisplay = [profile.city, profile.postal_code]
    .filter(Boolean)
    .join(", ");

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Owner Profile
        </h2>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first_name" className="text-xs text-muted-foreground">
              First Name
            </Label>
            <Input
              id="first_name"
              value={profile.first_name}
              onChange={(e) => handleChange("first_name", e.target.value)}
              placeholder="First name"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name" className="text-xs text-muted-foreground">
              Last Name
            </Label>
            <Input
              id="last_name"
              value={profile.last_name}
              onChange={(e) => handleChange("last_name", e.target.value)}
              placeholder="Last name"
              className="h-9"
            />
          </div>
        </div>

        {/* Location Fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs text-muted-foreground">
              City
            </Label>
            <Input
              id="city"
              value={profile.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Seattle"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal_code" className="text-xs text-muted-foreground">
              Postal Code
            </Label>
            <Input
              id="postal_code"
              value={profile.postal_code}
              onChange={(e) => handleChange("postal_code", e.target.value)}
              placeholder="98125"
              className="h-9"
            />
          </div>
        </div>

        {locationDisplay && (
          <p className="text-sm text-muted-foreground">
            📍 {locationDisplay}
          </p>
        )}

        {/* Owner of Dogs */}
        {dogs.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Owner of</Label>
            <div className="flex flex-wrap gap-2">
              {dogs.map((dog) => (
                <span
                  key={dog.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                >
                  🐕 {dog.name} {dog.breed ? `(${dog.breed})` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="sm"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
