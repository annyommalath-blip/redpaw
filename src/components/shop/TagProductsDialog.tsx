import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShoppingBag, X, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  photo_urls: string[];
}

interface ExistingTag {
  id: string;
  product_id: string;
  photo_index: number;
  x_pct: number;
  y_pct: number;
}

interface TagProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  photos: string[];
  onTagsChanged?: () => void;
}

export function TagProductsDialog({ open, onOpenChange, postId, photos, onTagsChanged }: TagProductsDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const imgRef = useRef<HTMLDivElement>(null);

  const [activePhoto, setActivePhoto] = useState(0);
  const [search, setSearch] = useState("");
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [tags, setTags] = useState<ExistingTag[]>([]);
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [pickingProductId, setPickingProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      const [pRes, tRes] = await Promise.all([
        supabase.from("products").select("id,title,price,currency,photo_urls").eq("seller_id", user.id).eq("status", "active"),
        supabase.from("post_product_tags").select("id,product_id,photo_index,x_pct,y_pct").eq("post_id", postId),
      ]);
      const products = (pRes.data as Product[]) || [];
      setMyProducts(products);
      const map: Record<string, Product> = {};
      products.forEach((p) => { map[p.id] = p; });
      // Also load tagged products that aren't mine for display
      const taggedIds = (tRes.data || []).map((t: any) => t.product_id).filter((id: string) => !map[id]);
      if (taggedIds.length) {
        const { data: extras } = await supabase.from("products").select("id,title,price,currency,photo_urls").in("id", taggedIds);
        (extras || []).forEach((p: any) => { map[p.id] = p as Product; });
      }
      setProductMap(map);
      setTags((tRes.data as ExistingTag[]) || []);
      setLoading(false);
    })();
  }, [open, user, postId]);

  const photo = photos[activePhoto];
  const photoTags = tags.filter((t) => t.photo_index === activePhoto);

  const handlePhotoClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickingProductId || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const { data, error } = await supabase
      .from("post_product_tags")
      .insert({
        post_id: postId,
        product_id: pickingProductId,
        tagged_by: user!.id,
        photo_index: activePhoto,
        x_pct: Math.max(0, Math.min(100, x)),
        y_pct: Math.max(0, Math.min(100, y)),
      })
      .select("id,product_id,photo_index,x_pct,y_pct")
      .single();
    if (error) { toast.error(error.message); return; }
    setTags((t) => [...t, data as ExistingTag]);
    setPickingProductId(null);
    onTagsChanged?.();
  };

  const removeTag = async (tagId: string) => {
    const { error } = await supabase.from("post_product_tags").delete().eq("id", tagId);
    if (error) { toast.error(error.message); return; }
    setTags((t) => t.filter((x) => x.id !== tagId));
    onTagsChanged?.();
  };

  const filtered = myProducts.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tag products</DialogTitle>
        </DialogHeader>

        {/* Photo selector */}
        {photos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`shrink-0 h-12 w-12 rounded-lg overflow-hidden border-2 ${
                  i === activePhoto ? "border-primary" : "border-transparent"
                }`}
              >
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Photo with tags */}
        {photo && (
          <div
            ref={imgRef}
            onClick={handlePhotoClick}
            className={`relative w-full bg-muted rounded-xl overflow-hidden ${
              pickingProductId ? "cursor-crosshair ring-2 ring-primary" : ""
            }`}
            style={{ aspectRatio: "4/5" }}
          >
            <img src={photo} alt="" className="w-full h-full object-cover" />
            {photoTags.map((tag) => {
              const prod = productMap[tag.product_id];
              return (
                <div
                  key={tag.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${tag.x_pct}%`, top: `${tag.y_pct}%` }}
                >
                  <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-full pl-2 pr-1 py-1 shadow-md text-xs">
                    <ShoppingBag className="h-3 w-3 text-primary" />
                    <span className="max-w-[100px] truncate">{prod?.title || "Product"}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                      className="ml-0.5 bg-black/10 rounded-full p-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {pickingProductId && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                  Tap photo to place tag
                </div>
              </div>
            )}
          </div>
        )}

        {/* Product picker */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your products..."
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : myProducts.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-sm text-muted-foreground">You haven't listed any products yet.</p>
              <Button size="sm" onClick={() => { onOpenChange(false); navigate("/shop/new"); }}>
                <Plus className="h-4 w-4 mr-1" /> List a product
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPickingProductId(p.id === pickingProductId ? null : p.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${
                    pickingProductId === p.id ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0">
                    {p.photo_urls?.[0] && (
                      <img src={p.photo_urls[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-primary">{p.currency} {Number(p.price).toFixed(2)}</p>
                  </div>
                  {pickingProductId === p.id && (
                    <span className="text-xs text-primary font-medium">Tap photo →</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full">Done</Button>
      </DialogContent>
    </Dialog>
  );
}
