import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Minus, Plus } from '@phosphor-icons/react'
import { ShipRenderer } from '../../ship/ShipRenderer'
import { MY_SHIP_WIDTH, OTHER_SHIP_WIDTH, layoutShips } from '../../../lib/shipLayout'
import { MAX_CREW } from '../../../lib/ship/types'
import type { UniverseTroop } from '../../../lib/troopsTypes'

const RANK_COLOR: Record<number, string> = {
  1: '#fbbf24',
  2: '#e2e8f0',
  3: '#d97706',
}

/** Ancho que ocupa la ficha abierta (px) y la pantalla mínima para que vaya al costado. */
const CARD_INSET = 400
const SIDE_CARD_MIN_WIDTH = 900

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2.4
/** Cuánto crece una nave al llegar al centro de la vista (1 = nada): las ajenas más; la propia ya es grande. */
const BOOST_OTHER = 0.95
const BOOST_MINE = 0.12

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

function starField(count: number, seed: number, big: boolean) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Array.from({ length: count }, (_, index) => ({
    id: `${big ? 'b' : 's'}-${index}`,
    left: `${next() * 100}%`,
    top: `${next() * 100}%`,
    delay: `${next() * 4}s`,
    size: big ? 3 + next() * 2.5 : 1 + next() * 1.4,
  }))
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/**
 * La galaxia de naves. Arrastrar mueve la vista; la rueda, los botones o el pellizco hacen zoom. Una nave se
 * agranda sola cuando se acerca al centro de la vista, para que se aprecien sus piezas; la propia empieza al
 * centro y grande. La cámara se guarda en una ref y las naves se mueven directo en el DOM: arrastrar no
 * vuelve a pintar decenas de SVG.
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
  const cam = useRef<Cam>({ x: 0, y: 0, zoom: 1, inset: 0, insetY: 0 })
  const frame = useRef(0)
  const tween = useRef<{ from: Cam; to: Cam; start: number; ms: number } | null>(null)
  const drag = useRef({ active: false, x: 0, y: 0, moved: false })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })
  const [reduced, setReduced] = useState(false)
  const [shooting, setShooting] = useState(false)
  const smallStars = useMemo(() => starField(90, 11, false), [])
  const bigStars = useMemo(() => starField(16, 29, true), [])

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

  /** Coloca cada nave según la cámara: posición, tamaño (con el crecimiento por cercanía) y orden de profundidad. */
  const draw = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const w = stage.clientWidth
    const h = stage.clientHeight
    const { x, y, zoom, inset, insetY } = cam.current
    const cx = (w - inset) / 2
    const cy = (h - insetY) / 2
    const reach = 0.55 * Math.min(w - inset, h - insetY)
    for (const spot of spotsRef.current) {
      const el = shipEls.current.get(spot.troop.id)
      const label = labelEls.current.get(spot.troop.id)
      if (!el) continue
      const sx = cx + (spot.x + x) * zoom
      const sy = cy + (spot.y + y) * zoom
      const dist = Math.hypot(sx - cx, sy - cy)
      const near = clamp(1 - dist / reach, 0, 1)
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

  const schedule = useCallback(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      draw()
    })
  }, [draw])

  /** Lleva la cámara a `to` con una animación suave (o de golpe si el sistema pide menos movimiento). */
  const flyTo = useCallback(
    (to: Partial<Cam>, ms = 650) => {
      const target = { ...cam.current, ...to }
      target.zoom = clamp(target.zoom, ZOOM_MIN, ZOOM_MAX)
      if (reduced || ms === 0) {
        tween.current = null
        cam.current = target
        schedule()
        return
      }
      tween.current = { from: { ...cam.current }, to: target, start: performance.now(), ms }
      const step = (now: number) => {
        const run = tween.current
        if (!run) return
        const t = clamp((now - run.start) / run.ms, 0, 1)
        const k = ease(t)
        cam.current = {
          x: run.from.x + (run.to.x - run.from.x) * k,
          y: run.from.y + (run.to.y - run.from.y) * k,
          zoom: run.from.zoom + (run.to.zoom - run.from.zoom) * k,
          inset: run.from.inset + (run.to.inset - run.from.inset) * k,
          insetY: run.from.insetY + (run.to.insetY - run.from.insetY) * k,
        }
        draw()
        if (t < 1) requestAnimationFrame(step)
        else tween.current = null
      }
      requestAnimationFrame(step)
    },
    [draw, reduced, schedule],
  )

  const zoomAt = useCallback(
    (factor: number, cursorX?: number, cursorY?: number) => {
      const stage = stageRef.current
      if (!stage) return
      tween.current = null
      const { x, y, zoom, inset, insetY } = cam.current
      const next = clamp(zoom * factor, ZOOM_MIN, ZOOM_MAX)
      // Se mantiene fijo el punto del mundo bajo el cursor (o el centro de la vista).
      const cx = (stage.clientWidth - inset) / 2
      const cy = (stage.clientHeight - insetY) / 2
      const ox = (cursorX ?? cx) - cx
      const oy = (cursorY ?? cy) - cy
      cam.current = { x: x + ox / next - ox / zoom, y: y + oy / next - oy / zoom, zoom: next, inset, insetY }
      schedule()
    },
    [schedule],
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
      }, 16000 + Math.random() * 10000)
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

  // Va antes que los efectos de foco: ellos leen `spotsRef`.
  useEffect(() => {
    spotsRef.current = spots
    draw()
  }, [spots, draw])

  /** Zoom en que mi nave ocupa ~80 % del ancho: 1 en pantallas anchas, menos en un móvil. */
  const fitZoom = useCallback(() => clamp(((stageRef.current?.clientWidth ?? 1000) * 0.8) / MY_SHIP_WIDTH, 0.5, 1), [])

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
    flyTo({ x: -spot.x, y: -spot.y, zoom: Math.max(cam.current.zoom, (spot.mine ? 1 : 1.15) * fitZoom()), ...inset }, 650)
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
      zoomAt(Math.exp(-event.deltaY * 0.0014), event.clientX - rect.left, event.clientY - rect.top)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

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

  useEffect(
    () => () => {
      // Al cancelar también se libera la marca: si no, `schedule` creería que ya hay un cuadro pendiente.
      cancelAnimationFrame(frame.current)
      frame.current = 0
    },
    [],
  )

  return (
    <div
      ref={stageRef}
      className="galaxy-stage"
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest('.galaxy-zoom')) return
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()]
          pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: cam.current.zoom }
          drag.current.active = false
          return
        }
        drag.current = { active: true, x: event.clientX, y: event.clientY, moved: false }
        tween.current = null
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (pointers.current.has(event.pointerId)) {
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
        }
        if (pinch.current && pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          zoomAt((pinch.current.zoom * (dist / pinch.current.dist)) / cam.current.zoom)
          return
        }
        if (!reduced) {
          const rect = event.currentTarget.getBoundingClientRect()
          setParallax({
            x: (event.clientX - rect.left - rect.width / 2) * 0.015,
            y: (event.clientY - rect.top - rect.height / 2) * 0.015,
          })
        }
        if (!drag.current.active) return
        const dx = event.clientX - drag.current.x
        const dy = event.clientY - drag.current.y
        if (dx * dx + dy * dy > 36) drag.current.moved = true
        drag.current.x = event.clientX
        drag.current.y = event.clientY
        if (drag.current.moved) {
          cam.current = { ...cam.current, x: cam.current.x + dx / cam.current.zoom, y: cam.current.y + dy / cam.current.zoom }
          schedule()
          checkFar()
        }
      }}
      onPointerUp={(event) => {
        pointers.current.delete(event.pointerId)
        if (pointers.current.size < 2) pinch.current = null
        drag.current.active = false
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId)
        pinch.current = null
        drag.current.active = false
      }}
      onClick={(event) => {
        if (drag.current.moved) return
        if (event.target === event.currentTarget || (event.target as HTMLElement).dataset.sky === '1') {
          onClearTroop()
        }
      }}
    >
      <div className="galaxy-sky" data-sky="1" style={{ transform: `translate(${parallax.x}px, ${parallax.y}px)` }}>
        <div className="galaxy-nebula nebula-a" />
        <div className="galaxy-nebula nebula-b" />
        <div className="galaxy-nebula nebula-c" />
        {smallStars.map((star) => (
          <span
            key={star.id}
            className={reduced ? 'galaxy-star' : 'galaxy-star is-twinkle'}
            style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }}
          />
        ))}
      </div>
      <div className="galaxy-sky galaxy-sky-far" data-sky="1" style={{ transform: `translate(${parallax.x * 1.8}px, ${parallax.y * 1.8}px)` }}>
        {bigStars.map((star) => (
          <span
            key={star.id}
            className="galaxy-star is-big"
            style={{ left: star.left, top: star.top, width: star.size, height: star.size }}
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
                  <span className="galaxy-medal" style={{ background: RANK_COLOR[rank] }}>
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
        <button type="button" aria-label="Acercar" onClick={() => zoomAt(1.25)}>
          <Plus size={18} weight="bold" />
        </button>
        <button type="button" aria-label="Alejar" onClick={() => zoomAt(0.8)}>
          <Minus size={18} weight="bold" />
        </button>
      </div>
    </div>
  )
}
