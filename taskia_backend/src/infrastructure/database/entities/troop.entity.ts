import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'troops' })
export class Troop {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'varchar', length: 80 })
  name!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'varchar', length: 40, default: 'rocky_blue' })
  planetStyleId!: string

  @Column({ type: 'int', default: 0 })
  planetSeed!: number

  @Column({ type: 'jsonb', nullable: true })
  planetParams!: unknown | null

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
