import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { AccentProvider } from './accent'
import { ThemeProvider } from './theme'

/** Banco de pruebas visual: solo en dev, con `?lab=scenes`. */
const SceneLab = import.meta.env.DEV
  ? lazy(() => import('./pages/SceneLab').then((m) => ({ default: m.SceneLab })))
  : null
const lab = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('lab') : null
const showLab = SceneLab && lab === 'scenes'
const HubLab = import.meta.env.DEV
  ? lazy(() => import('./pages/HubLab').then((m) => ({ default: m.HubLab })))
  : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {HubLab && lab === 'hub' ? (
      <ThemeProvider>
        <AccentProvider>
          <Suspense fallback={null}>
            <HubLab />
          </Suspense>
        </AccentProvider>
      </ThemeProvider>
    ) : showLab && SceneLab ? (
      <ThemeProvider>
        <AccentProvider>
          <Suspense fallback={null}>
            <SceneLab />
          </Suspense>
        </AccentProvider>
      </ThemeProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
