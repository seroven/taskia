import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlass,
  Plus,
  Trophy,
} from '@phosphor-icons/react'
import { api } from '../api'
import { AppLoader } from '../components/AppLoader'
import { ExplorerXpBar } from '../components/ExplorerXpBar'
import { TextField } from '../components/ui/Field'
import { ModalShell } from '../components/ui/ModalShell'
import { WorldsNav } from '../components/worlds/WorldsNav'
import { SpaceUniverse } from '../components/troops/space/SpaceUniverse'
import { TroopSpaceCard } from '../components/troops/TroopSpaceCard'
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
  const [invites, setInvites] = useState<TroopInvite[]>([])
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
  const [rankingOpen, setRankingOpen] = useState(false)
  const [ranking, setRanking] = useState<TroopRankingRow[]>([])
  const [rankingHasMore, setRankingHasMore] = useState(true)
  const [rankingLoading, setRankingLoading] = useState(false)

  const showBackHome = myTroopId != null

  async function loadCore() {
    const [me, uni] = await Promise.all([
      api.getMyTroop(),
      api.getTroopUniverse(0, 50),
    ])
    setMyTroop(me.troop)
    setInvites(me.invites)
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

  const selectTroop = useCallback(async (id: number) => {
    setOpenId(id)
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
        <AppLoader message="Entrando al universo…" variant="section" />
      ) : (
        <div className="space-stage">
          <SpaceUniverse
            troops={universe}
            myTroopId={myTroopId}
            openId={openId}
            onSelectTroop={(id) => void selectTroop(id)}
            onRequestMore={requestMoreUniverse}
            focusToken={focusToken}
          />

          <div className="space-overlays">
            {!myTroop && (
              <button
                type="button"
                className="primary space-create-fab"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={18} weight="bold" />
                Crear tropa
              </button>
            )}

            <button
              type="button"
              className="space-rank-fab"
              aria-label="Ranking semanal"
              onClick={() => {
                setRankingOpen(true)
                void ensureRanking(ranking.length === 0)
              }}
            >
              <Trophy size={22} weight="duotone" />
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
                Volver a mi tropa
              </button>
            )}

            <AnimatePresence mode="wait">
              {openDetail && (
                <div className="space-card-slot" key={openDetail.id}>
                  <TroopSpaceCard
                    detail={openDetail}
                    busy={busy}
                    onInvite={
                      openDetail.my_role === 'captain' ||
                      openDetail.my_role === 'copilot'
                        ? () => setInviteOpen(true)
                        : undefined
                    }
                    onLeave={
                      openDetail.my_role
                        ? () => {
                            if (
                              !window.confirm(
                                '¿Salir de la tropa? Si eres Capitán, el mando pasa al Copiloto o al de mayor nivel.',
                              )
                            ) {
                              return
                            }
                            void runAction(() => api.leaveTroop(), 'Saliste de la tropa')
                          }
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

            {rankingOpen && (
              <div
                className="space-ranking-backdrop"
                onClick={() => setRankingOpen(false)}
                role="presentation"
              >
                <aside
                  className="space-ranking-panel"
                  onClick={(e) => e.stopPropagation()}
                >
                  <header className="space-ranking-head">
                    <h2>Ranking semanal</h2>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setRankingOpen(false)}
                    >
                      Cerrar
                    </button>
                  </header>
                  <ul
                    className="space-ranking-list"
                    onScroll={(e) => {
                      const el = e.currentTarget
                      if (
                        el.scrollTop + el.clientHeight >
                        el.scrollHeight - 48
                      ) {
                        void ensureRanking(false)
                      }
                    }}
                  >
                    {ranking.map((row) => (
                      <li
                        key={row.id}
                        className={
                          row.rank <= 3
                            ? `space-ranking-row space-ranking-row--${row.rank}`
                            : 'space-ranking-row'
                        }
                      >
                        <span className="space-ranking-pos">#{row.rank}</span>
                        <strong>{row.name}</strong>
                        <span className="troops-muted">{row.xp_week} XP</span>
                      </li>
                    ))}
                    {rankingLoading && (
                      <li className="troops-muted">Cargando…</li>
                    )}
                  </ul>
                  {myTroopId != null && (
                    <button
                      type="button"
                      className="ghost space-ranking-jump"
                      onClick={() => {
                        const el = document.querySelector(
                          `.space-ranking-row`,
                        )
                        void el
                        const idx = ranking.findIndex((r) => r.id === myTroopId)
                        if (idx >= 0) {
                          document
                            .querySelectorAll('.space-ranking-row')
                            [idx]?.scrollIntoView({ block: 'center' })
                        }
                      }}
                    >
                      Ir a mi posición
                    </button>
                  )}
                </aside>
              </div>
            )}
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

      {/* invitaciones recibidas (sin tropa): chip simple hasta campana C2 */}
      {!myTroop && invites.length > 0 && (
        <div className="space-invites-strip">
          {invites.map((inv) => (
            <div key={inv.id} className="space-invite-chip">
              <span>
                {inv.troop_name} · {inv.from_username}
              </span>
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() =>
                  void runAction(async () => {
                    await api.acceptTroopInvite(inv.id)
                  }, '¡Te uniste!', inv.troop_name)
                }
              >
                Unirme
              </button>
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
                No
              </button>
            </div>
          ))}
        </div>
      )}
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
