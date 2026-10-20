# Graph Report - taskia_code  (2026-10-20)

## Corpus Check
- 263 files · ~115,597 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 27 file(s) not represented in the graph (top: .css 18, .mdc 4, (none) 3)

## Summary
- 1983 nodes · 5705 edges · 97 communities (78 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `218ffb96`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- worldsTypes.ts
- StudyChat.tsx
- App.tsx
- world.service.ts
- react
- chat
- BoardPage.tsx
- world.repository.ts
- troop.repository.ts
- api.ts
- planet-config.ts
- errorMessage
- admin.service.ts
- WorldDetail.tsx
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
- chatMission
- taskia_frontend/package.json
- scripts
- study.service.ts
- troopsTypes.ts
- compilerOptions
- guardian.controller.ts
- sv
- taskia_backend/package.json
- PlanetRenderer.tsx
- AppError
- auth.service.ts
- compilerOptions
- StudyChat
- data-source.ts
- auth.controller.ts
- troop.controller.ts
- compilerOptions
- CampTaskRow.tsx
- reset.mjs
- SpaceSky.tsx
- accent.tsx
- AdminCharts.tsx
- ChallengePlayPage
- scripts/daily-summary.ts
- devDependencies
- scripts
- dependencies
- troop.service.ts
- WorldsScene.tsx
- user.repository.ts
- TroopSpaceCard.tsx
- GalaxyUniverse.tsx
- app.ts
- error.middleware.ts
- local-file-storage.ts
- devDependencies
- troop.schema.ts
- updatePlanet
- dependencies
- scripts
- ChallengeReviewAnswersList.tsx
- planetStyles.ts
- MathText
- OrbitSystem.tsx
- VoiceRecorder
- study.controller.ts
- briefing.ts
- pg
- StudyChallengeAnswer
- StudyChallengePreset
- StudyMission
- StudyWorld
- loadTroopDetail
- StudyBubble.tsx
- LlmUsage
- ParentStudentLink
- StudyChallengeQuestion
- StudyMessage
- StudyMissionMessage
- StudyMissionSession
- StudySession
- StudyWorldCourse
- TroopInvite
- UserStudyMemory
- vite
- vite-env.d.ts
- taskia_frontend/tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `AppError` - 123 edges
2. `errorMessage()` - 101 edges
3. `react` - 72 edges
4. `chat()` - 50 edges
5. `@phosphor-icons/react` - 47 edges
6. `AppLoader()` - 43 edges
7. `chatMission()` - 42 edges
8. `typeorm` - 35 edges
9. `StudyChat()` - 33 edges
10. `useToast()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `overview` --calls--> `viewerDates()`  [EXTRACTED]
  taskia_backend/src/modules/guardian/controllers/guardian.controller.ts → taskia_backend/src/infrastructure/database/civil-date.ts
- `create` --calls--> `viewerDates()`  [EXTRACTED]
  taskia_backend/src/modules/tasks/controllers/task.controller.ts → taskia_backend/src/infrastructure/database/civil-date.ts
- `update` --calls--> `viewerDates()`  [EXTRACTED]
  taskia_backend/src/modules/tasks/controllers/task.controller.ts → taskia_backend/src/infrastructure/database/civil-date.ts
- `register` --calls--> `AppError`  [EXTRACTED]
  taskia_backend/src/modules/auth/controllers/auth.controller.ts → taskia_backend/src/shared/errors/app-error.ts
- `Props` --references--> `Task`  [EXTRACTED]
  taskia_frontend/src/components/CampTaskRow.tsx → taskia_frontend/src/types.ts

## Import Cycles
- None detected.

## Communities (97 total, 19 thin omitted)

### Community 0 - "worldsTypes.ts"
Cohesion: 0.08
Nodes (36): Chip(), ChipButton(), chipClass(), ChipTone, ORDER, Props, WorldsHero(), challengeDifficultyIcon() (+28 more)

### Community 1 - "StudyChat.tsx"
Cohesion: 0.11
Nodes (22): bubbleEnter, bubbleShown, bubbleTransition, Props, voiceBubbleEnter, voiceBubbleShown, voiceBubbleTransition, VoiceStage (+14 more)

### Community 2 - "App.tsx"
Cohesion: 0.08
Nodes (47): framer-motion, @phosphor-icons/react, App(), AppRouter(), challengeTransition, ExplorerApp(), viewTransition, AuthProvider() (+39 more)

### Community 3 - "world.service.ts"
Cohesion: 0.09
Nodes (48): archiveMission(), archiveWorld(), countActiveWorldCourse(), countOwnedActiveCourse(), ensureMissionSession(), findActiveMission(), insertMission(), insertMissionMessage() (+40 more)

### Community 4 - "react"
Cohesion: 0.08
Nodes (45): react, react-dom, TaskEditPanel(), TaskEditPayload, TaskDetailModal(), TaskFormModal(), onSubmit(), DataTableColumn (+37 more)

### Community 5 - "chat"
Cohesion: 0.13
Nodes (31): main(), hideExerciseBrief(), ensureSession(), insertMessage(), loadContext(), loadUserMemory(), saveExerciseBrief(), saveSessionMeta() (+23 more)

### Community 6 - "BoardPage.tsx"
Cohesion: 0.11
Nodes (32): api, AuthContext, AuthContextValue, BoardLoader(), Props, Props, Props, mergeXpIntoUser() (+24 more)

### Community 7 - "world.repository.ts"
Cohesion: 0.08
Nodes (51): decodeStudyPhoto(), StudyPhoto, uploadStudyPhoto(), distributeQuestionCounts(), estimateMaxQuestionsFromMaterial(), formatCorrectAnswer(), gradeMultipleChoice(), groupMissionsByCourse() (+43 more)

### Community 8 - "troop.repository.ts"
Cohesion: 0.20
Nodes (19): countActiveMembers(), countPendingInvites(), db(), findActiveExplorer(), findActiveMembership(), findCaptainId(), findPendingInvite(), findTroop() (+11 more)

### Community 9 - "api.ts"
Cohesion: 0.06
Nodes (69): cleanFilters(), request(), EmptyState(), EmptyStateProps, DataTable(), Props, SIZE_PX, WorldsIconBadge() (+61 more)

### Community 10 - "planet-config.ts"
Cohesion: 0.09
Nodes (34): ACCESSORIES, ALLOWED, asEnum(), asHex(), BODY_TYPES, BodyType, clamp(), DECORATIONS (+26 more)

### Community 11 - "errorMessage"
Cohesion: 0.08
Nodes (45): AppLoader(), onSubmit(), onSubmit(), SwitchToggle(), onSubmit(), onSubmit(), onStart(), onSubmit() (+37 more)

### Community 12 - "admin.service.ts"
Cohesion: 0.05
Nodes (120): main(), view, andCivilDate(), civilDateSql(), civilDayFromOffset(), civilDayKey(), isIanaTimeZone(), offsetMinutesToPg() (+112 more)

### Community 13 - "WorldDetail.tsx"
Cohesion: 0.07
Nodes (64): AppLoaderProps, buildGroups(), ChallengeHistoryList(), Group, groupArt(), Props, rowText(), ChallengeSetupModal() (+56 more)

### Community 14 - "admin.controller.ts"
Cohesion: 0.08
Nodes (26): addCourse, archiveCourse, challenge, challenges, createGuardian, createStudent, dashboard, guardian (+18 more)

### Community 15 - "auth.middleware.ts"
Cohesion: 0.15
Nodes (20): express, Express, isUserRole(), Request, requireAdmin(), requireAuth(), requireParent(), requireStudent() (+12 more)

### Community 16 - "task.schema.ts"
Cohesion: 0.22
Nodes (13): civilDateSchema, kindSchema, parseDueOn(), parseInstant(), parseKind(), parseNeedsHelp(), parseStatus(), resolveDueDate() (+5 more)

### Community 17 - "001_baseline.ts"
Cohesion: 0.18
Nodes (18): bcryptjs, ensureCourses(), ensureLink(), ensureMembership(), ensureUser(), ensureWeekAward(), fillDerivedPlanetFields(), GUARDIAN_BY_EXPLORER (+10 more)

### Community 18 - "entities/index.ts"
Cohesion: 0.23
Nodes (3): typeorm, bigintTransformer, civilDateTransformer

### Community 19 - "guardian.repository.ts"
Cohesion: 0.06
Nodes (9): ParentChatMessage, ParentNotifyPrefs, StudyChallenge, Troop, XpAward, challengeStats(), missionCounts(), num() (+1 more)

### Community 20 - "gemini.client.ts"
Cohesion: 0.13
Nodes (21): callGemini(), classifyBoardIntent(), generateGeminiText(), LlmUsageContext, LlmUsageKind, minimalThinking(), NONE_INTENT, parseBoardIntent() (+13 more)

### Community 21 - "engine.ts"
Cohesion: 0.11
Nodes (26): ACCESSORIES, ALLOWED, asEnum(), asHex(), BodyType, clamp(), DECORATIONS, EYES (+18 more)

### Community 22 - "migrate.ts"
Cohesion: 0.12
Nodes (25): APP_TABLES, applyTsFile(), args, baselineAlreadyMaterialized(), clientConfig(), __dirname, ensureMigrationsTable(), envArg (+17 more)

### Community 23 - "services/xp.ts"
Cohesion: 0.10
Nodes (22): main(), assertCanCreateTask(), awardXp(), CHALLENGE_BASE, challengeTimeFactor(), countTasksCreatedToday(), fetchUserProgress(), insertedRowCount() (+14 more)

### Community 24 - "world.controller.ts"
Cohesion: 0.08
Nodes (23): addCourse, chat, completeChallenge, createMission, createWorld, discardChallenge, getChallenge, importMissions (+15 more)

### Community 25 - "task.repository.ts"
Cohesion: 0.15
Nodes (13): main(), Course, Task, findTask(), hydrate(), insertTask(), listTasks(), mapTask() (+5 more)

### Community 26 - "sessionPlace.ts"
Cohesion: 0.16
Nodes (18): AdminPlace, coerceAdminPlace(), coerceExplorerPlace(), emptyAdminPlace, emptyExplorerPlace, EXPLORER_VIEWS, ExplorerPlace, ExplorerView (+10 more)

### Community 27 - "chatMission"
Cohesion: 0.11
Nodes (22): loadReferencePhoto(), saveExerciseBrief(), saveSessionMeta(), setBriefingReady(), setNotebook(), setStudyMode(), gradePhotoPairs(), chatMission() (+14 more)

### Community 28 - "taskia_frontend/package.json"
Cohesion: 0.12
Nodes (19): @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+11 more)

### Community 29 - "scripts"
Cohesion: 0.10
Nodes (21): scripts, build, build:pd, build:qa, db:migrate, db:migrate:pd, db:migrate:qa, db:reset (+13 more)

### Community 30 - "study.service.ts"
Cohesion: 0.15
Nodes (23): callGeminiSpeak(), callGeminiTranscribe(), exerciseReference(), ExerciseTurn, exerciseTurnInstruction(), GRAPHIC_DECLINE, needsGraphic(), parseGraphicFlag() (+15 more)

### Community 31 - "troopsTypes.ts"
Cohesion: 0.18
Nodes (10): TroopDetail, TroopInboxResponse, TroopInvite, TroopMember, TroopMeResponse, TroopRankingResponse, TroopRankingRow, TroopRole (+2 more)

### Community 32 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 33 - "guardian.controller.ts"
Cohesion: 0.29
Nodes (6): getNotifyPrefs, listChat, listExplorers, overview, sendChat, updateNotifyPrefs

### Community 34 - "sv"
Cohesion: 0.20
Nodes (19): CampEmptyDay(), CampEmptyProjects(), CampScene(), CrewScene(), LIGHTS, Draw(), DrawProps, Spark() (+11 more)

### Community 35 - "taskia_backend/package.json"
Cohesion: 0.11
Nodes (18): cookie-parser, cors, helmet, jsonwebtoken, tsx, @types/bcryptjs, @types/cookie-parser, @types/cors (+10 more)

### Community 36 - "PlanetRenderer.tsx"
Cohesion: 0.19
Nodes (17): PlanetLab(), Accessory(), Decor(), Face(), Marks(), PlanetRenderer(), Props, renderToStaticSvg() (+9 more)

### Community 37 - "AppError"
Cohesion: 0.22
Nodes (14): assertParentLinked(), parseGuardianChatMessage(), listChat(), loadExplorerTroop(), loadOrCreatePrefs(), mapExplorer(), mapTroopRole(), requireLinkedExplorer() (+6 more)

### Community 38 - "auth.service.ts"
Cohesion: 0.22
Nodes (15): AVATAR_PRESETS, AvatarPresetId, FRAME_IDS, frameAllowedForRole(), FrameId, isAvatarPreset(), isFrameId(), avatarFields() (+7 more)

### Community 39 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, module, moduleResolution (+9 more)

### Community 40 - "StudyChat"
Cohesion: 0.21
Nodes (19): imageFileFromClipboard(), StudyChat(), beginListening(), cacheAudioUrl(), clearVoiceTick(), closeVoiceStage(), finishCircleTurn(), hearPreparedAudio() (+11 more)

### Community 41 - "data-source.ts"
Cohesion: 0.12
Nodes (19): reflect-metadata, main(), main(), main(), main(), AppDataSource, initDataSource(), entities (+11 more)

### Community 42 - "auth.controller.ts"
Cohesion: 0.19
Nodes (15): clearAuthCookie(), setAuthCookie(), signToken(), login, logout, me, register, updateAvatar (+7 more)

### Community 43 - "troop.controller.ts"
Cohesion: 0.12
Nodes (16): acceptInvite, createTroop, generatePlanet, getInbox, getMe, getRanking, getTroop, getUniverse (+8 more)

### Community 44 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 45 - "CampTaskRow.tsx"
Cohesion: 0.17
Nodes (12): CampTaskRow(), onCard(), onPointerUp(), COURSE_STRENGTH, courseAccent(), displayTitle(), Props, STATUS_CHIP (+4 more)

### Community 46 - "reset.mjs"
Cohesion: 0.17
Nodes (14): dotenv, args, clientConfig(), __dirname, envArg, envFiles, envPath, main() (+6 more)

### Community 47 - "SpaceSky.tsx"
Cohesion: 0.17
Nodes (14): FAR, KEY_GROUPS, MID, mulberry32(), NEAR, randomShot(), scatter(), ShootingStar() (+6 more)

### Community 48 - "accent.tsx"
Cohesion: 0.15
Nodes (17): AccentContext, AccentContextValue, AccentId, AccentProvider(), ACCENTS, getInitialAccent(), useAccent(), withAppearanceTransition() (+9 more)

### Community 49 - "AdminCharts.tsx"
Cohesion: 0.22
Nodes (17): AdminRosterRow, civilDayAsDate(), civilDayISO(), daysSince(), formatDay(), formatDayCompact(), formatDayShort(), parseInstant() (+9 more)

### Community 50 - "ChallengePlayPage"
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

### Community 54 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, helmet, jsonwebtoken (+4 more)

### Community 55 - "troop.service.ts"
Cohesion: 0.18
Nodes (23): main(), req(), civilDayFromInstant(), countInvitesSentToday(), listIncomingInvites(), listTroopRequests(), MemberRow, rankingPage() (+15 more)

### Community 56 - "WorldsScene.tsx"
Cohesion: 0.24
Nodes (9): HubDestinations(), HubDoor, innerRing, Moon(), ORBIT, OrbitingMoon(), RING, WorldsScene() (+1 more)

### Community 57 - "user.repository.ts"
Cohesion: 0.13
Nodes (12): Role, TroopMember, findAuthById(), findAvatarRow(), findLoginByUsername(), findSessionById(), findUserIdByEmail(), findUserIdByUsername() (+4 more)

### Community 58 - "TroopSpaceCard.tsx"
Cohesion: 0.30
Nodes (9): ExplorerAvatar(), LevelStar(), TroopSpaceCard(), AVATAR_PRESETS, avatarUploadUrl(), FRAME_OPTIONS, presetGlyph(), resolveTroopPlanet() (+1 more)

### Community 59 - "GalaxyUniverse.tsx"
Cohesion: 0.24
Nodes (9): GalaxyUniverse(), Props, RANK_COLOR, starField(), hashTroop(), layoutPlanets(), PlanetLayoutPoint, unitFloat() (+1 more)

### Community 60 - "app.ts"
Cohesion: 0.36
Nodes (6): createApp(), env, pgDsn, main(), errorHandler(), registerRoutes()

### Community 61 - "error.middleware.ts"
Cohesion: 0.23
Nodes (8): avatarFilePath(), asyncHandler(), sendAvatar, router, complete, create, list, update

### Community 62 - "local-file-storage.ts"
Cohesion: 0.16
Nodes (8): projects, root, ALLOWED_MIME, avatarsDir(), defaultRoot, __dirname, filesRoot(), saveAvatarUpload()

### Community 63 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, tsx, @types/bcryptjs, @types/cookie-parser, @types/cors, @types/express, @types/jsonwebtoken, @types/node (+2 more)

### Community 64 - "troop.schema.ts"
Cohesion: 0.18
Nodes (11): planetFingerprint(), createTroopWithCaptain(), listPlanetConfigs(), normalizeTroopName(), parsePlanetPrompt(), parsePlanetStyleId(), parseTroopName(), PLANET_STYLE_IDS (+3 more)

### Community 65 - "updatePlanet"
Cohesion: 0.24
Nodes (9): asHex(), clamp01(), KINDS, normalizePlanetParams(), PlanetParams, setPlanetConfig(), setPlanetParams(), setPlanetStyle() (+1 more)

### Community 66 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, framer-motion, @phosphor-icons/react, react, react-dom (+2 more)

### Community 67 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, build:pd, build:qa, dev, dev:pd, lint, preview (+1 more)

### Community 68 - "ChallengeReviewAnswersList.tsx"
Cohesion: 0.57
Nodes (6): ChallengeReviewAnswersList(), formatExpectedAnswer(), formatSaidAnswer(), formatUserAnswer(), isPhotoQuestion(), ChallengeQuestionPublic

### Community 69 - "planetStyles.ts"
Cohesion: 0.36
Nodes (7): asHex(), clamp01(), getPlanetStyle(), PLANET_STYLES, PlanetParams, PlanetStyle, resolvePlanetLook()

### Community 70 - "MathText"
Cohesion: 0.29
Nodes (10): Fraction(), looksLikeYear(), MathText(), Power(), formatElapsed(), messageKey(), TypewriterText(), VoiceStageView() (+2 more)

### Community 71 - "OrbitSystem.tsx"
Cohesion: 0.24
Nodes (10): BURST, clamp(), fit(), Mode, MODES, Plan, Props, RING_SECONDS (+2 more)

### Community 72 - "VoiceRecorder"
Cohesion: 0.29
Nodes (5): blobToBase64(), pickRecorderMimeType(), VoiceRecorder, VoiceRecorderStatus, VoiceRecordingResult

### Community 73 - "study.controller.ts"
Cohesion: 0.33
Nodes (5): chat, openSession, speak, transcribe, voiceTurn

### Community 74 - "briefing.ts"
Cohesion: 0.48
Nodes (4): appendNotebook(), briefingTutorRules(), missionTutorPrompt(), projectTutorPrompt()

### Community 75 - "pg"
Cohesion: 0.22
Nodes (3): pg, runScript(), splitPgStatements()

### Community 80 - "loadTroopDetail"
Cohesion: 0.22
Nodes (9): cancelPendingInvitesTo(), listActiveMembers(), markMemberLeft(), troopWeekXp(), getTroop(), kickMember(), loadTroopDetail(), mapMember() (+1 more)

### Community 81 - "StudyBubble.tsx"
Cohesion: 0.38
Nodes (5): BubbleVariant, Props, StudyBubble(), BeaconState, TaskiaBeacon()

## Knowledge Gaps
- **18 isolated node(s):** `zod`, `@types/bcryptjs`, `@types/cookie-parser`, `@types/cors`, `@types/express` (+13 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 574 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `worldsTypes.ts`, `StudyChat.tsx`, `App.tsx`, `BoardPage.tsx`, `api.ts`, `errorMessage`, `WorldDetail.tsx`, `taskia_frontend/package.json`, `sv`, `PlanetRenderer.tsx`, `CampTaskRow.tsx`, `SpaceSky.tsx`, `accent.tsx`, `AdminCharts.tsx`, `WorldsScene.tsx`, `GalaxyUniverse.tsx`, `ChallengeReviewAnswersList.tsx`, `MathText`, `OrbitSystem.tsx`, `StudyBubble.tsx`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **What connects `zod`, `@types/bcryptjs`, `@types/cookie-parser` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `worldsTypes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08181818181818182 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `world.service.ts`, `chat`, `world.repository.ts`, `troop.repository.ts`, `admin.service.ts`, `auth.middleware.ts`, `task.schema.ts`, `gemini.client.ts`, `services/xp.ts`, `task.repository.ts`, `chatMission`, `study.service.ts`, `auth.service.ts`, `data-source.ts`, `auth.controller.ts`, `troop.service.ts`, `error.middleware.ts`, `local-file-storage.ts`, `troop.schema.ts`, `updatePlanet`, `loadTroopDetail`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Should `StudyChat.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1076923076923077 - nodes in this community are weakly interconnected._
- **Why does `bcryptjs` connect `001_baseline.ts` to `taskia_backend/package.json`, `admin.service.ts`, `auth.service.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08173076923076923 - nodes in this community are weakly interconnected._