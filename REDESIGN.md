# Rediseño visual espacial de Taskia

## Contexto
Taskia es una plataforma de estudio con IA para niños peruanos de 3.º de primaria a 2.º de secundaria. Front React (Vite, localhost:5173), back Express. Hay 3 roles: explorador (niño), guardián (adulto) y admin. Antes de tocar nada, lee: docs/producto/recorrido/ (capturas y recorrido actual), FUNCIONES.md y STATE.md. Si el recorrido está en otra ruta, búscalo.

Hoy la app es limpia pero genérica: tarjetas iguales con radios iguales y sombras suaves sobre un fondo azul grisáceo. Quiero que se sienta como un viaje espacial para niños: plana, táctil, alegre, con estilo similar a los assets de Kenney (formas sólidas, sin brillos neón ni vidrio esmerilado).

## Reglas no negociables
- NO cambies lógica de negocio, llamadas a la API, rutas, permisos ni estados. Es un cambio visual.
- NO cambies textos existentes (copy), salvo donde este documento lo indique expresamente.
- NO agregues dependencias nuevas. Todo con CSS y SVG inline.
- NO rediseñes la pantalla de Mundos (lista, detalle de mundo, detalle de curso) ni el flujo de desafíos: solo deben heredar los tokens nuevos y seguir viéndose bien. El diseño de "galaxia de mundos" se hará después.
- Conserva las familias tipográficas actuales (título y cuerpo). Solo ajusta tamaños, pesos y espaciado.
- Conserva los 7 colores de acento existentes y el modo claro/oscuro. Reutiliza los valores actuales de cada acento; no inventes colores de acento nuevos.
- Trabaja en una rama nueva `feat/rediseno-espacial` creada desde `staging`.
- Todo en español.

## Cómo trabajar: por fases
Haz la Fase 0 y la Fase 1 y DETENTE para que yo revise. Yo te diré "continúa con la Fase N". En cada fase, al terminar, lista los archivos cambiados y qué verificaste.

### Fase 0: Auditoría (sin cambios de código)
Entrégame un resumen corto con:
1. Cómo se estilizan los componentes hoy (CSS plano, módulos, Tailwind, etc.).
2. Dónde vive la lógica del acento (7 colores) y del modo claro/oscuro, y cómo se aplica (clase, data-attribute, variables CSS).
3. Cuántos colores hardcodeados hay (hex, rgb, rgba, hsl) fuera de la definición del tema, y en qué archivos se concentran.
4. Qué componente/archivo corresponde a cada pantalla: login, hub, Campamento (Hoy y Proyectos), estudio con chat y panel de voz, Mundos (solo para saber qué hereda), desafío (pregunta y resultado), panel del guardián, panel del admin, toasts, encabezado.

### Fase 1: Sistema de tokens (sin rediseñar pantallas todavía)
Crea una única fuente de verdad de tokens (por ejemplo `src/styles/tokens.css`, adaptándote a la estructura existente) y migra el tema actual a ella. Reemplaza los colores hardcodeados por tokens. La app debe verse casi igual al terminar, pero ya alimentada por tokens.

Tokens de modo noche (valores base):
- --bg: #0D0B2B
- --surface: #17143F
- --surface-raised: #211D52
- --border: #34307A
- --text: #F3F0FF
- --text-muted: #A9A4D6

Tokens de modo día:
- --bg: #F5F3FF
- --surface: #FFFFFF
- --surface-raised: #EEEAFE
- --border: #D9D3F5
- --text: #1B1640
- --text-muted: #5E5890

Tokens fijos (independientes del acento):
- --star (recompensa, XP, nivel): #FFC940. En modo día úsalo solo como relleno con texto oscuro encima, nunca como color de texto sobre superficies claras.
- --success: #2FD08A (noche) / #148A57 (día)
- --danger: #FF5A6E (noche) / #D1334A (día). Los errores siempre llevan ícono y texto, nunca solo color (hay un acento rojo).
- --chart-1, --chart-2, --chart-3: tres colores distinguibles entre sí en ambos modos y para daltonismo, independientes del acento.

Tokens derivados de cada acento (para los 7, en ambos modos):
- --accent: el valor actual del acento
- --accent-edge: el acento oscurecido ~18% (borde inferior de botones gruesos)
- --accent-soft: el acento al ~14% sobre --surface
- --on-accent: el color de texto sobre el acento. CÁLCULALO por contraste: elige blanco o tinta oscura (#1B1640), el que dé mayor ratio. Verifica ≥ 4.5:1 para texto normal. Naranja, verde y teal probablemente necesiten texto oscuro.
- --focus: color del anillo de foco con alto contraste contra el fondo (--text), no el acento.

Escala:
- Radios: --r-chip: 999px; --r-control: 14px; --r-card: 20px; --r-panel: 28px
- Borde estándar: 2px solid var(--border)
- Espaciado: 4, 8, 12, 16, 24, 32, 48
- Tipografía: 12, 14, 16, 18, 24, 32, 44. Cuerpo mínimo 16px. Fuente de títulos solo para títulos de pantalla y encabezados de sección.
- Objetivo táctil mínimo: 44×44px

Además crea docs/producto/DISENO.md describiendo estos tokens y los principios del rediseño, para que el futuro diseño de Mundos los reutilice.

### Fase 2: Componentes base y fondo espacial
Componentes (estilo plano y táctil; sin box-shadow difuso, sin glow, sin backdrop-filter, sin gradientes decorativos):
- Botón primario: alto 48px, radio var(--r-control), fondo var(--accent), texto var(--on-accent) en negrita 16–17px, sin borde, box-shadow: 0 4px 0 var(--accent-edge). En :active, translateY(3px) y sombra 0 1px 0. Estado deshabilitado claro (superficie apagada, sin borde inferior).
- Botón secundario: fondo var(--surface), borde 2px var(--border), borde inferior 0 4px 0 var(--border), mismo comportamiento al presionar.
- Botones de ícono (volver, perfil, salir): círculo 44×44, borde 2px.
- Inputs: alto 48px, borde 2px var(--border), radio var(--r-control). En foco: borde var(--accent) más anillo 3px var(--focus) con offset 2px.
- Chips: radio var(--r-chip), 13–14px, peso 600, fondo var(--accent-soft). Verifica contraste del texto sobre ese fondo en los 7 acentos. Los estados (Por hacer, Con Taskia, En marcha) llevan ícono pequeño además de color.
- Tarjetas: fondo var(--surface), borde 2px, radio var(--r-card). Estado seleccionado: borde var(--accent) y fondo var(--accent-soft).
- Barra de progreso: alto 12px, radio 999, pista var(--surface-raised), relleno var(--accent). La barra de XP usa var(--star).
- Toasts: sin solaparse con el encabezado (no tapar la pastilla de nivel). En escritorio arriba a la derecha bajo el encabezado; en móvil abajo centrado. role="status", ícono + texto, borde 2px.
- Componente <Planet size variant /> hecho solo con CSS (radial-gradient para la esfera y una sombra de media luna), 3 variantes de color (una usa el acento, dos fijas). Debe aceptar una prop opcional `src` para renderizar después un PNG de Kenney. Por defecto no depende de ningún asset.

Fondo espacial (componente de layout con un pseudo-elemento fijo, position: fixed; inset: 0; z-index: -1; pointer-events: none):
- Solo CSS: 3 capas de estrellas con radial-gradient de 1–2px y background-size distintos (aprox. 240px, 360px, 520px).
- Nebulosa: 2 radial-gradient en esquinas opuestas usando color-mix(in srgb, var(--accent) 14%, transparent) en noche y 8% en día. Así cada acento tiñe el fondo.
- Modo noche: estrellas blancas (alfa 0.8, 0.5, 0.3 por capa). Modo día: puntos más pequeños y escasos teñidos con el acento al 10–14%.
- Intensidad por pantalla con un atributo data-space en el layout raíz: "high" (login, hub), "medium" (Campamento, estudio, Mundos), "low" (guardián, admin). Controla la opacidad de las capas: 1 / 0.6 / 0.3.
- Solo en data-space="high": una única capa titila muy lento (opacity .55 a 1, 6s ease-in-out infinite).
- Debe respetar prefers-reduced-motion (sin animaciones) y no usar canvas ni JS.

Encabezado común:
- Reemplaza los 7 puntos de color y el botón claro/oscuro por UN botón "Apariencia" (44×44, ícono de paleta) que abre un popover con: (a) los 7 acentos como swatches de 36px con check en el seleccionado, dentro de un radiogroup accesible, y (b) un selector segmentado Día | Noche. Cierra con Escape y clic fuera. En pantallas <480px el popover ocupa el ancho disponible bajo el encabezado.
- La pastilla de nivel pasa a: ícono de estrella en var(--star) + "Nv. X" + barra de XP con relleno var(--star) + "532/1000". En <420px oculta el texto numérico y deja estrella, nivel y barra.
- Mantén el resto de botones del encabezado (perfil, salir, volver) con el estilo de botón de ícono.
- El mismo componente de Apariencia debe usarse también en el login.

### Fase 3: Login y hub
Login:
- Fondo con data-space="high". Tarjeta sólida (var(--surface), borde 2px, radio var(--r-panel)) centrada. Mismos campos, textos y lógica.
- Dos <Planet> decorativos parcialmente fuera de pantalla en esquinas opuestas, aria-hidden, sin interferir con el formulario.
- Botón "¡Entrar!" primario grueso.

Hub:
- Fondo data-space="high". Mantén el saludo "¡Hola, X!" y el título "¿A dónde quieres ir?".
- Reemplaza las 3 tarjetas por 3 destinos grandes y tocables (cada uno un enlace o botón accesible con la misma navegación de hoy), con un objeto ilustrado hecho con CSS/SVG de ~160–200px, y debajo el nombre en fuente de títulos y la descripción actual en una línea.
  - Mundos: un cúmulo de 2–3 <Planet> pequeños.
  - Campamento: un <Planet> con una carpa/bandera en SVG sobre él.
  - Tripulación: silueta punteada de estación espacial (SVG con trazo discontinuo), con chip "Pronto", aria-disabled="true", sin navegación, sin foco de teclado como enlace.
- Escritorio: disposición escalonada, no una fila rígida. Móvil: apilados en vertical con alineación alternada.
- Movimiento: flotación vertical de ±6px en 6s, desfasada por destino. Es el único movimiento idle de la pantalla. Se desactiva con prefers-reduced-motion. Los destinos reaccionan al hover/foco y al toque (escala 1.04 en hover, anillo de foco visible).
- Los destinos deben quedar aislados en un componente para poder volver a tarjetas sencillas cambiando solo ese componente.

### Fase 4: Campamento y estudio
Campamento (data-space="medium"):
- Pestañas Hoy | Proyectos como control segmentado con borde 2px; la activa en var(--accent) con var(--on-accent).
- Navegación de día y botón "Nueva tarea" con los estilos nuevos. Barra "Hoy: X de Y" más gruesa (12px).
- Filas de tarea: tarjeta con borde 2px; izquierda el control de completar, centro título y "curso · Del día", derecha chip de estado y acción. NO cambies qué hace cada control ni su semántica actual (inspecciona qué significa el ícono de la izquierda antes de restilarlo). Si es el control de "listo", restílalo como estrella: sin completar = anillo vacío; completada = estrella llena en var(--star) con un rebote corto (scale .8 a 1.15 a 1 en 220ms, solo al completar, respetando reduced-motion).
- Estado vacío: un <Planet> mediano en lugar del ícono genérico, mismos textos.

Estudio (data-space="medium"):
- Barra superior: volver "← Campamento", título de la tarea, chips de curso y "Con Taskia", y el selector Estudiar | Editar como control segmentado.
- Fase de la IA: reemplaza la etiqueta "ENTENDIENDO" en mayúsculas por un indicador de dos pasos "Entendiendo → Practicando" (el actual resaltado), en minúscula inicial normal. Mantén la lógica de fases tal como está.
- Mensajes: texto a 18px, interlineado 1.5, ancho máximo de línea ~65 caracteres. Taskia a la izquierda con un avatar circular 36px (usa el robot existente si hay un asset; si no, un círculo con inicial), burbuja var(--surface) con borde 2px. El niño a la derecha, burbuja var(--accent-soft) con borde var(--accent). El cursor parpadeante actual de la respuesta en streaming se mantiene.
- Compositor fijo abajo con padding-bottom: env(safe-area-inset-bottom). Hablar es el botón principal: círculo de 56px con ícono de micrófono, a la izquierda; campo de texto al centro; Foto como botón de ícono; Enviar primario a la derecha. Conserva el texto de ayuda actual, en muted y 13–14px.
- Panel de voz: círculo grande con tres estados mapeados a los estados que ya existen (inactivo, escuchando, Taskia hablando). Inactivo: anillo var(--accent) de 2px. Escuchando: dos anillos que se expanden y se desvanecen (1.6s, desfasados). Taskia hablando: 4–5 barras que oscilan. Todo se anima solo mientras esté en ese estado y se reemplaza por un estado estático con reduced-motion.

### Fase 5: Guardián y admin (data-space="low")
- Sin <Planet>, sin botones gruesos decorativos, estrellas estáticas y tenues. Mismos tokens, componentes y estados.
- Guardián: chips de explorador con el estilo nuevo, tarjeta de Nivel con barra var(--star), tabla de tripulación con font-variant-numeric: tabular-nums, fila propia resaltada con var(--accent-soft), encabezado de tabla con texto normal (sin mayúsculas forzadas).
- Admin: las 6 tarjetas de métricas con borde 2px, número en fuente de títulos, ícono en círculo var(--accent-soft). Gráfico: ejes y cuadrícula con var(--border) y var(--text-muted), series con --chart-1..3 y además marcadores o trazos distintos por serie; el tooltip con el estilo de tarjeta. Tabla de guardianes y exploradores: encabezado fijo, hover con var(--surface-raised), sin cebra.

### Fase 6: Barrido final
- Revisa Mundos, detalle de mundo/curso y desafíos (pregunta y resultado): que hereden tokens sin romper layout ni contraste. No los rediseñes.
- Busca colores, radios y sombras hardcodeados que sobrevivan y migra los que correspondan.

## Accesibilidad y rendimiento (aplican a todas las fases)
- :focus-visible visible en todo elemento interactivo, con anillo de var(--focus).
- Contraste: texto normal ≥ 4.5:1; texto grande (≥24px, o ≥18.66px en negrita) ≥ 3:1. Verifica los 7 acentos × 2 modos en: botón primario, chips, texto sobre fondo, texto atenuado.
- Respeta prefers-reduced-motion en TODA animación nueva.
- Sin canvas, sin backdrop-filter, sin filter: blur, sin sombras con blur grandes. Debe correr fluido en celulares Android de gama baja.
- Objetivos táctiles ≥ 44px. Sin scroll horizontal en 360px de ancho.
- Estados nunca solo por color.

## Verificación y entrega
- Corre el linter y el build; deben pasar sin errores nuevos.
- Revisa cada pantalla en 360px, 768px y 1280px, en modo día y noche, y con al menos 3 acentos (azul, naranja, rosa).
- Al terminar cada fase, lista: archivos modificados, qué verificaste y qué NO pudiste verificar.
- Al final, dime cómo regenerar las capturas con node docs/producto/recorrido/capture.mjs para comparar antes y después.