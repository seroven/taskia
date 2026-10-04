import { Column, Entity, PrimaryColumn } from 'typeorm'

/** PK (scope, difficulty). */
@Entity({ name: 'study_challenge_presets' })
export class StudyChallengePreset {
  @PrimaryColumn({ type: 'text' })
  scope!: string

  @PrimaryColumn({ type: 'text' })
  difficulty!: string

  @Column({ type: 'int' })
  questionCount!: number

  @Column({ type: 'varchar', length: 40 })
  label!: string
}
