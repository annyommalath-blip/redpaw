import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ShoppingBag, Search } from "lucide-react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, ProductRow } from "@/components/shop/ProductCard";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "food", label: "Food" },
  { id: "toys", label: "Toys" },
  { id: "accessories", label: "Accessories" },
  { id: "apparel", label: "Apparel" },
  { id: "health", label: "Health" },
  { id: "other", label: "Other" },
];

export default function ShopPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id,title,price,currency,photo_urls,category,stock")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setProducts((data as ProductRow[]) || []);
    setLoading(false);
  };

  const filtered = products.filter((p) => {
    if (filter !== "all" && p.category !== filter) return false;
    if (query && !p.title.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <MobileLayout>
      <PageHeader title="Shop" subtitle="Discover pet products from the community" />
      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="pl-9 rounded-2xl bg-card"
            />
          </div>
          <Button onClick={() => navigate("/shop/new")} size="icon" className="rounded-2xl">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v)}
          className="justify-start bg-muted/30 p-1 rounded-xl w-full overflow-x-auto flex-nowrap"
        >
          {CATEGORIES.map((c) => (
            <ToggleGroupItem
              key={c.id}
              value={c.id}
              size="sm"
              className="text-xs px-3 rounded-lg data-[state=on]:bg-white data-[state=on]:shadow-sm whitespace-nowrap"
            >
              {c.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-8 w-8" />}
            title="No products yet"
            description="Be the first to list a product for the community."
            action={{ label: "List a product", onClick: () => navigate("/shop/new") }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
