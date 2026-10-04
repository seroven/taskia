-- Apariencia procedural del planeta de cada tropa (sin imagen subida).

ALTER TABLE troops
  ADD COLUMN IF NOT EXISTS planet_style_id VARCHAR(40) NOT NULL DEFAULT 'rocky_blue',
  ADD COLUMN IF NOT EXISTS planet_seed INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planet_params JSONB NULL;

-- Seed determinista por id para tropas ya existentes.
UPDATE troops
SET planet_seed = (id % 2147483647)::int
WHERE planet_seed = 0;
