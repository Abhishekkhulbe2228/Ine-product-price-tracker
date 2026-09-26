-- INE Price Tracker - Database Schema
-- Run this in Supabase SQL Editor to create all required tables

-- 1. Tracked products the user wants to monitor
CREATE TABLE IF NOT EXISTS tracked_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  option_axis TEXT,                     -- e.g., "Finish", "Edition"
  selected_option_id TEXT NOT NULL,     -- e.g., "o1", "o2"
  selected_option_label TEXT NOT NULL,  -- e.g., "Oak", "Standard"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active tracking of the same product + option
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_tracking
  ON tracked_products (store_product_id, selected_option_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tracked_products_active
  ON tracked_products (is_active);

CREATE INDEX IF NOT EXISTS idx_tracked_products_store_id
  ON tracked_products (store_product_id);

-- 2. Scrape runs - tracks each full scrape execution
CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('cron', 'manual', 'headed')),
  total_products INTEGER NOT NULL DEFAULT 0,
  successful INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

-- 3. Price history - ONLY successful price/stock snapshots
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT '₹',
  stock INTEGER NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product
  ON price_history (tracked_product_id);

CREATE INDEX IF NOT EXISTS idx_price_history_scraped
  ON price_history (scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_history_product_scraped
  ON price_history (tracked_product_id, scraped_at DESC);

-- 4. Scrape logs - EVERY scrape attempt (success, retried, failed)
CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
  scrape_run_id UUID REFERENCES scrape_runs(id) ON DELETE SET NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_number INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'retried', 'failed')),
  price NUMERIC(10,2),       -- NULL for failed/retried attempts
  stock INTEGER,              -- NULL for failed/retried attempts
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_product
  ON scrape_logs (tracked_product_id);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_attempted
  ON scrape_logs (attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_run
  ON scrape_logs (scrape_run_id);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_attempted
  ON scrape_logs (tracked_product_id, attempted_at DESC);
