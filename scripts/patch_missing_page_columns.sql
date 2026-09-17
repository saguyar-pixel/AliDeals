-- ==============================================================================
-- AliDeals Supabase Schema Patch: Missing Page Columns
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/cvuwuvmpoxnkcxfjboxc/sql)
-- ==============================================================================

DO $$
BEGIN
    -- Add archetype column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'archetype'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN archetype VARCHAR(50) DEFAULT 'GENERAL';
        RAISE NOTICE 'Added column archetype to public.pages';
    END IF;

    -- Add is_eu_plug column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'is_eu_plug'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN is_eu_plug BOOLEAN DEFAULT NULL;
        RAISE NOTICE 'Added column is_eu_plug to public.pages';
    END IF;

    -- Add voltage_220v_compatible column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'voltage_220v_compatible'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN voltage_220v_compatible BOOLEAN DEFAULT NULL;
        RAISE NOTICE 'Added column voltage_220v_compatible to public.pages';
    END IF;

    -- Add size_warning column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'size_warning'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN size_warning TEXT DEFAULT NULL;
        RAISE NOTICE 'Added column size_warning to public.pages';
    END IF;

    -- Add fabric_composition column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'fabric_composition'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN fabric_composition TEXT DEFAULT NULL;
        RAISE NOTICE 'Added column fabric_composition to public.pages';
    END IF;

    -- Add bought_together_ids column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'bought_together_ids'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN bought_together_ids JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added column bought_together_ids to public.pages';
    END IF;

    -- Add cross_sell_reason column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'cross_sell_reason'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN cross_sell_reason TEXT DEFAULT NULL;
        RAISE NOTICE 'Added column cross_sell_reason to public.pages';
    END IF;

    -- Add pros column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'pros'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN pros JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added column pros to public.pages';
    END IF;

    -- Add cons column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'cons'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN cons JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Added column cons to public.pages';
    END IF;

    -- Add direct_answer_geo column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'direct_answer_geo'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN direct_answer_geo TEXT DEFAULT NULL;
        RAISE NOTICE 'Added column direct_answer_geo to public.pages';
    END IF;

    -- Add infographic_image column if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'pages' 
          AND column_name = 'infographic_image'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN infographic_image TEXT DEFAULT NULL;
        RAISE NOTICE 'Added column infographic_image to public.pages';
    END IF;
END $$;
