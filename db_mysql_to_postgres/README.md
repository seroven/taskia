# Migración MySQL → PostgreSQL (Taskia)

Copia el schema y los datos de tu MySQL local al Postgres del hosting nuevo.
**No cambia el backend.** Cuando la base PG esté lista, se adapta la API aparte.

## 1. Completá `.env`

Copiá `.env.example` si hace falta. Ya hay un `.env` con MySQL local (`root` / `taskia`).

Pegá la conexión de Postgres:

```
PG_DSN=postgresql://usuario:clave@host:5432/dbname?sslmode=require
```

o los campos `PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`.

`PG_SCHEMA=taskia` es el schema de Postgres (como la base `taskia` en MySQL). Las tablas van a `taskia.users`, no a `public.users`.

`MYSQL_DATETIME_TZ=America/Lima` asume que los `DATETIME` de tu MySQL local están en hora de Perú. Se guardan en Postgres como `timestamptz` UTC.

## 2. Instalá dependencias

```bash
cd db_mysql_to_postgres
py -3 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Corré la migración

Solo tablas:

```bash
py -3 migrate.py --schema-only
```

Tablas + datos:

```bash
py -3 migrate.py
```

Si Postgres ya tiene filas y querés reemplazarlas:

```bash
py -3 migrate.py --wipe
```

Cuenta filas en MySQL sin escribir nada:

```bash
py -3 migrate.py --dry-run
```

## Tablas

`users`, `courses`, `difficulties`, `tasks`, sesiones, mensajes, pizarras, mundos, misiones, desafíos, `llm_usage`, presets.

Los `id` se conservan. Las sequences de Postgres se ajustan al máximo copiado.
