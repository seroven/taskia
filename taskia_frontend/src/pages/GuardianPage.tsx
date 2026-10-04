import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Shield } from '@phosphor-icons/react'
import { api } from '../api'
import { AppearanceTools } from '../components/AppearanceTools'
import { AppLoader } from '../components/AppLoader'
import { EmptyState } from '../components/EmptyState'
import { SessionActions } from '../components/SessionActions'
import { TextField } from '../components/ui/Field'
import { errorMessage } from '../lib/errors'
import type {
  ParentChatMessage,
  ParentExplorer,
  ParentExplorerOverview,
  ParentNotifyPrefs,
} from '../lib/adminTypes'
import { troopRoleLabel } from '../lib/troopsTypes'
import { useToast } from '../toast'

export function GuardianPage() {
  const { showToast } = useToast()
  const [explorers, setExplorers] = useState<ParentExplorer[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await api.listParentExplorers()
        setExplorers(list)
        setSelectedId(list[0]?.id ?? null)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const selected = explorers.find((e) => e.id === selectedId) ?? null

  return (
    <div className="worlds-shell admin-shell">
      <header className="topbar">
        <div>
          <p className="brand">Taskia</p>
          <p className="welcome">Panel del guardián</p>
        </div>
        <div className="topbar-actions">
          <AppearanceTools />
          <SessionActions />
        </div>
      </header>

      <div className={`admin-body${selected ? ' admin-body--guardian' : ''}`}>
        {loading ? (
          <AppLoader message="Cargando exploradores…" />
        ) : error ? (
          <p className="form-error banner">{error}</p>
        ) : explorers.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="Aún no hay exploradores vinculados"
            description="Pídele al administrador que te vincule con un explorador."
          />
        ) : (
          <div className="admin-view">
            <div className="guardian-explorer-row" role="tablist" aria-label="Exploradores">
              {explorers.map((explorer) => {
                const active = explorer.id === selectedId
                return (
                  <button
                    key={explorer.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`guardian-explorer-chip${active ? ' is-active' : ''}`}
                    onClick={() => setSelectedId(explorer.id)}
                  >
                    {explorer.username}
                  </button>
                )
              })}
            </div>

            {selected && (
              <div className="guardian-stage">
                <GuardianChat studentId={selected.id} username={selected.username} />
                <div className="guardian-side">
                  <GuardianProgress studentId={selected.id} />
                  <GuardianPrefs
                    onSaved={() =>
                      showToast({
                        tone: 'success',
                        title: 'Preferencias guardadas',
                        subtitle: 'Así te avisaremos por WhatsApp.',
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function GuardianChat({
  studentId,
  username,
}: {
  studentId: number
  username: string
}) {
  const [messages, setMessages] = useState<ParentChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, sending, loading])

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setMessages([])
      setError(null)
      try {
        setMessages(await api.listParentChat(studentId))
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [studentId])

  async function onSend(event: FormEvent) {
    event.preventDefault()
    const message = text.trim()
    if (!message || sending) return
    setSending(true)
    setError(null)
    try {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'user',
          content: message,
          created_at: new Date().toISOString(),
        },
      ])
      setText('')
      const reply = await api.sendParentChat(studentId, message)
      setMessages((prev) => [...prev, reply])
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="study-chat guardian-chat">
      <div className="study-chat-stage">
        <div className="study-chat-meta">
          <span className="study-phase-pill">Hoy</span>
          <p className="study-topic-summary">
            Pregunta por el avance de {username}. Si hay un resumen del día, la respuesta se apoya en él.
          </p>
        </div>
        <div className="study-chat-messages" ref={listRef}>
          {loading ? (
            <AppLoader message="Cargando chat…" variant="section" />
          ) : (
            <>
              {messages.length === 0 && !sending && (
                <p className="muted study-chat-empty">
                  Aún no hay mensajes. Escribe la primera pregunta.
                </p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`study-bubble study-bubble-${m.role}`}>
                  <span className="study-bubble-role">
                    {m.role === 'user' ? 'Tú' : 'Taskia'}
                  </span>
                  <p>{m.content}</p>
                </div>
              ))}
              {sending && (
                <div className="study-bubble study-bubble-assistant is-typing">
                  <span className="study-bubble-role">Taskia</span>
                  <p>
                    Pensando
                    <span className="study-thinking-dots" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <form className="study-chat-form" onSubmit={(e) => void onSend(e)}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="¿Cómo le fue hoy?"
          rows={3}
          disabled={sending || loading}
        />
        <div className="study-chat-send-row">
          <button
            type="submit"
            className={`primary study-send-btn${sending ? ' is-loading' : ''}`}
            disabled={sending || loading || !text.trim()}
            aria-busy={sending}
          >
            <span className="study-send-label">
              {sending ? (
                <>
                  <span className="study-send-spinner" aria-hidden />
                  Enviando…
                </>
              ) : (
                'Enviar'
              )}
            </span>
          </button>
        </div>
      </form>
    </section>
  )
}

function GuardianProgress({ studentId }: { studentId: number }) {
  const [data, setData] = useState<ParentExplorerOverview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setData(await api.getParentExplorerOverview(studentId))
      } catch (err) {
        setError(errorMessage(err))
      }
    })()
  }, [studentId])

  if (error) return <p className="form-error">{error}</p>
  if (!data) return <AppLoader message="Cargando progreso…" variant="section" />

  const xpPct = Math.min(
    100,
    Math.max(0, Math.round((data.xp.xp_into_level / 1000) * 100)),
  )
  const troop = data.troop

  return (
    <div className="guardian-progress">
      <section className="admin-panel">
        <div className="admin-section-head">
          <h3>Nivel y experiencia</h3>
        </div>
        <div className="guardian-xp-card">
          <span className="guardian-xp-level">Nivel {data.xp.level}</span>
          <div
            className="xp-bar guardian-xp-bar"
            title={`${data.xp.xp_into_level}/1000 XP hacia el siguiente nivel`}
          >
            <div className="xp-bar-track">
              <div className="xp-bar-fill" style={{ width: `${xpPct}%` }} />
            </div>
            <span className="xp-bar-frac">
              {data.xp.xp_into_level}
              <span className="xp-bar-max">/1000</span>
            </span>
          </div>
          <p className="muted">
            {data.xp.xp_total.toLocaleString('es')} XP en total · faltan{' '}
            {data.xp.xp_to_next} para el siguiente nivel
          </p>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-section-head">
          <h3>Tripulación</h3>
        </div>
        {!troop ? (
          <p className="muted">Este explorador aún no está en una tripulación.</p>
        ) : (
          <>
            <p className="guardian-troop-summary">
              <strong>{troop.name}</strong>
              {' · '}
              {troopRoleLabel(troop.my_role)}
              {troop.my_rank != null ? ` · #${troop.my_rank} en la tripulación` : ''}
              {troop.weekly_rank != null
                ? ` · tripulación #${troop.weekly_rank} esta semana`
                : ''}
            </p>
            <div className="troops-table-wrap">
              <table className="troops-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Explorador</th>
                    <th>Rol</th>
                    <th>Nivel</th>
                    <th>XP sem.</th>
                  </tr>
                </thead>
                <tbody>
                  {troop.members.map((m) => (
                    <tr
                      key={m.user_id}
                      className={
                        m.user_id === studentId ? 'troops-row--mine' : undefined
                      }
                    >
                      <td>{m.rank}</td>
                      <td>
                        <strong>{m.username}</strong>
                      </td>
                      <td>
                        <span className={`troops-role troops-role--${m.role}`}>
                          {troopRoleLabel(m.role)}
                        </span>
                      </td>
                      <td>{m.level}</td>
                      <td>{m.xp_week}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="admin-panel">
        <div className="admin-section-head">
          <h3>Actividad</h3>
        </div>
        <ul className="guardian-facts">
          <li>
            Tareas: {data.tasks.done}/{data.tasks.total} hechas
            {data.tasks.overdue > 0 ? ` · ${data.tasks.overdue} vencidas` : ''}
          </li>
          <li>
            Misiones: {data.missions.mastered}/{data.missions.total} dominadas
          </li>
          <li>Mundos activos: {data.worlds_count}</li>
          <li>
            Desafíos completados: {data.challenges.completed_count}
            {data.challenges.avg_score != null
              ? ` · promedio ${Math.round(data.challenges.avg_score)}`
              : ''}
          </li>
        </ul>
      </section>
    </div>
  )
}

function GuardianPrefs({ onSaved }: { onSaved: () => void }) {
  const [prefs, setPrefs] = useState<ParentNotifyPrefs | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void api.getParentNotifyPrefs().then(setPrefs).catch((err) => {
      setError(errorMessage(err))
    })
  }, [])

  if (error) return <p className="form-error">{error}</p>
  if (!prefs) return <AppLoader message="Cargando avisos…" variant="section" />

  async function save(next: ParentNotifyPrefs) {
    setSaving(true)
    try {
      setPrefs(await api.updateParentNotifyPrefs(next))
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggles: Array<{ key: keyof ParentNotifyPrefs; label: string }> = [
    { key: 'notify_task_done', label: 'Terminó una tarea' },
    { key: 'notify_task_study_done', label: 'Terminó el estudio de una tarea' },
    { key: 'notify_mission_done', label: 'Terminó el estudio de un tema' },
    { key: 'notify_course_done', label: 'Terminó el estudio de un curso' },
    { key: 'notify_world_done', label: 'Terminó el estudio de un mundo' },
    { key: 'notify_challenge_done', label: 'Completó un desafío' },
    { key: 'notify_inactivity', label: 'Alerta de inactividad (3 días)' },
  ]

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <h3>Avisos</h3>
      </div>
      <TextField
        label="WhatsApp (E.164, ej. +51999…)"
        value={prefs.whatsapp_e164 ?? ''}
        onChange={(e) =>
          setPrefs({ ...prefs, whatsapp_e164: e.target.value || null })
        }
      />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {toggles.map(({ key, label }) => (
          <li key={key}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(prefs[key])}
                onChange={(e) =>
                  setPrefs({ ...prefs, [key]: e.target.checked })
                }
              />{' '}
              {label}
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="primary"
        disabled={saving}
        onClick={() => void save(prefs)}
      >
        {saving ? 'Guardando…' : 'Guardar avisos'}
      </button>
    </section>
  )
}
