# Estado de Taskia

Memoria corta del proyecto. El índice del resto está en [docs/README.md](docs/README.md). El detalle de tablas está en [BASE_DE_DATOS.md](docs/datos/BASE_DE_DATOS.md). Planes vivos: carpetas del frontend en [PLAN_ESTRUCTURA.md](docs/planes/PLAN_ESTRUCTURA.md) (desde F1) y [ROADMAP_V2.md](docs/planes/ROADMAP_V2.md) (WhatsApp/workers/Flutter), este último **en pausa**.

## Ahora

Un solo repo en la raíz. Backend en `taskia_backend/`, frontend en `taskia_frontend/`. Desde aquí: `npm run install:all`, `npm run dev`, `npm run build`.

Roles en catálogo `roles`: Explorador (`user`), Administrador (`admin`), Guardián (`parent`). El admin afilia Guardianes y Exploradores. El Guardián ve el chat a la izquierda, con el mismo aspecto que el chat de estudio, y a la derecha cards de progreso y avisos. Cada card abre con el mismo badge que «Hoy». Los avisos son interruptores en columnas. La actividad son cuatro piezas con número, no un párrafo. Los exploradores son chips en fila, uno solo activo; al tocarlo cambian el chat y el progreso. Latencia de respuesta se guarda en los chats de estudio. Guía funcional: [FUNCIONES.md](docs/producto/FUNCIONES.md).

La puerta **Tripulación** del hub del explorador está cerrada a propósito: se ve, no se abre, y dice que ese lugar se está armando. La galaxia se dibuja en SVG (`GalaxyUniverse` + `PlanetRenderer`). El canvas R3F y `three` ya no están. `planet_config` guarda el dibujo; si falta, se arma desde `planet_style_id` y `planet_seed`. La IA de planeta devuelve ese JSON, con reintentos y huella para no repetir un dibujo. Queda fuera de este corte la barra de XP, el confeti, el audio y el rediseño de avisos. [ROADMAP_V2.md](docs/planes/ROADMAP_V2.md) en pausa.

La base de Postgres guarda instantes en UTC. La web los muestra en la zona de quien mira con `formatWhen` / `formatDay` en `taskia_frontend/src/lib/datetime.ts`. `tasks.due_date` es un día de calendario, sin zona. XP semanal y tope de tareas/día usan día civil `America/Lima`.

Mundos, vínculos, misiones y afiliaciones se archivan (`is_active = false`), no se borran en duro (salvo descartar un desafío a medias).

## Decisiones vigentes

- Esquema vivo: `taskia_backend/db/migrations/` en TypeScript (`npm run db:migrate`). `001_baseline.ts` es la foto inicial y no se edita. Un cambio de columna, tabla o semilla es un archivo nuevo `NNN_motivo.ts` que suma sobre la base ya creada. El acceso en runtime es TypeORM: entidades, sin `mysqlToPg`, `synchronize` apagado. El DDL no se regenera con el ORM. Cada conexión fija `search_path` a `PG_SCHEMA` para que los triggers diferidos encuentren las tablas. El migrador lo fija al arrancar y otra vez con `SET LOCAL` dentro de cada transacción: el pooler de Supabase no conserva un `SET` suelto y, si no, el DDL cae en `public`.
- Prompts de Gemini: `taskia_backend/src/prompts/`. Carpeta de sesión HTTP: `src/middleware/` (una sola; no `middlewares`).
- Admin semilla: usuario `Sebastian` / `123456` (migración `002_seed_admin.mjs`). Demo: explorador `Seroven` / `123456` con materias de primaria; guardián `Claudia` / `123456` vinculada a Seroven (`004_seed_demo_users.mjs`). Tripulación demo: `005_seed_demo_troops.mjs` (~6 tripulaciones, muchos exploradores + guardianes, niveles/XP variados, mismos cursos; password `123456`).
- UI: Guardián / Explorador (no “padre” / “alumno” / “hijo” en superficies nuevas). Cambiar tema o color de acento funde la pantalla; con menos movimiento del sistema, el cambio es inmediato.
- CSS global en `taskia_frontend/src/styles/`. `index.css` solo importa, en este orden: tokens, base, chrome, hub, troops, guardian, camp, study, worlds, admin. Ese orden es la cascada.
- Naming: para el niño, **Taskia** es quien ayuda a estudiar (chat/pizarra). En código interno puede seguir diciéndose “tutor”; en copy visible al explorador, no.
- Tono explorador: claro y cercano; sin jerga de oficina. El tablero se llama **Campamento** en copy. Columnas: Por hacer / Haciendo / Estudiando / Listo. El grupo se llama **Tripulación** (Capitán / Copiloto / Explorador). En código, rutas y tablas sigue `troops`. El planeta de cada tripulación es un dibujo SVG a partir de `planet_config` (o, si falta, de `planet_style_id` y `planet_seed`). Tiene cara simple, como máximo una luna, y anillos que se ocultan con la ficha abierta. El nombre se lee bajo el planeta. La propia lleva un aro del acento. El Top 3 lleva una medalla. Un clic en el vacío cierra la ficha. La vista se mueve arrastrando y con la rueda; el cursor en el borde no la desplaza. `planet_params` solo entra cuando el Capitán o el Copiloto personalizan. Admin y Guardián siguen con lenguaje adulto.
- Pizarra en estudio: antes del tutor, una llamada corta (`board_intent`) lee solo la frase del niño y la última de Taskia y devuelve `review_drawing` / `draw_exercise`. El código enciende la revisión del dibujo o el dibujo de Taskia (`draw_ops`). Sin imagen ni resumen en esa llamada. Si falla, ambas quedan en false y el turno sigue. En tarea y misión también se puede mandar una foto del ejercicio: el servidor la sube firmada a Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) y guarda solo `image_url`. Gemini la ve en ese turno, aparte de la pizarra.
- Dominio de tarea: `study_passed` desbloquea Listo; la columna no se mueve sola. Misión sí pasa a `mastered`. Si Gemini celebra y el servidor fuerza `passed=false` (piso/evidence), se recorta ese cierre del texto.
- Admin: página «Guardianes y Exploradores» (vínculo obligatorio al crear; no hay alta suelta). El dashboard ya no lista exploradores ni tiene «Nuevo alumno».
- Modales: shell único `ModalShell` con tamaños `sm` / `md` / `lg`; `WorldsModalShell` solo reexporta.
- Tablas: componente `DataTable` (`taskia_frontend/src/components/ui/DataTable.tsx`); `flush` pega la tabla al borde del `admin-panel`.
- Preferencias WhatsApp: una por cuenta Guardián.
- Chat del Guardián es uno por explorador y día civil del visor (`parent_chat_messages.chat_date`). El día anterior queda guardado y no se muestra ni se manda a Gemini. El resumen es el de ese día. Sin fila, texto fijo y sin llamada. Lo escribe `scripts/daily-summary.ts` (ayer en `America/Lima`). GitHub Actions lo dispara con `.github/workflows/daily-summary.yml`. Sin actividad no llama a Gemini. Los avisos y la inactividad tienen workflow, y el envío espera al proveedor de WhatsApp.
- Tripulación, XP y hub ya están en el producto. [ROADMAP_V2.md](docs/planes/ROADMAP_V2.md) sigue en pausa.
- La documentación larga vive en `docs/` ([índice](docs/README.md)): producto, datos y planes. `STATE.md` se queda en la raíz.
- El trabajo del día se commitea y se sube a `staging`.

## Pendiente

- Reestructura de carpetas: [PLAN_ESTRUCTURA.md](docs/planes/PLAN_ESTRUCTURA.md). Hechos auth, catalog, files, tasks, study, guardian, tripulación, mundos, admin y `src/prompts/`. El acceso a datos ya es TypeORM. Siguiente: frontend, desde F1.
- Retomar [ROADMAP_V2.md](docs/planes/ROADMAP_V2.md) cuando se decida (WhatsApp y Flutter). El resumen diario ya es un script de una pasada.
- En Render / pd: `npm run db:reset:pd -- --yes` (borra el schema `taskia` y reaplica migraciones) si el schema viejo no cuadra.
- Los instantes ya guardados (si quedan) están corridos +5 h. No se corrigen hasta que se pida.

## Cómo correrlo

```bash
npm run install:all
npm run db:migrate
npm run dev
npm run build
```

Variantes: `dev:pd`, `build:qa`, `build:pd`.
