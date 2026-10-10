import { defineConfig } from '@playwright/test';
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.VITE_BASE_PATH || (repository && !repository.endsWith('.github.io') ? `/${repository}/` : '/');
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.js', workers: 1,
  use: { baseURL: `http://127.0.0.1:4173${base}`, browserName: 'chromium', headless: true },
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', url: `http://127.0.0.1:4173${base}`, reuseExistingServer: !process.env.CI },
});
