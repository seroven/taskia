# El lienzo ya no existe

Estudio, misión y desafío son solo chat. No hay cuadrícula, no se generan imágenes de ejercicios y no queda el motor de escena.

No queda marca de tema práctico. Entrar a estudiar abre el chat.

El Campamento no es este lienzo: es la lista del día en `BoardPage` (tres estados, sin kanban).

## Estudio y misión

Si la clasificación dice que pide ayuda, una revisión o un ejercicio nuevo, el desarrollo privado (`exercise_brief`) resuelve el procedimiento y el resultado, lo guarda y el chat lo usa sin dictarlo. Una foto que no es eso la ve el tutor en ese turno y no queda guardada como desarrollo. Vive en `taskia_backend/src/modules/exercises/`.

Si pide un ejercicio nuevo, una pasada corta (`needsGraphic`) mira el referente:

- Si hace falta figura, tabla o dibujo, no se genera nada. El chat dice: «Ese ejercicio lleva un dibujo y yo no puedo armarlo. Si me mandas la foto de uno parecido, te ayudo con gusto.»
- Si basta con texto o números, el tutor lo escribe en el mensaje.

El dominio del estudio es el del chat: piso de turnos y «Errores: N». El de la misión es el del cuaderno: diez turnos y «Errores: N».

## Desafío

Las preguntas nuevas son de texto o de opción. Ya no se arman desde las fotos del cuaderno.

Si un desafío ya guardado trae `reference_image_url`, el juego sigue mostrando esa foto. La opción se coteja en el servidor. Si además hay foto de la resolución, `kind = challenge_photo_grade` mira el par y la pregunta cuenta bien solo si coinciden las dos.

El reloj (`elapsed_ms`, `progress_json`) y el factor de XP siguen igual.

`llm_usage.kind = board_image` se borra. El panel ya no tiene la serie Imágenes.
