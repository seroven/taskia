import { decodeStudyPhoto, uploadStudyPhoto } from '../../../infrastructure/cloudinary/cloudinary.client.js'
import { callGemini, callGeminiTranscribe, classifyBoardIntent } from '../../../infrastructure/gemini/gemini.client.js'
import { AppError } from '../../../shared/errors/app-error.js'
import {
  extractJson,
  looksLikeCelebratingTaskReady,
  requiredChatTurns,
  stripPrematureReadyCelebration,
  truncateChars,
} from '../../../utils/helpers.js'
import {
  awardXp,
  clampEffortScore,
  xpForTaskStudy,
} from '../../../services/xp.js'
import { fetchTask } from '../../tasks/services/task.service.js'
import { parseChatMessage, parseTranscribeBody } from '../schemas/study.schema.js'
import { tutorSystemPrompt } from '../../../prompts/study-tutor.js'
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

export function canOpenStudy(task: { status: string; difficulty_code: string }) {
  return (
    task.status === 'studying' ||
    (task.status === 'done' && task.difficulty_code === 'high')
  )
}

import {
  insertMessage,
  loadContext,
  loadUserMemory,
  markStudyPassed,
  saveExerciseBrief,
  saveSessionMeta,
  saveUserMemory,
} from '../repositories/study.repository.js'

const MAX_CONTEXT = 400
const MAX_MEMORY = 600
const MAX_SPEAK = 450
const MAX_LAST_TUTOR = 320


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

export async function openSession(userId: number, taskId: number) {
    const task = await fetchTask(taskId, userId)
    if (!canOpenStudy(task)) {
      throw new AppError(
        'Solo puedes estudiar tareas en Estudiando, o Listo si son de nivel Alto',
      )
    }
    const context = await loadContext(taskId)
    const userMemory = await loadUserMemory(userId)

    if (context.messages.length === 0) {
      const desc = task.description?.trim()
      const memoryHint = userMemory.trim()
        ? ' Si ya practicamos algo antes, podemos retomar desde ahí.'
        : ''
      const speak = desc
        ? `¡Hola! Vi tu tarea "${task.title}": ${truncateChars(desc, 160)}. Estoy aquí para ayudarte paso a paso.${memoryHint} ¿Qué parte quieres practicar primero?`
        : `¡Hola! Vi tu tarea "${task.title}". Estoy aquí para ayudarte paso a paso.${memoryHint} ¿Qué quieres practicar hoy?`
      context.topic_summary = task.title
      context.context_summary = `Inicio local. Tarea: "${task.title}".`
      context.messages.push(await insertMessage(taskId, 'assistant', speak))
      await saveSessionMeta(context)
    }

    return { context: hideExerciseBrief(context), task }
}

export async function chat(userId: number, taskId: number, body: Record<string, unknown>) {
    const task = await fetchTask(taskId, userId)
    if (!canOpenStudy(task)) {
      throw new AppError(
        'Solo puedes chatear en estudio en tareas Estudiando, o Listo si son de nivel Alto',
      )
    }

    const parsedTurn = parseChatMessage(body)
    const message = parsedTurn.message
    const photo = parsedTurn.photoRaw ? decodeStudyPhoto(parsedTurn.photoRaw) : null
    const imageUrl = photo ? await uploadStudyPhoto(photo) : null
    const fromVoice = Boolean(body.from_voice ?? body.fromVoice)

    const context = await loadContext(taskId)
    const userMemory = await loadUserMemory(userId)
    context.messages.push(await insertMessage(taskId, 'user', message, fromVoice, imageUrl))
    const userTurns = context.messages.filter((m) => m.role === 'user').length
    const updateUserMemory = userTurns % 3 === 0

    const lastTutor =
      [...context.messages]
        .reverse()
        .find((m) => m.role === 'assistant')
        ?.content ?? ''
    const photoData = photo ? `data:${photo.mime};base64,${photo.base64}` : null
    const intent = await classifyBoardIntent({
      message,
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
        text: message,
        photoBase64: image,
        usage: { userId, kind: 'board_facts' },
      })
      if (brief) {
        context.exercise_brief = brief
        await saveExerciseBrief(taskId, brief)
      }
    }
    const tutorPhoto =
      memory.sendPhoto || memory.showMaterial || (memory.solve && !context.exercise_brief)
        ? photoData
        : null
    const referencePhoto = await loadReferencePhoto(photoData, userReferencePhotos(context.messages))
    const referenceText = exerciseReference([
      task.description ?? '',
      ...context.messages.filter((item) => item.role === 'user').map((item) => item.content),
    ])
    const exerciseTurn: ExerciseTurn = await planExerciseTurn({
      draw: intent.drawExercise,
      referenceText,
      photoBase64: intent.drawExercise ? referencePhoto : null,
      usage: { userId, kind: 'board_facts' },
    })

    let instruction =
      'Responde breve. Usa context + last_tutor_message + mensaje. Conserva el ejercicio activo. Anota "Errores: N". Piso user_turns ≥ 6+N. Refuerza puntos débiles. Si ya cumple el piso, puedes passed=true y celebrar Listo (no preguntes si quiere más).'
    if (fromVoice) {
      instruction +=
        ' El mensaje viene de voz (transcrito): prioriza afinar topic_summary y context_summary con lo que explicó el niño.'
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
      instruction += ' Pidió que revises su trabajo, pero no hay foto. Pídele que mande una foto del cuaderno.'
    }
    if (intent.reviewDrawing && tutorPhoto) {
      instruction += ' Mira la foto y decide si está bien.'
    }
    instruction += exerciseTurnInstruction(exerciseTurn)

    const payload = {
      instruction,
      update_user_memory: updateUserMemory,
      user_turns: userTurns,
      study_passed_already: task.study_passed,
      message_source: fromVoice ? 'voice' : 'text',
      task: {
        title: truncateChars(task.title, 120),
        description: truncateChars(task.description ?? '', 220),
        course: task.course_name,
        difficulty: task.difficulty_name,
        difficulty_code: task.difficulty_code,
      },
      phase: context.tutor_phase,
      topic_summary: truncateChars(context.topic_summary, 120),
      context_summary: truncateChars(context.context_summary, MAX_CONTEXT),
      last_tutor_message: truncateChars(lastTutor, MAX_LAST_TUTOR),
      user_memory_summary: truncateChars(userMemory, MAX_MEMORY),
      hints_level: context.hints_level,
      photo_attached: Boolean(tutorPhoto),
      ...(context.exercise_brief ? { exercise_solution: context.exercise_brief } : {}),
      child_message: truncateChars(message, fromVoice ? 4000 : 800),
    }

    const raw = await callGemini({
      system: tutorSystemPrompt(),
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
      exerciseRaw && typeof exerciseRaw === 'object'
        ? {
            id: String(exerciseRaw.id ?? ''),
            title: String(exerciseRaw.title ?? ''),
            instructions: String(exerciseRaw.instructions ?? ''),
            expected_interaction: String(exerciseRaw.expected_interaction ?? ''),
          }
        : null

    const phase = String(value.phase ?? 'understanding')
    const evidence = String(
      (value.study_eval as { evidence?: string } | undefined)?.evidence ?? '',
    ).trim()
    const speakToChild = truncateChars(
      String(value.speak_to_child ?? '¡Genial! Cuéntame un poquito más y seguimos juntos.'),
      MAX_SPEAK,
    )
    let contextSummaryDraft = String(
      value.context_summary ?? context.context_summary,
    )

    const askQuestions = Array.isArray(value.ask_questions)
      ? (value.ask_questions as unknown[]).map(String)
      : []

    // Red de seguridad: Gemini tiende a aprobar pronto; forzar criterios duros.
    let passed = Boolean(
      (value.study_eval as { passed?: boolean } | undefined)?.passed,
    )
    if (task.study_passed) {
      passed = true
    }     else {
      if (userTurns < requiredChatTurns(6, contextSummaryDraft)) passed = false
      if (phase !== 'reviewing') passed = false
      if (!evidence) passed = false
    }

    let speakSafe = speakForTurn(exerciseTurn, stripDrewPhrase(speakToChild))
    if (!passed && looksLikeCelebratingTaskReady(speakSafe)) {
      const stripped = stripPrematureReadyCelebration(speakSafe)
      speakSafe = truncateChars(
        stripped.length >= 20
          ? stripped
          : '¡Vas muy bien! Sigamos un poquito más para afianzar y luego sí la movemos a Listo.',
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
        evidence: task.study_passed && !evidence ? 'ya aprobado' : evidence,
      },
    }

    context.tutor_phase = reply.phase
    if (reply.topic_summary.trim()) {
      context.topic_summary = truncateChars(reply.topic_summary, 120)
    }
    context.context_summary = reply.context_summary
    context.hints_level = reply.hints_level

    // ask_questions queda para lógica interna; no se lista al niño (evita preguntas duplicadas).
    let visible = reply.speak_to_child
    if (reply.exercise) {
      visible += `\nEjercicio: ${reply.exercise.title}\n${reply.exercise.instructions}`
    }
    context.messages.push(
      await insertMessage(
        taskId,
        'assistant',
        truncateChars(visible, 1600),
      ),
    )
    await saveSessionMeta(context)
    if (updateUserMemory) await saveUserMemory(userId, reply.user_memory_summary)

    let xpAward = null as Awaited<ReturnType<typeof awardXp>> | null
    const justPassed = reply.study_eval.passed && !task.study_passed
    if (reply.study_eval.passed) {
      await markStudyPassed(taskId, userId)
      if (justPassed) {
        const effort = clampEffortScore(
          (value.study_eval as { effort_score?: unknown } | undefined)?.effort_score,
          { passed: true, hasEvidence: Boolean(evidence) },
        )
        xpAward = await awardXp({
          userId,
          sourceType: 'task_study',
          sourceId: taskId,
          amount: xpForTaskStudy(task.difficulty_code, effort),
          effortScore: effort,
          reason: evidence || 'Visto de estudio',
        })
      }
    }

    return {
      reply,
      context: hideExerciseBrief(context),
      study_passed: task.study_passed || reply.study_eval.passed,
      xp_gained: xpAward?.xp_gained ?? 0,
      xp: xpAward,
    }
}
