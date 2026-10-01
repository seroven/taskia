import { UsersThree } from '@phosphor-icons/react'
import { WorldsEmptyState } from '../components/worlds/WorldsEmptyState'
import { WorldsNav } from '../components/worlds/WorldsNav'
import { ExplorerXpBar } from '../components/ExplorerXpBar'

/** Placeholder hasta la oleada 3 (CRUD de tropas). */
export function TroopsPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="worlds-shell">
      <WorldsNav backLabel="Inicio" onBack={onBack} trailing={<ExplorerXpBar />} />
      <div className="worlds-content worlds-stage">
        <WorldsEmptyState
          icon={UsersThree}
          title="Tropas muy pronto"
          description="Aquí podrás crear tu tropa, invitar compañeros y ver rankings. Mientras tanto, gana XP en el Campamento y en Mundos."
        />
      </div>
    </div>
  )
}
