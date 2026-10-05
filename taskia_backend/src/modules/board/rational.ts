/** Fracción n/d en enteros grandes, reducida, con denominador positivo. */
export type Rational = { n: bigint; d: bigint }

const MAX_DIGITS = 12

export function rat(n: bigint, d: bigint = 1n): Rational | null {
  if (d === 0n) return null
  if (d < 0n) {
    n = -n
    d = -d
  }
  const g = gcd(n < 0n ? -n : n, d)
  const next = { n: n / g, d: d / g }
  if (tooBig(next.n) || tooBig(next.d)) return null
  return next
}

export function rInt(value: bigint): Rational | null {
  return rat(value, 1n)
}

export function rAdd(a: Rational, b: Rational) {
  return rat(a.n * b.d + b.n * a.d, a.d * b.d)
}

export function rSub(a: Rational, b: Rational) {
  return rat(a.n * b.d - b.n * a.d, a.d * b.d)
}

export function rMul(a: Rational, b: Rational) {
  return rat(a.n * b.n, a.d * b.d)
}

export function rDiv(a: Rational, b: Rational) {
  if (b.n === 0n) return null
  return rat(a.n * b.d, a.d * b.n)
}

export function rNeg(a: Rational) {
  return rat(-a.n, a.d)
}

export function rEq(a: Rational, b: Rational) {
  return a.n === b.n && a.d === b.d
}

export function rIsZero(a: Rational) {
  return a.n === 0n
}

export function rToNumber(value: Rational) {
  return Number(value.n) / Number(value.d)
}

/** `0,5` y `0.5` son `1/2`. Un entero es n/1. */
export function rFromDecimal(raw: string): Rational | null {
  const text = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) return null
  const [whole, frac = ''] = text.split('.')
  if ((whole?.length ?? 0) + frac.length > MAX_DIGITS) return null
  const digits = `${whole}${frac}`
  const scale = 10n ** BigInt(frac.length)
  return rat(BigInt(digits), scale)
}

export function rFromClaim(value: number | string): Rational | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    if (Number.isInteger(value)) return rInt(BigInt(value))
    return rFromDecimal(String(value))
  }
  const text = value.trim().replace('°', '').replace(/\s+/g, '')
  if (text.startsWith('-')) {
    const inner = rFromUnsigned(text.slice(1))
    return inner ? rNeg(inner) : null
  }
  return rFromUnsigned(text)
}

function rFromUnsigned(text: string): Rational | null {
  const slash = /^(\d+)\/(\d+)$/.exec(text)
  if (slash) return rat(BigInt(slash[1]!), BigInt(slash[2]!))
  return rFromDecimal(text)
}

export function parseAngleLabel(raw: string):
  | { kind: 'number'; value: Rational }
  | { kind: 'term'; coefficient: Rational; name: string }
  | null {
  const text = raw.trim().replace(/\s+/g, '').replace(/°$/, '')
  if (!text) return null
  const number = rFromDecimal(text)
  if (number) return { kind: 'number', value: number }
  const term = /^(\d+(?:[.,]\d+)?)?([a-zA-Z])$/.exec(text)
  if (!term) return null
  const coefficient = term[1] ? rFromDecimal(term[1]) : rInt(1n)
  if (!coefficient || rIsZero(coefficient)) return null
  return { kind: 'term', coefficient, name: term[2]! }
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a
  let y = b
  while (y !== 0n) {
    const next = x % y
    x = y
    y = next
  }
  return x
}

function tooBig(value: bigint) {
  const digits = (value < 0n ? -value : value).toString().length
  return digits > MAX_DIGITS
}
