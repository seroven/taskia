import type { ReactNode } from 'react'
import { Chip, type ChipTone } from '../ui/Chip'
import { courseProgressIcon, missionStatusIcon } from './worldsIcons'
import {
  COURSE_PROGRESS_LABEL,
  MISSION_STATUS_LABEL,
  type CourseProgress,
} from '../../lib/worldsTypes'

export function WorldsTags({ children }: { children: ReactNode }) {
  return <span className="worlds-row-tags">{children}</span>
}

export function WorldsStatusPill({
  kind,
  value,
}: {
  kind: 'mission' | 'courseProgress'
  value: string
}) {
  const Icon =
    kind === 'mission' ? missionStatusIcon(value) : courseProgressIcon(value)
  const label =
    kind === 'mission'
      ? (MISSION_STATUS_LABEL[value] ?? value)
      : (COURSE_PROGRESS_LABEL[value as CourseProgress] ?? value)
  const tone: ChipTone =
    value === 'mastered'
      ? kind === 'courseProgress'
        ? 'solid'
        : 'success'
      : value === 'studying'
        ? 'accent'
        : 'muted'

  return (
    <Chip tone={tone}>
      <Icon size={14} weight="fill" />
      {label}
    </Chip>
  )
}
