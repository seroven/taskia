import type { ReactNode } from 'react'
import { Trophy } from '@phosphor-icons/react'
import { AppLoader } from '../AppLoader'
import { EmptyState } from '../EmptyState'
import { LinePlanet } from './map/LinePlanet'
import { LineSun } from './map/LineSun'
import { MissionMoon } from './map/MissionMoon'
import { WorldsIconBadge } from './WorldsIconBadge'
import { challengeScopeIcon } from './worldsIcons'
import { courseSeed, worldSeed } from '../../lib/seed'
import {
  DIFFICULTY_LABEL,
  SCOPE_LABEL,
  challengeHistoryTitle,
  type StudyChallenge,
} from '../../lib/worldsTypes'

interface Props {
  items: StudyChallenge[]
  onOpen: (challengeId: number) => void
  title?: string
  emptyText?: string
  action?: ReactNode
  className?: string
  loading?: boolean
  /**
   * Sin esto la lista es plana. `course` (vista del mundo) agrupa por curso; `mission` (vista del curso) agrupa por
   * tema. En ambos casos el desafío más amplio va en un primer grupo propio.
   */
  groupBy?: 'course' | 'mission'
  worldId?: number
  courseId?: number
}

type Group = {
  key: string
  title: string
  art: ReactNode
  items: StudyChallenge[]
  /** El título del grupo ya dice de qué es el desafío: la fila solo cuenta la dificultad. */
  named: boolean
}

function groupArt(node: ReactNode) {
  return <span className="worlds-group-art">{node}</span>
}

/** Parte los desafíos en grupos, conservando el orden en que llegan (el más reciente primero). */
function buildGroups(items: StudyChallenge[], groupBy: 'course' | 'mission', worldId: number, courseId: number | null) {
  const wide: Group | null = (() => {
    const scope = groupBy === 'course' ? 'world' : 'course'
    const found = items.filter((item) => item.scope === scope)
    if (found.length === 0) return null
    return groupBy === 'course'
      ? {
          key: 'world',
          title: 'Todo el mundo',
          art: groupArt(<LineSun seed={worldSeed(worldId)} size={64} animate={false} />),
          items: found,
          named: true,
        }
      : {
          key: 'course',
          title: 'Todo el curso',
          art: groupArt(<LinePlanet seed={courseSeed(worldId, courseId ?? 0)} size={62} animate={false} />),
          items: found,
          named: true,
        }
  })()

  const groups = new Map<string, Group>()
  for (const item of items) {
    if (item.scope === (groupBy === 'course' ? 'world' : 'course')) continue
    if (groupBy === 'course') {
      const id = item.course_id
      const key = `c${id ?? 'none'}`
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: item.course_name ?? 'Otro curso',
          art:
            id != null
              ? groupArt(<LinePlanet seed={courseSeed(worldId, id)} size={62} animate={false} />)
              : null,
          items: [],
          named: false,
        })
      }
      groups.get(key)!.items.push(item)
    } else {
      const id = item.mission_id
      const key = `m${id ?? 'none'}`
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: item.mission_title ?? 'Otro tema',
          art: id != null ? groupArt(<MissionMoon seed={id * 31 + 7} status="studying" phase="practicing" />) : null,
          items: [],
          named: true,
        })
      }
      groups.get(key)!.items.push(item)
    }
  }
  return [...(wide ? [wide] : []), ...groups.values()]
}

function rowText(ch: StudyChallenge, named: boolean) {
  const difficulty = DIFFICULTY_LABEL[ch.difficulty] ?? ch.difficulty
  const score = ch.status === 'completed' && ch.score != null ? ` · ${ch.score} pts` : ''
  if (named) return { title: difficulty, meta: `${ch.question_count} preguntas${score}` }
  return {
    title: ch.scope === 'course' ? 'Todo el curso' : (ch.mission_title ?? 'Tema'),
    meta: `${difficulty} · ${ch.question_count} preguntas${score}`,
  }
}

export function ChallengeHistoryList({
  items,
  onOpen,
  title = 'Tus desafíos',
  emptyText,
  action,
  className = '',
  loading = false,
  groupBy,
  worldId = 0,
  courseId,
}: Props) {
  if (!loading && items.length === 0 && emptyText == null) return null

  return (
    <section className={`worlds-block ${className}`.trim()}>
      <div className="worlds-panel-head">
        <p className="worlds-block-label">{title}</p>
        {action}
      </div>
      {loading ? (
        <AppLoader message="Cargando desafíos…" variant="section" />
      ) : items.length === 0 ? (
        <EmptyState
          compact
          icon={Trophy}
          title="Sin desafíos"
          description={emptyText}
        />
      ) : groupBy ? (
        <div className="worlds-history-groups">
          {buildGroups(items, groupBy, worldId, courseId ?? null).map((group) => (
            <section key={group.key} className="worlds-history-group">
              <h3 className="worlds-history-group-head">
                {group.art}
                <span>{group.title}</span>
              </h3>
              <ul className="worlds-history">
                {group.items.map((ch) => {
                  const text = rowText(ch, group.named)
                  return (
                    <li key={ch.id}>
                      <button type="button" className="worlds-history-row" onClick={() => onOpen(ch.id)}>
                        <span className="worlds-history-text">
                          <span className="worlds-history-title">{text.title}</span>
                          <span className="worlds-history-meta">{text.meta}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="worlds-history">
          {items.map((ch) => {
            const ScopeIcon = challengeScopeIcon(ch.scope)
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  className="worlds-history-row"
                  onClick={() => onOpen(ch.id)}
                >
                  <WorldsIconBadge icon={ScopeIcon} size="sm" />
                  <span className="worlds-history-text">
                    <span className="worlds-history-title-row">
                      <span className={`worlds-scope worlds-scope-${ch.scope}`}>
                        {SCOPE_LABEL[ch.scope] ?? ch.scope}
                      </span>
                      <span className="worlds-history-title">
                        {challengeHistoryTitle(ch)}
                      </span>
                    </span>
                    <span className="worlds-history-meta">
                      {DIFFICULTY_LABEL[ch.difficulty] ?? ch.difficulty}
                      {' · '}
                      {ch.question_count} preguntas
                      {ch.status === 'completed' && ch.score != null
                        ? ` · ${ch.score} pts`
                        : ''}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
