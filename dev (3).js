/* =============================================
   ZAPHIVE — DEV.JS (Firebase Edition)
   ============================================= */

(function () {
  'use strict';

  const ACCESS_CODE = 'CLUMZY1357';
  const DB_URL = 'https://zaphive-736c0-default-rtdb.firebaseio.com';

  const CATEGORIES = [
    'Action', 'Driving', 'Multiplayer', 'Puzzle', 'Arcade', 'IO Games', 'New Games'
  ];

  let gamesMap = {}; // { firebaseKey: gameObject }
  let editingId = null;

  // ── DOM refs ─────────────────────────────────
  const accessGate   = document.getElementById('access-gate');
  const devDashboard = document.getElementById('dev-dashboard');
  const codeInput    = document.getElementById('code-input');
  const codeForm     = document.getElementById('code-form');
  const gateError    = document.getElementById('gate-error');
  const logoutBtn    = document.getElementById('logout-btn');
  const toast        = document.getElementById('dev-toast');
  const editModal    = document.getElementById('edit-modal');
  const uploadForm   = document.getElementById('upload-form');
  const previewBtn   = document.getElementById('preview-btn');
  const mgmtList     = document.getElementById('mgmt-list');
  const statTotal    = document.getElementById('stat-total');
  const statPublished= document.getElementById('stat-published');
  const statDev      = document.getElementById('stat-dev');
  const statPlays    = document.getElementById('stat-plays');

  // ── Boot ─────────────────────────────────────
  function init() {
    buildCategoryDropdowns();
    bindAccessForm();
    bindLogout();
    bindUploadForm();
    bindPreview();
    bindEditModal();
    if (sessionStorage.getItem('zh_dev_auth') === '1') showDashboard();
  }

  // ── Access ───────────────────────────────────
  function bindAccessForm() {
    if (!codeForm) return;
    codeForm.addEventListener('submit', e => {
      e.preventDefault();
      if ((codeInput.value || '').trim() === ACCESS_CODE) {
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
    try {
      await loadData();
    } catch(e) {
      // continue even if load fails
    }
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

  // ── Firebase CRUD ────────────────────────────
  async function loadData() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(DB_URL + '/games.json', { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      gamesMap = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    } catch (e) {
      gamesMap = {};
    }
  }

  async function saveGame(id, gameObj) {
    const res = await fetch(DB_URL + '/games/' + id + '.json', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameObj)
    });
    if (!res.ok) throw new Error('Save failed');
    gamesMap[id] = gameObj;
  }

  async function deleteGameFromDB(id) {
    const res = await fetch(DB_URL + '/games/' + id + '.json', { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    delete gamesMap[id];
  }

  // ── Category Dropdowns ───────────────────────
  function buildCategoryDropdowns() {
    ['upload-category', 'edit-category'].forEach(elId => {
      const sel = document.getElementById(elId);
      if (!sel) return;
      sel.innerHTML = '<option value="">Select category…</option>';
      CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.textContent = cat;
        sel.appendChild(opt);
      });
    });
  }

  // ── Refresh UI ───────────────────────────────
  function refreshAll() {
    updateStats();
    renderMgmtList();
  }

  function getGamesArray() {
    return Object.values(gamesMap);
  }

  function updateStats() {
    const games     = getGamesArray();
    const published = games.filter(g => g.status === 'Published');
    const inDev     = games.filter(g => g.status === 'In Development');
    const totalPlays = games.reduce((s, g) => s + (g.playCount || 0), 0);
    if (statTotal)      statTotal.textContent     = games.length;
    if (statPublished)  statPublished.textContent  = published.length;
    if (statDev)        statDev.textContent        = inDev.length;
    if (statPlays)      statPlays.textContent      = fmt(totalPlays);
  }

  // ── Upload Form ──────────────────────────────
  function bindUploadForm() {
    if (!uploadForm) return;
    uploadForm.addEventListener('submit', async e => {
      e.preventDefault();
      const title    = val('upload-title');
      const logo     = val('upload-logo');
      const desc     = val('upload-desc');
      const embed    = val('upload-embed');
      const category = val('upload-category');
      const status   = val('upload-status');

      if (!title)    return showToast('Game title is required.', 'error');
      if (!category) return showToast('Please select a category.', 'error');
      if (status === 'Published' && !embed)
        return showToast('Embed URL is required for published games.', 'error');

      const dup = getGamesArray().find(g => g.title.toLowerCase() === title.toLowerCase());
      if (dup) return showToast('A game with this title already exists.', 'error');

      const id = 'g' + Date.now();
      const newGame = { id, title, logo, description: desc, category, status, embedCode: embed, playCount: 0, dateAdded: today() };

      try {
        await saveGame(id, newGame);
        refreshAll();
        uploadForm.reset();
        showToast('Game uploaded successfully!', 'success');
      } catch (err) {
        showToast('Failed to save game. Check connection.', 'error');
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
    const games = getGamesArray();
    mgmtList.innerHTML = '';

    if (!games.length) {
      mgmtList.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:1rem">No games yet.</p>';
      return;
    }

    games.forEach(game => {
      const item = document.createElement('div');
      item.className = 'mgmt-item';
      const statusClass = game.status === 'Published' ? 'published' : 'in-dev';
      const statusLabel = game.status === 'Published' ? 'Live' : 'Dev';

      item.innerHTML = `
        <img src="${esc(game.logo || '')}" alt="" loading="lazy"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect fill=\'%230c1828\' width=\'40\' height=\'40\'/%3E%3Ctext y=\'28\' x=\'8\' font-size=\'24\'%3E🎮%3C/text%3E%3C/svg%3E'">
        <div class="mgmt-info">
          <div class="mgmt-title">${esc(game.title)}</div>
          <div class="mgmt-meta">
            ${esc(game.category || '—')} &middot;
            <span class="status-badge ${statusClass}">${statusLabel}</span>
            &middot; ${fmt(game.playCount || 0)} plays
          </div>
        </div>
        <div class="mgmt-actions">
          <button class="btn-edit" data-id="${game.id}">Edit</button>
          <button class="btn-danger" data-id="${game.id}">Del</button>
        </div>`;

      item.querySelector('.btn-edit').addEventListener('click', () => openEdit(game.id));
      item.querySelector('.btn-danger').addEventListener('click', () => deleteGame(game.id));
      mgmtList.appendChild(item);
    });
  }

  // ── Delete ───────────────────────────────────
  async function deleteGame(id) {
    if (!confirm('Delete this game? This cannot be undone.')) return;
    try {
      await deleteGameFromDB(id);
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
    setVal('edit-logo',     game.logo || '');
    setVal('edit-desc',     game.description || '');
    setVal('edit-embed',    game.embedCode || '');
    setVal('edit-category', game.category || '');
    setVal('edit-status',   game.status || 'Published');
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

        const updated = {
          ...gamesMap[editingId],
          title,
          logo:        val('edit-logo'),
          description: val('edit-desc'),
          embedCode:   val('edit-embed'),
          category,
          status:      val('edit-status')
        };

        try {
          await saveGame(editingId, updated);
          refreshAll();
          closeEdit();
          showToast('Game updated.', 'success');
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
    }, 3000);
  }

  // ── Helpers ──────────────────────────────────
  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function today() { return new Date().toISOString().split('T')[0]; }
  function fmt(n) { if (n >= 1e6) return (n/1e6).toFixed(1)+'M'; if (n >= 1000) return (n/1000).toFixed(1)+'K'; return String(n); }
  function resolveEmbed(code) {
    if (/^https?:\/\//i.test(code)) return code;
    const m = code.match(/src=["']([^"']+)["']/i);
    return m ? m[1] : null;
  }

  init();
})();
