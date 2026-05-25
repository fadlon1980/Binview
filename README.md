# BinView Private Family MVP

BinView is a small private-family prototype for creating QR labels for closed garage storage bins.

You can:

- Sign in with an approved family name and shared family PIN
- Create a storage bin
- Add bin location, category, and notes
- Take/upload photos of the bin contents
- Generate a QR label for the bin
- Print the QR label
- Scan the QR later to open the bin page
- Manage simple family roles: Owner, Admin, Viewer

> Important: This MVP uses browser local storage only. It is good for experimenting with the flow and UI. It is not yet a true cloud/private family app across devices. The next version should use Firebase Authentication, Firestore, Firebase Storage, and security rules.

---

## Approved family members

The app is configured for these family members:

```text
Elad
Maayan
Michal
Maya
Daniel
```

Default roles:

| Family Member | Role |
|---|---|
| Elad | Owner |
| Maayan | Admin |
| Michal | Viewer |
| Maya | Viewer |
| Daniel | Viewer |

Default family PIN:

```text
1234
```

You can change the PIN after signing in as **Elad / Owner** by opening **Family → Family PIN**.

Role behavior:

| Role | View Bins | Add/Edit Bins | Add Photos | Manage Family / PIN |
|---|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | No |
| Viewer | Yes | No | No | No |

---

## Privacy note

This is a lightweight prototype for simple garage-bin storage.

Because it is a static GitHub Pages app using browser local storage:

- The name + PIN gate is only a simple access screen, not strong security.
- Photos are stored only in the browser/device where they were uploaded.
- A QR created on one phone will not show the same photos on another phone yet.
- Do not store sensitive personal documents, passwords, medical information, financial records, or anything private in this prototype.

For real private access across all family phones, use the Firebase version.

---

## Run locally

You need Node.js installed.

```bash
npm install
npm run dev
```

Then open the local link Vite shows, usually:

```text
http://localhost:5173
```

---

## Upload to GitHub

1. Create a new GitHub repository, for example: `binview-private-family-mvp`.
2. Upload all files from this folder into the repository.
3. Commit to the `main` branch.

---

## Enable GitHub Pages

This package includes a GitHub Actions workflow at:

```text
.github/workflows/deploy.yml
```

After uploading the files:

1. Go to your repository on GitHub.
2. Open **Settings**.
3. Open **Pages**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.
5. Go to the **Actions** tab.
6. Wait for the deploy workflow to complete.
7. Go back to **Settings → Pages** and copy the live site link.

Your app should become available at a link similar to:

```text
https://YOUR-GITHUB-USERNAME.github.io/binview-private-family-mvp/
```

---

## Phone testing

Once GitHub Pages is live:

1. Open the live link from your phone.
2. Select **Elad**.
3. Enter PIN `1234`.
4. Create a bin.
5. Use **Camera** to take photos.
6. Open **QR label**.
7. Print the label or copy the link.
8. Scan the QR from the same browser/device to test the flow.

Because this is local-storage only, test the QR on the same phone/browser where you created the bin.

---

## Recommended next version

V1.2 should replace local storage with:

- Firebase Authentication for real Google login
- Firestore for bin records
- Firebase Storage for photos
- Firestore security rules for family-only access
- Real family invite/approval list

Suggested Firebase collections:

```text
families/{familyId}
families/{familyId}/members/{userId}
families/{familyId}/bins/{binId}
families/{familyId}/bins/{binId}/photos/{photoId}
```

---

## Notes

This project uses:

- Vite
- React
- Tailwind CSS
- qrcode.react
- lucide-react
- framer-motion
