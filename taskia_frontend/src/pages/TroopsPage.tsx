import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Bell,
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
import { PLANET_STYLES, type PlanetParams } from '../lib/planetStyles'
import type {
  TroopDetail,
  TroopInvite,
  TroopRankingRow,
  TroopSearchHit,
  UniverseTroop,
} from '../lib/troopsTypes'
import { useAuth } from '../auth'
import { useToast } from '../toast'
import { AVATAR_PRESETS, FRAME_OPTIONS } from '../lib/avatars'

export function TroopsPage({ onBack }: { onBack: () => void }) {
  const { showToast } = useToast()
  const { user, setUser } = useAuth()
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
  const [planetOpen, setPlanetOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
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
                Crear tripulación
              </button>
            )}

            <button
              type="button"
              className="space-bell-fab"
              aria-label="Bandeja de tripulación"
              onClick={() => {
                setInboxOpen(true)
                void loadInbox().catch(() => undefined)
              }}
            >
              <Bell size={22} weight="duotone" />
              {inboxCount > 0 && (
                <span className="space-bell-badge">{inboxCount}</span>
              )}
            </button>

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
                Volver a mi tripulación
              </button>
            )}

            <AnimatePresence mode="wait">
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
                    onCustomizePlanet={
                      openDetail.my_role === 'captain' ||
                      openDetail.my_role === 'copilot'
                        ? () => setPlanetOpen(true)
                        : undefined
                    }
                    viewerUserId={user?.id}
                    onEditAvatar={() => setAvatarOpen(true)}
                    onLeave={
                      openDetail.my_role
                        ? () => {
                            if (
                              !window.confirm(
                                '¿Salir de la tripulación? Si eres Capitán, el mando pasa al Copiloto o al de mayor nivel.',
                              )
                            ) {
                              return
                            }
                            void runAction(() => api.leaveTroop(), 'Saliste de la tripulación')
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

      <PlanetStyleModal
        open={planetOpen}
        currentStyleId={openDetail?.planet_style_id ?? myTroop?.planet_style_id}
        onClose={() => setPlanetOpen(false)}
        onPick={async (styleId) => {
          const updated = await api.setTroopPlanetStyle(styleId)
          setOpenDetail(updated)
          setMyTroop(updated)
          setUniverse((prev) =>
            prev.map((t) =>
              t.id === updated.id
                ? {
                    ...t,
                    planet_style_id: updated.planet_style_id,
                    planet_params: updated.planet_params,
                  }
                : t,
            ),
          )
          showToast({
            tone: 'success',
            title: 'Planeta actualizado',
            subtitle: updated.name,
          })
        }}
        onGenerate={async (prompt) => api.generateTroopPlanet(prompt)}
        onApplyAi={async (params) => {
          const updated = await api.applyTroopPlanetParams(params)
          setOpenDetail(updated)
          setMyTroop(updated)
          setUniverse((prev) =>
            prev.map((t) =>
              t.id === updated.id
                ? {
                    ...t,
                    planet_style_id: updated.planet_style_id,
                    planet_params: updated.planet_params,
                  }
                : t,
            ),
          )
          showToast({
            tone: 'success',
            title: 'Planeta con IA aplicado',
            subtitle: updated.name,
          })
        }}
      />

      <AvatarModal
        open={avatarOpen}
        troopRole={openDetail?.my_role ?? myTroop?.my_role ?? null}
        current={user}
        onClose={() => setAvatarOpen(false)}
        onSaved={async (next) => {
          setUser(next)
          if (openId != null) {
            setOpenDetail(await api.getTroop(openId))
          }
          showToast({
            tone: 'success',
            title: 'Avatar guardado',
            subtitle: next.username,
          })
        }}
      />

    </div>
  )
}

function AvatarModal({
  open,
  troopRole,
  current,
  onClose,
  onSaved,
}: {
  open: boolean
  troopRole: 'captain' | 'copilot' | 'member' | null
  current: { avatar_preset_id?: string | null; frame_id?: string | null } | null
  onClose: () => void
  onSaved: (user: import('../types').PublicUser) => Promise<void>
}) {
  const [presetId, setPresetId] = useState('rocket')
  const [frameId, setFrameId] = useState('none')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setPresetId(current?.avatar_preset_id ?? 'rocket')
    setFrameId(current?.frame_id ?? 'none')
    setError(null)
  }, [open, current])

  const roleKey = troopRole ?? 'member'
  const frames = FRAME_OPTIONS.filter((f) =>
    (f.roles as readonly string[]).includes(roleKey),
  )

  async function savePreset() {
    setSubmitting(true)
    setError(null)
    try {
      const next = await api.updateMyAvatar({
        avatar_kind: 'preset',
        avatar_preset_id: presetId,
        frame_id: frameId,
      })
      await onSaved(next)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function onUpload(file: File | null) {
    if (!file) return
    setSubmitting(true)
    setError(null)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
        reader.readAsDataURL(file)
      })
      const next = await api.updateMyAvatar({
        avatar_kind: 'upload',
        image_base64: dataUrl,
        mime_type: file.type,
        frame_id: frameId,
      })
      await onSaved(next)
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
      titleId="avatar-title"
      title="Tu avatar"
      lead="Elige un icono, sube una foto y un marco."
    >
      <div className="modal-panel-body">
        <div className="planet-style-grid">
          {AVATAR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={
                presetId === p.id
                  ? 'planet-style-swatch is-selected'
                  : 'planet-style-swatch'
              }
              onClick={() => setPresetId(p.id)}
            >
              <span className="explorer-avatar-glyph" style={{ fontSize: 28 }}>
                {p.glyph}
              </span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="field-label">Marco</span>
          <select
            className="field-control"
            value={frameId}
            onChange={(e) => setFrameId(e.target.value)}
          >
            {frames.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Subir imagen (opcional)</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
            disabled={submitting}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            disabled={submitting}
            onClick={() => void savePreset()}
          >
            {submitting ? 'Guardando…' : 'Guardar icono'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function PlanetStyleModal({
  open,
  currentStyleId,
  onClose,
  onPick,
  onGenerate,
  onApplyAi,
}: {
  open: boolean
  currentStyleId?: string
  onClose: () => void
  onPick: (styleId: string) => Promise<void>
  onGenerate: (prompt: string) => Promise<{ preview: PlanetParams; prompt: string }>
  onApplyAi: (params: PlanetParams) => Promise<void>
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [preview, setPreview] = useState<PlanetParams | null>(null)
  const [aiBusy, setAiBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setPrompt('')
    setPreview(null)
    setError(null)
    setBusyId(null)
    setAiBusy(false)
  }, [open])

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="planet-style-title"
      title="Estilo del planeta"
      lead="Elige un estilo o pídele a Taskia uno a tu medida."
      size="md"
    >
      <div className="modal-panel-body">
        <div className="planet-style-grid">
          {PLANET_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              className={
                style.id === currentStyleId
                  ? 'planet-style-swatch is-selected'
                  : 'planet-style-swatch'
              }
              disabled={busyId != null || aiBusy}
              onClick={() => {
                void (async () => {
                  setBusyId(style.id)
                  setError(null)
                  try {
                    await onPick(style.id)
                    onClose()
                  } catch (err) {
                    setError(errorMessage(err))
                  } finally {
                    setBusyId(null)
                  }
                })()
              }}
            >
              <span
                className="planet-style-orb"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${style.atmosphere ?? style.color}, ${style.color} 50%, ${style.emissive})`,
                }}
              />
              <span>{style.label}</span>
            </button>
          ))}
        </div>

        <div className="planet-ai-block">
          <p className="planet-ai-title">Diseño con IA</p>
          <p className="planet-ai-lead">
            Describe el planeta (colores, clima, vibe). Verás una vista previa antes de
            aplicarlo.
          </p>
          <TextField
            label="Pedido"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej. un planeta de cristal azul con anillos suaves"
            maxLength={200}
            disabled={aiBusy || busyId != null}
          />
          {preview && (
            <div className="planet-ai-preview">
              <span
                className="planet-style-orb"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${preview.atmosphere ?? preview.color}, ${preview.color} 50%, ${preview.emissive})`,
                }}
                aria-hidden
              />
              <div>
                <strong>{preview.label ?? 'Vista previa'}</strong>
                <p>Así se vería en el universo.</p>
              </div>
            </div>
          )}
          <div className="planet-ai-actions">
            <button
              type="button"
              className="ghost"
              disabled={aiBusy || busyId != null || prompt.trim().length < 3}
              onClick={() => {
                void (async () => {
                  setAiBusy(true)
                  setError(null)
                  try {
                    const res = await onGenerate(prompt.trim())
                    setPreview(res.preview)
                  } catch (err) {
                    setError(errorMessage(err))
                  } finally {
                    setAiBusy(false)
                  }
                })()
              }}
            >
              {aiBusy ? 'Diseñando…' : 'Generar vista previa'}
            </button>
            <button
              type="button"
              disabled={!preview || aiBusy || busyId != null}
              onClick={() => {
                if (!preview) return
                void (async () => {
                  setAiBusy(true)
                  setError(null)
                  try {
                    await onApplyAi(preview)
                    onClose()
                  } catch (err) {
                    setError(errorMessage(err))
                  } finally {
                    setAiBusy(false)
                  }
                })()
              }}
            >
              Aplicar al planeta
            </button>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </ModalShell>
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
