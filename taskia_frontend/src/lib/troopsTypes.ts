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
}

export interface TroopDetail {
  id: number
  name: string
  member_count: number
  max_members: number
  my_role: TroopRole | null
  members: TroopMember[]
  created_at: string
}

export interface TroopInvite {
  id: number
  troop_id: number
  troop_name: string
  from_user_id: number
  from_username: string
  created_at: string
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
  troops: TroopRankingRow[]
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
