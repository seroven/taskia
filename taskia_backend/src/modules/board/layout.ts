import type { Canon } from './expand.js'
import { GRID_COLS, GRID_ROWS, type BoardItem, type Pt, type SceneIssue } from './types.js'

const MARGIN = 10
/** Una unidad de la escena (cm, lado, radio) no pasa de estas celdas. Si no cabe, se achica. */
const MAX_CELLS_PER_UNIT = 8

type Placed = { col: number; row: number }

export function compileBoard(
  canon: Canon[],
  points: Map<string, Pt>,
): { items: BoardItem[]; issues: SceneIssue[] } {
  const issues: SceneIssue[] = []
  const cloud = new Map(points)
  for (const item of canon) {
    if (item.kind !== 'circle') continue
    const center = points.get(item.center)
    if (!center) continue
    cloud.set(`${item.id}.n`, { x: center.x, y: center.y + item.radius })
    cloud.set(`${item.id}.e`, { x: center.x + item.radius, y: center.y })
  }
  const placed = layout(cloud)
  const items: BoardItem[] = []
  const occupied: Array<{ col: number; row: number; w: number; h: number; id: string }> = []

  for (const item of canon) {
    const layer = 'interactive' in item && item.interactive ? 'student' : 'ai'
    const color = layer === 'ai' ? 'violet' : 'blue'
    if (item.kind === 'segment') {
      const a = placed.get(item.from)
      const b = placed.get(item.to)
      if (!a || !b) continue
      items.push(lineItem(item.id, a, b, layer, color))
      if (item.label) placeText(items, occupied, issues, `${item.id}.label`, item.label, a, b, layer, color)
    }
    if (item.kind === 'parallel' || item.kind === 'perpendicular') {
      const a = placed.get(item.through)
      const b = placed.get(`${item.id}.end`)
      if (!a || !b) continue
      items.push(lineItem(item.id, a, b, layer, color))
    }
    if (item.kind === 'circle') {
      const center = placed.get(item.center)
      const east = placed.get(`${item.id}.e`)
      if (!center || !east) continue
      const radius = Math.max(2, Math.abs(east.col - center.col))
      items.push({
        id: item.id,
        layer,
        kind: 'ellipse',
        col: center.col - radius,
        row: center.row - radius,
        w: radius * 2,
        h: radius * 2,
        color,
      })
      if (item.label) {
        placeText(items, occupied, issues, `${item.id}.label`, item.label, center, { col: center.col + radius, row: center.row }, layer, color)
      }
    }
    if (item.kind === 'arc') {
      const center = placed.get(item.center)
      const from = placed.get(item.from)
      const to = placed.get(item.to)
      if (!center || !from || !to) continue
      items.push(lineItem(`${item.id}.a`, center, from, layer, color))
      items.push(lineItem(`${item.id}.b`, center, to, layer, color))
    }
    if (item.kind === 'label') {
      const at = placed.get(item.of)
      if (!at) continue
      placeText(items, occupied, issues, item.id, item.text, at, { col: at.col + 2, row: at.row }, layer, color)
    }
    if (item.kind === 'caption' || item.kind === 'expression') {
      const text = item.text
      const w = Math.max(1, text.length)
      items.push({
        id: item.id,
        layer,
        kind: 'text',
        col: Math.max(1, Math.round((GRID_COLS - w) / 2)),
        row: points.size > 0 ? MARGIN : Math.round(GRID_ROWS / 2),
        w,
        h: 1,
        text,
        color,
      })
    }
    if (item.kind === 'number_line') {
      const span = item.max - item.min
      const left = MARGIN + 8
      const right = GRID_COLS - MARGIN - 8
      const row = Math.round(GRID_ROWS / 2)
      items.push({
        id: item.id,
        layer,
        kind: 'line',
        col: left,
        row,
        w: right - left + 1,
        h: 1,
        endCol: right,
        endRow: row,
        color,
      })
      const ticks = Math.min(12, Math.floor(span / item.step) + 1)
      for (let index = 0; index < ticks; index += 1) {
        const value = item.min + index * item.step
        const col = Math.round(left + ((right - left) * (value - item.min)) / span)
        const label = Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10)
        items.push({
          id: `${item.id}.t${index}`,
          layer,
          kind: 'text',
          col: Math.max(0, col - Math.floor(label.length / 2)),
          row: row + 2,
          w: label.length,
          h: 1,
          text: label,
          color,
        })
      }
    }
    if (item.kind === 'polygon' && !canon.some((row) => row.kind === 'segment' && row.sourceId === item.id)) {
      for (let index = 0; index < item.vertices.length; index += 1) {
        const a = placed.get(item.vertices[index]!)
        const b = placed.get(item.vertices[(index + 1) % item.vertices.length]!)
        if (!a || !b) continue
        items.push(lineItem(`${item.id}.e${index}`, a, b, layer, color))
      }
    }
  }

  for (const item of items) {
    if (item.col < 0 || item.row < 0 || item.col >= GRID_COLS || item.row >= GRID_ROWS) {
      issues.push({ code: 'OUT_OF_BOUNDS', objectId: item.id })
    }
  }
  return { items, issues }
}

export function boundsIssues(items: BoardItem[]): SceneIssue[] {
  return items
    .filter((item) => item.col < 0 || item.row < 0 || item.endCol != null && (item.endCol < 0 || item.endCol >= GRID_COLS) || item.endRow != null && (item.endRow < 0 || item.endRow >= GRID_ROWS))
    .map((item) => ({ code: 'OUT_OF_BOUNDS' as const, objectId: item.id }))
}

function layout(points: Map<string, Pt>) {
  const placed = new Map<string, Placed>()
  const values = [...points.values()]
  if (values.length === 0) {
    placed.set('__scale__', { col: 1, row: 1 })
    return placed
  }
  const minX = Math.min(...values.map((point) => point.x))
  const maxX = Math.max(...values.map((point) => point.x))
  const minY = Math.min(...values.map((point) => point.y))
  const maxY = Math.max(...values.map((point) => point.y))
  const spanX = Math.max(maxX - minX, 0.001)
  const spanY = Math.max(maxY - minY, 0.001)
  const fit = Math.min((GRID_COLS - MARGIN * 2) / spanX, (GRID_ROWS - MARGIN * 2) / spanY)
  const scale = Math.min(fit, MAX_CELLS_PER_UNIT)
  const usedW = spanX * scale
  const usedH = spanY * scale
  const originCol = (GRID_COLS - usedW) / 2
  const originRow = (GRID_ROWS - usedH) / 2
  for (const [id, point] of points) {
    placed.set(id, {
      col: clamp(Math.round(originCol + (point.x - minX) * scale), 1, GRID_COLS - 2),
      row: clamp(Math.round(originRow + (maxY - point.y) * scale), 1, GRID_ROWS - 2),
    })
  }
  placed.set('__scale__', { col: scale, row: scale })
  return placed
}

function lineItem(id: string, a: Placed, b: Placed, layer: 'ai' | 'student', color: string): BoardItem {
  let end = b
  if (a.col === b.col && a.row === b.row) end = { col: Math.min(GRID_COLS - 2, b.col + 1), row: b.row }
  return {
    id,
    layer,
    kind: 'line',
    col: a.col,
    row: a.row,
    w: Math.abs(end.col - a.col) + 1,
    h: Math.abs(end.row - a.row) + 1,
    endCol: end.col,
    endRow: end.row,
    color,
  }
}

function placeText(
  items: BoardItem[],
  occupied: Array<{ col: number; row: number; w: number; h: number; id: string }>,
  issues: SceneIssue[],
  id: string,
  text: string,
  a: Placed,
  b: Placed,
  layer: 'ai' | 'student',
  color: string,
) {
  const w = Math.max(1, text.length)
  let col = Math.round((a.col + b.col) / 2) + 1
  let row = Math.round((a.row + b.row) / 2) + 1
  let placed = false
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const box = { col, row: row + attempt * 2, w, h: 1, id }
    if (!occupied.some((other) => overlaps(other, box))) {
      col = box.col
      row = box.row
      occupied.push(box)
      placed = true
      break
    }
  }
  if (!placed) issues.push({ code: 'LABEL_OVERLAP', objectId: id })
  items.push({
    id,
    layer,
    kind: 'text',
    col: clamp(col, 0, GRID_COLS - w),
    row: clamp(row, 0, GRID_ROWS - 2),
    w,
    h: 1,
    text,
    color,
  })
}

function overlaps(
  a: { col: number; row: number; w: number; h: number },
  b: { col: number; row: number; w: number; h: number },
) {
  return a.col < b.col + b.w && a.col + a.w > b.col && a.row < b.row + b.h && a.row + a.h > b.row
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
