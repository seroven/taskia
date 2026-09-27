# Taskia

Taskia es una app de estudio para un alumno (o varios) y un adulto que los acompaña: padre, madre, tutor o docente. El alumno trabaja; el adulto configura el terreno y mira cómo va, sin mezclarse en el mismo tablero.

No es un chat suelto con una IA ni un kanban genérico. La idea es un ciclo cerrado: **materias → tareas o temas → estudiar con un tutor → demostrar que se entendió → (en mundos) ponerse a prueba con un desafío**. El tutor no regala la respuesta: guía, pregunta y solo da el visto cuando hay evidencia real.

El tono de la app está pensado para un niño de alrededor de 10 años: español latinoamericano, claro y breve. El adulto ve números, tablas y el detalle de lo que pasó.

---

## Tres roles, tres entradas

Al iniciar sesión, cada rol entra a un mundo distinto.

**El explorador** (`user`) ve el tablero de tareas, el modo estudio y los mundos. Puede cambiar su usuario, correo y contraseña, y elegir tema claro/oscuro y color de acento. No puede crearse la cuenta solo: el registro público está cerrado a propósito.

**El administrador** (`admin`) no usa el tablero. Entra al panel: dashboard de exploradores, fichas, materias, mundos, desafíos y el módulo de **guardianes** (crear, vincular, desvincular).

**El guardián** (`parent`) acompaña a uno o más exploradores vinculados por el admin. Entra a un panel propio: chat con la IA sobre el resumen del día, progreso en solo lectura y preferencias de avisos WhatsApp. No edita el tablero del explorador.

Si el admin pausa una cuenta, esa persona no puede entrar hasta que la reactiven.

---

## Cómo se pone en marcha (proceso)

Esto es el orden natural la primera vez:

1. Existe (o se crea) la cuenta del adulto.
2. El adulto crea al alumno: usuario, correo y contraseña.
3. El adulto le asigna **materias** (cursos). Sin materias, el alumno no puede armar tareas ni agregar cursos a un mundo.
4. El alumno inicia sesión.
5. A partir de ahí hay dos caminos que conviven:
   - **Tareas** del día o de un proyecto (el tablero).
   - **Mundos** de estudio (temas que se practican y se desafían).

Las materias son del alumno, no del mundo. El adulto las da; el alumno las usa en el tablero y, si quiere, las mete en uno o más mundos.

El adulto puede copiar materias de un alumno a otro (por ejemplo, hermanos en el mismo grado) en lugar de cargarlas otra vez. Las materias se pueden archivar: dejan de aparecer para tareas nuevas, pero el historial no se borra.

---

## El tablero de tareas

Es la casa del alumno. Cuatro columnas:

| Columna | Qué significa |
| --- | --- |
| **Pendiente** | Todavía no la tocó (o la devolvió atrás). |
| **En proceso** | Ya la empezó, sin tutor. |
| **En estudio** | Está (o estuvo) con el tutor. |
| **Terminado** | Listo. En algunos casos hace falta el visto del tutor. |

Puede arrastrar tarjetas entre columnas, filtrar por fecha de creación, vencimiento, materia y estado, y abrir el detalle de una tarea.

Al crear o editar una tarea elige:

- **Materia**
- **Dificultad:** Bajo, Medio o Alto
- **Tipo:** diaria o proyecto (el proyecto lleva fecha de entrega)
- Título y, si quiere, descripción
- Si más adelante va a usar pizarra (se puede decidir también al entrar a estudiar)

### Candado para terminar

No cualquier tarea se puede marcar Terminado a mano:

- Si la dificultad es **Alto**, hace falta que el tutor haya dicho que el alumno ya está listo (`study_passed`).
- Si la tarea **pasó por En estudio**, también hace falta ese visto, aunque la dificultad no sea Alta.
- Bajo o Medio que nunca entraron al tutor se pueden terminar sin estudiar.

El mensaje que ve el alumno es directo: *estudia con el tutor hasta que diga que estás listo*. El adulto, en la ficha, ve si el tutor ya dio ese visto.

El modo estudio se abre cuando la tarea está **En estudio**, o cuando ya está **Terminada** y es de dificultad Alta (para volver a conversar).

---

## Estudiar una tarea (el tutor)

La primera vez que entra a estudiar, si todavía no eligió modo, Taskia pregunta: **¿solo charlar, o también dibujar?** Esa elección queda guardada. Después puede cambiar entre chat y pizarra dentro de la sesión.

### Cómo habla el tutor

El tutor está pensado para un niño: no suelta el procedimiento entero. Guía con preguntas y pistas. Recuerda un resumen vivo de la conversación (no el chat crudo) y una memoria breve del alumno, para no preguntar dos veces lo mismo ni perder el ejercicio que está abierto.

La sesión recorre tres fases, que el alumno ve en pantalla:

1. **Entendiendo** — de qué se trata la tarea.
2. **Practicando** — ejercicios y variaciones.
3. **Repasando** — el alumno explica o aplica el concepto con números o casos nuevos.

Puede escribir o hablar (voz a texto, hasta unos 90 segundos). En sesiones **sin pizarra**, el audio no se envía solo: el alumno revisa el texto, lo corrige y lo suma a la caja de abajo, para poder grabar varias veces. Si hay pizarra, es una grilla de formas (sin lápiz): el tutor dibuja el enunciado en celdas fijas y el alumno arma la respuesta encima. En móvil, chat y pizarra se alternan; en escritorio pueden convivir.

### Cuándo el tutor da el visto

Sin pizarra (temas teóricos) hace falta un **piso de mensajes del alumno**: al menos **seis**. Cada equivocación sube ese piso y el tutor sigue con preguntas que refuerzan ese punto débil. No hace falta preguntar si quiere más: cuando el piso ya se cumple y está repasando, celebra y le dice que puede mover la tarea a Terminado.

Con pizarra el listón es otro: el alumno tiene que resolver **dos problemas por su cuenta**, sin que el tutor le dicte la respuesta y sin errores. Si se equivoca o recibe ayuda para resolverlo, ese intento no cuenta. Al llegar a esos dos, el tutor **aún no** marca el visto: primero pregunta, con tono amable, si quiere practicar **otro tipo de ejercicio** del mismo tema. Solo si el niño dice que no, celebra y le dice que ya puede mover la tarea a Terminado.

Ese visto queda en la tarjeta y en el panel del adulto.

---

## Mundos

Los mundos son el otro eje: no “terminar la tarea de hoy”, sino **aprender un tema y demostrar que lo dominas**.

Un **mundo** es un contenedor (por ejemplo “Este trimestre” o “Ciencias”). Adentro, el alumno agrega **cursos** que el adulto ya le asignó. En cada curso crea **misiones**: cada misión es un tema de estudio (en la UI se habla de misiones o temas, no de “materias” dentro del mundo).

Progreso de un curso en el mundo:

- Sin temas
- Sin empezar
- En proceso
- Completado (todas las misiones dominadas)

Una misión pasa por **Por empezar → En marcha → Dominado**.

Se pueden **traer misiones** de otro mundo que use el mismo curso. Se copia el tema; el progreso empieza de cero en el mundo nuevo.

### Estudiar una misión

Es el mismo tipo de tutor (chat, voz, pizarra opcional), pero el objetivo es otro: cubrir el **tema entero**, no una consigna suelta.

En misiones **sin pizarra**, el primer mensaje del alumno es el relato de su cuaderno. Ese relato queda fijo: el tutor lo ve en cada turno y no debe preguntar cosas que no estén ahí. El resumen corto de la charla sigue actualizándose aparte.

El recorrido que el tutor debe respetar:

1. **Básico** — nombres, definiciones, hechos del título y de lo que el niño contó.
2. **Comprensión** — que lo explique con sus palabras.
3. **Observación** — detalles, causas, “¿qué pasaría si…?”, un ejemplo propio.

El listón de dominio **sin pizarra** es más alto que en una tarea: al menos **diez** mensajes del alumno, y cada error sube ese piso. El tutor recorre todo lo posible del tema. Antes de marcar **Dominado** pregunta si queda **más contenido** de ese tema que necesiten estudiar; solo cierra si el niño dice que no.

**Con pizarra** vale el mismo criterio que en una tarea con pizarra: dos problemas resueltos solo, sin ayuda ni errores; antes de marcar **Dominado**, el tutor pregunta si quiere otro tipo de ejercicio del tema; solo cierra si el niño no quiere más.

Cuando el tutor marca dominio, la misión queda **Dominada**. Eso alimenta el progreso del curso y habilita desafíos con más material detrás.

---

## Desafíos

Un desafío es un cuestionario que genera la IA a partir de lo que el alumno ya estudió. No es un examen que arma el adulto a mano.

Se puede lanzar a tres alcances:

| Alcance | Dónde se dispara | Sobre qué pregunta |
| --- | --- | --- |
| **Tema** | Una misión | Ese tema |
| **Curso** | El curso dentro del mundo | Todas las misiones del curso |
| **Global** | El mundo | Los cursos del mundo |

Y tres intensidades: **Calentamiento**, **Aventura** y **Jefe final**. Cuanto más amplio el alcance y más dura la intensidad, más preguntas (de unas 5 en un calentamiento de tema hasta muchas más en un jefe de mundo). Si todavía hay poco material estudiado, Taskia recorta la cantidad para no inventar de la nada.

Tipos de pregunta: opción múltiple, texto corto, completar, o una consigna que pide dibujar en la pizarra. En temas que **sí se resuelven en el lienzo**, el desafío prioriza práctica: unas **1 teórica por cada 10 de pizarra**. Si el tema es conceptual y no hace falta dibujar para practicar, las preguntas quedan en texto u opción múltiple.

### Cómo se juega

1. El alumno elige alcance e intensidad y arranca.
2. Recorre las preguntas; puede ir atrás y adelante. Las respuestas se guardan en el intento.
3. Al enviar, la IA corrige.
4. Ve el puntaje, un mensaje según cómo le fue, y cada pregunta con lo que dijo y lo esperado.

Si se sale a mitad de camino, el intento queda **abandonado**. Los completados aparecen en el historial del mundo o del curso, y el adulto puede abrir el mismo desglose desde el panel.

---

## El panel del adulto

El adulto no “estudia”: mira, configura y da de alta.

### Dashboard

Filtros por alumno y por fechas. Indicadores de alumnos (activos / pausados), tareas, atrasadas, desafíos, mundos y temas dominados. Gráficas del período: actividad (tareas, estudio, desafíos), uso del tutor, costo estimado de IA, acciones por alumno, quién avanzó, y una lista de **quién necesita seguimiento** (tareas atrasadas o varios días sin estudiar).

Abajo, el roster: cada alumno con materias, tareas hechas, atrasadas, desafíos, promedio y último estudio. Desde ahí se abre la ficha o se crea uno nuevo.

### Ficha del alumno

Cuatro pestañas:

- **Resumen** — tarjetas, tareas recientes y últimos desafíos.
- **Tareas** — listado filtrable, más las sesiones de estudio del tutor del tablero (no las de mundos).
- **Mundos** — árbol mundo → curso → tema, con desafíos en cada nivel y la última sesión de una misión.
- **Cuenta** — usuario, correo, contraseña, pausar/activar, y materias (alta, archivo, importar de otro alumno).

En un desafío completado, el adulto ve el mismo desglose que el alumno: qué preguntaron, qué respondió, qué estaba bien.

---

## Cómo encajan las piezas

```
Adulto crea alumno y materias
        │
        ▼
   Alumno entra
        │
        ├── Tablero ──► tarea ──► (opcional) tutor ──► visto ──► Terminado
        │
        └── Mundos ──► curso ──► misión ──► tutor ──► Dominado ──► desafío
```

Las **materias** unen los dos caminos: una tarea siempre es de una materia; un mundo solo puede incluir materias que el alumno ya tiene.

El **tutor** es el mismo oficio en tareas y misiones (charlar, practicar, no regalar la solución), con listones distintos: más corto y atado a un ejercicio en el tablero; más largo y temático en mundos.

Los **desafíos** no sustituyen al tutor: llegan después, para medir. El adulto no los arma; los mira.

---

## Un día típico

**Por la mañana, el adulto** abre el panel, filtra la semana y ve si alguien tiene tareas atrasadas o lleva días sin estudiar. Entra a la ficha, mira si el tutor ya dio el visto en la tarea difícil, o abre un desafío de ayer para ver en qué se equivocó.

**El alumno** entra al tablero, arrastra “fracciones mixtas” a En estudio, elige pizarra, practica con el tutor y, cuando este celebra, mueve la tarjeta a Terminado. Después abre su mundo, entra a un tema de Ciencias que todavía no domina, estudia un rato y, si ya lo tiene, lanza un calentamiento del curso.

Nada de eso exige que el adulto esté sentado al lado en el chat. El adulto configura y revisa; el alumno estudia y se pone a prueba.

---

## Apariencia

Tema claro u oscuro y un color de acento (azul por defecto; también verde, ámbar, violeta, etc.). Vale para alumno y adulto. No cambia las reglas, solo cómo se ve.

---

## Qué no es Taskia

- No es un aula masiva con roles de profesor/grupo/calificaciones tradicionales.
- El adulto no escribe el contenido de las misiones ni el cuestionario del desafío: el alumno (o quien lo ayude a cargar el tema) define el título/descripción, y la IA enseña y evalúa a partir de eso y de lo hablado.
- No hay registro libre en internet: si un niño llega a la pantalla de login sin cuenta, tiene que pedirle a un adulto que lo dé de alta.
- La app de escritorio (`taskia_desktop`) quedó congelada; el producto vivo es la web.

Para cómo levantarlo en una máquina, ver el [README de la raíz](README.md). Para el detalle de cada paquete, [frontend](taskia_frontend/README.md) y [backend](taskia_backend/README.md). El plan de la versión 2.0 (padres, WhatsApp, workers, Flutter) está en [ROADMAP_V2.md](ROADMAP_V2.md).
