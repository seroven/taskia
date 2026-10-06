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
import { hideExerciseBrief, planExerciseMemory, solveExerciseBrief } from '../../board/exerciseBrief.js'
import {
  exerciseReference,
  loadReferencePhoto,
  userReferencePhotos,
  planExerciseSheet,
  stripDrewPhrase,
  stripMathDelimiters,
  type BoardSheet,
  type SheetPlan,
} from '../../board/sheet.js'

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
  saveExerciseBrief,
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

    return { context: hideExerciseBrief(context), board, task }
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
    const usesBoard = task.uses_board
    const photoData = photo ? `data:${photo.mime};base64,${photo.base64}` : null
    const intent = usesBoard || photo
      ? await classifyBoardIntent({
          message,
          previous: truncateChars(lastTutor, 180),
          usage: { userId, kind: 'board_intent' },
        })
      : { reviewDrawing: false, drawExercise: false, helpExercise: false }
    const memory = planExerciseMemory({
      help: intent.helpExercise,
      review: intent.reviewDrawing,
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
      memory.sendPhoto || (memory.solve && !context.exercise_brief) ? photoData : null
    const referencePhoto = usesBoard
      ? await loadReferencePhoto(photoData, userReferencePhotos(context.messages))
      : null
    const referenceText = exerciseReference([
      task.description ?? '',
      ...context.messages.filter((item) => item.role === 'user').map((item) => item.content),
    ])
    const sheetPlan: SheetPlan = usesBoard
      ? await planExerciseSheet({
          draw: intent.drawExercise,
          referenceText,
          photoBase64: intent.drawExercise ? referencePhoto : null,
          usage: { userId, kind: 'board_facts' },
        })
      : { mode: 'none' }
    const boardImageRaw = intent.reviewDrawing ? boardImageSent : ''
    const boardDescription = intent.reviewDrawing ? boardDescriptionRaw : null
    const boardHas = Boolean(boardDescription?.trim() || boardImageRaw || (intent.reviewDrawing && photo))

    const boardMasteryHint =
      ' Anota "Solo bien: N/2". Evalúa study_eval: 2 problemas resueltos solo; al llegar a 2 pregunta si quiere otro tipo de ejercicio (passed=false); passed=true solo si declina.'
    let instruction = usesBoard
      ? 'Responde breve. Conserva el ejercicio activo.' + boardMasteryHint + ' No dibujes. board_text según board_mode.'
      : boardHas
        ? 'Responde breve. Usa context + last_tutor_message + mensaje + pizarra. Conserva el ejercicio activo. Anota "Errores: N". Piso user_turns ≥ 6+N. Refuerza puntos débiles. Si ya cumple el piso, puedes passed=true y celebrar Listo (no preguntes si quiere más).'
        : 'Responde breve. Usa context + last_tutor_message + mensaje. Conserva el ejercicio activo. Ignora pizarra. Anota "Errores: N". Piso user_turns ≥ 6+N. Refuerza puntos débiles. Si ya cumple el piso, puedes passed=true y celebrar Listo (no preguntes si quiere más).'
    if (fromVoice) {
      instruction +=
        ' El mensaje viene de voz (transcrito): prioriza afinar topic_summary y context_summary con lo que explicó el niño.'
    }
    if (tutorPhoto && intent.reviewDrawing) {
      instruction +=
        ' El niño adjuntó una foto del cuaderno. Léela y decide si el ejercicio está bien. No es la pizarra.'
    }
    if (intent.reviewDrawing && !boardHas) {
      instruction +=
        ' Pidió que revises su trabajo, pero no hay captura ni foto. Pídele que escriba en la pizarra o mande una foto.'
    }
    if (intent.reviewDrawing && boardHas) {
      instruction +=
        ' Mira la captura de la pizarra o la foto y decide si está bien. Si lo resolvió solo, puede sumar a Solo bien.'
    }
    if (sheetPlan.mode === 'need_reference') {
      instruction += ' board_mode=need_reference. Pide un ejercicio de ejemplo. No inventes uno.'
    } else if (sheetPlan.mode === 'text') {
      instruction +=
        ' board_mode=text. Escribe el enunciado nuevo en board_text y en speak_to_child. Sin la respuesta.'
    } else if (sheetPlan.mode === 'image') {
      instruction +=
        ' board_mode=image. La imagen ya está hecha. board_text vacío. Habla del ejercicio. No digas que lo dibujaste.'
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
      photo_attached: Boolean(tutorPhoto),
      ...(context.exercise_brief ? { exercise_solution: context.exercise_brief } : {}),
      child_message: truncateChars(message, fromVoice ? 4000 : 800),
      ...(usesBoard ? { board_mode: sheetPlan.mode } : {}),
      // Texto de coords solo si no hay imagen (fallback).
      ...(!boardImageRaw && boardDescription?.trim()
        ? { board_drawing: truncateChars(boardDescription, MAX_BOARD) }
        : {}),
    }

    const raw = await callGemini({
      system: tutorSystemPrompt(usesBoard),
      user: JSON.stringify(payload),
      boardImageBase64: boardImageRaw || null,
      photoBase64: tutorPhoto,
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
        if (!usesBoard) {
        if (userTurns < requiredChatTurns(6, contextSummaryDraft)) passed = false
      }
      if (phase !== 'reviewing') passed = false
      if (!evidence) passed = false
      if (usesBoard) {
        if (offeringMore) passed = false
        const n = soloBienCount(contextSummaryDraft)
        if (n !== null && n < 2) passed = false
      }
    }

    let speakSafe = stripMathDelimiters(stripDrewPhrase(speakToChild))
    if (!passed && looksLikeCelebratingTaskReady(speakSafe)) {
      const stripped = stripPrematureReadyCelebration(speakSafe)
      speakSafe = truncateChars(
        stripped.length >= 20
          ? stripped
          : '¡Vas muy bien! Sigamos un poquito más para afianzar y luego sí la movemos a Listo.',
        MAX_SPEAK,
      )
    }
    const boardText = stripMathDelimiters(String(value.board_text ?? '').trim())
    let boardSheet: BoardSheet | null = null
    if (sheetPlan.mode === 'image') boardSheet = { imageSrc: sheetPlan.imageSrc }
    else if (sheetPlan.mode === 'text' && boardText) boardSheet = { text: boardText.slice(0, 800) }

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
      board_items: [],
      board_sheet: boardSheet,
      scene: null,
      highlight: [] as string[],
      board_fallback: null,
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
    if (boardSheet && 'text' in boardSheet && !visible.includes(boardSheet.text.slice(0, 24))) {
      visible += `\n${boardSheet.text}`
    }
    if (reply.exercise) {
      visible += `\nEjercicio: ${reply.exercise.title}\n${reply.exercise.instructions}`
    }
    context.messages.push(
      await insertMessage(
        taskId,
        'assistant',
        truncateChars(visible, 1600),
        false,
        boardSheet && 'imageSrc' in boardSheet ? boardSheet.imageSrc : null,
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
