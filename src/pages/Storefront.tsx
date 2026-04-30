import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Store, MessageCircle, Loader2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConversation } from "@/hooks/useConversation";
import { ProductCard, ProductRow } from "@/components/shop/ProductCard";

export default function StorefrontPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openConversation } = useConversation();

  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const [sRes, pRes] = await Promise.all([
        supabase.from("seller_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("products").select("id,title,price,currency,photo_urls,category,stock").eq("seller_id", userId).eq("status", "active").order("created_at", { ascending: false }),
      ]);
      setSeller(sRes.data);
      setProducts((pRes.data as ProductRow[]) || []);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Store" showBack />
        <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </MobileLayout>
    );
  }

  if (!seller) {
    return (
      <MobileLayout>
        <PageHeader title="Store" showBack />
        <div className="p-8 text-center text-muted-foreground">This user hasn't opened a store yet.</div>
      </MobileLayout>
    );
  }

  const isOwn = user?.id === userId;

  return (
    <MobileLayout>
      <PageHeader title={seller.store_name} showBack />
      <div className="p-4 space-y-4 pb-24">
        <GlassCard variant="light" className="p-4 flex flex-col items-center text-center gap-2">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {seller.store_logo_url ? (
              <img src={seller.store_logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store className="h-8 w-8 text-primary" />
            )}
          </div>
          <h2 className="text-lg font-semibold">{seller.store_name}</h2>
          {seller.store_description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">{seller.store_description}</p>
          )}
          {seller.contact_info && (
            <p className="text-xs text-muted-foreground">{seller.contact_info}</p>
          )}
          {!isOwn && user && (
            <Button size="sm" onClick={() => openConversation(userId!, "store", userId)}>
              <MessageCircle className="h-4 w-4 mr-1" /> Message store
            </Button>
          )}
          {isOwn && (
            <Button size="sm" variant="outline" onClick={() => navigate("/seller")}>Manage store</Button>
          )}
        </GlassCard>

        <h3 className="font-semibold text-sm">Products ({products.length})</h3>
        {products.length === 0 ? (
          <EmptyState icon={<Store className="h-8 w-8" />} title="No products listed" description="Check back later." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
