import { Draw, Spark } from './kit'
import { sv } from './sv'

const GROUND = 'M44 178 A170 170 0 0 1 196 178Z'

/** Hoy sin tareas: la tienda duerme de noche, la fogata está apagada y sube un poco de humo. */
export function CampEmptyDay() {
  return (
    <svg className="scene scene-empty" viewBox="0 0 240 190" aria-hidden focusable="false">
      <path
        d="M196 34 A16 16 0 1 0 196 62 A14 14 0 0 1 196 34Z"
        className="fill-star thin pop"
        style={sv({ '--i': 5 })}
      />
      <Spark x={50} y={52} s={6} className="fill-star twinkle thin" style={sv({ '--dur': '3.2s' })} />
      <Spark x={92} y={30} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '2.8s', '--delay': '-1s' })} />
      <Spark x={156} y={44} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3.6s', '--delay': '-2s' })} />
      <Spark x={26} y={108} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '3s', '--delay': '-.6s' })} />

      <path d={GROUND} className="fill draw pop" pathLength={1} style={sv({ '--i': 0 })} />
      <ellipse cx="86" cy="173" rx="8" ry="2.6" className="thin dim fade" style={sv({ '--i': 3 })} />

      {/* Tienda con la puerta cerrada */}
      <g className="pop" style={sv({ '--i': 2 })}>
        <path d="M80 163 L112 108 L144 163Z" className="fill-strong" />
        <path d="M100 163 L112 128 L124 163Z" className="fill" />
      </g>
      <Draw d="M112 108 L112 128 M112 128 L112 163" i={4} className="thin" />
      <Draw d="M93 150 L102 134 M131 150 L122 134" i={5} className="thin dim" />

      {/* Zzz */}
      <g className="acc" style={sv({ '--i': 7 })}>
        <path d="M126 96 h9 l-9 10 h9" className="thin rise" style={sv({ '--dur': '3.6s', '--drift': '8px', '--delay': '0s' })} />
        <path d="M138 80 h6 l-6 7 h6" className="thin rise" style={sv({ '--dur': '3.6s', '--drift': '6px', '--delay': '-1.8s' })} />
      </g>

      {/* Fogata apagada */}
      <Draw d="M158 170 L184 164 M158 164 L184 170" i={6} className="fill" />
      <path d="M171 160 C167 160 165 157 167 154 C169 152 171 150 171 147 C175 150 176 155 175 158 C174 160 173 160 171 160Z" className="thin dim" />
      <g>
        <path d="M170 146 q-4 -6 0 -12 q4 -6 0 -12" className="thin dim rise" style={sv({ '--dur': '4s', '--drift': '4px', '--delay': '0s' })} />
        <path d="M175 148 q-3 -5 0 -10" className="thin dim rise" style={sv({ '--dur': '4s', '--drift': '-3px', '--delay': '-2s' })} />
      </g>
    </svg>
  )
}

/** Proyectos sin tareas: un telescopio apunta a una constelación que todavía falta completar. */
export function CampEmptyProjects() {
  return (
    <svg className="scene scene-empty" viewBox="0 0 240 190" aria-hidden focusable="false">
      <Spark x={34} y={46} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3.3s' })} />
      <Spark x={214} y={140} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '2.9s', '--delay': '-1.4s' })} />
      <Spark x={60} y={92} s={3} className="fill-star twinkle thin" style={sv({ '--dur': '3.7s', '--delay': '-2.2s' })} />

      <path d={GROUND} className="fill draw pop" pathLength={1} style={sv({ '--i': 0 })} />

      {/* Constelación en curso */}
      <path d="M150 74 L180 52 L208 76" className="dashes thin dim fade" style={sv({ '--i': 7 })} />
      <Spark x={150} y={74} s={6} className="fill-star twinkle thin" style={sv({ '--dur': '3s' })} />
      <Spark x={180} y={52} s={8} className="fill-star twinkle thin" style={sv({ '--dur': '3.5s', '--delay': '-1s' })} />
      <circle cx="208" cy="76" r="7" className="dashes acc breathe" style={sv({ '--dur': '2.8s' })} />

      {/* Trípode */}
      <Draw d="M92 126 L68 172 M92 126 L120 172 M92 126 L92 176" i={2} />

      {/* Tubo */}
      <g transform="translate(92 126) rotate(-36)">
        <g className="pop" style={sv({ '--i': 3 })}>
          <rect x="-12" y="-8" width="64" height="16" rx="3" className="fill-strong" />
          <rect x="-20" y="-5" width="8" height="10" rx="2" className="fill" />
          <rect x="52" y="-10" width="7" height="20" rx="2" className="fill" />
        </g>
        <Draw d="M12 -8 L12 8 M32 -8 L32 8" i={5} className="thin dim" />
        <circle cx="0" cy="0" r="6" className="fill-star thin pop" style={sv({ '--i': 4 })} />
      </g>

      {/* Haz hacia la primera estrella */}
      <path d="M134 94 L148 80" className="dashes acc thin breathe" style={sv({ '--dur': '2.8s' })} />
    </svg>
  )
}
