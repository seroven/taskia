import { Column, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/** PK = parent_id. */
@Entity({ name: 'parent_notify_prefs' })
export class ParentNotifyPrefs {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  parentId!: number

  @Column({ type: 'text', nullable: true })
  whatsappE164!: string | null

  @Column({ type: 'boolean', default: true })
  notifyTaskDone!: boolean

  @Column({ type: 'boolean', default: true })
  notifyTaskStudyDone!: boolean

  @Column({ type: 'boolean', default: true })
  notifyMissionDone!: boolean

  @Column({ type: 'boolean', default: true })
  notifyCourseDone!: boolean

  @Column({ type: 'boolean', default: true })
  notifyWorldDone!: boolean

  @Column({ type: 'boolean', default: true })
  notifyChallengeDone!: boolean

  @Column({ type: 'boolean', default: true })
  notifyInactivity!: boolean

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
