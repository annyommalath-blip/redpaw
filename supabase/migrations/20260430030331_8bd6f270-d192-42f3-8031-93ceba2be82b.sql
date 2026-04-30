-- =========================
-- SELLER PROFILES
-- =========================
CREATE TABLE public.seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  store_name text NOT NULL,
  store_description text,
  store_logo_url text,
  contact_info text,
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'approved', -- pending | approved | suspended
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active seller profiles"
ON public.seller_profiles FOR SELECT
USING (is_active = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own seller profile"
ON public.seller_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seller profile"
ON public.seller_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seller profile"
ON public.seller_profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_seller_profiles_updated_at
BEFORE UPDATE ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- CART ITEMS
-- =========================
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own cart - select"
ON public.cart_items FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own cart - insert"
ON public.cart_items FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own cart - update"
ON public.cart_items FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own cart - delete"
ON public.cart_items FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- ORDERS
-- =========================
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  total_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending', -- pending | confirmed | shipped | completed | cancelled
  shipping_note text,
  contact_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers and sellers can view their orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Buyers can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update their orders"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- ORDER ITEMS
-- =========================
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  product_title text NOT NULL,
  product_image text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer or seller can view order items"
ON public.order_items FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id
    AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
));

CREATE POLICY "Buyers can insert order items"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id AND o.buyer_id = auth.uid()
));

-- =========================
-- TIGHTEN PRODUCTS: only sellers can list
-- =========================
DROP POLICY IF EXISTS "Users can create their own products" ON public.products;
CREATE POLICY "Active sellers can create products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND EXISTS (
    SELECT 1 FROM public.seller_profiles sp
    WHERE sp.user_id = auth.uid() AND sp.is_active = true AND sp.status = 'approved'
  )
);

-- Auto-cleanup product tags when product is deleted or hidden/sold-out
CREATE OR REPLACE FUNCTION public.cleanup_product_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.post_product_tags WHERE product_id = OLD.id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IN ('hidden', 'sold_out') AND OLD.status = 'active' THEN
      DELETE FROM public.post_product_tags WHERE product_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_cleanup_product_tags_delete
AFTER DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.cleanup_product_tags();

CREATE TRIGGER trg_cleanup_product_tags_update
AFTER UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.cleanup_product_tags();

-- =========================
-- STORAGE: store-logos bucket
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-logos', 'store-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Store logos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-logos');

CREATE POLICY "Users can upload their own store logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own store logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'store-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own store logo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
