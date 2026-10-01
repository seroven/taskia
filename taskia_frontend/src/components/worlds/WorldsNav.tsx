import { ArrowLeft } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { ExpandIconButton } from '../ExpandIconButton'
import { AppearanceTools } from '../AppearanceTools'

export function WorldsNav({
  backLabel,
  onBack,
  showAppearance = true,
  trailing,
}: {
  backLabel: string
  onBack: () => void
  showAppearance?: boolean
  trailing?: ReactNode
}) {
  return (
    <nav className="worlds-nav">
      <ExpandIconButton
        className="worlds-back"
        icon={ArrowLeft}
        label={backLabel}
        weight="bold"
        onClick={onBack}
      />
      <div className="worlds-nav-tools">
        {trailing}
        {showAppearance && <AppearanceTools />}
      </div>
    </nav>
  )
}
