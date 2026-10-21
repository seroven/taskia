import type { Client } from 'pg'

/**
 * La tripulación acumula su propia experiencia (`troops.xp_total`): cada XP que gana un miembro mientras está en ella
 * se suma aquí y no se resta nunca, así el nivel de la tripulación solo sube aunque entren o salgan miembros.
 * Las tripulaciones existentes arrancan con el XP total que hoy suman sus miembros activos.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`ALTER TABLE troops ADD COLUMN IF NOT EXISTS xp_total BIGINT NOT NULL DEFAULT 0`)
  await client.query(`
    UPDATE troops t
       SET xp_total = COALESCE((
         SELECT SUM(u.xp_total)
           FROM troop_members tm
           JOIN users u ON u.id = tm.user_id
          WHERE tm.troop_id = t.id AND tm.left_at IS NULL
       ), 0)
     WHERE t.xp_total = 0
  `)
}
