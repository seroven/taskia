import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

@Entity({ name: 'llm_usage' })
export class LlmUsage {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'bigint', transformer: bigintTransformer })
  userId!: number

  @Column({ type: 'text' })
  kind!: string

  @Column({ type: 'varchar', length: 80 })
  model!: string

  @Column({ type: 'int', default: 0 })
  promptTokens!: number

  @Column({ type: 'int', default: 0 })
  outputTokens!: number

  @Column({ type: 'int', default: 0 })
  totalTokens!: number

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date
}
