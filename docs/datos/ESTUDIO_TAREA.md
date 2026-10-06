# Estudio de una tarea con pizarra

Este documento es el flujo de un turno de chat cuando la tarea usa pizarra. Los prompts están copiados del código. Misión y desafío no entran aquí. El motor de escena no se llama.

Los modelos salen de `taskia_backend/src/config/env.ts`:

- `GEMINI_MODEL` (si falta, `gemini-2.0-flash`): intención, desarrollo privado, «¿hace falta gráfica?» y el chat.
- `GEMINI_PRO_MODEL` (si falta, `gemini-3-pro-image`): solo la imagen del ejercicio.
- La misma `GEMINI_API_KEY` sirve para todos.

## Qué manda el navegador

`StudyPage` arma `POST /study/:id/chat` (`api.studyChat`).

| Campo | Qué es |
| --- | --- |
| `user_message` | Lo que escribió, o el texto ya transcrito si habló. |
| `from_voice` | `true` si ese texto salió del micrófono. |
| `photo_base64` | Foto que adjuntó en el chat (cuaderno o enunciado). |
| `board_image_base64` | PNG de la pizarra, solo si hay trazos del niño. |
| `board_description` | Texto de respaldo de esos trazos. El servidor lo usa solo si no hay PNG. |
| `board_json` | La escena. Este POST no la lee. La pizarra se guarda aparte con `PUT /study/:id/board`. |
| `allow_ai_draw` | El cliente lo manda en `false`. El servidor no lo lee. |

La captura (`getBoardAttachment`) cuenta solo ítems del niño. Si la pizarra solo tiene la ficha de Taskia, no se adjunta imagen ni descripción. Si hay trazos, se exporta un PNG (lado máximo 1280). La descripción viaja en el cuerpo, pero el tutor no la recibe cuando el PNG está presente.

Abrir la sesión (`GET /study/:id`) no llama a Gemini. Si no hay mensajes, el servidor escribe un saludo local con el título y, si existe, los primeros 160 caracteres de la descripción.

## Orden de un turno

1. Se guarda el mensaje del niño (y la foto en Cloudinary, si vino).
2. Intención (`board_intent`), siempre en una tarea con pizarra.
3. Desarrollo privado (`board_facts`), solo si toca resolver el ejercicio.
4. Ficha, solo si la intención pidió un ejercicio nuevo: primero «¿hace falta gráfica?» (`board_facts`) y, si sí, la imagen (`board_image`).
5. Chat (`task_tutor`), con lo que quedó de los pasos anteriores.

La voz es una llamada previa, `POST /study/transcribe` (`transcribe`). Su texto entra después como `user_message`.

## 1. Voz

Modelo: `GEMINI_MODEL`. `llm_usage.kind`: `transcribe`.

System:

```
Eres un transcriptor fiel para una app de estudio infantil (español latinoamericano).
Tu ÚNICA tarea es transcribir el audio completo del niño o la niña.

Reglas:
- Devuelve SOLO el texto hablado, en español.
- Transcribe TODO el audio de principio a fin. No resumas. No omitas el final ni cortes a mitad de frase.
- Incluye citas o frases largas enteras si el niño las lee o las dice.
- No inventes contenido que no se escuche.
- No agregues títulos, comillas envolventes del bloque, markdown ni comentarios ("Aquí está la transcripción…").
- Corrige puntuación básica y mayúsculas para que se lea bien, sin cambiar el sentido.
- Si hay muletillas claras (eh, este, o sea), puedes suavizarlas solo si no aportan.
- Si el audio está vacío, es ruido o no se entiende casi nada, responde exactamente: (no se entendió)
- Si solo se entiende una parte, transcribe esa parte y no rellenes el resto; pero si se entiende el resto, inclúyelo completo.
```

User, y después el audio en `inline_data`:

```
Transcribe TODO este audio de un niño o niña explicando o leyendo un tema de estudio, de principio a fin, sin resumir ni cortar el final. Duración aproximada: N s.
```

La frase de duración se agrega solo si el cliente mandó `duration_seconds`. Salida hasta 8192 tokens, temperatura 0.1. No es JSON.

## 2. Intención

Modelo: `GEMINI_MODEL`. `kind`: `board_intent`. Sin imágenes. Temperatura 0, máximo 80 tokens, JSON.

System (`BOARD_INTENT_SYSTEM`):

```
Clasifica el mensaje de un niño sobre la pizarra.
Responde SOLO este JSON, sin texto extra:
{"review_drawing":false,"draw_exercise":false,"help_exercise":false}
review_drawing=true solo si pide que miren, revisen o corrijan SU dibujo o SU respuesta.
draw_exercise=true solo si pide que le pongan un ejercicio, figura o enunciado nuevo.
help_exercise=true si pide ayuda para entender o resolver un ejercicio (aunque mande la foto del enunciado).
Una foto de papel no es la pizarra.
"sí", "dale" o "hazlo" se entienden con la frase anterior.
Si no pide ninguna, los tres false. Pueden ser true varios.
```

User, un JSON:

```json
{"previous":"...","message":"..."}
```

`previous` es la última burbuja de Taskia, recortada a 180 caracteres. `message` es el turno del niño, recortado a 400. No entra la foto, ni la pizarra, ni el resumen.

Si la llamada falla, los tres quedan en `false`.

Esas tres banderas deciden el resto:

- `draw_exercise`: se intenta una ficha nueva.
- `help_exercise` y `review_drawing`: deciden si se resuelve el ejercicio en privado y si la foto llega al chat.
- `review_drawing`: la captura de la pizarra sí se manda al chat. Si no, se tira aunque el navegador la haya enviado.

## 3. Desarrollo privado

Modelo: `GEMINI_MODEL`. `kind`: `board_facts`. Se llama solo si `planExerciseMemory` dice `solve`.

`solve` es verdadero en alguno de estos casos:

- Pide ayuda, hay foto en este turno y no está pidiendo que revisen su trabajo. Ahí se resuelve aunque ya hubiera un desarrollo guardado.
- Todavía no hay desarrollo, y pide ayuda o hay foto.

La foto de esta llamada es la de este turno. Si este turno no trae foto, se baja la última imagen `https://` de cualquier mensaje de la sesión, también la ficha que generó Taskia. El texto es el mensaje del niño, recortado a 2000 caracteres.

System (`EXERCISE_BRIEF_SYSTEM`):

```
Eres el cuaderno privado de Taskia. El niño no lee esto.
Analiza el ejercicio completo y deja el desarrollo hasta la respuesta correcta.
Responde SOLO JSON:
{"exercise":"","steps":[],"answer":"","attempt":""}
exercise: el enunciado, en texto plano.
steps: el proceso en orden, cada paso una frase corta.
answer: el resultado final, en texto plano.
attempt: lo que el niño ya escribió en la foto, si se ve; si no, "".
Sin signos $, sin LaTeX. Si no hay un ejercicio claro, exercise="" y answer="".
```

User:

```json
{"exercise_text":"..."}
```

La imagen, si hay, va después del texto. Su leyenda es exacta:

```
Ejercicio a resolver de una sola vez. Si ya hay un intento escrito, anótalo aparte y resuelve igual la respuesta correcta.
```

El servidor guarda el resultado en `study_sessions.exercise_brief` y no lo devuelve al navegador. Al chat le llega como `exercise_solution`, armado así y recortado a 2200 caracteres:

```
Enunciado: …
Proceso:
1. …
Respuesta: …
Intento visible: …
```

Se omiten las líneas vacías. Los `$` de fórmula se quitan y queda el texto de adentro. Si no hay enunciado ni respuesta, no se guarda nada.

## 4. ¿Hace falta una figura?

Modelo: `GEMINI_MODEL`. `kind`: `board_facts`. Solo si `draw_exercise` es verdadero y hay referente.

El referente de texto junta la descripción de la tarea y todos los mensajes del niño. Se tira cada trozo de menos de 12 caracteres y estos pedidos cortos: `sí`, `si`, `ok`, `dale`, `ya`, `listo`, `otro`, `un ejercicio`, `dame un ejercicio`, `hazme un ejercicio`, `otro ejercicio`, `uno similar`, `parecido`. Lo que queda se une con saltos de línea y se dejan los últimos 2000 caracteres.

La foto de la ficha es la de este turno. Si no hay, la última imagen `https://` de un mensaje del niño. La ficha que generó Taskia no entra. Sin texto y sin esa foto, no hay llamada: el modo queda en `need_reference`.

System (`GRAPHIC_SYSTEM`):

```
Miras un ejercicio de primaria. Responde SOLO JSON {"graphic":true|false}.
graphic=true solo si hace falta una figura, gráfica, diagrama o dibujo para entender el ejercicio.
graphic=false si basta con el enunciado escrito.
```

User:

```json
{"ejercicio":"...","hay_foto":true}
```

`ejercicio` es el referente, recortado a 2000. `hay_foto` es `true` o `false`.

Si hay foto, va después del JSON. Esta llamada no pone leyenda propia, así que usa la de cualquier foto del chat:

```
Foto del cuaderno. Léela para ver su respuesta. No es la pizarra.
```

Si responde `graphic: false`, o la llamada falla, no hay imagen. El tutor escribe el enunciado.

## 5. Imagen del ejercicio

Modelo: `GEMINI_PRO_MODEL`. El caller pide `board_facts`, pero `callGeminiImage` lo anota siempre como `board_image`.

System (`IMAGE_SYSTEM`):

```
Genera UN ejercicio similar al referente.
Si la imagen de referencia está vertical, el ejercicio va en horizontal.
```

User: el mismo referente de texto. Si ese texto está vacío y sí hay foto:

```
Un ejercicio similar a la captura. Si la foto está vertical, el ejercicio va en horizontal.
```

Si hay foto, después del user va esta leyenda y luego la imagen:

```
Genera un ejercicio similar a esta captura. Si la foto está vertical, el ejercicio va en horizontal.
```

La petición pide `responseModalities: ['TEXT','IMAGE']` y `imageConfig.aspectRatio: '4:3'`. No se manda el desarrollo privado. Si el modelo no devuelve imagen, se cae al modo texto y el tutor redacta el enunciado.

La imagen se sube y queda fija en la pizarra y adjunta al mensaje de Taskia. Una ficha nueva reemplaza esa capa.

## 6. Chat

Modelo: `GEMINI_MODEL`. `kind`: `task_tutor`. Hasta 4096 tokens, JSON. En `gemini-3` el pensamiento va en `low`. En `2.5` el presupuesto de pensamiento es 0 y la temperatura es 0.6. En otros modelos, temperatura 0.6.

System, con pizarra (`tutorSystemPrompt(true)`). Las dos primeras partes son fijas. `SHEET_PROMPT` y el dominio se agregan al final:

```
Eres Taskia, guía de estudio amable para un niño ~10 años. Te llaman Taskia (no digas que eres una IA ni un “tutor”). Español latinoamericano, claro y breve.
No des la solución completa: guía con preguntas/pistas. Prioriza la tarea actual.
Recibes context_summary (esta tarea), last_tutor_message (tu burbuja anterior) y user_memory_summary. No el chat entero.
Mantén coherencia con el ejercicio abierto: si last_tutor_message o context_summary citan un número/ejercicio, NO preguntes de qué número hablan.
Pizarra de entrada: si board_has_drawing=false, ignora lo que haya dibujado el niño.
Si hay imagen adjunta de la pizarra: esa imagen es la fuente de verdad de lo que dibujó el niño (léela para entender su respuesta).
Si photo_attached=true, hay además una foto del cuaderno. Léela y decide si el ejercicio está bien. No es la pizarra.
No hay un veredicto numérico del código: tú miras la captura o la foto.
scene=null y draw_ops siempre [].
Responde SOLO JSON (sin markdown):
{"phase":"understanding|practicing|reviewing","speak_to_child":"...","ask_questions":[],"topic_summary":"...","context_summary":"...","user_memory_summary":"...","exercise":null,"board_text":"","scene":null,"highlight":[],"draw_ops":[],"hints_level":0,"study_eval":{"passed":false,"evidence":"","effort_score":40}}
speak_to_child: mensaje breve que ve el niño. Si preguntas, hazlo SOLO ahí (una pregunta natural en el párrafo). No numeres listas de preguntas. Matemáticas en texto plano (3x, 90°, 1/2). Prohibido $, $$, LaTeX y markdown en speak_to_child y board_text.
Si llega exercise_solution, el ejercicio ya está resuelto ahí. Es privado: no lo copies, no dictes los pasos ni la respuesta. Úsalo para saber qué preguntar y si el niño va bien. No pidas de nuevo la foto de ese ejercicio.
ask_questions: opcional/interno; el niño NO lo ve. Puedes dejar []. No repitas ahí lo mismo que ya dijiste en speak_to_child.
context_summary ≤ 400 chars. Debe incluir SIEMPRE, si hay ejercicio abierto: "Ejercicio activo: …" con el número/datos exactos; no lo borres hasta resolverlo o cambiarlo. Resume aciertos del niño.
user_memory_summary ≤ 600 chars (si update_user_memory=false, repite el recibido).
exercise: usa el objeto cuando planteas un ejercicio nuevo (también en reviewing); si sigues el mismo, puedes dejar null pero conserva "Ejercicio activo" en context_summary.
study_eval.effort_score: entero 1–100 (esfuerzo real del niño). Sé estricto: lo normal es 41–65; 86–95 solo si autonomía y evidencia claras; casi nunca 96–100. Si passed=false, effort_score ≤ 40.
Si study_passed_already=true → study_eval.passed=true y evidence corta "ya aprobado".
Si message_source=voice: el niño habló (audio transcrito). Usa ese relato para afinar topic_summary (de qué trata el tema, ≤120 chars) y context_summary. En speak_to_child, resume en 1 frase lo que entendiste y sigue guiando; no digas que “transcribiste” ni hables de micrófonos.
La pizarra no se dibuja con formas. board_mode viene en el mensaje.
- text: escribe el ejercicio nuevo (otros datos, sin la respuesta) en board_text. El servidor lo deja fijo en la pizarra. Repítelo en speak_to_child. No digas que lo dibujaste.
- image: la imagen del ejercicio ya está lista. board_text="". Habla del ejercicio en speak_to_child. No digas que lo dibujaste.
- need_reference: pide un ejercicio de ejemplo, escrito o en foto. board_text="". No inventes uno.
- none: no hay ejercicio nuevo. board_text="".
scene=null, highlight=[] y draw_ops=[].
Tú decides si el trabajo del niño está bien leyendo la captura de la pizarra o la foto del cuaderno. Si está bien y lo hizo solo, puede sumar a "Solo bien".
Dominio CON PIZARRA (study_eval.passed=true) SOLO si TODOS se cumplen:
1) El niño resolvió 2 problemas DISTINTOS él solo: sin que le dictes la respuesta ni el paso clave, y sin errores. Si se equivoca o lo ayudas a resolverlo, ese intento NO cuenta; plantea otro para que lo intente solo.
2) En context_summary lleva SIEMPRE "Solo bien: N/2" (N = problemas resueltos solo).
3) Cuando N llega a 2, NO marques passed=true en ese mismo turno. Primero, con tono cálido, pregúntale si quiere practicar OTRO TIPO de ejercicio de este mismo tema (un formato distinto). En ese turno passed=false.
4) passed=true SOLO después, si dice que no / que ya está / que no quiere más. Entonces celebra y dile que ya puede mover la tarea a Listo.
5) Si pide más, dale ese otro tipo (passed=false). Cuando cierre y no quiera más, passed=true (los 2 solos ya valen).
6) phase=reviewing. evidence cita los 2 problemas que resolvió solo. Si no puedes citarlos → passed=false.
Por defecto passed=false.
NUNCA digas "mover a Listo" / "márcala Listo" si study_eval.passed es false en ESTE mismo JSON.
```

User: un solo JSON. No se manda el historial. Cada campo se recorta así:

| Campo | De dónde sale | Tope |
| --- | --- | --- |
| `instruction` | Se arma en el servidor. Ver abajo. | — |
| `update_user_memory` | `true` cada 3 mensajes del niño. | — |
| `user_turns` | Cuántos mensajes del niño hay en la sesión, incluido este. | — |
| `study_passed_already` | Si la tarea ya tenía el visto. | — |
| `message_source` | `voice` o `text`. | — |
| `task.title` | Título. | 120 |
| `task.description` | Descripción. | 220 |
| `task.course`, `difficulty`, `difficulty_code` | Tal cual. | — |
| `phase` | Fase guardada de la sesión. | — |
| `topic_summary` | Resumen del tema. | 120 |
| `context_summary` | Memoria de esta tarea. | 400 |
| `last_tutor_message` | Última burbuja de Taskia. | 320 |
| `user_memory_summary` | Memoria del niño, entre tareas. | 600 |
| `hints_level` | El guardado. | — |
| `board_has_drawing` | `true` si, y solo porque pidió revisión, hay PNG, descripción o foto. | — |
| `photo_attached` | `true` si la foto de este turno sí se adjunta a esta llamada. | — |
| `exercise_solution` | El desarrollo privado. Se omite el campo si no hay. | 2200 al guardarlo |
| `child_message` | El mensaje. 4000 si es voz, 800 si es texto. | 800 / 4000 |
| `board_mode` | `none`, `need_reference`, `text` o `image`. | — |
| `board_drawing` | La descripción de la pizarra. Solo si pidió revisión y no hay PNG. | 1600 |

`instruction` empieza así:

```
Responde breve. Conserva el ejercicio activo. Anota "Solo bien: N/2". Evalúa study_eval: 2 problemas resueltos solo; al llegar a 2 pregunta si quiere otro tipo de ejercicio (passed=false); passed=true solo si declina. No dibujes. board_text según board_mode.
```

Se le suma, según el turno:

- Voz: ` El mensaje viene de voz (transcrito): prioriza afinar topic_summary y context_summary con lo que explicó el niño.`
- Foto de revisión: ` El niño adjuntó una foto del cuaderno. Léela y decide si el ejercicio está bien. No es la pizarra.`
- Pidió revisión y no hay captura ni foto: ` Pidió que revises su trabajo, pero no hay captura ni foto. Pídele que escriba en la pizarra o mande una foto.`
- Pidió revisión y sí hay material: ` Mira la captura de la pizarra o la foto y decide si está bien. Si lo resolvió solo, puede sumar a Solo bien.`
- `need_reference`: ` board_mode=need_reference. Pide un ejercicio de ejemplo. No inventes uno.`
- `text`: ` board_mode=text. Escribe el enunciado nuevo en board_text y en speak_to_child. Sin la respuesta.`
- `image`: ` board_mode=image. La imagen ya está hecha. board_text vacío. Habla del ejercicio. No digas que lo dibujaste.`

La foto de este turno llega al chat solo en dos casos: pidió revisión y ya hay desarrollo, o se intentó el desarrollo y no se pudo guardar. Si el desarrollo se guardó en este turno, la foto no se reenvía. Su leyenda, si no hay otra, es:

```
Foto del cuaderno. Léela para ver su respuesta. No es la pizarra.
```

La captura de la pizarra, si se adjunta, lleva esta leyenda:

```
Imagen de la pizarra del niño. Léela para ver su respuesta.
```

Orden de las partes: el JSON, luego el PNG de la pizarra y su leyenda, luego la foto y su leyenda.

## Qué se hace con la respuesta

El niño ve `speak_to_child`, recortado a 450 caracteres. Se le quitan los `$` de fórmula y la frase «Te lo dibujé en la pizarra». `ask_questions` no se muestra.

`passed` se apaga si la fase no es `reviewing`, si no hay `evidence`, si «Solo bien» es menor que 2, o si en ese turno está ofreciendo otro tipo de ejercicio. Si el visto ya existía, se queda en `true`. Si `passed` quedó en `false` y el texto celebra mover la tarea a Listo, esa celebración se recorta.

`board_text` se usa solo en modo `text`. Se recorta a 800 caracteres, se fija en la pizarra y, si el habla no lo incluye, se agrega al mensaje visible. En modo `image`, la pizarra recibe la imagen ya generada y `board_text` se ignora. `scene`, `draw_ops` y `highlight` se descartan.

`context_summary` se guarda a 400 caracteres. Si el modelo devolvió un `exercise`, la línea `Ejercicio activo:` se reescribe con su título (60) e instrucciones (140). La memoria del niño se actualiza solo cuando `update_user_memory` era `true`, y queda en 600 caracteres.
