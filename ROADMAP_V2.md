# Taskia 2.0 — checklist

Fuente de verdad de lo que falta para la versión 2.0. Se trabaja de a pocos; cada ítem grande tendrá su propio plan al tocarlo. El producto vivo hoy está en [PRODUCTO.md](PRODUCTO.md) y el esquema en [BASE_DE_DATOS.md](BASE_DE_DATOS.md).

**Orden de plataforma:** primero web (incluyendo funciones del padre), después reflejo en Flutter.

**Marcado:** `- [ ]` pendiente · `- [x]` hecho. Al cerrar un ítem, actualizar también [STATE.md](STATE.md) si cambia el comportamiento vigente.

---

## Decisiones que ya están tomadas

- El **admin** sigue siendo el administrador de la plataforma.
- El **padre** (o tutor) es un **rol nuevo** con vista propia. No reemplaza al admin.
- El admin **une** padre y alumno desde un módulo de afiliación.
- WhatsApp, workers y app Flutter van en este checklist, pero no se implementan en el primer bloque.
- El chat del padre con la IA (resumen + recomendaciones) se ofrece primero en **web**; Flutter lo refleja después.
- Fotos en el chat, tiempo de pensamiento y cambios del tutor de tema son planes aparte, aunque figuren aquí.

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

### 1.1 Rol padre y afiliación

- [ ] Rol nuevo en cuentas (aparte de `user` y `admin`), con login y permisos propios
- [ ] Tabla o vínculo de afiliación padre ↔ alumno (un padre puede tener varios alumnos; un alumno puede tener más de un adulto si hace falta)
- [ ] Módulo en el **panel admin** para crear/vincular/desvincular padres y alumnos
- [ ] Vista web del padre: ve solo a sus alumnos afiliados (progreso, sin mezclarse en el tablero del niño)
- [ ] El admin sigue viendo a todos; el padre no administra la plataforma

### 1.2 Preferencias de notificación (datos, aún sin envío)

- [ ] Por padre (y si aplica, por alumno): qué eventos quiere recibir
  - [ ] Terminó una tarea (tablero)
  - [ ] Terminó el estudio de una tarea (tutor dio el visto / sesión cerrada con avance)
  - [ ] Terminó el estudio de un tema (misión)
  - [ ] Terminó el estudio de un curso (materia en un mundo)
  - [ ] Terminó el estudio de un mundo
  - [ ] Realizó / completó desafíos
- [ ] Guardar número o identificador de WhatsApp del padre (aunque el envío real venga después)
- [ ] Pantalla web del padre para editar esas preferencias

### 1.3 Tiempo de pensamiento del alumno

- [ ] Registrar, por mensaje del tutor, el instante en que respondió la IA
- [ ] Al responder el alumno, guardar el lapso hasta esa respuesta
- [ ] Si el lapso supera **30 minutos**, marcarlo como pausa (no como “estuvo pensando”)
- [ ] Dejar esa señal disponible para el worker de resumen (no hace falta usarla aún en UI)

**Criterio de cierre del cimiento:** un admin puede afiliar un padre a un alumno; el padre entra a la web, ve solo a ese alumno y configura qué avisos quiere; la base ya guarda latencias de respuesta en los chats de estudio.

---

## 2. Medianas — workers, WhatsApp, chat del padre, estudio

Cada una es un plan aparte. Dependen del cimiento.

### 2.1 Worker A — resumen de progreso por alumno

- [ ] Job periódico (o disparado) por alumno
- [ ] Contexto: tareas, estudio de tareas, misiones, desafíos, latencias, atascos, fortalezas, tono de los mensajes
- [ ] Persistencia del resumen (para el chat del padre y para otros workers)
- [ ] No envía WhatsApp por sí solo

### 2.2 Worker B — avisos de eventos por WhatsApp

- [ ] Detectar: estudio de tarea terminado, misión terminada, desafío completado (y los demás eventos de preferencias)
- [ ] Respetar las preferencias del padre (§1.2)
- [ ] Enviar por WhatsApp al padre afiliado
- [ ] Idempotencia: no spamear el mismo evento dos veces

### 2.3 Worker C — alerta de inactividad

- [ ] Si un alumno lleva **3 días** sin tarea / estudio de misión / desafío, avisar al padre por WhatsApp
- [ ] Respetar preferencias (si se define un interruptor específico de “inactividad”)
- [ ] No repetir el aviso cada hora; definir cooldown al implementar

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
