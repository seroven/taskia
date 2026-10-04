import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/**
 * Índices únicos parciales (no los recrea TypeORM; synchronize está apagado):
 * uq_troop_members_user_active, uq_troop_members_captain_active, uq_troop_members_copilot_active.
 */
@Entity({ name: 'troop_members' })
@Unique('uq_troop_members_troop_user', ['troopId', 'userId'])
export class TroopMember {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  troopId!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  userId!: number

  @Column({ type: 'text' })
  role!: string

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  joinedAt!: Date

  @Column({ type: 'timestamptz', nullable: true })
  leftAt!: Date | null
}
