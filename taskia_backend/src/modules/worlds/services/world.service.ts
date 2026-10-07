import { decodeStudyPhoto, uploadStudyPhoto } from '../../../infrastructure/cloudinary/cloudinary.client.js'
import { callGemini, classifyBoardIntent } from '../../../infrastructure/gemini/gemini.client.js'
import { missionTutorPrompt } from '../../../prompts/mission-tutor.js'
import { hideExerciseBrief, planExerciseMemory, solveExerciseBrief } from '../../exercises/exerciseBrief.js'
import {
  exerciseReference,
  exerciseTurnInstruction,
  loadReferencePhoto,
  planExerciseTurn,
  speakForTurn,
  userReferencePhotos,
  type ExerciseTurn,
} from '../../exercises/reference.js'
import { stripDrewPhrase } from '../../exercises/text.js'
import { awardXp, clampEffortScore, xpForMission } from '../../../services/xp.js'
import {
  AppError,
  extractJson,
  looksLikeAskingMoreTopicContent,
  looksLikeCelebratingMissionMastered,
  requiredChatTurns,
  stripPrematureReadyCelebration,
  truncateChars,
} from '../../../utils/helpers.js'
import {
  archiveMission,
  archiveWorld,
  countActiveWorldCourse,
  countOwnedActiveCourse,
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
  loadMissionSession,
  maxMissionSort,
  maxWorldCourseSort,
  saveExerciseBrief,
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
  context: { notebook_context: string; messages: Array<{ role: string; content: string }> },
) {
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
  await ensureNotebookContext(missionId, context)
  if (context.messages.length === 0) {
    const speak = `¡Hola! Antes de las preguntas, quiero conocer tu tema "${mission.title}". Cuéntame lo que dice tu cuaderno: puedes escribirlo o usar Hablar varias veces, revisar las palabras y sumarlas abajo. Cuando esté listo, envíamelo.`
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
  return { context: hideExerciseBrief(context), mission }
}

export async function chatMission(userId: number, missionId: number, body: Record<string, unknown>) {
  const mission = await requireMission(missionId, userId)
  const parsed = parseMissionChat(body)
  if (mission.status === 'pending') {
    await setMissionStatus(missionId, 'studying')
    mission.status = 'studying'
  }
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
  if (!context.notebook_context.trim() && userTurns === 1) {
    context.notebook_context = truncateChars(parsed.message, MAX_NOTEBOOK)
    await setNotebook(missionId, context.notebook_context)
  } else {
    await ensureNotebookContext(missionId, context)
  }

  const lastTutorMsg = [...context.messages].reverse().find((message) => message.role === 'assistant')
  const lastTutor = lastTutorMsg ? truncateChars(lastTutorMsg.content, 320) : ''
  const photoData = photo ? `data:${photo.mime};base64,${photo.base64}` : null
  const intent = await classifyBoardIntent({
    message: parsed.message,
    previous: truncateChars(lastTutor, 180),
    usage: { userId, kind: 'board_intent' },
  })
  const memory = planExerciseMemory({
    help: intent.helpExercise,
    review: intent.reviewDrawing,
    draw: intent.drawExercise,
    hasPhoto: Boolean(photo),
    hasBrief: Boolean(context.exercise_brief),
  })
  if (memory.solve) {
    const image =
      photoData ??
      (await loadReferencePhoto(
        null,
        context.messages.map((item) => item.image_url),
      ))
    const brief = await solveExerciseBrief({
      text: parsed.message,
      photoBase64: image,
      usage: { userId, kind: 'board_facts' },
    })
    if (brief) {
      context.exercise_brief = brief
      await saveExerciseBrief(missionId, brief)
    }
  }
  const tutorPhoto =
    memory.sendPhoto || memory.showMaterial || (memory.solve && !context.exercise_brief) ? photoData : null
  const openingRelato =
    userTurns === 1 &&
    context.notebook_context.trim().length > 0 &&
    context.notebook_context === truncateChars(parsed.message, MAX_NOTEBOOK)
  const referencePhoto = await loadReferencePhoto(photoData, userReferencePhotos(context.messages))
  const referenceText = exerciseReference([
    mission.description ?? '',
    ...context.messages.filter((item) => item.role === 'user').map((item) => item.content),
  ])
  const exerciseTurn: ExerciseTurn = await planExerciseTurn({
    draw: intent.drawExercise,
    referenceText,
    photoBase64: intent.drawExercise ? referencePhoto : null,
    usage: { userId, kind: 'board_facts' },
  })

  let instruction =
    'Responde breve. Enseña el tema completo (básico + observación) SOLO con notebook_context + título/descripción. Conserva ejercicio activo. Anota "Errores: N". Piso user_turns ≥ 10+N. Pregunta todo lo posible de ese relato. Al cumplir el piso pregunta si queda más contenido (passed=false); passed=true solo si declina.'
  if (parsed.fromVoice) {
    instruction +=
      ' El mensaje viene de voz (transcrito): prioriza afinar topic_summary y context_summary con lo que explicó el niño.'
  }
  if (openingRelato) {
    instruction += ' El relato de este turno está en notebook_context.'
  }
  if (memory.showMaterial && tutorPhoto) {
    instruction +=
      ' La foto de este turno es material del niño, no un ejercicio. Léela y deja lo importante en context_summary.'
  }
  if (tutorPhoto && intent.reviewDrawing) {
    instruction +=
      ' El niño adjuntó una foto del cuaderno. Léela y decide si el ejercicio está bien. No es la pizarra.'
  }
  if (intent.reviewDrawing && !tutorPhoto) {
    instruction +=
      ' Pidió revisar su trabajo y no adjuntó nada. Invítalo una sola vez: "Me gustaría ver cómo lo resolviste". No digas "foto" ni "mándame".'
  }
  if (intent.reviewDrawing && tutorPhoto) {
    instruction += ' Mira la foto y decide si está bien.'
  }
  instruction += exerciseTurnInstruction(exerciseTurn)

  const payload = JSON.stringify({
    instruction,
    user_turns: userTurns,
    mastered_already: mission.status === 'mastered',
    message_source: parsed.fromVoice ? 'voice' : 'text',
    mission: {
      title: truncateChars(mission.title, 120),
      description: truncateChars(mission.description ?? '', 220),
      course: mission.course_name,
      practical: mission.uses_board,
    },
    phase: context.tutor_phase,
    topic_summary: truncateChars(context.topic_summary, 120),
    context_summary: truncateChars(context.context_summary, 400),
    notebook_context: truncateChars(context.notebook_context, MAX_NOTEBOOK),
    last_tutor_message: lastTutor,
    hints_level: context.hints_level,
    photo_attached: Boolean(tutorPhoto),
    ...(context.exercise_brief ? { exercise_solution: context.exercise_brief } : {}),
    child_message: openingRelato
      ? ''
      : truncateChars(parsed.message, parsed.fromVoice ? 4000 : 800),
  })

  const raw = await callGemini({
    system: missionTutorPrompt(),
    user: payload,
    photoBase64: tutorPhoto,
    photoCaption: memory.showMaterial
      ? 'Foto del cuaderno. Es material del tema, no la respuesta de un ejercicio.'
      : undefined,
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
      speakForTurn(
        exerciseTurn,
        stripDrewPhrase(typeof value.speak_to_child === 'string' ? value.speak_to_child : '¡Sigue! Cuéntame más.'),
      ),
      450,
    ),
    ask_questions: askQuestions,
    topic_summary: typeof value.topic_summary === 'string' ? value.topic_summary : '',
    context_summary: truncateChars(
      typeof value.context_summary === 'string' ? value.context_summary : context.context_summary,
      400,
    ),
    hints_level: typeof value.hints_level === 'number' ? value.hints_level : 0,
    study_eval: {
      passed: Boolean(studyEvalRaw.passed),
      evidence: typeof studyEvalRaw.evidence === 'string' ? studyEvalRaw.evidence : '',
    },
  }

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
  if (reply.phase !== 'reviewing') reply.study_eval.passed = false
  if (!reply.study_eval.evidence.trim()) reply.study_eval.passed = false
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
  let visible = reply.speak_to_child

  const saved = await insertMissionMessage(missionId, 'assistant', visible)
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
    return { reply, context: hideExerciseBrief(context), mission, xp_gained: xpAward.xp_gained, xp: xpAward }
  }
  return { reply, context: hideExerciseBrief(context), mission }
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
