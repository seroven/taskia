import type { Client } from 'pg'

/**
 * El avatar pasa a ser un dibujo armado por piezas (como la nave): `avatar_config` en el usuario. Se abandonan los
 * emojis y las fotos subidas. Los marcos son del usuario y se desbloquean por nivel: los anillos viejos pasan a
 * `ring` y los de rol de la tripulación (`frame_captain`, `frame_copilot`) a `none`.
 */
export async function up(client: Client): Promise<void> {
  await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_config JSONB NULL`)
  await client.query(`UPDATE users SET frame_id = 'ring' WHERE frame_id IN ('ring_blue', 'ring_green')`)
  await client.query(`UPDATE users SET frame_id = 'none' WHERE frame_id IS NULL OR frame_id NOT IN ('none', 'ring')`)
  await client.query(`ALTER TABLE users ALTER COLUMN frame_id SET DEFAULT 'none'`)
  await client.query(`ALTER TABLE users ALTER COLUMN frame_id SET NOT NULL`)
  await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_avatar_kind`)
  await client.query(`
    ALTER TABLE users
      DROP COLUMN IF EXISTS avatar_kind,
      DROP COLUMN IF EXISTS avatar_preset_id,
      DROP COLUMN IF EXISTS avatar_file
  `)
}
