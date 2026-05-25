# BinView Private Family Static MVP

This is a no-build GitHub Pages version of BinView. It does not use React, Vite, Tailwind, Node, or npm.

That makes it much easier to publish and avoids blank-page problems caused by build configuration.

## Family names

Approved names in this prototype:

- Elad — Owner
- Maayan — Admin
- Michal — Viewer
- Maya — Viewer
- Daniel — Viewer

## How to upload to GitHub

Upload these files directly to the top level of your repository:

- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `.nojekyll`
- `.github/workflows/deploy.yml`
- `README.md`

The top level of the repository should show `index.html` directly. Do not upload the whole folder as a folder.

## GitHub Pages setup

Option A, recommended if you already selected GitHub Actions:

1. Go to Settings → Pages.
2. Under Build and deployment, set Source to GitHub Actions.
3. Go to Actions.
4. Open "Deploy static BinView to GitHub Pages".
5. Confirm it turns green.
6. Go back to Settings → Pages and open the live link.

Option B, also works:

1. Go to Settings → Pages.
2. Under Build and deployment, set Source to Deploy from a branch.
3. Select Branch: main.
4. Select Folder: / root.
5. Save.

## Important privacy note

This is still a prototype. The family-name gate is not real security because GitHub Pages is public.

For real private family access, use the next Firebase version with Google login, Firestore security rules, and Firebase Storage.

## Storage limitation

This version stores bins and photos in the browser localStorage. Data is local to each device/browser.

If Elad creates a bin on one phone, Maayan will not see it from another phone until the app is connected to a cloud database.
