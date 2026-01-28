import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Dog, Loader2, Trash2, Calendar } from "lucide-react";
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
import { ProfilePhotoUploader } from "@/components/dog/ProfilePhotoUploader";
import { DogPhotoUploader } from "@/components/dog/DogPhotoUploader";
import { calculateAge } from "@/lib/ageCalculator";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DogData {
  id: string;
  name: string;
  breed: string | null;
  age: string | null;
  weight: string | null;
  weight_unit: string | null;
  microchip_no: string | null;
  notes: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  date_of_birth: string | null;
}

export default function EditDogPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [microchipNo, setMicrochipNo] = useState("");
  const [notes, setNotes] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Calculate age from DOB
  const calculatedAge = useMemo(() => {
    return calculateAge(dateOfBirth);
  }, [dateOfBirth]);

  useEffect(() => {
    if (dogId && user) {
      fetchDog();
    } else if (!dogId) {
      navigate("/profile");
    }
  }, [user, dogId]);

  const fetchDog = async () => {
    if (!dogId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dogs")
        .select("*")
        .eq("id", dogId)
        .eq("owner_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ variant: "destructive", title: "Dog not found" });
        navigate("/profile");
        return;
      }

      setName(data.name);
      setBreed(data.breed || "");
      setDateOfBirth(data.date_of_birth ? new Date(data.date_of_birth) : undefined);
      setWeight(data.weight || "");
      setWeightUnit(data.weight_unit || "lbs");
      setMicrochipNo(data.microchip_no || "");
      setNotes(data.notes || "");
      setProfilePhoto(data.photo_url);
      setAdditionalPhotos(data.photo_urls || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      navigate("/profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ variant: "destructive", title: "Please enter your dog's name" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("dogs")
        .update({
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
        })
        .eq("id", dogId);

      if (error) throw error;

      toast({ title: "Dog updated! 🐕" });
      navigate("/profile");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("dogs")
        .delete()
        .eq("id", dogId);

      if (error) throw error;

      toast({ title: "Dog removed", description: "Profile deleted successfully" });
      navigate("/profile");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Edit Dog" showBack />
        <div className="p-4 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="Edit Dog" showBack />

      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-primary" />
              Edit Dog Profile
            </CardTitle>
            <CardDescription>Update your dog's information</CardDescription>
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

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="w-full text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Dog
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this dog profile and all associated health logs. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </form>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
