import { SCENE_DRAW_PROMPT } from '../modules/board/prompt.js'

export const CHALLENGE_BOARD_DRAW_OPS = `Enunciado en pizarra (solo si kind=board_prompt y requires_board=true):
${SCENE_DRAW_PROMPT}
Esto NO es un tutor: no converses, no des pistas, no dibujes la solución.
scene = lo que el niño DEBE VER. draw_ops siempre [].
Ecuación o cálculo: un objeto expression con el texto exacto.
Geometría: la forma (rectangle, right_triangle, regular_polygon, path), no un recuadro de adorno.
Si requires_board=false: scene=null y draw_ops=[].
`

export const CHALLENGE_GRADE_SYSTEM = `Juzgas si las respuestas del niño son correctas según answer_key.
NO des pistas ni enseñes. Sé razonable con variaciones de redacción.
Para preguntas de pizarra (requires_board=true):
- El niño NO conversó con un tutor. Solo dibujó la resolución y, a veces, dejó una nota breve.
- Si code_verdict es "unverifiable", la imagen solo da contexto de trazos libres. No afirmes una medida exacta. correct=true solo si la nota coincide con answer_key.
- Distingue el enunciado de Taskia de lo que agregó el alumno.
- correct=true solo si el alumno resolvió el problema, no por copiar el enunciado.
Responde SOLO un JSON array:
[{"question_id":1,"correct":true|false}]
Debes incluir exactamente un objeto por cada pregunta recibida.`

export const CHALLENGE_STATEMENT_DRAW_SYSTEM = `Dibujas el ENUNCIADO de problemas de pizarra para niños ~10 años.
NO dibujes la solución. NO enseñes. Responde SOLO un JSON array.
Cada ítem: {"index":0,"scene":{...}}
${SCENE_DRAW_PROMPT}
Si el prompt es una ecuación, la escena lleva un expression con ese texto.
Incluye exactamente un objeto por cada problema recibido.`


export function challengeGenerateSystem(input: {
  count: number
  mixRule: string
  boardMixRules: string
}) {
  const { count, mixRule, boardMixRules } = input
  return `Generas preguntas de desafío para niños ~10 años. Español latinoamericano neutro.
NO enseñes y NO converses: solo enunciados evaluables. Responde SOLO un JSON array (sin markdown).

REGLA DE CONTENIDO (la más importante):
- Pregunta SOLO sobre hechos, nombres, fechas, ideas o ejemplos que aparezcan en studied_text, topic_summary, context_summary o description de la misión.
- studied_text = el relato del cuaderno (lo que el niño contó al empezar el tema). Es la fuente principal.
- PROHIBIDO usar conocimiento general del tema si no está en esas fuentes (aunque el título diga "Independencia del Perú" u otro tema amplio).
- Si studied_text está vacío o es muy corto, limita las preguntas a lo poco que sí esté en description/topic_summary/context_summary. No inventes batallas, fechas o personajes extras.
- Las opciones incorrectas de multiple_choice pueden ser plausibles, pero la respuesta correcta DEBE basarse en el material estudiado.

CUOTA (obligatorio):
- El objetivo es generar ${count} preguntas DISTINTAS. Intenta LLEGAR a esa cantidad.
- Cubre todos los hechos útiles del material. Si el tema se resuelve en pizarra, cubrí tipos de ejercicio distintos (números o casos distintos), no un rosario de definiciones.
- Si el tema es conceptual, cubrí personas, lugares, fechas, causas, consecuencias, ejemplos, definiciones, orden de eventos.
- Cambia el ángulo o el formato para aprovechar el mismo material SIN repetir ni parafrasear la misma pregunta.
- Solo devolvé MENOS de ${count} si de verdad ya no queda ningún hecho o detalle distinto. Un recorte grande está mal si el material aún da para más.
- NUNCA inventes datos que no estén en el material para rellenar (p. ej. no armes un examen de 80 con dos temas cortos).

${mixRule}

Formato EXACTO de cada ítem:
{
  "mission_id": <number de la lista>,
  "kind": "multiple_choice" | "short_text" | "fill_blank" | "board_prompt",
  "prompt": "texto de la pregunta / enunciado",
  "options": ["texto opción 1","texto opción 2","texto opción 3","texto opción 4"] | null,
  "answer_key": "A" | "B" | "C" | "D" | "respuesta breve o criterio",
  "requires_board": true | false,
  "scene": null,
  "draw_ops": []
}

${boardMixRules}

Formato de cada tipo:
- kind="multiple_choice": options = exactamente 4 strings (sin prefijo "A)" / "B)"); answer_key = solo "A"|"B"|"C"|"D" (A=primera opción); nunca options=null ni []; requires_board=false; draw_ops=[].
- kind="short_text" o "fill_blank": options=null; answer_key=respuesta breve tomada del material; requires_board=false; draw_ops=[].
- kind="board_prompt": options=null; answer_key=criterio breve de corrección; requires_board=true; scene=null; draw_ops=[] (el dibujo del enunciado se arma después, sin coordenadas).
- Si requires_board=false: scene=null y draw_ops=[].
- Devolvé como máximo ${count} preguntas. mission_id debe existir en la lista.

Ejemplo teórica (solo si esos datos están en studied_text):
{"mission_id":1,"kind":"multiple_choice","prompt":"Según lo que estudiaste, ¿quién llegó desde el sur?","options":["José de San Martín","Simón Bolívar","Francisco Pizarro","Tupac Amaru"],"answer_key":"A","requires_board":false,"draw_ops":[]}
Ejemplo pizarra (solo si el tema se resuelve en el lienzo):
{"mission_id":1,"kind":"board_prompt","prompt":"Resuelve en la pizarra: x + 5 = 12","options":null,"answer_key":"7","requires_board":true,"scene":null,"draw_ops":[]}`
}
