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

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const STORAGE_KEY = 'taskia-theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const skipTransition = useRef(true)

  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = theme
      localStorage.setItem(STORAGE_KEY, theme)
    }
    if (skipTransition.current) {
      skipTransition.current = false
      apply()
      return
    }
    withAppearanceTransition(apply)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme],
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
