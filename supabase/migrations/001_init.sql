-- supabase/migrations/001_init.sql
-- The Negotiator T1 schema (home_cleaning vertical)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE job_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  sqft INTEGER NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  frequency TEXT NOT NULL,
  add_ons JSONB NOT NULL DEFAULT '[]'::jsonb,
  supplies_provided BOOLEAN NOT NULL DEFAULT false,
  pets BOOLEAN NOT NULL DEFAULT false,
  access_notes TEXT NOT NULL DEFAULT '',
  condition_notes TEXT NOT NULL DEFAULT '',
  geo TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  leverage_quote_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendor ids are TEXT so demo / directory ids (e.g. vendor-tough) match FKs.
CREATE TABLE vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  rating NUMERIC NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  insured_bonded BOOLEAN NOT NULL DEFAULT false,
  has_guarantee BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL
);

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_spec_id UUID NOT NULL REFERENCES job_specs(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  round SMALLINT NOT NULL CHECK (round IN (1, 2)),
  outcome TEXT,
  recording_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  job_spec_id UUID NOT NULL REFERENCES job_specs(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id),
  base_price NUMERIC NOT NULL,
  normalized_total NUMERIC NOT NULL,
  pricing_model TEXT NOT NULL,
  red_flag BOOLEAN NOT NULL DEFAULT false,
  round SMALLINT NOT NULL CHECK (round IN (1, 2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quote_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  fee_type TEXT NOT NULL,
  amount NUMERIC NOT NULL
);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  authorizing_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  price_before NUMERIC,
  price_after NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_job_spec_id ON calls(job_spec_id);
CREATE INDEX idx_quotes_job_spec_id ON quotes(job_spec_id);
CREATE INDEX idx_audit_events_call_id ON audit_events(call_id);

