# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GeniusSeeker is a STEAM talent platform. The repo has two distinct sub-systems:

1. **Static front-end** — Multi-page HTML site built with Vite, using vanilla JS for most pages and React (via Vite) only for the STEAM quiz (`quiz.html` / `src/Quiz.jsx`).
2. **identity-service** — A standalone Express/TypeScript backend at `infra/identity-service/` that runs on port 8787 and handles profiles, NFT credentials, employer verification, job applications, and the hire-to-pay flow.

## Commands

### Front-end (root)
```bash
npm run dev        # Vite dev server
npm run build      # Build all HTML pages into dist/
npm run preview    # Preview the dist/ build on port 5173
```

### Identity service (`infra/identity-service/`)
```bash
npm run dev        # ts-node-dev hot-reload server on port 8787
npm run build      # tsc compile → dist/
npm start          # Run compiled JS
```

Copy `infra/identity-service/env.example` to `infra/identity-service/.env` and fill in values before running.

## Architecture

### Static site structure
- All pages are root-level `.html` files; Vite's `build.rollupOptions.input` lists every entry point explicitly (`vite.config.js`).
- `partials/header.html` and `partials/footer.html` are injected at runtime by `js/main.js` via `fetch()` into `#site-header` / `#site-footer` placeholders. Every page that needs nav must include those placeholder divs and `<script src="/js/main.js">`.
- `css/styles.css` is the global stylesheet. Tailwind CSS is available and configured in `tailwind.config.js`.
- After `npm run build`, the `copyStaticFolders` Vite plugin copies `css/`, `js/`, and `partials/` into `dist/` verbatim.

### React quiz
- `quiz.html` mounts a React app whose entry is `src/quiz-main.jsx` → `src/Quiz.jsx`.
- Quiz scoring: each answer carries `{ category, weight, value }`. STEAM categories accumulate weighted counts; Level questions (e.g. `"Level3"`) are averaged to produce a 1–5 level. Preference categories (`CompStructure`, `WageRange`, `WorkStyle`, `WorkLocation`) are stored separately and not scored for STEAM/Level.
- On completion, the quiz posts to `/api/badges/issue` (deduped by `quizVersion`), `/api/value/log`, and `/api/profile/update` — all against the identity-service.

### Identity service
- Express app (`src/server.ts`) backed by SQLite via `better-sqlite3`. The database file (`identity-service.sqlite`) is created in the working directory automatically on startup.
- Schema migrations are inline in `src/db.ts` using `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE … ADD COLUMN` try/catch blocks for additive column additions.
- Hedera Hashgraph SDK is used to mint NFTs for STEAM badges (`HEDERA_BADGE_TOKEN_ID`) and credentials (`HEDERA_CREDENTIAL_TOKEN_ID`). Minting is optional — if the token ID env var is absent the service stores credentials in SQLite only.
- Employer sessions use a simple `Bearer <token>` scheme. The default password is `geniusseeker2026`; override with `EMPLOYER_PASSWORD` env var.
- Employer tiers: `listed` → `committed` → `invested` → `exemplary`. Only `committed`-and-above approved employers can access the candidate directory (`GET /api/candidates`).
- The Deel integration (`/api/offers/:id/create-deel-contract`) runs in sandbox mode (fake IDs) when `DEEL_API_KEY` is unset.
- AI profile import (`POST /api/profile/import`) calls the Anthropic API (`claude-sonnet-4-20250514`) to extract structured fields from resume text or a base64 PDF.
- Email relay uses Formspree (`FORMSPREE_ENDPOINT`, `FORMSPREE_APPLY_ENDPOINT`) and Resend (`RESEND_API_KEY`) for new-candidate notifications.

### API base URL resolution (Codespaces)
Pages and `src/Quiz.jsx` resolve the identity-service URL in this priority order:
1. `<meta name="gs-api" content="...">` in the page `<head>` (best for Codespaces forwarded URLs)
2. `localStorage.getItem("gs_api_base")` (set by `candidates.html`)
3. Fallback: `http://127.0.0.1:8787`

When developing in Codespaces, add the forwarded-port URL as the `gs-api` meta tag in whichever page you're testing.

### Deployment
- Front-end deploys to Vercel. `vercel.json` rewrites all routes to `/` (SPA mode).
- The identity-service is a separate long-running Node process (not on Vercel).
