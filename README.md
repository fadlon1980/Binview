# BinView Family Cloud

BinView Family Cloud is a private family app for garage/storage bins. This package is configured for Elad and Maayan only.

It lets you:

- Sign in with Google
- Allow only approved family emails
- Create storage bins
- Add notes, location, and category
- Upload/take photos
- Add a caption and longer description to each photo
- Search photo captions and photo descriptions
- Generate a QR label for each bin
- Scan a bin QR code from any approved family phone

This version is still a simple static web app hosted on GitHub Pages, but the data is stored in Firebase Cloud Firestore and Firebase Storage.

---

## Files you must edit

Before the app can work, edit these files:

```text
firebase-config.js
firestore.rules
storage.rules
```

This package is already configured with these approved Google accounts:

```text
Elad   — fadlon1980@gmail.com — Owner
Maayan — fadlonmay@gmail.com   — Admin
```

Michal, Maya, and Daniel are not included in this version. You can add them later by adding their Google emails to `firebase-config.js`, `firestore.rules`, and `storage.rules`.

---

## Step 1: Create Firebase project

1. Go to Firebase Console.
2. Create a new project, for example `binview-family`.
3. Add a Web App.
4. Copy the Firebase config object.
5. Paste it into `firebase-config.js`.

Example:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

---

## Step 2: Enable Google login

In Firebase Console:

```text
Build → Authentication → Sign-in method → Google → Enable
```

Then add your GitHub Pages domain under authorized domains.

Example domain:

```text
your-github-username.github.io
```

Do not include `https://` and do not include the repository path.

---

## Step 3: Create Firestore database

In Firebase Console:

```text
Build → Firestore Database → Create database
```

Choose production mode.

Then go to the Firestore Rules tab and paste the content of:

```text
firestore.rules
```

Publish the rules.

---

## Step 4: Create Firebase Storage

In Firebase Console:

```text
Build → Storage → Get started
```

Then go to the Storage Rules tab and paste the content of:

```text
storage.rules
```

Publish the rules.

---

## Step 5: Upload to GitHub

Upload the files to the top level of your GitHub repository.

The repository should look like this:

```text
index.html
app.js
styles.css
firebase-config.js
firestore.rules
storage.rules
manifest.webmanifest
README.md
.github/
.nojekyll
```

Not like this:

```text
binview-family-cloud-firebase-elad-maayan/
  index.html
  app.js
```

---

## Step 6: Publish with GitHub Pages

You can publish this app in either of these ways.

### Simple option

```text
Settings → Pages → Build and deployment → Source → Deploy from a branch
Branch: main
Folder: / root
Save
```

### GitHub Actions option

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

Then check the Actions tab and wait for the deploy workflow to turn green.

---

## How security works

This version uses Firebase Authentication and Firebase Security Rules.

The app checks the signed-in Google email in the browser for a better user experience.

The real protection is in:

```text
firestore.rules
storage.rules
```

Only the family emails listed in those rules can read or write bins/photos.

---

## Important privacy note

The GitHub Pages website files are public, but your bin data and photos are protected by Firebase rules.

Do not put private data directly into the code files. The photos and bin contents should be stored only in Firebase.


## QR auto-generation fix

This version shows an auto-generated QR card directly on each bin page and removes the dependency on the external JavaScript QR library. The printable label still opens from the QR Label button.


## Photo compression update

This version compresses photos in the browser before uploading them to Firebase Storage.

Default compression settings:

```text
Max width/height: 1600 px
Format: JPEG
Quality: 0.74
```

Why this helps:

- Faster upload from phone
- Faster QR scan page loading
- Lower Firebase Storage usage
- Lower bandwidth usage

The original photo file is not uploaded. The compressed version is uploaded and the app stores the compressed file size on the photo record.


## Search update

This version adds stronger search on the main bins page. The search box checks:

- Bin name
- Location / shelf
- Category
- Notes
- Photo captions

When a search is active, matching bin cards show a short match hint so you can see why that bin was found.


## Photo descriptions

This version adds a manual description field under every photo. Existing photos do not need migration; they will show an empty description box the next time you open the bin. Type a description and click/tap outside the box to save it. Search checks photo captions and descriptions.

## QR pack printing

This version adds a **Print QR pack** button on the main bins page.

You can:

- Select specific bins to include
- Select all bins
- Clear the selection
- Print selected QR labels
- Print 4 QR labels per A4 page in a 2 × 2 layout

The printed QR codes still point to the same cloud bin records, so you do not need to reprint labels when you edit bin details, notes, captions, descriptions, or photos.
