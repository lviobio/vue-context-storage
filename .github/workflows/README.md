# GitHub Pages Deployment

This repository automatically deploys the playground to GitHub Pages on every push to the `main` branch.

## Setup Instructions

To enable GitHub Pages deployment:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
4. The workflow will automatically deploy on the next push to `main`

## Workflow Details

The deployment workflow (`.github/workflows/deploy-playground.yml`) does the following:

1. **Build job**:
   - Checks out the repository
   - Sets up Node.js 20
   - Installs dependencies with `npm ci`
   - Builds the playground with `npm run build:playground`
   - Uploads the build artifact

2. **Deploy job**:
   - Takes the build artifact
   - Deploys to GitHub Pages

## Accessing the Playground

After successful deployment, the playground will be available at:

```
https://<username>.github.io/vue-context-storage/
```

Replace `<username>` with your GitHub username or organization name.

## Manual Deployment

You can also trigger the deployment manually:

1. Go to **Actions** tab in your repository
2. Select "Deploy Playground to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow"

## Local Preview

To preview the production build locally:

```bash
npm run build:playground
npm run preview:playground
```

This will start a local server at `http://localhost:4173/vue-context-storage/`

## Configuration

The deployment configuration is in:

- **Workflow**: `.github/workflows/deploy-playground.yml`
- **Vite config**: `vite.config.ts` (sets base path for production)
- **Router config**: `playground/src/index.ts` (uses `BASE_URL` from Vite)

### Base Path

The base path is automatically set based on the environment:

- **Development**: `/app/` (for local dev server)
- **Production**: `/vue-context-storage/` (for GitHub Pages)

This is configured in `vite.config.ts`:

```typescript
base: process.env.NODE_ENV === 'production' ? '/vue-context-storage/' : '/app/'
```

## Troubleshooting

### Deployment fails

1. Check the **Actions** tab for error logs
2. Ensure GitHub Pages is enabled in repository settings
3. Verify permissions are set correctly (workflow has `pages: write` permission)

### 404 errors on routes

If you get 404 errors when navigating to routes directly:

1. This is expected with GitHub Pages and client-side routing
2. Users should navigate through the app's navigation menu
3. The homepage will always work: `https://<username>.github.io/vue-context-storage/`

### Styles not loading

If styles or assets are not loading:

1. Check that the base path matches the repository name
2. Update `vite.config.ts` if your repository name is different
3. Ensure `import.meta.env.BASE_URL` is used in router config
