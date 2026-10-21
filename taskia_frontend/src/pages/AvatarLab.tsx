import { useMemo, useState } from 'react'
import { AvatarRenderer } from '../components/avatar/AvatarRenderer'
import { UserAvatar } from '../components/avatar/UserAvatar'
import { AVATAR_OPTIONS, FRAMES, randomAvatar, type AvatarConfig } from '../lib/avatar/types'

type Slot = 'base' | 'eyes' | 'mouth' | 'hair' | 'outfit' | 'accessory'
const SLOTS: Slot[] = ['base', 'eyes', 'mouth', 'hair', 'outfit', 'accessory']

/** Solo dev: `?lab=avatars` muestra cada opción de cada parte sobre un avatar base, los marcos y avatares al azar. */
export function AvatarLab() {
  const [offset, setOffset] = useState(0)
  const base = useMemo<AvatarConfig>(
    () => ({ ...randomAvatar('lab-base'), base: 'human', eyes: 'round', mouth: 'smile', hair: 'short', outfit: 'tee', accessory: 'none' }),
    [],
  )
  const samples = useMemo(() => Array.from({ length: 24 }, (_, i) => randomAvatar(`lab-${offset}-${i}`)), [offset])
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 28px 64px', background: 'var(--bg)', color: 'var(--text)' }}>
      <h2 style={{ fontFamily: 'var(--font-display)' }}>Avatares</h2>
      {SLOTS.map((slot) => (
        <section key={slot}>
          <h3>{slot}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
            {(AVATAR_OPTIONS[slot] as { id: string; label: string }[]).map((option) => (
              <figure key={option.id} style={{ margin: 0, textAlign: 'center' }}>
                <AvatarRenderer config={{ ...base, [slot]: option.id }} size={110} label={option.label} />
                <figcaption style={{ fontWeight: 700 }}>{option.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
      <section>
        <h3>Marcos</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, padding: 16 }}>
          {FRAMES.map((frame) => (
            <figure key={frame.id} style={{ margin: 0, textAlign: 'center' }}>
              <UserAvatar avatar={base} frame={frame.id} size={96} name="Lab" />
              <figcaption style={{ fontWeight: 700, marginTop: 14 }}>
                {frame.label} · nivel {frame.minLevel}
              </figcaption>
              <UserAvatar avatar={base} frame={frame.id} size={36} name="Lab" />
            </figure>
          ))}
        </div>
      </section>
      <section>
        <h3>Al azar</h3>
        <button type="button" onClick={() => setOffset((n) => n + 1)}>
          Otros 24
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12, marginTop: 10 }}>
          {samples.map((config) => (
            <AvatarRenderer key={config.seed} config={config} size={100} label={config.seed} />
          ))}
        </div>
      </section>
    </div>
  )
}
