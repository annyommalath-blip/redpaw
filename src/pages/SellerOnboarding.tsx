import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Loader2, Store } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { processImageFile } from "@/lib/imageUtils";
import { toast } from "sonner";

export default function SellerOnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sellerProfile, loading, refresh } = useSellerProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sellerProfile) {
      setStoreName(sellerProfile.store_name);
      setStoreDescription(sellerProfile.store_description || "");
      setContactInfo(sellerProfile.contact_info || "");
      setLogoPreview(sellerProfile.store_logo_url);
    }
  }, [sellerProfile]);

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const blob = await processImageFile(f, {});
      setLogoBlob(blob);
      setLogoPreview(URL.createObjectURL(blob));
    } catch {
      toast.error("Could not process image");
    }
  };

  const submit = async () => {
    if (!user) return;
    if (!storeName.trim()) { toast.error("Please enter a store name"); return; }
    setSubmitting(true);
    try {
      let logoUrl = sellerProfile?.store_logo_url || null;
      if (logoBlob) {
        const path = `${user.id}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("store-logos")
          .upload(path, logoBlob, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw upErr;
        logoUrl = supabase.storage.from("store-logos").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        user_id: user.id,
        store_name: storeName.trim(),
        store_description: storeDescription.trim() || null,
        store_logo_url: logoUrl,
        contact_info: contactInfo.trim() || null,
        is_active: true,
        status: "approved",
      };

      const { error } = sellerProfile
        ? await supabase.from("seller_profiles").update(payload).eq("user_id", user.id)
        : await supabase.from("seller_profiles").insert(payload);
      if (error) throw error;
      await refresh();
      toast.success(sellerProfile ? "Store updated" : "Your store is live!");
      navigate("/seller");
    } catch (err: any) {
      toast.error(err.message || "Failed to save store");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Open your store" showBack />
        <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader
        title={sellerProfile ? "Edit your store" : "Open your store"}
        subtitle={sellerProfile ? "Update your store details" : "Start selling to the community"}
        showBack
      />
      <div className="p-4 space-y-5 pb-24">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative h-24 w-24 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-dashed border-border hover:border-primary"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5">
              <Camera className="h-3 w-3" />
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
          <p className="text-xs text-muted-foreground">Store logo</p>
        </div>

        <div>
          <Label>Store name *</Label>
          <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Paws & Treats Co." maxLength={60} />
        </div>

        <div>
          <Label>Store description</Label>
          <Textarea value={storeDescription} onChange={(e) => setStoreDescription(e.target.value)} rows={3} maxLength={500} placeholder="Tell buyers about your store..." />
        </div>

        <div>
          <Label>Contact info</Label>
          <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Phone, email, or social link" maxLength={200} />
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {sellerProfile ? "Save changes" : "Open my store"}
        </Button>
      </div>
    </MobileLayout>
  );
}
