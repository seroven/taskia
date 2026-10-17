import { Planet } from './Planet'

type HubDoor = 'worlds' | 'camp'

function CampMark() {
  return (
    <span className="hub-camp-art">
      <Planet size={148} variant="accent" />
      <svg className="hub-tent" viewBox="0 0 80 64" width="78" height="62" aria-hidden>
        <path
          d="M6 58 L40 8 L74 58 Z"
          fill="var(--surface)"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M40 16 L40 58" stroke="currentColor" strokeWidth="3" />
        <path
          d="M40 20 L64 10 L40 34 Z"
          fill="var(--star)"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function StationMark() {
  return (
    <svg className="hub-station" viewBox="0 0 180 140" width="180" height="140" aria-hidden>
      <ellipse
        cx="90"
        cy="74"
        rx="72"
        ry="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="7 6"
      />
      <rect
        x="68"
        y="50"
        width="44"
        height="48"
        rx="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="6 5"
      />
      <path
        d="M90 28 V50 M46 74 H68 M112 74 H134"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="5 4"
        strokeLinecap="round"
      />
      <circle cx="90" cy="22" r="7" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="3 3" />
    </svg>
  )
}

/** Destinos del hub. Cambiar solo este componente vuelve a tarjetas simples. */
export function HubDestinations({ onOpen }: { onOpen: (door: HubDoor) => void }) {
  return (
    <div className="hub-destinations">
      <button
        type="button"
        className="hub-destination hub-destination--worlds"
        onClick={() => onOpen('worlds')}
      >
        <span className="hub-destination-art hub-worlds-art" aria-hidden>
          <Planet size={64} variant="sand" />
          <Planet size={104} variant="accent" />
          <Planet size={56} variant="ice" />
        </span>
        <span className="hub-destination-title">Mundos</span>
        <span className="hub-destination-sub">Temas, misiones y desafíos</span>
      </button>

      <button
        type="button"
        className="hub-destination hub-destination--camp"
        onClick={() => onOpen('camp')}
      >
        <span className="hub-destination-art" aria-hidden>
          <CampMark />
        </span>
        <span className="hub-destination-title">Campamento</span>
        <span className="hub-destination-sub">Tareas del día</span>
      </button>

      <div className="hub-destination hub-destination--troops" aria-disabled="true">
        <span className="hub-destination-art" aria-hidden>
          <StationMark />
        </span>
        <span className="hub-soon">Pronto</span>
        <span className="hub-destination-title">Tripulación</span>
        <span className="hub-destination-sub">Estamos armando este lugar. Vuelve pronto.</span>
      </div>
    </div>
  )
}
