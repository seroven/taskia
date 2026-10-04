-- Invites push (Capitán/Copiloto → explorador) y requests pull (explorador → tropa).

ALTER TABLE troop_invites
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'invite';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_troop_invites_direction'
  ) THEN
    ALTER TABLE troop_invites
      ADD CONSTRAINT ck_troop_invites_direction
      CHECK (direction IN ('invite', 'request'));
  END IF;
END $$;

DROP INDEX IF EXISTS uq_troop_invites_pending;

CREATE UNIQUE INDEX IF NOT EXISTS uq_troop_invites_pending_invite
  ON troop_invites (troop_id, to_user_id)
  WHERE status = 'pending' AND direction = 'invite';

CREATE UNIQUE INDEX IF NOT EXISTS uq_troop_invites_pending_request
  ON troop_invites (troop_id, from_user_id)
  WHERE status = 'pending' AND direction = 'request';

CREATE INDEX IF NOT EXISTS idx_troop_invites_troop_requests
  ON troop_invites (troop_id)
  WHERE status = 'pending' AND direction = 'request';
