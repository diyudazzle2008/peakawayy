CREATE TABLE public.crowd_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  place_key TEXT NOT NULL,
  place_name TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('quiet','moderate','busy','very_busy')),
  note TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX crowd_reports_place_key_idx ON public.crowd_reports (place_key, created_at DESC);
CREATE INDEX crowd_reports_created_at_idx ON public.crowd_reports (created_at DESC);

GRANT SELECT, INSERT ON public.crowd_reports TO anon;
GRANT SELECT, INSERT ON public.crowd_reports TO authenticated;
GRANT ALL ON public.crowd_reports TO service_role;

ALTER TABLE public.crowd_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view crowd reports" ON public.crowd_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can submit crowd reports" ON public.crowd_reports FOR INSERT TO anon, authenticated WITH CHECK (true);