export type TutorPhase = 'understanding' | 'practicing' | 'reviewing'

export interface StudyMessage {
  role: string
  content: string
  image_url?: string | null
  created_at: string
}

export interface StudyContext {
  task_id: number
  updated_at: string
  tutor_phase: TutorPhase
  topic_summary: string
  /** Resumen vivo enviado a Gemini (no el chat completo). */
  context_summary: string
  hints_level?: number
  messages: StudyMessage[]
}

export interface StudyExercise {
  id: string
  title: string
  instructions: string
  expected_interaction: string
}

export interface GeminiTutorReply {
  phase: TutorPhase | string
  speak_to_child: string
  ask_questions: string[]
  topic_summary: string
  context_summary?: string
  user_memory_summary?: string
  exercise: StudyExercise | null
  scene?: unknown
  highlight?: string[]
  verdict?: {
    verdict: 'correct' | 'incorrect' | 'unverifiable'
    expected: number | null
    got: number | null
  } | null
  hints_level: number
  study_eval?: {
    passed: boolean
    evidence: string
  }
}

export interface StudySession {
  context: StudyContext
  task: import('../types').Task
}

export interface StudyChatResponse {
  reply: GeminiTutorReply
  context: StudyContext
  study_passed: boolean
  xp_gained?: number
  xp?: {
    level: number
    xp_total: number
    xp_into_level: number
    xp_to_next: number
    awarded: boolean
    xp_gained: number
  }
}

export interface StudyVoiceTurnResponse extends StudyChatResponse {
  understood: true
  transcript: string
  truncated?: boolean
  audio_base64?: string
  mime_type?: string
}

export type StudyVoiceTurnResult =
  | {
      understood: false
      transcript: string
      truncated?: boolean
    }
  | StudyVoiceTurnResponse

export function phaseLabel(phase: string): string {
  switch (phase) {
    case 'practicing':
      return 'Practicando'
    case 'reviewing':
      return 'Repasando'
    default:
      return 'Entendiendo'
  }
}
