import { Draw, Spark } from './kit'
import { sv } from './sv'

/** Campamento: tienda con bandera y fogata sobre un trozo de planeta. */
export function CampScene() {
  return (
    <svg className="scene scene-camp" viewBox="0 0 240 200" aria-hidden focusable="false">
      {/* Cielo */}
      <path
        d="M204 43 A16 16 0 1 0 204 71 A14 14 0 0 1 204 43Z"
        className="fill-star thin pop"
        style={sv({ '--i': 6 })}
      />
      <Spark x={44} y={62} s={6} className="fill-star twinkle thin" style={sv({ '--dur': '3.2s' })} />
      <Spark x={78} y={34} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '2.7s', '--delay': '-1s' })} />
      <Spark x={158} y={50} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3.6s', '--delay': '-2s' })} />
      <Spark x={22} y={108} s={4} className="fill-star twinkle thin" style={sv({ '--dur': '3s', '--delay': '-.6s' })} />
      <Spark x={214} y={112} s={5} className="fill-star twinkle thin" style={sv({ '--dur': '3.4s', '--delay': '-1.8s' })} />
      <path d="M44 62 L78 34 L108 46" className="dashes thin dim fade" style={sv({ '--i': 8 })} />

      {/* Suelo: casquete del planeta */}
      <path d="M44 178 A170 170 0 0 1 196 178Z" className="fill draw pop" pathLength={1} style={sv({ '--i': 0 })} />
      <ellipse cx="84" cy="173" rx="8" ry="2.6" className="thin dim fade" style={sv({ '--i': 3 })} />
      <ellipse cx="152" cy="178" rx="10" ry="3" className="thin dim fade" style={sv({ '--i': 3 })} />

      {/* Tienda */}
      <g className="pop" style={sv({ '--i': 2 })}>
        <path d="M86 163 L118 108 L150 163Z" className="fill-strong" />
        <path d="M106 163 L118 128 L130 163Z" className="fill" style={sv({ fill: 'var(--surface)' })} />
      </g>
      <Draw d="M118 108 L118 128" i={4} className="thin" />
      <Draw d="M99 150 L108 134 M137 150 L128 134" i={5} className="thin dim" />

      {/* Bandera */}
      <Draw d="M118 108 L118 88" i={5} />
      <path d="M118 88 L137 94 L118 100Z" className="acc-fill wave pop" style={sv({ '--i': 7 })} />

      {/* Fogata */}
      <circle cx="176" cy="157" r="22" className="acc thin dashes breathe" style={sv({ '--dur': '3s' })} />
      <g className="hov-grow">
        <g className="flicker">
          <path
            d="M176 167 C168 167 166 159 170 153 C172 149 175 147 174 141 C181 145 186 153 184 160 C183 165 180 167 176 167Z"
            className="fill-flame"
          />
        </g>
        <g className="flicker" style={sv({ '--dur': '.8s', '--delay': '-.3s' })}>
          <path
            d="M176 167 C172 167 171 163 173 159 C175 157 176 155 176 152 C180 155 181 161 180 164 C179 166 178 167 176 167Z"
            className="fill-star"
          />
        </g>
      </g>
      <Draw d="M163 171 L189 165 M163 165 L189 171" i={6} className="fill" />
      <g className="nostroke">
        <circle cx="174" cy="146" r="1.8" className="acc-fill rise" style={sv({ '--dur': '2.4s', '--delay': '0s', '--drift': '-5px' })} />
        <circle cx="180" cy="148" r="1.5" className="fill-star rise" style={sv({ '--dur': '2.9s', '--delay': '-1s', '--drift': '7px' })} />
        <circle cx="171" cy="150" r="1.4" className="fill-star rise" style={sv({ '--dur': '2.2s', '--delay': '-1.7s', '--drift': '2px' })} />
      </g>
      <Spark x={188} y={128} s={4} className="fill-star hov-in thin" />
      <Spark x={164} y={130} s={3} className="fill-star hov-in thin" />
    </svg>
  )
}
