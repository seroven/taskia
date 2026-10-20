import { memo, useId, type ReactNode } from 'react'
import { darken, lighten, mix } from '../../lib/ship/color'
import { CY, VB_H, VB_W, hullGeo, type HullGeo } from '../../lib/ship/geometry'
import { MAX_CREW, type ShipConfig, type ShipPalette } from '../../lib/ship/types'
import { Spark } from '../scenes/kit'

type Ctx = { geo: HullGeo; pal: ShipPalette }

const num = (value: number) => Math.round(value * 10) / 10
const pts = (list: [number, number][]) => list.map(([x, y]) => `${num(x)},${num(y)}`).join(' ')

/** Dónde caben las ventanillas: la franja del casco que es lo bastante gruesa, sin invadir cola ni nariz. */
function windowSpots(geo: HullGeo, count: number) {
  let a = geo.at(0.17)
  let b = geo.at(0.74)
  while (a < b && geo.half(a) < 11) a += 1
  while (b > a && geo.half(b) < 11) b -= 1
  const span = Math.max(20, b - a)
  const r = Math.min(Math.max(span / (count * 2.7), 2.6), 6.2, geo.H * 0.15)
  const step = count > 1 ? Math.min(r * 2.75, (span - r * 2) / (count - 1)) : 0
  const mid = (a + b) / 2
  return { r, spots: Array.from({ length: count }, (_, i) => mid + (i - (count - 1) / 2) * step) }
}

/* ---------- Motores y llamas (detrás del casco) ---------- */

function engineOffsets(count: number) {
  return count === 1 ? [0] : count === 2 ? [-9, 9] : [-14, 0, 14]
}

function Engines({ geo, pal, config }: Ctx & { config: ShipConfig['engine'] }) {
  const r = config.count === 1 ? 8 : config.count === 2 ? 6.4 : 5
  const dark = darken(pal.trim, 0.35)
  return (
    <g>
      {engineOffsets(config.count).map((off) => {
        // El motor se monta donde el casco ya es lo bastante grueso para sostenerlo.
        let xb = geo.x0
        while (xb < geo.at(0.3) && geo.half(xb) < Math.abs(off) + r * 0.7) xb += 1
        const y = CY + off
        let exit: number
        let body: ReactNode
        if (config.kind === 'bell') {
          exit = xb - 15
          body = (
            <>
              <path d={`M${xb + 2} ${y - r} L${xb - 15} ${y - r * 1.55} L${xb - 15} ${y + r * 1.55} L${xb + 2} ${y + r} Z`} fill={pal.trim} className="ship-ink" />
              <ellipse cx={xb - 15} cy={y} rx={2.6} ry={r * 1.55} fill={dark} className="ship-ink ship-thin" />
            </>
          )
        } else if (config.kind === 'pods') {
          exit = xb - 17
          body = (
            <>
              <rect x={xb - 17} y={y - r - 1} width={19} height={(r + 1) * 2} rx={r * 0.9} fill={pal.trim} className="ship-ink" />
              <path d={`M${xb - 5} ${y - r - 1} V${y + r + 1}`} className="ship-ink ship-thin" fill="none" />
              <ellipse cx={xb - 17} cy={y} rx={2} ry={r * 0.7} fill={dark} className="ship-ink ship-thin" />
            </>
          )
        } else if (config.kind === 'ring') {
          exit = xb - 9
          body = (
            <>
              <ellipse cx={xb - 4} cy={y} rx={5} ry={r * 1.5} fill={pal.trim} className="ship-ink" />
              <ellipse cx={xb - 6} cy={y} rx={2.4} ry={r * 0.95} fill={pal.accent} className="ship-ink ship-thin" />
            </>
          )
        } else {
          exit = xb - 12
          body = (
            <>
              <circle cx={xb - 6} cy={y} r={r * 1.15} fill={pal.accent} className="ship-ink" />
              <circle cx={xb - 6} cy={y} r={r * 1.7} fill="none" stroke={pal.accent} strokeWidth={1.4} strokeDasharray="2 3" opacity={0.8} />
              <circle cx={xb - 8} cy={y - 2} r={r * 0.35} fill="#fff" opacity={0.9} />
            </>
          )
        }
        return (
          <g key={off}>
            <Flame kind={config.flame} x={exit} y={y} r={r} pal={pal} />
            {body}
          </g>
        )
      })}
    </g>
  )
}

function Flame({ kind, x, y, r, pal }: { kind: ShipConfig['engine']['flame']; x: number; y: number; r: number; pal: ShipPalette }) {
  if (kind === 'none') return null
  const len = 15 + r * 2.1
  const core = lighten(pal.accent, 0.7)
  if (kind === 'bolt') {
    const w = r * 0.95
    return (
      <g className="ship-flame">
        <polygon
          points={pts([[x + 1, y - w], [x - len * 0.35, y - w * 0.15], [x - len * 0.2, y - w * 0.15], [x - len, y + w * 0.1], [x - len * 0.4, y + w * 0.35], [x - len * 0.55, y + w * 0.35], [x + 1, y + w]])}
          fill={pal.accent}
          className="ship-ink ship-thin"
        />
      </g>
    )
  }
  if (kind === 'puff') {
    return (
      <g className="ship-flame">
        {[0, 1, 2].map((i) => (
          <circle key={i} cx={x - 5 - i * (r * 1.25)} cy={y + (i % 2 ? 1.5 : -1.5)} r={Math.max(1.6, r * (0.95 - i * 0.24))} fill={i === 0 ? pal.accent : core} className="ship-ink ship-thin" opacity={1 - i * 0.18} />
        ))}
      </g>
    )
  }
  const h = r * 0.95
  return (
    <g className="ship-flame">
      <path d={`M${x + 1} ${y - h} C${x - len * 0.35} ${y - h} ${x - len * 0.7} ${y - h * 0.3} ${x - len} ${y} C${x - len * 0.7} ${y + h * 0.3} ${x - len * 0.35} ${y + h} ${x + 1} ${y + h} Z`} fill={pal.accent} className="ship-ink ship-thin" />
      <path d={`M${x + 1} ${y - h * 0.5} C${x - len * 0.25} ${y - h * 0.5} ${x - len * 0.45} ${y - h * 0.15} ${x - len * 0.62} ${y} C${x - len * 0.45} ${y + h * 0.15} ${x - len * 0.25} ${y + h * 0.5} ${x + 1} ${y + h * 0.5} Z`} fill={core} />
    </g>
  )
}

/* ---------- Cola, módulo de arriba y de abajo (detrás del casco) ---------- */

function Tail({ geo, pal, kind }: Ctx & { kind: ShipConfig['tail'] }) {
  const X = geo.at
  if (kind === 'none') return null
  if (kind === 'shark') {
    const rf: [number, number] = [X(0.34), geo.top(X(0.34)) + 3]
    const rb: [number, number] = [X(0.13), geo.top(X(0.13)) + 4]
    const tip: [number, number] = [X(0.05), geo.top(X(0.3)) - 27]
    return <path d={`M${rf[0]} ${rf[1]} Q${rf[0] - 12} ${rf[1] - 24} ${tip[0]} ${tip[1]} L${rb[0]} ${rb[1]} Z`} fill={pal.trim} className="ship-ink" />
  }
  if (kind === 'twin') {
    return (
      <g fill={pal.trim} className="ship-ink">
        {[0.15, 0.31].map((u) => (
          <polygon key={u} points={pts([[X(u) + 7, geo.top(X(u)) + 3], [X(u) - 1, geo.top(X(u)) - 19], [X(u) - 6, geo.top(X(u)) - 19], [X(u) - 5, geo.top(X(u)) + 3]])} />
        ))}
      </g>
    )
  }
  if (kind === 'block') {
    const a = X(0.12)
    const b = X(0.3)
    return <polygon points={pts([[b, geo.top(b) + 3], [b - 3, geo.top(b) - 22], [a - 3, geo.top(a) - 22], [a, geo.top(a) + 3]])} fill={pal.trim} className="ship-ink" />
  }
  const a = X(0.1)
  const b = X(0.32)
  return (
    <g fill={pal.trim} className="ship-ink">
      <polygon points={pts([[b, geo.top(b) + 2], [a - 4, geo.top(a) - 17], [a + 3, geo.top(a) + 3]])} />
      <polygon points={pts([[b, geo.bot(b) - 2], [a - 4, geo.bot(a) + 17], [a + 3, geo.bot(a) - 3]])} />
    </g>
  )
}

function TopModule({ geo, pal, kind }: Ctx & { kind: ShipConfig['top'] }) {
  if (kind === 'none') return null
  const x = geo.at(0.47)
  const y = geo.top(x) + 2
  if (kind === 'antenna') {
    return (
      <g>
        <path d={`M${x} ${y} V${y - 22}`} className="ship-ink" fill="none" />
        <circle cx={x} cy={y - 24} r={3.6} fill={pal.accent} className="ship-ink" />
      </g>
    )
  }
  if (kind === 'dish') {
    return (
      <g>
        <path d={`M${x} ${y} V${y - 9}`} className="ship-ink" fill="none" />
        <g className="ship-sweep" style={{ transformOrigin: `${x}px ${y - 9}px` }}>
          <path d={`M${x - 11} ${y - 22} Q${x} ${y - 5} ${x + 11} ${y - 22} Z`} fill={pal.trim} className="ship-ink" />
          <path d={`M${x} ${y - 14} L${x + 4} ${y - 26}`} className="ship-ink ship-thin" fill="none" />
          <circle cx={x + 4} cy={y - 27} r={1.8} fill={pal.accent} className="ship-ink ship-thin" />
        </g>
      </g>
    )
  }
  if (kind === 'solar') {
    return (
      <g>
        <path d={`M${x} ${y} V${y - 9}`} className="ship-ink" fill="none" />
        <polygon points={pts([[x - 17, y - 9], [x + 17, y - 9], [x + 12, y - 22], [x - 12, y - 22]])} fill={darken(pal.trim, 0.12)} className="ship-ink" />
        <path d={`M${x - 5.5} ${y - 9} L${x - 4} ${y - 22} M${x + 5.5} ${y - 9} L${x + 4} ${y - 22} M${x - 14} ${y - 15.5} H${x + 14}`} className="ship-ink ship-thin" fill="none" opacity={0.7} />
      </g>
    )
  }
  return (
    <g>
      <path d={`M${x - 8} ${y} A8 9 0 0 1 ${x + 8} ${y} Z`} fill={pal.trim} className="ship-ink" />
      <circle cx={x} cy={y - 5} r={2.6} fill={pal.accent} className="ship-ink ship-thin ship-blink" />
    </g>
  )
}

function Belly({ geo, pal, kind }: Ctx & { kind: ShipConfig['belly'] }) {
  if (kind === 'none') return null
  const X = geo.at
  if (kind === 'pod') {
    const a = X(0.34)
    const b = X(0.64)
    const y = geo.bot(X(0.5)) - 3
    return <rect x={a} y={y} width={b - a} height={17} rx={8} fill={pal.trim} className="ship-ink" />
  }
  if (kind === 'tank') {
    const a = X(0.28)
    const b = X(0.7)
    const y = geo.bot(X(0.5)) - 1
    return (
      <g>
        <rect x={a} y={y} width={b - a} height={11} rx={5.5} fill={pal.accent} className="ship-ink" />
        <path d={`M${a + (b - a) * 0.34} ${y + 1} V${y + 10} M${a + (b - a) * 0.66} ${y + 1} V${y + 10}`} className="ship-ink ship-thin" fill="none" />
      </g>
    )
  }
  return (
    <g className="ship-ink" fill={pal.trim}>
      {[0.33, 0.64].map((u) => {
        const x = X(u)
        const y = geo.bot(x) - 2
        return (
          <g key={u}>
            <path d={`M${x} ${y} L${x - 5} ${y + 16}`} fill="none" />
            <ellipse cx={x - 6} cy={y + 17} rx={6} ry={2.4} />
          </g>
        )
      })}
    </g>
  )
}

/* ---------- Alas (delante del casco) ---------- */

function Wings({ geo, pal, kind }: Ctx & { kind: ShipConfig['wings'] }) {
  if (kind === 'none') return null
  const X = geo.at
  const stripe = pal.accent
  if (kind === 'delta') {
    const f: [number, number] = [X(0.66), geo.bot(X(0.66)) - 5]
    const bk: [number, number] = [X(0.3), geo.bot(X(0.3)) - 5]
    const tip: [number, number] = [X(0.14), geo.bot(X(0.3)) + 28]
    return (
      <g>
        <polygon points={pts([f, tip, bk])} fill={pal.trim} className="ship-ink" />
        <path d={`M${num(X(0.46))} ${num(geo.bot(X(0.46)) - 1)} L${num(X(0.27))} ${num(geo.bot(X(0.3)) + 20)}`} stroke={stripe} strokeWidth={3} strokeLinecap="round" fill="none" />
      </g>
    )
  }
  if (kind === 'swept') {
    const a = X(0.68)
    const b = X(0.34)
    const ya = geo.bot(a) - 5
    const yb = geo.bot(b) - 5
    return (
      <g>
        <path d={`M${a} ${ya} C${a - 18} ${ya + 8} ${X(0.2)} ${yb + 24} ${X(0.08)} ${yb + 30} C${X(0.2)} ${yb + 10} ${b + 4} ${yb + 5} ${b} ${yb} Z`} fill={pal.trim} className="ship-ink" />
        <path d={`M${X(0.5)} ${num(geo.bot(X(0.5)) + 1)} Q${X(0.3)} ${num(yb + 14)} ${X(0.17)} ${num(yb + 24)}`} stroke={stripe} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      </g>
    )
  }
  const a = X(0.62)
  const b = X(0.38)
  const y = geo.bot(X(0.5)) - 5
  return (
    <g>
      <polygon points={pts([[a, y], [a - 5, y + 16], [b - 4, y + 16], [b, y]])} fill={pal.trim} className="ship-ink" />
      <path d={`M${a - 4} ${y + 11} H${b - 3}`} stroke={stripe} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </g>
  )
}

/* ---------- Sobre el casco: marcas, ventanillas, cabina y nariz ---------- */

function Decals({ geo, pal, kind, clip }: Ctx & { kind: ShipConfig['decal']; clip: string }) {
  if (kind === 'none') return null
  const X = geo.at
  if (kind === 'star') return <Spark x={X(0.3)} y={geo.bot(X(0.3)) - geo.H * 0.2} s={6.5} className="ship-ink" style={{ fill: pal.accent }} />
  return (
    <g clipPath={`url(#${clip})`}>
      {kind === 'stripe' && (
        <>
          <rect x={geo.x0 - 2} y={CY + geo.H * 0.17} width={geo.L + 4} height={5.5} fill={pal.accent} />
          <rect x={geo.x0 - 2} y={CY + geo.H * 0.17 + 7} width={geo.L + 4} height={2} fill={pal.trim} />
        </>
      )}
      {kind === 'chevrons' &&
        [0.14, 0.22, 0.3].map((u) => (
          <path key={u} d={`M${X(u)} ${CY - geo.H * 0.5} L${X(u) + 9} ${CY} L${X(u)} ${CY + geo.H * 0.5}`} fill="none" stroke={pal.accent} strokeWidth={4.4} strokeLinejoin="round" />
        ))}
      {kind === 'checker' &&
        Array.from({ length: 14 }, (_, i) => (
          <g key={i}>
            <rect x={geo.x0 + 6 + i * 7} y={CY + geo.H * 0.16 + (i % 2) * 5} width={7} height={5} fill={i % 2 ? pal.trim : pal.accent} />
            <rect x={geo.x0 + 6 + i * 7} y={CY + geo.H * 0.16 + ((i + 1) % 2) * 5} width={7} height={5} fill={i % 2 ? pal.accent : pal.trim} opacity={0.55} />
          </g>
        ))}
    </g>
  )
}

function Windows({ geo, pal, kind, crew, names }: Ctx & { kind: ShipConfig['windows']; crew: number; names: string[] }) {
  if (crew <= 0) return null
  const { r, spots } = windowSpots(geo, Math.min(crew, MAX_CREW))
  const mid = spots[Math.floor(spots.length / 2)]!
  const y = (geo.top(mid) + geo.bot(mid)) / 2 - 1
  return (
    <g>
      {spots.map((x, i) => {
        const label = names[i]
        let shape: ReactNode
        if (kind === 'square') {
          shape = <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={r * 0.3} fill={pal.glass} className="ship-ink ship-thin" />
        } else if (kind === 'arch') {
          shape = <path d={`M${x - r} ${y + r} V${y - r * 0.1} A${r} ${r} 0 0 1 ${x + r} ${y - r * 0.1} V${y + r} Z`} fill={pal.glass} className="ship-ink ship-thin" />
        } else {
          shape = <circle cx={x} cy={y} r={r} fill={pal.glass} className="ship-ink ship-thin" />
        }
        return (
          <g key={i} className="ship-window" style={{ ['--i' as string]: i }}>
            {label ? <title>{label}</title> : null}
            {shape}
            <circle cx={x - r * 0.3} cy={y - r * 0.3} r={Math.max(0.8, r * 0.22)} fill="#fff" opacity={0.85} />
          </g>
        )
      })}
    </g>
  )
}

function Cockpit({ geo, pal, kind, clip }: Ctx & { kind: ShipConfig['cockpit']; clip: string }) {
  if (kind === 'none') return null
  const canopy = mix(pal.glass, '#7dd3fc', 0.45)
  if (kind === 'bubble') {
    const x = geo.at(0.7)
    const w = 13
    const y1 = geo.top(x - w)
    const y2 = geo.top(x + w)
    return (
      <g>
        <path d={`M${x - w} ${y1 + 1.5} A${w} ${w * 0.95} 0 0 1 ${x + w} ${y2 + 1.5} Z`} fill={canopy} className="ship-ink" />
        <path d={`M${x - w * 0.55} ${y1 - 3} Q${x - w * 0.2} ${y1 - w * 0.8} ${x + w * 0.2} ${y1 - w * 0.78}`} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" fill="none" opacity={0.85} />
      </g>
    )
  }
  // Visor: una franja de cristal que sigue el borde de arriba, hasta donde el casco aún es grueso.
  const a = geo.at(0.62)
  let b = geo.at(0.9)
  while (b > a && geo.half(b) < 9) b -= 1
  const xs = Array.from({ length: 14 }, (_, i) => a + ((b - a) * i) / 13)
  const upper = xs.map((x) => `${num(x)} ${num(geo.top(x) + 4)}`)
  const lower = [...xs].reverse().map((x) => `${num(x)} ${num(geo.top(x) + 11)}`)
  return (
    <g clipPath={`url(#${clip})`}>
      <path d={`M${upper.join(' L')} L${lower.join(' L')} Z`} fill={canopy} className="ship-ink ship-thin" />
      <path d={`M${num(a + 4)} ${num(geo.top(a + 4) + 6.5)} L${num(a + (b - a) * 0.55)} ${num(geo.top(a + (b - a) * 0.55) + 6.5)}`} stroke="#fff" strokeWidth={1.8} strokeLinecap="round" opacity={0.85} fill="none" />
    </g>
  )
}

function Nose({ geo, pal, kind, clip }: Ctx & { kind: ShipConfig['nose']; clip: string }) {
  if (kind === 'none') return null
  const x = geo.x1
  if (kind === 'probe') {
    return (
      <g>
        <path d={`M${x - 2} ${CY} H${x + 15}`} className="ship-ink" fill="none" />
        <circle cx={x + 17} cy={CY} r={3} fill={pal.accent} className="ship-ink" />
      </g>
    )
  }
  if (kind === 'cap') {
    return (
      <g clipPath={`url(#${clip})`}>
        <path d={`M${x - 15} ${CY - geo.H} L${x - 15} ${CY + geo.H} L${x + 4} ${CY + geo.H} L${x + 4} ${CY - geo.H} Z`} fill={pal.accent} />
        <path d={`M${x - 15} ${CY - geo.H} V${CY + geo.H}`} className="ship-ink ship-thin" fill="none" />
      </g>
    )
  }
  return (
    <g>
      <polygon points={pts([[x - 3, CY - 5], [x + 14, CY], [x - 3, CY + 5]])} fill={pal.trim} className="ship-ink" />
      <path d={`M${x + 3} ${CY - 3.2} L${x + 3} ${CY + 3.2} M${x + 8} ${CY - 1.8} L${x + 8} ${CY + 1.8}`} className="ship-ink ship-thin" fill="none" />
    </g>
  )
}

/* ---------- La nave ---------- */

type Props = {
  config: ShipConfig
  /** Ancho en px. Sin él, ocupa el ancho de su contenedor. */
  size?: number
  /** Cuántas ventanillas se ven (una por miembro). */
  crew?: number
  /** Nombres de los miembros, para el tooltip y los lectores de pantalla. */
  crewNames?: string[]
  animate?: boolean
  /** Contorno más fino: para tamaños pequeños. */
  className?: string
  label?: string
}

function ShipRendererBase({ config, size, crew = 0, crewNames = [], animate = true, className = '', label }: Props) {
  const uid = useId().replace(/:/g, '')
  const geo = hullGeo(config.hull)
  const pal = config.palette
  const clip = `${uid}-hull`
  const shade = darken(pal.hull, 0.16)

  return (
    <svg
      className={`ship${animate ? ' is-live' : ''} ${className}`.trim()}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={size}
      height={size ? size * (VB_H / VB_W) : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <path d={geo.path} />
        </clipPath>
      </defs>

      <Engines geo={geo} pal={pal} config={config.engine} />
      <Tail geo={geo} pal={pal} kind={config.tail} />
      <TopModule geo={geo} pal={pal} kind={config.top} />
      <Belly geo={geo} pal={pal} kind={config.belly} />

      <path d={geo.path} fill={pal.hull} className="ship-ink" />
      <g clipPath={`url(#${clip})`}>
        <rect x={geo.x0} y={CY + geo.H * 0.14} width={geo.L} height={geo.H} fill={shade} opacity={0.5} />
        <path d={`M${geo.at(0.2)} ${geo.top(geo.at(0.2)) + 5} L${geo.at(0.62)} ${geo.top(geo.at(0.62)) + 5}`} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.5} />
      </g>
      <path d={geo.path} fill="none" className="ship-ink" />

      <Decals geo={geo} pal={pal} kind={config.decal} clip={clip} />
      <Cockpit geo={geo} pal={pal} kind={config.cockpit} clip={clip} />
      <Windows geo={geo} pal={pal} kind={config.windows} crew={crew} names={crewNames} />
      <Nose geo={geo} pal={pal} kind={config.nose} clip={clip} />
      <Wings geo={geo} pal={pal} kind={config.wings} />
    </svg>
  )
}

export const ShipRenderer = memo(ShipRendererBase)
