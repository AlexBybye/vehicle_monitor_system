# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo contains a frontend app and a binary backend simulator. There is no monorepo tooling; treat them independently.

- [frontend/vehicle_monitor_vpt/](frontend/vehicle_monitor_vpt/) — the active Vue 3 + Vite + TypeScript + Pinia application. **All frontend work happens here.** Run all npm commands from this directory.
- [backend/](backend/) — a prebuilt Windows simulator (`模拟服务端.exe`) plus its API spec. It listens on `http://127.0.0.1:12345` and is not buildable from source. On macOS/Linux the frontend will fall back to mock data (see "Mock fallback" below).
- [frontend/vehicle_monitor_vpt/README.md](frontend/vehicle_monitor_vpt/README.md), [frontend/项目新架构.md](frontend/项目新架构.md), [frontend/前端详细开发思路.md](frontend/前端详细开发思路.md) — design docs (Chinese). The architecture doc is the source of truth for the intended module layout.
- [backend/模拟车流监控系统 API 文档（前端可用）.md](backend/模拟车流监控系统%20API%20文档（前端可用）.md) — authoritative API contract. Endpoints, field names, and the `Pos_X=0 && Pos_Y=0 → vehicle has left the area` convention all come from here.
- The top-level [test_history_features.js](test_history_features.js) is a manual-test description script, not an automated test.

## Common commands

Run from [frontend/vehicle_monitor_vpt/](frontend/vehicle_monitor_vpt/):

- `npm install` — install deps (Node `^20.19.0 || >=22.12.0`).
- `npm run dev` — Vite dev server.
- `npm run build` — runs `type-check` and `build-only` in parallel via `npm-run-all2`. Both must pass.
- `npm run type-check` — `vue-tsc --build` only; faster than full build for verifying types.
- `npm run test:unit` — Vitest (jsdom). Run a single file: `npm run test:unit -- src/__tests__/App.spec.ts`. Filter by name: `npm run test:unit -- -t "pattern"`.
- `npm run format` — Prettier on `src/`. There is no ESLint config; do not invent a `lint` script.
- `npm run preview` — preview a production build.

There is no test for the backend. The simulator runs only on Windows.

## Architecture

### Data flow
The app is a single Pinia store fronted by view-level Vue components. There is no per-feature module split — everything funnels through one store.

- [src/api/index.ts](frontend/vehicle_monitor_vpt/src/api/index.ts) — thin `fetch` wrappers, one per endpoint, each with a `try/catch` that returns hardcoded mock data on failure.
- [src/store/trafficStore.ts](frontend/vehicle_monitor_vpt/src/store/trafficStore.ts) — the single Pinia store (`useTrafficStore`). Holds entries, checkpoints, vehicles, history, statistics, congestion state, recent searches, alerts, and the selected vehicle's path for replay. **Important quirk:** the store's actions call `fetch` directly with the same mock-fallback pattern instead of using `src/api/`. The two layers are duplicated. When changing API behavior, update both or consolidate — don't assume the store goes through `src/api/`.
- [src/views/](frontend/vehicle_monitor_vpt/src/views/) — page-level components routed by [src/router/index.ts](frontend/vehicle_monitor_vpt/src/router/index.ts): `MapView`, `HistoryView`, `StatisticsView`, `CongestionView`. `/` redirects to `/map`.
- [src/components/](frontend/vehicle_monitor_vpt/src/components/) — `MapCanvas.vue` is the largest component and owns rendering for the map view, vehicle layer, congestion visualization, and heatmap (the heatmap is integrated here, not in `HeatmapOverlayFixed.vue` which exists alongside it). `VehicleIcon`, `SearchBar`, `ChartPanel` are smaller building blocks.
- [src/utils/index.ts](frontend/vehicle_monitor_vpt/src/utils/index.ts) — pure helpers: `formatDate` (parses .NET `/Date(...+0800)/` strings into Chinese-formatted dates), `interpolatePosition` (used to smooth vehicle movement between polls), `debounce`/`throttle`, CSV/JSON exporters.
- [src/types/index.ts](frontend/vehicle_monitor_vpt/src/types/index.ts) — interfaces mirror the API field names exactly (`Pos_X`, `Pos_Y`, `EnterNo`, etc.). Do **not** rename them to camelCase; downstream code reads these fields as-is.

### Backend coordinate system
The map area is 800×600. Coordinates come from the simulator in this same space. `Pos_X === 0 && Pos_Y === 0` is a sentinel meaning "vehicle left the region", not origin — filter or special-case it when rendering. History pagination starts at `Page=1`, 5 records per page.

### Mock fallback
Every endpoint has hardcoded mock data inline in both [src/api/index.ts](frontend/vehicle_monitor_vpt/src/api/index.ts) and the store actions. This is what makes the app run on macOS without the Windows simulator. When adding a new endpoint, follow the same pattern in both places (or refactor the duplication, but flag it first).

### Rendering
Map rendering uses Canvas — the design called for a two-layer setup (static background + dynamic vehicle layer driven by `requestAnimationFrame` with linear interpolation). [src/components/MapCanvas.vue](frontend/vehicle_monitor_vpt/src/components/MapCanvas.vue) is where this lives; check it before adding map features rather than introducing a new rendering path.

## Project-specific notes

- Date strings from the API use the .NET `/Date(<unix-ms>+<tz>)/` format. Always go through `formatDate` in [src/utils/index.ts](frontend/vehicle_monitor_vpt/src/utils/index.ts) — don't `new Date()` on them directly.
- The Vitest scaffolding is the Vue CLI default ([src/__tests__/App.spec.ts](frontend/vehicle_monitor_vpt/src/__tests__/App.spec.ts) asserts on `"You did it!"` which the real `App.vue` does not contain). The test will fail as-is. Update or replace it before relying on `npm run test:unit` as a CI gate.
- Path alias `@` resolves to `src/` (configured in both [vite.config.ts](frontend/vehicle_monitor_vpt/vite.config.ts) and the tsconfig chain). Prefer `@/...` imports over relative paths in `src/`.
- The router uses `createWebHistory` — links must be served from a server that supports SPA fallback. `npm run dev` and `npm run preview` both handle this; opening `dist/index.html` directly will not.

---

# Behavioral guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
