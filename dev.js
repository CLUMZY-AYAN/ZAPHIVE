/* =============================================
   ZAPHIVE — DEV.JS v2
   Logo from PC, Controls, Patch Notes, Firebase
   ============================================= */
(function () {
  'use strict';

  const ACCESS_CODE = 'CLUMZY1357';
  const DB_URL      = 'https://zaphive-736c0-default-rtdb.firebaseio.com';

  let gamesMap  = {};
  let editingId = null;

  // ── DOM ──────────────────────────────────────
  const accessGate    = document.getElementById('access-gate');
  const devDashboard  = document.getElementById('dev-dashboard');
  const codeInput     = document.getElementById('code-input');
  const codeForm      = document.getElementById('code-form');
  const gateError     = document.getElementById('gate-error');
  const logoutBtn     = document.getElementById('logout-btn');
  const toast         = document.getElementById('dev-toast');
  const editModal     = document.getElementById('edit-modal');
  const uploadForm    = document.getElementById('upload-form');
  const previewBtn    = document.getElementById('preview-btn');
  const mgmtList      = document.getElementById('mgmt-list');
  const statTotal     = document.getElementById('stat-total');
  const statPublished = document.getElementById('stat-published');
  const statDev       = document.getElementById('stat-dev');
  const statPlays     = document.getElementById('stat-plays');

  // ── Boot ─────────────────────────────────────
  function init() {
    bindAccessForm();
    bindLogout();
    bindUploadForm();
    bindPreview();
    bindEditModal();
    bindLogoUploads();
    if (sessionStorage.getItem('zh_dev_auth') === '1') showDashboard();
  }

  // ── Access Gate ──────────────────────────────
  function bindAccessForm() {
    if (!codeForm) return;
    codeForm.addEventListener('submit', e => {
      e.preventDefault();
      const entered = (codeInput.value || '').trim();
      if (entered === ACCESS_CODE) {
        sessionStorage.setItem('zh_dev_auth', '1');
        gateError.textContent = '';
        showDashboard();
      } else {
        gateError.textContent = '✗ Access denied. Invalid code.';
        codeInput.value = '';
        codeInput.focus();
      }
    });
  }

  async function showDashboard() {
    accessGate.classList.add('zh-hidden');
    devDashboard.classList.remove('zh-hidden');
    await loadData();
    refreshAll();
  }

  function bindLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('zh_dev_auth');
      devDashboard.classList.add('zh-hidden');
      accessGate.classList.remove('zh-hidden');
      codeInput.value = '';
      gateError.textContent = '';
    });
  }

  // ── Firebase ─────────────────────────────────
  async function loadData() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 7000);
      const res  = await fetch(DB_URL + '/games.json', { signal: ctrl.signal });
      clearTimeout(t);
      const data = await res.json();
      gamesMap = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    } catch (e) {
      gamesMap = {};
    }
  }

  async function saveGame(id, obj) {
    const res = await fetch(DB_URL + '/games/' + id + '.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    });
    if (!res.ok) throw new Error('Save failed');
    gamesMap[id] = obj;
  }

  async function deleteFromDB(id) {
    const res = await fetch(DB_URL + '/games/' + id + '.json', { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    delete gamesMap[id];
  }

  // ── Logo Upload (from PC) ─────────────────────
  function bindLogoUploads() {
    bindLogoInput('upload-logo-file', 'upload-logo-preview', 'upload-logo-data');
    bindLogoInput('edit-logo-file',   'edit-logo-preview',   'edit-logo-data');
  }

  function bindLogoInput(fileId, previewId, dataId) {
    const fileEl    = document.getElementById(fileId);
    const previewEl = document.getElementById(previewId);
    const dataEl    = document.getElementById(dataId);
    if (!fileEl) return;

    fileEl.addEventListener('change', () => {
      const file = fileEl.files[0];
      if (!file) return;
      if (file.size > 1.2 * 1024 * 1024) {
        showToast('Image too large. Max 1MB.', 'error');
        fileEl.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        const base64 = e.target.result;
        dataEl.value = base64;
        // Show preview
        previewEl.innerHTML = `<img src="${base64}" alt="logo" style="width:100%;height:100%;object-fit:cover;border-radius:4px">`;
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Refresh UI ───────────────────────────────
  function refreshAll() {
    updateStats();
    renderMgmtList();
  }

  function getGamesArr() { return Object.values(gamesMap); }

  function updateStats() {
    const games      = getGamesArr();
    const published  = games.filter(g => g.status === 'Published');
    const inDev      = games.filter(g => g.status === 'In Development');
    const totalPlays = games.reduce((s, g) => s + (g.playCount || 0), 0);
    if (statTotal)     statTotal.textContent     = games.length;
    if (statPublished) statPublished.textContent  = published.length;
    if (statDev)       statDev.textContent        = inDev.length;
    if (statPlays)     statPlays.textContent      = fmt(totalPlays);
  }

  // ── Upload Form ──────────────────────────────
  function bindUploadForm() {
    if (!uploadForm) return;
    uploadForm.addEventListener('submit', async e => {
      e.preventDefault();
      const title    = val('upload-title');
      const logoData = val('upload-logo-data');
      const desc     = val('upload-desc');
      const embed    = val('upload-embed');
      const controls = val('upload-controls');
      const category = val('upload-category');
      const status   = val('upload-status');

      if (!title)    return showToast('Game title is required.', 'error');
      if (!category) return showToast('Please select a category.', 'error');
      if (status === 'Published' && !embed)
        return showToast('Embed URL is required for published games.', 'error');

      const dup = getGamesArr().find(g => g.title.toLowerCase() === title.toLowerCase());
      if (dup) return showToast('A game with this title already exists.', 'error');

      const id = 'g' + Date.now();
      const newGame = {
        id, title,
        logo:        logoData || '',
        description: desc,
        controls:    controls,
        category,    status,
        embedCode:   embed,
        playCount:   0,
        likes:       0,
        dislikes:    0,
        patches:     [],
        dateAdded:   today()
      };

      try {
        await saveGame(id, newGame);
        refreshAll();
        uploadForm.reset();
        document.getElementById('upload-logo-preview').innerHTML = '🎮';
        document.getElementById('upload-logo-data').value = '';
        showToast('Game uploaded successfully!', 'success');
      } catch (err) {
        showToast('Failed to save. Check connection.', 'error');
      }
    });
  }

  function bindPreview() {
    if (!previewBtn) return;
    previewBtn.addEventListener('click', () => {
      const code = val('upload-embed');
      if (!code) return showToast('Enter an embed URL first.', 'error');
      const url = resolveEmbed(code);
      if (!url) return showToast('Invalid embed code.', 'error');
      window.open(url, '_blank', 'noopener');
    });
  }

  // ── Management List ──────────────────────────
  function renderMgmtList() {
    if (!mgmtList) return;
    const games = getGamesArr();
    mgmtList.innerHTML = '';
    if (!games.length) {
      mgmtList.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:1rem">No games yet.</p>';
      return;
    }
    games.forEach(game => {
      const item = document.createElement('div');
      item.className = 'mgmt-item';
      const sc = game.status === 'Published' ? 'published' : 'in-dev';
      const sl = game.status === 'Published' ? 'Live' : 'Dev';
      const imgSrc = game.logo || '';
      item.innerHTML = `
        <img src="${esc(imgSrc)}" alt="" loading="lazy"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect fill=\'%230c1828\' width=\'40\' height=\'40\'/%3E%3Ctext y=\'28\' x=\'8\' font-size=\'24\'%3E🎮%3C/text%3E%3C/svg%3E'">
        <div class="mgmt-info">
          <div class="mgmt-title">${esc(game.title)}</div>
          <div class="mgmt-meta">
            ${esc(game.category||'—')} &middot;
            <span class="status-badge ${sc}">${sl}</span>
            &middot; ${fmt(game.playCount||0)} plays
            &middot; 👍${fmt(game.likes||0)} 👎${fmt(game.dislikes||0)}
          </div>
        </div>
        <div class="mgmt-actions">
          <button class="btn-edit"   data-id="${game.id}">Edit</button>
          <button class="btn-danger" data-id="${game.id}">Del</button>
        </div>`;
      item.querySelector('.btn-edit').addEventListener('click',   () => openEdit(game.id));
      item.querySelector('.btn-danger').addEventListener('click', () => deleteGame(game.id));
      mgmtList.appendChild(item);
    });
  }

  // ── Delete ───────────────────────────────────
  async function deleteGame(id) {
    if (!confirm('Delete this game? This cannot be undone.')) return;
    try {
      await deleteFromDB(id);
      refreshAll();
      showToast('Game deleted.', 'success');
    } catch (e) {
      showToast('Failed to delete. Check connection.', 'error');
    }
  }

  // ── Edit Modal ───────────────────────────────
  function openEdit(id) {
    const game = gamesMap[id];
    if (!game) return;
    editingId = id;

    setVal('edit-title',    game.title);
    setVal('edit-desc',     game.description || '');
    setVal('edit-embed',    game.embedCode   || '');
    setVal('edit-controls', game.controls    || '');
    setVal('edit-category', game.category    || '');
    setVal('edit-status',   game.status      || 'Published');
    setVal('edit-logo-data',game.logo        || '');
    setVal('edit-patch-version', '');
    setVal('edit-patch-notes',   '');

    // Preview current logo
    const prev = document.getElementById('edit-logo-preview');
    if (game.logo) {
      prev.innerHTML = `<img src="${esc(game.logo)}" alt="logo" style="width:100%;height:100%;object-fit:cover;border-radius:4px">`;
    } else {
      prev.innerHTML = '🎮';
    }

    editModal.classList.remove('zh-hidden');
    document.getElementById('edit-title').focus();
  }

  function bindEditModal() {
    const closeBtn = document.getElementById('edit-close');
    const editForm = document.getElementById('edit-form');
    if (closeBtn) closeBtn.addEventListener('click', closeEdit);
    if (editModal) editModal.addEventListener('click', e => { if (e.target === editModal) closeEdit(); });

    if (editForm) {
      editForm.addEventListener('submit', async e => {
        e.preventDefault();
        if (!editingId) return;
        const title    = val('edit-title');
        const category = val('edit-category');
        if (!title)    return showToast('Title is required.', 'error');
        if (!category) return showToast('Category is required.', 'error');

        // Build patches array
        const existing  = gamesMap[editingId].patches || [];
        const pVersion  = val('edit-patch-version');
        const pNotes    = val('edit-patch-notes');
        const newPatches = [...existing];
        if (pVersion && pNotes) {
          newPatches.unshift({ version: pVersion, notes: pNotes, date: today() });
        }

        // New logo (may be updated or keep existing)
        const newLogo = val('edit-logo-data') || gamesMap[editingId].logo || '';

        const updated = {
          ...gamesMap[editingId],
          title,
          logo:        newLogo,
          description: val('edit-desc'),
          embedCode:   val('edit-embed'),
          controls:    val('edit-controls'),
          category,
          status:      val('edit-status'),
          patches:     newPatches,
          lastUpdated: today()
        };

        try {
          await saveGame(editingId, updated);
          refreshAll();
          closeEdit();
          showToast('Game updated!', 'success');
        } catch (err) {
          showToast('Failed to save. Check connection.', 'error');
        }
      });
    }
  }

  function closeEdit() {
    editModal.classList.add('zh-hidden');
    editingId = null;
  }

  // ── Toast ────────────────────────────────────
  let toastTimer;
  function showToast(msg, type = 'success') {
    if (!toast) return;
    toast.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
    toast.className = type;
    toast.classList.remove('zh-hidden');
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.classList.add('zh-hidden'), 300);
    }, 3200);
  }

  // ── Helpers ──────────────────────────────────
  function val(id)      { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function setVal(id,v) { const el = document.getElementById(id); if (el) el.value = v; }
  function esc(s)       { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function today()      { return new Date().toISOString().split('T')[0]; }
  function fmt(n)       { if (n>=1e6) return (n/1e6).toFixed(1)+'M'; if (n>=1000) return (n/1000).toFixed(1)+'K'; return String(n); }
  function resolveEmbed(c) { if (/^https?:\/\//i.test(c)) return c; const m=c.match(/src=["']([^"']+)["']/i); return m?m[1]:null; }

  init();
})();
