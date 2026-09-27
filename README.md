# Taskia (web)

Qué es y cómo se usa: [PRODUCTO.md](PRODUCTO.md).

- `taskia_frontend` — React + Vite
- `taskia_backend` — Express + TypeScript (API + Gemini)
- `taskia_desktop` — app Tauri **congelada**

## Desarrollo local

1. Copia envs:
   - `taskia_backend/.env.example` → `.env.development` (completa Postgres, JWT, Gemini)
   - `taskia_frontend/.env.example` → `.env.development`
2. Base de datos (desde la raíz o `taskia_backend`):
   - `npm run db:migrate` — crea el schema y aplica migraciones pendientes
   - Admin semilla: usuario `Sebastian` / contraseña `123456`
   - QA / producción: `npm run db:migrate:qa` / `npm run db:migrate:pd` (en `taskia_backend`)
3. Backend: `cd taskia_backend && npm install && npm run dev`
4. Frontend: `cd taskia_frontend && npm install && npm run dev`

Builds y ejecución (producción = `.env.pd`):
- Frontend: `npm run build:pd` / `npm run dev:pd` / `npm run preview:pd`
- Backend: `npm run build:pd` y luego `npm run start:pd` (o `npm run dev:pd` con watch)
- QA: `npm run build:qa` / `npm run start:qa` (con `.env.qa`)
