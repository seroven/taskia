/**
 * Lugar interno de la pestaña. sessionStorage sobrevive a recargar
 * y se borra al cerrarla. Cada cuenta lee solo lo suyo.
 */

const STORAGE_KEY = 'taskia-place'

export type ExplorerView =
  | 'hub'
  | 'troops'
  | 'board'
  | 'study'
  | 'worlds'
  | 'world'
  | 'course'
  | 'mission'
  | 'challenge'

export type ExplorerPlace = {
  view: ExplorerView
  studyTaskId: number | null
  worldId: number | null
  courseId: number | null
  missionId: number | null
  challengeId: number | null
  challengeReturn: 'world' | 'course'
}

export type AdminPlace = {
  view: 'dashboard' | 'accounts'
  selectedId: number | null
  returnView: 'dashboard' | 'accounts'
}

export interface PlaceStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const EXPLORER_VIEWS = new Set<ExplorerView>([
  'hub',
  'troops',
  'board',
  'study',
  'worlds',
  'world',
  'course',
  'mission',
  'challenge',
])

export const emptyExplorerPlace: ExplorerPlace = {
  view: 'hub',
  studyTaskId: null,
  worldId: null,
  courseId: null,
  missionId: null,
  challengeId: null,
  challengeReturn: 'world',
}

export const emptyAdminPlace: AdminPlace = {
  view: 'dashboard',
  selectedId: null,
  returnView: 'dashboard',
}

function idOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function record(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  return raw as Record<string, unknown>
}

/** Si falta un id, baja a la pantalla anterior que sí se puede abrir. */
export function coerceExplorerPlace(raw: unknown): ExplorerPlace {
  const row = record(raw)
  if (!row || !EXPLORER_VIEWS.has(row.view as ExplorerView)) return emptyExplorerPlace
  const place: ExplorerPlace = {
    view: row.view as ExplorerView,
    studyTaskId: idOf(row.studyTaskId),
    worldId: idOf(row.worldId),
    courseId: idOf(row.courseId),
    missionId: idOf(row.missionId),
    challengeId: idOf(row.challengeId),
    challengeReturn: row.challengeReturn === 'course' ? 'course' : 'world',
  }
  if (place.view === 'study' && place.studyTaskId == null) {
    return { ...place, view: 'board' }
  }
  if (place.view === 'world' && place.worldId == null) {
    return { ...place, view: 'worlds' }
  }
  if (place.view === 'course') {
    if (place.worldId == null) return { ...place, view: 'worlds' }
    if (place.courseId == null) return { ...place, view: 'world' }
  }
  if (place.view === 'mission') {
    if (place.missionId == null || place.worldId == null || place.courseId == null) {
      if (place.worldId != null && place.courseId != null) return { ...place, view: 'course' }
      if (place.worldId != null) return { ...place, view: 'world' }
      return { ...place, view: 'worlds' }
    }
  }
  if (place.view === 'challenge' && place.challengeId == null) {
    if (place.challengeReturn === 'course' && place.worldId != null && place.courseId != null) {
      return { ...place, view: 'course' }
    }
    if (place.worldId != null) return { ...place, view: 'world' }
    return { ...place, view: 'worlds' }
  }
  return place
}

export function coerceAdminPlace(raw: unknown): AdminPlace {
  const row = record(raw)
  if (!row) return emptyAdminPlace
  const view = row.view === 'accounts' ? 'accounts' : 'dashboard'
  const returnView = row.returnView === 'accounts' ? 'accounts' : 'dashboard'
  return { view, selectedId: idOf(row.selectedId), returnView }
}

function browserStore(): PlaceStore | null {
  try {
    return sessionStorage
  } catch {
    return null
  }
}

function readBlob(store: PlaceStore | null): Record<string, unknown> | null {
  if (!store) return null
  try {
    const text = store.getItem(STORAGE_KEY)
    if (!text) return null
    const parsed: unknown = JSON.parse(text)
    const row = record(parsed)
    if (!row || row.v !== 1) return null
    return row
  } catch {
    return null
  }
}

function writeBlob(store: PlaceStore | null, value: unknown) {
  if (!store) return
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* la pestaña puede rechazar el almacenamiento */
  }
}

export function readExplorerPlace(userId: number, store: PlaceStore | null = browserStore()): ExplorerPlace {
  const row = readBlob(store)
  if (!row || row.role !== 'user' || row.userId !== userId) return emptyExplorerPlace
  return coerceExplorerPlace(row)
}

export function writeExplorerPlace(
  userId: number,
  place: ExplorerPlace,
  store: PlaceStore | null = browserStore(),
) {
  writeBlob(store, { v: 1, role: 'user', userId, ...place })
}

export function readAdminPlace(userId: number, store: PlaceStore | null = browserStore()): AdminPlace {
  const row = readBlob(store)
  if (!row || row.role !== 'admin' || row.userId !== userId) return emptyAdminPlace
  return coerceAdminPlace(row)
}

export function writeAdminPlace(
  userId: number,
  place: AdminPlace,
  store: PlaceStore | null = browserStore(),
) {
  writeBlob(store, { v: 1, role: 'admin', userId, ...place })
}

export function readGuardianExplorerId(
  userId: number,
  store: PlaceStore | null = browserStore(),
): number | null {
  const row = readBlob(store)
  if (!row || row.role !== 'parent' || row.userId !== userId) return null
  return idOf(row.selectedId)
}

export function writeGuardianExplorerId(
  userId: number,
  selectedId: number,
  store: PlaceStore | null = browserStore(),
) {
  writeBlob(store, { v: 1, role: 'parent', userId, selectedId })
}
