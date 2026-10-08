# Taskia

Guía funcional de lo que ven **Guardián** y **Explorador** hoy: [FUNCIONES.md](FUNCIONES.md).

Taskia es a la vez la app y **quien ayuda a estudiar**: para el niño, Taskia es el nombre de su guía en el chat. El administrador configura cuentas y materias; el **guardián** acompaña desde su panel; el **explorador** entra a un hub (Tripulación | Mundos | Campamento), gana XP y puede unirse a una tripulación.

No es un chat suelto con una IA ni un kanban genérico. La idea es un ciclo cerrado: **materias → tareas o temas → (si pide ayuda) estudiar con Taskia → demostrar que se entendió → (en mundos) ponerse a prueba con un desafío**. Taskia no regala la respuesta: guía, pregunta y solo cierra cuando hay evidencia real.

El tono de la app está pensado para un niño de alrededor de 10 años: español latinoamericano, cercano y breve. El adulto ve números, tablas y el detalle de lo que pasó.

---

## Tres roles, tres entradas

Al iniciar sesión, cada rol entra a un mundo distinto.

**El explorador** (`user`) ve el hub (Tripulación | Mundos | Campamento), el modo estudio y la barra de nivel/XP. Puede cambiar su usuario, correo y contraseña, y elegir tema claro/oscuro y color de acento. No puede crearse la cuenta solo: el registro público está cerrado a propósito.

**El administrador** (`admin`) no usa el Campamento. Entra al panel: dashboard de exploradores, fichas, materias, mundos, desafíos y el módulo de **guardianes** (crear, vincular, desvincular).

**El guardián** (`parent`) acompaña a uno o más exploradores vinculados por el admin. Entra a un panel propio: chat con la IA sobre el resumen del día, progreso en solo lectura (nivel/XP, tripulación y totales) y preferencias de avisos WhatsApp. No edita el Campamento ni la tripulación del explorador.

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

## El Campamento (tareas del día)

Es la casa del alumno para lo de hoy (antes “tablero” / kanban). Se entra desde el hub. Es una **lista del día** con tres bloques:

| Estado | Copy | Qué significa |
| --- | --- | --- |
| `pending` | **Por hacer** | Todavía no la cerró. |
| `studying` | **Con Taskia** | Pidió ayuda y abrió el estudio. |
| `done` | **Listo** | Terminada. |

Al crear o editar elige materia, tipo (diaria o proyecto), título/descripción y **¿Quieres que Taskia te ayude con esta?** (`needs_help`). Ya no hay dificultad Baja/Media/Alta en tareas.

### Cierre y XP

- **Sin ayuda:** el niño marca Listo (botón o swipe) y gana **10 XP**.
- **Diaria con ayuda:** al abrir estudio pasa a Con Taskia; cuando Taskia celebra el cierre, pasa a Listo sola (XP **40–200**). El niño no marca Listo a mano.
- **Proyecto con ayuda:** briefing primero; Taskia guía y no cierra sola. El niño confirma el fin (chat o Listo). XP **80–350**.

---

## Estudiar una tarea (con Taskia)

Entrar a estudiar abre el chat.

### Cómo habla Taskia

Taskia está pensada para un niño: no suelta el procedimiento entero. Guía con preguntas y pistas. Recuerda un resumen vivo de la conversación (no el chat crudo) y una memoria breve del alumno, para no preguntar dos veces lo mismo ni perder el ejercicio que está abierto.

La sesión recorre tres fases, que el alumno ve en pantalla:

1. **Entendiendo** — de qué se trata la tarea.
2. **Practicando** — ejercicios y variaciones.
3. **Repasando** — el alumno explica o aplica el concepto con números o casos nuevos.

Puede escribir o pulsar Hablar. Si hay sitio, el círculo se estira desde la izquierda, corre el chat a la derecha y los dos quedan centrados. El chat sigue visible. Si no cabe, el chat se oculta. El círculo espera; al tocarlo escucha y al tocarlo otra vez guarda el texto y Taskia lee la respuesta. En la vista estrecha los globos de abajo se desvanecen antes de tapar el círculo. Si adjunta una foto, sale cuando habla. También puede mandar la foto de un ejercicio. Si pide uno nuevo que necesita un dibujo, Taskia no lo arma y le pide una foto parecida. Si basta con texto o números, lo escribe en el mensaje.

### Cuándo Taskia cierra la tarea

Hace falta un **piso de mensajes del alumno**: al menos **seis**. Cada equivocación sube ese piso y Taskia sigue con preguntas que refuerzan ese punto débil. Cuando el piso ya se cumple y está repasando, celebra: la tarea pasa a **Listo** en ese turno y el XP sale de un `effort` corto (40–200).

---

## Mundos

Los mundos son el otro eje: no “terminar la tarea de hoy”, sino **aprender un tema y demostrar que lo dominas**.

Un **mundo** es un contenedor (por ejemplo “Este trimestre” o “Ciencias”). Adentro, el alumno agrega **cursos** que el adulto ya le asignó. En cada curso crea **misiones**: cada misión es un tema de estudio (en la UI se habla de misiones o temas, no de “materias” dentro del mundo).

Progreso de un curso en el mundo:

- Sin temas
- Sin empezar
- En marcha
- Listo (todas las misiones listas)

Una misión pasa por **Por empezar → En marcha → Lista**.

Se pueden **traer misiones** de otro mundo que use el mismo curso. Se copia el tema; el progreso empieza de cero en el mundo nuevo.

### Estudiar una misión

Es la misma Taskia (chat y voz), también si el tema es práctico, pero el objetivo es otro: cubrir el **tema entero**, no una consigna suelta.

Antes de enseñar hay un **briefing**: el alumno cuenta lo del cuaderno; Taskia pregunta si falta algo; cuando el niño dice que ya pueden empezar, ese relato queda fijo en `notebook_context`. Taskia lo ve en cada turno y no debe preguntar cosas que no estén ahí. El resumen corto de la conversación sigue actualizándose aparte.

El recorrido que Taskia debe respetar:

1. **Básico** — nombres, definiciones, hechos del título y de lo que el niño contó.
2. **Comprensión** — que lo explique con sus palabras.
3. **Observación** — detalles, causas, “¿qué pasaría si…?”, un ejemplo propio.

El listón de dominio es más alto que en una tarea: al menos **diez** mensajes del alumno, y cada error sube ese piso. Taskia recorre todo lo posible del tema. Antes de marcar **Lista** pregunta si queda **más contenido** de ese tema que necesiten estudiar; solo cierra si el niño dice que no.

Cuando Taskia marca que ya sabe el tema, la misión queda **Lista**. Eso alimenta el progreso del curso y habilita desafíos con más material detrás.

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

Tipos de pregunta: opción múltiple, texto corto o completar. Las preguntas nuevas salen del texto estudiado. Si un desafío ya guardado trae una foto, se sigue viendo y, si hay resolución en foto, cuenta bien solo si la opción y la foto coinciden.

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

Filtros por alumno y por fechas. Indicadores de alumnos (activos / pausados), tareas, atrasadas, desafíos, mundos y temas dominados. Gráficas del período: actividad (tareas, estudio, desafíos), uso de Taskia, costo estimado de IA, acciones por alumno, quién avanzó, y una lista de **quién necesita seguimiento** (tareas atrasadas o varios días sin estudiar).

Abajo, el roster: cada alumno con materias, tareas hechas, atrasadas, desafíos, promedio y último estudio. Desde ahí se abre la ficha o se crea uno nuevo.

### Ficha del alumno

Cuatro pestañas:

- **Resumen** — tarjetas, tareas recientes y últimos desafíos.
- **Tareas** — listado filtrable, más las sesiones con Taskia del tablero (no las de mundos).
- **Mundos** — árbol mundo → curso → tema, con desafíos en cada nivel y la última sesión de una misión.
- **Cuenta** — usuario, correo, contraseña, pausar/activar, y materias (alta, archivo, importar de otro alumno).

En un desafío completado, el adulto ve el mismo desglose que el alumno: qué preguntaron, qué respondió, qué estaba bien.

---

## Cómo encajan las piezas

```
Adulto crea alumno y materias
        │
        ▼
   Alumno entra → hub
        │
        ├── Tripulación ──► universo de planetas, equipo, campana, ranking, avatar/planeta
        │
        ├── Campamento ──► tarea ──► (si needs_help) Taskia ──► Listo ──► XP
        │
        └── Mundos ──► curso ──► misión ──► Taskia ──► Lista ──► desafío ──► XP
```

Las **materias** unen los dos caminos: una tarea siempre es de una materia; un mundo solo puede incluir materias que el alumno ya tiene.

**Taskia** es la misma guía en tareas y misiones (hablar, practicar, no regalar la solución), con listones distintos: más corto y atado a un ejercicio en el Campamento; más largo y temático en mundos.

Los **desafíos** no sustituyen a Taskia: llegan después, para medir. El adulto no los arma; los mira.

---

## Un día típico

**Por la mañana, el adulto** abre el panel, filtra la semana y ve si alguien tiene tareas atrasadas o lleva días sin estudiar. Entra a la ficha, mira cuántas están con Taskia o listas, o abre un desafío de ayer para ver en qué se equivocó.

**El alumno** entra al hub, abre el Campamento, pide ayuda con “fracciones mixtas”, practica con Taskia en el chat y, cuando celebra, la tarea pasa a Listo. Después abre Mundos, entra a un tema de Ciencias que todavía no sabe del todo, estudia un rato y, si ya lo tiene, lanza un calentamiento del curso.

Nada de eso exige que el adulto esté sentado al lado en el chat. El adulto configura y revisa; el alumno estudia y se pone a prueba.

---

## Apariencia

Tema claro u oscuro y un color de acento (azul por defecto; también verde, ámbar, violeta, etc.). Vale para alumno y adulto. No cambia las reglas, solo cómo se ve. En **Tripulación**, el universo 3D toma el fondo y el acento del tema; si el sistema pide menos movimiento (`prefers-reduced-motion`), se apagan estrellas, giro de planetas y animaciones fuertes del card.

---

## Qué no es Taskia

- No es un aula masiva con roles de profesor/grupo/calificaciones tradicionales.
- El adulto no escribe el contenido de las misiones ni el cuestionario del desafío: el alumno (o quien lo ayude a cargar el tema) define el título/descripción, y la IA enseña y evalúa a partir de eso y de lo hablado.
- No hay registro libre en internet: si un niño llega a la pantalla de login sin cuenta, tiene que pedirle a un adulto que lo dé de alta.
- La app de escritorio (`taskia_desktop`) quedó congelada; el producto vivo es la web.

Para cómo levantarlo en una máquina, ver el [README de la raíz](../../README.md). Para el detalle de cada paquete, [frontend](../../taskia_frontend/README.md) y [backend](../../taskia_backend/README.md). El plan de la versión 2.0 (padres, WhatsApp, workers, Flutter) está en [ROADMAP_V2.md](../planes/ROADMAP_V2.md).
