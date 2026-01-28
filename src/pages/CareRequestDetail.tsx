import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Clock, DollarSign, Dog, MessageCircle, Check, Users, FileText, PlusCircle } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ApplicationForm } from "@/components/care/ApplicationForm";
import { ApplicationCard } from "@/components/care/ApplicationCard";
import { SitterLogCard } from "@/components/care/SitterLogCard";
import { SitterLogForm } from "@/components/care/SitterLogForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

type CareType = "walk" | "watch" | "overnight" | "check-in";

const careTypeConfig: Record<CareType, { icon: string; label: string }> = {
  walk: { icon: "🚶", label: "Walk" },
  watch: { icon: "👀", label: "Short Watch" },
  overnight: { icon: "🌙", label: "Overnight" },
  "check-in": { icon: "👋", label: "Check-in" },
};

interface CareRequest {
  id: string;
  owner_id: string;
  dog_id: string;
  care_type: CareType;
  time_window: string;
  location_text: string;
  notes: string | null;
  pay_offered: string | null;
  status: "open" | "closed";
  assigned_sitter_id: string | null;
  created_at: string;
  dogs?: {
    name: string;
    breed: string | null;
    photo_url: string | null;
  };
  profiles?: {
    display_name: string | null;
  };
}

interface Application {
  id: string;
  applicant_id: string;
  availability_text: string;
  message: string;
  rate_offered: string | null;
  status: "pending" | "approved" | "declined" | "withdrawn";
  created_at: string;
  profiles?: {
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    city: string | null;
    postal_code: string | null;
    avatar_url: string | null;
  };
}

interface SitterLog {
  id: string;
  log_type: "walk" | "meal" | "potty" | "play" | "note";
  note_text: string | null;
  media_urls: string[];
  created_at: string;
  profiles?: {
    display_name: string | null;
  };
}

export default function CareRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [request, setRequest] = useState<CareRequest | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [sitterLogs, setSitterLogs] = useState<SitterLog[]>([]);
  const [myApplication, setMyApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [activeTab, setActiveTab] = useState("applications");

  const isOwner = user?.id === request?.owner_id;
  const isAssignedSitter = user?.id === request?.assigned_sitter_id;
  const isAssigned = request?.status === "open" && request?.assigned_sitter_id !== null;
  const hasApproved = applications.some(a => a.status === "approved");

  useEffect(() => {
    if (requestId && user) {
      fetchData();
    }
  }, [requestId, user]);

  // Set default tab based on user role
  useEffect(() => {
    if (request) {
      if (user?.id === request.assigned_sitter_id && user?.id !== request.owner_id) {
        setActiveTab("logs");
      } else if (user?.id === request.owner_id) {
        setActiveTab("applications");
      }
    }
  }, [request, user]);

  const fetchData = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      // Fetch care request with dog info (no FK to profiles, so fetch separately)
      const { data: requestData, error: requestError } = await supabase
        .from("care_requests")
        .select(`
          *,
          dogs (name, breed, photo_url)
        `)
        .eq("id", requestId)
        .maybeSingle();

      if (requestError) throw requestError;
      if (!requestData) {
        toast({ variant: "destructive", title: "Request not found" });
        navigate("/community");
        return;
      }

      // Fetch owner profile separately
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", requestData.owner_id)
        .maybeSingle();

      // Combine the data
      const combinedRequest = {
        ...requestData,
        profiles: ownerProfile
      };

      setRequest(combinedRequest as any);

      // Fetch applications if owner
      if (requestData.owner_id === user?.id) {
        const { data: appsData } = await supabase
          .from("care_applications")
          .select("*")
          .eq("request_id", requestId)
          .order("created_at", { ascending: false });

        // Fetch applicant profiles separately
        if (appsData && appsData.length > 0) {
          const applicantIds = appsData.map(app => app.applicant_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("user_id, display_name, first_name, last_name, city, postal_code, avatar_url")
            .in("user_id", applicantIds);

          // Combine applications with profiles
          const appsWithProfiles = appsData.map(app => ({
            ...app,
            profiles: profilesData?.find(p => p.user_id === app.applicant_id) || null
          }));
          setApplications(appsWithProfiles as any);
        } else {
          setApplications([]);
        }
      }

      // Fetch my application if not owner
      if (requestData.owner_id !== user?.id) {
        const { data: myAppData } = await supabase
          .from("care_applications")
          .select("*")
          .eq("request_id", requestId)
          .eq("applicant_id", user?.id)
          .maybeSingle();

        setMyApplication(myAppData as any);
      }

      // Fetch sitter logs if assigned or owner
      if (requestData.assigned_sitter_id) {
        const { data: logsData } = await supabase
          .from("sitter_logs")
          .select(`
            *,
            profiles:sitter_id (display_name)
          `)
          .eq("request_id", requestId)
          .order("created_at", { ascending: false });

        setSitterLogs((logsData as any) || []);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error loading request", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string, applicantId: string) => {
    try {
      // Start transaction: Update the care request
      const { error: requestError } = await supabase
        .from("care_requests")
        .update({ assigned_sitter_id: applicantId })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // Update approved application
      const { error: approveError } = await supabase
        .from("care_applications")
        .update({ status: "approved" })
        .eq("id", applicationId);

      if (approveError) throw approveError;

      // Decline all other applications
      const { error: declineError } = await supabase
        .from("care_applications")
        .update({ status: "declined" })
        .eq("request_id", requestId)
        .neq("id", applicationId)
        .eq("status", "pending");

      if (declineError) throw declineError;

      toast({ title: "Sitter approved! 🎉" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleDecline = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from("care_applications")
        .update({ status: "declined" })
        .eq("id", applicationId);

      if (error) throw error;
      toast({ title: "Application declined" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleWithdraw = async () => {
    if (!myApplication) return;
    
    try {
      const { error } = await supabase
        .from("care_applications")
        .update({ status: "withdrawn" })
        .eq("id", myApplication.id);

      if (error) throw error;
      toast({ title: "Application withdrawn" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const handleChat = async (applicantId: string) => {
    try {
      // Check for existing conversation with this context
      const { data: existingConvo } = await supabase
        .from("conversations")
        .select("id")
        .contains("participant_ids", [user?.id, applicantId])
        .eq("context_type", "careRequest")
        .eq("context_id", requestId)
        .maybeSingle();

      if (existingConvo) {
        navigate(`/messages/${existingConvo.id}`);
        return;
      }

      // Create new conversation
      const { data: newConvo, error } = await supabase
        .from("conversations")
        .insert({
          participant_ids: [user?.id, applicantId],
          context_type: "careRequest",
          context_id: requestId,
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/messages/${newConvo.id}`);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Care Request" showBack />
        <div className="p-4 flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </MobileLayout>
    );
  }

  if (!request) return null;

  const config = careTypeConfig[request.care_type];

  return (
    <MobileLayout>
      <PageHeader title="Care Request" showBack />

      <div className="p-4 space-y-4">
        {/* Status Banner for Assigned Requests */}
        {isAssigned && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-primary">Sitter Assigned</p>
                <p className="text-sm text-muted-foreground">
                  {isOwner ? "Your request has an assigned sitter" : isAssignedSitter ? "You're the assigned sitter!" : "This request has been filled"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <Badge className="bg-primary text-primary-foreground">
                {config.icon} {config.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </span>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
                {request.dogs?.photo_url ? (
                  <img src={request.dogs.photo_url} alt={request.dogs.name} className="h-full w-full object-cover" />
                ) : (
                  <Dog className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground">{request.dogs?.name || "Unknown"}</h3>
                <p className="text-sm text-muted-foreground">{request.dogs?.breed}</p>
                <p className="text-xs text-muted-foreground">by {request.profiles?.display_name || "Owner"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{request.time_window}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{request.location_text}</span>
              </div>
              {request.pay_offered && (
                <div className="flex items-center gap-2 text-sm text-success font-medium">
                  <DollarSign className="h-4 w-4 shrink-0" />
                  <span>{request.pay_offered}</span>
                </div>
              )}
            </div>

            {request.notes && (
              <p className="text-sm text-foreground mt-3 p-3 bg-muted/50 rounded-lg">{request.notes}</p>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Owner or Assigned Sitter */}
        {(isOwner || isAssignedSitter) && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${isOwner && (isAssigned || isAssignedSitter) ? "grid-cols-2" : "grid-cols-1"}`}>
              {isOwner && (
                <TabsTrigger value="applications" className="gap-2">
                  <Users className="h-4 w-4" />
                  Applications ({applications.length})
                </TabsTrigger>
              )}
              {isAssigned && (
                <TabsTrigger value="logs" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Job Updates
                </TabsTrigger>
              )}
              {!isAssigned && isOwner && (
                <TabsTrigger value="logs" className="gap-2" disabled>
                  <FileText className="h-4 w-4" />
                  Job Updates
                </TabsTrigger>
              )}
            </TabsList>

            {/* Applications Tab (Owner Only) */}
            {isOwner && (
              <TabsContent value="applications" className="space-y-3 mt-4">
                {applications.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-10 w-10 text-muted-foreground" />}
                    title="No applications yet"
                    description="When sitters apply, they'll appear here."
                  />
                ) : (
                  applications.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      id={app.id}
                      applicantName={app.profiles?.display_name || "Applicant"}
                      applicantFirstName={app.profiles?.first_name}
                      applicantLastName={app.profiles?.last_name}
                      applicantCity={app.profiles?.city}
                      applicantPostalCode={app.profiles?.postal_code}
                      applicantAvatarUrl={app.profiles?.avatar_url}
                      availabilityText={app.availability_text}
                      message={app.message}
                      rateOffered={app.rate_offered}
                      status={app.status}
                      createdAt={app.created_at}
                      isOwner={true}
                      canApprove={!hasApproved}
                      onApprove={() => handleApprove(app.id, app.applicant_id)}
                      onDecline={() => handleDecline(app.id)}
                      onChat={() => handleChat(app.applicant_id)}
                    />
                  ))
                )}
              </TabsContent>
            )}

            {/* Sitter Logs Tab */}
            <TabsContent value="logs" className="space-y-3 mt-4">
              {isAssignedSitter && !showLogForm && (
                <Button className="w-full" onClick={() => setShowLogForm(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Update
                </Button>
              )}

              {showLogForm && (
                <SitterLogForm
                  requestId={requestId!}
                  dogId={request.dog_id}
                  ownerId={request.owner_id}
                  onSuccess={() => {
                    setShowLogForm(false);
                    fetchData();
                  }}
                  onCancel={() => setShowLogForm(false)}
                />
              )}

              {sitterLogs.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-10 w-10 text-muted-foreground" />}
                  title="No updates yet"
                  description={isAssignedSitter ? "Post updates so the owner can see how things are going!" : "The sitter will post updates here."}
                />
              ) : (
                sitterLogs.map((log) => (
                  <SitterLogCard
                    key={log.id}
                    logType={log.log_type}
                    noteText={log.note_text}
                    mediaUrls={log.media_urls || []}
                    createdAt={log.created_at}
                    sitterName={log.profiles?.display_name || undefined}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Apply Section (Non-Owner) */}
        {!isOwner && !isAssigned && (
          <>
            {myApplication ? (
              <ApplicationCard
                id={myApplication.id}
                applicantName="Your Application"
                availabilityText={myApplication.availability_text}
                message={myApplication.message}
                rateOffered={myApplication.rate_offered}
                status={myApplication.status}
                createdAt={myApplication.created_at}
                isOwner={false}
                canApprove={false}
                onWithdraw={myApplication.status === "pending" ? handleWithdraw : undefined}
              />
            ) : showApplyForm ? (
              <ApplicationForm
                requestId={requestId!}
                onSuccess={() => {
                  setShowApplyForm(false);
                  fetchData();
                }}
                onCancel={() => setShowApplyForm(false)}
              />
            ) : (
              <Button className="w-full" size="lg" onClick={() => setShowApplyForm(true)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Apply for this Job
              </Button>
            )}
          </>
        )}

        {/* Message when request is filled and user is not involved */}
        {!isOwner && !isAssignedSitter && isAssigned && (
          <Card className="bg-muted/50">
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground">This care request has been assigned to another sitter.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
