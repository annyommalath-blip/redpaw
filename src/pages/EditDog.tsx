import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Dog, Loader2, Trash2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
  microchip_no: string | null;
  notes: string | null;
  photo_url: string | null;
}

export default function EditDogPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [microchipNo, setMicrochipNo] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setAge(data.age || "");
      setWeight(data.weight || "");
      setMicrochipNo(data.microchip_no || "");
      setNotes(data.notes || "");
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
          age: age.trim() || null,
          weight: weight.trim() || null,
          microchip_no: microchipNo.trim() || null,
          notes: notes.trim() || null,
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <Dog className="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">Photo upload coming soon!</p>

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

              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  placeholder="e.g., Golden Retriever, Mixed"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    placeholder="e.g., 3 years"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight</Label>
                  <Input
                    id="weight"
                    placeholder="e.g., 65 lbs"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
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
