-- ==============================================================================
-- AliDeals Supabase Schema Patch: Missing Page Columns
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/cvuwuvmpoxnkcxfjboxc/sql)
-- ==============================================================================

DO $$
BEGIN
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
        ALTER TABLE public.pages ADD COLUMN cross_sell_reason TEXT;
        RAISE NOTICE 'Added column cross_sell_reason to public.pages';
    END IF;
END $$;
