import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  Cursor,
  LineSegment,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  PaintBrush,
  Trash,
} from '@phosphor-icons/react'
import type { BoardSheet, DrawOp, GridColor, GridItem, StudyBoardScene } from '../../lib/studyProtocol'
import {
  GRID_CELL,
  GRID_COLORS,
  applyAiItems,
  applyDrawOpsToGrid,
  applySheet,
  describeGridScene,
  emptyGridScene,
  isLockedItem,
  itemBBox,
  makeStudentItem,
  newItemId,
  normalizeScene,
  textChars,
  themeDefaultColor,
} from '../../lib/gridBoardModel'
import { boardContentCrop, exportSvgBoardToPngBase64 } from '../../lib/exportGridBoardPng'

export interface BoardAttachment {
  description: string
  imageBase64: string | null
  elementCount: number
}

export interface GridBoardHandle {
  applyDrawOps: (ops: DrawOp[]) => void
  applyAiItems: (items: GridItem[], scene?: unknown, highlightIds?: string[]) => void
  applySheet: (sheet: BoardSheet | null) => void
  getBoardAttachment: () => Promise<BoardAttachment>
  getScene: () => StudyBoardScene | null
}

interface Props {
  initialBoard: StudyBoardScene | null
  onSave: (board: StudyBoardScene) => void
  theme: 'light' | 'dark'
}

type Tool = 'select' | 'line' | 'brush'

const COLOR_ORDER: GridColor[] = ['white', 'black', 'blue', 'red', 'green', 'orange', 'gray']
const SNAP = (6 * Math.PI) / 180
const MIN_ZOOM = 0.15
const MAX_ZOOM = 2.2

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100))
}

type Drag =
  | { mode: 'pan'; x: number; y: number; panX: number; panY: number }
  | { mode: 'grab'; x0: number; y0: number; cx: number; cy: number; origins: GridItem[]; hitId: string; additive: boolean }
  | { mode: 'move'; x0: number; y0: number; origins: GridItem[]; hitId: string; additive: boolean; shifted: boolean }
  | { mode: 'marquee'; x0: number; y0: number; additive: boolean; base: string[] }
  | { mode: 'line'; id: string }
  | { mode: 'brush'; id: string }
  | { mode: 'press'; x: number; y: number; cx: number; cy: number; panX: number; panY: number; additive: boolean }
  | null

function cellPoint(clientX: number, clientY: number, svg: SVGSVGElement, zoom: number, panX: number, panY: number) {
  const rect = svg.getBoundingClientRect()
  return {
    x: (clientX - rect.left - panX) / zoom / GRID_CELL,
    y: (clientY - rect.top - panY) / zoom / GRID_CELL,
  }
}

function snapEnd(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const angle = Math.abs(Math.atan2(dy, dx))
  const toHorizontal = Math.min(angle, Math.abs(Math.PI - angle))
  const toVertical = Math.abs(angle - Math.PI / 2)
  if (toHorizontal <= SNAP && toHorizontal <= toVertical) return { x: x2, y: y1, axis: 'h' as const }
  if (toVertical <= SNAP) return { x: x1, y: y2, axis: 'v' as const }
  return { x: x2, y: y2, axis: null }
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = dx * dx + dy * dy
  if (len === 0) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON'
}

function blankStudentText(item: GridItem) {
  return item.kind === 'text' && !isLockedItem(item) && textChars(item.text ?? '').length === 0
}

function studentIdsInRect(items: GridItem[], x0: number, y0: number, x1: number, y1: number) {
  const left = Math.min(x0, x1)
  const right = Math.max(x0, x1)
  const top = Math.min(y0, y1)
  const bottom = Math.max(y0, y1)
  return items
    .filter((item) => {
      if (isLockedItem(item) || blankStudentText(item)) return false
      const box = itemBBox(item)
      const width = Math.max(box.w, 0.35)
      const height = Math.max(box.h, 0.35)
      return box.col <= right && box.col + width >= left && box.row <= bottom && box.row + height >= top
    })
    .map((item) => item.id)
}

function hitsStudent(item: GridItem, x: number, y: number) {
  if (isLockedItem(item) || blankStudentText(item)) return false
  if (item.kind === 'line' || item.kind === 'arrow') {
    return distToSegment(x, y, item.col, item.row, item.endCol ?? item.col, item.endRow ?? item.row) < 0.45
  }
  if (item.kind === 'brush' && item.points && item.points.length > 1) {
    for (let index = 1; index < item.points.length; index += 1) {
      const prev = item.points[index - 1]!
      const next = item.points[index]!
      if (distToSegment(x, y, prev.x, prev.y, next.x, next.y) < 0.55) return true
    }
    return false
  }
  const box = itemBBox(item)
  const width = item.kind === 'text' ? Math.max(box.w, textChars(item.text).length) : box.w
  return x >= box.col && x <= box.col + width && y >= box.row && y <= box.row + Math.max(box.h, 1.2)
}

function shiftItem(item: GridItem, dx: number, dy: number): GridItem {
  return {
    ...item,
    col: item.col + dx,
    row: item.row + dy,
    endCol: item.endCol != null ? item.endCol + dx : undefined,
    endRow: item.endRow != null ? item.endRow + dy : undefined,
    points: item.points?.map((point) => ({ x: point.x + dx, y: point.y + dy })),
  }
}

function wrapLines(text: string, maxChars: number) {
  const lines: string[] = []
  for (const raw of text.split('\n')) {
    const words = raw.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (next.length > maxChars && line) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    lines.push(line)
  }
  return lines.length > 0 ? lines : ['']
}

function strokeOf(item: GridItem) {
  const color = item.color && GRID_COLORS[item.color] ? item.color : 'blue'
  return GRID_COLORS[color]
}

export const GridBoard = forwardRef<GridBoardHandle, Props>(function GridBoard({ initialBoard, onSave, theme }, ref) {
  const [scene, setScene] = useState<StudyBoardScene>(() => normalizeScene(initialBoard))
  const [tool, setTool] = useState<Tool>('select')
  const [colorsOpen, setColorsOpen] = useState(false)
  const [color, setColor] = useState<GridColor>(() => themeDefaultColor(theme))
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const selectedRef = useRef<string[]>([])
  const [hoverId, setHoverId] = useState<string | null>(null)
  const gridPatternId = `taskia-grid-${useId().replace(/:/g, '')}`
  const [editingId, setEditingId] = useState<string | null>(null)
  const [caretIndex, setCaretIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [guide, setGuide] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const colorPopRef = useRef<HTMLDivElement>(null)
  const textEditRef = useRef<HTMLInputElement>(null)
  const armedRef = useRef(false)
  const sceneRef = useRef(scene)
  const zoomRef = useRef(zoom)
  const panRef = useRef(pan)
  const colorRef = useRef(color)
  const toolRef = useRef(tool)
  const centeredRef = useRef(false)
  const saveTimer = useRef<number | null>(null)
  const historyRef = useRef<StudyBoardScene[]>([])
  const futureRef = useRef<StudyBoardScene[]>([])
  const gestureBase = useRef<StudyBoardScene | null>(null)
  const drag = useRef<Drag>(null)
  const caretRef = useRef(0)
  const editingRef = useRef<string | null>(null)
  const spaceRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const draggedRef = useRef(false)
  const clickPlace = useRef<{ x: number; y: number } | null>(null)
  const downTextId = useRef<string | null>(null)
  const openClickedTextRef = useRef<() => void>(() => {})

  sceneRef.current = scene
  zoomRef.current = zoom
  panRef.current = pan
  colorRef.current = color
  toolRef.current = tool
  caretRef.current = caretIndex
  editingRef.current = editingId
  selectedRef.current = selectedIds

  const persist = useCallback(
    (next: StudyBoardScene) => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => onSave(next), 280)
    },
    [onSave],
  )

  const commit = useCallback(
    (next: StudyBoardScene, historyBase?: StudyBoardScene) => {
      if (!gestureBase.current) {
        historyRef.current.push(historyBase ?? sceneRef.current)
        if (historyRef.current.length > 40) historyRef.current.shift()
        futureRef.current = []
      }
      setScene(next)
      sceneRef.current = next
      persist(next)
    },
    [persist],
  )

  const undo = useCallback(() => {
    const prev = historyRef.current.pop()
    if (!prev) return
    futureRef.current.push(sceneRef.current)
    setScene(prev)
    sceneRef.current = prev
    persist(prev)
    selectedRef.current = []
    setSelectedIds([])
    setEditingId(null)
  }, [persist])

  const redo = useCallback(() => {
    const next = futureRef.current.pop()
    if (!next) return
    historyRef.current.push(sceneRef.current)
    setScene(next)
    sceneRef.current = next
    persist(next)
    selectedRef.current = []
    setSelectedIds([])
    setEditingId(null)
  }, [persist])

  useImperativeHandle(
    ref,
    () => ({
      applyDrawOps(ops: DrawOp[]) {
        const next = applyDrawOpsToGrid(emptyGridScene(), ops)
        const kept = sceneRef.current.items.filter((item) => item.layer === 'student')
        commit({ ...next, items: [...next.items.filter((item) => item.layer === 'ai'), ...kept] })
        selectedRef.current = []
        setSelectedIds([])
      },
      applyAiItems(items: GridItem[], nextScene?: unknown, highlightIds?: string[]) {
        commit(applyAiItems(sceneRef.current, items, nextScene, highlightIds))
        selectedRef.current = []
        setSelectedIds([])
      },
      applySheet(sheet: BoardSheet | null) {
        commit(applySheet(sceneRef.current, sheet))
        selectedRef.current = []
        setSelectedIds([])
      },
      async getBoardAttachment() {
        const current = sceneRef.current
        const svg = svgRef.current
        let imageBase64: string | null = null
        if (svg && current.items.length > 0) {
          imageBase64 = await exportSvgBoardToPngBase64(svg, {
            dark: theme === 'dark',
            paperW: current.cols * GRID_CELL,
            paperH: current.rows * GRID_CELL,
            crop: boardContentCrop(current),
            maxSide: 1280,
          })
        }
        return {
          description: describeGridScene(current),
          imageBase64,
          elementCount: current.items.filter((item) => item.layer === 'student').length,
        }
      },
      getScene() {
        return sceneRef.current
      },
    }),
    [commit, theme],
  )

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const centerPaper = () => {
      const vw = svg.clientWidth
      const vh = svg.clientHeight
      if (vw < 8 || vh < 8) return false
      const z = zoomRef.current
      const paperW = sceneRef.current.cols * GRID_CELL
      const paperH = sceneRef.current.rows * GRID_CELL
      setPan({ x: vw / 2 - (paperW * z) / 2, y: vh / 2 - (paperH * z) / 2 })
      return true
    }
    if (centerPaper()) {
      centeredRef.current = true
      return
    }
    const observer = new ResizeObserver(() => {
      if (centeredRef.current) return
      if (centerPaper()) {
        centeredRef.current = true
        observer.disconnect()
      }
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
    }
  }, [])

  function zoomAt(nextZoom: number, sx: number, sy: number) {
    const current = zoomRef.current
    const next = clampZoom(nextZoom)
    if (next === current) return
    const pan = panRef.current
    const worldX = (sx - pan.x) / current
    const worldY = (sy - pan.y) / current
    const nextPan = { x: sx - worldX * next, y: sy - worldY * next }
    panRef.current = nextPan
    zoomRef.current = next
    setPan(nextPan)
    setZoom(next)
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = svg.getBoundingClientRect()
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
      zoomAt(zoomRef.current * factor, event.clientX - rect.left, event.clientY - rect.top)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    const onDoubleClick = () => openClickedTextRef.current()
    svg.addEventListener('dblclick', onDoubleClick)
    return () => {
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('dblclick', onDoubleClick)
    }
  }, [])

  const releaseFocusRef = useRef<() => void>(() => {})
  releaseFocusRef.current = () => {
    armedRef.current = false
    leaveEditing()
    setSelection([])
    textEditRef.current?.blur()
  }

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const root = boardRef.current
      if (!root) return
      if (root.contains(event.target as Node)) {
        armedRef.current = true
        return
      }
      releaseFocusRef.current()
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useEffect(() => {
    if (!colorsOpen) return
    const close = (event: PointerEvent) => {
      if (colorPopRef.current?.contains(event.target as Node)) return
      setColorsOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [colorsOpen])

  function chooseTool(next: Tool) {
    setTool(next)
    setColorsOpen(false)
  }

  useEffect(() => {
    if (!editingId) return
    const timer = window.setTimeout(() => textEditRef.current?.focus(), 0)
    const onKey = (event: KeyboardEvent) => {
      if (!editingRef.current) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        leaveEditing()
        return
      }
      const item = sceneRef.current.items.find((row) => row.id === editingRef.current)
      if (!item || item.kind !== 'text' || isLockedItem(item)) return
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        const chars = textChars(item.text ?? '')
        const at = caretRef.current
        const removing = event.key === 'Backspace' ? at - 1 : at
        if (removing < 0 || removing >= chars.length) {
          if (chars.length === 0) leaveEditing()
          return
        }
        if (chars.length === 1) {
          const current = sceneRef.current
          commit({ ...current, items: current.items.filter((row) => row.id !== item.id) })
          setSelection(selectedRef.current.filter((row) => row !== item.id))
          setEditingId(null)
          return
        }
        chars.splice(removing, 1)
        const text = chars.join('')
        caretRef.current = event.key === 'Backspace' ? removing : at
        setCaretIndex(caretRef.current)
        patchItem(item.id, { text, w: Math.max(1, textChars(text).length), h: 1 })
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        caretRef.current = Math.max(0, caretRef.current - 1)
        setCaretIndex(caretRef.current)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        caretRef.current = Math.min(textChars(item.text ?? '').length, caretRef.current + 1)
        setCaretIndex(caretRef.current)
        return
      }
      if (event.key.length !== 1) return
      event.preventDefault()
      const chars = textChars(item.text ?? '')
      const at = Math.max(0, Math.min(caretRef.current, chars.length))
      chars.splice(at, 0, event.key)
      const text = chars.join('')
      caretRef.current = at + 1
      setCaretIndex(caretRef.current)
      patchItem(item.id, { text, w: Math.max(1, textChars(text).length), h: 1 })
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [editingId])

  useEffect(() => {
    const editing = editingRef.current
    const current = sceneRef.current
    const drop = new Set(
      current.items.filter((item) => blankStudentText(item) && item.id !== editing).map((item) => item.id),
    )
    if (drop.size === 0) return
    const next = { ...current, items: current.items.filter((item) => !drop.has(item.id)) }
    setScene(next)
    sceneRef.current = next
    persist(next)
    const selected = selectedRef.current.filter((id) => !drop.has(id))
    if (selected.length !== selectedRef.current.length) {
      selectedRef.current = selected
      setSelectedIds(selected)
    }
  }, [scene, editingId, persist])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!armedRef.current || editingRef.current || isTypingTarget(event.target)) return
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      } else if (key === 'a') {
        event.preventDefault()
        const ids = sceneRef.current.items
          .filter((item) => !isLockedItem(item) && !blankStudentText(item))
          .map((item) => item.id)
        selectedRef.current = ids
        setSelectedIds(ids)
      }
    }
    const onSpaceDown = (event: KeyboardEvent) => {
      if (!armedRef.current || event.key !== ' ' || editingRef.current || event.repeat || isTypingTarget(event.target)) return
      spaceRef.current = true
      event.preventDefault()
    }
    const onSpaceUp = (event: KeyboardEvent) => {
      if (event.key === ' ') spaceRef.current = false
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keydown', onSpaceDown)
    window.addEventListener('keyup', onSpaceUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keydown', onSpaceDown)
      window.removeEventListener('keyup', onSpaceUp)
    }
  }, [redo, undo])

  function dropBlankText(id: string | null) {
    if (!id) return
    const current = sceneRef.current
    const item = current.items.find((row) => row.id === id)
    if (!item || !blankStudentText(item)) return
    const next = { ...current, items: current.items.filter((row) => row.id !== id) }
    setScene(next)
    sceneRef.current = next
    persist(next)
    if (selectedRef.current.includes(id)) setSelection(selectedRef.current.filter((row) => row !== id))
  }

  function leaveEditing() {
    dropBlankText(editingRef.current)
    setEditingId(null)
  }

  function setSelection(ids: string[]) {
    const prev = selectedRef.current
    if (prev.length === ids.length && prev.every((id, index) => id === ids[index])) return
    selectedRef.current = ids
    setSelectedIds(ids)
  }

  function selectInMarquee(x0: number, y0: number, x1: number, y1: number, additive: boolean, base: string[]) {
    const inside = studentIdsInRect(sceneRef.current.items, x0, y0, x1, y1)
    setSelection(additive ? [...new Set([...base, ...inside])] : inside)
  }

  function patchItem(id: string, patch: Partial<GridItem>) {
    const current = sceneRef.current
    const previous = current.items.find((item) => item.id === id)
    const started =
      previous != null &&
      blankStudentText(previous) &&
      typeof patch.text === 'string' &&
      textChars(patch.text).length > 0
    commit(
      {
        ...current,
        items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      },
      started ? { ...current, items: current.items.filter((item) => item.id !== id) } : undefined,
    )
  }

  function topStudentAt(x: number, y: number) {
    return [...sceneRef.current.items].reverse().find((item) => hitsStudent(item, x, y))
  }

  function placeCaret(item: GridItem, x: number) {
    const length = textChars(item.text ?? '').length
    const at = Math.max(0, Math.min(length, Math.round(x - item.col)))
    caretRef.current = at
    setCaretIndex(at)
    textEditRef.current?.focus()
  }

  function beginTextEdit(item: GridItem) {
    const length = textChars(item.text ?? '').length
    caretRef.current = length
    setCaretIndex(length)
    setSelection([item.id])
    editingRef.current = item.id
    setEditingId(item.id)
    setHoverId(null)
    textEditRef.current?.focus()
  }

  openClickedTextRef.current = () => {
    if (draggedRef.current || toolRef.current !== 'select') return
    const item = sceneRef.current.items.find((row) => row.id === downTextId.current)
    if (!item || item.kind !== 'text' || textChars(item.text ?? '').length === 0) return
    drag.current = null
    clickPlace.current = null
    beginTextEdit(item)
  }

  function placeText(x: number, y: number) {
    const item = makeStudentItem('text', Math.floor(x), Math.floor(y), colorRef.current, undefined, '')
    item.w = 1
    item.h = 1
    const current = sceneRef.current
    const next = { ...current, items: [...current.items, item] }
    gestureBase.current = null
    setScene(next)
    sceneRef.current = next
    persist(next)
    setSelection([item.id])
    caretRef.current = 0
    setCaretIndex(0)
    setEditingId(item.id)
  }

  function holdPointer() {
    const svg = svgRef.current
    const id = pointerIdRef.current
    if (!svg || id == null || svg.hasPointerCapture(id)) return
    svg.setPointerCapture(id)
  }

  function onBoardClick(event: ReactMouseEvent<SVGSVGElement>) {
    if (event.button !== 0 || toolRef.current !== 'select') return
    const place = clickPlace.current
    clickPlace.current = null
    if (event.detail >= 2) {
      openClickedTextRef.current()
      return
    }
    if (place && !draggedRef.current) placeText(place.x, place.y)
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    pointerIdRef.current = event.pointerId
    draggedRef.current = false
    const point = cellPoint(event.clientX, event.clientY, svg, zoomRef.current, panRef.current.x, panRef.current.y)
    const hitBefore = topStudentAt(point.x, point.y)
    if (hitBefore?.id !== editingRef.current) leaveEditing()
    if (toolRef.current === 'line') {
      const item: GridItem = {
        id: newItemId(),
        layer: 'student',
        kind: 'line',
        col: point.x,
        row: point.y,
        endCol: point.x,
        endRow: point.y,
        w: 1,
        h: 1,
        color: colorRef.current,
      }
      gestureBase.current = sceneRef.current
      commit({ ...sceneRef.current, items: [...sceneRef.current.items, item] })
      holdPointer()
      drag.current = { mode: 'line', id: item.id }
      setSelection([item.id])
      return
    }
    if (toolRef.current === 'brush') {
      const item: GridItem = {
        id: newItemId(),
        layer: 'student',
        kind: 'brush',
        col: point.x,
        row: point.y,
        w: 1,
        h: 1,
        color: colorRef.current,
        points: [{ x: point.x, y: point.y }],
      }
      gestureBase.current = sceneRef.current
      commit({ ...sceneRef.current, items: [...sceneRef.current.items, item] })
      holdPointer()
      drag.current = { mode: 'brush', id: item.id }
      setSelection([item.id])
      return
    }
    if (event.button === 1 || spaceRef.current) {
      event.preventDefault()
      holdPointer()
      drag.current = {
        mode: 'pan',
        x: event.clientX,
        y: event.clientY,
        panX: panRef.current.x,
        panY: panRef.current.y,
      }
      setPanning(true)
      return
    }
    const additive = event.ctrlKey || event.metaKey
    const hit = topStudentAt(point.x, point.y)
    if (hit) {
      const currentIds = selectedRef.current
      const already = currentIds.includes(hit.id)
      let nextIds = currentIds
      if (additive) {
        nextIds = already ? currentIds.filter((id) => id !== hit.id) : [...currentIds, hit.id]
        setSelection(nextIds)
        if (!nextIds.includes(hit.id)) {
          drag.current = null
          return
        }
      } else if (!already) {
        nextIds = [hit.id]
        setSelection(nextIds)
      }
      if (hit.kind === 'text') downTextId.current = hit.id
      else downTextId.current = null
      const origins = sceneRef.current.items.filter((item) => nextIds.includes(item.id) && !isLockedItem(item))
      gestureBase.current = sceneRef.current
      drag.current = {
        mode: 'grab',
        x0: point.x,
        y0: point.y,
        cx: event.clientX,
        cy: event.clientY,
        origins,
        hitId: hit.id,
        additive,
      }
      return
    }
    downTextId.current = null
    drag.current = {
      mode: 'press',
      x: point.x,
      y: point.y,
      cx: event.clientX,
      cy: event.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
      additive,
    }
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const point = cellPoint(event.clientX, event.clientY, svg, zoomRef.current, panRef.current.x, panRef.current.y)
    const currentDrag = drag.current
    if (!currentDrag) {
      if (toolRef.current !== 'select') {
        setHoverId(null)
        return
      }
      const hit = topStudentAt(point.x, point.y)
      const next = hit?.id ?? null
      setHoverId((prev) => (prev === next ? prev : next))
      return
    }
    if (hoverId) setHoverId(null)
    if (currentDrag.mode === 'grab') {
      if (Math.hypot(event.clientX - currentDrag.cx, event.clientY - currentDrag.cy) < 6) return
      draggedRef.current = true
      holdPointer()
      drag.current = {
        mode: 'move',
        x0: currentDrag.x0,
        y0: currentDrag.y0,
        origins: currentDrag.origins,
        hitId: currentDrag.hitId,
        additive: currentDrag.additive,
        shifted: true,
      }
      return
    }
    if (currentDrag.mode === 'press') {
      if (Math.hypot(event.clientX - currentDrag.cx, event.clientY - currentDrag.cy) < 6) return
      holdPointer()
      drag.current = {
        mode: 'marquee',
        x0: currentDrag.x,
        y0: currentDrag.y,
        additive: currentDrag.additive,
        base: currentDrag.additive ? selectedRef.current : [],
      }
      setMarquee({ x1: currentDrag.x, y1: currentDrag.y, x2: point.x, y2: point.y })
      selectInMarquee(currentDrag.x, currentDrag.y, point.x, point.y, currentDrag.additive, currentDrag.additive ? selectedRef.current : [])
      return
    }
    if (currentDrag.mode === 'marquee') {
      const box = { x1: currentDrag.x0, y1: currentDrag.y0, x2: point.x, y2: point.y }
      setMarquee(box)
      selectInMarquee(box.x1, box.y1, box.x2, box.y2, currentDrag.additive, currentDrag.base)
      return
    }
    if (currentDrag.mode === 'pan') {
      setPan({
        x: currentDrag.panX + (event.clientX - currentDrag.x),
        y: currentDrag.panY + (event.clientY - currentDrag.y),
      })
      return
    }
    if (currentDrag.mode === 'move') {
      const dx = point.x - currentDrag.x0
      const dy = point.y - currentDrag.y0
      if (Math.hypot(dx, dy) > 0.2) currentDrag.shifted = true
      const moved = new Map(
        currentDrag.origins.map((origin) => {
          const item =
            origin.kind === 'text'
              ? { ...origin, col: Math.round(origin.col + dx), row: Math.round(origin.row + dy) }
              : shiftItem(origin, dx, dy)
          return [origin.id, item] as const
        }),
      )
      const current = sceneRef.current
      const next = { ...current, items: current.items.map((item) => moved.get(item.id) ?? item) }
      setScene(next)
      sceneRef.current = next
      persist(next)
      return
    }
    if (currentDrag.mode === 'line') {
      const item = sceneRef.current.items.find((row) => row.id === currentDrag.id)
      if (!item) return
      const snapped = snapEnd(item.col, item.row, point.x, point.y)
      patchItem(item.id, { endCol: snapped.x, endRow: snapped.y })
      if (snapped.axis === 'h') {
        const left = Math.min(item.col, snapped.x) - 4
        const right = Math.max(item.col, snapped.x) + 4
        setGuide({ x1: left, y1: item.row, x2: right, y2: item.row })
      } else if (snapped.axis === 'v') {
        const top = Math.min(item.row, snapped.y) - 4
        const bottom = Math.max(item.row, snapped.y) + 4
        setGuide({ x1: item.col, y1: top, x2: item.col, y2: bottom })
      } else {
        setGuide(null)
      }
      return
    }
    if (currentDrag.mode === 'brush') {
      const item = sceneRef.current.items.find((row) => row.id === currentDrag.id)
      const points = item?.points ?? []
      const last = points[points.length - 1]
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.12) return
      patchItem(currentDrag.id, { points: [...points, { x: point.x, y: point.y }] })
    }
  }

  function onPointerUp() {
    const currentDrag = drag.current
    drag.current = null
    setPanning(false)
    setGuide(null)
    setMarquee(null)
    if (currentDrag?.mode === 'press' && !currentDrag.additive) {
      clickPlace.current = { x: currentDrag.x, y: currentDrag.y }
    } else clickPlace.current = null
    if (currentDrag?.mode === 'grab' && !currentDrag.additive) {
      setSelection([currentDrag.hitId])
      const item = sceneRef.current.items.find((row) => row.id === currentDrag.hitId)
      if (item?.kind === 'text' && editingRef.current === item.id) placeCaret(item, currentDrag.x0)
    }
    if (currentDrag?.mode === 'move' && !currentDrag.shifted && !currentDrag.additive) {
      setSelection([currentDrag.hitId])
    }
    if (currentDrag?.mode === 'line') {
      const item = sceneRef.current.items.find((row) => row.id === currentDrag.id)
      if (item && Math.hypot((item.endCol ?? item.col) - item.col, (item.endRow ?? item.row) - item.row) < 0.35) {
        const current = sceneRef.current
        const next = { ...current, items: current.items.filter((row) => row.id !== item.id) }
        setScene(next)
        sceneRef.current = next
        persist(next)
      }
    }
    if (currentDrag?.mode === 'brush') {
      const item = sceneRef.current.items.find((row) => row.id === currentDrag.id)
      if (item && (item.points?.length ?? 0) < 2) {
        const current = sceneRef.current
        const next = { ...current, items: current.items.filter((row) => row.id !== item.id) }
        setScene(next)
        sceneRef.current = next
        persist(next)
      }
    }
    if (gestureBase.current && gestureBase.current !== sceneRef.current) {
      historyRef.current.push(gestureBase.current)
      if (historyRef.current.length > 40) historyRef.current.shift()
      futureRef.current = []
    }
    gestureBase.current = null
  }

  function deleteSelected() {
    const ids = new Set(selectedRef.current)
    if (ids.size === 0) return
    gestureBase.current = null
    commit({
      ...scene,
      items: scene.items.filter((item) => isLockedItem(item) || !ids.has(item.id)),
    })
    setSelection([])
    setEditingId(null)
  }

  function paintColor(next: GridColor) {
    setColor(next)
    setColorsOpen(false)
    const ids = new Set(selectedRef.current)
    if (ids.size === 0) return
    const current = sceneRef.current
    commit({
      ...current,
      items: current.items.map((item) => (ids.has(item.id) && !isLockedItem(item) ? { ...item, color: next } : item)),
    })
  }

  const width = scene.cols * GRID_CELL
  const height = scene.rows * GRID_CELL
  const selected = selectedIds.length > 0

  return (
    <div ref={boardRef} className={`grid-board${theme === 'dark' ? ' is-dark' : ''}`}>
      <div className="grid-board-stage">
      <div className="grid-board-toolbar" role="toolbar" aria-label="Herramientas de pizarra">
        <button
          type="button"
          className={`grid-board-tool${tool === 'select' ? ' is-on' : ''}`}
          title="Seleccionar"
          aria-label="Seleccionar"
          aria-pressed={tool === 'select'}
          onClick={() => chooseTool('select')}
        >
          <Cursor size={16} weight="bold" />
        </button>
        <button
          type="button"
          className={`grid-board-tool${tool === 'line' ? ' is-on' : ''}`}
          title="Línea"
          aria-label="Línea"
          aria-pressed={tool === 'line'}
          onClick={() => chooseTool('line')}
        >
          <LineSegment size={16} weight="bold" />
        </button>
        <button
          type="button"
          className={`grid-board-tool${tool === 'brush' ? ' is-on' : ''}`}
          title="Pincel"
          aria-label="Pincel"
          aria-pressed={tool === 'brush'}
          onClick={() => chooseTool('brush')}
        >
          <PaintBrush size={16} weight="bold" />
        </button>
        <div className="grid-board-pop" ref={colorPopRef}>
          <button
            type="button"
            className={`grid-board-tool${colorsOpen ? ' is-on' : ''}`}
            title="Color"
            aria-label="Color"
            aria-expanded={colorsOpen}
            onClick={() => setColorsOpen((open) => !open)}
          >
            <span className="grid-board-swatch" style={{ '--swatch': GRID_COLORS[color] } as CSSProperties} />
          </button>
          {colorsOpen && (
            <div className="grid-board-menu" role="menu">
              {COLOR_ORDER.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  data-color={entry}
                  className={`grid-board-color${color === entry ? ' is-on' : ''}`}
                  style={{ '--swatch': GRID_COLORS[entry] } as CSSProperties}
                  aria-label={`Color ${entry}`}
                  onClick={() => paintColor(entry)}
                />
              ))}
            </div>
          )}
        </div>
        <span className="grid-board-corner">
          <button type="button" className="grid-board-tool" aria-label="Deshacer" title="Deshacer" onClick={undo}>
            <ArrowCounterClockwise size={16} weight="bold" />
          </button>
          <button type="button" className="grid-board-tool" aria-label="Rehacer" title="Rehacer" onClick={redo}>
            <ArrowClockwise size={16} weight="bold" />
          </button>
          <button
            type="button"
            className="grid-board-tool"
            aria-label="Alejar"
            onClick={() => {
              const svg = svgRef.current
              zoomAt(zoomRef.current / 1.15, (svg?.clientWidth ?? 0) / 2, (svg?.clientHeight ?? 0) / 2)
            }}
          >
            <MagnifyingGlassMinus size={16} weight="bold" />
          </button>
          <button
            type="button"
            className="grid-board-tool"
            aria-label="Acercar"
            onClick={() => {
              const svg = svgRef.current
              zoomAt(zoomRef.current * 1.15, (svg?.clientWidth ?? 0) / 2, (svg?.clientHeight ?? 0) / 2)
            }}
          >
            <MagnifyingGlassPlus size={16} weight="bold" />
          </button>
          <button
            type="button"
            className="grid-board-tool"
            aria-label="Borrar"
            disabled={!selected}
            onClick={deleteSelected}
          >
            <Trash size={16} weight="bold" />
          </button>
        </span>
      </div>
        <input ref={textEditRef} className="grid-board-text-edit" aria-hidden tabIndex={-1} />
        <svg
          ref={svgRef}
          className={`grid-board-svg${tool === 'select' ? ' is-select' : ' is-draw'}${hoverId ? ' is-hover' : ''}${panning ? ' is-panning' : ''}`}
          width="100%"
          height="100%"
          onPointerDown={onPointerDown}
          onClick={onBoardClick}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={() => setHoverId(null)}
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            <defs>
              <pattern
                id={gridPatternId}
                width={GRID_CELL}
                height={GRID_CELL}
                patternUnits="userSpaceOnUse"
              >
                <path className="grid-board-line" d={`M ${GRID_CELL} 0 L 0 0 0 ${GRID_CELL}`} />
              </pattern>
            </defs>
            <rect className="grid-board-paper" x={0} y={0} width={width} height={height} />
            <rect x={0} y={0} width={width} height={height} fill={`url(#${gridPatternId})`} />
            {scene.items.map((item) => (
              <BoardShape
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                hovered={item.id === hoverId && !selectedIds.includes(item.id)}
                editing={item.id === editingId}
                caret={caretIndex}
              />
            ))}
            {marquee && (
              <rect
                className="grid-board-marquee"
                x={Math.min(marquee.x1, marquee.x2) * GRID_CELL}
                y={Math.min(marquee.y1, marquee.y2) * GRID_CELL}
                width={Math.abs(marquee.x2 - marquee.x1) * GRID_CELL}
                height={Math.abs(marquee.y2 - marquee.y1) * GRID_CELL}
              />
            )}
            {guide && (
              <line
                className="grid-board-snap"
                x1={guide.x1 * GRID_CELL}
                y1={guide.y1 * GRID_CELL}
                x2={guide.x2 * GRID_CELL}
                y2={guide.y2 * GRID_CELL}
              />
            )}
          </g>
        </svg>
        <p className="grid-board-zoom" aria-label={`Zoom ${Math.round(zoom * 100)} por ciento`}>
          {Math.round(zoom * 100)}%
        </p>
      </div>
    </div>
  )
})

function TextCaret({ col, row }: { col: number; row: number }) {
  return (
    <rect
      className="grid-board-caret"
      x={col * GRID_CELL - 1}
      y={row * GRID_CELL + 3}
      width={2}
      height={GRID_CELL - 6}
    />
  )
}

function BoardShape({
  item,
  selected,
  hovered,
  editing,
  caret,
}: {
  item: GridItem
  selected: boolean
  hovered: boolean
  editing: boolean
  caret: number
}) {
  const ink = item.layer === 'ai' ? '#1c1917' : strokeOf(item)
  if (item.kind === 'image' && item.src) {
    return (
      <image
        href={item.src}
        crossOrigin="anonymous"
        x={item.col * GRID_CELL}
        y={item.row * GRID_CELL}
        width={item.w * GRID_CELL}
        height={item.h * GRID_CELL}
        preserveAspectRatio="xMidYMid meet"
      />
    )
  }
  if (item.kind === 'text' && item.layer === 'ai') {
    const size = 20
    const lines = wrapLines(item.text || '', 36)
    const x = item.col * GRID_CELL
    const y = item.row * GRID_CELL + size
    return (
      <text className="grid-board-ai-text" x={x} y={y} fontSize={size}>
        {lines.map((line, index) => (
          <tspan key={index} x={x} dy={index === 0 ? 0 : size * 1.25}>
            {line || ' '}
          </tspan>
        ))}
      </text>
    )
  }
  if (item.kind === 'text') {
    const chars = textChars(item.text ?? '')
    if (chars.length === 0) {
      if (!editing) return null
      return (
        <rect
          className="grid-board-caret-cell"
          x={item.col * GRID_CELL + 1}
          y={item.row * GRID_CELL + 1}
          width={GRID_CELL - 2}
          height={GRID_CELL - 2}
          rx={3}
        />
      )
    }
    const mark = editing ? '' : hovered ? 'grid-board-hover' : selected ? 'grid-board-select' : ''
    return (
      <g>
        {mark && (
          <rect
            className={mark}
            x={item.col * GRID_CELL}
            y={item.row * GRID_CELL}
            width={chars.length * GRID_CELL}
            height={GRID_CELL}
            rx={4}
          />
        )}
        {chars.map((ch, index) => (
          <text
            key={index}
            x={(item.col + index) * GRID_CELL + GRID_CELL / 2}
            y={item.row * GRID_CELL + GRID_CELL * 0.74}
            textAnchor="middle"
            fill={ink}
            fontSize={GRID_CELL * 0.72}
          >
            {ch}
          </text>
        ))}
        {editing && <TextCaret col={item.col + Math.min(caret, chars.length)} row={item.row} />}
      </g>
    )
  }
  if (item.kind === 'brush' && item.points && item.points.length > 1) {
    const d = item.points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * GRID_CELL} ${point.y * GRID_CELL}`)
      .join(' ')
    return (
      <g>
        {selected && (
          <>
            <path className="grid-board-stroke-select" d={d} />
            <path className="grid-board-stroke-gap" d={d} />
          </>
        )}
        {hovered && !selected && (
          <path className="grid-board-stroke-hover" d={d} />
        )}
        <path d={d} fill="none" stroke={ink} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )
  }
  if (item.kind === 'line' || item.kind === 'arrow') {
    const x1 = item.col * GRID_CELL
    const y1 = item.row * GRID_CELL
    const x2 = (item.endCol ?? item.col) * GRID_CELL
    const y2 = (item.endRow ?? item.row) * GRID_CELL
    return (
      <g>
        {selected && (
          <>
            <line className="grid-board-stroke-select" x1={x1} y1={y1} x2={x2} y2={y2} />
            <line className="grid-board-stroke-gap" x1={x1} y1={y1} x2={x2} y2={y2} />
          </>
        )}
        {hovered && !selected && (
          <line className="grid-board-stroke-hover" x1={x1} y1={y1} x2={x2} y2={y2} />
        )}
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={3} strokeLinecap="round" />
      </g>
    )
  }
  const box = itemBBox(item)
  return (
    <rect
      x={box.col * GRID_CELL}
      y={box.row * GRID_CELL}
      width={Math.max(GRID_CELL, box.w * GRID_CELL)}
      height={Math.max(GRID_CELL, box.h * GRID_CELL)}
      fill="none"
      stroke={ink}
      strokeWidth={2.5}
    />
  )
}
