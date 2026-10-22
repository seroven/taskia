import type { Client } from 'pg'

/**
 * La tripulación puede elegir un aura para su nave (`troops.aura_id`): un resplandor que se dibuja detrás de ella en
 * la galaxia y en la ficha. Es opcional (NULL = sin aura) y se desbloquea con el nivel de la tripulación; la lista de
 * auras y sus niveles vive en `src/modules/troops/lib/auras.ts`, no en la base.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`ALTER TABLE troops ADD COLUMN IF NOT EXISTS aura_id VARCHAR(24)`)
}
