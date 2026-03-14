import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dog, Loader2, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BreedSelector } from "@/components/dog/BreedSelector";
import { DogPhotoUploader } from "@/components/dog/DogPhotoUploader";
import { ProfilePhotoUploader } from "@/components/dog/ProfilePhotoUploader";
import { calculateAge } from "@/lib/ageCalculator";
import { cn } from "@/lib/utils";

export default function AddDogPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [microchipNo, setMicrochipNo] = useState("");
  const [notes, setNotes] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [coatShade, setCoatShade] = useState("");
  const [collarDescription, setCollarDescription] = useState("");
  const [markings, setMarkings] = useState("");
  const [verificationSecret, setVerificationSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Calculate age from DOB
  const calculatedAge = useMemo(() => {
    return calculateAge(dateOfBirth);
  }, [dateOfBirth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ variant: "destructive", title: "Please enter your dog's name" });
      return;
    }

    if (!user) {
      toast({ variant: "destructive", title: "Please sign in first" });
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("dogs").insert({
        owner_id: user.id,
        name: name.trim(),
        breed: breed.trim() || null,
        date_of_birth: dateOfBirth ? format(dateOfBirth, "yyyy-MM-dd") : null,
        age: calculatedAge || null,
        weight: weight.trim() || null,
        weight_unit: weightUnit,
        microchip_no: microchipNo.trim() || null,
        notes: notes.trim() || null,
        photo_url: profilePhoto,
        photo_urls: additionalPhotos,
        coat_shade: coatShade.trim() || null,
        collar_description: collarDescription.trim() || null,
        markings: markings.trim() ? markings.split(",").map((m: string) => m.trim()).filter(Boolean) : null,
        verification_secret: verificationSecret.trim() || null,
      });

      if (error) throw error;

      toast({ title: "Dog added! 🐕", description: `${name} has been added to your profile.` });
      navigate("/profile");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="Add Dog" showBack />

      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-primary" />
              New Dog Profile
            </CardTitle>
            <CardDescription>Add your furry friend to RedPaw</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Profile Photo */}
              <div className="space-y-2">
                <Label className="text-center block">Profile Photo</Label>
                {user && (
                  <ProfilePhotoUploader
                    userId={user.id}
                    photoUrl={profilePhoto}
                    onChange={setProfilePhoto}
                  />
                )}
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="What's your dog's name?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Breed Selector */}
              <div className="space-y-2">
                <Label>Breed</Label>
                <BreedSelector value={breed} onChange={setBreed} />
              </div>

              {/* Date of Birth + Age Display */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateOfBirth && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {dateOfBirth ? format(dateOfBirth, "MMM d, yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateOfBirth}
                        onSelect={setDateOfBirth}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Age</Label>
                  <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm flex items-center">
                    {calculatedAge || (
                      <span className="text-muted-foreground">Select DOB</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Weight + Unit */}
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    placeholder="e.g., 65"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={weightUnit} onValueChange={setWeightUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lbs">lbs</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="other">other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Microchip Number */}
              <div className="space-y-2">
                <Label htmlFor="microchip">Microchip No. (optional)</Label>
                <Input
                  id="microchip"
                  placeholder="e.g., 985112000123456"
                  value={microchipNo}
                  onChange={(e) => setMicrochipNo(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This info is private and only visible to you.
                </p>
              </div>

              {/* Additional Photos Section */}
              <div className="space-y-2">
                <Label>Additional Photos (optional)</Label>
                {user && (
                  <DogPhotoUploader
                    userId={user.id}
                    photos={additionalPhotos}
                    onChange={setAdditionalPhotos}
                    maxPhotos={5}
                  />
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special info, allergies, personality traits..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Identity Details for Matching */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Identity Details (helps with lost dog matching)</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coat" className="text-xs text-muted-foreground">
                    Coat color shade (be specific, e.g. "deep reddish gold" not just "brown")
                  </Label>
                  <Input
                    id="coat"
                    placeholder="e.g., light cream, dark chocolate, brindle tan"
                    value={coatShade}
                    onChange={(e) => setCoatShade(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="collar" className="text-xs text-muted-foreground">
                    What does {name || "your dog"} usually wear? (collar, harness, tags)
                  </Label>
                  <Input
                    id="collar"
                    placeholder="e.g., red leather collar with bone tag"
                    value={collarDescription}
                    onChange={(e) => setCollarDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markings" className="text-xs text-muted-foreground">
                    Distinctive markings (separate with commas)
                  </Label>
                  <Input
                    id="markings"
                    placeholder="e.g., white chest patch, scar on left ear, dark muzzle"
                    value={markings}
                    onChange={(e) => setMarkings(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret" className="text-xs text-muted-foreground">
                    Verification secret — something only you'd know
                  </Label>
                  <Input
                    id="secret"
                    placeholder="e.g., birthmark on belly, responds to 'cookie' command"
                    value={verificationSecret}
                    onChange={(e) => setVerificationSecret(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Never shared publicly. Used to verify ownership if someone claims to find your dog.
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Dog className="h-4 w-4 mr-2" />
                    Add Dog
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
