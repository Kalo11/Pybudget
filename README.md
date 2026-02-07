# BudgetBeacon

BudgetBeacon is a personal budget tracker with two interfaces:
- Desktop app (`tkinter`) for local use
- Modern responsive web app (HTML/CSS/JS) for phone and desktop browser use

## Web UI Refresh (2026-02-07)
- Modernized dashboard layout and visual hierarchy
- Budget usage progress meter with near-limit and over-budget feedback
- Improved entries table readability (income/expense type chips plus styled amounts)
- Tone-aware status banner for success/error/info feedback
- Better responsive behavior across desktop/tablet/mobile breakpoints
- Reduced-motion support and accessible live-status region

## Screenshots
Add screenshots to `docs/screenshots/` and update these links:
- `docs/screenshots/dashboard.png` (main dashboard)
- `docs/screenshots/edit-entry.png` (edit dialog)
- `docs/screenshots/onboarding.png` (first-run onboarding)

Example markdown once added:
```md
![Dashboard](docs/screenshots/dashboard.png)
```

## Quick Start
### Web App (recommended)
```powershell
cd webapp
python -m http.server 8000
```
Open: `http://localhost:8000`

## Deploy (GitHub Pages)
This repo includes `.github/workflows/deploy-pages.yml` to publish `webapp/`.

1. Push to `main` (workflow runs automatically on web app changes).
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, choose `Source: GitHub Actions`.
4. Wait for the `Deploy BudgetBeacon Web` workflow to complete.

Live URL:
`https://kalo11.github.io/BudgetBeacon/`

### Desktop App
```powershell
python budget_app.py
```

## Core Features
- Add income and expense entries
- Edit and delete existing entries
- Recurring entry rules (weekly/monthly) with automatic due posting
- Filter/search entries by type/category/text
- Monthly budget goal plus live summary cards
- Budget usage progress bar with over-budget warning state
- Built-in charts (monthly expense trend, top expense categories)
- Modern table styling with type badges and entry count summary
- Status banner with inferred message tones (success/error/info)
- Backup/restore (web JSON export/import)
- Onboarding flow and sample-data toggle (web)
- CSV import/export (desktop)

## Data Storage
- Desktop app: `budget_data.json`
- Web app: browser `localStorage`
- Web backup file: exported `.json` snapshots
- Recurring rules are stored in web app `localStorage` backups

## Known Limits
- Web app data is per-browser unless manually backed up/imported.
- No user accounts/full cloud sync yet.
- Desktop and web data stores are separate.
- Desktop UI is designed for desktop OS windows (not mobile-native).

## Cloud Sync Exploration
See: `docs/cloud-sync-exploration.md`
Web prototype flag: append `?cloudSync=1` to the web app URL.
When enabled, use `Sync Now (Cloud)` in the web app to trigger a manual sync check.

## Quality Checks
Use: `webapp/QA_CHECKLIST.md`

## Changelog
See: `CHANGELOG.md`

## Notes
- `.gitignore` excludes local environment files and `budget_data.json`.
- This project is local-first and does not send data anywhere by default.
