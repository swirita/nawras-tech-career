import { defineConfig } from 'vite';

// Actions supplies the real repository. Relative paths also support local previews.
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const pagesBase = repository && !repository.endsWith('.github.io') ? `/${repository}/` : '/';
export default defineConfig({ base: process.env.VITE_BASE_PATH || (repository ? pagesBase : './') });
