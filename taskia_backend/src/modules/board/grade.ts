import { bindLabels } from './algebra.js'
import { expandScene } from './expand.js'
import { nearly } from './geom.js'
import { rEq, rFromClaim, rToNumber, type Rational } from './rational.js'
import { measureTarget } from './measure.js'
import { parseScene } from './schema.js'
import { solveCanon } from './solve.js'
import { soloBienCount } from '../../utils/helpers.js'
import type { BoardVerdict } from './types.js'

const HAND_TOLERANCE = 0.12

export function gradeBoard(opts: {
  scene: unknown
  board: unknown
  childMessage?: string
}): BoardVerdict {
  const parsed = parseScene(opts.scene)
  if (!parsed.ok || !parsed.scene.task) return unverifiable()
  const expanded = expandScene(parsed.scene)
  if (expanded.issues.length > 0) return unverifiable()
  const solved = solveCanon(expanded.canon)
  if (solved.issues.length > 0) return unverifiable()
  const labels = bindLabels(solved.canon, expanded.marks, solved.points)
  if (labels.issues.length > 0) return unverifiable()
  const answer = measureTarget(
    parsed.scene,
    solved.canon,
    solved.points,
    parsed.scene.task.target,
    labels.bindings,
  )
  if (answer.status !== 'value') return unverifiable()
  if (parsed.scene.task.type === 'multiple_choice' && parsed.scene.task.choices) {
    return gradeChoice(parsed.scene.task.choices, answer, opts.board, opts.childMessage)
  }
  if (answer.exact === 'exact') return gradeExact(answer.rational, answer.value, opts.board, opts.childMessage)
  const got = readChildValue(opts.board, opts.childMessage, answer.value, solved)
  if (got == null) return { verdict: 'unverifiable', expected: round(answer.value), got: null }
  const ok = closeEnough(got, answer.value)
  return { verdict: ok ? 'correct' : 'incorrect', expected: round(answer.value), got: round(got) }
}

export function applyVerdictToMastery(opts: {
  verdict: BoardVerdict | null
  passed: boolean
  contextSummary: string
  previousSummary: string
}) {
  if (opts.verdict?.verdict !== 'incorrect') {
    return { passed: opts.passed, contextSummary: opts.contextSummary }
  }
  const previous = soloBienCount(opts.previousSummary)
  const next = soloBienCount(opts.contextSummary)
  let contextSummary = opts.contextSummary
  if (previous != null && next != null && next > previous) {
    contextSummary = contextSummary.replace(/solo bien:\s*\d+\s*\/\s*2/i, `Solo bien: ${previous}/2`)
  }
  return { passed: false, contextSummary }
}

function gradeExact(
  expected: Rational,
  shown: number,
  board: unknown,
  message: string | undefined,
): BoardVerdict {
  const got = readChildRational(board, message)
  if (!got) return { verdict: 'unverifiable', expected: round(shown), got: null }
  return {
    verdict: rEq(got, expected) ? 'correct' : 'incorrect',
    expected: round(shown),
    got: round(rToNumber(got)),
  }
}

function readChildRational(board: unknown, message: string | undefined) {
  const texts = [message ?? '', ...writtenText(board).split('\n')]
  for (const text of texts) {
    const slash = text.match(/\d+\s*\/\s*\d+/)
    const loose = text.match(/-?\d+(?:[.,]\d+)?/)
    const parsed = rFromClaim(slash?.[0] ?? loose?.[0] ?? '')
    if (parsed) return parsed
  }
  return null
}

function gradeChoice(
  choices: Array<{ id: string; text: string }>,
  answer: Extract<ReturnType<typeof measureTarget>, { status: 'value' }>,
  board: unknown,
  message: string | undefined,
): BoardVerdict {
  const blob = `${message ?? ''}\n${writtenText(board)}`.toLowerCase()
  const byLetter = choices.find((choice) => new RegExp(`(^|[^a-z])${choice.id}([^a-z]|$)`).test(blob))
  const picked =
    byLetter ??
    choices.find((choice) => {
      const match = choice.text.match(/-?\d+(?:[.,]\d+)?/)
      if (!match) return false
      return blob.includes(match[0].toLowerCase())
    })
  if (!picked) return unverifiable()
  const match = picked.text.match(/-?\d+(?:[.,]\d+)?/)
  const numeric = match ? Number(match[0].replace(',', '.')) : null
  const agrees =
    answer.exact === 'exact'
      ? match != null && rFromClaim(match[0]) != null && rEq(rFromClaim(match[0])!, answer.rational)
      : numeric != null && nearly(numeric, answer.value)
  return {
    verdict: agrees ? 'correct' : 'incorrect',
    expected: round(answer.value),
    got: numeric == null ? null : round(numeric),
  }
}

function writtenText(board: unknown) {
  return boardItems(board)
    .filter((item) => item.layer !== 'ai' && typeof item.text === 'string')
    .map((item) => String(item.text))
    .join('\n')
}

function unverifiable(): BoardVerdict {
  return { verdict: 'unverifiable', expected: null, got: null }
}

function readChildValue(
  board: unknown,
  message: string | undefined,
  expected: number,
  solved: ReturnType<typeof solveCanon>,
) {
  const written = writtenNumbers(board, message)
  if (written.length > 0) return closest(written, expected)
  const geometry = studentLengths(board, solved)
  if (geometry.length === 0) return null
  return closest(geometry, expected)
}

function writtenNumbers(board: unknown, message: string | undefined) {
  const found: number[] = []
  const items = boardItems(board)
  for (const item of items) {
    if (item.layer === 'ai') continue
    const text = typeof item.text === 'string' ? item.text : ''
    const value = parseLooseNumber(text)
    if (value != null) found.push(value)
  }
  const fromMessage = parseLooseNumber(message ?? '')
  if (fromMessage != null) found.push(fromMessage)
  return found
}

function studentLengths(board: unknown, solved: ReturnType<typeof solveCanon>) {
  const items = boardItems(board)
  const scale = inferScale(items, solved)
  if (scale == null) return []
  const lengths: number[] = []
  for (const item of items) {
    if (item.layer === 'ai') continue
    const cells = itemSpan(item)
    if (cells == null || cells <= 0) continue
    lengths.push(cells / scale)
  }
  return lengths
}

function inferScale(items: Array<Record<string, unknown>>, solved: ReturnType<typeof solveCanon>) {
  for (const item of solved.canon) {
    if (item.kind !== 'segment') continue
    const a = solved.points.get(item.from)
    const b = solved.points.get(item.to)
    if (!a || !b) continue
    const cm = Math.hypot(a.x - b.x, a.y - b.y)
    if (cm < 0.5) continue
    const drawn = items.find((row) => row.id === item.id && row.layer === 'ai')
    if (!drawn) continue
    const cells = itemSpan(drawn)
    if (cells == null || cells < 2) continue
    return cells / cm
  }
  return null
}

function itemSpan(item: Record<string, unknown>) {
  const col = Number(item.col ?? 0)
  const row = Number(item.row ?? 0)
  const endCol = item.endCol == null ? col + Number(item.w ?? 1) - 1 : Number(item.endCol)
  const endRow = item.endRow == null ? row + Number(item.h ?? 1) - 1 : Number(item.endRow)
  if (item.kind === 'line' || item.kind === 'arrow') return Math.hypot(endCol - col, endRow - row)
  if (item.kind === 'rectangle' || item.kind === 'ellipse') return Math.max(Number(item.w ?? 0), Number(item.h ?? 0))
  return null
}

function boardItems(board: unknown) {
  if (!board || typeof board !== 'object') return []
  const items = (board as { items?: unknown }).items
  return Array.isArray(items) ? items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : []
}

function parseLooseNumber(text: string) {
  const match = text.trim().match(/-?\d+(?:[.,]\d+)?/)
  if (!match) return null
  const value = Number(match[0].replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function closest(values: number[], expected: number) {
  return values.reduce((best, value) => (Math.abs(value - expected) < Math.abs(best - expected) ? value : best))
}

function closeEnough(got: number, expected: number) {
  if (nearly(got, expected)) return true
  const tol = Math.max(0.5, Math.abs(expected) * HAND_TOLERANCE)
  return Math.abs(got - expected) <= tol
}

function round(value: number) {
  return Math.round(value * 1000) / 1000
}
