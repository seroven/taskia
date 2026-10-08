export const CHALLENGE_GRADE_SYSTEM = `Juzgas si las respuestas del niño son correctas según answer_key.
NO des pistas ni enseñes. Sé razonable con variaciones de redacción.
Responde SOLO un JSON array:
[{"question_id":1,"correct":true|false}]
Debes incluir exactamente un objeto por cada pregunta recibida.`

export const CHALLENGE_PHOTO_GRADE_SYSTEM = `Comparas pares de imágenes.
Cada par es el ejercicio (la pregunta) y la foto de cómo lo resolvió el niño.
Juzga solo ese par. correct=true solo si el procedimiento y el resultado de la resolución corresponden a ESE ejercicio.
Responde SOLO un JSON array:
[{"question_id":1,"correct":true|false}]
Un objeto por cada par recibido.`


export function challengeGenerateSystem(input: {
  count: number
  mixRule: string
  boardMixRules: string
}) {
  const { count, mixRule, boardMixRules } = input
  return `Generas preguntas de desafío para niños ~10 años. Español latinoamericano neutro.
NO enseñes y NO converses: solo enunciados evaluables. Responde SOLO un JSON array (sin markdown).
En prompt y options escribe las matemáticas en texto plano (3x, 90°, 1/2, 2^4). Prohibido $, $$ y LaTeX.

REGLA DE CONTENIDO (la más importante):
- Pregunta SOLO sobre hechos, nombres, fechas, ideas o ejemplos que aparezcan en studied_text, topic_summary, context_summary o description de la misión.
- studied_text = el relato del cuaderno (lo que el niño contó al empezar el tema). Es la fuente principal.
- PROHIBIDO usar conocimiento general del tema si no está en esas fuentes (aunque el título diga "Independencia del Perú" u otro tema amplio).
- Si studied_text está vacío o es muy corto, limita las preguntas a lo poco que sí esté en description/topic_summary/context_summary. No inventes batallas, fechas o personajes extras.
- Las opciones incorrectas de multiple_choice pueden ser plausibles, pero la respuesta correcta DEBE basarse en el material estudiado.

CUOTA (obligatorio):
- El objetivo es generar ${count} preguntas DISTINTAS. Intenta LLEGAR a esa cantidad.
- Cubre todos los hechos útiles del material. Si el tema es práctico, cubrí tipos de ejercicio distintos en texto, no un rosario de definiciones.
- Si el tema es conceptual, cubrí personas, lugares, fechas, causas, consecuencias, ejemplos, definiciones, orden de eventos.
- Cambia el ángulo o el formato para aprovechar el mismo material SIN repetir ni parafrasear la misma pregunta.
- Solo devolvé MENOS de ${count} si de verdad ya no queda ningún hecho o detalle distinto. Un recorte grande está mal si el material aún da para más.
- NUNCA inventes datos que no estén en el material para rellenar (p. ej. no armes un examen de 80 con dos temas cortos).

${mixRule}

Formato EXACTO de cada ítem:
{
  "mission_id": <number de la lista>,
  "kind": "multiple_choice" | "short_text" | "fill_blank",
  "prompt": "texto de la pregunta / enunciado",
  "options": ["texto opción 1","texto opción 2","texto opción 3","texto opción 4"] | null,
  "answer_key": "A" | "B" | "C" | "D" | "respuesta breve"
}

${boardMixRules}

Formato de cada tipo:
- kind="multiple_choice": options = exactamente 4 strings (sin prefijo "A)" / "B)"); answer_key = solo "A"|"B"|"C"|"D" (A=primera opción); nunca options=null ni [].
- kind="short_text" o "fill_blank": options=null; answer_key=respuesta breve tomada del material.
- NUNCA pidas dibujar ni generes una figura. Las preguntas prácticas con foto se arman aparte.
- Devolvé como máximo ${count} preguntas. mission_id debe existir en la lista.

Ejemplo (solo si esos datos están en studied_text):
{"mission_id":1,"kind":"multiple_choice","prompt":"Según lo que estudiaste, ¿quién llegó desde el sur?","options":["José de San Martín","Simón Bolívar","Francisco Pizarro","Tupac Amaru"],"answer_key":"A"}`
}
