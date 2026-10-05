import { AppDataSource } from '../../infrastructure/database/data-source.js'
import { BoardGap } from '../../infrastructure/database/entities/board-gap.entity.js'
import { normalizeGapKey } from './facts.js'

export type GapOrigin = 'study' | 'mission' | 'challenge'

export async function recordBoardGap(input: {
  code: string
  gapKey: string
  origin: GapOrigin
  attempts: number
}) {
  const repo = AppDataSource.getRepository(BoardGap)
  await repo
    .createQueryBuilder()
    .delete()
    .where(`created_at < NOW() - INTERVAL '180 days'`)
    .execute()
  await repo.save(
    repo.create({
      code: input.code,
      gapKey: normalizeGapKey(input.gapKey),
      origin: input.origin,
      attempts: input.attempts,
    }),
  )
}

export async function listBoardGaps(limit = 20) {
  const rows = await AppDataSource.getRepository(BoardGap)
    .createQueryBuilder('g')
    .select('g.gapKey', 'gap_key')
    .addSelect('COUNT(*)', 'n')
    .groupBy('g.gapKey')
    .orderBy('n', 'DESC')
    .addOrderBy('g.gapKey', 'ASC')
    .limit(limit)
    .getRawMany<{ gap_key: string; n: string }>()
  return rows.map((row) => ({ gapKey: row.gap_key, count: Number(row.n) }))
}
