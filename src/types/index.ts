export type TeePreference =
  | 'copper'
  | 'creek'
  | 'creek_frost'
  | 'frost'
  | 'frost_gold'
  | 'gold'

export const TEE_LABELS: Record<TeePreference, string> = {
  copper: 'Copper',
  creek: 'Creek (Blue)',
  creek_frost: 'Creek/Frost Combo (Blue/White)',
  frost: 'Frost (White)',
  frost_gold: 'Frost/Gold Combo (White/Gold)',
  gold: 'Gold',
}

export type SignupStatus = 'confirmed' | 'waitlist' | 'cancelled'
export type EventStatus = 'open' | 'closed' | 'groups_generated' | 'notified'

export interface Player {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  ghin_number: string | null
  default_tee_preference: TeePreference | null
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  event_date: string // YYYY-MM-DD
  status: EventStatus
  created_at: string
}

export interface Signup {
  id: string
  player_id: string
  event_id: string
  tee_preference: TeePreference
  status: SignupStatus
  signed_up_at: string
  player?: Player
}

export interface Group {
  id: string
  event_id: string
  tee_time: string // HH:MM:SS
  group_number: number
  created_at: string
  members?: GroupMember[]
}

export interface GroupMember {
  id: string
  group_id: string
  player_id: string
  signup_id: string
  player?: Player
  signup?: Signup
}

export interface AdminSession {
  username: string
  exp: number
}
