import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Heart, MessageCircle, Share2, AlertTriangle, HandHeart, ChevronRight, Camera, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnimatedList, AnimatedItem } from "@/components/ui/animated-list";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useViewerLocation } from "@/hooks/useViewerLocation";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface LostAlert {
  id: string;
  title: string;
  description: string;
  photo_url: string;
  created_at: string;
  dogs: { name: string; breed: string | null } | null;
}

interface CareRequest {
  id: string;
  care_type: string;
  time_window: string;
  location_text: string;
  created_at: string;
  dogs: { name: string; breed: string | null; photo_url: string | null } | null;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

export default function HomePage() {
  const { t } = useTranslation();
  const [lostAlerts, setLostAlerts] = useState<LostAlert[]>([]);
  const [careRequests, setCareRequests] = useState<CareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("for-you");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount: notificationCount } = useNotifications();
  const { latitude, longitude } = useViewerLocation();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch recent lost alerts
      const { data: alertsData } = await supabase
        .from("lost_alerts")
        .select("id, title, description, photo_url, created_at, dogs (name, breed)")
        .eq("status", "active")
        .neq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch recent care requests (not owned by user)
      const { data: careData } = await supabase
        .from("care_requests")
        .select("id, care_type, time_window, location_text, created_at, dogs (name, breed, photo_url)")
        .eq("status", "open")
        .neq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setLostAlerts((alertsData as LostAlert[]) || []);
      setCareRequests((careData as CareRequest[]) || []);
    } catch (error) {
      console.error("Error fetching feed data:", error);
    } finally {
      setLoading(false);
    }
  };

  const careTypeEmoji: Record<string, string> = {
    walk: "🚶",
    watch: "👀",
    overnight: "🌙",
    "check-in": "👋",
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title={t("home.title")} subtitle={t("home.subtitle")} />
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader
        title={t("home.title")}
        subtitle={t("home.subtitle")}
        action={
          <Button size="icon" variant="ghost" onClick={() => navigate("/notifications")} className="relative rounded-xl">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs border-2 border-card"
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Button>
        }
      />

      <div className="p-4 space-y-6">
        {/* Feed Tabs */}
        <AnimatedItem>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full glass-card-light rounded-xl p-1">
              <TabsTrigger value="for-you" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Sparkles className="h-4 w-4 mr-2" />
                {t("home.forYou")}
              </TabsTrigger>
              <TabsTrigger value="following" className="flex-1 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Heart className="h-4 w-4 mr-2" />
                {t("home.following")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="for-you" className="mt-4 space-y-6">
              {/* Lost Dogs Nearby Section */}
              {lostAlerts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="section-header flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-lost" />
                      {t("home.lostDogsNearby")}
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate("/community")}
                      className="text-primary rounded-xl"
                    >
                      {t("home.seeAll")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <AnimatedList className="space-y-4">
                    {lostAlerts.slice(0, 2).map((alert) => (
                      <FeedCard
                        key={alert.id}
                        type="lost"
                        title={alert.dogs?.name || "Lost Dog"}
                        subtitle={alert.title}
                        description={alert.description}
                        imageUrl={alert.photo_url}
                        timestamp={alert.created_at}
                        onClick={() => navigate(`/lost-alert/${alert.id}`)}
                      />
                    ))}
                  </AnimatedList>
                </section>
              )}

              {/* Care Requests Section */}
              {careRequests.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="section-header flex items-center gap-2">
                      <HandHeart className="h-4 w-4 text-success" />
                      {t("home.careRequestsNearby")}
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => navigate("/community")}
                      className="text-primary rounded-xl"
                    >
                      {t("home.seeAll")}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  <AnimatedList className="space-y-4">
                    {careRequests.slice(0, 3).map((request) => (
                      <GlassCard
                        key={request.id}
                        variant="light"
                        hover
                        className="overflow-hidden"
                        onClick={() => navigate(`/care-request/${request.id}`)}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                              <span className="text-xl">{careTypeEmoji[request.care_type] || "🐕"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">
                                  {t(`care.${request.care_type === "check-in" ? "checkIn" : request.care_type}`)}
                                </h3>
                                <Badge variant="secondary" className="text-xs">
                                  {t("common.open")}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {request.dogs?.name} • {request.time_window}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                📍 {request.location_text}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                            </span>
                            <Button size="sm" className="rounded-xl h-8">
                              {t("common.apply")}
                            </Button>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </AnimatedList>
                </section>
              )}

              {/* Empty State */}
              {lostAlerts.length === 0 && careRequests.length === 0 && (
                <AnimatedItem delay={0.1}>
                  <GlassCard variant="light" className="p-8 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground mb-1">
                          {t("home.noPostsYet")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("home.beFirstToShare")}
                        </p>
                      </div>
                      <Button className="rounded-xl" onClick={() => navigate("/community")}>
                        {t("nav.community")}
                      </Button>
                    </div>
                  </GlassCard>
                </AnimatedItem>
              )}
            </TabsContent>

            <TabsContent value="following" className="mt-4">
              <AnimatedItem>
                <GlassCard variant="light" className="p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                      <Heart className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">
                        Coming Soon
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Follow other pet parents to see their updates here!
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </AnimatedItem>
            </TabsContent>
          </Tabs>
        </AnimatedItem>
      </div>
    </MobileLayout>
  );
}

// Feed Card Component
interface FeedCardProps {
  type: "lost" | "found" | "post";
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string | null;
  timestamp: string;
  author?: { name: string; avatar?: string };
  onClick?: () => void;
}

function FeedCard({ type, title, subtitle, description, imageUrl, timestamp, author, onClick }: FeedCardProps) {
  const { t } = useTranslation();
  
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <GlassCard variant="light" hover className="overflow-hidden">
        {/* Header Badge */}
        <div className={cn(
          "px-4 py-2",
          type === "lost" ? "bg-gradient-to-r from-lost to-lost/80" : "bg-gradient-to-r from-success to-success/80"
        )}>
          <span className="text-xs font-bold text-white uppercase tracking-wide">
            {type === "lost" ? `🚨 ${t("community.lostDog")}` : `✅ ${t("community.foundDog")}`}
          </span>
        </div>

        {/* Image */}
        {imageUrl && (
          <div className="aspect-[4/3] bg-muted overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-lg text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
          {description && (
            <p className="text-sm text-foreground mt-2 line-clamp-2">{description}</p>
          )}

          {/* Actions Row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Heart className="h-5 w-5" />
              </button>
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-5 w-5" />
              </button>
              <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
            </span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
