import { Column, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/** PK (parent_id, student_id). */
@Entity({ name: 'parent_student_links' })
export class ParentStudentLink {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  parentId!: number

  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  studentId!: number

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
