/*
# WapiLeo core schema

1. Overview
- Creates the tables that power WapiLeo's live, crowd-sourced vibe feed.
- Single-tenant (no sign-in): all data is intentionally public/shared, so
  policies use `TO anon, authenticated` with `USING (true)`/`WITH CHECK (true)`.
- Seeds 12 curated Dar es Salaam venues so first-time testers never see an
  empty or error state.

2. New Tables
- `places`: curated venues. id (text PK), name, area, price, line, image,
  base_score, base_state, categories (text[]), tags (text[]), created_at,
  updated_at.
- `vibe_reports`: crowd vibe reports. id (uuid PK), place_id (FK -> places),
  score (int), label (text), crowd_level (text), music (text), entry (text),
  created_at. Index on (place_id, created_at) for the live-window query.
- `place_confirms`: "Still hot" / "Confirm" upvotes. id (uuid PK), place_id
  (FK -> places), created_at. Index on (place_id, created_at). Used to verify
  reports and push back against stale/fake ones.
- `venue_claims`: B2B pipeline intake. id (uuid PK), place_id (nullable FK ->
  places, null for new venues), venue_name, contact_name, contact_phone,
  event_title, event_details, submitted_at.
- `feedback`: in-app feedback/bug reports. id (uuid PK), kind (text), message
  (text), page (text), submitted_at.

3. Security
- RLS enabled on every table.
- All tables are public/shared (no sign-in app), so policies allow
  anon + authenticated to read and write. SELECT/INSERT are open; UPDATE/DELETE
  are intentionally NOT granted to anon (only service-role can manage curated
  places and moderate content), except venue_claims/feedback which are
  insert+read-only from the client.

4. Important notes
- `places` is read-only from the client (SELECT only) to keep curated data
  safe; writes happen via the service role / seed.
- `vibe_reports` and `place_confirms` are append-only from the client.
- `venue_claims` and `feedback` are insert-only from the client (no SELECT
  needed by the app, but a permissive SELECT policy is included for future
  admin tooling).
*/

-- Places ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS places (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  area        text NOT NULL,
  price       text NOT NULL,
  line        text NOT NULL,
  image       text NOT NULL,
  base_score  int  NOT NULL,
  base_state  text NOT NULL,
  categories  text[] NOT NULL DEFAULT '{}',
  tags        text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_places" ON places;
CREATE POLICY "anon_read_places" ON places FOR SELECT
  TO anon, authenticated USING (true);

-- Vibe reports ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS vibe_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    text NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  score       int  NOT NULL,
  label       text NOT NULL,
  crowd_level text,
  music       text,
  entry       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vibe_reports_place_created_idx
  ON vibe_reports (place_id, created_at DESC);

ALTER TABLE vibe_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_reports" ON vibe_reports;
CREATE POLICY "anon_read_reports" ON vibe_reports FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_reports" ON vibe_reports;
CREATE POLICY "anon_insert_reports" ON vibe_reports FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Place confirms (Still hot / Confirm) -----------------------------------
CREATE TABLE IF NOT EXISTS place_confirms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    text NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS place_confirms_place_created_idx
  ON place_confirms (place_id, created_at DESC);

ALTER TABLE place_confirms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_confirms" ON place_confirms;
CREATE POLICY "anon_read_confirms" ON place_confirms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_confirms" ON place_confirms;
CREATE POLICY "anon_insert_confirms" ON place_confirms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Venue claims (B2B pipeline) -------------------------------------------
CREATE TABLE IF NOT EXISTS venue_claims (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id      text REFERENCES places(id) ON DELETE SET NULL,
  venue_name    text NOT NULL,
  contact_name  text NOT NULL,
  contact_phone text NOT NULL,
  event_title   text,
  event_details text,
  submitted_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE venue_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_claims" ON venue_claims;
CREATE POLICY "anon_read_claims" ON venue_claims FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_claims" ON venue_claims;
CREATE POLICY "anon_insert_claims" ON venue_claims FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Feedback --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL,
  message      text NOT NULL,
  page         text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_feedback" ON feedback;
CREATE POLICY "anon_read_feedback" ON feedback FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_feedback" ON feedback;
CREATE POLICY "anon_insert_feedback" ON feedback FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Seed 12 curated venues ------------------------------------------------
INSERT INTO places (id, name, area, price, line, image, base_score, base_state, categories, tags) VALUES
  ('warehouse', 'Warehouse', 'Masaki', '100k+', 'Late night, loud fits, Afrobeats, Amapiano, and zero sitting still.', 'https://images.unsplash.com/photo-1571266028243-d220c6a7edbf?auto=format&fit=crop&w=1200&q=80', 95, 'Imeamka', ARRAY['all','music'], ARRAY['Amapiano','Dress smart','Late night']),
  ('coral', 'Coral Beach', 'Masaki', '40k - 100k', 'Ocean air, cocktails, and date-night photos that do the talking.', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 91, 'Moto sana', ARRAY['all','date','chill','beach','food'], ARRAY['Great photos','Date friendly','Beach breeze']),
  ('level8', 'Level 8 Rooftop', 'Kivukoni', '100k+', 'Rooftop sundowners, DJ sets, and the skyline doing its thing.', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80', 90, 'Imeamka', ARRAY['all','music','date','chill'], ARRAY['Rooftop','Sundowners','DJ sets']),
  ('akemi', 'Akemi Revolving Restaurant', 'Upanga', '100k+', 'Dinner with a slow 360-degree view of the city lights.', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80', 88, 'Kuna vibe', ARRAY['all','date','food','chill'], ARRAY['City views','Fine dining','Date friendly']),
  ('samaki', 'Samaki Samaki', 'Mlimani City', '40k - 100k', 'Dinner, live music, and the table next to you probably knows the DJ.', 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80', 87, 'Kuna vibe', ARRAY['all','music','food','date'], ARRAY['Live band','Dinner','Inajaa mapema']),
  ('mamboz', 'Mamboz Corner BBQ', 'Kariakoo', 'Under 40k', 'Legendary grilled mishkaki and the smoke that pulls a crowd.', 'https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1200&q=80', 84, 'Moto sana', ARRAY['all','food','chill'], ARRAY['Mishkaki','Street food','Budget friendly']),
  ('slipway', 'The Slipway', 'Msasani', '40k - 100k', 'Sunset walk, dessert, calm talk, and a view that fixes the plan.', 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80', 83, 'Chill tu', ARRAY['all','date','chill','beach','food'], ARRAY['Sunset','Quiet-ish','Walkable']),
  ('kawe', 'Kawe Beach', 'Kawe', '40k - 100k', 'Wide sand, easy waves, and sunsets that end the week right.', 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', 80, 'Chill tu', ARRAY['all','beach','chill','date'], ARRAY['Beach day','Sunset','Relaxed']),
  ('escape', 'Escape One', 'Mikocheni', 'Under 40k', 'Games, light food, and an easy hangout when nobody wants pressure.', 'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80', 78, 'Inajaa', ARRAY['all','games','chill','date'], ARRAY['Games','Low pressure','Group plan']),
  ('nyama', 'Moyo Nyama', 'Sinza', 'Under 40k', 'Nyama, football noise, and the kind of plan that becomes a story.', 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80', 76, 'Kuna watu', ARRAY['all','food','chill'], ARRAY['Budget friendly','Football','Nyama choma']),
  ('mlimani-bowl', 'Mlimani Bowling', 'Mikocheni', '40k - 100k', 'Lanes, arcade noise, and an easy win for indecisive crews.', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80', 73, 'Inajaa', ARRAY['all','games','chill'], ARRAY['Bowling','Arcade','Group plan']),
  ('george-dragon', 'George & Dragon', 'Masaki', '40k - 100k', 'Pub pints, big-match nights, and a pool table with history.', 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80', 71, 'Kuna watu', ARRAY['all','chill','food','games'], ARRAY['Pub','Sports','Pool table'])
ON CONFLICT (id) DO NOTHING;
