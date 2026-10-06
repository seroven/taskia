import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'study_challenge_questions' })
export class StudyChallengeQuestion {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  challengeId!: number

  @Column({ type: 'bigint', nullable: true, transformer: bigintTransformer })
  missionId!: number | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'text' })
  kind!: string

  @Column({ type: 'text' })
  prompt!: string

  @Column({ type: 'jsonb', nullable: true })
  optionsJson!: unknown | null

  @Column({ type: 'text' })
  answerKey!: string

  /** Foto del niño que es el enunciado, cuando la pregunta es práctica. */
  @Column({ type: 'text', nullable: true })
  referenceImageUrl!: string | null

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date
}
