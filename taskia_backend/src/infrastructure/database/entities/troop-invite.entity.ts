import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/**
 * Índices únicos parciales (no los recrea TypeORM; synchronize está apagado):
 * uq_troop_invites_pending_invite, uq_troop_invites_pending_request.
 */
@Entity({ name: 'troop_invites' })
export class TroopInvite {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  troopId!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  fromUserId!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  toUserId!: number

  @Column({ type: 'text', default: 'invite' })
  direction!: string

  @Column({ type: 'text', default: 'pending' })
  status!: string

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt!: Date | null
}
