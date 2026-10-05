import { decodeStudyPhoto, uploadStudyPhoto } from '../../../infrastructure/cloudinary/cloudinary.client.js'
import { callGemini, callGeminiTranscribe, classifyBoardIntent } from '../../../infrastructure/gemini/gemini.client.js'
import { AppError } from '../../../shared/errors/app-error.js'
import {
  extractJson,
  looksLikeCelebratingTaskReady,
  looksLikeOfferingMorePractice,
  requiredChatTurns,
  soloBienCount,
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
import {
  applyVerdictToMastery,
  gradeBoard,
  highlightFromModel,
  resolveModelScene,
  SCENE_FALLBACK_MESSAGE,
} from '../../board/index.js'

export function canOpenStudy(task: { status: string; difficulty_code: string }) {
  return (
    task.status === 'studying' ||
    (task.status === 'done' && task.difficulty_code === 'high')
  )
}

export function normalizeDrawOps(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}


import {
  emptyBoard,
  insertMessage,
  loadBoard,
  loadContext,
  loadUserMemory,
  markStudyPassed,
  saveBoard,
  saveSessionMeta,
  saveUserMemory,
} from '../repositories/study.repository.js'

const MAX_CONTEXT = 400
const MAX_MEMORY = 600
const MAX_SPEAK = 450
const MAX_BOARD = 1600
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
    const board = task.uses_board ? await loadBoard(taskId) : emptyBoard()
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

    return { context, board, task }
}

export async function saveTaskBoard(userId: number, taskId: number, body: Record<string, unknown>) {
    const task = await fetchTask(taskId, userId)
    if (!task.uses_board) throw new AppError('Esta tarea no usa pizarra')
    await saveBoard(taskId, body.board ?? body)
    return { ok: true }
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
    const boardDescriptionRaw = task.uses_board
      ? ((body.board_description ?? body.boardDescription) as string | null)
      : null
    const boardImageSent = task.uses_board
      ? String(body.board_image_base64 ?? body.boardImageBase64 ?? '').trim()
      : ''
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
    const intent = task.uses_board
      ? await classifyBoardIntent({
          message,
          previous: truncateChars(lastTutor, 180),
          usage: { userId, kind: 'board_intent' },
        })
      : { reviewDrawing: false, drawExercise: false }
    const allowAiDraw = intent.drawExercise
    const incomingBoard = body.board_json ?? body.boardJson
    const boardState = task.uses_board
      ? incomingBoard && typeof incomingBoard === 'object'
        ? incomingBoard
        : await loadBoard(taskId)
      : null
    const verdict =
      task.uses_board && (intent.reviewDrawing || photo)
        ? gradeBoard({
            scene:
              boardState && typeof boardState === 'object'
                ? (boardState as { scene?: unknown }).scene
                : null,
            board: boardState,
            childMessage: message,
          })
        : null
    const boardImageRaw =
      intent.reviewDrawing && verdict?.verdict === 'unverifiable' && !photo ? boardImageSent : ''
    const boardDescription = intent.reviewDrawing ? boardDescriptionRaw : null
    const boardHas = Boolean(boardDescription?.trim() || boardImageRaw)

    const boardMasteryHint =
      ' Anota "Solo bien: N/2". Evalúa study_eval: 2 problemas resueltos solo; al llegar a 2 pregunta si quiere otro tipo de ejercicio (passed=false); passed=true solo si declina.'
    let instruction = allowAiDraw
      ? boardHas
        ? 'Responde breve. Usa context + last_tutor_message + mensaje + pizarra. Conserva el ejercicio activo.' +
          boardMasteryHint +
          ' Incluye scene con la figura o la expresión. draw_ops [].'
        : 'Responde breve. Usa context + last_tutor_message + mensaje. Conserva el ejercicio activo.' +
          boardMasteryHint +
          ' Incluye scene con la figura o la expresión (no dejes el ejercicio solo en el chat). draw_ops [].'
      : boardHas
        ? 'Responde breve. Usa context + last_tutor_message + mensaje + pizarra. Conserva el ejercicio activo. Anota "Errores: N". Piso user_turns ≥ 6+N. Refuerza puntos débiles. Si ya cumple el piso, puedes passed=true y celebrar Listo (no preguntes si quiere más).'
        : 'Responde breve. Usa context + last_tutor_message + mensaje. Conserva el ejercicio activo. Ignora pizarra. Anota "Errores: N". Piso user_turns ≥ 6+N. Refuerza puntos débiles. Si ya cumple el piso, puedes passed=true y celebrar Listo (no preguntes si quiere más).'
    if (fromVoice) {
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
    if (verdict?.verdict === 'correct' || verdict?.verdict === 'incorrect') {
      instruction += ` code_verdict=${verdict.verdict} expected=${verdict.expected} got=${verdict.got}. Explícalo y no lo cambies. Si es incorrecto, ese ejercicio no suma a Solo bien.`
    } else if (verdict?.verdict === 'unverifiable' && (intent.reviewDrawing || photo)) {
      instruction += ' code_verdict=unverifiable. No afirmes si está bien o mal.'
    }

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
      board_has_drawing: boardHas,
      photo_attached: Boolean(photo),
      child_message: truncateChars(message, fromVoice ? 4000 : 800),
      ...(allowAiDraw ? { allow_ai_draw: true } : {}),
      ...(verdict ? { code_verdict: verdict } : {}),
      // Texto de coords solo si no hay imagen (fallback).
      ...(!boardImageRaw && boardDescription?.trim()
        ? { board_drawing: truncateChars(boardDescription, MAX_BOARD) }
        : {}),
    }

    const raw = await callGemini({
      system: tutorSystemPrompt(allowAiDraw),
      user: JSON.stringify(payload),
      boardImageBase64: boardImageRaw || null,
      photoBase64: photo ? `data:${photo.mime};base64,${photo.base64}` : null,
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
    const offeringMore =
      looksLikeOfferingMorePractice(speakToChild) ||
      askQuestions.some((q) => looksLikeOfferingMorePractice(q))

    // Red de seguridad: Gemini tiende a aprobar pronto; forzar criterios duros.
    let passed = Boolean(
      (value.study_eval as { passed?: boolean } | undefined)?.passed,
    )
    if (task.study_passed) {
      passed = true
    } else {
      if (!allowAiDraw) {
        if (userTurns < requiredChatTurns(6, contextSummaryDraft)) passed = false
      }
      if (phase !== 'reviewing') passed = false
      if (!evidence) passed = false
      if (allowAiDraw) {
        if (offeringMore) passed = false
        const n = soloBienCount(contextSummaryDraft)
        if (n !== null && n < 2) passed = false
      }
    }

    // Si el servidor negó el visto, no dejar que el texto diga "ya puedes a Listo".
    let speakSafe = speakToChild
    const drawn = allowAiDraw
      ? await resolveModelScene(value, { userId, kind: 'task_tutor' })
      : null
    const boardFallback = drawn && !drawn.ok ? drawn.fallback : null
    if (boardFallback && !speakSafe.includes('lo armamos juntos')) {
      speakSafe = truncateChars(`${speakSafe} ${SCENE_FALLBACK_MESSAGE}`, MAX_SPEAK)
    }
    if (!task.study_passed && verdict?.verdict === 'incorrect') {
      const gated = applyVerdictToMastery({
        verdict,
        passed,
        contextSummary: contextSummaryDraft,
        previousSummary: context.context_summary,
      })
      passed = gated.passed
      contextSummaryDraft = gated.contextSummary
    }
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
      draw_ops: [],
      board_items: drawn && drawn.ok ? drawn.items : [],
      scene: drawn && drawn.ok ? drawn.scene : null,
      highlight: highlightFromModel(value),
      board_fallback: boardFallback,
      verdict,
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
    context.messages.push(await insertMessage(taskId, 'assistant', visible))
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
      context,
      study_passed: task.study_passed || reply.study_eval.passed,
      xp_gained: xpAward?.xp_gained ?? 0,
      xp: xpAward,
    }
}
