"""Copia Taskia de MySQL local a PostgreSQL (schema + datos)."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

import pymysql
from dotenv import load_dotenv
from psycopg import sql
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

BOOL_COLS = {
    "is_active",
    "study_passed",
    "uses_board",
    "study_mode_chosen",
    "from_voice",
    "requires_board",
    "is_correct",
}
JSON_COLS = {"options_json", "prompt_draw_ops"}
DATE_COLS = {"due_date"}

# Orden de FKs. study_missions.source_mission_id es DEFERRABLE.
TABLES = [
    "users",
    "difficulties",
    "courses",
    "tasks",
    "study_sessions",
    "study_messages",
    "study_boards",
    "user_study_memory",
    "study_worlds",
    "study_world_courses",
    "study_missions",
    "study_mission_sessions",
    "study_mission_messages",
    "study_mission_boards",
    "study_challenges",
    "study_challenge_questions",
    "study_challenge_answers",
    "study_challenge_presets",
    "llm_usage",
]

SERIAL_TABLES = [
    "users",
    "difficulties",
    "courses",
    "tasks",
    "study_messages",
    "study_worlds",
    "study_missions",
    "study_mission_messages",
    "study_challenges",
    "study_challenge_questions",
    "study_challenge_answers",
    "llm_usage",
]


def env(name: str, default: str | None = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise SystemExit(f"Falta {name} en .env")
    return value


def pg_schema_name() -> str:
    name = os.getenv("PG_SCHEMA", "taskia").strip() or "taskia"
    if not name.replace("_", "").isalnum():
        raise SystemExit("PG_SCHEMA inválido")
    return name


def mysql_conn():
    return pymysql.connect(
        host=env("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=env("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=env("MYSQL_DATABASE", "taskia"),
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def pg_conn():
    import psycopg

    dsn = os.getenv("PG_DSN", "").strip()
    if dsn:
        conn = psycopg.connect(dsn)
    else:
        conn = psycopg.connect(
            host=env("PG_HOST"),
            port=int(os.getenv("PG_PORT", "5432")),
            user=env("PG_USER"),
            password=os.getenv("PG_PASSWORD", ""),
            dbname=env("PG_DATABASE", "taskia"),
            sslmode=os.getenv("PG_SSLMODE", "prefer"),
        )
    return conn


def ensure_pg_schema(pg) -> str:
    schema = pg_schema_name()
    with pg.cursor() as cur:
        cur.execute(
            sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(schema))
        )
        cur.execute(
            sql.SQL("SET search_path TO {}, public").format(sql.Identifier(schema))
        )
    pg.commit()
    print(f"Schema Postgres: {schema}")
    return schema


def table_ident(schema: str, table: str):
    return sql.Identifier(schema, table)


def split_sql(script: str) -> list[str]:
    statements: list[str] = []
    buf: list[str] = []
    in_dollar = False
    i = 0
    while i < len(script):
        if script.startswith("$$", i):
            in_dollar = not in_dollar
            buf.append("$$")
            i += 2
            continue
        ch = script[i]
        if ch == ";" and not in_dollar:
            stmt = "".join(buf).strip()
            if stmt:
                statements.append(stmt)
            buf = []
            i += 1
            continue
        buf.append(ch)
        i += 1
    tail = "".join(buf).strip()
    if tail:
        statements.append(tail)
    return [
        s
        for s in statements
        if s
        and not all(
            line.strip().startswith("--") or line.strip() == ""
            for line in s.splitlines()
        )
    ]


def apply_schema(pg, schema: str) -> None:
    script = (ROOT / "schema.sql").read_text(encoding="utf-8")
    with pg.cursor() as cur:
        cur.execute(
            sql.SQL("SET search_path TO {}, public").format(sql.Identifier(schema))
        )
        for stmt in split_sql(script):
            cur.execute(stmt)
    pg.commit()
    print(f"Tablas creadas en {schema}.")


def as_bool(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (bytes, bytearray)):
        value = value[0] if value else 0
    return bool(int(value))


def as_json(value):
    if value is None:
        return None
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8")
    if isinstance(value, (dict, list)):
        return Jsonb(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return Jsonb(json.loads(text))
        except json.JSONDecodeError:
            return Jsonb(text)
    return Jsonb(value)


def mysql_tz() -> ZoneInfo:
    return ZoneInfo(os.getenv("MYSQL_DATETIME_TZ", "America/Lima"))


def as_timestamptz(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=mysql_tz()).astimezone(timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        raw = value.replace("T", " ")[:19]
        dt = datetime.strptime(raw, "%Y-%m-%d %H:%M:%S")
        return dt.replace(tzinfo=mysql_tz()).astimezone(timezone.utc)
    return value


def convert_value(col: str, value):
    if value is None:
        return None
    if isinstance(value, Decimal):
        value = int(value)
    if col in BOOL_COLS:
        return as_bool(value)
    if col in JSON_COLS:
        return as_json(value)
    if col in DATE_COLS:
        if isinstance(value, datetime):
            return value.date()
        return value
    if isinstance(value, datetime):
        return as_timestamptz(value)
    return value


def mysql_columns(mysql, table: str) -> list[str]:
    with mysql.cursor() as cur:
        cur.execute(f"SHOW COLUMNS FROM `{table}`")
        return [row["Field"] for row in cur.fetchall()]


def pg_columns(pg, schema: str, table: str) -> list[str]:
    with pg.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position
            """,
            (schema, table),
        )
        return [row[0] for row in cur.fetchall()]


def copy_table(mysql, pg, schema: str, table: str) -> int:
    src_cols = mysql_columns(mysql, table)
    dst_cols = pg_columns(pg, schema, table)
    cols = [c for c in src_cols if c in dst_cols]
    if not cols:
        print(f"  {schema}.{table}: sin columnas en común, se omite")
        return 0

    with mysql.cursor() as cur:
        quoted = ", ".join(f"`{c}`" for c in cols)
        cur.execute(f"SELECT {quoted} FROM `{table}`")
        rows = cur.fetchall()

    if not rows:
        print(f"  {schema}.{table}: 0 filas")
        return 0

    insert = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
        table_ident(schema, table),
        sql.SQL(", ").join(sql.Identifier(c) for c in cols),
        sql.SQL(", ").join(sql.Placeholder() for _ in cols),
    )
    payload = [tuple(convert_value(c, row[c]) for c in cols) for row in rows]
    with pg.cursor() as cur:
        cur.executemany(insert, payload)
    print(f"  {schema}.{table}: {len(payload)} filas")
    return len(payload)


def reset_sequences(pg, schema: str) -> None:
    with pg.cursor() as cur:
        cur.execute(
            sql.SQL("SET search_path TO {}, public").format(sql.Identifier(schema))
        )
        for table in SERIAL_TABLES:
            cur.execute(
                "SELECT pg_get_serial_sequence(%s, 'id')",
                (f"{schema}.{table}",),
            )
            seq = cur.fetchone()[0]
            if not seq:
                continue
            cur.execute(
                sql.SQL("SELECT COALESCE(MAX(id), 1) FROM {}").format(
                    table_ident(schema, table)
                )
            )
            max_id = cur.fetchone()[0]
            cur.execute("SELECT setval(%s, %s, true)", (seq, max_id))
    print("Sequences actualizadas.")


def wipe_postgres(pg, schema: str) -> None:
    names = sql.SQL(", ").join(table_ident(schema, t) for t in reversed(TABLES))
    with pg.cursor() as cur:
        cur.execute(sql.SQL("TRUNCATE {} RESTART IDENTITY CASCADE").format(names))
    pg.commit()
    print(f"Schema {schema} vaciado (TRUNCATE).")


def count_mysql(mysql, table: str) -> int:
    with mysql.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) AS c FROM `{table}`")
        return int(cur.fetchone()["c"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrar Taskia MySQL → PostgreSQL")
    parser.add_argument("--schema-only", action="store_true", help="Solo crea tablas")
    parser.add_argument("--data-only", action="store_true", help="Solo copia datos")
    parser.add_argument(
        "--wipe",
        action="store_true",
        help="Vacía Postgres antes de copiar (pide confirmación)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Cuenta filas MySQL y sale")
    args = parser.parse_args()

    mysql = mysql_conn()
    try:
        print("MySQL:", env("MYSQL_HOST"), "/", env("MYSQL_DATABASE", "taskia"))
        print("Zona DATETIME MySQL:", os.getenv("MYSQL_DATETIME_TZ", "America/Lima"))
        if args.dry_run:
            for table in TABLES:
                print(f"  {table}: {count_mysql(mysql, table)}")
            return

        pg = pg_conn()
        try:
            schema = ensure_pg_schema(pg)
            print(
                "PostgreSQL:",
                os.getenv("PG_DSN") or f"{os.getenv('PG_HOST')}/{os.getenv('PG_DATABASE')}",
                f"schema={schema}",
            )
            if not args.data_only:
                apply_schema(pg, schema)
            if args.schema_only:
                return
            if args.wipe:
                ok = input("Esto BORRA todo en el schema de Postgres. Escribí WIPE para seguir: ").strip()
                if ok != "WIPE":
                    raise SystemExit("Cancelado.")
                wipe_postgres(pg, schema)
            total = 0
            with pg.transaction():
                with pg.cursor() as cur:
                    cur.execute(
                        sql.SQL("SET search_path TO {}, public").format(
                            sql.Identifier(schema)
                        )
                    )
                for table in TABLES:
                    total += copy_table(mysql, pg, schema, table)
                reset_sequences(pg, schema)
            print(f"Listo. {total} filas copiadas a {schema}.*")
        finally:
            pg.close()
    finally:
        mysql.close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
