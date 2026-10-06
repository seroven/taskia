import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'study_challenges' })
export class StudyChallenge {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  userId!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  worldId!: number

  @Column({ type: 'text' })
  scope!: string

  @Column({ type: 'bigint', nullable: true, transformer: bigintTransformer })
  missionId!: number | null

  @Column({ type: 'bigint', nullable: true, transformer: bigintTransformer })
  courseId!: number | null

  @Column({ type: 'text' })
  difficulty!: string

  @Column({ type: 'int' })
  questionCount!: number

  @Column({ type: 'text', default: 'in_progress' })
  status!: string

  @Column({ type: 'smallint', nullable: true })
  score!: number | null

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  startedAt!: Date

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date | null

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  elapsedMs!: number

  @Column({ type: 'jsonb', nullable: true })
  progressJson!: unknown | null
}
