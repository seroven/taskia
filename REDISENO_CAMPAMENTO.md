# Rediseño de estructura de Campamento (solo el contenido principal)

Mantén el estilo actual (tema, colores, fuentes, tokens, componentes existentes). No toques backend, esquema de datos ni la lógica de negocio. No agregues dependencias. Todo debe salir de los datos y estados que ya existen; si algo requiere backend, avísame en vez de inventarlo.

Antes de escribir código, dame un plan corto: archivos que tocarás y cómo mapearás los estados actuales a la nueva presentación.

## Cambios

1. **Una sola lista, sin secciones por estado.**
   - Elimina las secciones y sus "Nada aquí todavía".
   - Orden: pendientes y "con Taskia" primero, hechas al final y atenuadas.
   - El estado se muestra como chip o ícono dentro de la tarjeta (pendiente / con Taskia / hecha), sin cambiar los valores guardados.
   - Si no hay tareas, un único estado vacío con llamado a agregar la primera.

2. **Bloque de progreso** que reemplace el texto "0 por hacer · 3 con Taskia · 0 listas": "Hoy: X de N" con barra o anillo, en vivo.

3. **Jerarquía en las tarjetas.**
   - Toda la tarjeta es tocable y dispara lo que hoy hace "Seguir" (mínimo 44px de alto).
   - Solo la primera tarea no completada conserva botón destacado; las demás llevan un indicador discreto.
   - Círculo de check a la izquierda que respeta el candado actual (bloqueado hasta el visto de Taskia).
   - Reemplaza la barra azul igual para todas por un color por materia, tomado de la paleta de acentos existente (misma materia = mismo color, determinista).
   - Título con primera letra en mayúscula solo en la visualización; materia y tipo como texto secundario.

4. **Selector "Hoy / Proyectos"** de dos pestañas que filtre con el campo que ya distingue tarea del día de proyecto. Estado vacío corto para Proyectos. La navegación de fecha se vuelve compacta y secundaria (ej. "Hoy · lun 5 oct" con flechas discretas).

5. **Agregar tarea más a mano.** Mantén el modal o formulario actual y cambia solo dónde se dispara: fila "+ Agregar tarea" al final de la lista y botón flotante en móvil. El botón actual de arriba solo en escritorio.

6. **Layout.** Mobile-first, una columna, sin scroll horizontal, respetando el área segura inferior. En escritorio, columna centrada de ~720px máximo. Menos espacio vertical desperdiciado: la lista debe verse sin scroll en ~700px de alto.

7. **Detalles.** Foco visible y aria-labels en el check, las pestañas y el botón flotante. Respeta `prefers-reduced-motion`. Revisa modo claro y oscuro.

## Fuera de alcance
Cierre del día, foto para crear tareas, lógica nueva de proyectos, migración a mundos.

## Al terminar
Resúmeme los archivos modificados, cómo mapeaste los estados y qué decidiste donde faltaban datos.