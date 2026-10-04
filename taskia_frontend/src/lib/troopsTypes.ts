export type TroopRole = 'captain' | 'copilot' | 'member'

export interface TroopMember {
  user_id: number
  username: string
  role: TroopRole
  level: number
  xp_total: number
  xp_week: number
  joined_at: string
  rank: number
  avatar_kind?: 'preset' | 'upload'
  avatar_preset_id?: string | null
  avatar_file?: string | null
  frame_id?: string | null
}

export interface TroopDetail {
  id: number
  name: string
  member_count: number
  max_members: number
  my_role: TroopRole | null
  members: TroopMember[]
  level: number
  xp_week: number
  rank: number | null
  planet_style_id: string
  planet_seed: number
  planet_params: unknown
  created_at: string
}

export interface TroopInvite {
  id: number
  troop_id: number
  troop_name: string
  from_user_id: number
  from_username: string
  direction?: 'invite' | 'request'
  created_at: string
}

export interface TroopInboxResponse {
  invites: TroopInvite[]
  requests: TroopInvite[]
}

export interface TroopMeResponse {
  troop: TroopDetail | null
  invites: TroopInvite[]
}

export interface TroopRankingRow {
  rank: number
  id: number
  name: string
  member_count: number
  xp_week: number
}

export interface TroopRankingResponse {
  week_start: string
  offset: number
  limit: number
  has_more: boolean
  troops: TroopRankingRow[]
}

export interface UniverseTroop {
  id: number
  name: string
  member_count: number
  level: number
  xp_week: number
  rank: number | null
  is_mine: boolean
  planet_style_id: string
  planet_seed: number
  planet_params: unknown
}

export interface UniverseResponse {
  week_start: string
  my_troop_id: number | null
  offset: number
  limit: number
  has_more: boolean
  troops: UniverseTroop[]
}

export interface TroopSearchHit {
  id: number
  username: string
  level: number
  xp_total: number
  in_troop: boolean
}

export function troopRoleLabel(role: TroopRole): string {
  if (role === 'captain') return 'Capitán'
  if (role === 'copilot') return 'Copiloto'
  return 'Explorador'
}
