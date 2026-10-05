import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AccentProvider } from './accent'
import { AuthProvider, useAuth } from './auth'
import { AppLoader } from './components/AppLoader'
import { ThemeProvider } from './theme'
import { ToastProvider } from './toast'
import { AdminPage } from './pages/AdminPage'
import { AuthPage } from './pages/AuthPage'
import { GuardianPage } from './pages/GuardianPage'
import { HubPage } from './pages/HubPage'
import { TroopsPage } from './pages/TroopsPage'
import { BoardPage } from './pages/BoardPage'
import { StudyPage } from './pages/StudyPage'
import { WorldsHome } from './pages/worlds/WorldsHome'
import { WorldDetail } from './pages/worlds/WorldDetail'
import { CourseDetail } from './pages/worlds/CourseDetail'
import { MissionStudyPage } from './pages/worlds/MissionStudyPage'
import { ChallengePlayPage } from './pages/worlds/ChallengePlayPage'
import {
  readExplorerPlace,
  writeExplorerPlace,
  type ExplorerView,
} from './lib/sessionPlace'
import type { Task } from './types'

const viewTransition = {
  initial: { opacity: 0, y: 14, scale: 0.985 },
  animate: { opacity: 1, y: 0, x: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.99 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
}

const challengeTransition = {
  initial: { opacity: 0, x: 36, scale: 0.98 },
  animate: { opacity: 1, x: 0, y: 0, scale: 1 },
  exit: { opacity: 0, x: -24, scale: 0.99 },
  transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
}

function ExplorerApp({ userId }: { userId: number }) {
  const [saved] = useState(() => readExplorerPlace(userId))
  const [view, setView] = useState<ExplorerView>(saved.view)
  const [studyTaskId, setStudyTaskId] = useState<number | null>(saved.studyTaskId)
  const [worldId, setWorldId] = useState<number | null>(saved.worldId)
  const [courseId, setCourseId] = useState<number | null>(saved.courseId)
  const [missionId, setMissionId] = useState<number | null>(saved.missionId)
  const [challengeId, setChallengeId] = useState<number | null>(saved.challengeId)
  /** Tras salir de un desafío, volver a course o world. */
  const [challengeReturn, setChallengeReturn] = useState<'world' | 'course'>(saved.challengeReturn)

  useEffect(() => {
    writeExplorerPlace(userId, {
      view,
      studyTaskId,
      worldId,
      courseId,
      missionId,
      challengeId,
      challengeReturn,
    })
  }, [userId, view, studyTaskId, worldId, courseId, missionId, challengeId, challengeReturn])

  const goHub = () => {
    setView('hub')
    setStudyTaskId(null)
    setWorldId(null)
    setCourseId(null)
    setMissionId(null)
    setChallengeId(null)
  }

  const viewKey =
    view === 'study' && studyTaskId != null
      ? `study-${studyTaskId}`
      : view === 'world' && worldId != null
        ? `world-${worldId}`
        : view === 'course' && worldId != null && courseId != null
          ? `course-${worldId}-${courseId}`
          : view === 'mission' && missionId != null
            ? `mission-${missionId}`
            : view === 'challenge' && challengeId != null
              ? `challenge-${challengeId}`
              : view

  const viewMotion =
    view === 'challenge' && challengeId != null
      ? challengeTransition
      : viewTransition

  return (
    <div className="app-view-root">
      <AnimatePresence mode="wait">
        <motion.div
          key={viewKey}
          className="app-view-panel"
          initial={viewMotion.initial}
          animate={viewMotion.animate}
          exit={viewMotion.exit}
          transition={viewMotion.transition}
        >
          {view === 'hub' ? (
            <HubPage
              onOpen={(door) => {
                if (door === 'worlds') setView('worlds')
                else if (door === 'camp') setView('board')
              }}
            />
          ) : view === 'troops' ? (
            <TroopsPage onBack={goHub} />
          ) : view === 'study' && studyTaskId != null ? (
            <StudyPage
              taskId={studyTaskId}
              onBack={() => {
                setView('board')
                setStudyTaskId(null)
              }}
            />
          ) : view === 'worlds' ? (
            <WorldsHome
              onBack={goHub}
              onOpenWorld={(id) => {
                setWorldId(id)
                setView('world')
              }}
            />
          ) : view === 'world' && worldId != null ? (
            <WorldDetail
              worldId={worldId}
              onBack={() => {
                setView('worlds')
                setWorldId(null)
              }}
              onOpenCourse={(id) => {
                setCourseId(id)
                setView('course')
              }}
              onOpenChallenge={(id) => {
                setChallengeId(id)
                setChallengeReturn('world')
                setView('challenge')
              }}
            />
          ) : view === 'course' && worldId != null && courseId != null ? (
            <CourseDetail
              worldId={worldId}
              courseId={courseId}
              onBack={() => {
                setCourseId(null)
                setView('world')
              }}
              onStudyMission={(id) => {
                setMissionId(id)
                setView('mission')
              }}
              onOpenChallenge={(id) => {
                setChallengeId(id)
                setChallengeReturn('course')
                setView('challenge')
              }}
            />
          ) : view === 'mission' && missionId != null ? (
            <MissionStudyPage
              missionId={missionId}
              onBack={() => {
                setMissionId(null)
                setView('course')
              }}
            />
          ) : view === 'challenge' && challengeId != null ? (
            <ChallengePlayPage
              challengeId={challengeId}
              onBack={() => {
                setChallengeId(null)
                setView(challengeReturn)
              }}
            />
          ) : (
            <BoardPage
              onOpenStudy={(task: Task) => {
                setStudyTaskId(task.id)
                setView('study')
              }}
              onBack={goHub}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function AppRouter() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="boot-screen">
        <AppLoader message="Cargando…" />
      </div>
    )
  }

  if (!user) return <AuthPage />
  if (user.role === 'admin') return <AdminPage key={user.id} />
  if (user.role === 'parent') return <GuardianPage key={user.id} />
  return <ExplorerApp key={user.id} userId={user.id} />
}

export default function App() {
  return (
    <ThemeProvider>
      <AccentProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ToastProvider>
      </AccentProvider>
    </ThemeProvider>
  )
}
