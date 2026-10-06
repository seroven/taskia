# Estudio de una tarea

Un turno de chat cuando el niño estudia una tarea. El estudio es solo conversación: no hay lienzo ni generación de imágenes. La misión usa el mismo criterio de ejercicios y el dominio del cuaderno. El detalle del desafío práctico está en [PIZARRA.md](PIZARRA.md).

El modelo es `GEMINI_MODEL`. La misma API key. No hay modelo de imagen.

## Qué entra en el turno

`POST /study/:taskId/chat` manda el mensaje, si vino por voz, y la foto de este turno si la hay.

No se manda una escena ni un dibujo. La foto del cuaderno se sube a Cloudinary y su URL queda en el mensaje.

## Llamadas, en orden

1. Intención (`board_intent`). Sirve para notar «dame un ejercicio» aunque no haya foto.
2. Desarrollo privado (`board_facts`), si hay una foto de este turno o una ya guardada y todavía no hay `exercise_brief`. Resuelve el procedimiento y el resultado. No se le muestra al navegador. Los turnos siguientes no reenvían esa foto: usan el texto guardado.
3. ¿Hace falta gráfica? (`board_facts`), solo si pidió un ejercicio nuevo. Mira el referente escrito o la foto que subió el niño.
4. El tutor (`task_tutor`). Una sola llamada de texto.

## Si pide un ejercicio nuevo

- Sin referente, se le pide un ejemplo.
- Si hace falta figura, tabla o dibujo, el servidor fija esta frase y el modelo no puede inventar el ejercicio: «Ese ejercicio lleva un dibujo y yo no puedo armarlo. Si me mandas la foto de uno parecido, te ayudo con gusto.»
- Si basta con texto o números, el tutor lo escribe en `speak_to_child`. Otros números solo si el ejemplo ya los tiene. No da la respuesta y no dice que lo dibujó.

## Dominio

`study_eval.passed` solo si está en `reviewing`, el niño ya mandó al menos `6 + Errores` turnos, respondió de verdad y no se le dictó la solución. No se pregunta si quiere otro tipo. Si ya cumple, se le dice que puede mover la tarea a Listo.

El texto visible es `speak_to_child`. Se le quitan los `$` de fórmula.
