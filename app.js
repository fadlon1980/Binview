(function () {
  const STORAGE_KEY = "binview_private_family_static_v1";
  const app = document.getElementById("app");

  const initialMembers = [
    { name: "Elad", role: "Owner" },
    { name: "Maayan", role: "Admin" },
    { name: "Michal", role: "Viewer" },
    { name: "Maya", role: "Viewer" },
    { name: "Daniel", role: "Viewer" },
  ];

  const demoBins = [
    {
      id: "garage-bin-01",
      name: "Garage Bin 01",
      location: "Garage Shelf A",
      category: "Demo bin",
      notes: "Use this demo bin to test photos and QR labels.",
      createdAt: new Date().toISOString(),
      photos: [],
    },
  ];

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.error("Could not load state", err);
    }
    return { currentUser: null, familyMembers: initialMembers, bins: demoBins };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setState(updater) {
    state = typeof updater === "function" ? updater(state) : updater;
    saveState();
    render();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function makeSlug(value) {
    const slug = String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return slug || "bin-" + Date.now();
  }

  function getRoute() {
    const hash = window.location.hash || "#home";
    const match = hash.match(/^#bin\/(.+)$/);
    if (match) return { page: "bin", id: decodeURIComponent(match[1]) };
    if (hash === "#family") return { page: "family" };
    return { page: "home" };
  }

  function canEdit() {
    return state.currentUser && ["Owner", "Admin"].includes(state.currentUser.role);
  }

  function currentBaseUrl() {
    return window.location.href.split("#")[0];
  }

  function binUrl(binId) {
    return currentBaseUrl() + "#bin/" + encodeURIComponent(binId);
  }

  function qrImageUrl(value) {
    return "https://quickchart.io/qr?size=260&margin=2&text=" + encodeURIComponent(value);
  }

  function render() {
    try {
      if (!state.currentUser) {
        renderLogin();
        return;
      }
      const route = getRoute();
      if (route.page === "family") renderShell(renderFamily());
      else if (route.page === "bin") renderShell(renderBin(route.id));
      else renderShell(renderHome());
    } catch (err) {
      console.error(err);
      app.innerHTML = `
        <div class="boot-card">
          <h2>Something went wrong</h2>
          <p>The app loaded but hit an error. Try clearing site data, or use the reset button below.</p>
          <pre style="white-space:pre-wrap;background:#f1f5f9;border-radius:16px;padding:12px;margin-top:12px;color:#334155;">${escapeHtml(err.message || err)}</pre>
          <button class="btn danger" onclick="localStorage.removeItem('${STORAGE_KEY}'); location.reload();">Reset local app data</button>
        </div>`;
    }
  }

  function renderLogin(error = "") {
    const memberOptions = state.familyMembers.map((m) => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join("");
    app.innerHTML = `
      <div class="login-page">
        <div class="login-grid">
          <section class="card hero-card">
            <span class="badge">🔒 Private family storage app</span>
            <h1>BinView</h1>
            <p>Create QR labels for closed garage storage bins. Scan the QR later to see photos and notes for what is inside.</p>
            <div class="feature-row">
              <div class="feature"><strong>📦 Create bins</strong><p>Name, shelf, category, notes.</p></div>
              <div class="feature"><strong>📷 Add photos</strong><p>Use camera or upload pictures.</p></div>
              <div class="feature"><strong>🔳 Print QR</strong><p>Stick a QR label on each bin.</p></div>
            </div>
          </section>
          <section class="card">
            <h2>Family sign in</h2>
            <p>Select one approved family member.</p>
            <label class="field" style="margin-top:18px">
              <span>Family member</span>
              <select id="loginName">${memberOptions}</select>
            </label>
            ${error ? `<div class="alert">${escapeHtml(error)}</div>` : ""}
            <button class="btn full" id="loginBtn">Sign in</button>
            <div class="help">
              <strong>Approved names</strong><br />
              ${state.familyMembers.map((m) => escapeHtml(m.name)).join(" · ")}
            </div>
          </section>
        </div>
      </div>`;
    document.getElementById("loginBtn").addEventListener("click", () => {
      const selectedName = document.getElementById("loginName").value;
      const member = state.familyMembers.find((m) => m.name === selectedName);
      if (!member) {
        renderLogin("This name is not approved for this private family app.");
        return;
      }
      setState((prev) => ({ ...prev, currentUser: member }));
      window.location.hash = "#home";
    });
  }

  function renderShell(content) {
    app.innerHTML = `
      <div class="page">
        <header class="header">
          <div class="header-inner">
            <button class="logo" id="homeLogo">
              <span class="logo-icon">📦</span>
              <span><span class="logo-title">BinView</span><span class="logo-sub">Private family bins</span></span>
            </button>
            <nav class="nav">
              <button class="btn ${getRoute().page === "home" ? "" : "secondary"}" id="navBins">Bins</button>
              <button class="btn ${getRoute().page === "family" ? "" : "secondary"}" id="navFamily">Family</button>
            </nav>
            <div class="actions">
              <div class="user-pill"><strong>${escapeHtml(state.currentUser.name)}</strong>${escapeHtml(state.currentUser.role)}</div>
              <button class="btn secondary" id="logoutBtn">Logout</button>
            </div>
          </div>
        </header>
        ${content}
      </div>`;
    document.getElementById("homeLogo").addEventListener("click", () => (window.location.hash = "#home"));
    document.getElementById("navBins").addEventListener("click", () => (window.location.hash = "#home"));
    document.getElementById("navFamily").addEventListener("click", () => (window.location.hash = "#family"));
    document.getElementById("logoutBtn").addEventListener("click", () => setState((prev) => ({ ...prev, currentUser: null })));
    attachPageHandlers();
  }

  function renderHome() {
    const query = sessionStorage.getItem("binview_query") || "";
    const q = query.toLowerCase();
    const bins = state.bins.filter((b) => [b.name, b.location, b.category, b.notes].join(" ").toLowerCase().includes(q));
    const cards = bins.map((bin) => `
      <button class="bin-card" data-open-bin="${escapeHtml(bin.id)}">
        <div class="bin-top"><div class="iconbox">📦</div><span class="photo-pill">${bin.photos.length} photos</span></div>
        <h3>${escapeHtml(bin.name)}</h3>
        <div class="meta"><span>📍 ${escapeHtml(bin.location || "No location")}</span><span>🏷️ ${escapeHtml(bin.category || "No category")}</span></div>
        ${bin.notes ? `<p class="note">${escapeHtml(bin.notes)}</p>` : ""}
      </button>`).join("");
    return `
      <main class="container">
        <div class="title-row">
          <div><h2>Storage bins</h2><p>Search, create, and open your private bin photo inventory.</p></div>
          ${canEdit() ? `<button class="btn" id="createBinBtn">+ Create new bin</button>` : ""}
        </div>
        <div class="card search"><span>🔎</span><input class="input" id="searchInput" value="${escapeHtml(query)}" placeholder="Search by bin name, location, category, or note" /></div>
        <div class="grid bins">${cards}</div>
        ${bins.length === 0 ? `<div class="card empty"><h3>No bins found</h3><p>Try another search or create a new bin.</p></div>` : ""}
      </main>`;
  }

  function renderBin(id) {
    const bin = state.bins.find((b) => b.id === id);
    if (!bin) {
      return `<main class="container"><section class="card empty"><h2>Bin not found</h2><p>This QR link does not match an existing bin on this device/browser.</p><button class="btn" id="backHomeBtn">Back to bins</button></section></main>`;
    }
    const photos = bin.photos.map((photo) => `
      <div class="photo-card">
        <img src="${photo.url}" alt="${escapeHtml(photo.caption || "Bin photo")}" />
        <div class="photo-body">
          ${canEdit() ? `<input class="input caption-input" data-photo-id="${escapeHtml(photo.id)}" value="${escapeHtml(photo.caption || "")}" placeholder="Photo caption" />` : `<strong>${escapeHtml(photo.caption || "Photo")}</strong>`}
          <div class="photo-foot"><span>${new Date(photo.createdAt).toLocaleDateString()}</span>${canEdit() ? `<button class="btn danger" data-delete-photo="${escapeHtml(photo.id)}">Delete</button>` : ""}</div>
        </div>
      </div>`).join("");
    return `
      <main class="container">
        <div class="title-row">
          <div><button class="btn secondary" id="backHomeBtn">← Back to bins</button><h2 style="margin-top:14px">${escapeHtml(bin.name)}</h2><p>Private QR inventory page</p></div>
          <div class="actions"><button class="btn secondary" id="showQrBtn">🔳 QR label</button>${canEdit() ? `<button class="btn secondary" id="editBinBtn">Edit</button><button class="btn danger" id="deleteBinBtn">Delete</button>` : ""}</div>
        </div>
        <div class="grid two">
          <section class="card">
            <h3>Bin details</h3>
            <div class="detail-list" style="margin-top:18px">
              <div><div class="label">Location</div><p>${escapeHtml(bin.location || "No location added")}</p></div>
              <div><div class="label">Category</div><p>${escapeHtml(bin.category || "No category added")}</p></div>
              <div><div class="label">Notes</div><p>${escapeHtml(bin.notes || "No notes added")}</p></div>
            </div>
            <div class="help"><strong>Private access</strong><br />Only approved family names can open this prototype app.</div>
          </section>
          <section class="card">
            <div class="title-row" style="margin-bottom:18px">
              <div><h3>Photos</h3><p>Take photos before closing the bin.</p></div>
              ${canEdit() ? `<div class="actions"><button class="btn secondary" id="cameraBtn">📷 Camera</button><button class="btn" id="uploadBtn">Upload</button></div>` : ""}
            </div>
            <input id="cameraInput" class="hidden" type="file" accept="image/*" capture="environment" multiple />
            <input id="fileInput" class="hidden" type="file" accept="image/*" multiple />
            ${bin.photos.length === 0 ? `<div class="empty"><h3>No photos yet</h3><p>Add photos of the items before you close the bin.</p></div>` : `<div class="photo-grid">${photos}</div>`}
          </section>
        </div>
      </main>`;
  }

  function renderFamily() {
    const members = state.familyMembers.map((m) => `
      <div class="member"><div><strong>${escapeHtml(m.name)}</strong><p>${escapeHtml(m.role)}</p></div>${state.currentUser.role === "Owner" && m.role !== "Owner" ? `<button class="btn danger" data-remove-member="${escapeHtml(m.name)}">Remove</button>` : ""}</div>`).join("");
    return `
      <main class="container">
        <div class="title-row"><div><h2>Family access</h2><p>Control which names can open this simple private family app.</p></div></div>
        <section class="card"><h3>Approved family members</h3><p>Prototype access list. Firebase login is needed later for real security.</p><div style="margin-top:12px">${members}</div></section>
        <section class="card" style="margin-top:18px">
          <h3>Add family member</h3>
          ${state.currentUser.role !== "Owner" ? `<div class="help">Only the Owner can add or remove family members.</div>` : `
            <div class="grid" style="grid-template-columns:1fr 150px auto;margin-top:14px">
              <label class="field"><span>Name</span><input class="input" id="newMemberName" placeholder="Family name" /></label>
              <label class="field"><span>Role</span><select id="newMemberRole"><option>Viewer</option><option>Admin</option></select></label>
              <button class="btn" id="addMemberBtn" style="align-self:end;margin-bottom:14px">Add</button>
            </div>`}
        </section>
        <div class="help"><strong>Role guide</strong><br />Owner can manage family access. Admin can create/edit bins and photos. Viewer can only scan and view bin contents.</div>
      </main>`;
  }

  function attachPageHandlers() {
    const back = document.getElementById("backHomeBtn");
    if (back) back.addEventListener("click", () => (window.location.hash = "#home"));

    document.querySelectorAll("[data-open-bin]").forEach((el) => {
      el.addEventListener("click", () => (window.location.hash = "#bin/" + encodeURIComponent(el.dataset.openBin)));
    });

    const search = document.getElementById("searchInput");
    if (search) search.addEventListener("input", (e) => { sessionStorage.setItem("binview_query", e.target.value); render(); });

    const create = document.getElementById("createBinBtn");
    if (create) create.addEventListener("click", showCreateModal);

    const route = getRoute();
    if (route.page === "bin") attachBinHandlers(route.id);
    if (route.page === "family") attachFamilyHandlers();
  }

  function attachBinHandlers(id) {
    const bin = state.bins.find((b) => b.id === id);
    if (!bin) return;
    const cameraBtn = document.getElementById("cameraBtn");
    const uploadBtn = document.getElementById("uploadBtn");
    const cameraInput = document.getElementById("cameraInput");
    const fileInput = document.getElementById("fileInput");
    if (cameraBtn) cameraBtn.addEventListener("click", () => cameraInput.click());
    if (uploadBtn) uploadBtn.addEventListener("click", () => fileInput.click());
    if (cameraInput) cameraInput.addEventListener("change", (e) => addPhotos(id, e.target.files));
    if (fileInput) fileInput.addEventListener("change", (e) => addPhotos(id, e.target.files));

    const showQr = document.getElementById("showQrBtn");
    if (showQr) showQr.addEventListener("click", () => showQrModal(bin));

    const edit = document.getElementById("editBinBtn");
    if (edit) edit.addEventListener("click", () => showEditModal(bin));

    const del = document.getElementById("deleteBinBtn");
    if (del) del.addEventListener("click", () => {
      if (!confirm("Delete " + bin.name + "?")) return;
      setState((prev) => ({ ...prev, bins: prev.bins.filter((b) => b.id !== id) }));
      window.location.hash = "#home";
    });

    document.querySelectorAll("[data-delete-photo]").forEach((el) => {
      el.addEventListener("click", () => {
        const photoId = el.dataset.deletePhoto;
        setState((prev) => ({ ...prev, bins: prev.bins.map((b) => b.id === id ? { ...b, photos: b.photos.filter((p) => p.id !== photoId) } : b) }));
      });
    });

    document.querySelectorAll(".caption-input").forEach((el) => {
      el.addEventListener("change", () => {
        const photoId = el.dataset.photoId;
        setState((prev) => ({ ...prev, bins: prev.bins.map((b) => b.id === id ? { ...b, photos: b.photos.map((p) => p.id === photoId ? { ...p, caption: el.value } : p) } : b) }));
      });
    });
  }

  function attachFamilyHandlers() {
    const add = document.getElementById("addMemberBtn");
    if (add) add.addEventListener("click", () => {
      const name = document.getElementById("newMemberName").value.trim();
      const role = document.getElementById("newMemberRole").value;
      if (!name) return;
      setState((prev) => {
        if (prev.familyMembers.some((m) => m.name.toLowerCase() === name.toLowerCase())) return prev;
        return { ...prev, familyMembers: [...prev.familyMembers, { name, role }] };
      });
    });
    document.querySelectorAll("[data-remove-member]").forEach((el) => {
      el.addEventListener("click", () => setState((prev) => ({ ...prev, familyMembers: prev.familyMembers.filter((m) => m.name !== el.dataset.removeMember) })));
    });
  }

  function addPhotos(binId, files) {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;
    Promise.all(fileList.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: (crypto && crypto.randomUUID) ? crypto.randomUUID() : "photo-" + Date.now() + Math.random(),
        url: reader.result,
        caption: file.name.replace(/\.[^.]+$/, ""),
        createdAt: new Date().toISOString(),
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }))).then((photos) => {
      setState((prev) => ({ ...prev, bins: prev.bins.map((b) => b.id === binId ? { ...b, photos: [...photos, ...b.photos] } : b) }));
    }).catch((err) => alert("Could not read photos: " + err.message));
  }

  function showModal(html, after) {
    const wrapper = document.createElement("div");
    wrapper.className = "modal-backdrop";
    wrapper.innerHTML = `<div class="modal">${html}</div>`;
    document.body.appendChild(wrapper);
    wrapper.addEventListener("click", (e) => { if (e.target === wrapper) wrapper.remove(); });
    wrapper.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", () => wrapper.remove()));
    if (after) after(wrapper);
  }

  function showCreateModal() {
    showModal(`
      <div class="modal-head"><div><h2>Create new bin</h2><p>Add the basic label details first.</p></div><button class="btn secondary" data-close>×</button></div>
      <label class="field"><span>Bin name</span><input class="input" id="mName" placeholder="Garage Bin 04" /></label>
      <label class="field"><span>Location</span><input class="input" id="mLocation" placeholder="Garage Shelf B" /></label>
      <label class="field"><span>Category</span><input class="input" id="mCategory" placeholder="Winter clothes" /></label>
      <label class="field"><span>Notes</span><textarea id="mNotes" placeholder="What is inside?"></textarea></label>
      <div class="actions" style="justify-content:flex-end"><button class="btn secondary" data-close>Cancel</button><button class="btn" id="saveNewBin">Create bin</button></div>
    `, (modal) => {
      modal.querySelector("#saveNewBin").addEventListener("click", () => {
        const name = modal.querySelector("#mName").value.trim();
        if (!name) return alert("Please enter a bin name.");
        let id = makeSlug(name);
        if (state.bins.some((b) => b.id === id)) id += "-" + String(Date.now()).slice(-4);
        const newBin = { id, name, location: modal.querySelector("#mLocation").value.trim(), category: modal.querySelector("#mCategory").value.trim(), notes: modal.querySelector("#mNotes").value.trim(), createdAt: new Date().toISOString(), photos: [] };
        setState((prev) => ({ ...prev, bins: [newBin, ...prev.bins] }));
        modal.remove();
        window.location.hash = "#bin/" + encodeURIComponent(id);
      });
    });
  }

  function showEditModal(bin) {
    showModal(`
      <div class="modal-head"><div><h2>Edit bin</h2><p>Update details for the QR page.</p></div><button class="btn secondary" data-close>×</button></div>
      <label class="field"><span>Bin name</span><input class="input" id="mName" value="${escapeHtml(bin.name)}" /></label>
      <label class="field"><span>Location</span><input class="input" id="mLocation" value="${escapeHtml(bin.location)}" /></label>
      <label class="field"><span>Category</span><input class="input" id="mCategory" value="${escapeHtml(bin.category)}" /></label>
      <label class="field"><span>Notes</span><textarea id="mNotes">${escapeHtml(bin.notes)}</textarea></label>
      <div class="actions" style="justify-content:flex-end"><button class="btn secondary" data-close>Cancel</button><button class="btn" id="saveEditBin">Save</button></div>
    `, (modal) => {
      modal.querySelector("#saveEditBin").addEventListener("click", () => {
        setState((prev) => ({ ...prev, bins: prev.bins.map((b) => b.id === bin.id ? { ...b, name: modal.querySelector("#mName").value.trim() || b.name, location: modal.querySelector("#mLocation").value.trim(), category: modal.querySelector("#mCategory").value.trim(), notes: modal.querySelector("#mNotes").value.trim() } : b) }));
        modal.remove();
      });
    });
  }

  function showQrModal(bin) {
    const url = binUrl(bin.id);
    showModal(`
      <div class="modal-head"><div><h2>QR label</h2><p>Print and stick this on the bin.</p></div><button class="btn secondary" data-close>×</button></div>
      <div class="qr-label">
        <h2>${escapeHtml(bin.name)}</h2>
        <p>${escapeHtml(bin.location || "Storage bin")}</p>
        <img src="${qrImageUrl(url)}" alt="QR code for ${escapeHtml(bin.name)}" />
        <div class="link-box">${escapeHtml(url)}</div>
      </div>
      <div class="actions" style="margin-top:14px"><button class="btn secondary" id="copyQrLink">Copy link</button><button class="btn" id="printQr">Print label</button></div>
    `, (modal) => {
      modal.querySelector("#copyQrLink").addEventListener("click", async () => {
        await navigator.clipboard.writeText(url);
        modal.querySelector("#copyQrLink").textContent = "Copied";
      });
      modal.querySelector("#printQr").addEventListener("click", () => window.print());
    });
  }

  window.addEventListener("hashchange", render);
  render();
})();
