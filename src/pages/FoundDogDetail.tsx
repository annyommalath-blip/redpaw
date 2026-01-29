import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  MessageCircle,
  Dog,
  Loader2,
  CheckCircle,
  MapPin,
} from "lucide-react";
import { LocationLink } from "@/components/location/LocationLink";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

interface FoundDog {
  id: string;
  reporter_id: string;
  photo_urls: string[];
  description: string | null;
  location_label: string;
  latitude: number | null;
  longitude: number | null;
  found_at: string;
  status: "active" | "reunited" | "closed";
  created_at: string;
}

interface ReporterProfile {
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface UserDog {
  id: string;
  name: string;
  photo_url: string | null;
  breed: string | null;
}

export default function FoundDogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [foundDog, setFoundDog] = useState<FoundDog | null>(null);
  const [reporter, setReporter] = useState<ReporterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [userDogs, setUserDogs] = useState<UserDog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<string>("");
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch found dog details
      const { data: foundData, error: foundError } = await supabase
        .from("found_dogs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (foundError) throw foundError;
      setFoundDog(foundData as FoundDog);

      // Fetch reporter profile using public view (no sensitive data)
      if (foundData) {
        const { data: profileData } = await supabase
          .from("profiles_public")
          .select("display_name, avatar_url, first_name, last_name")
          .eq("user_id", foundData.reporter_id)
          .maybeSingle();

        setReporter(profileData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDogs = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("dogs")
      .select("id, name, photo_url, breed")
      .eq("owner_id", user.id);

    setUserDogs(data || []);
    if (data && data.length > 0) {
      setSelectedDogId(data[0].id);
    }
  };

  const handleClaimClick = () => {
    fetchUserDogs();
    setClaimDialogOpen(true);
  };

  const handleClaimSubmit = async () => {
    if (!user || !foundDog || !selectedDogId) return;

    setClaiming(true);
    try {
      const selectedDog = userDogs.find((d) => d.id === selectedDogId);
      
      // Create or find conversation with reporter
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, participant_ids")
        .eq("context_type", "foundDog")
        .eq("context_id", foundDog.id);

      const existingConvo = conversations?.find(
        (c) =>
          c.participant_ids.includes(user.id) &&
          c.participant_ids.includes(foundDog.reporter_id)
      );

      let conversationId: string;

      if (existingConvo) {
        conversationId = existingConvo.id;
      } else {
        const { data: newConvo, error } = await supabase
          .from("conversations")
          .insert({
            participant_ids: [user.id, foundDog.reporter_id],
            context_type: "foundDog",
            context_id: foundDog.id,
          })
          .select()
          .single();

        if (error) throw error;
        conversationId = newConvo.id;
      }

      // Send initial message
      const message = `Hi! I think this might be my dog ${selectedDog?.name}. ${selectedDog?.breed ? `They are a ${selectedDog.breed}.` : ""} Can we arrange to meet?`;

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text: message,
      });

      // Update conversation last_message
      await supabase
        .from("conversations")
        .update({ last_message: message })
        .eq("id", conversationId);

      toast({
        title: "Message sent!",
        description: "The reporter will be notified.",
      });

      setClaimDialogOpen(false);
      navigate(`/messages/${conversationId}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setClaiming(false);
    }
  };

  const handleMarkAsReunited = async () => {
    if (!foundDog || !user) return;

    try {
      const { error } = await supabase
        .from("found_dogs")
        .update({ status: "reunited" })
        .eq("id", foundDog.id);

      if (error) throw error;

      toast({
        title: "✅ Marked as Reunited!",
        description: "Great news! Glad the dog found their owner.",
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
    if (!user || !foundDog) return;

    // Don't message yourself
    if (user.id === foundDog.reporter_id) return;

    try {
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, participant_ids")
        .eq("context_type", "foundDog")
        .eq("context_id", foundDog.id);

      const existingConvo = conversations?.find(
        (c) =>
          c.participant_ids.includes(user.id) &&
          c.participant_ids.includes(foundDog.reporter_id)
      );

      if (existingConvo) {
        navigate(`/messages/${existingConvo.id}`);
      } else {
        const { data: newConvo, error } = await supabase
          .from("conversations")
          .insert({
            participant_ids: [user.id, foundDog.reporter_id],
            context_type: "foundDog",
            context_id: foundDog.id,
          })
          .select()
          .single();

        if (error) throw error;
        navigate(`/messages/${newConvo.id}`);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not start conversation",
      });
    }
  };

  const getReporterName = () => {
    if (!reporter) return "Anonymous";
    if (reporter.first_name || reporter.last_name) {
      return `${reporter.first_name || ""} ${reporter.last_name || ""}`.trim();
    }
    return reporter.display_name || "Anonymous";
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

  if (!foundDog) {
    return (
      <MobileLayout>
        <div className="p-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <p className="text-center text-muted-foreground">Post not found</p>
        </div>
      </MobileLayout>
    );
  }

  const isReporter = user?.id === foundDog.reporter_id;
  const isActive = foundDog.status === "active";
  const isReunited = foundDog.status === "reunited";
  const foundAt = new Date(foundDog.found_at);

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">Found Dog Report</h1>
          <Badge
            variant="outline"
            className={
              isReunited
                ? "bg-success/10 text-success border-success"
                : isActive
                ? "bg-success/10 text-success border-success"
                : "bg-muted text-muted-foreground"
            }
          >
            {isReunited ? "Reunited" : isActive ? "Active" : "Closed"}
          </Badge>
        </div>

        {/* Main Card */}
        <Card className={isReunited ? "border-success" : isActive ? "border-success" : ""}>
          <div className={`px-4 py-2 ${isReunited ? "bg-success" : isActive ? "bg-success" : "bg-muted"}`}>
            <span className="text-sm font-semibold text-success-foreground">
              {isReunited ? "✅ REUNITED" : "🐕 FOUND DOG"}
            </span>
          </div>
          <CardContent className="p-4">
            {/* Photo Gallery */}
            {foundDog.photo_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {foundDog.photo_urls.map((url, index) => (
                  <div
                    key={index}
                    className={`${
                      index === 0 && foundDog.photo_urls.length === 1
                        ? "col-span-2"
                        : ""
                    } aspect-square rounded-xl overflow-hidden bg-muted`}
                  >
                    <img
                      src={url}
                      alt={`Found dog ${index + 1}`}
                      className="h-full w-full object-cover cursor-pointer"
                      onClick={() => window.open(url, "_blank")}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            {foundDog.description && (
              <p className="text-foreground mb-4">{foundDog.description}</p>
            )}

            {/* Found Time */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Found on {format(foundAt, "MMM d, yyyy")} at {format(foundAt, "h:mm a")}
              </span>
            </div>

            {/* Location */}
            <LocationLink
              latitude={foundDog.latitude}
              longitude={foundDog.longitude}
              locationLabel={foundDog.location_label}
              className="text-muted-foreground hover:text-primary"
            />

            {/* Reporter Info */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t">
              <Avatar className="h-10 w-10">
                <AvatarImage src={reporter?.avatar_url || undefined} />
                <AvatarFallback>
                  {getReporterName()[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{getReporterName()}</p>
                <p className="text-xs text-muted-foreground">
                  Posted {formatDistanceToNow(new Date(foundDog.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            {/* Actions */}
            {isActive && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                {isReporter ? (
                  <Button
                    className="col-span-2 bg-success hover:bg-success/90"
                    onClick={handleMarkAsReunited}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Reunited
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleClaimClick}>
                      <Dog className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                    <Button onClick={handleContact}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
              </div>
            )}

            {isReunited && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-success bg-success/10 rounded-lg py-3">
                <CheckCircle className="h-4 w-4" />
                <span>This dog has been reunited with their owner!</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Claim Dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Is this your dog?</DialogTitle>
            <DialogDescription>
              Select your dog to send a message to the reporter with your dog's information.
            </DialogDescription>
          </DialogHeader>

          {userDogs.length === 0 ? (
            <div className="text-center py-4">
              <Dog className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground mb-4">
                You haven't added any dogs yet.
              </p>
              <Button onClick={() => navigate("/profile/add-dog")}>
                Add Your Dog
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={selectedDogId} onValueChange={setSelectedDogId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your dog" />
                </SelectTrigger>
                <SelectContent>
                  {userDogs.map((dog) => (
                    <SelectItem key={dog.id} value={dog.id}>
                      <div className="flex items-center gap-2">
                        {dog.photo_url && (
                          <img
                            src={dog.photo_url}
                            alt={dog.name}
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        )}
                        <span>{dog.name}</span>
                        {dog.breed && (
                          <span className="text-muted-foreground">
                            ({dog.breed})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setClaimDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleClaimSubmit}
                  disabled={!selectedDogId || claiming}
                >
                  {claiming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Message"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
