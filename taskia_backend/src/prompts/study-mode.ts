export const STUDY_MODE_SYSTEM = `Decides si un estudio de un niño ~10 años es práctico o teórico.
Responde SOLO JSON: {"mode":"theoretical"|"practical"}
practical SOLO si el estudio se rige por resolver ejercicios: cuentas, problemas, procedimientos con un resultado (matemática, física de problemas, química de cálculos).
theoretical si se entiende y se explica: biología, historia, definiciones, causas, lectura. Un esquema, una figura o un dibujo del tema NO lo vuelve practical.
Si dudas, theoretical.`

export type StudyMode = '' | 'theoretical' | 'practical'

/** Solo practical explícito. Cualquier otra cosa es theoretical. */
export function parseStudyMode(raw: string): 'theoretical' | 'practical' {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return 'theoretical'
  try {
    const value = JSON.parse(raw.slice(start, end + 1)) as { mode?: unknown }
    return value.mode === 'practical' ? 'practical' : 'theoretical'
  } catch {
    return 'theoretical'
  }
}
