import type { Client } from 'pg'
import {
  generateShipFromSeed,
  sanitizeShipConfig,
} from '../../src/modules/troops/lib/ship-config.js'

/**
 * Las tripulaciones pasan de planeta a nave: `ship_config` reemplaza a `planet_style_id`, `planet_seed`,
 * `planet_params` y `planet_config`. Cada tripulación recibe una nave estable a partir de su id y conserva
 * los colores de su planeta. La IA de naves usa el uso `ship_generate` en lugar de `planet_generate`.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`ALTER TABLE troops ADD COLUMN IF NOT EXISTS ship_config JSONB`)

  const hasPlanet = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'troops' AND column_name = 'planet_config'`,
  )
  const rows = await client.query<{ id: string; name: string; planet_config?: unknown }>(
    `SELECT id, name${hasPlanet.rowCount ? ', planet_config' : ''} FROM troops WHERE ship_config IS NULL`,
  )

  for (const row of rows.rows) {
    const seed = `troop-${row.id}`
    const base = generateShipFromSeed(seed)
    const planet = row.planet_config as { palette?: Record<string, string> } | null | undefined
    const colors = planet?.palette
    const ship = sanitizeShipConfig(
      colors
        ? {
            ...base,
            palette: { hull: colors.base, trim: colors.secondary, accent: colors.accent, glass: colors.glow },
          }
        : base,
      seed,
    )
    await client.query(`UPDATE troops SET ship_config = $2::jsonb WHERE id = $1`, [row.id, JSON.stringify(ship)])
  }
  await client.query(`ALTER TABLE troops ALTER COLUMN ship_config SET NOT NULL`)

  await client.query(`ALTER TABLE llm_usage DROP CONSTRAINT IF EXISTS llm_usage_kind_check`)
  await client.query(`UPDATE llm_usage SET kind = 'ship_generate' WHERE kind = 'planet_generate'`)
  await client.query(`
    ALTER TABLE llm_usage ADD CONSTRAINT llm_usage_kind_check CHECK (kind IN (
      'task_tutor',
      'mission_tutor',
      'transcribe',
      'challenge_generate',
      'challenge_grade',
      'challenge_photo_grade',
      'parent_tutor',
      'ship_generate',
      'daily_summary',
      'board_intent',
      'board_facts',
      'speak'
    ))
  `)

  await client.query(`
    ALTER TABLE troops
      DROP COLUMN IF EXISTS planet_style_id,
      DROP COLUMN IF EXISTS planet_seed,
      DROP COLUMN IF EXISTS planet_params,
      DROP COLUMN IF EXISTS planet_config
  `)
}
