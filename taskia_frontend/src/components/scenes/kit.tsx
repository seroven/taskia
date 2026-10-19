import type { CSSProperties } from 'react'
import { sv } from './sv'

type DrawProps = {
  d: string
  /** Orden de entrada: cada paso suma 70 ms. */
  i?: number
  className?: string
}

/** Trazo que se dibuja solo al entrar. `pathLength=1` hace que el dash sea independiente del largo. */
export function Draw({ d, i = 0, className = '' }: DrawProps) {
  return <path d={d} pathLength={1} className={`draw ${className}`.trim()} style={sv({ '--i': i })} />
}

type SparkProps = {
  x: number
  y: number
  s?: number
  className?: string
  style?: CSSProperties
}

/** Estrella de cuatro puntas con lados cóncavos. */
export function Spark({ x, y, s = 6, className = '', style }: SparkProps) {
  const k = s * 0.18
  const d = `M${x} ${y - s} Q${x + k} ${y - k} ${x + s} ${y} Q${x + k} ${y + k} ${x} ${y + s} Q${x - k} ${y + k} ${x - s} ${y} Q${x - k} ${y - k} ${x} ${y - s}Z`
  return <path d={d} className={className} style={style} />
}
