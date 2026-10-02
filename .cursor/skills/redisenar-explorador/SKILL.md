---
name: redisenar-explorador
description: >-
  Hace el rediseño visual completo de Taskia, con prioridad en el explorador
  (niños de unos 10 años): estilo Expedición, Tailwind y las pantallas hub,
  Campamento, estudio, mundos, tropas, desafíos y barra de XP. Conserva
  reglas de producto y copy. Usar cuando pidan rediseñar, un estilo nuevo,
  Tailwind, hacer más divertida o más fácil la web o la vista del explorador.
---

# Rediseño del explorador

Taskia es estudio con sensación de juego. El rediseño visual es completo: layout, material, tipo y movimiento nuevos. El público es el **explorador** (niño, ~10 años, español latinoamericano). Guardián y Administrador heredan color y tipo, y siguen siendo herramientas de adulto.

Cambia cómo se ve y se recorre. No cambia qué puede hacer cada rol.

## Antes de tocar UI

1. [FUNCIONES.md](../../../FUNCIONES.md) — Parte B. Si el cambio toca al adulto, también Parte A.
2. [ROADMAP_TROPAS.md](../../../ROADMAP_TROPAS.md) — «Decisiones cerradas». Las oleadas ya están cerradas.
3. [STATE.md](../../../STATE.md) — copy y UI vigentes.

Si el código y esos docs se contradicen, manda el código.

## Estilo Expedición

Un cuaderno de campamento que se juega. Papel cálido de día, cielo oscuro de noche. La diversión está en los lugares (hub, fichas, nivel), no en decorar cada botón.

Material:

- Claro: fondo papel cálido, tinta azul noche, paneles casi blancos. El gris frío de dashboard no entra.
- Oscuro: fondo noche, paneles un paso más claros, acento luminoso. El mismo acento que el niño eligió.
- El acento sigue siendo el de `src/accent.tsx` (`blue`, `teal`, `green`, `amber`, `rose`, `pink`, `violet`) y el tema el de `src/theme.tsx`. No borres el selector ni las claves `taskia-theme` y `taskia-accent`.
- Sombra corta. El borde se nota. Nada de neón ni de arcoíris por control.

Forma:

- **Hub:** tres lugares grandes, no tres ítems de menú. Cada puerta es una superficie con icono Phosphor duotone grande y una mancha del acento. Campamento puede pesar un poco más. Sin personajes ilustrados a medida en esta pasada.
- **Fichas** (tarea, misión, miembro de tropa): tarjeta con radio amplio, una franja del acento y el dato importante arriba (materia, estado, rol).
- **Estudio y desafío:** hoja más plana y quieta, para leer y responder. Menos sombra, menos mancha.
- **Guardián y Admin:** misma tinta y mismo papel, radio menor, sin fichas de juego. Las tablas siguen siendo tablas.

Tipo, ya cargadas en `src/index.css`:

- Títulos de lugar, nivel y puertas: **Fredoka**.
- UI, chat y lectura: **Nunito**.
- No sumes una tercera familia.

Movimiento, con `framer-motion` (ya está en el frontend):

- Aparición de las puertas del hub, el aviso de **+XP** y el cambio de vista del explorador.
- Quieto en el chat, en la pizarra, en listas largas y en las tablas del adulto.

Iconos: Phosphor. Duotone en puertas y marcas; regular en controles chicos. No añadas otro set.

## Qué sí y qué no

Sí:

- Sustituir el CSS a mano de las pantallas que rediseñes.
- Adoptar **Tailwind CSS v4** con `@tailwindcss/vite` como sistema de estilo.
- Rehacer jerarquía, vacíos, errores y el feedback de XP dentro del estilo Expedición.

No:

- Reglas de estudio, candado de Listo, `study_passed`, fórmulas de XP, cupo de tropa, roles ni el tope de 20 tareas/día.
- Saltar el hub al entrar.
- Mover sola la tarea a Listo cuando Taskia da el visto. La misión sí pasa a Lista sola.
- Inventar pantallas (estudio grupal, chat de tropa, registro público).
- Cambiar el backend salvo para mostrar un dato que la API ya devuelve.
- Montar MUI, Chakra, Ant, shadcn u otra librería de componentes. Ya existen `ModalShell`, `DataTable`, dnd-kit, Recharts y Phosphor. Un hueco de UI se resuelve con Tailwind sobre esos componentes.
- Sustituir `@dnd-kit` en el Campamento. El arrastre y el hueco donde cae la tarjeta se ven.

Copy fijado en la UI del explorador:

- **Taskia** (la guía; en copy visible no se dice tutor, IA ni bot)
- Puertas **Tropas**, **Mundos**, **Campamento**
- Columnas **Por hacer / Haciendo / Estudiando / Listo**
- Niveles **Bajo / Medio / Alto**
- Fases **Entendiendo / Practicando / Repasando**
- Roles **Capitán / Copiloto / Explorador**
- Desafío: **Calentamiento / Aventura / Jefe final**, **¡Empezar!**, **¡Ya terminé!**
- Guardián y Explorador en superficies nuevas

## Tailwind

El estilo vivo hoy está en `taskia_frontend/src/index.css` (miles de líneas) y se importa desde `src/main.tsx`. Vite está en `taskia_frontend/vite.config.ts`, solo con el plugin de React.

Al empezar un rediseño, aunque el pedido sea una sola puerta:

1. Instala `tailwindcss` y `@tailwindcss/vite`. Añade el plugin en `vite.config.ts`.
2. Crea `src/styles/expedicion.css`. Importa el theme y las utilities de Tailwind. **No importes preflight** mientras `index.css` siga pintando pantallas viejas: el reset rompe ese CSS.
3. Define el material Expedición en `@theme` como utilidades (`bg-paper`, `text-ink`, `bg-accent`, radios de ficha y de hoja). Esas utilidades leen las variables que ya pisan `[data-theme]` y `[data-accent]`. Así el selector de apariencia sigue mandando.
4. Importa la hoja nueva junto a `index.css`.
5. La puerta que migres pasa a clases de Tailwind. Borra enseguida las reglas de `index.css` / `App.css` que solo usaba esa puerta.
6. Cuando no quede CSS global viejo, importa preflight y retira `index.css`.

No reescribas las miles de líneas a mano ni dejes utilidades sueltas copiando hex en cada componente. El acento y el tema viven en un solo sitio.

## Orden

Un pedido de «rediseño» recorre las nueve puertas. Un pedido de una sola puerta igual deja Tailwind y los tokens montados, y migra esa puerta. Cada puerta queda usable antes de abrir la siguiente.

1. **Base** — Tailwind, tokens, fuente, tema y acento funcionando en una pantalla.
2. **Hub** — `src/pages/HubPage.tsx`. Tres lugares. `ExplorerXpBar` visible.
3. **Campamento** — `BoardPage`, `KanbanColumn`, `TaskCard`, `BoardFilters`, modales de tarea. Cuatro columnas. El chip de visto no parece el control que mueve la tarjeta.
4. **Estudio** — `src/components/study/*`, `StudyPage`, `MissionStudyPage`. Fases, chat, voz y pizarra distinguibles. Volver al Campamento o al curso siempre a mano. En móvil, chat y pizarra se alternan; en escritorio pueden convivir.
5. **Mundos** — `src/pages/worlds/*`, `src/components/worlds/*`. Casa → mundo → curso → misión. Progreso: Sin temas / Sin empezar / En marcha / Listo.
6. **Tropas** — `src/pages/TroopsPage.tsx`. Mi tropa, roles, invitación, ranking interno por nivel y ranking semanal de tropas.
7. **Desafíos** — `ChallengePlayPage`, `ChallengeSetupModal`. Pregunta n de total, y el resultado (qué respondió / qué se esperaba) se lee solo.
8. **Entrada** — `AuthPage`, `AppearanceTools`, `SessionActions`. La usan el niño y el adulto: clara, sin jerga.
9. **Adultos** — `GuardianPage`, `AdminPage`, `src/pages/admin/*`. Misma base visual, densidad de herramienta. No conviertas el dashboard en el hub.

`App.tsx` guarda la vista (`hub`, `troops`, `board`, `worlds`, `world`, `course`, `mission`, `study`, `challenge`). Conserva volver al hub. Cambia ese mapa solo si el rediseño no cabe en él.

Estados a diseñar en la puerta que toques: sin materias, sin tropa, invitación pendiente, candado de Listo, Taskia pensando, desafío abandonado, ranking vacío.

Si un cambio de copy visible contradice FUNCIONES o STATE, actualiza el doc en el mismo turno.

## Verificar

`npm run dev` desde la raíz. Explorador **Seroven** / **123456**: recorre cada puerta migrada, haz la acción principal y vuelve al hub. Prueba claro, oscuro y otro acento. Si cambiaste tokens o preflight, abre al Guardián **Claudia** / **123456** y confirma que el panel sigue legible.

`npm run build` en `taskia_frontend` tiene que pasar. No cierres con una sola captura del hub.
