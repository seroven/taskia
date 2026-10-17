# Diseño visual

Tokens y principios del rediseño espacial. La fuente de verdad en código es `taskia_frontend/src/styles/tokens.css`. El tema (`data-theme`: `light` | `dark`) y el acento (`data-accent`) siguen en el `<html>`. El cielo global lee `data-space` (`high`, `medium`, `low`, `none`).

## Ahora

Los neutros son fijos. El acento solo tiñe la nebulosa, los controles y el texto de acento.

Día: `--bg #F5F3FF`, `--surface #FFFFFF`, `--surface-raised #EEEAFE`, `--border #D9D3F5`, `--text #1B1640`, `--text-muted #5E5890`.

Noche: `--bg #0D0B2B`, `--surface #17143F`, `--surface-raised #211D52`, `--border #34307A`, `--text #F3F0FF`, `--text-muted #A9A4D6`.

Cada acento conserva su par día/noche (azul `#2563eb` / `#60a5fa`, y el resto igual). `--accent-edge` es ese hex mezclado un 18 % con negro. `--accent-soft` es el acento al 14 % sobre `--surface`. `--on-accent` es `#ffffff` o `#1B1640`, el que contrasta más sobre el acento (todos los pares quedan en 4.5:1 o más). `--accent-ink` es un hex fijo, más oscuro de día y el propio acento de noche cuando ese ya llega a 4.5:1 contra `--surface` y contra `--accent-soft`. `--focus` es `--text`. `--star` es `#FFC940`. `--success` es `#148A57` de día y `#2FD08A` de noche. `--danger` es `#D1334A` de día y `#FF5A6E` de noche.

`--chart-1..3` siguen en `#16a34a`, `#0d9488` y `#d97706` hasta la fase de gráficos. El objetivo, con trazo y marcador distintos:

- `--chart-1` (hecho): `#009E73` en ambos modos, trazo continuo, círculo.
- `--chart-2` (estudiando): día `#0072B2`, noche `#56B4E9`, trazo discontinuo, cuadrado.
- `--chart-3` (voz): día `#D55E00`, noche `#E69F00`, trazo punteado, triángulo.

El cielo de la página es CSS (estrellas y nebulosa). `high` en login y hub, `medium` en Campamento, estudio, misión y desafío, `low` en guardián y admin, `none` en Tripulación y en la lista, el detalle de mundo y el detalle de curso. Esas tres de Mundos siguen pintando el lavado `--bg-a` / `--bg-b` / `--bg-c`. La galaxia sigue en `--space-canvas-bg`.

Radios de control: `--r-chip` 999px, `--r-control` 14px, `--r-card` 20px, `--r-panel` 28px. `--radius` sigue en 22px para las tarjetas que aún no se rediseñan.

## Principios

Forma plana y táctil: color sólido, sin brillo neón ni vidrio. El botón primario lleva una sombra dura de 4px, no un resplandor. El texto de los chips «Por hacer», «Con Taskia» y «Lista» va en `--text`; el acento queda en el ícono. Un estado no se entiende solo por el color. El anillo de foco usa `--focus`. El titileo del cielo se apaga con `prefers-reduced-motion`. Cambiar acento o modo funde la pantalla, cielo incluido, e inmediato si el sistema pide menos movimiento.
