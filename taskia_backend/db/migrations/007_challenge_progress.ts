import type { Client } from 'pg'

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE study_challenges
      ADD COLUMN IF NOT EXISTS elapsed_ms BIGINT NOT NULL DEFAULT 0
  `)
  await client.query(`
    ALTER TABLE study_challenges
      ADD COLUMN IF NOT EXISTS progress_json JSONB
  `)
}
