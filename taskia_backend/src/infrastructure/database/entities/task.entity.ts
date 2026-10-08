import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { bigintTransformer, civilDateTransformer } from '../column-types.js'

@Entity({ name: 'tasks' })
export class Task {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  userId!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  courseId!: number

  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'text', default: 'daily' })
  taskKind!: string

  @Column({ type: 'text', default: 'pending' })
  status!: string

  @Column({ type: 'boolean', default: false })
  needsHelp!: boolean

  @Column({ type: 'date', transformer: civilDateTransformer })
  dueDate!: string

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
