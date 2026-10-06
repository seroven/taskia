import type { Client } from 'pg'

const KINDS = [
  'task_tutor',
  'mission_tutor',
  'transcribe',
  'challenge_generate',
  'challenge_grade',
  'challenge_photo_grade',
  'parent_tutor',
  'planet_generate',
  'daily_summary',
  'board_intent',
  'board_facts',
  'board_image',
] as const

export async function up(client: Client): Promise<void> {
  await client.query(`
    UPDATE study_challenges
    SET status = 'abandoned'
    WHERE status = 'in_progress'
      AND id IN (
        SELECT challenge_id
        FROM study_challenge_questions
        WHERE kind = 'board_prompt'
      )
  `)
  await client.query(`
    UPDATE study_challenge_questions
    SET kind = 'multiple_choice',
        prompt_draw_ops = NULL,
        requires_board = FALSE
    WHERE kind = 'board_prompt'
  `)
  await client.query(`
    ALTER TABLE study_challenge_questions
      DROP CONSTRAINT IF EXISTS study_challenge_questions_kind_check
  `)
  await client.query(`
    ALTER TABLE study_challenge_questions
      ADD CONSTRAINT study_challenge_questions_kind_check
      CHECK (kind IN ('multiple_choice', 'short_text', 'fill_blank'))
  `)
  await client.query(`
    ALTER TABLE study_challenge_questions
      DROP COLUMN IF EXISTS requires_board,
      DROP COLUMN IF EXISTS prompt_draw_ops,
      ADD COLUMN IF NOT EXISTS reference_image_url TEXT
  `)
  await client.query(`
    ALTER TABLE study_challenge_answers
      DROP COLUMN IF EXISTS board_json,
      ADD COLUMN IF NOT EXISTS solution_image_url TEXT
  `)
  await client.query(`DROP TABLE IF EXISTS study_boards`)
  await client.query(`DROP TABLE IF EXISTS study_mission_boards`)
  await client.query(`DROP TABLE IF EXISTS board_gaps`)
  await client.query(`
    ALTER TABLE study_sessions DROP COLUMN IF EXISTS pending_board_facts
  `)
  await client.query(`
    ALTER TABLE study_mission_sessions DROP COLUMN IF EXISTS pending_board_facts
  `)
  await client.query(`
    ALTER TABLE tasks
      DROP COLUMN IF EXISTS uses_board,
      DROP COLUMN IF EXISTS study_mode_chosen
  `)
  const list = KINDS.map((kind) => `'${kind}'`).join(', ')
  await client.query(`ALTER TABLE llm_usage DROP CONSTRAINT IF EXISTS llm_usage_kind_check`)
  await client.query(`
    ALTER TABLE llm_usage
      ADD CONSTRAINT llm_usage_kind_check CHECK (kind IN (${list}))
  `)
}
