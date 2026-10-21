import { memo, useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { darken, lighten } from '../../lib/ship/color'
import type { AvatarConfig } from '../../lib/avatar/types'

/** Trazo oscuro de las ilustraciones de la app (`--text`); los rasgos de la cara van siempre en este tono. */
const FEATURE = '#1e293b'
const ink = 'av-ink'
const thin = 'av-ink av-thin'

type Pal = AvatarConfig['palette']

const num = (value: number) => Math.round(value * 10) / 10
const pts = (list: [number, number][]) => list.map(([x, y]) => `${num(x)},${num(y)}`).join(' ')

/** La gorra de pelo corta, que varios peinados llevan debajo de lo suyo. */
const SHORT = 'M27 45 C24 22 40 17 50 17 C62 17 76 23 73 45 C68 35 60 31 50 31 C40 31 32 35 27 45 Z'

/** Dónde caen los ojos y la boca según el personaje (el gato los lleva un poco más abajo). */
const FACE: Partial<Record<AvatarConfig['base'], { ey: number; my: number }>> = {
  cat: { ey: 49, my: 61 },
  bunny: { ey: 48, my: 61 },
  panda: { ey: 47, my: 61 },
  dino: { ey: 47, my: 61 },
  monster: { ey: 47, my: 61 },
  ghost: { ey: 45, my: 59 },
}
const faceY = (base: AvatarConfig['base']) => FACE[base] ?? { ey: 46, my: 60 }

/* ---------- Detrás de la cabeza ---------- */

function HairBack({ hair, pal }: { hair: AvatarConfig['hair']; pal: Pal }) {
  if (hair === 'long') {
    return <path d="M24 44 C19 60 19 78 28 90 L72 90 C81 78 81 60 76 44 Z" fill={pal.hair} className={ink} />
  }
  if (hair === 'bob') {
    return <path d="M23 44 C20 62 24 74 31 74 L69 74 C76 74 80 62 77 44 Z" fill={pal.hair} className={ink} />
  }
  if (hair === 'pigtails') {
    return (
      <g fill={pal.hair} className={ink}>
        <path d="M27 40 C14 42 11 60 17 76 C25 72 29 56 31 46 Z" />
        <path d="M73 40 C86 42 89 60 83 76 C75 72 71 56 69 46 Z" />
      </g>
    )
  }
  if (hair === 'afro') {
    return <circle cx={50} cy={35} r={30} fill={pal.hair} className={ink} />
  }
  if (hair === 'braids') {
    return (
      <g fill={pal.hair} className={ink}>
        {[28.5, 71.5].map((x) => (
          <g key={x}>
            <ellipse cx={x} cy={54} rx={5.2} ry={6.2} />
            <ellipse cx={x - (x < 50 ? 0.6 : -0.6)} cy={65} rx={4.8} ry={5.8} />
            <ellipse cx={x - (x < 50 ? 1.2 : -1.2)} cy={76} rx={4.4} ry={5.4} />
            <circle cx={x - (x < 50 ? 1.6 : -1.6)} cy={83.5} r={2.6} fill={pal.accent} className={thin} />
          </g>
        ))}
      </g>
    )
  }
  if (hair === 'ponytail') {
    return <path d="M66 30 C90 26 96 52 84 72 C82 58 76 48 66 44 Z" fill={pal.hair} className={ink} />
  }
  if (hair === 'wavy') {
    return <path d="M24 44 C17 54 26 60 20 70 C15 79 24 84 22 92 L78 92 C76 84 85 79 80 70 C74 60 83 54 76 44 Z" fill={pal.hair} className={ink} />
  }
  if (hair === 'fringe') {
    return <path d="M23 44 C20 62 24 74 31 74 L69 74 C76 74 80 62 77 44 Z" fill={pal.hair} className={ink} />
  }
  return null
}

function BaseBack({ base, pal }: { base: AvatarConfig['base']; pal: Pal }) {
  if (base === 'human') {
    return (
      <g fill={pal.skin} className={ink}>
        <ellipse cx={28} cy={49} rx={4.2} ry={6} />
        <ellipse cx={72} cy={49} rx={4.2} ry={6} />
      </g>
    )
  }
  if (base === 'cat') {
    return (
      <g>
        <polygon points={pts([[27, 42], [28, 12], [46, 28]])} fill={pal.skin} className={ink} />
        <polygon points={pts([[73, 42], [72, 12], [54, 28]])} fill={pal.skin} className={ink} />
        <polygon points={pts([[31, 33], [32, 19], [41, 28]])} fill="#fbcfe8" />
        <polygon points={pts([[69, 33], [68, 19], [59, 28]])} fill="#fbcfe8" />
      </g>
    )
  }
  if (base === 'alien') {
    return (
      <g>
        <path d="M41 25 Q37 13 33 9 M59 25 Q63 13 67 9" fill="none" className={ink} />
        <circle cx={33} cy={9} r={3.4} fill={pal.accent} className={ink} />
        <circle cx={67} cy={9} r={3.4} fill={pal.accent} className={ink} />
      </g>
    )
  }
  if (base === 'panda') {
    return (
      <g fill="#1f2937" className={ink}>
        <circle cx={29.5} cy={29} r={8.6} />
        <circle cx={70.5} cy={29} r={8.6} />
      </g>
    )
  }
  if (base === 'bunny') {
    return (
      <g>
        <ellipse cx={39} cy={17} rx={6.8} ry={18} transform="rotate(-9 39 17)" fill={pal.skin} className={ink} />
        <ellipse cx={61} cy={17} rx={6.8} ry={18} transform="rotate(9 61 17)" fill={pal.skin} className={ink} />
        <ellipse cx={39} cy={18} rx={3} ry={12} transform="rotate(-9 39 18)" fill="#fbcfe8" />
        <ellipse cx={61} cy={18} rx={3} ry={12} transform="rotate(9 61 18)" fill="#fbcfe8" />
      </g>
    )
  }
  if (base === 'monster') {
    return (
      <g fill={pal.accent} className={ink}>
        <polygon points={pts([[30, 34], [25, 10], [42, 27]])} />
        <polygon points={pts([[70, 34], [75, 10], [58, 27]])} />
      </g>
    )
  }
  if (base === 'dino') {
    return (
      <g fill={pal.accent} className={ink}>
        <polygon points={pts([[35, 31], [39, 16], [47, 27]])} />
        <polygon points={pts([[45, 26], [50, 11], [55, 26]])} />
        <polygon points={pts([[53, 27], [61, 16], [65, 31]])} />
      </g>
    )
  }
  if (base === 'owl') {
    return (
      <g fill={pal.skin} className={ink}>
        <polygon points={pts([[28, 36], [25, 12], [43, 29]])} />
        <polygon points={pts([[72, 36], [75, 12], [57, 29]])} />
      </g>
    )
  }
  if (base === 'ghost') return null
  return (
    <g>
      <path d="M50 24 V13" className={ink} fill="none" />
      <circle cx={50} cy={11.5} r={3.8} fill={pal.accent} className={ink} />
      <rect x={20.5} y={41} width={7.5} height={14} rx={2.6} fill="#94a3b8" className={ink} />
      <rect x={72} y={41} width={7.5} height={14} rx={2.6} fill="#94a3b8" className={ink} />
    </g>
  )
}

/* ---------- Ropa y cuello ---------- */

const TORSO = 'M8 104 C8 86 26 77 50 77 C74 77 92 86 92 104 Z'

function Outfit({ outfit, pal }: { outfit: AvatarConfig['outfit']; pal: Pal }) {
  const clip = `${useId().replace(/:/g, '')}-torso`
  if (outfit === 'hoodie') {
    return (
      <g>
        <ellipse cx={50} cy={80} rx={24} ry={10} fill={darken(pal.outfit, 0.22)} className={ink} />
        <path d={TORSO} fill={pal.outfit} className={ink} />
        <path d="M40 78 Q50 88 60 78" fill={pal.skin} className={thin} />
        <path d="M44 84 L43 95 M56 84 L57 95" className={thin} fill="none" />
        <circle cx={43} cy={96} r={1.8} fill={pal.accent} className={thin} />
        <circle cx={57} cy={96} r={1.8} fill={pal.accent} className={thin} />
      </g>
    )
  }
  if (outfit === 'suit') {
    return (
      <g>
        <path d={TORSO} fill={pal.outfit} className={ink} />
        <path d="M50 84 V104" className={thin} fill="none" />
        <circle cx={68} cy={92} r={4.4} fill={pal.accent} className={thin} />
        <circle cx={32} cy={92} r={2.6} fill="#fff" className={thin} />
        <ellipse cx={50} cy={79} rx={16} ry={5.4} fill="#e2e8f0" className={ink} />
      </g>
    )
  }
  if (outfit === 'overalls') {
    return (
      <g>
        <path d={TORSO} fill={pal.accent} className={ink} />
        <path d="M35 104 L37 85 L63 85 L65 104 Z" fill={pal.outfit} className={ink} />
        <polygon points={pts([[33, 77], [40, 78], [42, 86], [35, 86]])} fill={pal.outfit} className={ink} />
        <polygon points={pts([[67, 77], [60, 78], [58, 86], [65, 86]])} fill={pal.outfit} className={ink} />
        <circle cx={38.5} cy={86} r={1.7} fill="#fbbf24" className={thin} />
        <circle cx={61.5} cy={86} r={1.7} fill="#fbbf24" className={thin} />
        <rect x={44} y={93} width={12} height={7} rx={2} fill={darken(pal.outfit, 0.18)} className={thin} />
      </g>
    )
  }
  if (outfit === 'jacket') {
    return (
      <g>
        <path d={TORSO} fill={pal.outfit} className={ink} />
        <path d="M50 78 L40 104 L60 104 Z" fill="#fff" className={thin} />
        <path d="M50 78 L36 104 M50 78 L64 104" className={ink} fill="none" />
        <polygon points={pts([[41, 77.5], [47, 80], [38, 86]])} fill={darken(pal.outfit, 0.2)} className={thin} />
        <polygon points={pts([[59, 77.5], [53, 80], [62, 86]])} fill={darken(pal.outfit, 0.2)} className={thin} />
      </g>
    )
  }
  if (outfit === 'armor') {
    return (
      <g>
        <path d={TORSO} fill="#cbd5e1" className={ink} />
        <path d="M28 104 L33 86 Q50 79 67 86 L72 104 Z" fill={pal.outfit} className={ink} />
        <circle cx={38} cy={90} r={1.9} fill={pal.accent} className={thin} />
        <circle cx={62} cy={90} r={1.9} fill={pal.accent} className={thin} />
        <ellipse cx={19} cy={88} rx={10} ry={6.4} fill={pal.outfit} className={ink} />
        <ellipse cx={81} cy={88} rx={10} ry={6.4} fill={pal.outfit} className={ink} />
      </g>
    )
  }
  if (outfit === 'poncho') {
    return (
      <g>
        <path d="M2 104 L37 78 L63 78 L98 104 Z" fill={pal.outfit} className={ink} />
        <path d="M13 97 H87 M20 90 H80" stroke={pal.accent} strokeWidth={3} strokeLinecap="round" fill="none" />
        <path d="M40 78.5 Q50 87 60 78.5" fill={pal.skin} className={thin} />
      </g>
    )
  }
  if (outfit === 'turtleneck') {
    return (
      <g>
        <path d={TORSO} fill={pal.outfit} className={ink} />
      </g>
    )
  }
  if (outfit === 'stripes') {
    return (
      <g>
        <defs>
          <clipPath id={clip}>
            <path d={TORSO} />
          </clipPath>
        </defs>
        <path d={TORSO} fill={pal.outfit} />
        <g clipPath={`url(#${clip})`}>
          <rect x={0} y={85} width={100} height={4.4} fill={pal.accent} />
          <rect x={0} y={93} width={100} height={4.4} fill={pal.accent} />
          <rect x={0} y={101} width={100} height={4.4} fill={pal.accent} />
        </g>
        <path d={TORSO} fill="none" className={ink} />
        <path d="M39 77.5 Q50 89 61 77.5" fill={pal.skin} className={thin} />
      </g>
    )
  }
  if (outfit === 'vest') {
    return (
      <g>
        <path d={TORSO} fill="#f8fafc" className={ink} />
        <path d="M44 80 L50 98 L56 80" fill={pal.skin} className={thin} />
        <polygon points={pts([[14, 104], [22, 86], [36, 79], [47, 86], [44, 104]])} fill={pal.outfit} className={ink} />
        <polygon points={pts([[86, 104], [78, 86], [64, 79], [53, 86], [56, 104]])} fill={pal.outfit} className={ink} />
        <circle cx={42} cy={94} r={1.6} fill={pal.accent} className={thin} />
        <circle cx={58} cy={94} r={1.6} fill={pal.accent} className={thin} />
      </g>
    )
  }
  if (outfit === 'dress') {
    return (
      <g>
        <path d={TORSO} fill={pal.outfit} className={ink} />
        <path d="M37 78 Q43 88 50 82 Q57 88 63 78" fill={pal.skin} className={thin} />
        <path d="M30 98 Q50 92 70 98" stroke={pal.accent} strokeWidth={3.4} strokeLinecap="round" fill="none" />
        <g fill={pal.accent} className={thin}>
          <polygon points={pts([[50, 95], [41, 90], [41, 100]])} />
          <polygon points={pts([[50, 95], [59, 90], [59, 100]])} />
        </g>
      </g>
    )
  }
  if (outfit === 'tie') {
    return (
      <g>
        <path d={TORSO} fill="#f8fafc" className={ink} />
        <polygon points={pts([[41, 77.5], [48, 82], [43, 88]])} fill="#e2e8f0" className={thin} />
        <polygon points={pts([[59, 77.5], [52, 82], [57, 88]])} fill="#e2e8f0" className={thin} />
        <polygon points={pts([[50, 82], [46.5, 87], [50, 103], [53.5, 87]])} fill={pal.accent} className={ink} />
        <rect x={47} y={80.5} width={6} height={5} rx={1.6} fill={pal.accent} className={thin} />
      </g>
    )
  }
  if (outfit === 'cape') {
    return (
      <g>
        <path d="M2 104 C2 82 20 72 50 72 C80 72 98 82 98 104 Z" fill={pal.accent} className={ink} />
        <path d={TORSO} fill={pal.outfit} className={ink} />
        <path d="M39 77.5 Q50 89 61 77.5" fill={pal.skin} className={thin} />
        <circle cx={36} cy={80} r={3.4} fill="#fbbf24" className={thin} />
        <circle cx={64} cy={80} r={3.4} fill="#fbbf24" className={thin} />
      </g>
    )
  }
  if (outfit === 'lab') {
    return (
      <g>
        <path d={TORSO} fill="#f8fafc" className={ink} />
        <polygon points={pts([[44, 79], [56, 79], [58, 104], [42, 104]])} fill={pal.outfit} className={thin} />
        <path d="M44 79 L36 104 M56 79 L64 104" className={ink} fill="none" />
        <rect x={22} y={91} width={11} height={9} rx={2} fill="#e2e8f0" className={thin} />
        <path d="M25.5 91 V87.5" stroke={pal.accent} strokeWidth={2.4} strokeLinecap="round" />
      </g>
    )
  }
  if (outfit === 'sailor') {
    return (
      <g>
        <path d={TORSO} fill="#f8fafc" className={ink} />
        <path d="M30 79 L50 98 L70 79 L77 90 L50 106 L23 90 Z" fill={pal.outfit} className={ink} />
        <path d="M33 85 L50 101 L67 85 M30 90 L50 105 L70 90" stroke="#fff" strokeWidth={1.6} fill="none" />
        <polygon points={pts([[50, 94], [44, 101], [56, 101]])} fill={pal.accent} className={thin} />
      </g>
    )
  }
  if (outfit === 'puffer') {
    return (
      <g>
        <path d={TORSO} fill={pal.outfit} className={ink} />
        <path d="M13 90 Q50 82 87 90 M10 98 Q50 90 90 98" className={thin} fill="none" opacity={0.7} />
        <path d="M50 82 V104" className={thin} fill="none" />
        <path d="M40 78 Q50 86 60 78" fill={darken(pal.outfit, 0.18)} className={thin} />
      </g>
    )
  }
  if (outfit === 'tanktop') {
    return (
      <g>
        <path d={TORSO} fill={pal.skin} className={ink} />
        <path d="M24 104 L29 90 Q35 84 39 78 L43 80 Q50 90 57 80 L61 78 Q65 84 71 90 L76 104 Z" fill={pal.outfit} className={ink} />
      </g>
    )
  }
  if (outfit === 'scarf') {
    return (
      <g>
        <path d={TORSO} fill={pal.outfit} className={ink} />
        <path d="M63 86 L70 104 L61 102 L57 90 Z" fill={pal.accent} className={ink} />
        <path d="M33 78 Q50 92 67 78 L69 87 Q50 100 31 87 Z" fill={pal.accent} className={ink} />
        <path d="M38 84 L40 91 M50 88 V96 M62 84 L60 91" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
      </g>
    )
  }
  return (
    <g>
      <path d={TORSO} fill={pal.outfit} className={ink} />
      <path d="M39 77.5 Q50 89 61 77.5" fill={pal.skin} className={thin} />
    </g>
  )
}

/* ---------- Cabeza y cara ---------- */

function Head({ base, pal }: { base: AvatarConfig['base']; pal: Pal }) {
  if (base === 'alien') {
    return <path d="M50 19 C69 19 75 36 71 52 C68 65 58 73 50 73 C42 73 32 65 29 52 C25 36 31 19 50 19 Z" fill={pal.skin} className={ink} />
  }
  if (base === 'robot') {
    return (
      <g>
        <rect x={27} y={21} width={46} height={52} rx={12} fill={pal.skin} className={ink} />
        <path d="M27 33 H73" className={thin} fill="none" opacity={0.45} />
      </g>
    )
  }
  if (base === 'cat') {
    return <ellipse cx={50} cy={50} rx={25} ry={22} fill={pal.skin} className={ink} />
  }
  if (base === 'panda') return <ellipse cx={50} cy={48} rx={24} ry={22} fill={pal.skin} className={ink} />
  if (base === 'bunny') return <ellipse cx={50} cy={50} rx={22} ry={22} fill={pal.skin} className={ink} />
  if (base === 'dino') return <ellipse cx={50} cy={49} rx={23} ry={24} fill={pal.skin} className={ink} />
  if (base === 'owl') return <ellipse cx={50} cy={48} rx={25} ry={25} fill={pal.skin} className={ink} />
  if (base === 'monster') return <rect x={26} y={24} width={48} height={48} rx={20} fill={pal.skin} className={ink} />
  if (base === 'ghost') {
    return <path d="M27 70 C27 10 73 10 73 70 Q68 77 63 70 Q58 77 53 70 Q48 77 43 70 Q38 77 33 70 Q30 77 27 70 Z" fill={pal.skin} className={ink} />
  }
  return <ellipse cx={50} cy={47} rx={22} ry={25} fill={pal.skin} className={ink} />
}

const starPoints = (cx: number, cy: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rad = i % 2 === 0 ? r : r * 0.45
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] as [number, number]
  })

function Eyes({ kind, base, pal }: { kind: AvatarConfig['eyes']; base: AvatarConfig['base']; pal: Pal }) {
  const { ey } = faceY(base)
  const arc = (x: number, up: boolean) => `M${x - 4.2} ${ey + (up ? 1.6 : -1.2)} Q${x} ${ey + (up ? -5.2 : 5)} ${x + 4.2} ${ey + (up ? 1.6 : -1.2)}`
  const stroke = { stroke: FEATURE, strokeWidth: 2.6, strokeLinecap: 'round' as const, fill: 'none' }
  if (kind === 'cyclops') {
    return (
      <g>
        <circle cx={50} cy={ey - 1} r={9} fill="#fff" className={thin} />
        <circle cx={51} cy={ey - 1} r={4.6} fill={FEATURE} />
        <circle cx={49} cy={ey - 3.4} r={1.6} fill="#fff" />
      </g>
    )
  }
  if (kind === 'led') {
    return (
      <g>
        <rect x={32} y={ey - 5} width={36} height={10} rx={5} fill="#0f172a" className={thin} />
        <rect x={37} y={ey - 2.2} width={9} height={4.4} rx={2.2} fill={pal.accent} />
        <rect x={54} y={ey - 2.2} width={9} height={4.4} rx={2.2} fill={pal.accent} />
      </g>
    )
  }
  return (
    <g>
      {[41, 59].map((x, i) => {
        if (kind === 'dots') return <circle key={x} cx={x} cy={ey} r={2.7} fill={FEATURE} />
        if (kind === 'round') {
          return (
            <g key={x}>
              <circle cx={x} cy={ey} r={5} fill="#fff" className={thin} />
              <circle cx={x + 0.6} cy={ey} r={2.4} fill={FEATURE} />
            </g>
          )
        }
        if (kind === 'happy') return <path key={x} d={arc(x, true)} {...stroke} />
        if (kind === 'sleepy') return <path key={x} d={arc(x, false)} {...stroke} />
        if (kind === 'wink') return i === 0 ? <circle key={x} cx={x} cy={ey} r={2.7} fill={FEATURE} /> : <path key={x} d={arc(x, true)} {...stroke} />
        if (kind === 'star') return <polygon key={x} points={pts(starPoints(x, ey, 5.6))} fill={pal.accent} className={thin} />
        if (kind === 'heart') {
          return <path key={x} d={`M${x} ${ey + 4.6} C${x - 8.6} ${ey - 0.6} ${x - 4.2} ${ey - 6.6} ${x} ${ey - 2.2} C${x + 4.2} ${ey - 6.6} ${x + 8.6} ${ey - 0.6} ${x} ${ey + 4.6} Z`} fill="#f43f5e" className={thin} />
        }
        if (kind === 'angry') {
          const dir = i === 0 ? 1 : -1
          return (
            <g key={x}>
              <circle cx={x} cy={ey + 0.6} r={2.7} fill={FEATURE} />
              <path d={`M${x - 5.6 * dir} ${ey - 6.2} L${x + 4.6 * dir} ${ey - 3}`} {...stroke} />
            </g>
          )
        }
        if (kind === 'wide') {
          return (
            <g key={x}>
              <circle cx={x} cy={ey} r={6.8} fill="#fff" className={thin} />
              <circle cx={x} cy={ey} r={1.9} fill={FEATURE} />
            </g>
          )
        }
        if (kind === 'lashes') {
          const dir = i === 0 ? -1 : 1
          return (
            <g key={x}>
              <circle cx={x} cy={ey} r={4.8} fill="#fff" className={thin} />
              <circle cx={x + 0.5} cy={ey} r={2.4} fill={FEATURE} />
              <path d={`M${x + 3.6 * dir} ${ey - 3} L${x + 7.4 * dir} ${ey - 5.4} M${x + 1.6 * dir} ${ey - 4.6} L${x + 3.4 * dir} ${ey - 8.4} M${x + 4.6 * dir} ${ey - 0.6} L${x + 8.6 * dir} ${ey - 1.4}`} stroke={FEATURE} strokeWidth={1.6} strokeLinecap="round" />
            </g>
          )
        }
        if (kind === 'tired') {
          return (
            <g key={x}>
              <circle cx={x} cy={ey} r={5} fill="#fff" className={thin} />
              <circle cx={x + 0.4} cy={ey + 1.2} r={2.4} fill={FEATURE} />
              <path d={`M${x - 5} ${ey - 0.6} A5 5 0 0 1 ${x + 5} ${ey - 0.6} Z`} fill={darken(pal.skin, 0.1)} className={thin} />
            </g>
          )
        }
        if (kind === 'spiral') {
          const d = Array.from({ length: 26 }, (_, k) => {
            const a = k * 0.62
            const r = 0.7 + k * 0.17
            return `${k === 0 ? 'M' : 'L'}${num(x + Math.cos(a) * r)} ${num(ey + Math.sin(a) * r)}`
          }).join(' ')
          return <path key={x} d={d} stroke={FEATURE} strokeWidth={1.5} strokeLinecap="round" fill="none" />
        }
        if (kind === 'cross') {
          return <path key={x} d={`M${x - 3.8} ${ey - 3.8} L${x + 3.8} ${ey + 3.8} M${x + 3.8} ${ey - 3.8} L${x - 3.8} ${ey + 3.8}`} {...stroke} />
        }
        if (kind === 'shiny') {
          return (
            <g key={x}>
              <ellipse cx={x} cy={ey} rx={5} ry={6.6} fill={FEATURE} />
              <circle cx={x - 1.6} cy={ey - 2.6} r={1.9} fill="#fff" />
              <circle cx={x + 1.8} cy={ey + 2.2} r={1} fill="#fff" />
            </g>
          )
        }
        if (kind === 'sad') {
          const dir = i === 0 ? -1 : 1
          return (
            <g key={x}>
              <circle cx={x} cy={ey + 0.6} r={2.7} fill={FEATURE} />
              <path d={`M${x + 5 * dir} ${ey - 5.4} L${x - 4.6 * dir} ${ey - 7.6}`} {...stroke} />
              {i === 0 && <path d={`M${x - 3.6} ${ey + 5} Q${x - 6.2} ${ey + 9.4} ${x - 3.6} ${ey + 11} Q${x - 1} ${ey + 9.4} ${x - 3.6} ${ey + 5} Z`} fill="#7dd3fc" className={thin} />}
            </g>
          )
        }
        return (
          <g key={x}>
            <circle cx={x} cy={ey} r={6.4} fill="#fff" className={thin} />
            <circle cx={x + 0.8} cy={ey + 0.4} r={3.6} fill={FEATURE} />
            <circle cx={x - 0.6} cy={ey - 1.4} r={1.3} fill="#fff" />
          </g>
        )
      })}
    </g>
  )
}

function Mouth({ kind, base }: { kind: AvatarConfig['mouth']; base: AvatarConfig['base'] }) {
  const { my } = faceY(base)
  const stroke = { stroke: FEATURE, strokeWidth: 2.6, strokeLinecap: 'round' as const, fill: 'none' }
  if (kind === 'grin') {
    return (
      <g>
        <path d={`M41.5 ${my - 3} Q50 ${my + 12} 58.5 ${my - 3} Z`} fill="#fff" className={thin} />
        <path d={`M44 ${my + 2} H56`} stroke={FEATURE} strokeWidth={1.2} />
      </g>
    )
  }
  if (kind === 'open') {
    return (
      <g>
        <ellipse cx={50} cy={my + 2} rx={4.6} ry={5.4} fill="#7f1d1d" className={thin} />
        <ellipse cx={50} cy={my + 5} rx={2.6} ry={1.8} fill="#fb7185" />
      </g>
    )
  }
  if (kind === 'tongue') {
    return (
      <g>
        <path d={`M45.5 ${my + 3} Q45.5 ${my + 10.5} 50.5 ${my + 10.5} Q55.5 ${my + 10.5} 55.5 ${my + 3} Z`} fill="#fb7185" className={thin} />
        <path d={`M43 ${my - 2} Q50 ${my + 7} 57 ${my - 2}`} {...stroke} />
      </g>
    )
  }
  if (kind === 'laugh') {
    return (
      <g>
        <path d={`M39.5 ${my - 4.4} Q50 ${my - 2} 60.5 ${my - 4.4} C60.5 ${my + 11} 39.5 ${my + 11} 39.5 ${my - 4.4} Z`} fill="#7f1d1d" className={thin} />
        <path d={`M41 ${my - 3.8} Q50 ${my - 1.6} 59 ${my - 3.8} L59 ${my - 0.8} Q50 ${my + 1.4} 41 ${my - 0.8} Z`} fill="#fff" />
        <ellipse cx={50} cy={my + 6.6} rx={5.6} ry={3.2} fill="#fb7185" />
      </g>
    )
  }
  if (kind === 'frown') return <path d={`M43 ${my + 4.4} Q50 ${my - 4.4} 57 ${my + 4.4}`} {...stroke} />
  if (kind === 'kiss') {
    return (
      <g>
        <circle cx={50} cy={my + 1.6} r={3.6} fill="#fb7185" className={thin} />
        <circle cx={48.9} cy={my + 0.6} r={0.9} fill="#fff" opacity={0.9} />
      </g>
    )
  }
  if (kind === 'fangs') {
    return (
      <g>
        <path d={`M43 ${my - 2} Q50 ${my + 7} 57 ${my - 2}`} {...stroke} />
        <polygon points={pts([[44.6, my + 1.2], [48, my + 2.6], [46.2, my + 6.8]])} fill="#fff" className={thin} />
        <polygon points={pts([[55.4, my + 1.2], [52, my + 2.6], [53.8, my + 6.8]])} fill="#fff" className={thin} />
      </g>
    )
  }
  if (kind === 'wavy') return <path d={`M41.5 ${my + 1.4} q2.4 -3.4 4.8 0 t4.8 0 t4.8 0 t4.8 0`} {...stroke} />
  if (kind === 'buck') {
    return (
      <g>
        <path d={`M43 ${my - 2} Q50 ${my + 7} 57 ${my - 2}`} {...stroke} />
        <rect x={47} y={my + 2.4} width={6} height={6.6} rx={1.4} fill="#fff" className={thin} />
      </g>
    )
  }
  if (kind === 'cat') return <path d={`M50 ${my - 2} V${my + 1.4} M50 ${my + 1.4} Q45.8 ${my + 6.4} 41.6 ${my + 1.6} M50 ${my + 1.4} Q54.2 ${my + 6.4} 58.4 ${my + 1.6}`} {...stroke} />
  if (kind === 'oh') return <ellipse cx={50} cy={my + 2.6} rx={2.8} ry={3.6} fill="#7f1d1d" className={thin} />
  if (kind === 'braces') {
    return (
      <g>
        <path d={`M41.5 ${my - 3} Q50 ${my + 11} 58.5 ${my - 3} Z`} fill="#fff" className={thin} />
        <path d={`M43.2 ${my + 0.6} Q50 ${my + 4.6} 56.8 ${my + 0.6}`} stroke="#94a3b8" strokeWidth={2.2} strokeLinecap="round" fill="none" />
        <path d={`M45.6 ${my - 0.6} V${my + 2.6} M50 ${my - 0.4} V${my + 3.8} M54.4 ${my - 0.6} V${my + 2.6}`} stroke="#94a3b8" strokeWidth={1.2} />
      </g>
    )
  }
  if (kind === 'teasing') {
    return (
      <g>
        <path d={`M54 ${my + 1.4} Q56.4 ${my + 9.4} 59.8 ${my + 5.8} Q60.8 ${my + 1.4} 57.2 ${my - 0.4} Z`} fill="#fb7185" className={thin} />
        <path d={`M43.5 ${my} Q51 ${my + 5} 58 ${my - 3.5}`} {...stroke} />
      </g>
    )
  }
  if (kind === 'smirk') return <path d={`M43.5 ${my + 1} Q52 ${my + 5} 58 ${my - 3.5}`} {...stroke} />
  if (kind === 'flat') return <path d={`M44 ${my + 1.5} H56`} {...stroke} />
  return <path d={`M43 ${my - 2} Q50 ${my + 7} 57 ${my - 2}`} {...stroke} />
}

function Extras({ base, pal }: { base: AvatarConfig['base']; pal: Pal }) {
  const { ey, my } = faceY(base)
  return (
    <g>
      {base !== 'robot' && base !== 'owl' && (
        <g fill="#fb7185" opacity={0.32}>
          <circle cx={34.5} cy={my - 4} r={3.6} />
          <circle cx={65.5} cy={my - 4} r={3.6} />
        </g>
      )}
      {base === 'cat' && (
        <g>
          <polygon points={pts([[47, ey + 6], [53, ey + 6], [50, ey + 10]])} fill="#f472b6" className={thin} />
          <path d={`M30 ${ey + 8} L20 ${ey + 5} M30 ${ey + 11} L20 ${ey + 12} M70 ${ey + 8} L80 ${ey + 5} M70 ${ey + 11} L80 ${ey + 12}`} className={thin} fill="none" />
        </g>
      )}
      {base === 'panda' && (
        <g>
          <ellipse cx={40.5} cy={ey + 1} rx={6.8} ry={8.6} transform={`rotate(20 40.5 ${ey + 1})`} fill="#475569" className={thin} />
          <ellipse cx={59.5} cy={ey + 1} rx={6.8} ry={8.6} transform={`rotate(-20 59.5 ${ey + 1})`} fill="#475569" className={thin} />
          <ellipse cx={50} cy={ey + 9} rx={3.8} ry={2.7} fill="#1f2937" />
        </g>
      )}
      {base === 'bunny' && (
        <g>
          <polygon points={pts([[47, ey + 6], [53, ey + 6], [50, ey + 10]])} fill="#f472b6" className={thin} />
          <path d={`M31 ${ey + 8} L22 ${ey + 5} M31 ${ey + 11} L22 ${ey + 12} M69 ${ey + 8} L78 ${ey + 5} M69 ${ey + 11} L78 ${ey + 12}`} className={thin} fill="none" />
        </g>
      )}
      {base === 'monster' && (
        <g fill={darken(pal.skin, 0.2)} opacity={0.7}>
          <circle cx={36} cy={31} r={2.6} />
          <circle cx={63} cy={33} r={3.2} />
          <circle cx={58} cy={67} r={2.2} />
          <circle cx={39} cy={66} r={2.6} />
        </g>
      )}
      {base === 'dino' && (
        <g fill="#1f2937">
          <circle cx={46} cy={ey + 6} r={1.4} />
          <circle cx={54} cy={ey + 6} r={1.4} />
        </g>
      )}
      {base === 'owl' && (
        <g>
          <circle cx={40.5} cy={ey} r={9.8} fill="#fff" className={ink} />
          <circle cx={59.5} cy={ey} r={9.8} fill="#fff" className={ink} />
          <polygon points={pts([[46.6, ey + 5], [53.4, ey + 5], [50, ey + 11]])} fill={pal.accent} className={ink} />
        </g>
      )}
    </g>
  )
}

/* ---------- Pelo de delante ---------- */

function HairFront({ hair, pal }: { hair: AvatarConfig['hair']; pal: Pal }) {
  const fill = pal.hair
  if (hair === 'none') return null
  if (hair === 'spiky') {
    return <path d="M26 44 L24 28 L32 32 L34 16 L42 26 L50 12 L58 26 L66 16 L68 32 L76 28 L74 44 C68 35 60 31 50 31 C40 31 32 35 26 44 Z" fill={fill} className={ink} />
  }
  if (hair === 'curly') {
    return (
      <g fill={fill} className={ink}>
        <circle cx={28} cy={37} r={10.5} />
        <circle cx={72} cy={37} r={10.5} />
        <circle cx={36} cy={24} r={10.5} />
        <circle cx={64} cy={24} r={10.5} />
        <circle cx={50} cy={19} r={11.5} />
      </g>
    )
  }
  if (hair === 'bun') {
    return (
      <g>
        <circle cx={50} cy={13} r={8.5} fill={fill} className={ink} />
        <path d="M27 45 C24 22 40 17 50 17 C62 17 76 23 73 45 C68 35 60 31 50 31 C40 31 32 35 27 45 Z" fill={fill} className={ink} />
      </g>
    )
  }
  if (hair === 'mohawk') {
    return <path d="M41 31 L39 11 L45.5 19 L50 4 L54.5 19 L61 11 L59 31 Z" fill={fill} className={ink} />
  }
  if (hair === 'bob') {
    return <path d="M24 47 C21 20 40 15 50 15 C62 15 79 21 76 47 C71 36 62 28 50 28 C38 28 29 36 24 47 Z" fill={fill} className={ink} />
  }
  if (hair === 'pigtails') {
    return (
      <g>
        <path d="M27 45 C24 22 40 17 50 17 C62 17 76 23 73 45 C68 35 60 31 50 31 C40 31 32 35 27 45 Z" fill={fill} className={ink} />
        <circle cx={27.5} cy={41} r={3.2} fill={pal.accent} className={thin} />
        <circle cx={72.5} cy={41} r={3.2} fill={pal.accent} className={thin} />
      </g>
    )
  }
  if (hair === 'afro') return null
  if (hair === 'braids' || hair === 'wavy') return <path d={SHORT} fill={fill} className={ink} />
  if (hair === 'ponytail') {
    return (
      <g>
        <path d={SHORT} fill={fill} className={ink} />
        <circle cx={71} cy={35} r={3.2} fill={pal.accent} className={thin} />
      </g>
    )
  }
  if (hair === 'buns') {
    return (
      <g>
        <circle cx={31} cy={20} r={8} fill={fill} className={ink} />
        <circle cx={69} cy={20} r={8} fill={fill} className={ink} />
        <path d={SHORT} fill={fill} className={ink} />
      </g>
    )
  }
  if (hair === 'fringe') {
    return <path d="M24 46 C21 20 40 15 50 15 C62 15 79 20 76 46 L71 46 L71 34 H29 L29 46 Z" fill={fill} className={ink} />
  }
  if (hair === 'parted') {
    return <path d="M27 46 C24 22 42 16 52 17 C64 18 76 26 73 46 C69 37 62 32 54 30 C46 36 36 38 28 42 Z" fill={fill} className={ink} />
  }
  if (hair === 'buzz') {
    return <path d="M28 40 C27 24 40 19 50 19 C60 19 73 24 72 40 C66 30 58 27 50 27 C42 27 34 30 28 40 Z" fill={fill} opacity={0.9} className={thin} />
  }
  if (hair === 'tuft') {
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M50 24 C45 14 56 6 59 13 C61 18 54 19 54 15" className={ink} style={{ strokeWidth: 7 }} />
        <path d="M50 24 C45 14 56 6 59 13 C61 18 54 19 54 15" stroke={fill} strokeWidth={3.2} />
      </g>
    )
  }
  if (hair === 'bowl') {
    return <path d="M25 49 C22 20 40 15 50 15 C62 15 78 20 75 49 L68 49 C68 37 62 34 50 34 C38 34 32 37 32 49 Z" fill={fill} className={ink} />
  }
  return <path d={SHORT} fill={fill} className={ink} />
}

/* ---------- Accesorios ---------- */

function Accessory({ kind, base, pal }: { kind: AvatarConfig['accessory']; base: AvatarConfig['base']; pal: Pal }) {
  const { ey } = faceY(base)
  if (kind === 'none') return null
  if (kind === 'glasses') {
    return (
      <g fill="#fff" fillOpacity={0.3} className={ink}>
        <circle cx={41} cy={ey} r={8} />
        <circle cx={59} cy={ey} r={8} />
        <path d={`M49 ${ey} H51`} fill="none" />
      </g>
    )
  }
  if (kind === 'shades') {
    return (
      <g>
        <rect x={32.5} y={ey - 5.5} width={16} height={11} rx={4} fill="#1f2937" className={ink} />
        <rect x={51.5} y={ey - 5.5} width={16} height={11} rx={4} fill="#1f2937" className={ink} />
        <path d={`M48.5 ${ey - 1} H51.5 M32.5 ${ey - 1} L27 ${ey - 3} M67.5 ${ey - 1} L73 ${ey - 3}`} className={ink} fill="none" />
        <path d={`M36 ${ey - 2} L40 ${ey - 2} M55 ${ey - 2} L59 ${ey - 2}`} stroke="#fff" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
      </g>
    )
  }
  if (kind === 'headphones') {
    return (
      <g>
        <path d="M24.5 50 C21 12 79 12 75.5 50" fill="none" className={ink} style={{ strokeWidth: 6.4 }} />
        <path d="M24.5 50 C21 12 79 12 75.5 50" fill="none" stroke={pal.accent} strokeWidth={3} strokeLinecap="round" />
        <ellipse cx={24.5} cy={52} rx={5.4} ry={8.4} fill={pal.accent} className={ink} />
        <ellipse cx={75.5} cy={52} rx={5.4} ry={8.4} fill={pal.accent} className={ink} />
      </g>
    )
  }
  if (kind === 'antennas') {
    return (
      <g>
        <path d="M28 38 C34 24 66 24 72 38" fill="none" className={ink} style={{ strokeWidth: 5.6 }} />
        <path d="M28 38 C34 24 66 24 72 38" fill="none" stroke={pal.accent} strokeWidth={2.6} strokeLinecap="round" />
        <path d="M39 27 Q35 14 29 9 M61 27 Q65 14 71 9" fill="none" className={ink} />
        <circle cx={29} cy={9} r={3.4} fill={pal.accent} className={ink} />
        <circle cx={71} cy={9} r={3.4} fill={pal.accent} className={ink} />
      </g>
    )
  }
  if (kind === 'cap') {
    return (
      <g>
        <path d="M26 39 C26 14 74 14 74 39 Z" fill={pal.accent} className={ink} />
        <path d="M22 39 H78 C78 44 72 44 68 44 H32 C27 44 22 44 22 39 Z" fill={darken(pal.accent, 0.2)} className={ink} />
        <circle cx={50} cy={17} r={2.2} fill="#fff" className={thin} />
      </g>
    )
  }
  if (kind === 'bow') {
    return (
      <g fill={pal.accent} className={ink}>
        <polygon points={pts([[67, 24], [80, 15], [80, 33]])} />
        <polygon points={pts([[67, 24], [54, 15], [54, 33]])} />
        <circle cx={67} cy={24} r={3.8} fill={lighten(pal.accent, 0.35)} />
      </g>
    )
  }
  if (kind === 'monocle') {
    return (
      <g>
        <circle cx={59} cy={ey} r={8.6} fill="#fff" fillOpacity={0.3} className={ink} />
        <path d={`M65.5 ${ey + 6} Q74 ${ey + 14} 70 ${ey + 28}`} className={thin} fill="none" />
        <circle cx={70} cy={ey + 28.6} r={1.8} fill="#fbbf24" className={thin} />
      </g>
    )
  }
  if (kind === 'beanie') {
    return (
      <g>
        <path d="M26 38 C26 10 74 10 74 38 Z" fill={pal.accent} className={ink} />
        <path d="M33 22 V37 M42 17 V37 M50 15 V37 M58 17 V37 M67 22 V37" className={thin} fill="none" opacity={0.55} />
        <rect x={23.5} y={34} width={53} height={10} rx={4.5} fill={darken(pal.accent, 0.18)} className={ink} />
        <circle cx={50} cy={11} r={5.4} fill={lighten(pal.accent, 0.35)} className={ink} />
      </g>
    )
  }
  if (kind === 'tophat') {
    return (
      <g>
        <rect x={34} y={0} width={32} height={26} rx={3} fill="#1f2937" className={ink} />
        <rect x={34} y={19} width={32} height={6} fill={pal.accent} className={thin} />
        <ellipse cx={50} cy={27} rx={29} ry={5.4} fill="#1f2937" className={ink} />
      </g>
    )
  }
  if (kind === 'patch') {
    return (
      <g>
        <path d={`M34 ${ey - 3} L27 36 M48 ${ey - 5} L73 33`} className={ink} fill="none" />
        <ellipse cx={41} cy={ey} rx={7.6} ry={6.6} fill="#1f2937" className={ink} />
      </g>
    )
  }
  if (kind === 'helmet') {
    return (
      <g>
        <circle cx={50} cy={47} r={34} fill="#bae6fd" fillOpacity={0.2} className={ink} />
        <path d="M30 28 Q36 18 48 16" stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.85} />
        <ellipse cx={50} cy={79} rx={25} ry={6.4} fill="#e2e8f0" className={ink} />
        <circle cx={32} cy={79} r={1.8} fill={pal.accent} className={thin} />
        <circle cx={68} cy={79} r={1.8} fill={pal.accent} className={thin} />
      </g>
    )
  }
  if (kind === 'bandana') {
    return (
      <g>
        <path d="M26 40 C29 22 71 22 74 40 L74 46 C61 38 39 38 26 46 Z" fill={pal.accent} className={ink} />
        <circle cx={38} cy={37} r={1.5} fill="#fff" opacity={0.9} />
        <circle cx={50} cy={34} r={1.5} fill="#fff" opacity={0.9} />
        <circle cx={62} cy={37} r={1.5} fill="#fff" opacity={0.9} />
        <polygon points={pts([[74, 42], [84, 36], [82, 50]])} fill={pal.accent} className={ink} />
      </g>
    )
  }
  if (kind === 'flower') {
    return (
      <g>
        {[0, 72, 144, 216, 288].map((deg) => {
          const a = ((deg - 90) * Math.PI) / 180
          return <circle key={deg} cx={68 + Math.cos(a) * 5.6} cy={27 + Math.sin(a) * 5.6} r={4.6} fill={pal.accent} className={thin} />
        })}
        <circle cx={68} cy={27} r={3.4} fill="#fbbf24" className={thin} />
      </g>
    )
  }
  if (kind === 'mask') {
    const hole = (x: number) => `M${x - 5} ${ey} a5 4.2 0 1 0 10 0 a5 4.2 0 1 0 -10 0 Z`
    return (
      <path
        d={`M29 ${ey - 5} Q50 ${ey - 13} 71 ${ey - 5} L72 ${ey + 5} Q50 ${ey + 1} 28 ${ey + 5} Z ${hole(41)} ${hole(59)}`}
        fill={pal.accent}
        fillRule="evenodd"
        className={ink}
      />
    )
  }
  if (kind === 'halo') {
    return (
      <g fill="none">
        <ellipse cx={50} cy={11} rx={17} ry={5} className={ink} style={{ strokeWidth: 7.4 }} />
        <ellipse cx={50} cy={11} rx={17} ry={5} stroke="#fbbf24" strokeWidth={3.6} />
      </g>
    )
  }
  if (kind === 'mustache') {
    return (
      <path
        d={`M50 ${ey + 11} C44 ${ey + 7} 35 ${ey + 9} 36 ${ey + 14.5} C42 ${ey + 13} 46 ${ey + 13} 50 ${ey + 14} C54 ${ey + 13} 58 ${ey + 13} 64 ${ey + 14.5} C65 ${ey + 9} 56 ${ey + 7} 50 ${ey + 11} Z`}
        fill={pal.hair}
        className={ink}
      />
    )
  }
  return (
    <g>
      <polygon points={pts([[29, 30], [33, 10], [42, 21], [50, 7], [58, 21], [67, 10], [71, 30]])} fill="#fbbf24" className={ink} />
      <circle cx={50} cy={20} r={2.6} fill={pal.accent} className={thin} />
      <circle cx={37} cy={25} r={1.8} fill={pal.accent} className={thin} />
      <circle cx={63} cy={25} r={1.8} fill={pal.accent} className={thin} />
    </g>
  )
}

/* ---------- El avatar ---------- */

/** Modo editor: las partes que cambian aparecen con rebote (`appear` es falso hasta el primer cambio). */
export type AvatarAnim = { appear: boolean }

/**
 * Una parte del avatar. En el editor (`anim`) cada parte que se monta de nuevo (porque cambió de variante, y por eso su
 * clave lleva la variante) aparece con un rebote; las que no cambian no se tocan. Fuera del editor es un fragmento.
 */
function Pop({ anim, order, children }: { anim?: AvatarAnim; order: number; children: ReactNode }) {
  if (!anim) return <>{children}</>
  return (
    <motion.g
      initial={anim.appear ? { opacity: 0, scale: 0.55 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        opacity: { duration: 0.16, delay: order * 0.03 },
        scale: { type: 'spring', stiffness: 440, damping: 15, delay: order * 0.03 },
      }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {children}
    </motion.g>
  )
}

/** Las piezas del avatar sobre un lienzo de 100×100, sin el `<svg>`: para quien lo dibuja dentro de otro lienzo. */
export function AvatarArt({ config, anim }: { config: AvatarConfig; anim?: AvatarAnim }): ReactNode {
  const pal = config.palette
  const neck = config.base === 'robot' ? '#94a3b8' : pal.skin
  return (
    <>
      <rect width={100} height={100} fill={pal.bg} />
      {/* La composición se acerca a la cara: en un círculo pequeño es lo que se reconoce. */}
      <g transform="translate(50 57) scale(1.12) translate(-50 -56)">
        <Pop key={`hairb-${config.hair}`} anim={anim} order={2}>
          <HairBack hair={config.hair} pal={pal} />
        </Pop>
        <Pop key={`outfit-${config.outfit}`} anim={anim} order={1}>
          <Outfit outfit={config.outfit} pal={pal} />
        </Pop>
        <rect x={43} y={64} width={14} height={18} rx={4.5} fill={neck} className={ink} />
        <rect x={43.5} y={64.5} width={13} height={7} fill={darken(neck, 0.14)} />
        {config.outfit === 'turtleneck' && <rect x={38} y={71} width={24} height={13} rx={5.5} fill={darken(pal.outfit, 0.12)} className={ink} />}
        <Pop key={`base-${config.base}`} anim={anim} order={0}>
          <BaseBack base={config.base} pal={pal} />
          <Head base={config.base} pal={pal} />
          <Extras base={config.base} pal={pal} />
        </Pop>
        <Pop key={`eyes-${config.base}-${config.eyes}`} anim={anim} order={1}>
          <Eyes kind={config.eyes} base={config.base} pal={pal} />
        </Pop>
        <Pop key={`mouth-${config.base}-${config.mouth}`} anim={anim} order={2}>
          <Mouth kind={config.mouth} base={config.base} />
        </Pop>
        <Pop key={`hairf-${config.hair}`} anim={anim} order={3}>
          <HairFront hair={config.hair} pal={pal} />
        </Pop>
        <Pop key={`acc-${config.accessory}`} anim={anim} order={4}>
          <Accessory kind={config.accessory} base={config.base} pal={pal} />
        </Pop>
      </g>
    </>
  )
}

type Props = { config: AvatarConfig; size?: number; className?: string; label?: string; anim?: AvatarAnim }

function AvatarRendererBase({ config, size, className = '', label, anim }: Props) {
  return (
    <svg
      className={`avatar-art${anim ? ' is-editing' : ''} ${className}`.trim()}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <AvatarArt config={config} anim={anim} />
    </svg>
  )
}

export const AvatarRenderer = memo(AvatarRendererBase)
