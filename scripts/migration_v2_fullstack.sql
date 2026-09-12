-- ==============================================================================
-- AliDeals Platform - Migration V2: Full-Stack Enterprise Schema (CRO, Data & Tracking)
-- 1. Ensures core tables exist with exact requested column structures.
-- 2. Maintains backwards compatibility with existing catalog & site records.
-- 3. Configures required indexes and 100% open Read/Write RLS policies.
-- ==============================================================================

-- 0. Ensure UUID & Crypto Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. Table: products
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ali_product_id VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    hebrew_title VARCHAR(255),
    price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    original_price_usd NUMERIC(10, 2),
    discount_rate NUMERIC(5, 2) DEFAULT 0.00,
    rating NUMERIC(3, 2) DEFAULT 4.80,
    orders_count INT DEFAULT 0,
    main_image_url TEXT NOT NULL DEFAULT '',
    image_gallery TEXT[] DEFAULT '{}',
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    affiliate_url TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backwards compatibility: add new columns if table already existed with legacy names
DO $$
BEGIN
    -- ali_product_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'ali_product_id') THEN
        ALTER TABLE public.products ADD COLUMN ali_product_id VARCHAR(64);
        UPDATE public.products SET ali_product_id = ali_id WHERE ali_product_id IS NULL AND ali_id IS NOT NULL;
    END IF;
    -- title
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'title') THEN
        ALTER TABLE public.products ADD COLUMN title VARCHAR(255);
        UPDATE public.products SET title = LEFT(original_title, 255) WHERE title IS NULL AND original_title IS NOT NULL;
    END IF;
    -- hebrew_title
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'hebrew_title') THEN
        ALTER TABLE public.products ADD COLUMN hebrew_title VARCHAR(255);
        UPDATE public.products SET hebrew_title = LEFT(title_he, 255) WHERE hebrew_title IS NULL AND title_he IS NOT NULL;
    END IF;
    -- main_image_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'main_image_url') THEN
        ALTER TABLE public.products ADD COLUMN main_image_url TEXT;
        UPDATE public.products SET main_image_url = main_image WHERE main_image_url IS NULL AND main_image IS NOT NULL;
    END IF;
    -- image_gallery
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_gallery') THEN
        ALTER TABLE public.products ADD COLUMN image_gallery TEXT[] DEFAULT '{}';
    END IF;
    -- discount_rate
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'discount_rate') THEN
        ALTER TABLE public.products ADD COLUMN discount_rate NUMERIC(5, 2) DEFAULT 0.00;
        UPDATE public.products SET discount_rate = discount_percent WHERE discount_rate IS NULL AND discount_percent IS NOT NULL;
    END IF;
    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE public.products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        UPDATE public.products SET is_active = (status = 'active') WHERE is_active IS NULL;
    END IF;
END $$;

-- ==============================================================================
-- 2. Table: review_pages (1:1 relation with products)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.review_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(150) UNIQUE NOT NULL,
    product_id UUID UNIQUE NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    seo_title VARCHAR(255) NOT NULL,
    seo_description TEXT NOT NULL,
    content_html TEXT,
    pros TEXT[] DEFAULT '{}',
    cons TEXT[] DEFAULT '{}',
    verdict TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    view_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. Table: product_cross_sells (Frequently Bought Together)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_cross_sells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    related_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    recommendation_reason TEXT,
    display_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (parent_product_id, related_product_id)
);

-- ==============================================================================
-- 4. Table: coupons
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL,
    discount_value VARCHAR(64) NOT NULL,
    min_spend_usd NUMERIC(10, 2) DEFAULT 0.00,
    expires_at TIMESTAMPTZ,
    affiliate_link TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    show_in_exit_modal BOOLEAN DEFAULT FALSE,
    show_sitewide BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backwards compatibility: sync with coupons_deals if present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coupons_deals') THEN
        INSERT INTO public.coupons (code, discount_value, min_spend_usd, expires_at, affiliate_link, is_active, show_in_exit_modal, show_sitewide, usage_count)
        SELECT 
            cd.code,
            COALESCE(cd.description_he, cd.discount_amount::text, 'הנחה'),
            COALESCE(cd.min_spend_usd, 0),
            cd.valid_to,
            cd.affiliate_url,
            COALESCE(cd.is_active, true),
            true, -- make top coupons visible in exit modal
            true,
            COALESCE(cd.click_count, 0)
        FROM public.coupons_deals cd
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ==============================================================================
-- 5. Table: ugc_verifications (Israeli Community UGC Badges)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ugc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    is_eu_plug BOOLEAN DEFAULT TRUE,
    delivery_days INT DEFAULT 11,
    voltage_220v_compatible BOOLEAN DEFAULT TRUE,
    is_recommended BOOLEAN DEFAULT TRUE,
    buyer_comment VARCHAR(300),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. Table: redirects (Automatic 301 Redirect Engine)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.redirects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_slug VARCHAR(255) UNIQUE NOT NULL,
    target_url VARCHAR(255) NOT NULL DEFAULT '/',
    status_code INT DEFAULT 301,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure source_slug and target_url exist if table was created previously with source_path
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redirects' AND column_name = 'source_slug') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redirects' AND column_name = 'source_path') THEN
            ALTER TABLE public.redirects ADD COLUMN source_slug VARCHAR(255);
            UPDATE public.redirects SET source_slug = source_path WHERE source_slug IS NULL;
        END IF;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redirects' AND column_name = 'target_url') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'redirects' AND column_name = 'target_path') THEN
            ALTER TABLE public.redirects ADD COLUMN target_url VARCHAR(255) DEFAULT '/';
            UPDATE public.redirects SET target_url = target_path WHERE target_url IS NULL;
        END IF;
    END IF;
END $$;

-- ==============================================================================
-- 7. High Performance Query Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_ali_id ON public.products(ali_product_id);
CREATE INDEX IF NOT EXISTS idx_review_pages_slug ON public.review_pages(slug);
CREATE INDEX IF NOT EXISTS idx_cross_sells_parent ON public.product_cross_sells(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_ugc_product_approved ON public.ugc_verifications(product_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_redirects_source_slug ON public.redirects(source_slug);

-- ==============================================================================
-- 8. Enable Row Level Security (RLS) & 100% OPEN Read/Write Access
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_cross_sells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'products', 'review_pages', 'product_cross_sells', 'coupons', 'ugc_verifications', 'redirects'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Open access for all" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Open access for all" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- 9. Seed Default Exit-Modal Coupon
-- ==============================================================================
INSERT INTO public.coupons (code, discount_value, min_spend_usd, is_active, show_in_exit_modal, show_sitewide)
VALUES ('ALIBUY2026', '$5 הנחה', 30.00, true, true, true)
ON CONFLICT DO NOTHING;
