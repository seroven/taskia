import { decodeStudyPhoto, uploadStudyPhoto } from '../../../infrastructure/cloudinary/cloudinary.client.js'
import { callGemini, callGeminiSpeak, callGeminiTranscribe, classifyBoardIntent } from '../../../infrastructure/gemini/gemini.client.js'
import { AppError } from '../../../shared/errors/app-error.js'
import {
  extractJson,
  looksLikeAskingProjectFinished,
  looksLikeCelebratingTaskReady,
  looksLikeDecliningMoreWork,
  looksLikeReadyToStartBriefing,
  requiredChatTurns,
  stripPrematureReadyCelebration,
  stripSolveInvite,
  truncateChars,
} from '../../../utils/helpers.js'
import { awardXp, xpForProjectStudy, xpForTaskStudy } from '../../../services/xp.js'
import { scoreTaskEffort } from '../../../services/score-task-effort.js'
import { classifyStudyMode } from '../../../services/classify-study-mode.js'
import {
  fetchTask,
  markDoneByStudy,
  markStudying,
} from '../../tasks/services/task.service.js'
import {
  parseChatMessage,
  parseSpeakBody,
  parseTranscribeBody,
  parseVoiceTurnBody,
} from '../schemas/study.schema.js'
import { tutorSystemPrompt } from '../../../prompts/study-tutor.js'
import { projectTutorPrompt } from '../../../prompts/project-tutor.js'
import { appendNotebook } from '../../../prompts/briefing.js'
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

/** Abrir sesión: con ayuda, en marcha o ya lista (solo lectura si done). */
export function canOpenStudy(task: { status: string; needs_help: boolean }) {
  return (
    task.needs_help &&
    (task.status === 'pending' || task.status === 'studying' || task.status === 'done')
  )
}

import {
  insertMessage,
  loadContext,
  loadUserMemory,
  saveExerciseBrief,
  saveSessionMeta,
  saveUserMemory,
  setBriefingReady,
  setNotebook,
  setStudyMode,
} from '../repositories/study.repository.js'

const MAX_CONTEXT = 400
const MAX_MEMORY = 600
const MAX_SPEAK = 450
const MAX_LAST_TUTOR = 320
const MAX_NOTEBOOK = 8000

function extractActiveExerciseLine(summary: string) {
  for (const line of summary.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.toLowerCase().startsWith('ejercicio activo:')) return truncateChars(trimmed, 180)
  }
  return null
}

function ensureActiveExercise(
  summary: string,
  exercise: { title: string; instructions: string } | null,
  previous: string,
) {
  let base = summary.trim()
  if (exercise) {
    const line = `Ejercicio activo: ${truncateChars(exercise.title, 60)} — ${truncateChars(exercise.instructions, 140)}`
    const old = extractActiveExerciseLine(base)
    base = old ? base.replace(old, line) : base ? `${line}\n${base}` : line
  } else if (!extractActiveExerciseLine(base)) {
    const prev = extractActiveExerciseLine(previous)
    if (prev) base = base ? `${prev}\n${base}` : prev
  }
  return truncateChars(base, MAX_CONTEXT)
}

function markCierrePreguntado(summary: string) {
  const base = summary.replace(/\s*Cierre:\s*preguntado/gi, '').trim()
  return truncateChars(base ? `${base}\nCierre: preguntado` : 'Cierre: preguntado', MAX_CONTEXT)
}

function clearCierrePreguntado(summary: string) {
  return truncateChars(summary.replace(/\s*Cierre:\s*preguntado/gi, '').trim(), MAX_CONTEXT)
}

export async function speak(userId: number, body: Record<string, unknown>) {
  const input = parseSpeakBody(body)
  const audio = await callGeminiSpeak({
    text: input.text,
    usage: { userId, kind: 'speak' },
  })
  return { audio_base64: audio.audioBase64, mime_type: audio.mimeType }
}

export async function transcribe(userId: number, body: Record<string, unknown>) {
  const input = parseTranscribeBody(body)

  const result = await callGeminiTranscribe({
    audioBase64: input.audioBase64,
    mimeType: input.mimeType,
    durationSeconds: input.durationSeconds,
    usage: { userId, kind: 'transcribe' },
  })

  return result
}

/** Un turno de Hablar: transcribe → chat → TTS en una sola petición HTTP. */
export async function voiceTurn(userId: number, taskId: number, body: Record<string, unknown>) {
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
  const chatResult = await chat(userId, taskId, {
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

export async function openSession(userId: number, taskId: number) {
  let task = await fetchTask(taskId, userId)
  if (!canOpenStudy(task)) {
    throw new AppError('Solo puedes abrir el estudio de tareas que pidan ayuda de Taskia')
  }
  const readOnly = task.status === 'done'
  if (!readOnly) {
    task = await markStudying(userId, taskId)
  }
  const context = await loadContext(taskId)
  const userMemory = await loadUserMemory(userId)
  const isProject = task.task_kind === 'project'

  if (!readOnly && !isProject && !context.study_mode) {
    const mode = await classifyStudyMode({
      userId,
      kind: 'task_tutor',
      title: task.title,
      description: task.description ?? '',
    })
    if (mode) {
      context.study_mode = mode
      await setStudyMode(taskId, mode)
    }
  }

  if (!readOnly && context.messages.length === 0) {
    const desc = task.description?.trim()
    const memoryHint = userMemory.trim()
      ? ' Si ya practicamos algo antes, podemos retomar desde ahí.'
      : ''
    let speak: string
    if (isProject) {
      speak = desc
        ? `¡Hola! Vi tu proyecto "${task.title}": ${truncateChars(desc, 160)}. Antes de empezar, cuéntame qué quieres hacer y qué traes.${memoryHint} Cuando me digas, te pregunto si falta algo o ya podemos comenzar.`
        : `¡Hola! Vi tu proyecto "${task.title}". Antes de empezar, cuéntame qué quieres lograr y qué traes.${memoryHint} Luego te pregunto si falta algo o ya podemos comenzar.`
      context.context_summary = `Inicio local. Proyecto: "${task.title}". Briefing.`
    } else {
      speak = desc
        ? `¡Hola! Vi tu tarea "${task.title}": ${truncateChars(desc, 160)}. Estoy aquí para ayudarte paso a paso.${memoryHint} ¿Qué parte quieres practicar primero?`
        : `¡Hola! Vi tu tarea "${task.title}". Estoy aquí para ayudarte paso a paso.${memoryHint} ¿Qué quieres practicar hoy?`
      context.context_summary = `Inicio local. Tarea: "${task.title}".`
    }
    context.topic_summary = task.title
    context.messages.push(await insertMessage(taskId, 'assistant', speak))
    await saveSessionMeta(context)
  }

  return { context: hideExerciseBrief(context), task }
}

export async function chat(userId: number, taskId: number, body: Record<string, unknown>) {
  let task = await fetchTask(taskId, userId)
  if (!task.needs_help || task.status === 'done') {
    throw new AppError('Solo puedes chatear en tareas con Taskia que estén en marcha')
  }
  if (task.status === 'pending') {
    task = await markStudying(userId, taskId)
  }
  if (task.status !== 'studying') {
    throw new AppError('Solo puedes chatear en tareas con Taskia que estén en marcha')
  }

  const parsedTurn = parseChatMessage(body)
  const message = parsedTurn.message
  const photo = parsedTurn.photoRaw ? decodeStudyPhoto(parsedTurn.photoRaw) : null
  const imageUrl = photo ? await uploadStudyPhoto(photo) : null
  const fromVoice = Boolean(body.from_voice ?? body.fromVoice)
  const isProject = task.task_kind === 'project'

  const context = await loadContext(taskId)
  const userMemory = await loadUserMemory(userId)
  context.messages.push(await insertMessage(taskId, 'user', message, fromVoice, imageUrl))
  const userTurns = context.messages.filter((m) => m.role === 'user').length
  const updateUserMemory = userTurns % 3 === 0

  if (isProject && !context.briefing_ready) {
    context.notebook_context = appendNotebook(context.notebook_context, message, MAX_NOTEBOOK)
    await setNotebook(taskId, context.notebook_context)
  }

  if (!context.study_mode && (!isProject || context.briefing_ready)) {
    const mode = await classifyStudyMode({
      userId,
      kind: 'task_tutor',
      title: task.title,
      description: task.description ?? '',
      notebook: isProject ? context.notebook_context : '',
    })
    if (mode) {
      context.study_mode = mode
      await setStudyMode(taskId, mode)
    }
  }

  const lastTutorMsg = [...context.messages].reverse().find((m) => m.role === 'assistant')
  const lastTutor = lastTutorMsg?.content ?? ''
  const photoData = photo ? `data:${photo.mime};base64,${photo.base64}` : null

  const inBriefing = isProject && !context.briefing_ready
  const practical = context.study_mode === 'practical'
  const skipExercises = inBriefing || !practical

  let intent = {
    helpExercise: false,
    reviewDrawing: false,
    drawExercise: false,
  }
  let memory = { solve: false, sendPhoto: false, showMaterial: Boolean(photo) && !skipExercises }
  let exerciseTurn: ExerciseTurn = { mode: 'none' }
  let tutorPhoto: string | null = null

  if (!skipExercises) {
    intent = await classifyBoardIntent({
      message,
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
        text: message,
        photoBase64: image,
        usage: { userId, kind: 'board_facts' },
      })
      if (brief) {
        context.exercise_brief = brief
        await saveExerciseBrief(taskId, brief)
      }
    }
    tutorPhoto =
      memory.sendPhoto || memory.showMaterial || (memory.solve && !context.exercise_brief)
        ? photoData
        : null
    const referencePhoto = await loadReferencePhoto(photoData, userReferencePhotos(context.messages))
    const referenceText = exerciseReference([
      task.description ?? '',
      ...(isProject ? [context.notebook_context] : []),
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

  let instruction: string
  if (inBriefing) {
    instruction =
      'Briefing del proyecto. Escucha, acumula en notebook_context, pregunta si falta algo o ya pueden empezar. Sin ejercicios ni passed.'
  } else if (isProject) {
    instruction = practical
      ? 'Guía el proyecto con notebook_context fijo. Anota "Errores: N". Piso user_turns ≥ 10+N. En un hito pregunta si dan por terminado (passed=false, Cierre: preguntado); passed=true solo si el niño confirma el fin.'
      : 'Proyecto teórico. Guía con notebook_context fijo, sin ejercicios y sin pedir cómo lo resolvió. Anota "Errores: N". Piso user_turns ≥ 10+N. En un hito pregunta si dan por terminado (passed=false, Cierre: preguntado); passed=true solo si el niño confirma el fin.'
  } else {
    instruction = practical
      ? 'Responde breve. Usa context + last_tutor_message + mensaje. Conserva el ejercicio activo. Anota "Errores: N". Piso user_turns ≥ 6+N. Refuerza puntos débiles. Si ya cumple el piso, puedes passed=true y celebrar Listo (no preguntes si quiere más).'
      : 'Tarea teórica. Guía para que entienda y explique. Sin ejercicios y sin pedir cómo lo resolvió. Anota "Errores: N". Piso user_turns ≥ 6+N. Si ya cumple el piso, puedes passed=true y celebrar Listo.'
  }
  if (fromVoice) {
    instruction +=
      ' El mensaje viene de voz (transcrito): prioriza afinar topic_summary y context_summary con lo que explicó el niño.'
  }
  if (!skipExercises) {
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

  const systemPrompt = isProject
    ? projectTutorPrompt({
        briefingReady: context.briefing_ready,
        theoretical: !practical,
      })
    : tutorSystemPrompt({ theoretical: !practical })

  const payload = {
    instruction,
    update_user_memory: updateUserMemory,
    user_turns: userTurns,
    study_passed_already: false,
    briefing_ready: context.briefing_ready,
    task_kind: task.task_kind,
    message_source: fromVoice ? 'voice' : 'text',
    task: {
      title: truncateChars(task.title, 120),
      description: truncateChars(task.description ?? '', 220),
      course: task.course_name,
      needs_help: task.needs_help,
      task_kind: task.task_kind,
    },
    phase: context.tutor_phase,
    topic_summary: truncateChars(context.topic_summary, 120),
    context_summary: truncateChars(context.context_summary, MAX_CONTEXT),
    ...(isProject
      ? { notebook_context: truncateChars(context.notebook_context, MAX_NOTEBOOK) }
      : {}),
    last_tutor_message: truncateChars(lastTutor, MAX_LAST_TUTOR),
    user_memory_summary: truncateChars(userMemory, MAX_MEMORY),
    hints_level: context.hints_level,
    photo_attached: Boolean(tutorPhoto),
    ...(!skipExercises && context.exercise_brief
      ? { exercise_solution: context.exercise_brief }
      : {}),
    child_message: truncateChars(message, fromVoice ? 4000 : 800),
  }

  const raw = await callGemini({
    system: systemPrompt,
    user: JSON.stringify(payload),
    photoBase64: tutorPhoto,
    photoCaption: memory.showMaterial
      ? 'Foto del cuaderno. Es material del tema, no la respuesta de un ejercicio.'
      : undefined,
    usage: { userId, kind: 'task_tutor' },
  })

  let value: Record<string, unknown>
  try {
    value = JSON.parse(extractJson(raw)) as Record<string, unknown>
  } catch {
    throw new AppError(
      'La IA respondió, pero no en el formato esperado. Probá enviar de nuevo (no gastamos un segundo intento automático para cuidar tokens).',
    )
  }

  const exerciseRaw = value.exercise as Record<string, unknown> | null | undefined
  const exercise =
    !skipExercises && exerciseRaw && typeof exerciseRaw === 'object'
      ? {
          id: String(exerciseRaw.id ?? ''),
          title: String(exerciseRaw.title ?? ''),
          instructions: String(exerciseRaw.instructions ?? ''),
          expected_interaction: String(exerciseRaw.expected_interaction ?? ''),
        }
      : null

  const phase = inBriefing ? 'understanding' : String(value.phase ?? 'understanding')
  const evidence = String(
    (value.study_eval as { evidence?: string } | undefined)?.evidence ?? '',
  ).trim()
  const speakToChild = truncateChars(
    String(value.speak_to_child ?? '¡Genial! Cuéntame un poquito más y seguimos juntos.'),
    MAX_SPEAK,
  )
  let contextSummaryDraft = String(value.context_summary ?? context.context_summary)

  const askQuestions = Array.isArray(value.ask_questions)
    ? (value.ask_questions as unknown[]).map(String)
    : []

  let passed = Boolean((value.study_eval as { passed?: boolean } | undefined)?.passed)

  if (inBriefing) {
    passed = false
    const readyFromChild = looksLikeReadyToStartBriefing(message)
    const readyFromSummary = /briefing:\s*listo/i.test(contextSummaryDraft)
    if (readyFromChild || readyFromSummary) {
      context.briefing_ready = true
      await setBriefingReady(taskId, true)
      if (!context.study_mode) {
        const mode = await classifyStudyMode({
          userId,
          kind: 'task_tutor',
          title: task.title,
          description: task.description ?? '',
          notebook: context.notebook_context,
        })
        if (mode) {
          context.study_mode = mode
          await setStudyMode(taskId, mode)
        }
      }
      if (!/briefing:\s*listo/i.test(contextSummaryDraft)) {
        contextSummaryDraft = truncateChars(
          `${contextSummaryDraft.replace(/\s*Briefing:\s*listo/gi, '').trim()}\nBriefing: listo`.trim(),
          MAX_CONTEXT,
        )
      }
    }
  } else if (isProject) {
    if (userTurns < requiredChatTurns(10, contextSummaryDraft)) passed = false
    if (phase !== 'reviewing') passed = false
    if (!evidence) passed = false
    const askingFinish =
      looksLikeAskingProjectFinished(speakToChild) ||
      askQuestions.some((q) => looksLikeAskingProjectFinished(q))
    if (askingFinish) {
      passed = false
      contextSummaryDraft = markCierrePreguntado(contextSummaryDraft)
    }
    const cierreAsked =
      /cierre:\s*preguntado/i.test(context.context_summary) ||
      looksLikeAskingProjectFinished(lastTutor)
    if (passed && !cierreAsked) {
      passed = false
    }
    if (passed && cierreAsked && !looksLikeDecliningMoreWork(message)) {
      passed = false
    }
    if (!passed && cierreAsked && !askingFinish && !looksLikeDecliningMoreWork(message)) {
      // sigue trabajando: limpia el marcador para el próximo hito
      if (/quiero seguir|hay m[aá]s|falta|sigue|continúa|continua/i.test(message)) {
        contextSummaryDraft = clearCierrePreguntado(contextSummaryDraft)
      }
    }
  } else {
    if (userTurns < requiredChatTurns(6, contextSummaryDraft)) passed = false
    if (phase !== 'reviewing') passed = false
    if (!evidence) passed = false
  }

  let speakSafe = speakForTurn(exerciseTurn, stripDrewPhrase(speakToChild))
  if (!practical) {
    const strippedInvite = stripSolveInvite(speakSafe)
    if (strippedInvite.length >= 12) speakSafe = strippedInvite
  }
  if (!passed && looksLikeCelebratingTaskReady(speakSafe)) {
    const stripped = stripPrematureReadyCelebration(speakSafe)
    speakSafe = truncateChars(
      stripped.length >= 20
        ? stripped
        : isProject
          ? '¡Vas muy bien! Sigamos con el proyecto un poco más.'
          : '¡Vas muy bien! Sigamos un poquito más para afianzar y luego sí quedará lista.',
      MAX_SPEAK,
    )
  }

  const reply = {
    phase,
    speak_to_child: speakSafe,
    ask_questions: askQuestions,
    topic_summary: String(value.topic_summary ?? ''),
    context_summary: ensureActiveExercise(
      contextSummaryDraft,
      exercise,
      context.context_summary,
    ),
    user_memory_summary: truncateChars(
      updateUserMemory && String(value.user_memory_summary ?? '').trim()
        ? String(value.user_memory_summary)
        : userMemory || `Estudia "${task.title}" (${task.course_name}).`,
      MAX_MEMORY,
    ),
    exercise,
    hints_level: Number(value.hints_level ?? 0),
    study_eval: {
      passed,
      evidence,
    },
  }

  context.tutor_phase = reply.phase
  if (reply.topic_summary.trim()) {
    context.topic_summary = truncateChars(reply.topic_summary, 120)
  }
  context.context_summary = reply.context_summary
  context.hints_level = reply.hints_level

  const visible = reply.speak_to_child
  context.messages.push(
    await insertMessage(taskId, 'assistant', truncateChars(visible, 1600)),
  )
  await saveSessionMeta({
    ...context,
    notebook_context: context.notebook_context,
    briefing_ready: context.briefing_ready,
    study_mode: context.study_mode || undefined,
  })
  if (updateUserMemory) await saveUserMemory(userId, reply.user_memory_summary)

  let xpAward = null as Awaited<ReturnType<typeof awardXp>> | null
  let taskDone = false
  if (reply.study_eval.passed) {
    const { previousStatus } = await markDoneByStudy(userId, taskId)
    taskDone = true
    if (previousStatus !== 'done') {
      const effort = await scoreTaskEffort({
        userId,
        evidence,
        userTurns,
        topicSummary: reply.topic_summary || context.topic_summary,
      })
      xpAward = await awardXp({
        userId,
        sourceType: 'task_study',
        sourceId: taskId,
        amount: isProject ? xpForProjectStudy(effort) : xpForTaskStudy(effort),
        effortScore: effort,
        reason: evidence || (isProject ? 'Proyecto listo con Taskia' : 'Tarea lista con Taskia'),
      })
    }
    task = await fetchTask(taskId, userId)
  }

  return {
    reply,
    context: hideExerciseBrief(context),
    task,
    study_passed: taskDone,
    xp_gained: xpAward?.xp_gained ?? 0,
    xp: xpAward,
  }
}
