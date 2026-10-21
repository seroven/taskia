import { useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import {
  Alien,
  ArrowLeft,
  CaretRight,
  Check,
  DiceFive,
  Eye,
  FrameCorners,
  IdentificationCard,
  Lock,
  Palette,
  Scissors,
  Smiley,
  SmileyWink,
  Sunglasses,
  TShirt,
  UserCircle,
  type Icon,
} from '@phosphor-icons/react'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { errorMessage } from '../../lib/errors'
import { AVATAR_OPTIONS, FRAMES, SWATCHES, frameUnlocked, randomAvatar, type AvatarConfig, type AvatarPalette } from '../../lib/avatar/types'
import { useToast } from '../../toast'
import { AccountForm } from '../AccountForm'
import { ColorPicker } from '../ui/ColorPicker'
import { ConfirmModal } from '../ui/ConfirmModal'
import { ModalShell } from '../ui/ModalShell'
import { AvatarRenderer } from './AvatarRenderer'
import { UserAvatar } from './UserAvatar'

type Tab = 'avatar' | 'colors' | 'frame' | 'account'
type Part = 'base' | 'eyes' | 'mouth' | 'hair' | 'outfit' | 'accessory'

const SECTIONS: { key: Part; label: string; icon: Icon }[] = [
  { key: 'base', label: 'Personaje', icon: Alien },
  { key: 'eyes', label: 'Ojos', icon: Eye },
  { key: 'mouth', label: 'Boca', icon: Smiley },
  { key: 'hair', label: 'Cabello', icon: Scissors },
  { key: 'outfit', label: 'Ropa', icon: TShirt },
  { key: 'accessory', label: 'Accesorio', icon: Sunglasses },
]

const COLOR_FIELDS: { key: keyof AvatarPalette; label: string }[] = [
  { key: 'skin', label: 'Piel' },
  { key: 'hair', label: 'Cabello' },
  { key: 'outfit', label: 'Ropa' },
  { key: 'accent', label: 'Detalles' },
  { key: 'bg', label: 'Fondo' },
]

const TABS: { key: Tab; label: string; icon: Icon }[] = [
  { key: 'avatar', label: 'Avatar', icon: SmileyWink },
  { key: 'colors', label: 'Colores', icon: Palette },
  { key: 'frame', label: 'Marco', icon: FrameCorners },
  { key: 'account', label: 'Cuenta', icon: IdentificationCard },
]

const optionLabel = (part: Part, draft: AvatarConfig) =>
  (AVATAR_OPTIONS[part] as { id: string; label: string }[]).find((option) => option.id === draft[part])?.label ?? ''

/**
 * El perfil del usuario: arma su avatar, elige su marco (se desbloquean por nivel) y cuida su cuenta. Con `required`
 * es la pantalla de bienvenida de quien aún no tiene avatar: no se puede cerrar hasta guardarlo.
 */
export function ProfileModal({ open, onClose, required = false }: { open: boolean; onClose: () => void; required?: boolean }) {
  return (
    <ModalShell
      open={open}
      onClose={required ? undefined : onClose}
      titleId="profile-title"
      title={required ? 'Crea tu avatar' : 'Tu perfil'}
      lead={required ? 'Antes de entrar, arma tu personaje. Después podrás cambiarlo cuando quieras.' : 'Arma tu personaje, elige tu marco y cuida tu cuenta.'}
      panelClassName="ship-editor-modal profile-modal"
      closeOnBackdrop={false}
    >
      {/* El contenido solo se monta abierto: el borrador nace del avatar actual y se descarta al cerrar. */}
      <ProfileForm onClose={onClose} required={required} />
    </ModalShell>
  )
}

function ProfileForm({ onClose, required }: { onClose: () => void; required: boolean }) {
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const initial = user?.avatar_config ?? randomAvatar(user?.username ?? 'taskia')
  const initialFrame = user?.frame_id ?? 'none'
  const [draft, setDraft] = useState<AvatarConfig>(initial)
  const [frame, setFrame] = useState<string>(initialFrame)
  const [tab, setTab] = useState<Tab>('avatar')
  const [section, setSection] = useState<Part | null>(null)
  /** Falso hasta el primer cambio: abrir el perfil no arma el avatar a saltos; después, cada parte nueva rebota. */
  const [touched, setTouched] = useState(false)
  const bounce = useAnimationControls()
  const [colorKey, setColorKey] = useState<keyof AvatarPalette>('skin')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const level = user?.level ?? 1
  const name = user?.username ?? ''
  const tabs = required ? TABS.filter((item) => item.key !== 'account') : TABS
  const changed = JSON.stringify(draft) !== JSON.stringify(initial) || frame !== initialFrame || user?.avatar_config == null

  const sectionMeta = SECTIONS.find((item) => item.key === section)

  /** Todo cambio del avatar o del marco pasa por aquí: activa las animaciones y le da un saltito al avatar. */
  const pulse = () => {
    setTouched(true)
    void bounce.start({ scale: [1, 1.07, 0.98, 1], rotate: [0, -2.5, 1.5, 0], transition: { duration: 0.5, ease: 'easeOut' } })
  }
  const update = (next: AvatarConfig) => {
    setDraft(next)
    pulse()
  }
  const pickFrame = (id: string) => {
    setFrame(id)
    pulse()
  }

  const save = () => {
    void (async () => {
      setSaving(true)
      setError(null)
      try {
        const next = await api.updateMyAvatar({ avatar_config: draft, frame_id: frame })
        setUser(next)
        showToast({ tone: 'success', title: required ? '¡Bienvenido a bordo!' : 'Perfil guardado', subtitle: next.username })
        onClose()
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setSaving(false)
      }
    })()
  }

  const tiles = (part: Part) => (
    <div className="ship-tiles av-tiles">
      {(AVATAR_OPTIONS[part] as { id: string; label: string }[]).map((option) => {
        const selected = draft[part] === option.id
        return (
          <button
            key={option.id}
            type="button"
            className={`ship-tile av-tile${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => update({ ...draft, [part]: option.id } as AvatarConfig)}
          >
            <span className="ship-tile-art av-tile-art">
              <AvatarRenderer config={{ ...draft, [part]: option.id } as AvatarConfig} />
            </span>
            <span className="ship-tile-name">{option.label}</span>
            {selected && (
              <span className="ship-tile-check" aria-hidden>
                <Check size={12} weight="bold" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  return (
    <>
      <div className="modal-panel-body ship-editor profile-editor">
        <div className="ship-editor-preview profile-preview">
          <motion.div animate={bounce} className="profile-preview-avatar">
            <UserAvatar avatar={draft} frame={frame} size={190} name={name} anim={{ appear: touched }} />
          </motion.div>
          <strong className="profile-name">{name}</strong>
          <button type="button" className="ghost" disabled={saving} onClick={() => update(randomAvatar(`yo-${Date.now()}`))}>
            <DiceFive size={18} weight="bold" />
            Sorpréndeme
          </button>
        </div>

        <div className="ship-editor-panel">
          <div className="ship-tabs profile-tabs" role="tablist" aria-label="Qué quieres cambiar" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map(({ key, label, icon: TabIcon }) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={`ship-tab${tab === key ? ' is-selected' : ''}`} onClick={() => setTab(key)}>
                <TabIcon size={18} weight="bold" />
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab === 'avatar' ? `avatar-${section ?? 'all'}` : tab}
              className="ship-editor-pane"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.16 }}
            >
              {tab === 'avatar' && section == null && (
                <div className="ship-cards">
                  {SECTIONS.map(({ key, label, icon: SectionIcon }) => (
                    <button key={key} type="button" className="ship-card" onClick={() => setSection(key)}>
                      <span className="ship-card-icon">
                        <SectionIcon size={22} weight="bold" />
                      </span>
                      <span className="ship-card-text">
                        <small>{label}</small>
                        <strong>{optionLabel(key, draft)}</strong>
                      </span>
                      <CaretRight size={16} weight="bold" className="ship-card-go" />
                    </button>
                  ))}
                </div>
              )}

              {tab === 'avatar' && section != null && sectionMeta && (
                <>
                  <button type="button" className="ship-back" onClick={() => setSection(null)}>
                    <ArrowLeft size={16} weight="bold" />
                    Todas las partes
                  </button>
                  <h3 className="ship-pane-title">{sectionMeta.label}</h3>
                  {tiles(section)}
                </>
              )}

              {tab === 'colors' && (
                <>
                  <div className="ship-colors">
                    {COLOR_FIELDS.map((field) => (
                      <button
                        key={field.key}
                        type="button"
                        className={`ship-color${colorKey === field.key ? ' is-selected' : ''}`}
                        aria-pressed={colorKey === field.key}
                        onClick={() => setColorKey(field.key)}
                      >
                        <i style={{ background: draft.palette[field.key] }} />
                        <span>
                          {field.label}
                          <small>{draft.palette[field.key]}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <ColorPicker
                    key={colorKey}
                    label={COLOR_FIELDS.find((field) => field.key === colorKey)?.label ?? ''}
                    value={draft.palette[colorKey]}
                    swatches={SWATCHES[colorKey]}
                    onChange={(hex) => update({ ...draft, palette: { ...draft.palette, [colorKey]: hex } })}
                  />

                </>
              )}

              {tab === 'frame' && (
                <>
                  <p className="profile-hint">Los marcos se desbloquean al subir de nivel. Tú estás en el nivel {level}.</p>
                  <div className="av-frames">
                    {FRAMES.map((item) => {
                      const unlocked = frameUnlocked(item.id, level)
                      const selected = frame === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`av-frame-card${selected ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}`}
                          disabled={!unlocked}
                          aria-pressed={selected}
                          onClick={() => pickFrame(item.id)}
                        >
                          <UserAvatar avatar={draft} frame={item.id} size={64} name={name} />
                          <strong>{item.label}</strong>
                          <small>
                            {unlocked ? (
                              selected ? 'Elegido' : item.minLevel <= 1 ? 'Disponible' : `Nivel ${item.minLevel}`
                            ) : (
                              <>
                                <Lock size={12} weight="bold" /> Nivel {item.minLevel}
                              </>
                            )}
                          </small>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {tab === 'account' && <AccountForm />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        {!required && (
          <button type="button" className="ghost" onClick={() => (changed ? setDiscardOpen(true) : onClose())} disabled={saving}>
            Cancelar
          </button>
        )}
        <button type="button" className="primary" disabled={saving} onClick={save}>
          <UserCircle size={18} weight="bold" />
          {saving ? 'Guardando…' : required ? 'Guardar y entrar' : 'Guardar perfil'}
        </button>
      </div>

      <ConfirmModal
        open={discardOpen}
        title="Aún no guardas tu perfil"
        message="Si cancelas ahora, los cambios que hiciste se perderán."
        confirmLabel="Cerrar"
        cancelLabel="Seguir"
        onClose={() => setDiscardOpen(false)}
        onConfirm={onClose}
      />
    </>
  )
}
