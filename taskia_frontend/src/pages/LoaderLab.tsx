import { AppLoader } from '../components/AppLoader'
import type { Audience, LoaderContext } from '../lib/loaderCopy'

const AUDIENCES: { audience: Audience; title: string; context: LoaderContext }[] = [
  { audience: 'explorer', title: 'Explorador', context: 'worlds' },
  { audience: 'adult', title: 'Guardián', context: 'guardian' },
  { audience: 'adult', title: 'Admin', context: 'admin' },
  { audience: 'neutral', title: 'Sin sesión (arranque)', context: 'general' },
]

const CONTEXTS: LoaderContext[] = ['worlds', 'camp', 'study', 'challenge', 'troops']

/** Solo dev: `?lab=loader` muestra el loader general en cada variante y tono. */
export function LoaderLab() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 28px 64px' }}>
      {AUDIENCES.map(({ audience, title, context: pageContext }) => (
        <section key={title}>
          <h2 style={{ fontFamily: 'var(--font-display)' }}>{title}: pantalla completa</h2>
          <AppLoader message="Cargando mundos…" context={pageContext} audience={audience} />
          <h2 style={{ fontFamily: 'var(--font-display)' }}>{title}: en un panel</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {(audience === 'explorer' ? CONTEXTS : [pageContext]).map((context) => (
              <AppLoader key={context} message="Cargando cursos…" variant="section" context={context} audience={audience} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
