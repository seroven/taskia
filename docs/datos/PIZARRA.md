# Cómo funciona la pizarra

La pizarra de estudio, misión y desafío es el mismo lienzo. Taskia no dibuja formas. El niño escribe, traza líneas y usa el pincel. Si el ejercicio es solo texto, el servidor lo deja fijo. Si hace falta una gráfica, Gemini genera una imagen fija.

El motor de escena (`taskia_backend/src/modules/board/`, hechos, solver y primitivas) sigue en el repo y tiene tests, pero estudio, misión y desafío ya no lo llaman.

## Lienzo

El componente es `taskia_frontend/src/components/study/GridBoard.tsx`. La cuadrícula se ve, con celdas de 18 px. No hay menú de formas ni sellos.

- Un clic en el vacío abre un texto. Cada letra del niño ocupa un cuadrito. Arrastrar el fondo desplaza la vista. La rueda acerca y aleja el punto bajo el cursor; el porcentaje queda abajo a la derecha. Al pasar el cursor en modo selector, lo que se puede mover se resalta. Arrastrar en el vacío marca un recuadro y selecciona lo que queda dentro; si hay varios marcados, se mueven juntos. Ctrl+clic suma o quita uno. La vista se desplaza con el botón del medio o manteniendo espacio.
- Una línea sale en cualquier ángulo. Si queda a unos 6° de horizontal o vertical, se endereza y se ve una guía corta.
- El pincel libre es un solo trazo. Texto, línea y trazo del niño se arrastran enteros.
- Los textos del niño usan Fredoka (`--font-display`). El selector de color vale solo para lo que escribe el niño.
- Lo de Taskia va en una capa fija, debajo, que no se mueve ni se borra. Una petición nueva de ejercicio reemplaza esa capa.

## Texto o imagen

Antes de generar, una pasada corta (`needsGraphic` en `sheet.ts`) mira el referente y responde solo si hace falta gráfica.

- El referente es el enunciado escrito, si el ejercicio es eso, o la foto, si al leerla hay gráficos.
- Sin referente en ese estudio o esa misión, no se genera ejercicio: Taskia pide un ejemplo.
- Si no hace falta gráfica, el tutor redacta el enunciado en `board_text`. El servidor lo coloca como texto fijo y también va en el mensaje. No hay imagen.
- Si hace falta gráfica, `callGeminiImage` usa la misma API key y el modelo de `GEMINI_IMAGE_MODEL`. La hoja es de fondo claro y tinta oscura. Se lee igual en claro y en oscuro, y no se vuelve a pintar si cambia el tema. La imagen va adjunta al mensaje y, la misma, fija en la pizarra.
- En un desafío el referente es el enunciado que acaba de armar el generador. Se guarda en `prompt_draw_ops` como `{ text }` o `{ imageSrc }`.

La frase «Te lo dibujé en la pizarra» no sale de este flujo.

## Calificar

En estudio y misión, la IA lee la captura de la pizarra o la foto del cuaderno y decide si el ejercicio está bien. El visto sigue exigiendo dos ejercicios resueltos solo, de inicio a fin. Al notar que entendió, pregunta si quiere otro tipo. `passed` queda en true solo si dice que no. El veredicto numérico del motor de escena ya no apaga ese visto.

En un desafío de pizarra se puede mandar una foto del cuaderno además de la captura. La calificación mira las dos. No hace falta haber dibujado en la pizarra si la foto trae la resolución.

## Reloj del desafío

Salir no borra el intento: sigue `in_progress`. Se guardan el índice, las respuestas, la pizarra y el tiempo (`elapsed_ms`, `progress_json`, migración `007`). El reloj corre solo con la pantalla abierta y visible. Al salir o al ocultar la pestaña se suma lo corrido y se congela. No hay tiempo límite.

Empezar otro desafío mientras hay uno a medias no lo borra: se ofrece continuar o descartarlo a propósito.

La experiencia es `base * (acierto / 100) * (esperado / tardado)`. `esperado` son 90 segundos por pregunta. Ese factor queda entre 0,7 y 1,15. El piso del 5 % de la base se aplica después.
