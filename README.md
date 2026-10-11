# Guess the Tech Career

A presenter-laptop game built with Vite, vanilla JavaScript, HTML and CSS. Each player gets five different careers from the supplied 15-card Arabic collection, 30 seconds per card, and four shuffled English options. The provided Nawras logo is included; Arabic uses locally bundled Noto Sans Arabic. No paid APIs, backend or remote fonts are required.

The visual guide is `design-reference/Screenshot 2026-10-11 022436.png`: pale blue, a fine cyan grid, navy/teal headings, white glass panels and gold actions. All screens and dialogs follow this theme and reuse `public/assets/branding/nawras-name.png`. The page title is “Guess the Tech Career”; the favicon uses the existing square `nawras-small.png` branding asset. Buttons contain text only, with no arrows.

The gameplay stack is centered in the area below the header. Both card faces and a reserved continuation area keep the card and answer positions stable when revealing. Compact layouts keep the options and Next control visible on smaller screens. One canvas draws restrained cyan/lavender particles, with occasional soft gold, varied depths and gentle movement. The area around the landing logo, title and name form remains clear. It uses fewer particles on mobile, draws at about 30fps, caps pixel density and pauses while hidden. Reduced motion leaves a static particle field; particles never intercept clicks.

Cards flip top to bottom with a two-face `rotateX` transition, perspective and hidden back faces. Both faces determine the card's size before answering to keep its layout stable; the unrevealed back is hidden visually and from assistive technology. Reduced-motion users see an immediate reveal.

Short, quiet Web Audio sounds cover clicks, flips, correct/wrong answers, timeouts and round completion. There are no local sound files, so no downloads or continuous audio are needed. Audio unlocks after the first interaction. The small Sound control appears on every screen, stops playback when muted and remembers its setting in localStorage. Cues play sequentially, with one sequence at a time.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173/nawras-tech-career/`. Production preview: `npm run build` then `npm run preview`, and open `http://127.0.0.1:4173/nawras-tech-career/`.

## Play

Enter a name and press Start. Click an answer or use keys 1–4; the first answer is final. Tab and Enter also work. F toggles fullscreen when you are not typing. Escape follows normal browser behavior.

Correct answers use actual answering time, rounded to integer milliseconds. Wrong answers and timeouts each add 30,000 ms. Reading explanations adds no time. Click Next to continue. Attempts are sorted by correct count descending and ranking time ascending. Exact ties share competition ranks (1, 2, 2, 4). All ranks through 5 are highlighted, including ties; the current attempt has its own highlight. Each completed round is saved exactly once; repeated names create separate attempts. A refresh abandons an unfinished round.

**The leaderboard is stored only in localStorage on the presenter's browser and origin. It is not shared across devices or browsers.** Clearing requires confirmation. Private browsing, clearing site data, changing origins, or disabled storage can remove or prevent persistence. Storage failures display a message; the game can still retain results for that session.

## Validate

```sh
npm test
npx playwright install chromium
npm run build
npm run test:browser
```

`npm run check` runs unit tests, builds, and then runs browser tests. The browser suite tests the actual production build. Tests cover unique-card randomization, independently shuffled choices, answer locking, exact and delayed deadlines, timer cleanup, reading-time exclusion, wrong-answer penalties, zero-score rounds, duplicate-save prevention, shared ranks, safe names, refresh persistence, clear confirmation and keyboard input. Additional browser checks capture all screens at laptop/mobile sizes and inspect the vertical flip's axis, back faces, upright text, stable layout and reduced-motion behavior. Real Web Audio is instrumented to verify interaction unlock, brief sequential cues, locked-answer silence, mute persistence and playback cleanup. Fullscreen is checked in an active round and an open confirmation dialog.

## GitHub Pages

The existing `origin` is `https://github.com/swirita/nawras-tech-career.git`, on branch `main`. The expected Pages URL is `https://swirita.github.io/nawras-tech-career/`. Preparing or previewing the project locally does not publish it.

1. In that repository's **Settings → Pages → Build and deployment**, select **GitHub Actions**.
2. When ready to publish, review and commit the changes, then push to the existing remote using your normal Git credential manager:

```sh
git add -A
git commit -m "Optimize game and prepare GitHub Pages"
git push origin main
```

3. Watch **Actions → Check and deploy to GitHub Pages**. Pushes to `main` and manual **Run workflow** runs install from `package-lock.json`, run unit tests, install Chromium, build, run browser checks against the production repository path, and deploy `dist` to Pages. If Pages was enabled after a failed run, rerun the workflow.
4. Open the URL reported by the deployment. The workflow uses the `github-pages` environment, Pages write and OIDC permissions only in the deployment job, and serialized deployments.

`config/pages.js` supplies the same base path to Vite and the production browser tests. It defaults to `/nawras-tech-career/` locally and derives the repository name from `GITHUB_REPOSITORY` in Actions. Account sites named `ACCOUNT.github.io` use `/`; other repositories use `/REPOSITORY/`. Images, the square PNG favicon, bundled WOFF2 fonts and scripts load beneath that path. Set `VITE_BASE_PATH=/` for a custom domain, or `VITE_BASE_PATH=/your-path/` for another hosting path. No server routes are used.

`node_modules`, `dist`, generated reports, debug logs and local environment files are ignored by Git. Original branding and the design reference are retained. Local preview and the hosted game have separate leaderboards because their origins differ.

No passwords or tokens should be pasted into chat. If Git prompts for authentication, use your system credential manager or GitHub's SSH setup.

The local GitHub CLI is unavailable, so GitHub authentication, repository Pages settings and a hosted deployment have not been verified here.

## Files

- `src/data/careers.js`: original clue paragraphs, names, explanations, skills, stable IDs and curated alternatives. AI/ML/data roles and cloud/DevOps overlap are excluded where they could make a clue ambiguous.
- `src/game.js`: shuffled round selection, final-answer locking, deadline-based timing and scoring.
- `src/leaderboard.js`: validated browser storage, idempotent saves and shared ranks.
- `src/main.js`: accessible screen rendering, focus, controls and clear confirmation.
- `src/particles.js`, `src/styles.css`: lightweight motion, responsive reference theme and reduced-motion support.
- `src/audio.js`: brief Web Audio effects, playback cleanup and persisted mute control.
- `src/fonts.css`: local WOFF2 font faces without redundant fallback files in the build.
- `config/pages.js`: shared repository base-path configuration.
- `public/assets/branding/`: supplied Nawras branding and favicon.
- `public/assets/sounds/`: reserved for optional local sounds; this version synthesizes lightweight effects.
- `.github/workflows/deploy.yml`: checks, production build and Pages deployment.
