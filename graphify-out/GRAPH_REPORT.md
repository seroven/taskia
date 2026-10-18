# Graph Report - taskia_code  (2026-10-18)

## Corpus Check
- 237 files · ~103,873 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: .css 12, .mdc 3, (none) 3)

## Summary
- 1849 nodes · 5299 edges · 99 communities (73 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 39 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96

## God Nodes (most connected - your core abstractions)
1. `AppError` - 123 edges
2. `errorMessage()` - 99 edges
3. `react` - 60 edges
4. `chat()` - 50 edges
5. `AppLoader()` - 43 edges
6. `chatMission()` - 42 edges
7. `@phosphor-icons/react` - 41 edges
8. `typeorm` - 35 edges
9. `EmptyState()` - 34 edges
10. `StudyChat()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `create` --calls--> `viewerDates()`  [EXTRACTED]
  taskia_backend/src/modules/tasks/controllers/task.controller.ts → taskia_backend/src/infrastructure/database/civil-date.ts
- `update` --calls--> `viewerDates()`  [EXTRACTED]
  taskia_backend/src/modules/tasks/controllers/task.controller.ts → taskia_backend/src/infrastructure/database/civil-date.ts
- `register` --calls--> `AppError`  [EXTRACTED]
  taskia_backend/src/modules/auth/controllers/auth.controller.ts → taskia_backend/src/shared/errors/app-error.ts
- `Props` --references--> `Task`  [EXTRACTED]
  taskia_frontend/src/components/CampTaskRow.tsx → taskia_frontend/src/types.ts
- `onSubmit()` --calls--> `errorMessage()`  [EXTRACTED]
  taskia_frontend/src/components/UserChip.tsx → taskia_frontend/src/lib/errors.ts

## Import Cycles
- None detected.

## Communities (99 total, 26 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (70): @phosphor-icons/react, api, AppLoader(), AppLoaderProps, EmptyStateProps, ExplorerXpBar(), ChallengeHistoryList(), Props (+62 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (59): Fraction(), looksLikeYear(), MathText(), Power(), BubbleVariant, Props, StudyBubble(), bubbleEnter (+51 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (47): framer-motion, react, App(), AppRouter(), challengeTransition, ExplorerApp(), viewTransition, AuthContext (+39 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (61): archiveMission(), archiveWorld(), ChallengeQuestionDetail, ChallengeView, challengeViewFromEntity(), countActiveWorldCourse(), countOwnedActiveCourse(), ensureMissionSession() (+53 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (43): react-dom, Props, TaskEditPanel(), TaskEditPayload, Props, TaskDetailModal(), Props, TaskFormModal() (+35 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (44): main(), hideExerciseBrief(), exerciseTurnInstruction(), ensureSession(), insertMessage(), loadContext(), loadUserMemory(), saveExerciseBrief() (+36 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (38): BoardLoader(), CampTaskRow(), COURSE_STRENGTH, courseAccent(), displayTitle(), Props, STATUS_CHIP, STATUS_ICON (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (44): decodeStudyPhoto(), StudyPhoto, uploadStudyPhoto(), loadReferencePhoto(), distributeQuestionCounts(), estimateMaxQuestionsFromMaterial(), formatCorrectAnswer(), gradeMultipleChoice() (+36 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (44): cancelPendingInvitesTo(), countActiveMembers(), countPendingInvites(), createTroopWithCaptain(), db(), findActiveExplorer(), findActiveMembership(), findCaptainId() (+36 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (33): EmptyState(), DataTable(), DataTableColumn, formatDay(), formatWhen(), phaseLabel(), AdminAccountsPage(), ExplorersTable() (+25 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (34): ACCESSORIES, ALLOWED, asEnum(), asHex(), BODY_TYPES, BodyType, clamp(), DECORATIONS (+26 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (32): onSubmit(), onSubmit(), onStart(), onSubmit(), onSubmit(), ImportMissionsModal(), onSubmit(), errorMessage() (+24 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (33): civilDayKey(), activeWorldCount(), applyWindow(), challengeActivity(), challengesByUser(), completedChallengeStats(), countsByDay(), countsByUser() (+25 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (28): main(), view, lastStudyAt(), listActiveWorldsWithMissions(), listCourses(), recentCompletedChallenges(), recentStudentTasks(), studentCompletedChallengeStats() (+20 more)

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (26): addCourse, archiveCourse, challenge, challenges, createGuardian, createStudent, dashboard, guardian (+18 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (19): express, Express, isUserRole(), Request, requireAdmin(), requireAuth(), requireParent(), requireStudent() (+11 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (22): parseChatMessage(), parseSpeakBody(), civilDateSchema, kindSchema, parseDueOn(), parseInstant(), parseKind(), parseNeedsHelp() (+14 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (20): pg, ensureCourses(), ensureLink(), ensureMembership(), ensureUser(), ensureWeekAward(), fillDerivedPlanetFields(), GUARDIAN_BY_EXPLORER (+12 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (3): typeorm, bigintTransformer, civilDateTransformer

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (6): ParentStudentLink, XpAward, challengeStats(), missionCounts(), num(), taskCounts()

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (22): callGemini(), callGeminiSpeak(), callGeminiTranscribe(), classifyBoardIntent(), generateGeminiText(), LlmUsageKind, minimalThinking(), NONE_INTENT (+14 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (26): ACCESSORIES, ALLOWED, asEnum(), asHex(), BodyType, clamp(), DECORATIONS, EYES (+18 more)

### Community 22 - "Community 22"
Cohesion: 0.12
Nodes (25): APP_TABLES, applyTsFile(), args, baselineAlreadyMaterialized(), clientConfig(), __dirname, ensureMigrationsTable(), envArg (+17 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (22): TASK_EFFORT_SYSTEM, scoreTaskEffort(), awardXp(), CHALLENGE_BASE, challengeTimeFactor(), clampEffortScore(), countTasksCreatedToday(), insertedRowCount() (+14 more)

### Community 24 - "Community 24"
Cohesion: 0.08
Nodes (23): addCourse, chat, completeChallenge, createMission, createWorld, discardChallenge, getChallenge, importMissions (+15 more)

### Community 25 - "Community 25"
Cohesion: 0.15
Nodes (13): main(), Course, Task, findTask(), hydrate(), insertTask(), listTasks(), mapTask() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (13): AdminPlace, coerceAdminPlace(), coerceExplorerPlace(), emptyAdminPlace, emptyExplorerPlace, EXPLORER_VIEWS, ExplorerPlace, ExplorerView (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (21): AdminChallengeRow, AdminCourse, AdminCourseImportResult, AdminDashboardSeriesPoint, AdminOverview, AdminStudent, AdminStudentActivity, AdminTaskRow (+13 more)

### Community 28 - "Community 28"
Cohesion: 0.12
Nodes (19): @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+11 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (21): scripts, build, build:pd, build:qa, db:migrate, db:migrate:pd, db:migrate:qa, db:reset (+13 more)

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (16): LlmUsageContext, EXERCISE_BRIEF_SYSTEM, formatExerciseBrief(), planExerciseMemory(), solveExerciseBrief(), exerciseReference(), ExerciseTurn, GRAPHIC_DECLINE (+8 more)

### Community 31 - "Community 31"
Cohesion: 0.14
Nodes (19): cleanFilters(), request(), AdminGuardian, adminQuery(), AdminStudyRow, ParentChatMessage, viewerTimeZone(), TroopDetail (+11 more)

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 33 - "Community 33"
Cohesion: 0.17
Nodes (18): andCivilDate(), civilDateSql(), civilDayFromOffset(), isIanaTimeZone(), offsetMinutesToPg(), parseViewerTz(), todayFromOffset(), viewerDates() (+10 more)

### Community 34 - "Community 34"
Cohesion: 0.19
Nodes (20): activateGuardianLink(), countActiveLinksForParent(), countActiveLinksForStudent(), deactivateGuardianLink(), listGuardianExplorers(), listStudentGuardians(), updateGuardian(), assertCanUnlink() (+12 more)

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (18): bcryptjs, cookie-parser, cors, jsonwebtoken, tsx, @types/bcryptjs, @types/cookie-parser, @types/cors (+10 more)

### Community 36 - "Community 36"
Cohesion: 0.19
Nodes (17): PlanetLab(), Accessory(), Decor(), Face(), Marks(), PlanetRenderer(), Props, renderToStaticSvg() (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.24
Nodes (15): main(), assertParentLinked(), parseGuardianChatMessage(), explorerOverview(), getNotifyPrefs(), listChat(), listExplorers(), loadExplorerTroop() (+7 more)

### Community 38 - "Community 38"
Cohesion: 0.21
Nodes (16): saveAvatarUpload(), AVATAR_PRESETS, AvatarPresetId, FRAME_IDS, frameAllowedForRole(), FrameId, isAvatarPreset(), isFrameId() (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution (+9 more)

### Community 40 - "Community 40"
Cohesion: 0.20
Nodes (15): Chip(), ChipButton(), chipClass(), ChipTone, SwitchToggle(), readGuardianExplorerId(), writeGuardianExplorerId(), ActivityTile() (+7 more)

### Community 41 - "Community 41"
Cohesion: 0.19
Nodes (10): reflect-metadata, main(), main(), main(), initDataSource(), User, listChallengePresets(), listPresets() (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.21
Nodes (15): clearAuthCookie(), setAuthCookie(), signToken(), login, logout, me, register, updateAvatar (+7 more)

### Community 43 - "Community 43"
Cohesion: 0.12
Nodes (16): acceptInvite, createTroop, generatePlanet, getInbox, getMe, getRanking, getTroop, getUniverse (+8 more)

### Community 44 - "Community 44"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 45 - "Community 45"
Cohesion: 0.17
Nodes (15): activateLink(), createExplorerWithGuardian(), createGuardianWithExplorer(), ensureNotifyPrefs(), findUserIdByEmail(), findUserIdByUsername(), insertUser(), updateExplorer() (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (14): dotenv, args, clientConfig(), __dirname, envArg, envFiles, envPath, main() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.23
Nodes (7): main(), AppDataSource, entities, SnakeNamingStrategy, CACHE, roleIdByCode(), listActiveCourses()

### Community 48 - "Community 48"
Cohesion: 0.19
Nodes (12): AccentContext, AccentContextValue, AccentId, AccentProvider(), ACCENTS, getInitialAccent(), withAppearanceTransition(), getInitialTheme() (+4 more)

### Community 49 - "Community 49"
Cohesion: 0.24
Nodes (14): useAccent(), AdminDashboard, AdminRosterRow, AdminDashboardCharts(), ChartMark, ChartTooltip(), followupReason(), formatUsd() (+6 more)

### Community 50 - "Community 50"
Cohesion: 0.26
Nodes (14): ChallengePlayPage(), applySaved(), captureCurrent(), freezeClock(), goTo(), leaveChallenge(), onSubmit(), onVis() (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.28
Nodes (11): brief(), dayArg(), Explorer, explorers(), main(), onDay(), saveSummary(), summarize() (+3 more)

### Community 52 - "Community 52"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/node, @types/react (+5 more)

### Community 53 - "Community 53"
Cohesion: 0.17
Nodes (11): name, private, scripts, build, build:pd, build:qa, db:migrate, db:setup (+3 more)

### Community 54 - "Community 54"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, helmet, jsonwebtoken (+4 more)

### Community 55 - "Community 55"
Cohesion: 0.35
Nodes (11): main(), req(), civilDayFromInstant(), countInvitesSentToday(), searchExplorers(), weeklyRanks(), parseExplorerSearch(), getRanking() (+3 more)

### Community 56 - "Community 56"
Cohesion: 0.27
Nodes (12): findCourse(), findCourseByName(), findOtherCourseByName(), insertCourse(), listActiveCourses(), updateCourse(), parseCourseName(), addStudentCourse() (+4 more)

### Community 57 - "Community 57"
Cohesion: 0.32
Nodes (10): findAuthById(), findAvatarRow(), findLoginByUsername(), findSessionById(), findUserIdByEmail(), findUserIdByUsername(), updateAvatar(), updateProfile() (+2 more)

### Community 58 - "Community 58"
Cohesion: 0.30
Nodes (9): ExplorerAvatar(), LevelStar(), TroopSpaceCard(), AVATAR_PRESETS, avatarUploadUrl(), FRAME_OPTIONS, presetGlyph(), resolveTroopPlanet() (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.24
Nodes (9): GalaxyUniverse(), Props, RANK_COLOR, starField(), hashTroop(), layoutPlanets(), PlanetLayoutPoint, unitFloat() (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.31
Nodes (7): helmet, createApp(), env, pgDsn, main(), errorHandler(), registerRoutes()

### Community 61 - "Community 61"
Cohesion: 0.24
Nodes (7): asyncHandler(), listCourses, router, complete, create, list, update

### Community 62 - "Community 62"
Cohesion: 0.29
Nodes (7): ALLOWED_MIME, avatarFilePath(), avatarsDir(), defaultRoot, __dirname, filesRoot(), sendAvatar

### Community 63 - "Community 63"
Cohesion: 0.20
Nodes (10): devDependencies, tsx, @types/bcryptjs, @types/cookie-parser, @types/cors, @types/express, @types/jsonwebtoken, @types/node (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.22
Nodes (9): planetFingerprint(), listPlanetConfigs(), normalizeTroopName(), parsePlanetPrompt(), parsePlanetStyleId(), parseTroopName(), PLANET_STYLE_IDS, troopNameSchema (+1 more)

### Community 65 - "Community 65"
Cohesion: 0.24
Nodes (9): asHex(), clamp01(), KINDS, normalizePlanetParams(), PlanetParams, setPlanetConfig(), setPlanetParams(), setPlanetStyle() (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.20
Nodes (10): dependencies, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, framer-motion, @phosphor-icons/react, react, react-dom (+2 more)

### Community 67 - "Community 67"
Cohesion: 0.22
Nodes (9): scripts, build, build:pd, build:qa, dev, dev:pd, lint, preview (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.57
Nodes (6): ChallengeReviewAnswersList(), formatExpectedAnswer(), formatSaidAnswer(), formatUserAnswer(), isPhotoQuestion(), ChallengeQuestionPublic

### Community 69 - "Community 69"
Cohesion: 0.36
Nodes (7): asHex(), clamp01(), getPlanetStyle(), PLANET_STYLES, PlanetParams, PlanetStyle, resolvePlanetLook()

### Community 71 - "Community 71"
Cohesion: 0.52
Nodes (6): civilDayAsDate(), civilDayISO(), daysSince(), formatDayCompact(), formatDayShort(), parseInstant()

### Community 73 - "Community 73"
Cohesion: 0.33
Nodes (5): chat, openSession, speak, transcribe, voiceTurn

### Community 74 - "Community 74"
Cohesion: 0.60
Nodes (3): briefingTutorRules(), missionTutorPrompt(), projectTutorPrompt()

## Knowledge Gaps
- **18 isolated node(s):** `zod`, `@types/bcryptjs`, `@types/cookie-parser`, `@types/cors`, `@types/express` (+13 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 532 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `Community 16` to `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 13`, `Community 15`, `Community 20`, `Community 23`, `Community 25`, `Community 33`, `Community 34`, `Community 37`, `Community 38`, `Community 42`, `Community 45`, `Community 47`, `Community 55`, `Community 56`, `Community 61`, `Community 62`, `Community 64`, `Community 65`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **What connects `zod`, `@types/bcryptjs`, `@types/cookie-parser` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06794783802333562 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Community 2` to `Community 0`, `Community 1`, `Community 36`, `Community 4`, `Community 6`, `Community 68`, `Community 40`, `Community 9`, `Community 11`, `Community 48`, `Community 49`, `Community 59`, `Community 28`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0532724505327245 - nodes in this community are weakly interconnected._
- **Why does `errorMessage()` connect `Community 11` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 6`, `Community 40`, `Community 9`, `Community 50`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08111888111888112 - nodes in this community are weakly interconnected._