import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ArrowRight, BookOpenText, Check, LockSimple } from '@phosphor-icons/react'
import { canOpenStudyMode, canViewStudySession, type Task } from '../types'

const SWIPE_LIMIT = 140
const SWIPE_THRESHOLD = 88

interface Props {
  task: Task
  featured: boolean
  onOpen: (task: Task) => void
  onStudy: (task: Task) => void
  onComplete: (task: Task) => void
}

const STATUS_CHIP: Record<Task['status'], string> = {
  pending: 'Por hacer',
  studying: 'Con Taskia',
  done: 'Lista',
}

function displayTitle(title: string) {
  const text = title.trim()
  if (!text) return title
  return text.charAt(0).toLocaleUpperCase('es') + text.slice(1)
}

/** Misma materia, misma intensidad. Siempre sobre el acento activo. */
const COURSE_STRENGTH = [100, 78, 62, 88, 70, 54, 82]

function courseAccent(courseId: number) {
  const strength = COURSE_STRENGTH[Math.abs(courseId) % COURSE_STRENGTH.length]
  return `color-mix(in srgb, var(--accent) ${strength}%, transparent)`
}

export function CampTaskRow({ task, featured, onOpen, onStudy, onComplete }: Props) {
  const done = task.status === 'done'
  const isProject = task.task_kind === 'project'
  /** Solo las diarias con ayuda quedan bloqueadas; el proyecto puede marcar Listo. */
  const locked = task.needs_help && !isProject && !done
  const canSwipe = !done && (!task.needs_help || isProject)
  const canStudy = canOpenStudyMode(task)
  const canViewStudy = canViewStudySession(task)
  const canMarkReady = !done && !locked
  const kindLabel = task.task_kind === 'project' ? 'Proyecto' : 'Del día'
  const color = courseAccent(task.course_id)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef({ x: 0, y: 0 })
  const dxRef = useRef(0)
  const active = useRef(false)
  const horizontal = useRef(false)
  const ignoreClick = useRef(false)
  const actionLabel = canStudy ? (task.status === 'studying' ? 'Seguir' : 'Estudiar') : 'Ver chat'

  function onCard() {
    if (ignoreClick.current) {
      ignoreClick.current = false
      return
    }
    if (canViewStudy) onStudy(task)
    else onOpen(task)
  }

  function onPointerDown(event: ReactPointerEvent) {
    if (!canSwipe) return
    const target = event.target as HTMLElement
    if (target.closest('.camp-check, .camp-row-cta, .camp-row-hint')) return
    active.current = true
    start.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (!active.current) return
    const nextX = event.clientX - start.current.x
    const nextY = event.clientY - start.current.y
    if (!horizontal.current) {
      if (Math.abs(nextY) > Math.abs(nextX) && Math.abs(nextY) > 8) {
        active.current = false
        return
      }
      if (Math.abs(nextX) < 8) return
      horizontal.current = true
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    const clamped = Math.max(-SWIPE_LIMIT, Math.min(SWIPE_LIMIT, nextX))
    dxRef.current = clamped
    setDx(clamped)
  }

  function onPointerUp() {
    if (!active.current && !horizontal.current) return
    const moved = Math.abs(dxRef.current)
    active.current = false
    horizontal.current = false
    dxRef.current = 0
    if (moved > 8) ignoreClick.current = true
    setDragging(false)
    setDx(0)
    if (moved >= SWIPE_THRESHOLD) onComplete(task)
  }

  const actionLabel = task.status === 'studying' ? 'Seguir' : 'Estudiar'
  const reveal = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD)

  return (
    <div className="camp-row-shell">
      {canSwipe ? (
        <div
          className={`camp-swipe-hint${dx < 0 ? ' is-right' : ''}`}
          style={{ opacity: 0.2 + reveal * 0.8 }}
          aria-hidden
        >
          <Check size={18} weight="bold" />
          Listo
        </div>
      ) : null}
    <article
      className={`camp-row${done ? ' is-done' : ''}${featured ? ' is-featured' : ''}${dragging ? ' is-dragging' : ''}`}
      style={canSwipe ? { transform: `translateX(${dx}px)` } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <button
        type="button"
        className={`camp-check${done ? ' is-done' : ''}${locked ? ' is-locked' : ''}`}
        aria-label={
          done
            ? 'Lista'
            : locked
              ? 'Taskia la marca cuando terminen'
              : 'Marcar lista'
        }
        aria-disabled={!canMarkReady}
        onClick={() => {
          if (!canMarkReady) return
          onComplete(task)
        }}
      >
        {done ? (
          <Check size={16} weight="bold" />
        ) : locked ? (
          <LockSimple size={14} weight="bold" />
        ) : null}
      </button>

      <button type="button" className="camp-row-main" onClick={onCard}>
        <span className="camp-row-accent" style={{ background: color }} aria-hidden />
        <span className="camp-row-body">
          <span className="camp-row-title">{displayTitle(task.title)}</span>
          <span className="camp-row-meta">
            {task.course_name} · {kindLabel}
          </span>
        </span>
        <span className={`camp-chip camp-chip-${task.status}`}>{STATUS_CHIP[task.status]}</span>
      </button>

      {featured && !done && canStudy ? (
        <button type="button" className="primary camp-row-cta" onClick={() => onStudy(task)}>
          <BookOpenText size={18} weight="fill" />
          {actionLabel}
        </button>
      ) : null}
      {featured && !done && !canStudy ? (
        <button type="button" className="primary camp-row-cta" onClick={() => onComplete(task)}>
          <Check size={18} weight="bold" />
          ¡Listo!
        </button>
      ) : null}
      {!featured && (!done || canViewStudy) ? (
        <button
          type="button"
          className="camp-row-hint"
          aria-label={canViewStudy ? (canStudy ? actionLabel : 'Ver chat') : 'Abrir tarea'}
          onClick={onCard}
        >
          <ArrowRight size={18} weight="bold" />
        </button>
      ) : null}
    </article>
    </div>
  )
}
