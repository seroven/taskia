import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'parent_chat_messages' })
export class ParentChatMessage {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  parentId!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  studentId!: number

  @Column({ type: 'text' })
  role!: string

  @Column({ type: 'text' })
  content!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date
}
