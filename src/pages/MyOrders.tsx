import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Loader2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface Order {
  id: string;
  seller_id: string;
  total_price: number;
  currency: string;
  status: string;
  created_at: string;
  items?: { product_title: string; quantity: number; product_image: string | null }[];
}

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("id,seller_id,total_price,currency,status,created_at")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      const ordersData = (data as Order[]) || [];
      if (ordersData.length) {
        const { data: items } = await supabase
          .from("order_items")
          .select("order_id,product_title,quantity,product_image")
          .in("order_id", ordersData.map((o) => o.id));
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
  }, [user]);

  return (
    <MobileLayout>
      <PageHeader title="My orders" showBack />
      <div className="p-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="No orders yet"
            description="Your purchases will appear here."
            action={{ label: "Go to Shop", onClick: () => navigate("/shop") }}
          />
        ) : (
          orders.map((o) => (
            <GlassCard key={o.id} variant="light" className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <button onClick={() => navigate(`/store/${o.seller_id}`)} className="text-xs text-primary font-medium">
                    View seller →
                  </button>
                  <p className="text-sm font-semibold mt-0.5">{o.currency} {Number(o.total_price).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}</p>
                </div>
                <Badge variant="secondary" className="capitalize">{o.status}</Badge>
              </div>
              {o.items && o.items.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {o.items.map((it, i) => (
                    <div key={i} className="shrink-0 flex flex-col items-center gap-1 w-16">
                      <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden">
                        {it.product_image && <img src={it.product_image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <p className="text-[10px] text-center truncate w-full">{it.quantity}× {it.product_title}</p>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          ))
        )}
      </div>
    </MobileLayout>
  );
}
