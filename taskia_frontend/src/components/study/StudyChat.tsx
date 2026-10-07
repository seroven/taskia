import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Camera, Microphone, Stop, X } from '@phosphor-icons/react'
import { api } from '../../api'
import { plainMathText } from '../../lib/plainMath'
import { compressStudyPhoto } from '../../lib/studyPhoto'
import { errorMessage } from '../../lib/errors'
import type { StudyContext, StudyExercise, StudyMessage, TutorPhase } from '../../lib/studyProtocol'
import { phaseLabel } from '../../lib/studyProtocol'
import { VoiceRecorder } from '../../lib/voiceRecorder'

interface Props {
  context: StudyContext | null
  phase: TutorPhase | string
  exercise: StudyExercise | null
  sending: boolean
  error: string | null
  onThreadEl?: (el: HTMLDivElement | null) => void
  onSend: (
    message: string,
    options: {
      fromVoice?: boolean
      photoBase64?: string | null
    },
  ) => Promise<string | void>
}

type VoiceStage = 'listening' | 'responding' | 'speaking' | 'ready'

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
const voiceBubbleEnter = { opacity: 0, y: 56 }
const voiceBubbleShown = { opacity: 1, y: 0 }
const voiceBubbleTransition = {
  duration: 0.55,
  ease: [0.22, 1, 0.36, 1] as const,
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

function imageFileFromClipboard(data: DataTransfer | null): File | undefined {
  if (!data) return
  const fromFiles = Array.from(data.files).find((file) => file.type.startsWith('image/'))
  if (fromFiles) return fromFiles
  return (
    Array.from(data.items)
      .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile() ?? undefined
  )
}

function formatElapsed(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  const mm = String(Math.floor(s / 60))
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function VoiceStageView({
  stage,
  elapsed,
  error,
  locked,
  turns,
  floor,
  liveKey,
  thinking,
  photo,
  photoError,
  onClose,
  onCircle,
  onAddPhoto,
  onClearPhoto,
}: {
  stage: VoiceStage
  elapsed: number
  error: string | null
  locked: boolean
  turns: StudyMessage[]
  floor: number
  liveKey: string | null
  thinking: boolean
  photo: string | null
  photoError: string | null
  onClose: () => void
  onCircle: () => void
  onAddPhoto: () => void
  onClearPhoto: () => void
}) {
  const reelRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [fades, setFades] = useState(false)
  const showReel = turns.length > 0 || thinking

  useEffect(() => {
    const reel = reelRef.current
    const track = trackRef.current
    if (!showReel || !reel || !track) return
    const measure = () => setFades(track.scrollHeight > reel.clientHeight + 4)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    observer.observe(reel)
    return () => observer.disconnect()
  }, [showReel])

  return (
    <div className={`study-voice-stage is-${stage}`}>
      <button type="button" className="ghost study-voice-close" onClick={onClose}>
        <X size={18} weight="bold" />
        Volver al chat
      </button>
      <div className="study-voice-photo">
        <button
          type="button"
          className="ghost study-voice-photo-btn"
          title="Adjuntar una foto o pegarla con Ctrl+V"
          onClick={onAddPhoto}
        >
          <Camera size={18} weight="fill" />
          Foto
        </button>
        {photo ? (
          <div className="study-voice-photo-chip">
            <img src={photo} alt="Foto lista para cuando hables" />
            <button type="button" className="ghost study-voice-photo-clear" onClick={onClearPhoto}>
              <X size={14} weight="bold" />
              Quitar
            </button>
            <p className="study-voice-photo-note">Se envía cuando hables</p>
          </div>
        ) : null}
        {photoError ? <p className="form-error">{photoError}</p> : null}
      </div>
      <div className="study-voice-main">
        <button
          type="button"
          className="study-voice-orb"
          disabled={locked}
          aria-label={stage === 'listening' ? 'Terminar y escuchar a Taskia' : 'Hablar'}
          onClick={onCircle}
        >
          <span className="study-voice-wave" aria-hidden />
          <span className="study-voice-wave" aria-hidden />
          <span className="study-voice-wave" aria-hidden />
          <span className="study-voice-orb-core">
            {stage === 'listening' ? <Stop size={36} weight="fill" /> : <Microphone size={36} weight="fill" />}
          </span>
        </button>
        <p className="study-voice-stage-label" role="status">
          {stage === 'listening'
            ? `Te estoy escuchando… ${formatElapsed(elapsed)}`
            : stage === 'responding'
              ? 'Taskia está pensando…'
              : stage === 'speaking'
                ? 'Taskia te responde…'
                : 'Toca el círculo para hablar'}
        </p>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
      {showReel ? (
        <div className={`study-voice-reel${fades ? ' is-faded' : ''}`} ref={reelRef}>
          <div className="study-voice-reel-track" ref={trackRef}>
            <AnimatePresence initial={false}>
              {turns.map((message, index) => {
                const key = messageKey(message, floor + index)
                const writing = key === liveKey
                return (
                  <motion.div
                    key={key}
                    className={`study-bubble study-bubble-${message.role}`}
                    initial={voiceBubbleEnter}
                    animate={voiceBubbleShown}
                    transition={voiceBubbleTransition}
                  >
                    <span className="study-bubble-role">
                      {message.role === 'user' ? 'Tú' : 'Taskia'}
                    </span>
                    {message.image_url ? (
                      <img className="study-bubble-photo" src={message.image_url} alt="Foto del ejercicio" />
                    ) : null}
                    {writing ? (
                      <TypewriterText text={plainMathText(message.content)} active />
                    ) : (
                      <p>
                        {message.role === 'assistant'
                          ? plainMathText(message.content)
                          : message.content}
                      </p>
                    )}
                  </motion.div>
                )
              })}
              {thinking ? (
                <motion.div
                  key="voice-thinking"
                  className="study-bubble study-bubble-assistant is-typing"
                  initial={voiceBubbleEnter}
                  animate={voiceBubbleShown}
                  transition={voiceBubbleTransition}
                >
                  <span className="study-bubble-role">Taskia</span>
                  <p>
                    Pensando
                    <span className="study-thinking-dots" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function StudyChat({
  context,
  phase,
  exercise,
  sending,
  error,
  onThreadEl,
  onSend,
}: Props) {
  const voiceEnabled = true
  const [draft, setDraft] = useState('')
  const [fromVoiceDraft, setFromVoiceDraft] = useState(false)
  const [photoData, setPhotoData] = useState<string | null>(null)
  const photoRef = useRef<string | null>(null)
  photoRef.current = photoData
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [voiceElapsed, setVoiceElapsed] = useState(0)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [voiceStage, setVoiceStage] = useState<VoiceStage | null>(null)
  const [micReady, setMicReady] = useState(false)
  const micReadyRef = useRef(false)
  const openingMicRef = useRef(false)
  const voiceFloorRef = useRef(0)
  const stageRef = useRef<VoiceStage | null>(null)
  const voiceTurnRef = useRef(0)
  const [pendingUser, setPendingUser] = useState<string | null>(null)
  const [expectingReply, setExpectingReply] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const bootstrapped = useRef(false)
  const [instantKeys, setInstantKeys] = useState<Set<string>>(() => new Set())
  const [typingKey, setTypingKey] = useState<string | null>(null)
  const recorderRef = useRef(new VoiceRecorder())
  const tickRef = useRef<number | null>(null)
  const stoppingRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCache = useRef(new Map<string, string>())
  const hearAfterVoice = useRef(false)
  const [hearingKey, setHearingKey] = useState<string | null>(null)

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

  const voiceBusy = voiceStage != null && voiceStage !== 'ready'
  const circleLocked = voiceStage === 'responding' || voiceStage === 'speaking'

  function setStage(next: VoiceStage | null) {
    stageRef.current = next
    setVoiceStage(next)
  }

  function setMic(ready: boolean) {
    micReadyRef.current = ready
    setMicReady(ready)
  }

  useEffect(() => {
    const cache = audioCache.current
    return () => {
      recorderRef.current.cancel()
      if (tickRef.current != null) window.clearInterval(tickRef.current)
      audioRef.current?.pause()
      for (const url of cache.values()) URL.revokeObjectURL(url)
    }
  }, [])

  async function hearText(key: string, text: string, force = false) {
    const spoken = text.trim()
    if (!spoken || (hearingKey && !force)) return false
    setHearingKey(key)
    setVoiceError(null)
    try {
      let url = audioCache.current.get(key)
      if (!url) {
        const result = await api.speakText(spoken)
        if (force && stageRef.current == null) {
          setHearingKey((current) => (current === key ? null : current))
          return false
        }
        const binary = atob(result.audio_base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
        url = URL.createObjectURL(new Blob([bytes], { type: result.mime_type || 'audio/wav' }))
        audioCache.current.set(key, url)
      }
      if (force && stageRef.current == null) {
        setHearingKey((current) => (current === key ? null : current))
        return false
      }
      audioRef.current?.pause()
      const audio = new Audio(url)
      audioRef.current = audio
      await new Promise<void>((resolve, reject) => {
        let settled = false
        let started = false
        const finish = () => {
          if (settled) return
          settled = true
          setHearingKey((current) => (current === key ? null : current))
          resolve()
        }
        audio.onplay = () => {
          started = true
        }
        audio.onended = finish
        audio.onpause = () => {
          if (started) finish()
        }
        audio.onerror = () => {
          if (settled) return
          settled = true
          reject(new Error('No se pudo reproducir la voz'))
        }
        void audio.play().catch((err: unknown) => {
          if (settled) return
          settled = true
          reject(err instanceof Error ? err : new Error('No se pudo reproducir la voz'))
        })
      })
      return true
    } catch (err) {
      setVoiceError(errorMessage(err))
      setHearingKey((current) => (current === key ? null : current))
      return false
    }
  }

  useEffect(() => {
    if (!zoomSrc) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomSrc(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomSrc])

  useEffect(() => {
    if (voiceEnabled) return
    recorderRef.current.cancel()
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
    setVoiceElapsed(0)
    setStage(null)
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

  function closeVoiceStage() {
    voiceTurnRef.current += 1
    clearVoiceTick()
    recorderRef.current.cancel()
    audioRef.current?.pause()
    setVoiceElapsed(0)
    setVoiceError(null)
    stoppingRef.current = false
    setMic(false)
    setStage(null)
  }

  function openVoiceStage() {
    if (sending || stageRef.current != null) return
    voiceFloorRef.current = messages.length
    setVoiceError(null)
    setStage('ready')
  }

  async function beginListening() {
    const stageAtOpen = stageRef.current
    if (circleLocked || stageAtOpen === 'listening' || openingMicRef.current) return
    openingMicRef.current = true
    if (stageAtOpen == null) voiceFloorRef.current = messages.length
    setVoiceError(null)
    stoppingRef.current = false
    setMic(false)
    setStage('listening')
    try {
      setVoiceElapsed(0)
      const startedAt = Date.now()
      tickRef.current = window.setInterval(() => {
        setVoiceElapsed((Date.now() - startedAt) / 1000)
      }, 200)
      await recorderRef.current.start()
      if (stageRef.current !== 'listening') {
        recorderRef.current.cancel()
        setMic(false)
        return
      }
      setMic(true)
    } catch (err) {
      clearVoiceTick()
      recorderRef.current.cancel()
      setVoiceElapsed(0)
      setStage('ready')
      const msg = errorMessage(err)
      setVoiceError(
        /Permission|NotAllowed|permiso/i.test(msg)
          ? 'Necesitamos permiso del micrófono para que puedas hablar.'
          : msg,
      )
    } finally {
      openingMicRef.current = false
    }
  }

  function voiceTurnOpen(turn: number) {
    return voiceTurnRef.current === turn && stageRef.current != null
  }

  async function finishCircleTurn() {
    const stageAtTap = stageRef.current
    if (stoppingRef.current || stageAtTap !== 'listening' || !micReadyRef.current) return
    const turn = voiceTurnRef.current
    stoppingRef.current = true
    clearVoiceTick()
    setVoiceError(null)
    setStage('responding')
    let sentPhoto: string | null = null
    try {
      const recording = await recorderRef.current.stop()
      if (!voiceTurnOpen(turn)) return
      const result = await api.transcribeAudio({
        audio_base64: recording.audioBase64,
        mime_type: recording.mimeType,
        duration_seconds: recording.durationSeconds,
      })
      if (!voiceTurnOpen(turn)) return
      const text = result.text.trim()
      if (!text || text === '(no se entendió)') {
        setVoiceError('No te escuché bien. Acércate un poquito al micrófono e inténtalo otra vez.')
        setStage('ready')
        return
      }
      hearAfterVoice.current = false
      sentPhoto = photoRef.current
      setPhotoData(null)
      photoRef.current = null
      setPendingPhoto(sentPhoto)
      setPendingUser(text)
      setExpectingReply(true)
      const spoken = await onSend(text, { fromVoice: true, photoBase64: sentPhoto })
      setPendingPhoto(null)
      if (!voiceTurnOpen(turn)) return
      const reply = String(spoken ?? '').trim()
      if (!reply) {
        setStage('ready')
        return
      }
      setStage('speaking')
      const heard = await hearText(
        `circle-${reply.slice(0, 80)}`,
        plainMathText(reply).slice(0, 1600),
        true,
      )
      if (!voiceTurnOpen(turn)) return
      if (!heard && stageRef.current === 'speaking') {
        setVoiceError('No pude leer la respuesta. Puedes volver a hablar.')
      }
      setStage('ready')
    } catch (err) {
      if (!voiceTurnOpen(turn)) return
      setPendingUser(null)
      setPendingPhoto(null)
      setExpectingReply(false)
      if (sentPhoto) {
        photoRef.current = sentPhoto
        setPhotoData(sentPhoto)
      }
      setVoiceError(errorMessage(err))
      setStage('ready')
    } finally {
      if (voiceTurnRef.current === turn) {
        setVoiceElapsed(0)
        stoppingRef.current = false
      }
    }
  }

  function onCircleClick() {
    if (circleLocked) return
    if (stageRef.current === 'listening') {
      void finishCircleTurn()
      return
    }
    void beginListening()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    const photo = photoData
    if ((!text && !photo) || sending || voiceBusy || pendingUser) return
    const outgoing = text || 'Mira la foto de mi ejercicio.'
    const voice = fromVoiceDraft
    hearAfterVoice.current = voice
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
      hearAfterVoice.current = false
      setDraft(text)
      setPhotoData(photo)
      setFromVoiceDraft(voice)
    }
  }

  function onPastePhoto(event: ClipboardEvent<HTMLFormElement>) {
    if (sending || voiceBusy) return
    const file = imageFileFromClipboard(event.clipboardData)
    if (!file) return
    event.preventDefault()
    void onPickPhoto(file)
  }

  useEffect(() => {
    if (!voiceStage) return
    const onPaste = (event: globalThis.ClipboardEvent) => {
      const file = imageFileFromClipboard(event.clipboardData)
      if (!file) return
      event.preventDefault()
      void onPickPhoto(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [voiceStage])

  async function onPickPhoto(file: File | undefined) {
    setPhotoError(null)
    if (!file) return
    try {
      const next = await compressStudyPhoto(file)
      photoRef.current = next
      setPhotoData(next)
    } catch (err) {
      photoRef.current = null
      setPhotoData(null)
      setPhotoError(err instanceof Error ? err.message : 'No pude usar esa foto.')
    }
  }

  return (
    <section className={`study-chat${voiceStage ? ' is-voice' : ''}`}>
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
                  <button
                    type="button"
                    className="study-bubble-photo-btn"
                    onClick={() => setZoomSrc(message.image_url ?? null)}
                    aria-label="Ver la foto en grande"
                  >
                    <img
                      className="study-bubble-photo"
                      src={message.image_url}
                      alt="Foto del ejercicio"
                    />
                  </button>
                ) : null}
                <p>{message.role === 'assistant' ? plainMathText(message.content) : message.content}</p>
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
                text={plainMathText(liveAssistant.message.content)}
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
                  if (hearAfterVoice.current) {
                    hearAfterVoice.current = false
                    void hearText(key, plainMathText(liveAssistant.message.content).slice(0, 1600))
                  }
                }}
              />
            )}
          </motion.div>
        ) : null}
      </div>
      </div>

      {voiceStage ? (
        <VoiceStageView
          stage={voiceStage}
          elapsed={voiceElapsed}
          error={voiceError}
          locked={circleLocked || (voiceStage === 'listening' && !micReady)}
          turns={displayMessages.slice(voiceFloorRef.current)}
          floor={voiceFloorRef.current}
          liveKey={
            liveAssistant != null && liveAssistant.index >= voiceFloorRef.current
              ? liveAssistant.key
              : null
          }
          thinking={showThinking}
          photo={photoData}
          photoError={photoError}
          onClose={closeVoiceStage}
          onCircle={onCircleClick}
          onAddPhoto={() => photoInputRef.current?.click()}
          onClearPhoto={() => {
            photoRef.current = null
            setPhotoData(null)
          }}
        />
      ) : null}

      {(error || photoError) && !voiceStage && (
        <p className="form-error">{error ?? photoError}</p>
      )}

      <form className="study-chat-form" onSubmit={(e) => void onSubmit(e)} onPaste={onPastePhoto}>
        {voiceEnabled && (
          <div className="study-voice-bar">
            <button
              type="button"
              className="ghost study-voice-btn"
              disabled={sending}
              onClick={openVoiceStage}
            >
              <Microphone size={18} weight="fill" />
              Hablar
            </button>
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
          placeholder="Escríbele a Taskia, o pulsa Hablar."
          rows={3}
          disabled={sending || voiceBusy}
        />
        {voiceEnabled && (
          <p className="muted study-voice-compose-hint">
            Pulsa Hablar, sube la foto si quieres y toca el círculo cuando empieces a hablar.
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

      {zoomSrc
        ? createPortal(
            <div
              className="study-photo-zoom"
              role="dialog"
              aria-modal="true"
              aria-label="Foto en grande"
              onClick={() => setZoomSrc(null)}
            >
              <img src={zoomSrc} alt="Foto en grande" onClick={(event) => event.stopPropagation()} />
            </div>,
            document.body,
          )
        : null}

    </section>
  )
}
