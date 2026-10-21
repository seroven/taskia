import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Bell,
  MagnifyingGlass,
  Plus,
  SignOut,
  Trophy,
} from '@phosphor-icons/react'
import { api } from '../api'
import { AppLoader } from '../components/AppLoader'
import { ExplorerXpBar } from '../components/ExplorerXpBar'
import { TextField } from '../components/ui/Field'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { ModalShell } from '../components/ui/ModalShell'
import { WorldsNav } from '../components/worlds/WorldsNav'
import { GalaxyUniverse } from '../components/troops/space/GalaxyUniverse'
import { ShipEditorModal } from '../components/troops/ShipEditorModal'
import { TroopSpaceCard } from '../components/troops/TroopSpaceCard'
import { TroopRankingPanel } from '../components/troops/TroopRankingPanel'
import { errorMessage } from '../lib/errors'
import type {
  TroopDetail,
  TroopInvite,
  TroopRankingRow,
  TroopSearchHit,
  UniverseTroop,
} from '../lib/troopsTypes'
import { useToast } from '../toast'

export function TroopsPage({ onBack }: { onBack: () => void }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myTroop, setMyTroop] = useState<TroopDetail | null>(null)
  const [universe, setUniverse] = useState<UniverseTroop[]>([])
  const [myTroopId, setMyTroopId] = useState<number | null>(null)
  const [universeOffset, setUniverseOffset] = useState(0)
  const [universeHasMore, setUniverseHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [openId, setOpenId] = useState<number | null>(null)
  const [openDetail, setOpenDetail] = useState<TroopDetail | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [busy, setBusy] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [shipOpen, setShipOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [rankingOpen, setRankingOpen] = useState(false)
  const [ranking, setRanking] = useState<TroopRankingRow[]>([])
  const [rankingHasMore, setRankingHasMore] = useState(true)
  const [rankingLoading, setRankingLoading] = useState(false)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [inboxInvites, setInboxInvites] = useState<TroopInvite[]>([])
  const [inboxRequests, setInboxRequests] = useState<TroopInvite[]>([])

  const showBackHome = myTroopId != null
  const inboxCount = inboxInvites.length + inboxRequests.length

  async function loadInbox() {
    const box = await api.getTroopInbox()
    setInboxInvites(box.invites)
    setInboxRequests(box.requests)
  }

  async function loadCore() {
    const [me, uni] = await Promise.all([
      api.getMyTroop(),
      api.getTroopUniverse(0, 50),
    ])
    setMyTroop(me.troop)
    setUniverse(uni.troops)
    setMyTroopId(uni.my_troop_id)
    setUniverseOffset(uni.troops.length)
    setUniverseHasMore(uni.has_more)
    const initialOpen = uni.my_troop_id ?? null
    setOpenId(initialOpen)
    if (initialOpen != null) {
      setOpenDetail(me.troop)
    } else {
      setOpenDetail(null)
    }
    await loadInbox()
  }

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await loadCore()
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  /** Lo que ya se sabe de las tripulaciones, para mostrar su ficha al instante mientras llega el detalle. */
  const known = useRef<{ universe: UniverseTroop[]; mine: TroopDetail | null }>({ universe: [], mine: null })
  useEffect(() => {
    known.current = { universe, mine: myTroop }
  }, [universe, myTroop])

  const selectTroop = useCallback(async (id: number) => {
    setOpenId(id)
    // La ficha aparece enseguida con lo que ya se conoce (nombre, nave, nivel, puesto); los miembros llegan después.
    const { universe: all, mine } = known.current
    const row = all.find((troop) => troop.id === id)
    if (mine?.id === id) setOpenDetail(mine)
    else if (row) {
      setOpenDetail({
        id: row.id,
        name: row.name,
        member_count: row.member_count,
        max_members: 10,
        my_role: null,
        members: [],
        level: row.level,
        xp_week: row.xp_week,
        rank: row.rank,
        ship_config: row.ship_config,
        created_at: '',
      })
    }
    setBusy(true)
    try {
      const detail = await api.getTroop(id)
      setOpenDetail(detail)
      if (detail.my_role != null) setMyTroop(detail)
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'No se pudo abrir',
        subtitle: errorMessage(err),
      })
    } finally {
      setBusy(false)
    }
  }, [showToast])

  const requestMoreUniverse = useCallback(() => {
    if (!universeHasMore || loadingMore) return
    void (async () => {
      setLoadingMore(true)
      try {
        const page = await api.getTroopUniverse(universeOffset, 50)
        setUniverse((prev) => {
          const seen = new Set(prev.map((t) => t.id))
          const next = [...prev]
          for (const t of page.troops) {
            if (!seen.has(t.id)) next.push(t)
          }
          return next.slice(0, 200)
        })
        setUniverseOffset((o) => o + page.troops.length)
        setUniverseHasMore(page.has_more && page.troops.length > 0)
      } catch {
        /* silencio: borde sin mensaje */
      } finally {
        setLoadingMore(false)
      }
    })()
  }, [universeHasMore, loadingMore, universeOffset])

  async function ensureRanking(reset = false) {
    if (rankingLoading) return
    if (!reset && ranking.length > 0 && !rankingHasMore) return
    setRankingLoading(true)
    try {
      const offset = reset ? 0 : ranking.length
      const page = await api.getTroopRanking(offset, 50)
      setRanking((prev) => (reset ? page.troops : [...prev, ...page.troops]))
      setRankingHasMore(page.has_more)
    } catch (err) {
      showToast({
        tone: 'error',
        title: 'Ranking',
        subtitle: errorMessage(err),
      })
    } finally {
      setRankingLoading(false)
    }
  }

  async function runAction(fn: () => Promise<void>, okTitle: string, okSub?: string) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await loadCore()
      if (openId != null) {
        const detail = await api.getTroop(openId)
        setOpenDetail(detail)
      }
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
    <div className="space-shell">
      <WorldsNav backLabel="Inicio" onBack={onBack} trailing={<ExplorerXpBar />} />

      {error && <p className="form-error banner">{error}</p>}

      {loading ? (
        <AppLoader context="troops" message="Entrando al universo…" variant="section" />
      ) : (
        <div className="space-stage">
          <GalaxyUniverse
            troops={universe}
            myTroopId={myTroopId}
            openId={openId}
            onSelectTroop={(id) => void selectTroop(id)}
            onClearTroop={() => {
              setOpenId(null)
              setOpenDetail(null)
            }}
            openNames={openDetail?.id === openId ? openDetail?.members.map((m) => m.username) : undefined}
            onRequestMore={requestMoreUniverse}
            focusToken={focusToken}
          />

          <div className="space-overlays">
            {universe.length === 0 && (
              <div className="space-empty">
                <p className="space-empty-title">La galaxia está vacía</p>
                <p>Crea la primera tripulación, arma tu nave e invita a tus compañeros.</p>
              </div>
            )}

            {!myTroop && (
              <button
                type="button"
                className="primary space-create-fab"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={18} weight="bold" />
                Crear tripulación
              </button>
            )}

            {/* La bandeja (invitaciones y solicitudes) solo aparece cuando hay algo pendiente: así no ocupa la pantalla vacía. */}
            {inboxCount > 0 && (
              <button
                type="button"
                className={`space-bell-fab${!myTroop ? ' is-below' : ''}`}
                aria-label={`Bandeja de tripulación: ${inboxCount} pendientes`}
                onClick={() => {
                  setInboxOpen(true)
                  void loadInbox().catch(() => undefined)
                }}
              >
                <Bell size={22} weight="duotone" />
                <span className="space-bell-badge">{inboxCount}</span>
              </button>
            )}

            <button
              type="button"
              className="space-rank-chip"
              aria-label="Clasificación semanal"
              onClick={() => {
                setRankingOpen(true)
                void ensureRanking(ranking.length === 0)
              }}
            >
              <Trophy size={18} weight="fill" />
              Clasificación
            </button>

            {showBackHome && (
              <button
                type="button"
                className="primary space-home-fab"
                onClick={() => {
                  setFocusToken((n) => n + 1)
                  void selectTroop(myTroopId!)
                }}
              >
                Volver a mi tripulación
              </button>
            )}

            <AnimatePresence>
              {openDetail && (
                <div className="space-card-slot" key={openDetail.id}>
                  <TroopSpaceCard
                    detail={openDetail}
                    busy={busy}
                    canRequestJoin={!myTroop && openDetail.my_role == null}
                    onRequestJoin={() =>
                      void runAction(
                        async () => {
                          await api.requestJoinTroop(openDetail.id)
                          await loadInbox()
                        },
                        'Solicitud enviada',
                        openDetail.name,
                      )
                    }
                    onInvite={
                      openDetail.my_role === 'captain' ||
                      openDetail.my_role === 'copilot'
                        ? () => setInviteOpen(true)
                        : undefined
                    }
                    onCustomizeShip={
                      openDetail.my_role === 'captain' ||
                      openDetail.my_role === 'copilot'
                        ? () => setShipOpen(true)
                        : undefined
                    }
                    onLeave={
                      openDetail.my_role
                        ? () => setLeaveOpen(true)
                        : undefined
                    }
                    onSetCopilot={
                      openDetail.my_role === 'captain'
                        ? (userId) =>
                            void runAction(
                              async () => {
                                await api.setTroopCopilot(userId)
                              },
                              userId == null ? 'Copiloto quitado' : 'Nuevo Copiloto',
                            )
                        : undefined
                    }
                    onKick={
                      openDetail.my_role === 'captain'
                        ? (userId) =>
                            void runAction(async () => {
                              await api.kickTroopMember(userId)
                            }, 'Miembro sacado')
                        : undefined
                    }
                  />
                </div>
              )}
            </AnimatePresence>

            {inboxOpen && (
              <div
                className="space-ranking-backdrop"
                onClick={() => setInboxOpen(false)}
                role="presentation"
              >
                <aside
                  className="space-ranking-panel space-inbox-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  <header className="space-ranking-head">
                    <h2>Bandeja</h2>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setInboxOpen(false)}
                    >
                      Cerrar
                    </button>
                  </header>
                  <div className="space-inbox-body">
                    {inboxInvites.length === 0 && inboxRequests.length === 0 && (
                      <p className="troops-muted">No hay nada pendiente.</p>
                    )}
                    {inboxInvites.length > 0 && (
                      <section>
                        <h3>Invitaciones</h3>
                        <ul className="space-inbox-list">
                          {inboxInvites.map((inv) => (
                            <li key={inv.id}>
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
                                    void runAction(async () => {
                                      await api.rejectTroopInvite(inv.id)
                                      await loadInbox()
                                    }, 'Invitación rechazada')
                                  }
                                >
                                  No
                                </button>
                                <button
                                  type="button"
                                  className="primary"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(async () => {
                                      await api.acceptTroopInvite(inv.id)
                                      await loadInbox()
                                    }, '¡Te uniste!', inv.troop_name)
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
                    {inboxRequests.length > 0 && (
                      <section>
                        <h3>Solicitudes</h3>
                        <ul className="space-inbox-list">
                          {inboxRequests.map((req) => (
                            <li key={req.id}>
                              <div>
                                <strong>{req.from_username}</strong>
                                <p className="troops-muted">
                                  Quiere unirse a {req.troop_name}
                                </p>
                              </div>
                              <div className="troops-invite-actions">
                                <button
                                  type="button"
                                  className="ghost"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(async () => {
                                      await api.rejectTroopInvite(req.id)
                                      await loadInbox()
                                    }, 'Solicitud rechazada')
                                  }
                                >
                                  Rechazar
                                </button>
                                <button
                                  type="button"
                                  className="primary"
                                  disabled={busy}
                                  onClick={() =>
                                    void runAction(async () => {
                                      await api.acceptTroopInvite(req.id)
                                      await loadInbox()
                                    }, 'Explorador aceptado', req.from_username)
                                  }
                                >
                                  Aceptar
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </div>
                </aside>
              </div>
            )}

            <AnimatePresence>
              {rankingOpen && (
              <TroopRankingPanel
                rows={ranking}
                myTroopId={myTroopId}
                loading={rankingLoading}
                onMore={() => void ensureRanking(false)}
                onClose={() => setRankingOpen(false)}
                onPick={(id) => {
                  setRankingOpen(false)
                  void selectTroop(id)
                }}
              />
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <CreateTroopModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name) => {
          const created = await api.createTroop(name)
          await loadCore()
          setOpenId(created.id)
          setOpenDetail(created)
          showToast({
            tone: 'success',
            title: '¡Tripulación creada!',
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

      {(openDetail?.my_role != null || myTroop) && (
        <ShipEditorModal
          open={shipOpen}
          current={(openDetail?.my_role != null ? openDetail : myTroop)!.ship_config}
          crew={(openDetail?.my_role != null ? openDetail : myTroop)!.member_count}
          onClose={() => setShipOpen(false)}
          onGenerate={(prompt) => api.generateTroopShip(prompt)}
          onSave={async (config) => {
            const updated = await api.applyTroopShip(config)
            setOpenDetail(updated)
            setMyTroop(updated)
            setUniverse((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ship_config: updated.ship_config } : t)))
            showToast({ tone: 'success', title: 'Nave guardada', subtitle: updated.name })
          }}
        />
      )}

      <ConfirmModal
        open={leaveOpen}
        icon={SignOut}
        title="¿Salir de la tripulación?"
        message={
          openDetail?.my_role === 'captain'
            ? 'Eres Capitán: el mando pasará al Copiloto o al miembro de mayor nivel.'
            : 'Dejarás de ser parte de esta tripulación. Podrás volver si te invitan otra vez.'
        }
        confirmLabel="Sí, salir"
        busy={busy}
        onClose={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false)
          void runAction(() => api.leaveTroop(), 'Saliste de la tripulación')
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
      title="Nueva tripulación"
      lead="Tú serás el Capitán. Luego puedes invitar hasta 9 compañeros."
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
            {submitting ? 'Creando…' : 'Crear tripulación'}
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
      lead="Busca por nombre. Solo quien no esté en otra tripulación puede unirse."
      icon={MagnifyingGlass}
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
        <ul className="troops-search-list">
          {hits.map((hit) => (
            <li key={hit.id} className="troops-search-row">
              <div>
                <strong>{hit.username}</strong>
                <p className="troops-muted">
                  Nivel {hit.level}
                  {hit.in_troop ? ' · ya en una tripulación' : ''}
                </p>
              </div>
              <button
                type="button"
                className="primary"
                disabled={hit.in_troop || invitingId != null}
                onClick={() => {
                  void (async () => {
                    setInvitingId(hit.id)
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
