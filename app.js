import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { firebaseConfig, FAMILY_ID, FAMILY_MEMBERS } from "./firebase-config.js";

const appRoot = document.getElementById("app");
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

let firebaseApp;
let auth;
let db;
let storage;
let currentUser = null;
let currentMember = null;
let bins = [];
let binsUnsubscribe = null;
let selectedBinId = null;
let activeView = "bins";
let searchQuery = "";
let busyMessage = "";
let errorMessage = "";
let qrModalBin = null;
let qrPackModalOpen = false;
let selectedQrBinIds = new Set();
let editModalBin = null;
let createModalOpen = false;

const icons = {
  package: "📦",
  camera: "📷",
  qr: "▦",
  family: "👨‍👩‍👧‍👦",
  lock: "🔒",
  home: "⌂",
  search: "⌕",
  upload: "⬆",
  trash: "🗑",
  edit: "✎",
  pin: "📍"
};

function isConfigured() {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("PASTE_") &&
    firebaseConfig.projectId && !firebaseConfig.projectId.includes("PASTE_");
}

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function getMemberForEmail(email) {
  const normalized = normalizeEmail(email);
  return FAMILY_MEMBERS.find(m => normalizeEmail(m.email) === normalized) || null;
}

function canEdit() {
  return currentMember?.role === "Owner" || currentMember?.role === "Admin";
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtDate(ts) {
  try {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

function makeSafeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || `photo-${Date.now()}`;
}

const IMAGE_COMPRESSION = {
  maxDimension: 1600,
  jpegQuality: 0.74,
  mimeType: "image/jpeg"
};

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Could not compress image."));
    }, type, quality);
  });
}

async function compressImageFile(file) {
  if (!file?.type?.startsWith("image/")) {
    return {
      blob: file,
      width: null,
      height: null,
      originalSize: file?.size || 0,
      compressedSize: file?.size || 0,
      wasCompressed: false
    };
  }

  try {
    const image = await loadImageFromFile(file);
    const maxSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, IMAGE_COMPRESSION.maxDimension / maxSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const compressedBlob = await canvasToBlob(canvas, IMAGE_COMPRESSION.mimeType, IMAGE_COMPRESSION.jpegQuality);
    const shouldUseCompressed = compressedBlob.size < file.size || scale < 1;

    return {
      blob: shouldUseCompressed ? compressedBlob : file,
      width,
      height,
      originalSize: file.size,
      compressedSize: shouldUseCompressed ? compressedBlob.size : file.size,
      wasCompressed: shouldUseCompressed
    };
  } catch (error) {
    console.warn("Photo compression failed. Uploading original file instead.", error);
    return {
      blob: file,
      width: null,
      height: null,
      originalSize: file?.size || 0,
      compressedSize: file?.size || 0,
      wasCompressed: false
    };
  }
}

function getBinUrl(binId) {
  return `${window.location.origin}${window.location.pathname}#/bin/${binId}`;
}

function getQrImageUrl(binId, size = 260) {
  const url = getBinUrl(binId);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&data=${encodeURIComponent(url)}`;
}

function getSearchTokens() {
  return searchQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function getPhotoSearchText(photo = {}) {
  return [
    photo.caption,
    photo.description,
    photo.uploadedBy,
    photo.uploadedByEmail
  ].filter(Boolean).join(" ");
}

function getBinSearchText(bin = {}) {
  const photoText = (bin.photos || []).map(getPhotoSearchText).join(" ");
  return [
    bin.name,
    bin.location,
    bin.category,
    bin.notes,
    bin.createdByName,
    bin.createdByEmail,
    photoText
  ].filter(Boolean).join(" ").toLowerCase();
}

function binMatchesSearch(bin) {
  const tokens = getSearchTokens();
  if (!tokens.length) return true;
  const text = getBinSearchText(bin);
  return tokens.every(token => text.includes(token));
}

function fieldMatchesSearch(value, tokens) {
  const text = String(value || "").toLowerCase();
  return tokens.some(token => text.includes(token));
}

function getBinMatchDetails(bin) {
  const tokens = getSearchTokens();
  if (!tokens.length) return [];

  const details = [];
  const checks = [
    ["Name", bin.name],
    ["Location", bin.location],
    ["Category", bin.category],
    ["Notes", bin.notes]
  ];

  for (const [label, value] of checks) {
    if (fieldMatchesSearch(value, tokens)) {
      const safe = String(value || "").trim();
      if (safe) details.push(`${label}: ${safe.length > 58 ? safe.slice(0, 58) + "…" : safe}`);
    }
  }

  const matchingPhotos = (bin.photos || []).filter(photo =>
    fieldMatchesSearch(photo.caption, tokens) || fieldMatchesSearch(photo.description, tokens)
  );
  if (matchingPhotos.length) {
    const photoMatches = matchingPhotos
      .slice(0, 2)
      .map(photo => photo.description || photo.caption || "Photo")
      .join(", ");
    details.push(`${matchingPhotos.length} matching photo${matchingPhotos.length > 1 ? "s" : ""}: ${photoMatches}${matchingPhotos.length > 2 ? "…" : ""}`);
  }

  return details.slice(0, 4);
}

function setBusy(message) {
  busyMessage = message || "";
  render();
}

function setError(message) {
  errorMessage = message || "";
  render();
}

function updateHashForView() {
  if (activeView === "bin" && selectedBinId) {
    if (window.location.hash !== `#/bin/${selectedBinId}`) window.location.hash = `#/bin/${selectedBinId}`;
  } else if (activeView === "family") {
    if (window.location.hash !== "#/family") window.location.hash = "#/family";
  } else {
    if (window.location.hash !== "#/bins") window.location.hash = "#/bins";
  }
}

function readRoute() {
  const hash = window.location.hash || "#/bins";
  if (hash.startsWith("#/bin/")) {
    selectedBinId = decodeURIComponent(hash.replace("#/bin/", ""));
    activeView = "bin";
  } else if (hash === "#/family") {
    selectedBinId = null;
    activeView = "family";
  } else {
    selectedBinId = null;
    activeView = "bins";
  }
  render();
}

async function init() {
  if (!isConfigured()) {
    renderSetupRequired();
    return;
  }

  try {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    storage = getStorage(firebaseApp);

    window.addEventListener("hashchange", readRoute);
    onAuthStateChanged(auth, user => {
      currentUser = user;
      currentMember = user ? getMemberForEmail(user.email) : null;
      if (user && currentMember) {
        subscribeToBins();
      } else {
        unsubscribeBins();
        bins = [];
      }
      readRoute();
    });
  } catch (error) {
    console.error(error);
    renderFatalError("Firebase could not start. Check firebase-config.js and your Firebase project settings.", error.message);
  }
}

function subscribeToBins() {
  unsubscribeBins();
  const binsRef = collection(db, "families", FAMILY_ID, "bins");
  const binsQuery = query(binsRef, orderBy("createdAt", "desc"));
  binsUnsubscribe = onSnapshot(binsQuery, snapshot => {
    bins = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  }, error => {
    console.error(error);
    setError("Could not load bins. Check Firestore rules and make sure your signed-in email is allowed.");
  });
}

function unsubscribeBins() {
  if (binsUnsubscribe) binsUnsubscribe();
  binsUnsubscribe = null;
}

async function handleGoogleSignIn() {
  setError("");
  try {
    const result = await signInWithPopup(auth, provider);
    const member = getMemberForEmail(result.user.email);
    if (!member) {
      setError(`The signed-in Google email ${result.user.email} is not in the approved family list. Add it to firebase-config.js and rules, then redeploy.`);
      await signOut(auth);
    }
  } catch (error) {
    console.error(error);
    setError(error.message || "Google sign-in failed.");
  }
}

async function handleSignOut() {
  await signOut(auth);
}

async function createBinFromForm(form) {
  if (!canEdit()) return;
  const name = form.name.trim();
  if (!name) return setError("Bin name is required.");
  setBusy("Creating bin...");
  try {
    const newDoc = await addDoc(collection(db, "families", FAMILY_ID, "bins"), {
      name,
      location: form.location.trim(),
      category: form.category.trim(),
      notes: form.notes.trim(),
      photos: [],
      createdByEmail: currentUser.email,
      createdByName: currentMember.name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    createModalOpen = false;
    selectedBinId = newDoc.id;
    activeView = "bin";
    updateHashForView();
  } catch (error) {
    console.error(error);
    setError("Could not create bin. Check Firestore rules and Firebase setup.");
  } finally {
    setBusy("");
  }
}

async function updateBin(binId, updates) {
  if (!canEdit()) return;
  setBusy("Saving...");
  try {
    await updateDoc(doc(db, "families", FAMILY_ID, "bins", binId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    editModalBin = null;
  } catch (error) {
    console.error(error);
    setError("Could not save changes.");
  } finally {
    setBusy("");
  }
}

async function deleteBin(bin) {
  if (!canEdit()) return;
  const ok = window.confirm(`Delete ${bin.name}? This will remove the bin record. Photos will also be removed when possible.`);
  if (!ok) return;
  setBusy("Deleting bin...");
  try {
    for (const photo of bin.photos || []) {
      if (photo.path) {
        try { await deleteObject(ref(storage, photo.path)); } catch (e) { console.warn("Could not delete photo", e); }
      }
    }
    await deleteDoc(doc(db, "families", FAMILY_ID, "bins", bin.id));
    selectedBinId = null;
    activeView = "bins";
    updateHashForView();
  } catch (error) {
    console.error(error);
    setError("Could not delete bin.");
  } finally {
    setBusy("");
  }
}

async function addPhotos(bin, files) {
  if (!canEdit() || !files?.length) return;
  const selectedFiles = Array.from(files);
  setBusy(`Compressing and uploading ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""}...`);
  try {
    const uploaded = [];
    let totalOriginalBytes = 0;
    let totalSavedBytes = 0;

    for (const file of selectedFiles) {
      const photoId = crypto.randomUUID();
      const compressed = await compressImageFile(file);
      totalOriginalBytes += compressed.originalSize || 0;
      totalSavedBytes += compressed.compressedSize || 0;

      const originalBaseName = (file.name || `photo-${photoId}`).replace(/\.[^.]+$/, "");
      const safeName = makeSafeFileName(`${originalBaseName}.jpg`);
      const path = `families/${FAMILY_ID}/bins/${bin.id}/${photoId}-${safeName}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, compressed.blob, {
        contentType: compressed.blob.type || IMAGE_COMPRESSION.mimeType,
        customMetadata: {
          originalName: file.name || "Photo",
          originalSize: String(compressed.originalSize || 0),
          compressedSize: String(compressed.compressedSize || 0),
          compressionVersion: "v1"
        }
      });

      const url = await getDownloadURL(storageRef);
      uploaded.push({
        id: photoId,
        url,
        path,
        caption: originalBaseName || "Photo",
        description: "",
        uploadedBy: currentMember.name,
        uploadedByEmail: currentUser.email,
        originalSizeBytes: compressed.originalSize || 0,
        compressedSizeBytes: compressed.compressedSize || 0,
        width: compressed.width,
        height: compressed.height,
        wasCompressed: compressed.wasCompressed,
        createdAt: new Date().toISOString()
      });
    }

    await updateDoc(doc(db, "families", FAMILY_ID, "bins", bin.id), {
      photos: arrayUnion(...uploaded),
      updatedAt: serverTimestamp()
    });

    if (totalOriginalBytes && totalSavedBytes && totalSavedBytes < totalOriginalBytes) {
      const savings = Math.round((1 - totalSavedBytes / totalOriginalBytes) * 100);
      setBusy(`Uploaded. Photos compressed by about ${savings}%.`);
      setTimeout(() => setBusy(""), 1800);
    }
  } catch (error) {
    console.error(error);
    setError("Could not upload photo. Check Firebase Storage rules and setup.");
  } finally {
    if (!busyMessage.startsWith("Uploaded.")) setBusy("");
  }
}

async function updatePhotoDetails(bin, photoId, updates) {
  if (!canEdit()) return;
  const photos = (bin.photos || []).map(p => p.id === photoId ? { ...p, ...updates } : p);
  try {
    await updateDoc(doc(db, "families", FAMILY_ID, "bins", bin.id), { photos, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error(error);
    setError("Could not update photo details.");
  }
}

async function deletePhoto(bin, photo) {
  if (!canEdit()) return;
  const ok = window.confirm("Delete this photo?");
  if (!ok) return;
  setBusy("Deleting photo...");
  try {
    if (photo.path) {
      try { await deleteObject(ref(storage, photo.path)); } catch (e) { console.warn("Could not delete storage file", e); }
    }
    const photos = (bin.photos || []).filter(p => p.id !== photo.id);
    await updateDoc(doc(db, "families", FAMILY_ID, "bins", bin.id), { photos, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error(error);
    setError("Could not delete photo.");
  } finally {
    setBusy("");
  }
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  setBusy("Copied link");
  setTimeout(() => setBusy(""), 900);
}

function render() {
  if (!isConfigured()) return renderSetupRequired();
  if (!auth) return renderLoading();
  if (!currentUser) return renderLogin();
  if (!currentMember) return renderUnauthorized();

  const body = activeView === "family"
    ? renderFamilyPage()
    : activeView === "bin"
      ? renderBinPage()
      : renderBinsPage();

  appRoot.innerHTML = `
    <div class="app-shell">
      ${renderHeader()}
      ${renderStatus()}
      ${body}
      ${createModalOpen ? renderCreateModal() : ""}
      ${editModalBin ? renderEditModal(editModalBin) : ""}
      ${qrModalBin ? renderQrModal(qrModalBin) : ""}
      ${qrPackModalOpen ? renderQrPackModal() : ""}
    </div>
  `;
  bindCommonEvents();
}

function renderLoading() {
  appRoot.innerHTML = `<div class="loading"><div><div class="spinner"></div><h2>Loading BinView...</h2></div></div>`;
}

function renderStatus() {
  return `
    <div class="page" style="padding-bottom:0; ${(!errorMessage && !busyMessage) ? "display:none" : ""}">
      ${errorMessage ? `<div class="notice error">${escapeHtml(errorMessage)} <button class="btn btn-ghost" data-action="clear-error">Close</button></div>` : ""}
      ${busyMessage ? `<div class="notice ok" style="margin-top:8px">${escapeHtml(busyMessage)}</div>` : ""}
    </div>
  `;
}

function renderSetupRequired() {
  appRoot.innerHTML = `
    <div class="center-page">
      <div class="card" style="max-width: 820px; width: 100%;">
        <span class="badge warn">${icons.lock} Firebase setup required</span>
        <h1 style="margin-top:18px">Connect BinView to Firebase</h1>
        <p class="lead">Before this cloud version can run, you need to edit <b>firebase-config.js</b> with your Firebase project values. This package already includes Elad and Maayan as the approved emails.</p>
        <div class="notice warn" style="margin-top:20px">Do not leave placeholder Firebase values like <b>PASTE_YOUR_API_KEY_HERE</b>.</div>
        <pre class="setup-code" style="margin-top:16px">firebase-config.js
firestore.rules
storage.rules</pre>
      </div>
    </div>
  `;
}

function renderFatalError(title, detail) {
  appRoot.innerHTML = `
    <div class="center-page"><div class="card" style="max-width:760px"><span class="badge warn">Error</span><h1 style="margin-top:18px">${escapeHtml(title)}</h1><p class="lead">${escapeHtml(detail || "")}</p></div></div>
  `;
}

function renderLogin() {
  appRoot.innerHTML = `
    <div class="center-page">
      <div class="grid-2">
        <section class="card">
          <span class="badge">${icons.lock} Private family cloud app</span>
          <h1 style="margin-top:18px">BinView</h1>
          <p class="lead">Create QR labels for closed garage storage bins. Your family signs in with Google, scans the bin label, and sees the photos and notes for what is inside.</p>
          <div class="grid-3" style="margin-top:26px">
            <div class="icon-card"><div class="icon">${icons.package}</div><h3 style="margin-top:10px">Create bins</h3><p class="small">Name, location, category, and notes.</p></div>
            <div class="icon-card"><div class="icon">${icons.camera}</div><h3 style="margin-top:10px">Add photos</h3><p class="small">Upload from phone or use camera.</p></div>
            <div class="icon-card"><div class="icon">${icons.qr}</div><h3 style="margin-top:10px">Scan QR</h3><p class="small">Open the private cloud page.</p></div>
          </div>
        </section>
        <section class="card">
          <div class="icon">G</div>
          <h2 style="margin-top:14px">Sign in with Google</h2>
          <p class="small" style="margin-top:8px">Only the approved family emails in your Firebase rules can read or write data.</p>
          ${errorMessage ? `<div class="notice error" style="margin-top:16px">${escapeHtml(errorMessage)}</div>` : ""}
          <button class="btn btn-primary btn-wide" style="margin-top:18px" data-action="google-signin">Sign in with Google</button>
          <div class="notice warn" style="margin-top:16px">Make sure your GitHub Pages domain is added to Firebase Authentication authorized domains.</div>
        </section>
      </div>
    </div>
  `;
  document.querySelector('[data-action="google-signin"]')?.addEventListener("click", handleGoogleSignIn);
}

function renderUnauthorized() {
  appRoot.innerHTML = `
    <div class="center-page">
      <div class="card" style="max-width:720px; width:100%">
        <span class="badge warn">${icons.lock} Not approved</span>
        <h1 style="margin-top:18px">This Google account is not in the family list</h1>
        <p class="lead">Signed in as <b>${escapeHtml(currentUser.email)}</b>. Add this email to <b>firebase-config.js</b>, <b>firestore.rules</b>, and <b>storage.rules</b>, then redeploy.</p>
        <button class="btn btn-primary" style="margin-top:20px" data-action="signout">Sign out</button>
      </div>
    </div>
  `;
  document.querySelector('[data-action="signout"]')?.addEventListener("click", handleSignOut);
}

function renderHeader() {
  return `
    <header class="header">
      <div class="header-inner">
        <button class="brand" data-action="go-bins">
          <div class="brand-mark">${icons.package}</div>
          <div style="text-align:left"><div class="brand-title">BinView</div><div class="tiny">Family cloud storage</div></div>
        </button>
        <nav class="nav">
          <button class="btn ${activeView === "bins" ? "btn-primary" : "btn-ghost"}" data-action="go-bins">Bins</button>
          <button class="btn ${activeView === "family" ? "btn-primary" : "btn-ghost"}" data-action="go-family">Family</button>
          <div class="user-pill"><div class="tiny">${escapeHtml(currentMember.name)} · ${escapeHtml(currentMember.role)}</div><div class="tiny">${escapeHtml(currentUser.email)}</div></div>
          <button class="btn btn-secondary" data-action="signout">Logout</button>
        </nav>
      </div>
    </header>
  `;
}

function renderBinsPage() {
  const isSearching = searchQuery.trim().length > 0;
  const filtered = bins.filter(binMatchesSearch);

  return `
    <main class="page">
      <div class="toolbar">
        <div>
          <h2>Storage bins</h2>
          <p class="small" style="margin-top:6px">Shared cloud list for approved family members.</p>
        </div>
        <div class="actions">
          ${bins.length ? `<button class="btn btn-secondary" data-action="open-qr-pack">${icons.qr} Print QR pack</button>` : ""}
          ${canEdit() ? `<button class="btn btn-primary" data-action="open-create">+ Create new bin</button>` : ""}
        </div>
      </div>
      <div class="search"><span>${icons.search}</span><input id="searchInput" value="${escapeHtml(searchQuery)}" placeholder="Search bins, shelves, categories, notes, photo captions, or photo descriptions..." />${isSearching ? `<button class="btn btn-secondary" data-action="clear-search">Clear</button>` : ""}</div>
      ${isSearching ? `<div class="search-summary"><b>${filtered.length}</b> of <b>${bins.length}</b> bins match “${escapeHtml(searchQuery.trim())}”. Search checks bin details, photo captions, and photo descriptions.</div>` : ""}
      ${filtered.length === 0 ? `<div class="empty"><h3>No bins found</h3><p class="small" style="margin-top:6px">Try another word, like “tools”, “winter”, “shelf”, a photo caption, or a photo description.</p></div>` : ""}
      <div class="bin-grid">
        ${filtered.map(renderBinCard).join("")}
      </div>
    </main>
  `;
}

function renderBinCard(bin) {
  const matchDetails = getBinMatchDetails(bin);
  return `
    <button class="bin-card" data-action="open-bin" data-bin-id="${escapeHtml(bin.id)}">
      <div class="bin-card-top">
        <div class="bin-icon">${icons.package}</div>
        <span class="badge">${(bin.photos || []).length} photos</span>
      </div>
      <h3>${escapeHtml(bin.name || "Untitled bin")}</h3>
      <div class="meta">
        <div>${icons.pin} ${escapeHtml(bin.location || "No location")}</div>
        <div>🏷️ ${escapeHtml(bin.category || "No category")}</div>
      </div>
      ${bin.notes ? `<p class="notes-preview">${escapeHtml(bin.notes)}</p>` : ""}
      ${matchDetails.length ? `<div class="match-hints">${matchDetails.map(detail => `<div>${escapeHtml(detail)}</div>`).join("")}</div>` : ""}
    </button>
  `;
}

function renderBinPage() {
  const bin = bins.find(b => b.id === selectedBinId);
  if (!bin) {
    return `<main class="page"><div class="empty"><h2>Bin not found</h2><p class="small" style="margin-top:8px">This QR code may point to a deleted bin, or your account may not have access.</p><button class="btn btn-primary" style="margin-top:18px" data-action="go-bins">Back to bins</button></div></main>`;
  }
  const photos = bin.photos || [];
  return `
    <main class="page">
      <div class="toolbar">
        <div>
          <button class="btn btn-ghost" data-action="go-bins">← Back to bins</button>
          <h2 style="margin-top:8px">${escapeHtml(bin.name || "Untitled bin")}</h2>
          <p class="small" style="margin-top:6px">Private cloud QR inventory page</p>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" data-action="open-qr" data-bin-id="${escapeHtml(bin.id)}">${icons.qr} QR label</button>
          ${canEdit() ? `<button class="btn btn-secondary" data-action="open-edit" data-bin-id="${escapeHtml(bin.id)}">${icons.edit} Edit</button><button class="btn btn-danger" data-action="delete-bin" data-bin-id="${escapeHtml(bin.id)}">${icons.trash} Delete</button>` : ""}
        </div>
      </div>
      <div class="detail-grid">
        <section class="card">
          <span class="badge ok">${icons.lock} Private family access</span>
          <div class="inline-qr">
            <div>
              <div class="label-small">Auto QR label</div>
              <p class="small">This QR is created automatically from this bin link.</p>
              <button class="btn btn-secondary" style="margin-top:10px" data-action="open-qr" data-bin-id="${escapeHtml(bin.id)}">${icons.qr} Open printable label</button>
            </div>
            <img src="${escapeHtml(getQrImageUrl(bin.id, 160))}" alt="QR code for ${escapeHtml(bin.name || "Storage bin")}" />
          </div>
          <div class="detail-list">
            <div><div class="label-small">Location</div><p>${escapeHtml(bin.location || "No location added")}</p></div>
            <div><div class="label-small">Category</div><p>${escapeHtml(bin.category || "No category added")}</p></div>
            <div><div class="label-small">Notes</div><p style="white-space:pre-wrap; line-height:1.6">${escapeHtml(bin.notes || "No notes added")}</p></div>
            <div><div class="label-small">Last updated</div><p>${escapeHtml(fmtDate(bin.updatedAt) || fmtDate(bin.createdAt) || "")}</p></div>
          </div>
        </section>
        <section class="card">
          <div class="toolbar" style="margin-bottom:14px">
            <div><h2>Photos</h2><p class="small" style="margin-top:6px">Add photos before closing the bin.</p></div>
            ${canEdit() ? `<div class="actions"><input class="hidden" id="cameraInput" type="file" accept="image/*" capture="environment" multiple /><input class="hidden" id="fileInput" type="file" accept="image/*" multiple /><button class="btn btn-secondary" data-action="trigger-camera">${icons.camera} Camera</button><button class="btn btn-primary" data-action="trigger-upload">${icons.upload} Upload</button></div>` : ""}
          </div>
          ${photos.length === 0 ? `<div class="empty"><h3>No photos yet</h3><p class="small" style="margin-top:6px">Upload or take photos so the QR code will show what is inside.</p></div>` : `<div class="photo-grid">${photos.map(photo => renderPhotoCard(bin, photo)).join("")}</div>`}
        </section>
      </div>
    </main>
  `;
}

function renderPhotoCard(bin, photo) {
  const safeAlt = photo.description || photo.caption || "Bin photo";
  return `
    <div class="photo-card">
      <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(safeAlt)}" loading="lazy" />
      <div class="photo-card-body">
        ${canEdit() ? `
          <label class="photo-field-label">Caption</label>
          <input class="caption-input" data-bin-id="${escapeHtml(bin.id)}" data-photo-id="${escapeHtml(photo.id)}" value="${escapeHtml(photo.caption || "")}" placeholder="Short caption, e.g. Winter jackets" />
          <label class="photo-field-label">Description</label>
          <textarea class="description-input" data-bin-id="${escapeHtml(bin.id)}" data-photo-id="${escapeHtml(photo.id)}" placeholder="Describe what is visible in this photo, e.g. black snow boots, kids gloves, blue jacket">${escapeHtml(photo.description || "")}</textarea>
        ` : `
          <h3>${escapeHtml(photo.caption || "Photo")}</h3>
          ${photo.description ? `<p class="photo-description">${escapeHtml(photo.description)}</p>` : ""}
        `}
        <div class="photo-card-footer">
          <span class="tiny">${escapeHtml(photo.uploadedBy || "Family")} · ${escapeHtml(fmtDate(photo.createdAt))}${photo.compressedSizeBytes ? ` · ${escapeHtml(formatFileSize(photo.compressedSizeBytes))}` : ""}</span>
          ${canEdit() ? `<button class="btn btn-danger" data-action="delete-photo" data-bin-id="${escapeHtml(bin.id)}" data-photo-id="${escapeHtml(photo.id)}">${icons.trash}</button>` : ""}
        </div>
      </div>
    </div>
  `;
}

function renderFamilyPage() {
  return `
    <main class="page" style="max-width:840px">
      <div class="toolbar"><div><h2>Family access</h2><p class="small" style="margin-top:6px">These are the approved family members from firebase-config.js.</p></div></div>
      <section class="card">
        ${FAMILY_MEMBERS.map(member => `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 0; border-bottom:1px solid var(--line)">
            <div><h3>${escapeHtml(member.name)}</h3><p class="small">${escapeHtml(member.email)}</p></div>
            <span class="badge">${escapeHtml(member.role)}</span>
          </div>
        `).join("")}
      </section>
      <div class="notice warn" style="margin-top:16px">For real security, update family members by editing <b>firebase-config.js</b>, <b>firestore.rules</b>, and <b>storage.rules</b>, then commit the changes.</div>
    </main>
  `;
}

function renderCreateModal() {
  return `
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-head"><div><h2>Create new bin</h2><p class="small" style="margin-top:6px">Add the label details first.</p></div><button class="btn btn-ghost" data-action="close-modals">✕</button></div>
      <form class="form" id="createBinForm">
        ${fieldHtml("name", "Bin name", "Garage Bin 01")}
        ${fieldHtml("location", "Location", "Garage Shelf A")}
        ${fieldHtml("category", "Category", "Kids toys")}
        ${fieldHtml("notes", "Notes", "Small toys, Lego parts, and games", true)}
        <div class="actions" style="justify-content:flex-end"><button class="btn btn-secondary" type="button" data-action="close-modals">Cancel</button><button class="btn btn-primary" type="submit">Create bin</button></div>
      </form>
    </div></div>
  `;
}

function renderEditModal(bin) {
  return `
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-head"><div><h2>Edit bin</h2><p class="small" style="margin-top:6px">Update details shown after QR scan.</p></div><button class="btn btn-ghost" data-action="close-modals">✕</button></div>
      <form class="form" id="editBinForm" data-bin-id="${escapeHtml(bin.id)}">
        ${fieldHtml("name", "Bin name", "", false, bin.name)}
        ${fieldHtml("location", "Location", "", false, bin.location)}
        ${fieldHtml("category", "Category", "", false, bin.category)}
        ${fieldHtml("notes", "Notes", "", true, bin.notes)}
        <div class="actions" style="justify-content:flex-end"><button class="btn btn-secondary" type="button" data-action="close-modals">Cancel</button><button class="btn btn-primary" type="submit">Save</button></div>
      </form>
    </div></div>
  `;
}

function renderQrModal(bin) {
  const url = getBinUrl(bin.id);
  return `
    <div class="modal-backdrop"><div class="modal">
      <div class="modal-head"><div><h2>QR label</h2><p class="small" style="margin-top:6px">Print and stick this on the bin.</p></div><button class="btn btn-ghost" data-action="close-modals">✕</button></div>
      <div class="qr-box">
        <h2>${escapeHtml(bin.name || "Storage bin")}</h2>
        <p class="small" style="margin-top:6px">${escapeHtml(bin.location || "Family storage")}</p>
        <div class="qr-canvas-wrap"><img class="qr-img" src="${escapeHtml(getQrImageUrl(bin.id, 260))}" alt="QR code for ${escapeHtml(bin.name || "Storage bin")}" /></div>
        <div class="copy-url">${escapeHtml(url)}</div>
      </div>
      <div class="actions" style="justify-content:flex-end; margin-top:14px"><button class="btn btn-secondary" data-action="copy-url" data-url="${escapeHtml(url)}">Copy link</button><button class="btn btn-primary" data-action="print">Print label</button></div>
    </div></div>
  `;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function getSelectedQrBins() {
  return bins.filter(bin => selectedQrBinIds.has(bin.id));
}

function renderQrPackModal() {
  const selectedBins = getSelectedQrBins();
  const pages = chunkArray(selectedBins, 4);
  return `
    <div class="modal-backdrop"><div class="modal qr-pack-modal">
      <div class="modal-head no-print">
        <div>
          <h2>Print QR pack</h2>
          <p class="small" style="margin-top:6px">Select bins and print 4 QR labels evenly on each A4 page.</p>
        </div>
        <button class="btn btn-ghost" data-action="close-modals">✕</button>
      </div>

      <div class="qr-pack-controls no-print">
        <div class="actions">
          <button class="btn btn-secondary" data-action="select-all-qr-pack">Select all</button>
          <button class="btn btn-secondary" data-action="clear-qr-pack">Clear</button>
        </div>
        <div class="actions">
          <span class="badge">${selectedBins.length} selected</span>
          <button class="btn btn-primary" data-action="print" ${selectedBins.length ? "" : "disabled"}>Print selected</button>
        </div>
      </div>

      <div class="qr-pack-picker no-print">
        ${bins.map(bin => `
          <label class="qr-pack-row">
            <input type="checkbox" class="qr-pack-checkbox" data-bin-id="${escapeHtml(bin.id)}" ${selectedQrBinIds.has(bin.id) ? "checked" : ""} />
            <span>
              <b>${escapeHtml(bin.name || "Untitled bin")}</b>
              <small>${escapeHtml(bin.location || "No location")} · ${escapeHtml(bin.category || "No category")}</small>
            </span>
          </label>
        `).join("")}
      </div>

      ${selectedBins.length ? `
        <div class="print-only print-pack-title">
          <h2>BinView QR labels</h2>
          <p>${selectedBins.length} selected label${selectedBins.length > 1 ? "s" : ""}</p>
        </div>
        <div class="qr-pack-preview">
          ${pages.map((pageBins, pageIndex) => `
            <section class="qr-pack-sheet">
              <div class="qr-pack-grid">
                ${pageBins.map(bin => renderQrPackLabel(bin)).join("")}
                ${Array.from({ length: 4 - pageBins.length }).map(() => `<div class="qr-pack-label qr-pack-label-empty"></div>`).join("")}
              </div>
              <div class="print-only page-counter">Page ${pageIndex + 1} of ${pages.length}</div>
            </section>
          `).join("")}
        </div>
      ` : `<div class="empty" style="margin-top:16px"><h3>No QR labels selected</h3><p class="small" style="margin-top:6px">Select one or more bins above, then print.</p></div>`}
    </div></div>
  `;
}

function renderQrPackLabel(bin) {
  const url = getBinUrl(bin.id);
  return `
    <article class="qr-pack-label">
      <div class="qr-pack-label-head">
        <h3>${escapeHtml(bin.name || "Storage bin")}</h3>
        <p>${escapeHtml(bin.location || "Family storage")}</p>
      </div>
      <img src="${escapeHtml(getQrImageUrl(bin.id, 230))}" alt="QR code for ${escapeHtml(bin.name || "Storage bin")}" />
      <div class="qr-pack-label-foot">
        <p>${escapeHtml(bin.category || "BinView")}</p>
        <small>${escapeHtml(url)}</small>
      </div>
    </article>
  `;
}

function fieldHtml(name, label, placeholder, textarea = false, value = "") {
  const safeValue = escapeHtml(value || "");
  return `<label class="field"><span>${escapeHtml(label)}</span>${textarea ? `<textarea name="${name}" placeholder="${escapeHtml(placeholder)}">${safeValue}</textarea>` : `<input name="${name}" value="${safeValue}" placeholder="${escapeHtml(placeholder)}" />`}</label>`;
}

// QR codes are rendered as images using a QR image endpoint, so they appear automatically
// even when the external QR JavaScript library is unavailable.

function bindCommonEvents() {
  document.querySelectorAll('[data-action="clear-error"]').forEach(el => el.addEventListener("click", () => setError("")));
  document.querySelectorAll('[data-action="signout"]').forEach(el => el.addEventListener("click", handleSignOut));
  document.querySelectorAll('[data-action="go-bins"]').forEach(el => el.addEventListener("click", () => { activeView = "bins"; selectedBinId = null; updateHashForView(); render(); }));
  document.querySelectorAll('[data-action="go-family"]').forEach(el => el.addEventListener("click", () => { activeView = "family"; selectedBinId = null; updateHashForView(); render(); }));
  document.querySelectorAll('[data-action="open-create"]').forEach(el => el.addEventListener("click", () => { createModalOpen = true; render(); }));
  document.querySelectorAll('[data-action="open-qr-pack"]').forEach(el => el.addEventListener("click", () => { selectedQrBinIds = new Set(bins.map(bin => bin.id)); qrPackModalOpen = true; render(); }));
  document.querySelectorAll('[data-action="select-all-qr-pack"]').forEach(el => el.addEventListener("click", () => { selectedQrBinIds = new Set(bins.map(bin => bin.id)); render(); }));
  document.querySelectorAll('[data-action="clear-qr-pack"]').forEach(el => el.addEventListener("click", () => { selectedQrBinIds = new Set(); render(); }));
  document.querySelectorAll('[data-action="close-modals"]').forEach(el => el.addEventListener("click", () => { createModalOpen = false; editModalBin = null; qrModalBin = null; qrPackModalOpen = false; render(); }));
  document.querySelectorAll('[data-action="open-bin"]').forEach(el => el.addEventListener("click", () => { selectedBinId = el.dataset.binId; activeView = "bin"; updateHashForView(); render(); }));
  document.querySelectorAll('[data-action="open-qr"]').forEach(el => el.addEventListener("click", () => { qrModalBin = bins.find(b => b.id === el.dataset.binId); render(); }));
  document.querySelectorAll('[data-action="open-edit"]').forEach(el => el.addEventListener("click", () => { editModalBin = bins.find(b => b.id === el.dataset.binId); render(); }));
  document.querySelectorAll('[data-action="delete-bin"]').forEach(el => el.addEventListener("click", () => { const bin = bins.find(b => b.id === el.dataset.binId); if (bin) deleteBin(bin); }));
  document.querySelectorAll('[data-action="copy-url"]').forEach(el => el.addEventListener("click", () => copyText(el.dataset.url)));
  document.querySelectorAll('[data-action="print"]').forEach(el => el.addEventListener("click", () => window.print()));

  document.querySelectorAll(".qr-pack-checkbox").forEach(input => {
    input.addEventListener("change", () => {
      if (input.checked) selectedQrBinIds.add(input.dataset.binId);
      else selectedQrBinIds.delete(input.dataset.binId);
      render();
    });
  });

  document.querySelectorAll('[data-action="clear-search"]').forEach(el => el.addEventListener("click", () => { searchQuery = ""; render(); }));

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", e => { searchQuery = e.target.value; render(); });
    searchInput.focus({ preventScroll: true });
    try { searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length); } catch {}
  }

  const createForm = document.getElementById("createBinForm");
  if (createForm) {
    createForm.addEventListener("submit", e => {
      e.preventDefault();
      const data = new FormData(createForm);
      createBinFromForm({ name: data.get("name") || "", location: data.get("location") || "", category: data.get("category") || "", notes: data.get("notes") || "" });
    });
  }

  const editForm = document.getElementById("editBinForm");
  if (editForm) {
    editForm.addEventListener("submit", e => {
      e.preventDefault();
      const data = new FormData(editForm);
      updateBin(editForm.dataset.binId, { name: String(data.get("name") || "").trim(), location: String(data.get("location") || "").trim(), category: String(data.get("category") || "").trim(), notes: String(data.get("notes") || "").trim() });
    });
  }

  const cameraInput = document.getElementById("cameraInput");
  const fileInput = document.getElementById("fileInput");
  const selectedBin = bins.find(b => b.id === selectedBinId);
  document.querySelectorAll('[data-action="trigger-camera"]').forEach(el => el.addEventListener("click", () => cameraInput?.click()));
  document.querySelectorAll('[data-action="trigger-upload"]').forEach(el => el.addEventListener("click", () => fileInput?.click()));
  cameraInput?.addEventListener("change", e => addPhotos(selectedBin, e.target.files));
  fileInput?.addEventListener("change", e => addPhotos(selectedBin, e.target.files));

  document.querySelectorAll('[data-action="delete-photo"]').forEach(el => el.addEventListener("click", () => {
    const bin = bins.find(b => b.id === el.dataset.binId);
    const photo = (bin?.photos || []).find(p => p.id === el.dataset.photoId);
    if (bin && photo) deletePhoto(bin, photo);
  }));

  document.querySelectorAll(".caption-input").forEach(input => {
    input.addEventListener("change", () => {
      const bin = bins.find(b => b.id === input.dataset.binId);
      if (bin) updatePhotoDetails(bin, input.dataset.photoId, { caption: input.value.trim() });
    });
  });

  document.querySelectorAll(".description-input").forEach(textarea => {
    textarea.addEventListener("change", () => {
      const bin = bins.find(b => b.id === textarea.dataset.binId);
      if (bin) updatePhotoDetails(bin, textarea.dataset.photoId, { description: textarea.value.trim() });
    });
  });
}

init();
