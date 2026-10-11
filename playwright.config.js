import { defineConfig } from '@playwright/test';
import { basePath } from './config/pages.js';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.js', workers: 1,
  use: { baseURL: `http://127.0.0.1:4173${basePath}`, browserName: 'chromium', headless: true },
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', url: `http://127.0.0.1:4173${basePath}`, reuseExistingServer: false },
});
