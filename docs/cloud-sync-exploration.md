# Cloud Sync Exploration

Date: 2026-02-07

This project is currently local-first:
- Desktop app stores data in `budget_data.json`
- Web app stores data in browser `localStorage`

This document outlines practical ways to add optional cloud sync without breaking offline use.

## Current Prototype (Web)
- A feature-flagged persistence adapter is implemented in `webapp/app.js`.
- Default mode stays local-only.
- Cloud adapter can be enabled with URL flag: `?cloudSync=1`
- Or with localStorage flag: `budgetbeacon_cloud_sync_enabled_v1=1`
- Current cloud mode is a safe stub (`cloud-stub`) that mirrors snapshots for architecture testing only.
- Manual `Sync Now (Cloud)` action is available in the web UI for explicit sync checks.

### UI Integration Notes (2026-02-07 Refresh)
- The modernized UI keeps cloud behavior unchanged; cloud sync remains manual and opt-in.
- Status banner now visually distinguishes cloud/info messages from success and error states.
- Visual redesign does not modify storage payload shape or adapter contracts.

## Goals
- Keep local-first behavior as default.
- Make sync optional and explicit (opt-in).
- Preserve data portability (JSON export/import still works).
- Keep costs close to zero for early versions.

## Non-Goals (v1)
- Real-time collaboration between multiple users.
- Complex role/permission systems.
- Replacing local storage with cloud-only storage.

## Option A: Supabase (Postgres + Auth + REST)
Pros:
- Fast to ship for small apps.
- Managed auth and database.
- Free tier is enough for personal/portfolio scale.

Cons:
- Requires API key handling and auth flow.
- Extra complexity for desktop app integration.

Best fit:
- First cloud prototype for web app sync.

## Option B: Firebase (Firestore + Auth)
Pros:
- Simple client SDKs.
- Good real-time capabilities if needed later.

Cons:
- Vendor-specific data model.
- Pricing can become less predictable with growth.

Best fit:
- If realtime becomes a priority.

## Option C: GitHub Gist/Drive-style backup sync
Pros:
- Lowest complexity to start.
- Keeps "backup file" mental model.

Cons:
- Not true structured multi-device sync.
- Conflict handling is manual.

Best fit:
- Short-term bridge between local-only and full cloud sync.

## Recommended Path
1. Start with Option A (Supabase) for web app only.
2. Keep desktop app local-only until API design stabilizes.
3. Add manual `Sync Now` button before background auto-sync.
4. Use "last write wins" with visible conflict warning for v1.

## Minimal Data Model
- `profiles`: user account metadata
- `entries`: id, user_id, type, category, amount, note, created_at, updated_at
- `settings`: user_id, monthly_budget, updated_at
- `sync_state`: user_id, last_sync_at, client_id

## Security Notes
- Never expose admin/service keys in client code.
- Use row-level security (RLS) scoped by authenticated user id.
- Validate payload shape before writing to cloud.
- Keep local backup export even when cloud sync is enabled.

## Rollout Plan
1. Keep current local adapter as default and feature-flag all cloud paths.
2. Implement auth plus manual sync flow behind a feature flag.
3. Add conflict and offline handling tests.
4. Run limited beta with a small set of users/devices.
5. Decide whether to expand to desktop app sync.
