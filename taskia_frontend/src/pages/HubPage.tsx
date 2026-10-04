import { Flag, GlobeHemisphereWest, UsersThree } from '@phosphor-icons/react'
import { AppearanceTools } from '../components/AppearanceTools'
import { SessionActions } from '../components/SessionActions'
import { ExplorerXpBar } from '../components/ExplorerXpBar'
import { useAuth } from '../auth'

type HubDoor = 'troops' | 'worlds' | 'camp'

export function HubPage({
  onOpen,
}: {
  onOpen: (door: HubDoor) => void
}) {
  const { user } = useAuth()

  return (
    <div className="hub-shell">
      <header className="topbar hub-topbar">
        <div>
          <p className="brand">Taskia</p>
          <p className="welcome">¡Hola, {user?.username}!</p>
        </div>
        <div className="topbar-actions">
          <ExplorerXpBar />
          <AppearanceTools />
          <SessionActions />
        </div>
      </header>

      <main className="hub-main">
        <p className="hub-lead">¿A dónde quieres ir?</p>
        <div className="hub-doors">
          <button
            type="button"
            className="hub-door hub-door--soon"
            disabled
          >
            <span className="hub-door-icon" aria-hidden>
              <UsersThree size={36} weight="duotone" />
            </span>
            <span className="hub-door-title">Tripulación</span>
            <span className="hub-door-sub">Estamos armando este lugar. Vuelve pronto.</span>
          </button>
          <button
            type="button"
            className="hub-door"
            onClick={() => onOpen('worlds')}
          >
            <span className="hub-door-icon" aria-hidden>
              <GlobeHemisphereWest size={36} weight="duotone" />
            </span>
            <span className="hub-door-title">Mundos</span>
            <span className="hub-door-sub">Temas, misiones y desafíos</span>
          </button>
          <button
            type="button"
            className="hub-door hub-door--accent"
            onClick={() => onOpen('camp')}
          >
            <span className="hub-door-icon" aria-hidden>
              <Flag size={36} weight="duotone" />
            </span>
            <span className="hub-door-title">Campamento</span>
            <span className="hub-door-sub">Tareas del día</span>
          </button>
        </div>
      </main>
    </div>
  )
}
