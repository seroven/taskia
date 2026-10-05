import type { SceneIssue } from './types.js'

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'neg'; value: Expr }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/'; left: Expr; right: Expr }

export type ParsedMath =
  | { kind: 'value'; expr: Expr; variables: string[] }
  | { kind: 'equation'; left: Expr; right: Expr; variables: string[] }

export function parseMath(raw: string): { ok: true; math: ParsedMath } | { ok: false; issues: SceneIssue[] } {
  const text = normalizeMathText(raw)
  if (!text || text.length > 80) return fail()
  if (/[^0-9a-zA-Z+\-*/().,=]/.test(text)) return fail()
  try {
    const parser = new Parser(text)
    const left = parser.parseExpr()
    let math: ParsedMath
    if (parser.peek() === '=') {
      parser.eat('=')
      const right = parser.parseExpr()
      parser.end()
      const variables = uniqueVars(left).concat(uniqueVars(right))
      math = { kind: 'equation', left, right, variables: [...new Set(variables)] }
    } else {
      parser.end()
      math = { kind: 'value', expr: left, variables: uniqueVars(left) }
    }
    return { ok: true, math }
  } catch {
    return fail()
  }
}

export function evalExpr(expr: Expr, bindings: Record<string, number>): number | null {
  if (expr.kind === 'num') return expr.value
  if (expr.kind === 'var') {
    const value = bindings[expr.name]
    return value == null || !Number.isFinite(value) ? null : value
  }
  if (expr.kind === 'neg') {
    const value = evalExpr(expr.value, bindings)
    return value == null ? null : -value
  }
  const left = evalExpr(expr.left, bindings)
  const right = evalExpr(expr.right, bindings)
  if (left == null || right == null) return null
  if (expr.op === '+') return left + right
  if (expr.op === '-') return left - right
  if (expr.op === '*') return left * right
  if (right === 0) return null
  return left / right
}

/** Resuelve una ecuación afín de una sola letra. Si no hay un valor único, null. */
export function solveFor(math: ParsedMath, variable: string): number | null {
  if (math.kind === 'value') {
    if (math.variables.length === 0) return evalExpr(math.expr, {})
    return null
  }
  if (math.variables.some((name) => name !== variable)) return null
  const left = affine(math.left, variable)
  const right = affine(math.right, variable)
  if (!left || !right) return null
  const a = left.a - right.a
  const b = right.b - left.b
  if (Math.abs(a) < 1e-9) return null
  const value = b / a
  return Number.isFinite(value) ? value : null
}

export function sidesMatch(math: ParsedMath, bindings: Record<string, number>, tol = 1e-6): boolean | null {
  if (math.kind === 'value') {
    const value = evalExpr(math.expr, bindings)
    return value == null ? null : true
  }
  const left = evalExpr(math.left, bindings)
  const right = evalExpr(math.right, bindings)
  if (left == null || right == null) return null
  const scale = Math.max(1, Math.abs(left), Math.abs(right))
  return Math.abs(left - right) <= tol * scale
}

function fail(): { ok: false; issues: SceneIssue[] } {
  return { ok: false, issues: [{ code: 'BAD_EXPRESSION' }] }
}

function normalizeMathText(raw: string) {
  return raw
    .trim()
    .replace(/\s+/g, '')
    .replace(/−/g, '-')
    .replace(/×|·/g, '*')
    .replace(/÷/g, '/')
}

function uniqueVars(expr: Expr): string[] {
  if (expr.kind === 'var') return [expr.name]
  if (expr.kind === 'num') return []
  if (expr.kind === 'neg') return uniqueVars(expr.value)
  return [...new Set([...uniqueVars(expr.left), ...uniqueVars(expr.right)])]
}

function affine(expr: Expr, variable: string): { a: number; b: number } | null {
  if (expr.kind === 'num') return { a: 0, b: expr.value }
  if (expr.kind === 'var') return expr.name === variable ? { a: 1, b: 0 } : null
  if (expr.kind === 'neg') {
    const inner = affine(expr.value, variable)
    return inner ? { a: -inner.a, b: -inner.b } : null
  }
  const left = affine(expr.left, variable)
  const right = affine(expr.right, variable)
  if (!left || !right) return null
  if (expr.op === '+') return { a: left.a + right.a, b: left.b + right.b }
  if (expr.op === '-') return { a: left.a - right.a, b: left.b - right.b }
  if (expr.op === '*') {
    if (left.a !== 0 && right.a !== 0) return null
    return { a: left.a * right.b + right.a * left.b, b: left.b * right.b }
  }
  if (right.a !== 0 || right.b === 0) return null
  return { a: left.a / right.b, b: left.b / right.b }
}

class Parser {
  private i = 0

  constructor(private readonly text: string) {}

  peek() {
    return this.text[this.i] ?? ''
  }

  end() {
    if (this.i !== this.text.length) throw new Error('tail')
  }

  eat(ch: string) {
    if (this.peek() !== ch) throw new Error('eat')
    this.i += 1
  }

  parseExpr(): Expr {
    let left = this.parseTerm()
    while (this.peek() === '+' || this.peek() === '-') {
      const op = this.peek() as '+' | '-'
      this.i += 1
      const right = this.parseTerm()
      left = { kind: 'bin', op, left, right }
    }
    return left
  }

  private parseTerm(): Expr {
    let left = this.parseFactor()
    while (this.peek() === '*' || this.peek() === '/') {
      const op = this.peek() as '*' | '/'
      this.i += 1
      const right = this.parseFactor()
      left = { kind: 'bin', op, left, right }
    }
    return left
  }

  private parseFactor(): Expr {
    if (this.peek() === '-') {
      this.i += 1
      return { kind: 'neg', value: this.parseFactor() }
    }
    if (this.peek() === '(') {
      this.i += 1
      const inner = this.parseExpr()
      this.eat(')')
      return inner
    }
    if (/[0-9.]/.test(this.peek()) || (this.peek() === ',' && /[0-9]/.test(this.text[this.i + 1] ?? ''))) {
      return { kind: 'num', value: this.parseNumber() }
    }
    if (/[a-zA-Z]/.test(this.peek())) {
      const name = this.peek()
      this.i += 1
      if (/[a-zA-Z0-9]/.test(this.peek())) throw new Error('name')
      return { kind: 'var', name }
    }
    throw new Error('factor')
  }

  private parseNumber() {
    const start = this.i
    while (/[0-9]/.test(this.peek())) this.i += 1
    if (this.peek() === '.' || this.peek() === ',') {
      this.i += 1
      if (!/[0-9]/.test(this.peek())) throw new Error('dec')
      while (/[0-9]/.test(this.peek())) this.i += 1
    }
    const raw = this.text.slice(start, this.i).replace(',', '.')
    if (!raw || raw === '.') throw new Error('num')
    const value = Number(raw)
    if (!Number.isFinite(value)) throw new Error('num')
    return value
  }
}
