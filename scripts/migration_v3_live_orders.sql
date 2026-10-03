-- ==============================================================================
-- AliDeals Platform - Migration V3: Live Order Ingestion & Approval Queue Schema
-- 1. Table: affiliate_orders (Stores order transactions pulled from AliExpress API)
-- 2. Table: affiliate_order_items (Stores individual products within each order)
-- 3. Updates products table with sales_count, orders_count, last_order_at
-- 4. Sets up indexes and open RLS policies
-- ==============================================================================

-- 0. Ensure UUID & Crypto Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. Table: affiliate_orders
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(64) UNIQUE NOT NULL,
    order_status VARCHAR(64) DEFAULT 'Payment Completed',
    paid_amount_usd NUMERIC(10, 2) DEFAULT 0.00,
    commission_amount_usd NUMERIC(10, 2) DEFAULT 0.00,
    sub_id VARCHAR(100),
    order_time TIMESTAMPTZ DEFAULT NOW(),
    raw_api_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. Table: affiliate_order_items
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.affiliate_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.affiliate_orders(id) ON DELETE CASCADE,
    order_number VARCHAR(64) NOT NULL,
    product_id VARCHAR(64) NOT NULL,
    product_title TEXT,
    product_image_url TEXT,
    product_count INT DEFAULT 1,
    sale_price_usd NUMERIC(10, 2) DEFAULT 0.00,
    commission_rate NUMERIC(5, 2) DEFAULT 0.00,
    commission_usd NUMERIC(10, 2) DEFAULT 0.00,
    product_ref_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    article_generation_status VARCHAR(32) DEFAULT 'pending', -- 'already_exists' | 'pending' | 'generating' | 'completed' | 'failed'
    generated_page_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. Enhance products table with live sales tracking
-- ==============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sales_count') THEN
            ALTER TABLE public.products ADD COLUMN sales_count INT DEFAULT 0;
            UPDATE public.products SET sales_count = COALESCE(orders_count, 0);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'last_order_at') THEN
            ALTER TABLE public.products ADD COLUMN last_order_at TIMESTAMPTZ DEFAULT NULL;
        END IF;
    END IF;
END $$;

-- ==============================================================================
-- 4. Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_number ON public.affiliate_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_affiliate_orders_time ON public.affiliate_orders(order_time DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_order_items_product_id ON public.affiliate_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_order_items_status ON public.affiliate_order_items(article_generation_status);
CREATE INDEX IF NOT EXISTS idx_affiliate_order_items_order_id ON public.affiliate_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_sales_count ON public.products(sales_count DESC);

-- ==============================================================================
-- 5. Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.affiliate_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow open access for all on affiliate_orders" ON public.affiliate_orders;
CREATE POLICY "Allow open access for all on affiliate_orders" ON public.affiliate_orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.affiliate_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow open access for all on affiliate_order_items" ON public.affiliate_order_items;
CREATE POLICY "Allow open access for all on affiliate_order_items" ON public.affiliate_order_items FOR ALL USING (true) WITH CHECK (true);
