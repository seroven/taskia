import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

/** Hueco de vocabulario. Sin usuario y sin texto del niño. */
@Entity({ name: 'board_gaps' })
export class BoardGap {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'text' })
  code!: string

  @Column({ type: 'varchar', length: 40 })
  gapKey!: string

  @Column({ type: 'text' })
  origin!: string

  @Column({ type: 'int', default: 0 })
  attempts!: number
}
