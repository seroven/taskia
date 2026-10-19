import { useEffect, useState } from 'react'
import { Star } from '@phosphor-icons/react'

const LEVEL_XP = 1000

function RocketMark() {
  return (
    <svg className="level-rocket-art" viewBox="0 0 44 26" width="44" height="26" aria-hidden focusable="false">
      <path className="level-flame" d="M12 9.5 Q2 13 12 16.5Z" />
      <path className="level-fin" d="M14 8 L8 2.5 L9.5 8Z M14 18 L8 23.5 L9.5 18Z" />
      <path className="level-body" d="M12 8 H25 C32 8 37 10.5 40 13 C37 15.5 32 18 25 18 H12Z" />
      <circle className="level-window" cx="26" cy="13" r="3" />
    </svg>
  )
}

type Props = {
  level: number
  into: number
  toNext?: number
}

/** Medidor de nivel: un cohete avanza por su estela hacia la estrella del nivel siguiente. */
export function LevelRocket({ level, into, toNext }: Props) {
  const target = Math.min(100, Math.max(0, Math.round((into / LEVEL_XP) * 100)))
  const [pct, setPct] = useState(0)
  const [open, setOpen] = useState(false)
  const missing = toNext ?? Math.max(0, LEVEL_XP - into)

  useEffect(() => {
    const id = requestAnimationFrame(() => setPct(target))
    return () => cancelAnimationFrame(id)
  }, [target])

  return (
    <button
      type="button"
      className={`level-meter${open ? ' is-open' : ''}`}
      aria-label={`Nivel ${level}. Te faltan ${missing} de experiencia para el nivel ${level + 1}`}
      onClick={() => setOpen((value) => !value)}
      onBlur={() => setOpen(false)}
    >
      <span className="level-badge" aria-hidden>
        {level}
      </span>
      <span className="level-track" aria-hidden>
        <span className="level-lane" style={{ ['--pct' as string]: pct }}>
          <span className="level-line" />
          <span className="level-trail" />
          <span className="level-ship">
            <span className="level-bob">
              <RocketMark />
            </span>
          </span>
        </span>
      </span>
      <span className="level-goal" aria-hidden>
        <Star size={18} weight="fill" />
      </span>
      <span className="level-tip" role="status">
        <strong>Nivel {level}</strong>
        <span>
          Te faltan {missing} XP para el nivel {level + 1}
        </span>
      </span>
    </button>
  )
}
