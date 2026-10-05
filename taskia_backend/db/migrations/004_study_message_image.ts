import type { Client } from 'pg'

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE study_messages
      ADD COLUMN IF NOT EXISTS image_url TEXT
  `)
  await client.query(`
    ALTER TABLE study_mission_messages
      ADD COLUMN IF NOT EXISTS image_url TEXT
  `)
}
