import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lightbulb, Sparkle } from '@phosphor-icons/react'
import { useAuth } from '../auth'
import { drawFrom, phrasesFor, tipsFor, type Audience, type LoaderContext, type LoaderLine } from '../lib/loaderCopy'
import { Spark } from './scenes/kit'
import { sv } from './scenes/sv'
import { TaskiaBeacon } from './study/TaskiaBeacon'
import { LinePlanet } from './worlds/map/LinePlanet'

type AppLoaderProps = {
  /** Lo que se está cargando; es lo que anuncian los lectores de pantalla. */
  message: string
  variant?: 'page' | 'section'
  /** De qué parte de la app es: elige las frases que acompañan la espera. */
  context?: LoaderContext
  /** Fuerza el tono; por omisión sale del rol de la sesión. */
  audience?: Audience
}

/** No se muestra nada si la carga termina antes: evita el parpadeo en cargas rápidas. */
const SHOW_AFTER_MS = 250
/** Cada cuánto cambia la línea que acompaña. */
const ROTATE_MS = 3600

const BURST = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2
  return { x: Math.cos(angle) * 58, y: Math.sin(angle) * 58 }
})

function useAudience(forced?: Audience): Audience {
  const { user } = useAuth()
  if (forced) return forced
  if (!user) return 'neutral'
  return user.role === 'admin' || user.role === 'parent' ? 'adult' : 'explorer'
}

/**
 * Línea que acompaña al mensaje y cambia sola. En pantalla completa alterna frases y tips; en un panel solo
 * frases. `next` la cambia al instante (el toque a la estrella).
 */
function useRotatingLine(context: LoaderContext, audience: Audience, withTips: boolean) {
  const phrases = useMemo(() => phrasesFor(context, audience), [context, audience])
  const tips = useMemo(() => (withTips ? tipsFor(audience, context) : []), [withTips, audience, context])
  const [turn, setTurn] = useState(0)
  const [line, setLine] = useState<LoaderLine>(() => ({
    kind: 'phrase',
    text: drawFrom(`phrase|${context}|${audience}`, phrases),
  }))

  const next = (current: number) => {
    // La línea inicial es una frase: la siguiente es un tip, y así se van alternando.
    const useTip = tips.length > 0 && current % 2 === 0
    setLine(
      useTip
        ? drawFrom(`tip|${audience}`, tips)
        : { kind: 'phrase', text: drawFrom(`phrase|${context}|${audience}`, phrases) },
    )
    setTurn(current + 1)
  }

  useEffect(() => {
    const timer = window.setInterval(() => next(turn), ROTATE_MS)
    return () => window.clearInterval(timer)
    // `next` solo depende de lo que ya está en la lista de dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phrases, tips])

  return { line, next: () => next(turn) }
}

function LineIcon({ kind }: { kind: LoaderLine['kind'] }) {
  if (kind === 'tip') return <Lightbulb size={16} weight="fill" className="loader-line-icon" aria-hidden />
  if (kind === 'cheer') return <Sparkle size={16} weight="fill" className="loader-line-icon" aria-hidden />
  return null
}

/**
 * Loader general de la app: un planeta con su luna en órbita y una estrella guía. Al lado del mensaje de lo que
 * carga rota una frase; en pantalla completa también tips y ánimo. Tocar el planeta lanza un destello y cambia la línea.
 */
export function AppLoader({ message, variant = 'page', context = 'general', audience: forced }: AppLoaderProps) {
  const audience = useAudience(forced)
  const page = variant === 'page'
  const { line, next } = useRotatingLine(context, audience, page)
  const [shown, setShown] = useState(false)
  const [burst, setBurst] = useState(0)
  // Un planeta distinto cada vez que se monta.
  const [seed] = useState(() => 1 + Math.floor(Math.random() * 900))

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), SHOW_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [])

  function poke() {
    setBurst((count) => count + 1)
    next()
  }

  const art = (
    <>
      <span className="loader-ring" aria-hidden />
      <span className="loader-orbit" aria-hidden>
        <span className="loader-moon" />
      </span>
      <span key={burst} className={`loader-planet${burst > 0 ? ' is-pop' : ''}`} aria-hidden>
        <LinePlanet seed={seed} size="100%" animate={burst === 0} />
      </span>
      {burst > 0 ? (
        <svg key={`b${burst}`} className="loader-burst" viewBox="-70 -70 140 140" aria-hidden>
          {BURST.map((point, index) => (
            <Spark
              key={index}
              x={0}
              y={0}
              s={7}
              className="loader-spark"
              style={sv({ '--bx': `${point.x}px`, '--by': `${point.y}px` })}
            />
          ))}
        </svg>
      ) : null}
      {page ? (
        <span className="loader-beacon" aria-hidden>
          <TaskiaBeacon size={30} state="thinking" />
        </span>
      ) : null}
    </>
  )

  return (
    <motion.div
      className={`app-loader app-loader--${variant}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      aria-busy="true"
    >
      {/* El anuncio existe desde el primer instante, aunque lo visible aparezca después. */}
      <span className="loader-sr" role="status">
        {message}
      </span>
      {shown ? (
        <motion.div
          className="app-loader-card"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {page ? (
            <button type="button" className="loader-art" onClick={poke} aria-label="Ver otro mensaje">
              {art}
            </button>
          ) : (
            <span className="loader-art">{art}</span>
          )}
          <p className="loader-message" aria-hidden>
            {message}
          </p>
          <div className="loader-line" aria-hidden>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={line.text}
                className={`loader-line-text is-${line.kind}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
              >
                <LineIcon kind={line.kind} />
                <span>{line.text}</span>
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  )
}
