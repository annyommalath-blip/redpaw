import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dog, Loader2, Calendar } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { BreedSelector } from "@/components/dog/BreedSelector";
import { DogPhotoUploader } from "@/components/dog/DogPhotoUploader";
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
  const [notes, setNotes] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
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
        age: calculatedAge || null, // Store calculated age for backwards compatibility
        weight: weight.trim() || null,
        notes: notes.trim() || null,
        photo_url: photoUrls[0] || null, // First photo as cover
        photo_urls: photoUrls,
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

              {/* Weight */}
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  placeholder="e.g., 65 lbs"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>

              {/* Photos Section */}
              <div className="space-y-2">
                <Label>Photos</Label>
                {user && (
                  <DogPhotoUploader
                    userId={user.id}
                    photos={photoUrls}
                    onChange={setPhotoUrls}
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
