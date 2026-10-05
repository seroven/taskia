import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Microphone, Stop, X } from '@phosphor-icons/react'
import { api } from '../../api'
import { compressStudyPhoto } from '../../lib/studyPhoto'
import { ModalShell } from '../ui/ModalShell'
import { errorMessage } from '../../lib/errors'
import type { StudyContext, StudyExercise, StudyMessage, TutorPhase } from '../../lib/studyProtocol'
import { phaseLabel } from '../../lib/studyProtocol'
import { MAX_VOICE_SECONDS, VoiceRecorder } from '../../lib/voiceRecorder'
import { useCompactStudyBoard } from './StudyBoardPane'

interface Props {
  context: StudyContext | null
  phase: TutorPhase | string
  exercise: StudyExercise | null
  sending: boolean
  error: string | null
  /** Si false, el estudio no usa pizarra y habilita el micrófono. Default true. */
  boardControls?: boolean
  boardOpen?: boolean
  onToggleBoardView?: () => void
  onThreadEl?: (el: HTMLDivElement | null) => void
  onSend: (
    message: string,
    options: {
      fromVoice?: boolean
      photoBase64?: string | null
    },
  ) => Promise<void>
}

/** Clave estable: el optimista y el mensaje confirmado del usuario comparten índice/contenido. */
function messageKey(message: StudyMessage, index: number) {
  if (message.role === 'user') {
    return `user-${index}-${message.content}`
  }
  return `assistant-${index}-${message.created_at}`
}

const bubbleEnter = { opacity: 0, y: 18, scale: 0.97 }
const bubbleShown = { opacity: 1, y: 0, scale: 1 }
const bubbleTransition = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 30,
  mass: 0.75,
}

function TypewriterText({
  text,
  active,
  onTick,
  onDone,
}: {
  text: string
  active: boolean
  onTick?: () => void
  onDone?: () => void
}) {
  const [shown, setShown] = useState(active ? '' : text)
  const onTickRef = useRef(onTick)
  const onDoneRef = useRef(onDone)
  onTickRef.current = onTick
  onDoneRef.current = onDone

  useEffect(() => {
    if (!active) {
      setShown(text)
      return
    }

    setShown('')
    let i = 0
    const delay = text.length > 220 ? 12 : text.length > 120 ? 16 : 22

    const id = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      onTickRef.current?.()
      if (i >= text.length) {
        window.clearInterval(id)
        onDoneRef.current?.()
      }
    }, delay)

    return () => window.clearInterval(id)
  }, [text, active])

  return (
    <p>
      {shown}
      {active && shown.length < text.length && (
        <span className="study-type-caret" aria-hidden />
      )}
    </p>
  )
}

function formatElapsed(seconds: number) {
  const s = Math.max(0, Math.min(MAX_VOICE_SECONDS, Math.floor(seconds)))
  const mm = String(Math.floor(s / 60)).padStart(1, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function StudyChat({
  context,
  phase,
  exercise,
  sending,
  error,
  boardControls = true,
  boardOpen = false,
  onToggleBoardView,
  onThreadEl,
  onSend,
}: Props) {
  const voiceEnabled = !boardControls
  const [draft, setDraft] = useState('')
  const [fromVoiceDraft, setFromVoiceDraft] = useState(false)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle')
  const [voiceElapsed, setVoiceElapsed] = useState(0)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voicePrompt, setVoicePrompt] = useState<'intro' | 'review' | null>(null)
  const [pendingVoiceText, setPendingVoiceText] = useState('')
  const [pendingUser, setPendingUser] = useState<string | null>(null)
  const [expectingReply, setExpectingReply] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const bootstrapped = useRef(false)
  const [instantKeys, setInstantKeys] = useState<Set<string>>(() => new Set())
  const [typingKey, setTypingKey] = useState<string | null>(null)
  const recorderRef = useRef(new VoiceRecorder())
  const tickRef = useRef<number | null>(null)
  const stoppingRef = useRef(false)

  const messages = context?.messages ?? []
  const displayMessages = useMemo(() => {
    if (!pendingUser) return messages
    const already = messages.some(
      (message) => message.role === 'user' && message.content === pendingUser,
    )
    if (already) return messages
    return [
      ...messages,
      {
        role: 'user',
        content: pendingUser,
        image_url: pendingPhoto,
        created_at: 'pending',
      },
    ]
  }, [messages, pendingUser, pendingPhoto])

  const lastAssistantIndex =
    messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'
      ? messages.length - 1
      : -1
  const lastAssistant =
    lastAssistantIndex >= 0 ? messages[lastAssistantIndex] : null
  const lastAssistantKey =
    lastAssistant != null
      ? messageKey(lastAssistant, lastAssistantIndex)
      : null
  const liveAssistant =
    lastAssistant != null &&
    lastAssistantKey != null &&
    !instantKeys.has(lastAssistantKey) &&
    (sending || expectingReply || typingKey === lastAssistantKey)
      ? {
          message: lastAssistant,
          index: lastAssistantIndex,
          key: lastAssistantKey,
        }
      : null
  const showThinking = sending && !liveAssistant
  const showLiveTaskia = showThinking || liveAssistant != null
  const listMessages = useMemo(() => {
    if (!liveAssistant) return displayMessages
    return displayMessages.filter((_, index) => index !== liveAssistant.index)
  }, [displayMessages, liveAssistant])

  const voiceBusy = voiceStatus !== 'idle' || voicePrompt !== null
  const compactBoard = useCompactStudyBoard()
  const showBoardViewToggle =
    Boolean(boardControls && onToggleBoardView) && compactBoard

  useEffect(() => {
    return () => {
      recorderRef.current.cancel()
      if (tickRef.current != null) window.clearInterval(tickRef.current)
    }
  }, [])

  useEffect(() => {
    if (voiceEnabled) return
    recorderRef.current.cancel()
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    setVoiceStatus('idle')
    setVoiceElapsed(0)
    setVoicePrompt(null)
    setPendingVoiceText('')
    stoppingRef.current = false
  }, [voiceEnabled])

  useEffect(() => {
    if (!context || bootstrapped.current) return
    bootstrapped.current = true

    if (messages.length === 1 && messages[0]?.role === 'assistant') {
      setTypingKey(messageKey(messages[0], 0))
      setInstantKeys(new Set())
      return
    }

    const keys = new Set(messages.map((m, i) => messageKey(m, i)))
    setInstantKeys(keys)
    setTypingKey(null)
  }, [context, messages])

  useEffect(() => {
    if (!pendingUser) return
    const confirmed = messages.some(
      (message) => message.role === 'user' && message.content === pendingUser,
    )
    if (confirmed) setPendingUser(null)
  }, [messages, pendingUser])

  useEffect(() => {
    if (!bootstrapped.current || messages.length === 0) return
    const lastIndex = messages.length - 1
    const last = messages[lastIndex]
    const key = messageKey(last, lastIndex)

    if (last.role !== 'assistant') return
    if (instantKeys.has(key) || typingKey === key) return

    setTypingKey(key)
  }, [messages, instantKeys, typingKey])

  const scrollToBottom = () => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  useEffect(() => {
    scrollToBottom()
  }, [listMessages, showLiveTaskia, showThinking, liveAssistant, typingKey])

  function clearVoiceTick() {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  async function finishRecording() {
    if (stoppingRef.current) return
    stoppingRef.current = true
    clearVoiceTick()
    setVoiceStatus('transcribing')
    setVoiceError(null)
    try {
      const recording = await recorderRef.current.stop()
      const result = await api.transcribeAudio({
        audio_base64: recording.audioBase64,
        mime_type: recording.mimeType,
        duration_seconds: recording.durationSeconds,
      })
      const text = result.text.trim()
      if (!text || text === '(no se entendió)') {
        setVoiceError('No te escuché bien. Acércate un poquito al micrófono e inténtalo otra vez.')
        setFromVoiceDraft(false)
        setPendingVoiceText('')
      } else {
        setPendingVoiceText(text)
        setFromVoiceDraft(true)
        setVoicePrompt('review')
        if (result.truncated) {
          setVoiceError(
            'Se cortó un poquito al final. Léelo y, si falta algo, grábala otra vez.',
          )
        }
      }
    } catch (err) {
      setVoiceError(errorMessage(err))
    } finally {
      setVoiceStatus('idle')
      setVoiceElapsed(0)
      stoppingRef.current = false
    }
  }

  async function startRecording() {
    if (sending || voiceStatus === 'recording' || voiceStatus === 'transcribing') return
    setVoiceError(null)
    stoppingRef.current = false
    try {
      setVoiceStatus('recording')
      setVoiceElapsed(0)
      const startedAt = Date.now()
      tickRef.current = window.setInterval(() => {
        setVoiceElapsed((Date.now() - startedAt) / 1000)
      }, 200)
      await recorderRef.current.start(() => {
        void finishRecording()
      })
    } catch (err) {
      clearVoiceTick()
      recorderRef.current.cancel()
      setVoiceStatus('idle')
      setVoiceElapsed(0)
      const msg = errorMessage(err)
      setVoiceError(
        /Permission|NotAllowed|permiso/i.test(msg)
          ? 'Necesitamos permiso del micrófono para que puedas hablar.'
          : msg,
      )
    }
  }

  function askToRecord() {
    if (sending || voiceBusy) return
    setVoiceError(null)
    if (draft.trim()) {
      void startRecording()
      return
    }
    setVoicePrompt('intro')
  }

  function addPendingVoiceToDraft() {
    const text = pendingVoiceText.trim()
    if (!text || sending) return
    setDraft((prev) => {
      const cur = prev.trim()
      return cur ? `${cur}\n\n${text}` : text
    })
    setFromVoiceDraft(true)
    setVoicePrompt(null)
    setPendingVoiceText('')
  }

  function dismissVoiceReview() {
    setVoicePrompt(null)
    setPendingVoiceText('')
  }

  function redoVoice() {
    setVoicePrompt(null)
    setPendingVoiceText('')
    setVoiceError(null)
    void startRecording()
  }

  function cancelRecording() {
    clearVoiceTick()
    recorderRef.current.cancel()
    setVoiceStatus('idle')
    setVoiceElapsed(0)
    stoppingRef.current = false
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    const photo = photoData
    if ((!text && !photo) || sending || voiceBusy || pendingUser) return
    const outgoing = text || 'Mira la foto de mi ejercicio.'
    const voice = fromVoiceDraft
    setDraft('')
    setFromVoiceDraft(false)
    setPhotoData(null)
    setPendingPhoto(photo)
    setPendingUser(outgoing)
    setExpectingReply(true)
    try {
      await onSend(outgoing, {
        fromVoice: voice,
        photoBase64: photo,
      })
      setPendingPhoto(null)
    } catch {
      setPendingUser(null)
      setPendingPhoto(null)
      setExpectingReply(false)
      setDraft(text)
      setPhotoData(photo)
      setFromVoiceDraft(voice)
    }
  }

  function onPastePhoto(event: ClipboardEvent<HTMLFormElement>) {
    if (sending || voiceBusy) return
    const data = event.clipboardData
    if (!data) return
    const fromFiles = Array.from(data.files).find((file) => file.type.startsWith('image/'))
    const fromItems = Array.from(data.items)
      .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile()
    const file = fromFiles ?? fromItems
    if (!file) return
    event.preventDefault()
    void onPickPhoto(file)
  }

  async function onPickPhoto(file: File | undefined) {
    setPhotoError(null)
    if (!file) return
    try {
      setPhotoData(await compressStudyPhoto(file))
    } catch (err) {
      setPhotoData(null)
      setPhotoError(err instanceof Error ? err.message : 'No pude usar esa foto.')
    }
  }

  return (
    <section className="study-chat">
      <div
        className="study-chat-stage"
        ref={(el) => {
          onThreadEl?.(el)
        }}
      >
      <div className="study-chat-meta">
        <span className="study-phase-pill">{phaseLabel(phase)}</span>
        {context?.topic_summary ? (
          <p className="study-topic-summary">{context.topic_summary}</p>
        ) : (
          <p className="study-topic-summary muted">
            Taskia ya tiene el título de la tarea y te espera.
          </p>
        )}
      </div>

      {exercise && (
        <div className="study-exercise">
          <strong>{exercise.title}</strong>
          <p>{exercise.instructions}</p>
        </div>
      )}

      <div className="study-chat-messages" ref={listRef}>
        {listMessages.length === 0 && !showLiveTaskia && (
          <p className="muted study-chat-empty">Escribe tu primer mensaje para empezar.</p>
        )}
        <AnimatePresence initial={false}>
          {listMessages.map((message, index) => {
            const key = messageKey(message, index)
            const skipEnter = instantKeys.has(key)

            return (
              <motion.div
                key={key}
                className={`study-bubble study-bubble-${message.role}`}
                initial={skipEnter ? false : bubbleEnter}
                animate={bubbleShown}
                transition={bubbleTransition}
                layout="position"
              >
                <span className="study-bubble-role">
                  {message.role === 'user' ? 'Tú' : 'Taskia'}
                </span>
                {message.image_url ? (
                  <img
                    className="study-bubble-photo"
                    src={message.image_url}
                    alt="Foto del ejercicio"
                  />
                ) : null}
                <p>{message.content}</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {showLiveTaskia ? (
          <motion.div
            key="taskia-live"
            className={`study-bubble study-bubble-assistant${showThinking ? ' is-typing' : ''}`}
            initial={bubbleEnter}
            animate={bubbleShown}
            transition={{
              ...bubbleTransition,
              delay: showThinking && pendingUser ? 0.12 : 0,
            }}
            layout="position"
          >
            <span className="study-bubble-role">Taskia</span>
            {showThinking || !liveAssistant ? (
              <p>
                Pensando
                <span className="study-thinking-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </p>
            ) : (
              <TypewriterText
                text={liveAssistant.message.content}
                active
                onTick={scrollToBottom}
                onDone={() => {
                  const key = liveAssistant.key
                  setInstantKeys((prev) => {
                    const next = new Set(prev)
                    next.add(key)
                    return next
                  })
                  setTypingKey((current) => (current === key ? null : current))
                  setExpectingReply(false)
                  scrollToBottom()
                }}
              />
            )}
          </motion.div>
        ) : null}
      </div>
      </div>

      {(error || photoError || (voiceError && voicePrompt !== 'review')) && (
        <p className="form-error">{error ?? photoError ?? voiceError}</p>
      )}

      <form className="study-chat-form" onSubmit={(e) => void onSubmit(e)} onPaste={onPastePhoto}>
        {voiceEnabled && (
          <div className="study-voice-bar">
            <AnimatePresence mode="wait" initial={false}>
              {voiceStatus === 'idle' && (
                <motion.button
                  key="idle"
                  type="button"
                  className="ghost study-voice-btn"
                  disabled={sending || voicePrompt !== null}
                  onClick={askToRecord}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Microphone size={18} weight="fill" />
                  Hablar del tema
                </motion.button>
              )}
              {voiceStatus === 'recording' && (
                <motion.div
                  key="recording"
                  className="study-voice-live-row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="study-voice-live">
                    <span className="study-voice-dot" aria-hidden />
                    Te estoy escuchando… {formatElapsed(voiceElapsed)} / 1:30
                  </span>
                  <button
                    type="button"
                    className="primary study-voice-btn"
                    onClick={() => void finishRecording()}
                  >
                    <Stop size={18} weight="fill" />
                    Listo
                  </button>
                  <button type="button" className="ghost study-voice-btn" onClick={cancelRecording}>
                    Cancelar
                  </button>
                </motion.div>
              )}
              {voiceStatus === 'transcribing' && (
                <motion.span
                  key="transcribing"
                  className="study-voice-live study-voice-transcribing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  role="status"
                >
                  <span className="study-voice-transcribe-dots" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  Pasando tu audio a palabras…
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        <input
          ref={photoInputRef}
          className="study-photo-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            void onPickPhoto(file)
          }}
        />
        {photoData ? (
          <div className="study-photo-preview">
            <img src={photoData} alt="Foto lista para enviar" />
            <button
              type="button"
              className="ghost study-photo-remove"
              disabled={sending || voiceBusy}
              onClick={() => setPhotoData(null)}
            >
              <X size={16} weight="bold" />
              Quitar foto
            </button>
          </div>
        ) : null}

        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (fromVoiceDraft) setFromVoiceDraft(true)
          }}
          placeholder={
            boardControls
              ? 'Escribe tu duda. Si quieres, pide que revise tu dibujo o que te dibuje el ejercicio.'
              : voiceEnabled
                ? 'Cuéntale a Taskia lo de tu tema. Puedes grabar varias veces, sumarlo aquí y enviar cuando esté listo.'
                : 'Escribe tu duda o lo que acabas de entender…'
          }
          rows={3}
          disabled={sending || voiceBusy}
        />
        {voiceEnabled && (
          <p className="muted study-voice-compose-hint">
            Taskia quiere conocer tu tema. Puedes grabar varias veces, sumar las palabras aquí y
            enviar cuando esté listo.
          </p>
        )}
        <div className="study-chat-send-row">
          <button
            type="button"
            className="ghost study-photo-btn"
            title="Adjuntar una foto o pegarla con Ctrl+V"
            disabled={sending || voiceBusy}
            onClick={() => photoInputRef.current?.click()}
          >
            <Camera size={18} weight="fill" />
            Foto
          </button>
          {showBoardViewToggle ? (
            <button
              type="button"
              className="ghost study-open-board-btn"
              disabled={sending || voiceBusy}
              onClick={onToggleBoardView}
            >
              {boardOpen ? 'Chat' : 'Pizarra'}
            </button>
          ) : null}
          <button
            type="submit"
            className={`primary study-send-btn${sending ? ' is-loading' : ''}`}
            disabled={sending || voiceBusy || (!draft.trim() && !photoData)}
            aria-busy={sending}
          >
          <AnimatePresence mode="wait" initial={false}>
            {sending ? (
              <motion.span
                key="loading"
                className="study-send-label"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="study-send-spinner" aria-hidden />
                Enviando…
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                className="study-send-label"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                Enviar
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        </div>
      </form>

      <KidAskDialog
        open={voicePrompt === 'intro'}
        titleId="study-voice-intro-title"
        title="¿Quieres contarle tu tema?"
        primaryLabel="Voy a hablar"
        secondaryLabel="Mejor escribo"
        onPrimary={() => {
          setVoicePrompt(null)
          void startRecording()
        }}
        onSecondary={() => setVoicePrompt(null)}
      >
        <p>
          Taskia quiere conocer tu tema con tus palabras. Puedes hablar un rato, revisar lo que
          se escribió y sumarlo abajo. Si no te alcanza, graba otra vez. Cuando esté todo, envíaselo
          con el botón de abajo.
        </p>
      </KidAskDialog>

      <KidAskDialog
        open={voicePrompt === 'review'}
        titleId="study-voice-review-title"
        title="¿Así se escuchó?"
        primaryLabel="Sumarlo abajo"
        secondaryLabel="Grabar otra vez"
        tertiaryLabel="Ahora no"
        primaryDisabled={!pendingVoiceText.trim()}
        onPrimary={addPendingVoiceToDraft}
        onSecondary={redoVoice}
        onTertiary={dismissVoiceReview}
      >
        <p>Revísalo y, si hace falta, corrígelo. Luego súmalo a la caja de abajo.</p>
        <textarea
          className="study-voice-transcript-input"
          value={pendingVoiceText}
          onChange={(e) => setPendingVoiceText(e.target.value)}
          rows={6}
          aria-label="Lo que se escuchó"
        />
        {voiceError && <p className="form-error">{voiceError}</p>}
      </KidAskDialog>
    </section>
  )
}

function KidAskDialog({
  open,
  titleId,
  title,
  children,
  primaryLabel,
  secondaryLabel,
  tertiaryLabel,
  onPrimary,
  onSecondary,
  onTertiary,
  busy = false,
  primaryDisabled = false,
}: {
  open: boolean
  titleId: string
  title: string
  children: ReactNode
  primaryLabel: string
  secondaryLabel: string
  tertiaryLabel?: string
  onPrimary: () => void
  onSecondary: () => void
  onTertiary?: () => void
  busy?: boolean
  primaryDisabled?: boolean
}) {
  return (
    <ModalShell
      open={open}
      titleId={titleId}
      title={title}
      size="sm"
      panelClassName="study-kid-dialog"
      backdropClassName="study-kid-dialog-backdrop"
      closeOnBackdrop={false}
    >
      <div className="modal-panel-body study-kid-dialog-body">{children}</div>
      <div className="modal-actions">
        {tertiaryLabel && onTertiary ? (
          <button
            type="button"
            className="ghost"
            onClick={onTertiary}
            disabled={busy}
          >
            {tertiaryLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="ghost"
          onClick={onSecondary}
          disabled={busy}
        >
          {secondaryLabel}
        </button>
        <button
          type="button"
          className="primary"
          onClick={onPrimary}
          disabled={busy || primaryDisabled}
        >
          {primaryLabel}
        </button>
      </div>
    </ModalShell>
  )
}
