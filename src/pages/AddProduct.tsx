import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X, Loader2, Store } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { toast } from "sonner";
import { processImageFile } from "@/lib/imageUtils";

const CATEGORIES = ["food", "toys", "accessories", "apparel", "health", "other"];
const CURRENCIES = ["USD", "EUR", "GBP", "THB", "LAK", "CNY", "JPY", "AUD", "CAD"];
const MAX_PHOTOS = 5;

export default function AddProductPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sellerProfile, loading: spLoading } = useSellerProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("other");
  const [stock, setStock] = useState("1");
  const [contactPhone, setContactPhone] = useState("");
  const [contactUrl, setContactUrl] = useState("");
  const [photos, setPhotos] = useState<{ blob: Blob; preview: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    const slice = files.slice(0, remaining);
    try {
      const processed = await Promise.all(
        slice.map(async (f) => {
          const blob = await processImageFile(f, {});
          return { blob, preview: URL.createObjectURL(blob) };
        })
      );
      setPhotos((p) => [...p, ...processed]);
    } catch (err) {
      console.error(err);
      toast.error("Could not process images");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!user) return;
    if (!title.trim() || !price || photos.length === 0) {
      toast.error("Please add a title, price and at least one photo");
      return;
    }
    setSubmitting(true);
    try {
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const path = `${user.id}/${Date.now()}_${i}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("product-photos")
          .upload(path, photos[i].blob, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("product-photos").getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
      }

      const { data: created, error } = await supabase
        .from("products")
        .insert({
          seller_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          price: Number(price),
          currency,
          category,
          stock: Number(stock) || 0,
          contact_phone: contactPhone.trim() || null,
          contact_url: contactUrl.trim() || null,
          photo_urls: photoUrls,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Product listed!");
      navigate(`/product/${created.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  if (spLoading) {
    return (
      <MobileLayout>
        <PageHeader title="List a product" showBack />
        <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </MobileLayout>
    );
  }

  if (!sellerProfile || !sellerProfile.is_active) {
    return (
      <MobileLayout>
        <PageHeader title="List a product" showBack />
        <div className="p-4">
          <EmptyState
            icon={<Store className="h-8 w-8" />}
            title="Open your store first"
            description="You need to set up a seller profile before you can list products."
            action={{ label: "Open my store", onClick: () => navigate("/seller/start") }}
          />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="List a product" subtitle="Sell to the community" showBack />
      <div className="p-4 space-y-4 pb-24">
        {/* Photos */}
        <div>
          <Label>Photos ({photos.length}/{MAX_PHOTOS})</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary"
              >
                <Camera className="h-6 w-6" />
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotos}
            className="hidden"
          />
        </div>

        <div>
          <Label>Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Handmade dog collar" />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Tell buyers about your product..." />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Label>Price *</Label>
            <Input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stock</Label>
            <Input type="number" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Contact phone (optional)</Label>
          <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+1 555 0100" />
        </div>

        <div>
          <Label>External link (optional)</Label>
          <Input value={contactUrl} onChange={(e) => setContactUrl(e.target.value)} placeholder="https://..." />
        </div>

        <Button onClick={submit} disabled={submitting} className="w-full" size="lg">
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          List product
        </Button>
      </div>
    </MobileLayout>
  );
}
