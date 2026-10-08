import { In } from 'typeorm'
import { AppDataSource } from '../../../infrastructure/database/data-source.js'
import {
  Course,
  StudyChallenge,
  StudyChallengeAnswer,
  StudyChallengePreset,
  StudyChallengeQuestion,
  StudyMission,
  StudyMissionMessage,
  StudyMissionSession,
  StudyWorld,
  StudyWorldCourse,
} from '../../../infrastructure/database/entities/index.js'
import { toInstantISO } from '../../../utils/helpers.js'
import { latencyForMissionReply } from '../../../utils/replyLatency.js'

export type WorldView = {
  id: number
  user_id: number
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export type MissionView = {
  id: number
  world_id: number
  course_id: number
  course_name: string
  title: string
  description: string | null
  status: string
  source_mission_id: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type ChallengeView = {
  id: number
  user_id: number
  world_id: number
  scope: string
  mission_id: number | null
  course_id: number | null
  course_name: string | null
  mission_title: string | null
  difficulty: string
  question_count: number
  status: string
  score: number | null
  started_at: string
  completed_at: string | null
  elapsed_ms: number
}

type MissionRaw = {
  id: number
  world_id: number
  course_id: number
  course_name: string
  title: string
  description: string | null
  status: string
  source_mission_id: number | null
  sort_order: number
  created_at: Date | string
  updated_at: Date | string
}

function toWorld(world: StudyWorld): WorldView {
  return {
    id: Number(world.id),
    user_id: Number(world.userId),
    title: world.title,
    description: world.description ?? null,
    created_at: toInstantISO(world.createdAt) ?? '',
    updated_at: toInstantISO(world.updatedAt) ?? '',
  }
}

function toMission(row: MissionRaw): MissionView {
  return {
    id: Number(row.id),
    world_id: Number(row.world_id),
    course_id: Number(row.course_id),
    course_name: String(row.course_name),
    title: String(row.title),
    description: row.description ?? null,
    status: String(row.status),
    source_mission_id: row.source_mission_id == null ? null : Number(row.source_mission_id),
    sort_order: Number(row.sort_order),
    created_at: toInstantISO(row.created_at) ?? '',
    updated_at: toInstantISO(row.updated_at) ?? '',
  }
}

function toChallenge(
  row: {
    id: number
    user_id: number
    world_id: number
    scope: string
    mission_id: number | null
    course_id: number | null
    difficulty: string
    question_count: number
    status: string
    score: number | null
    started_at: Date | string
    completed_at: Date | string | null
    elapsed_ms?: number | string | null
    course_name?: string | null
    mission_title?: string | null
  },
): ChallengeView {
  const courseName = row.course_name
  const missionTitle = row.mission_title
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    world_id: Number(row.world_id),
    scope: String(row.scope),
    mission_id: row.mission_id == null ? null : Number(row.mission_id),
    course_id: row.course_id == null ? null : Number(row.course_id),
    course_name: courseName == null || courseName === '' ? null : String(courseName),
    mission_title: missionTitle == null || missionTitle === '' ? null : String(missionTitle),
    difficulty: String(row.difficulty),
    question_count: Number(row.question_count),
    status: String(row.status),
    score: row.score == null ? null : Number(row.score),
    started_at: toInstantISO(row.started_at) ?? '',
    completed_at: toInstantISO(row.completed_at),
    elapsed_ms: Math.max(0, Number(row.elapsed_ms ?? 0) || 0),
  }
}

function missionQuery() {
  return AppDataSource.getRepository(StudyMission)
    .createQueryBuilder('m')
    .innerJoin(Course, 'c', 'c.id = m.course_id')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .select('m.id', 'id')
    .addSelect('m.world_id', 'world_id')
    .addSelect('m.course_id', 'course_id')
    .addSelect('c.name', 'course_name')
    .addSelect('m.title', 'title')
    .addSelect('m.description', 'description')
    .addSelect('m.status', 'status')
    .addSelect('m.source_mission_id', 'source_mission_id')
    .addSelect('m.sort_order', 'sort_order')
    .addSelect('m.created_at', 'created_at')
    .addSelect('m.updated_at', 'updated_at')
}

export async function findActiveWorld(worldId: number, userId: number) {
  const world = await AppDataSource.getRepository(StudyWorld).findOne({
    where: { id: worldId, userId, isActive: true },
  })
  return world ? toWorld(world) : null
}

export async function listActiveWorlds(userId: number) {
  const worlds = await AppDataSource.getRepository(StudyWorld).find({
    where: { userId, isActive: true },
    order: { updatedAt: 'DESC', id: 'DESC' },
  })
  return worlds.map(toWorld)
}

export async function insertWorld(userId: number, title: string, description: string | null) {
  const repo = AppDataSource.getRepository(StudyWorld)
  const saved = await repo.save(repo.create({ userId, title, description }))
  return Number(saved.id)
}

export async function updateWorld(
  worldId: number,
  userId: number,
  title: string,
  description: string | null,
) {
  await AppDataSource.getRepository(StudyWorld).update(
    { id: worldId, userId },
    { title, description },
  )
}

export async function archiveWorld(worldId: number, userId: number) {
  await AppDataSource.transaction(async (manager) => {
    await manager.getRepository(StudyMission).update({ worldId }, { isActive: false })
    await manager.getRepository(StudyWorldCourse).update({ worldId }, { isActive: false })
    await manager.getRepository(StudyWorld).update({ id: worldId, userId }, { isActive: false })
  })
}

export async function listWorldCourses(worldId: number) {
  const rows = await AppDataSource.getRepository(StudyWorldCourse)
    .createQueryBuilder('wc')
    .innerJoin(Course, 'c', 'c.id = wc.course_id')
    .leftJoin(
      StudyMission,
      'm',
      'm.world_id = wc.world_id AND m.course_id = wc.course_id AND m.is_active = TRUE',
    )
    .select('wc.world_id', 'world_id')
    .addSelect('wc.course_id', 'course_id')
    .addSelect('c.name', 'course_name')
    .addSelect('wc.sort_order', 'sort_order')
    .addSelect('COUNT(m.id)', 'mission_count')
    .addSelect(`COALESCE(SUM(CASE WHEN m.status = 'mastered' THEN 1 ELSE 0 END), 0)`, 'mastered_count')
    .addSelect(`COALESCE(SUM(CASE WHEN m.status = 'studying' THEN 1 ELSE 0 END), 0)`, 'studying_count')
    .addSelect(`COALESCE(SUM(CASE WHEN m.status = 'pending' THEN 1 ELSE 0 END), 0)`, 'pending_count')
    .where('wc.world_id = :worldId AND wc.is_active = TRUE', { worldId })
    .groupBy('wc.world_id')
    .addGroupBy('wc.course_id')
    .addGroupBy('c.name')
    .addGroupBy('wc.sort_order')
    .orderBy('wc.sort_order', 'ASC')
    .addOrderBy('c.name', 'ASC')
    .getRawMany<{
      world_id: number
      course_id: number
      course_name: string
      sort_order: number
      mission_count: string
      mastered_count: string
      studying_count: string
      pending_count: string
    }>()
  return rows.map((row) => ({
    world_id: Number(row.world_id),
    course_id: Number(row.course_id),
    course_name: String(row.course_name),
    sort_order: Number(row.sort_order),
    mission_count: Number(row.mission_count) || 0,
    mastered_count: Number(row.mastered_count) || 0,
    studying_count: Number(row.studying_count) || 0,
    pending_count: Number(row.pending_count) || 0,
  }))
}

export async function countOwnedActiveCourse(courseId: number, userId: number) {
  return AppDataSource.getRepository(Course).count({
    where: { id: courseId, userId, isActive: true },
  })
}

export async function maxWorldCourseSort(worldId: number) {
  const row = await AppDataSource.getRepository(StudyWorldCourse)
    .createQueryBuilder('wc')
    .select('MAX(wc.sort_order)', 'm')
    .where('wc.world_id = :worldId', { worldId })
    .getRawOne<{ m: string | number | null }>()
  return row?.m == null ? -1 : Number(row.m)
}

export async function linkWorldCourse(
  worldId: number,
  courseId: number,
  userId: number,
  sortOrder: number,
) {
  await AppDataSource.getRepository(StudyWorldCourse)
    .createQueryBuilder()
    .insert()
    .into(StudyWorldCourse)
    .values({ worldId, courseId, userId, sortOrder, isActive: true })
    .orUpdate(['is_active'], ['world_id', 'course_id'])
    .execute()
}

export async function unlinkWorldCourse(worldId: number, courseId: number) {
  await AppDataSource.transaction(async (manager) => {
    await manager.getRepository(StudyMission).update({ worldId, courseId }, { isActive: false })
    await manager
      .getRepository(StudyWorldCourse)
      .update({ worldId, courseId }, { isActive: false })
  })
}

export async function countActiveWorldCourse(worldId: number, courseId: number) {
  return AppDataSource.getRepository(StudyWorldCourse).count({
    where: { worldId, courseId, isActive: true },
  })
}

export async function findActiveMission(missionId: number, userId: number) {
  const row = await missionQuery()
    .where(
      'm.id = :missionId AND w.user_id = :userId AND m.is_active = TRUE AND w.is_active = TRUE',
      { missionId, userId },
    )
    .getRawOne<MissionRaw>()
  return row ? toMission(row) : null
}

export async function listMissions(worldId: number, courseId: number, userId: number) {
  const rows = await missionQuery()
    .where(
      `m.world_id = :worldId AND m.course_id = :courseId AND w.user_id = :userId
       AND m.is_active = TRUE AND w.is_active = TRUE`,
      { worldId, courseId, userId },
    )
    .orderBy('m.sort_order', 'ASC')
    .addOrderBy('m.id', 'ASC')
    .getRawMany<MissionRaw>()
  return rows.map(toMission)
}

export async function listCourseMissions(worldId: number, courseId: number, userId: number) {
  const rows = await missionQuery()
    .where(
      `m.world_id = :worldId AND m.course_id = :courseId AND w.user_id = :userId
       AND m.is_active = TRUE AND w.is_active = TRUE`,
      { worldId, courseId, userId },
    )
    .orderBy('m.sort_order', 'ASC')
    .getRawMany<MissionRaw>()
  return rows.map(toMission)
}

export async function listWorldMissions(worldId: number, userId: number) {
  const rows = await missionQuery()
    .leftJoin(
      StudyWorldCourse,
      'wc',
      'wc.world_id = m.world_id AND wc.course_id = m.course_id AND wc.is_active = TRUE',
    )
    .where(
      'm.world_id = :worldId AND w.user_id = :userId AND m.is_active = TRUE AND w.is_active = TRUE',
      { worldId, userId },
    )
    .orderBy('wc.sort_order', 'ASC')
    .addOrderBy('c.name', 'ASC')
    .addOrderBy('m.sort_order', 'ASC')
    .getRawMany<MissionRaw>()
  return rows.map(toMission)
}

export async function listImportableMissions(userId: number, courseId: number, worldId: number) {
  const rows = await AppDataSource.getRepository(StudyMission)
    .createQueryBuilder('m')
    .innerJoin(StudyWorld, 'w', 'w.id = m.world_id')
    .select('m.id', 'id')
    .addSelect('m.title', 'title')
    .addSelect('m.description', 'description')
    .addSelect('m.world_id', 'world_id')
    .addSelect('w.title', 'world_title')
    .addSelect('m.status', 'status')
    .where(
      `w.user_id = :userId AND m.course_id = :courseId AND m.world_id <> :worldId
       AND m.is_active = TRUE AND w.is_active = TRUE`,
      { userId, courseId, worldId },
    )
    .orderBy('w.title', 'ASC')
    .addOrderBy('m.title', 'ASC')
    .getRawMany<{
      id: number
      title: string
      description: string | null
      world_id: number
      world_title: string
      status: string
    }>()
  return rows.map((row) => ({
    id: Number(row.id),
    title: String(row.title),
    description: row.description ?? null,
    world_id: Number(row.world_id),
    world_title: String(row.world_title),
    status: String(row.status),
  }))
}

export async function updateMissionFields(
  missionId: number,
  title: string,
  description: string | null,
) {
  await AppDataSource.getRepository(StudyMission).update(
    { id: missionId },
    { title, description },
  )
}

export async function archiveMission(missionId: number) {
  await AppDataSource.getRepository(StudyMission).update({ id: missionId }, { isActive: false })
}

export async function setMissionStatus(missionId: number, status: 'studying' | 'mastered') {
  await AppDataSource.getRepository(StudyMission).update({ id: missionId }, { status })
}

export async function maxMissionSort(worldId: number, courseId: number) {
  const row = await AppDataSource.getRepository(StudyMission)
    .createQueryBuilder('m')
    .select('MAX(m.sort_order)', 'm')
    .where('m.world_id = :worldId AND m.course_id = :courseId', { worldId, courseId })
    .getRawOne<{ m: string | number | null }>()
  return row?.m == null ? -1 : Number(row.m)
}

export async function insertMission(input: {
  worldId: number
  courseId: number
  title: string
  description: string | null
  sourceMissionId?: number | null
  sortOrder: number
}) {
  const repo = AppDataSource.getRepository(StudyMission)
  const saved = await repo.save(
    repo.create({
      worldId: input.worldId,
      courseId: input.courseId,
      title: input.title,
      description: input.description,
      status: 'pending',
      sourceMissionId: input.sourceMissionId ?? null,
      sortOrder: input.sortOrder,
    }),
  )
  return Number(saved.id)
}

export async function ensureMissionSession(missionId: number) {
  await AppDataSource.getRepository(StudyMissionSession)
    .createQueryBuilder()
    .insert()
    .into(StudyMissionSession)
    .values({
      missionId,
      tutorPhase: 'understanding',
      topicSummary: '',
      contextSummary: '',
      notebookContext: '',
      hintsLevel: 0,
    })
    .orIgnore()
    .execute()
}

export async function loadMissionSession(missionId: number) {
  await ensureMissionSession(missionId)
  const session = await AppDataSource.getRepository(StudyMissionSession).findOneByOrFail({
    missionId,
  })
  const messages = await AppDataSource.getRepository(StudyMissionMessage).find({
    where: { missionId },
    order: { createdAt: 'ASC', id: 'ASC' },
  })
  return {
    mission_id: missionId,
    tutor_phase: session.tutorPhase,
    topic_summary: session.topicSummary,
    context_summary: session.contextSummary,
    notebook_context: String(session.notebookContext ?? ''),
    hints_level: Number(session.hintsLevel),
    exercise_brief: session.exerciseBrief ?? '',
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
      image_url: message.imageUrl,
      created_at: toInstantISO(message.createdAt) ?? '',
    })),
  }
}

export async function setNotebookIfEmpty(missionId: number, notebook: string) {
  await AppDataSource.getRepository(StudyMissionSession)
    .createQueryBuilder()
    .update()
    .set({ notebookContext: notebook })
    .where(`mission_id = :missionId AND (notebook_context IS NULL OR notebook_context = '')`, {
      missionId,
    })
    .execute()
}

export async function setNotebook(missionId: number, notebook: string) {
  await AppDataSource.getRepository(StudyMissionSession).update(
    { missionId },
    { notebookContext: notebook },
  )
}

export async function saveSessionGreeting(
  missionId: number,
  topicSummary: string,
  contextSummary: string,
) {
  await AppDataSource.getRepository(StudyMissionSession).update(
    { missionId },
    { topicSummary, contextSummary },
  )
}

export async function saveExerciseBrief(missionId: number, brief: string) {
  await AppDataSource.getRepository(StudyMissionSession).update({ missionId }, { exerciseBrief: brief })
}

export async function saveSessionMeta(
  missionId: number,
  input: {
    tutorPhase: string
    topicSummary: string
    contextSummary: string
    hintsLevel: number
  },
) {
  await AppDataSource.getRepository(StudyMissionSession).update({ missionId }, input)
}

export async function insertMissionMessage(
  missionId: number,
  role: string,
  content: string,
  fromVoice = false,
  imageUrl: string | null = null,
) {
  const latency =
    role === 'user'
      ? await latencyForMissionReply(missionId)
      : { reply_latency_seconds: null, is_pause: false }
  const repo = AppDataSource.getRepository(StudyMissionMessage)
  const saved = await repo.save(
    repo.create({
      missionId,
      role,
      content,
      fromVoice,
      imageUrl,
      replyLatencySeconds: latency.reply_latency_seconds,
      isPause: latency.is_pause,
    }),
  )
  const createdAt = saved.createdAt ?? (await repo.findOneBy({ id: saved.id }))?.createdAt
  return {
    role,
    content,
    image_url: imageUrl,
    created_at: toInstantISO(createdAt) ?? '',
  }
}

export async function loadMissionStudyBits(missionId: number) {
  const session = await AppDataSource.getRepository(StudyMissionSession).findOne({
    where: { missionId },
  })
  const messages = await AppDataSource.getRepository(StudyMissionMessage).find({
    where: { missionId, role: 'user' },
    order: { createdAt: 'ASC', id: 'ASC' },
    take: 40,
  })
  return {
    topic_summary: session?.topicSummary ?? '',
    context_summary: session?.contextSummary ?? '',
    notebook_context: session?.notebookContext ?? '',
    user_contents: messages.map((message) => message.content),
  }
}

export async function listChallengePresets() {
  const rows = await AppDataSource.getRepository(StudyChallengePreset).find()
  return rows.map((row) => ({
    scope: row.scope,
    difficulty: row.difficulty,
    question_count: Number(row.questionCount),
    label: row.label,
  }))
}

export async function presetQuestionCount(scope: string, difficulty: string) {
  const row = await AppDataSource.getRepository(StudyChallengePreset).findOne({
    where: { scope, difficulty },
  })
  return row ? Number(row.questionCount) : null
}

export async function deleteInProgressChallenges(userId: number) {
  await AppDataSource.getRepository(StudyChallenge).delete({ userId, status: 'in_progress' })
}

export async function findInProgressChallenge(userId: number) {
  return AppDataSource.getRepository(StudyChallenge).findOne({
    where: { userId, status: 'in_progress' },
    order: { startedAt: 'DESC' },
  })
}

export async function saveChallengeProgressRow(
  challengeId: number,
  elapsedMs: number,
  progress: unknown,
) {
  await AppDataSource.getRepository(StudyChallenge).update(
    { id: challengeId },
    { elapsedMs, progressJson: (progress ?? null) as never },
  )
}

export async function insertChallenge(input: {
  userId: number
  worldId: number
  scope: string
  missionId: number | null
  courseId: number | null
  difficulty: string
  questionCount: number
}) {
  const repo = AppDataSource.getRepository(StudyChallenge)
  const saved = await repo.save(
    repo.create({
      userId: input.userId,
      worldId: input.worldId,
      scope: input.scope,
      missionId: input.missionId,
      courseId: input.courseId,
      difficulty: input.difficulty,
      questionCount: input.questionCount,
      status: 'in_progress',
    }),
  )
  return Number(saved.id)
}

export async function deleteChallenge(challengeId: number, userId?: number) {
  await AppDataSource.getRepository(StudyChallenge).delete(
    userId == null ? { id: challengeId } : { id: challengeId, userId },
  )
}

export async function findOwnedChallenge(challengeId: number, userId: number) {
  return AppDataSource.getRepository(StudyChallenge).findOne({
    where: { id: challengeId, userId },
  })
}

export async function insertChallengeQuestion(input: {
  challengeId: number
  missionId: number
  sortOrder: number
  kind: string
  prompt: string
  options: string[] | null
  answerKey: string
  referenceImageUrl: string | null
}) {
  const repo = AppDataSource.getRepository(StudyChallengeQuestion)
  await repo.save(
    repo.create({
      challengeId: input.challengeId,
      missionId: input.missionId,
      sortOrder: input.sortOrder,
      kind: input.kind,
      prompt: input.prompt,
      optionsJson: input.options,
      answerKey: input.answerKey,
      referenceImageUrl: input.referenceImageUrl,
    }),
  )
}

export async function setChallengeQuestionCount(challengeId: number, questionCount: number) {
  await AppDataSource.getRepository(StudyChallenge).update({ id: challengeId }, { questionCount })
}

export function challengeViewFromEntity(row: StudyChallenge): ChallengeView {
  return toChallenge({
    id: row.id,
    user_id: row.userId,
    world_id: row.worldId,
    scope: row.scope,
    mission_id: row.missionId,
    course_id: row.courseId,
    difficulty: row.difficulty,
    question_count: row.questionCount,
    status: row.status,
    score: row.score,
    started_at: row.startedAt,
    completed_at: row.completedAt,
    elapsed_ms: row.elapsedMs,
  })
}

export type ChallengeQuestionDetail = {
  id: number
  mission_id: number | null
  sort_order: number
  kind: string
  prompt: string
  options_json: unknown
  answer_key: string
  reference_image_url: string | null
  is_correct: unknown
  user_answer: string | null
  course_id: number | null
  course_name: string | null
}

export async function listChallengeQuestionDetails(challengeId: number) {
  return AppDataSource.getRepository(StudyChallengeQuestion)
    .createQueryBuilder('q')
    .leftJoin(StudyChallengeAnswer, 'a', 'a.question_id = q.id')
    .leftJoin(StudyMission, 'm', 'm.id = q.mission_id')
    .leftJoin(Course, 'c', 'c.id = m.course_id')
    .select('q.id', 'id')
    .addSelect('q.mission_id', 'mission_id')
    .addSelect('q.sort_order', 'sort_order')
    .addSelect('q.kind', 'kind')
    .addSelect('q.prompt', 'prompt')
    .addSelect('q.options_json', 'options_json')
    .addSelect('q.answer_key', 'answer_key')
    .addSelect('q.reference_image_url', 'reference_image_url')
    .addSelect('a.is_correct', 'is_correct')
    .addSelect('a.user_answer', 'user_answer')
    .addSelect('m.course_id', 'course_id')
    .addSelect('c.name', 'course_name')
    .where('q.challenge_id = :challengeId', { challengeId })
    .orderBy('q.sort_order', 'ASC')
    .addOrderBy('q.id', 'ASC')
    .getRawMany<ChallengeQuestionDetail>()
}

export async function listChallengeQuestions(challengeId: number) {
  return AppDataSource.getRepository(StudyChallengeQuestion).find({
    where: { challengeId },
    order: { sortOrder: 'ASC', id: 'ASC' },
  })
}

export async function replaceChallengeAnswers(
  challengeId: number,
  answers: Array<{
    questionId: number
    userAnswer: string
    solutionImageUrl: string | null
    isCorrect: boolean
  }>,
) {
  const questions = await AppDataSource.getRepository(StudyChallengeQuestion).find({
    where: { challengeId },
    select: { id: true },
  })
  const ids = questions.map((question) => question.id)
  if (ids.length > 0) {
    await AppDataSource.getRepository(StudyChallengeAnswer).delete({ questionId: In(ids) })
  }
  const repo = AppDataSource.getRepository(StudyChallengeAnswer)
  for (const answer of answers) {
    await repo.save(
      repo.create({
        questionId: answer.questionId,
        userAnswer: answer.userAnswer,
        solutionImageUrl: answer.solutionImageUrl,
        isCorrect: answer.isCorrect,
      }),
    )
  }
}

export async function completeChallenge(challengeId: number, score: number) {
  await AppDataSource.getRepository(StudyChallenge).update(
    { id: challengeId },
    { status: 'completed', score, completedAt: () => 'NOW()' },
  )
}

export async function listCompletedChallenges(
  worldId: number,
  userId: number,
  missionId: number | undefined,
  courseId: number | undefined,
) {
  const qb = AppDataSource.getRepository(StudyChallenge)
    .createQueryBuilder('ch')
    .leftJoin(Course, 'c', 'c.id = ch.course_id')
    .leftJoin(StudyMission, 'm', 'm.id = ch.mission_id')
    .select('ch.id', 'id')
    .addSelect('ch.user_id', 'user_id')
    .addSelect('ch.world_id', 'world_id')
    .addSelect('ch.scope', 'scope')
    .addSelect('ch.mission_id', 'mission_id')
    .addSelect('ch.course_id', 'course_id')
    .addSelect('ch.difficulty', 'difficulty')
    .addSelect('ch.question_count', 'question_count')
    .addSelect('ch.status', 'status')
    .addSelect('ch.score', 'score')
    .addSelect('ch.started_at', 'started_at')
    .addSelect('ch.completed_at', 'completed_at')
    .addSelect('c.name', 'course_name')
    .addSelect('m.title', 'mission_title')
    .where('ch.world_id = :worldId AND ch.user_id = :userId AND ch.status = :status', {
      worldId,
      userId,
      status: 'completed',
    })
  if (missionId != null && Number.isFinite(missionId)) {
    qb.andWhere('ch.mission_id = :missionId', { missionId })
  } else if (courseId != null && Number.isFinite(courseId)) {
    qb.andWhere(
      `(ch.course_id = :courseId OR (ch.scope = 'course' AND ch.course_id = :courseId))`,
      { courseId },
    )
  }
  const rows = await qb
    .orderBy('ch.completed_at', 'DESC')
    .addOrderBy('ch.id', 'DESC')
    .limit(50)
    .getRawMany<{
      id: number
      user_id: number
      world_id: number
      scope: string
      mission_id: number | null
      course_id: number | null
      difficulty: string
      question_count: number
      status: string
      score: number | null
      started_at: Date
      completed_at: Date | null
      course_name: string | null
      mission_title: string | null
    }>()
  return rows.map((row) => toChallenge(row))
}
