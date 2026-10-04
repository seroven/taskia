import { Column, Entity, PrimaryColumn } from 'typeorm'
import { bigintTransformer } from '../column-types.js'

/** PK = mission_id. board_json es TEXT, no jsonb. */
@Entity({ name: 'study_mission_boards' })
export class StudyMissionBoard {
  @PrimaryColumn({ type: 'bigint', transformer: bigintTransformer })
  missionId!: number

  @Column({ type: 'text' })
  boardJson!: string

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date
}
