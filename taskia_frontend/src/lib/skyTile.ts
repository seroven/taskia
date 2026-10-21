/**
 * Baldosas del fondo de la galaxia: un SVG cuadrado que se repite sin costuras, usado como máscara
 * (`mask-image`) para pintarlo con el color del tema. Cada capa tiene su baldosa y su tamaño (distintos y poco
 * redondos, para que el patrón no se note repetido):
 *  - `dust`: polvo de estrellas diminutas, lo más lejano.
 *  - `stars`: estrellas algo mayores y unas pocas de cuatro puntas.
 *  - `streaks`: rayitas horizontales, las que dan la sensación de velocidad.
 * Todo sale de una semilla, así que el fondo es igual en cada visita.
 */

export type SkyKind = 'dust' | 'stars' | 'streaks'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const fix = (value: number) => Math.round(value * 10) / 10

/** Estrella de cuatro puntas con lados cóncavos (la misma de las ilustraciones de línea). */
function spark(x: number, y: number, s: number) {
  const k = s * 0.18
  return `M${fix(x)} ${fix(y - s)}Q${fix(x + k)} ${fix(y - k)} ${fix(x + s)} ${fix(y)}Q${fix(x + k)} ${fix(y + k)} ${fix(x)} ${fix(y + s)}Q${fix(x - k)} ${fix(y + k)} ${fix(x - s)} ${fix(y)}Q${fix(x - k)} ${fix(y - k)} ${fix(x)} ${fix(y - s)}Z`
}

export function skyTile(kind: SkyKind, seed: number, size: number): string {
  const rand = mulberry32(seed)
  const parts: string[] = []
  /** Cuánto más grande que una baldosa de 640 px: los conteos crecen con el área. */
  const area = (size / 640) ** 2
  const count = (base: number) => Math.round(base * area)

  if (kind === 'dust') {
    for (let i = 0; i < count(30); i += 1) {
      parts.push(`<circle cx="${fix(rand() * size)}" cy="${fix(rand() * size)}" r="${fix(0.6 + rand() * 0.8)}"/>`)
    }
  } else if (kind === 'stars') {
    for (let i = 0; i < count(10); i += 1) {
      parts.push(`<circle cx="${fix(rand() * size)}" cy="${fix(rand() * size)}" r="${fix(1.1 + rand() * 1.1)}"/>`)
    }
    for (let i = 0; i < count(4); i += 1) {
      parts.push(`<path d="${spark(rand() * size, rand() * size, 5 + rand() * 4)}"/>`)
    }
  } else {
    for (let i = 0; i < count(9); i += 1) {
      const length = 22 + rand() * 38
      const x = rand() * (size - length)
      parts.push(`<rect x="${fix(x)}" y="${fix(rand() * size)}" width="${fix(length)}" height="${fix(1.4 + rand() * 0.8)}" rx="1"/>`)
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="#000">${parts.join('')}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
