import { CampScene } from './scenes/CampScene'
import { CrewScene } from './scenes/CrewScene'
import { WorldsScene } from './scenes/WorldsScene'

type HubDoor = 'troops' | 'worlds' | 'camp'

/** Destinos del hub: cada uno es una escena de línea animada (`components/scenes`). */
export function HubDestinations({ onOpen }: { onOpen: (door: HubDoor) => void }) {
  return (
    <div className="hub-destinations">
      <button
        type="button"
        className="hub-destination hub-destination--worlds scene-host"
        onClick={() => onOpen('worlds')}
      >
        <span className="hub-destination-art" aria-hidden>
          <WorldsScene />
        </span>
        <span className="hub-destination-title">Mundos</span>
        <span className="hub-destination-sub">Temas, misiones y desafíos</span>
      </button>

      <button
        type="button"
        className="hub-destination hub-destination--camp scene-host"
        onClick={() => onOpen('camp')}
      >
        <span className="hub-destination-art" aria-hidden>
          <CampScene />
        </span>
        <span className="hub-destination-title">Campamento</span>
        <span className="hub-destination-sub">Tareas del día</span>
      </button>

      <button
        type="button"
        className="hub-destination hub-destination--troops scene-host"
        onClick={() => onOpen('troops')}
      >
        <span className="hub-destination-art" aria-hidden>
          <CrewScene />
        </span>
        <span className="hub-destination-title">Tripulación</span>
        <span className="hub-destination-sub">Tu nave y tu equipo</span>
      </button>
    </div>
  )
}
