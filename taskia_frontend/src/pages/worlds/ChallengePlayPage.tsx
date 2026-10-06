import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  CaretLeft,
  PaperPlaneTilt,
  Question,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { EmptyState } from '../../components/EmptyState'
import { GridBoard, type GridBoardHandle } from '../../components/study/GridBoard'
import { ChallengeReviewAnswersList } from '../../components/worlds/ChallengeReviewAnswersList'
import { WorldsHero } from '../../components/worlds/WorldsHero'
import { WorldsNav } from '../../components/worlds/WorldsNav'
import { ExplorerXpBar } from '../../components/ExplorerXpBar'
import { challengeDifficultyIcon } from '../../components/worlds/worldsIcons'
import { errorMessage } from '../../lib/errors'
import { type BoardSheet, type StudyBoardScene } from '../../lib/studyProtocol'
import { applySheet, emptyGridScene, hasStudentWork, normalizeScene } from '../../lib/gridBoardModel'
import { compressStudyPhoto } from '../../lib/studyPhoto'
import {
  DIFFICULTY_LABEL,
  type ChallengeAnswerPayload,
  type ChallengeDetail,
  type ChallengeQuestionPublic,
} from '../../lib/worldsTypes'
import { mergeXpIntoUser, xpToastCopy } from '../../lib/xp'
import { useAuth } from '../../auth'
import { useTheme } from '../../theme'
import { useToast } from '../../toast'

interface Props {
  challengeId: number
  onBack: () => void
}

function reviewCheer(correct: number, total: number) {
  if (total === 0) return '¡Listo!'
  const ratio = correct / total
  if (ratio >= 0.8) return '¡Genial!'
  if (ratio >= 0.5) return '¡Buen intento!'
  return '¡Seguí practicando!'
}

const EMPTY_BOARD: StudyBoardScene = emptyGridScene()

function asBoardScene(raw: unknown): StudyBoardScene {
  return normalizeScene(raw)
}

function hasUserBoardWork(scene: StudyBoardScene | null | undefined) {
  return hasStudentWork(scene)
}

function isBoardQuestion(q: Pick<ChallengeQuestionPublic, 'kind' | 'requires_board'>) {
  return q.kind === 'board_prompt' || q.requires_board
}

function sheetFromOps(raw: unknown): BoardSheet | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const rec = raw as Record<string, unknown>
  if (typeof rec.text === 'string' && rec.text.trim()) return { text: rec.text }
  if (typeof rec.imageSrc === 'string' && rec.imageSrc.trim()) return { imageSrc: rec.imageSrc }
  return null
}

function promptSceneFor(q: ChallengeQuestionPublic): StudyBoardScene {
  const sheet = sheetFromOps(q.prompt_draw_ops)
  if (!sheet) return emptyGridScene()
  return applySheet(emptyGridScene(), sheet)
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

export function ChallengePlayPage({ challengeId, onBack }: Props) {
  const { theme } = useTheme()
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const [detail, setDetail] = useState<ChallengeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  // Solo el fallo al abrir el desafío. Lo que falta responder se avisa por toast.
  const [loadError, setLoadError] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [grading, setGrading] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [pending, setPending] = useState<Record<number, ChallengeAnswerPayload>>({})
  const [showResult, setShowResult] = useState(false)
  const [clockMs, setClockMs] = useState(0)
  const boardRef = useRef<GridBoardHandle>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const elapsedBase = useRef(0)
  const runningFrom = useRef<number | null>(null)
  const cursorRef = useRef(0)
  const pendingRef = useRef(pending)
  const doneRef = useRef(false)

  const isCompleted =
    showResult || detail?.challenge.status === 'completed'
  cursorRef.current = cursor
  pendingRef.current = pending
  doneRef.current = isCompleted

  function readElapsed() {
    const extra = runningFrom.current != null ? Date.now() - runningFrom.current : 0
    return elapsedBase.current + extra
  }

  function freezeClock(paint = true) {
    if (runningFrom.current != null) {
      elapsedBase.current += Date.now() - runningFrom.current
      runningFrom.current = null
    }
    if (paint) setClockMs(elapsedBase.current)
  }

  function resumeClock() {
    if (document.visibilityState !== 'visible' || doneRef.current) return
    if (runningFrom.current == null) runningFrom.current = Date.now()
  }

  async function persistProgress(freeze = false) {
    if (doneRef.current) return
    if (freeze) freezeClock(false)
    else {
      elapsedBase.current = readElapsed()
      if (runningFrom.current != null) runningFrom.current = Date.now()
    }
    try {
      await api.saveChallengeProgress(challengeId, {
        elapsed_ms: elapsedBase.current,
        cursor: cursorRef.current,
        answers: Object.values(pendingRef.current).map((answer) => ({
          question_id: answer.question_id,
          user_answer: answer.user_answer,
          board_json: answer.board_json,
          board_description: answer.board_description,
          notebook_image_base64: answer.notebook_image_base64,
        })),
      })
    } catch {
      // ignore
    }
  }

  async function leaveChallenge() {
    if (!doneRef.current) await persistProgress(true)
    onBack()
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const next = await api.getChallenge(challengeId)
        setDetail(next)
        elapsedBase.current = next.challenge.elapsed_ms ?? 0
        runningFrom.current = document.visibilityState === 'visible' ? Date.now() : null
        setClockMs(elapsedBase.current)
        if (next.challenge.status === 'completed') {
          setShowResult(true)
        } else {
          const saved = next.progress
          const map: Record<number, ChallengeAnswerPayload> = {}
          for (const answer of saved?.answers ?? []) map[answer.question_id] = answer
          const nextCursor = Math.min(
            Math.max(0, saved?.cursor ?? 0),
            Math.max(0, next.questions.length - 1),
          )
          setPending(map)
          setCursor(nextCursor)
          const q = next.questions[nextCursor]
          if (q) applySaved(q, map[q.id])
        }
      } catch (err) {
        setLoadError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [challengeId])

  useEffect(() => {
    if (loading || isCompleted) return
    resumeClock()
    const id = window.setInterval(() => setClockMs(readElapsed()), 1000)
    function onVis() {
      if (document.visibilityState === 'hidden') void persistProgress(true)
      else resumeClock()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
      if (!doneRef.current) void persistProgress(true)
    }
  }, [loading, isCompleted, challengeId])

  const questions = detail?.questions ?? []
  const current = !showResult && questions.length > 0 ? questions[cursor] ?? null : null
  const isLast = cursor >= questions.length - 1

  const progress = useMemo(() => {
    const total = questions.length
    const answeredLocal = Object.keys(pending).length
    return {
      answered: answeredLocal,
      total,
      currentIndex: showResult ? total : Math.min(cursor + 1, total),
      ratio: total > 0 ? (cursor + 1) / total : 0,
      label: total > 0 ? `${Math.min(cursor + 1, total)}/${total}` : '0/0',
    }
  }, [questions.length, pending, cursor, showResult])

  function applySaved(
    q: ChallengeQuestionPublic,
    saved?: ChallengeAnswerPayload,
  ) {
    if (!saved) {
      setAnswer('')
      setSelectedOption(null)
      return
    }
    if (q.kind === 'multiple_choice' && q.options && q.options.length >= 2) {
      setSelectedOption(saved.user_answer)
      setAnswer('')
      return
    }
    setSelectedOption(null)
    setAnswer(
      saved.user_answer === '(respuesta en pizarra)' ? '' : saved.user_answer,
    )
  }

  async function captureCurrent(): Promise<ChallengeAnswerPayload | null> {
    if (!current) return null
    const isMc =
      current.kind === 'multiple_choice' &&
      Boolean(current.options && current.options.length >= 2)
    if (isMc) {
      if (!selectedOption) return pending[current.id] ?? null
      return { question_id: current.id, user_answer: selectedOption }
    }
    if (isBoardQuestion(current)) {
      const boardJson =
        boardRef.current?.getScene() ?? pending[current.id]?.board_json
      const attach = await boardRef.current?.getBoardAttachment()
      const note = answer.trim()
      const photoNote = pending[current.id]?.notebook_image_base64 ?? ''
      const scene = asBoardScene(boardJson)
      if (!hasUserBoardWork(scene) && !note && !photoNote) return pending[current.id] ?? null
      return {
        question_id: current.id,
        user_answer: note || (photoNote ? '(respuesta en el cuaderno)' : '(respuesta en pizarra)'),
        board_json: boardJson,
        notebook_image_base64: photoNote,
        ...(attach?.imageBase64
          ? { board_image_base64: attach.imageBase64 }
          : { board_description: attach?.description }),
      }
    }
    if (!answer.trim()) return pending[current.id] ?? null
    return { question_id: current.id, user_answer: answer.trim() }
  }

  async function goTo(index: number) {
    if (!current || submitting || grading || index < 0 || index >= questions.length) return
    const snap = await captureCurrent()
    const nextPending = snap ? { ...pending, [current.id]: snap } : pending
    if (snap) setPending(nextPending)
    pendingRef.current = nextPending
    cursorRef.current = index
    applySaved(questions[index]!, nextPending[questions[index]!.id])
    setCursor(index)
    void persistProgress()
  }

  async function onSubmit() {
    if (!current || submitting || grading || !detail) return
    setSubmitting(true)
    try {
      let userAnswer = answer.trim()
      let boardJson: StudyBoardScene | null = null
      let boardDescription: string | undefined
      let boardImage: string | undefined

      if (
        current.kind === 'multiple_choice' &&
        current.options &&
        current.options.length >= 2
      ) {
        if (!selectedOption) {
          showToast({
            title: 'Elige una opción',
            subtitle: 'Marca una respuesta para seguir.',
            tone: 'warning',
          })
          setSubmitting(false)
          return
        }
        userAnswer = selectedOption
      } else if (isBoardQuestion(current)) {
        boardJson = boardRef.current?.getScene() ?? null
        const attach = await boardRef.current?.getBoardAttachment()
        const photoNote = pending[current.id]?.notebook_image_base64 ?? ''
        if (!hasUserBoardWork(asBoardScene(boardJson)) && !userAnswer && !photoNote) {
          showToast({
            title: 'Falta tu respuesta',
            subtitle: 'Escribe en la pizarra, deja una nota o manda una foto del cuaderno.',
            tone: 'warning',
          })
          setSubmitting(false)
          return
        }
        userAnswer = userAnswer || (photoNote ? '(respuesta en el cuaderno)' : '(respuesta en pizarra)')
        if (attach?.imageBase64) {
          boardImage = attach.imageBase64
        } else {
          boardDescription = attach?.description
        }
      } else if (!userAnswer) {
        showToast({
          title: 'Escribe tu respuesta',
          subtitle: 'La respuesta no puede quedar vacía.',
          tone: 'warning',
        })
        setSubmitting(false)
        return
      }

      const nextPending: Record<number, ChallengeAnswerPayload> = {
        ...pending,
        [current.id]: {
          question_id: current.id,
          user_answer: userAnswer,
          board_json: boardJson,
          board_description: boardDescription,
          board_image_base64: boardImage,
          notebook_image_base64: pending[current.id]?.notebook_image_base64,
        },
      }
      setPending(nextPending)
      pendingRef.current = nextPending

      if (!isLast) {
        const nextQ = questions[cursor + 1]
        if (nextQ) applySaved(nextQ, nextPending[nextQ.id])
        cursorRef.current = cursor + 1
        setCursor((c) => c + 1)
        void persistProgress()
        return
      }

      const missing = questions.find((q) => !nextPending[q.id])
      if (missing) {
        const idx = questions.findIndex((q) => q.id === missing.id)
        applySaved(questions[idx]!, nextPending[questions[idx]!.id])
        setCursor(idx)
        showToast({
          title: 'Falta una pregunta',
          subtitle: `Te llevamos a la pregunta ${idx + 1} para que la respondas.`,
          tone: 'warning',
        })
        return
      }

      setGrading(true)
      doneRef.current = true
      freezeClock()
      const payload = questions.map((q) => nextPending[q.id]!)
      const completed = await api.completeChallenge(challengeId, payload, elapsedBase.current)
      setDetail(completed)
      setShowResult(true)
      if (completed.xp && completed.xp_gained && completed.xp_gained > 0) {
        const next = mergeXpIntoUser(user, completed.xp)
        if (next) setUser(next)
        const copy = xpToastCopy(completed.xp_gained)
        if (copy) showToast({ tone: 'success', ...copy })
      }
    } catch (err) {
      showToast({
        title: 'No se pudo enviar',
        subtitle: errorMessage(err) || 'Intenta de nuevo en un momento.',
        tone: 'error',
      })
    } finally {
      setSubmitting(false)
      setGrading(false)
    }
  }

  if (loading) {
    return (
      <div className="worlds-shell">
        <AppLoader message="Cargando desafío…" />
      </div>
    )
  }

  if (loadError && !detail) {
    return (
      <div className="worlds-shell">
        <WorldsNav
          backLabel="Volver"
          onBack={() => void leaveChallenge()}
          showAppearance={false}
        />
        <p className="form-error banner">{loadError}</p>
      </div>
    )
  }

  if (showResult && detail) {
    const score = detail.challenge.score ?? 0
    const correct = detail.questions.filter((q) => q.is_correct).length
    const total = detail.questions.length
    const ratioPct = total > 0 ? Math.round((correct / total) * 100) : 0
    const DiffIcon = challengeDifficultyIcon(detail.challenge.difficulty)
    const cheer = reviewCheer(correct, total)
    const showDots = total > 0 && total <= 24

    function scrollToQuestion(id: number) {
      document.getElementById(`review-q-${id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }

    return (
      <div className="worlds-shell challenge-review">
        <WorldsNav backLabel="Volver" onBack={onBack} />

        <div className="worlds-content worlds-stage challenge-review-layout">
          <motion.div
            className="challenge-play-enter"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
          <header className="challenge-review-summary">
            <p className="challenge-review-cheer">{cheer}</p>
            <div
              className="challenge-review-scorecard"
              aria-label={`${correct} de ${total} bien. ${score} puntos`}
            >
              <div
                className="challenge-review-ring"
                style={{ ['--pct' as string]: `${ratioPct}%` }}
                aria-hidden
              >
                <div className="challenge-review-ring-inner">
                  <strong>{correct}</strong>
                  <span>de {total}</span>
                </div>
              </div>
              <div className="challenge-review-score-text">
                <p className="challenge-review-count-label">respuestas bien</p>
                <p className="challenge-review-meta">
                  <span>{score} pts</span>
                  <span className="challenge-review-diff-pill">
                    <DiffIcon size={14} weight="duotone" />
                    {DIFFICULTY_LABEL[detail.challenge.difficulty] ??
                      detail.challenge.difficulty}
                  </span>
                </p>
                {showDots && (
                  <div className="challenge-review-dots" role="list" aria-label="Resultado por pregunta">
                    {detail.questions.map((q, index) => {
                      const ok = Boolean(q.is_correct)
                      return (
                        <button
                          key={q.id}
                          type="button"
                          role="listitem"
                          className={`challenge-review-dot${ok ? ' is-ok' : ' is-bad'}`}
                          aria-label={`Pregunta ${index + 1}: ${ok ? 'bien' : 'para practicar'}`}
                          onClick={() => scrollToQuestion(q.id)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </header>

          <section className="challenge-review-answers-panel" aria-label="Preguntas">
            <div className="challenge-review-scroll">
              <ChallengeReviewAnswersList
                questions={detail.questions}
                scope={detail.challenge.scope}
                itemIdPrefix="review-q-"
              />
            </div>
          </section>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!detail || !current) {
    return (
      <div className="worlds-shell">
        <WorldsNav
          backLabel="Volver"
          onBack={() => void leaveChallenge()}
          showAppearance={false}
        />
        <div className="worlds-content">
          <EmptyState
            icon={Question}
            title="Sin preguntas"
            description="No hay más preguntas en este desafío."
          />
        </div>
      </div>
    )
  }

  const DiffIcon = challengeDifficultyIcon(detail.challenge.difficulty)
  const isWorldChallenge = detail.challenge.scope === 'world'
  const prevCourseName =
    cursor > 0 ? questions[cursor - 1]?.course_name : null
  const courseJustChanged =
    isWorldChallenge &&
    Boolean(current.course_name) &&
    current.course_name !== prevCourseName
  const currentBoard = isBoardQuestion(current)
    ? pending[current.id]?.board_json
      ? asBoardScene(pending[current.id]?.board_json)
      : promptSceneFor(current)
    : EMPTY_BOARD

    return (
    <div
      className={`worlds-shell challenge-play${isBoardQuestion(current) ? ' challenge-play--board' : ''}`}
    >
      <WorldsNav
        backLabel="Salir"
        onBack={() => void leaveChallenge()}
        trailing={<ExplorerXpBar />}
      />

      <div className="worlds-content worlds-stage">
        <motion.div
          className="challenge-play-enter"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
        <WorldsHero
          compact
          icon={DiffIcon}
          title="Desafío"
          lead={
            <>
              {DIFFICULTY_LABEL[detail.challenge.difficulty] ?? detail.challenge.difficulty} ·{' '}
              {progress.label}
              {' · '}
              <span className="challenge-clock">{formatClock(clockMs)}</span>
            </>
          }
        />

        <div className="challenge-play-body">
          <div className="challenge-play-top">
          <div
            className="worlds-progress"
            role="progressbar"
            aria-valuenow={progress.currentIndex}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-label="Progreso del desafío"
          >
            <div className="worlds-progress-bar" style={{ width: `${progress.ratio * 100}%` }} />
          </div>
          <div className="worlds-progress-steps">
            {questions.map((q, i) => {
              const done = pending[q.id] != null
              const active = i === cursor
              return (
                <button
                  key={q.id}
                  type="button"
                  className={`worlds-progress-dot${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
                  aria-label={`Ir a la pregunta ${i + 1}`}
                  disabled={submitting || grading}
                  onClick={() => void goTo(i)}
                />
              )
            })}
          </div>

          {isWorldChallenge && current.course_name && (
            <p
              className={`challenge-course-chip${courseJustChanged ? ' is-new' : ''}`}
            >
              {courseJustChanged ? 'Ahora: ' : ''}
              {current.course_name}
            </p>
          )}

          <p className="challenge-prompt">{current.prompt}</p>

          {current.kind === 'multiple_choice' &&
            current.options &&
            current.options.length >= 2 && (
              <div className="challenge-options worlds-choice" role="group">
                {current.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i)
                  const value = letter
                  return (
                    <button
                      key={opt + i}
                      type="button"
                      className={`challenge-option worlds-choice-btn${selectedOption === value ? ' is-selected' : ''}`}
                      onClick={() => setSelectedOption(value)}
                      disabled={submitting || grading}
                    >
                      <strong className="worlds-choice-letter">{letter}</strong>
                      <span>{opt.replace(/^[A-D][).:\-]\s*/i, '')}</span>
                    </button>
                  )
                })}
              </div>
            )}

          {(current.kind === 'short_text' ||
            current.kind === 'fill_blank' ||
            (current.kind === 'multiple_choice' &&
              !(current.options && current.options.length >= 2))) && (
            <input
              className="field-control challenge-text-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={
                current.kind === 'multiple_choice'
                  ? 'Escribe tu respuesta'
                  : 'Tu respuesta'
              }
              disabled={submitting || grading}
            />
          )}

          {isBoardQuestion(current) && (
            <input
              className="field-control challenge-text-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Opcional: una nota sobre tu respuesta"
              disabled={submitting || grading}
            />
          )}

          <div className="challenge-play-actions">
            <button
              type="button"
              className="ghost"
              disabled={submitting || grading || cursor === 0}
              onClick={() => void goTo(cursor - 1)}
            >
              <CaretLeft size={18} weight="bold" />
              Anterior
            </button>
            <button
              type="button"
              className="primary"
              disabled={submitting || grading}
              onClick={() => void onSubmit()}
            >
              <PaperPlaneTilt size={18} weight="fill" />
              {isLast ? '¡Ya terminé!' : 'Siguiente'}
            </button>
          </div>
          </div>

          {isBoardQuestion(current) && (
            <div className="challenge-notebook">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file || !current) return
                  void compressStudyPhoto(file)
                    .then((data) => {
                      setPending((prev) => ({
                        ...prev,
                        [current.id]: {
                          ...(prev[current.id] ?? {
                            question_id: current.id,
                            user_answer: '',
                          }),
                          notebook_image_base64: data,
                        },
                      }))
                    })
                    .catch((err) => {
                      showToast({
                        title: 'No se pudo leer la foto',
                        subtitle: errorMessage(err),
                        tone: 'warning',
                      })
                    })
                }}
              />
              <button
                type="button"
                className="ghost"
                disabled={submitting || grading}
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera size={18} weight="fill" />
                Foto del cuaderno
              </button>
              {pending[current.id]?.notebook_image_base64 ? (
                <img
                  className="challenge-notebook-preview"
                  src={pending[current.id]?.notebook_image_base64}
                  alt="Foto del cuaderno"
                />
              ) : null}
            </div>
          )}

          {isBoardQuestion(current) && (
            <div className="challenge-board">
              <GridBoard
                key={`challenge-q-${current.id}-${theme}`}
                ref={boardRef}
                initialBoard={currentBoard}
                onSave={() => {}}
                theme={theme}
              />
            </div>
          )}
        </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {grading && (
          <motion.div
            className="challenge-grade-overlay"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="challenge-grade-card"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="challenge-grade-orb" aria-hidden />
              <p className="challenge-grade-title">¡Un momentito!</p>
              <p className="challenge-grade-copy">
                Taskia está mirando tus respuestas…
              </p>
              <span className="study-thinking-dots challenge-grade-dots" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
