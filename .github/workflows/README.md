# GitHub Actions Workflows

This repository uses GitHub Actions for continuous integration and deployment.

## Available Workflows

### 1. CI (Continuous Integration)
**File**: `.github/workflows/ci.yml`

Runs on every push and pull request to `main` and `develop` branches.

**Jobs**:
- **Test**: Runs tests on Node.js versions 18, 20, and 22
  - Type checking (`npm run ts:check`)
  - Linting (`npm run lint:check`)
  - Formatting check (`npm run format:check`)
  - Unit tests (`npm test`)
  - Dependency cruiser check

- **Build**: Verifies package builds correctly
  - Builds the library
  - Validates build artifacts exist

### 2. Coverage
**File**: `.github/workflows/coverage.yml`

Runs on push to `main` and pull requests to `main`.

**Jobs**:
- Runs tests with coverage reporting
- Uploads coverage to Codecov (requires `CODECOV_TOKEN` secret)
- Comments on PRs with coverage report

### 3. Deploy Playground to GitHub Pages
**File**: `.github/workflows/deploy-playground.yml`

Automatically deploys the playground to GitHub Pages on every push to the `main` branch.

## Status Badges

Add these badges to your README.md to show workflow status:

```markdown
![CI](https://github.com/<username>/vue-context-storage/actions/workflows/ci.yml/badge.svg)
![Coverage](https://github.com/<username>/vue-context-storage/actions/workflows/coverage.yml/badge.svg)
![Deploy](https://github.com/<username>/vue-context-storage/actions/workflows/deploy-playground.yml/badge.svg)
[![codecov](https://codecov.io/gh/<username>/vue-context-storage/branch/main/graph/badge.svg)](https://codecov.io/gh/<username>/vue-context-storage)
```

Replace `<username>` with your GitHub username or organization name.

## Setup Instructions

### Required Secrets

For the Coverage workflow to work, you need to set up:

1. **CODECOV_TOKEN** (optional but recommended):
   - Go to [codecov.io](https://codecov.io)
   - Sign up/in with your GitHub account
   - Add your repository
   - Copy the upload token
   - In GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `CODECOV_TOKEN`
   - Value: Your Codecov token

### Enable GitHub Pages

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

## Running CI Checks Locally

Before pushing, you can run the same checks that CI runs:

```bash
# Run all checks (same as CI)
npm run check

# Individual checks
npm run ts:check              # Type checking
npm run lint:check            # Linting
npm run format:check          # Formatting
npm test -- --run             # Tests
npm run dependency-cruiser:check  # Dependencies
npm run build                 # Build

# With coverage
npm test -- --run --coverage
```

## CI Workflow Details

### Matrix Testing

The CI workflow tests across multiple Node.js versions:
- Node 18 (LTS)
- Node 20 (LTS)
- Node 22 (Current)

This ensures compatibility across different Node.js versions.

### Caching

All workflows use npm caching to speed up dependency installation:
```yaml
cache: 'npm'
```

This caches the `~/.npm` directory between runs.

### Fail Fast

The test matrix does NOT use `fail-fast`, meaning all Node.js versions will be tested even if one fails. This helps identify version-specific issues.

## Troubleshooting CI

### Tests fail in CI but pass locally

1. Check Node.js version matches
2. Clear node_modules and reinstall: `npm ci`
3. Check for environment-specific code
4. Look at the CI logs for specific errors

### Coverage upload fails

1. Verify `CODECOV_TOKEN` is set correctly
2. Check Codecov service status
3. The workflow continues even if upload fails (`fail_ci_if_error: false`)

### Build artifacts missing

1. Ensure `npm run build` completes successfully locally
2. Check that `dist/` is not in `.gitignore`
3. Verify `tsdown.config.ts` is configured correctly
