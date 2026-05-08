-- Frost Creek Friday Golf Signup Schema
-- Run this in your Supabase SQL editor

-- Players (stored profile, persists across weeks)
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  ghin_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events (one per Friday)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  -- open | closed | groups_generated | notified
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Signups (one per player per event)
CREATE TABLE IF NOT EXISTS signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tee_preference TEXT NOT NULL,
  -- copper | creek | creek_frost | frost | frost_gold | gold
  status TEXT NOT NULL DEFAULT 'confirmed',
  -- confirmed | waitlist | cancelled
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, event_id)
);

-- Groups (generated Thursday, one row per group/tee time)
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tee_time TIME NOT NULL,
  group_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members (which players are in which group)
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  signup_id UUID NOT NULL REFERENCES signups(id) ON DELETE CASCADE
);

-- Admin accounts
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signups_event_id ON signups(event_id);
CREATE INDEX IF NOT EXISTS idx_signups_player_id ON signups(player_id);
CREATE INDEX IF NOT EXISTS idx_signups_status ON signups(status);
CREATE INDEX IF NOT EXISTS idx_groups_event_id ON groups(event_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- Auto-update players.updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
