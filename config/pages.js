// Shared by Vite and the production browser checks. Matches the existing origin remote.
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'nawras-tech-career';
export const basePath = process.env.VITE_BASE_PATH || (repository.endsWith('.github.io') ? '/' : `/${repository}/`);
