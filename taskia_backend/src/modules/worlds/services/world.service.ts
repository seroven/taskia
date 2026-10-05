import { decodeStudyPhoto, uploadStudyPhoto } from '../../../infrastructure/cloudinary/cloudinary.client.js'
import { callGemini, classifyBoardIntent } from '../../../infrastructure/gemini/gemini.client.js'
import { missionTutorPrompt } from '../../../prompts/mission-tutor.js'
import {
  applyVerdictToMastery,
  gradeBoard,
  highlightFromModel,
  planBoardDraw,
  settleBoardDraw,
  type DrawPlan,
} from '../../board/index.js'
import { awardXp, clampEffortScore, xpForMission } from '../../../services/xp.js'
import {
  AppError,
  extractJson,
  looksLikeAskingMoreTopicContent,
  looksLikeCelebratingMissionMastered,
  looksLikeOfferingMorePractice,
  requiredChatTurns,
  soloBienCount,
  stripPrematureReadyCelebration,
  truncateChars,
} from '../../../utils/helpers.js'
import {
  archiveMission,
  archiveWorld,
  countActiveWorldCourse,
  countOwnedActiveCourse,
  emptyBoard,
  findActiveMission,
  findActiveWorld,
  insertMission,
  insertMissionMessage,
  insertWorld,
  linkWorldCourse,
  listActiveWorlds,
  listImportableMissions,
  listMissions,
  listWorldCourses,
  loadMissionBoard,
  loadMissionSession,
  maxMissionSort,
  maxWorldCourseSort,
  saveMissionBoard,
  savePendingBoardFacts,
  saveSessionGreeting,
  saveSessionMeta,
  setMissionStatus,
  setNotebook,
  setNotebookIfEmpty,
  unlinkWorldCourse,
  updateMissionFields,
  updateWorld,
  type MissionView,
} from '../repositories/world.repository.js'
import {
  parseMissionBody,
  parseMissionChat,
  parseMissionIds,
  parseWorldBody,
} from '../schemas/world.schema.js'

const MAX_NOTEBOOK = 8000

async function requireWorld(worldId: number, userId: number) {
  const world = await findActiveWorld(worldId, userId)
  if (!world) throw new AppError('Mundo no encontrado', 404)
  return world
}

async function requireMission(missionId: number, userId: number) {
  const mission = await findActiveMission(missionId, userId)
  if (!mission) throw new AppError('Misión no encontrada', 404)
  return mission
}

async function ensureNotebookContext(
  missionId: number,
  usesBoard: boolean,
  context: { notebook_context: string; messages: Array<{ role: string; content: string }> },
) {
  if (usesBoard) return
  if (context.notebook_context.trim()) return
  const firstUser = context.messages.find((message) => message.role === 'user')
  if (!firstUser?.content.trim()) return
  context.notebook_context = firstUser.content
  await setNotebookIfEmpty(missionId, firstUser.content)
}

export async function listWorlds(userId: number) {
  return listActiveWorlds(userId)
}

export async function createWorld(userId: number, body: Record<string, unknown>) {
  const { title, description } = parseWorldBody(body)
  const worldId = await insertWorld(userId, title, description)
  return requireWorld(worldId, userId)
}

export async function patchWorld(userId: number, worldId: number, body: Record<string, unknown>) {
  await requireWorld(worldId, userId)
  const { title, description } = parseWorldBody(body)
  await updateWorld(worldId, userId, title, description)
  return requireWorld(worldId, userId)
}

export async function removeWorld(userId: number, worldId: number) {
  await requireWorld(worldId, userId)
  await archiveWorld(worldId, userId)
  return { ok: true }
}

export async function listCourses(userId: number, worldId: number) {
  await requireWorld(worldId, userId)
  return listWorldCourses(worldId)
}

export async function addCourse(userId: number, worldId: number, body: Record<string, unknown>) {
  await requireWorld(worldId, userId)
  const courseId = Number(body.course_id)
  if ((await countOwnedActiveCourse(courseId, userId)) === 0) {
    throw new AppError('Curso no válido')
  }
  const maxOrder = await maxWorldCourseSort(worldId)
  await linkWorldCourse(worldId, courseId, userId, maxOrder + 1)
  return listWorldCourses(worldId)
}

export async function removeCourse(userId: number, worldId: number, courseId: number) {
  await requireWorld(worldId, userId)
  await unlinkWorldCourse(worldId, courseId)
  return listWorldCourses(worldId)
}

export async function listCourseMissions(userId: number, worldId: number, courseId: number) {
  await requireWorld(worldId, userId)
  return listMissions(worldId, courseId, userId)
}

async function assertCourseLinked(worldId: number, courseId: number) {
  if ((await countActiveWorldCourse(worldId, courseId)) === 0) {
    throw new AppError('Primero agrega la materia a este mundo')
  }
}

export async function createMission(
  userId: number,
  worldId: number,
  courseId: number,
  body: Record<string, unknown>,
) {
  await requireWorld(worldId, userId)
  await assertCourseLinked(worldId, courseId)
  const { title, description, usesBoard } = parseMissionBody(body)
  const maxOrder = await maxMissionSort(worldId, courseId)
  const missionId = await insertMission({
    worldId,
    courseId,
    title,
    description,
    usesBoard,
    sortOrder: maxOrder + 1,
  })
  return requireMission(missionId, userId)
}

export async function patchMission(userId: number, missionId: number, body: Record<string, unknown>) {
  const current = await requireMission(missionId, userId)
  const { title, description, usesBoard } = parseMissionBody(body)
  await updateMissionFields(current.id, title, description, usesBoard)
  return requireMission(missionId, userId)
}

export async function removeMission(userId: number, missionId: number) {
  await requireMission(missionId, userId)
  await archiveMission(missionId)
  return { ok: true }
}

export async function openMissionSession(userId: number, missionId: number) {
  const mission = await requireMission(missionId, userId)
  if (mission.status === 'pending') {
    await setMissionStatus(missionId, 'studying')
    mission.status = 'studying'
  }
  const context = await loadMissionSession(missionId)
  await ensureNotebookContext(missionId, mission.uses_board, context)
  const board = mission.uses_board ? await loadMissionBoard(missionId) : emptyBoard()
  if (context.messages.length === 0) {
    const speak = mission.uses_board
      ? `¡Hola! Vamos a estudiar "${mission.title}" (puedes usar la pizarra). Empezamos por lo básico y luego te haré preguntas para fijarte bien en los detalles. Cuéntame qué sabes o qué te confunde.`
      : `¡Hola! Antes de las preguntas, quiero conocer tu tema "${mission.title}". Cuéntame lo que dice tu cuaderno: puedes escribirlo o usar “Hablar del tema” varias veces, revisar las palabras y sumarlas abajo. Cuando esté listo, envíamelo.`
    context.topic_summary = mission.title
    context.context_summary = `Inicio local. Misión: "${mission.title}".`
    try {
      const msg = await insertMissionMessage(missionId, 'assistant', speak)
      context.messages.push(msg)
    } catch {
      /* ignore local greeting failure */
    }
    await saveSessionGreeting(missionId, context.topic_summary, context.context_summary)
  }
  return { context, board, mission }
}

export async function saveBoard(userId: number, missionId: number, body: Record<string, unknown>) {
  const mission = await requireMission(missionId, userId)
  if (!mission.uses_board) throw new AppError('Esta misión no usa pizarra')
  await saveMissionBoard(missionId, body.board ?? body)
  return { ok: true }
}

export async function chatMission(userId: number, missionId: number, body: Record<string, unknown>) {
  const mission = await requireMission(missionId, userId)
  const parsed = parseMissionChat(body)
  if (mission.status === 'pending') {
    await setMissionStatus(missionId, 'studying')
    mission.status = 'studying'
  }
  const boardImageSent = mission.uses_board ? parsed.boardImageRaw : ''
  const boardDescriptionSent = mission.uses_board ? parsed.boardDescription : null
  const photo = parsed.photoRaw ? decodeStudyPhoto(parsed.photoRaw) : null
  const imageUrl = photo ? await uploadStudyPhoto(photo) : null
  const context = await loadMissionSession(missionId)
  const userMsg = await insertMissionMessage(
    missionId,
    'user',
    parsed.message,
    parsed.fromVoice,
    imageUrl,
  )
  context.messages.push(userMsg)
  const userTurns = context.messages.filter((message) => message.role === 'user').length
  if (!mission.uses_board && !context.notebook_context.trim() && userTurns === 1) {
    context.notebook_context = truncateChars(parsed.message, MAX_NOTEBOOK)
    await setNotebook(missionId, context.notebook_context)
  } else {
    await ensureNotebookContext(missionId, mission.uses_board, context)
  }

  const lastTutorMsg = [...context.messages].reverse().find((message) => message.role === 'assistant')
  const lastTutor = lastTutorMsg ? truncateChars(lastTutorMsg.content, 320) : ''
  const intent = mission.uses_board
    ? await classifyBoardIntent({
        message: parsed.message,
        previous: truncateChars(lastTutor, 180),
        usage: { userId, kind: 'board_intent' },
      })
    : { reviewDrawing: false, drawExercise: false }
  const allowAiDraw = intent.drawExercise
  const incomingBoard = body.board_json ?? body.boardJson
  const boardState = mission.uses_board
    ? incomingBoard && typeof incomingBoard === 'object'
      ? incomingBoard
      : await loadMissionBoard(missionId)
    : null
  const verdict =
    mission.uses_board && (intent.reviewDrawing || photo)
      ? gradeBoard({
          scene:
            boardState && typeof boardState === 'object'
              ? (boardState as { scene?: unknown }).scene
              : null,
          board: boardState,
          childMessage: parsed.message,
        })
      : null
  const boardImageRaw =
    intent.reviewDrawing && verdict?.verdict === 'unverifiable' && !photo ? boardImageSent : ''
  const boardDescription = intent.reviewDrawing ? boardDescriptionSent : null
  const boardHas = Boolean(boardDescription?.trim() || boardImageRaw)

  let instruction = allowAiDraw
    ? 'Responde breve. Conserva ejercicio activo. Anota "Solo bien: N/2". Evalúa study_eval: 2 problemas resueltos solo; al llegar a 2 pregunta si quiere otro tipo de ejercicio (passed=false); passed=true solo si declina. Incluye scene con la figura o la expresión. draw_ops [].'
    : 'Responde breve. Enseña el tema completo (básico + observación) SOLO con notebook_context + título/descripción. Conserva ejercicio activo. Anota "Errores: N". Piso user_turns ≥ 10+N. Pregunta todo lo posible de ese relato. Al cumplir el piso pregunta si queda más contenido (passed=false); passed=true solo si declina. Sin pizarra.'
  if (parsed.fromVoice) {
    instruction +=
      ' El mensaje viene de voz (transcrito): prioriza afinar topic_summary y context_summary con lo que explicó el niño.'
  }
  if (photo) {
    instruction +=
      ' El niño adjuntó una foto de un ejercicio resuelto en papel. Léela y úsala como referencia. No es la pizarra.'
  }
  if (intent.reviewDrawing && !boardHas) {
    instruction += ' Pidió que revises su dibujo, pero la pizarra está vacía. Pídele que dibuje primero.'
  }
  if (intent.reviewDrawing && boardHas && !allowAiDraw) {
    instruction += ' El niño pidió que mires su dibujo de la pizarra. Úsalo para responder.'
  }
  if (verdict?.verdict === 'correct' || verdict?.verdict === 'incorrect') {
    instruction += ` code_verdict=${verdict.verdict} expected=${verdict.expected} got=${verdict.got}. Explícalo y no lo cambies. Si es incorrecto, ese ejercicio no suma a Solo bien.`
  } else if (verdict?.verdict === 'unverifiable' && (intent.reviewDrawing || photo)) {
    instruction += ' code_verdict=unverifiable. No afirmes si está bien o mal.'
  }
  const photoData = photo ? `data:${photo.mime};base64,${photo.base64}` : null
  const drawPlan: DrawPlan = mission.uses_board
    ? await planBoardDraw({
        draw: allowAiDraw,
        photoBase64: photoData,
        message: parsed.message,
        pendingRaw: context.pending_board_facts ?? null,
        source: `${parsed.message}\n${truncateChars(lastTutor, 180)}`,
        usage: { userId, kind: 'board_facts' },
      })
    : { mode: 'none', pendingWrite: 'keep' }
  if (drawPlan.mode === 'draw') {
    instruction +=
      ' board_facts están congelados: incluye scene que los cubra y no agregues ni quites hechos. draw_ops []. No digas que ya dibujaste.'
  }
  if (drawPlan.mode === 'confirm' || drawPlan.mode === 'gap') {
    instruction += ' No incluyas scene.'
  }

  const payload = JSON.stringify({
    instruction,
    user_turns: userTurns,
    mastered_already: mission.status === 'mastered',
    message_source: parsed.fromVoice ? 'voice' : 'text',
    mission: {
      title: truncateChars(mission.title, 120),
      description: truncateChars(mission.description ?? '', 220),
      course: mission.course_name,
      uses_board: mission.uses_board,
    },
    phase: context.tutor_phase,
    topic_summary: truncateChars(context.topic_summary, 120),
    context_summary: truncateChars(context.context_summary, 400),
    ...(mission.uses_board
      ? {}
      : { notebook_context: truncateChars(context.notebook_context, MAX_NOTEBOOK) }),
    last_tutor_message: lastTutor,
    hints_level: context.hints_level,
    ...(allowAiDraw ? { allow_ai_draw: true } : {}),
    ...(drawPlan.mode === 'draw'
      ? {
          board_facts: drawPlan.facts,
          ...(drawPlan.statement ? { board_statement: drawPlan.statement } : {}),
        }
      : {}),
    ...(verdict ? { code_verdict: verdict } : {}),
    board_has_drawing: boardHas,
    photo_attached: Boolean(photo),
    ...(!boardImageRaw && boardDescription?.trim()
      ? { board_drawing: truncateChars(boardDescription, 500) }
      : {}),
    child_message: truncateChars(
      parsed.message,
      !mission.uses_board && userTurns === 1 ? MAX_NOTEBOOK : parsed.fromVoice ? 4000 : 800,
    ),
  })

  const raw = await callGemini({
    system: missionTutorPrompt(allowAiDraw || drawPlan.mode === 'draw'),
    user: payload,
    boardImageBase64: boardImageRaw || null,
    photoBase64: photo ? `data:${photo.mime};base64,${photo.base64}` : null,
    usage: { userId, kind: 'mission_tutor' },
  })

  let value: Record<string, unknown>
  try {
    value = JSON.parse(extractJson(raw)) as Record<string, unknown>
  } catch {
    throw new AppError('La IA no devolvió el formato esperado')
  }

  const studyEvalRaw = (value.study_eval ?? {}) as Record<string, unknown>
  const askQuestions = Array.isArray(value.ask_questions)
    ? value.ask_questions.filter((item): item is string => typeof item === 'string')
    : []
  const reply = {
    phase: typeof value.phase === 'string' ? value.phase : 'understanding',
    speak_to_child: truncateChars(
      typeof value.speak_to_child === 'string' ? value.speak_to_child : '¡Sigue! Cuéntame más.',
      450,
    ),
    ask_questions: askQuestions,
    topic_summary: typeof value.topic_summary === 'string' ? value.topic_summary : '',
    context_summary: truncateChars(
      typeof value.context_summary === 'string' ? value.context_summary : context.context_summary,
      400,
    ),
    draw_ops: [],
    board_items: [] as unknown[],
    scene: null as unknown,
    highlight: highlightFromModel(value),
    board_fallback: null as string | null,
    verdict,
    hints_level: typeof value.hints_level === 'number' ? value.hints_level : 0,
    study_eval: {
      passed: Boolean(studyEvalRaw.passed),
      evidence: typeof studyEvalRaw.evidence === 'string' ? studyEvalRaw.evidence : '',
    },
  }

  if (!allowAiDraw) {
    if (userTurns < requiredChatTurns(10, reply.context_summary)) reply.study_eval.passed = false
    const askingMoreContent =
      looksLikeAskingMoreTopicContent(reply.speak_to_child) ||
      reply.ask_questions.some((question) => looksLikeAskingMoreTopicContent(question))
    if (askingMoreContent) reply.study_eval.passed = false
    if (
      reply.study_eval.passed &&
      !looksLikeAskingMoreTopicContent(lastTutorMsg?.content ?? '') &&
      !/cierre:\s*preguntado/i.test(context.context_summary)
    ) {
      reply.study_eval.passed = false
    }
  }
  if (reply.phase !== 'reviewing') reply.study_eval.passed = false
  if (!reply.study_eval.evidence.trim()) reply.study_eval.passed = false
  if (allowAiDraw) {
    const offeringMore =
      looksLikeOfferingMorePractice(reply.speak_to_child) ||
      reply.ask_questions.some((question) => looksLikeOfferingMorePractice(question))
    if (offeringMore) reply.study_eval.passed = false
    const score = soloBienCount(reply.context_summary)
    if (score !== null && score < 2) reply.study_eval.passed = false
  }
  if (mission.status !== 'mastered' && verdict?.verdict === 'incorrect') {
    const gated = applyVerdictToMastery({
      verdict,
      passed: reply.study_eval.passed,
      contextSummary: reply.context_summary,
      previousSummary: context.context_summary,
    })
    reply.study_eval.passed = gated.passed
    reply.context_summary = truncateChars(gated.contextSummary, 400)
  }
  if (mission.status === 'mastered') reply.study_eval.passed = true
  if (!reply.study_eval.passed && looksLikeCelebratingMissionMastered(reply.speak_to_child)) {
    const stripped = stripPrematureReadyCelebration(reply.speak_to_child)
    reply.speak_to_child = truncateChars(
      stripped.length >= 20
        ? stripped
        : '¡Vas muy bien! Sigamos un poquito más para afianzar el tema.',
      450,
    )
  }
  const settled = await settleBoardDraw({
    plan: drawPlan,
    speak: reply.speak_to_child,
    modelValue: value,
    usage: { userId, kind: 'mission_tutor' },
    origin: 'mission',
    maxSpeak: 450,
  })
  reply.speak_to_child = settled.speak
  reply.board_items = settled.items
  reply.scene = settled.scene
  reply.board_fallback = settled.fallback

  const saved = await insertMissionMessage(missionId, 'assistant', reply.speak_to_child)
  context.messages.push(saved)
  context.tutor_phase = reply.phase
  if (reply.topic_summary.trim()) context.topic_summary = truncateChars(reply.topic_summary, 120)
  context.context_summary = reply.context_summary
  context.hints_level = reply.hints_level
  await saveSessionMeta(missionId, {
    tutorPhase: context.tutor_phase,
    topicSummary: context.topic_summary,
    contextSummary: context.context_summary,
    hintsLevel: context.hints_level,
  })
  if (settled.pendingWrite !== 'keep') {
    await savePendingBoardFacts(missionId, settled.pendingWrite)
  }

  if (reply.study_eval.passed && mission.status !== 'mastered') {
    await setMissionStatus(missionId, 'mastered')
    mission.status = 'mastered'
    const effort = clampEffortScore(studyEvalRaw.effort_score, {
      passed: true,
      hasEvidence: Boolean(reply.study_eval.evidence.trim()),
    })
    const xpAward = await awardXp({
      userId,
      sourceType: 'mission',
      sourceId: missionId,
      amount: xpForMission(effort),
      effortScore: effort,
      reason: reply.study_eval.evidence || 'Misión dominada',
    })
    return { reply, context, mission, xp_gained: xpAward.xp_gained, xp: xpAward }
  }
  return { reply, context, mission }
}

export async function listImportable(userId: number, worldId: number, courseId: number) {
  await requireWorld(worldId, userId)
  return listImportableMissions(userId, courseId, worldId)
}

export async function importMissions(
  userId: number,
  worldId: number,
  courseId: number,
  body: Record<string, unknown>,
) {
  await requireWorld(worldId, userId)
  const missionIds = parseMissionIds(body)
  if (missionIds.length === 0) return listMissions(worldId, courseId, userId)
  await assertCourseLinked(worldId, courseId)
  let maxOrder = await maxMissionSort(worldId, courseId)
  for (const sourceId of missionIds) {
    const source: MissionView = await requireMission(sourceId, userId)
    if (source.course_id !== courseId) {
      throw new AppError('Solo puedes importar misiones de la misma materia')
    }
    if (source.world_id === worldId) continue
    maxOrder += 1
    await insertMission({
      worldId,
      courseId,
      title: source.title,
      description: source.description,
      usesBoard: source.uses_board,
      sourceMissionId: source.id,
      sortOrder: maxOrder,
    })
  }
  return listMissions(worldId, courseId, userId)
}
