import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'study_mission_messages' })
export class StudyMissionMessage {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  missionId!: number

  @Column({ type: 'text' })
  role!: string

  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'boolean', default: false })
  fromVoice!: boolean

  @Column({ type: 'int', nullable: true })
  replyLatencySeconds!: number | null

  @Column({ type: 'boolean', default: false })
  isPause!: boolean

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date
}
