import { useEffect, useMemo, useState } from 'react'
import { Play, Trophy } from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../AppLoader'
import { ModalShell } from '../ui/ModalShell'
import { challengeDifficultyIcon } from './worldsIcons'
import { errorMessage } from '../../lib/errors'
import {
  DIFFICULTY_LABEL,
  type ChallengeDetail,
  type ChallengeDifficulty,
  type ChallengePreset,
  type ChallengeScope,
} from '../../lib/worldsTypes'
import { useToast } from '../../toast'

interface Props {
  open: boolean
  worldId: number
  scope: ChallengeScope
  courseId?: number | null
  missionId?: number | null
  title?: string
  onClose: () => void
  onStarted: (challengeId: number) => void
}

const ORDER: ChallengeDifficulty[] = ['warm', 'quest', 'boss']

export function ChallengeSetupModal({
  open,
  worldId,
  scope,
  courseId,
  missionId,
  title,
  onClose,
  onStarted,
}: Props) {
  const { showToast } = useToast()
  const [presets, setPresets] = useState<ChallengePreset[]>([])
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('warm')
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pausedId, setPausedId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setPausedId(null)
    setDifficulty('warm')
    setLoading(true)
    void api
      .listChallengePresets()
      .then(setPresets)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [open])

  const options = useMemo(
    () =>
      ORDER.map((d) => {
        const preset = presets.find((p) => p.scope === scope && p.difficulty === d)
        return {
          difficulty: d,
          label: DIFFICULTY_LABEL[d] ?? d,
          count: preset?.question_count ?? 0,
          Icon: challengeDifficultyIcon(d),
        }
      }),
    [presets, scope],
  )

  async function onStart(discard = false) {
    setStarting(true)
    setError(null)
    try {
      const detail = await api.startChallenge({
        world_id: worldId,
        scope,
        difficulty,
        course_id: courseId ?? null,
        mission_id: missionId ?? null,
        discard_in_progress: discard,
      })
      if ('conflict' in detail && detail.conflict) {
        setPausedId(detail.in_progress.challenge.id)
        setStarting(false)
        return
      }
      const started = detail as ChallengeDetail
      showToast({
        tone: 'success',
        title: '¡Desafío listo!',
        subtitle: `${started.questions.length} preguntas te esperan`,
      })
      onStarted(started.challenge.id)
      onClose()
    } catch (err) {
      const msg = errorMessage(err)
      setError(msg)
      showToast({
        tone: 'warning',
        title: 'No se pudo iniciar',
        subtitle: msg,
      })
    } finally {
      setStarting(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="challenge-setup-title"
      title="Nuevo desafío"
      lead={
        <>
          {title ? `Sobre: ${title}. ` : ''}
          En el desafío Taskia no habla: solo corrige al final. Si el tema es
          práctico, ves una foto tuya, marcas una opción y subes cómo lo
          resolviste. Al final revisa todas las respuestas.
        </>
      }
      icon={Trophy}
    >
            <div className="modal-panel-body">
              {loading && (
                <AppLoader message="Cargando niveles…" variant="section" />
              )}
              <div className="worlds-diff-grid" role="group" aria-label="Nivel del desafío">
                {options.map((opt) => (
                  <button
                    key={opt.difficulty}
                    type="button"
                    className={`worlds-diff-btn${difficulty === opt.difficulty ? ' is-active' : ''}`}
                    onClick={() => setDifficulty(opt.difficulty)}
                    disabled={starting || loading}
                  >
                    <opt.Icon size={28} weight="duotone" />
                    <strong>{opt.label}</strong>
                    <span>{opt.count || '—'} preguntas</span>
                  </button>
                ))}
              </div>
              {error && <p className="form-error">{error}</p>}
              {pausedId != null && (
                <p className="form-error">
                  Tienes un desafío a medias. Puedes seguirlo o descartarlo y empezar este.
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="ghost" onClick={onClose} disabled={starting}>
                  Cancelar
                </button>
                {pausedId != null && (
                  <button
                    type="button"
                    className="ghost"
                    disabled={starting}
                    onClick={() => {
                      onStarted(pausedId)
                      onClose()
                    }}
                  >
                    Continuar
                  </button>
                )}
                <button
                  type="button"
                  className="primary"
                  disabled={starting || loading}
                  onClick={() => void onStart(pausedId != null)}
                >
                  <Play size={18} weight="fill" />
                  {starting
                    ? 'Generando preguntas…'
                    : pausedId != null
                      ? 'Descartar y empezar'
                      : '¡Empezar!'}
                </button>
              </div>
            </div>
    </ModalShell>
  )
}
