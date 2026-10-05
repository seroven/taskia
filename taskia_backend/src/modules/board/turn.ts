import type { LlmUsageContext } from '../../infrastructure/gemini/gemini.client.js'
import { readBoardFacts } from './draw-call.js'
import {
  factsConfirmText,
  finishSpeak,
  isConfirmMessage,
  parseStoredFacts,
  type BoardFact,
  type BoardFactsResult,
} from './facts.js'
import { recordBoardGap, type GapOrigin } from './gaps.js'
import { resolveModelScene } from './draw-call.js'
import { SCENE_DRAWN_MESSAGE, type BoardItem, type Scene, type SceneIssue } from './types.js'

export type DrawPlan =
  | { mode: 'none'; pendingWrite: 'keep' | null }
  | { mode: 'gap'; gapKey: string }
  | { mode: 'confirm'; facts: BoardFactsResult }
  | { mode: 'draw'; facts: BoardFact[]; statement: string }

export async function planBoardDraw(opts: {
  draw: boolean
  photoBase64: string | null
  message: string
  pendingRaw: string | null
  source: string
  usage: LlmUsageContext
}): Promise<DrawPlan> {
  const pending = parseStoredFacts(opts.pendingRaw)
  if (opts.photoBase64 && opts.draw) {
    const facts = await readBoardFacts({
      source: opts.source,
      photoBase64: opts.photoBase64,
      usage: opts.usage,
    })
    if (facts.unsupported) return { mode: 'gap', gapKey: facts.unsupported }
    return { mode: 'confirm', facts }
  }
  if (pending && isConfirmMessage(opts.message) && !opts.photoBase64) {
    if (pending.unsupported) return { mode: 'gap', gapKey: pending.unsupported }
    return { mode: 'draw', facts: pending.facts, statement: pending.statement }
  }
  if (!opts.draw) return { mode: 'none', pendingWrite: pending ? null : 'keep' }
  const facts = await readBoardFacts({ source: opts.source, usage: opts.usage })
  if (facts.unsupported) return { mode: 'gap', gapKey: facts.unsupported }
  return { mode: 'draw', facts: facts.facts, statement: facts.statement }
}

export async function settleBoardDraw(opts: {
  plan: DrawPlan
  speak: string
  modelValue: Record<string, unknown>
  usage: LlmUsageContext
  origin: GapOrigin
  maxSpeak: number
}): Promise<{
  speak: string
  items: BoardItem[]
  scene: Scene | null
  fallback: string | null
  pendingWrite: string | null | 'keep'
}> {
  if (opts.plan.mode === 'none') {
    return {
      speak: opts.speak,
      items: [],
      scene: null,
      fallback: null,
      pendingWrite: opts.plan.pendingWrite,
    }
  }
  if (opts.plan.mode === 'gap') {
    await recordBoardGap({
      code: 'UNSUPPORTED',
      gapKey: opts.plan.gapKey,
      origin: opts.origin,
      attempts: 0,
    })
    return {
      speak: clip(finishSpeak(opts.speak, 'fallback'), opts.maxSpeak),
      items: [],
      scene: null,
      fallback: finishSpeak('', 'fallback'),
      pendingWrite: null,
    }
  }
  if (opts.plan.mode === 'confirm') {
    return {
      speak: clip(factsConfirmText(opts.plan.facts), opts.maxSpeak),
      items: [],
      scene: null,
      fallback: null,
      pendingWrite: JSON.stringify(opts.plan.facts),
    }
  }
  const drawn = await resolveModelScene(opts.modelValue, opts.usage, opts.plan.facts)
  if (!drawn.ok) {
    await rememberGap(drawn.issues, opts.origin, drawn.attempts)
    return {
      speak: clip(finishSpeak(opts.speak, 'fallback'), opts.maxSpeak),
      items: [],
      scene: null,
      fallback: drawn.fallback,
      pendingWrite: null,
    }
  }
  return {
    speak: clipDrawn(opts.speak, opts.plan.statement, opts.maxSpeak),
    items: drawn.items,
    scene: drawn.scene,
    fallback: null,
    pendingWrite: null,
  }
}

async function rememberGap(issues: SceneIssue[], origin: GapOrigin, attempts: number) {
  const issue = issues.find((row) => row.code === 'UNSUPPORTED' || row.code === 'MISSING_FACT')
  if (!issue) return
  await recordBoardGap({
    code: issue.code,
    gapKey: issue.objectId ?? 'other',
    origin,
    attempts,
  })
}

function clipDrawn(speak: string, statement: string, max: number) {
  const suffix = ` ${SCENE_DRAWN_MESSAGE}`
  const body = [statement.trim(), speak.trim()].filter(Boolean).join(' ')
  return `${clip(body, Math.max(1, max - suffix.length))}${suffix}`.trim()
}

function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}
