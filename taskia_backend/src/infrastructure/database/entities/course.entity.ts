import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'courses' })
@Unique('uq_courses_user_name', ['userId', 'name'])
@Unique('uq_courses_id_user', ['id', 'userId'])
export class Course {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  userId!: number

  @Column({ type: 'varchar', length: 120 })
  name!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date
}
