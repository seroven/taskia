# Cómo funciona la pizarra

Detalle técnico de la pizarra de estudio, misión y desafío. El código manda: si este texto y el código se contradicen, manda el código.

La idea es una sola. Taskia no manda celdas. Describe una **escena** (qué figura, qué medidas, qué relaciones). El servidor la valida, la resuelve y la convierte en objetos de la grilla. El niño edita esa grilla. Lo que dibujó Taskia queda violeta y no se mueve.

## Dónde vive

| Pieza | Ruta |
| --- | --- |
| Motor de escena | `taskia_backend/src/modules/board/` |
| Texto que ve el modelo | `taskia_backend/src/modules/board/prompt.ts` |
| Tutor de tarea | `taskia_backend/src/prompts/study-tutor.ts` y `study.service.ts` |
| Tutor de misión | `mission-tutor.ts` y `world.service.ts` |
| Desafío | `challenge.ts`, `challenge.service.ts`, `challenge-logic.ts` |
| Grilla en el cliente | `taskia_frontend/src/lib/gridBoardModel.ts`, `components/study/GridBoard.tsx` |
| Tests del motor | `taskia_backend/src/modules/board/scene.test.ts` (`npx tsx --test`) |

No hay librería de geometría ni `eval`. El parser de expresiones y el solver son propios.

## Lo que se guarda

Hay tres JSON distintos. No se mezclan.

**Escena.** Lo que describe el modelo. `schemaVersion: 1`, `objects` (máximo 30) y `task` opcional. No trae coordenadas.

**Ítems de grilla (`BoardItem`).** Lo que el motor compiló: celdas, capa `ai` o `student`, color, y para una línea el extremo `endCol` / `endRow`. Los ids de la escena se conservan.

**Tablero del niño (`taskia-grid`).** El estado completo de la pizarra. En una tarea se guarda en `board_json` (TEXT). Incluye `items`, y también la escena ya validada en `scene`, para poder calificar después sin volver a pedírsela al modelo. En un desafío, la figura del enunciado va en `prompt_draw_ops` (JSONB). Ahí cabe un objeto (escena empaquetada) o un array viejo de `draw_ops`.

Un array viejo se sigue dibujando con `applyDrawOpsToGrid`. No se reinterpreta como escena.

## La grilla

160 columnas por 100 filas. Cada celda mide 28 px en el SVG (`GRID_CELL`). El origen de la grilla, al dibujar, es arriba a la izquierda y la fila crece hacia abajo.

La geometría del solver usa el eje Y hacia arriba. Al pasar a celdas, el layout invierte la Y.

La capa `ai` es violeta (`#c026d3`) y el cliente no la arrastra ni la borra. La capa `student` es la del niño. Si un objeto de la escena trae `interactive: true`, nace en la capa del niño (azul), porque el ejercicio pide que esa figura se mueva. El resto nace violeta.

## Un turno de estudio

Solo corre si la tarea usa pizarra.

1. **Intención.** Una llamada corta (`board_intent`) lee el mensaje del niño (máximo 400 caracteres) y la última frase de Taskia (máximo 180). Devuelve `{ review_drawing, draw_exercise }`. Si falla, las dos quedan en falso. La foto del cuaderno no es la pizarra. Las dos banderas pueden ser verdaderas a la vez. El cliente no decide esto: `allow_ai_draw` del cliente se ignora.

2. **Veredicto, si hay que revisar.** El servidor califica el `board_json` que mandó el cliente, o el tablero ya guardado. Ver más abajo. Ese veredicto entra al prompt del tutor como `code_verdict`. El modelo explica. No decide si está bien.

3. **Hechos, solo si hay que dibujar.** Otra llamada (`board_facts`) lee el enunciado o la foto y devuelve hechos. No ve la escena. Los tokens quedan en `llm_usage` con kind `board_facts`. La latencia se escribe en el log como `[board] facts ms=…`, sin el texto del niño. Si el pedido no trae enunciado, esa pasada escribe uno corto. Con foto, los hechos se guardan en `pending_board_facts` y el chat muestra el resumen para confirmar. El dibujo espera el mensaje siguiente (`sí`, `ok`, `dale`, `dibuja`, y unas pocas variantes). Si el niño sigue con otra cosa, esos hechos se descartan. Sin foto, el enunciado y el dibujo salen en el mismo turno, los dos atados a los mismos hechos.

4. **El tutor habla una sola vez.** Recibe los hechos y no puede sumar ni quitar. Su JSON puede traer `scene`, `highlight` y `draw_ops`. `draw_ops` nuevo se pide vacío. No dice que ya dibujó.

5. **La escena se resuelve en código** (`resolveModelScene`). Si `scene` es `null` y no hay hechos, no se dibuja: éxito con cero ítems. Si hay hechos y la escena no los cubre, el código es `MISSING_FACT` y hay hasta 2 reintentos, con los hechos congelados. El reintento manda `{ scene, errors, facts }`. No manda el resumen del estudio ni el texto del niño. Si pide una primitiva que el registro no tiene, el código es `UNSUPPORTED`, no se reintenta y no se sustituye la figura. El log guarda el código, no el mensaje.

6. **La frase la cierra el servidor.** Si la escena pasó la validación y la cobertura, se agrega «Te lo dibujé en la pizarra». Si los reintentos se agotan, o si falta la primitiva, la frase entera queda en «No pude dibujarlo bien, ¿lo armamos juntos?» y la pizarra queda libre. Un hueco (`MISSING_FACT` o `UNSUPPORTED`) se anota en `board_gaps`: fecha, código, `gap_key`, origen (`study`, `mission`, `challenge`) e intentos. Sin usuario y sin texto. `gap_key` se normaliza a minúsculas y `_`, máximo 40; si no queda nada, `other`. Al insertar se borran filas de más de 180 días.

7. **El cliente** sustituye solo la capa violeta con `board_items` (`applyAiItems`) y conserva lo que dibujó el niño. Un `highlight` sin ítems nuevos no borra lo violeta: solo marca ids.

La misión de un mundo usa el mismo motor. El desafío también, con el empaque de más abajo.

## La escena

Ejemplo real, el del test del rectángulo:

```json
{
  "schemaVersion": 1,
  "objects": [
    { "id": "R", "type": "rectangle", "width": 6, "height": 4, "vertexLabels": ["A", "B", "C", "D"] },
    { "id": "M", "type": "midpoint", "of": ["R.A", "R.B"] },
    { "id": "s", "type": "segment", "from": "M", "to": "R.C", "label": "?" }
  ],
  "task": { "type": "enter_value", "target": "length:s", "unit": "cm" }
}
```

`task` hoy solo acepta `type: "enter_value"`. `target` puede ser `length:id`, `perimeter:id`, `area:id`, `angle:id`, o la letra de una expresión (`x`). `claimedAnswer` es lo que el modelo cree. Si el código puede medir y no coincide, la escena se rechaza con `ANSWER_MISMATCH`. Si no se puede medir, el veredicto queda `unverifiable` y Taskia no afirma si está bien o mal.

### Qué puede describir el modelo

Macros, que se expanden a puntos y segmentos antes de validar la geometría:

| Tipo | Qué fija |
| --- | --- |
| `rectangle` | `width` horizontal, `height` vertical. Vértices A abajo-izquierda, B abajo-derecha, C arriba-derecha, D arriba-izquierda. Implica ángulos rectos. |
| `square` | `side`. Mismos vértices que el rectángulo. Los cuatro ángulos son rectos. |
| `right_triangle` | Catetos `a` (AB horizontal) y `b` (AC vertical). Ángulo recto en A. Hipotenusa BC, id `T.e1` si la forma se llama T. Los catetos pueden llevar su medida. La hipotenusa no se rotula: sería la solución. |
| `triangle` | Tres lados `sides` (AB, BC, CA), o dos o tres ángulos en A, B y, si viene, C. Con solo ángulos la base AB vale 6, salvo que venga `base`. El ángulo de un vértice es `angle:T.C`. El tercero no se rotula. |
| `regular_polygon` | `sides` de 3 a 12 y `sideLength`. Primer lado hacia la derecha. |
| `path` | Polígono ortogonal. Primer tramo a la derecha. Cada `turn` es 90°: `left` antihorario, `right` horario. Si no vuelve al origen (tolerancia 0,001), `UNDERDETERMINED`. La L de 6×4 menos un cuadrado de 2×2 es 6, left 2, left 2, right 2, left 4, left 4. Perímetro 20 y área 20, medidos sobre el contorno. |

`rotation`, si viene, son grados antihorarios alrededor del primer vértice.

Forma canónica y relaciones. El solver solo ve esto:

`point`, `segment`, `polygon`, `circle`, `arc`, `angle`, `label`, `caption`, `number_line`, `expression`, `midpoint`, `parallel_to`, `perpendicular_to`, `reflection_of`, `intersection_of`.

Un polígono genérico no trae ángulos rectos implícitos. Hay que declarar sus vértices y, si hace falta, `sides` y `angles`.

Los vértices de una macro se nombran `R.A`, `R.B`, … Los lados generados son `R.e0`, `R.e1`, … Un círculo sin `label` no escribe el radio. `caption` es una frase que no es una ecuación, para no abrir un segundo camino. `expression` es texto matemático. Si no parsea, `BAD_EXPRESSION`.

La cobertura compara los hechos con la escena: tipo de objeto que ya existe, relación, número declarado, etiqueta de texto y la pregunta (`task.target`). Una escena válida pero incompleta no se guarda.

### Expresiones

El parser acepta números, una letra, `+ − * /`, paréntesis y un solo `=`. La coma vale como decimal exacto: `0,5` es `1/2`. Los números son fracciones de enteros grandes, reducidas. Dividir por cero, o pasar de 12 dígitos, es `BAD_EXPRESSION`. Unicode `− × · ÷` se normaliza. Un carácter fuera de esa lista, un nombre de varias letras o algo como `alert(1)` también. No hay `eval`.

Resolver es afín y de una variable: `x + 5 = 12` da `7/1`. Esa respuesta es exacta: lo que el modelo dice haber obtenido tiene que ser la misma fracción. Dos letras no se resuelven como sistema. `x+y` se calcula solo cuando cada letra ya salió de una etiqueta. Una longitud, un área o un perímetro con π sigue siendo aproximado y se compara con `nearly`.

### Circunferencias

El centro sin otra restricción queda en el origen. `point_on_circle` usa `angleDeg` si el enunciado lo da. Si no, los puntos salen del este hacia el antihorario: 0°, 90°, 180°, 270° y después de 36° en 36°. `rotation` en el círculo desplaza esos ángulos y no cambia la respuesta.

`radius` une el centro con un punto. `diameter` con un solo extremo crea el otro como `d.far`. `chord` exige los dos puntos sobre el círculo. `tangent_line` mide dos radios, centrada en el punto de tangencia, y queda perpendicular al radio: el ángulo es `90/1`. Los extremos son `L1.a` y `L1.b`. `secant` alarga un radio más allá de cada punto del círculo. `central_angle` coloca el segundo punto con `degrees` cuando el enunciado lo trae. `inscribed_angle` no acepta la medida: si comparte arco con un central, vale la mitad exacta, y el vértice que nadie ubicó cae en el arco contrario. Si esa mitad no coincide con el ángulo medido en la escena, no se dibuja.

Una etiqueta `3x` es la ecuación `3x = medida exacta`. Cada letra sale de una sola etiqueta. Si aparece en dos y no dan lo mismo, `OVERCONSTRAINED`.

`multiple_choice` va en `task`, de 2 a 5 opciones, y no se dibuja. La respuesta calculada tiene que coincidir con una sola. Si no, `ANSWER_MISMATCH`.

Las marcas (`right_angle`, `equal_side`, `parallel`, `dimension`, `angle_arc`) no entran al solver. Se arman después de pasar a celdas, con tamaño fijo, con línea, flecha y texto. Una marca que contradice la figura es `BAD_SCHEMA`.

### Fracciones, barras y columna

`fraction_bar` dibuja de 2 a 4 barras. Cada una tiene numerador y denominador, el denominador va de 1 a 12 y el numerador no lo pasa. La suma es `value:f` y es una fracción exacta. `2/5 + 1/5` es `3/5`. El resultado no se escribe en la figura.

`bar_chart` tiene de 1 a 10 categorías, etiqueta de hasta 12 caracteres y valor entero desde 0. La altura es solo el dibujo. `total:c` suma los datos y `diff:c:Martes:Lunes` resta esas dos. El eje usa pasos 1, 2, 5 o 10.

`column_op` suma dos enteros. Dibuja las cifras, el signo y la línea, y deja vacías las celdas del resultado. `347 + 285` se califica como `value:op` igual a 632. No hay modo de revelar la cuenta.

## El pipeline

`prepareScene` corre en este orden. El primero que falla corta.

1. **Esquema** (`schema.ts`). Tipos, ids, tamaños positivos, referencias con forma de id. Un objeto mal formado es `BAD_SCHEMA`. Un tipo que el registro no tiene es `UNSUPPORTED` y no entra a reintento.

2. **Expansión** (`expand.ts`). Cada tipo tiene un expansor en un mapa (`registerExpander`). Una macro emite puntos con coordenada, segmentos de cada lado y un polígono. Tope de 80 objetos canónicos.

3. **Solver** (`solve.ts`). Constructivo, no numérico. Recorre las relaciones hasta 40 pasadas: punto medio, intersección de dos segmentos, paralela y perpendicular (el extremo queda en `id.end`), reflexión de un punto sobre un segmento, y el polígono genérico (primer lado al este; el giro interior es 180° menos el ángulo declarado). Un segmento con `length` que no coincide con la distancia resuelta es `SIDE_MISMATCH`. Un polígono que no cierra, o cuyo ángulo contradice la construcción, es `OVERCONSTRAINED`. Un id que no existe, o un ciclo, es `BAD_REFERENCE`. Lo que se queda sin coordenada es `UNDERDETERMINED`.

4. **Compilado** (`layout.ts`). Los puntos, en unidades de la escena, pasan a celdas. Margen de 10. La escala es la menor entre «que quepa en la grilla» y **8 celdas por unidad**. Una figura chica no se estira hasta llenar la hoja. Una figura grande se achica hasta entrar. El bloque queda centrado. La Y se invierte. Círculos se dibujan como elipses usando el punto cardinal este para el radio. Una recta numérica no usa esa escala: es una línea horizontal de margen a margen, con marcas. Una expresión o un caption se centra. Si la escena también tiene puntos, el texto baja al margen superior.

5. **Respuesta** (`measure.ts`). Medidores registrados, el primero que entiende el `target` gana. Longitud de un segmento, perímetro (suma de lados, o `2πr`), área (fórmula del cordón, o `πr²`), ángulo en grados, o la letra de una expresión. Un target que nadie entiende es `unverifiable`.

6. **`claimedAnswer`.** Solo se compara si hubo un número. La tolerancia de construcción es `nearly`: 0,02, o la milésima de la magnitud, lo que sea mayor.

Etiquetas: se intentan hasta 6 huecos. Si no hay sitio, `LABEL_OVERLAP` y esa escena no se dibuja.

Códigos: `BAD_SCHEMA`, `BAD_REFERENCE`, `SIDE_MISMATCH`, `LABEL_OVERLAP`, `OUT_OF_BOUNDS`, `ANSWER_MISMATCH`, `UNDERDETERMINED`, `OVERCONSTRAINED`, `BAD_EXPRESSION`, `MISSING_FACT`, `UNSUPPORTED`. Al modelo le llegan como máximo 8, y solo `code` más `objectId`. `UNSUPPORTED` no se reintenta.

## Veredicto al revisar

`gradeBoard` vuelve a medir la escena guardada en el tablero. No usa la foto.

- Busca un número en los textos de la capa del niño, o en el mensaje. Si hay varios, se queda con el más cercano al esperado.
- Si no hay número, mide trazos del niño y los pasa a unidades usando un segmento violeta de la escena como escala. Sin esa escala, no califica.
- `correct` o `incorrect` si el valor cae cerca. Además de `nearly`, acepta un error de mano: el mayor entre 0,5 y el 12 % del esperado.
- Si no hay forma de saberlo, `unverifiable`.

Un `incorrect` no deja `study_passed` en true en ese turno, salvo que la tarea ya estuviera aprobada. Si el resumen subió «Solo bien: N/2», lo devuelve al N anterior. Un acierto no aprueba la tarea solo: siguen haciendo falta los dos problemas de siempre.

La foto de la pizarra (PNG) solo se manda al modelo si se está revisando, el veredicto es `unverifiable` y no hay foto de papel. Sirve de contexto de un trazo libre, no de un número exacto. La foto del cuaderno (Cloudinary, `image_url`) también deja el veredicto en `unverifiable`.

## Desafíos

Las preguntas se generan primero con `scene: null`. Después, una pasada de hechos lee cada enunciado y otra pide la escena, con esos hechos congelados. Hasta 3 intentos en el lote (el primero más 2). `UNSUPPORTED` no sigue reintentando: queda el enunciado como `expression` o `caption`, no otra figura. Una escena válida y completa se guarda como `{ ...escena, items }`. Un array viejo que todavía calza con el enunciado se conserva. Si no hay escena válida, el fallback es el mismo: una `expression` con el texto del problema, o un `caption` si ese texto no es una ecuación.

Al jugar, `figureToScene` distingue el array viejo del objeto con `items`. Al corregir, si `prompt_draw_ops` es una escena, `gradeBoard` califica. `correct` e `incorrect` no llaman al modelo. `unverifiable` sí, con la imagen como contexto y la consigna de no afirmar un número exacto.

## La barra del niño

Siempre la misma, haya escena o no.

- Principal: Mover (arrastrar el fondo desplaza; tocar una forma propia la selecciona), Formas (rectángulo, círculo, triángulo, línea, flecha), Texto, Color.
- Esquina, fuera de ese conteo: deshacer, rehacer, zoom, papelera. El historial guarda hasta 40 estados. Atajos: Ctrl/Cmd+Z y Ctrl/Cmd+Shift+Z o Ctrl+Y.
- Junto al objeto seleccionado, si es uno y es del niño: «Tu medida», que escribe `item.text`.

No hay sellos ni lápiz libre. El arrastre de una forma violeta no existe. Resaltar es una clase CSS (`grid-board-highlight`) sobre el mismo dibujo, sin recalcular la geometría.

## Qué este motor no hace

No hay círculo de fracciones, tabla, pictograma ni material de base diez. El catálogo del prompt está escrito en `prompt.ts`. Un test falla si un expansor registrado no aparece ahí con su nombre. El registro (`registerExpander`, `registerMeasurer`) existe para que una primitiva nueva sume su expansor y su medidor sin reescribir el solver. Taskia dibuja el enunciado, no la solución.
