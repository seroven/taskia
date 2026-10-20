# Graph Report - taskia_code  (2026-10-20)

## Corpus Check
- 267 files · ~120,861 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 29 file(s) not represented in the graph (top: .css 20, .mdc 4, (none) 3)

## Summary
- 2015 nodes · 5819 edges · 93 communities (75 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fc207dda`
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
- ship/types.ts
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
- TroopSpaceCard.tsx
- migrate.ts
- services/xp.ts
- world.controller.ts
- task.repository.ts
- sessionPlace.ts
- react
- taskia_frontend/package.json
- scripts
- exerciseBrief.ts
- admin.repository.ts
- compilerOptions
- civil-date.ts
- sv
- taskia_backend/package.json
- WorldDetail.tsx
- ship-config.ts
- @phosphor-icons/react
- compilerOptions
- admin.repository.ts
- data-source.ts
- main.tsx
- troop.controller.ts
- compilerOptions
- CourseDetail.tsx
- GalaxyUniverse.tsx
- requireStudent
- loaderCopy.ts
- api.ts
- ChallengePlayPage.tsx
- scripts/daily-summary.ts
- devDependencies
- scripts
- importStudentCourses
- t6-check.ts
- ShipRenderer.tsx
- user.repository.ts
- AdminCharts.tsx
- helpers.ts
- error.middleware.ts
- MiniSystem.tsx
- SpaceSky.tsx
- devDependencies
- WorldsScene.tsx
- troopsTypes.ts
- dependencies
- scripts
- dependencies
- app-error.ts
- t8-check.ts
- OrbitSystem.tsx
- ParentStudentLink
- briefing.ts
- pg
- StudyChallengeAnswer
- StudyChallengePreset
- StudyMission
- StudyWorldCourse
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
1. `AppError` - 120 edges
2. `errorMessage()` - 102 edges
3. `react` - 74 edges
4. `AppLoader()` - 55 edges
5. `chat()` - 50 edges
6. `@phosphor-icons/react` - 50 edges
7. `chatMission()` - 42 edges
8. `typeorm` - 35 edges
9. `StudyChat()` - 33 edges
10. `useToast()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `register` --calls--> `AppError`  [EXTRACTED]
  taskia_backend/src/modules/auth/controllers/auth.controller.ts → taskia_backend/src/shared/errors/app-error.ts
- `LoaderLab()` --calls--> `AppLoader()`  [EXTRACTED]
  taskia_frontend/src/pages/LoaderLab.tsx → taskia_frontend/src/components/AppLoader.tsx
- `GuardianProgress()` --calls--> `Star`  [EXTRACTED]
  taskia_frontend/src/pages/GuardianPage.tsx → taskia_frontend/src/components/SpaceSky.tsx
- `onSubmit()` --calls--> `errorMessage()`  [EXTRACTED]
  taskia_frontend/src/components/TaskDetailModal.tsx → taskia_frontend/src/lib/errors.ts
- `onStart()` --calls--> `errorMessage()`  [EXTRACTED]
  taskia_frontend/src/components/worlds/ChallengeSetupModal.tsx → taskia_frontend/src/lib/errors.ts

## Import Cycles
- None detected.

## Communities (93 total, 18 thin omitted)

### Community 0 - "worldsTypes.ts"
Cohesion: 0.11
Nodes (27): ChipTone, ORDER, Props, challengeDifficultyIcon(), courseProgressIcon(), missionStatusIcon(), PhosphorIcon, PhosphorIconProps (+19 more)

### Community 1 - "StudyChat.tsx"
Cohesion: 0.05
Nodes (62): Fraction(), looksLikeYear(), MathText(), Power(), bubbleEnter, bubbleShown, bubbleTransition, formatElapsed() (+54 more)

### Community 2 - "App.tsx"
Cohesion: 0.11
Nodes (32): AppRouter(), challengeTransition, ExplorerApp(), viewTransition, useAuth(), AppearanceTools(), close(), onKey() (+24 more)

### Community 3 - "world.service.ts"
Cohesion: 0.07
Nodes (61): hideExerciseBrief(), exerciseReference(), ExerciseTurn, exerciseTurnInstruction(), GRAPHIC_DECLINE, loadReferencePhoto(), needsGraphic(), parseGraphicFlag() (+53 more)

### Community 4 - "DateField"
Cohesion: 0.17
Nodes (13): addMonths(), DateField(), formatDisplay(), parseISO(), Props, sameDay(), startOfMonth(), toISO() (+5 more)

### Community 5 - "chat"
Cohesion: 0.14
Nodes (33): main(), ensureSession(), insertMessage(), loadContext(), loadUserMemory(), saveExerciseBrief(), saveSessionMeta(), saveUserMemory() (+25 more)

### Community 6 - "BoardPage.tsx"
Cohesion: 0.09
Nodes (36): api, AuthContext, AuthContextValue, CampTaskRow(), onCard(), onPointerUp(), COURSE_STRENGTH, courseAccent() (+28 more)

### Community 7 - "world.repository.ts"
Cohesion: 0.08
Nodes (58): distributeQuestionCounts(), estimateMaxQuestionsFromMaterial(), formatCorrectAnswer(), gradeMultipleChoice(), groupMissionsByCourse(), normalizeAnswerKey(), normalizeOptionsList(), shuffleArray() (+50 more)

### Community 8 - "troop.service.ts"
Cohesion: 0.10
Nodes (47): resolveTroopShip(), cancelPendingInvitesTo(), countActiveMembers(), countPendingInvites(), createTroopWithCaptain(), db(), findActiveExplorer(), findActiveMembership() (+39 more)

### Community 9 - "AdminStudentPage.tsx"
Cohesion: 0.13
Nodes (32): EmptyState(), DataTable(), DataTableColumn, formatWhen(), phaseLabel(), ExplorersTable(), GuardiansTable(), AdminChallengeReview() (+24 more)

### Community 10 - "ship/types.ts"
Cohesion: 0.07
Nodes (39): Chips(), COLOR_FIELDS, Props, ShipEditorForm(), ShipEditorModal(), SlotKey, SLOTS, BELLIES (+31 more)

### Community 11 - "errorMessage"
Cohesion: 0.10
Nodes (32): onSubmit(), onSubmit(), onSubmit(), onSubmit(), onSubmit(), CreateWorldModal(), onSubmit(), errorMessage() (+24 more)

### Community 12 - "admin.service.ts"
Cohesion: 0.13
Nodes (31): countActiveLinksForParent(), countActiveLinksForStudent(), listActiveWorldsWithMissions(), listCompletedChallengesForStudent(), listCourses(), listStudentStudy(), listStudentTasks(), recentCompletedChallenges() (+23 more)

### Community 13 - "ChallengeHistoryList.tsx"
Cohesion: 0.18
Nodes (15): buildGroups(), ChallengeHistoryList(), Group, groupArt(), Props, rowText(), LineSun(), Props (+7 more)

### Community 14 - "admin.controller.ts"
Cohesion: 0.08
Nodes (26): addCourse, archiveCourse, challenge, challenges, createGuardian, createStudent, dashboard, guardian (+18 more)

### Community 15 - "auth.middleware.ts"
Cohesion: 0.05
Nodes (66): express, main(), saveAvatarUpload(), assertParentLinked(), clearAuthCookie(), Express, isUserRole(), Request (+58 more)

### Community 16 - "task.schema.ts"
Cohesion: 0.18
Nodes (23): civilDateSchema, kindSchema, parseDueOn(), parseInstant(), parseKind(), parseNeedsHelp(), parseStatus(), resolveDueDate() (+15 more)

### Community 17 - "001_baseline.ts"
Cohesion: 0.18
Nodes (18): bcryptjs, ensureCourses(), ensureLink(), ensureMembership(), ensureUser(), ensureWeekAward(), fillDerivedPlanetFields(), GUARDIAN_BY_EXPLORER (+10 more)

### Community 18 - "entities/index.ts"
Cohesion: 0.23
Nodes (3): typeorm, bigintTransformer, civilDateTransformer

### Community 19 - "guardian.repository.ts"
Cohesion: 0.05
Nodes (10): ParentChatMessage, ParentNotifyPrefs, StudyChallenge, StudyWorld, Troop, XpAward, challengeStats(), missionCounts() (+2 more)

### Community 20 - "gemini.client.ts"
Cohesion: 0.17
Nodes (18): callGemini(), callGeminiSpeak(), callGeminiTranscribe(), classifyBoardIntent(), generateGeminiText(), LlmUsageKind, minimalThinking(), NONE_INTENT (+10 more)

### Community 21 - "TroopSpaceCard.tsx"
Cohesion: 0.30
Nodes (9): ShipRenderer, ExplorerAvatar(), LevelStar(), TroopSpaceCard(), AVATAR_PRESETS, avatarUploadUrl(), FRAME_OPTIONS, presetGlyph() (+1 more)

### Community 22 - "migrate.ts"
Cohesion: 0.05
Nodes (48): dotenv, projects, root, APP_TABLES, applyTsFile(), args, baselineAlreadyMaterialized(), clientConfig() (+40 more)

### Community 23 - "services/xp.ts"
Cohesion: 0.13
Nodes (23): main(), completeTask(), awardXp(), CHALLENGE_BASE, challengeTimeFactor(), countTasksCreatedToday(), fetchUserProgress(), insertedRowCount() (+15 more)

### Community 24 - "world.controller.ts"
Cohesion: 0.08
Nodes (23): addCourse, chat, completeChallenge, createMission, createWorld, discardChallenge, getChallenge, importMissions (+15 more)

### Community 25 - "task.repository.ts"
Cohesion: 0.15
Nodes (13): main(), Course, Task, findTask(), hydrate(), insertTask(), listTasks(), mapTask() (+5 more)

### Community 26 - "sessionPlace.ts"
Cohesion: 0.15
Nodes (19): AdminPlace, coerceAdminPlace(), coerceExplorerPlace(), emptyAdminPlace, emptyExplorerPlace, EXPLORER_VIEWS, ExplorerPlace, ExplorerView (+11 more)

### Community 27 - "react"
Cohesion: 0.10
Nodes (34): framer-motion, react, TaskEditPanel(), TaskEditPayload, TaskFormModal(), Button(), Field(), PasswordField() (+26 more)

### Community 28 - "taskia_frontend/package.json"
Cohesion: 0.11
Nodes (20): @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+12 more)

### Community 29 - "scripts"
Cohesion: 0.10
Nodes (21): scripts, build, build:pd, build:qa, db:migrate, db:migrate:pd, db:migrate:qa, db:reset (+13 more)

### Community 30 - "exerciseBrief.ts"
Cohesion: 0.25
Nodes (8): LlmUsageContext, EXERCISE_BRIEF_SYSTEM, formatExerciseBrief(), planExerciseMemory(), solveExerciseBrief(), chatVisibleSpeak(), stripDrewPhrase(), stripMathDelimiters()

### Community 31 - "admin.repository.ts"
Cohesion: 0.19
Nodes (19): civilDayKey(), activeWorldCount(), applyWindow(), challengeActivity(), challengesByUser(), completedChallengeStats(), countsByDay(), countsByUser() (+11 more)

### Community 32 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 33 - "civil-date.ts"
Cohesion: 0.17
Nodes (18): andCivilDate(), civilDateSql(), civilDayFromOffset(), isIanaTimeZone(), offsetMinutesToPg(), parseViewerTz(), todayFromOffset(), viewerDates() (+10 more)

### Community 34 - "sv"
Cohesion: 0.20
Nodes (19): CampEmptyDay(), CampEmptyProjects(), CampScene(), CrewScene(), LIGHTS, Draw(), DrawProps, Spark() (+11 more)

### Community 35 - "taskia_backend/package.json"
Cohesion: 0.11
Nodes (18): cookie-parser, cors, helmet, jsonwebtoken, tsx, @types/bcryptjs, @types/cookie-parser, @types/cors (+10 more)

### Community 36 - "WorldDetail.tsx"
Cohesion: 0.25
Nodes (12): Props, WorldsMap(), Progress, progressFraction(), progressLabel(), sumProgress(), worldStats, StudyWorld (+4 more)

### Community 37 - "ship-config.ts"
Cohesion: 0.11
Nodes (31): up(), asEnum(), asHex(), BELLIES, COCKPITS, DECALS, ENGINES, fillMinimum() (+23 more)

### Community 38 - "@phosphor-icons/react"
Cohesion: 0.17
Nodes (22): @phosphor-icons/react, ExpandIconButton(), Variant, StudyModeToggle(), Chip(), ChipButton(), chipClass(), mergeXpIntoUser() (+14 more)

### Community 39 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution (+9 more)

### Community 40 - "admin.repository.ts"
Cohesion: 0.15
Nodes (23): roleIdByCode(), activateLink(), createExplorerWithGuardian(), createGuardianWithExplorer(), dashboardRoster(), DateWindow, ensureNotifyPrefs(), explorers() (+15 more)

### Community 41 - "data-source.ts"
Cohesion: 0.12
Nodes (14): reflect-metadata, main(), main(), main(), AppDataSource, initDataSource(), entities, User (+6 more)

### Community 42 - "main.tsx"
Cohesion: 0.13
Nodes (21): AccentContext, AccentContextValue, AccentId, AccentProvider(), ACCENTS, getInitialAccent(), useAccent(), App() (+13 more)

### Community 43 - "troop.controller.ts"
Cohesion: 0.12
Nodes (16): acceptInvite, createTroop, generateShip, getInbox, getMe, getRanking, getTroop, getUniverse (+8 more)

### Community 44 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 45 - "CourseDetail.tsx"
Cohesion: 0.14
Nodes (23): ChallengeSetupModal(), onStart(), ImportMissionsModal(), onSubmit(), CourseSystem(), Props, LinePlanet(), OrbitItem (+15 more)

### Community 46 - "GalaxyUniverse.tsx"
Cohesion: 0.13
Nodes (21): Cam, clamp(), ease(), GalaxyUniverse(), Props, RANK_COLOR, starField(), cache (+13 more)

### Community 47 - "requireStudent"
Cohesion: 0.20
Nodes (21): activateGuardianLink(), deactivateGuardianLink(), listGuardianExplorers(), listStudentGuardians(), parseAccount(), parseIds(), parseNewAccount(), parseStudentId() (+13 more)

### Community 48 - "loaderCopy.ts"
Cohesion: 0.16
Nodes (14): useRotatingLine(), ADULT_PHRASES, Audience, decks, drawFrom(), EXPLORER_PHRASES, LoaderContext, LoaderLine (+6 more)

### Community 49 - "api.ts"
Cohesion: 0.09
Nodes (34): cleanFilters(), request(), AdminChallengeRow, AdminCourse, AdminCourseImportResult, AdminDashboard, AdminDashboardSeriesPoint, AdminGuardian (+26 more)

### Community 50 - "ChallengePlayPage.tsx"
Cohesion: 0.15
Nodes (20): EmptyStateProps, WorldsHero(), Props, SIZE_PX, WorldsIconBadge(), ChallengePlayPage(), applySaved(), captureCurrent() (+12 more)

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

### Community 56 - "ShipRenderer.tsx"
Cohesion: 0.20
Nodes (22): Belly(), Cockpit(), Ctx, Decals(), engineOffsets(), Engines(), Flame(), Nose() (+14 more)

### Community 57 - "user.repository.ts"
Cohesion: 0.13
Nodes (12): Role, TroopMember, findAuthById(), findAvatarRow(), findLoginByUsername(), findSessionById(), findUserIdByEmail(), findUserIdByUsername() (+4 more)

### Community 58 - "AdminCharts.tsx"
Cohesion: 0.22
Nodes (17): AdminRosterRow, civilDayAsDate(), civilDayISO(), daysSince(), formatDay(), formatDayCompact(), formatDayShort(), parseInstant() (+9 more)

### Community 59 - "helpers.ts"
Cohesion: 0.19
Nodes (10): TASK_EFFORT_SYSTEM, scoreTaskEffort(), clampEffortScore(), extractJson(), REPLY_PAUSE_SECONDS, requiredChatTurns(), trackedErrorCount(), latencyForMissionReply() (+2 more)

### Community 60 - "error.middleware.ts"
Cohesion: 0.15
Nodes (13): createApp(), env, pgDsn, main(), asyncHandler(), errorHandler(), listCourses, chat (+5 more)

### Community 61 - "MiniSystem.tsx"
Cohesion: 0.22
Nodes (13): Props, halves(), MiniSystem(), planRings(), Props, Ring, halves(), PlanetBody() (+5 more)

### Community 62 - "SpaceSky.tsx"
Cohesion: 0.17
Nodes (14): FAR, KEY_GROUPS, MID, mulberry32(), NEAR, randomShot(), scatter(), ShootingStar() (+6 more)

### Community 63 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, tsx, @types/bcryptjs, @types/cookie-parser, @types/cors, @types/express, @types/jsonwebtoken, @types/node (+2 more)

### Community 64 - "WorldsScene.tsx"
Cohesion: 0.24
Nodes (9): HubDestinations(), HubDoor, innerRing, Moon(), ORBIT, OrbitingMoon(), RING, WorldsScene() (+1 more)

### Community 65 - "troopsTypes.ts"
Cohesion: 0.18
Nodes (12): ShipConfig, TroopDetail, TroopInboxResponse, TroopInvite, TroopMember, TroopMeResponse, TroopRankingResponse, TroopRankingRow (+4 more)

### Community 66 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, framer-motion, @phosphor-icons/react, react, react-dom (+2 more)

### Community 67 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, build:pd, build:qa, dev, dev:pd, lint, preview (+1 more)

### Community 68 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, helmet, jsonwebtoken (+4 more)

### Community 69 - "app-error.ts"
Cohesion: 0.22
Nodes (6): decodeStudyPhoto(), StudyPhoto, uploadStudyPhoto(), parseChallengeAnswers(), parseChallengeStart(), parseMissionIds()

### Community 70 - "t8-check.ts"
Cohesion: 0.36
Nodes (7): main(), view, worldsTreeSources(), inDateRange(), listAllGuardians(), listAllStudents(), studentWorldsTree()

### Community 71 - "OrbitSystem.tsx"
Cohesion: 0.24
Nodes (10): BURST, clamp(), fit(), Mode, MODES, Plan, Props, RING_SECONDS (+2 more)

### Community 74 - "briefing.ts"
Cohesion: 0.60
Nodes (3): briefingTutorRules(), missionTutorPrompt(), projectTutorPrompt()

### Community 75 - "pg"
Cohesion: 0.22
Nodes (3): pg, runScript(), splitPgStatements()

### Community 81 - "AppLoader"
Cohesion: 0.14
Nodes (19): AppLoader(), AppLoaderProps, BURST, LineIcon(), useAudience(), BubbleVariant, Props, StudyBubble() (+11 more)

## Knowledge Gaps
- **18 isolated node(s):** `zod`, `@types/bcryptjs`, `@types/cookie-parser`, `@types/cors`, `@types/express` (+13 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 581 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `worldsTypes.ts`, `StudyChat.tsx`, `App.tsx`, `DateField`, `BoardPage.tsx`, `AdminStudentPage.tsx`, `ship/types.ts`, `errorMessage`, `ChallengeHistoryList.tsx`, `taskia_frontend/package.json`, `sv`, `WorldDetail.tsx`, `@phosphor-icons/react`, `main.tsx`, `CourseDetail.tsx`, `GalaxyUniverse.tsx`, `ChallengePlayPage.tsx`, `ShipRenderer.tsx`, `AdminCharts.tsx`, `MiniSystem.tsx`, `SpaceSky.tsx`, `WorldsScene.tsx`, `OrbitSystem.tsx`, `AppLoader`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **What connects `zod`, `@types/bcryptjs`, `@types/cookie-parser` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `worldsTypes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10795454545454546 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `task.schema.ts` to `world.service.ts`, `chat`, `world.repository.ts`, `troop.service.ts`, `admin.service.ts`, `auth.middleware.ts`, `gemini.client.ts`, `migrate.ts`, `services/xp.ts`, `task.repository.ts`, `civil-date.ts`, `ship-config.ts`, `admin.repository.ts`, `data-source.ts`, `requireStudent`, `importStudentCourses`, `helpers.ts`, `error.middleware.ts`, `app-error.ts`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `StudyChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11414141414141414 - nodes in this community are weakly interconnected._
- **Should `world.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07117255504352278 - nodes in this community are weakly interconnected._