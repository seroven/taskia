# Taskia — Plan Tropas, XP y hub

Fuente de verdad de la gran update de **core web**: tropas, experiencia, niveles, hub de entrada y barra de progreso. Se trabaja por oleadas; cada oleada grande puede abrir un plan fino al tocarla.

**Relación con otros docs:** [ROADMAP_V2.md](ROADMAP_V2.md) (WhatsApp, workers, Flutter) queda **en pausa**. El producto vivo sigue en [PRODUCTO.md](PRODUCTO.md) / [FUNCIONES.md](FUNCIONES.md); al cerrar oleadas, actualizar [STATE.md](STATE.md) y esos docs de producto.

**Marcado:** `- [ ]` pendiente · `- [x]` hecho.

---

## Decisiones cerradas

### Progresión

- Cada explorador tiene **nivel** y **XP**.
- **1000 XP = 1 nivel** (curva lineal al inicio).
- La XP se ve al otorgarla (feedback inmediato, p. ej. “+180 XP”).
- Barra superior rediseñada (estilo videojuego ligero): nivel + progreso hacia el siguiente. No es un rediseño total de la web; es cabecera y elementos de progresión.

### Cuándo se otorga XP

| Evento | XP | Notas |
| --- | --- | --- |
| Tarea a **Listo** **con** visto de Taskia (estudio) | Base según nivel (Bajo/Medio/Alto) × (effort_score/100), con redes de seguridad | **Una sola vez** por tarea, al momento del visto / cierre válido |
| Tarea a **Listo** **sin** pasar por estudio | Fija y baja (~**10 XP**) | Anti-spam; no invocar IA de esfuerzo |
| Misión dominada (Lista) | Base temática × (effort_score/100) | Una sola vez por misión |
| Desafío **completado** | `base(alcance, intensidad) × desempeño` (± ajuste leve de esfuerzo) | Desempeño = aciertos/total (o pts/máx.). Mal resultado → poca XP, **no cero**. Abandonado → **0** |
| Desafío abandonado | 0 | — |

- Tareas/misiones: no se vuelve a pagar XP si reabre el chat después del visto/dominio.
- Límite: **máximo 20 tareas creadas por explorador por día civil** (zona a definir al implementar; alineada al resto de “día” de la app).

### Cómo juzga la IA el esfuerzo (effort_score 1–100)

**Principio:** piso determinista + ajuste de IA. La IA no inventa XP de la nada.

1. **Capa fija:** tipo de actividad + dificultad/intensidad + resultado objetivo (visto, % desafío).
2. **Capa IA:** score interno 1–100 (evidencia, autonomía, profundidad, ritmo; entusiasmo con techo bajo).
3. **Red de seguridad en servidor** (como con `study_passed`):
   - Sin visto / sin dominio → 0 XP de estudio (salvo Listo sin estudio = 10).
   - Score alto con `evidence` vacía → bajar.
   - Bandas: lo normal es 41–65; 86–95 raro; **96–100 casi prohibido** (capar en servidor).
   - No evaluar en cada mensaje: solo en **cierres** (visto tarea, misión Lista, desafío enviado).

Persistir por otorgamiento: `xp_awarded`, `effort_score`, motivo corto interno, id de actividad (idempotencia).

### Tropas

- Un explorador pertenece a **una tropa a la vez**.
- Cupo máximo: **10** miembros.
- Crear tropa → el creador es **Capitán**.
- **Capitán:** agregar y **eliminar** miembros; elegir y cambiar **Copiloto**.
- **Copiloto:** solo **agregar** miembros.
- Resto: **Exploradores**.
- Invitación v1: **búsqueda global por nombre** + aceptación (diseño de UI más rico al implementar esa oleada).
- Salir: el explorador puede **irse solo**.
- Sucesión si se va el Capitán:
  1. Pasa al **Copiloto** (si hay).
  2. Si no hay Copiloto → al miembro de **mayor nivel** (desempate: más XP total).
  3. El nuevo Capitán puede cambiar Copiloto después.
- Si se va el Copiloto, el Capitán elige otro cuando quiera (no hay sucesión automática de Copiloto).

### Rankings

- **Dentro de la tropa:** por nivel (desempate XP total o XP de la semana — fijar en implementación; preferencia: nivel, luego XP semanal).
- **Entre tropas:** por **XP de la semana** (lunes–domingo).
- Otras tropas: visible en ranking (agregados); detalle de miembros completo sobre todo en **mi** tropa.

### Hub de entrada (explorador)

Al entrar, **no** el tablero primero. Tres puertas:

1. **Tropas**
2. **Mundos**
3. **Campamento** — nombre temporal del tablero de tareas del día (no es grupal; el rename profundo del tablero es **otra update**, fuera de este plan salvo el nombre y el hub).

### Guardián

Vista de **solo lectura**: su explorador (nivel, XP/progreso) y la **tropa** en la que está (miembros, niveles, ranking interno / semanal según lo que mostremos). Sin editar tropa ni XP.

### Fuera de este plan

- Gran rediseño del kanban / “Campamento 2.0”.
- ROADMAP_V2 (WhatsApp real, workers, Flutter).
- Limitación de búsqueda por colegio (v1 = global).

---

## Oleadas

### Oleada 0 — Cimiento de datos

- [x] Campos de progresión en explorador: `level`, `xp_total` (progreso en nivel derivado: `xp_total % 1000`)
- [x] Tabla/log de otorgamientos de XP (idempotencia por actividad)
- [x] Tablas de tropas: tropa, miembros, rol (`captain` / `copilot` / `member`), bajas lógicas si aplica
- [x] XP semanal agregable (por usuario y por tropa; semana lun–dom vía `xp_awards.week_start`)
- [x] Contador o regla de **máx. 20 tareas creadas / día / explorador** (documentada; enforce en API oleada 1)
- [x] Migración `003_tropas_xp.sql` + notas en [BASE_DE_DATOS.md](BASE_DE_DATOS.md)

### Oleada 1 — Motor de XP (sin tropas aún)

- [x] Otorgar ~10 XP al marcar Listo sin estudio (una vez; respetar candado Listo existente)
- [x] Al `study_passed` de tarea: calcular base × effort_score; redes de seguridad; feedback “+N XP”
- [x] Al dominar misión: igual
- [x] Al completar desafío: base × desempeño (piso bajo si va mal; 0 si abandona)
- [x] Prompt + parseo del effort_score 1–100 solo en cierres
- [x] Subida de nivel al cruzar múltiplos de 1000
- [x] API para leer nivel/XP del explorador autenticado (`/auth/me` + `xp_gained` en cierres)
- [x] Tope 20 tareas creadas / día (America/Lima)

### Oleada 2 — Hub + barra superior

- [x] Pantalla hub: Tropas | Mundos | Campamento
- [x] Rename visible “tablero” → **Campamento** (copy explorador)
- [x] Barra superior con nivel + barra de progreso (estilo videojuego ligero; acentos del tema actual)
- [x] Toast/chip de XP ganado en cierres relevantes
- [x] Navegación: desde hub a cada puerta; volver al hub desde Campamento/Mundos/Tropas
- [x] Tropas: placeholder hasta oleada 3

### Oleada 3 — Tropas (CRUD social)

- [x] Crear tropa (nombre), quedar como Capitán
- [x] Buscar exploradores por nombre (global), invitar, aceptar/rechazar
- [x] Copiloto: agregar; Capitán: agregar y eliminar; Capitán asigna/cambia Copiloto
- [x] Salir de la tropa; sucesión Capitán → Copiloto → mayor nivel
- [x] Vista “mi tropa”: miembros, roles, niveles
- [x] Ranking interno de la tropa
- [x] Ranking de tropas por XP semanal (lun–dom)
- [x] Un solo membership activo por explorador

### Oleada 4 — Guardián (solo lectura)

- [ ] En progreso/ficha del explorador: nivel, barra/XP
- [ ] Tropa actual: nombre, rol del niño, lista de miembros con niveles, posición en ranking de tropa / mención al ranking semanal de tropas si aplica
- [ ] Sin acciones de gestión

### Oleada 5 — Pulido y docs

- [ ] Anti-abuso básico (límites de invitaciones, nombres)
- [ ] Actualizar [FUNCIONES.md](FUNCIONES.md) / [PRODUCTO.md](PRODUCTO.md) / [STATE.md](STATE.md)
- [ ] Revisar copy Capitán / Copiloto / Campamento en tono explorador

---

## Orden sugerido

| Orden | Oleada | Resultado visible |
| --- | --- | --- |
| 1 | 0 + 1 | El estudio/desafíos/Listo ya mueven XP y nivel (aunque la UI sea mínima) |
| 2 | 2 | Hub de 3 puertas + barra de nivel |
| 3 | 3 | Tropas y rankings |
| 4 | 4 | Guardián ve progresión y tropa |
| 5 | 5 | Docs y pulido |

Se puede solapar UI de barra (oleada 2) con el final de oleada 1 si el API de nivel ya existe.

---

## Bases de XP (borrador para implementar; ajustables)

Valores iniciales — calibrar en playtest:

| Actividad | Base orientativa |
| --- | --- |
| Listo sin estudio | 10 fijo |
| Tarea Bajo (con visto) | ~100 |
| Tarea Medio (con visto) | ~180 |
| Tarea Alto (con visto) | ~320 |
| Misión dominada | ~400 |
| Desafío | según alcance × intensidad (Calentamiento &lt; Aventura &lt; Jefe; Tema &lt; Curso &lt; Mundo), luego × desempeño |

Fórmula desafío completado (borrador):

`xp = max(floor(base * desempeno), floor(base * 0.05))`  
(con `desempeno` en 0…1; el 5% evita cero si terminó mal del todo; abandono sigue en 0).

---

## Criterios de hecho (Definition of Done) del plan

- Un explorador nuevo ve el **hub**, no el Campamento a quemarropa.
- Completar estudio / misión / desafío mueve XP de forma **estricta** y **visible**.
- Listo sin estudio da poca XP; no se pueden crear más de 20 tareas/día.
- Tropas: máx. 10, un membership, roles Capitán/Copiloto, rankings semanal e interno.
- Guardián solo mira nivel y tropa.
- ROADMAP_V2 sigue pausado hasta que se retome a propósito.
