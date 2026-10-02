import { useEffect, useState, type FormEvent } from 'react'
import {
  MagnifyingGlass,
  Plus,
  SignOut,
  UsersThree,
} from '@phosphor-icons/react'
import { api } from '../api'
import { AppLoader } from '../components/AppLoader'
import { ExplorerXpBar } from '../components/ExplorerXpBar'
import { TextField } from '../components/ui/Field'
import { ModalShell } from '../components/ui/ModalShell'
import { WorldsEmptyState } from '../components/worlds/WorldsEmptyState'
import { WorldsHero } from '../components/worlds/WorldsHero'
import { WorldsNav } from '../components/worlds/WorldsNav'
import { errorMessage } from '../lib/errors'
import {
  troopRoleLabel,
  type TroopDetail,
  type TroopInvite,
  type TroopRankingRow,
  type TroopSearchHit,
} from '../lib/troopsTypes'
import { useToast } from '../toast'

export function TroopsPage({ onBack }: { onBack: () => void }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [troop, setTroop] = useState<TroopDetail | null>(null)
  const [invites, setInvites] = useState<TroopInvite[]>([])
  const [ranking, setRanking] = useState<TroopRankingRow[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const [me, rank] = await Promise.all([
      api.getMyTroop(),
      api.getTroopRanking(),
    ])
    setTroop(me.troop)
    setInvites(me.invites)
    setRanking(rank.troops)
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

  const canInvite =
    troop?.my_role === 'captain' || troop?.my_role === 'copilot'
  const isCaptain = troop?.my_role === 'captain'
  const myRankInWeekly = troop
    ? ranking.find((r) => r.id === troop.id)?.rank ?? null
    : null

  async function runAction(fn: () => Promise<void>, okTitle: string, okSub?: string) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refresh()
      showToast({ tone: 'success', title: okTitle, subtitle: okSub ?? '' })
    } catch (err) {
      const msg = errorMessage(err)
      setError(msg)
      showToast({ tone: 'error', title: 'No se pudo', subtitle: msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="worlds-shell">
      <WorldsNav backLabel="Inicio" onBack={onBack} trailing={<ExplorerXpBar />} />

      {error && <p className="form-error banner">{error}</p>}

      <div className="worlds-content worlds-stage">
        <WorldsHero
          icon={UsersThree}
          title="Tropas"
          lead={
            troop
              ? `${troop.name} · ${troop.member_count}/${troop.max_members} exploradores`
              : 'Crea tu tropa, invita compañeros y sube en el ranking semanal.'
          }
          actions={
            troop ? (
              <div className="troops-hero-actions">
                {canInvite && (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || troop.member_count >= troop.max_members}
                    onClick={() => setInviteOpen(true)}
                  >
                    <Plus size={18} weight="bold" />
                    Invitar
                  </button>
                )}
                <button
                  type="button"
                  className="ghost"
                  disabled={busy}
                  onClick={() => {
                    if (
                      !window.confirm(
                        '¿Salir de la tropa? Si eres Capitán, el mando pasa al Copiloto o al de mayor nivel.',
                      )
                    ) {
                      return
                    }
                    void runAction(
                      () => api.leaveTroop(),
                      'Saliste de la tropa',
                    )
                  }}
                >
                  <SignOut size={18} weight="bold" />
                  Salir
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="primary"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={18} weight="bold" />
                Crear tropa
              </button>
            )
          }
        />

        {loading && <AppLoader message="Cargando tropas…" variant="section" />}

        {!loading && !troop && (
          <>
            {invites.length === 0 ? (
              <WorldsEmptyState
                icon={UsersThree}
                title="Aún no tienes tropa"
                description="Crea una y sé Capitán, o espera una invitación de un compañero."
                action={
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setCreateOpen(true)}
                  >
                    <Plus size={20} weight="bold" />
                    Crear tropa
                  </button>
                }
              />
            ) : (
              <section className="troops-section">
                <h2 className="troops-section-title">Invitaciones</h2>
                <ul className="troops-invite-list">
                  {invites.map((inv) => (
                    <li key={inv.id} className="troops-invite-row">
                      <div>
                        <strong>{inv.troop_name}</strong>
                        <p className="troops-muted">
                          Te invita {inv.from_username}
                        </p>
                      </div>
                      <div className="troops-invite-actions">
                        <button
                          type="button"
                          className="ghost"
                          disabled={busy}
                          onClick={() =>
                            void runAction(
                              () => api.rejectTroopInvite(inv.id),
                              'Invitación rechazada',
                            )
                          }
                        >
                          No, gracias
                        </button>
                        <button
                          type="button"
                          className="primary"
                          disabled={busy}
                          onClick={() =>
                            void runAction(
                              async () => {
                                await api.acceptTroopInvite(inv.id)
                              },
                              '¡Te uniste!',
                              inv.troop_name,
                            )
                          }
                        >
                          Unirme
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {!loading && troop && (
          <section className="troops-section">
            <div className="troops-section-head">
              <h2 className="troops-section-title">Miembros</h2>
              {myRankInWeekly != null && (
                <p className="troops-muted">
                  Tropa #{myRankInWeekly} esta semana
                </p>
              )}
            </div>
            <div className="troops-table-wrap">
              <table className="troops-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Explorador</th>
                    <th>Rol</th>
                    <th>Nivel</th>
                    <th>XP sem.</th>
                    {isCaptain ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {troop.members.map((m) => (
                    <tr key={m.user_id}>
                      <td>{m.rank}</td>
                      <td>
                        <strong>{m.username}</strong>
                      </td>
                      <td>
                        <span
                          className={`troops-role troops-role--${m.role}`}
                        >
                          {troopRoleLabel(m.role)}
                        </span>
                      </td>
                      <td>{m.level}</td>
                      <td>{m.xp_week}</td>
                      {isCaptain ? (
                        <td className="troops-row-actions">
                          {m.role !== 'captain' && (
                            <>
                              {m.role === 'copilot' ? (
                                <button
                                  type="button"
                                  className="ghost troops-mini"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      async () => {
                                        await api.setTroopCopilot(null)
                                      },
                                      'Copiloto quitado',
                                    )
                                  }
                                >
                                  Quitar copiloto
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="ghost troops-mini"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(
                                      async () => {
                                        await api.setTroopCopilot(m.user_id)
                                      },
                                      'Nuevo Copiloto',
                                      m.username,
                                    )
                                  }
                                >
                                  Hacer copiloto
                                </button>
                              )}
                              <button
                                type="button"
                                className="ghost troops-mini troops-mini--danger"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      `¿Sacar a ${m.username} de la tropa?`,
                                    )
                                  ) {
                                    return
                                  }
                                  void runAction(
                                    async () => {
                                      await api.kickTroopMember(m.user_id)
                                    },
                                    'Miembro sacado',
                                    m.username,
                                  )
                                }}
                              >
                                Sacar
                              </button>
                            </>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && (
          <section className="troops-section">
            <h2 className="troops-section-title">Ranking semanal</h2>
            <p className="troops-muted troops-section-lead">
              XP de lunes a domingo · top 50
            </p>
            {ranking.length === 0 ? (
              <p className="troops-muted">Todavía no hay tropas activas.</p>
            ) : (
              <div className="troops-table-wrap">
                <table className="troops-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tropa</th>
                      <th>Miembros</th>
                      <th>XP sem.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          troop?.id === row.id ? 'troops-row--mine' : undefined
                        }
                      >
                        <td>{row.rank}</td>
                        <td>
                          <strong>{row.name}</strong>
                        </td>
                        <td>{row.member_count}</td>
                        <td>{row.xp_week}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      <CreateTroopModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name) => {
          const created = await api.createTroop(name)
          await refresh()
          showToast({
            tone: 'success',
            title: '¡Tropa creada!',
            subtitle: `Eres Capitán de ${created.name}`,
          })
        }}
      />

      <InviteExplorerModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={async (userId, username) => {
          await api.inviteToTroop(userId)
          showToast({
            tone: 'success',
            title: 'Invitación enviada',
            subtitle: username,
          })
        }}
      />
    </div>
  )
}

function CreateTroopModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setError(null)
  }, [open])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 3) {
      setError('El nombre necesita al menos 3 letras')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onCreate(trimmed)
      onClose()
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
      titleId="create-troop-title"
      title="Nueva tropa"
      lead="Tú serás el Capitán. Luego puedes invitar hasta 9 compañeros."
      icon={UsersThree}
    >
      <form className="modal-panel-body" onSubmit={(e) => void onSubmit(e)}>
        <TextField
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. Los Veloces"
          maxLength={80}
          autoFocus
        />
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={submitting}>
            <Plus size={18} weight="bold" />
            {submitting ? 'Creando…' : 'Crear tropa'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

function InviteExplorerModal({
  open,
  onClose,
  onInvite,
}: {
  open: boolean
  onClose: () => void
  onInvite: (userId: number, username: string) => Promise<void>
}) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<TroopSearchHit[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [invitingId, setInvitingId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setHits([])
    setError(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setHits([])
      setError(null)
      return
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true)
        setError(null)
        try {
          setHits(await api.searchExplorers(trimmed))
        } catch (err) {
          setHits([])
          setError(errorMessage(err))
        } finally {
          setSearching(false)
        }
      })()
    }, 280)
    return () => window.clearTimeout(handle)
  }, [q, open])

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="invite-explorer-title"
      title="Invitar explorador"
      lead="Busca por nombre. Solo quien no esté en otra tropa puede unirse."
      icon={MagnifyingGlass}
      size="md"
    >
      <div className="modal-panel-body">
        <TextField
          label="Buscar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Al menos 2 letras…"
          autoFocus
        />
        {error && <p className="form-error">{error}</p>}
        {searching && <p className="troops-muted">Buscando…</p>}
        {!searching && q.trim().length >= 2 && hits.length === 0 && !error && (
          <p className="troops-muted">Nadie con ese nombre.</p>
        )}
        <ul className="troops-search-list">
          {hits.map((hit) => (
            <li key={hit.id} className="troops-search-row">
              <div>
                <strong>{hit.username}</strong>
                <p className="troops-muted">
                  Nivel {hit.level}
                  {hit.in_troop ? ' · ya en una tropa' : ''}
                </p>
              </div>
              <button
                type="button"
                className="primary"
                disabled={hit.in_troop || invitingId != null}
                onClick={() => {
                  void (async () => {
                    setInvitingId(hit.id)
                    setError(null)
                    try {
                      await onInvite(hit.id, hit.username)
                      onClose()
                    } catch (err) {
                      setError(errorMessage(err))
                    } finally {
                      setInvitingId(null)
                    }
                  })()
                }}
              >
                {invitingId === hit.id ? 'Enviando…' : 'Invitar'}
              </button>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
