import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'users' })
@Unique('uq_users_username', ['username'])
@Unique('uq_users_email', ['email'])
export class User {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'varchar', length: 50 })
  username!: string

  @Column({ type: 'varchar', length: 255 })
  email!: string

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string

  @Column({ type: 'bigint', transformer: bigintTransformer })
  roleId!: number

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'int', default: 1 })
  level!: number

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  xpTotal!: number

  @Column({ type: 'text', default: 'preset' })
  avatarKind!: string

  @Column({ type: 'varchar', length: 40, nullable: true })
  avatarPresetId!: string | null

  @Column({ type: 'varchar', length: 120, nullable: true })
  avatarFile!: string | null

  @Column({ type: 'varchar', length: 40, nullable: true })
  frameId!: string | null

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
