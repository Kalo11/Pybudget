# Changelog

All notable changes to BudgetBeacon are documented here.

## [Unreleased]
### Added
- Web budget usage progress component with dynamic messaging and warning states (`webapp/index.html`, `webapp/app.js`)
- Entry count metadata and richer entry row rendering (type chips + styled money cells) (`webapp/index.html`, `webapp/app.js`, `webapp/styles.css`)
- Tone-aware status presentation (`ok`, `error`, `info`) with inferred message classification (`webapp/app.js`, `webapp/styles.css`)
- Modernized web styling system with updated typography, color tokens, and responsive polish (`webapp/styles.css`)

### Changed
- Web dashboard layout refreshed with improved information hierarchy and visual clarity (`webapp/index.html`, `webapp/styles.css`)
- Chart drawing now consumes CSS variables for theme consistency (`webapp/app.js`)
- Documentation refreshed to match modernized web behavior and QA needs (`README.md`, `webapp/QA_CHECKLIST.md`, `docs/screenshots/README.md`, `docs/cloud-sync-exploration.md`)

### Planned
- Optional deployment guides for Vercel and Netlify (GitHub Pages is already live)

## [2026-02-06] - v0.7.0
### Added
- Web recurring entry rules (weekly/monthly)
- Automatic posting of due recurring entries on app start
- Recurring rule list management (view/remove)

## [2026-02-06] - v0.6.0
### Added
- Web onboarding flow (3 steps)
- Sample data toggle (load/clear)
- Step 5 QA checklist (`webapp/QA_CHECKLIST.md`)

### Improved
- Web app hardening for compatibility and stability
- Event-delegated table actions for better large-list performance
- Better button behavior on narrow/mobile layouts

## [2026-02-06] - v0.5.0
### Added
- Web entry editing workflow
- Web backup export/import (JSON)

## [2026-02-06] - v0.4.0
### Added
- Responsive web app (`webapp/index.html`, `webapp/styles.css`, `webapp/app.js`)

## [2026-02-06] - v0.3.0
### Changed
- Project branding renamed to **BudgetBeacon**
- Desktop and web themes updated to match new brand

## [2026-02-06] - v0.2.0
### Improved
- Desktop usability for non-technical users
- Better category dropdowns and deletion flow

## [2026-02-06] - v0.1.0
### Added
- Initial desktop budget app
- GitHub repo setup and basic documentation
