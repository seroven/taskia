import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { bigintTransformer, civilDateTransformer } from '../column-types.js'

@Entity({ name: 'xp_awards' })
@Unique('uq_xp_awards_user_source', ['userId', 'sourceType', 'sourceId'])
export class XpAward {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  userId!: number

  @Column({ type: 'text' })
  sourceType!: string

  @Column({ type: 'bigint', transformer: bigintTransformer })
  sourceId!: number

  @Column({ type: 'int' })
  amount!: number

  @Column({ type: 'int', nullable: true })
  effortScore!: number | null

  @Column({ type: 'varchar', length: 200, nullable: true })
  reason!: string | null

  @Column({ type: 'date', transformer: civilDateTransformer })
  weekStart!: string

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date
}
