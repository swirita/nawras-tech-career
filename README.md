# Guess the Tech Career · NawrasEdu

A presenter-laptop game built with Vite, vanilla JavaScript, HTML and CSS. Each player gets five different careers from the supplied 15-card Arabic collection, 30 seconds per card, and four shuffled English options. The provided Nawras logo is included; Arabic uses locally bundled Noto Sans Arabic. No paid APIs, backend or remote fonts are required.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Production preview: `npm run build` then `npm run preview`.

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

`npm run check` runs unit tests, builds, and then runs browser tests. The browser suite tests the actual production build. Tests cover unique-card randomization, independently shuffled choices, answer locking, exact and delayed deadlines, timer cleanup, reading-time exclusion, wrong-answer penalties, zero-score rounds, duplicate-save prevention, shared ranks, safe names, refresh persistence, clear confirmation, keyboard input, reduced motion and mobile layout.

## GitHub Pages

This folder initially had **no Git repository or remote**, and `gh` was not installed, so no GitHub authentication could be checked. A local `main` repository is initialized without committing or publishing on your behalf.

1. Create an empty GitHub repository (for example `nawras-tech-career`), without adding a README or license there.
2. Connect and push using your normal Git credential manager or SSH setup. Replace `YOUR-ACCOUNT` and, if different, the repository name:

```sh
git add .
git commit -m "Build NawrasEdu tech career game"
git remote add origin https://github.com/YOUR-ACCOUNT/nawras-tech-career.git
git push -u origin main
```

3. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**. If an initial deployment failed before this setting was enabled, rerun the workflow from the Actions tab.
4. Pushes to `main` and manual runs of **Check and deploy to GitHub Pages** install from `package-lock.json`, run unit tests, install Chromium, build, run browser checks, and deploy `dist` to Pages.

Vite derives its base from `GITHUB_REPOSITORY` in Actions, so the actual connected repository is used automatically. Account sites named `ACCOUNT.github.io` use `/`; other repositories use `/REPOSITORY/`. Local builds use relative asset paths. Set `VITE_BASE_PATH=/` for a custom domain, or `VITE_BASE_PATH=/your-path/` for another hosting path. No server routes are used.

No passwords or tokens should be pasted into chat. If Git prompts for authentication, use your system credential manager or GitHub's SSH setup.

## Files

- `src/data/careers.js`: original clue paragraphs, names, explanations, skills, stable IDs and curated alternatives. AI/ML/data roles and cloud/DevOps overlap are excluded where they could make a clue ambiguous.
- `src/game.js`: shuffled round selection, final-answer locking, deadline-based timing and scoring.
- `src/leaderboard.js`: validated browser storage, idempotent saves and shared ranks.
- `src/main.js`: accessible screen rendering, focus, controls and clear confirmation.
- `src/particles.js`, `src/styles.css`: lightweight motion, responsive navy theme and reduced-motion support.
- `public/assets/branding/`: supplied Nawras branding and favicon.
- `public/assets/sounds/`: reserved for optional local sounds; the first version plays silently.
- `.github/workflows/deploy.yml`: checks, production build and Pages deployment.
