# Step 6 QA Checklist (Modernized Web App)

## Desktop Browser
- Open `http://localhost:8000`.
- Confirm hero/topbar, stats, budget progress bar, form panel, table, and charts render without overlap.
- Add income and expense entries; verify totals and budget progress update.
- Confirm entry `Type` renders as badge chips and `Amount` styling reflects type.
- Verify `X shown` count updates when filters/search change.
- Enter invalid amount/budget values and confirm status banner shows error-style feedback.
- Trigger successful actions (save, edit, delete, export) and confirm status banner uses success style.
- Click `Sync Now (Cloud)` with and without cloud flag and confirm info/error status messaging is clear.

## Mobile / Narrow Width
- In browser devtools, test widths: `390px`, `768px`, `1024px`.
- Confirm cards reflow cleanly and no text is cut off.
- Confirm the form panel is not sticky on narrow widths.
- Confirm filter controls stack and remain usable.
- Confirm table area scrolls horizontally when needed.
- Confirm `Edit` and `Delete` buttons remain usable on narrow screens.

## Empty Data
- Clear all entries.
- Confirm empty-state text appears.
- Confirm charts show `No ... data yet` messages.
- Confirm budget progress reads setup guidance when budget goal is `0`.

## Large Data
- Load sample data repeatedly or import a large backup.
- Confirm filtering/search remains responsive.
- Confirm chart rendering remains stable after window resize.

## Onboarding
- Open in a private/incognito window.
- Confirm 3-step onboarding appears once.
- Confirm `Skip` and `Finish` close the walkthrough.

## Accessibility and Motion
- Verify keyboard focus rings are visible on inputs, selects, and buttons.
- Verify status text updates are announced via `aria-live` (`#status`).
- Enable OS/browser reduced motion and confirm animations/transitions are minimized.

## Data Safety
- Refresh page and verify data persists.
- Close and reopen browser; verify data remains.
- Export a backup and import it back; verify data is restored.
- Import malformed JSON and verify app fails safely (status message, no crash).
