# Taskia — Plan de rediseño: Universo de Tropas (Space Canvas)

Fuente de verdad del rediseño del módulo **Tropas** como minijuego espacial interactivo.  
Producto base (roles, cupo, XP, ranking semanal) sigue en [ROADMAP_TROPAS.md](ROADMAP_TROPAS.md).  
Al cerrar oleadas de este plan, actualizar [STATE.md](STATE.md), [FUNCIONES.md](FUNCIONES.md) y [PRODUCTO.md](PRODUCTO.md).

**Marcado:** `- [ ]` pendiente · `- [x]` hecho.

**Guardián / Admin:** fuera de este rediseño. La vista del Guardián se queda como está.

**Decisiones cerradas (2026-10-03):** ver §1; la §11 quedó resuelta.

---

## 0. Visión en una frase

El explorador entra a un **universo espacial** donde cada tropa es un **planeta** disperso al azar. Puede panear, hacer zoom, abrir fichas, ver el ranking semanal y gestionar **solo su tropa** (si es Capitán/Copiloto). No es live ni multiplayer en tiempo real: es un mapa social visual sobre los datos que ya tenemos.

---

## 1. Decisiones de producto cerradas

### 1.1 Estética y tono

- Tropas es un **minijuego espacial** (no “noche Expedición” suave).
- Fondo intergaláctico, partículas/estrellas, planetas, auras Top 3, animaciones “futuristas”.
- Igual debe respetar **tema claro / oscuro** y el **acento** del niño (`taskia-theme`, `taskia-accent`).
- Copy explorador: Capitán / Copiloto / Explorador; sin jerga de oficina.
- Reduced motion: atenuar pan/zoom/glow si `prefers-reduced-motion`.

### 1.2 Quién ve qué

| Situación | Canvas | Card abierto | Acciones |
| --- | --- | --- | --- |
| Con tropa | Universo con planetas | **Su tropa** abierta al entrar | Según rol (ver §1.4) |
| Sin tropa | Universo con planetas | Ninguna tropa “propia”; puede abrir otras en **solo lectura** | Crear tropa / solicitar unirse / aceptar invitaciones recibidas |
| Otra tropa (clic) | Zoom al planeta | Card lectura: miembros, niveles, roles | Sin gestionar; si no tiene tropa → **solicitar unirse** |

- Detalle de miembros: **sí se ve** en el card de cualquier tropa abierta (lectura).
- Gestión (invitar, sacar, copiloto, salir, personalizar planeta): **solo en mi tropa** y solo con permisos.

### 1.3 Ranking (panel aparte del canvas)

- Semanal lun–dom `America/Lima` (como hoy).
- **No websockets / no live.** Se refresca al entrar o al pedir datos.
- Empate de XP semanal: **`xp_week DESC, name ASC`**.
- Panel: primeros **50**, infinite scroll para cargar más; “Ir a mi posición” solo scrollea el panel.
- **Canvas ≠ ranking:** los planetas no se colocan por puesto. El Top 3 se ve en el universo solo por **aura** oro/plata/bronce (hace falta saber el `rank` de cada tropa cargada).

### 1.3b Nivel de tropa (estrella)

- Visible **solo cuando el card de esa tropa está abierto** (planeta anclado al card).
- Número dentro de una **estrella** (p.ej. inferior derecha del planeta abierto).
- Valor = **promedio redondeado** de `users.level` de los miembros activos de la tropa.
- Los exploradores en el card también muestran badge de nivel (estrella + su `level`).

### 1.4 Roles y acciones (sin cambiar reglas de negocio)

UI concentrada en el **card** + campana flotante:

| Acción | Capitán | Copiloto | Miembro | Sin tropa |
| --- | --- | --- | --- | --- |
| Ver universo / abrir cards | sí | sí | sí | sí |
| Crear tropa | — | — | — | sí |
| Salir de mi tropa | sí | sí | sí | — |
| Invitar (búsqueda) | sí | sí | no | no |
| Aceptar/rechazar solicitudes | sí | sí | no | no |
| Sacar miembro | sí | no | no | no |
| Asignar/quitar Copiloto | sí | no | no | no |
| Personalizar planeta (skin/IA) | sí | sí | no | no |
| Solicitar unirse a otra tropa | no | no | no | sí |

### 1.5 Avatares (app-wide, fase datos)

- Avatar de usuario para **toda la app** (chip superior derecha se conectará después).
- Fuentes v1:
  1. Galería de iconos/avatares predefinidos.
  2. Upload de imagen → **serverfiles** en el backend (carpeta local servida; sin S3 por ahora).
- **Marcos (frames):**
  - Van en el **cuadrado/avatar del usuario**, no en el planeta.
  - Capitán y Copiloto tienen marcos especiales desbloqueados; pueden elegir otro marco libre.
  - Más adelante: marcos por nivel. Fuera del MVP visual del canvas si hace falta, pero el **modelo de datos** se deja listo.
- El planeta es **solo** la representación de la tropa (procedural), no foto de tropa.

### 1.6 Planeta (skin)

- Representación: **esfera 2D/3D procedural** (preferencia: **3D ligero si el bake-off lo permite en móvil**; fallback sprite/CSS 2D).
- **No** imagen subida de tropa.
- Catálogo de estilos predefinidos (gaseoso, rocoso, neón, elemental, etc.) = parámetros (colores, ruido, anillos, atmósfera).
- IA (fase posterior al catálogo): prompt → pipeline → **parámetros/textura procedural**, no “foto de planeta” suelta. Sin límites de generación en esta update.
- Quién aplica skin: **Capitán o Copiloto**.

---

## 2. Experiencia de usuario (pantalla)

### 2.1 Shell

- Sigue existiendo nav superior: volver a **Inicio** (hub) + `ExplorerXpBar` + apariencia.
- Debajo / a pantalla completa: el **canvas del universo**.
- Overlays: card de tropa abierta, ranking, **campana flotante** (bandeja), botón “Volver a mi tropa”, toasts, modales puntuales (crear tropa, invitar, personalizar).

### 2.2 Canvas

**Cámara**

- Desktop: edge panning (cursor cerca de bordes) + click-drag pan + **zoom con rueda**.
- Mobile: touch drag; pinch-zoom si la lib lo da limpio; si no, botones +/−.
- Límites de cámara: el universo tiene un **bounding box** que crece al cargar más tropas; **no** se puede salir a vacío infinito.
- “Volver a mi tropa”: aparece al alejarse de las coords de mi planeta; recentra con **la misma animación suave**. Sin tropa: el botón se oculta.

**Planetas (universo ≠ ranking)**

- Primer load: hasta **50** tropas activas. **Mi tropa en el centro** `(0,0)`; el resto disperso al azar alrededor (separación mínima, radio acotado). Sin tropa: centro vacío / origen del mapa y 50 tropas al azar.
- Posiciones con seed estable por `troop_id` (no saltan al refrescar).
- Al acercarse al borde del área ya cargada: pedir **más tropas del universo** (paginación); colocarlas en anillos nuevos; si no hay más, sin mensaje y **clamp** de cámara.
- Hard cap cliente: **200** planetas.
- Click/tap planeta → animación zoom/center → ese planeta pasa a **abierto**; el anterior se cierra.
- Mi tropa: estado **abierto por defecto** al cargar.
- Aura Top 3: si la tropa está en puestos 1–3 del ranking semanal.

**Tropa abierta (no es modal)**

- Card rectangular **pequeño**, flotante, anclado visualmente al planeta.
- Animación de apertura futurista.
- El planeta queda **superpuesto** en el centro del borde superior del card (círculo que “enciaja” en el card).
- Contenido del card:
  - Nombre de tropa, puesto semanal (si aplica), XP semanal, cupo `n/10`.
  - Lista de miembros: avatar (+ marco), nombre, rol, **badge nivel = número en estrella**.
  - Si es mi tropa + permisos: acciones (Invitar, Salir, Copiloto, Sacar, Personalizar planeta).
  - Si es otra tropa + yo sin tropa: CTA “Pedir unirme” (⚠).
  - Si es otra tropa + yo con tropa: solo lectura.

### 2.3 Ranking overlay

- Desktop: panel **top-right**, Top 1–5 visibles de los primeros resultados, marcos 1/2/3, scrollbar oculta, **infinite scroll** (página inicial 50, luego más).
- “Ir a mi posición”: solo scrollea el panel (no mueve cámara).
- Mobile: botón trofeo → panel superpuesto; tap fuera cierra.

### 2.4 Campana flotante

- Icono campana en el universo (p.ej. top-left bajo la nav) con badge de pendientes.
- Contenido: invitaciones recibidas (sin tropa) y/o solicitudes de unión a mi tropa (Capitán/Copiloto).
- Tap fuera o cerrar vuelve a plegar.

### 2.5 Sin tropa

- Entra al universo igual (sin “Volver a mi tropa”).
- CTA “Crear tropa” + campana con invitaciones recibidas.
- No gestiona planetas ajenos; puede “Pedir unirme”.

---

## 3. Modelo de datos (backend)

Hoy existen: `troops`, `troop_members`, `troop_invites`, `xp_awards`, `users.level/xp_total`.  
Falta:

### 3.1 Apariencia de tropa

```
troops
  + planet_style_id VARCHAR   -- id de catálogo, ej. 'rocky_teal'
  + planet_seed INT           -- semilla visual estable
  + planet_params JSONB NULL -- overrides / resultado IA
  -- NO image_url de tropa
```

Posiciones del canvas: **no persistir en DB** en v1 (se generan client-side o server-side por request con seed determinista).  
Recomendación: **seed por `troop_id + week_start` o `troop_id`** para que el mapa no “salte” en cada refresh, pero siga sintiéndose aleatorio. ⚠ Confirmar si debe cambiar cada semana o ser estable para siempre.

### 3.2 Avatar y marco de usuario

```
users
  + avatar_kind TEXT          -- 'preset' | 'upload'
  + avatar_preset_id VARCHAR NULL
  + avatar_file VARCHAR NULL  -- path relativo en serverfiles
  + frame_id VARCHAR NULL     -- marco elegido
```

Presets y marcos: catálogo en código (JSON/const) al inicio; no hace falta tabla si son fijos.

### 3.3 Invitaciones / solicitudes

- Ampliar `troop_invites` con `direction`: `invite` | `request`.
- Mantener invitaciones push (búsqueda, Capitán/Copiloto) + requests pull (sin tropa pide unirse).
- Aceptar/rechazar **requests**: Capitán **o** Copiloto.
- Bandeja: **campana flotante** en el universo.

### 3.4 APIs

- `GET /troops/ranking?offset=&limit=` — empate `xp_week DESC, name ASC`; página inicial 50; infinite scroll.
- `GET /troops/universe?offset=&limit=` — tropas activas para el canvas (mi tropa primero si hay; resto orden estable); incluye `rank` semanal (nullable), `level` (promedio), `planet_*`, `member_count`, `xp_week`.
- `GET /troops/:id` — detail lectura (miembros) para cualquier explorador autenticado.
- Payload planeta: `id, name, xp_week, rank, level, member_count, planet_style_id, planet_seed, planet_params`.

### 3.5 Serverfiles

- Carpeta configurable p.ej. `taskia_backend/serverfiles/avatars/`.
- Servir estático autenticado o con URL firmada corta; v1: ruta bajo `/files/...` con auth cookie.
- Límites: tipo (jpeg/png/webp), tamaño máx (p.ej. 1–2 MB), resize server-side opcional en fase 2.
- `.gitignore` de uploads; no commitear binarios.

### 3.6 IA planeta (fase E)

- Endpoint Capitán: `POST /troops/planet/generate` `{ prompt }` → Gemini (image o JSON de params) → preview → `PATCH` aplica.
- Sin rate limit en esta update (consciente del costo).
- Preferir **params/textura procedural** sobre PNG opaco para que el planeta siga siendo esfera 3D/2D coherente.

---

## 4. Frontend — arquitectura propuesta

```
TroopsPage (shell: nav + overlays)
  └─ SpaceUniverse (canvas host)
       ├─ Starfield / particles
       ├─ PlanetNode[] (instanced or per-mesh)
       ├─ CameraController (pan, edge, zoom, clamp, focus)
       └─ OpenTroopAnchor (sync card position to planet screen coords)
  ├─ TroopCard (abierto; gestión o lectura)
  ├─ RankingPanel / RankingSheet (móvil)
  ├─ BackToMyTroopButton
  └─ modales: CreateTroop, Invite, PlanetCustomizer, AvatarPicker (reusar luego)
```

Estilos: CSS del proyecto + variables de tema/acento. **Tailwind no es requisito**; solo si un subconjunto del canvas lo necesita de verdad. Sin shadcn/MUI.

---

## 5. Bake-off de librerías (obligatorio antes de codear canvas)

Investigar y elegir **una** pila. Criterios: React 19 + Vite, móvil real, ~50–150 esferas, overlays HTML, bundle size, mantenimiento.

| Capa | Candidatos | Qué validar |
| --- | --- | --- |
| Escena 3D | `@react-three/fiber` + `three` + `@react-three/drei` | Esferas lit + glow Top 3 + performance móvil |
| Escena 2D fallback | PixiJS / canvas 2D propio | Si R3F pesa demasiado |
| Gestos | Pointer Events nativos vs `@use-gesture/react` | Pan + wheel zoom + touch sin pelear con overlays |
| Partículas | Shader/`drei` Stars vs `tsparticles` vs canvas 2D loop | CPU/GPU en celular barato |
| Motion UI | `framer-motion` (ya en el repo) | Apertura del card, botón recentrar |

**PoC de decisión (1–2 días máx):** 50 planetas random, pan/zoom/clamp, click focus, 1 card HTML anclado, 3 auras, starfield. Medir FPS en Chrome mobile emulation + un Android real si se puede.

**Sesgo inicial del plan:** R3F + drei + pointer events propios + estrellas simples (no tsparticles) + framer-motion para el card.

---

## 6. Oleadas de implementación

### Oleada C0 — Spike técnico (libs)

- [ ] PoC canvas (§5)
- [ ] Decisión escrita: 3D vs 2D + lista de deps a instalar
- [ ] Seed de posiciones: algoritmo documentado (poisson-ish / jitter en anillos)

### Oleada C1 — Universo mínimo + datos

- [ ] API ranking paginado + desempate alfabético
- [ ] API detail de tropa por id (lectura para cualquier explorador autenticado)
- [ ] Campos `planet_*` en `troops` + defaults
- [ ] Canvas: 50 planetas, pan, edge pan, zoom rueda, clamp, click → focus
- [ ] Card abierto (lectura) con miembros + badges estrella de nivel de **usuario**
- [ ] Mi tropa abierta al entrar; “Volver a mi tropa”
- [ ] Sin tropa: entra al universo; CTA crear tropa

### Oleada C2 — Gestión en el card + ranking UI

- [x] Portar acciones actuales al card de mi tropa (invitar, salir, copiloto, kick)
- [x] Ranking overlay + botón trofeo
- [x] Infinite scroll ranking + “Ir a mi posición”
- [x] Top 3 glow en canvas
- [x] Badge nivel-tropa en planeta (promedio; solo card abierto)
- [x] Campana flotante (bandeja)

### Oleada C3 — Solicitudes de unión + bandeja

- [x] Modelo invite/request (`007_troop_invite_direction.sql`)
- [x] CTA “Pedir unirme” en card ajeno (solo sin tropa)
- [x] UI Capitán/Copiloto en campana para aceptar/rechazar
- [x] Mantener invitaciones por búsqueda

### Oleada C4 — Skins de planeta (catálogo)

- [x] Catálogo 8 estilos procedurales
- [x] UI personalizar (Capitán y Copiloto)
- [x] Persistencia `planet_style_id` (`PATCH /troops/planet`)

### Oleada C5 — Avatares + marcos (datos + UI mínima)

- [x] Migración users avatar/frame
- [x] Serverfiles + endpoint upload + presets
- [x] Mostrar avatar+marco en TroopCard (y dejar listo para UserChip después)
- [x] Marcos especiales Capitán/Copiloto

### Oleada C6 — IA Planet Builder

- [ ] Prompt → servicio → preview → aplicar
- [ ] Sin rate limit (temporal)
- [ ] Docs de costo / uso Gemini image o params

### Oleada C7 — Pulido y docs

- [ ] Tema claro/oscuro + acento en el universo
- [ ] Reduced motion
- [ ] FUNCIONES / PRODUCTO / STATE
- [ ] Seed demo: `planet_*` variados en tropas 005

---

## 7. Criterios de hecho (DoD)

- Explorador con tropa ve universo, su card abierto, ranking, recentrar.
- Explorador sin tropa ve universo, puede crear tropa y (tras C3) pedir unirse.
- Otras tropas: card lectura con tripulación; sin acciones de gestión.
- No se puede panear al vacío infinito.
- No hay websockets.
- Guardián intacto.
- `npm run build` frontend + typecheck backend OK.
- PoC de libs documentado en este archivo (§5 resultado).

---

## 8. Fuera de alcance

- Rediseño Guardián / Admin.
- Chat de tropa, estudio grupal.
- Websockets / ranking live.
- S3/CDN (serverfiles primero).
- Límites de generación IA / economía de prompts.
- Persistencia de “foto de tropa”.
- Marcos por nivel (diseño de datos sí, content grind no).
- Sustituir hub / Campamento / Mundos.

---

## 9. Riesgos

| Riesgo | Mitigación |
| --- | --- |
| R3F pesado en móviles baratos | PoC C0; fallback 2D |
| Edge pan vs UI (ranking, nav) | Zonas muertas cerca de overlays; edge solo en área canvas |
| Solicitudes spam | Reusar anti-abuso de invites; tope pending |
| Upload abusivo | Tipo/tamaño; solo auth student |
| Mapa que “salta” al refrescar | Seed determinista por troop_id |
| Card HTML vs WebGL z-fighting | Portal HTML overlay proyectado desde coords pantalla |
| Costo IA sin límites | Feature flag; fase C6 al final |

---

## 10. Orden de trabajo sugerido

`C0 → C1 → C2 → C3 → C4 → C5 → C6 → C7`  
Se puede solapar C4 y C5 tras C2. **C6 no bloquea** el “wow” del universo.

---

## 11. Decisiones resueltas (antes § preguntas)

1. Estrella = nivel de tropa (promedio redondeado); solo con card abierto. Distintivo Top 3 = aura.
2. Canvas = tropas activas (mi tropa al centro); ranking = panel aparte (50 + scroll).
3. Solicitudes: Capitán y Copiloto. Invitar por búsqueda se mantiene.
4. Bandeja = campana flotante.
5. Personalizar planeta = Capitán y Copiloto.
6. Posiciones estables (`troop_id`). Sin tropa: ocultar “Volver a mi tropa”.
7. Crear tropa = modal clásico. Card ajeno: nombre + puesto/XP si hay + miembros.
8. R3F OK con fallback 2D. Serverfiles bajo `taskia_backend/serverfiles/`. Detail ajeno = sí. Cap 200. UserChip avatar después de C5; C5 incluye upload + presets.

---

## 12. Resultado del bake-off (C0)

- Librería elegida: `@react-three/fiber` + `three` + `@react-three/drei` (**adoptada**)
- Fallback: pendiente solo si hay regresiones graves en móvil real
- Deps: `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`
- Layout: mi tropa `(0,0)`; resto anillos + jitter por `troop_id` (`planetLayout.ts`)
- Controles: drag pan, edge pan, wheel zoom, clamp a bounds, focus animado al abrir
