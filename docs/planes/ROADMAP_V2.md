# Taskia 2.0 — checklist

> **WhatsApp y Flutter siguen en pausa.** Los workers no son procesos residentes: cada uno es un script de una pasada en `taskia_backend/scripts/`, y GitHub Actions decide el horario. Los YAML están en `.github/workflows/`.

Fuente de verdad de lo que falta para la versión 2.0. Se trabaja de a pocos; cada ítem grande tendrá su propio plan al tocarlo. El producto vivo hoy está en [PRODUCTO.md](../producto/PRODUCTO.md) y el esquema en [BASE_DE_DATOS.md](../datos/BASE_DE_DATOS.md).

**Orden de plataforma:** primero web (incluyendo funciones del padre), después reflejo en Flutter.

**Marcado:** `- [ ]` pendiente · `- [x]` hecho. Al cerrar un ítem, actualizar también [STATE.md](../../STATE.md) si cambia el comportamiento vigente.

---

## Decisiones que ya están tomadas

- El **admin** sigue siendo el administrador de la plataforma.
- El **padre** (o tutor) es un **rol nuevo** con vista propia. No reemplaza al admin.
- El admin **une** padre y alumno desde un módulo de afiliación.
- WhatsApp y Flutter no se implementan en el primer bloque. Los workers corren como scripts de Actions.
- El chat del padre con la IA (resumen + recomendaciones) se ofrece primero en **web**; Flutter lo refleja después.
- Fotos en el chat, tiempo de pensamiento y cambios del tutor de tema son planes aparte, aunque figuren aquí.
- Cada worker es un script que corre y termina. El horario vive en `.github/workflows/`, no en el servidor de la web.
- El cron de Actions está en UTC. Perú no cambia de hora: 05:15 UTC es 00:15 en Lima.
- El cron solo corre si el archivo está en la rama por defecto del repositorio. `workflow_dispatch` permite lanzarlo a mano desde la pestaña Actions.
- Secretos del job: `PG_DSN` y `GEMINI_API_KEY`. `PG_SCHEMA` va fijo en `taskia`. El modelo de Gemini, si no se define, es `gemini-2.0-flash`.

---

## Workers en GitHub Actions

Un workflow, un script. La máquina se apaga al terminar. No comparten proceso con la API.

| Worker | Script | Workflow | Cuándo |
| --- | --- | --- | --- |
| A. Resumen del día | `scripts/daily-summary.ts` | `daily-summary.yml` | 00:15 Lima, o sea 05:15 UTC (`15 5 * * *`). Sin `--date`, resume ayer. |
| B. Avisos de eventos | `scripts/notify-events.ts` | `notify-events.yml` | Cada hora al minuto 15 (`15 * * * *`), cuando el script envíe de verdad. Hoy solo se lanza a mano. |
| C. Inactividad | `scripts/notify-inactivity.ts` | `notify-inactivity.yml` | 00:30 Lima, o sea 05:30 UTC (`30 5 * * *`), con el mismo criterio. |

El resumen ya escribe `student_daily_summaries`. B y C todavía no envían: falta el proveedor de WhatsApp y una tabla de envíos para no repetir el mismo aviso. El cooldown de inactividad, cuando se arme, es uno por racha: avisa al tercer día sin tarea, misión ni desafío, y no vuelve a avisar hasta que haya actividad y se cumplan otros tres días.

Para probar sin esperar al cron: Actions → el workflow → Run workflow. En el resumen se puede pasar `date` como `YYYY-MM-DD`.

---

## Mapa por tamaño

| Tamaño | Qué es | Ejemplos |
| --- | --- | --- |
| **Cimiento** | Sin esto el resto no tiene destinatario ni datos | Rol padre, afiliación, preferencias de aviso, latencia de respuesta |
| **Mediana** | Un plan propio, pero cuelga del cimiento | Workers, WhatsApp, chat del padre, fotos, tutor de cuaderno |
| **Grande** | Otro producto o integración pesada | App Flutter, proveedor WhatsApp en producción |

---

## 1. Cimiento — padres, afiliación y señales

Primer bloque a implementar. Enfoque: web.

### 1.1 Rol Guardián y afiliación

- [x] Catálogo `roles` + `users.role_id` (`user` = Explorador, `admin`, `parent` = Guardián)
- [x] Afiliación `parent_student_links` (baja lógica)
- [x] Módulo admin: página «Guardianes y Exploradores» (vínculo obligatorio al crear)
- [x] Vista web del Guardián: solo sus Exploradores; chat primero; ficha secundaria
- [x] Tabla `student_daily_summaries` + chat que la consume. Sin fila de hoy, texto fijo y sin llamada a Gemini.
- [x] El admin sigue viendo a todos; el Guardián no administra la plataforma

### 1.2 Preferencias de notificación (datos, aún sin envío)

- [x] Una config por cuenta Guardián (`parent_notify_prefs`) para todos sus Exploradores
  - [x] Terminó una tarea / estudio de tarea / tema / curso / mundo / desafío / inactividad
- [x] WhatsApp E.164 en preferencias
- [x] Pantalla web del Guardián para editarlas

### 1.3 Tiempo de pensamiento del Explorador

- [x] Latencia vs último mensaje del tutor al responder el Explorador
- [x] `reply_latency_seconds` + `is_pause` si supera 30 minutos
- [x] Disponible en `study_messages` y `study_mission_messages` (sin UI en el chat del niño)

**Cimiento cerrado en código.** En Render: vaciar el schema `taskia` si hace falta y correr `npm run db:migrate:pd`.

---

## 2. Medianas — workers, WhatsApp, chat del padre, estudio

Cada una es un plan aparte. Dependen del cimiento.

### 2.1 Worker A — resumen de progreso por alumno

- [x] Script de una pasada por explorador (`taskia_backend/scripts/daily-summary.ts`). El horario lo pone GitHub Actions, no el proceso.
- [x] Contexto del día: tareas, estudio, misiones, desafíos, latencias y pausas
- [x] Persistencia en `student_daily_summaries` (reemplaza la fila si se vuelve a correr el mismo día)
- [x] No envía WhatsApp. Sin actividad, frase fija y sin llamada a Gemini.

### 2.2 Worker B — avisos de eventos por WhatsApp

- [ ] Script `scripts/notify-events.ts` (el workflow ya lo llama; aún no envía)
- [ ] Detectar: estudio de tarea terminado, misión terminada, desafío completado (y los demás eventos de preferencias)
- [ ] Respetar las preferencias del padre (§1.2)
- [ ] Enviar por WhatsApp al padre afiliado
- [ ] Idempotencia: no spamear el mismo evento dos veces

### 2.3 Worker C — alerta de inactividad

- [ ] Script `scripts/notify-inactivity.ts` (el workflow ya lo llama; aún no envía)
- [ ] Si un alumno lleva **3 días** sin tarea / estudio de misión / desafío, avisar al padre por WhatsApp
- [ ] Respetar el interruptor de inactividad
- [ ] Un aviso por racha: no repetir hasta que haya actividad y pasen otros tres días

### 2.4 Integración WhatsApp (compartida por B y C)

- [ ] Elegir proveedor y credenciales de entorno
- [ ] Plantillas / mensajes en español latinoamericano, tono adulto
- [ ] Registro de envíos y fallos (sin romper la sesión del alumno si WhatsApp falla)

### 2.5 Chat del padre con la IA (web primero)

- [ ] En la vista del padre, chat aparte del del niño
- [ ] Paso 1: armar un resumen rápido del progreso reciente (p. ej. última semana) con IA + datos/worker A
- [ ] Paso 2: segunda pasada de IA → recomendaciones y apreciaciones (dónde cuidar, qué le cuesta, qué hace bien)
- [ ] El padre conversa sobre ese contexto; no edita el tablero del niño

### 2.6 Fotos en el chat de estudio (alumno)

- [ ] El alumno puede adjuntar imagen en el chat del tutor (tarea y/o misión)
- [ ] Almacenamiento, límites de tamaño/tipo, envío al modelo
- [ ] El adulto/padre puede ver esas imágenes donde corresponda en la ficha o el chat del padre (definir en el plan de ese ítem)

### 2.7 Tutor de tema: cuaderno primero y explicación

- [ ] En el estudio de un tema (misión), la IA pide primero todo lo del cuaderno
- [ ] Sigue preguntando si falta algo hasta que el alumno diga que eso era todo
- [ ] Esos mensajes quedan como contexto “puro” del tema en el resumen de sesión
- [ ] Estrategia de enseñanza: orillar a explicar (no contentarse con sí/no o una palabra); no es un bloqueo duro de UI

---

## 3. Grandes — app Flutter

- [ ] App móvil del padre (Flutter) como reflejo de la web: progreso de sus niños, preferencias WhatsApp, chat con la IA
- [ ] Auth del rol padre contra el mismo backend
- [ ] No duplicar reglas de negocio en el cliente: la API manda

La app **no** abre el bloque 3 hasta que el cimiento (§1) y al menos el chat del padre en web (§2.5) estén usables. WhatsApp puede ir en paralelo en backend (§2.4) sin esperar Flutter.

---

## Orden sugerido de oleadas

| Oleada | Qué entra | Resultado visible |
| --- | --- | --- |
| **A** | §1 completo | Admin afilia; padre entra a la web; preferencias guardadas; latencias registradas |
| **B** | §2.1 + §2.5 | Resumen por alumno y chat del padre en web |
| **C** | §2.4 + §2.2 + §2.3 | Avisos e inactividad por WhatsApp según preferencias |
| **D** | §2.6 y/o §2.7 | Fotos y/o tutor de cuaderno (pueden ir en paralelo si hay capacidad) |
| **E** | §3 | Flutter refleja lo ya estable en web |

---

## Fuera de alcance de este checklist

- Rehacer el tablero o unificar las tablas del tutor de tareas y de misiones.
- Registro público de alumnos o padres sin el admin.
- Calificaciones escolares formales, aulas masivas o roles de profesor de colegio.

Cuando un ítem necesite diseño fino (esquema, pantallas, prompts), se abre un plan de trabajo aparte y se marca aquí al cerrarlo.
