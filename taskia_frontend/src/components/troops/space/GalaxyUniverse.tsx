import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Crown, Medal, Minus, Plus } from '@phosphor-icons/react'
import { ShipRenderer } from '../../ship/ShipRenderer'
import { MY_SHIP_WIDTH, OTHER_SHIP_WIDTH, layoutShips } from '../../../lib/shipLayout'
import { AURA_LOOK } from '../../../lib/ship/auraGl'
import { createAuraLayer, type AuraLayer } from '../../../lib/ship/auraLayer'
import { MAX_CREW } from '../../../lib/ship/types'
import { skyTile } from '../../../lib/skyTile'
import type { UniverseTroop } from '../../../lib/troopsTypes'

/** Ancho que ocupa la ficha abierta (px) y la pantalla mínima para que vaya al costado. */
const CARD_INSET = 400
const SIDE_CARD_MIN_WIDTH = 900

/**
 * Lo más lejos que se puede ver. Cuántas naves caben en pantalla depende del área del mundo que se ve, así que el zoom
 * mínimo sube con la pantalla (`ZOOM_FLOOR_AREA` px² de mundo como máximo): en un monitor grande no se ven más naves
 * a la vez que en uno chico, y el coste de dibujarlas queda acotado (unas 6 en pantalla). Nunca baja de `ZOOM_MIN`.
 */
const ZOOM_MIN = 0.5
const ZOOM_FLOOR_AREA = 2_300_000
const ZOOM_MAX = 2.4
/** Cuánto crece una nave al llegar al centro de la vista (1 = nada): las ajenas más; la propia ya es grande. */
const BOOST_OTHER = 0.95
const BOOST_MINE = 0.12

/**
 * Solo existen en el DOM las naves cercanas a la vista: entra una cuando cae a menos de `MOUNT_MARGIN` pantallas y se
 * va cuando se aleja más de `UNMOUNT_MARGIN` (la diferencia evita que parpadee en el borde). Así el coste depende de
 * lo que se ve y no de cuántas naves hay cargadas. Los cambios se agrupan cada `ACTIVE_DELAY` ms.
 */
const MOUNT_MARGIN = 0.6
const UNMOUNT_MARGIN = 1.1
const ACTIVE_DELAY = 110

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

/** Número estable entre 0 y 1 para un id y una «sal»: da a cada nave su propio ritmo sin azar. */
const unit = (id: number, salt: number) => ((Math.imul(id ^ Math.imul(salt, 0x9e3779b1), 2654435761) >>> 0) % 1000) / 1000

/**
 * El ritmo de vuelo de cada nave: cuánto tarda en subir y bajar, en cabecear y en derivar de lado (tres periodos
 * distintos, así el conjunto no se repite), cuánto se mueve (`amp`) y en qué punto del ciclo empieza.
 */
function rhythm(id: number) {
  return {
    ['--float-dur' as string]: `${(5.2 + unit(id, 1) * 3.2).toFixed(2)}s`,
    ['--pitch-dur' as string]: `${(7 + unit(id, 2) * 4).toFixed(2)}s`,
    ['--drift-dur' as string]: `${(10 + unit(id, 3) * 6).toFixed(2)}s`,
    ['--amp' as string]: (0.75 + unit(id, 4) * 0.6).toFixed(2),
    ['--bob-delay' as string]: `${(-unit(id, 5) * 12).toFixed(2)}s`,
  }
}

/** Un muelle con rebote (subamortiguado): sigue a `target` y se pasa un poco antes de asentarse. */
type Spring = { s: number; v: number }
const FLEX_W = 0.011
const FLEX_Z = 0.55
function pull(spring: Spring, target: number, dt: number) {
  spring.v += (FLEX_W * FLEX_W * (target - spring.s) - 2 * FLEX_Z * FLEX_W * spring.v) * dt
  spring.s += spring.v * dt
}

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
  const artEls = useRef(new Map<number, HTMLElement>())
  /** Alto sin escalar de cada nave (px de layout): sirve para centrar su aura. */
  const shipHeights = useRef(new Map<number, number>())
  const auraCanvas = useRef<HTMLCanvasElement>(null)
  const auraLayer = useRef<AuraLayer | null>(null)
  /** Cómo reaccionan las naves al movimiento de la cámara: velocidad suavizada y muelles de cabeceo, retraso y empuje. */
  const motion = useRef({
    prevX: 0,
    prevY: 0,
    vx: 0,
    vy: 0,
    pitch: { s: 0, v: 0 } as Spring,
    lagX: { s: 0, v: 0 } as Spring,
    lagY: { s: 0, v: 0 } as Spring,
    thrust: { s: 0, v: 0 } as Spring,
  })
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
      return [{ troop, x: point.x, y: point.y, mine, base: mine ? MY_SHIP_WIDTH : OTHER_SHIP_WIDTH, resp: 0.7 + unit(troop.id, 6) * 0.6 }]
    })
  }, [troops, myTroopId])
  const spotsRef = useRef(spots)
  /** Naves montadas ahora. Al empezar: las que caen cerca del origen, donde arranca la cámara. */
  const [active, setActive] = useState<Set<number>>(() => {
    const w = typeof window === 'undefined' ? 1440 : window.innerWidth
    const h = typeof window === 'undefined' ? 900 : window.innerHeight
    return new Set(spots.filter((spot) => spot.mine || (Math.abs(spot.x) < w * 1.6 && Math.abs(spot.y) < h * 1.6)).map((spot) => spot.troop.id))
  })
  const activeRef = useRef(active)
  const pending = useRef<{ ids: Set<number> | null; timer: number }>({ ids: null, timer: 0 })
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
    const auras = auraLayer.current?.items
    if (auras) auras.length = 0

    for (const layer of SKY_LAYERS) {
      const el = skyEls.current.get(layer.id)
      if (!el) continue
      const position = `${(x * zoom * layer.parallax).toFixed(1)}px ${(y * zoom * layer.parallax).toFixed(1)}px`
      el.style.maskPosition = position
      el.style.setProperty('-webkit-mask-position', position)
    }

    // Qué naves deben existir: se decide con las posiciones en pantalla y se aplica en bloque, no en cada cuadro.
    const mountPx = Math.max(w, h) * MOUNT_MARGIN
    const unmountPx = Math.max(w, h) * UNMOUNT_MARGIN
    const mounted = activeRef.current
    let changed = false
    const wanted: number[] = []
    for (const spot of spotsRef.current) {
      const id = spot.troop.id
      const reach2 = (mounted.has(id) ? unmountPx : mountPx) + spot.base * zoom
      const px = cx + (spot.x + x) * zoom
      const py = cy + (spot.y + y) * zoom
      const keep = spot.mine || id === focus.current.id || (px > -reach2 && px < w + reach2 && py > -reach2 && py < h + reach2)
      if (keep) wanted.push(id)
      if (keep !== mounted.has(id)) changed = true
    }
    if (changed || wanted.length !== mounted.size) {
      pending.current.ids = new Set(wanted)
      if (!pending.current.timer) {
        pending.current.timer = window.setTimeout(() => {
          pending.current.timer = 0
          const next = pending.current.ids
          if (!next) return
          activeRef.current = next
          setActive(next)
        }, ACTIVE_DELAY)
      }
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
      // Solo se animan (balanceo, estela, parpadeos) las naves que se ven: es lo que más cuesta.
      const live = visible ? '1' : '0'
      if (el.dataset.live !== live) el.dataset.live = live
      const art = visible ? artEls.current.get(spot.troop.id) : undefined
      if (art) {
        // La nave se arrastra un poco con la cámara: se inclina, se queda atrás y su estela se alarga al avanzar.
        const m = motion.current
        const lively = Math.abs(m.pitch.s) + Math.abs(m.lagX.s) + Math.abs(m.lagY.s) > 0.03
        if (lively) {
          const k = spot.resp
          art.style.transform = `translate(${((m.lagX.s * k) / scale).toFixed(1)}px, ${((m.lagY.s * k) / scale).toFixed(1)}px) rotate(${(m.pitch.s * k).toFixed(2)}deg)`
          art.dataset.moving = '1'
        } else if (art.dataset.moving) {
          art.style.transform = ''
          delete art.dataset.moving
        }
        const thrust = (m.thrust.s * spot.resp).toFixed(2)
        if (art.dataset.thrust !== thrust) {
          art.dataset.thrust = thrust
          art.style.setProperty('--thrust', thrust)
        }
      }
      el.style.transform = `translate(${(sx - spot.base / 2).toFixed(1)}px, ${(sy - spot.base / 4).toFixed(1)}px) scale(${scale.toFixed(3)})`
      el.style.zIndex = String(Math.round(scale * 100))
      const look = auras && spot.troop.aura_id ? AURA_LOOK[spot.troop.aura_id] : undefined
      if (auras && look && sx > -half * 2 && sx < w + half * 2 && sy > -half * 2 && sy < h + half * 2) {
        let tall = shipHeights.current.get(spot.troop.id)
        if (!tall) {
          tall = el.offsetHeight
          if (tall) shipHeights.current.set(spot.troop.id, tall)
        }
        const height = tall || spot.base / 2
        const centerY = sy - spot.base / 4 + height / 2
        auras.push({
          kind: spot.troop.aura_id!,
          rect: { left: sx - half, top: centerY - (height * scale) / 2, width: half * 2, height: height * scale },
          a: look.a,
          b: look.b,
          c: look.c,
          seed: spot.troop.id % 7,
        })
      }
      if (label) {
        label.style.visibility = visible ? 'visible' : 'hidden'
        label.style.transform = `translate(${sx.toFixed(1)}px, ${(sy + (spot.base / 4) * scale + 4).toFixed(1)}px) translateX(-50%)`
        label.style.zIndex = String(Math.round(scale * 100) + 1)
      }
    }
    auraLayer.current?.render()
  }, [])

  // El lienzo de las auras: uno solo para toda la galaxia.
  useEffect(() => {
    const canvas = auraCanvas.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const layer = createAuraLayer(canvas, stage)
    auraLayer.current = layer
    layer?.setStill(reduced)
    draw()
    return () => {
      layer?.dispose()
      auraLayer.current = null
    }
  }, [draw, reduced])

  // Las naves recién montadas no tienen posición hasta que se dibujan: se colocan antes del primer pintado.
  useLayoutEffect(() => {
    draw()
  }, [active, draw])

  useEffect(() => {
    const state = pending.current
    return () => window.clearTimeout(state.timer)
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
      if (!reduced) {
        const m = motion.current
        const ivx = clamp(((c.x - m.prevX) * c.zoom) / dt, -3, 3)
        const ivy = clamp(((c.y - m.prevY) * c.zoom) / dt, -3, 3)
        const smooth = 1 - Math.exp(-dt / 80)
        m.vx += (ivx - m.vx) * smooth
        m.vy += (ivy - m.vy) * smooth
        pull(m.pitch, clamp(m.vy * 10, -9, 9), dt)
        pull(m.lagX, clamp(-m.vx * 16, -18, 18), dt)
        pull(m.lagY, clamp(-m.vy * 16, -18, 18), dt)
        pull(m.thrust, clamp(m.vx * 0.8, -0.6, 1), dt)
      }
      motion.current.prevX = c.x
      motion.current.prevY = c.y
      draw()
      checkFar()

      const calm =
        Math.abs(motion.current.pitch.s) + Math.abs(motion.current.pitch.v) * 300 + Math.abs(motion.current.lagX.s) + Math.abs(motion.current.lagY.s) + Math.abs(motion.current.thrust.s) * 4 < 0.04
      const settled =
        Math.abs(g.x - c.x) < 0.05 &&
        Math.abs(g.y - c.y) < 0.05 &&
        Math.abs(g.zoom - c.zoom) < 0.0004 &&
        Math.abs(g.inset - c.inset) < 0.3 &&
        Math.abs(g.insetY - c.insetY) < 0.3
      if (settled && calm && !inertia.current && !drag.current.active) {
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
  /** Zoom más lejano permitido en esta pantalla. */
  const minZoom = useCallback(() => {
    const stage = stageRef.current
    return stage ? clamp(Math.sqrt((stage.clientWidth * stage.clientHeight) / ZOOM_FLOOR_AREA), ZOOM_MIN, ZOOM_MAX) : ZOOM_MIN
  }, [])

  const flyTo = useCallback(
    (to: Partial<Cam>, ms = 650) => {
      inertia.current = false
      vel.current = { x: 0, y: 0 }
      anchor.current = null
      goal.current = { ...goal.current, ...to, zoom: clamp(to.zoom ?? goal.current.zoom, minZoom(), ZOOM_MAX) }
      tc.current = TC_FLY
      if (ms === 0) cam.current = { ...goal.current }
      wake()
    },
    [wake, minZoom],
  )

  const zoomTo = useCallback(
    (zoom: number, cursorX?: number, cursorY?: number) => {
      const stage = stageRef.current
      if (!stage) return
      const cx = (stage.clientWidth - cam.current.inset) / 2
      const cy = (stage.clientHeight - cam.current.insetY) / 2
      anchor.current = { ox: (cursorX ?? cx) - cx, oy: (cursorY ?? cy) - cy }
      goal.current.zoom = clamp(zoom, minZoom(), ZOOM_MAX)
      tc.current = TC_ZOOM
      wake()
    },
    [wake, minZoom],
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
    const onResize = () => {
      // Si la ventana creció y ya se ve más mundo del permitido, se acerca hasta el nuevo mínimo.
      if (goal.current.zoom < minZoom()) zoomTo(minZoom())
      draw()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw, minZoom, zoomTo])

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
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className={`galaxy-nebula nebula-${n}`} />
        ))}
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

      <canvas ref={auraCanvas} className="galaxy-aura-gl" aria-hidden />

      <div className="galaxy-world" data-sky="1">
        {spots.map(({ troop, base, mine }) => {
          if (!active.has(troop.id)) return null
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
                style={{ width: base, ...rhythm(troop.id) }}
              >
                {mine && !troop.aura_id && <span className="galaxy-aura" />}
                <button
                  type="button"
                  className="galaxy-ship-hit"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelectTroop(troop.id)
                  }}
                  aria-label={troop.name}
                >
                  <span
                    ref={(node) => {
                      if (node) artEls.current.set(troop.id, node)
                      else artEls.current.delete(troop.id)
                    }}
                    className="galaxy-ship-art"
                  >
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
                {rank != null && (
                  <span className={`space-rank-tag space-rank-tag--${rank}`} title={`Puesto ${rank} del ranking semanal`}>
                    {rank === 1 ? <Crown size={13} weight="fill" aria-hidden /> : <Medal size={13} weight="fill" aria-hidden />}
                    {rank}º
                  </span>
                )}
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
