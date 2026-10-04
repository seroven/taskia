# Plan TypeORM — Taskia

Pasar **todo el acceso a datos en runtime** de SQL con sabor MySQL (`?`, `is_active = 1`, traductor `mysqlToPg`) a TypeORM sobre Postgres. Las respuestas HTTP, el esquema y el producto se quedan como están. El frontend no entra en este plan.

Este plan reemplaza la decisión “no hay ORM” de [PLAN_ESTRUCTURA.md](PLAN_ESTRUCTURA.md). El envelope `{ status, data }`, el prefijo `/api`, shadcn y el catálogo UI siguen fuera.

## Por qué

El backend habla un dialecto que ya no usa ningún servidor. Cada `pool.query` reescribe el texto en `mysqlToPg` (`taskia_backend/src/infrastructure/database/sql.ts`) y recién entonces lo ejecuta `pg`. Postgres es el único gestor. Las migraciones de `db/migrations/` ya son SQL de Postgres. Las de `db/migrations_mysql_legacy/` no se aplican.

El costo a largo plazo es ese traductor: lista cerrada de booleanos, comillas a `"role"`, `RETURNING *` para simular `insertId`, y fragmentos de zona horaria interpolados. Una columna booleana nueva que se compare con `= 1` falla en Postgres si no está en la lista.

## Qué no cambia

- Rutas, cookies, códigos HTTP y JSON de cada endpoint.
- Roles, XP, día civil `America/Lima` para la semana y el tope de tareas, `tasks.due_date` como día de calendario.
- Archivo de mundos y vínculos (`is_active = false`). El descarte de un desafío a medias sigue siendo el único borrado duro de ese flujo.
- Prompts en `src/prompts/`. Gemini no se toca salvo el `INSERT` de `llm_usage`.
- `PG_SCHEMA` (por defecto `taskia`), `PG_DSN` o `PG_HOST` / `PG_PORT` / `PG_USER` / `PG_PASSWORD` / `PG_DATABASE`, y `PG_SSLMODE`.
- El runner `db/migrate.mjs` y la tabla `schema_migrations`.

## Decisiones de este plan

1. **Un solo `DataSource` de Postgres.** No se copia el template (varias conexiones, codegen, driver MySQL).
2. **`synchronize: false` y `dropSchema: false` siempre**, en todos los entornos. El esquema lo siguen creando las migraciones. TypeORM no crea ni altera tablas.
3. **El DDL sigue en `db/migrations/`.** Esos archivos ya son Postgres (triggers `set_updated_at`, FKs `DEFERRABLE`, índices únicos parciales, checks, semillas `.mjs` con bcrypt). TypeORM no los expresa bien y rehacer el historial en bases ya migradas no aporta. Un cambio de columna futuro es dos archivos en el mismo corte: la migración SQL nueva y la entidad.
4. **`schema_migrations` no es una entidad.**
5. **Las entidades no salen por HTTP.** El repository de cada módulo mapea a los mismos objetos que hoy devuelve `mapTask` y el resto. Un controller no hace `res.json(entity)`.
6. **Relaciones declaradas, `eager: false`, `cascade` de TypeORM apagado.** Los `ON DELETE` los sigue aplicando Postgres. Cargar un grafo es un `QueryBuilder` explícito, igual que el `JOIN` de hoy.
7. **`created_at` y `updated_at` los pone la base** (default `NOW()` y el trigger). Las entidades no usan `@CreateDateColumn` ni `@UpdateDateColumn`, para no pisar el trigger con un timestamp armado en Node.
8. **Durante la migración conviven el `pool` viejo y el `DataSource`.** Cada corte pasa un módulo. `mysqlToPg` se borra solo cuando no queda ningún `pool.query` de negocio.
9. **Mundos y admin se parten a módulo y se pasan a TypeORM en el mismo corte.** No se mueve el SQL MySQL a un repository para reescribirlo después.
10. **NodeNext se queda.** El primer corte prueba decoradores. Si `tsc` no emite metadata usable, las mismas clases pasan a `EntitySchema` sin cambiar carpetas ni el orden del plan.

## Contratos que el ORM no puede “adivinar”

Estos son los comportamientos que hay que fijar en el corte 0. Si uno sale distinto, el JSON de la API cambia.

| Hoy | Cómo queda en la entidad |
| --- | --- |
| `BIGINT` llega como número (`pg.types` OID 20) | Transformer `bigint` → `number`. Sin esto TypeORM entrega string y `id: "12"` rompe al frontend. |
| `NUMERIC` OID 1700 como número | El mismo transformer donde haya importes o XP si el driver los devuelve como string. `xp_total` es `BIGINT`. |
| `DATE` (`due_date`, `summary_date`, `week_start`) llega como texto `YYYY-MM-DD` (OID 1082) | Columna `type: 'date'` con transformer que devuelve `YYYY-MM-DD` y no un `Date`. Un `Date` a medianoche UTC corre el día en Lima. La salida sigue pasando por `formatCivilDate`. |
| `TIMESTAMPTZ` | `Date` en la entidad. La respuesta HTTP sigue usando `toInstantISO`. |
| Booleanos | `boolean` en la entidad. El mapeo de salida se queda (`Boolean(...)` / lo que el endpoint manda hoy). No cambiar `true` por `1` ni al revés. |
| Columna `"role"` | Propiedad `role`. TypeORM cita identificadores; no hace falta el reemplazo del traductor. |
| `INSERT` + `insertId` | La entidad guardada trae `id`. Donde hoy se mira `affectedRows === 0` tras `ON CONFLICT DO NOTHING`, el corte 0 fija qué devuelve `.orIgnore()` (fila vacía o `raw`) y el repository traduce eso al mismo “ya existía, no otorgues de nuevo”. |
| `JSONB` (`board_json`, `options_json`, `prompt_draw_ops`, `planet_params`, draws) | `type: 'jsonb'`. Mismo valor que hoy persiste el código (objeto o array, no un string re-serializado distinto). |

Índices únicos parciales que la entidad documenta y **no** intenta recrear:

- `uq_troop_members_user_active` (un explorador, una tropa activa)
- `uq_troop_members_captain_active` y `uq_troop_members_copilot_active`
- `uq_troop_invites_pending_invite` y `uq_troop_invites_pending_request`

FKs compuestas y diferibles (`tasks` → `courses (id, user_id)`, desafíos → mundo/misión) viven en la migración. La entidad declara las columnas; no activa `cascade` de TypeORM para imitarlas.

## Árbol

```text
taskia_backend/src/infrastructure/database/
├── data-source.ts          # DataSource único, initialize en index.ts
├── column-types.ts         # transformers bigint y date civil
├── entities/               # una clase por tabla, sin reglas de producto
│   ├── user.entity.ts
│   └── …
├── pool.ts                 # se vacía al final del plan
└── sql.ts                  # se borra al final
```

Cada módulo conserva su repository. Ese archivo pasa de `pool.query` a `dataSource.getRepository(Entity)` o a un `EntityManager` recibido cuando hay transacción. El service no importa TypeORM salvo que ya hoy reciba la conexión (tropas, XP, admin). En esos casos el service arma la transacción y el repository opera con el `EntityManager`.

`initDb()` abre el `DataSource` (schema `PG_SCHEMA`, SSL igual que el pool) y deja de depender de `search_path` manual cuando el corte 0 lo compruebe. Hasta entonces el pool viejo sigue haciendo `SET search_path`.

## Tablas (28 entidades)

Cuentas y catálogo: `roles`, `users` (incluye `level`, `xp_total`, avatar y marco), `courses`, `difficulties`.

Tablero: `tasks`.

Tutor de tarea: `study_sessions`, `study_messages`, `study_boards`, `user_study_memory`. Las tres primeras de sesión/pizarra/memoria usan la clave del dueño como PK (`task_id` o `user_id`), no un `id` propio.

Mundos: `study_worlds`, `study_world_courses`, `study_missions`, `study_mission_sessions`, `study_mission_messages`, `study_mission_boards`.

Desafíos: `study_challenges`, `study_challenge_questions`, `study_challenge_answers`, `study_challenge_presets`.

Guardián: `parent_student_links`, `parent_notify_prefs`, `student_daily_summaries`, `parent_chat_messages`.

Resto: `llm_usage`, `xp_awards`, `troops`, `troop_members`, `troop_invites`.

## Cómo se escribe cada tipo de consulta

| Patrón actual | Reemplazo |
| --- | --- |
| `SELECT` por id y dueño | `findOne({ where: { id, userId } })` |
| `INSERT` / `UPDATE` de columnas conocidas | `save` o `update` con el objeto parcial. No mandar `undefined` en columnas que hoy el `UPDATE` deja quietas. |
| `WHERE` que crece según filtros (tareas, admin) | `QueryBuilder` y `.andWhere` solo si el filtro vino |
| `ON CONFLICT DO NOTHING` | `.orIgnore()` sobre el índice único de esa tabla |
| `ON CONFLICT DO UPDATE` (pizarra, memoria, vínculo que se reactiva) | `.orUpdate([...], conflicto)` con la misma lista de columnas que el SQL |
| Varias sentencias que hoy hacen `beginTransaction` | `dataSource.transaction(async (manager) => …)` |
| `ILIKE` de exploradores | `.andWhere('user.username ILIKE :q', { q })` con el mismo escape de `%` y `_` que el código actual |
| `SUM(amount)`, conteos de admin | `select` + `addSelect` con `SUM` / `COUNT` en el builder. El resultado se mapea a número. |
| `SUM(status = 'mastered')` (mundos) | `SUM(CASE WHEN status = :mastered THEN 1 ELSE 0 END)`. El traductor hoy lo convierte a `::int`; el builder lo escribe en Postgres directo. |
| Día civil de un `timestamptz` | Parámetro `:tz` ya validado por `parseViewerTz`. Prohibido interpolar la zona en el texto. `due_date` se compara como fecha, sin `AT TIME ZONE`. |
| Tope de invitaciones “hoy” en Lima | El rango `[día, día+1)` en `America/Lima` se queda como condición del builder, con la fecha como parámetro. |
| Ranking semanal `COALESCE(SUM(a.amount), 0)` | QueryBuilder con `leftJoin` a `xp_awards` y el mismo `week_start`. |

`civilDateSql` / `andCivilDate` dejan de devolver SQL con `?`. Pasan a una función que recibe el `SelectQueryBuilder` y agrega los `andWhere`. La validación de zona (lista IANA u offset) no se afloja.

No queda ningún `?` ni ninguna llamada a `mysqlToPg`. Si una consulta de admin no cabe en el builder sin volverse ilegible, se escribe en **Postgres nativo** (`$1`, booleanos reales, `"role"`) dentro del repository de admin, con un comentario de una línea que diga por qué. Eso es la excepción, no el camino normal, y no vuelve el traductor.

## Orden de cortes

Cada corte compila (`npm run build` en `taskia_backend`), arranca contra una base migrada y pasa la prueba de esa fila. No se mezcla con el rediseño del frontend.

### T0 — Cimiento

- Dependencias: `typeorm`, `reflect-metadata`. El driver sigue siendo `pg` (TypeORM lo usa por debajo).
- `tsconfig`: `experimentalDecorators` y `emitDecoratorMetadata`. Import de `reflect-metadata` en `src/index.ts` antes que el resto.
- `data-source.ts` lee el mismo `env.pg` que el pool (DSN o host, schema, SSL).
- Transformers de bigint y date, probados con una lectura de `users.id` y de `tasks.due_date`.
- Entidades de las 28 tablas, columnas alineadas a `001` + `003` + `006` + `007` + `008` + `009`. Sin métodos de negocio.
- Prueba de `orIgnore` contra `xp_awards`: la segunda inserción de la misma `(user_id, source_type, source_id)` no duplica y el repository lo distingue de un insert nuevo.
- `index.ts` llama `dataSource.initialize()` junto al `initDb` actual.
- El pool viejo sigue sirviendo al resto de la app.

Hecho cuando: la app arranca, una entidad lee un usuario semilla y un `due_date` sale `YYYY-MM-DD` sin correrse de día.

### T1 — Auth, catálogo, sesión, roles, uso de IA

Archivos: `modules/auth/repositories/user.repository.ts`, `modules/catalog`, `middleware/auth.middleware.ts`, `infrastructure/database/roles.ts`, el `INSERT` de `llm_usage` en `gemini.client.ts`.

Consultas aproximadas: auth 10, catálogo 2, middleware 2, roles 1, gemini 1.

Hecho cuando: login de `Sebastian`, `Seroven` y `Claudia`; rechazo de registro público; perfil (username, email, password vacío = no cambiar); avatar; `GET /courses` y `GET /difficulties`; una llamada que registre `llm_usage` no rompe.

### T2 — Tareas

`modules/tasks/repositories/task.repository.ts` (9 consultas, una transacción de reorder).

Hecho cuando: listar con y sin filtros (estado, materia, día, rango de creación); crear tarea diaria con el día del visor; editar; mover de columna; reordenar. El JSON de la tarea (nombres de materia y dificultad, `due_date`, booleanos, instantes) coincide con el de antes del corte.

### T3 — Estudio de tarea

`modules/study/repositories/study.repository.ts` (14 consultas, tres `ON CONFLICT`: sesión, pizarra, memoria).

Hecho cuando: abrir estudio, guardar pizarra dos veces (la segunda actualiza), chat que persiste mensajes, memoria de usuario que hace upsert, `study_passed` que desbloquea Listo sin mover la columna sola.

### T4 — Guardián

`modules/guardian/services/guardian.service.ts` (19 consultas). El SQL sale del service hacia `repositories/`. El prefijo HTTP sigue siendo `/parent`.

Incluye el upsert de preferencias (`ON CONFLICT (parent_id) DO NOTHING`) y el resumen del día civil del visor.

Hecho cuando: Claudia ve a Seroven; sin fila en `student_daily_summaries` el chat dice que no hay resumen; con fila, usa ese texto; preferencias de WhatsApp se crean una vez.

### T5 — XP

`services/xp.ts` (4 consultas, transacción con `ON CONFLICT DO NOTHING`). Puede vivir ya en `modules/progression` si el movimiento es solo de carpeta en este corte. Otros módulos llaman al service, no al repository.

Hecho cuando: pasar a Listo sin estudio suma 10 XP una sola vez; un segundo intento no suma; el estudio que ya pagó XP no vuelve a pagar en Listo; `xp_total` y `level` quedan iguales a la fórmula actual; el conteo del día en `America/Lima` no usa el reloj del servidor.

### T6 — Tropas

`modules/troops/services/troop.service.ts` (39 consultas, varias transacciones: alta, salir, promover sucesor). El SQL pasa a `repositories/`.

Hecho cuando: crear tropa, invitar, solicitar, aceptar, rechazar, promover, salir del capitán (sucesor), búsqueda `ILIKE`, tope de invitaciones del día en Lima, planeta (`planet_params`) se guarda y se lee igual. Un explorador no queda en dos tropas activas.

### T7 — Mundos y desafíos

`src/routes/worlds.ts` (~61 consultas) se parte a `modules/worlds/` (routes, controllers, schemas Zod que aceptan lo mismo, services, repositories) **y** las consultas nacen en TypeORM. No hay una parada intermedia con `pool.query`.

Transacciones y conflictos a cuidar: sesión de misión, pizarra de misión, reactivar `study_world_courses`, conteos `mastered` / `studying` / `pending`, generación y nota del desafío.

Hecho cuando: crear mundo y misión; vincular materia; estudiar misión con y sin pizarra; dominar misión; armar desafío de tema, materia y mundo; calificar; abandonar un desafío a medias lo borra; archivar mundo no lo borra.

### T8 — Admin

`src/routes/admin.ts` (~80 consultas) se parte a `modules/admin/` del mismo modo.

Transacciones a cuidar: crear explorador ya vinculado, reactivar vínculo (`ON CONFLICT … DO UPDATE SET is_active = TRUE`), crear preferencias del guardián.

Hecho cuando: el dashboard responde; alta de guardián y explorador exige vínculo; no hay alta suelta; archivar y reactivar vínculo; filtros de listados devuelven los mismos totales.

### T9 — Cierre

- Cero `pool.query` y cero `getConnection` fuera de lo que se borra.
- Borrar `sql.ts`, el wrapper MySQL de `pool.ts` y los tipos `RowDataPacket` / `ResultSetHeader` si ya no se usan. El `DataSource` es la única puerta.
- Quitar la trampa del traductor en [BASE_DE_DATOS.md](BASE_DE_DATOS.md) y describir las entidades y los transformers.
- `rg "mysqlToPg|\\?"` en `src/` no encuentra placeholders de SQL. Un `?` de TypeScript ternario no cuenta; se revisa a mano el diff de ese grep.

Hecho cuando: `npm run db:reset` + `npm run db:migrate` + la lista de humo de abajo, en local, de punta a punta.

## Humo (local, después de cada corte y entero en T9)

Base vacía recreada con `npm run db:reset` y `npm run db:migrate`. Cuentas semilla: admin `Sebastian`, explorador `Seroven`, guardián `Claudia`, password `123456`.

1. Login de los tres. Registro público responde 403.
2. Seroven crea una tarea diaria, la mueve, la reordena, la pasa a Listo sin estudio y gana 10 XP una sola vez.
3. Abre estudio de una tarea alta, guarda la pizarra dos veces, cierra.
4. Crea un mundo, una misión, la estudia y la marca dominada.
5. Genera un desafío corto y lo abandona: no queda a medias.
6. Crea o usa una tropa demo: invita, acepta, el ranking de la semana no duplica XP.
7. Claudia abre el chat. Sin resumen de hoy, la respuesta lo dice.
8. Sebastian abre Guardianes y Exploradores y ve el vínculo Claudia–Seroven.
9. Comparar, en una tarea y en un usuario, que `due_date` es `YYYY-MM-DD` y que `created_at` sigue siendo un instante ISO. Repetir con la zona del visor en `America/Lima` y en un offset.

No hace falta Vitest para cerrar el plan. Si un corte se pone frágil (XP o el reorder), se agrega un script de humo que llame HTTP, no una suite paralela.

## Riesgos

- **`orIgnore` no expone `affectedRows`.** El corte 0 lo mide. Si el resultado no distingue “insertó” de “chocó”, el repository de XP usa `INSERT … ON CONFLICT DO NOTHING` en Postgres nativo dentro de la transacción, y el resto del módulo sigue en el ORM. El traductor MySQL no vuelve.
- **Día corrido.** Cualquier `date` mapeado a `Date` de JS se ve enseguida en el humo 9. No se da por bueno un corte de tareas sin esa comparación.
- **Doble escritura de `updated_at`.** Si alguien agrega `@UpdateDateColumn`, el trigger y Node pueden discrepar. Prohibido en las entidades.
- **N+1.** Cargar `task.course` y `task.difficulty` con lazy en un listado dispara una query por fila. El listado usa un join, como `TASK_SELECT`.
- **Schema equivocado.** Si el `DataSource` no apunta a `PG_SCHEMA`, lee `public` vacío y el login falla con “usuario no existe”. El corte 0 lo comprueba leyendo el rol semilla.
- **Admin y mundos son la mayor parte del SQL** (~140 consultas entre los dos). Van al final, cuando los transformers y las transacciones ya se probaron en XP y tareas.

## Fuera de este plan

- Frontend, React Router, TanStack Query.
- Reescribir `001_initial.sql` como migraciones de TypeORM.
- Borrar `migrations_mysql_legacy/` (sigue como historia, sin aplicarse).
- Workers, WhatsApp y Flutter de [ROADMAP_V2.md](ROADMAP_V2.md).
- Cambiar nombres de tablas o de columnas para que “queden más ORM”.

## Avance

- **T0 hecho.** TypeORM 1 (`synchronize: false`), 28 entidades en `src/infrastructure/database/entities/`, transformers de bigint y de fecha civil, estrategia de nombres snake_case. `scripts/t0-check.ts` contra Postgres local, dentro de una transacción que hace rollback: `users.id` es número, `due_date` vuelve `YYYY-MM-DD`, `orIgnore()` devuelve 1 fila la primera vez y 0 en el conflicto. El pool viejo sigue atendiendo las consultas. El servidor abre el `DataSource` al arrancar.
- Las relaciones `@ManyToOne` se declaran en el corte que haga el join. Ponerlas junto a la columna del id duplica el mapeo.
- **T1 hecho.** Auth, catálogo, sesión (`requireAuth`, vínculo guardián), `roleIdByCode` y el `INSERT` de `llm_usage` leen y escriben por las entidades. `scripts/t1-check.ts` leyó a Sebastian (admin, id numérico, `is_active` boolean), las tres dificultades y el id del rol `user`. `roleCodeEquals` sigue siendo un fragmento SQL: lo usan admin y mundos, que todavía no se movieron.
- **T2 hecho.** El módulo de tareas (listar con filtros, crear, editar, mover y reordenar) usa las entidades. `scripts/t2-check.ts` creó una tarea diaria, la leyó con materia y dificultad, la filtró por `due_on` y la borró. El reorden sigue en una transacción del `DataSource`.
- **T3 hecho.** Estudio de tarea: sesión, mensajes, pizarra, memoria y `study_passed` van por entidades. Los `ON CONFLICT` de sesión, pizarra y memoria usan `orIgnore` / `orUpdate`. La latencia de respuesta (tarea y misión) también. `scripts/t3-check.ts` abrió sesión dos veces, reemplazó la pizarra, hizo upsert de memoria, guardó mensajes y marcó la tarea aprobada; después borró esa tarea de prueba y restauró la memoria previa.
- Siguiente: **T4** guardián.
