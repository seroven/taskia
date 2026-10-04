import { Column, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/** PK = user_id. No hay id propio. */
@Entity({ name: 'user_study_memory' })
export class UserStudyMemory {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  userId!: number

  @Column({ type: 'text' })
  memorySummary!: string

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
