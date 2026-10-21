import type { ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { useAuth } from '../../auth'
import { UserAvatar } from '../avatar/UserAvatar'
import { TaskiaBeacon } from './TaskiaBeacon'

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
  const { user } = useAuth()
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
          <TaskiaBeacon size={34} state={typing ? 'thinking' : 'idle'} />
        </span>
      ) : null}
      <span className="study-bubble-copy">
        <span className="study-bubble-role">{name}</span>
        {children}
      </span>
      {variant === 'explorador' && !taskia && user ? (
        <span className="study-avatar study-avatar--me" aria-hidden>
          <UserAvatar avatar={user.avatar_config} frame={user.frame_id} size={32} name={user.username} />
        </span>
      ) : null}
    </motion.div>
  )
}
