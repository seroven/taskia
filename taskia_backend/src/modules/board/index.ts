export { expandScene, expanderNames, hasExpander, registerExpander, type Canon } from './expand.js'
export { parseMath, solveFor, sidesMatch } from './expression.js'
export {
  coverScene,
  factsConfirmText,
  finishSpeak,
  isConfirmMessage,
  normalizeGapKey,
  parseFactsPayload,
  parseStoredFacts,
  type BoardFact,
  type BoardFactsResult,
} from './facts.js'
export { listBoardGaps, recordBoardGap, type GapOrigin } from './gaps.js'
export { planBoardDraw, settleBoardDraw, type DrawPlan } from './turn.js'
export { gradeBoard, applyVerdictToMastery } from './grade.js'
export { compileBoard, boundsIssues } from './layout.js'
export { measureTarget, registerMeasurer, type Measure } from './measure.js'
export { factsSystemPrompt, readBoardFacts, readBoardFactsList, resolveModelScene } from './draw-call.js'
export { auditScene, drawSceneWithRetries, highlightFromModel, isSceneRecord, prepareScene, sceneFromModel } from './pipeline.js'
export { SCENE_DRAW_PROMPT, SCENE_RETRY_SYSTEM } from './prompt.js'
export { parseScene } from './schema.js'
export { solveCanon } from './solve.js'
export {
  GRID_COLS,
  GRID_ROWS,
  SCENE_DRAWN_MESSAGE,
  SCENE_FALLBACK_MESSAGE,
  type BoardItem,
  type BoardVerdict,
  type Scene,
  type SceneIssue,
} from './types.js'
