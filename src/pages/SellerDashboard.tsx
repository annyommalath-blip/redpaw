import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Package, ShoppingBag, Edit, Loader2, Store, ArrowRight } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  photo_urls: string[];
  stock: number;
  status: string;
}

interface Order {
  id: string;
  buyer_id: string;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  items?: { product_title: string; quantity: number }[];
}

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sellerProfile, loading: spLoading } = useSellerProfile();

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (spLoading) return;
    if (!sellerProfile || sellerProfile.seller_status !== "approved") { navigate("/seller/start"); return; }
    if (!user) return;
    (async () => {
      setLoading(true);
      const [pRes, oRes] = await Promise.all([
        supabase.from("products").select("id,title,price,currency,photo_urls,stock,status").eq("seller_id", user.id).order("created_at", { ascending: false }),
        supabase.from("orders").select("id,buyer_id,total_price,currency,status,created_at").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setProducts((pRes.data as Product[]) || []);
      const ordersData = (oRes.data as Order[]) || [];
      if (ordersData.length) {
        const { data: items } = await supabase.from("order_items").select("order_id, product_title, quantity").in("order_id", ordersData.map((o) => o.id));
        const byOrder = new Map<string, any[]>();
        (items || []).forEach((it: any) => {
          const arr = byOrder.get(it.order_id) || [];
          arr.push(it);
          byOrder.set(it.order_id, arr);
        });
        ordersData.forEach((o) => { o.items = byOrder.get(o.id) || []; });
      }
      setOrders(ordersData);
      setLoading(false);
    })();
  }, [sellerProfile, spLoading, user, navigate]);

  const updateProductStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("products").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setProducts((ps) => ps.map((p) => p.id === id ? { ...p, status } : p));
    toast.success("Updated");
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setOrders((os) => os.map((o) => o.id === id ? { ...o, status } : o));
    toast.success("Order updated");
  };

  if (spLoading) {
    return (
      <MobileLayout>
        <PageHeader title="Seller dashboard" showBack />
        <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="Seller dashboard" subtitle={sellerProfile?.store_name || ""} showBack />
      <div className="p-4 space-y-4 pb-24">
        {/* Store header */}
        <GlassCard variant="light" className="p-4 flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
            {sellerProfile?.store_logo_url ? (
              <img src={sellerProfile.store_logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{sellerProfile?.store_name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{sellerProfile?.store_description || "No description"}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/seller/start")}>
            <Edit className="h-4 w-4" />
          </Button>
        </GlassCard>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => navigate("/shop/new")} className="rounded-xl" size="lg">
            <Plus className="h-4 w-4 mr-1" /> New product
          </Button>
          <Button onClick={() => navigate(`/store/${user?.id}`)} variant="outline" className="rounded-xl" size="lg">
            View storefront <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <Tabs defaultValue="products">
          <TabsList className="w-full">
            <TabsTrigger value="products" className="flex-1">
              <Package className="h-4 w-4 mr-1" /> Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">
              <ShoppingBag className="h-4 w-4 mr-1" /> Orders ({orders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-3 space-y-2">
            {loading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
            ) : products.length === 0 ? (
              <EmptyState
                icon={<Package className="h-8 w-8" />}
                title="No products yet"
                description="List your first product to start selling."
                action={{ label: "List a product", onClick: () => navigate("/shop/new") }}
              />
            ) : (
              products.map((p) => (
                <GlassCard key={p.id} variant="light" className="p-3 flex items-center gap-3">
                  <button onClick={() => navigate(`/product/${p.id}`)} className="h-14 w-14 rounded-xl bg-muted overflow-hidden shrink-0">
                    {p.photo_urls?.[0] && <img src={p.photo_urls[0]} alt="" className="w-full h-full object-cover" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    <p className="text-xs text-primary">{p.currency} {Number(p.price).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">Stock: {p.stock}</p>
                  </div>
                  <Select value={p.status} onValueChange={(v) => updateProductStatus(p.id, v)}>
                    <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                      <SelectItem value="sold_out">Sold out</SelectItem>
                    </SelectContent>
                  </Select>
                </GlassCard>
              ))
            )}
          </TabsContent>

          <TabsContent value="orders" className="mt-3 space-y-2">
            {loading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
            ) : orders.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-8 w-8" />}
                title="No orders yet"
                description="Orders will appear here when buyers check out."
              />
            ) : (
              orders.map((o) => (
                <GlassCard key={o.id} variant="light" className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{o.currency} {Number(o.total_price).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}</p>
                    </div>
                    <Badge variant={o.status === "completed" ? "default" : "secondary"} className="capitalize">{o.status}</Badge>
                  </div>
                  {o.items && o.items.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {o.items.map((it, i) => (
                        <li key={i}>• {it.quantity}× {it.product_title}</li>
                      ))}
                    </ul>
                  )}
                  <Select value={o.status} onValueChange={(v) => updateOrderStatus(o.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </GlassCard>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
