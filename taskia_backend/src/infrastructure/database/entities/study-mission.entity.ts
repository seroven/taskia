import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'study_missions' })
@Unique('uq_study_missions_id_world', ['id', 'worldId'])
export class StudyMission {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  worldId!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  courseId!: number

  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Column({ type: 'text', nullable: true })
  description!: string | null

  @Column({ type: 'text', default: 'pending' })
  status!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'bigint', nullable: true, transformer: bigintTransformer })
  sourceMissionId!: number | null

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
