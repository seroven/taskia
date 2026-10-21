import { memo, type ReactNode } from 'react'
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

/** Dónde caen los ojos y la boca según el personaje (el gato los lleva un poco más abajo). */
const faceY = (base: AvatarConfig['base']) => ({ ey: base === 'cat' ? 49 : 46, my: base === 'cat' ? 61 : 60 })

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
  if (kind === 'smirk') return <path d={`M43.5 ${my + 1} Q52 ${my + 5} 58 ${my - 3.5}`} {...stroke} />
  if (kind === 'flat') return <path d={`M44 ${my + 1.5} H56`} {...stroke} />
  return <path d={`M43 ${my - 2} Q50 ${my + 7} 57 ${my - 2}`} {...stroke} />
}

function Extras({ base }: { base: AvatarConfig['base'] }) {
  const { ey, my } = faceY(base)
  return (
    <g>
      {base !== 'robot' && (
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
  return <path d="M27 45 C24 22 40 17 50 17 C62 17 76 23 73 45 C68 35 60 31 50 31 C40 31 32 35 27 45 Z" fill={fill} className={ink} />
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
          <Extras base={config.base} />
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
