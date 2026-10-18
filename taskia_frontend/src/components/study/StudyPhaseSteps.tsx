import { phaseLabel, type TutorPhase } from '../../lib/studyProtocol'

const STEPS: TutorPhase[] = ['understanding', 'practicing', 'reviewing']

function currentStep(phase: string): TutorPhase {
  return STEPS.includes(phase as TutorPhase) ? (phase as TutorPhase) : 'understanding'
}

/** La fase puede volver atrás, así que no hay flechas ni pasos dados por hechos. */
export function StudyPhaseSteps({ phase }: { phase: string }) {
  const current = currentStep(phase)
  return (
    <div className="study-phase-steps" role="group" aria-label="Fase del estudio">
      {STEPS.map((step) => {
        const on = step === current
        return (
          <span
            key={step}
            className={`study-phase-step${on ? ' is-current' : ''}`}
            aria-current={on ? 'step' : undefined}
          >
            {phaseLabel(step)}
          </span>
        )
      })}
    </div>
  )
}
