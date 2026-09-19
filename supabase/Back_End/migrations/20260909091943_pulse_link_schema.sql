/*
# Pulse_Link — Profiles and Meeting History

1. New Tables
- `profiles`: extends auth.users with display_name and avatar_url.
  - id (uuid, PK, references auth.users)
  - display_name (text, not null)
  - avatar_url (text, nullable)
  - created_at (timestamptz)
- `meeting_history`: record of meetings the user participated in.
  - id (uuid, PK)
  - user_id (uuid, not null, defaults to auth.uid())
  - room_id (text, not null)
  - topic (text, nullable)
  - joined_at (timestamptz)
  - left_at (timestamptz, nullable)
  - duration_seconds (int, nullable)

2. Security
- RLS enabled on both tables.
- profiles: users can read any profile (need to see other participants) but only update their own. INSERT is self-service (user creates their own profile row).
- meeting_history: fully owner-scoped — users can only CRUD their own records.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all"
ON profiles FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own"
ON profiles FOR DELETE
TO authenticated USING (auth.uid() = id);


CREATE TABLE IF NOT EXISTS meeting_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  topic text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  duration_seconds int
);

ALTER TABLE meeting_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_select_own" ON meeting_history;
CREATE POLICY "history_select_own"
ON meeting_history FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "history_insert_own" ON meeting_history;
CREATE POLICY "history_insert_own"
ON meeting_history FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "history_update_own" ON meeting_history;
CREATE POLICY "history_update_own"
ON meeting_history FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "history_delete_own" ON meeting_history;
CREATE POLICY "history_delete_own"
ON meeting_history FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_meeting_history_user_id ON meeting_history(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_history_joined_at ON meeting_history(joined_at DESC);