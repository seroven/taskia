# Diseño visual

Tokens y principios del rediseño espacial. La fuente de verdad en código es `taskia_frontend/src/styles/tokens.css`. El tema (`data-theme`: `light` | `dark`) y el acento (`data-accent`) siguen en el `<html>`. El cielo global lee `data-space` (`high`, `medium`, `low`, `none`).

## Ahora

Los neutros son fijos. El acento solo tiñe la nebulosa, los controles y el texto de acento.

Día: `--bg #FFFFFF`, `--surface #FFFFFF`, `--surface-raised #EEEAFE`, `--border #D9D3F5`, `--text #1B1640`, `--text-muted #5E5890`.

Noche: `--bg #0D0B2B`, `--surface #17143F`, `--surface-raised #211D52`, `--border #34307A`, `--text #F3F0FF`, `--text-muted #A9A4D6`.

Cada acento conserva su par día/noche (azul `#2563eb` / `#60a5fa`, y el resto igual). `--accent-edge` es ese hex mezclado un 18 % con negro. `--accent-soft` es el acento al 14 % sobre `--surface`. `--on-accent` es `#ffffff` o `#1B1640`, el que contrasta más sobre el acento (todos los pares quedan en 4.5:1 o más). `--accent-ink` es un hex fijo, más oscuro de día y el propio acento de noche cuando ese ya llega a 4.5:1 contra `--surface` y contra `--accent-soft`. `--focus` es `--text`. `--star` es `#FFC940`. `--success` es `#148A57` de día y `#2FD08A` de noche. `--danger` es `#D1334A` de día y `#FF5A6E` de noche.

`--chart-1..3` ya no dependen del acento. Contraste contra `--surface` de al menos 3:1.

- `--chart-1` (hecho): `#009E73` en ambos modos, trazo continuo, círculo.
- `--chart-2` (estudiando): día `#0072B2`, noche `#56B4E9`, trazo discontinuo, cuadrado.
- `--chart-3` (voz): día `#D55E00`, noche `#E69F00`, trazo punteado, triángulo.

En los gráficos, estudiando y voz usan ese trazo. Las series del acento siguen en `--accent` y los errores en `--danger`. El guardián usa el globo sobrio (sin avatar, 16px), sin el planeta ni el botón grueso del explorador.

Mundos, el detalle de mundo y de curso, y los desafíos conservan su layout. El verde de «dominado» y de la respuesta bien usa `--success`. Las portadas ya no llevan sombra difusa. El naranja de aviso no tiene token: el texto mezcla `#ea580c` con `--text` para leerse de noche, y el punto del resultado sigue en `#ea580c`. La galaxia de Tripulación conserva su propia sombra.

El cielo de noche es CSS (estrellas y nebulosa). De día el fondo es blanco plano: no hay nebulosa ni partículas. `high` en login y hub, `medium` en Campamento, estudio, misión y desafío, `low` en guardián y admin, `none` en Tripulación y en la lista, el detalle de mundo y el detalle de curso. Esas tres de Mundos, de noche, siguen pintando el lavado `--bg-a` / `--bg-b` / `--bg-c`; de día quedan en `--bg`. La galaxia sigue en `--space-canvas-bg`. El selector de apariencia entra con un desplazamiento corto de 180 ms. El botón es `Button` (`.primary` o `.ghost`). El chip es `Chip` (curso, estado, explorador). El control segmentado es `.segmented` (Día/Noche, Estudiar/Editar, tipo de tarea). El campo de chat usa `.field-control`, el mismo de los formularios. El selector viejo de puntos ya no está. Admin y guardián siguen sin el botón grueso.

Radios de control: `--r-chip` 999px, `--r-control` 14px, `--r-card` 20px, `--r-panel` 28px. `--radius` sigue en 22px para las tarjetas que aún no se rediseñan.

En Campamento el listo es una estrella (vacía, o llena en `--star` con un rebote de 220ms solo al completar). La diaria con ayuda conserva el candado. El estudio muestra Entendiendo, Practicando y Repasando como chips y resalta solo la fase actual, porque el modelo puede retroceder. El globo del niño lleva avatar y texto a 18px; el del guardián sigue con el globo anterior.

El login es una tarjeta sólida (`--surface`, borde 2px, `--r-panel`) con dos planetas decorativos fuera de las esquinas, sin capturar el clic. El hub son tres destinos en `HubDestinations`: Mundos (racimo de planetas) abre mundos, Campamento (planeta con tienda) abre el campamento, Tripulación (estación en trazo discontinuo, chip «Pronto») no navega ni toma foco. En escritorio van escalonados; en móvil, apilados y alternados. El dibujo flota ±6px en 6s y se queda quieto con `prefers-reduced-motion`. Hover y foco escalan 1.04.

## Principios

Forma plana y táctil: color sólido, sin brillo neón ni vidrio. El botón primario lleva una sombra dura de 4px, no un resplandor. El texto de los chips «Por hacer», «Con Taskia» y «Lista» va en `--text`; el acento queda en el ícono. Un estado no se entiende solo por el color. El anillo de foco usa `--focus`. El titileo del cielo se apaga con `prefers-reduced-motion`. Cambiar acento o modo funde la pantalla, cielo incluido, e inmediato si el sistema pide menos movimiento.
