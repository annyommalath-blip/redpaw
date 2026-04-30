import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, loading, updateQty, removeItem, clearCart } = useCart();
  const [shippingNote, setShippingNote] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);

  // Group items by seller (each seller becomes its own order)
  const groups = new Map<string, typeof items>();
  items.forEach((it) => {
    if (!it.product) return;
    const arr = groups.get(it.product.seller_id) || [];
    arr.push(it);
    groups.set(it.product.seller_id, arr);
  });

  const groupTotal = (its: typeof items) =>
    its.reduce((s, it) => s + (it.product ? Number(it.product.price) * it.quantity : 0), 0);

  const grandTotal = items.reduce((s, it) => s + (it.product ? Number(it.product.price) * it.quantity : 0), 0);

  const checkout = async () => {
    if (!user || items.length === 0) return;
    setCheckingOut(true);
    try {
      for (const [sellerId, groupItems] of groups) {
        const currency = groupItems[0]?.product?.currency || "USD";
        const total = groupTotal(groupItems);
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
            total_price: total,
            currency,
            status: "pending",
            shipping_note: shippingNote.trim() || null,
            contact_info: contactInfo.trim() || null,
          })
          .select("id")
          .single();
        if (orderErr) throw orderErr;

        const orderItems = groupItems.map((it) => ({
          order_id: order.id,
          product_id: it.product!.id,
          product_title: it.product!.title,
          product_image: it.product!.photo_urls?.[0] || null,
          quantity: it.quantity,
          price: Number(it.product!.price),
        }));
        const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
        if (itemsErr) throw itemsErr;
      }
      await clearCart();
      toast.success("Order placed! Sellers have been notified.");
      navigate("/orders");
    } catch (err: any) {
      toast.error(err.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <PageHeader title="Cart" showBack />
        <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="Cart" subtitle={items.length === 0 ? "Empty" : `${items.length} item${items.length > 1 ? "s" : ""}`} showBack />
      <div className="p-4 space-y-4 pb-32">
        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="Your cart is empty"
            description="Browse the shop to add products."
            action={{ label: "Go to Shop", onClick: () => navigate("/shop") }}
          />
        ) : (
          <>
            {Array.from(groups).map(([sellerId, its]) => (
              <div key={sellerId} className="space-y-2">
                <button onClick={() => navigate(`/store/${sellerId}`)} className="text-xs text-primary font-medium">
                  View seller →
                </button>
                {its.map((it) => (
                  <GlassCard key={it.id} variant="light" className="p-3 flex items-center gap-3">
                    <button onClick={() => navigate(`/product/${it.product?.id}`)} className="h-16 w-16 rounded-xl bg-muted overflow-hidden shrink-0">
                      {it.product?.photo_urls?.[0] && <img src={it.product.photo_urls[0]} alt="" className="w-full h-full object-cover" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.product?.title}</p>
                      <p className="text-xs text-primary">{it.product?.currency} {Number(it.product?.price || 0).toFixed(2)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.id, it.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-6 text-center">{it.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.id, it.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeItem(it.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </GlassCard>
                ))}
              </div>
            ))}

            <GlassCard variant="light" className="p-4 space-y-3">
              <div>
                <Label>Contact info (for seller)</Label>
                <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Phone or address" />
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Textarea value={shippingNote} onChange={(e) => setShippingNote(e.target.value)} rows={2} placeholder="Shipping or delivery instructions" />
              </div>
            </GlassCard>

            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-background/95 backdrop-blur border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-primary">
                  {items[0]?.product?.currency || "USD"} {grandTotal.toFixed(2)}
                </span>
              </div>
              <Button onClick={checkout} disabled={checkingOut} className="w-full" size="lg">
                {checkingOut && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Place order
              </Button>
            </div>
          </>
        )}
      </div>
    </MobileLayout>
  );
}
