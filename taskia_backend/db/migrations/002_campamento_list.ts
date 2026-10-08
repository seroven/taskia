import type { Client } from 'pg'

/**
 * Campamento lista: needs_help, tres estados, sin dificultad ni kanban.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS needs_help BOOLEAN NOT NULL DEFAULT FALSE
  `)

  await client.query(`
    UPDATE tasks t
    SET needs_help = TRUE
    WHERE t.study_passed = TRUE
       OR t.status = 'studying'
       OR EXISTS (
         SELECT 1 FROM difficulties d
         WHERE d.id = t.difficulty_id AND d.code = 'high'
       )
  `)

  await client.query(`
    UPDATE tasks SET status = 'pending' WHERE status = 'in_progress'
  `)

  await client.query(`
    UPDATE tasks SET status = 'done' WHERE study_passed = TRUE AND status <> 'done'
  `)

  await client.query(`
    ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check
  `)
  await client.query(`
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('pending', 'studying', 'done'))
  `)

  await client.query(`DROP INDEX IF EXISTS idx_tasks_user_status_order`)
  await client.query(`DROP INDEX IF EXISTS idx_tasks_difficulty_id`)

  await client.query(`
    ALTER TABLE tasks
      DROP COLUMN IF EXISTS difficulty_id,
      DROP COLUMN IF EXISTS board_order,
      DROP COLUMN IF EXISTS study_passed
  `)

  await client.query(`DROP TABLE IF EXISTS difficulties`)

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due
      ON tasks (user_id, status, due_date)
  `)
}
