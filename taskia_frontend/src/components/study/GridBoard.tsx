import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
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

type Drag =
  | { mode: 'pan'; x: number; y: number; panX: number; panY: number }
  | { mode: 'move'; id: string; x0: number; y0: number; origin: GridItem }
  | { mode: 'line'; id: string }
  | { mode: 'brush'; id: string }
  | { mode: 'press'; x: number; y: number; cx: number; cy: number; panX: number; panY: number }
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

function hitsStudent(item: GridItem, x: number, y: number) {
  if (isLockedItem(item)) return false
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
  return x >= box.col && x <= box.col + box.w && y >= box.row && y <= box.row + Math.max(box.h, 1.2)
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [caretIndex, setCaretIndex] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [guide, setGuide] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const textEditRef = useRef<HTMLInputElement>(null)
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

  sceneRef.current = scene
  zoomRef.current = zoom
  panRef.current = pan
  colorRef.current = color
  toolRef.current = tool
  caretRef.current = caretIndex
  editingRef.current = editingId

  const persist = useCallback(
    (next: StudyBoardScene) => {
      if (saveTimer.current != null) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => onSave(next), 280)
    },
    [onSave],
  )

  const commit = useCallback(
    (next: StudyBoardScene) => {
      if (!gestureBase.current) {
        historyRef.current.push(sceneRef.current)
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
    setSelectedId(null)
    setEditingId(null)
  }, [persist])

  const redo = useCallback(() => {
    const next = futureRef.current.pop()
    if (!next) return
    historyRef.current.push(sceneRef.current)
    setScene(next)
    sceneRef.current = next
    persist(next)
    setSelectedId(null)
    setEditingId(null)
  }, [persist])

  useImperativeHandle(
    ref,
    () => ({
      applyDrawOps(ops: DrawOp[]) {
        const next = applyDrawOpsToGrid(emptyGridScene(), ops)
        const kept = sceneRef.current.items.filter((item) => item.layer === 'student')
        commit({ ...next, items: [...next.items.filter((item) => item.layer === 'ai'), ...kept] })
        setSelectedId(null)
      },
      applyAiItems(items: GridItem[], nextScene?: unknown, highlightIds?: string[]) {
        commit(applyAiItems(sceneRef.current, items, nextScene, highlightIds))
        setSelectedId(null)
      },
      applySheet(sheet: BoardSheet | null) {
        commit(applySheet(sceneRef.current, sheet))
        setSelectedId(null)
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

  useEffect(() => {
    if (!editingId) return
    const timer = window.setTimeout(() => textEditRef.current?.focus(), 0)
    const onKey = (event: KeyboardEvent) => {
      if (!editingRef.current) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        setEditingId(null)
        return
      }
      const item = sceneRef.current.items.find((row) => row.id === editingRef.current)
      if (!item || item.kind !== 'text' || isLockedItem(item)) return
      if (event.key === 'Backspace') {
        event.preventDefault()
        const chars = textChars(item.text ?? '')
        const at = caretRef.current
        if (at <= 0 && chars.length === 0) return
        if (at > 0) chars.splice(at - 1, 1)
        const text = chars.join('')
        caretRef.current = Math.max(0, at - 1)
        setCaretIndex(caretRef.current)
        patchItem(item.id, { text, w: Math.max(2, textChars(text).length) })
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
      patchItem(item.id, { text, w: Math.max(2, textChars(text).length) })
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [editingId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (editingRef.current) return
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [redo, undo])

  function patchItem(id: string, patch: Partial<GridItem>) {
    const current = sceneRef.current
    const next = {
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }
    commit(next)
  }

  function topStudentAt(x: number, y: number) {
    return [...sceneRef.current.items].reverse().find((item) => hitsStudent(item, x, y))
  }

  function placeText(x: number, y: number) {
    const item = makeStudentItem('text', x, y, colorRef.current, undefined, '')
    item.w = 2
    item.h = 1.4
    const current = sceneRef.current
    gestureBase.current = null
    commit({ ...current, items: [...current.items, item] })
    setSelectedId(item.id)
    caretRef.current = 0
    setCaretIndex(0)
    setEditingId(item.id)
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    svg.setPointerCapture(event.pointerId)
    const point = cellPoint(event.clientX, event.clientY, svg, zoomRef.current, panRef.current.x, panRef.current.y)
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
      drag.current = { mode: 'line', id: item.id }
      setSelectedId(item.id)
      setEditingId(null)
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
      drag.current = { mode: 'brush', id: item.id }
      setSelectedId(item.id)
      setEditingId(null)
      return
    }
    const hit = topStudentAt(point.x, point.y)
    if (hit) {
      gestureBase.current = sceneRef.current
      drag.current = { mode: 'move', id: hit.id, x0: point.x, y0: point.y, origin: hit }
      setSelectedId(hit.id)
      if (hit.kind === 'text') {
        caretRef.current = textChars(hit.text ?? '').length
        setCaretIndex(caretRef.current)
        setEditingId(hit.id)
      } else {
        setEditingId(null)
      }
      return
    }
    setSelectedId(null)
    setEditingId(null)
    drag.current = {
      mode: 'press',
      x: point.x,
      y: point.y,
      cx: event.clientX,
      cy: event.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    }
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    const currentDrag = drag.current
    if (!svg || !currentDrag) return
    const point = cellPoint(event.clientX, event.clientY, svg, zoomRef.current, panRef.current.x, panRef.current.y)
    if (currentDrag.mode === 'press') {
      if (Math.hypot(event.clientX - currentDrag.cx, event.clientY - currentDrag.cy) < 6) return
      drag.current = {
        mode: 'pan',
        x: event.clientX,
        y: event.clientY,
        panX: currentDrag.panX,
        panY: currentDrag.panY,
      }
      setPanning(true)
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
      const moved = shiftItem(currentDrag.origin, dx, dy)
      const current = sceneRef.current
      const next = { ...current, items: current.items.map((item) => (item.id === moved.id ? moved : item)) }
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
    if (currentDrag?.mode === 'press') placeText(currentDrag.x, currentDrag.y)
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
    if (!selectedId) return
    const item = scene.items.find((row) => row.id === selectedId)
    if (!item || isLockedItem(item)) return
    gestureBase.current = null
    commit({ ...scene, items: scene.items.filter((row) => row.id !== selectedId) })
    setSelectedId(null)
    setEditingId(null)
  }

  function paintColor(next: GridColor) {
    setColor(next)
    setColorsOpen(false)
    if (!selectedId) return
    const item = sceneRef.current.items.find((row) => row.id === selectedId)
    if (!item || isLockedItem(item)) return
    patchItem(item.id, { color: next })
  }

  const width = scene.cols * GRID_CELL
  const height = scene.rows * GRID_CELL
  const selected = scene.items.find((item) => item.id === selectedId && !isLockedItem(item))

  return (
    <div className={`grid-board${theme === 'dark' ? ' is-dark' : ''}`}>
      <div className="grid-board-toolbar" role="toolbar" aria-label="Herramientas de pizarra">
        <button
          type="button"
          className={`grid-board-tool${tool === 'select' ? ' is-on' : ''}`}
          title="Mover"
          aria-label="Mover"
          aria-pressed={tool === 'select'}
          onClick={() => setTool('select')}
        >
          <Cursor size={16} weight="bold" />
        </button>
        <button
          type="button"
          className={`grid-board-tool${tool === 'line' ? ' is-on' : ''}`}
          title="Línea"
          aria-label="Línea"
          aria-pressed={tool === 'line'}
          onClick={() => setTool('line')}
        >
          <LineSegment size={16} weight="bold" />
        </button>
        <button
          type="button"
          className={`grid-board-tool${tool === 'brush' ? ' is-on' : ''}`}
          title="Pincel"
          aria-label="Pincel"
          aria-pressed={tool === 'brush'}
          onClick={() => setTool('brush')}
        >
          <PaintBrush size={16} weight="bold" />
        </button>
        <div className="grid-board-pop">
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
            onClick={() => setZoom((value) => Math.max(0.15, Number((value - 0.15).toFixed(2))))}
          >
            <MagnifyingGlassMinus size={16} weight="bold" />
          </button>
          <button
            type="button"
            className="grid-board-tool"
            aria-label="Acercar"
            onClick={() => setZoom((value) => Math.min(2.2, Number((value + 0.15).toFixed(2))))}
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
      <div className="grid-board-stage">
        <input ref={textEditRef} className="grid-board-text-edit" aria-hidden tabIndex={-1} />
        <svg
          ref={svgRef}
          className={`grid-board-svg${tool === 'select' ? ' is-select' : ' is-draw'}${panning ? ' is-panning' : ''}`}
          width="100%"
          height="100%"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            <rect className="grid-board-paper" x={0} y={0} width={width} height={height} />
            {scene.items.map((item) => (
              <BoardShape key={item.id} item={item} selected={item.id === selectedId} editing={item.id === editingId} caret={caretIndex} />
            ))}
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
      </div>
    </div>
  )
})

function BoardShape({
  item,
  selected,
  editing,
  caret,
}: {
  item: GridItem
  selected: boolean
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
  if (item.kind === 'text') {
    const size = item.layer === 'ai' ? 26 : 22
    const lines = wrapLines(item.text || (editing ? '' : ''), item.layer === 'ai' ? 42 : 80)
    const x = item.col * GRID_CELL
    const y = item.row * GRID_CELL + size
    return (
      <g>
        {selected && (
          <rect
            x={x - 4}
            y={item.row * GRID_CELL - 4}
            width={Math.max(28, (item.w || 2) * GRID_CELL)}
            height={Math.max(size + 8, lines.length * size * 1.25)}
            fill="none"
            stroke="var(--accent)"
            strokeDasharray="4 3"
          />
        )}
        <text x={x} y={y} fill={ink} fontSize={size}>
          {lines.map((line, index) => (
            <tspan key={index} x={x} dy={index === 0 ? 0 : size * 1.25}>
              {line || (editing ? '' : ' ')}
            </tspan>
          ))}
        </text>
        {editing && (
          <rect
            className="grid-board-caret"
            x={x + Math.min(caret, textChars(item.text ?? '').length) * size * 0.55}
            y={item.row * GRID_CELL + 4}
            width={2}
            height={size}
          />
        )}
      </g>
    )
  }
  if (item.kind === 'brush' && item.points && item.points.length > 1) {
    const d = item.points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * GRID_CELL} ${point.y * GRID_CELL}`)
      .join(' ')
    return (
      <path
        d={d}
        fill="none"
        stroke={ink}
        strokeWidth={selected ? 4.5 : 3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }
  if (item.kind === 'line' || item.kind === 'arrow') {
    const x1 = item.col * GRID_CELL
    const y1 = item.row * GRID_CELL
    const x2 = (item.endCol ?? item.col) * GRID_CELL
    const y2 = (item.endRow ?? item.row) * GRID_CELL
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={ink}
        strokeWidth={selected ? 4 : 3}
        strokeLinecap="round"
      />
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
