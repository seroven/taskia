import { useEffect, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Lock, RocketLaunch, User } from '@phosphor-icons/react'
import { useAuth } from '../auth'
import { AppearanceTools } from '../components/AppearanceTools'
import { LaunchScene, type DayPeriod, type LaunchPhase } from '../components/scenes/LaunchScene'
import { TaskiaBeacon } from '../components/study/TaskiaBeacon'
import { Button } from '../components/ui/Button'
import { TextField, PasswordField } from '../components/ui/Field'
import { errorMessage } from '../lib/errors'
import { useSpace } from '../components/SpaceSky'
import { useToast } from '../toast'

const IGNITION_MS = 600
const LIFTOFF_MS = 1150
/** Lo que tarda en armarse la nave (ver `--bd` en LaunchScene). Antes de eso no se enciende ni despega. */
const BUILD_MS = 3700

function greetingNow(): { text: string; period: DayPeriod } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return { text: '¡Buenos días!', period: 'day' }
  if (hour >= 12 && hour < 19) return { text: '¡Buenas tardes!', period: 'day' }
  return { text: '¡Buenas noches!', period: 'night' }
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AuthPage() {
  const { login } = useAuth()
  const { showToast } = useToast()
  useSpace('high')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [built, setBuilt] = useState(() => reducedMotion())
  const [liftoff, setLiftoff] = useState(false)
  const [shake, setShake] = useState(false)
  const [greeting] = useState(greetingNow)
  /** Promesa que se cumple cuando la nave termina de armarse: un ingreso rápido espera a que acabe. */
  const [assembled] = useState(() => {
    let done!: () => void
    const promise = new Promise<void>((resolve) => {
      done = resolve
    })
    return { promise, done }
  })

  useEffect(() => {
    if (reducedMotion()) {
      assembled.done()
      return
    }
    const timer = window.setTimeout(() => {
      setBuilt(true)
      assembled.done()
    }, BUILD_MS)
    return () => window.clearTimeout(timer)
  }, [assembled])

  const phase: LaunchPhase = !built
    ? 'building'
    : liftoff
      ? 'liftoff'
      : submitting
        ? 'ignition'
        : 'ready'

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(username, password, async () => {
        await assembled.promise
        // Los motores rugen un momento antes de soltar la nave.
        if (!reducedMotion()) await new Promise((resolve) => setTimeout(resolve, IGNITION_MS))
        setLiftoff(true)
        if (!reducedMotion()) await new Promise((resolve) => setTimeout(resolve, LIFTOFF_MS))
      })
    } catch (err) {
      setShake(true)
      window.setTimeout(() => setShake(false), 500)
      const detail = errorMessage(err)
      showToast({
        title: 'No se pudo entrar',
        subtitle: detail.length > 90 ? `${detail.slice(0, 87)}…` : detail,
        tone: 'error',
      })
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-theme-slot">
        <AppearanceTools />
      </div>
      <div className="auth-scene">
        <LaunchScene phase={phase} period={greeting.period} />
      </div>
      <motion.div
        className={`auth-panel${shake ? ' is-shaking' : ''}`}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="brand auth-brand">
          <TaskiaBeacon size={34} />
          Taskia
        </p>
        <h1>{greeting.text}</h1>
        <p className="lede">
          Entra con el usuario que te dio un adulto. Tus tareas y mundos te esperan.
        </p>

        <form onSubmit={(e) => void onSubmit(e)} className="auth-form">
          <TextField
            label="Usuario"
            icon={<User size={20} weight="bold" />}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            minLength={3}
          />
          <PasswordField
            label="Contraseña"
            icon={<Lock size={20} weight="bold" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            minLength={6}
          />
          <Button type="submit" disabled={submitting}>
            <RocketLaunch size={20} weight="fill" />
            {submitting ? 'Despegando…' : '¡Entrar!'}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
