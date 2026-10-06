import { Column, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/** PK = task_id. No hay id propio. */
@Entity({ name: 'study_sessions' })
export class StudySession {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  taskId!: number

  @Column({ type: 'text', default: 'understanding' })
  tutorPhase!: string

  @Column({ type: 'text' })
  topicSummary!: string

  @Column({ type: 'text' })
  contextSummary!: string

  @Column({ type: 'int', default: 0 })
  hintsLevel!: number

  /** Desarrollo privado del ejercicio. No se manda al navegador. */
  @Column({ type: 'text', nullable: true })
  exerciseBrief!: string | null

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
