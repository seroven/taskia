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

  /** Avatar armado por piezas (ver `modules/auth/lib/avatar-config.ts`). `null` hasta que el usuario lo crea. */
  @Column({ type: 'jsonb', nullable: true })
  avatarConfig!: unknown

  @Column({ type: 'varchar', length: 40, default: 'none' })
  frameId!: string

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
