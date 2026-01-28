import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Clock,
  MessageCircle,
  Eye,
  Dog,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReportSightingDialog } from "@/components/community/ReportSightingDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface LostAlert {
  id: string;
  title: string;
  description: string;
  last_seen_location: string;
  photo_url: string | null;
  status: "active" | "resolved";
  created_at: string;
  owner_id: string;
  dogs: {
    name: string;
    breed: string | null;
  } | null;
}

interface Sighting {
  id: string;
  message: string;
  location_text: string | null;
  created_at: string;
  reporter_id: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function LostAlertDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [alert, setAlert] = useState<LostAlert | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch alert details
      const { data: alertData, error: alertError } = await supabase
        .from("lost_alerts")
        .select(`
          *,
          dogs (name, breed)
        `)
        .eq("id", id)
        .maybeSingle();

      if (alertError) throw alertError;
      setAlert(alertData as any);

      // Fetch sightings
      if (alertData) {
        const { data: sightingsData, error: sightingsError } = await supabase
          .from("sightings")
          .select(`
            *,
            profiles:reporter_id (display_name, avatar_url)
          `)
          .eq("alert_id", id)
          .order("created_at", { ascending: false });

        if (sightingsError) throw sightingsError;
        setSightings((sightingsData as any) || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsFound = async () => {
    if (!alert || !user) return;

    try {
      // Update alert status
      const { error: alertError } = await supabase
        .from("lost_alerts")
        .update({ status: "resolved" })
        .eq("id", alert.id);

      if (alertError) throw alertError;

      // Update dog's lost status
      const { error: dogError } = await supabase
        .from("dogs")
        .update({ is_lost: false })
        .eq("id", (alert as any).dog_id);

      if (dogError) throw dogError;

      toast({
        title: "✅ Marked as Found!",
        description: "Great news! Glad your pup is safe.",
      });

      navigate("/community?tab=lost");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleContact = async () => {
    if (!user || !alert) return;
    
    // Don't message yourself
    if (user.id === alert.owner_id) return;
    
    try {
      // Check for existing conversation for this lost alert
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, participant_ids")
        .eq("context_type", "lostAlert")
        .eq("context_id", alert.id);
      
      // Find existing conversation between these two users
      const existingConvo = conversations?.find(c => 
        c.participant_ids.includes(user.id) && c.participant_ids.includes(alert.owner_id)
      );
      
      if (existingConvo) {
        navigate(`/chat/${existingConvo.id}`);
      } else {
        // Create new conversation
        const { data: newConvo, error } = await supabase
          .from("conversations")
          .insert({
            participant_ids: [user.id, alert.owner_id],
            context_type: "lostAlert",
            context_id: alert.id,
          })
          .select()
          .single();
        
        if (error) throw error;
        navigate(`/chat/${newConvo.id}`);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start conversation",
      });
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

  if (!alert) {
    return (
      <MobileLayout>
        <div className="p-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <p className="text-center text-muted-foreground">Alert not found</p>
        </div>
      </MobileLayout>
    );
  }

  const isOwner = user?.id === alert.owner_id;
  const isActive = alert.status === "active";

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">Lost Dog Alert</h1>
          <Badge
            variant="outline"
            className={isActive ? "bg-lost/10 text-lost border-lost" : "bg-success/10 text-success border-success"}
          >
            {isActive ? "Active" : "Found"}
          </Badge>
        </div>

        {/* Alert Card */}
        <Card className={isActive ? "border-lost" : "border-success"}>
          <div className={`px-4 py-2 ${isActive ? "bg-lost" : "bg-success"}`}>
            <span className="text-sm font-semibold text-white">
              {isActive ? "🚨 LOST DOG" : "✅ FOUND"}
            </span>
          </div>
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Dog Photo */}
              <div className="h-28 w-28 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
                {alert.photo_url ? (
                  <img
                    src={alert.photo_url}
                    alt={alert.dogs?.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Dog className="h-12 w-12 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground">
                  {alert.dogs?.name || "Unknown"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {alert.dogs?.breed || "Unknown breed"}
                </p>
                <p className="text-sm text-foreground mt-2">{alert.description}</p>
              </div>
            </div>

            {/* Location & Time */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{alert.last_seen_location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Posted {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Actions */}
            {isActive && (
              <div className="flex gap-2 mt-4">
                {isOwner ? (
                  <Button
                    className="flex-1 bg-success hover:bg-success/90"
                    onClick={handleMarkAsFound}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Found
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setReportDialogOpen(true)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Report Sighting
                    </Button>
                    <Button className="flex-1" onClick={handleContact}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Owner
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sightings Section */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Reported Sightings ({sightings.length})
          </h2>

          {sightings.length > 0 ? (
            <div className="space-y-3">
              {sightings.map((sighting) => (
                <Card key={sighting.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={sighting.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {sighting.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm">
                            {sighting.profiles?.display_name || "Anonymous"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(sighting.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1">{sighting.message}</p>
                        {sighting.location_text && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{sighting.location_text}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No sightings reported yet
                </p>
                {isActive && !isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    Report a Sighting
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* Report Sighting Dialog */}
      <ReportSightingDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        alertId={alert.id}
        dogName={alert.dogs?.name || "this dog"}
        onSuccess={fetchData}
      />
    </MobileLayout>
  );
}
