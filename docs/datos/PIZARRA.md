# El lienzo ya no existe

Estudio, misión y desafío son solo chat. No hay cuadrícula, no se generan imágenes de ejercicios y no queda el motor de escena.

`study_missions.uses_board` sigue en la base. Ya no abre un lienzo: marca un tema práctico (figuras, tablas o un procedimiento). En la interfaz se dice «tema práctico». En las tareas esa marca se quitó: entrar a estudiar abre el chat.

El tablero del Campamento no es este lienzo. `tasks.board_order` y `BoardPage` siguen ordenando las tarjetas.

## Estudio y misión

Si el niño manda una foto o pide ayuda, el desarrollo privado (`exercise_brief`) resuelve el procedimiento y el resultado, lo guarda y el chat lo usa sin dictarlo. Vive en `taskia_backend/src/modules/exercises/`.

Si pide un ejercicio nuevo, una pasada corta (`needsGraphic`) mira el referente:

- Si hace falta figura, tabla o dibujo, no se genera nada. El chat dice: «Ese ejercicio lleva un dibujo y yo no puedo armarlo. Si me mandas la foto de uno parecido, te ayudo con gusto.»
- Si basta con texto o números, el tutor lo escribe en el mensaje.

El dominio del estudio es el del chat: piso de turnos y «Errores: N». El de la misión es el del cuaderno: diez turnos y «Errores: N», también en un tema práctico.

## Desafío

Un tema que no es práctico sigue con preguntas de texto o de opción.

En un tema práctico la mezcla se mantiene, cerca de una teórica por cada diez prácticas. La práctica sale de fotos que el niño ya subió en esa misión (`role = user`). No se repite la misma foto y no se inventa una figura. Si no alcanzan fotos, esas preguntas quedan teóricas.

Una llamada de texto, con esas fotos, escribe el enunciado, cuatro opciones y la clave. Queda en `reference_image_url`, `options_json` y `answer_key`.

En el juego se ve la foto, el enunciado y las opciones. Para seguir hay que marcar una opción y subir la foto de cómo lo resolvió. La opción se coteja en el servidor. Las fotos van en otra llamada, `kind = challenge_photo_grade`: cada par es la imagen del ejercicio y la resolución, y el veredicto es solo de ese par. La pregunta cuenta como bien solo si las dos cosas coinciden.

El reloj (`elapsed_ms`, `progress_json`) y el factor de XP siguen igual.

Las filas viejas de `llm_usage` con `kind = board_image` se conservan. El panel las muestra en Imágenes. Ya no se escriben filas nuevas de ese tipo.
