import type { Client } from 'pg'

/**
 * Modo de estudio: teórico o práctico, clasificado una sola vez.
 * Vacío = todavía no clasificado.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE study_sessions
      ADD COLUMN IF NOT EXISTS study_mode TEXT NOT NULL DEFAULT ''
  `)
  await client.query(`
    ALTER TABLE study_sessions
      DROP CONSTRAINT IF EXISTS study_sessions_study_mode_check
  `)
  await client.query(`
    ALTER TABLE study_sessions
      ADD CONSTRAINT study_sessions_study_mode_check
      CHECK (study_mode IN ('', 'theoretical', 'practical'))
  `)

  await client.query(`
    ALTER TABLE study_mission_sessions
      ADD COLUMN IF NOT EXISTS study_mode TEXT NOT NULL DEFAULT ''
  `)
  await client.query(`
    ALTER TABLE study_mission_sessions
      DROP CONSTRAINT IF EXISTS study_mission_sessions_study_mode_check
  `)
  await client.query(`
    ALTER TABLE study_mission_sessions
      ADD CONSTRAINT study_mission_sessions_study_mode_check
      CHECK (study_mode IN ('', 'theoretical', 'practical'))
  `)
}
