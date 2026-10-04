import type { Client } from 'pg'

export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE parent_chat_messages
      ADD COLUMN IF NOT EXISTS chat_date DATE
  `)
  await client.query(`
    UPDATE parent_chat_messages
    SET chat_date = (created_at AT TIME ZONE 'America/Lima')::date
    WHERE chat_date IS NULL
  `)
  await client.query(`
    ALTER TABLE parent_chat_messages
      ALTER COLUMN chat_date SET NOT NULL
  `)
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_parent_chat_messages_day
      ON parent_chat_messages (parent_id, student_id, chat_date, id)
      WHERE is_active
  `)
}
