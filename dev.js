/* =============================================
   ZAPHIVE — DEV.JS
   Developer Dashboard Logic
   ============================================= */

(function () {
  'use strict';

  const ACCESS_CODE = 'CLUMZY1357';
  const STORAGE_KEY = 'zaphive_games';

  const CATEGORIES = [
    'Action', 'Driving', 'Multiplayer', 'Puzzle', 'Arcade', 'IO Games', 'New Games'
  ];

  // ── State ────────────────────────────────────
  let gamesData = { games: [] };
  let editingId  = null;

  // ── DOM refs ─────────────────────────────────
  const accessGate    = document.getElementById('access-gate');
  const devDashboard  = document.getElementById('dev-dashboard');
  const codeInput     = document.getElementById('code-input');
  const codeForm      = document.getElementById('code-form');
  const gateError     = document.getElementById('gate-error');
  const logoutBtn     = document.getElementById('logout-btn');
  const toast         = document.getElementById('dev-toast');
  const editModal     = document.getElementById('edit-modal');

  // Upload form
  const uploadForm    = document.getElementById('upload-form');
  const previewBtn    = document.getElementById('preview-btn');

  // Management
  const mgmtList      = document.getElementById('mgmt-list');

  // Stats
  const statTotal     = document.getElementById('stat-total');
  const statPublished = document.getElementById('stat-published');
  const statDev       = document.getElementById('stat-dev');
  const statPlays     = document.getElementById('stat-plays');

  // ── Boot ─────────────────────────────────────
  function init() {
    buildCategoryDropdowns();
    bindAccessForm();
    bindLogout();
    bindUploadForm();
    bindPreview();
    bindEditModal();

    // Check session
    if (sessionStorage.getItem('zh_dev_auth') === '1') {
      showDashboard();
    }
  }

  // ── Access Gate ──────────────────────────────
  function bindAccessForm() {
    if (!codeForm) return;
    codeForm.addEventListener('submit', e => {
      e.preventDefault();
      const val = (codeInput.value || '').trim();
      if (val === ACCESS_CODE) {
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

  function showDashboard() {
    accessGate.classList.add('hidden');
    devDashboard.classList.remove('hidden');
    loadData();
    refreshAll();
  }

  function bindLogout() {
    if (!logoutBtn) return;
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('zh_dev_auth');
      devDashboard.classList.add('hidden');
      accessGate.classList.remove('hidden');
      codeInput.value = '';
      gateError.textContent = '';
    });
  }

  // ── Data ─────────────────────────────────────
  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.games)) {
          gamesData = parsed;
          return;
        }
      } catch (_) {}
    }
    // Load from JSON file
    fetch('games.json?v=' + Date.now())
      .then(r => r.json())
      .then(data => {
        gamesData = data;
        saveData();
        refreshAll();
      })
      .catch(() => {
        gamesData = { games: [] };
      });
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gamesData));
  }

  // ── Category Dropdowns ───────────────────────
  function buildCategoryDropdowns() {
    ['upload-category', 'edit-category'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Select category…</option>';
      CATEGORIES.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        sel.appendChild(opt);
      });
    });
  }

  // ── Refresh UI ───────────────────────────────
  function refreshAll() {
    updateStats();
    renderMgmtList();
  }

  function updateStats() {
    const games = gamesData.games || [];
    const published = games.filter(g => g.status === 'Published');
    const inDev     = games.filter(g => g.status === 'In Development');
    const totalPlays = games.reduce((s, g) => s + (g.playCount || 0), 0);

    if (statTotal)     statTotal.textContent     = games.length;
    if (statPublished) statPublished.textContent  = published.length;
    if (statDev)       statDev.textContent        = inDev.length;
    if (statPlays)     statPlays.textContent      = formatNum(totalPlays);
  }

  // ── Upload Form ──────────────────────────────
  function bindUploadForm() {
    if (!uploadForm) return;
    uploadForm.addEventListener('submit', e => {
      e.preventDefault();
      const title    = val('upload-title');
      const logo     = val('upload-logo');
      const desc     = val('upload-desc');
      const embed    = val('upload-embed');
      const category = val('upload-category');
      const status   = val('upload-status');

      // Validate
      if (!title)    return showToast('Game title is required.', 'error');
      if (!category) return showToast('Please select a category.', 'error');
      if (status === 'Published' && !embed)
        return showToast('Embed code is required for published games.', 'error');

      // Check duplicate title
      const dup = (gamesData.games || []).find(
        g => g.title.toLowerCase() === title.toLowerCase()
      );
      if (dup) return showToast('A game with this title already exists.', 'error');

      const newGame = {
        id:        'g' + Date.now(),
        title,
        logo,
        description: desc,
        category,
        status,
        embedCode:  embed,
        playCount:  0,
        dateAdded:  today()
      };

      gamesData.games.push(newGame);
      saveData();
      refreshAll();
      uploadForm.reset();
      showToast('Game uploaded successfully!', 'success');
    });
  }

  function bindPreview() {
    if (!previewBtn) return;
    previewBtn.addEventListener('click', () => {
      const id = val('upload-embed');
      if (!id) return showToast('Enter an embed URL first.', 'error');
      const embed = normalizeEmbed(id);
      if (!embed) return showToast('Invalid embed code.', 'error');
      window.open(embed, '_blank', 'noopener');
    });
  }

  // ── Management List ──────────────────────────
  function renderMgmtList() {
    if (!mgmtList) return;
    const games = gamesData.games || [];
    mgmtList.innerHTML = '';

    if (games.length === 0) {
      mgmtList.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem;text-align:center;padding:1rem">No games yet.</p>';
      return;
    }

    games.forEach(game => {
      const item = document.createElement('div');
      item.className = 'mgmt-item';

      const statusClass = game.status === 'Published' ? 'published' : 'in-dev';
      const statusLabel = game.status === 'Published' ? 'Live' : 'Dev';

      item.innerHTML = `
        <img src="${escHtml(game.logo || '')}" alt="" loading="lazy"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\'%3E%3Crect fill=\'%230c1828\' width=\'40\' height=\'40\'/%3E%3Ctext y=\'28\' x=\'8\' font-size=\'24\'%3E🎮%3C/text%3E%3C/svg%3E'">
        <div class="mgmt-info">
          <div class="mgmt-title">${escHtml(game.title)}</div>
          <div class="mgmt-meta">
            ${escHtml(game.category || '—')} &middot;
            <span class="status-badge ${statusClass}">${statusLabel}</span>
            &middot; ${formatNum(game.playCount || 0)} plays
          </div>
        </div>
        <div class="mgmt-actions">
          <button class="btn-edit"  data-id="${game.id}" title="Edit">Edit</button>
          <button class="btn-danger" data-id="${game.id}" title="Delete">Del</button>
        </div>`;

      item.querySelector('.btn-edit').addEventListener('click', () => openEdit(game.id));
      item.querySelector('.btn-danger').addEventListener('click', () => deleteGame(game.id));
      mgmtList.appendChild(item);
    });
  }

  // ── Delete ───────────────────────────────────
  function deleteGame(id) {
    if (!confirm('Delete this game? This cannot be undone.')) return;
    gamesData.games = gamesData.games.filter(g => g.id !== id);
    saveData();
    refreshAll();
    showToast('Game deleted.', 'success');
  }

  // ── Edit Modal ───────────────────────────────
  function openEdit(id) {
    const game = gamesData.games.find(g => g.id === id);
    if (!game) return;
    editingId = id;

    setVal('edit-title',    game.title);
    setVal('edit-logo',     game.logo || '');
    setVal('edit-desc',     game.description || '');
    setVal('edit-embed',    game.embedCode || '');
    setVal('edit-category', game.category || '');
    setVal('edit-status',   game.status || 'Published');

    editModal.classList.remove('hidden');
    document.getElementById('edit-title').focus();
  }

  function bindEditModal() {
    const closeBtn  = document.getElementById('edit-close');
    const editForm  = document.getElementById('edit-form');

    if (closeBtn) closeBtn.addEventListener('click', closeEdit);
    if (editModal) editModal.addEventListener('click', e => {
      if (e.target === editModal) closeEdit();
    });

    if (editForm) {
      editForm.addEventListener('submit', e => {
        e.preventDefault();
        if (!editingId) return;

        const title    = val('edit-title');
        const category = val('edit-category');
        if (!title)    return showToast('Title is required.', 'error');
        if (!category) return showToast('Category is required.', 'error');

        const idx = gamesData.games.findIndex(g => g.id === editingId);
        if (idx === -1) return;

        gamesData.games[idx] = {
          ...gamesData.games[idx],
          title,
          logo:        val('edit-logo'),
          description: val('edit-desc'),
          embedCode:   val('edit-embed'),
          category,
          status:      val('edit-status')
        };

        saveData();
        refreshAll();
        closeEdit();
        showToast('Game updated.', 'success');
      });
    }
  }

  function closeEdit() {
    editModal.classList.add('hidden');
    editingId = null;
  }

  // ── Toast ────────────────────────────────────
  let toastTimer;
  function showToast(msg, type = 'success') {
    if (!toast) return;
    toast.textContent = (type === 'success' ? '✓ ' : '✗ ') + msg;
    toast.className = type;
    toast.classList.remove('hidden');
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
  }

  // ── Helpers ──────────────────────────────────
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function setVal(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function normalizeEmbed(code) {
    // If it's a URL, return it
    if (/^https?:\/\//i.test(code)) return code;
    // If it's an iframe, extract src
    const m = code.match(/src=["']([^"']+)["']/i);
    if (m) return m[1];
    return null;
  }

  // ── Start ────────────────────────────────────
  init();

})();
