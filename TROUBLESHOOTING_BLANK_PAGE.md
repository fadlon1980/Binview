# Blank page fix checklist

If GitHub Pages opens but shows a blank page:

1. Go to Settings > Pages.
2. Under Build and deployment, Source must be GitHub Actions.
3. Do not choose Deploy from a branch with main/root for this Vite app.
4. Go to Actions and confirm Deploy to GitHub Pages is green.
5. Confirm these files are at the repository top level:
   - package.json
   - index.html
   - vite.config.js
   - src/
   - public/
   - .github/workflows/deploy.yml
6. If you see one extra folder first, such as binview-private-family-mvp-github-pages-hotfix/package.json, move the contents of that folder up to the repo root.
7. Re-run Actions > Deploy to GitHub Pages > Run workflow.

This package sets `base: './'` in vite.config.js so the app can load assets under GitHub Pages project URLs.
