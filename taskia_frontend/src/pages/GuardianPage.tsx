import { useEffect, useState, type FormEvent } from 'react'
import { ChatCircle, ChartBar, GearSix, Shield } from '@phosphor-icons/react'
import { api } from '../api'
import { AppearanceTools } from '../components/AppearanceTools'
import { AppLoader } from '../components/AppLoader'
import { EmptyState } from '../components/EmptyState'
import { SessionActions } from '../components/SessionActions'
import { UserChip } from '../components/UserChip'
import { TextField } from '../components/ui/Field'
import { errorMessage } from '../lib/errors'
import type {
  ParentChatMessage,
  ParentExplorer,
  ParentExplorerOverview,
  ParentNotifyPrefs,
} from '../lib/adminTypes'
import { useToast } from '../toast'

type Tab = 'chat' | 'progress' | 'prefs'

export function GuardianPage() {
  const { showToast } = useToast()
  const [explorers, setExplorers] = useState<ParentExplorer[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('chat')

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const list = await api.listParentExplorers()
        setExplorers(list)
        if (list.length === 1) setSelectedId(list[0]!.id)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const selected = explorers.find((e) => e.id === selectedId) ?? null
  const showList = explorers.length !== 1

  return (
    <div className="worlds-shell admin-shell">
      <header className="topbar">
        <div>
          <p className="brand">Taskia</p>
          <p className="welcome">Panel del guardián</p>
        </div>
        <div className="topbar-actions">
          <AppearanceTools />
          <UserChip />
          <SessionActions />
        </div>
      </header>

      <div className="admin-body">
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
            {showList && selectedId == null && (
              <section className="admin-panel">
                <div className="admin-section-head">
                  <h2>Tus exploradores</h2>
                </div>
                <ul className="admin-followup">
                  {explorers.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="admin-followup-row"
                        onClick={() => {
                          setSelectedId(e.id)
                          setTab('chat')
                        }}
                      >
                        <span className="admin-followup-name">{e.username}</span>
                        <span className="muted">{e.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {selected && (
              <>
                {showList && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setSelectedId(null)}
                  >
                    ← Exploradores
                  </button>
                )}
                <div className="admin-section-head">
                  <h2>{selected.username}</h2>
                  <div className="topbar-actions">
                    <button
                      type="button"
                      className={tab === 'chat' ? 'primary' : 'ghost'}
                      onClick={() => setTab('chat')}
                    >
                      <ChatCircle size={18} /> Chat
                    </button>
                    <button
                      type="button"
                      className={tab === 'progress' ? 'primary' : 'ghost'}
                      onClick={() => setTab('progress')}
                    >
                      <ChartBar size={18} /> Progreso
                    </button>
                    <button
                      type="button"
                      className={tab === 'prefs' ? 'primary' : 'ghost'}
                      onClick={() => setTab('prefs')}
                    >
                      <GearSix size={18} /> Avisos
                    </button>
                  </div>
                </div>
                {tab === 'chat' && <GuardianChat studentId={selected.id} />}
                {tab === 'progress' && (
                  <GuardianProgress studentId={selected.id} />
                )}
                {tab === 'prefs' && (
                  <GuardianPrefs
                    onSaved={() =>
                      showToast({
                        tone: 'success',
                        title: 'Preferencias guardadas',
                        subtitle: 'Así te avisaremos por WhatsApp.',
                      })
                    }
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function GuardianChat({ studentId }: { studentId: number }) {
  const [messages, setMessages] = useState<ParentChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
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

  if (loading) return <AppLoader message="Cargando chat…" variant="section" />

  return (
    <section className="admin-panel admin-panel--wide">
      <p className="muted">
        Pregunta por el avance del explorador. El asistente usa el resumen del
        día cuando exista.
      </p>
      <div className="challenge-review-list" style={{ maxHeight: 360, overflow: 'auto' }}>
        {messages.length === 0 && (
          <p className="muted">Aún no hay mensajes. Escribe la primera pregunta.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="admin-followup-row">
            <strong>{m.role === 'user' ? 'Tú' : 'Asistente'}</strong>
            <p style={{ margin: '4px 0 0' }}>{m.content}</p>
          </div>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      <form onSubmit={(e) => void onSend(e)} className="modal-form">
        <TextField
          label="Mensaje"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="¿Cómo le fue hoy?"
        />
        <button type="submit" className="primary" disabled={sending || !text.trim()}>
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
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

  return (
    <section className="admin-panel">
      <div className="admin-stat-grid">
        <p>
          Tareas: {data.tasks.done}/{data.tasks.total} hechas
          {data.tasks.overdue > 0 ? ` · ${data.tasks.overdue} vencidas` : ''}
        </p>
        <p>
          Misiones: {data.missions.mastered}/{data.missions.total} dominadas
        </p>
        <p>Mundos activos: {data.worlds_count}</p>
        <p>
          Desafíos completados: {data.challenges.completed_count}
          {data.challenges.avg_score != null
            ? ` · promedio ${Math.round(data.challenges.avg_score)}`
            : ''}
        </p>
      </div>
    </section>
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
