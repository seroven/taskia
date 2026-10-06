import type { Client } from 'pg'

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE study_sessions
      ADD COLUMN IF NOT EXISTS exercise_brief TEXT
  `)
  await client.query(`
    ALTER TABLE study_mission_sessions
      ADD COLUMN IF NOT EXISTS exercise_brief TEXT
  `)
}
