import { HubDestinations } from '../components/HubDestinations'

/** Solo dev: `?lab=hub` muestra los destinos del hub sin sesión. */
export function HubLab() {
  return (
    <div className="hub-shell">
      <main className="hub-main">
        <p className="hub-lead">¿A dónde quieres ir?</p>
        <HubDestinations onOpen={() => {}} />
      </main>
    </div>
  )
}
