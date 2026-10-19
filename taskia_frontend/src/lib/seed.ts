/** Generador pseudoaleatorio con semilla: la misma semilla da siempre la misma secuencia. */
export function mulberry32(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Número estable a partir de un texto (para sembrar con un nombre). */
export function hashString(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Semilla estable por mundo: el mismo id siempre da el mismo planeta. */
export function worldSeed(worldId: number) {
  return worldId * 7919 + 13
}

/** Semilla estable por curso dentro de un mundo. */
export function courseSeed(worldId: number, courseId: number) {
  return worldId * 104729 + courseId * 7919 + 5
}

/** Tono (0-4) de un planeta o sol a partir de su semilla: el mismo que usa el dibujo. */
export function planetTone(seed: number) {
  return Math.floor(mulberry32(seed)() * 5)
}
