import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Eye, Check, X, Pause } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";

interface SellerRow {
  id: string;
  user_id: string;
  store_name: string;
  seller_status: string;
  legal_first_name: string | null;
  legal_last_name: string | null;
  phone_e164: string | null;
  address_city: string | null;
  address_country: string | null;
  business_type: string | null;
  submitted_at: string | null;
  rejection_reason: string | null;
}

interface DocSigned {
  kind: string;
  url: string;
}

export default function AdminSellersPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const [tab, setTab] = useState("pending");
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SellerRow | null>(null);
  const [docs, setDocs] = useState<DocSigned[]>([]);
  const [reason, setReason] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Admin access required");
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  const load = async () => {
    setLoading(true);
    const statusFilter =
      tab === "pending" ? ["pending_verification"]
      : tab === "approved" ? ["approved"]
      : tab === "rejected" ? ["rejected"]
      : tab === "suspended" ? ["suspended"]
      : ["draft", "pending_verification", "approved", "rejected", "suspended"];

    const { data, error } = await supabase
      .from("seller_profiles")
      .select("*")
      .in("seller_status", statusFilter as any)
      .order("submitted_at", { ascending: false, nullsFirst: false });
    if (error) toast.error(error.message);
    setSellers((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, tab]);

  const openSeller = async (s: SellerRow) => {
    setSelected(s);
    setReason("");
    const { data: docRows } = await supabase
      .from("seller_verification_documents")
      .select("kind, storage_path")
      .eq("seller_profile_id", s.id);
    const signed: DocSigned[] = [];
    for (const d of docRows || []) {
      const { data: sig } = await supabase.storage.from("seller-documents").createSignedUrl(d.storage_path, 600);
      if (sig?.signedUrl) signed.push({ kind: d.kind, url: sig.signedUrl });
    }
    setDocs(signed);
  };

  const act = async (newStatus: "approved" | "rejected" | "suspended") => {
    if (!selected) return;
    if ((newStatus === "rejected" || newStatus === "suspended") && !reason.trim()) {
      toast.error("Please enter a reason");
      return;
    }
    setActing(true);
    try {
      const { error } = await supabase.rpc("admin_update_seller_status", {
        p_seller_profile_id: selected.id,
        p_new_status: newStatus,
        p_reason: reason.trim() || null,
      });
      if (error) throw error;
      toast.success(`Seller ${newStatus}`);
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setActing(false);
    }
  };

  if (roleLoading || !isAdmin) {
    return <MobileLayout><div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div></MobileLayout>;
  }

  return (
    <MobileLayout>
      <PageHeader title="Seller Reviews" subtitle="Admin dashboard" showBack />
      <div className="p-4 space-y-3 pb-24">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="space-y-3 mt-3">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : sellers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground text-sm">No sellers in this state.</Card>
            ) : sellers.map((s) => (
              <Card key={s.id} className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{s.store_name || "(no name)"}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {s.legal_first_name} {s.legal_last_name} · {s.address_city}, {s.address_country} · {s.business_type}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.phone_e164}</div>
                </div>
                <Badge variant={s.seller_status === "approved" ? "default" : s.seller_status === "rejected" ? "destructive" : "secondary"}>{s.seller_status}</Badge>
                <Button size="sm" variant="outline" onClick={() => openSeller(s)}><Eye className="h-4 w-4" /></Button>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Review seller</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div><b>Store:</b> {selected.store_name}</div>
              <div><b>Legal name:</b> {selected.legal_first_name} {selected.legal_last_name}</div>
              <div><b>Phone:</b> {selected.phone_e164}</div>
              <div><b>Address:</b> {selected.address_city}, {selected.address_country}</div>
              <div><b>Type:</b> {selected.business_type}</div>
              <div><b>Status:</b> <Badge>{selected.seller_status}</Badge></div>

              <div>
                <b>Documents:</b>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {docs.length === 0 && <div className="col-span-3 text-muted-foreground text-xs">No docs</div>}
                  {docs.map((d) => (
                    <a key={d.kind} href={d.url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={d.url} alt={d.kind} className="w-full aspect-square object-cover rounded border" />
                      <div className="text-[10px] text-center mt-1">{d.kind}</div>
                    </a>
                  ))}
                </div>
              </div>

              <Textarea placeholder="Reason (required for reject/suspend)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />

              <div className="flex gap-2">
                <Button onClick={() => act("approved")} disabled={acting} className="flex-1"><Check className="h-4 w-4 mr-1" /> Approve</Button>
                <Button onClick={() => act("rejected")} disabled={acting} variant="destructive" className="flex-1"><X className="h-4 w-4 mr-1" /> Reject</Button>
                <Button onClick={() => act("suspended")} disabled={acting} variant="outline"><Pause className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
