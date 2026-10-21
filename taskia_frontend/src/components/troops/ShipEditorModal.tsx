import { useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import {
  AppWindow,
  ArrowLeft,
  Broadcast,
  CaretRight,
  Check,
  DiceFive,
  Eye,
  Fire,
  Fish,
  MagicWand,
  NavigationArrow,
  Package,
  PaintBucket,
  Rocket,
  Shapes,
  Sticker,
  Warning,
  AirplaneTilt,
  type Icon,
} from '@phosphor-icons/react'
import { ColorPicker } from '../ui/ColorPicker'
import { ConfirmModal } from '../ui/ConfirmModal'
import { ModalShell } from '../ui/ModalShell'
import { ShipRenderer } from '../ship/ShipRenderer'
import { errorMessage } from '../../lib/errors'
import {
  MAX_CREW,
  PALETTE_PRESETS,
  SHIP_OPTIONS,
  randomShip,
  type ShipConfig,
  type ShipPalette,
} from '../../lib/ship/types'

type Props = {
  open: boolean
  current: ShipConfig
  /** Miembros de la tripulación: cuántas ventanillas ve la vista previa. */
  crew: number
  onClose: () => void
  onSave: (config: ShipConfig) => Promise<void>
  onGenerate: (prompt: string) => Promise<{ preview: ShipConfig; prompt: string }>
}

type SimpleSlot = 'hull' | 'cockpit' | 'nose' | 'wings' | 'tail' | 'top' | 'belly' | 'decal' | 'windows'
type SlotKey = SimpleSlot | 'engine'
type Tab = 'parts' | 'colors' | 'taskia'

const SLOTS: { key: SlotKey; label: string; icon: Icon }[] = [
  { key: 'hull', label: 'Casco', icon: Rocket },
  { key: 'cockpit', label: 'Cabina', icon: Eye },
  { key: 'nose', label: 'Nariz', icon: NavigationArrow },
  { key: 'wings', label: 'Alas', icon: AirplaneTilt },
  { key: 'tail', label: 'Cola', icon: Fish },
  { key: 'engine', label: 'Motores', icon: Fire },
  { key: 'top', label: 'Arriba', icon: Broadcast },
  { key: 'belly', label: 'Abajo', icon: Package },
  { key: 'decal', label: 'Marcas', icon: Sticker },
  { key: 'windows', label: 'Ventanillas', icon: AppWindow },
]

const COLOR_FIELDS: { key: keyof ShipPalette; label: string }[] = [
  { key: 'hull', label: 'Casco' },
  { key: 'trim', label: 'Alas y motores' },
  { key: 'accent', label: 'Detalles' },
  { key: 'glass', label: 'Luz' },
]

const TABS: { key: Tab; label: string; icon: Icon }[] = [
  { key: 'parts', label: 'Piezas', icon: Shapes },
  { key: 'colors', label: 'Colores', icon: PaintBucket },
  { key: 'taskia', label: 'Taskia', icon: MagicWand },
]

const PROMPT_IDEAS = [
  'Una nave veloz azul con alas grandes',
  'Un platillo rosa con muchas ventanas',
  'Un carguero verde con antena y franjas',
  'Un cohete naranja con tres motores',
]

const optionLabel = (slot: SlotKey, draft: ShipConfig) => {
  if (slot === 'engine') return SHIP_OPTIONS.engine.find((o) => o.id === draft.engine.kind)?.label ?? ''
  return (SHIP_OPTIONS[slot] as { id: string; label: string }[]).find((o) => o.id === draft[slot])?.label ?? ''
}

/** Una opción con su nave en miniatura: se ve cómo quedaría puesta en la nave actual. */
function OptionTile({
  preview,
  crew,
  label,
  selected,
  onPick,
}: {
  preview: ShipConfig
  crew: number
  label: string
  selected: boolean
  onPick: () => void
}) {
  return (
    <button type="button" className={`ship-tile${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onPick}>
      <span className="ship-tile-art">
        <ShipRenderer config={preview} crew={crew} animate={false} />
      </span>
      <span className="ship-tile-name">{label}</span>
      {selected && (
        <span className="ship-tile-check" aria-hidden>
          <Check size={12} weight="bold" />
        </span>
      )}
    </button>
  )
}

/** Arma la nave pieza por pieza, o la pide a Taskia; lo que se ve en la vista previa es lo que se guarda. */
export function ShipEditorModal({ open, onClose, ...form }: Props) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="ship-editor-title"
      title="Tu nave"
      lead="Elige las piezas y los colores, o pídele a Taskia una a tu medida."
      panelClassName="ship-editor-modal"
      closeOnBackdrop={false}
    >
      {/* El modal solo monta su contenido abierto: el borrador nace de la nave actual y se descarta al cerrar. */}
      <ShipEditorForm onClose={onClose} {...form} />
    </ModalShell>
  )
}

function ShipEditorForm({ current, crew, onClose, onSave, onGenerate }: Omit<Props, 'open'>) {
  const [draft, setDraft] = useState<ShipConfig>(current)
  const [tab, setTab] = useState<Tab>('parts')
  const [slot, setSlot] = useState<SlotKey | null>(null)
  const [colorKey, setColorKey] = useState<keyof ShipPalette>('hull')
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  /** Falso hasta el primer cambio: abrir el editor no arma la nave a saltos; después, cada pieza nueva aparece con rebote. */
  const [touched, setTouched] = useState(false)
  const bounce = useAnimationControls()

  const busy = aiBusy || saving
  const changed = JSON.stringify(draft) !== JSON.stringify(current)
  const shown = Math.min(Math.max(crew, 1), MAX_CREW)

  /** Todo cambio de la nave pasa por aquí: guarda el borrador, activa las animaciones y la hace rebotar un poco. */
  const update = (next: ShipConfig) => {
    setDraft(next)
    setTouched(true)
    void bounce.start({ y: [0, -9, 0], rotate: [0, -1.6, 1, 0], transition: { duration: 0.55, ease: 'easeOut' } })
  }

  const slotMeta = SLOTS.find((s) => s.key === slot)

  const tiles = <T extends string>(
    options: { id: T; label: string }[],
    value: T,
    apply: (id: T) => ShipConfig,
  ) => (
    <div className="ship-tiles">
      {options.map((option) => (
        <OptionTile
          key={option.id}
          preview={apply(option.id)}
          crew={shown}
          label={option.label}
          selected={option.id === value}
          onPick={() => update(apply(option.id))}
        />
      ))}
    </div>
  )

  const slotOptions = (key: SlotKey) => {
    if (key !== 'engine') {
      const options = SHIP_OPTIONS[key] as { id: string; label: string }[]
      return tiles(options, draft[key], (id) => ({ ...draft, [key]: id }) as ShipConfig)
    }
    return (
      <>
        <h4 className="ship-sub">Tipo</h4>
        {tiles(SHIP_OPTIONS.engine, draft.engine.kind, (kind) => ({ ...draft, engine: { ...draft.engine, kind } }))}
        <h4 className="ship-sub">Cuántos</h4>
        <div className="ship-counts" role="group" aria-label="Cuántos motores">
          {([1, 2, 3] as const).map((count) => (
            <button
              key={count}
              type="button"
              className={`ship-count${draft.engine.count === count ? ' is-selected' : ''}`}
              aria-pressed={draft.engine.count === count}
              onClick={() => update({ ...draft, engine: { ...draft.engine, count } })}
            >
              {count}
            </button>
          ))}
        </div>
        <h4 className="ship-sub">Estela</h4>
        {tiles(SHIP_OPTIONS.flame, draft.engine.flame, (flame) => ({ ...draft, engine: { ...draft.engine, flame } }))}
      </>
    )
  }

  const askTaskia = () => {
    void (async () => {
      setAiBusy(true)
      setError(null)
      try {
        const res = await onGenerate(prompt.trim())
        update(res.preview)
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setAiBusy(false)
      }
    })()
  }

  return (
    <>
      <div className="modal-panel-body ship-editor">
        <div className="ship-editor-preview">
          <motion.div className="ship-editor-stage" animate={bounce}>
            <ShipRenderer config={draft} crew={shown} edit={{ appear: touched }} label="Vista previa de la nave" />
          </motion.div>
          <button type="button" className="ghost" disabled={busy} onClick={() => update(randomShip(`nave-${Date.now()}`))}>
            <DiceFive size={18} weight="bold" />
            Sorpréndeme
          </button>
        </div>

        <div className="ship-editor-panel">
          <div className="ship-tabs" role="tablist" aria-label="Qué quieres cambiar">
            {TABS.map(({ key, label, icon: TabIcon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`ship-tab${tab === key ? ' is-selected' : ''}`}
                onClick={() => setTab(key)}
              >
                <TabIcon size={18} weight="bold" />
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab === 'parts' ? `parts-${slot ?? 'all'}` : tab}
              className="ship-editor-pane"
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.16 }}
            >
              {tab === 'parts' && slot == null && (
                <div className="ship-cards">
                  {SLOTS.map(({ key, label, icon: SlotIcon }) => (
                    <button key={key} type="button" className="ship-card" onClick={() => setSlot(key)}>
                      <span className="ship-card-icon">
                        <SlotIcon size={22} weight="bold" />
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

              {tab === 'parts' && slot != null && slotMeta && (
                <>
                  <button type="button" className="ship-back" onClick={() => setSlot(null)}>
                    <ArrowLeft size={16} weight="bold" />
                    Todas las piezas
                  </button>
                  <h3 className="ship-pane-title">{slotMeta.label}</h3>
                  {slotOptions(slot)}
                </>
              )}

              {tab === 'colors' && (
                <>
                  <h3 className="ship-pane-title">Paletas</h3>
                  <div className="ship-palette-grid">
                    {PALETTE_PRESETS.map((preset) => {
                      const active = (Object.keys(preset.palette) as (keyof ShipPalette)[]).every(
                        (k) => preset.palette[k] === draft.palette[k],
                      )
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={`ship-palette-card${active ? ' is-selected' : ''}`}
                          aria-pressed={active}
                          onClick={() => update({ ...draft, palette: preset.palette })}
                        >
                          <span className="ship-palette-swatches">
                            <i style={{ background: preset.palette.hull }} />
                            <i style={{ background: preset.palette.trim }} />
                            <i style={{ background: preset.palette.accent }} />
                            <i style={{ background: preset.palette.glass }} />
                          </span>
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>
                  <h3 className="ship-pane-title">A tu gusto</h3>
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
                    onChange={(hex) => update({ ...draft, palette: { ...draft.palette, [colorKey]: hex } })}
                  />
                </>
              )}

              {tab === 'taskia' && (
                <div className="ship-taskia">
                  <p className="ship-taskia-lead">
                    <MagicWand size={20} weight="fill" />
                    Cuéntale a Taskia cómo quieres tu nave y ella la arma por ti. Después puedes ajustar cualquier pieza.
                  </p>
                  <label className="ship-taskia-field">
                    <span>Tu idea</span>
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="Ej. una nave veloz azul con alas grandes"
                      maxLength={200}
                      rows={3}
                      disabled={busy}
                    />
                    <small>{prompt.length}/200</small>
                  </label>
                  <div className="ship-ideas" aria-label="Ideas para empezar">
                    {PROMPT_IDEAS.map((idea) => (
                      <button key={idea} type="button" className="ship-idea" disabled={busy} onClick={() => setPrompt(idea)}>
                        {idea}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="primary" disabled={busy || prompt.trim().length < 3} onClick={askTaskia}>
                    <MagicWand size={18} weight="bold" />
                    {aiBusy ? 'Diseñando…' : 'Diseñar con Taskia'}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={() => (changed ? setDiscardOpen(true) : onClose())} disabled={saving}>
          Cancelar
        </button>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setSaving(true)
              setError(null)
              try {
                await onSave(draft)
                onClose()
              } catch (err) {
                setError(errorMessage(err))
              } finally {
                setSaving(false)
              }
            })()
          }}
        >
          {saving ? 'Guardando…' : 'Guardar nave'}
        </button>
      </div>
      <ConfirmModal
        open={discardOpen}
        icon={Warning}
        title="Aún no guardas tu nave"
        message="Si cancelas ahora, los cambios que hiciste se perderán."
        confirmLabel="Cerrar"
        cancelLabel="Seguir"
        onClose={() => setDiscardOpen(false)}
        onConfirm={onClose}
      />
    </>
  )
}
