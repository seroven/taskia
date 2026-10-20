import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ name: 'troops' })
export class Troop {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'BY DEFAULT' })
  id!: number

  @Column({ type: 'varchar', length: 80 })
  name!: string

  @Column({ type: 'boolean', default: true })
  isActive!: boolean

  /** La nave de la tripulación: ranuras de piezas y colores (ver modules/troops/lib/ship-config.ts). */
  @Column({ type: 'jsonb' })
  shipConfig!: unknown

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
