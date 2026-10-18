# Agentes: Cursor y Claude Code

Este repo se trabaja con **Cursor** y **Claude Code** (p. ej. en Warp) a la vez. Cada uno sirve para motivos distintos; la verdad del producto es la misma.

## Quién usa qué

| Herramienta | Carpeta / entrada | Uso típico |
| --- | --- | --- |
| Cursor | `.cursor/rules/`, chat del IDE | Implementación diaria, UI, commits en `staging`, migraciones |
| Claude Code | `.claude/`, `CLAUDE.md` | Exploración con graphify, revisiones largas, `/graphify` |

Las reglas de Cursor no las aplica Claude Code, y al revés. No hace falta duplicar políticas largas en ambas carpetas.

## Fuente compartida (ambos)

1. Leer `STATE.md` al empezar una tarea.
2. Detalle en `docs/` ([índice](README.md)).
3. El código manda si contradice la doc; entonces se corrige `STATE.md`.

Convenciones de commits, migraciones y actualización de `STATE.md` viven en `.cursor/rules/`. En Claude Code, respeta las mismas normas leyendo esos archivos o este doc cuando toque commit o esquema.

## Graphify

- Grafo en `graphify-out/`. Skill en `.claude/skills/graphify/`.
- Instrucciones siempre-on en `CLAUDE.md` (raíz).
- No hay hooks `PreToolUse` de `graphify hook-guard` en el proyecto: en Windows generaban scripts `.sh` temporales en cada Grep/Read. Si hace falta el guard otra vez, se reinstala con cuidado (y preferible con `shell`/`args` PowerShell, no bash).

## Shell en Windows

- **Claude Code (este repo):** `defaultShell` es `powershell` en `.claude/settings.json`.
- **Cursor:** la terminal del agente ya es PowerShell; encadenar con `;`, no `&&`.
- Los `.sh` sueltos fuera del repo (cachés del runtime) no son del producto; no se versionan.

## Trabajo en paralelo

- Una sola rama de día: `staging`. Coordinar pull/rebase si los dos agentes (o dos chats) tocan los mismos archivos.
- No mantener dos bitácoras de estado; solo `STATE.md`.
- `graphify-out/graph.json` puede cambiar entero tras un rebuild; eso es esperado.
