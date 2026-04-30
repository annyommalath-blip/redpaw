import { useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/ui/glass-card";
import { ShoppingBag } from "lucide-react";

export interface ProductRow {
  id: string;
  title: string;
  price: number;
  currency: string;
  photo_urls: string[];
  category: string | null;
  stock: number;
}

export function ProductCard({ product }: { product: ProductRow }) {
  const navigate = useNavigate();
  const photo = product.photo_urls?.[0];

  return (
    <button
      onClick={() => navigate(`/product/${product.id}`)}
      className="text-left group"
    >
      <GlassCard variant="light" className="overflow-hidden">
        <div className="aspect-square w-full bg-muted relative">
          {photo ? (
            <img
              src={photo}
              alt={product.title}
              className="w-full h-full object-cover group-active:scale-[0.98] transition-transform"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-10 w-10" />
            </div>
          )}
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="px-2 py-1 rounded-full bg-white/90 text-xs font-medium">Sold out</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-medium line-clamp-1">{product.title}</p>
          <p className="text-sm text-primary font-semibold mt-1">
            {product.currency} {Number(product.price).toFixed(2)}
          </p>
        </div>
      </GlassCard>
    </button>
  );
}
