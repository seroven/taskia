import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { withAppearanceTransition } from './lib/appearanceTransition'

export type AccentId =
  | 'blue'
  | 'teal'
  | 'green'
  | 'amber'
  | 'rose'
  | 'pink'
  | 'violet'

export const ACCENTS: {
  id: AccentId
  label: string
  swatch: string
  swatchDark: string
  mark: string
  markDark: string
}[] = [
  { id: 'blue', label: 'Azul', swatch: '#2563eb', swatchDark: '#60a5fa', mark: '#ffffff', markDark: '#1b1640' },
  { id: 'teal', label: 'Turquesa', swatch: '#0d9488', swatchDark: '#2dd4bf', mark: '#1b1640', markDark: '#1b1640' },
  { id: 'green', label: 'Verde', swatch: '#16a34a', swatchDark: '#4ade80', mark: '#1b1640', markDark: '#1b1640' },
  { id: 'amber', label: 'Ámbar', swatch: '#d97706', swatchDark: '#fbbf24', mark: '#1b1640', markDark: '#1b1640' },
  { id: 'rose', label: 'Fresa', swatch: '#e11d48', swatchDark: '#fb7185', mark: '#ffffff', markDark: '#1b1640' },
  { id: 'pink', label: 'Rosa', swatch: '#db2777', swatchDark: '#f472b6', mark: '#ffffff', markDark: '#1b1640' },
  { id: 'violet', label: 'Violeta', swatch: '#7c3aed', swatchDark: '#a78bfa', mark: '#ffffff', markDark: '#1b1640' },
]

const STORAGE_KEY = 'taskia-accent'

interface AccentContextValue {
  accent: AccentId
  setAccent: (id: AccentId) => void
}

const AccentContext = createContext<AccentContextValue | null>(null)

function getInitialAccent(): AccentId {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (ACCENTS.some((a) => a.id === saved)) return saved as AccentId
  return 'blue'
}

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(getInitialAccent)
  const skipTransition = useRef(true)

  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.accent = accent
      localStorage.setItem(STORAGE_KEY, accent)
    }
    if (skipTransition.current) {
      skipTransition.current = false
      apply()
      return
    }
    withAppearanceTransition(apply)
  }, [accent])

  const setAccent = useCallback((id: AccentId) => {
    setAccentState(id)
  }, [])

  const value = useMemo(() => ({ accent, setAccent }), [accent, setAccent])

  return (
    <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
  )
}

export function useAccent() {
  const ctx = useContext(AccentContext)
  if (!ctx) throw new Error('useAccent debe usarse dentro de AccentProvider')
  return ctx
}
