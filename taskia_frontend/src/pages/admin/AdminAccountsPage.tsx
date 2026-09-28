import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  Compass,
  LinkBreak,
  Plus,
  Shield,
  UserPlus,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { AppLoader } from '../../components/AppLoader'
import { EmptyState } from '../../components/EmptyState'
import { DataTable } from '../../components/ui/DataTable'
import { PasswordField, TextField } from '../../components/ui/Field'
import { SelectField } from '../../components/ui/SelectField'
import { IconButton } from '../../components/ui/IconButton'
import { ModalShell } from '../../components/ui/ModalShell'
import { SwitchToggle } from '../../components/ui/SwitchToggle'
import { errorMessage } from '../../lib/errors'
import type { AdminGuardian, AdminStudent } from '../../lib/adminTypes'
import { useToast } from '../../toast'

interface Props {
  onBack: () => void
  onOpenExplorer: (id: number) => void
}

type PartnerMode = 'existing' | 'new'

const viewMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
}

export function AdminAccountsPage({ onBack, onOpenExplorer }: Props) {
  const { showToast } = useToast()
  const [guardiansView, setGuardiansView] = useState(false)
  const [explorers, setExplorers] = useState<AdminStudent[]>([])
  const [guardians, setGuardians] = useState<AdminGuardian[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editGuardianId, setEditGuardianId] = useState<number | null>(null)

  async function refresh() {
    const [e, g] = await Promise.all([
      api.listStudents(),
      api.listGuardians(),
    ])
    setExplorers(e)
    setGuardians(g)
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await refresh()
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return <AppLoader message="Cargando cuentas…" />
  }
  if (error) {
    return <p className="form-error banner">{error}</p>
  }

  return (
    <div className="admin-view">
      <div className="admin-toolbar admin-toolbar--accounts">
        <div className="admin-page-head">
          <div>
            <h1>Guardianes y Exploradores</h1>
            <p>Cada explorador va con al menos un guardián, y al revés.</p>
          </div>
        </div>
        <div className="admin-toolbar-actions">
          <IconButton
            icon={ArrowLeft}
            label="Volver al panel"
            onClick={onBack}
          />
          <SwitchToggle
            className="admin-view-switch"
            checked={guardiansView}
            title="Vista de guardianes"
            onChange={setGuardiansView}
          />
          <button
            type="button"
            className="primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={18} weight="bold" />
            {guardiansView ? 'Nuevo guardián' : 'Nuevo explorador'}
          </button>
        </div>
      </div>

      <div className="admin-accounts-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={guardiansView ? 'guardians' : 'explorers'}
            className="admin-accounts-view"
            initial={viewMotion.initial}
            animate={viewMotion.animate}
            exit={viewMotion.exit}
            transition={viewMotion.transition}
          >
            {!guardiansView ? (
              <ExplorersTable
                rows={explorers}
                onOpen={onOpenExplorer}
                onCreate={() => setCreateOpen(true)}
              />
            ) : (
              <GuardiansTable
                rows={guardians}
                onSelect={setEditGuardianId}
                onCreate={() => setCreateOpen(true)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <EditGuardianModal
        guardianId={editGuardianId}
        explorers={explorers}
        onClose={() => setEditGuardianId(null)}
        onOpenExplorer={(id) => {
          setEditGuardianId(null)
          onOpenExplorer(id)
        }}
        onChanged={async () => {
          await refresh()
        }}
      />

      <CreatePairModal
        open={createOpen}
        mode={guardiansView ? 'guardian' : 'explorer'}
        explorers={explorers}
        guardians={guardians}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          setCreateOpen(false)
          await refresh()
          showToast({
            tone: 'success',
            title: guardiansView ? 'Guardián listo' : 'Explorador listo',
            subtitle: 'Ya pueden entrar con su usuario y contraseña.',
          })
        }}
      />
    </div>
  )
}

function ExplorersTable({
  rows,
  onOpen,
  onCreate,
}: {
  rows: AdminStudent[]
  onOpen: (id: number) => void
  onCreate: () => void
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Sin exploradores"
        description="Crea el primero junto con un guardián."
        action={
          <button type="button" className="primary" onClick={onCreate}>
            <UserPlus size={18} weight="fill" />
            Nuevo explorador
          </button>
        }
      />
    )
  }

  return (
    <section className="admin-panel" aria-label="Exploradores">
      <DataTable
        flush
        label="Exploradores"
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={(row) => onOpen(row.id)}
        columns={[
          {
            key: 'explorer',
            header: 'Explorador',
            cell: (row) => (
              <>
                <strong>{row.username}</strong>
                <span className="data-table-sub">{row.email}</span>
              </>
            ),
          },
          {
            key: 'status',
            header: 'Estado',
            cell: (row) => (
              <span className={`admin-pill${row.is_active ? '' : ' is-muted'}`}>
                {row.is_active ? 'Activo' : 'Pausado'}
              </span>
            ),
          },
          {
            key: 'guardians',
            header: 'Guardianes',
            cell: (row) => row.guardian_count ?? 0,
          },
          {
            key: 'courses',
            header: 'Materias',
            cell: (row) => row.course_count ?? 0,
          },
        ]}
      />
    </section>
  )
}

function GuardiansTable({
  rows,
  onSelect,
  onCreate,
}: {
  rows: AdminGuardian[]
  onSelect: (id: number) => void
  onCreate: () => void
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Shield}
        title="Sin guardianes"
        description="Crea el primero junto con un explorador."
        action={
          <button type="button" className="primary" onClick={onCreate}>
            <Plus size={18} weight="bold" />
            Nuevo guardián
          </button>
        }
      />
    )
  }

  return (
    <section className="admin-panel" aria-label="Guardianes">
      <DataTable
        flush
        label="Guardianes"
        rows={rows}
        rowKey={(row) => row.id}
        onRowClick={(row) => onSelect(row.id)}
        columns={[
          {
            key: 'guardian',
            header: 'Guardián',
            cell: (row) => (
              <>
                <strong>{row.username}</strong>
                <span className="data-table-sub">{row.email}</span>
              </>
            ),
          },
          {
            key: 'status',
            header: 'Estado',
            cell: (row) => (
              <span className={`admin-pill${row.is_active ? '' : ' is-muted'}`}>
                {row.is_active ? 'Activo' : 'Pausado'}
              </span>
            ),
          },
          {
            key: 'explorers',
            header: 'Exploradores',
            cell: (row) => row.explorer_count ?? 0,
          },
        ]}
      />
    </section>
  )
}

function EditGuardianModal({
  guardianId,
  explorers,
  onClose,
  onOpenExplorer,
  onChanged,
}: {
  guardianId: number | null
  explorers: AdminStudent[]
  onClose: () => void
  onOpenExplorer: (id: number) => void
  onChanged: () => Promise<void>
}) {
  const { showToast } = useToast()
  const [detail, setDetail] = useState<AdminGuardian | null>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (guardianId == null) {
      setDetail(null)
      return
    }
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const g = await api.getGuardian(guardianId)
        setDetail(g)
        setUsername(g.username)
        setEmail(g.email)
        setPassword('')
        setIsActive(g.is_active)
      } catch (err) {
        showToast({
          tone: 'error',
          title: 'Guardián',
          subtitle: errorMessage(err),
        })
        onClose()
      } finally {
        setLoading(false)
      }
    })()
  }, [guardianId, showToast])

  async function reloadDetail() {
    if (guardianId == null) return
    const g = await api.getGuardian(guardianId)
    setDetail(g)
    await onChanged()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (guardianId == null) return
    setSaving(true)
    setError(null)
    try {
      const g = await api.updateGuardian(guardianId, {
        username: username.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
        is_active: isActive,
      })
      setDetail(g)
      setPassword('')
      await onChanged()
      showToast({
        tone: 'success',
        title: 'Guardián actualizado',
        subtitle: 'Los datos quedaron guardados.',
      })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const linked = detail?.explorers ?? []
  const linkedIds = new Set(linked.map((e) => e.id))
  const available = explorers.filter((e) => !linkedIds.has(e.id) && e.is_active)

  return (
    <ModalShell
      open={guardianId != null}
      onClose={onClose}
      titleId="edit-guardian-title"
      title="Editar guardián"
      lead="Actualiza la cuenta y los exploradores vinculados."
      icon={Shield}
      size="lg"
    >
      {loading || !detail ? (
        <div className="modal-panel-body">
          <AppLoader message="Cargando…" variant="section" />
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="modal-panel-body modal-split-body">
            <div className="modal-split-col">
              <p className="modal-split-col-title">Cuenta</p>
              <TextField
                label="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
                minLength={3}
                autoFocus
              />
              <TextField
                label="Correo"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
              <PasswordField
                label="Nueva contraseña (opcional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={6}
                placeholder="Déjala vacía si no la cambias"
              />
              <label className="worlds-switch-row">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>
                  <strong>Cuenta activa</strong>
                  <span className="muted">
                    {' '}
                    Si la pausas, no podrá entrar.
                  </span>
                </span>
              </label>
            </div>

            <div className="modal-split-col">
              <p className="modal-split-col-title">Exploradores vinculados</p>
              {linked.length === 0 ? (
                <p className="muted">Sin exploradores (no debería ocurrir).</p>
              ) : (
                <ul className="modal-link-list">
                  {linked.map((e) => (
                    <li key={e.id} className="modal-link-row">
                      <button
                        type="button"
                        className="modal-link-row-text"
                        onClick={() => onOpenExplorer(e.id)}
                      >
                        <strong>{e.username}</strong>
                        <span>{e.email}</span>
                      </button>
                      <IconButton
                        icon={LinkBreak}
                        label={`Desvincular ${e.username}`}
                        size={18}
                        onClick={() =>
                          void api
                            .unlinkGuardianExplorer(detail.id, e.id)
                            .then(reloadDetail)
                            .catch((err) =>
                              showToast({
                                tone: 'error',
                                title: 'No se pudo desvincular',
                                subtitle: errorMessage(err),
                              }),
                            )
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
              {available.length > 0 && (
                <SelectField
                  label="Vincular explorador"
                  value=""
                  placeholder="Elegir…"
                  searchable
                  options={available.map((e) => ({
                    value: String(e.id),
                    label: e.username,
                    keywords: `${e.username} ${e.email}`,
                  }))}
                  onChange={(value) => {
                    const id = Number(value)
                    if (!id) return
                    void api
                      .linkGuardianExplorer(detail.id, id)
                      .then(reloadDetail)
                      .catch((err) =>
                        showToast({
                          tone: 'error',
                          title: 'No se pudo vincular',
                          subtitle: errorMessage(err),
                        }),
                      )
                  }}
                />
              )}
            </div>
          </div>

          {error && (
            <p className="form-error" style={{ padding: '0 28px' }}>
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cerrar
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  )
}

function CreatePairModal({
  open,
  mode,
  explorers,
  guardians,
  onClose,
  onCreated,
}: {
  open: boolean
  mode: 'explorer' | 'guardian'
  explorers: AdminStudent[]
  guardians: AdminGuardian[]
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const primaryLabel = mode === 'explorer' ? 'Explorador' : 'Guardián'
  const partnerLabel = mode === 'explorer' ? 'Guardián' : 'Explorador'
  const existingPartners =
    mode === 'explorer'
      ? guardians.filter((g) => g.is_active)
      : explorers.filter((e) => e.is_active)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [partnerMode, setPartnerMode] = useState<PartnerMode>(
    existingPartners.length > 0 ? 'existing' : 'new',
  )
  const [partnerId, setPartnerId] = useState('')
  const [partnerUsername, setPartnerUsername] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [partnerPassword, setPartnerPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setUsername('')
    setEmail('')
    setPassword('')
    setPartnerMode(existingPartners.length > 0 ? 'existing' : 'new')
    setPartnerId('')
    setPartnerUsername('')
    setPartnerEmail('')
    setPartnerPassword('')
    setError(null)
  }, [open, mode, existingPartners.length])

  const partnerOptions = useMemo(
    () =>
      existingPartners.map((p) => ({
        value: String(p.id),
        label: p.username,
        keywords: `${p.username} ${p.email}`,
      })),
    [existingPartners],
  )

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (partnerMode === 'existing' && !partnerId) {
        throw new Error(`Elige un ${partnerLabel.toLowerCase()} existente`)
      }
      if (mode === 'explorer') {
        await api.createStudent({
          username: username.trim(),
          email: email.trim(),
          password,
          ...(partnerMode === 'existing'
            ? { parent_ids: [Number(partnerId)] }
            : {
                new_parent: {
                  username: partnerUsername.trim(),
                  email: partnerEmail.trim(),
                  password: partnerPassword,
                },
              }),
        })
        await onCreated()
      } else {
        await api.createGuardian({
          username: username.trim(),
          email: email.trim(),
          password,
          ...(partnerMode === 'existing'
            ? { student_ids: [Number(partnerId)] }
            : {
                new_student: {
                  username: partnerUsername.trim(),
                  email: partnerEmail.trim(),
                  password: partnerPassword,
                },
              }),
        })
        await onCreated()
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="create-pair-title"
      title={`Nuevo ${primaryLabel.toLowerCase()}`}
      lead={`Debe ir unido a un ${partnerLabel.toLowerCase()} (nuevo o ya existente).`}
      icon={mode === 'explorer' ? Compass : Shield}
    >
      <form className="modal-panel-body" onSubmit={(e) => void onSubmit(e)}>
        <p className="admin-import-label">{primaryLabel}</p>
        <TextField
          label="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="off"
          required
          minLength={3}
          autoFocus
        />
        <TextField
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          required
        />
        <PasswordField
          label="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
          minLength={6}
        />

        <p className="admin-import-label">{partnerLabel}</p>
        <div className="mode-switch" role="group" aria-label={partnerLabel}>
          <button
            type="button"
            className={partnerMode === 'existing' ? 'active' : ''}
            disabled={existingPartners.length === 0}
            onClick={() => setPartnerMode('existing')}
          >
            Existente
          </button>
          <button
            type="button"
            className={partnerMode === 'new' ? 'active' : ''}
            onClick={() => setPartnerMode('new')}
          >
            Nuevo
          </button>
        </div>

        {partnerMode === 'existing' ? (
          <SelectField
            label={`${partnerLabel} existente`}
            value={partnerId}
            placeholder="Elegir…"
            searchable
            required
            options={partnerOptions}
            onChange={setPartnerId}
          />
        ) : (
          <>
            <TextField
              label="Usuario"
              value={partnerUsername}
              onChange={(e) => setPartnerUsername(e.target.value)}
              autoComplete="off"
              required
              minLength={3}
            />
            <TextField
              label="Correo"
              type="email"
              value={partnerEmail}
              onChange={(e) => setPartnerEmail(e.target.value)}
              autoComplete="off"
              required
            />
            <PasswordField
              label="Contraseña"
              value={partnerPassword}
              onChange={(e) => setPartnerPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </>
        )}

        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button
            type="button"
            className="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            <Plus size={18} weight="bold" />
            {submitting ? 'Creando…' : `Crear ${primaryLabel.toLowerCase()}`}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}
