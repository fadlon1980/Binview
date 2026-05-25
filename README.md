# BinView Family Cloud — AI Photo Descriptions

This version adds **Level 2 AI description per photo** to the existing BinView Firebase cloud app.

When a family member uploads a photo, the app now:

1. Compresses the photo in the browser.
2. Sends a smaller analysis copy to a Firebase Cloud Function.
3. The function asks Gemini to write a short inventory description.
4. The photo and AI description are saved on the bin record.
5. Search can find matches from bin details, captions, and AI descriptions.

Approved users in this package:

- Elad — `fadlon1980@gmail.com` — Owner
- Maayan — `fadlonmay@gmail.com` — Admin

## Files

```text
index.html
app.js
styles.css
firebase-config.js
firestore.rules
storage.rules
firebase.json
functions/
  package.json
  index.js
.github/workflows/deploy.yml
.nojekyll
manifest.webmanifest
```

## Important architecture note

The Gemini API key is **not** placed inside the public GitHub Pages app.

The public app calls a private Firebase Cloud Function named:

```text
describeBinPhoto
```

The Cloud Function stores the Gemini key as a Firebase secret and only allows the approved family emails to use it.

## Step 1 — Upload website files to GitHub

Upload the package contents to your existing GitHub Pages repository.

Your repository top level should look like this:

```text
index.html
app.js
styles.css
firebase-config.js
firestore.rules
storage.rules
firebase.json
functions/
.github/
.nojekyll
README.md
```

Commit directly to `main`.

GitHub Pages should deploy the static website the same way as your previous working version.

## Step 2 — Install Firebase CLI locally

On your computer, install Firebase CLI:

```bash
npm install -g firebase-tools
```

Login:

```bash
firebase login
```

Go into the project folder:

```bash
cd binview-family-cloud-firebase-ai-descriptions
```

Connect to your Firebase project:

```bash
firebase use binvie
```

If that does not work, run:

```bash
firebase projects:list
firebase use --add
```

Then select the `binvie` project.

## Step 3 — Set the Gemini API key as a Firebase secret

Create a Gemini API key in Google AI Studio, then run:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Paste your Gemini API key when the terminal asks for it.

Do not commit the Gemini API key to GitHub.

## Step 4 — Deploy the Cloud Function

From the same project folder, run:

```bash
firebase deploy --only functions
```

After deployment, Firebase should show the callable function:

```text
describeBinPhoto
```

Region:

```text
us-central1
```

## Step 5 — Confirm Firebase rules

Firestore rules should still allow only Elad and Maayan:

```text
fadlon1980@gmail.com
fadlonmay@gmail.com
```

Storage rules should also allow only these two emails.

If needed, paste and publish the included files:

```text
firestore.rules
storage.rules
```

## Step 6 — Test

1. Open your GitHub Pages app.
2. Sign in as Elad or Maayan.
3. Open a bin.
4. Upload a new photo.
5. The upload status should show:

```text
Compressing...
AI is describing...
Uploading...
```

6. After upload, the photo card should show:

```text
AI saw: ...
```

7. Try searching for an item shown in the AI description.

## If AI does not work

The photo should still upload normally. You may see:

```text
AI: description was not generated. Photo saved normally.
```

Common causes:

- Cloud Function was not deployed.
- `GEMINI_API_KEY` secret was not set.
- Signed-in email is not one of the approved emails.
- Gemini API is not enabled for the key/project.
- Firebase Functions requires billing/Blaze plan.

## Cost note

This version adds Gemini API usage and Cloud Functions usage. For a small family garage-bin app, usage should usually be low, but set a budget alert in Google Cloud/Firebase.
