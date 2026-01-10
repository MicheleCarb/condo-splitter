# Deployment Guide - GitHub Pages

This guide will help you deploy Condo Splitter to GitHub Pages.

## Prerequisites

- GitHub repository (already created)
- Node.js installed locally (for testing)

## Step 1: Configure Repository Name

**IMPORTANT**: Before deploying, update the base path in the GitHub Actions workflow:

1. Open `.github/workflows/deploy.yml`
2. Find the line: `BASE_PATH: /condo-splitter/`
3. Replace `condo-splitter` with your actual repository name
   - Example: If your repo is `my-condo-app`, change to: `BASE_PATH: /my-condo-app/`
   - If deploying to `username.github.io` (root domain), use: `BASE_PATH: /`

## Step 2: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select:
   - **Source**: "GitHub Actions" (not "Deploy from a branch")
4. Save the settings

## Step 3: Push Code

1. Commit and push your code to the `main` or `master` branch:

```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main  # or 'master' depending on your default branch
```

## Step 4: Monitor Deployment

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. You should see the "Deploy to GitHub Pages" workflow running
4. Wait for it to complete (usually 1-2 minutes)
5. If successful, you'll see a green checkmark

## Step 5: Access Your App

Once deployment is complete:
- Your app will be available at: `https://yourusername.github.io/repo-name/`
- Replace `yourusername` with your GitHub username
- Replace `repo-name` with your repository name

**Example**: If your username is `michele` and repo is `condo-splitter`:
→ `https://michele.github.io/condo-splitter/`

## Alternative: Manual Deployment

If you prefer to deploy manually:

### Option A: Using gh-pages branch

```bash
# Install gh-pages package
npm install --save-dev gh-pages

# Add to package.json scripts:
# "deploy": "BASE_PATH=/repo-name/ npm run build && gh-pages -d dist"

# Deploy
npm run deploy
```

### Option B: Using docs folder

```bash
# Build with base path
BASE_PATH=/repo-name/ npm run build

# Move dist contents to docs folder
cp -r dist/* docs/

# Commit and push
git add docs/
git commit -m "Deploy to GitHub Pages"
git push origin main
```

Then in GitHub Settings → Pages, select source: `/docs` folder.

## Troubleshooting

### 404 Error / Blank Page

- **Check base path**: Make sure `BASE_PATH` in `.github/workflows/deploy.yml` matches your repo name exactly
- **Check GitHub Pages settings**: Ensure source is set to "GitHub Actions"
- **Check build logs**: Go to Actions tab and check for build errors

### Assets Not Loading

- Verify `vite.config.ts` has: `base: process.env.BASE_PATH || '/'`
- Ensure BASE_PATH starts and ends with `/` (e.g., `/repo-name/`)

### Build Fails

- Check Node.js version in workflow (currently set to 18)
- Verify all dependencies are in `package.json`
- Check Actions tab for specific error messages

## Custom Domain (Optional)

If you want to use a custom domain:

1. Set `BASE_PATH: /` in the workflow (root domain)
2. Add a `CNAME` file in `public/` folder with your domain
3. Configure DNS settings with your domain provider
4. Enable custom domain in GitHub Pages settings

## Updating Your App

After making changes:

1. Commit and push to main/master branch
2. GitHub Actions will automatically rebuild and redeploy
3. Wait ~2 minutes for the new version to go live

## Testing Locally

To test with the correct base path locally:

```bash
BASE_PATH=/condo-splitter/ npm run build
npm run preview
```

This builds with the same base path as production.
