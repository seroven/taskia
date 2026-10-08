import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'
import { api } from '../api'
import { AppLoader } from '../components/AppLoader'
import { StudyChat } from '../components/study/StudyChat'
import { TaskEditPanel } from '../components/study/TaskEditPanel'
import { errorMessage } from '../lib/errors'
import {
  type StudyContext,
  type TutorPhase,
} from '../lib/studyProtocol'
import { mergeXpIntoUser, xpToastCopy } from '../lib/xp'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import {
  canOpenStudyMode,
  type Course,
  type Difficulty,
  type Task,
} from '../types'

interface Props {
  taskId: number
  onBack: () => void
}

export function StudyPage({ taskId, onBack }: Props) {
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const [mode, setMode] = useState<'study' | 'edit'>('study')
  const [task, setTask] = useState<Task | null>(null)
  const [context, setContext] = useState<StudyContext | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [difficulties, setDifficulties] = useState<Difficulty[]>([])
  const [phase, setPhase] = useState<TutorPhase | string>('understanding')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [session, nextCourses, nextDifficulties] = await Promise.all([
          api.studyLoadSession(taskId),
          api.listCourses(),
          api.listDifficulties(),
        ])
        setTask(session.task)
        setContext(session.context)
        setPhase(session.context.tutor_phase)
        setCourses(nextCourses)
        setDifficulties(nextDifficulties)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [taskId])

  function applyStudyResult(result: {
    context: NonNullable<typeof context>
    reply: { phase: string }
    study_passed: boolean
    xp_gained?: number
    xp?: Parameters<typeof mergeXpIntoUser>[1]
  }) {
    setContext(result.context)
    setPhase(result.reply.phase)
    if (result.study_passed) {
      const justPassed = !task?.study_passed
      setTask((prev) => (prev ? { ...prev, study_passed: true } : prev))
      if (justPassed) {
        showToast({
          tone: 'success',
          title: '¡Ya puedes marcarla lista!',
          subtitle: 'Taskia confirma que ya sabes la tarea. Muévela a Listo.',
        })
      }
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
      const result = await api.studyChat(
        taskId,
        message,
        Boolean(options.fromVoice),
        options.photoBase64 ?? null,
      )
      applyStudyResult(result)
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
      const result = await api.studyVoiceTurn({
        task_id: taskId,
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
      applyStudyResult(result)
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

  if (loading) {
    return (
      <div className="study-page">
        <AppLoader message="Preparando tu estudio…" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="study-page">
        <header className="study-header">
          <button type="button" className="ghost" onClick={onBack}>
            ← Volver
          </button>
        </header>
        <p className="form-error banner">{error ?? 'No se pudo abrir el estudio'}</p>
      </div>
    )
  }

  return (
    <div className="study-page">
      <header className="study-header">
        <button type="button" className="ghost" onClick={onBack}>
          <ArrowLeft size={18} weight="bold" />
          Campamento
        </button>
        <div className="study-header-main">
          <h1>{task.title}</h1>
          <div className="study-header-tags">
            <span className="course-tag">{task.course_name}</span>
            <span className={`difficulty-tag difficulty-${task.difficulty_code}`}>
              {task.difficulty_name}
            </span>
            {task.study_passed && (
              <span className="study-passed-tag">Listo</span>
            )}
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
            className="study-edit-layout"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <TaskEditPanel
              task={task}
              courses={courses}
              difficulties={difficulties}
              onSave={async (input) => {
                const updated = await api.updateTask(input)
                setTask(updated)
                if (!canOpenStudyMode(updated)) {
                  onBack()
                }
                return updated
              }}
            />
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
              context={context}
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
