# Quick Setup Guide for CI/CD

## ✅ Already Configured

The following workflows are already set up and ready to use:

1. **CI** - Runs tests on every push/PR
2. **Coverage** - Reports test coverage
3. **Deploy Playground** - Auto-deploys to GitHub Pages

## 🚀 Getting Started

### 1. Enable GitHub Actions (if not already enabled)

GitHub Actions should be enabled by default. If not:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Actions** → **General**
3. Under "Actions permissions", select **Allow all actions and reusable workflows**
4. Click **Save**

### 2. Set up GitHub Pages

1. Go to **Settings** → **Pages**
2. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
3. Save the settings

The playground will be deployed to: `https://<username>.github.io/vue-context-storage/`

### 3. (Optional) Set up Code Coverage

For coverage reports on Codecov:

1. Go to [codecov.io](https://codecov.io) and sign in with GitHub
2. Add your repository
3. Copy the upload token
4. In GitHub: **Settings** → **Secrets and variables** → **Actions**
5. Click **New repository secret**:
   - **Name**: `CODECOV_TOKEN`
   - **Value**: Paste the token
6. Click **Add secret**

### 4. Test the Setup

Push a commit to `main` branch:

```bash
git add .
git commit -m "test: verify CI/CD setup"
git push origin main
```

Go to the **Actions** tab in GitHub to see workflows running.

## 📊 Status Badges

Add these to your main README.md:

```markdown
![CI](https://github.com/lviobio/vue-context-storage/actions/workflows/ci.yml/badge.svg)
![Coverage](https://github.com/lviobio/vue-context-storage/actions/workflows/coverage.yml/badge.svg)
```

## 🔍 What Gets Tested

Every push triggers:

- ✅ TypeScript type checking
- ✅ ESLint code quality checks
- ✅ Prettier formatting validation
- ✅ 132 unit tests
- ✅ Dependency architecture validation
- ✅ Package build verification
- ✅ Tests on Node.js 18, 20, and 22

## 🐛 Troubleshooting

### Workflows not running

1. Check that Actions are enabled in Settings
2. Ensure `.github/workflows/` directory exists
3. Verify YAML files have no syntax errors

### Tests fail in CI but pass locally

Run the same checks locally:
```bash
npm run check
npm test -- --run
```

### Coverage not uploading

1. Verify `CODECOV_TOKEN` secret is set
2. Token must have upload permissions
3. Workflow will continue even if upload fails

## 📚 More Information

See [README.md](.github/workflows/README.md) for detailed documentation.
