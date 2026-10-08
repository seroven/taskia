import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, CaretLeft, CaretRight, Flag, Plus } from '@phosphor-icons/react'
import { api } from '../api'
import { useAuth } from '../auth'
import { BoardLoader } from '../components/BoardLoader'
import { CampTaskRow } from '../components/CampTaskRow'
import { EmptyState } from '../components/EmptyState'
import { TaskDetailModal } from '../components/TaskDetailModal'
import { TaskFormModal } from '../components/TaskFormModal'
import { AppearanceTools } from '../components/AppearanceTools'
import { ExpandIconButton } from '../components/ExpandIconButton'
import { ExplorerXpBar } from '../components/ExplorerXpBar'
import { SessionActions } from '../components/SessionActions'
import {
  canViewStudySession,
  shiftCivilDay,
  todayISO,
  type Course,
  type Task,
  type TaskKind,
} from '../types'
import { errorMessage } from '../lib/errors'
import { mergeXpIntoUser, xpToastCopy } from '../lib/xp'
import { useToast } from '../toast'
import { formatDayCompact } from '../lib/datetime'

const SWAP_EASE = [0.22, 1, 0.36, 1] as const

function swapVariants(
  reduce: boolean,
  dir: { current: number },
  axis: { current: 'x' | 'y' },
) {
  if (reduce) {
    return {
      initial: { opacity: 1, x: 0, y: 0 },
      animate: { opacity: 1, x: 0, y: 0 },
      exit: { opacity: 1, x: 0, y: 0 },
    }
  }
  return {
    initial: () => ({
      opacity: 0,
      x: axis.current === 'x' ? dir.current * 28 : 0,
      y: axis.current === 'y' ? 10 : 0,
    }),
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.28, ease: SWAP_EASE },
    },
    exit: () => ({
      opacity: 0,
      x: axis.current === 'x' ? dir.current * -22 : 0,
      y: axis.current === 'y' ? -8 : 0,
      transition: { duration: 0.18, ease: SWAP_EASE },
    }),
  }
}

export function BoardPage({
  onOpenStudy,
  onBack,
}: {
  onOpenStudy: (task: Task) => void
  onBack: () => void
}) {
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const reduceMotion = useReducedMotion()
  const dirRef = useRef(1)
  const axisRef = useRef<'x' | 'y'>('x')
  const variants = useMemo(
    () => swapVariants(Boolean(reduceMotion), dirRef, axisRef),
    [reduceMotion],
  )
  const [courses, setCourses] = useState<Course[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [day, setDay] = useState(todayISO())
  const [loading, setLoading] = useState(true)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [scope, setScope] = useState<TaskKind>('daily')
  const [shownDay, setShownDay] = useState(day)
  const requestId = useRef(0)
  const isToday = day === todayISO()
  const panelKey = `${scope}-${shownDay}`

  const loadTasks = useCallback(async (dueOn: string) => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const next = await api.listTasks({ due_on: dueOn })
      if (currentRequest !== requestId.current) return
      setTasks(next)
      setShownDay(dueOn)
      setHasLoadedOnce(true)
    } catch (err) {
      if (currentRequest !== requestId.current) return
      setError(errorMessage(err))
    } finally {
      if (currentRequest === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        setCourses(await api.listCourses())
      } catch (err) {
        setError(errorMessage(err))
      }
    })()
  }, [])

  useEffect(() => {
    void loadTasks(day)
  }, [day, loadTasks])

  const visible = useMemo(() => {
    const rows = tasks.filter((task) => task.task_kind === scope)
    const open = rows.filter((task) => task.status !== 'done')
    const done = rows.filter((task) => task.status === 'done')
    return [...open, ...done]
  }, [tasks, scope])

  const doneCount = visible.filter((task) => task.status === 'done').length
  const progressLabel = scope === 'daily' ? 'Hoy' : 'Proyectos'
  const progress = visible.length === 0 ? 0 : Math.round((doneCount / visible.length) * 100)
  const featuredId = visible.find((task) => task.status !== 'done')?.id ?? null
  const dateLabel = isToday ? `Hoy · ${formatDayCompact(day)}` : formatDayCompact(day)
  const waitingDay = hasLoadedOnce && loading && shownDay !== day

  function goDay(delta: number) {
    axisRef.current = 'x'
    dirRef.current = delta
    setDay((current) => shiftCivilDay(current, delta))
  }

  function selectScope(next: TaskKind) {
    if (next === scope) return
    axisRef.current = 'y'
    dirRef.current = next === 'project' ? 1 : -1
    setScope(next)
  }

  function applyXp(result: { xp_gained?: number; xp?: Parameters<typeof mergeXpIntoUser>[1] }) {
    if (result.xp && result.xp_gained && result.xp_gained > 0) {
      const next = mergeXpIntoUser(user, result.xp)
      if (next) setUser(next)
      const copy = xpToastCopy(result.xp_gained)
      if (copy) showToast({ tone: 'success', ...copy })
    }
  }

  async function onComplete(task: Task) {
    try {
      const result = await api.completeTask(task.id)
      setTasks((prev) => prev.map((row) => (row.id === result.id ? result : row)))
      applyXp(result)
      showToast({
        tone: 'success',
        title: '¡Listo!',
        subtitle: task.title,
      })
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo marcar',
        subtitle: errorMessage(err),
      })
    }
  }

  function onStudy(task: Task) {
    if (!canViewStudySession(task)) {
      showToast({
        tone: 'warning',
        title: 'Esta no usa Taskia',
        subtitle: 'Márcala lista cuando la termines.',
      })
      return
    }
    onOpenStudy(task)
  }

  return (
    <div className="board-shell camp-shell">
      <header className="topbar">
        <div className="topbar-title-row">
          <ExpandIconButton
            icon={ArrowLeft}
            label="Inicio"
            weight="bold"
            onClick={onBack}
          />
          <div>
            <p className="brand">Campamento</p>
            <p className="welcome">Tareas del día · {user?.username}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <ExplorerXpBar />
          <AppearanceTools />
          <SessionActions />
        </div>
      </header>

      {error ? <p className="form-error banner">{error}</p> : null}

      <div className="camp-stage">
        <div className="camp-column">
          <div className="camp-tabs" role="tablist" aria-label="Tipo de tarea">
            <button
              type="button"
              role="tab"
              id="camp-tab-daily"
              aria-selected={scope === 'daily'}
              aria-controls="camp-panel"
              className={`camp-tab${scope === 'daily' ? ' is-active' : ''}`}
              onClick={() => selectScope('daily')}
            >
              {!reduceMotion && scope === 'daily' ? (
                <motion.span layoutId="camp-tab-pill" className="camp-tab-pill" />
              ) : null}
              <span className="camp-tab-label">Hoy</span>
            </button>
            <button
              type="button"
              role="tab"
              id="camp-tab-project"
              aria-selected={scope === 'project'}
              aria-controls="camp-panel"
              className={`camp-tab${scope === 'project' ? ' is-active' : ''}`}
              onClick={() => selectScope('project')}
            >
              {!reduceMotion && scope === 'project' ? (
                <motion.span layoutId="camp-tab-pill" className="camp-tab-pill" />
              ) : null}
              <span className="camp-tab-label">Proyectos</span>
            </button>
          </div>

          <div className="camp-daybar">
            <div className="camp-day-nav">
              <button
                type="button"
                className="ghost camp-day-btn"
                aria-label="Día anterior"
                onClick={() => goDay(-1)}
              >
                <CaretLeft size={16} weight="bold" />
              </button>
              <span className="camp-day-title-slot">
                <AnimatePresence initial={false}>
                  <motion.p
                    key={day}
                    className="camp-day-title"
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {dateLabel}
                  </motion.p>
                </AnimatePresence>
              </span>
              <button
                type="button"
                className="ghost camp-day-btn"
                aria-label="Día siguiente"
                onClick={() => goDay(1)}
              >
                <CaretRight size={16} weight="bold" />
              </button>
              <AnimatePresence initial={false}>
                {!isToday ? (
                  <motion.button
                    key="back-today"
                    type="button"
                    className="ghost camp-today-chip"
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.18, ease: SWAP_EASE }}
                    onClick={() => {
                      axisRef.current = 'x'
                      dirRef.current = todayISO() > day ? 1 : -1
                      setDay(todayISO())
                    }}
                  >
                    Ir a hoy
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>
            <div className="camp-swap-host camp-progress-host">
            <AnimatePresence initial={false}>
              <motion.div
                key={panelKey}
                className={`camp-progress${waitingDay ? ' is-pending' : ''}`}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={visible.length}
                aria-valuenow={doneCount}
                aria-label={`${progressLabel}: ${doneCount} de ${visible.length}`}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <span className="camp-progress-label">
                  {progressLabel}: {doneCount} de {visible.length}
                </span>
                <span className="camp-progress-track">
                  <span className="camp-progress-fill" style={{ width: `${progress}%` }} />
                </span>
              </motion.div>
            </AnimatePresence>
            </div>
            <button
              type="button"
              className="primary camp-add-desktop"
              onClick={() => setModalOpen(true)}
            >
              <Plus size={18} weight="bold" />
              Nueva tarea
            </button>
          </div>

          {!hasLoadedOnce && loading ? (
            <BoardLoader />
          ) : (
            <div
              className="camp-swap-host"
              id="camp-panel"
              role="tabpanel"
              aria-labelledby={scope === 'daily' ? 'camp-tab-daily' : 'camp-tab-project'}
            >
            <AnimatePresence initial={false}>
            <motion.div
              key={panelKey}
              className={`camp-list${waitingDay ? ' is-pending' : ''}`}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {visible.length === 0 ? (
                <EmptyState
                  compact
                  icon={Flag}
                  title={scope === 'project' ? 'Sin proyectos' : 'Nada para este día'}
                  description={
                    scope === 'project'
                      ? 'Los proyectos de este día aparecen aquí.'
                      : 'Agrega la primera tarea del día.'
                  }
                  action={
                    <button type="button" className="primary" onClick={() => setModalOpen(true)}>
                      <Plus size={18} weight="bold" />
                      Agregar tarea
                    </button>
                  }
                />
              ) : (
                <ul className="camp-section-list">
                  {visible.map((task) => (
                    <li key={task.id}>
                      <CampTaskRow
                        task={task}
                        featured={task.id === featuredId}
                        onOpen={setSelectedTask}
                        onStudy={onStudy}
                        onComplete={(row) => void onComplete(row)}
                      />
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      className="camp-add-row"
                      onClick={() => setModalOpen(true)}
                    >
                      <Plus size={18} weight="bold" />
                      Agregar tarea
                    </button>
                  </li>
                </ul>
              )}
            </motion.div>
            </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        className="primary camp-fab"
        aria-label="Agregar tarea"
        onClick={() => setModalOpen(true)}
      >
        <Plus size={22} weight="bold" />
      </button>

      <TaskFormModal
        open={modalOpen}
        courses={courses}
        onClose={() => setModalOpen(false)}
        onCreate={async (input) => {
          const created = await api.createTask(input)
          if (created.due_date === day) {
            setTasks((prev) => [created, ...prev])
          }
          showToast({
            tone: 'success',
            title: 'Tarea creada',
            subtitle: created.title,
          })
        }}
      />

      <TaskDetailModal
        task={selectedTask}
        courses={courses}
        onClose={() => setSelectedTask(null)}
        onStudy={(task) => {
          setSelectedTask(null)
          onStudy(task)
        }}
        onSaved={(task) => {
          setTasks((prev) => prev.map((row) => (row.id === task.id ? task : row)))
          setSelectedTask(task)
        }}
      />
    </div>
  )
}
