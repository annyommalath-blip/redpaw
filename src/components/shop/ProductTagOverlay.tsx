import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface ProductTag {
  id: string;
  product_id: string;
  photo_index: number;
  x_pct: number;
  y_pct: number;
  product?: {
    title: string;
    price: number;
    currency: string;
  } | null;
}

interface ProductTagOverlayProps {
  postId: string;
  activePhotoIndex: number;
}

export function ProductTagOverlay({ postId, activePhotoIndex }: ProductTagOverlayProps) {
  const navigate = useNavigate();
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("post_product_tags")
        .select("id,product_id,photo_index,x_pct,y_pct, products:product_id(title,price,currency)")
        .eq("post_id", postId);
      if (cancelled) return;
      const enriched = (data || []).map((t: any) => ({
        id: t.id,
        product_id: t.product_id,
        photo_index: t.photo_index,
        x_pct: Number(t.x_pct),
        y_pct: Number(t.y_pct),
        product: t.products,
      })) as ProductTag[];
      setTags(enriched);
    })();
    return () => { cancelled = true; };
  }, [postId]);

  const visibleTags = tags.filter((t) => t.photo_index === activePhotoIndex);

  if (tags.length === 0) return null;

  return (
    <>
      {/* Tag dots overlay */}
      <AnimatePresence>
        {showAll && visibleTags.map((tag) => (
          <motion.button
            key={tag.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={(e) => { e.stopPropagation(); navigate(`/product/${tag.product_id}`); }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
            style={{ left: `${tag.x_pct}%`, top: `${tag.y_pct}%` }}
          >
            <div className="h-6 w-6 rounded-full bg-white border-2 border-primary shadow-lg flex items-center justify-center animate-pulse">
              <ShoppingBag className="h-3 w-3 text-primary" />
            </div>
            {tag.product && (
              <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-3 py-1.5 whitespace-nowrap text-xs">
                <p className="font-medium">{tag.product.title}</p>
                <p className="text-primary font-semibold">
                  {tag.product.currency} {Number(tag.product.price).toFixed(2)}
                </p>
              </div>
            )}
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Toggle button (bottom-left badge) */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowAll((s) => !s); }}
        className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow-md text-xs font-medium"
      >
        {showAll ? <X className="h-3 w-3" /> : <ShoppingBag className="h-3 w-3 text-primary" />}
        <span>{showAll ? "Hide" : `${tags.length} product${tags.length > 1 ? "s" : ""}`}</span>
      </button>
    </>
  );
}
