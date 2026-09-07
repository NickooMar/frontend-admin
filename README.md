# frontend-admin

Global administration panel for the **Diagnóstica** platform. It operates
**above** the brand/tenant boundary: an admin logs in with a global account
(the `admin_users` collection in the main `diagnostica` database), no brand is
selected, and every call goes to `backend-diagnostica`'s `/api/v1/admin/*`
namespace.

This iteration ships the foundation only: login, session persistence, a
protected shell with a dashboard placeholder, and logout. Brand / kiosk /
configuration management build on top of it in later tickets.

## Stack

| Area | Choice |
| --- | --- |
| Build | Vite 8 + React 19 + TypeScript (strict) |
| UI | [shadcn/ui](https://ui.shadcn.com) (radix, `nova` preset) on Tailwind CSS v4 |
| Routing | react-router-dom v7 (data router) |
| State | zustand (`src/auth/authStore.ts`) |
| HTTP | axios instance with auth + refresh interceptors (`src/lib/api.ts`) |
| Lint / format | Biome (same config as `frontend-diagnostica`), husky pre-commit |
| Types | `tsgo` (`@typescript/native-preview`) |
| Tests | Vitest + Testing Library (jsdom) |
| Package manager | bun |

## Scripts

```bash
bun install
bun run dev          # http://localhost:3200
bun run build        # → build/
bun run preview
bun run test         # vitest (watch)
bun run test:ci      # vitest run
bun run check        # biome check --write src
bun run check:ci     # biome check src
bun run check:types  # tsgo --noEmit -p tsconfig.app.json
```

## Environment

Copy `.env.example` to `.env`:

| Variable | Purpose |
| --- | --- |
| `VITE_DIAGNOSTICA_API_ENDPOINT` | backend-diagnostica base URL (e.g. `http://localhost:3101`) |
| `VITE_DIAGNOSTICA_ENV` | environment label shown in the shell |
| `VITE_HMR_PROXY` | `true` when the dev server sits behind the HTTPS proxy |
| `VITE_COMMIT_HASH` / `VITE_COMMIT_DATE` | injected by the Docker build |

In Docker the `VITE_*` values are placeholders replaced at container start by
`set_variables.sh` (same mechanism as the other frontends).

## Auth flow

1. `POST /api/v1/admin/auth/login` with `{email, password}` → `{admin, token, refreshToken}`.
2. Tokens are kept in `sessionStorage` (survives refresh, not the tab) and in the zustand store.
3. On startup a persisted token is revalidated with `GET /api/v1/admin/auth/me`
   before any protected route renders (`AuthBootstrap`).
4. The axios interceptor attaches `Authorization: Bearer <token>`; on a
   `401 TOKEN_EXPIRED` it calls `POST /refresh` once (single-flight) and replays
   the request; any other 401 clears the session, which sends the router to `/login`.
5. Logout calls `POST /logout` (best effort) and clears the session.

## Layout

```
src/
├── app/          App, router, AppShell (protected frame)
├── auth/         store, token storage, actions, route guards, bootstrap
├── components/   shared components (+ shadcn/ui under components/ui)
├── config/       env
├── lib/          api client, strings, utils
├── screens/      LoginScreen, DashboardScreen
├── services/     adminAuthService (HTTP)
└── types/        auth types
```

## Adding an admin module (next tickets)

1. Backend: mount a router under `/api/v1/admin/<resource>` guarded by `authCheckAdmin`.
2. Frontend: add a service in `src/services`, a screen in `src/screens`, a
   route as a child of the `AppShell` layout route in `src/app/router.tsx`, and
   a `NAV_ITEMS` entry in `src/app/AppShell.tsx`.
