import type { ChallengeQuestionPublic } from './worldsTypes'

export function isPhotoQuestion(
  q: Pick<ChallengeQuestionPublic, 'reference_image_url'>,
) {
  return Boolean(q.reference_image_url)
}

export function formatUserAnswer(
  q: ChallengeQuestionPublic,
  raw: string | null | undefined,
) {
  const text = (raw ?? q.user_answer ?? '').trim()
  if (!text) return '—'
  if (q.kind === 'multiple_choice' && q.options && /^[A-D]$/i.test(text)) {
    const idx = text.toUpperCase().charCodeAt(0) - 65
    const opt = q.options[idx]
    return opt ? `${text.toUpperCase()}. ${opt}` : text.toUpperCase()
  }
  return text
}

export function formatSaidAnswer(q: ChallengeQuestionPublic) {
  return formatUserAnswer(q, q.user_answer)
}

export function formatExpectedAnswer(q: ChallengeQuestionPublic) {
  return formatUserAnswer(q, q.correct_answer)
}
