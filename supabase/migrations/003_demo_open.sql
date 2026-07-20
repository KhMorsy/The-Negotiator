-- Demo-open RLS + Realtime + seed vendors for The Negotiator
-- Apply after 001_init.sql (and optionally 002_kb_vector.sql).

INSERT INTO vendors (id, name, phone, rating, review_count, insured_bonded, has_guarantee, source)
VALUES
  ('vendor-tough', 'Sparkle Pro Clean', '+15125550101', 4.7, 312, true, true, 'fake'),
  ('vendor-lowball', 'Budget Shine Co', '+15125550102', 3.9, 48, false, false, 'fake'),
  ('vendor-upseller', 'Premium Nest Services', '+15125550103', 4.9, 890, true, true, 'fake')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE job_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. Anon may read calls for Realtime dashboard.
DROP POLICY IF EXISTS calls_anon_select ON calls;
CREATE POLICY calls_anon_select ON calls
  FOR SELECT
  TO anon
  USING (true);

-- Realtime: ignore if already added
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE calls;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
