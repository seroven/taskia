import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { bigintTransformer, civilDateTransformer } from '../column-types.js'

@Entity({ name: 'student_daily_summaries' })
@Unique('uq_student_daily_summaries', ['studentId', 'summaryDate'])
export class StudentDailySummary {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  studentId!: number

  @Column({ type: 'date', transformer: civilDateTransformer })
  summaryDate!: string

  @Column({ type: 'text' })
  summaryText!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
