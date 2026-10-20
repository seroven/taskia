# Graph Report - taskia_code  (2026-10-20)

## Corpus Check
- 264 files · ~117,483 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 28 file(s) not represented in the graph (top: .css 19, .mdc 4, (none) 3)

## Summary
- 2001 nodes · 5760 edges · 89 communities (70 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b286fce`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- worldsTypes.ts
- StudyChat.tsx
- App.tsx
- world.service.ts
- DateField
- chat
- BoardPage.tsx
- world.repository.ts
- troop.service.ts
- AdminStudentPage.tsx
- planet-config.ts
- errorMessage
- admin.service.ts
- ChallengeHistoryList.tsx
- admin.controller.ts
- auth.middleware.ts
- task.schema.ts
- 001_baseline.ts
- entities/index.ts
- guardian.repository.ts
- gemini.client.ts
- engine.ts
- migrate.ts
- services/xp.ts
- world.controller.ts
- task.repository.ts
- sessionPlace.ts
- react
- taskia_frontend/package.json
- scripts
- reference.ts
- admin.repository.ts
- compilerOptions
- civil-date.ts
- sv
- taskia_backend/package.json
- WorldDetail.tsx
- AppError
- auth.service.ts
- compilerOptions
- createGuardian
- data-source.ts
- auth.controller.ts
- troop.controller.ts
- compilerOptions
- CourseDetail.tsx
- reset.mjs
- requireStudent
- loaderCopy.ts
- api.ts
- ChallengePlayPage.tsx
- scripts/daily-summary.ts
- devDependencies
- scripts
- importStudentCourses
- t6-check.ts
- toast.tsx
- user.repository.ts
- XpAward
- replyLatency.ts
- app.ts
- error.middleware.ts
- local-file-storage.ts
- devDependencies
- updatePlanet
- dependencies
- scripts
- planetStyles.ts
- OrbitSystem.tsx
- briefing.ts
- pg
- StudyChallengeAnswer
- StudyChallengePreset
- StudyMission
- StudyWorld
- AppLoader
- LlmUsage
- StudyChallengeQuestion
- StudyMessage
- StudyMissionMessage
- StudyMissionSession
- StudySession
- TroopInvite
- UserStudyMemory
- vite
- vite-env.d.ts
- taskia_frontend/tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `AppError` - 123 edges
2. `errorMessage()` - 101 edges
3. `react` - 73 edges
4. `AppLoader()` - 55 edges
5. `chat()` - 50 edges
6. `@phosphor-icons/react` - 48 edges
7. `chatMission()` - 42 edges
8. `typeorm` - 35 edges
9. `StudyChat()` - 33 edges
10. `useToast()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `create` --calls--> `viewerDates()`  [EXTRACTED]
  taskia_backend/src/modules/tasks/controllers/task.controller.ts → taskia_backend/src/infrastructure/database/civil-date.ts
- `update` --calls--> `viewerDates()`  [EXTRACTED]
  taskia_backend/src/modules/tasks/controllers/task.controller.ts → taskia_backend/src/infrastructure/database/civil-date.ts
- `register` --calls--> `AppError`  [EXTRACTED]
  taskia_backend/src/modules/auth/controllers/auth.controller.ts → taskia_backend/src/shared/errors/app-error.ts
- `LoaderLab()` --calls--> `AppLoader()`  [EXTRACTED]
  taskia_frontend/src/pages/LoaderLab.tsx → taskia_frontend/src/components/AppLoader.tsx
- `GuardianProgress()` --calls--> `Star`  [EXTRACTED]
  taskia_frontend/src/pages/GuardianPage.tsx → taskia_frontend/src/components/SpaceSky.tsx

## Import Cycles
- None detected.

## Communities (89 total, 19 thin omitted)

### Community 0 - "worldsTypes.ts"
Cohesion: 0.10
Nodes (29): ChipTone, ChallengeSetupModal(), onStart(), ORDER, Props, challengeDifficultyIcon(), courseProgressIcon(), missionStatusIcon() (+21 more)

### Community 1 - "StudyChat.tsx"
Cohesion: 0.05
Nodes (62): Fraction(), looksLikeYear(), MathText(), Power(), bubbleEnter, bubbleShown, bubbleTransition, formatElapsed() (+54 more)

### Community 2 - "App.tsx"
Cohesion: 0.14
Nodes (23): AppRouter(), challengeTransition, ExplorerApp(), viewTransition, AuthContext, AuthContextValue, useAuth(), AppearanceTools() (+15 more)

### Community 3 - "world.service.ts"
Cohesion: 0.07
Nodes (60): hideExerciseBrief(), exerciseTurnInstruction(), archiveMission(), archiveWorld(), countActiveWorldCourse(), countOwnedActiveCourse(), ensureMissionSession(), insertMission() (+52 more)

### Community 4 - "DateField"
Cohesion: 0.11
Nodes (20): framer-motion, react-dom, addMonths(), DateField(), formatDisplay(), parseISO(), Props, sameDay() (+12 more)

### Community 5 - "chat"
Cohesion: 0.13
Nodes (35): main(), decodeStudyPhoto(), StudyPhoto, uploadStudyPhoto(), ensureSession(), insertMessage(), loadContext(), loadUserMemory() (+27 more)

### Community 6 - "BoardPage.tsx"
Cohesion: 0.09
Nodes (42): CampTaskRow(), onCard(), onPointerUp(), COURSE_STRENGTH, courseAccent(), displayTitle(), Props, STATUS_CHIP (+34 more)

### Community 7 - "world.repository.ts"
Cohesion: 0.08
Nodes (56): distributeQuestionCounts(), estimateMaxQuestionsFromMaterial(), formatCorrectAnswer(), gradeMultipleChoice(), groupMissionsByCourse(), normalizeAnswerKey(), normalizeOptionsList(), shuffleArray() (+48 more)

### Community 8 - "troop.service.ts"
Cohesion: 0.10
Nodes (49): cancelPendingInvitesTo(), countActiveMembers(), countPendingInvites(), createTroopWithCaptain(), db(), findActiveExplorer(), findActiveMembership(), findCaptainId() (+41 more)

### Community 9 - "AdminStudentPage.tsx"
Cohesion: 0.11
Nodes (35): EmptyState(), EmptyStateProps, DataTable(), DataTableColumn, AdminWorldTreeCourse, AdminWorldTreeMission, AdminWorldTreeWorld, formatDay() (+27 more)

### Community 10 - "planet-config.ts"
Cohesion: 0.09
Nodes (37): ACCESSORIES, ALLOWED, asEnum(), asHex(), BODY_TYPES, BodyType, clamp(), DECORATIONS (+29 more)

### Community 11 - "errorMessage"
Cohesion: 0.08
Nodes (43): onSubmit(), onSubmit(), Button(), PasswordField(), AccountModal(), onSubmit(), AddCourseModal(), onSubmit() (+35 more)

### Community 12 - "admin.service.ts"
Cohesion: 0.14
Nodes (32): main(), view, lastStudyAt(), listActiveWorldsWithMissions(), listCourses(), recentCompletedChallenges(), recentStudentTasks(), studentCompletedChallengeStats() (+24 more)

### Community 13 - "ChallengeHistoryList.tsx"
Cohesion: 0.15
Nodes (19): buildGroups(), ChallengeHistoryList(), Group, groupArt(), Props, rowText(), Props, LineSun() (+11 more)

### Community 14 - "admin.controller.ts"
Cohesion: 0.08
Nodes (26): addCourse, archiveCourse, challenge, challenges, createGuardian, createStudent, dashboard, guardian (+18 more)

### Community 15 - "auth.middleware.ts"
Cohesion: 0.16
Nodes (20): express, Express, isUserRole(), Request, requireAdmin(), requireAuth(), requireParent(), requireStudent() (+12 more)

### Community 16 - "task.schema.ts"
Cohesion: 0.18
Nodes (21): civilDateSchema, kindSchema, parseDueOn(), parseInstant(), parseKind(), parseNeedsHelp(), parseStatus(), resolveDueDate() (+13 more)

### Community 17 - "001_baseline.ts"
Cohesion: 0.17
Nodes (19): ensureCourses(), ensureLink(), ensureMembership(), ensureUser(), ensureWeekAward(), fillDerivedPlanetFields(), GUARDIAN_BY_EXPLORER, Member (+11 more)

### Community 18 - "entities/index.ts"
Cohesion: 0.23
Nodes (3): typeorm, bigintTransformer, civilDateTransformer

### Community 19 - "guardian.repository.ts"
Cohesion: 0.06
Nodes (9): ParentChatMessage, ParentNotifyPrefs, ParentStudentLink, StudyChallenge, Troop, challengeStats(), missionCounts(), num() (+1 more)

### Community 20 - "gemini.client.ts"
Cohesion: 0.11
Nodes (24): callGemini(), callGeminiSpeak(), callGeminiTranscribe(), classifyBoardIntent(), generateGeminiText(), LlmUsageKind, minimalThinking(), NONE_INTENT (+16 more)

### Community 21 - "engine.ts"
Cohesion: 0.05
Nodes (62): PlanetLab(), Accessory(), Decor(), Face(), Marks(), PlanetRenderer(), Props, renderToStaticSvg() (+54 more)

### Community 22 - "migrate.ts"
Cohesion: 0.12
Nodes (25): APP_TABLES, applyTsFile(), args, baselineAlreadyMaterialized(), clientConfig(), __dirname, ensureMigrationsTable(), envArg (+17 more)

### Community 23 - "services/xp.ts"
Cohesion: 0.13
Nodes (21): main(), awardXp(), CHALLENGE_BASE, challengeTimeFactor(), countTasksCreatedToday(), fetchUserProgress(), insertedRowCount(), MAX_TASKS_CREATED_PER_DAY (+13 more)

### Community 24 - "world.controller.ts"
Cohesion: 0.08
Nodes (23): addCourse, chat, completeChallenge, createMission, createWorld, discardChallenge, getChallenge, importMissions (+15 more)

### Community 25 - "task.repository.ts"
Cohesion: 0.22
Nodes (12): main(), Task, findTask(), hydrate(), insertTask(), listTasks(), mapTask(), setTaskStatus() (+4 more)

### Community 26 - "sessionPlace.ts"
Cohesion: 0.15
Nodes (19): AdminPlace, coerceAdminPlace(), coerceExplorerPlace(), emptyAdminPlace, emptyExplorerPlace, EXPLORER_VIEWS, ExplorerPlace, ExplorerView (+11 more)

### Community 27 - "react"
Cohesion: 0.11
Nodes (29): @phosphor-icons/react, react, api, ExpandIconButton(), Variant, LogoutButton(), PageHeader(), Props (+21 more)

### Community 28 - "taskia_frontend/package.json"
Cohesion: 0.12
Nodes (19): @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+11 more)

### Community 29 - "scripts"
Cohesion: 0.06
Nodes (33): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, helmet, jsonwebtoken (+25 more)

### Community 30 - "reference.ts"
Cohesion: 0.15
Nodes (19): LlmUsageContext, EXERCISE_BRIEF_SYSTEM, formatExerciseBrief(), planExerciseMemory(), solveExerciseBrief(), exerciseReference(), ExerciseTurn, GRAPHIC_DECLINE (+11 more)

### Community 31 - "admin.repository.ts"
Cohesion: 0.13
Nodes (32): activeWorldCount(), applyWindow(), challengeActivity(), challengesByUser(), completedChallengeStats(), countsByDay(), countsByUser(), dashboardRoster() (+24 more)

### Community 32 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 33 - "civil-date.ts"
Cohesion: 0.19
Nodes (16): andCivilDate(), civilDateSql(), civilDayFromOffset(), civilDayKey(), isIanaTimeZone(), offsetMinutesToPg(), parseViewerTz(), todayFromOffset() (+8 more)

### Community 34 - "sv"
Cohesion: 0.05
Nodes (69): AccentContext, AccentContextValue, AccentId, AccentProvider(), ACCENTS, getInitialAccent(), App(), AuthProvider() (+61 more)

### Community 35 - "taskia_backend/package.json"
Cohesion: 0.10
Nodes (19): bcryptjs, cookie-parser, cors, helmet, jsonwebtoken, tsx, @types/bcryptjs, @types/cookie-parser (+11 more)

### Community 36 - "WorldDetail.tsx"
Cohesion: 0.17
Nodes (18): Props, WorldsMap(), Progress, progressFraction(), progressLabel(), sumProgress(), worldStats, StudyWorld (+10 more)

### Community 37 - "AppError"
Cohesion: 0.22
Nodes (15): main(), assertParentLinked(), parseGuardianChatMessage(), explorerOverview(), getNotifyPrefs(), listChat(), listExplorers(), loadExplorerTroop() (+7 more)

### Community 38 - "auth.service.ts"
Cohesion: 0.23
Nodes (15): saveAvatarUpload(), AVATAR_PRESETS, AvatarPresetId, FRAME_IDS, frameAllowedForRole(), FrameId, isAvatarPreset(), isFrameId() (+7 more)

### Community 39 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution (+9 more)

### Community 40 - "createGuardian"
Cohesion: 0.17
Nodes (18): roleIdByCode(), activateLink(), createExplorerWithGuardian(), createGuardianWithExplorer(), ensureNotifyPrefs(), findUserIdByEmail(), findUserIdByUsername(), insertUser() (+10 more)

### Community 41 - "data-source.ts"
Cohesion: 0.11
Nodes (16): reflect-metadata, main(), main(), main(), AppDataSource, initDataSource(), Course, entities (+8 more)

### Community 42 - "auth.controller.ts"
Cohesion: 0.21
Nodes (15): clearAuthCookie(), setAuthCookie(), signToken(), login, logout, me, register, updateAvatar (+7 more)

### Community 43 - "troop.controller.ts"
Cohesion: 0.12
Nodes (16): acceptInvite, createTroop, generatePlanet, getInbox, getMe, getRanking, getTroop, getUniverse (+8 more)

### Community 44 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 45 - "CourseDetail.tsx"
Cohesion: 0.21
Nodes (15): ImportMissionsModal(), onSubmit(), CourseSystem(), Props, LinePlanet(), OrbitItem, OrbitSystem(), ProgressRing() (+7 more)

### Community 46 - "reset.mjs"
Cohesion: 0.17
Nodes (14): dotenv, args, clientConfig(), __dirname, envArg, envFiles, envPath, main() (+6 more)

### Community 47 - "requireStudent"
Cohesion: 0.23
Nodes (17): activateGuardianLink(), countActiveLinksForParent(), countActiveLinksForStudent(), deactivateGuardianLink(), listStudentGuardians(), assertCanUnlink(), guardianDetail(), linkGuardian() (+9 more)

### Community 48 - "loaderCopy.ts"
Cohesion: 0.16
Nodes (14): useRotatingLine(), ADULT_PHRASES, Audience, decks, drawFrom(), EXPLORER_PHRASES, LoaderContext, LoaderLine (+6 more)

### Community 49 - "api.ts"
Cohesion: 0.05
Nodes (60): useAccent(), cleanFilters(), request(), AdminChallengeRow, AdminCourse, AdminCourseImportResult, AdminDashboard, AdminDashboardSeriesPoint (+52 more)

### Community 50 - "ChallengePlayPage.tsx"
Cohesion: 0.13
Nodes (27): mergeXpIntoUser(), XpSnapshot, xpToastCopy(), StudyPage(), applyStudyResult(), onSend(), onVoiceTurn(), ChallengePlayPage() (+19 more)

### Community 51 - "scripts/daily-summary.ts"
Cohesion: 0.18
Nodes (12): brief(), dayArg(), Explorer, explorers(), main(), onDay(), saveSummary(), summarize() (+4 more)

### Community 52 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/node, @types/react (+5 more)

### Community 53 - "scripts"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, build:pd, build:qa, db:migrate, db:setup (+3 more)

### Community 54 - "importStudentCourses"
Cohesion: 0.27
Nodes (12): findCourse(), findCourseByName(), findOtherCourseByName(), insertCourse(), listActiveCourses(), updateCourse(), parseCourseName(), addStudentCourse() (+4 more)

### Community 55 - "t6-check.ts"
Cohesion: 0.47
Nodes (9): main(), req(), civilDayFromInstant(), countInvitesSentToday(), weeklyRanks(), getRanking(), getUniverse(), searchExplorers() (+1 more)

### Community 56 - "toast.tsx"
Cohesion: 0.40
Nodes (5): ShowToastInput, ToastContext, ToastContextValue, ToastItem, ToastTone

### Community 57 - "user.repository.ts"
Cohesion: 0.10
Nodes (13): Role, TroopMember, User, findAuthById(), findAvatarRow(), findLoginByUsername(), findSessionById(), findUserIdByEmail() (+5 more)

### Community 59 - "replyLatency.ts"
Cohesion: 0.60
Nodes (4): REPLY_PAUSE_SECONDS, latencyForMissionReply(), latencyForTaskReply(), measureLatency()

### Community 60 - "app.ts"
Cohesion: 0.36
Nodes (6): createApp(), env, pgDsn, main(), errorHandler(), registerRoutes()

### Community 61 - "error.middleware.ts"
Cohesion: 0.16
Nodes (12): avatarFilePath(), asyncHandler(), sendAvatar, chat, openSession, speak, transcribe, voiceTurn (+4 more)

### Community 62 - "local-file-storage.ts"
Cohesion: 0.16
Nodes (7): projects, root, ALLOWED_MIME, avatarsDir(), defaultRoot, __dirname, filesRoot()

### Community 63 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, tsx, @types/bcryptjs, @types/cookie-parser, @types/cors, @types/express, @types/jsonwebtoken, @types/node (+2 more)

### Community 65 - "updatePlanet"
Cohesion: 0.47
Nodes (5): asHex(), clamp01(), KINDS, normalizePlanetParams(), PlanetParams

### Community 66 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, framer-motion, @phosphor-icons/react, react, react-dom (+2 more)

### Community 67 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, build:pd, build:qa, dev, dev:pd, lint, preview (+1 more)

### Community 69 - "planetStyles.ts"
Cohesion: 0.36
Nodes (7): asHex(), clamp01(), getPlanetStyle(), PLANET_STYLES, PlanetParams, PlanetStyle, resolvePlanetLook()

### Community 71 - "OrbitSystem.tsx"
Cohesion: 0.24
Nodes (10): BURST, clamp(), fit(), Mode, MODES, Plan, Props, RING_SECONDS (+2 more)

### Community 74 - "briefing.ts"
Cohesion: 0.60
Nodes (3): briefingTutorRules(), missionTutorPrompt(), projectTutorPrompt()

### Community 81 - "AppLoader"
Cohesion: 0.13
Nodes (21): AppLoader(), AppLoaderProps, BURST, LineIcon(), useAudience(), BubbleVariant, Props, StudyBubble() (+13 more)

## Knowledge Gaps
- **18 isolated node(s):** `zod`, `@types/bcryptjs`, `@types/cookie-parser`, `@types/cors`, `@types/express` (+13 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 582 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `worldsTypes.ts`, `StudyChat.tsx`, `sv`, `App.tsx`, `DateField`, `WorldDetail.tsx`, `BoardPage.tsx`, `OrbitSystem.tsx`, `AdminStudentPage.tsx`, `errorMessage`, `ChallengeHistoryList.tsx`, `CourseDetail.tsx`, `AppLoader`, `api.ts`, `ChallengePlayPage.tsx`, `engine.ts`, `toast.tsx`, `taskia_frontend/package.json`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **What connects `zod`, `@types/bcryptjs`, `@types/cookie-parser` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `worldsTypes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10084033613445378 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `task.schema.ts` to `world.service.ts`, `chat`, `world.repository.ts`, `troop.service.ts`, `planet-config.ts`, `admin.service.ts`, `auth.middleware.ts`, `gemini.client.ts`, `services/xp.ts`, `task.repository.ts`, `reference.ts`, `civil-date.ts`, `AppError`, `auth.service.ts`, `createGuardian`, `data-source.ts`, `auth.controller.ts`, `requireStudent`, `importStudentCourses`, `error.middleware.ts`, `local-file-storage.ts`, `updatePlanet`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Should `StudyChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Why does `errorMessage()` connect `errorMessage` to `worldsTypes.ts`, `StudyChat.tsx`, `App.tsx`, `DateField`, `WorldDetail.tsx`, `BoardPage.tsx`, `AdminStudentPage.tsx`, `CourseDetail.tsx`, `AppLoader`, `ChallengePlayPage.tsx`, `react`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14482758620689656 - nodes in this community are weakly interconnected._