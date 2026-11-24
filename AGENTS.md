# Readster

Angular 21 app for reading at your own pace: word highlighting, auto play at a chosen wpm, RSVP mode, a local library with progress, .txt/.pdf import. Deployed on Vercel. Everything runs in the browser.

## Commands

- `npm start`: dev server.
- `npx ng test --watch=false --browsers=ChromeHeadless`: tests, single run (Karma + Jasmine). `npm test` alone opens a watching browser.
- `npm run build`: production build with prerender.

## Map

- `src/app/app.routes.ts`: routes; every page is lazy-loaded with `loadComponent`.
- `src/app/pages/`: landing (`/`), library (`/app`), new reading (`/app/nova`), reading (`/app/ler/:id`).
- `src/app/components/`: reader, stepper, segmented control, dialogs, theme toggle and other shared pieces.
- `src/app/layout/app-shell.component.ts`: shell around the `/app` screens.
- `src/app/preferences.ts`: all `localStorage` access (prefs, library, stats).
- `src/app/reading.ts`: tokenizing, pacing (wpm to delay), RSVP pivot, time formatting. `pdf.ts`: PDF text extraction. `seo.ts`: per-page meta and JSON-LD.

## Rendering

- `/`, `/app` and `/app/nova` are prerendered. `/app/ler/:id` is client-only: `vercel.json` rewrites it to `index.csr.html`.
- Code that reads `localStorage` or other browser-only state runs inside `afterNextRender`, so the server render and the hydrated page always match.
- Icons: the lucide icons registered in `src/app/app.config.ts` are the whole set. Register a new icon there before using it.

## Rules

- **Local only**: no backend, account or auth. The user's text stays in their browser.
- **Few dependencies**: write the few lines yourself; ask the user before adding a package.
- **Accessible**: AA contrast, visible focus, labelled controls, 44px touch targets, motion behind `prefers-reduced-motion`.
- **Design system**: build UI from the classes in `src/styles.scss` (`.btn` with `-primary`/`-secondary`/`-ghost`/`-danger`/`-icon`, `.card`, `.field`, `.focus-ring`) and the `brand` Tailwind palette. Ask for confirmation through `ConfirmService`.
- **Language**: UI copy in Brazilian Portuguese; code and comments in English.
- **Honest copy**: describe what the features do; leave out any claim of faster reading or better comprehension.
- **Workflow**: one branch and one PR per piece of work, named `feat/...` or `fix/...`. Tests and build pass before every PR.

## Domain docs

Before changing a domain concept or a past decision, read `GLOSSARY.md` (the project's vocabulary) and the matching records in `docs/adr/`. Use the glossary's terms in code, issues and PRs.

## Agent skills

Workflow skills (TDD, bug diagnosis, domain modeling, PR review) come from `mattpocock/skills`. They are optional; install them for your agent from https://github.com/mattpocock/skills#installation.

### Issue tracker

GitHub Issues on `luizgcl/readster`, via `gh`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
