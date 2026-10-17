import type { CSSProperties } from 'react'

type PlanetVariant = 'accent' | 'sand' | 'ice'

/** Esfera plana. Con `src` muestra un PNG; si no, solo CSS. */
export function Planet({
  size = 120,
  variant = 'accent',
  src,
}: {
  size?: number
  variant?: PlanetVariant
  src?: string
}) {
  const style = { width: size, height: size } as CSSProperties
  return (
    <span className={`planet planet--${variant}`} style={style} aria-hidden>
      {src ? <img className="planet-img" src={src} alt="" /> : null}
    </span>
  )
}
