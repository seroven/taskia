import { decodeStudyPhoto, uploadStudyPhoto } from '../../../infrastructure/cloudinary/cloudinary.client.js'
import { callGemini } from '../../../infrastructure/gemini/gemini.client.js'
import { loadReferencePhoto } from '../../exercises/reference.js'
import { stripMathDelimiters } from '../../exercises/text.js'
import {
  CHALLENGE_GRADE_SYSTEM,
  CHALLENGE_PHOTO_GRADE_SYSTEM,
  challengeGenerateSystem,
} from '../../../prompts/challenge.js'
import { awardXp, xpForChallenge } from '../../../services/xp.js'
import { AppError, extractJson, truncateChars } from '../../../utils/helpers.js'
import {
  distributeQuestionCounts,
  estimateMaxQuestionsFromMaterial,
  formatCorrectAnswer,
  gradeMultipleChoice,
  groupMissionsByCourse,
  normalizeAnswerKey,
  normalizeOptionsList,
  shuffleArray,
} from '../lib/challenge-logic.js'
import {
  challengeViewFromEntity,
  completeChallenge,
  deleteChallenge,
  deleteInProgressChallenges,
  findInProgressChallenge,
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
  saveChallengeProgressRow,
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
    study_mode: bits.study_mode === 'practical' ? 'practical' : 'theoretical',
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
      course: mission.course_name,
      topic_summary: study.topic_summary,
      context_summary: study.context_summary,
      studied_text: study.studied_text,
      study_mode: study.study_mode,
      has_user_content: study.user_explanations.length > 0,
    })
  }
  const mixRule =
    options.scope === 'course'
      ? `- Alcance MATERIA: mezcla las misiones. NO agrupes por “tema 1, tema 2”. Intercala preguntas de distintos temas.`
      : options.scope === 'world'
        ? `- Alcance MUNDO: estas misiones son de UNA sola materia. Mezcla los temas DENTRO de esta materia.`
        : `- Alcance TEMA: todas las preguntas son de esta misión.`
  const practicalIds = catalog.filter((item) => item.study_mode === 'practical').map((item) => item.id)
  const theoreticalIds = catalog.filter((item) => item.study_mode !== 'practical').map((item) => item.id)
  const boardMixRules =
    theoreticalIds.length === 0
      ? `Reglas de tipo:
- Solo multiple_choice, short_text o fill_blank.
- La mayoría deben ser EJERCICIOS en texto (aplicar, elegir un caso concreto). Teóricas (definir, “qué es…”, nombrar SIN resolver) como máximo 1 o 2 en el lote.
- No pidas dibujar ni armes una figura.`
      : practicalIds.length === 0
        ? `Reglas de tipo:
- Solo multiple_choice, short_text o fill_blank.
- Todas las misiones son teóricas (study_mode=theoretical). SOLO preguntas conceptuales sobre el material: definir, causas, hechos, nombres, ejemplos del relato.
- Prohibido pedir que resuelvan un procedimiento, una cuenta o una foto de cómo lo hicieron.
- No pidas dibujar ni armes una figura.`
        : `Reglas de tipo, POR MISIÓN (mira study_mode de cada una):
- study_mode=practical (ids ${practicalIds.join(', ')}): mayoría ejercicios en texto.
- study_mode=theoretical (ids ${theoreticalIds.join(', ')}): SOLO preguntas conceptuales. Prohibido ejercicios de procedimiento y fotos de resolución.
- Solo multiple_choice, short_text o fill_blank. No pidas dibujar ni armes una figura.`
  const lotInstruction =
    theoreticalIds.length === 0
      ? `Genera ${count} preguntas nuevas, distintas entre sí y distintas de already_asked. Casi todas EJERCICIOS en texto; teóricas como máximo 1 o 2. Sin figuras. ÚNICAMENTE con base en studied_text / topic_summary / context_summary / description.`
      : practicalIds.length === 0
        ? `Genera ${count} preguntas nuevas, distintas y conceptuales (no ejercicios de procedimiento). Sin figuras. ÚNICAMENTE con base en studied_text / topic_summary / context_summary / description.`
        : `Genera ${count} preguntas nuevas. En misiones theoretical solo conceptuales; en practical puedes usar ejercicios en texto. Sin figuras. ÚNICAMENTE con base en el material de cada misión.`
  const system = challengeGenerateSystem({ count, mixRule, boardMixRules })
  const user = JSON.stringify({
    target_count: count,
    batch_offset: batchOffset,
    already_asked: options.avoidPrompts ?? [],
    missions: catalog,
    instruction: lotInstruction,
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
  const textTarget = count
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
      if (collected.length >= textTarget) break
    }
    return added
  }
  while (collected.length < textTarget && emptyStreak < 2) {
    const need = Math.min(12, textTarget - collected.length)
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
    if (options) options = options.map((option) => stripMathDelimiters(option))
    const answerKey = String(question.answer_key ?? '')
    const base = {
      id: Number(question.id),
      mission_id: question.mission_id == null ? null : Number(question.mission_id),
      course_id: question.course_id == null ? null : Number(question.course_id),
      course_name: question.course_name == null ? null : String(question.course_name),
      sort_order: Number(question.sort_order),
      kind,
      prompt: stripMathDelimiters(String(question.prompt)),
      options,
      reference_image_url:
        typeof question.reference_image_url === 'string' && question.reference_image_url
          ? question.reference_image_url
          : null,
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
  const progress = row.progressJson ?? null
  return { challenge, questions, current_index: currentIndex, progress }
}

async function gradePhotoPairs(
  pairs: Array<{ questionId: number; exerciseUrl: string; solutionRaw: string }>,
  userId: number,
) {
  const results = new Map<number, boolean>()
  const ready: Array<{ questionId: number; exercise: string; solution: string }> = []
  for (const pair of pairs) {
    const exercise = await loadReferencePhoto(null, [pair.exerciseUrl])
    const solution = pair.solutionRaw.trim()
    if (!exercise || !solution) continue
    ready.push({ questionId: pair.questionId, exercise, solution })
  }
  for (let offset = 0; offset < ready.length; offset += 6) {
    const chunk = ready.slice(offset, offset + 6)
    const images = chunk.flatMap((pair) => [
      {
        data: pair.exercise,
        caption: `Ejercicio de question_id=${pair.questionId}. Esta es la pregunta, no la resolución.`,
      },
      {
        data: pair.solution,
        caption: `Resolución del niño para question_id=${pair.questionId}.`,
      },
    ])
    const raw = await callGemini({
      system: CHALLENGE_PHOTO_GRADE_SYSTEM,
      user: JSON.stringify({
        pairs: chunk.map((pair) => ({ question_id: pair.questionId })),
      }),
      boardImages: images,
      usage: { userId, kind: 'challenge_photo_grade' },
    })
    let value: unknown
    try {
      value = JSON.parse(extractJson(raw))
    } catch {
      value = []
    }
    if (!Array.isArray(value)) continue
    for (const row of value) {
      if (!row || typeof row !== 'object') continue
      const obj = row as Record<string, unknown>
      const id = Number(obj.question_id)
      if (!Number.isFinite(id)) continue
      results.set(id, Boolean(obj.correct))
    }
  }
  return results
}

async function gradeOpenAnswersBatch(
  items: Array<{
    question_id: number
    prompt: string
    answer_key: string
    child_answer: string
  }>,
  userId: number,
) {
  const results = new Map<number, boolean>()
  if (items.length === 0) return results
  const raw = await callGemini({
    system: CHALLENGE_GRADE_SYSTEM,
    user: JSON.stringify({ items }),
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
  const existing = await findInProgressChallenge(userId)
  if (existing && !start.discardInProgress) {
    return { conflict: true as const, in_progress: await getChallengeDetail(Number(existing.id), userId) }
  }
  if (start.discardInProgress) await deleteInProgressChallenges(userId)
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
  const missionIds = new Set(missions.map((mission) => mission.id))
  const modeByMission = new Map<number, string>()
  for (const mission of missions) {
    const bits = await loadMissionStudyBits(mission.id)
    modeByMission.set(mission.id, bits.study_mode === 'practical' ? 'practical' : 'theoretical')
  }
  let sortOrder = 0
  for (const item of generated.slice(0, total)) {
    let mid = typeof item.mission_id === 'number' ? item.mission_id : Number(item.mission_id)
    if (!Number.isFinite(mid) || !missionIds.has(mid)) mid = missions[0]!.id
    const mission = missions.find((row) => row.id === mid) ?? missions[0]!
    let kind = typeof item.kind === 'string' ? item.kind : 'short_text'
    if (kind === 'board_prompt' || !['multiple_choice', 'short_text', 'fill_blank'].includes(kind)) {
      kind = 'multiple_choice'
    }
    const referenceImageUrl =
      modeByMission.get(mid) === 'practical' &&
      typeof item.reference_image_url === 'string' &&
      item.reference_image_url.startsWith('https://')
        ? item.reference_image_url
        : null
    const prompt = stripMathDelimiters(typeof item.prompt === 'string' ? item.prompt : '¿Listo?')
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
    if (options) options = options.map((option) => stripMathDelimiters(option))
    const answerKey = normalizeAnswerKey(
      kind,
      typeof item.answer_key === 'string' ? item.answer_key : '',
      options,
    )
    await insertChallengeQuestion({
      challengeId,
      missionId: mid,
      sortOrder,
      kind,
      prompt,
      options,
      answerKey,
      referenceImageUrl,
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

export async function saveChallengeProgress(
  userId: number,
  challengeId: number,
  body: Record<string, unknown>,
) {
  const row = await findOwnedChallenge(challengeId, userId)
  if (!row) throw new AppError('Desafío no encontrado', 404)
  if (row.status !== 'in_progress') return { ok: true, elapsed_ms: Number(row.elapsedMs) || 0 }
  const elapsed = Math.max(0, Math.min(Number(body.elapsed_ms) || 0, 6 * 60 * 60 * 1000))
  const cursor = Math.max(0, Math.floor(Number(body.cursor) || 0))
  const rawAnswers = Array.isArray(body.answers) ? body.answers.slice(0, 80) : []
  const answers = rawAnswers.flatMap((answer) => {
    if (!answer || typeof answer !== 'object') return []
    const obj = answer as Record<string, unknown>
    const questionId = Number(obj.question_id)
    if (!Number.isFinite(questionId)) return []
    return [
      {
        question_id: questionId,
        user_answer: typeof obj.user_answer === 'string' ? obj.user_answer.slice(0, 800) : '',
        solution_image_base64:
          typeof obj.solution_image_base64 === 'string'
            ? obj.solution_image_base64
            : typeof obj.notebook_image_base64 === 'string'
              ? obj.notebook_image_base64
              : '',
      },
    ]
  })
  await saveChallengeProgressRow(challengeId, elapsed, { cursor, answers })
  return { ok: true, elapsed_ms: elapsed }
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
      solution_image_base64: string
    }
  >()
  for (const answer of answersRaw) {
    if (!answer || typeof answer !== 'object') continue
    const obj = answer as Record<string, unknown>
    const questionId = Number(obj.question_id)
    if (!Number.isFinite(questionId)) continue
    const solution =
      typeof obj.solution_image_base64 === 'string'
        ? obj.solution_image_base64
        : typeof obj.notebook_image_base64 === 'string'
          ? obj.notebook_image_base64
          : ''
    answerMap.set(questionId, {
      user_answer: typeof obj.user_answer === 'string' ? obj.user_answer : '',
      solution_image_base64: solution,
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
  }> = []
  const photoPairs: Array<{
    questionId: number
    exerciseUrl: string
    solutionRaw: string
  }> = []
  const solutionUrls = new Map<number, string | null>()
  const graded = new Map<number, boolean>()
  for (const question of questions) {
    const questionId = Number(question.id)
    const submitted = answerMap.get(questionId)!
    const optionOk =
      question.kind === 'multiple_choice'
        ? gradeMultipleChoice(submitted.user_answer, question.answerKey)
        : null
    if (question.referenceImageUrl) {
      graded.set(questionId, false)
      if (optionOk && submitted.solution_image_base64.trim()) {
        photoPairs.push({
          questionId,
          exerciseUrl: question.referenceImageUrl,
          solutionRaw: submitted.solution_image_base64,
        })
      }
    } else if (optionOk != null) {
      graded.set(questionId, optionOk)
    } else {
      openItems.push({
        question_id: questionId,
        prompt: String(question.prompt ?? ''),
        answer_key: question.answerKey,
        child_answer: truncateChars(submitted.user_answer, 800),
      })
    }
    if (question.referenceImageUrl && submitted.solution_image_base64.trim()) {
      const photo = decodeStudyPhoto(submitted.solution_image_base64)
      solutionUrls.set(questionId, photo ? await uploadStudyPhoto(photo) : null)
    } else {
      solutionUrls.set(questionId, null)
    }
  }
  const openGrades = await gradeOpenAnswersBatch(openItems, userId)
  for (const [questionId, correct] of openGrades) graded.set(questionId, correct)
  const pairGrades = await gradePhotoPairs(photoPairs, userId)
  for (const [questionId, correct] of pairGrades) {
    if (correct) graded.set(questionId, true)
  }
  let correctCount = 0
  const stored = questions.map((question) => {
    const questionId = Number(question.id)
    const submitted = answerMap.get(questionId)!
    const isCorrect = Boolean(graded.get(questionId))
    if (isCorrect) correctCount += 1
    return {
      questionId,
      userAnswer: submitted.user_answer,
      solutionImageUrl: solutionUrls.get(questionId) ?? null,
      isCorrect,
    }
  })
  await replaceChallengeAnswers(challengeId, stored)
  const score = Math.round((correctCount / questions.length) * 100)
  const sentElapsed = Number(body.elapsed_ms ?? body.elapsedMs)
  const elapsedMs = Math.max(
    Number(row.elapsedMs) || 0,
    Number.isFinite(sentElapsed) ? Math.max(0, sentElapsed) : 0,
  )
  await saveChallengeProgressRow(challengeId, elapsedMs, row.progressJson ?? null)
  await completeChallenge(challengeId, score)
  const xpAward = await awardXp({
    userId,
    sourceType: 'challenge',
    sourceId: challengeId,
    amount: xpForChallenge(
      String(row.scope ?? 'mission'),
      String(row.difficulty ?? 'quest'),
      score,
      elapsedMs,
      questions.length,
    ),
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
