import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { AccentProvider } from './accent'
import { AuthProvider } from './auth'
import { ThemeProvider } from './theme'

/** Banco de pruebas visual: solo en dev, con `?lab=scenes`. */
const SceneLab = import.meta.env.DEV
  ? lazy(() => import('./pages/SceneLab').then((m) => ({ default: m.SceneLab })))
  : null
const lab = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('lab') : null
const showLab = SceneLab && lab === 'scenes'
const MapLab = import.meta.env.DEV
  ? lazy(() => import('./pages/MapLab').then((m) => ({ default: m.MapLab })))
  : null
const CampLab = import.meta.env.DEV
  ? lazy(() => import('./pages/CampLab').then((m) => ({ default: m.CampLab })))
  : null
const HubLab = import.meta.env.DEV
  ? lazy(() => import('./pages/HubLab').then((m) => ({ default: m.HubLab })))
  : null

const ShipLab = import.meta.env.DEV
  ? lazy(() => import('./pages/ShipLab').then((m) => ({ default: m.ShipLab })))
  : null
const GalaxyLab = import.meta.env.DEV
  ? lazy(() => import('./pages/GalaxyLab').then((m) => ({ default: m.GalaxyLab })))
  : null
const LoaderLab = import.meta.env.DEV
  ? lazy(() => import('./pages/LoaderLab').then((m) => ({ default: m.LoaderLab })))
  : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {ShipLab && lab === 'ships' ? (
      <ThemeProvider>
        <AccentProvider>
          <Suspense fallback={null}>
            <ShipLab />
          </Suspense>
        </AccentProvider>
      </ThemeProvider>
    ) : GalaxyLab && lab === 'galaxy' ? (
      <ThemeProvider>
        <AccentProvider>
          <Suspense fallback={null}>
            <GalaxyLab />
          </Suspense>
        </AccentProvider>
      </ThemeProvider>
    ) : LoaderLab && lab === 'loader' ? (
      <ThemeProvider>
        <AccentProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <LoaderLab />
            </Suspense>
          </AuthProvider>
        </AccentProvider>
      </ThemeProvider>
    ) : MapLab && lab === 'map' ? (
      <ThemeProvider>
        <AccentProvider>
          <Suspense fallback={null}>
            <MapLab />
          </Suspense>
        </AccentProvider>
      </ThemeProvider>
    ) : CampLab && lab === 'camp' ? (
      <ThemeProvider>
        <AccentProvider>
          <Suspense fallback={null}>
            <CampLab />
          </Suspense>
        </AccentProvider>
      </ThemeProvider>
    ) : HubLab && lab === 'hub' ? (
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
