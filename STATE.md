# Estado de Taskia

Memoria corta del proyecto. El detalle de tablas está en [BASE_DE_DATOS.md](BASE_DE_DATOS.md).

## Ahora

Un solo repo en la raíz. Backend en `taskia_backend/`, frontend en `taskia_frontend/`. Desde aquí: `npm run dev` y `npm run build`.

La base de Postgres guarda instantes en UTC. La web los muestra en la zona de quien mira. `tasks.due_date` es un día de calendario, sin zona.

Mundos, el vínculo mundo-materia y misiones se archivan (`is_active = false`), no se borran. Sesiones, mensajes, pizarras y desafíos quedan. Descartar un desafío a medias sigue siendo un borrado físico.

## Decisiones vigentes

- Esquema vivo: `taskia_backend/db/schema.pg.sql`. No hay ORM.
- Una tarea no puede usar la materia de otro alumno. Un mundo no enlaza una materia ajena. Una misión exige que esa materia esté vinculada a ese mundo.
- El alcance de un desafío obliga `mission_id` o `course_id`. En un desafío de tema, `course_id` puede venir.
- Volver a agregar una materia reactiva solo el vínculo. Las misiones archivadas no reaparecen.
- En un desafío, la respuesta vacía se avisa con un toast de warning, no con texto rojo.
- Las tablas del tutor de tareas y del tutor de misiones siguen separadas.
- El trabajo del día se commitea y se sube a `staging`. `main` queda limpia hasta que se pida lo contrario.

## Pendiente

- Vaciar el schema `taskia` en Render y volver a armarlo. Aplicar `schema.pg.sql` sobre las tablas viejas no agrega `is_active` ni las claves nuevas.
- Los instantes ya guardados están corridos +5 h. No se corrigen hasta que se pida.

## Cómo correrlo

En la raíz:

```bash
npm run install:all   # dependencias del API y de Vite
npm run dev           # los dos en paralelo
npm run build         # compila los dos, el API primero
```

Variantes: `dev:pd`, `build:qa`, `build:pd`.
