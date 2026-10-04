import { useId, useMemo } from 'react'
import { planetDraw, type PlanetConfig, type PlanetDraw } from '../../lib/planet/engine'

type Props = {
  config: PlanetConfig
  size?: number
  hot?: boolean
  showRings?: boolean
  animate?: boolean
}

function Marks({ draw }: { draw: PlanetDraw }) {
  const { pattern } = draw.config.surface
  return (
    <g>
      {draw.marks.map((mark, index) =>
        pattern === 'craters' ? (
          <circle
            key={index}
            cx={mark.cx}
            cy={mark.cy}
            r={mark.rx * 0.7}
            fill="none"
            stroke={mark.fill}
            strokeWidth={1.6}
          />
        ) : (
          <ellipse
            key={index}
            cx={mark.cx}
            cy={mark.cy}
            rx={mark.rx}
            ry={mark.ry}
            fill={mark.fill}
            opacity={0.9}
            transform={`rotate(${mark.rotate} ${mark.cx} ${mark.cy})`}
          />
        ),
      )}
    </g>
  )
}

function Face({ draw, hot }: { draw: PlanetDraw; hot: boolean }) {
  const ink = draw.eyeInk
  const smile = hot || draw.config.face.mouth === 'smile'
  return (
    <g>
      {draw.config.face.cheeks && (
        <>
          <circle cx="40" cy="56" r="3.2" fill={draw.config.face.cheekColor} opacity="0.85" />
          <circle cx="60" cy="56" r="3.2" fill={draw.config.face.cheekColor} opacity="0.85" />
        </>
      )}
      {draw.config.face.eyes === 'sleepy' ? (
        <>
          <path d="M42 46 q4 -3 8 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M50 46 q4 -3 8 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : draw.config.face.eyes === 'happy-arc' ? (
        <>
          <path d="M42 48 q4 -5 8 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M50 48 q4 -5 8 0" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="44" cy="46" r="2.3" fill={ink} />
          <circle cx="56" cy="46" r="2.3" fill={ink} />
        </>
      )}
      <path
        d={smile ? 'M43 58 q7 7 14 0' : 'M45 59 q5 3 10 0'}
        fill="none"
        stroke={ink}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </g>
  )
}

function Accessory({ draw }: { draw: PlanetDraw }) {
  const kind = draw.config.accessory
  if (kind === 'none') return null
  const ink = draw.config.palette.accent
  if (kind === 'crown') {
    return <path d="M38 28 l4 8 8 -6 8 6 4 -8 v8 h-24z" fill={ink} />
  }
  if (kind === 'bow') {
    return <path d="M68 40 l8 -4 0 10 -8 -4  -8 4 0 -10z" fill={ink} />
  }
  if (kind === 'leaf') {
    return <ellipse cx="50" cy="24" rx="4" ry="7" fill="#4ade80" transform="rotate(-20 50 24)" />
  }
  return <path d="M36 32 h28 v6 a14 10 0 0 1 -28 0z" fill={ink} />
}

function Decor({ draw }: { draw: PlanetDraw }) {
  return (
    <g>
      {draw.config.decorations.map((item, index) => {
        const x = 18 + index * 64
        const y = 18 + index * 8
        if (item === 'flowers') return <circle key={item} cx={x} cy={y} r="2.4" fill="#fb7185" />
        if (item === 'clouds') return <ellipse key={item} cx={x} cy={78} rx="5" ry="3" fill="#fff" opacity="0.8" />
        if (item === 'sparkles') return <circle key={item} cx={x} cy={y} r="1.6" fill={draw.config.palette.glow} />
        return <path key={item} d={`M${x} ${y} l1.2 2.4 2.4 1.2 -2.4 1.2 -1.2 2.4 -1.2 -2.4 -2.4 -1.2 2.4 -1.2z`} fill={draw.config.palette.accent} />
      })}
    </g>
  )
}

function Rings({ draw, front }: { draw: PlanetDraw; front?: boolean }) {
  const { rings } = draw.config
  if (!rings.enabled) return null
  const ry = 8 + Math.abs(rings.tilt) * 0.18
  const dash = rings.style === 'dashed' ? '4 3' : undefined
  return (
    <g opacity={front ? 0.95 : 0.45}>
      {Array.from({ length: rings.count }, (_, index) => (
        <ellipse
          key={index}
          cx="50"
          cy="50"
          rx={40 + index * 6}
          ry={ry + index * 2}
          fill="none"
          stroke={rings.color}
          strokeWidth={rings.thickness * 18}
          strokeDasharray={dash}
          transform={`rotate(${rings.tilt} 50 50)`}
        />
      ))}
      {rings.style === 'sparkle' &&
        [0, 1, 2, 3].map((dot) => (
          <circle
            key={dot}
            cx={50 + Math.cos(dot) * 42}
            cy={50 + Math.sin(dot) * ry}
            r="1.3"
            fill={rings.color}
          />
        ))}
    </g>
  )
}

export function PlanetRenderer({ config, size = 120, hot = false, showRings = true, animate = true }: Props) {
  const draw = useMemo(() => planetDraw(config), [config])
  const clipId = `planet-${useId().replace(/:/g, '')}`
  const moon = draw.config.moons
  const period = `${Math.round(18 - moon.orbitSpeed * 10)}s`

  return (
    <svg className="planet-svg" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <clipPath id={`${clipId}-body`}>
          <circle cx="50" cy="50" r="32" />
        </clipPath>
        <clipPath id={`${clipId}-front`}>
          <rect x="0" y="50" width="100" height="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="40" fill={config.palette.glow} opacity="0.35" />
      {showRings && <Rings draw={{ ...draw, config }} />}
      <g clipPath={`url(#${clipId}-body)`}>
        <circle cx="50" cy="50" r="32" fill={config.palette.base} />
        <Marks draw={draw} />
        <Face draw={draw} hot={hot} />
      </g>
      {config.atmosphere.enabled && (
        <circle
          cx="50"
          cy="50"
          r="33.2"
          fill="none"
          stroke={config.atmosphere.color}
          strokeWidth={2 + config.atmosphere.intensity * 2}
          opacity={0.35 + config.atmosphere.intensity * 0.4}
        />
      )}
      {showRings && (
        <g clipPath={`url(#${clipId}-front)`}>
          <Rings draw={draw} front />
        </g>
      )}
      <Accessory draw={draw} />
      <Decor draw={draw} />
      {moon.count > 0 && (
        <g
          className={animate ? 'planet-moon-spin' : undefined}
          style={animate ? { transformOrigin: '50px 50px', animationDuration: period } : { transform: `rotate(${draw.moonAngle}deg)`, transformOrigin: '50px 50px' }}
        >
          <circle cx="50" cy={14} r={8 * moon.size * 3} fill={moon.colors[0] ?? config.palette.secondary} />
        </g>
      )}
    </svg>
  )
}

export function renderToStaticSvg(config: PlanetConfig) {
  const draw = planetDraw(config)
  const marks = draw.marks
    .map(
      (mark) =>
        `<ellipse cx="${mark.cx.toFixed(1)}" cy="${mark.cy.toFixed(1)}" rx="${mark.rx.toFixed(1)}" ry="${mark.ry.toFixed(1)}" fill="${mark.fill}" transform="rotate(${mark.rotate.toFixed(0)} ${mark.cx.toFixed(1)} ${mark.cy.toFixed(1)})" />`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="${config.palette.base}"/>${marks}<circle cx="44" cy="46" r="2.3" fill="${draw.eyeInk}"/><circle cx="56" cy="46" r="2.3" fill="${draw.eyeInk}"/></svg>`
}
