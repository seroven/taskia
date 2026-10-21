import { cloneElement, memo, useId, type ReactElement, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { darken, lighten, mix } from '../../lib/ship/color'
import { CY, VB_H, VB_W, hullGeo, type HullGeo } from '../../lib/ship/geometry'
import { MAX_CREW, type ShipConfig, type ShipPalette } from '../../lib/ship/types'
import { Spark } from '../scenes/kit'

type Ctx = { geo: HullGeo; pal: ShipPalette }

/** Modo editor: las piezas cambiadas aparecen con rebote (`appear` es falso hasta el primer cambio). */
type Anim = { appear: boolean }

const num = (value: number) => Math.round(value * 10) / 10
const pts = (list: [number, number][]) => list.map(([x, y]) => `${num(x)},${num(y)}`).join(' ')

/** Dónde caben las ventanillas: la franja del casco que es lo bastante gruesa, sin invadir cola ni nariz. */
function windowSpots(geo: HullGeo, count: number, end = 0.74) {
  let a = geo.at(0.17)
  let b = geo.at(end)
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
        } else if (config.kind === 'jet') {
          exit = xb - 14
          body = (
            <>
              <rect x={xb - 14} y={y - r * 1.05} width={16} height={r * 2.1} rx={3} fill={pal.trim} className="ship-ink" />
              <ellipse cx={xb - 14} cy={y} rx={2.4} ry={r * 0.8} fill={dark} className="ship-ink ship-thin" />
              <path d={`M${xb - 8} ${y - r * 1.05} V${y + r * 1.05} M${xb - 3} ${y - r * 1.05} V${y + r * 1.05}`} className="ship-ink ship-thin" fill="none" />
            </>
          )
        } else if (config.kind === 'horn') {
          exit = xb - 19
          body = (
            <>
              <polygon points={pts([[xb + 2, y - r * 0.55], [xb - 8, y - r * 0.6], [xb - 18, y - r * 1.7], [xb - 18, y + r * 1.7], [xb - 8, y + r * 0.6], [xb + 2, y + r * 0.55]])} fill={pal.trim} className="ship-ink" />
              <ellipse cx={xb - 18} cy={y} rx={2.4} ry={r * 1.7} fill={pal.accent} className="ship-ink ship-thin" />
            </>
          )
        } else if (config.kind === 'cone') {
          exit = xb - 21
          body = <polygon points={pts([[xb + 2, y - r], [xb - 20, y], [xb + 2, y + r]])} fill={pal.accent} className="ship-ink" />
        } else if (config.kind === 'fan') {
          exit = xb - 11
          body = (
            <>
              <ellipse cx={xb - 5} cy={y} rx={4.5} ry={r * 1.6} fill={pal.trim} className="ship-ink" />
              <ellipse cx={xb - 7} cy={y} rx={2.4} ry={r * 1.25} fill={pal.accent} className="ship-ink ship-thin" />
              <path d={`M${xb - 8} ${y - r * 0.9} L${xb - 6} ${y - r * 0.1} M${xb - 8} ${y + r * 0.9} L${xb - 6} ${y + r * 0.1} M${xb - 8} ${y} H${xb - 5}`} className="ship-ink ship-thin" fill="none" />
            </>
          )
        } else if (config.kind === 'crystal') {
          exit = xb - 21
          body = (
            <>
              <polygon points={pts([[xb + 2, y], [xb - 6, y - r * 1.5], [xb - 16, y - r * 1.1], [xb - 20, y], [xb - 16, y + r * 1.1], [xb - 6, y + r * 1.5]])} fill={pal.accent} className="ship-ink" />
              <path d={`M${xb - 6} ${y - r * 1.5} L${xb - 10} ${y} L${xb - 6} ${y + r * 1.5} M${xb - 10} ${y} H${xb - 20}`} className="ship-ink ship-thin" fill="none" />
              <circle cx={xb - 12} cy={y - r * 0.55} r={1.4} fill="#fff" opacity={0.9} />
            </>
          )
        } else if (config.kind === 'box') {
          exit = xb - 15
          body = (
            <>
              <rect x={xb - 14} y={y - r * 1.3} width={16} height={r * 2.6} rx={2} fill={pal.trim} className="ship-ink" />
              <path d={`M${xb - 11} ${y - r * 0.65} H${xb - 3} M${xb - 11} ${y} H${xb - 3} M${xb - 11} ${y + r * 0.65} H${xb - 3}`} className="ship-ink ship-thin" fill="none" />
            </>
          )
        } else if (config.kind === 'bubble') {
          const br = r * 1.6
          exit = xb - 8 - br
          body = (
            <>
              <circle cx={xb - 8} cy={y} r={br} fill={pal.glass} className="ship-ink" />
              <circle cx={xb - 8} cy={y} r={br * 0.55} fill={pal.accent} opacity={0.9} />
              <circle cx={xb - 8 - br * 0.4} cy={y - br * 0.45} r={Math.max(1.2, br * 0.18)} fill="#fff" opacity={0.95} />
            </>
          )
        } else if (config.kind === 'saturn') {
          exit = xb - 14
          body = (
            <>
              <circle cx={xb - 7} cy={y} r={r * 1.15} fill={pal.accent} className="ship-ink" />
              <ellipse cx={xb - 7} cy={y} rx={r * 2} ry={r * 0.6} transform={`rotate(-18 ${xb - 7} ${y})`} fill="none" className="ship-ink" />
              <circle cx={xb - 9} cy={y - r * 0.4} r={r * 0.28} fill="#fff" opacity={0.85} />
            </>
          )
        } else if (config.kind === 'nozzle') {
          exit = xb - 16
          body = (
            <>
              <polygon points={pts([[xb + 2, y - r * 0.8], [xb - 10, y - r * 0.8], [xb - 15, y - r * 1.3], [xb - 15, y + r * 1.3], [xb - 10, y + r * 0.8], [xb + 2, y + r * 0.8]])} fill={pal.trim} className="ship-ink" />
              <path d={`M${xb - 10} ${y - r * 0.8} V${y + r * 0.8}`} className="ship-ink ship-thin" fill="none" />
            </>
          )
        } else if (config.kind === 'flare') {
          exit = xb - 17
          body = (
            <>
              <polygon points={pts([[xb + 2, y - r * 0.5], [xb - 16, y - r * 2.1], [xb - 16, y + r * 2.1], [xb + 2, y + r * 0.5]])} fill={pal.trim} className="ship-ink" />
              <path d={`M${xb + 1} ${y} L${xb - 16} ${y - r * 1.05} M${xb + 1} ${y} L${xb - 16} ${y + r * 1.05}`} stroke={pal.accent} strokeWidth={1.6} strokeLinecap="round" fill="none" />
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
  const trail = (n: number) => Array.from({ length: n }, (_, i) => i)
  if (kind === 'comet') {
    return (
      <g className="ship-flame">
        <polygon points={pts([[x - 3, y - r * 0.9], [x - len * 1.05, y], [x - 3, y + r * 0.9]])} fill={pal.accent} opacity={0.85} className="ship-ink ship-thin" />
        <circle cx={x - 4} cy={y} r={r * 0.95} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'rainbow') {
    const h = r * 0.62
    return (
      <g className="ship-flame">
        {['#f87171', '#fbbf24', '#60a5fa'].map((color, i) => (
          <polygon key={color} points={pts([[x + 1, y + (i - 1) * h - h / 2], [x - len, y + (i - 1) * h * 1.25 - h / 2], [x - len, y + (i - 1) * h * 1.25 + h / 2], [x + 1, y + (i - 1) * h + h / 2]])} fill={color} />
        ))}
      </g>
    )
  }
  if (kind === 'sparks') {
    return (
      <g className="ship-flame">
        {[[-6, 0, 1], [-15, -r * 0.7, 0.7], [-22, r * 0.6, 0.85], [-31, -r * 0.2, 0.55]].map(([dx, dy, k], i) => (
          <Spark key={i} x={x + dx!} y={y + dy!} s={r * 1.05 * k!} className="ship-ink ship-thin" style={{ fill: i % 2 ? core : pal.accent }} />
        ))}
      </g>
    )
  }
  if (kind === 'waves') {
    const h = r * 0.55
    return (
      <g className="ship-flame" fill="none" strokeLinecap="round">
        {[-1, 0, 1].map((k) => {
          const d = `M${x} ${y + k * r * 0.8} q${-len * 0.17} ${-h} ${-len * 0.33} 0 t${-len * 0.33} 0 t${-len * 0.33} 0`
          return (
            <g key={k}>
              <path d={d} className="ship-ink" style={{ strokeWidth: 5.2 }} />
              <path d={d} stroke={pal.accent} strokeWidth={2.4} />
            </g>
          )
        })}
      </g>
    )
  }
  if (kind === 'drip') {
    return (
      <g className="ship-flame">
        {trail(4).map((i) => (
          <circle key={i} cx={x - 5 - i * r * 1.1} cy={y + i * i * 0.9} r={Math.max(1.4, r * (0.8 - i * 0.16))} fill={i === 0 ? pal.accent : core} className="ship-ink ship-thin" />
        ))}
      </g>
    )
  }
  if (kind === 'ribbon') {
    const d = `M${x} ${y} C${x - len * 0.3} ${y - r * 1.5} ${x - len * 0.6} ${y + r * 1.5} ${x - len} ${y}`
    return (
      <g className="ship-flame" fill="none" strokeLinecap="round">
        <path d={d} className="ship-ink" style={{ strokeWidth: 6.4 }} />
        <path d={d} stroke={pal.accent} strokeWidth={3.2} />
      </g>
    )
  }
  if (kind === 'stars') {
    return (
      <g className="ship-flame">
        {trail(3).map((i) => (
          <Spark key={i} x={x - 8 - i * len * 0.32} y={y + (i % 2 ? 2 : -2)} s={r * (1.25 - i * 0.3)} className="ship-ink ship-thin" style={{ fill: i === 0 ? pal.accent : core }} />
        ))}
      </g>
    )
  }
  if (kind === 'pulse') {
    return (
      <g className="ship-flame" fill="none" strokeLinecap="round">
        {trail(3).map((i) => {
          const cx = x - 5 - i * r * 1.7
          const ry = r * (0.9 + i * 0.35)
          const d = `M${cx} ${y - ry} A${r * 0.7} ${ry} 0 0 0 ${cx} ${y + ry}`
          return (
            <g key={i} opacity={1 - i * 0.22}>
              <path d={d} className="ship-ink" style={{ strokeWidth: 5.2 }} />
              <path d={d} stroke={pal.accent} strokeWidth={2.4} />
            </g>
          )
        })}
      </g>
    )
  }
  if (kind === 'tongue') {
    const h = r * 0.5
    const l = len * 1.45
    return (
      <g className="ship-flame">
        <path d={`M${x + 1} ${y - h} C${x - l * 0.3} ${y - h} ${x - l * 0.7} ${y - h * 0.2} ${x - l} ${y} C${x - l * 0.7} ${y + h * 0.2} ${x - l * 0.3} ${y + h} ${x + 1} ${y + h} Z`} fill={pal.accent} className="ship-ink ship-thin" />
        <path d={`M${x + 1} ${y - h * 0.4} C${x - l * 0.25} ${y - h * 0.4} ${x - l * 0.4} ${y} ${x - l * 0.55} ${y} C${x - l * 0.4} ${y} ${x - l * 0.25} ${y + h * 0.4} ${x + 1} ${y + h * 0.4} Z`} fill={core} />
      </g>
    )
  }
  if (kind === 'hearts') {
    return (
      <g className="ship-flame">
        {trail(3).map((i) => {
          const s = r * (0.85 - i * 0.2)
          const cx = x - 8 - i * r * 1.6
          const cy = y + (i % 2 ? 2 : -2)
          return <path key={i} d={`M${cx} ${cy + s} C${cx - s * 1.7} ${cy - s * 0.1} ${cx - s * 0.8} ${cy - s * 1.3} ${cx} ${cy - s * 0.4} C${cx + s * 0.8} ${cy - s * 1.3} ${cx + s * 1.7} ${cy - s * 0.1} ${cx} ${cy + s} Z`} fill={i === 0 ? pal.accent : core} className="ship-ink ship-thin" />
        })}
      </g>
    )
  }
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
  const tp = (u: number) => geo.top(X(u))
  if (kind === 'sail') {
    const a = X(0.1)
    const b = X(0.36)
    return <path d={`M${b} ${tp(0.36) + 3} C${b + 1} ${tp(0.36) - 22} ${a + 8} ${tp(0.1) - 34} ${a - 6} ${tp(0.1) - 32} C${a + 2} ${tp(0.1) - 16} ${a + 3} ${tp(0.1) - 4} ${a + 4} ${tp(0.1) + 4} Z`} fill={pal.trim} className="ship-ink" />
  }
  if (kind === 'spike') {
    return (
      <g fill={pal.trim} className="ship-ink">
        <polygon points={pts([[X(0.27), tp(0.27) + 3], [X(0.17), tp(0.17) - 32], [X(0.12), tp(0.12) + 3]])} />
        <polygon points={pts([[X(0.4), tp(0.4) + 3], [X(0.33), tp(0.33) - 19], [X(0.28), tp(0.28) + 3]])} />
      </g>
    )
  }
  if (kind === 'crest') {
    return (
      <g fill={pal.trim} className="ship-ink">
        {[0.1, 0.19, 0.28, 0.37].map((u, i) => (
          <polygon key={u} points={pts([[X(u) + 9, tp(u + 0.04) + 3], [X(u) + 1, tp(u) - 16 + i * 2], [X(u) - 4, tp(u - 0.02) + 3]])} />
        ))}
      </g>
    )
  }
  if (kind === 'fishtail') {
    return (
      <path
        d={`M${X(0.32)} ${tp(0.32) + 2} Q${X(0.12)} ${tp(0.12) - 12} ${X(0)} ${tp(0.1) - 34} Q${X(0.1)} ${tp(0.1) - 8} ${X(0.12)} ${CY} Q${X(0.1)} ${geo.bot(X(0.1)) + 8} ${X(0)} ${geo.bot(X(0.1)) + 34} Q${X(0.12)} ${geo.bot(X(0.12)) + 12} ${X(0.32)} ${geo.bot(X(0.32)) - 2} Z`}
        fill={pal.trim}
        className="ship-ink"
      />
    )
  }
  if (kind === 'sickle') {
    const b = X(0.3)
    return <path d={`M${b} ${tp(0.3) + 3} C${X(0.3)} ${tp(0.3) - 20} ${X(0.12)} ${tp(0.1) - 32} ${X(-0.08)} ${tp(0.1) - 26} C${X(0.06)} ${tp(0.1) - 22} ${X(0.12)} ${tp(0.1) - 12} ${X(0.14)} ${tp(0.14) + 3} Z`} fill={pal.trim} className="ship-ink" />
  }
  if (kind === 'disc') {
    const x = X(0.22)
    const y = tp(0.22)
    return (
      <g>
        <path d={`M${x} ${y + 3} V${y - 14}`} className="ship-ink" fill="none" />
        <circle cx={x} cy={y - 24} r={11} fill={pal.trim} className="ship-ink" />
        <circle cx={x} cy={y - 24} r={5} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'notch') {
    const a = X(0.1)
    const b = X(0.34)
    const m = (a + b) / 2
    return <polygon points={pts([[b, tp(0.34) + 3], [b - 2, tp(0.34) - 23], [m + 2, tp(0.22) - 23], [m - 1, tp(0.22) - 11], [m - 5, tp(0.2) - 23], [a - 3, tp(0.1) - 23], [a, tp(0.1) + 3]])} fill={pal.trim} className="ship-ink" />
  }
  if (kind === 'zig') {
    return (
      <polygon
        points={pts([[X(0.36), tp(0.36) + 3], [X(0.33), tp(0.33) - 12], [X(0.29), tp(0.29) - 7], [X(0.25), tp(0.25) - 22], [X(0.2), tp(0.2) - 13], [X(0.16), tp(0.16) - 29], [X(0.1), tp(0.1) - 6], [X(0.1), tp(0.1) + 3]])}
        fill={pal.trim}
        className="ship-ink"
      />
    )
  }
  if (kind === 'rotor') {
    const x = X(0.24)
    const y = tp(0.24)
    return (
      <g>
        <path d={`M${x} ${y + 3} V${y - 11}`} className="ship-ink" fill="none" />
        <g className="ship-sweep" style={{ transformOrigin: `${x}px ${y - 11}px` }}>
          <ellipse cx={x} cy={y - 12} rx={19} ry={3.4} fill={pal.trim} className="ship-ink" />
        </g>
        <circle cx={x} cy={y - 12} r={2.8} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'crown') {
    const a = X(0.08)
    const b = X(0.4)
    const at = (t: number) => a + (b - a) * t
    const ty = (t: number) => geo.top(at(t))
    return (
      <g>
        <polygon points={pts([[b, ty(1) + 3], [b, ty(1) - 20], [at(0.75), ty(0.75) - 9], [at(0.5), ty(0.5) - 27], [at(0.25), ty(0.25) - 9], [a, ty(0) - 20], [a, ty(0) + 3]])} fill={pal.trim} className="ship-ink" />
        {[0, 0.5, 1].map((t) => (
          <circle key={t} cx={at(t)} cy={ty(t) - (t === 0.5 ? 27 : 20)} r={3} fill={pal.accent} className="ship-ink ship-thin" />
        ))}
      </g>
    )
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
  if (kind === 'flag') {
    return (
      <g>
        <path d={`M${x} ${y} V${y - 27}`} className="ship-ink" fill="none" />
        <polygon points={pts([[x, y - 27], [x + 18, y - 21.5], [x, y - 15]])} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'windmill') {
    return (
      <g>
        <path d={`M${x} ${y} V${y - 14}`} className="ship-ink" fill="none" />
        <g className="ship-sweep" style={{ transformOrigin: `${x}px ${y - 15}px` }}>
          <ellipse cx={x} cy={y - 15} rx={13} ry={2.8} fill={pal.trim} className="ship-ink" />
          <ellipse cx={x} cy={y - 15} rx={2.8} ry={13} fill={pal.trim} className="ship-ink" />
        </g>
        <circle cx={x} cy={y - 15} r={2.6} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'balloon') {
    return (
      <g>
        <path d={`M${x} ${y} Q${x - 4} ${y - 8} ${x} ${y - 15}`} className="ship-ink ship-thin" fill="none" />
        <ellipse cx={x} cy={y - 26} rx={9} ry={11} fill={pal.accent} className="ship-ink" />
        <path d={`M${x - 3} ${y - 15} L${x} ${y - 13} L${x + 3} ${y - 15} Z`} fill={pal.accent} className="ship-ink ship-thin" />
        <circle cx={x - 3.5} cy={y - 30} r={1.8} fill="#fff" opacity={0.85} />
      </g>
    )
  }
  if (kind === 'lighthouse') {
    return (
      <g>
        <polygon points={pts([[x - 7, y + 1], [x - 4.5, y - 17], [x + 4.5, y - 17], [x + 7, y + 1]])} fill={pal.trim} className="ship-ink" />
        <path d={`M${x - 5.6} ${y - 8} H${x + 5.6}`} stroke={pal.accent} strokeWidth={3} />
        <rect x={x - 5} y={y - 24} width={10} height={7} rx={1.6} fill={pal.glass} className="ship-ink ship-thin ship-blink" />
        <polygon points={pts([[x - 7, y - 24], [x, y - 31], [x + 7, y - 24]])} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'sprout') {
    return (
      <g>
        <path d={`M${x} ${y} Q${x - 1} ${y - 8} ${x} ${y - 14}`} className="ship-ink" fill="none" />
        <ellipse cx={x - 7} cy={y - 17} rx={8} ry={4} transform={`rotate(-28 ${x - 7} ${y - 17})`} fill="#4ade80" className="ship-ink ship-thin" />
        <ellipse cx={x + 7} cy={y - 20} rx={8} ry={4} transform={`rotate(28 ${x + 7} ${y - 20})`} fill="#86efac" className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'umbrella') {
    return (
      <g>
        <path d={`M${x} ${y} V${y - 17}`} className="ship-ink" fill="none" />
        <path d={`M${x - 15} ${y - 17} A15 11 0 0 1 ${x + 15} ${y - 17} Q${x + 7.5} ${y - 13} ${x} ${y - 17} Q${x - 7.5} ${y - 13} ${x - 15} ${y - 17} Z`} fill={pal.trim} className="ship-ink" />
        <path d={`M${x} ${y - 28} V${y - 17} M${x - 8} ${y - 25} L${x - 5} ${y - 16} M${x + 8} ${y - 25} L${x + 5} ${y - 16}`} className="ship-ink ship-thin" fill="none" opacity={0.7} />
      </g>
    )
  }
  if (kind === 'minirocket') {
    return (
      <g>
        <polygon points={pts([[x - 6, y + 1], [x - 10, y - 8], [x - 5, y - 7]])} fill={pal.accent} className="ship-ink ship-thin" />
        <polygon points={pts([[x + 6, y + 1], [x + 10, y - 8], [x + 5, y - 7]])} fill={pal.accent} className="ship-ink ship-thin" />
        <path d={`M${x - 5} ${y + 1} V${y - 15} Q${x - 5} ${y - 25} ${x} ${y - 29} Q${x + 5} ${y - 25} ${x + 5} ${y - 15} V${y + 1} Z`} fill={pal.trim} className="ship-ink" />
        <circle cx={x} cy={y - 16} r={2.6} fill={pal.glass} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'moon') {
    return (
      <g>
        <path d={`M${x} ${y} V${y - 11}`} className="ship-ink" fill="none" />
        <path d={`M${x + 4} ${y - 33} A11 11 0 1 0 ${x + 4} ${y - 11} A8.5 8.5 0 1 1 ${x + 4} ${y - 33} Z`} fill={pal.accent} className="ship-ink" />
      </g>
    )
  }
  if (kind === 'antlers') {
    return (
      <g>
        <path d={`M${x - 4} ${y} V${y - 11} L${x - 11} ${y - 22} M${x - 5.5} ${y - 14} L${x - 1} ${y - 22} M${x + 4} ${y} V${y - 11} L${x + 11} ${y - 22} M${x + 5.5} ${y - 14} L${x + 1} ${y - 22}`} className="ship-ink" fill="none" />
        {[[-11, -22], [-1, -22], [11, -22], [1, -22]].map(([dx, dy]) => (
          <circle key={`${dx}${dy}`} cx={x + dx!} cy={y + dy!} r={2.3} fill={pal.accent} className="ship-ink ship-thin" />
        ))}
      </g>
    )
  }
  if (kind === 'orbit') {
    return (
      <g>
        <path d={`M${x} ${y} V${y - 8}`} className="ship-ink" fill="none" />
        <ellipse cx={x} cy={y - 17} rx={14} ry={5} transform={`rotate(-14 ${x} ${y - 17})`} fill="none" className="ship-ink ship-thin" strokeDasharray="3 2.5" />
        <circle cx={x} cy={y - 17} r={5} fill={pal.trim} className="ship-ink" />
        <circle cx={x + 12} cy={y - 20} r={2.6} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
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
  const bt = (u: number) => geo.bot(X(u))
  if (kind === 'wheels') {
    return (
      <g>
        {[0.36, 0.64].map((u) => (
          <g key={u}>
            <path d={`M${X(u)} ${bt(u) - 1} V${bt(u) + 7}`} className="ship-ink" fill="none" />
            <circle cx={X(u)} cy={bt(u) + 11} r={6} fill={pal.trim} className="ship-ink" />
            <circle cx={X(u)} cy={bt(u) + 11} r={2.2} fill={pal.accent} className="ship-ink ship-thin" />
          </g>
        ))}
      </g>
    )
  }
  if (kind === 'skids') {
    return (
      <g>
        {[0.34, 0.64].map((u) => (
          <path key={u} d={`M${X(u)} ${bt(u) - 1} L${X(u) - 2} ${bt(u) + 11}`} className="ship-ink" fill="none" />
        ))}
        <rect x={X(0.24)} y={bt(0.5) + 10} width={X(0.74) - X(0.24)} height={4.2} rx={2.1} fill={pal.trim} className="ship-ink" />
      </g>
    )
  }
  if (kind === 'orb') {
    return (
      <g>
        <circle cx={X(0.5)} cy={bt(0.5) + 10} r={9} fill={pal.accent} className="ship-ink" />
        <circle cx={X(0.5) - 3} cy={bt(0.5) + 6.5} r={2.4} fill="#fff" opacity={0.85} />
      </g>
    )
  }
  if (kind === 'claw') {
    const x = X(0.5)
    const y = bt(0.5)
    return (
      <g>
        <path d={`M${x} ${y - 1} V${y + 9} M${x} ${y + 9} Q${x - 10} ${y + 13} ${x - 7} ${y + 23} M${x} ${y + 9} Q${x + 10} ${y + 13} ${x + 7} ${y + 23}`} className="ship-ink" fill="none" />
        <circle cx={x} cy={y + 9} r={3.4} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'keel') {
    return <polygon points={pts([[X(0.6), bt(0.6) - 2], [X(0.5), bt(0.5) + 15], [X(0.3), bt(0.3) + 15], [X(0.24), bt(0.24) - 2]])} fill={pal.trim} className="ship-ink" />
  }
  if (kind === 'dome') {
    const x = X(0.5)
    const y = bt(0.5) - 1
    return (
      <g>
        <path d={`M${x - 17} ${y} A17 14 0 0 0 ${x + 17} ${y} Z`} fill={mix(pal.glass, '#7dd3fc', 0.45)} className="ship-ink" />
        <path d={`M${x - 10} ${y + 5} Q${x - 5} ${y + 10} ${x + 1} ${y + 11}`} stroke="#fff" strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.85} />
      </g>
    )
  }
  if (kind === 'crates') {
    return (
      <g>
        <rect x={X(0.32)} y={bt(0.38) + 4} width={14} height={12} rx={1.6} fill={pal.trim} className="ship-ink" />
        <path d={`M${X(0.32)} ${bt(0.38) + 10} H${X(0.32) + 14} M${X(0.32) + 7} ${bt(0.38) + 4} V${bt(0.38) + 16}`} className="ship-ink ship-thin" fill="none" />
        <rect x={X(0.56)} y={bt(0.6) + 4} width={11} height={9} rx={1.6} fill={pal.accent} className="ship-ink" />
        <path d={`M${X(0.56)} ${bt(0.6) + 8.5} H${X(0.56) + 11}`} className="ship-ink ship-thin" fill="none" />
      </g>
    )
  }
  if (kind === 'tripod') {
    const x = X(0.5)
    const y = bt(0.5) - 1
    return (
      <g>
        <path d={`M${x} ${y} L${x - 13} ${y + 17} M${x} ${y} V${y + 19} M${x} ${y} L${x + 13} ${y + 17}`} className="ship-ink" fill="none" />
        {[-13, 0, 13].map((dx) => (
          <ellipse key={dx} cx={x + dx} cy={y + (dx === 0 ? 20 : 18)} rx={4.4} ry={1.9} fill={pal.trim} className="ship-ink ship-thin" />
        ))}
      </g>
    )
  }
  if (kind === 'spot') {
    const x = X(0.5)
    const y = bt(0.5) - 1
    return (
      <g>
        <polygon points={pts([[x - 4, y + 11], [x + 4, y + 11], [x + 16, y + 34], [x - 16, y + 34]])} fill={lighten(pal.accent, 0.55)} opacity={0.45} />
        <rect x={x - 6} y={y} width={12} height={10} rx={3} fill={pal.accent} className="ship-ink" />
        <path d={`M${x - 6} ${y + 6} H${x + 6}`} className="ship-ink ship-thin" fill="none" />
      </g>
    )
  }
  if (kind === 'anchor') {
    const x = X(0.5)
    const y = bt(0.5)
    return (
      <g>
        <path d={`M${x} ${y - 1} V${y + 18} M${x - 7} ${y + 6} H${x + 7} M${x - 10} ${y + 13} Q${x} ${y + 26} ${x + 10} ${y + 13}`} className="ship-ink" fill="none" />
        <circle cx={x} cy={y + 3} r={3} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
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

/**
 * Cada ala se describe como formas (con relleno y contorno), franjas de color y detalles sueltos. La franja se recorta con
 * la silueta del ala (extremos planos, de borde a borde, como una banda pintada) y el contorno oscuro vuelve a pasar por
 * encima: así nunca se sale del ala ni deja huecos en el trazo, sea cual sea el casco.
 */
type WingShape = ReactElement<{ fill?: string; className?: string }>
type WingPart = { shapes: WingShape[]; stripes?: ReactElement[]; extras?: ReactElement[] }

function Wings({ geo, pal, kind }: Ctx & { kind: ShipConfig['wings'] }) {
  const clip = `${useId().replace(/:/g, '')}-wing`
  if (kind === 'none') return null
  const X = geo.at
  const y = (u: number) => geo.bot(X(u)) - 5
  const ink = { fill: pal.trim, className: 'ship-ink' }
  const poly = (key: string, list: [number, number][]) => <polygon key={key} points={pts(list)} {...ink} />
  const path = (key: string, d: string) => <path key={key} d={d} {...ink} />
  /** Franja recta que se pasa de largo por los dos lados: el recorte la deja de borde a borde. */
  const band = (key: string, a: [number, number], b: [number, number], width = 2.6) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    const ex = ((b[0] - a[0]) / len) * 16
    const ey = ((b[1] - a[1]) / len) * 16
    return <path key={key} d={`M${num(a[0] - ex)} ${num(a[1] - ey)} L${num(b[0] + ex)} ${num(b[1] + ey)}`} stroke={pal.accent} strokeWidth={width} fill="none" />
  }

  let part: WingPart
  if (kind === 'delta') {
    part = {
      shapes: [poly('a', [[X(0.66), y(0.66)], [X(0.14), geo.bot(X(0.3)) + 28], [X(0.3), y(0.3)]])],
      stripes: [band('s', [X(0.46), geo.bot(X(0.46)) - 1], [X(0.27), geo.bot(X(0.3)) + 20], 3)],
    }
  } else if (kind === 'swept') {
    const a = X(0.68)
    const b = X(0.34)
    const ya = geo.bot(a) - 5
    const yb = geo.bot(b) - 5
    part = {
      shapes: [path('a', `M${a} ${ya} C${a - 18} ${ya + 8} ${X(0.2)} ${yb + 24} ${X(0.08)} ${yb + 30} C${X(0.2)} ${yb + 10} ${b + 4} ${yb + 5} ${b} ${yb} Z`)],
      stripes: [band('s', [X(0.5), geo.bot(X(0.5)) + 1], [X(0.17), yb + 24])],
    }
  } else if (kind === 'stub') {
    const a = X(0.62)
    const b = X(0.38)
    const yy = geo.bot(X(0.5)) - 5
    part = {
      shapes: [poly('a', [[a, yy], [a - 5, yy + 16], [b - 4, yy + 16], [b, yy]])],
      stripes: [band('s', [a - 4, yy + 11], [b - 3, yy + 11])],
    }
  } else if (kind === 'blade') {
    part = {
      shapes: [poly('a', [[X(0.76), y(0.76)], [X(0.5), y(0.5) + 13], [X(-0.02), y(0.12) + 16], [X(0.22), y(0.22) + 4], [X(0.34), y(0.34)]])],
      stripes: [band('s', [X(0.6), y(0.6) + 5], [X(0.1), y(0.12) + 11], 2.4)],
    }
  } else if (kind === 'leaf') {
    part = {
      shapes: [path('a', `M${X(0.66)} ${y(0.66)} C${X(0.62)} ${y(0.5) + 20} ${X(0.32)} ${y(0.3) + 32} ${X(0.1)} ${y(0.3) + 26} C${X(0.2)} ${y(0.3) + 10} ${X(0.3)} ${y(0.34) + 3} ${X(0.36)} ${y(0.36)} Z`)],
      stripes: [band('s', [X(0.5), y(0.5) + 4], [X(0.17), y(0.3) + 22], 2.2)],
    }
  } else if (kind === 'manta') {
    part = {
      shapes: [path('a', `M${X(0.72)} ${y(0.72)} Q${X(0.5)} ${y(0.5) + 12} ${X(0.2)} ${y(0.3) + 16} Q${X(0.07)} ${y(0.3) + 24} ${X(0.02)} ${y(0.3) + 22} Q${X(0.06)} ${y(0.3) + 8} ${X(0.12)} ${y(0.3) + 2} L${X(0.3)} ${y(0.3)} Z`)],
      stripes: [band('s', [X(0.5), y(0.5) + 2], [X(0.12), y(0.3) + 14], 2.2)],
    }
  } else if (kind === 'steps') {
    const r = X(0.66)
    const q = X(0.2)
    const w = (r - q) / 3
    part = {
      shapes: [poly('a', [[r, y(0.66)], [r, y(0.66) + 8], [r - w, y(0.5) + 8], [r - w, y(0.5) + 16], [r - 2 * w, y(0.4) + 16], [r - 2 * w, y(0.3) + 25], [q, y(0.3) + 25], [q, y(0.2)]])],
      stripes: [band('s', [r - w, y(0.5) + 12], [r - 2 * w + 3, y(0.5) + 12], 2.2)],
    }
  } else if (kind === 'hook') {
    part = {
      shapes: [path('a', `M${X(0.32)} ${y(0.32)} L${X(0.6)} ${y(0.6)} C${X(0.82)} ${y(0.7) + 10} ${X(0.9)} ${y(0.7) + 26} ${X(0.78)} ${y(0.7) + 34} C${X(0.7)} ${y(0.5) + 24} ${X(0.5)} ${y(0.4) + 12} ${X(0.24)} ${y(0.3) + 6} Z`)],
      stripes: [band('s', [X(0.5), y(0.5) + 5], [X(0.78), y(0.7) + 26], 2.2)],
    }
  } else if (kind === 'biplane') {
    part = {
      shapes: [
        poly('a', [[X(0.68), y(0.68)], [X(0.62), y(0.5) + 11], [X(0.3), y(0.4) + 11], [X(0.38), y(0.4)]]),
        poly('b', [[X(0.66), y(0.66) + 18], [X(0.6), y(0.5) + 29], [X(0.26), y(0.4) + 29], [X(0.34), y(0.4) + 18]]),
      ],
      stripes: [band('s', [X(0.6), y(0.5) + 20], [X(0.3), y(0.5) + 20], 2.2)],
      extras: [<path key="struts" d={`M${X(0.6)} ${y(0.5) + 11} V${y(0.5) + 29} M${X(0.36)} ${y(0.4) + 11} V${y(0.4) + 29}`} className="ship-ink ship-thin" fill="none" />],
    }
  } else if (kind === 'scissor') {
    const cx = X(0.5)
    const cy = y(0.5) + 1
    part = {
      shapes: [
        poly('a', [[cx + 4, cy], [cx - 4, cy], [X(0.1) - 2, y(0.3) + 24], [X(0.1) + 6, y(0.3) + 28]]),
        poly('b', [[cx + 4, cy], [cx - 4, cy], [X(0.86) - 6, cy + 26], [X(0.86) + 2, cy + 22]]),
      ],
      extras: [<circle key="pivot" cx={cx} cy={cy + 3} r={3} fill={pal.accent} className="ship-ink ship-thin" />],
    }
  } else if (kind === 'butterfly') {
    part = {
      shapes: [
        <ellipse key="a" cx={X(0.38)} cy={y(0.38) + 5} rx={19} ry={10} transform={`rotate(-22 ${X(0.38)} ${y(0.38) + 5})`} {...ink} />,
        <ellipse key="b" cx={X(0.6)} cy={y(0.6) + 5} rx={13} ry={7.5} transform={`rotate(24 ${X(0.6)} ${y(0.6) + 5})`} {...ink} />,
      ],
      extras: [
        <circle key="da" cx={X(0.34)} cy={y(0.38) + 7} r={3.4} fill={pal.accent} className="ship-ink ship-thin" />,
        <circle key="db" cx={X(0.62)} cy={y(0.6) + 6} r={2.5} fill={pal.accent} className="ship-ink ship-thin" />,
      ],
    }
  } else if (kind === 'saw') {
    part = {
      shapes: [poly('a', [[X(0.68), y(0.68)], [X(0.62), y(0.62) + 15], [X(0.56), y(0.56) + 8], [X(0.49), y(0.5) + 22], [X(0.43), y(0.43) + 12], [X(0.34), y(0.34) + 26], [X(0.28), y(0.28) + 15], [X(0.18), y(0.2) + 25], [X(0.22), y(0.25)]])],
      stripes: [band('s', [X(0.6), y(0.6) + 3], [X(0.26), y(0.28) + 6], 2)],
    }
  } else {
    part = {
      shapes: [path('a', `M${X(0.72)} ${y(0.72)} C${X(0.36)} ${y(0.4) - 2} ${X(0.1)} ${y(0.3) + 6} ${X(0.02)} ${y(0.3) + 34} L${X(0.16)} ${y(0.3) + 33} C${X(0.2)} ${y(0.3) + 16} ${X(0.4)} ${y(0.5) + 10} ${X(0.6)} ${y(0.6) + 6} Z`)],
      stripes: [band('s', [X(0.5), y(0.5) + 3], [X(0.09), y(0.3) + 26], 2.2)],
    }
  }

  return (
    <g>
      {part.shapes}
      {part.stripes && (
        <>
          <clipPath id={clip}>{part.shapes.map((shape) => cloneElement(shape, { key: `c${shape.key}`, fill: undefined, className: undefined }))}</clipPath>
          <g clipPath={`url(#${clip})`}>{part.stripes}</g>
          {part.shapes.map((shape) => cloneElement(shape, { key: `o${shape.key}`, fill: 'none' }))}
        </>
      )}
      {part.extras}
    </g>
  )
}

/* ---------- Sobre el casco: marcas, ventanillas, cabina y nariz ---------- */

function Decals({ geo, pal, kind, clip }: Ctx & { kind: ShipConfig['decal']; clip: string }) {
  if (kind === 'none') return null
  const X = geo.at
  if (kind === 'star') return <Spark x={X(0.3)} y={geo.bot(X(0.3)) - geo.H * 0.2} s={6.5} className="ship-ink" style={{ fill: pal.accent }} />
  if (kind === 'bolt') {
    const cx = X(0.34)
    const cy = CY + geo.H * 0.22
    const s = Math.max(6, geo.H * 0.2)
    return <polygon points={pts([[cx + 2, cy - s], [cx - s * 0.6, cy + s * 0.1], [cx, cy + s * 0.1], [cx - 2, cy + s], [cx + s * 0.7, cy - s * 0.15], [cx + 1, cy - s * 0.15]])} fill={pal.accent} className="ship-ink ship-thin" />
  }
  const base = CY + geo.H * 0.17
  const row = Array.from({ length: Math.floor(geo.L / 13) }, (_, i) => geo.x0 + 8 + i * 13)
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
      {kind === 'dots' &&
        row.map((x, i) => <circle key={x} cx={x} cy={base + 5 + (i % 2) * 7} r={3.8} fill={i % 3 === 0 ? pal.trim : pal.accent} />)}
      {kind === 'zigzag' && (
        <path d={`M${geo.x0 - 2} ${base + 6} ${row.map((x, i) => `L${x + 6} ${base + (i % 2 ? 10 : 1)}`).join(' ')}`} fill="none" stroke={pal.accent} strokeWidth={4.2} strokeLinejoin="round" />
      )}
      {kind === 'waves' && (
        <>
          <path d={`M${geo.x0 - 2} ${base + 5} ${row.map(() => `q6.5 -7 13 0 t13 0`).slice(0, Math.ceil(row.length / 2)).join(' ')}`} fill="none" stroke={pal.accent} strokeWidth={4.2} />
          <path d={`M${geo.x0 - 2} ${base + 13} ${row.map(() => `q6.5 -7 13 0 t13 0`).slice(0, Math.ceil(row.length / 2)).join(' ')}`} fill="none" stroke={pal.trim} strokeWidth={2} opacity={0.8} />
        </>
      )}
      {kind === 'diamonds' &&
        row.map((x) => <polygon key={x} points={pts([[x, base + 6], [x + 6.5, base], [x + 13, base + 6], [x + 6.5, base + 12]])} fill={pal.accent} />)}
      {kind === 'bands' && (
        <>
          <rect x={X(0.14)} y={CY - geo.H} width={6} height={geo.H * 2} fill={pal.accent} />
          <rect x={X(0.22)} y={CY - geo.H} width={3} height={geo.H * 2} fill={pal.trim} />
          <rect x={X(0.78)} y={CY - geo.H} width={6} height={geo.H * 2} fill={pal.accent} />
          <rect x={X(0.7)} y={CY - geo.H} width={3} height={geo.H * 2} fill={pal.trim} />
        </>
      )}
      {kind === 'flames' && (
        <>
          <polygon points={pts([[geo.x0 - 2, CY + geo.H * 0.5], [X(0.5), CY + geo.H * 0.36], [geo.x0 - 2, CY + geo.H * 0.14]])} fill={pal.accent} />
          <polygon points={pts([[geo.x0 - 2, CY + geo.H * 0.4], [X(0.32), CY + geo.H * 0.34], [geo.x0 - 2, CY + geo.H * 0.24]])} fill={pal.trim} />
        </>
      )}
      {kind === 'spots' &&
        [[0.18, 0.2, 6.5], [0.34, 0.32, 4.6], [0.5, 0.18, 6], [0.66, 0.32, 4.2], [0.82, 0.2, 5]].map(([u, k, r]) => (
          <ellipse key={u} cx={X(u!)} cy={CY + geo.H * k!} rx={r!} ry={r! * 0.75} fill={pal.accent} opacity={0.9} />
        ))}
      {kind === 'plaid' && (
        <>
          <rect x={geo.x0} y={base} width={geo.L} height={7} fill={pal.accent} opacity={0.55} />
          {row.map((x) => (
            <rect key={x} x={x} y={CY - geo.H} width={4} height={geo.H * 2} fill={pal.trim} opacity={0.4} />
          ))}
        </>
      )}
      {kind === 'hearts' &&
        row.map((x, i) => {
          const cx = x + 5
          const cy = base + 3 + (i % 2) * 5
          return <path key={x} d={`M${cx} ${cy + 4.4} C${cx - 8} ${cy - 0.4} ${cx - 3.6} ${cy - 5.6} ${cx} ${cy - 1.7} C${cx + 3.6} ${cy - 5.6} ${cx + 8} ${cy - 0.4} ${cx} ${cy + 4.4} Z`} fill={i % 3 ? pal.accent : pal.trim} />
        })}
    </g>
  )
}

/** Contorno de las ventanillas que no son redondas, cuadradas ni en arco. Todas caben en el mismo hueco (radio `r`). */
function windowPath(kind: ShipConfig['windows'], x: number, y: number, r: number) {
  const poly = (list: [number, number][]) => `M${list.map(([px, py]) => `${num(px)} ${num(py)}`).join(' L')} Z`
  if (kind === 'hex') return poly(Array.from({ length: 6 }, (_, i) => [x + Math.cos((Math.PI / 3) * i) * r * 1.15, y + Math.sin((Math.PI / 3) * i) * r * 1.15]))
  if (kind === 'diamond') return poly([[x, y - r * 1.3], [x + r * 1.05, y], [x, y + r * 1.3], [x - r * 1.05, y]])
  if (kind === 'star') {
    return poly(Array.from({ length: 10 }, (_, i) => {
      const a = (Math.PI / 5) * i - Math.PI / 2
      const rad = i % 2 === 0 ? r * 1.35 : r * 0.6
      return [x + Math.cos(a) * rad, y + Math.sin(a) * rad + r * 0.08]
    }))
  }
  if (kind === 'heart') {
    return `M${num(x)} ${num(y + r * 1.0)} C${num(x - r * 1.7)} ${num(y - r * 0.1)} ${num(x - r * 0.8)} ${num(y - r * 1.3)} ${num(x)} ${num(y - r * 0.4)} C${num(x + r * 0.8)} ${num(y - r * 1.3)} ${num(x + r * 1.7)} ${num(y - r * 0.1)} ${num(x)} ${num(y + r * 1.0)} Z`
  }
  if (kind === 'slot') {
    const w = r * 0.62
    const h = r * 1.3
    return `M${num(x - w)} ${num(y - h + w)} A${num(w)} ${num(w)} 0 0 1 ${num(x + w)} ${num(y - h + w)} V${num(y + h - w)} A${num(w)} ${num(w)} 0 0 1 ${num(x - w)} ${num(y + h - w)} Z`
  }
  if (kind === 'tri') return poly([[x, y - r * 1.2], [x + r * 1.15, y + r * 0.9], [x - r * 1.15, y + r * 0.9]])
  if (kind === 'oval') {
    const rx = r * 1.35
    const ry = r * 0.85
    return `M${num(x - rx)} ${num(y)} A${num(rx)} ${num(ry)} 0 1 0 ${num(x + rx)} ${num(y)} A${num(rx)} ${num(ry)} 0 1 0 ${num(x - rx)} ${num(y)} Z`
  }
  if (kind === 'cross') {
    const a = r * 0.5
    const b = r * 1.25
    return poly([[x - a, y - b], [x + a, y - b], [x + a, y - a], [x + b, y - a], [x + b, y + a], [x + a, y + a], [x + a, y + b], [x - a, y + b], [x - a, y + a], [x - b, y + a], [x - b, y - a], [x - a, y - a]])
  }
  if (kind === 'moon') {
    return `M${num(x + r * 0.3)} ${num(y - r * 1.2)} A${num(r * 1.2)} ${num(r * 1.2)} 0 1 0 ${num(x + r * 0.3)} ${num(y + r * 1.2)} A${num(r * 0.62)} ${num(r * 1.0)} 0 1 1 ${num(x + r * 0.3)} ${num(y - r * 1.2)} Z`
  }
  return `M${num(x)} ${num(y - r * 1.35)} C${num(x + r * 0.5)} ${num(y - r * 0.5)} ${num(x + r)} ${num(y)} ${num(x + r)} ${num(y + r * 0.3)} A${num(r)} ${num(r * 0.9)} 0 0 1 ${num(x - r)} ${num(y + r * 0.3)} C${num(x - r)} ${num(y)} ${num(x - r * 0.5)} ${num(y - r * 0.5)} ${num(x)} ${num(y - r * 1.35)} Z`
}

/** Cabinas que se dibujan a media altura del casco, donde irían las ventanillas: estas acaban antes para no pisarlas. */
const MID_COCKPITS: ShipConfig['cockpit'][] = ['porthole', 'eye', 'slit']

function Windows({ geo, pal, kind, crew, names, cockpit }: Ctx & { kind: ShipConfig['windows']; crew: number; names: string[]; cockpit: ShipConfig['cockpit'] }) {
  if (crew <= 0) return null
  const { r, spots } = windowSpots(geo, Math.min(crew, MAX_CREW), MID_COCKPITS.includes(cockpit) ? 0.58 : 0.74)
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
        } else if (kind !== 'round') {
          shape = <path d={windowPath(kind, x, y, r)} fill={pal.glass} className="ship-ink ship-thin" />
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
  const topAt = (x: number) => geo.top(x)
  if (kind === 'dome') {
    const x = geo.at(0.68)
    const w = 17
    return (
      <g>
        <path d={`M${x - w} ${topAt(x - w) + 1.5} A${w} ${w * 1.05} 0 0 1 ${x + w} ${topAt(x + w) + 1.5} Z`} fill={canopy} className="ship-ink" />
        <path d={`M${x - w * 0.55} ${topAt(x - w) - 4} Q${x - w * 0.15} ${topAt(x) - w * 0.95} ${x + w * 0.25} ${topAt(x) - w * 0.9}`} stroke="#fff" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.85} />
      </g>
    )
  }
  if (kind === 'twin') {
    return (
      <g>
        {[0.6, 0.79].map((u) => {
          const x = geo.at(u)
          const w = 8.5
          return (
            <g key={u}>
              <path d={`M${x - w} ${topAt(x - w) + 1.5} A${w} ${w * 1.05} 0 0 1 ${x + w} ${topAt(x + w) + 1.5} Z`} fill={canopy} className="ship-ink" />
              <path d={`M${x - w * 0.5} ${topAt(x) - 2} Q${x - w * 0.2} ${topAt(x) - w * 0.8} ${x + w * 0.1} ${topAt(x) - w * 0.85}`} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.85} />
            </g>
          )
        })}
      </g>
    )
  }
  if (kind === 'porthole' || kind === 'eye') {
    const x = geo.at(0.72)
    const y = (geo.top(x) + geo.bot(x)) / 2 - 1
    const r = Math.min(10, geo.half(x) * 0.62)
    return (
      <g>
        <circle cx={x} cy={y} r={r + 2.4} fill={pal.accent} className="ship-ink" />
        <circle cx={x} cy={y} r={r} fill={kind === 'eye' ? '#fff' : canopy} className="ship-ink ship-thin" />
        {kind === 'eye' && <circle cx={x + r * 0.28} cy={y + r * 0.05} r={r * 0.48} fill="#1e293b" />}
        <circle cx={x - r * 0.35} cy={y - r * 0.4} r={Math.max(1.2, r * 0.24)} fill="#fff" opacity={0.9} />
      </g>
    )
  }
  if (kind === 'slit') {
    // Una ranura horizontal a media altura, como los ojos de un robot.
    const x = geo.at(0.72)
    const y = (geo.top(x) + geo.bot(x)) / 2 - 3
    return (
      <g>
        <rect x={x - 13} y={y - 3.4} width={26} height={6.8} rx={3.4} fill={canopy} className="ship-ink" />
        <path d={`M${x - 8} ${y - 0.6} H${x + 2}`} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />
      </g>
    )
  }
  if (kind === 'hood') {
    const x = geo.at(0.7)
    return (
      <g>
        <polygon points={pts([[x - 15, topAt(x - 15) + 2], [x - 9, topAt(x - 9) - 13], [x + 7, topAt(x + 7) - 13], [x + 15, topAt(x + 15) + 2]])} fill={pal.trim} className="ship-ink" />
        <polygon points={pts([[x - 9, topAt(x - 9) - 2], [x - 5, topAt(x - 5) - 10], [x + 5, topAt(x + 5) - 10], [x + 10, topAt(x + 10) - 2]])} fill={canopy} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'panorama') {
    const a = geo.at(0.56)
    let b = geo.at(0.86)
    while (b > a && geo.half(b) < 8) b -= 1
    const xs = Array.from({ length: 16 }, (_, i) => a + ((b - a) * i) / 15)
    const lower = xs.map((x) => `${num(x)} ${num(geo.top(x) + 1)}`)
    const upper = [...xs].reverse().map((x, i) => `${num(x)} ${num(geo.top(x) - 9 * Math.sin((Math.PI * (15 - i)) / 15))}`)
    return (
      <g>
        <path d={`M${lower.join(' L')} L${upper.join(' L')} Z`} fill={canopy} className="ship-ink" />
        <path d={`M${num(a + (b - a) * 0.2)} ${num(geo.top(a + (b - a) * 0.2) - 3.5)} L${num(a + (b - a) * 0.55)} ${num(geo.top(a + (b - a) * 0.55) - 5.5)}`} stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.85} fill="none" />
      </g>
    )
  }
  if (kind === 'periscope') {
    const x = geo.at(0.62)
    const y = topAt(x)
    return (
      <g>
        <polygon points={pts([[x - 3, y + 3], [x - 3, y - 20], [x + 11, y - 20], [x + 11, y - 12], [x + 3, y - 12], [x + 3, y + 3]])} fill={pal.trim} className="ship-ink" />
        <circle cx={x + 11} cy={y - 16} r={3} fill={canopy} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'tower') {
    const x = geo.at(0.66)
    return (
      <g>
        <polygon points={pts([[x - 12, topAt(x - 12) + 2], [x - 8, topAt(x - 8) - 14], [x + 8, topAt(x + 8) - 14], [x + 12, topAt(x + 12) + 2]])} fill={pal.trim} className="ship-ink" />
        <rect x={x - 5} y={topAt(x) - 11} width={10} height={6} rx={1.6} fill={canopy} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'wedge') {
    const x = geo.at(0.7)
    return (
      <g>
        <polygon points={pts([[x - 14, topAt(x - 14) + 2], [x - 7, topAt(x - 7) - 12], [x + 15, topAt(x + 15) + 2]])} fill={canopy} className="ship-ink" />
        <path d={`M${x - 7} ${topAt(x - 7) - 5} L${x + 2} ${topAt(x + 2) - 6}`} stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.85} fill="none" />
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
  if (kind === 'ball') {
    return (
      <g>
        <circle cx={x + 5} cy={CY} r={6.5} fill={pal.accent} className="ship-ink" />
        <circle cx={x + 3} cy={CY - 2.2} r={1.8} fill="#fff" opacity={0.85} />
      </g>
    )
  }
  if (kind === 'cone') {
    return <path d={`M${x - 5} ${CY - 8.5} L${x + 17} ${CY} L${x - 5} ${CY + 8.5} Z`} fill={pal.accent} className="ship-ink" />
  }
  if (kind === 'fork') {
    return (
      <g>
        <path d={`M${x - 3} ${CY - 3} Q${x + 8} ${CY - 11} ${x + 18} ${CY - 8} M${x - 3} ${CY + 3} Q${x + 8} ${CY + 11} ${x + 18} ${CY + 8}`} className="ship-ink" fill="none" />
        <circle cx={x + 18} cy={CY - 8} r={2.6} fill={pal.accent} className="ship-ink ship-thin" />
        <circle cx={x + 18} cy={CY + 8} r={2.6} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'ring') {
    const ry = geo.half(x - 9) + 4
    return (
      <g fill="none">
        <ellipse cx={x - 8} cy={CY} rx={3.4} ry={ry} className="ship-ink" style={{ strokeWidth: 6.2 }} />
        <ellipse cx={x - 8} cy={CY} rx={3.4} ry={ry} stroke={pal.accent} strokeWidth={3} />
      </g>
    )
  }
  if (kind === 'beak') {
    return <path d={`M${x - 4} ${CY - 9} Q${x + 16} ${CY - 5} ${x + 15} ${CY + 5} Q${x + 6} ${CY + 8} ${x - 4} ${CY + 8} Z`} fill={pal.accent} className="ship-ink" />
  }
  if (kind === 'lamp') {
    return (
      <g>
        <polygon points={pts([[x + 6, CY - 3], [x + 30, CY - 15], [x + 30, CY + 15], [x + 6, CY + 3]])} fill={lighten(pal.accent, 0.55)} opacity={0.5} />
        <path d={`M${x - 4} ${CY - 7} A7 7 0 0 1 ${x - 4} ${CY + 7} Z`} fill={pal.accent} className="ship-ink" />
        <circle cx={x - 4} cy={CY} r={2.4} fill="#fff" />
      </g>
    )
  }
  if (kind === 'spark') {
    return <Spark x={x + 9} y={CY} s={9} className="ship-ink" style={{ fill: pal.accent }} />
  }
  if (kind === 'bumper') {
    return <rect x={x - 5} y={CY - 8} width={10} height={16} rx={5} fill={pal.trim} className="ship-ink" />
  }
  if (kind === 'whisker') {
    return (
      <g>
        <path d={`M${x - 3} ${CY - 2} Q${x + 12} ${CY - 12} ${x + 24} ${CY - 8} M${x - 3} ${CY + 2} Q${x + 12} ${CY + 12} ${x + 24} ${CY + 8}`} className="ship-ink ship-thin" fill="none" />
        <circle cx={x + 24} cy={CY - 8} r={2.2} fill={pal.accent} className="ship-ink ship-thin" />
        <circle cx={x + 24} cy={CY + 8} r={2.2} fill={pal.accent} className="ship-ink ship-thin" />
      </g>
    )
  }
  if (kind === 'pennant') {
    const px = x - 6
    const py = geo.top(px) + 2
    return (
      <g>
        <path d={`M${px} ${py} V${py - 26}`} className="ship-ink" fill="none" />
        <polygon points={pts([[px, py - 26], [px + 16, py - 21], [px, py - 14]])} fill={pal.accent} className="ship-ink ship-thin" />
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
  /** Solo el editor: las piezas que cambian aparecen con un rebote y los colores se mezclan suavemente. */
  edit?: Anim
  /** Contorno más fino: para tamaños pequeños. */
  className?: string
  label?: string
}

/**
 * Una pieza de la nave. En el editor (`anim`) cada pieza que se monta de nuevo (porque cambió de variante) aparece
 * con un rebote, escalonado por `order`; las que no cambian no se tocan. `anim.appear` es falso en el primer
 * dibujo, para que abrir el editor no arme la nave a saltos. Fuera del editor es solo un fragmento.
 */
function Pop({ anim, order, children }: { anim?: Anim; order: number; children: ReactNode }) {
  if (!anim) return <>{children}</>
  return (
    <motion.g
      initial={anim.appear ? { opacity: 0, scale: 0.5 } : false}
      animate={{ opacity: 1, scale: 1 }}
      // La opacidad va con una transición corta (un resorte la haría oscilar); el rebote es solo de la escala.
      transition={{
        opacity: { duration: 0.18, delay: order * 0.035 },
        scale: { type: 'spring', stiffness: 420, damping: 17, delay: order * 0.035 },
      }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {children}
    </motion.g>
  )
}

/** Las piezas de la nave, sin el <svg>: para quien la dibuja dentro de otro lienzo. */
export function ShipArt({ config, crew = 0, crewNames = [], anim }: Pick<Props, 'config' | 'crew' | 'crewNames'> & { anim?: Anim }) {
  const uid = useId().replace(/:/g, '')
  const geo = hullGeo(config.hull)
  const pal = config.palette
  const clip = `${uid}-hull`
  const shade = darken(pal.hull, 0.16)
  const hull = config.hull

  return (
    <>
      <defs>
        <clipPath id={clip}>
          <path d={geo.path} />
        </clipPath>
      </defs>

      {/* La clave lleva el casco: al cambiarlo, las piezas se reposicionan y todas vuelven a aparecer. */}
      <Pop key={`engine-${hull}-${config.engine.kind}-${config.engine.count}-${config.engine.flame}`} anim={anim} order={5}>
        <Engines geo={geo} pal={pal} config={config.engine} />
      </Pop>
      <Pop key={`tail-${hull}-${config.tail}`} anim={anim} order={3}>
        <Tail geo={geo} pal={pal} kind={config.tail} />
      </Pop>
      <Pop key={`top-${hull}-${config.top}`} anim={anim} order={2}>
        <TopModule geo={geo} pal={pal} kind={config.top} />
      </Pop>
      <Pop key={`belly-${hull}-${config.belly}`} anim={anim} order={4}>
        <Belly geo={geo} pal={pal} kind={config.belly} />
      </Pop>

      <Pop key={`hull-${hull}`} anim={anim} order={0}>
        <path d={geo.path} fill={pal.hull} className="ship-ink" />
        <g clipPath={`url(#${clip})`}>
          <rect x={geo.x0} y={CY + geo.H * 0.14} width={geo.L} height={geo.H} fill={shade} opacity={0.5} />
          <path d={`M${geo.at(0.2)} ${geo.top(geo.at(0.2)) + 5} L${geo.at(0.62)} ${geo.top(geo.at(0.62)) + 5}`} stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.5} />
        </g>
        <path d={geo.path} fill="none" className="ship-ink" />
      </Pop>

      <Pop key={`decal-${hull}-${config.decal}`} anim={anim} order={1}>
        <Decals geo={geo} pal={pal} kind={config.decal} clip={clip} />
      </Pop>
      <Pop key={`cockpit-${hull}-${config.cockpit}`} anim={anim} order={2}>
        <Cockpit geo={geo} pal={pal} kind={config.cockpit} clip={clip} />
      </Pop>
      <Pop key={`windows-${hull}-${config.windows}-${config.cockpit}-${crew}`} anim={anim} order={1}>
        <Windows geo={geo} pal={pal} kind={config.windows} crew={crew} names={crewNames} cockpit={config.cockpit} />
      </Pop>
      <Pop key={`nose-${hull}-${config.nose}`} anim={anim} order={3}>
        <Nose geo={geo} pal={pal} kind={config.nose} clip={clip} />
      </Pop>
      <Pop key={`wings-${hull}-${config.wings}`} anim={anim} order={4}>
        <Wings geo={geo} pal={pal} kind={config.wings} />
      </Pop>
    </>
  )
}

function ShipRendererBase({ config, size, crew = 0, crewNames = [], animate = true, edit, className = '', label }: Props) {
  return (
    <svg
      className={`ship${animate ? ' is-live' : ''}${edit ? ' is-editing' : ''} ${className}`.trim()}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={size}
      height={size ? size * (VB_H / VB_W) : undefined}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <ShipArt config={config} crew={crew} crewNames={crewNames} anim={edit} />
    </svg>
  )
}

export const ShipRenderer = memo(ShipRendererBase)
