import type { Canon, Mark } from './expand.js'
import { angleDegrees, dist, nearly } from './geom.js'
import { rFromClaim, rToNumber } from './rational.js'
import { GRID_COLS, GRID_ROWS, type BoardItem, type Pt, type SceneIssue } from './types.js'

const MARGIN = 10
/** Una unidad de la escena (cm, lado, radio) no pasa de estas celdas. Si no cabe, se achica. */
const MAX_CELLS_PER_UNIT = 8

type Placed = { col: number; row: number }

export function compileBoard(
  canon: Canon[],
  points: Map<string, Pt>,
  marks: Mark[] = [],
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
    if (item.kind === 'angle' && item.label) {
      const vertex = placed.get(item.vertex)
      const from = placed.get(item.from)
      const to = placed.get(item.to)
      if (vertex && from && to) {
        const mid = {
          col: Math.round((from.col + to.col) / 2),
          row: Math.round((from.row + to.row) / 2),
        }
        placeText(items, occupied, issues, `${item.id}.label`, item.label, vertex, mid, layer, color)
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
    if (item.kind === 'fraction_bar') drawFractionBar(items, item, layer, color)
    if (item.kind === 'bar_chart') drawBarChart(items, item, layer, color)
    if (item.kind === 'column_op') drawColumn(items, item, layer, color)
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

  issues.push(...compileMarks(canon, points, placed, items, occupied, marks))

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

function compileMarks(
  canon: Canon[],
  points: Map<string, Pt>,
  placed: Map<string, Placed>,
  items: BoardItem[],
  occupied: Array<{ col: number; row: number; w: number; h: number; id: string }>,
  marks: Mark[],
) {
  const issues: SceneIssue[] = []
  const lengths = new Map<string, number[]>()
  const directions = new Map<string, Pt[]>()
  for (const mark of marks) {
    const before = items.length
    if (mark.kind === 'right_angle') drawRightAngle(canon, points, placed, items, issues, mark)
    if (mark.kind === 'equal_side' || mark.kind === 'parallel') {
      drawTicks(canon, points, placed, items, issues, mark, lengths, directions)
    }
    if (mark.kind === 'dimension') drawDimension(canon, points, placed, items, occupied, issues, mark)
    if (mark.kind === 'angle_arc') drawAngleArc(canon, placed, items, occupied, issues, mark)
    if (items.length - before > 8) items.splice(before + 8)
  }
  for (const [key, group] of lengths) {
    if (group.some((value) => !nearly(value, group[0]!))) issues.push({ code: 'BAD_SCHEMA', objectId: key })
  }
  for (const [key, group] of directions) {
    const first = group[0]
    if (!first) continue
    const parallel = group.every((dir) => {
      const denom = Math.hypot(first.x, first.y) * Math.hypot(dir.x, dir.y)
      if (denom === 0) return false
      return Math.abs((first.x * dir.x + first.y * dir.y) / denom) > 0.98
    })
    if (!parallel) issues.push({ code: 'BAD_SCHEMA', objectId: key })
  }
  return issues
}

function drawRightAngle(
  canon: Canon[],
  points: Map<string, Pt>,
  placed: Map<string, Placed>,
  items: BoardItem[],
  issues: SceneIssue[],
  mark: Mark,
) {
  const angle = canon.find((item) => item.kind === 'angle' && item.id === mark.of)
  if (!angle || angle.kind !== 'angle') {
    issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
    return
  }
  const vertex = points.get(angle.vertex)
  const from = points.get(angle.from)
  const to = points.get(angle.to)
  const cell = placed.get(angle.vertex)
  const cellFrom = placed.get(angle.from)
  const cellTo = placed.get(angle.to)
  if (!vertex || !from || !to || !cell || !cellFrom || !cellTo) {
    issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
    return
  }
  if (!nearly(angleDegrees(from, vertex, to), 90)) {
    issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
    return
  }
  const u = step(cell, cellFrom, 3)
  const v = step(cell, cellTo, 3)
  const p1 = { col: cell.col + u.col, row: cell.row + u.row }
  const corner = { col: cell.col + u.col + v.col, row: cell.row + u.row + v.row }
  const p3 = { col: cell.col + v.col, row: cell.row + v.row }
  items.push(lineItem(`${mark.id}.mark`, p1, corner, 'ai', 'violet'))
  items.push(lineItem(`${mark.id}.mark2`, corner, p3, 'ai', 'violet'))
}

function drawTicks(
  canon: Canon[],
  points: Map<string, Pt>,
  placed: Map<string, Placed>,
  items: BoardItem[],
  issues: SceneIssue[],
  mark: Mark,
  lengths: Map<string, number[]>,
  directions: Map<string, Pt[]>,
) {
  const segment = canon.find((item) => item.kind === 'segment' && item.id === mark.of)
  if (!segment || segment.kind !== 'segment') {
    issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
    return
  }
  const a = points.get(segment.from)
  const b = points.get(segment.to)
  const cellA = placed.get(segment.from)
  const cellB = placed.get(segment.to)
  if (!a || !b || !cellA || !cellB) {
    issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
    return
  }
  const key = `${mark.kind}:${mark.group ?? '1'}`
  if (mark.kind === 'equal_side') {
    const found = lengths.get(key) ?? []
    found.push(dist(a, b))
    lengths.set(key, found)
  } else {
    const found = directions.get(key) ?? []
    found.push({ x: b.x - a.x, y: b.y - a.y })
    directions.set(key, found)
  }
  const ticks = mark.group === '2' ? 2 : 1
  const mid = { col: (cellA.col + cellB.col) / 2, row: (cellA.row + cellB.row) / 2 }
  const normal = normalStep(cellA, cellB, 2)
  const along = step(cellA, cellB, 1)
  for (let index = 0; index < ticks; index += 1) {
    const shift = index === 0 ? 0 : 2
    const at = { col: Math.round(mid.col + along.col * shift), row: Math.round(mid.row + along.row * shift) }
    items.push(
      lineItem(
        `${mark.id}.mark${index === 0 ? '' : index + 1}`,
        { col: at.col - normal.col, row: at.row - normal.row },
        { col: at.col + normal.col, row: at.row + normal.row },
        'ai',
        'violet',
      ),
    )
  }
}

function drawDimension(
  canon: Canon[],
  points: Map<string, Pt>,
  placed: Map<string, Placed>,
  items: BoardItem[],
  occupied: Array<{ col: number; row: number; w: number; h: number; id: string }>,
  issues: SceneIssue[],
  mark: Mark,
) {
  const segment = canon.find((item) => item.kind === 'segment' && item.id === mark.of)
  if (!segment || segment.kind !== 'segment' || !mark.text) {
    issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
    return
  }
  const a = points.get(segment.from)
  const b = points.get(segment.to)
  const cellA = placed.get(segment.from)
  const cellB = placed.get(segment.to)
  if (!a || !b || !cellA || !cellB) {
    issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
    return
  }
  const numeric = mark.text.match(/-?\d+(?:[.,]\d+)?/)
  if (numeric) {
    const claimed = rFromClaim(numeric[0])
    if (!claimed || !nearly(rToNumber(claimed), dist(a, b))) {
      issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
      return
    }
  }
  const normal = normalStep(cellA, cellB, 4)
  const start = { col: cellA.col + normal.col, row: cellA.row + normal.row }
  const end = { col: cellB.col + normal.col, row: cellB.row + normal.row }
  items.push({ ...lineItem(`${mark.id}.mark`, start, end, 'ai', 'violet'), kind: 'arrow' })
  placeText(items, occupied, issues, `${mark.id}.mark2`, mark.text, start, end, 'ai', 'violet')
}

function drawAngleArc(
  canon: Canon[],
  placed: Map<string, Placed>,
  items: BoardItem[],
  occupied: Array<{ col: number; row: number; w: number; h: number; id: string }>,
  issues: SceneIssue[],
  mark: Mark,
) {
  const angle = canon.find((item) => item.kind === 'angle' && item.id === mark.of)
  if (!angle || angle.kind !== 'angle') {
    issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
    return
  }
  const vertex = placed.get(angle.vertex)
  const from = placed.get(angle.from)
  const to = placed.get(angle.to)
  if (!vertex || !from || !to) {
    issues.push({ code: 'BAD_SCHEMA', objectId: mark.id })
    return
  }
  const start = Math.atan2(from.row - vertex.row, from.col - vertex.col)
  let sweep = Math.atan2(to.row - vertex.row, to.col - vertex.col) - start
  while (sweep <= -Math.PI) sweep += Math.PI * 2
  while (sweep > Math.PI) sweep -= Math.PI * 2
  const steps = 5
  let previous: Placed | null = null
  for (let index = 0; index <= steps; index += 1) {
    const theta = start + (sweep * index) / steps
    const at = {
      col: Math.round(vertex.col + Math.cos(theta) * 6),
      row: Math.round(vertex.row + Math.sin(theta) * 6),
    }
    if (previous) items.push(lineItem(`${mark.id}.mark${index}`, previous, at, 'ai', 'violet'))
    previous = at
  }
  if (mark.text) {
    const mid = start + sweep / 2
    const at = {
      col: Math.round(vertex.col + Math.cos(mid) * 8),
      row: Math.round(vertex.row + Math.sin(mid) * 8),
    }
    placeText(items, occupied, issues, `${mark.id}.text`, mark.text, vertex, at, 'ai', 'violet')
  }
}

function step(origin: Placed, target: Placed, cells: number): Placed {
  const dx = target.col - origin.col
  const dy = target.row - origin.row
  const len = Math.hypot(dx, dy) || 1
  return { col: Math.round((dx / len) * cells), row: Math.round((dy / len) * cells) }
}

function normalStep(a: Placed, b: Placed, cells: number): Placed {
  const dx = b.col - a.col
  const dy = b.row - a.row
  const len = Math.hypot(dx, dy) || 1
  return { col: Math.round((-dy / len) * cells), row: Math.round((dx / len) * cells) }
}

function drawFractionBar(
  items: BoardItem[],
  item: Extract<Canon, { kind: 'fraction_bar' }>,
  layer: 'ai' | 'student',
  color: string,
) {
  const part = 4
  let row = 30
  for (let index = 0; index < item.parts.length; index += 1) {
    const piece = item.parts[index]!
    const label = `${piece.n}/${piece.d}`
    items.push(textItem(`${item.id}.name${index}`, 12, row + 1, label, layer, color))
    for (let cell = 0; cell < piece.d; cell += 1) {
      const col = 20 + cell * part
      items.push(boxItem(`${item.id}.p${index}.${cell}`, col, row, part, part, layer, color))
      if (cell < piece.n) {
        items.push(lineItem(`${item.id}.h${index}.${cell}`, { col: col + 1, row: row + 1 }, { col: col + part - 1, row: row + part - 1 }, layer, color))
      }
    }
    row += part + 2
  }
}

function drawBarChart(
  items: BoardItem[],
  item: Extract<Canon, { kind: 'bar_chart' }>,
  layer: 'ai' | 'student',
  color: string,
) {
  const barW = 6
  const gap = 3
  const barH = 24
  const baseRow = 68
  const originCol = 28
  const max = Math.max(0, ...item.categories.map((category) => category.value))
  const step = niceStep(max)
  const axisMax = Math.max(step, Math.ceil(max / step) * step)
  items.push(lineItem(`${item.id}.y`, { col: originCol, row: baseRow - barH }, { col: originCol, row: baseRow }, layer, color))
  items.push(lineItem(`${item.id}.x`, { col: originCol, row: baseRow }, { col: originCol + item.categories.length * (barW + gap), row: baseRow }, layer, color))
  for (let tick = 0; tick <= axisMax; tick += step) {
    const row = baseRow - Math.round((tick / axisMax) * barH)
    items.push(textItem(`${item.id}.tick${tick}`, originCol - 4, row, String(tick), layer, color))
  }
  item.categories.forEach((category, index) => {
    const col = originCol + 2 + index * (barW + gap)
    const height = category.value === 0 ? 0 : Math.max(1, Math.round((category.value / axisMax) * barH))
    if (height > 0) {
      items.push(boxItem(`${item.id}.bar${index}`, col, baseRow - height, barW, height, layer, color))
      items.push(textItem(`${item.id}.val${index}`, col, baseRow - height - 2, String(category.value), layer, color))
    }
    items.push(textItem(`${item.id}.cat${index}`, col, baseRow + 2, category.label, layer, color))
  })
}

function drawColumn(
  items: BoardItem[],
  item: Extract<Canon, { kind: 'column_op' }>,
  layer: 'ai' | 'student',
  color: string,
) {
  const [left, right] = item.operands
  const width = Math.max(String(left).length, String(right).length, String(left + right).length)
  const originCol = 48
  const top = 36
  writeDigits(items, item.id, 'a', left, width, originCol, top, layer, color)
  items.push(textItem(`${item.id}.op`, originCol - 2, top + 2, '+', layer, color))
  writeDigits(items, item.id, 'b', right, width, originCol, top + 2, layer, color)
  items.push(
    lineItem(
      `${item.id}.line`,
      { col: originCol - 2, row: top + 3 },
      { col: originCol + width, row: top + 3 },
      layer,
      color,
    ),
  )
  for (let index = 0; index < width; index += 1) {
    items.push(boxItem(`${item.id}.blank${index}`, originCol + index, top + 4, 1, 1, layer, color))
  }
}

function writeDigits(
  items: BoardItem[],
  id: string,
  name: string,
  value: number,
  width: number,
  originCol: number,
  row: number,
  layer: 'ai' | 'student',
  color: string,
) {
  const digits = String(value).padStart(width, ' ')
  for (let index = 0; index < digits.length; index += 1) {
    const digit = digits[index]!
    if (digit === ' ') continue
    items.push(textItem(`${id}.${name}${index}`, originCol + index, row, digit, layer, color))
  }
}

function niceStep(max: number) {
  if (max <= 1) return 1
  const rough = max / 4
  const power = 10 ** Math.floor(Math.log10(rough))
  const fraction = rough / power
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return nice * power
}

function boxItem(
  id: string,
  col: number,
  row: number,
  w: number,
  h: number,
  layer: 'ai' | 'student',
  color: string,
): BoardItem {
  return { id, layer, kind: 'rectangle', col, row, w, h, color }
}

function textItem(
  id: string,
  col: number,
  row: number,
  text: string,
  layer: 'ai' | 'student',
  color: string,
): BoardItem {
  return { id, layer, kind: 'text', col, row, w: Math.max(1, text.length), h: 1, text, color }
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
