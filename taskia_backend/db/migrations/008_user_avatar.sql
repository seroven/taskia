-- Avatar y marco del explorador (app-wide; UI Tropas primero).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_kind TEXT NOT NULL DEFAULT 'preset',
  ADD COLUMN IF NOT EXISTS avatar_preset_id VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS avatar_file VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS frame_id VARCHAR(40) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_users_avatar_kind'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT ck_users_avatar_kind
      CHECK (avatar_kind IN ('preset', 'upload'));
  END IF;
END $$;

UPDATE users
SET avatar_preset_id = 'rocket'
WHERE avatar_kind = 'preset' AND avatar_preset_id IS NULL;
