import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'study_challenge_answers' })
@Unique('uq_study_challenge_answers_question', ['questionId'])
export class StudyChallengeAnswer {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  questionId!: number

  @Column({ type: 'text', nullable: true })
  userAnswer!: string | null

  /** Foto de cómo resolvió la pregunta práctica. */
  @Column({ type: 'text', nullable: true })
  solutionImageUrl!: string | null

  @Column({ type: 'boolean', nullable: true })
  isCorrect!: boolean | null

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  answeredAt!: Date
}
