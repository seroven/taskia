/** Mezcla de colores hex para sacar sombras y luces de la paleta, sin pedir más colores al usuario. */

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function toHex(r: number, g: number, b: number) {
  const part = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

export function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

export const darken = (hex: string, t: number) => mix(hex, '#1e293b', t)
export const lighten = (hex: string, t: number) => mix(hex, '#ffffff', t)
