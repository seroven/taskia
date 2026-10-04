import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'study_worlds' })
@Unique('uq_study_worlds_id_user', ['id', 'userId'])
export class StudyWorld {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  userId!: number

  @Column({ type: 'varchar', length: 120 })
  title!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
