import { Column, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/** PK = mission_id. No hay created_at. */
@Entity({ name: 'study_mission_sessions' })
export class StudyMissionSession {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  missionId!: number

  @Column({ type: 'text', default: 'understanding' })
  tutorPhase!: string

  @Column({ type: 'text' })
  topicSummary!: string

  @Column({ type: 'text' })
  contextSummary!: string

  @Column({ type: 'text', default: '' })
  notebookContext!: string

  @Column({ type: 'int', default: 0 })
  hintsLevel!: number

  /** Desarrollo privado del ejercicio. No se manda al navegador. */
  @Column({ type: 'text', nullable: true })
  exerciseBrief!: string | null

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
