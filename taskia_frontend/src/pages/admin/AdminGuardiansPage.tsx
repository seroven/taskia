import { useEffect, useState, type FormEvent } from 'react'
import { Plus, Shield } from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { EmptyState } from '../../components/EmptyState'
import { PasswordField, TextField } from '../../components/ui/Field'
import { errorMessage } from '../../lib/errors'
import type { AdminGuardian, AdminStudent } from '../../lib/adminTypes'
import { useToast } from '../../toast'

interface Props {
  onBack: () => void
}

export function AdminGuardiansPage({ onBack }: Props) {
  const { showToast } = useToast()
  const [list, setList] = useState<AdminGuardian[]>([])
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminGuardian | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setList(await api.listGuardians())
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        const [g, s] = await Promise.all([
          api.listGuardians(),
          api.listStudents(),
        ])
        setList(g)
        setStudents(s)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null)
      return
    }
    void api
      .getGuardian(selectedId)
      .then(setDetail)
      .catch((err) => setError(errorMessage(err)))
  }, [selectedId])

  if (loading) return <AppLoader message="Cargando guardianes…" />
  if (error) return <p className="form-error banner">{error}</p>

  return (
    <div className="admin-view">
      <button type="button" className="ghost" onClick={onBack}>
        ← Panel
      </button>
      <div className="admin-section-head">
        <h2>Guardianes</h2>
        <button
          type="button"
          className="primary"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={18} /> Nuevo guardián
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Sin guardianes"
          description="Crea un guardián y vincúlalo a exploradores."
        />
      ) : (
        <ul className="admin-followup">
          {list.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                className="admin-followup-row"
                onClick={() => setSelectedId(g.id)}
              >
                <span className="admin-followup-name">{g.username}</span>
                <span className="muted">
                  {g.explorer_count ?? 0} explorador
                  {(g.explorer_count ?? 0) === 1 ? '' : 'es'}
                  {!g.is_active ? ' · pausado' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {detail && (
        <GuardianDetail
          detail={detail}
          students={students}
          onChanged={async () => {
            await refresh()
            setDetail(await api.getGuardian(detail.id))
          }}
          onClose={() => setSelectedId(null)}
        />
      )}

      {createOpen && (
        <CreateGuardianModal
          students={students}
          onClose={() => setCreateOpen(false)}
          onCreate={async (input) => {
            const created = await api.createGuardian(input)
            showToast({
              tone: 'success',
              title: 'Guardián listo',
              subtitle: `${created.username} ya puede entrar.`,
            })
            setCreateOpen(false)
            await refresh()
            setSelectedId(created.id)
          }}
        />
      )}
    </div>
  )
}

function GuardianDetail({
  detail,
  students,
  onChanged,
  onClose,
}: {
  detail: AdminGuardian
  students: AdminStudent[]
  onChanged: () => Promise<void>
  onClose: () => void
}) {
  const linked = new Set((detail.explorers ?? []).map((e) => e.id))
  const available = students.filter((s) => !linked.has(s.id))

  return (
    <section className="admin-panel" style={{ marginTop: 16 }}>
      <div className="admin-section-head">
        <h3>{detail.username}</h3>
        <button type="button" className="ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <p className="muted">{detail.email}</p>
      <p>
        Estado: {detail.is_active ? 'activo' : 'pausado'}{' '}
        <button
          type="button"
          className="ghost"
          onClick={() =>
            void api
              .updateGuardian(detail.id, { is_active: !detail.is_active })
              .then(onChanged)
          }
        >
          {detail.is_active ? 'Pausar' : 'Reactivar'}
        </button>
      </p>
      <h4>Exploradores vinculados</h4>
      <ul>
        {(detail.explorers ?? []).map((e) => (
          <li key={e.id}>
            {e.username}{' '}
            <button
              type="button"
              className="ghost"
              onClick={() =>
                void api.unlinkGuardianExplorer(detail.id, e.id).then(onChanged)
              }
            >
              Desvincular
            </button>
          </li>
        ))}
      </ul>
      {available.length > 0 && (
        <>
          <h4>Vincular explorador</h4>
          <select
            className="field-control"
            defaultValue=""
            onChange={(e) => {
              const id = Number(e.target.value)
              if (!id) return
              void api.linkGuardianExplorer(detail.id, id).then(onChanged)
              e.target.value = ''
            }}
          >
            <option value="">Elegir…</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.username}
              </option>
            ))}
          </select>
        </>
      )}
    </section>
  )
}

function CreateGuardianModal({
  students,
  onClose,
  onCreate,
}: {
  students: AdminStudent[]
  onClose: () => void
  onCreate: (input: {
    username: string
    email: string
    password: string
    student_ids: number[]
  }) => Promise<void>
}) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({
        username: username.trim(),
        email: email.trim(),
        password,
        student_ids: selected,
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Nuevo guardián</h2>
        <form className="modal-form" onSubmit={(e) => void onSubmit(e)}>
          <TextField
            label="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PasswordField
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <fieldset>
            <legend>Exploradores a vincular</legend>
            {students.map((s) => (
              <label key={s.id} style={{ display: 'block' }}>
                <input
                  type="checkbox"
                  checked={selected.includes(s.id)}
                  onChange={(e) => {
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, s.id]
                        : prev.filter((id) => id !== s.id),
                    )
                  }}
                />{' '}
                {s.username}
              </label>
            ))}
          </fieldset>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary" disabled={submitting}>
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
