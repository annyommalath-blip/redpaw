import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Dog, Settings, LogOut, Edit, Camera, HandHeart, Loader2, Plus } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { OwnerProfileSection } from "@/components/profile/OwnerProfileSection";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface UserDog {
  id: string;
  name: string;
  breed: string | null;
  age: string | null;
  weight: string | null;
  photo_url: string | null;
}

interface MyCareRequest {
  id: string;
  care_type: "walk" | "watch" | "overnight" | "check-in";
  time_window: string;
  status: "open" | "closed";
  assigned_sitter_id: string | null;
  created_at: string;
  _count?: { applications: number };
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [dogs, setDogs] = useState<UserDog[]>([]);
  const [myCareRequests, setMyCareRequests] = useState<MyCareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(profileData);

      // Fetch dogs
      const { data: dogsData } = await supabase
        .from("dogs")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      setDogs(dogsData || []);

      // Fetch my care requests
      const { data: requestsData } = await supabase
        .from("care_requests")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setMyCareRequests(requestsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "See you soon! 🐾",
    });
    navigate("/auth");
  };

  const careTypeLabels: Record<string, string> = {
    walk: "🚶 Walk",
    watch: "👀 Watch",
    overnight: "🌙 Overnight",
    "check-in": "👋 Check-in",
  };

  return (
    <MobileLayout>
      <PageHeader title="Profile" subtitle="Manage your account" />

      {loading ? (
        <div className="p-4 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Owner Profile Section */}
          {user && (
            <OwnerProfileSection 
              userId={user.id} 
              dogs={dogs.map(d => ({ id: d.id, name: d.name, breed: d.breed }))} 
            />
          )}

          {/* User Account Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                  >
                    <Camera className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {profile?.display_name || user?.email?.split("@")[0] || "Dog Lover"}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* My Dogs */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                My Dogs
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile/add-dog")}>
                <Plus className="h-4 w-4 mr-1" />
                Add Dog
              </Button>
            </div>
            
            {dogs.length === 0 ? (
              <EmptyState
                icon={<Dog className="h-10 w-10 text-muted-foreground" />}
                title="No dogs yet"
                description="Add your furry friend to get started!"
                action={{
                  label: "Add My Dog",
                  onClick: () => navigate("/profile/add-dog"),
                }}
              />
            ) : (
              <div className="space-y-3">
                {dogs.map((dog) => (
                  <Card key={dog.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                          {dog.photo_url ? (
                            <img src={dog.photo_url} alt={dog.name} className="h-full w-full object-cover" />
                          ) : (
                            <Dog className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{dog.name}</h3>
                          <p className="text-sm text-muted-foreground">{dog.breed || "Mixed breed"}</p>
                          {(dog.age || dog.weight) && (
                            <p className="text-xs text-muted-foreground">
                              {dog.age}{dog.age && dog.weight && " • "}{dog.weight}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/profile/edit-dog/${dog.id}`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* My Care Requests */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                My Care Requests
              </h2>
            </div>

            {myCareRequests.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  <p>No care requests yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {myCareRequests.map((request) => (
                  <Card
                    key={request.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => navigate(`/care-request/${request.id}`)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <HandHeart className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {careTypeLabels[request.care_type]}
                          </p>
                          <p className="text-xs text-muted-foreground">{request.time_window}</p>
                        </div>
                      </div>
                      <Badge className={request.assigned_sitter_id ? "bg-primary" : "bg-warning"}>
                        {request.assigned_sitter_id ? "Assigned" : "Open"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Settings */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Settings
            </h2>
            <Card>
              <CardContent className="p-0">
                <button className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground">App Settings</span>
                </button>
                <Separator />
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </CardContent>
            </Card>
          </section>

          {/* App Info */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>RedPaw v1.0.0 🐾</p>
            <p className="mt-1">Made with ❤️ for dog lovers</p>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
