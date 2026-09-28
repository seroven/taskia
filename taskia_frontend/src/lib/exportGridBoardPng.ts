import { GRID_CELL, itemBBox } from './gridBoardModel'
import type { StudyBoardScene } from './studyProtocol'

/** Recorte del contenido (+ margen) en píxeles de papel. */
export function boardContentCrop(scene: StudyBoardScene, padCells = 3) {
  const items = scene.items ?? []
  if (items.length === 0) return null
  let minC = Infinity
  let minR = Infinity
  let maxC = -Infinity
  let maxR = -Infinity
  for (const item of items) {
    const box = itemBBox(item)
    minC = Math.min(minC, box.col)
    minR = Math.min(minR, box.row)
    maxC = Math.max(maxC, box.col + box.w)
    maxR = Math.max(maxR, box.row + box.h)
  }
  const pad = Math.max(0, padCells)
  const col0 = Math.max(0, minC - pad)
  const row0 = Math.max(0, minR - pad)
  const col1 = Math.min(scene.cols, maxC + pad)
  const row1 = Math.min(scene.rows, maxR + pad)
  return {
    x: col0 * GRID_CELL,
    y: row0 * GRID_CELL,
    w: Math.max(GRID_CELL, (col1 - col0) * GRID_CELL),
    h: Math.max(GRID_CELL, (row1 - row0) * GRID_CELL),
  }
}

/**
 * Rasteriza el SVG de la pizarra a PNG (base64 sin data-URL).
 * Usa viewBox del contenido para no mandar la grilla entera vacía.
 */
export async function exportSvgBoardToPngBase64(
  svg: SVGSVGElement,
  opts: {
    dark: boolean
    crop: { x: number; y: number; w: number; h: number } | null
    paperW: number
    paperH: number
    maxSide?: number
  },
): Promise<string | null> {
  const crop = opts.crop ?? {
    x: 0,
    y: 0,
    w: opts.paperW,
    h: opts.paperH,
  }
  const maxSide = opts.maxSide ?? 1024
  const scale = Math.min(1, maxSide / Math.max(crop.w, crop.h))
  const outW = Math.max(1, Math.round(crop.w * scale))
  const outH = Math.max(1, Math.round(crop.h * scale))

  const clone = svg.cloneNode(true) as SVGSVGElement
  clone
    .querySelectorAll(
      '.grid-board-marquee, .grid-board-handle, .grid-board-caret, .grid-board-caret-cell',
    )
    .forEach((el) => el.remove())

  const world = clone.querySelector('g')
  if (world) {
    world.setAttribute('transform', 'translate(0 0) scale(1)')
  }

  const paperFill = opts.dark ? '#1f2937' : '#ffffff'
  const lineStroke = opts.dark
    ? 'rgba(148, 163, 184, 0.35)'
    : 'rgba(100, 116, 139, 0.28)'
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = `
    .grid-board-paper { fill: ${paperFill}; }
    .grid-board-line { stroke: ${lineStroke}; stroke-width: 1; fill: none; }
    text { font-family: system-ui, sans-serif; }
  `
  clone.insertBefore(style, clone.firstChild)

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(outW))
  clone.setAttribute('height', String(outH))
  clone.setAttribute(
    'viewBox',
    `${crop.x} ${crop.y} ${crop.w} ${crop.h}`,
  )
  clone.removeAttribute('class')

  const xml = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = paperFill
    ctx.fillRect(0, 0, outW, outH)
    ctx.drawImage(image, 0, 0, outW, outH)
    const dataUrl = canvas.toDataURL('image/png')
    const raw = dataUrl.replace(/^data:image\/png;base64,/, '')
    return raw || null
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo rasterizar la pizarra'))
    img.src = src
  })
}
