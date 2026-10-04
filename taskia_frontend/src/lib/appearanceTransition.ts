/** Funde la pantalla al cambiar tema o color. El primer pintado no anima. */
export function withAppearanceTransition(apply: () => void) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const start = document.startViewTransition?.bind(document)
  if (reduce || !start) {
    apply()
    return
  }
  try {
    start(apply)
  } catch {
    apply()
  }
}
