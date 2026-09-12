-- ==============================================================================
-- AliDeals Platform - Complete Enterprise Multi-Site PostgreSQL Schema
-- High-scale architecture for 100,000+ products, nested category tree,
-- Multi-site support, price tracking, coupons, full-text search,
-- Graduated agent task queue & PRO API quota rate limiting.
-- All tables configured with 100% open READ & WRITE access (RLS).
-- ==============================================================================

-- 1. Enable Core Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==============================================================================
-- 2. Table: sites (Multi-Site / Multi-Brand Network)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sites (
    id TEXT PRIMARY KEY, -- 'alideals', 'homedeals', etc.
    domain TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    theme_color TEXT DEFAULT '#ea580c',
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_domain ON public.sites (domain);

-- ==============================================================================
-- 3. Table: categories (Deep Nested Tree Hierarchy)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    site_id TEXT DEFAULT 'alideals' REFERENCES public.sites(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    slug TEXT NOT NULL,
    path TEXT NOT NULL, -- e.g. 'electronics/audio/anc-headphones'
    name_he TEXT NOT NULL,
    icon TEXT,
    description_he TEXT,
    level INT2 DEFAULT 0, -- 0 = root, 1 = sub, 2 = child
    sort_order INT2 DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    ali_category_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_categories_site_slug UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_path ON public.categories (path);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON public.categories (level);
CREATE INDEX IF NOT EXISTS idx_categories_site ON public.categories (site_id);

-- ==============================================================================
-- 4. Table: products (High-Performance Catalog with Virtual Tax Exemption)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    site_id TEXT DEFAULT 'alideals' REFERENCES public.sites(id) ON DELETE CASCADE,
    ali_id TEXT UNIQUE NOT NULL,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    original_title TEXT NOT NULL,
    title_he TEXT,
    slug TEXT,
    description_he TEXT,
    meta_title TEXT,
    meta_description TEXT,
    category TEXT DEFAULT 'אלקטרוניקה וגאדג''טים', -- backward compat string
    tags JSONB DEFAULT '[]'::jsonb,
    price_usd NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    price_ils NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    original_price_usd NUMERIC(8, 2),
    discount_percent INT2 DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 4.80,
    orders_count INT4 DEFAULT 100,
    commission_rate NUMERIC(4, 2) DEFAULT 7.00,
    store_name TEXT DEFAULT 'Official AliExpress Store',
    seller_positive_rate TEXT DEFAULT '98.5%',
    main_image TEXT NOT NULL,
    gallery_images JSONB DEFAULT '[]'::jsonb,
    specifications JSONB DEFAULT '{}'::jsonb,
    reviews_summary JSONB DEFAULT '[]'::jsonb,
    ali_url TEXT NOT NULL,
    affiliate_url TEXT,
    is_choice BOOLEAN DEFAULT false,
    is_plus BOOLEAN DEFAULT false,
    has_free_shipping BOOLEAN DEFAULT true,
    -- Israeli Customs Exemption ($75 threshold) as a virtual STORED column for O(1) indexed scans
    is_tax_exempt BOOLEAN GENERATED ALWAYS AS (price_usd < 75.00) STORED,
    status TEXT DEFAULT 'active', -- 'active' | 'inactive' | 'out_of_stock' | 'draft'
    views_count INT4 DEFAULT 0,
    clicks_count INT4 DEFAULT 0,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_ali_id ON public.products (ali_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_site_id ON public.products (site_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);
CREATE INDEX IF NOT EXISTS idx_products_price_usd ON public.products (price_usd);
CREATE INDEX IF NOT EXISTS idx_products_tax_exempt ON public.products (is_tax_exempt);
CREATE INDEX IF NOT EXISTS idx_products_orders ON public.products (orders_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_tags_gin ON public.products USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON public.products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_products_trgm_title ON public.products USING GIN (title_he gin_trgm_ops);

-- ==============================================================================
-- 5. Table: product_price_history (Price Tracking & Deal Signals)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_price_history (
    id BIGSERIAL PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price_usd NUMERIC(8, 2) NOT NULL,
    price_ils NUMERIC(8, 2) NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_time ON public.product_price_history (product_id, recorded_at DESC);

-- ==============================================================================
-- 6. Table: pages (CMS Content: Reviews, TOP 5, Flash Deals, Guides)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pages (
    id TEXT PRIMARY KEY,
    site_id TEXT DEFAULT 'alideals' REFERENCES public.sites(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'review', -- 'review' | 'top5' | 'deal' | 'guide' | 'category'
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    target_category TEXT DEFAULT 'אלקטרוניקה וגאדג''טים', -- backward compat
    title TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    direct_answer_geo TEXT, -- AI Search / SGE Snippet
    content_markdown TEXT,
    structured_data_json JSONB,
    featured_image TEXT,
    infographic_image TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    product_ids JSONB DEFAULT '[]'::jsonb, -- quick cache array
    bought_together_ids JSONB DEFAULT '[]'::jsonb,
    cross_sell_reason TEXT,
    rankings JSONB DEFAULT '[]'::jsonb,
    faqs JSONB DEFAULT '[]'::jsonb,
    pros JSONB DEFAULT '[]'::jsonb,
    cons JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'published', -- 'draft' | 'published' | 'archived'
    views_count INT4 DEFAULT 0,
    reading_time_minutes INT2 DEFAULT 3,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pages') THEN
        ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS bought_together_ids JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS cross_sell_reason TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages (slug);
CREATE INDEX IF NOT EXISTS idx_pages_type ON public.pages (type);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages (status);
CREATE INDEX IF NOT EXISTS idx_pages_category_id ON public.pages (category_id);
CREATE INDEX IF NOT EXISTS idx_pages_site_id ON public.pages (site_id);
CREATE INDEX IF NOT EXISTS idx_pages_created_at ON public.pages (created_at DESC);

-- ==============================================================================
-- 7. Table: page_products (Normalized Relational Junction)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.page_products (
    page_id TEXT NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    position INT2 NOT NULL DEFAULT 1, -- 1 to 10 rank in TOP 5
    badge TEXT, -- 'הבחירה המשתלמת', 'איכות פרמיום', 'הכי נמכר'
    pros JSONB DEFAULT '[]'::jsonb,
    cons JSONB DEFAULT '[]'::jsonb,
    custom_review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (page_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_page_products_page ON public.page_products (page_id, position ASC);
CREATE INDEX IF NOT EXISTS idx_page_products_product ON public.page_products (product_id);

-- ==============================================================================
-- 8. Table: coupons_deals (Coupons, Promo Codes & Sale Campaigns)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.coupons_deals (
    id TEXT PRIMARY KEY,
    site_id TEXT DEFAULT 'alideals' REFERENCES public.sites(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title_he TEXT NOT NULL,
    description_he TEXT,
    discount_amount NUMERIC(8, 2),
    min_spend_usd NUMERIC(8, 2),
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    affiliate_url TEXT,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons_deals (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons_deals (is_active, valid_to);

-- ==============================================================================
-- 9. Table: api_quota_meter (Real-Time Multi-Tier Rate Limiter & PRO Quota Governor)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.api_quota_meter (
    id TEXT PRIMARY KEY, -- 'gemini_pro', 'aliexpress_open_api', etc.
    service_name TEXT NOT NULL,
    tier TEXT DEFAULT 'PRO',
    max_rps INT2 DEFAULT 5,         -- max requests per second
    max_rpm INT2 DEFAULT 60,        -- max requests per minute
    max_rph INT4 DEFAULT 3600,      -- max requests per hour
    max_rpd INT4 DEFAULT 50000,     -- max requests per day
    max_tpm INT4 DEFAULT 4000000,   -- max tokens per minute
    current_window_second TIMESTAMPTZ DEFAULT NOW(),
    count_second INT2 DEFAULT 0,
    current_window_minute TIMESTAMPTZ DEFAULT NOW(),
    count_minute INT2 DEFAULT 0,
    current_window_hour TIMESTAMPTZ DEFAULT NOW(),
    count_hour INT4 DEFAULT 0,
    current_window_day DATE DEFAULT CURRENT_DATE,
    count_day INT4 DEFAULT 0,
    tokens_used_today INT8 DEFAULT 0,
    is_throttled BOOLEAN DEFAULT false,
    throttle_until TIMESTAMPTZ,
    last_request_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 10. Table: agent_tasks (Graduated Priority Queue for Autonomous AI Workers)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.agent_tasks (
    id TEXT PRIMARY KEY,
    site_id TEXT DEFAULT 'alideals' REFERENCES public.sites(id) ON DELETE CASCADE,
    agent_role TEXT NOT NULL, -- 'orchestrator' | 'curator' | 'copywriter' | 'seo_analyst'
    task_type TEXT NOT NULL,  -- 'enrich_product' | 'write_review' | 'generate_top5' | 'check_price_drops'
    priority INT2 DEFAULT 2,  -- 1 = Instant/User Chat, 2 = High Editorial, 3 = Routine Background, 4 = Bulk Paced
    status TEXT DEFAULT 'queued', -- 'queued' | 'running' | 'completed' | 'throttled' | 'failed'
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error_message TEXT,
    retry_count INT2 DEFAULT 0,
    max_retries INT2 DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_queue ON public.agent_tasks (status, priority ASC, scheduled_at ASC);

-- ==============================================================================
-- 11. Table: site_settings (Settings per Site)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    site_id TEXT DEFAULT 'alideals',
    ga_measurement_id TEXT,
    site_url TEXT DEFAULT 'https://ali-deals.co.il',
    aliexpress_app_key TEXT,
    aliexpress_app_secret TEXT,
    aliexpress_default_tracking_id TEXT DEFAULT 'default',
    daily_product_target INT2 DEFAULT 5,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. Table: outbound_clicks (High-Throughput Conversion Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.outbound_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT DEFAULT 'alideals',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    product_id TEXT,
    product_title TEXT,
    price_usd NUMERIC(8, 2),
    price_ils NUMERIC(8, 2),
    page_slug TEXT,
    link_type TEXT DEFAULT 'cta_button',
    destination_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON public.outbound_clicks (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_product_id ON public.outbound_clicks (product_id);

-- ==============================================================================
-- 13. Table: gsc_queries (Search Console SEO Insights)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.gsc_queries (
    id TEXT PRIMARY KEY,
    site_id TEXT DEFAULT 'alideals',
    query TEXT NOT NULL,
    page TEXT,
    clicks INT4 DEFAULT 0,
    impressions INT4 DEFAULT 0,
    ctr NUMERIC(5, 2) DEFAULT 0,
    position NUMERIC(5, 2) DEFAULT 0,
    opportunity_type TEXT,
    date TEXT,
    imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gsc_query ON public.gsc_queries (query);

-- ==============================================================================
-- 14. Table: agent_logs & agent_messages
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.agent_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
    role TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    level TEXT NOT NULL, -- 'info' | 'success' | 'warning' | 'error'
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_messages (
    id TEXT PRIMARY KEY,
    sender TEXT NOT NULL, -- 'user' | 'orchestrator'
    text TEXT NOT NULL,
    timestamp TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON public.agent_messages (created_at ASC);

-- ==============================================================================
-- 14.1 Table: redirects (301 Permanent Redirects & SEO Preservation)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.redirects (
    id TEXT PRIMARY KEY,
    site_id TEXT DEFAULT 'alideals' REFERENCES public.sites(id) ON DELETE CASCADE,
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL,
    status_code INT2 DEFAULT 301,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_redirects_site_source UNIQUE (site_id, source_path)
);

CREATE INDEX IF NOT EXISTS idx_redirects_source ON public.redirects (source_path);
CREATE INDEX IF NOT EXISTS idx_redirects_site ON public.redirects (site_id);

-- ==============================================================================
-- 14.2 Table: navigation_menus (Dynamic Global Navigation Hierarchy)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.navigation_menus (
    id TEXT PRIMARY KEY,
    site_id TEXT DEFAULT 'alideals' REFERENCES public.sites(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_navigation_menus_site UNIQUE (site_id, id)
);

CREATE INDEX IF NOT EXISTS idx_navigation_menus_site ON public.navigation_menus (site_id);

-- ==============================================================================
-- 15. Enable Row Level Security (RLS) & 100% OPEN Policies (Read & Write)
-- As requested: All tables fully open for SELECT, INSERT, UPDATE, DELETE
-- ==============================================================================

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_quota_meter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_menus ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'sites', 'categories', 'products', 'product_price_history',
        'pages', 'page_products', 'coupons_deals', 'api_quota_meter',
        'agent_tasks', 'site_settings', 'outbound_clicks', 'gsc_queries',
        'agent_logs', 'agent_messages', 'redirects', 'navigation_menus'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Open access for all" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Open access for all" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- 16. Seed Data: Default Site
-- ==============================================================================
INSERT INTO public.sites (id, domain, name, description, theme_color)
VALUES ('alideals', 'ali-deals.co.il', 'AliDeals ישראל', 'אתר הדילים, הסקירות והקופונים המוביל לאלי אקספרס בישראל', '#ea580c')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 17. Seed Data: API Quota Meters (Gemini PRO & AliExpress Open Platform)
-- ==============================================================================
INSERT INTO public.api_quota_meter (id, service_name, tier, max_rps, max_rpm, max_rph, max_rpd, max_tpm)
VALUES 
('gemini_pro', 'Google Gemini 1.5 Pro', 'PRO', 5, 60, 3600, 50000, 4000000),
('aliexpress_open_api', 'AliExpress Affiliate Open Platform', 'PRO', 10, 300, 10000, 100000, 0)
ON CONFLICT (id) DO UPDATE 
SET max_rps = EXCLUDED.max_rps,
    max_rpm = EXCLUDED.max_rpm,
    max_rph = EXCLUDED.max_rph,
    max_rpd = EXCLUDED.max_rpd;

-- ==============================================================================
-- 17b. V2 Full-Stack Extensions (CRO, Data & Tracking)
-- ==============================================================================

-- 1. Table: review_pages (1:1 relation with products)
CREATE TABLE IF NOT EXISTS public.review_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(150) UNIQUE NOT NULL,
    product_id TEXT NOT NULL,
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

-- 2. Table: product_cross_sells (Frequently Bought Together)
CREATE TABLE IF NOT EXISTS public.product_cross_sells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_product_id TEXT NOT NULL,
    related_product_id TEXT NOT NULL,
    recommendation_reason TEXT,
    display_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (parent_product_id, related_product_id)
);

-- 3. Table: coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL,
    discount_value VARCHAR(64) NOT NULL,
    min_spend_usd NUMERIC(10, 2) DEFAULT 0.00,
    expires_at TIMESTAMPTZ,
    affiliate_link TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_category_id TEXT,
    show_in_exit_modal BOOLEAN DEFAULT FALSE,
    show_sitewide BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table: ugc_verifications (Israeli Community UGC Badges)
CREATE TABLE IF NOT EXISTS public.ugc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    is_eu_plug BOOLEAN DEFAULT TRUE,
    delivery_days INT DEFAULT 11,
    voltage_220v_compatible BOOLEAN DEFAULT TRUE,
    is_recommended BOOLEAN DEFAULT TRUE,
    buyer_comment VARCHAR(300),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table: redirects (Automatic 301 Redirect Engine)
CREATE TABLE IF NOT EXISTS public.redirects (
    id TEXT PRIMARY KEY DEFAULT ('redir_' || substr(md5(random()::text), 1, 12)),
    site_id TEXT DEFAULT 'alideals',
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL,
    status_code INT2 DEFAULT 301,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_redirects_site_source UNIQUE (site_id, source_path)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_pages_slug ON public.review_pages (slug);
CREATE INDEX IF NOT EXISTS idx_cross_sells_parent ON public.product_cross_sells (parent_product_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons (is_active, show_in_exit_modal);
CREATE INDEX IF NOT EXISTS idx_ugc_product_approved ON public.ugc_verifications (product_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_redirects_source_slug ON public.redirects (source_path);

-- Open RLS policies
ALTER TABLE public.review_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_cross_sells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow open access for all on review_pages" ON public.review_pages;
    CREATE POLICY "Allow open access for all on review_pages" ON public.review_pages FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow open access for all on product_cross_sells" ON public.product_cross_sells;
    CREATE POLICY "Allow open access for all on product_cross_sells" ON public.product_cross_sells FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow open access for all on coupons" ON public.coupons;
    CREATE POLICY "Allow open access for all on coupons" ON public.coupons FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow open access for all on ugc_verifications" ON public.ugc_verifications;
    CREATE POLICY "Allow open access for all on ugc_verifications" ON public.ugc_verifications FOR ALL USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Allow open access for all on redirects" ON public.redirects;
    CREATE POLICY "Allow open access for all on redirects" ON public.redirects FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- 18. Seed Data: Core Hierarchical Categories
-- ==============================================================================
INSERT INTO public.categories (id, site_id, parent_id, slug, path, name_he, icon, description_he, level, sort_order, tags)
VALUES
('cat_electronics', 'alideals', NULL, 'electronics', 'electronics', 'אלקטרוניקה וגאדג''טים', '🔌', 'מקרנים ביתיים, רמקולים ניידים, אוזניות ANC, קונסולות וגאדג''טים חכמים', 0, 1, '["מקרן", "אוזניות בלוטוס", "רמקול אלחוטי", "שקע אירופאי", "Choice"]'::jsonb),
('cat_home', 'alideals', NULL, 'home-gadgets', 'home-gadgets', 'לבית, למטבח ולגינה', '🏠', 'שואבי אבק אלחוטיים, גאדג''טים למטבח, תאורת לד חכמה ורובוטים לניקוי חלונות', 0, 2, '["שואב אבק", "מטבח חכם", "ניקוי חלונות", "תאורת לד", "עד 75$"]'::jsonb),
('cat_computers', 'alideals', NULL, 'computers-gaming', 'computers-gaming', 'מחשבים, גיימינג וציוד משרדי', '💻', 'מקלדות מכניות, עכברי גיימינג, מיני מחשבים (Mini PC) ומסכים ניידים', 0, 3, '["מיני PC", "מקלדת מכנית", "עכבר גיימינג", "מסך נייד"]'::jsonb),
('cat_phones', 'alideals', NULL, 'phones-accessories', 'phones-accessories', 'סמארטפונים, שעונים ואביזרים', '📱', 'מטענים מהירים GaN, שעונים חכמים, מעמדי MagSafe וכיסויים איכותיים', 0, 4, '["מטען GaN", "שעון חכם", "MagSafe", "כבל 100W"]'::jsonb),
('cat_car', 'alideals', NULL, 'car-accessories', 'car-accessories', 'ציוד ואביזרים לרכב', '🚗', 'מצלמות דרך 4K, משאבות צמיגים ניידות, מטעני רכב ומעמדים מתקדמים', 0, 5, '["מצלמת דרך", "משאבת צמיגים", "מעמד מגנטי", "שואב לרכב"]'::jsonb),
('cat_tools', 'alideals', NULL, 'tools-diy', 'tools-diy', 'כלי עבודה ושיפוץ הבית', '🛠️', 'מברגות נטענות, סטי ביטים מדויקים, מד לייזר ומדפסת תלת מימד', 0, 6, '["מברגה נטענת", "סט ביטים", "מד לייזר", "מדפסת 3D"]'::jsonb),
('cat_sports', 'alideals', NULL, 'sports-outdoors', 'sports-outdoors', 'ספורט, כושר ומחנאות', '⚽', 'פנסי ראש עוצמתיים, ציוד קמפינג, שעוני ספורט וגומיות אימון', 0, 7, '["פנס ראש", "קמפינג", "כושר ביתי", "בקבוק תרמי"]'::jsonb),
('cat_kids', 'alideals', NULL, 'kids-toys', 'kids-toys', 'תינוקות, ילדים ומשחקים', '👶', 'צעצועי התפתחות, משחקי הרכבה, רחפנים לילדים וציוד בטיחות', 0, 8, '["משחקי חשיבה", "רחפן לילדים", "ערכת יצירה"]'::jsonb)
ON CONFLICT (site_id, slug) DO UPDATE
SET name_he = EXCLUDED.name_he,
    icon = EXCLUDED.icon,
    path = EXCLUDED.path,
    description_he = EXCLUDED.description_he,
    tags = EXCLUDED.tags;

-- ==============================================================================
-- 19. Seed Data: Baseline Projector Product & Review Page
-- ==============================================================================
INSERT INTO public.products (
    id, site_id, ali_id, category_id, original_title, title_he, slug, description_he, category,
    price_usd, price_ils, original_price_usd, discount_percent, rating, orders_count,
    main_image, gallery_images, ali_url, affiliate_url, status
)
VALUES (
    'prod_1005006392019482',
    'alideals',
    '1005006392019482',
    'cat_electronics',
    'Magcubic HY300 4K Android 11 Projector WiFi6 200 ANSI Allwinner H713',
    'מקרן נייד Magcubic HY300 - אנדרואיד 11 ו-WiFi 6',
    'magcubic-hy300-projector',
    'מקרן קומפקטי מסתובב 180 מעלות, תומך WiFi 6 ושקע אירופאי מתאים לישראל',
    'אלקטרוניקה וגאדג''טים',
    44.99,
    164.00,
    65.00,
    30,
    4.80,
    15400,
    'https://ae01.alicdn.com/kf/S8ba89f07bbd64746811a0ea472e35a90R.jpg',
    '["https://ae01.alicdn.com/kf/S8ba89f07bbd64746811a0ea472e35a90R.jpg"]'::jsonb,
    'https://www.aliexpress.com/item/1005006392019482.html',
    'https://s.click.aliexpress.com/e/_DkExample',
    'active'
)
ON CONFLICT (ali_id) DO NOTHING;

INSERT INTO public.pages (
    id, site_id, slug, type, category_id, title, meta_title, meta_description, direct_answer_geo,
    content_markdown, target_category, product_ids, status, views_count
)
VALUES (
    'page_review_hy300',
    'alideals',
    'magcubic-hy300-projector-review',
    'review',
    'cat_electronics',
    'מקרן נייד Magcubic HY300 - סקירה אמיתית: האם שווה לקנות באלי אקספרס?',
    'מקרן נייד Magcubic HY300 באלי אקספרס - סקירה, מחיר וקופונים 2026',
    'סקירה מקיפה על המקרן הוויראלי Magcubic HY300: איכות תמונה, בהירות, תאימות לאנדרואיד, שקע חשמל לישראל ובדיקת פטור ממכס ($75).',
    'ה-Magcubic HY300 הוא המקרן הנייד המשתלם ביותר כיום מתחת ל-75$ (כ-164 ₪), ופטור לחלוטין ממכס בישראל. הוא מציע מערכת Android 11 מלאה, זווית סיבוב של 180° להקרנה על התקרה וחיבור WiFi 6 מהיר.',
    '## נעים להכיר: המקרן שהפך ללהיט עולמי ברשת\nה-Magcubic HY300 הוכיח את עצמו כאחד המוצרים הנמכרים ביותר באלי אקספרס לישראל...',
    'אלקטרוניקה וגאדג''טים',
    '["1005006392019482"]'::jsonb,
    'published',
    1420
)
ON CONFLICT (slug) DO NOTHING;

-- Seed Junction Entry
INSERT INTO public.page_products (page_id, product_id, position, badge, pros, cons)
VALUES (
    'page_review_hy300',
    'prod_1005006392019482',
    1,
    'הבחירה המשתלמת',
    '["פטור מלא ממכס ומע\"מ ($44.99)", "סיבוב 180 מעלות להקרנה על התקרה", "מערכת Android 11 מובנית כולל יוטיוב ונטפליקס"]'::jsonb,
    '["בהירות 200 ANSI דורשת חדר חשוך", "רמקול בסיסי - מומלץ לחבר רמקול Bluetooth"]'::jsonb
)
ON CONFLICT (page_id, product_id) DO NOTHING;

-- Seed Default Settings
INSERT INTO public.site_settings (id, site_id, site_url, aliexpress_default_tracking_id, daily_product_target, updated_at)
VALUES ('singleton', 'alideals', 'https://ali-deals.co.il', 'default', 5, NOW())
ON CONFLICT (id) DO NOTHING;
