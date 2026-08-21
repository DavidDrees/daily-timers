# Daily Timers

A local, install-to-home-screen timer app for tracking recurring daily habits
(e.g. "hang from pull-up bar — 3 min/day") that get done in chunks throughout
the day. Start/pause each timer as you do the activity; every timer resets to
its full target at local midnight. A calendar view tracks streaks of days
where every timer was run to zero.

No accounts, no backend — all data lives in your browser's `localStorage` on
whichever device you use it on.

## Running locally

Service workers (needed for install/offline support) don't work on `file://`,
so serve the folder instead of double-clicking `index.html`:

```bash
python dev-server.py 8080
```

This is a thin wrapper around `python -m http.server` that disables browser
caching, so edits during development always show up on reload instead of
being masked by a stale cached copy. (Plain `npx serve .` or
`python -m http.server` also work fine — just expect to need a hard refresh
after changes, since they let the browser cache normally.)

Then open the printed `http://localhost` URL.

## Deploying (GitHub Pages)

1. Push this folder to a GitHub repo.
2. In the repo's Settings → Pages, set the source to the branch/root containing these files.
3. Visit the published `https://<user>.github.io/<repo>/` URL — from there you
   can "Install" / "Add to Home Screen" for an app-like icon with offline support.

## Backing up your data

Your timers, today's progress, and full history live only in this browser's
local storage. Use the **Export data** button (footer) periodically to save a
JSON backup, and **Import data** to restore it (e.g. after clearing browser
data, or to move history to a new device/browser).

## Project layout

- `js/storage.js` — localStorage read/write, versioned schema
- `js/day.js` — local-date helpers, midnight rollover
- `js/timers.js` — timer CRUD, start/pause accumulation math
- `js/history.js` — per-day completion snapshots
- `js/streaks.js` — current/longest streak calculation
- `js/timers-ui.js`, `js/calendar-ui.js` — rendering + DOM event wiring
- `js/app.js` — bootstraps everything, live countdown loop, cross-tab sync
- `manifest.webmanifest`, `service-worker.js`, `icons/` — PWA install/offline support
