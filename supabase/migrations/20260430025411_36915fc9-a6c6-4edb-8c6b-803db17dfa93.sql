-- Products table for social commerce
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  photo_urls text[] NOT NULL DEFAULT '{}',
  category text,
  stock integer NOT NULL DEFAULT 0,
  contact_phone text,
  contact_url text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (status = 'active' OR auth.uid() = seller_id);

CREATE POLICY "Users can create their own products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their products"
ON public.products FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their products"
ON public.products FOR DELETE
TO authenticated
USING (auth.uid() = seller_id);

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Post product tags: link products to posts at specific image positions
CREATE TABLE public.post_product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  product_id uuid NOT NULL,
  tagged_by uuid NOT NULL,
  photo_index integer NOT NULL DEFAULT 0,
  x_pct numeric NOT NULL DEFAULT 50,
  y_pct numeric NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product tags on visible posts"
ON public.post_product_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_product_tags.post_id
      AND (
        p.visibility = 'public'
        OR auth.uid() = p.user_id
        OR (p.visibility = 'friends' AND public.is_following(auth.uid(), p.user_id))
      )
  )
);

CREATE POLICY "Post owner can tag products"
ON public.post_product_tags FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = tagged_by
  AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
);

CREATE POLICY "Post owner can remove tags"
ON public.post_product_tags FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
);

CREATE INDEX idx_post_product_tags_post ON public.post_product_tags(post_id);
CREATE INDEX idx_post_product_tags_product ON public.post_product_tags(product_id);
CREATE INDEX idx_products_seller ON public.products(seller_id);

-- Storage bucket for product photos
INSERT INTO storage.buckets (id, name, public) VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos');

CREATE POLICY "Users upload own product photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own product photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own product photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-photos' AND auth.uid()::text = (storage.foldername(name))[1]);