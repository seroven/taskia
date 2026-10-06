import { Course } from './course.entity.js'
import { Difficulty } from './difficulty.entity.js'
import { LlmUsage } from './llm-usage.entity.js'
import { ParentChatMessage } from './parent-chat-message.entity.js'
import { ParentNotifyPrefs } from './parent-notify-prefs.entity.js'
import { ParentStudentLink } from './parent-student-link.entity.js'
import { Role } from './role.entity.js'
import { StudentDailySummary } from './student-daily-summary.entity.js'
import { StudyChallengeAnswer } from './study-challenge-answer.entity.js'
import { StudyChallengePreset } from './study-challenge-preset.entity.js'
import { StudyChallengeQuestion } from './study-challenge-question.entity.js'
import { StudyChallenge } from './study-challenge.entity.js'
import { StudyMessage } from './study-message.entity.js'
import { StudyMissionMessage } from './study-mission-message.entity.js'
import { StudyMissionSession } from './study-mission-session.entity.js'
import { StudyMission } from './study-mission.entity.js'
import { StudySession } from './study-session.entity.js'
import { StudyWorldCourse } from './study-world-course.entity.js'
import { StudyWorld } from './study-world.entity.js'
import { Task } from './task.entity.js'
import { TroopInvite } from './troop-invite.entity.js'
import { TroopMember } from './troop-member.entity.js'
import { Troop } from './troop.entity.js'
import { UserStudyMemory } from './user-study-memory.entity.js'
import { User } from './user.entity.js'
import { XpAward } from './xp-award.entity.js'

/** Las tablas de Taskia. schema_migrations no entra. */
export const entities = [
  Role,
  User,
  Course,
  Difficulty,
  Task,
  StudySession,
  StudyMessage,
  UserStudyMemory,
  StudyWorld,
  StudyWorldCourse,
  StudyMission,
  StudyMissionSession,
  StudyMissionMessage,
  StudyChallenge,
  StudyChallengeQuestion,
  StudyChallengeAnswer,
  StudyChallengePreset,
  ParentStudentLink,
  ParentNotifyPrefs,
  StudentDailySummary,
  ParentChatMessage,
  LlmUsage,
  XpAward,
  Troop,
  TroopMember,
  TroopInvite,
]

export {
  Course,
  Difficulty,
  LlmUsage,
  ParentChatMessage,
  ParentNotifyPrefs,
  ParentStudentLink,
  Role,
  StudentDailySummary,
  StudyChallenge,
  StudyChallengeAnswer,
  StudyChallengePreset,
  StudyChallengeQuestion,
  StudyMessage,
  StudyMission,
  StudyMissionMessage,
  StudyMissionSession,
  StudySession,
  StudyWorld,
  StudyWorldCourse,
  Task,
  Troop,
  TroopInvite,
  TroopMember,
  User,
  UserStudyMemory,
  XpAward,
}
