import { useLayoutEffect } from 'react'

export type SpaceLevel = 'high' | 'medium' | 'low' | 'none'

/** Pone data-space en <html> para que el fundido de apariencia incluya el cielo. */
export function useSpace(level: SpaceLevel) {
  useLayoutEffect(() => {
    document.documentElement.dataset.space = level
  }, [level])
}

export function SpaceSky() {
  return (
    <div className="space-sky" aria-hidden>
      <div className="space-sky-nebula" />
      <div className="space-sky-stars space-sky-stars-a" />
      <div className="space-sky-stars space-sky-stars-b" />
      <div className="space-sky-stars space-sky-stars-c" />
    </div>
  )
}
