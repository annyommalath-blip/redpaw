import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Dog, Settings, LogOut, Edit, Camera, HandHeart, Loader2, Plus, Save, MapPin, Archive, ChevronRight, ArchiveX, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface OwnerProfile {
  display_name: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  postal_code: string | null;
}

interface MyCareRequest {
  id: string;
  care_type: "walk" | "watch" | "overnight" | "check-in";
  time_window: string;
  status: "open" | "closed";
  assigned_sitter_id: string | null;
  owner_id: string;
  created_at: string;
  request_date: string | null;
  end_time: string | null;
  archived_at: string | null;
  dogs: {
    name: string;
    breed: string | null;
  } | null;
}

interface ArchivedLostAlert {
  id: string;
  title: string;
  created_at: string;
  resolved_at: string | null;
  dogs: {
    name: string;
    breed: string | null;
  } | null;
}

// Helper to check if a care request is archived (manually or 1 hour after end time)
const isRequestArchived = (request: MyCareRequest): boolean => {
  // Check if manually archived
  if (request.archived_at) return true;
  
  // Check auto-archive (1 hour after end time)
  if (!request.request_date || !request.end_time) return false;
  
  // Parse request_date and end_time to create a full datetime
  const [hours, minutes] = request.end_time.split(':').map(Number);
  const endDateTime = new Date(request.request_date);
  endDateTime.setHours(hours, minutes, 0, 0);
  
  // Add 1 hour for archive threshold
  const archiveTime = new Date(endDateTime.getTime() + 60 * 60 * 1000);
  
  return new Date() > archiveTime;
};

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [dogs, setDogs] = useState<UserDog[]>([]);
  const [myCareRequests, setMyCareRequests] = useState<MyCareRequest[]>([]);
  const [archivedLostAlerts, setArchivedLostAlerts] = useState<ArchivedLostAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    city: "",
    postal_code: "",
  });
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
      // Fetch profile with all fields
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, first_name, last_name, city, postal_code")
        .eq("user_id", user.id)
        .maybeSingle();

      setProfile(profileData);
      if (profileData) {
        setEditForm({
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          city: profileData.city || "",
          postal_code: profileData.postal_code || "",
        });
      }

      // Fetch dogs
      const { data: dogsData } = await supabase
        .from("dogs")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      setDogs(dogsData || []);

      // Fetch care requests where user is owner OR assigned sitter
      const { data: ownedRequests } = await supabase
        .from("care_requests")
        .select("*, dogs (name, breed)")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      const { data: assignedRequests } = await supabase
        .from("care_requests")
        .select("*, dogs (name, breed)")
        .eq("assigned_sitter_id", user.id)
        .order("created_at", { ascending: false });

      // Combine and deduplicate (in case user is both owner and sitter - unlikely but safe)
      const allRequests = [...(ownedRequests || []), ...(assignedRequests || [])];
      const uniqueRequests = allRequests.filter((request, index, self) =>
        index === self.findIndex((r) => r.id === request.id)
      );
      
      // Sort by created_at desc
      uniqueRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setMyCareRequests(uniqueRequests as MyCareRequest[]);

      // Fetch resolved (archived) lost alerts
      const { data: resolvedAlerts } = await supabase
        .from("lost_alerts")
        .select("id, title, created_at, resolved_at, dogs (name, breed)")
        .eq("owner_id", user.id)
        .eq("status", "resolved")
        .order("resolved_at", { ascending: false });

      setArchivedLostAlerts((resolvedAlerts as any) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: editForm.first_name.trim() || null,
          last_name: editForm.last_name.trim() || null,
          city: editForm.city.trim() || null,
          postal_code: editForm.postal_code.trim() || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        first_name: editForm.first_name.trim() || null,
        last_name: editForm.last_name.trim() || null,
        city: editForm.city.trim() || null,
        postal_code: editForm.postal_code.trim() || null,
      } : null);
      
      setIsEditing(false);
      toast({
        title: t("profile.profileUpdated"),
        description: t("profile.profileSaved"),
      });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: t("common.error"),
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatName = (): string => {
    const parts = [profile?.first_name, profile?.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "";
  };

  const formatLocation = (): string => {
    const parts = [profile?.city, profile?.postal_code].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "";
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: t("auth.signOut"),
      description: t("auth.seeYouSoon"),
    });
    navigate("/auth");
  };

  const handleArchiveRequest = async (requestId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to detail page
    
    try {
      const { error } = await supabase
        .from("care_requests")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;

      // Update local state
      setMyCareRequests(prev =>
        prev.map(r => r.id === requestId ? { ...r, archived_at: new Date().toISOString() } : r)
      );

      toast({
        title: t("profile.archived"),
        description: t("profile.careRequestArchived"),
      });
    } catch (error) {
      console.error("Error archiving request:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: "Failed to archive request.",
      });
    }
  };

  const careTypeLabels: Record<string, string> = {
    walk: `🚶 ${t("care.walk")}`,
    watch: `👀 ${t("care.watch")}`,
    overnight: `🌙 ${t("care.overnight")}`,
    "check-in": `👋 ${t("care.checkIn")}`,
  };

  return (
    <MobileLayout>
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      {loading ? (
        <div className="p-4 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* User Account Card with Owner Profile */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Header: Avatar + Username/Email + Edit */}
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
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              {/* Owner Profile Details */}
              {isEditing ? (
                <div className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="first_name" className="text-xs text-muted-foreground">
                        {t("profile.firstName")}
                      </Label>
                      <Input
                        id="first_name"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder={t("profile.firstName")}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last_name" className="text-xs text-muted-foreground">
                        {t("profile.lastName")}
                      </Label>
                      <Input
                        id="last_name"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder={t("profile.lastName")}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Location Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs text-muted-foreground">
                        {t("profile.city")}
                      </Label>
                      <Input
                        id="city"
                        value={editForm.city}
                        onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Seattle"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="postal_code" className="text-xs text-muted-foreground">
                        {t("profile.postalCode")}
                      </Label>
                      <Input
                        id="postal_code"
                        value={editForm.postal_code}
                        onChange={(e) => setEditForm(prev => ({ ...prev, postal_code: e.target.value }))}
                        placeholder="98125"
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1"
                      size="sm"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t("profile.saving")}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {t("profile.saveProfile")}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm({
                          first_name: profile?.first_name || "",
                          last_name: profile?.last_name || "",
                          city: profile?.city || "",
                          postal_code: profile?.postal_code || "",
                        });
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Name Display */}
                  {formatName() && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">{t("profile.name")}: </span>
                        <span className="font-medium text-foreground">{formatName()}</span>
                      </span>
                    </div>
                  )}

                  {/* Location Display */}
                  {formatLocation() && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">{t("profile.location")}: </span>
                        <span className="font-medium text-foreground">{formatLocation()}</span>
                      </span>
                    </div>
                  )}


                  {/* Owner of Dogs */}
                  {dogs.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Dog className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm text-muted-foreground">{t("profile.ownerOf")}: </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {dogs.map((dog) => (
                            <span
                              key={dog.id}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                            >
                              {dog.name} {dog.breed ? `(${dog.breed})` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show hint if no details filled */}
                  {!formatName() && !formatLocation() && (
                    <p className="text-sm text-muted-foreground italic">
                      {t("profile.editHint")}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Dogs */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("profile.myDogs")}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile/add-dog")}>
                <Plus className="h-4 w-4 mr-1" />
                {t("profile.addDog")}
              </Button>
            </div>
            
            {dogs.length === 0 ? (
              <EmptyState
                icon={<Dog className="h-10 w-10 text-muted-foreground" />}
                title={t("dogs.noDogs")}
                description={t("dogs.noDogsDesc")}
                action={{
                  label: t("home.addMyDog"),
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
                          <p className="text-sm text-muted-foreground">{dog.breed || t("common.mixedBreed")}</p>
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

          {/* My Care Requests - Active Only */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("profile.myCareRequests")}
              </h2>
            </div>

            {(() => {
              const activeRequests = myCareRequests.filter(r => !isRequestArchived(r));
              
              return activeRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center text-muted-foreground">
                    <p>{t("profile.noCareRequests")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {activeRequests.map((request) => {
                    const isOwner = request.owner_id === user?.id;
                    const isAssignedSitter = request.assigned_sitter_id === user?.id;
                    
                    return (
                      <Card
                        key={request.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => navigate(`/care-request/${request.id}`)}
                      >
                        <CardContent className="p-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <HandHeart className="h-5 w-5 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {careTypeLabels[request.care_type]}
                                {request.dogs?.name && (
                                  <span className="text-muted-foreground font-normal"> - {request.dogs.name}</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {request.time_window}
                                {!isOwner && isAssignedSitter && ` • ${t("profile.youreTheSitter")}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className={request.assigned_sitter_id ? "bg-primary" : "bg-warning"}>
                              {request.assigned_sitter_id ? t("common.assigned") : t("common.open")}
                            </Badge>
                            <button
                              onClick={(e) => handleArchiveRequest(request.id, e)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors"
                              title={t("profile.archive")}
                            >
                              <ArchiveX className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </section>

          {/* Settings */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {t("profile.settings")}
            </h2>
            <Card>
              <CardContent className="p-0">
                <button 
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-foreground">{t("profile.appSettings")}</span>
                </button>
                <Separator />
                <button 
                  className="w-full flex items-center justify-between p-4 hover:bg-accent transition-colors text-left"
                  onClick={() => setShowArchive(!showArchive)}
                >
                  <div className="flex items-center gap-3">
                    <Archive className="h-5 w-5 text-muted-foreground" />
                    <span className="text-foreground">{t("profile.archive")}</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showArchive ? 'rotate-90' : ''}`} />
                </button>
                
                {/* Archive Section - Expandable */}
                {showArchive && (
                  <div className="border-t bg-muted/30 p-4 space-y-4">
                    {/* Archived Care Requests */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {t("profile.archivedCareRequests")}
                      </h3>
                      {(() => {
                        const archivedRequests = myCareRequests.filter(r => isRequestArchived(r));
                        
                        return archivedRequests.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">{t("profile.noArchivedCareRequests")}</p>
                        ) : (
                          <div className="space-y-2">
                            {archivedRequests.map((request) => {
                              const isOwner = request.owner_id === user?.id;
                              const isAssignedSitter = request.assigned_sitter_id === user?.id;
                              
                              return (
                                <Card
                                  key={request.id}
                                  className="cursor-pointer hover:border-primary transition-colors opacity-70"
                                  onClick={() => navigate(`/care-request/${request.id}`)}
                                >
                                  <CardContent className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <HandHeart className="h-5 w-5 text-muted-foreground" />
                                      <div>
                                        <p className="text-sm font-medium text-foreground">
                                          {careTypeLabels[request.care_type]}
                                          {request.dogs?.name && (
                                            <span className="text-muted-foreground font-normal"> - {request.dogs.name}</span>
                                          )}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {request.time_window}
                                          {!isOwner && isAssignedSitter && ` • ${t("profile.youWereTheSitter")}`}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant="secondary">{t("common.completed")}</Badge>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Archived Lost Dog Alerts */}
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {t("profile.resolvedLostAlerts")}
                      </h3>
                      {archivedLostAlerts.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">{t("profile.noResolvedAlerts")}</p>
                      ) : (
                        <div className="space-y-2">
                          {archivedLostAlerts.map((alert) => (
                            <Card
                              key={alert.id}
                              className="cursor-pointer hover:border-primary transition-colors opacity-70"
                              onClick={() => navigate(`/lost-alert/${alert.id}`)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center gap-3">
                                  <AlertTriangle className="h-5 w-5 text-success shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {alert.dogs?.name || "Unknown"} - {t("profile.found")}! ✅
                                    </p>
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                      <p>{t("profile.lost")}: {format(new Date(alert.created_at), "MMM d, yyyy")}</p>
                                      {alert.resolved_at && (
                                        <p>{t("profile.found")}: {format(new Date(alert.resolved_at), "MMM d, yyyy")}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                                    {t("common.resolved")}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <Separator />
                <button
                  className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <span>{t("auth.signOut")}</span>
                </button>
              </CardContent>
            </Card>
          </section>

          {/* App Info */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>RedPaw v1.0.0 🐾</p>
            <p className="mt-1">{t("profile.madeWithLove")}</p>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}
