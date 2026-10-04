import { Column, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/** PK (world_id, course_id). */
@Entity({ name: 'study_world_courses' })
export class StudyWorldCourse {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  worldId!: number

  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  courseId!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  userId!: number

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date
}
