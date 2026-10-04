export const AVATAR_PRESETS = [
  'rocket',
  'comet',
  'astronaut',
  'satellite',
  'alien',
  'star',
] as const

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]

export const FRAME_IDS = [
  'none',
  'ring_blue',
  'ring_green',
  'frame_captain',
  'frame_copilot',
] as const

export type FrameId = (typeof FRAME_IDS)[number]

export function isAvatarPreset(id: string): id is AvatarPresetId {
  return (AVATAR_PRESETS as readonly string[]).includes(id)
}

export function isFrameId(id: string): id is FrameId {
  return (FRAME_IDS as readonly string[]).includes(id)
}

export function frameAllowedForRole(
  frameId: string,
  troopRole: 'captain' | 'copilot' | 'member' | null,
) {
  if (frameId === 'frame_captain') return troopRole === 'captain'
  if (frameId === 'frame_copilot') {
    return troopRole === 'captain' || troopRole === 'copilot'
  }
  return isFrameId(frameId)
}
