export const AVATAR_PRESETS = [
  { id: 'rocket', label: 'Cohete', glyph: '🚀' },
  { id: 'comet', label: 'Cometa', glyph: '☄️' },
  { id: 'astronaut', label: 'Astronauta', glyph: '👨‍🚀' },
  { id: 'satellite', label: 'Satélite', glyph: '🛰️' },
  { id: 'alien', label: 'Alienígena', glyph: '👽' },
  { id: 'star', label: 'Estrella', glyph: '⭐' },
] as const

export const FRAME_OPTIONS = [
  { id: 'none', label: 'Sin marco', roles: ['member', 'captain', 'copilot'] },
  { id: 'ring_blue', label: 'Anillo azul', roles: ['member', 'captain', 'copilot'] },
  { id: 'ring_green', label: 'Anillo verde', roles: ['member', 'captain', 'copilot'] },
  { id: 'frame_captain', label: 'Marco Capitán', roles: ['captain'] },
  { id: 'frame_copilot', label: 'Marco Copiloto', roles: ['captain', 'copilot'] },
] as const

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
  /\/$/,
  '',
) || 'http://localhost:3001'

export function avatarUploadUrl(file: string | null | undefined) {
  if (!file) return null
  return `${API_URL}/files/avatars/${encodeURIComponent(file)}`
}

export function presetGlyph(id: string | null | undefined) {
  return AVATAR_PRESETS.find((p) => p.id === id)?.glyph ?? '🚀'
}
