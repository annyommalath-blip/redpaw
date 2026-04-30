import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, ExternalLink, MessageCircle, Loader2, Trash2, ShoppingBag, ShoppingCart, Store } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConversation } from "@/hooks/useConversation";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import PostPhotoCarousel from "@/components/feed/PostPhotoCarousel";

interface Product {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  photo_urls: string[];
  category: string | null;
  stock: number;
  contact_phone: string | null;
  contact_url: string | null;
}

interface Seller {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openConversation } = useConversation();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: prod } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (prod) {
        setProduct(prod as Product);
        const sellerId = (prod as Product).seller_id;
        const [{ data: profile }, { data: store }] = await Promise.all([
          supabase.from("profiles").select("user_id,display_name,username,avatar_url").eq("user_id", sellerId).maybeSingle(),
          supabase.from("seller_profiles").select("store_name").eq("user_id", sellerId).maybeSingle(),
        ]);
        if (profile) setSeller(profile as Seller);
        if (store) setStoreName((store as any).store_name);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product || !user) return;
    setAdding(true);
    const { error } = await addToCart(product.id, 1);
    setAdding(false);
    if (error) toast.error(error.message);
    else toast.success("Added to cart");
  };

  const handleDelete = async () => {
    if (!product || !confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    navigate("/shop");
  };

  const handleMessage = async () => {
    if (!product || !user) return;
    if (user.id === product.seller_id) return;
    await openConversation(product.seller_id, "product", product.id);
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Product" showBack />
        <div className="p-4 space-y-3">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </MobileLayout>
    );
  }

  if (!product) {
    return (
      <MobileLayout>
        <PageHeader title="Product" showBack />
        <div className="p-8 text-center text-muted-foreground">Product not found.</div>
      </MobileLayout>
    );
  }

  const isOwn = user?.id === product.seller_id;

  return (
    <MobileLayout>
      <PageHeader title={product.title} showBack />
      <div className="pb-24">
        {product.photo_urls?.length > 0 && (
          <PostPhotoCarousel photos={product.photo_urls} />
        )}

        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{product.title}</h1>
              {product.category && (
                <span className="text-xs text-muted-foreground capitalize">{product.category}</span>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">
                {product.currency} {Number(product.price).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {product.stock > 0 ? `${product.stock} in stock` : "Sold out"}
              </p>
            </div>
          </div>

          {product.description && (
            <GlassCard variant="light" className="p-4">
              <p className="text-sm whitespace-pre-line">{product.description}</p>
            </GlassCard>
          )}

          {seller && (
            <GlassCard variant="light" className="p-3 flex items-center gap-3">
              <button
                onClick={() => navigate(`/store/${seller.user_id}`)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {seller.avatar_url ? (
                    <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Store</p>
                  <p className="text-sm font-medium truncate">
                    {storeName || (seller.username ? `@${seller.username}` : seller.display_name || "User")}
                  </p>
                </div>
              </button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/store/${seller.user_id}`)}>
                Visit
              </Button>
            </GlassCard>
          )}

          <div className="grid grid-cols-1 gap-2">
            {!isOwn && product.stock > 0 && (
              <Button onClick={handleAddToCart} disabled={adding} size="lg" className="w-full">
                {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                Add to cart
              </Button>
            )}
            {!isOwn && (
              <Button onClick={handleMessage} variant="outline" size="lg" className="w-full">
                <MessageCircle className="h-4 w-4 mr-2" />
                Message seller
              </Button>
            )}
            {product.contact_phone && (
              <Button asChild variant="outline" size="lg">
                <a href={`tel:${product.contact_phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  {product.contact_phone}
                </a>
              </Button>
            )}
            {product.contact_url && (
              <Button asChild variant="outline" size="lg">
                <a href={product.contact_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit link
                </a>
              </Button>
            )}
            {isOwn && (
              <Button onClick={handleDelete} variant="destructive" size="lg">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete listing
              </Button>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
