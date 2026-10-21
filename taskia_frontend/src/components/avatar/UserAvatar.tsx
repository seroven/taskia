import { memo } from 'react'
import type { AvatarConfig, FrameId } from '../../lib/avatar/types'
import { AvatarRenderer, type AvatarAnim } from './AvatarRenderer'

const C = 62
const ink = 'av-ink av-thin'

const ring = (r: number, width: number, stroke: string, extra: Record<string, unknown> = {}) => (
  <circle cx={C} cy={C} r={r} fill="none" stroke={stroke} strokeWidth={width} {...extra} />
)

/** Un punto sobre una circunferencia (`deg` en grados, 0 arriba). */
const onCircle = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180
  return [C + Math.cos(a) * r, C + Math.sin(a) * r]
}

const starPath = (cx: number, cy: number, r: number) =>
  `M${Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.45
    return `${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`
  }).join(' L')} Z`

/**
 * Los marcos, de menos a más elaborados (cada uno pide más nivel). Se dibujan en un lienzo de 124×124 con el avatar
 * (radio 50) en el centro: la banda del marco vive entre los radios 50 y 62, fuera del círculo del avatar.
 */
function FrameArt({ id }: { id: FrameId }) {
  if (id === 'ring') {
    return (
      <g>
        {ring(54, 7, 'var(--accent)')}
        {ring(50.5, 1.6, 'var(--text)', { className: 'av-edge' })}
        {ring(57.5, 1.6, 'var(--text)', { className: 'av-edge' })}
      </g>
    )
  }
  if (id === 'double') {
    return (
      <g>
        {ring(52.5, 4, 'var(--accent)')}
        {ring(59, 3.4, 'color-mix(in srgb, var(--accent) 45%, #ffffff)')}
        {ring(50.5, 1.4, 'var(--text)', { className: 'av-edge' })}
        {ring(54.6, 1.2, 'var(--text)', { className: 'av-edge' })}
        {ring(60.8, 1.4, 'var(--text)', { className: 'av-edge' })}
      </g>
    )
  }
  if (id === 'dots') {
    return (
      <g>
        {ring(51.5, 2.4, 'var(--accent)')}
        {Array.from({ length: 16 }, (_, i) => {
          const [x, y] = onCircle(56.5, i * 22.5)
          return <circle key={i} cx={x} cy={y} r={3.2} fill={i % 2 ? '#fbbf24' : 'var(--accent)'} className={ink} />
        })}
      </g>
    )
  }
  if (id === 'stars') {
    return (
      <g>
        {ring(54, 6, 'var(--accent)')}
        {ring(50.8, 1.4, 'var(--text)', { className: 'av-edge' })}
        {ring(57.2, 1.4, 'var(--text)', { className: 'av-edge' })}
        {[0, 90, 180, 270].map((deg) => {
          const [x, y] = onCircle(56.5, deg)
          return <path key={deg} d={starPath(x, y, 8)} fill="#fbbf24" className={ink} />
        })}
      </g>
    )
  }
  if (id === 'laurel') {
    const leaves = (side: 1 | -1) =>
      Array.from({ length: 9 }, (_, i) => {
        const deg = 200 + i * 17
        const [x, y] = onCircle(55.5, side === 1 ? deg : 360 - deg)
        const rot = (side === 1 ? deg : 360 - deg) + (side === 1 ? 20 : -20)
        return <ellipse key={`${side}${i}`} cx={x} cy={y} rx={7.4} ry={3.3} transform={`rotate(${rot} ${x} ${y})`} fill={i % 2 ? '#4ade80' : '#22c55e'} className={ink} />
      })
    return (
      <g>
        {ring(51.5, 2.2, '#15803d')}
        {leaves(1)}
        {leaves(-1)}
        <circle cx={C} cy={C + 55} r={4} fill="#fbbf24" className={ink} />
      </g>
    )
  }
  if (id === 'flame') {
    return (
      <g>
        {ring(52, 3.4, '#f97316')}
        <g className="av-flames">
          {Array.from({ length: 20 }, (_, i) => {
            const [bx1, by1] = onCircle(51.5, i * 18 - 6)
            const [bx2, by2] = onCircle(51.5, i * 18 + 6)
            const [tx, ty] = onCircle(i % 2 ? 61.5 : 59, i * 18)
            return <polygon key={i} points={`${bx1.toFixed(1)},${by1.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)} ${bx2.toFixed(1)},${by2.toFixed(1)}`} fill={i % 2 ? '#fbbf24' : '#f97316'} className={ink} />
          })}
        </g>
      </g>
    )
  }
  if (id === 'orbit') {
    return (
      <g>
        {ring(53.5, 5, 'var(--accent)')}
        {ring(50.6, 1.4, 'var(--text)', { className: 'av-edge' })}
        {ring(56.4, 1.4, 'var(--text)', { className: 'av-edge' })}
        <g className="av-orbit">
          <circle cx={C} cy={C - 56.5} r={6} fill="#fbbf24" className={ink} />
          <circle cx={C - 1.8} cy={C - 58.4} r={1.5} fill="#fff" />
        </g>
        <g className="av-orbit av-orbit--slow">
          <circle cx={C} cy={C + 56.5} r={3.6} fill="#f472b6" className={ink} />
        </g>
      </g>
    )
  }
  if (id === 'wings') {
    const wing = (s: 1 | -1) => {
      const p = (dx: number, dy: number) => `${C + s * dx} ${C + dy}`
      return `M${p(49, 10)} C${p(58, -14)} ${p(70, -30)} ${p(78, -26)} C${p(76, -14)} ${p(80, -8)} ${p(77, 2)} C${p(75, 8)} ${p(78, 14)} ${p(72, 20)} C${p(68, 24)} ${p(66, 28)} ${p(58, 30)} C${p(54, 28)} ${p(50, 22)} ${p(49, 10)} Z`
    }
    return (
      <g>
        {ring(53.4, 3.2, '#fbbf24')}
        {([1, -1] as const).map((s) => (
          <g key={s}>
            <path d={wing(s)} fill="#fff" className={ink} />
            <path d={`M${C + s * 56} ${C - 4} L${C + s * 74} ${C - 18} M${C + s * 56} ${C + 6} L${C + s * 74} ${C - 2} M${C + s * 56} ${C + 16} L${C + s * 68} ${C + 10}`} className={ink} fill="none" opacity={0.7} />
          </g>
        ))}
      </g>
    )
  }
  if (id === 'crystal') {
    return (
      <g>
        {ring(53, 5, '#38bdf8')}
        {ring(50.6, 1.4, 'var(--text)', { className: 'av-edge' })}
        {Array.from({ length: 8 }, (_, k) => {
          const a = 22.5 + k * 45
          const pts = [onCircle((58 + (k % 2) * 3) + 7, a), onCircle((58 + (k % 2) * 3), a + 4.4), onCircle((58 + (k % 2) * 3) - 6, a), onCircle((58 + (k % 2) * 3), a - 4.4)]
          return <polygon key={k} points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill={k % 2 ? '#a78bfa' : '#7dd3fc'} className={`${ink} av-twinkle`} />
        })}
      </g>
    )
  }
  if (id === 'comet') {
    const tail = (() => {
      const outer = Array.from({ length: 14 }, (_, i) => onCircle(55 + (6.6 * (13 - i)) / 13, -i * 6))
      const inner = Array.from({ length: 14 }, (_, i) => onCircle(55 - (6.6 * (13 - i)) / 13, -(13 - i) * 6))
      return [...outer, ...inner].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
    })()
    return (
      <g>
        {ring(54, 2.6, 'var(--accent)')}
        <g className="av-orbit">
          <polygon points={tail} fill="#fbbf24" className={ink} />
          <circle cx={C} cy={C - 55} r={6.4} fill="#fbbf24" className={ink} />
          <circle cx={C - 1.8} cy={C - 57} r={1.6} fill="#fff" />
        </g>
      </g>
    )
  }
  if (id === 'sun') {
    return (
      <g>
        <g className="av-spin-slow">
          {Array.from({ length: 16 }, (_, k) => {
            const a = k * 22.5
            const [x1, y1] = onCircle(51.5, a - 5)
            const [x2, y2] = onCircle(51.5, a + 5)
            const [tx, ty] = onCircle(k % 2 ? 63 : 68, a)
            return <polygon key={k} points={`${x1.toFixed(1)},${y1.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`} fill={k % 2 ? '#f97316' : '#fbbf24'} className={ink} />
          })}
        </g>
        {ring(53.5, 6, '#fbbf24')}
        {ring(50.6, 1.4, 'var(--text)', { className: 'av-edge' })}
        {ring(56.4, 1.4, 'var(--text)', { className: 'av-edge' })}
      </g>
    )
  }
  if (id === 'galaxy') {
    return (
      <g>
        {ring(54, 8, '#1e1b4b')}
        {ring(50.2, 1.4, 'var(--text)', { className: 'av-edge' })}
        {ring(57.8, 1.4, 'var(--text)', { className: 'av-edge' })}
        {Array.from({ length: 12 }, (_, k) => {
          const [x, y] = onCircle(54, k * 30 + 8)
          return <path key={k} d={starPath(x, y, k % 3 === 0 ? 3.4 : 2.2)} fill="#fff" className="av-twinkle" />
        })}
        <g className="av-orbit">
          <circle cx={C} cy={C - 61} r={6} fill="#a78bfa" className={ink} />
          <ellipse cx={C} cy={C - 61} rx={9.4} ry={2.4} fill="none" className={ink} />
        </g>
        <g className="av-orbit av-orbit--slow">
          <circle cx={C} cy={C + 61} r={4} fill="#f472b6" className={ink} />
        </g>
      </g>
    )
  }
  if (id === 'royal') {
    return (
      <g>
        {ring(54, 6.4, '#fbbf24')}
        {ring(50.6, 1.4, 'var(--text)', { className: 'av-edge' })}
        {ring(57.4, 1.4, 'var(--text)', { className: 'av-edge' })}
        {Array.from({ length: 12 }, (_, k) => {
          if (k === 0) return null
          const [x, y] = onCircle(54, k * 30)
          return <circle key={k} cx={x} cy={y} r={2.7} fill={k % 2 ? '#f43f5e' : '#3b82f6'} className={ink} />
        })}
        <polygon points={`${C - 14},${C - 54} ${C - 17},${C - 74} ${C - 7},${C - 64} ${C},${C - 78} ${C + 7},${C - 64} ${C + 17},${C - 74} ${C + 14},${C - 54}`} fill="#fbbf24" className={ink} />
        <circle cx={C} cy={C - 62} r={3} fill="#f43f5e" className={ink} />
        <circle cx={C - 10} cy={C - 60} r={2} fill="#3b82f6" className={ink} />
        <circle cx={C + 10} cy={C - 60} r={2} fill="#3b82f6" className={ink} />
      </g>
    )
  }
  if (id === 'phoenix') {
    return (
      <g>
        {ring(52, 4, '#f97316')}
        <g className="av-flames">
          {Array.from({ length: 11 }, (_, k) => {
            const a = -100 + k * 20
            const spread = 8
            const len = 20 + 12 * Math.abs(Math.sin((a * Math.PI) / 180))
            const [x1, y1] = onCircle(51, a - spread)
            const [x2, y2] = onCircle(51, a + spread)
            const [tx, ty] = onCircle(51 + len, a + (a < 0 ? -6 : a > 0 ? 6 : 0))
            return <polygon key={k} points={`${x1.toFixed(1)},${y1.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`} fill={['#ef4444', '#f97316', '#fbbf24'][k % 3]} className={ink} />
          })}
        </g>
        {ring(51, 1.4, 'var(--text)', { className: 'av-edge' })}
      </g>
    )
  }
  if (id === 'legend') {
    const colors = ['#ef4444', '#f97316', '#fbbf24', '#4ade80', '#22d3ee', '#3b82f6', '#8b5cf6', '#ec4899']
    return (
      <g>
        {Array.from({ length: 16 }, (_, k) => {
          const [x1, y1] = onCircle(54, k * 22.5)
          const [x2, y2] = onCircle(54, (k + 1) * 22.5 + 0.8)
          return <path key={k} d={`M${x1.toFixed(1)} ${y1.toFixed(1)} A54 54 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`} fill="none" stroke={colors[k % colors.length]} strokeWidth={7} />
        })}
        {ring(50.4, 1.4, 'var(--text)', { className: 'av-edge' })}
        {ring(57.6, 1.4, 'var(--text)', { className: 'av-edge' })}
        {ring(61, 2, '#fbbf24')}
        <g className="av-spin-slow">
          {[45, 135, 225, 315].map((deg) => {
            const [x, y] = onCircle(63, deg)
            return <path key={deg} d={starPath(x, y, 6.4)} fill="#fbbf24" className={ink} />
          })}
        </g>
        <polygon points={`${C - 14},${C - 54} ${C - 17},${C - 74} ${C - 7},${C - 64} ${C},${C - 78} ${C + 7},${C - 64} ${C + 17},${C - 74} ${C + 14},${C - 54}`} fill="#fbbf24" className={ink} />
        <circle cx={C} cy={C - 62} r={3.2} fill="#ec4899" className={ink} />
        <circle cx={C - 10} cy={C - 60} r={2.2} fill="#22d3ee" className={ink} />
        <circle cx={C + 10} cy={C - 60} r={2.2} fill="#8b5cf6" className={ink} />
      </g>
    )
  }
  return null
}

type Props = {
  /** `null` mientras el usuario aún no crea su avatar: se muestra su inicial. */
  avatar: AvatarConfig | null | undefined
  frame?: string | null
  /** Diámetro del avatar en px; el marco rebasa un 12 % por cada lado. */
  size?: number
  name?: string
  className?: string
  /** Solo el editor: las partes que cambian rebotan al aparecer. */
  anim?: AvatarAnim
}

function UserAvatarBase({ avatar, frame, size = 40, name = '', className = '', anim }: Props) {
  const frameId = (frame ?? 'none') as FrameId
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span className={`user-avatar${frameId !== 'none' ? ` user-avatar--${frameId}` : ''} ${className}`.trim()} style={{ width: size, height: size }} title={name || undefined}>
      <span className="user-avatar-face">
        {avatar ? <AvatarRenderer config={avatar} size={size} anim={anim} /> : <span className="user-avatar-initial" aria-hidden>{initial}</span>}
      </span>
      {frameId !== 'none' && (
        <svg className="user-avatar-frame" viewBox="0 0 124 124" focusable="false" aria-hidden>
          <FrameArt id={frameId} />
        </svg>
      )}
    </span>
  )
}

export const UserAvatar = memo(UserAvatarBase)
