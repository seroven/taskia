import type { CSSProperties } from 'react'

/** Variables CSS en línea (`--i`, `--dur`, ...) sin pelear con el tipado de React. */
export function sv(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties
}
