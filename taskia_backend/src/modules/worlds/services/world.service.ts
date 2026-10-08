import { decodeStudyPhoto, uploadStudyPhoto } from '../../../infrastructure/cloudinary/cloudinary.client.js'
import {
  callGemini,
  callGeminiSpeak,
  callGeminiTranscribe,
  classifyBoardIntent,
} from '../../../infrastructure/gemini/gemini.client.js'
import { appendNotebook } from '../../../prompts/briefing.js'
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
import { chatVisibleSpeak, stripDrewPhrase } from '../../exercises/text.js'
import { parseVoiceTurnBody } from '../../study/schemas/study.schema.js'
import { awardXp, clampEffortScore, xpForMission } from '../../../services/xp.js'
import { classifyStudyMode } from '../../../services/classify-study-mode.js'
import {
  AppError,
  extractJson,
  looksLikeAskingMoreTopicContent,
  looksLikeCelebratingMissionMastered,
  looksLikeDecliningMoreWork,
  looksLikeReadyToStartBriefing,
  requiredChatTurns,
  stripPrematureReadyCelebration,
  stripSolveInvite,
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
  setBriefingReady,
  setMissionStatus,
  setNotebook,
  setStudyMode,
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
  const { title, description } = parseMissionBody(body)
  const maxOrder = await maxMissionSort(worldId, courseId)
  const missionId = await insertMission({
    worldId,
    courseId,
    title,
    description,
    sortOrder: maxOrder + 1,
  })
  return requireMission(missionId, userId)
}

export async function patchMission(userId: number, missionId: number, body: Record<string, unknown>) {
  const current = await requireMission(missionId, userId)
  const { title, description } = parseMissionBody(body)
  await updateMissionFields(current.id, title, description)
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
  if (context.messages.length === 0) {
    const speak = `¡Hola! Antes de estudiar "${mission.title}", cuéntame lo que dice tu cuaderno (puedes escribir o usar Hablar). Yo te escucho y te pregunto si falta algo; cuando digas que ya podemos empezar, arrancamos.`
    context.topic_summary = mission.title
    context.context_summary = `Inicio local. Misión: "${mission.title}". Briefing.`
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
  const inBriefing = !context.briefing_ready

  if (inBriefing) {
    context.notebook_context = appendNotebook(context.notebook_context, parsed.message, MAX_NOTEBOOK)
    await setNotebook(missionId, context.notebook_context)
  }

  if (!inBriefing && !context.study_mode) {
    const mode = await classifyStudyMode({
      userId,
      kind: 'mission_tutor',
      title: mission.title,
      description: mission.description ?? '',
      notebook: context.notebook_context,
    })
    if (mode) {
      context.study_mode = mode
      await setStudyMode(missionId, mode)
    }
  }

  const lastTutorMsg = [...context.messages].reverse().find((message) => message.role === 'assistant')
  const lastTutor = lastTutorMsg ? truncateChars(lastTutorMsg.content, 320) : ''
  const photoData = photo ? `data:${photo.mime};base64,${photo.base64}` : null

  const practical = context.study_mode === 'practical'
  const useExercises = !inBriefing && practical
  let intent = { helpExercise: false, reviewDrawing: false, drawExercise: false }
  let memory = { solve: false, sendPhoto: false, showMaterial: Boolean(photo) && !useExercises }
  let exerciseTurn: ExerciseTurn = { mode: 'none' }
  let tutorPhoto: string | null = null

  if (useExercises) {
    intent = await classifyBoardIntent({
      message: parsed.message,
      previous: truncateChars(lastTutor, 180),
      usage: { userId, kind: 'board_intent' },
    })
    memory = planExerciseMemory({
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
    tutorPhoto =
      memory.sendPhoto || memory.showMaterial || (memory.solve && !context.exercise_brief)
        ? photoData
        : null
    const referencePhoto = await loadReferencePhoto(photoData, userReferencePhotos(context.messages))
    const referenceText = exerciseReference([
      mission.description ?? '',
      context.notebook_context,
      ...context.messages.filter((item) => item.role === 'user').map((item) => item.content),
    ])
    exerciseTurn = await planExerciseTurn({
      draw: intent.drawExercise,
      referenceText,
      photoBase64: intent.drawExercise ? referencePhoto : null,
      usage: { userId, kind: 'board_facts' },
    })
  } else if (photo) {
    tutorPhoto = photoData
    memory = { solve: false, sendPhoto: false, showMaterial: true }
  }

  let instruction = inBriefing
    ? 'Briefing de la misión. Escucha, acumula en notebook_context, pregunta si falta algo o ya pueden empezar. Sin ejercicios ni dominio.'
    : practical
      ? 'Responde breve. Enseña el tema completo (básico + observación) SOLO con notebook_context + título/descripción. Conserva ejercicio activo. Anota "Errores: N". Piso user_turns ≥ 10+N. Pregunta todo lo posible de ese relato. Al cumplir el piso pregunta si queda más contenido (passed=false); passed=true solo si declina.'
      : 'Tema teórico. Enseña solo con notebook_context + título/descripción. Sin ejercicios y sin pedir cómo lo resolvió. Anota "Errores: N". Piso user_turns ≥ 10+N. Al cumplir el piso pregunta si queda más contenido (passed=false); passed=true solo si declina.'
  if (parsed.fromVoice) {
    instruction +=
      ' El mensaje viene de voz (transcrito): prioriza afinar topic_summary y context_summary con lo que explicó el niño.'
  }
  if (useExercises) {
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
  } else if (!inBriefing && tutorPhoto) {
    instruction +=
      ' La foto de este turno son apuntes. Léela y deja lo importante en context_summary. No pidas una resolución.'
  }

  const payload = JSON.stringify({
    instruction,
    user_turns: userTurns,
    mastered_already: mission.status === 'mastered',
    briefing_ready: context.briefing_ready,
    message_source: parsed.fromVoice ? 'voice' : 'text',
    mission: {
      title: truncateChars(mission.title, 120),
      description: truncateChars(mission.description ?? '', 220),
      course: mission.course_name,
    },
    phase: context.tutor_phase,
    topic_summary: truncateChars(context.topic_summary, 120),
    context_summary: truncateChars(context.context_summary, 400),
    notebook_context: truncateChars(context.notebook_context, MAX_NOTEBOOK),
    last_tutor_message: lastTutor,
    hints_level: context.hints_level,
    photo_attached: Boolean(tutorPhoto),
    ...(!useExercises ? {} : context.exercise_brief ? { exercise_solution: context.exercise_brief } : {}),
    child_message: truncateChars(parsed.message, parsed.fromVoice ? 4000 : 800),
  })

  const raw = await callGemini({
    system: missionTutorPrompt({
      briefingReady: context.briefing_ready,
      theoretical: !practical,
    }),
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
  let contextSummary = truncateChars(
    typeof value.context_summary === 'string' ? value.context_summary : context.context_summary,
    400,
  )
  const reply = {
    phase: inBriefing
      ? 'understanding'
      : typeof value.phase === 'string'
        ? value.phase
        : 'understanding',
    speak_to_child: truncateChars(
      speakForTurn(
        exerciseTurn,
        stripDrewPhrase(typeof value.speak_to_child === 'string' ? value.speak_to_child : '¡Sigue! Cuéntame más.'),
      ),
      450,
    ),
    ask_questions: askQuestions,
    topic_summary: typeof value.topic_summary === 'string' ? value.topic_summary : '',
    context_summary: contextSummary,
    hints_level: typeof value.hints_level === 'number' ? value.hints_level : 0,
    study_eval: {
      passed: Boolean(studyEvalRaw.passed),
      evidence: typeof studyEvalRaw.evidence === 'string' ? studyEvalRaw.evidence : '',
    },
  }

  if (inBriefing) {
    reply.study_eval.passed = false
    const readyFromChild = looksLikeReadyToStartBriefing(parsed.message)
    const readyFromSummary = /briefing:\s*listo/i.test(reply.context_summary)
    if (readyFromChild || readyFromSummary) {
      context.briefing_ready = true
      await setBriefingReady(missionId, true)
      if (!context.study_mode) {
        const mode = await classifyStudyMode({
          userId,
          kind: 'mission_tutor',
          title: mission.title,
          description: mission.description ?? '',
          notebook: context.notebook_context,
        })
        if (mode) {
          context.study_mode = mode
          await setStudyMode(missionId, mode)
        }
      }
      if (!/briefing:\s*listo/i.test(reply.context_summary)) {
        reply.context_summary = truncateChars(
          `${reply.context_summary.replace(/\s*Briefing:\s*listo/gi, '').trim()}\nBriefing: listo`.trim(),
          400,
        )
      }
    }
  } else {
    if (userTurns < requiredChatTurns(10, reply.context_summary)) reply.study_eval.passed = false
    const askingMoreContent =
      looksLikeAskingMoreTopicContent(reply.speak_to_child) ||
      reply.ask_questions.some((question) => looksLikeAskingMoreTopicContent(question))
    if (askingMoreContent) {
      reply.study_eval.passed = false
      if (!/cierre:\s*preguntado/i.test(reply.context_summary)) {
        reply.context_summary = truncateChars(
          `${reply.context_summary.replace(/\s*Cierre:\s*preguntado/gi, '').trim()}\nCierre: preguntado`.trim(),
          400,
        )
      }
    }
    const cierreAsked =
      looksLikeAskingMoreTopicContent(lastTutorMsg?.content ?? '') ||
      /cierre:\s*preguntado/i.test(context.context_summary)
    if (reply.study_eval.passed && !cierreAsked) {
      reply.study_eval.passed = false
    }
    if (
      reply.study_eval.passed &&
      cierreAsked &&
      !looksLikeDecliningMoreWork(parsed.message)
    ) {
      reply.study_eval.passed = false
    }
    if (
      !reply.study_eval.passed &&
      cierreAsked &&
      !askingMoreContent &&
      /quiero seguir|hay m[aá]s|falta|sigue|continúa|continua|m[aá]s contenido/i.test(parsed.message)
    ) {
      reply.context_summary = truncateChars(
        reply.context_summary.replace(/\s*Cierre:\s*preguntado/gi, '').trim(),
        400,
      )
    }
    if (reply.phase !== 'reviewing') reply.study_eval.passed = false
    if (!reply.study_eval.evidence.trim()) reply.study_eval.passed = false
    if (mission.status === 'mastered') reply.study_eval.passed = true
  }

  if (!practical) {
    const strippedInvite = stripSolveInvite(reply.speak_to_child)
    if (strippedInvite.length >= 12) reply.speak_to_child = truncateChars(strippedInvite, 450)
  }
  if (!reply.study_eval.passed && looksLikeCelebratingMissionMastered(reply.speak_to_child)) {
    const stripped = stripPrematureReadyCelebration(reply.speak_to_child)
    reply.speak_to_child = truncateChars(
      stripped.length >= 20
        ? stripped
        : '¡Vas muy bien! Sigamos un poquito más para afianzar el tema.',
      450,
    )
  }

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
    briefingReady: context.briefing_ready,
    notebookContext: context.notebook_context,
    ...(context.study_mode === 'theoretical' || context.study_mode === 'practical'
      ? { studyMode: context.study_mode }
      : {}),
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

/** Un turno de Hablar en misión: transcribe → chat → TTS en una sola petición HTTP. */
export async function voiceTurnMission(
  userId: number,
  missionId: number,
  body: Record<string, unknown>,
) {
  const input = parseVoiceTurnBody(body)
  const transcribed = await callGeminiTranscribe({
    audioBase64: input.audioBase64,
    mimeType: input.mimeType,
    durationSeconds: input.durationSeconds,
    usage: { userId, kind: 'transcribe' },
  })
  const transcript = transcribed.text.trim()
  if (!transcript || transcript === '(no se entendió)') {
    return {
      understood: false,
      transcript: transcript || '(no se entendió)',
      truncated: transcribed.truncated,
    }
  }
  const chatResult = await chatMission(userId, missionId, {
    user_message: transcript,
    from_voice: true,
    photo_base64: input.photoRaw || undefined,
  })
  const spoken = chatVisibleSpeak(String(chatResult.reply.speak_to_child ?? '')).slice(0, 1600)
  if (!spoken) {
    return {
      understood: true,
      transcript,
      truncated: transcribed.truncated,
      ...chatResult,
    }
  }
  const audio = await callGeminiSpeak({
    text: spoken,
    usage: { userId, kind: 'speak' },
  })
  return {
    understood: true,
    transcript,
    truncated: transcribed.truncated,
    ...chatResult,
    audio_base64: audio.audioBase64,
    mime_type: audio.mimeType,
  }
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
      sourceMissionId: source.id,
      sortOrder: maxOrder,
    })
  }
  return listMissions(worldId, courseId, userId)
}
