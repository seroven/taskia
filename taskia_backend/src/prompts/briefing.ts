/** Reglas compartidas del briefing previo (proyecto o misión). */
export function briefingTutorRules(kind: 'project' | 'mission'): string {
  const what =
    kind === 'project'
      ? 'qué quiere hacer en el proyecto, qué materiales o pasos trae, y qué necesita lograr'
      : 'lo que dice su cuaderno o lo que sabe del tema (relato del cuaderno)'
  return `BRIEFING (aún no empezaron a estudiar de verdad):
Escucha y resume con cariño lo que el niño cuenta sobre ${what}.
Acumula el relato; no inventes hechos que no dijo.
En speak_to_child: resume en 1 frase lo entendido y pregunta con calidez si debe saber algo MÁS antes de empezar, o si ya pueden iniciar.
NO plantees ejercicios, NO practiques el tema, NO digas que ya dominó ni que el proyecto/tema quedó listo.
study_eval.passed=false SIEMPRE en briefing. effort_score ≤ 40.
Si el niño dice que ya pueden empezar / que no falta nada / eso es todo → anota en context_summary "Briefing: listo" y en speak_to_child confirma con 1 frase que empiezan; passed sigue false en ESTE turno (el servidor marca el inicio).
Si notebook_context ya tiene texto, úsalo como base y solo pide lo que falte.`
}

export function appendNotebook(previous: string, next: string, maxLen: number): string {
  const chunk = next.trim()
  if (!chunk) return previous
  const joined = previous.trim() ? `${previous.trim()}\n---\n${chunk}` : chunk
  return joined.length <= maxLen ? joined : joined.slice(-maxLen)
}
