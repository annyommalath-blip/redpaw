import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    title: string;
    price: number;
    currency: string;
    photo_urls: string[];
    stock: number;
    seller_id: string;
    status: string;
  };
}

export function useCart() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select("id, product_id, quantity")
      .eq("user_id", user.id);
    const rows = (data as any[]) || [];
    if (rows.length === 0) { setItems([]); setLoading(false); return; }
    const ids = rows.map((r) => r.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id,title,price,currency,photo_urls,stock,seller_id,status")
      .in("id", ids);
    const map = new Map<string, any>((products || []).map((p: any) => [p.id, p]));
    setItems(rows.map((r) => ({ ...r, product: map.get(r.product_id) })));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const addToCart = async (productId: string, qty = 1) => {
    if (!user) return { error: new Error("Not signed in") };
    const existing = items.find((i) => i.product_id === productId);
    if (existing) {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + qty })
        .eq("id", existing.id);
      if (!error) await refresh();
      return { error };
    }
    const { error } = await supabase
      .from("cart_items")
      .insert({ user_id: user.id, product_id: productId, quantity: qty });
    if (!error) await refresh();
    return { error };
  };

  const updateQty = async (id: string, qty: number) => {
    if (qty <= 0) return removeItem(id);
    const { error } = await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
    if (!error) await refresh();
    return { error };
  };

  const removeItem = async (id: string) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    if (!error) await refresh();
    return { error };
  };

  const clearCart = async () => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    await refresh();
  };

  const totalQty = items.reduce((n, i) => n + i.quantity, 0);

  return { items, loading, totalQty, addToCart, updateQty, removeItem, clearCart, refresh };
}
