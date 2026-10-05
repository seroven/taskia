import { expandScene, hasExpander } from './expand.js'
import { coverScene, unsupportedOf } from './facts.js'
import type { BoardFact } from './facts.js'
import { nearly } from './geom.js'
import { compileBoard } from './layout.js'
import { measureTarget, type Measure } from './measure.js'
import { parseScene } from './schema.js'
import { solveCanon } from './solve.js'
import {
  SCENE_FALLBACK_MESSAGE,
  type BoardItem,
  type Scene,
  type SceneIssue,
} from './types.js'

export type Prepared =
  | { ok: true; scene: Scene; items: BoardItem[]; answer: Measure }
  | { ok: false; issues: SceneIssue[] }

export function prepareScene(raw: unknown): Prepared {
  const parsed = parseScene(raw)
  if (!parsed.ok) return parsed
  const expanded = expandScene(parsed.scene)
  if (expanded.issues.length > 0) return { ok: false, issues: expanded.issues }
  const solved = solveCanon(expanded.canon)
  if (solved.issues.length > 0) return { ok: false, issues: solved.issues }
  const drawn = compileBoard(solved.canon, solved.points)
  if (drawn.issues.length > 0) return { ok: false, issues: drawn.issues }
  const answer = parsed.scene.task
    ? measureTarget(parsed.scene, solved.canon, solved.points, parsed.scene.task.target)
    : { status: 'unverifiable' as const }
  if (parsed.scene.task?.claimedAnswer != null && answer.status === 'value') {
    const claimed = Number(String(parsed.scene.task.claimedAnswer).replace(',', '.'))
    if (!Number.isFinite(claimed) || !nearly(claimed, answer.value)) {
      return { ok: false, issues: [{ code: 'ANSWER_MISMATCH', objectId: parsed.scene.task.target }] }
    }
  }
  return { ok: true, scene: parsed.scene, items: drawn.items, answer }
}

export function auditScene(
  raw: unknown,
  facts: BoardFact[] = [],
):
  | { ok: true; prepared: Extract<Prepared, { ok: true }> }
  | { ok: false; stop: boolean; issues: SceneIssue[] } {
  const named = unsupportedOf(raw)
  if (named) return { ok: false, stop: true, issues: [{ code: 'UNSUPPORTED', objectId: named }] }
  const missingType = unknownSceneType(raw)
  if (missingType) return { ok: false, stop: true, issues: [{ code: 'UNSUPPORTED', objectId: missingType }] }
  if (raw == null) return { ok: false, stop: false, issues: [{ code: 'MISSING_FACT' }] }
  const prepared = prepareScene(raw)
  if (!prepared.ok) return { ok: false, stop: false, issues: prepared.issues }
  const coverage = facts.length > 0 ? coverScene(facts, prepared.scene) : []
  if (coverage.some((issue) => issue.code === 'UNSUPPORTED')) {
    return { ok: false, stop: true, issues: coverage }
  }
  if (coverage.length > 0) return { ok: false, stop: false, issues: coverage }
  return { ok: true, prepared }
}

export async function drawSceneWithRetries(opts: {
  initial: unknown
  retry: (scene: unknown, issues: SceneIssue[]) => Promise<unknown>
  facts?: BoardFact[]
  maxRetries?: number
}): Promise<
  | { ok: true; scene: Scene | null; items: BoardItem[]; answer: Measure; attempts: number }
  | { ok: false; fallback: string; issues: SceneIssue[]; attempts: number }
> {
  const maxRetries = opts.maxRetries ?? 2
  const facts = opts.facts ?? []
  if (opts.initial == null && facts.length === 0) {
    return { ok: true, scene: null, items: [], answer: { status: 'unverifiable' }, attempts: 0 }
  }
  let current: unknown = opts.initial
  let attempts = 0
  let issues: SceneIssue[] = [{ code: 'MISSING_FACT' }]
  while (attempts <= maxRetries) {
    attempts += 1
    const audited = auditScene(current, facts)
    if (audited.ok) return { ...audited.prepared, attempts }
    issues = audited.issues
    if (audited.stop) {
      return { ok: false, fallback: SCENE_FALLBACK_MESSAGE, issues: publicIssues(issues), attempts }
    }
    console.info(
      '[board] scene rejected',
      issues.map((issue) => issue.code).join(','),
      'attempt',
      attempts,
    )
    if (attempts > maxRetries) break
    try {
      current = await opts.retry(current, publicIssues(issues))
    } catch (err) {
      console.info('[board] scene retry failed', err instanceof Error ? err.name : 'error')
      break
    }
  }
  return { ok: false, fallback: SCENE_FALLBACK_MESSAGE, issues: publicIssues(issues), attempts }
}

function unknownSceneType(raw: unknown) {
  if (!isSceneRecord(raw)) return null
  for (const object of raw.objects) {
    if (!object || typeof object !== 'object') continue
    const type = (object as { type?: unknown }).type
    if (typeof type === 'string' && type && !hasExpander(type)) return type
  }
  return null
}

export function publicIssues(issues: SceneIssue[]): SceneIssue[] {
  return issues.slice(0, 8).map((issue) => ({
    code: issue.code,
    ...(issue.objectId ? { objectId: issue.objectId } : {}),
  }))
}

export function isSceneRecord(raw: unknown): raw is { schemaVersion: 1; objects: unknown[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const rec = raw as { schemaVersion?: unknown; objects?: unknown }
  return rec.schemaVersion === 1 && Array.isArray(rec.objects)
}

export function sceneFromModel(raw: unknown): unknown {
  if (unsupportedOf(raw)) return raw
  if (isSceneRecord(raw)) return raw
  if (!raw || typeof raw !== 'object') return null
  if (!('scene' in raw)) return null
  const scene = (raw as { scene?: unknown }).scene
  return scene == null ? null : scene
}

export function highlightFromModel(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return []
  const list = (raw as { highlight?: unknown }).highlight
  if (!Array.isArray(list)) return []
  return list.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length < 40).slice(0, 8)
}
