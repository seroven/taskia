import { useEffect, useMemo, useRef, useState } from 'react'
import { PlanetRenderer } from '../../planet/PlanetRenderer'
import { layoutPlanets } from '../../../lib/planetLayout'
import { resolveTroopPlanet } from '../../../lib/planet/engine'
import type { UniverseTroop } from '../../../lib/troopsTypes'

const RANK_COLOR: Record<number, string> = {
  1: '#fbbf24',
  2: '#e2e8f0',
  3: '#d97706',
}

type Props = {
  troops: UniverseTroop[]
  myTroopId: number | null
  openId: number | null
  onSelectTroop: (id: number) => void
  onClearTroop: () => void
  onRequestMore: () => void
  focusToken: number
}

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

export function GalaxyUniverse({
  troops,
  myTroopId,
  openId,
  onSelectTroop,
  onClearTroop,
  onRequestMore,
  focusToken,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, x: 0, y: 0, moved: false })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })
  const [hotId, setHotId] = useState<number | null>(null)
  const [reduced, setReduced] = useState(false)
  const [shooting, setShooting] = useState(false)
  const smallStars = useMemo(() => starField(90, 11, false), [])
  const bigStars = useMemo(() => starField(16, 29, true), [])

  const layouts = useMemo(() => {
    const ids = troops.map((t) => t.id)
    return layoutPlanets(ids, myTroopId)
  }, [troops, myTroopId])

  const placed = useMemo(() => {
    const byId = new Map(troops.map((t) => [t.id, t]))
    return layouts.flatMap((point) => {
      const troop = byId.get(point.id)
      if (!troop) return []
      return [{ troop, x: point.x * 46, y: point.z * 46, config: resolveTroopPlanet(troop) }]
    })
  }, [layouts, troops])

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

  const placedRef = useRef(placed)
  placedRef.current = placed
  const lastFocus = useRef(-1)
  const moreAt = useRef(0)

  useEffect(() => {
    if (placed.length === 0) return
    if (lastFocus.current === focusToken) return
    const mine = placed.find((p) => p.troop.id === myTroopId) ?? placed[0]
    if (!mine) return
    setPan({ x: -mine.x, y: -mine.y })
    lastFocus.current = focusToken
  }, [placed, focusToken, myTroopId])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      setZoom((value) => Math.min(1.7, Math.max(0.55, value + (event.deltaY > 0 ? -0.08 : 0.08))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const far = placedRef.current.some((p) => Math.hypot(p.x + pan.x, p.y + pan.y) > 620)
    if (!far) return
    const now = Date.now()
    if (now - moreAt.current < 900) return
    moreAt.current = now
    onRequestMore()
  }, [pan, onRequestMore])

  return (
    <div
      ref={stageRef}
      className="galaxy-stage"
      onPointerDown={(event) => {
        drag.current = { active: true, x: event.clientX, y: event.clientY, moved: false }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
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
        if (drag.current.moved) setPan((value) => ({ x: value.x + dx, y: value.y + dy }))
      }}
      onPointerUp={() => {
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

      <div
        className="galaxy-world"
        data-sky="1"
        style={{ transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})` }}
      >
        {placed.map(({ troop, x, y, config }) => {
          const rank = troop.rank != null && troop.rank <= 3 ? troop.rank : null
          const hot = hotId === troop.id
          return (
            <div
              key={troop.id}
              className={`galaxy-planet personality-${config.personality}${reduced ? ' is-still' : ''}${hot ? ' is-hot' : ''}`}
              style={{ left: x, top: y, ['--planet-size' as string]: `${Math.round(118 * config.size)}px` }}
            >
              {troop.is_mine && <span className="galaxy-home-ring" />}
              {rank != null && (
                <span className="galaxy-medal" style={{ background: RANK_COLOR[rank] }}>
                  {rank}
                </span>
              )}
              <button
                type="button"
                className="galaxy-planet-hit"
                onClick={(event) => {
                  event.stopPropagation()
                  onSelectTroop(troop.id)
                }}
                onPointerEnter={() => setHotId(troop.id)}
                onPointerLeave={() => setHotId((id) => (id === troop.id ? null : id))}
                aria-label={troop.name}
              >
                <PlanetRenderer
                  config={config}
                  size={Math.round(118 * config.size)}
                  hot={hot}
                  showRings={openId !== troop.id}
                  animate={!reduced}
                />
              </button>
              {openId !== troop.id && (
                <button
                  type="button"
                  className={hot ? 'space-planet-name is-hot' : 'space-planet-name'}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelectTroop(troop.id)
                  }}
                >
                  {troop.name}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
