import type { Client } from 'pg'

const KINDS = [
  'task_tutor',
  'mission_tutor',
  'transcribe',
  'challenge_generate',
  'challenge_grade',
  'parent_tutor',
  'planet_generate',
  'daily_summary',
] as const

export async function up(client: Client): Promise<void> {
  const list = KINDS.map((kind) => `'${kind}'`).join(', ')
  await client.query(`ALTER TABLE llm_usage DROP CONSTRAINT IF EXISTS llm_usage_kind_check`)
  await client.query(`
    ALTER TABLE llm_usage
      ADD CONSTRAINT llm_usage_kind_check CHECK (kind IN (${list}))
  `)
}
