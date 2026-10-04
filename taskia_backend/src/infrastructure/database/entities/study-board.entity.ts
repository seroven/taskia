import { Column, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/** PK = task_id. board_json es TEXT, no jsonb. */
@Entity({ name: 'study_boards' })
export class StudyBoard {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  taskId!: number

  @Column({ type: 'text' })
  boardJson!: string

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
