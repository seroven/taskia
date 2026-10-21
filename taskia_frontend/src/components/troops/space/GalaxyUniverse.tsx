import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus } from '@phosphor-icons/react'
import { ShipRenderer } from '../../ship/ShipRenderer'
import { MY_SHIP_WIDTH, OTHER_SHIP_WIDTH, layoutShips } from '../../../lib/shipLayout'
import { MAX_CREW } from '../../../lib/ship/types'
import { skyTile } from '../../../lib/skyTile'
import type { UniverseTroop } from '../../../lib/troopsTypes'

/** Ancho que ocupa la ficha abierta (px) y la pantalla mínima para que vaya al costado. */
const CARD_INSET = 400
const SIDE_CARD_MIN_WIDTH = 900

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2.4
/** Cuánto crece una nave al llegar al centro de la vista (1 = nada): las ajenas más; la propia ya es grande. */
const BOOST_OTHER = 0.95
const BOOST_MINE = 0.12

/**
 * Qué tan pegada sigue la cámara a lo que se le pide, como constante de tiempo (ms): menos es más pegada.
 * Al arrastrar va casi con el dedo pero suavizada; en un vuelo (abrir una nave) planea más despacio.
 */
const TC_DRAG = 55
const TC_ZOOM = 95
const TC_FLY = 190
/** Al soltar, la vista sigue deslizando un poco y se frena con esta constante de tiempo (ms). */
const INERTIA_TAU = 170
/** Tope de la velocidad con que sigue deslizando (px del mundo por ms): un tirón fuerte no la manda lejos. */
const INERTIA_MAX = 1.5
/** Lo que se mueve el puntero antes de que cuente como arrastre y no como clic (px). */
const DRAG_THRESHOLD = 6
const KEY_STEP = 90

/**
 * Capas del fondo: de la más lejana a la más cercana. `parallax` es cuánto sigue a la cámara (más cerca = más),
 * `speed` los px por segundo que derivan solas hacia la izquierda, como si las naves volaran hacia la derecha, y
 * `size` el lado de su baldosa (distinto en cada capa, para que el patrón no se note repetido).
 */
const SKY_LAYERS = [
  { id: 'far', kind: 'dust', seed: 11, size: 910, parallax: 0.05, speed: 5, opacity: 0.42 },
  { id: 'mid', kind: 'stars', seed: 23, size: 1130, parallax: 0.13, speed: 13, opacity: 0.55 },
  { id: 'near', kind: 'streaks', seed: 37, size: 830, parallax: 0.3, speed: 46, opacity: 0.3 },
] as const

type Props = {
  troops: UniverseTroop[]
  myTroopId: number | null
  openId: number | null
  /** Nombres de los miembros de la nave abierta (tooltip de las ventanillas). */
  openNames?: string[]
  onSelectTroop: (id: number) => void
  onClearTroop: () => void
  onRequestMore: () => void
  focusToken: number
}

/** `inset` y `insetY`: lo que tapa la ficha (al costado en pantallas anchas, abajo en las angostas). */
type Cam = { x: number; y: number; zoom: number; inset: number; insetY: number }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * La galaxia de naves. Se arrastra desde cualquier punto (también sobre una nave), con inercia: al soltar la vista
 * sigue deslizando un poco y se frena sola. La rueda, los botones, el teclado o el pellizco hacen zoom, y una nave
 * se agranda sola cuando se acerca al centro de la vista; la propia empieza al centro y grande. El fondo deriva
 * siempre, con o sin naves, y sigue a la cámara con parallax.
 *
 * La cámara vive en refs y las naves se mueven directo en el DOM: arrastrar no vuelve a pintar decenas de SVG.
 */
export function GalaxyUniverse({
  troops,
  myTroopId,
  openId,
  openNames,
  onSelectTroop,
  onClearTroop,
  onRequestMore,
  focusToken,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const shipEls = useRef(new Map<number, HTMLElement>())
  const labelEls = useRef(new Map<number, HTMLElement>())
  const skyEls = useRef(new Map<string, HTMLElement>())
  /** `cam` es lo que se ve; `goal`, hacia dónde va. Cada cuadro `cam` se acerca a `goal`. */
  const cam = useRef<Cam>({ x: 0, y: 0, zoom: 1, inset: 0, insetY: 0 })
  const goal = useRef<Cam>({ x: 0, y: 0, zoom: 1, inset: 0, insetY: 0 })
  const tc = useRef(TC_FLY)
  const vel = useRef({ x: 0, y: 0 })
  const inertia = useRef(false)
  const anchor = useRef<{ ox: number; oy: number } | null>(null)
  const loop = useRef({ raf: 0, last: 0 })
  /** El cuadro se pide a través de una ref: así `step` puede volver a pedirse a sí mismo. */
  const stepRef = useRef<(now: number) => void>(() => undefined)
  const tick = useCallback((now: number) => stepRef.current(now), [])
  const drag = useRef({ down: false, active: false, moved: false, x: 0, y: 0, startX: 0, startY: 0 })
  const samples = useRef<{ t: number; x: number; y: number }[]>([])
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const [reduced, setReduced] = useState(false)
  const [shooting, setShooting] = useState(false)

  const tiles = useMemo(() => SKY_LAYERS.map((layer) => ({ ...layer, url: skyTile(layer.kind, layer.seed, layer.size) })), [])

  const spots = useMemo(() => {
    const byId = new Map(troops.map((t) => [t.id, t]))
    return layoutShips(
      troops.map((t) => t.id),
      myTroopId,
    ).flatMap((point) => {
      const troop = byId.get(point.id)
      if (!troop) return []
      const mine = troop.id === myTroopId
      return [{ troop, x: point.x, y: point.y, mine, base: mine ? MY_SHIP_WIDTH : OTHER_SHIP_WIDTH }]
    })
  }, [troops, myTroopId])
  const spotsRef = useRef(spots)
  /** Nave con la ficha abierta y si ya llegó al centro de la vista; `clearRef` cierra la ficha cuando deja de ser el foco. */
  const focus = useRef<{ id: number | null; seen: boolean }>({ id: openId, seen: false })
  const clearRef = useRef(onClearTroop)
  useEffect(() => {
    focus.current = { id: openId, seen: false }
    clearRef.current = onClearTroop
  }, [openId, onClearTroop])

  /** Coloca cada nave según la cámara (posición, tamaño con el crecimiento por cercanía y profundidad) y mueve el fondo. */
  const draw = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const w = stage.clientWidth
    const h = stage.clientHeight
    const { x, y, zoom, inset, insetY } = cam.current
    const cx = (w - inset) / 2
    const cy = (h - insetY) / 2
    const reach = 0.55 * Math.min(w - inset, h - insetY)

    for (const layer of SKY_LAYERS) {
      const el = skyEls.current.get(layer.id)
      if (!el) continue
      const position = `${(x * zoom * layer.parallax).toFixed(1)}px ${(y * zoom * layer.parallax).toFixed(1)}px`
      el.style.maskPosition = position
      el.style.setProperty('-webkit-mask-position', position)
    }

    for (const spot of spotsRef.current) {
      const el = shipEls.current.get(spot.troop.id)
      const label = labelEls.current.get(spot.troop.id)
      if (!el) continue
      const sx = cx + (spot.x + x) * zoom
      const sy = cy + (spot.y + y) * zoom
      const dist = Math.hypot(sx - cx, sy - cy)
      const near = clamp(1 - dist / reach, 0, 1)
      if (spot.troop.id === focus.current.id) {
        // La ficha vive mientras su nave es el foco: llegó al centro (clic) y ya no se aleja de él.
        if (near > 0.5) focus.current.seen = true
        else if (focus.current.seen && near < 0.15) {
          focus.current.seen = false
          clearRef.current()
        }
      }
      const grow = 1 + (spot.mine ? BOOST_MINE : BOOST_OTHER) * (near * near * (3 - 2 * near))
      const scale = zoom * grow
      const half = spot.base * scale
      const visible = sx > -half && sx < w + half && sy > -half && sy < h + half
      el.style.visibility = visible ? 'visible' : 'hidden'
      el.style.transform = `translate(${(sx - spot.base / 2).toFixed(1)}px, ${(sy - spot.base / 4).toFixed(1)}px) scale(${scale.toFixed(3)})`
      el.style.zIndex = String(Math.round(scale * 100))
      if (label) {
        label.style.visibility = visible ? 'visible' : 'hidden'
        label.style.transform = `translate(${sx.toFixed(1)}px, ${(sy + (spot.base / 4) * scale + 4).toFixed(1)}px) translateX(-50%)`
        label.style.zIndex = String(Math.round(scale * 100) + 1)
      }
    }
  }, [])

  const moreAt = useRef(0)
  const checkFar = useCallback(() => {
    const { x, y } = cam.current
    const far = spotsRef.current.some((p) => Math.hypot(p.x + x, p.y + y) > 1500)
    if (!far) return
    const now = Date.now()
    if (now - moreAt.current < 900) return
    moreAt.current = now
    onRequestMore()
  }, [onRequestMore])

  /** Un cuadro de la cámara: aplica la inercia, acerca `cam` a `goal`, dibuja y decide si sigue. */
  const step = useCallback(
    (now: number) => {
      const state = loop.current
      const dt = Math.min(48, Math.max(1, now - state.last))
      state.last = now

      if (inertia.current) {
        goal.current.x += vel.current.x * dt
        goal.current.y += vel.current.y * dt
        const decay = Math.exp(-dt / INERTIA_TAU)
        vel.current.x *= decay
        vel.current.y *= decay
        if (Math.hypot(vel.current.x, vel.current.y) < 0.012) {
          inertia.current = false
          vel.current = { x: 0, y: 0 }
        }
      }

      const k = reduced ? 1 : 1 - Math.exp(-dt / tc.current)
      const c = cam.current
      const g = goal.current
      const before = c.zoom
      c.x += (g.x - c.x) * k
      c.y += (g.y - c.y) * k
      c.zoom += (g.zoom - c.zoom) * k
      c.inset += (g.inset - c.inset) * k
      c.insetY += (g.insetY - c.insetY) * k
      if (anchor.current && c.zoom !== before) {
        // El punto del mundo bajo el cursor se queda quieto mientras cambia el zoom.
        const shift = (axis: number) => axis * (1 / c.zoom - 1 / before)
        const dx = shift(anchor.current.ox)
        const dy = shift(anchor.current.oy)
        c.x += dx
        c.y += dy
        g.x += dx
        g.y += dy
      }
      draw()
      checkFar()

      const settled =
        Math.abs(g.x - c.x) < 0.05 &&
        Math.abs(g.y - c.y) < 0.05 &&
        Math.abs(g.zoom - c.zoom) < 0.0004 &&
        Math.abs(g.inset - c.inset) < 0.3 &&
        Math.abs(g.insetY - c.insetY) < 0.3
      if (settled && !inertia.current && !drag.current.active) {
        Object.assign(c, g)
        anchor.current = null
        draw()
        state.raf = 0
        return
      }
      state.raf = requestAnimationFrame(tick)
    },
    [draw, checkFar, reduced, tick],
  )

  useEffect(() => {
    stepRef.current = step
  }, [step])

  const wake = useCallback(() => {
    if (loop.current.raf) return
    loop.current.last = performance.now()
    loop.current.raf = requestAnimationFrame(tick)
  }, [tick])

  /** Lleva la cámara a `to`: planea hacia allá (o salta si el sistema pide menos movimiento o `ms` es 0). */
  const flyTo = useCallback(
    (to: Partial<Cam>, ms = 650) => {
      inertia.current = false
      vel.current = { x: 0, y: 0 }
      anchor.current = null
      goal.current = { ...goal.current, ...to, zoom: clamp(to.zoom ?? goal.current.zoom, ZOOM_MIN, ZOOM_MAX) }
      tc.current = TC_FLY
      if (ms === 0) cam.current = { ...goal.current }
      wake()
    },
    [wake],
  )

  const zoomTo = useCallback(
    (zoom: number, cursorX?: number, cursorY?: number) => {
      const stage = stageRef.current
      if (!stage) return
      const cx = (stage.clientWidth - cam.current.inset) / 2
      const cy = (stage.clientHeight - cam.current.insetY) / 2
      anchor.current = { ox: (cursorX ?? cx) - cx, oy: (cursorY ?? cy) - cy }
      goal.current.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX)
      tc.current = TC_ZOOM
      wake()
    },
    [wake],
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (reduced) return
    let timer = 0
    const arm = () => {
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') setShooting(true)
        window.setTimeout(() => setShooting(false), 1400)
        arm()
      }, 9000 + Math.random() * 8000)
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        window.clearTimeout(timer)
        setShooting(false)
      } else arm()
    }
    arm()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [reduced])

  // La ficha abierta se pone al costado (o abajo, en pantallas angostas) y la vista se corre para que la nave quede en el espacio libre.
  const insetFor = useCallback((open: boolean) => {
    const w = stageRef.current?.clientWidth ?? 0
    const h = stageRef.current?.clientHeight ?? 0
    if (!open) return { inset: 0, insetY: 0 }
    return w >= SIDE_CARD_MIN_WIDTH ? { inset: CARD_INSET, insetY: 0 } : { inset: 0, insetY: Math.min(h * 0.5, 440) }
  }, [])

  /** Zoom en que mi nave ocupa ~80 % del ancho: 1 en pantallas anchas, menos en un móvil. */
  const fitZoom = useCallback(() => clamp(((stageRef.current?.clientWidth ?? 1000) * 0.8) / MY_SHIP_WIDTH, 0.5, 1), [])

  // Va antes que los efectos de foco: ellos leen `spotsRef`.
  useEffect(() => {
    spotsRef.current = spots
    draw()
  }, [spots, draw])

  // Foco inicial y «Volver a mi tripulación»: mi nave al centro y grande.
  const lastFocus = useRef(-1)
  useEffect(() => {
    if (spots.length === 0 || lastFocus.current === focusToken) return
    const mine = spots.find((spot) => spot.troop.id === myTroopId) ?? spots[0]
    if (!mine) return
    const first = lastFocus.current === -1
    lastFocus.current = focusToken
    flyTo({ x: -mine.x, y: -mine.y, zoom: fitZoom(), ...insetFor(openId != null) }, first ? 0 : 700)
  }, [spots, focusToken, myTroopId, openId, flyTo, insetFor, fitZoom])

  // Abrir una nave acerca la cámara a ella; cerrar la ficha devuelve el centro de la vista.
  const lastOpen = useRef<number | null>(null)
  useEffect(() => {
    if (lastOpen.current === openId) return
    lastOpen.current = openId
    const inset = insetFor(openId != null)
    if (openId == null) {
      flyTo(inset, 450)
      return
    }
    const spot = spotsRef.current.find((s) => s.troop.id === openId)
    if (!spot) return
    flyTo({ x: -spot.x, y: -spot.y, zoom: Math.max(goal.current.zoom, (spot.mine ? 1 : 1.15) * fitZoom()), ...inset }, 650)
  }, [openId, flyTo, insetFor, fitZoom])

  useEffect(() => {
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomTo(goal.current.zoom * Math.exp(-event.deltaY * 0.0016), event.clientX - rect.left, event.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomTo])

  useEffect(
    () => () => {
      cancelAnimationFrame(loop.current.raf)
      loop.current.raf = 0
    },
    [],
  )

  /** Mueve la vista `dx`, `dy` px de pantalla (el objetivo; la cámara lo alcanza suavizada). */
  const panBy = (dx: number, dy: number) => {
    goal.current.x += dx / cam.current.zoom
    goal.current.y += dy / cam.current.zoom
    tc.current = TC_DRAG
    wake()
  }

  return (
    <div
      ref={stageRef}
      className="galaxy-stage"
      tabIndex={0}
      aria-label="Galaxia de naves"
      // Sin esto el navegador puede iniciar un arrastre nativo (de una selección o del SVG) y cancelar los eventos del puntero.
      onDragStart={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        const step = event.shiftKey ? KEY_STEP * 3 : KEY_STEP
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [step, 0],
          ArrowRight: [-step, 0],
          ArrowUp: [0, step],
          ArrowDown: [0, -step],
        }
        if (moves[event.key]) {
          event.preventDefault()
          panBy(...moves[event.key]!)
        } else if (event.key === '+' || event.key === '=') zoomTo(goal.current.zoom * 1.25)
        else if (event.key === '-') zoomTo(goal.current.zoom * 0.8)
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('.galaxy-zoom')) return
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()]
          pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: goal.current.zoom }
          drag.current.down = false
          drag.current.active = false
          return
        }
        // Todavía no es un arrastre: si el puntero casi no se mueve, el clic llega intacto a la nave o al vacío.
        drag.current = { down: true, active: false, moved: false, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY }
        samples.current = [{ t: performance.now(), x: event.clientX, y: event.clientY }]
        inertia.current = false
        vel.current = { x: 0, y: 0 }
      }}
      onPointerMove={(event) => {
        if (pointers.current.has(event.pointerId)) {
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        }
        if (pinch.current && pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()]
          const rect = stageRef.current?.getBoundingClientRect()
          zoomTo(
            pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist),
            rect ? (a.x + b.x) / 2 - rect.left : undefined,
            rect ? (a.y + b.y) / 2 - rect.top : undefined,
          )
          return
        }
        const d = drag.current
        if (!d.down) return
        if (!d.active) {
          if (Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < DRAG_THRESHOLD) return
          // Pasó el umbral: ahora sí es un arrastre y el puntero se captura aquí.
          d.active = true
          d.moved = true
          d.x = d.startX
          d.y = d.startY
          event.currentTarget.setPointerCapture(event.pointerId)
          event.currentTarget.classList.add('is-dragging')
          anchor.current = null
        }
        panBy(event.clientX - d.x, event.clientY - d.y)
        d.x = event.clientX
        d.y = event.clientY
        const now = performance.now()
        samples.current.push({ t: now, x: event.clientX, y: event.clientY })
        while (samples.current.length > 2 && now - samples.current[0]!.t > 110) samples.current.shift()
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId)
        if (pointers.current.size < 2) pinch.current = null
        const d = drag.current
        event.currentTarget.classList.remove('is-dragging')
        if (d.active) {
          // La velocidad de los últimos ~100 ms: si el puntero se detuvo antes de soltar, no hay inercia.
          const list = samples.current
          const first = list[0]
          const last = list[list.length - 1]
          const now = performance.now()
          if (first && last && last.t > first.t && now - last.t < 90 && !reduced) {
            const span = last.t - first.t
            const vx = (last.x - first.x) / span / cam.current.zoom
            const vy = (last.y - first.y) / span / cam.current.zoom
            const speed = Math.hypot(vx, vy)
            const scale = speed > INERTIA_MAX ? INERTIA_MAX / speed : 1
            vel.current = { x: vx * scale, y: vy * scale }
            inertia.current = speed > 0.03
          }
          wake()
        }
        d.down = false
        d.active = false
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId)
        pinch.current = null
        drag.current.down = false
        drag.current.active = false
        event.currentTarget.classList.remove('is-dragging')
      }}
      onClick={(event) => {
        if (drag.current.moved) {
          drag.current.moved = false
          return
        }
        if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.sky === '1') {
          onClearTroop()
        }
      }}
    >
      <div className="galaxy-sky" data-sky="1">
        <div className="galaxy-nebula nebula-a" />
        <div className="galaxy-nebula nebula-b" />
        <div className="galaxy-nebula nebula-c" />
        {tiles.map((layer) => (
          <div
            key={layer.id}
            ref={(node) => {
              if (node) skyEls.current.set(layer.id, node)
              else skyEls.current.delete(layer.id)
            }}
            className={`galaxy-layer galaxy-layer--${layer.id}${reduced ? ' is-still' : ''}`}
            data-sky="1"
            style={{
              maskImage: layer.url,
              WebkitMaskImage: layer.url,
              opacity: layer.opacity,
              ['--tile' as string]: `${layer.size}px`,
              ['--drift' as string]: `${(layer.size / layer.speed).toFixed(1)}s`,
            }}
          />
        ))}
        {shooting && <span className="galaxy-shooting" />}
      </div>

      <div className="galaxy-world" data-sky="1">
        {spots.map(({ troop, base, mine }, index) => {
          const rank = troop.rank != null && troop.rank <= 3 ? troop.rank : null
          const open = openId === troop.id
          return (
            <div key={troop.id}>
              <div
                ref={(node) => {
                  if (node) shipEls.current.set(troop.id, node)
                  else shipEls.current.delete(troop.id)
                }}
                className={`galaxy-ship${mine ? ' is-mine' : ''}${open ? ' is-open' : ''}${reduced ? ' is-still' : ''}`}
                style={{ width: base, ['--bob-delay' as string]: `${-(index % 7) * 0.7}s` }}
              >
                {mine && <span className="galaxy-aura" />}
                {rank != null && (
                  <span className={`galaxy-medal galaxy-medal--${rank}`} title={`Puesto ${rank} del ranking semanal`}>
                    {rank}
                  </span>
                )}
                <button
                  type="button"
                  className="galaxy-ship-hit"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelectTroop(troop.id)
                  }}
                  aria-label={troop.name}
                >
                  <span className="galaxy-ship-art">
                    <ShipRenderer
                      config={troop.ship_config}
                      crew={Math.min(troop.member_count, MAX_CREW)}
                      crewNames={open ? openNames : undefined}
                      animate={!reduced}
                    />
                  </span>
                </button>
              </div>
              <button
                type="button"
                ref={(node) => {
                  if (node) labelEls.current.set(troop.id, node)
                  else labelEls.current.delete(troop.id)
                }}
                className={`space-ship-name${mine ? ' is-mine' : ''}${open ? ' is-open' : ''}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectTroop(troop.id)
                }}
              >
                {troop.name}
              </button>
            </div>
          )
        })}
      </div>

      <div className="galaxy-zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Acercar" onClick={() => zoomTo(goal.current.zoom * 1.25)}>
          <Plus size={18} weight="bold" />
        </button>
        <button type="button" aria-label="Alejar" onClick={() => zoomTo(goal.current.zoom * 0.8)}>
          <Minus size={18} weight="bold" />
        </button>
      </div>
    </div>
  )
}
