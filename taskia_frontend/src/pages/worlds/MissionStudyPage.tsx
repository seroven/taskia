import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  FloppyDisk,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { StudyChat } from '../../components/study/StudyChat'
import { TextAreaField, TextField } from '../../components/ui/Field'
import { WorldsStatusPill } from '../../components/worlds/WorldsStatusPill'
import { errorMessage } from '../../lib/errors'
import type { MissionContext, StudyMission } from '../../lib/worldsTypes'
import { mergeXpIntoUser, xpToastCopy } from '../../lib/xp'
import { useAuth } from '../../auth'
import { useToast } from '../../toast'

interface Props {
  missionId: number
  onBack: () => void
}

export function MissionStudyPage({ missionId, onBack }: Props) {
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const [mode, setMode] = useState<'study' | 'edit'>('study')
  const [mission, setMission] = useState<StudyMission | null>(null)
  const [context, setContext] = useState<MissionContext | null>(null)
  const [phase, setPhase] = useState('understanding')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const session = await api.missionLoadSession(missionId)
        setMission(session.mission)
        setContext(session.context)
        setPhase(session.context.tutor_phase)
        setEditTitle(session.mission.title)
        setEditDescription(session.mission.description ?? '')
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [missionId])

  function applyMissionResult(result: {
    context: NonNullable<typeof context>
    reply: { phase: string }
    mission: StudyMission
    xp_gained?: number
    xp?: Parameters<typeof mergeXpIntoUser>[1]
  }) {
    const wasMastered = mission?.status === 'mastered'
    setContext(result.context)
    setPhase(result.reply.phase)
    setMission(result.mission)
    if (result.mission.status === 'mastered' && !wasMastered) {
      showToast({
        tone: 'success',
        title: '¡Misión lista!',
        subtitle: 'Taskia confirma que ya sabes el tema',
      })
    }
    if (result.xp && result.xp_gained && result.xp_gained > 0) {
      const next = mergeXpIntoUser(user, result.xp)
      if (next) setUser(next)
      const copy = xpToastCopy(result.xp_gained)
      if (copy) showToast({ tone: 'success', ...copy })
    }
  }

  async function onSend(
    message: string,
    options: {
      fromVoice?: boolean
      photoBase64?: string | null
    },
  ) {
    setSending(true)
    setChatError(null)
    try {
      const result = await api.missionChat(
        missionId,
        message,
        Boolean(options.fromVoice),
        options.photoBase64 ?? null,
      )
      applyMissionResult(result)
      const saved = [...result.context.messages]
        .reverse()
        .find((message) => message.role === 'assistant')
      return saved?.content ?? ''
    } catch (err) {
      setChatError(errorMessage(err))
      throw err
    } finally {
      setSending(false)
    }
  }

  async function onVoiceTurn(input: {
    audioBase64: string
    mimeType: string
    durationSeconds: number
    photoBase64: string | null
  }) {
    setSending(true)
    setChatError(null)
    try {
      const result = await api.missionVoiceTurn({
        mission_id: missionId,
        audio_base64: input.audioBase64,
        mime_type: input.mimeType,
        duration_seconds: input.durationSeconds,
        photo_base64: input.photoBase64,
      })
      if (!result.understood) {
        return {
          transcript: result.transcript,
          understood: false as const,
        }
      }
      applyMissionResult(result)
      const saved = [...result.context.messages]
        .reverse()
        .find((message) => message.role === 'assistant')
      return {
        transcript: result.transcript,
        understood: true as const,
        replyText: saved?.content ?? result.reply.speak_to_child,
        audioBase64: result.audio_base64,
        mimeType: result.mime_type,
      }
    } catch (err) {
      setChatError(errorMessage(err))
      throw err
    } finally {
      setSending(false)
    }
  }

  async function onSaveEdit() {
    if (!mission) return
    setSavingEdit(true)
    try {
      const updated = await api.updateMission({
        mission_id: mission.id,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      })
      setMission(updated)
      setMode('study')
      showToast({
        tone: 'success',
        title: '¡Listo, guardamos el tema!',
        subtitle: updated.title,
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo guardar',
        subtitle: errorMessage(err),
      })
    } finally {
      setSavingEdit(false)
    }
  }

  if (loading) {
    return (
      <div className="study-page">
        <AppLoader message="Preparando tu estudio…" />
      </div>
    )
  }

  if (error || !mission) {
    return (
      <div className="study-page">
        <header className="study-header">
          <button type="button" className="ghost" onClick={onBack}>
            <ArrowLeft size={18} weight="bold" />
            Volver
          </button>
        </header>
        <p className="form-error banner">{error ?? 'No se pudo abrir la misión'}</p>
      </div>
    )
  }

  const studyContext = context
    ? {
        task_id: mission.id,
        updated_at: mission.updated_at,
        tutor_phase: context.tutor_phase as 'understanding' | 'practicing' | 'reviewing',
        topic_summary: context.topic_summary,
        context_summary: context.context_summary,
        hints_level: context.hints_level,
        messages: context.messages,
      }
    : null

  return (
    <div className="study-page">
      <header className="study-header">
        <button type="button" className="ghost" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Curso
        </button>
        <div className="study-header-main">
          <h1>{mission.title}</h1>
          <div className="study-header-tags">
            <span className="course-tag">{mission.course_name}</span>
            <WorldsStatusPill kind="mission" value={mission.status} />
          </div>
        </div>
        <div className="study-header-actions">
          <div className="study-mode-toggle" role="group" aria-label="Modo">
            <button
              type="button"
              className={mode === 'study' ? 'active' : ''}
              onClick={() => setMode('study')}
            >
              Estudiar
            </button>
            <button
              type="button"
              className={mode === 'edit' ? 'active' : ''}
              onClick={() => setMode('edit')}
            >
              Editar
            </button>
          </div>
        </div>
      </header>

      <div className="study-body">
      <AnimatePresence mode="wait">
        {mode === 'edit' ? (
          <motion.div
            key="edit"
            className="study-edit-layout worlds-mission-edit"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <TextField
              label="Título"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <TextAreaField
              label="Descripción"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
            />
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setMode('study')}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                disabled={savingEdit || !editTitle.trim()}
                onClick={() => void onSaveEdit()}
              >
                <FloppyDisk size={18} weight="fill" />
                {savingEdit ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="study"
            className="study-layout study-layout-chat-only"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <StudyChat
              context={studyContext}
              phase={phase}
              sending={sending}
              error={chatError}
              onSend={onSend}
              onVoiceTurn={onVoiceTurn}
            />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}
