# Plan de estructura — Taskia alineado a los templates

Reordenar archivos y capas de `taskia_frontend` y `taskia_backend` para trabajar como `template_frontend` y `template_backend`. El producto, el diseño, los contratos HTTP y el esquema de Postgres se quedan como están.

Las decisiones de la sección final quedaron confirmadas. El reorden está en curso: se mueven capas sin cambiar producto, diseño, contratos HTTP ni el esquema.

## Qué se busca

Misma forma de ubicar el código y la misma dirección de dependencias que los templates:

```text
Frontend:  página / componente  →  hook  →  service  →  cliente HTTP compartido

Backend:   ruta  →  controller  →  service  →  repository / integración
```

Un módulo agrupa un dominio. `shared` no conoce reglas de Taskia. Un módulo no importa el interior de otro; solo una API pública explícita.

## Qué queda fuera

Los templates traen stack y producto que Taskia no va a adoptar en este trabajo:

| Del template | En Taskia |
| --- | --- |
| Codegen, `BaseRepository`, varias conexiones, driver MySQL | Un solo DataSource Postgres. El acceso a datos ya es TypeORM. El DDL sigue en `db/migrations/` |
| Envelope `{ status, data }` y prefijo `/api` | JSON actual y rutas actuales (`/auth`, `/tasks`, `/worlds`, …) |
| TanStack Query, React Router, shadcn, Tailwind, catálogo `/ui` | Fetch y navegación por estado actuales; CSS y componentes actuales |
| Google OAuth, mailing CIA, PDF, tests de plantilla | No se copian |
| Reglas `.cursor` de diseño, mailing y work-menu | No se copian. Al final, una regla corta de arquitectura adaptada a Taskia |

Zod ya está en `taskia_backend/package.json` y no se usa. Si se confirma, entra solo como archivo de validación por entidad, aceptando lo mismo que hoy acepta cada ruta.

## Cómo está Taskia hoy

Un solo repo. Apps en `taskia_frontend/` y `taskia_backend/`. Eso se mantiene: los templates son repos sueltos; Taskia no se parte.

### Frontend

`src/` mezcla arranque, sesión, API y pantallas en la raíz (`App.tsx`, `auth.tsx`, `api.ts`, `types.ts`, `theme.tsx`, `toast.tsx`). No hay alias `@/`, ni router de URLs, ni capa de hooks/services.

`api.ts` (~755 líneas) es un solo objeto con todas las llamadas: auth, tareas, estudio, mundos, admin, guardián y tropas.

Las páginas importan ese objeto y mezclan fetch, estado y JSX. Las más grandes:

| Archivo | Líneas aprox. |
| --- | --- |
| `pages/TroopsPage.tsx` | 1058 |
| `pages/admin/AdminStudentPage.tsx` | 1038 |
| `pages/admin/AdminCharts.tsx` | 751 |
| `pages/admin/AdminAccountsPage.tsx` | 730 |
| `pages/admin/AdminWorldsExplorer.tsx` | 608 |
| `pages/worlds/ChallengePlayPage.tsx` | 589 |
| `pages/GuardianPage.tsx` | 420 |
| `pages/BoardPage.tsx` | 413 |

El estudio ya no tiene lienzo. `StudyChat.tsx` es la UI del chat y se mueve de carpeta; no se parte salvo que al moverlo se vea lógica de API mezclada.

La navegación del explorador es un `useState` de vistas dentro de `App.tsx` (hub, tropas, campamento, estudio, mundos, desafío). Admin y Guardián son pantallas aparte según el rol.

### Backend

`app.ts` monta diez routers. Cada archivo de `src/routes/` hace a la vez HTTP, validación, SQL y reglas. Conteos de `pool.query` y tamaño:

| Archivo | Líneas aprox. | `pool.query` |
| --- | --- | --- |
| `routes/worlds.ts` | 2130 | 56 |
| `routes/admin.ts` | 2110 | 74 |
| `routes/troops.ts` | 897 | 35 |
| `routes/study.ts` | 570 | 12 |
| `routes/parent.ts` | 368 | 19 |
| `routes/tasks.ts` | 366 | 11 |
| `routes/auth.ts` | 255 | 12 |

Ya existen piezas sueltas que el template pondría en infraestructura o en un módulo: `services/gemini.ts`, `services/xp.ts`, `services/files.ts`, `db/`, `middleware/`. No hay controllers, schemas ni repositories.

`src/index.ts` equivale al `server.ts` del template (abre DB y escucha). Se queda con ese nombre para no tocar los scripts npm.

## Árbol de destino

Nombres de componente React en PascalCase, como en el template (`UsersListPage.tsx`). Services, hooks, types, controllers y repositories en kebab-case con sufijo de rol (`task.service.ts`, `task.repository.ts`).

### Backend

```text
taskia_backend/src/
├── index.ts
├── app.ts
├── config/env.ts
├── routes/index.ts                 # solo monta routers, sin SQL
├── middleware/                     # singular: es el uso de Taskia, no el plural del template
│   ├── auth.middleware.ts
│   └── error.middleware.ts
├── prompts/                        # textos de Gemini, un archivo por uso
├── infrastructure/
│   ├── database/                   # pool, sql, civilDate, roles de catálogo
│   ├── storage/                    # avatares en disco (hoy services/files.ts)
│   └── gemini/                     # cliente externo (hoy services/gemini.ts)
├── shared/
│   └── errors/app-error.ts
└── modules/
    ├── auth/
    ├── catalog/                    # courses + difficulties
    ├── tasks/
    ├── study/
    ├── worlds/
    ├── troops/
    ├── admin/
    ├── guardian/                   # el URL sigue siendo /parent
    └── progression/                # XP; otros módulos llaman su service
```

Dentro de un dominio con varias entidades, una carpeta de capas y un archivo por entidad (regla del template):

```text
modules/worlds/
├── worlds.routes.ts
├── controllers/   world.controller.ts, mission.controller.ts, challenge.controller.ts, …
├── schemas/
├── services/
├── repositories/
└── types/
```

Un módulo chico de una sola responsabilidad puede usar archivos planos (`catalog`).

El repository envuelve el `pool.query` que ya existe. El service no importa Express ni `Request`. El controller no escribe SQL. La ruta solo encadena middleware, validación y controller.

Gemini y archivos son infraestructura: los services los llaman, no al revés. XP vive en `modules/progression` porque es dominio. Otros services pueden importar ese service. No importan sus repositories.

`db/migrations/`, `db/migrate.ts` y `db/reset.mjs` no se mueven.

### Frontend

```text
taskia_frontend/src/
├── main.tsx
├── index.css
├── app/
│   ├── App.tsx
│   ├── providers/                  # theme, accent, auth, toast
│   └── routes/app-router.tsx       # el switch de vistas actual
├── modules/
│   ├── auth/
│   ├── campamento/                 # tablero, tareas, columnas
│   ├── study/                      # estudio + pizarra
│   ├── worlds/
│   ├── troops/
│   ├── guardian/
│   └── admin/
└── shared/
    ├── api/http-client.ts          # el request() de hoy, con cookies y zona
    ├── ui/                         # ModalShell, DataTable, Field, …
    └── lib/                        # datetime, errors, lo que no es de un dominio
```

Cada módulo de negocio:

```text
modules/<dominio>/
├── pages/
├── components/
├── hooks/
├── services/
├── types/
└── utils/          # solo si ya hay helpers de ese dominio
```

Dependencias públicas permitidas, y solo esas:

- Cualquier módulo puede usar `useAuth` y el tipo de usuario desde `modules/auth`.
- Mundos puede usar la pizarra publicada por `modules/study` (la misión reutiliza el mismo tablero).
- El resto no se cruza. Lo común de verdad va a `shared`.

`shared` no llama endpoints de un dominio. El cliente HTTP solo sabe hacer `request`.

## Cómo se trabaja cada corte

1. Un dominio por vez. La app queda usable al cerrar el corte.
2. Mover y separar capas. El comportamiento visible, el SQL y el JSON de respuesta se copian, no se rediseñan.
3. Al partir una ruta gorda, un archivo por entidad. No un service genérico con `/:resource`.
4. En frontend, al mover una página: el JSX y las clases se quedan; el fetch pasa al service; el estado de carga pasa a un hook si hoy vive en la página.
5. `api.ts` sobrevive como fachada que reexporta los services hasta el último módulo frontend. Recién ahí se borra.
6. Cada corte cierra con build del lado tocado y una pasada manual del flujo de ese dominio.
7. Commit en `staging` solo cuando se confirme, uno por corte coherente.

## Fases

### 0. Confirmar este plan

Sin código. Responder las decisiones abiertas.

### Backend

**B1. Cimientos.** Crear `routes/index.ts`, `shared/errors`, `infrastructure/database`, `infrastructure/gemini`, `infrastructure/storage`. Mover `db/`, `gemini`, `files` y `AppError` sin partir las rutas. `app.ts` solo compone HTTP. Verificar: `npm run build` en backend, login y listar tareas.

**B2. Piloto `auth`.** Partir `routes/auth.ts` en routes / controller / schema / service / repository. Deja el patrón a seguir. Verificar: login, logout, `/me`, avatar.

**B3. `catalog`.** `courses` y `difficulties`. Corte corto para repetir el patrón en archivos chicos.

**B4. `tasks`.** Incluye las reglas de “no pasar a Listo” y el llamado a XP.

**B5. `study`.** Chat, pizarra, transcripción. Gemini entra por infraestructura.

**B6. `guardian`.** Hoy `routes/parent.ts`. El prefijo HTTP sigue `/parent`.

**B7. `troops`.** Universo, solicitudes, planeta. `planetParams` entra en este módulo.

**B8. `worlds`.** El archivo más grande. Partir por mundo, curso del mundo, misión y desafío antes de mover el SQL. No empezar este corte hasta que B2–B5 estén aburridos de tan repetidos.

**B9. `admin`.** Igual que mundos: dashboard, cuentas, cursos del explorador, revisión. Último del backend.

**B10. Cierre backend.** Ningún archivo de `modules/*/routes` importa `pool`. `progression` queda como el único service de XP.

### Frontend

Empieza cuando B1 exista, en paralelo con el resto del backend si hace falta. No espera a B9.

**F1. Cliente HTTP.** Alias `@/` en Vite y TypeScript. Extraer `request()` a `shared/api/http-client.ts`. `api.ts` pasa a usar ese cliente y sigue exportando `api`.

**F2. Arranque.** `App.tsx`, providers y el switch de vistas se mudan a `src/app/` sin cambiar pantallas ni transiciones.

**F3. UI compartida.** Mover a `shared/ui` y `shared/lib` lo que ya es transversal: `ModalShell`, `DataTable`, campos, `datetime`, `errors`, toasts. Sin cambiar estilos.

**F4–F10. Un módulo por corte**, en este orden: `auth`, `campamento`, `study`, `guardian`, `troops`, `worlds`, `admin`. En cada uno: pages, components, types, service (sale de `api.ts`) y hook donde la página hoy mezcla carga y render.

**F11. Cierre frontend.** Borrar la fachada `api.ts`. Ninguna página llama `fetch`. Build de frontend y recorrido de hub, campamento, estudio, mundos, tropas, guardián y admin.

### Regla de arquitectura

Cuando B10 y F11 estén hechos, añadir en `.cursor/rules/` una regla corta con el flujo de capas, las dependencias permitidas y la lista de “fuera de alcance” de este documento. No copiar las reglas de UI ni de mailing del template.

## Criterio de hecho

- La carpeta de cada dominio se entiende sin abrir un archivo de mil líneas que haga HTTP y SQL juntos.
- Una ruta nueva tiene sitio claro: schema, controller, service, repository, y en el cliente service + hook + page.
- Login, campamento, estudio, mundos, tropas, guardián y admin se comportan como antes del corte.
- No hay diff de diseño ni de contrato en el corte.

## Decisiones confirmadas

1. La navegación sigue siendo el switch de vistas. Se muda a `src/app/routes` cuando toque el frontend.
2. Los hooks envuelven el `fetch` actual.
3. Al partir un módulo del backend, la validación pasa a `schemas/` con Zod y acepta lo mismo que antes.
4. Este plan no monta Vitest.
5. Backend primero. Mundos y admin al final. Frontend desde F1 en paralelo cuando el cliente HTTP se extraiga.
6. El acceso a datos ya es TypeORM. El envelope `{ status, data }`, el prefijo `/api`, shadcn y el catálogo UI siguen fuera. Mundos y admin no se parten a `pool.query`: se parten ya sobre el ORM.

## Avance

Hecho y compilado (`npm run build` en `taskia_backend`):

- **B1.** `routes/index.ts`, `shared/errors`, `infrastructure/database`, `infrastructure/gemini`, `infrastructure/storage`, `middleware/`.
- **Prompts.** Textos de Gemini en `src/prompts/` (`index.ts` reexporta). Los services y el cliente solo los importan.
- **B2.** `modules/auth`.
- **B3.** `modules/catalog` (cursos y dificultades) y `modules/files` (descarga de avatares).
- **B4.** `modules/tasks`.
- **B5.** `modules/study` (routes, controller, schema, service, repository).
- **B6.** `modules/guardian`. El prefijo HTTP sigue siendo `/parent`.
- **B7.** `modules/troops`. `planetParams` está en `modules/troops/lib/planet-params.ts`.
- **Mundos y admin.** `modules/worlds/` y `modules/admin/`. El acceso a datos de todo el backend es TypeORM.

Siguiente: frontend, desde F1.
