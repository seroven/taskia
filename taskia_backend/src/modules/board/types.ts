export const SCHEMA_VERSION = 1 as const
export const MAX_OBJECTS = 30
export const MAX_CANON = 80
export const GRID_COLS = 160
export const GRID_ROWS = 100

export const SCENE_FALLBACK_MESSAGE = 'No pude dibujarlo bien, ¿lo armamos juntos?'
export const SCENE_DRAWN_MESSAGE = 'Te lo dibujé en la pizarra.'

export type SceneCode =
  | 'BAD_SCHEMA'
  | 'BAD_REFERENCE'
  | 'SIDE_MISMATCH'
  | 'LABEL_OVERLAP'
  | 'OUT_OF_BOUNDS'
  | 'ANSWER_MISMATCH'
  | 'UNDERDETERMINED'
  | 'OVERCONSTRAINED'
  | 'BAD_EXPRESSION'
  | 'MISSING_FACT'
  | 'UNSUPPORTED'

export type SceneIssue = {
  code: SceneCode
  objectId?: string
}

export type Turn = 'left' | 'right'

export type SceneChoice = { id: string; text: string }

export type SceneTask = {
  type: 'enter_value' | 'multiple_choice'
  target: string
  unit?: string
  claimedAnswer?: number | string
  choices?: SceneChoice[]
}

export type SceneObject = {
  id: string
  type: string
  [key: string]: unknown
}

export type Scene = {
  schemaVersion: 1
  objects: SceneObject[]
  task?: SceneTask
}

export type Pt = { x: number; y: number }

export type BoardItem = {
  id: string
  layer: 'ai' | 'student'
  kind: 'rectangle' | 'ellipse' | 'triangle' | 'line' | 'arrow' | 'text' | 'stamp'
  col: number
  row: number
  w: number
  h: number
  text?: string
  color?: string
  endCol?: number
  endRow?: number
}

export type VerdictName = 'correct' | 'incorrect' | 'unverifiable'

export type BoardVerdict = {
  verdict: VerdictName
  expected: number | null
  got: number | null
}
