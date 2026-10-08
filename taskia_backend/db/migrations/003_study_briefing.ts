import type { Client } from 'pg'

/**
 * Briefing previo al estudio: relato acumulado en tareas (proyectos)
 * y flag briefing_ready en sesiones de tarea y misión.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`
    ALTER TABLE study_sessions
      ADD COLUMN IF NOT EXISTS notebook_context TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS briefing_ready BOOLEAN NOT NULL DEFAULT FALSE
  `)

  await client.query(`
    ALTER TABLE study_mission_sessions
      ADD COLUMN IF NOT EXISTS briefing_ready BOOLEAN NOT NULL DEFAULT FALSE
  `)
}
