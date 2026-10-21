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
