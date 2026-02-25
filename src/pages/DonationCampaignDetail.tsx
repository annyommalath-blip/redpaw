import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, MapPin, Phone, Loader2, Trash2, Image } from "lucide-react";
import { CommunityComments } from "@/components/community/CommunityComments";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DonateDialog } from "@/components/community/DonateDialog";
import { GuestAuthPrompt } from "@/components/auth/GuestAuthPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

export default function DonationCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [campaign, setCampaign] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonate, setShowDonate] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: camp }, { data: donos }] = await Promise.all([
      supabase.from("donation_campaigns").select("*").eq("id", id).single(),
      supabase.from("donation_records").select("*").eq("campaign_id", id).eq("is_deleted", false).order("created_at", { ascending: false }),
    ]);
    setCampaign(camp);
    setDonations(donos || []);
    setLoading(false);
  };

  const handleDonate = () => {
    if (isGuest || !user) { setShowAuthPrompt(true); return; }
    setShowDonate(true);
  };

  const handleSoftDelete = async (donationId: string) => {
    const { error } = await supabase.from("donation_records").update({ is_deleted: true }).eq("id", donationId);
    if (!error) { toast({ title: "Donation entry removed" }); fetchData(); }
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Campaign" showBack onBack={() => navigate(-1)} />
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </MobileLayout>
    );
  }

  if (!campaign) {
    return (
      <MobileLayout>
        <PageHeader title="Campaign" showBack onBack={() => navigate(-1)} />
        <div className="p-4 text-center text-muted-foreground">Campaign not found.</div>
      </MobileLayout>
    );
  }

  const percentage = Math.min(Math.round((campaign.raised_amount / campaign.goal_amount) * 100), 100);
  const isOwner = user?.id === campaign.owner_id;

  return (
    <MobileLayout>
      <PageHeader title={campaign.title} showBack onBack={() => navigate(-1)} />

      <div className="p-4 space-y-4">
        {/* Photo */}
        {campaign.photo_urls?.length > 0 && (
          <div className="rounded-2xl overflow-hidden">
            <img src={campaign.photo_urls[0]} alt={campaign.title} className="w-full h-56 object-cover" />
          </div>
        )}

        {/* Info Card */}
        <GlassCard variant="light" className="p-4 space-y-3">
          <Badge variant="outline" className="capitalize">{campaign.category.replace("-", " ")}</Badge>
          <h2 className="text-xl font-bold">{campaign.title}</h2>
          <p className="text-sm text-muted-foreground">{campaign.caption}</p>

          {/* Progress */}
          <div className="space-y-1.5">
            <Progress value={percentage} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="font-bold text-primary">${campaign.raised_amount.toLocaleString()}</span>
              <span className="text-muted-foreground">of ${campaign.goal_amount.toLocaleString()} ({percentage}%)</span>
            </div>
          </div>

          {campaign.about && (
            <div>
              <h4 className="font-semibold mb-1">About</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaign.about}</p>
            </div>
          )}

          {campaign.location_label && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {campaign.location_label}
            </div>
          )}

          {campaign.contact_phone && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" /> {campaign.contact_phone}
            </div>
          )}

          <Button className="w-full rounded-xl" onClick={handleDonate}>
            <Heart className="h-4 w-4 mr-2" /> Donate Now
          </Button>
        </GlassCard>

        {/* Donations */}
        <GlassCard variant="light" className="p-4">
          <h3 className="font-semibold mb-3">Donations ({donations.length})</h3>
          {donations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No donations yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {donations.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                  {d.receipt_url && (
                    <a href={d.receipt_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted">
                        <Image className="h-full w-full p-2 text-muted-foreground" />
                      </div>
                    </a>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm">${d.amount.toLocaleString()}</span>
                    {d.note && <p className="text-xs text-muted-foreground truncate">{d.note}</p>}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {isOwner && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleSoftDelete(d.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Comments */}
        <CommunityComments contextType="donation" contextId={campaign.id} />
      </div>

      <DonateDialog
        open={showDonate}
        onOpenChange={setShowDonate}
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        onDonated={fetchData}
      />
      <GuestAuthPrompt open={showAuthPrompt} onOpenChange={setShowAuthPrompt} />
    </MobileLayout>
  );
}
