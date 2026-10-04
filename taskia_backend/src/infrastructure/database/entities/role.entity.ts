import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'

@Entity({ name: 'roles' })
@Unique('uq_roles_code', ['code'])
@Unique('uq_roles_name', ['name'])
export class Role {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'varchar', length: 20 })
  code!: string

  @Column({ type: 'varchar', length: 50 })
  name!: string

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date
}
