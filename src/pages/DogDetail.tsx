import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Dog, Edit, Calendar, Scale, FileText, Camera, Loader2, ArrowLeft, Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
  is_lost: boolean;
  owner_id: string;
}

export default function DogDetailPage() {
  const { dogId } = useParams<{ dogId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dog, setDog] = useState<DogData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dogId && user) {
      fetchDog();
    }
  }, [dogId, user]);

  const fetchDog = async () => {
    if (!dogId || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dogs")
        .select("*")
        .eq("id", dogId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({ variant: "destructive", title: t("dogDetail.dogNotFound") });
        navigate("/");
        return;
      }

      setDog(data);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="p-4 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!dog) {
    return (
      <MobileLayout>
        <div className="p-4 text-center">
          <p className="text-muted-foreground">{t("dogDetail.dogNotFound")}</p>
          <Button variant="ghost" onClick={() => navigate("/")}>{t("dogDetail.goHome")}</Button>
        </div>
      </MobileLayout>
    );
  }

  const allPhotos = [
    ...(dog.photo_url ? [dog.photo_url] : []),
    ...(dog.photo_urls || []),
  ];

  return (
    <MobileLayout>
      {/* Header with back button */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">{dog.name}</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/profile/edit-dog/${dog.id}`)}>
            <Edit className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Photo */}
        <div className="flex flex-col items-center">
          <div className={`relative ${dog.is_lost ? "ring-4 ring-destructive animate-pulse" : ""}`}>
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage src={dog.photo_url || ""} alt={dog.name} className="object-cover" />
              <AvatarFallback className="bg-muted">
                <Dog className="h-16 w-16 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            {dog.is_lost && (
              <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground">
                🚨 {t("dogs.lost")}
              </Badge>
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold text-foreground">{dog.name}</h2>
          {dog.breed && (
            <p className="text-muted-foreground">{dog.breed}</p>
          )}
        </div>

        {/* Dog Details Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {dog.age && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.age")}</p>
                  <p className="font-medium text-foreground">{dog.age}</p>
                </div>
              </div>
            )}

            {dog.date_of_birth && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.birthday")}</p>
                  <p className="font-medium text-foreground">
                    {new Date(dog.date_of_birth).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}

            {dog.weight && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.weight")}</p>
                  <p className="font-medium text-foreground">
                    {dog.weight} {dog.weight_unit || "lbs"}
                  </p>
                </div>
              </div>
            )}

            {/* Microchip - Only visible to owner */}
            {dog.microchip_no && dog.owner_id === user?.id && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.microchip")}</p>
                  <p className="font-medium text-foreground font-mono">{dog.microchip_no}</p>
                </div>
              </div>
            )}

            {dog.notes && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("dogs.notes")}</p>
                  <p className="font-medium text-foreground">{dog.notes}</p>
                </div>
              </div>
            )}

            {!dog.age && !dog.weight && !dog.notes && !dog.date_of_birth && !dog.microchip_no && (
              <p className="text-center text-muted-foreground py-4">
                {t("dogDetail.noDetails")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        {allPhotos.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("dogs.photos")} ({allPhotos.length})
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {allPhotos.map((url, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-xl overflow-hidden bg-muted"
                >
                  <img
                    src={url}
                    alt={`${dog.name} photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Edit Button */}
        <Button
          className="w-full"
          onClick={() => navigate(`/profile/edit-dog/${dog.id}`)}
        >
          <Edit className="h-4 w-4 mr-2" />
          {t("dogDetail.editProfile")}
        </Button>
      </div>
    </MobileLayout>
  );
}
