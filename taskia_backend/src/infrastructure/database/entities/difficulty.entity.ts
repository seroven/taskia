import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'

@Entity({ name: 'difficulties' })
@Unique('uq_difficulties_code', ['code'])
@Unique('uq_difficulties_name', ['name'])
export class Difficulty {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'varchar', length: 20 })
  code!: string

  @Column({ type: 'varchar', length: 50 })
  name!: string

  @Column({ type: 'int', default: 0 })
  sortOrder!: number

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date
}
