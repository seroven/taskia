import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

type BubbleVariant = 'sober' | 'explorador'

type Props = {
  variant?: BubbleVariant
  from: string
  typing?: boolean
  children: ReactNode
} & Omit<HTMLMotionProps<'div'>, 'children'>

/** Globo de chat. `explorador` es el estudio del niño; `sober` queda para el guardián en la fase siguiente. */
export function StudyBubble({
  variant = 'sober',
  from,
  typing = false,
  className,
  children,
  ...motionProps
}: Props) {
  const taskia = from !== 'user'
  const name = taskia ? 'Taskia' : 'Tú'
  return (
    <motion.div
      className={[
        'study-bubble',
        `study-bubble-${from}`,
        `is-${variant}`,
        typing ? 'is-typing' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...motionProps}
    >
      {variant === 'explorador' && taskia ? (
        <span className="study-avatar" aria-hidden>
          T
        </span>
      ) : null}
      <span className="study-bubble-copy">
        <span className="study-bubble-role">{name}</span>
        {children}
      </span>
    </motion.div>
  )
}
