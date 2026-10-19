import { useMemo } from 'react'
import { Draw } from '../../scenes/kit'
import { sv } from '../../scenes/sv'

const CX = 100
const CY = 100

/**
 * Cuerpo de un sol de línea en un recuadro de 200 × 200: un disco con un brillo interior y un destello, y doce
 * rayos largos y cortos que giran muy despacio. Solo el dibujo (un `<g>`).
 */
export function SunBody({ animate = true }: { animate?: boolean }) {
  const rays = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2
        const long = index % 2 === 0
        const from = 54
        const to = long ? 80 : 66
        return `M${(CX + Math.cos(angle) * from).toFixed(1)} ${(CY + Math.sin(angle) * from).toFixed(1)} L${(CX + Math.cos(angle) * to).toFixed(1)} ${(CY + Math.sin(angle) * to).toFixed(1)}`
      }),
    [],
  )
  const i = animate ? 0 : -20

  return (
    <g>
      <g className="spin" style={sv({ '--cx': '100px', '--cy': '100px', '--dur': '140s' })}>
        <path d={rays.join(' ')} className="sun-rays" />
      </g>
      <circle cx={CX} cy={CY} r="42" className="fill draw pop" pathLength={1} style={sv({ '--i': i })} />
      <circle cx={CX} cy={CY} r="28" className="fill-strong nostroke" style={{ opacity: 0.55 }} />
      <Draw d="M72 84 A32 32 0 0 1 90 68" i={i + 2} className="thin dim" />
    </g>
  )
}
