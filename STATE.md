# Estado de Taskia

Memoria corta del proyecto. El detalle de tablas está en [BASE_DE_DATOS.md](BASE_DE_DATOS.md). Plan activo de core web: [ROADMAP_TROPAS.md](ROADMAP_TROPAS.md). [ROADMAP_V2.md](ROADMAP_V2.md) (WhatsApp/workers/Flutter) está **en pausa**.

## Ahora

Un solo repo en la raíz. Backend en `taskia_backend/`, frontend en `taskia_frontend/`. Desde aquí: `npm run install:all`, `npm run dev`, `npm run build`.

Roles en catálogo `roles`: Explorador (`user`), Administrador (`admin`), Guardián (`parent`). El admin afilia Guardianes y Exploradores. El Guardián entra a la web (chat con resumen diario, progreso, avisos WhatsApp). Latencia de respuesta se guarda en los chats de estudio. Guía funcional: [FUNCIONES.md](FUNCIONES.md).

Siguiente foco: plan Tropas/XP/hub **cerrado** (oleadas 0–5). [ROADMAP_V2.md](ROADMAP_V2.md) sigue en pausa hasta retomarlo a propósito.

La base de Postgres guarda instantes en UTC. La web los muestra en la zona de quien mira con `formatWhen` / `formatDay` en `taskia_frontend/src/lib/datetime.ts`. `tasks.due_date` es un día de calendario, sin zona. XP semanal y tope de tareas/día usan día civil `America/Lima`.

Mundos, vínculos, misiones y afiliaciones se archivan (`is_active = false`), no se borran en duro (salvo descartar un desafío a medias).

## Decisiones vigentes

- Esquema vivo: migraciones en `taskia_backend/db/migrations/` (`npm run db:migrate`). No hay ORM.
- Admin semilla: usuario `Sebastian` / `123456` (migración `002_seed_admin.mjs`). Demo: explorador `Seroven` / `123456` con materias de primaria; guardián `Claudia` / `123456` vinculada a Seroven (`004_seed_demo_users.mjs`).
- UI: Guardián / Explorador (no “padre” / “alumno” / “hijo” en superficies nuevas).
- Naming: para el niño, **Taskia** es quien ayuda a estudiar (chat/pizarra). En código interno puede seguir diciéndose “tutor”; en copy visible al explorador, no.
- Tono explorador: claro y cercano; sin jerga de oficina. Columnas del tablero: Por hacer / Haciendo / Estudiando / Listo. Se mantienen Mundos, misiones y desafíos. Admin y Guardián siguen con lenguaje adulto.
- Pizarra en estudio: «Enviar pizarra» manda PNG para que Taskia entienda. Dibuja solo con `draw_ops`/coords (proceso aparte). Sin texto de coordenadas al chat si hay imagen.
- Dominio de tarea: `study_passed` desbloquea Listo; la columna no se mueve sola. Misión sí pasa a `mastered`. Si Gemini celebra y el servidor fuerza `passed=false` (piso/evidence), se recorta ese cierre del texto.
- Admin: página «Guardianes y Exploradores» (vínculo obligatorio al crear; no hay alta suelta). El dashboard ya no lista exploradores ni tiene «Nuevo alumno».
- Modales: shell único `ModalShell` con tamaños `sm` / `md` / `lg`; `WorldsModalShell` solo reexporta.
- Tablas: componente `DataTable` (`taskia_frontend/src/components/ui/DataTable.tsx`); `flush` pega la tabla al borde del `admin-panel`.
- Preferencias WhatsApp: una por cuenta Guardián.
- Chat del Guardián usa `student_daily_summaries` del día civil del visor; sin fila, la IA lo dice. Worker aún no escribe ahí.
- ROADMAP_V2 en pausa; plan Tropas/XP/hub **cerrado** (oleadas 0–5): esquema, motor XP, hub, tropas, Guardián lectura, pulido/docs.
- El trabajo del día se commitea y se sube a `staging`.

## Pendiente

- Retomar [ROADMAP_V2.md](ROADMAP_V2.md) cuando se decida (workers / WhatsApp / Flutter).
- En Render / pd: `npm run db:reset:pd -- --yes` (borra el schema `taskia` y reaplica migraciones) si el schema viejo no cuadra.
- ROADMAP_V2 en pausa (workers / WhatsApp / Flutter).
- Los instantes ya guardados (si quedan) están corridos +5 h. No se corrigen hasta que se pida.

## Cómo correrlo

```bash
npm run install:all
npm run db:migrate
npm run dev
npm run build
```

Variantes: `dev:pd`, `build:qa`, `build:pd`.
