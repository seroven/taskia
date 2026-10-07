import { Fragment, type ReactNode } from 'react'
import { plainMathText } from '../../lib/plainMath'

const MATH_TOKEN =
  /\((\d{1,4})\/(\d{1,4})\)\^(\d{1,3}|[A-Za-z])|(\d{1,4})\/(\d{1,4})\^(\d{1,3}|[A-Za-z])|(?<![\d./])(\d{1,4})\/(\d{1,4})(?![\d./])|(?<![\w])([A-Za-z]|\d{1,8})\^(?:\{([^{}\n]{1,8})\}|(\d{1,3}|[A-Za-z]))(?![\w])/g

function looksLikeYear(num: string, den: string) {
  return den.length === 4 && num.length <= 2 && Number(num) >= 1 && Number(num) <= 31
}

function Fraction({ num, den, exp }: { num: string; den: string; exp?: string }) {
  return (
    <span className="math-frac">
      <span className="math-frac-num">{num}</span>
      <span className="math-frac-bar" aria-hidden />
      <span className="math-frac-den">
        {den}
        {exp ? <sup className="math-exp">{exp}</sup> : null}
      </span>
    </span>
  )
}

function Power({ base, exp }: { base: ReactNode; exp: string }) {
  return (
    <span className="math-pow">
      {base}
      <sup className="math-exp">{exp}</sup>
    </span>
  )
}

/** Dibuja 3/4 y 2^4. El texto de origen no cambia. */
export function MathText({ text }: { text: string }) {
  const plain = plainMathText(text)
  const nodes: ReactNode[] = []
  let cursor = 0
  for (const match of plain.matchAll(MATH_TOKEN)) {
    const start = match.index ?? 0
    if (start < cursor) continue
    const whole = match[0]
    if (match[7] && match[8] && looksLikeYear(match[7], match[8])) continue
    if (start > cursor) nodes.push(plain.slice(cursor, start))
    if (match[1] && match[2] && match[3]) {
      nodes.push(
        <Power
          key={start}
          base={<Fraction num={match[1]} den={match[2]} />}
          exp={match[3]}
        />,
      )
    } else if (match[4] && match[5] && match[6]) {
      nodes.push(<Fraction key={start} num={match[4]} den={match[5]} exp={match[6]} />)
    } else if (match[7] && match[8]) {
      nodes.push(<Fraction key={start} num={match[7]} den={match[8]} />)
    } else {
      const exp = match[10] || match[11]
      if (match[9] && exp) nodes.push(<Power key={start} base={match[9]} exp={exp} />)
      else nodes.push(whole)
    }
    cursor = start + whole.length
  }
  if (cursor < plain.length) nodes.push(plain.slice(cursor))
  return (
    <>
      {nodes.map((node, index) => (
        <Fragment key={index}>{node}</Fragment>
      ))}
    </>
  )
}
