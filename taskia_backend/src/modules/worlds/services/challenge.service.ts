import { callGemini } from '../../../infrastructure/gemini/gemini.client.js'
import {
  CHALLENGE_GRADE_SYSTEM,
  CHALLENGE_STATEMENT_DRAW_SYSTEM,
  challengeGenerateSystem,
} from '../../../prompts/challenge.js'
import { awardXp, xpForChallenge } from '../../../services/xp.js'
import { AppError, extractJson, truncateChars } from '../../../utils/helpers.js'
import {
  describeBoardJson,
  distributeQuestionCounts,
  drawOpsFitPrompt,
  estimateMaxQuestionsFromMaterial,
  fallbackDrawOpsForPrompt,
  formatCorrectAnswer,
  gradeMultipleChoice,
  groupMissionsByCourse,
  itemWantsBoard,
  normalizeAnswerKey,
  normalizeDrawOps,
  normalizeOptionsList,
  sanitizeFittedDrawOps,
  shuffleArray,
} from '../lib/challenge-logic.js'
import {
  challengeViewFromEntity,
  completeChallenge,
  deleteChallenge,
  deleteInProgressChallenges,
  findActiveMission,
  findActiveWorld,
  findOwnedChallenge,
  insertChallenge,
  insertChallengeQuestion,
  listChallengePresets,
  listChallengeQuestionDetails,
  listChallengeQuestions,
  listCompletedChallenges,
  listCourseMissions,
  listWorldMissions,
  loadMissionStudyBits,
  presetQuestionCount,
  replaceChallengeAnswers,
  setChallengeQuestionCount,
  type MissionView,
} from '../repositories/world.repository.js'
import { parseChallengeAnswers, parseChallengeStart } from '../schemas/world.schema.js'

const MAX_NOTEBOOK = 8000

async function requireMission(missionId: number, userId: number) {
  const mission = await findActiveMission(missionId, userId)
  if (!mission) throw new AppError('Misión no encontrada', 404)
  return mission
}

async function missionsForChallenge(
  userId: number,
  worldId: number,
  scope: string,
  missionId: number | null,
  courseId: number | null,
) {
  if (scope === 'mission') {
    if (missionId == null) throw new AppError('Falta la misión')
    return [await requireMission(missionId, userId)]
  }
  if (scope === 'course') {
    if (courseId == null) throw new AppError('Falta la materia')
    const list = await listCourseMissions(worldId, courseId, userId)
    if (list.length === 0) throw new AppError('No hay misiones en esta materia')
    return list
  }
  if (scope === 'world') {
    const list = await listWorldMissions(worldId, userId)
    if (list.length === 0) throw new AppError('No hay misiones en este mundo')
    return list
  }
  throw new AppError('Alcance no válido')
}

async function loadMissionStudyMaterial(missionId: number) {
  const bits = await loadMissionStudyBits(missionId)
  const userExplanations = bits.user_contents
    .map((content) => String(content ?? '').trim())
    .filter(Boolean)
    .map((content) => truncateChars(content, 900))
  const notebook = String(bits.notebook_context ?? '').trim()
  return {
    topic_summary: truncateChars(String(bits.topic_summary ?? ''), 200),
    context_summary: truncateChars(String(bits.context_summary ?? ''), 500),
    user_explanations: userExplanations,
    studied_text: truncateChars(notebook || userExplanations.join('\n---\n'), MAX_NOTEBOOK),
  }
}

async function ensureChallengeBoardDrawOps(
  items: Array<Record<string, unknown>>,
  missions: MissionView[],
  userId: number,
) {
  const byId = new Map(missions.map((mission) => [mission.id, mission]))
  const boardItems: Array<{ item: Record<string, unknown>; prompt: string }> = []
  for (const item of items) {
    let mid = typeof item.mission_id === 'number' ? item.mission_id : Number(item.mission_id)
    if (!Number.isFinite(mid) || !byId.has(mid)) mid = missions[0]?.id ?? 0
    const mission = byId.get(mid)
    if (!itemWantsBoard(item, Boolean(mission?.uses_board))) continue
    boardItems.push({
      item,
      prompt: typeof item.prompt === 'string' ? item.prompt : '¿Listo?',
    })
  }
  if (boardItems.length === 0) return
  const toDraw = boardItems.filter((row) => !drawOpsFitPrompt(row.prompt, row.item.draw_ops))
  if (toDraw.length > 0) {
    try {
      const raw = await callGemini({
        system: CHALLENGE_STATEMENT_DRAW_SYSTEM,
        user: JSON.stringify({
          problems: toDraw.map((row, index) => ({
            index,
            prompt: row.prompt,
            answer_key: typeof row.item.answer_key === 'string' ? row.item.answer_key : '',
          })),
        }),
        usage: { userId, kind: 'challenge_generate' },
      })
      const parsed = JSON.parse(extractJson(raw)) as unknown
      if (Array.isArray(parsed)) {
        for (const row of parsed) {
          if (!row || typeof row !== 'object') continue
          const rec = row as Record<string, unknown>
          const index = Number(rec.index)
          if (!Number.isFinite(index) || !toDraw[index]) continue
          if (drawOpsFitPrompt(toDraw[index]!.prompt, rec.draw_ops)) {
            toDraw[index]!.item.draw_ops = sanitizeFittedDrawOps(toDraw[index]!.prompt, rec.draw_ops)
          }
        }
      }
    } catch (err) {
      console.error('[challenge:board-ops] no se pudieron completar draw_ops', err)
    }
  }
  for (const row of boardItems) {
    if (!drawOpsFitPrompt(row.prompt, row.item.draw_ops)) {
      row.item.draw_ops = fallbackDrawOpsForPrompt(row.prompt)
    }
  }
}

async function generateQuestionsBatch(
  missions: MissionView[],
  count: number,
  batchOffset: number,
  options: { scope: string; avoidPrompts?: string[]; userId: number },
) {
  const catalog = []
  for (const mission of missions) {
    const study = await loadMissionStudyMaterial(mission.id)
    catalog.push({
      id: mission.id,
      title: mission.title,
      description: mission.description,
      uses_board: mission.uses_board,
      course: mission.course_name,
      topic_summary: study.topic_summary,
      context_summary: study.context_summary,
      studied_text: study.studied_text,
      has_user_content: study.user_explanations.length > 0,
    })
  }
  const mixRule =
    options.scope === 'course'
      ? `- Alcance MATERIA: mezcla las misiones. NO agrupes por “tema 1, tema 2”. Intercala preguntas de distintos temas.`
      : options.scope === 'world'
        ? `- Alcance MUNDO: estas misiones son de UNA sola materia. Mezcla los temas DENTRO de esta materia.`
        : `- Alcance TEMA: todas las preguntas son de esta misión.`
  const boardMissionCount = missions.filter((mission) => mission.uses_board).length
  const maxTheoIfBoard = Math.round(count / 11)
  const minBoardIfBoard = Math.max(0, count - maxTheoIfBoard)
  const boardMixRules =
    boardMissionCount === 0
      ? `Reglas de tipo (SIN pizarra):
- NUNCA kind="board_prompt"; requires_board=false; draw_ops=[].
- La mayoría deben ser EJERCICIOS en texto (aplicar, elegir un caso concreto). Teóricas (definir, “qué es…”, nombrar SIN resolver) como máximo 1 o 2 en el lote, salvo que el material sea solo conceptual.`
      : `Reglas de tipo (PIZARRA):
- Primero decidí si el tema de cada misión REQUIERE pizarra para practicar.
  SÍ requiere: hay que calcular, despejar, construir, dibujar una figura/diagrama o mostrar un procedimiento en el lienzo.
  NO requiere: solo se nombra, define, fecha, clasifica o reconoce (aunque uses_board=true). Entonces NO uses pizarra: trátalo como teórico (MCQ/texto).
- Si SÍ requiere pizarra: priorizá ejercicios prácticos en el lienzo. Relación OBLIGATORIA ≈ 1 pregunta teórica por cada 10 de pizarra (unas 1 de cada 11 es teórica).
  Teórica = multiple_choice / short_text / fill_blank (definir o nombrar). El resto = kind="board_prompt".
  NO conviertas un cálculo o procedimiento en opción múltiple para evitar la pizarra.
${
  boardMissionCount === missions.length
    ? `  En ESTE lote de ${count}: máximo ${maxTheoIfBoard} teórica(s) y al menos ${minBoardIfBoard} board_prompt (si el tema sí se resuelve en el lienzo).`
    : `  Aplica esa proporción 1/10 a las preguntas de las misiones que sí se resuelven en el lienzo. Misiones uses_board=false: NUNCA board_prompt.`
}
- uses_board=false: NUNCA board_prompt; requires_board=false; draw_ops=[].`
  const system = challengeGenerateSystem({ count, mixRule, boardMixRules })
  const user = JSON.stringify({
    target_count: count,
    batch_offset: batchOffset,
    already_asked: options.avoidPrompts ?? [],
    missions: catalog,
    instruction:
      boardMissionCount === 0
        ? `Genera ${count} preguntas nuevas, distintas entre sí y distintas de already_asked. Casi todas EJERCICIOS en texto; teóricas como máximo 1 o 2 (salvo material solo conceptual). Sin pizarra. ÚNICAMENTE con base en studied_text / topic_summary / context_summary / description.`
        : boardMissionCount === missions.length
          ? `Genera ${count} preguntas nuevas, distintas entre sí y distintas de already_asked. Si el tema se resuelve en el lienzo: máximo ${maxTheoIfBoard} teórica(s) y al menos ${minBoardIfBoard} board_prompt (relación 1 teórica / 10 pizarra). Si el tema NO pide pizarra para practicar (solo nombrar/definir), no inventes board_prompt. ÚNICAMENTE con base en studied_text / topic_summary / context_summary / description.`
          : `Genera ${count} preguntas nuevas, distintas entre sí y distintas de already_asked. En misiones que sí se resuelven en pizarra: ~1 teórica por cada 10 board_prompt. En misiones conceptuales o uses_board=false: texto/MCQ, sin pizarra. ÚNICAMENTE con base en studied_text / topic_summary / context_summary / description.`,
  })
  const raw = await callGemini({
    system,
    user,
    usage: { userId: options.userId, kind: 'challenge_generate' },
  })
  console.log('[challenge:generate] raw Gemini response:\n', raw)
  const jsonText = extractJson(raw)
  let value: unknown
  try {
    value = JSON.parse(jsonText)
  } catch (err) {
    console.error('[challenge:generate] JSON parse failed. extractJson=\n', jsonText, err)
    throw new AppError('No se pudieron generar las preguntas')
  }
  if (!Array.isArray(value)) {
    console.error('[challenge:generate] expected array, got:', value)
    throw new AppError('Gemini no devolvió un array de preguntas')
  }
  return value as Array<Record<string, unknown>>
}

async function generateQuestionsUpTo(
  missions: MissionView[],
  count: number,
  scope: string,
  userId: number,
) {
  if (count <= 0 || missions.length === 0) return []
  const collected: Array<Record<string, unknown>> = []
  const seen = new Set<string>()
  let emptyStreak = 0
  const takeNew = (part: Array<Record<string, unknown>>) => {
    let added = 0
    for (const item of part) {
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim().toLowerCase() : ''
      if (!prompt || seen.has(prompt)) continue
      seen.add(prompt)
      collected.push(item)
      added += 1
      if (collected.length >= count) break
    }
    return added
  }
  while (collected.length < count && emptyStreak < 2) {
    const need = Math.min(12, count - collected.length)
    const part = await generateQuestionsBatch(missions, need, collected.length, {
      scope,
      avoidPrompts: [...seen],
      userId,
    })
    const added = takeNew(part)
    if (added === 0) emptyStreak += 1
    else emptyStreak = 0
  }
  return collected.slice(0, count)
}

export async function getChallengeDetail(challengeId: number, userId: number) {
  const row = await findOwnedChallenge(challengeId, userId)
  if (!row) throw new AppError('Desafío no encontrado', 404)
  const challenge = challengeViewFromEntity(row)
  const isCompleted = challenge.status === 'completed'
  const qrows = await listChallengeQuestionDetails(challengeId)
  let currentIndex = 0
  const questions = qrows.map((question, index) => {
    const answered = question.is_correct != null
    if (answered) currentIndex = index + 1
    let options = normalizeOptionsList(question.options_json)
    const kind = String(question.kind)
    if (kind === 'multiple_choice' && (!options || options.length < 2)) {
      console.warn('[challenge:detail] MCQ without usable options', Number(question.id), question.options_json)
      options = null
    }
    const answerKey = String(question.answer_key ?? '')
    const base = {
      id: Number(question.id),
      mission_id: question.mission_id == null ? null : Number(question.mission_id),
      course_id: question.course_id == null ? null : Number(question.course_id),
      course_name: question.course_name == null ? null : String(question.course_name),
      sort_order: Number(question.sort_order),
      kind,
      prompt: String(question.prompt),
      options,
      requires_board: Number(question.requires_board) !== 0,
      prompt_draw_ops:
        Number(question.requires_board) !== 0 ? normalizeDrawOps(question.prompt_draw_ops) : [],
      answered,
      is_correct: question.is_correct == null ? null : Number(question.is_correct) !== 0,
      user_answer: null as string | null,
      correct_answer: null as string | null,
    }
    if (isCompleted) {
      base.user_answer = question.user_answer == null ? null : String(question.user_answer)
      base.correct_answer = formatCorrectAnswer(kind, answerKey, options)
    }
    return base
  })
  if (currentIndex >= questions.length) {
    currentIndex = Math.max(0, questions.length - 1)
    if (questions.length > 0 && questions.every((question) => question.answered)) {
      currentIndex = questions.length
    }
  }
  return { challenge, questions, current_index: currentIndex }
}

async function gradeOpenAnswersBatch(
  items: Array<{
    question_id: number
    prompt: string
    answer_key: string
    child_answer: string
    requires_board: boolean
    board_description: string
  }>,
  userId: number,
  boardImages: Array<{ question_id: number; data: string }> = [],
) {
  const results = new Map<number, boolean>()
  if (items.length === 0) return results
  const images = boardImages.slice(0, 6).map((image) => ({
    data: image.data,
    caption: `Pizarra del alumno para question_id=${image.question_id}. Úsala para juzgar el dibujo, no el enunciado de la IA.`,
  }))
  const raw = await callGemini({
    system: CHALLENGE_GRADE_SYSTEM,
    user: JSON.stringify({ items }),
    boardImages: images,
    usage: { userId, kind: 'challenge_grade' },
  })
  console.log('[challenge:grade-batch] raw Gemini response:\n', raw)
  let value: unknown
  try {
    value = JSON.parse(extractJson(raw))
  } catch {
    console.error('[challenge:grade-batch] parse failed', raw)
    value = []
  }
  if (Array.isArray(value)) {
    for (const row of value) {
      if (!row || typeof row !== 'object') continue
      const obj = row as Record<string, unknown>
      const id = Number(obj.question_id)
      if (!Number.isFinite(id)) continue
      results.set(id, Boolean(obj.correct))
    }
  }
  for (const item of items) {
    if (!results.has(item.question_id)) results.set(item.question_id, false)
  }
  return results
}

export async function listPresets() {
  return listChallengePresets()
}

export async function startChallenge(userId: number, body: Record<string, unknown>) {
  const start = parseChallengeStart(body)
  const world = await findActiveWorld(start.worldId, userId)
  if (!world) throw new AppError('Mundo no encontrado', 404)
  await deleteInProgressChallenges(userId)
  const questionCount = await presetQuestionCount(start.scope, start.difficulty)
  if (questionCount == null) throw new AppError('Dificultad o alcance no válido')
  const missions = await missionsForChallenge(
    userId,
    start.worldId,
    start.scope,
    start.missionId,
    start.courseId,
  )
  const materialSnapshots = []
  for (const mission of missions) {
    const study = await loadMissionStudyMaterial(mission.id)
    materialSnapshots.push({
      description: mission.description,
      topic_summary: study.topic_summary,
      context_summary: study.context_summary,
      studied_text: study.studied_text,
    })
  }
  const total = estimateMaxQuestionsFromMaterial(materialSnapshots, questionCount)
  if (total < questionCount) {
    console.log(
      `[challenge:start] capped questions ${questionCount} → ${total} based on study material`,
    )
  }
  const challengeId = await insertChallenge({
    userId,
    worldId: start.worldId,
    scope: start.scope,
    missionId: start.missionId,
    courseId: start.courseId,
    difficulty: start.difficulty,
    questionCount: total,
  })
  let generated: Array<Record<string, unknown>> = []
  try {
    if (start.scope === 'world') {
      const groups = groupMissionsByCourse(missions)
      const counts = distributeQuestionCounts(
        groups.map((group) => group.missions.length),
        total,
      )
      for (let i = 0; i < groups.length; i += 1) {
        const group = groups[i]!
        const need = counts[i] ?? 0
        if (need <= 0) continue
        const part = await generateQuestionsUpTo(group.missions, need, 'world', userId)
        generated.push(...shuffleArray(part))
      }
    } else if (start.scope === 'course') {
      generated = shuffleArray(await generateQuestionsUpTo(missions, total, 'course', userId))
    } else {
      generated = await generateQuestionsUpTo(missions, total, 'mission', userId)
    }
  } catch (err) {
    await deleteChallenge(challengeId)
    throw err
  }
  try {
    await ensureChallengeBoardDrawOps(generated, missions, userId)
  } catch (err) {
    console.error('[challenge:start] ensure board draw_ops failed', err)
  }
  const missionIds = new Set(missions.map((mission) => mission.id))
  let sortOrder = 0
  for (const item of generated.slice(0, total)) {
    let mid = typeof item.mission_id === 'number' ? item.mission_id : Number(item.mission_id)
    if (!Number.isFinite(mid) || !missionIds.has(mid)) mid = missions[0]!.id
    const mission = missions.find((row) => row.id === mid) ?? missions[0]!
    let kind = typeof item.kind === 'string' ? item.kind : 'short_text'
    const wantsBoard = itemWantsBoard(item, mission.uses_board)
    let requiresBoard = wantsBoard
    if (wantsBoard) {
      kind = 'board_prompt'
    } else {
      requiresBoard = false
      if (kind === 'board_prompt') kind = 'multiple_choice'
      if (!['multiple_choice', 'short_text', 'fill_blank'].includes(kind)) kind = 'multiple_choice'
    }
    const prompt = typeof item.prompt === 'string' ? item.prompt : '¿Listo?'
    let options = normalizeOptionsList(item.options)
    if (kind === 'multiple_choice') {
      if (!options || options.length < 2) {
        console.warn(
          '[challenge:start] MCQ missing options; falling back to short_text. item=',
          JSON.stringify(item),
        )
        kind = 'short_text'
        options = null
      } else if (options.length > 4) {
        options = options.slice(0, 4)
      } else {
        while (options.length < 4) {
          options.push(`Opción ${String.fromCharCode(65 + options.length)}`)
        }
      }
    } else {
      options = null
    }
    const answerKey = normalizeAnswerKey(
      kind,
      typeof item.answer_key === 'string' ? item.answer_key : '',
      options,
    )
    const promptDrawOps = requiresBoard
      ? drawOpsFitPrompt(prompt, item.draw_ops)
        ? normalizeDrawOps(item.draw_ops)
        : fallbackDrawOpsForPrompt(prompt)
      : null
    await insertChallengeQuestion({
      challengeId,
      missionId: mid,
      sortOrder,
      kind,
      prompt,
      options,
      answerKey,
      requiresBoard,
      promptDrawOps,
    })
    sortOrder += 1
  }
  if (sortOrder === 0) {
    await deleteChallenge(challengeId)
    throw new AppError(
      'Todavía no hay suficiente material estudiado para armar un desafío. Seguí estudiando un poquito más e intentá de nuevo.',
    )
  }
  await setChallengeQuestionCount(challengeId, sortOrder)
  return getChallengeDetail(challengeId, userId)
}

export async function getChallenge(userId: number, challengeId: number) {
  return getChallengeDetail(challengeId, userId)
}

export async function discardChallenge(userId: number, challengeId: number) {
  const row = await findOwnedChallenge(challengeId, userId)
  if (!row) throw new AppError('Desafío no encontrado', 404)
  if (row.status === 'completed') {
    throw new AppError('No se puede descartar un desafío ya completado')
  }
  await deleteChallenge(challengeId, userId)
  return { ok: true }
}

export async function finishChallenge(
  userId: number,
  challengeId: number,
  body: Record<string, unknown>,
) {
  const row = await findOwnedChallenge(challengeId, userId)
  if (!row) throw new AppError('Desafío no encontrado', 404)
  if (row.status === 'completed') return getChallengeDetail(challengeId, userId)
  const answersRaw = parseChallengeAnswers(body)
  const answerMap = new Map<
    number,
    {
      user_answer: string
      board_json: unknown
      board_description: string
      board_image_base64: string
    }
  >()
  for (const answer of answersRaw) {
    if (!answer || typeof answer !== 'object') continue
    const obj = answer as Record<string, unknown>
    const questionId = Number(obj.question_id)
    if (!Number.isFinite(questionId)) continue
    answerMap.set(questionId, {
      user_answer: typeof obj.user_answer === 'string' ? obj.user_answer : '',
      board_json: obj.board_json ?? null,
      board_description: typeof obj.board_description === 'string' ? obj.board_description : '',
      board_image_base64: typeof obj.board_image_base64 === 'string' ? obj.board_image_base64 : '',
    })
  }
  const questions = await listChallengeQuestions(challengeId)
  if (questions.length === 0) throw new AppError('El desafío no tiene preguntas')
  for (const question of questions) {
    if (!answerMap.has(Number(question.id))) {
      throw new AppError('Debes responder todas las preguntas antes de terminar')
    }
  }
  const openItems: Array<{
    question_id: number
    prompt: string
    answer_key: string
    child_answer: string
    requires_board: boolean
    board_description: string
  }> = []
  const boardImages: Array<{ question_id: number; data: string }> = []
  const graded = new Map<number, boolean>()
  for (const question of questions) {
    const questionId = Number(question.id)
    const submitted = answerMap.get(questionId)!
    const requiresBoard = question.requiresBoard
    if (question.kind === 'multiple_choice') {
      graded.set(questionId, gradeMultipleChoice(submitted.user_answer, question.answerKey))
    } else {
      const boardDescription =
        submitted.board_description.trim() || describeBoardJson(submitted.board_json)
      openItems.push({
        question_id: questionId,
        prompt: String(question.prompt ?? ''),
        answer_key: question.answerKey,
        child_answer: truncateChars(submitted.user_answer, 800),
        requires_board: requiresBoard,
        board_description: truncateChars(boardDescription, 1600),
      })
      if (requiresBoard && submitted.board_image_base64.trim()) {
        boardImages.push({ question_id: questionId, data: submitted.board_image_base64 })
      }
    }
  }
  const openGrades = await gradeOpenAnswersBatch(openItems, userId, boardImages)
  for (const [questionId, correct] of openGrades) graded.set(questionId, correct)
  let correctCount = 0
  const stored = questions.map((question) => {
    const questionId = Number(question.id)
    const submitted = answerMap.get(questionId)!
    const isCorrect = Boolean(graded.get(questionId))
    if (isCorrect) correctCount += 1
    return {
      questionId,
      userAnswer: submitted.user_answer,
      boardJson: submitted.board_json != null ? JSON.stringify(submitted.board_json) : null,
      isCorrect,
    }
  })
  await replaceChallengeAnswers(challengeId, stored)
  const score = Math.round((correctCount / questions.length) * 100)
  await completeChallenge(challengeId, score)
  const xpAward = await awardXp({
    userId,
    sourceType: 'challenge',
    sourceId: challengeId,
    amount: xpForChallenge(String(row.scope ?? 'mission'), String(row.difficulty ?? 'quest'), score),
    reason: `Desafío ${score}%`,
  })
  const detail = await getChallengeDetail(challengeId, userId)
  return { ...detail, xp_gained: xpAward.xp_gained, xp: xpAward }
}

export async function listWorldChallenges(
  userId: number,
  worldId: number,
  query: Record<string, unknown>,
) {
  const world = await findActiveWorld(worldId, userId)
  if (!world) throw new AppError('Mundo no encontrado', 404)
  const missionId = query.mission_id ? Number(query.mission_id) : undefined
  const courseId = query.course_id ? Number(query.course_id) : undefined
  return listCompletedChallenges(worldId, userId, missionId, courseId)
}
