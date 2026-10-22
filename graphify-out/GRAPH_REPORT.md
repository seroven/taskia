# Graph Report - taskia_code  (2026-10-22)

## Corpus Check
- 289 files · ~155,419 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 30 file(s) not represented in the graph (top: .css 21, .mdc 4, (none) 3)

## Summary
- 2205 nodes · 6363 edges · 105 communities (86 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e5f52bab`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- worldsTypes.ts
- StudyChat
- useAuth
- world.service.ts
- avatar/types.ts
- study.service.ts
- BoardPage.tsx
- world.repository.ts
- troop.service.ts
- AdminStudentPage.tsx
- ship/types.ts
- errorMessage
- admin.service.ts
- ShipEditorModal.tsx
- admin.controller.ts
- auth.middleware.ts
- AppError
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
- reset.mjs
- admin.repository.ts
- compilerOptions
- civil-date.ts
- sv
- taskia_backend/package.json
- AvatarRenderer.tsx
- ship-config.ts
- @phosphor-icons/react
- compilerOptions
- admin.repository.ts
- data-source.ts
- main.tsx
- troop.controller.ts
- compilerOptions
- auraGl.ts
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
- AppearanceTools
- auth.controller.ts
- error.middleware.ts
- AppLoader
- SpaceSky.tsx
- devDependencies
- avatar-config.ts
- troopsTypes.ts
- dependencies
- scripts
- dependencies
- StudyChat.tsx
- t8-check.ts
- DateField
- GuardianPage.tsx
- auth.service.ts
- briefing.ts
- pg
- StudyChallengeAnswer
- StudyChallengePreset
- GalaxyUniverse.tsx
- User
- studyProtocol.ts
- TroopRankingPanel.tsx
- LlmUsage
- VoiceRecorder
- UserAvatar.tsx
- lib/auras.ts
- StudyChallengeQuestion
- StudyMessage
- StudyMissionMessage
- StudyMissionSession
- StudySession
- generateShip
- TroopInvite
- UserStudyMemory
- vite
- vite-env.d.ts
- taskia_frontend/tsconfig.json
- MathText
- ChallengeReviewAnswersList.tsx
- extractJson
- ParentChatMessage
- XpAward
- AuraGl

## God Nodes (most connected - your core abstractions)
1. `AppError` - 119 edges
2. `errorMessage()` - 101 edges
3. `react` - 89 edges
4. `AppLoader()` - 57 edges
5. `@phosphor-icons/react` - 53 edges
6. `chat()` - 50 edges
7. `chatMission()` - 42 edges
8. `typeorm` - 35 edges
9. `useToast()` - 35 edges
10. `useAuth()` - 33 edges

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

## Communities (105 total, 19 thin omitted)

### Community 0 - "worldsTypes.ts"
Cohesion: 0.06
Nodes (63): buildGroups(), ChallengeHistoryList(), Group, groupArt(), Props, rowText(), CourseSystem(), Props (+55 more)

### Community 1 - "StudyChat"
Cohesion: 0.24
Nodes (17): imageFileFromClipboard(), StudyChat(), beginListening(), cacheAudioUrl(), clearVoiceTick(), closeVoiceStage(), finishCircleTurn(), hearPreparedAudio() (+9 more)

### Community 2 - "useAuth"
Cohesion: 0.12
Nodes (26): AppRouter(), AuthContext, AuthContextValue, useAuth(), ProfileModal(), UserAvatar, ExpandIconButton(), Variant (+18 more)

### Community 3 - "world.service.ts"
Cohesion: 0.08
Nodes (56): archiveMission(), archiveWorld(), ChallengeQuestionDetail, ChallengeView, countActiveWorldCourse(), countOwnedActiveCourse(), ensureMissionSession(), findActiveMission() (+48 more)

### Community 4 - "avatar/types.ts"
Cohesion: 0.11
Nodes (25): ACCESSORIES, Accessory, AVATAR_OPTIONS, AvatarPalette, Base, BASES, Eyes, FRAMES (+17 more)

### Community 5 - "study.service.ts"
Cohesion: 0.10
Nodes (50): main(), decodeStudyPhoto(), uploadStudyPhoto(), hideExerciseBrief(), planExerciseMemory(), exerciseReference(), exerciseTurnInstruction(), loadReferencePhoto() (+42 more)

### Community 6 - "BoardPage.tsx"
Cohesion: 0.09
Nodes (37): CampTaskRow(), onCard(), onPointerUp(), COURSE_STRENGTH, courseAccent(), displayTitle(), Props, STATUS_CHIP (+29 more)

### Community 7 - "world.repository.ts"
Cohesion: 0.10
Nodes (41): distributeQuestionCounts(), estimateMaxQuestionsFromMaterial(), formatCorrectAnswer(), gradeMultipleChoice(), groupMissionsByCourse(), normalizeAnswerKey(), normalizeOptionsList(), shuffleArray() (+33 more)

### Community 8 - "troop.service.ts"
Cohesion: 0.10
Nodes (48): cancelPendingInvitesTo(), countActiveMembers(), countPendingInvites(), createTroopWithCaptain(), db(), findActiveExplorer(), findActiveMembership(), findCaptainId() (+40 more)

### Community 9 - "AdminStudentPage.tsx"
Cohesion: 0.10
Nodes (39): @phosphor-icons/react, EmptyState(), EmptyStateProps, DataTable(), DataTableColumn, WorldsHero(), Props, SIZE_PX (+31 more)

### Community 10 - "ship/types.ts"
Cohesion: 0.07
Nodes (26): BELLIES, Belly, Cockpit, COCKPITS, Decal, DECALS, Engine, ENGINES (+18 more)

### Community 11 - "errorMessage"
Cohesion: 0.09
Nodes (35): onSubmit(), PageHeader(), onSubmit(), ShipEditorModal(), ChallengeSetupModal(), onStart(), CreateMissionModal(), onSubmit() (+27 more)

### Community 12 - "admin.service.ts"
Cohesion: 0.12
Nodes (33): countActiveLinksForParent(), countActiveLinksForStudent(), listActiveWorldsWithMissions(), listCompletedChallengesForStudent(), listCourses(), listStudentStudy(), listStudentTasks(), recentCompletedChallenges() (+25 more)

### Community 13 - "ShipEditorModal.tsx"
Cohesion: 0.11
Nodes (26): ShipRenderer, AuraTile(), COLOR_FIELDS, optionLabel(), OptionTile(), PROMPT_IDEAS, Props, ShipEditorForm() (+18 more)

### Community 14 - "admin.controller.ts"
Cohesion: 0.08
Nodes (26): addCourse, archiveCourse, challenge, challenges, createGuardian, createStudent, dashboard, guardian (+18 more)

### Community 15 - "auth.middleware.ts"
Cohesion: 0.18
Nodes (18): express, Express, isUserRole(), requireAdmin(), requireAuth(), requireParent(), requireStudent(), VALID_ROLES (+10 more)

### Community 16 - "AppError"
Cohesion: 0.10
Nodes (28): StudyPhoto, assertParentLinked(), asRecord(), loginSchema, parseLoginBody(), parseProfileBody(), profileSchema, parseGuardianChatMessage() (+20 more)

### Community 17 - "001_baseline.ts"
Cohesion: 0.17
Nodes (19): ensureCourses(), ensureLink(), ensureMembership(), ensureUser(), ensureWeekAward(), fillDerivedPlanetFields(), GUARDIAN_BY_EXPLORER, Member (+11 more)

### Community 18 - "entities/index.ts"
Cohesion: 0.23
Nodes (3): typeorm, bigintTransformer, civilDateTransformer

### Community 19 - "guardian.repository.ts"
Cohesion: 0.06
Nodes (9): ParentNotifyPrefs, ParentStudentLink, StudyChallenge, StudyMission, Troop, challengeStats(), missionCounts(), num() (+1 more)

### Community 20 - "gemini.client.ts"
Cohesion: 0.10
Nodes (30): callGemini(), callGeminiSpeak(), callGeminiTranscribe(), classifyBoardIntent(), generateGeminiText(), LlmUsageContext, LlmUsageKind, minimalThinking() (+22 more)

### Community 21 - "TroopSpaceCard.tsx"
Cohesion: 0.21
Nodes (14): AuraBackdrop(), isDark(), LevelBadge(), Size, nextUnlock(), TroopSpaceCard(), xp(), HULLS (+6 more)

### Community 22 - "migrate.ts"
Cohesion: 0.12
Nodes (25): APP_TABLES, applyTsFile(), args, baselineAlreadyMaterialized(), clientConfig(), __dirname, ensureMigrationsTable(), envArg (+17 more)

### Community 23 - "services/xp.ts"
Cohesion: 0.09
Nodes (41): main(), civilDateSchema, kindSchema, parseDueOn(), parseInstant(), parseKind(), parseNeedsHelp(), parseStatus() (+33 more)

### Community 24 - "world.controller.ts"
Cohesion: 0.08
Nodes (23): addCourse, chat, completeChallenge, createMission, createWorld, discardChallenge, getChallenge, importMissions (+15 more)

### Community 25 - "task.repository.ts"
Cohesion: 0.17
Nodes (11): main(), Course, Task, findTask(), hydrate(), insertTask(), listTasks(), setTaskStatus() (+3 more)

### Community 26 - "sessionPlace.ts"
Cohesion: 0.16
Nodes (18): ExplorerApp(), AdminPlace, coerceAdminPlace(), coerceExplorerPlace(), emptyAdminPlace, emptyExplorerPlace, EXPLORER_VIEWS, ExplorerPlace (+10 more)

### Community 27 - "react"
Cohesion: 0.08
Nodes (44): framer-motion, react, AccountForm(), COLOR_FIELDS, optionLabel(), Part, ProfileForm(), SECTIONS (+36 more)

### Community 28 - "taskia_frontend/package.json"
Cohesion: 0.12
Nodes (19): @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+11 more)

### Community 29 - "scripts"
Cohesion: 0.10
Nodes (21): scripts, build, build:pd, build:qa, db:migrate, db:migrate:pd, db:migrate:qa, db:reset (+13 more)

### Community 30 - "reset.mjs"
Cohesion: 0.11
Nodes (16): dotenv, projects, root, args, clientConfig(), __dirname, envArg, envFiles (+8 more)

### Community 31 - "admin.repository.ts"
Cohesion: 0.17
Nodes (20): civilDayKey(), activeWorldCount(), applyWindow(), challengeActivity(), challengesByUser(), completedChallengeStats(), countsByDay(), countsByUser() (+12 more)

### Community 32 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 33 - "civil-date.ts"
Cohesion: 0.23
Nodes (14): andCivilDate(), civilDateSql(), civilDayFromOffset(), isIanaTimeZone(), offsetMinutesToPg(), parseViewerTz(), todayFromOffset(), viewerDates() (+6 more)

### Community 34 - "sv"
Cohesion: 0.13
Nodes (27): CampEmptyDay(), CampEmptyProjects(), CampScene(), Draw(), DrawProps, Spark(), SparkProps, Heavenly() (+19 more)

### Community 35 - "taskia_backend/package.json"
Cohesion: 0.10
Nodes (22): bcryptjs, cookie-parser, cors, helmet, jsonwebtoken, tsx, @types/bcryptjs, @types/cookie-parser (+14 more)

### Community 36 - "AvatarRenderer.tsx"
Cohesion: 0.23
Nodes (20): Accessory(), AvatarArt(), AvatarRendererBase(), BaseBack(), Extras(), Eyes(), FACE, faceY() (+12 more)

### Community 37 - "ship-config.ts"
Cohesion: 0.09
Nodes (38): up(), asEnum(), asHex(), available(), BELLIES, COCKPITS, DECALS, ENGINES (+30 more)

### Community 38 - "@phosphor-icons/react"
Cohesion: 0.13
Nodes (24): StudyModeToggle(), Chip(), ChipButton(), chipClass(), ChipTone, courseProgressIcon(), missionStatusIcon(), WorldsStatusPill() (+16 more)

### Community 39 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution (+9 more)

### Community 40 - "admin.repository.ts"
Cohesion: 0.16
Nodes (21): roleIdByCode(), activateLink(), createExplorerWithGuardian(), createGuardianWithExplorer(), dashboardRoster(), DateWindow, ensureNotifyPrefs(), explorers() (+13 more)

### Community 41 - "data-source.ts"
Cohesion: 0.13
Nodes (17): reflect-metadata, main(), main(), main(), env, pgDsn, main(), AppDataSource (+9 more)

### Community 42 - "main.tsx"
Cohesion: 0.15
Nodes (18): AccentContext, AccentContextValue, AccentId, AccentProvider(), getInitialAccent(), App(), challengeTransition, viewTransition (+10 more)

### Community 43 - "troop.controller.ts"
Cohesion: 0.12
Nodes (16): acceptInvite, createTroop, generateShip, getInbox, getMe, getRanking, getTroop, getUniverse (+8 more)

### Community 44 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 45 - "auraGl.ts"
Cohesion: 0.20
Nodes (9): AuraShowcase(), compile(), createAuraGl(), GlItem, Rgb, AuraLayer, createAuraLayer(), draw() (+1 more)

### Community 46 - "GalaxyUniverse.tsx"
Cohesion: 0.18
Nodes (14): cache, CY, hullGeo, HullSpec, SPECS, VB_H, VB_W, Hull (+6 more)

### Community 47 - "requireStudent"
Cohesion: 0.20
Nodes (22): activateGuardianLink(), deactivateGuardianLink(), listGuardianExplorers(), listStudentGuardians(), parseAccount(), parseIds(), parseNewAccount(), assertUsernameEmailFree() (+14 more)

### Community 48 - "loaderCopy.ts"
Cohesion: 0.15
Nodes (18): AppLoaderProps, BURST, LineIcon(), useAudience(), useRotatingLine(), ADULT_PHRASES, Audience, decks (+10 more)

### Community 49 - "api.ts"
Cohesion: 0.08
Nodes (45): cleanFilters(), request(), AdminChallengeRow, AdminCourse, AdminCourseImportResult, AdminDashboard, AdminDashboardSeriesPoint, AdminGuardian (+37 more)

### Community 50 - "ChallengePlayPage.tsx"
Cohesion: 0.26
Nodes (14): ChallengePlayPage(), applySaved(), captureCurrent(), freezeClock(), goTo(), leaveChallenge(), onSubmit(), onVis() (+6 more)

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
Cohesion: 0.32
Nodes (12): main(), req(), civilDayFromInstant(), resolveTroopShip(), countInvitesSentToday(), searchExplorers(), weeklyRanks(), parseExplorerSearch() (+4 more)

### Community 56 - "ShipRenderer.tsx"
Cohesion: 0.15
Nodes (29): Anim, Belly(), Cockpit(), Ctx, Decals(), engineOffsets(), Engines(), Flame() (+21 more)

### Community 57 - "user.repository.ts"
Cohesion: 0.13
Nodes (12): Role, TroopMember, findAuthById(), findAvatarRow(), findLoginByUsername(), findSessionById(), findUserIdByEmail(), findUserIdByUsername() (+4 more)

### Community 58 - "AppearanceTools"
Cohesion: 0.24
Nodes (12): ACCENTS, useAccent(), AppearanceTools(), close(), onKey(), onPointer(), reduceMotion(), CrewScene() (+4 more)

### Community 59 - "auth.controller.ts"
Cohesion: 0.25
Nodes (10): clearAuthCookie(), setAuthCookie(), signToken(), login, logout, me, register, updateAvatar (+2 more)

### Community 60 - "error.middleware.ts"
Cohesion: 0.18
Nodes (10): asyncHandler(), chat, openSession, speak, transcribe, voiceTurn, complete, create (+2 more)

### Community 61 - "AppLoader"
Cohesion: 0.10
Nodes (30): api, AppLoader(), ORDER, Props, Props, challengeDifficultyIcon(), PhosphorIcon, PhosphorIconProps (+22 more)

### Community 62 - "SpaceSky.tsx"
Cohesion: 0.20
Nodes (11): FAR, KEY_GROUPS, MID, mulberry32(), NEAR, randomShot(), scatter(), ShootingStar() (+3 more)

### Community 63 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, tsx, @types/bcryptjs, @types/cookie-parser, @types/cors, @types/express, @types/jsonwebtoken, @types/node (+2 more)

### Community 64 - "avatar-config.ts"
Cohesion: 0.12
Nodes (25): ACCENT_COLORS, ACCESSORIES, asEnum(), asHex(), avatarConfigSchema, BASES, BG_COLORS, EYES (+17 more)

### Community 65 - "troopsTypes.ts"
Cohesion: 0.13
Nodes (20): AvatarConfig, GL_KINDS, GlKind, ShipConfig, TroopDetail, TroopInboxResponse, TroopInvite, TroopMember (+12 more)

### Community 66 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, framer-motion, @phosphor-icons/react, react, react-dom (+2 more)

### Community 67 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, build:pd, build:qa, dev, dev:pd, lint, preview (+1 more)

### Community 68 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, helmet, jsonwebtoken (+4 more)

### Community 69 - "StudyChat.tsx"
Cohesion: 0.15
Nodes (15): bubbleEnter, bubbleShown, bubbleTransition, formatElapsed(), messageKey(), TypewriterText(), useVoiceDock(), voiceBubbleEnter (+7 more)

### Community 70 - "t8-check.ts"
Cohesion: 0.36
Nodes (7): main(), view, worldsTreeSources(), inDateRange(), listAllGuardians(), listAllStudents(), studentWorldsTree()

### Community 71 - "DateField"
Cohesion: 0.12
Nodes (16): react-dom, addMonths(), DateField(), formatDisplay(), parseISO(), Props, sameDay(), startOfMonth() (+8 more)

### Community 72 - "GuardianPage.tsx"
Cohesion: 0.15
Nodes (20): DayPeriod, LaunchPhase, useSpace(), BubbleVariant, Props, StudyBubble(), BeaconState, TaskiaBeacon() (+12 more)

### Community 73 - "auth.service.ts"
Cohesion: 0.25
Nodes (13): Request, AvatarConfig, frameUnlocked(), isFrameId(), resolveUserAvatar(), avatarFields(), currentUser(), login() (+5 more)

### Community 74 - "briefing.ts"
Cohesion: 0.60
Nodes (3): briefingTutorRules(), missionTutorPrompt(), projectTutorPrompt()

### Community 78 - "GalaxyUniverse.tsx"
Cohesion: 0.22
Nodes (14): Cam, clamp(), GalaxyUniverse(), Props, pull(), rhythm(), SKY_LAYERS, Spring (+6 more)

### Community 79 - "User"
Cohesion: 0.12
Nodes (7): main(), StudyWorldCourse, StudyWorld, User, listChallengePresets(), listPresets(), listWorlds()

### Community 80 - "studyProtocol.ts"
Cohesion: 0.17
Nodes (13): Props, currentStep(), STEPS, StudyPhaseSteps(), GeminiTutorReply, StudyChatResponse, StudyContext, StudyExercise (+5 more)

### Community 81 - "TroopRankingPanel.tsx"
Cohesion: 0.20
Nodes (13): daysToReset(), members(), PODIUM_ORDER, Props, resetText(), TroopRankingPanel(), MAX_CREW, TroopRankingRow (+5 more)

### Community 83 - "VoiceRecorder"
Cohesion: 0.29
Nodes (5): blobToBase64(), pickRecorderMimeType(), VoiceRecorder, VoiceRecorderStatus, VoiceRecordingResult

### Community 84 - "UserAvatar.tsx"
Cohesion: 0.31
Nodes (9): AvatarAnim, AvatarRenderer, FrameArt(), onCircle(), Props, ring(), starPath(), UserAvatarBase() (+1 more)

### Community 85 - "lib/auras.ts"
Cohesion: 0.50
Nodes (6): AURA_IDS, AuraId, auraLevel(), AURAS, checkAura(), resolveAura()

### Community 91 - "generateShip"
Cohesion: 0.29
Nodes (7): listShipConfigs(), normalizeTroopName(), parseShipPrompt(), parseTroopName(), troopNameSchema, generateShip(), lockedPartNames()

### Community 99 - "MathText"
Cohesion: 0.46
Nodes (6): Fraction(), looksLikeYear(), MathText(), Power(), chatVisibleText(), plainMathText()

### Community 100 - "ChallengeReviewAnswersList.tsx"
Cohesion: 0.57
Nodes (6): ChallengeReviewAnswersList(), formatExpectedAnswer(), formatSaidAnswer(), formatUserAnswer(), isPhotoQuestion(), ChallengeQuestionPublic

### Community 101 - "extractJson"
Cohesion: 0.53
Nodes (4): TASK_EFFORT_SYSTEM, scoreTaskEffort(), clampEffortScore(), extractJson()

## Knowledge Gaps
- **18 isolated node(s):** `zod`, `@types/bcryptjs`, `@types/cookie-parser`, `@types/cors`, `@types/express` (+13 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 642 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `worldsTypes.ts`, `useAuth`, `avatar/types.ts`, `BoardPage.tsx`, `AdminStudentPage.tsx`, `errorMessage`, `ShipEditorModal.tsx`, `TroopSpaceCard.tsx`, `taskia_frontend/package.json`, `sv`, `AvatarRenderer.tsx`, `@phosphor-icons/react`, `main.tsx`, `auraGl.ts`, `loaderCopy.ts`, `api.ts`, `ShipRenderer.tsx`, `AppearanceTools`, `AppLoader`, `SpaceSky.tsx`, `troopsTypes.ts`, `StudyChat.tsx`, `DateField`, `GuardianPage.tsx`, `GalaxyUniverse.tsx`, `TroopRankingPanel.tsx`, `UserAvatar.tsx`, `MathText`, `ChallengeReviewAnswersList.tsx`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **What connects `zod`, `@types/bcryptjs`, `@types/cookie-parser` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `worldsTypes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0620253164556962 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `world.service.ts`, `study.service.ts`, `world.repository.ts`, `troop.service.ts`, `admin.service.ts`, `auth.middleware.ts`, `gemini.client.ts`, `services/xp.ts`, `task.repository.ts`, `civil-date.ts`, `admin.repository.ts`, `data-source.ts`, `requireStudent`, `importStudentCourses`, `t6-check.ts`, `auth.controller.ts`, `error.middleware.ts`, `auth.service.ts`, `lib/auras.ts`, `generateShip`, `extractJson`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.11538461538461539 - nodes in this community are weakly interconnected._
- **Why does `pg` connect `pg` to `taskia_backend/package.json`, `ship-config.ts`, `data-source.ts`, `001_baseline.ts`, `migrate.ts`, `reset.mjs`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Should `world.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08299240210403273 - nodes in this community are weakly interconnected._