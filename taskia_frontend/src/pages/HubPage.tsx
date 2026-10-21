import { AppearanceTools } from '../components/AppearanceTools'
import { HubDestinations } from '../components/HubDestinations'
import { SessionActions } from '../components/SessionActions'
import { ExplorerXpBar } from '../components/ExplorerXpBar'
import { UserAvatar } from '../components/avatar/UserAvatar'
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
          <p className="welcome">
            {user && <UserAvatar avatar={user.avatar_config} frame={user.frame_id} size={26} name={user.username} className="welcome-avatar" />}
            ¡Hola, {user?.username}!
          </p>
        </div>
        <div className="topbar-actions">
          <ExplorerXpBar />
          <AppearanceTools />
          <SessionActions />
        </div>
      </header>

      <main className="hub-main">
        <p className="hub-lead">¿A dónde quieres ir?</p>
        <HubDestinations onOpen={onOpen} />
      </main>
    </div>
  )
}
