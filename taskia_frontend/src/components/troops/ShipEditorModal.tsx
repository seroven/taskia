import { useState } from 'react'
import { DiceFive, MagicWand } from '@phosphor-icons/react'
import { TextField } from '../ui/Field'
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

type SlotKey = 'hull' | 'cockpit' | 'nose' | 'wings' | 'tail' | 'top' | 'belly' | 'decal' | 'windows'

const SLOTS: { key: SlotKey; label: string }[] = [
  { key: 'hull', label: 'Casco' },
  { key: 'cockpit', label: 'Cabina' },
  { key: 'nose', label: 'Nariz' },
  { key: 'wings', label: 'Alas' },
  { key: 'tail', label: 'Cola' },
  { key: 'top', label: 'Arriba' },
  { key: 'belly', label: 'Abajo' },
  { key: 'decal', label: 'Marcas' },
  { key: 'windows', label: 'Ventanillas' },
]

const COLOR_FIELDS: { key: keyof ShipPalette; label: string }[] = [
  { key: 'hull', label: 'Casco' },
  { key: 'trim', label: 'Alas y motores' },
  { key: 'accent', label: 'Detalles' },
  { key: 'glass', label: 'Luz' },
]

function Chips<T extends string>({
  options,
  value,
  onPick,
  label,
}: {
  options: { id: T; label: string }[]
  value: T
  onPick: (id: T) => void
  label: string
}) {
  return (
    <div className="ship-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={option.id === value ? 'ship-chip is-selected' : 'ship-chip'}
          aria-pressed={option.id === value}
          onClick={() => onPick(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
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
      size="lg"
    >
      {/* El modal solo monta su contenido abierto: el borrador nace de la nave actual y se descarta al cerrar. */}
      <ShipEditorForm onClose={onClose} {...form} />
    </ModalShell>
  )
}

function ShipEditorForm({ current, crew, onClose, onSave, onGenerate }: Omit<Props, 'open'>) {
  const [draft, setDraft] = useState<ShipConfig>(current)
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const busy = aiBusy || saving

  return (
    <>
      <div className="modal-panel-body ship-editor">
        <div className="ship-editor-preview">
          <ShipRenderer config={draft} crew={Math.min(Math.max(crew, 1), MAX_CREW)} label="Vista previa de la nave" />
          <div className="ship-editor-tools">
            <button type="button" className="ghost" disabled={busy} onClick={() => setDraft(randomShip(`nave-${Date.now()}`))}>
              <DiceFive size={18} weight="bold" />
              Sorpréndeme
            </button>
          </div>

        </div>

        <div className="ship-editor-options">
          {SLOTS.map((slot) => (
            <section key={slot.key} className="ship-editor-slot">
              <h3>{slot.label}</h3>
              <Chips
                label={slot.label}
                options={SHIP_OPTIONS[slot.key] as { id: string; label: string }[]}
                value={draft[slot.key]}
                onPick={(id) => setDraft({ ...draft, [slot.key]: id })}
              />
            </section>
          ))}

          <section className="ship-editor-slot">
            <h3>Motores</h3>
            <Chips
              label="Tipo de motor"
              options={SHIP_OPTIONS.engine}
              value={draft.engine.kind}
              onPick={(kind) => setDraft({ ...draft, engine: { ...draft.engine, kind } })}
            />
            <Chips
              label="Cuántos motores"
              options={[
                { id: '1', label: '1' },
                { id: '2', label: '2' },
                { id: '3', label: '3' },
              ]}
              value={String(draft.engine.count)}
              onPick={(id) => setDraft({ ...draft, engine: { ...draft.engine, count: Number(id) as 1 | 2 | 3 } })}
            />
            <Chips
              label="Estela"
              options={SHIP_OPTIONS.flame}
              value={draft.engine.flame}
              onPick={(flame) => setDraft({ ...draft, engine: { ...draft.engine, flame } })}
            />
          </section>

          <section className="ship-editor-slot ship-editor-wide">
            <h3>Colores</h3>
            <div className="ship-palettes">
              {PALETTE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="ship-palette"
                  title={preset.label}
                  aria-label={`Paleta ${preset.label}`}
                  onClick={() => setDraft({ ...draft, palette: preset.palette })}
                >
                  <i style={{ background: preset.palette.hull }} />
                  <i style={{ background: preset.palette.trim }} />
                  <i style={{ background: preset.palette.accent }} />
                </button>
              ))}
            </div>
            <div className="ship-colors">
              {COLOR_FIELDS.map((field) => (
                <label key={field.key} className="ship-color">
                  <input
                    type="color"
                    value={draft.palette[field.key]}
                    onChange={(event) =>
                      setDraft({ ...draft, palette: { ...draft.palette, [field.key]: event.target.value } })
                    }
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </section>
      <div className="ship-ai-block ship-editor-wide">
        <p className="ship-ai-title">Pídesela a Taskia</p>
        <TextField
          label="Cuéntale cómo la quieres"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ej. una nave veloz azul con alas grandes"
          maxLength={200}
          disabled={busy}
        />
        <div className="ship-ai-actions">
          <button
            type="button"
            className="ghost"
            disabled={busy || prompt.trim().length < 3}
            onClick={() => {
              void (async () => {
                setAiBusy(true)
                setError(null)
                try {
                  const res = await onGenerate(prompt.trim())
                  setDraft(res.preview)
                } catch (err) {
                  setError(errorMessage(err))
                } finally {
                  setAiBusy(false)
                }
              })()
            }}
          >
            <MagicWand size={18} weight="bold" />
            {aiBusy ? 'Diseñando…' : 'Diseñar con Taskia'}
          </button>
        </div>
      </div>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="ghost" onClick={onClose} disabled={saving}>
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
    </>
  )
}
