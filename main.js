/* =============================================
   ZAPHIVE — MAIN.JS
   Homepage: load games, categories, search, stats
   ============================================= */

(function () {
  'use strict';

  // ── State ────────────────────────────────────
  let allGames = [];
  let activeCategory = 'All';
  let searchQuery = '';

  // ── DOM refs ─────────────────────────────────
  const catList      = document.getElementById('cat-list');
  const mainContent  = document.getElementById('main-content');
  const searchInput  = document.getElementById('search-input');
  const navTotal     = document.getElementById('nav-total-plays');
  const navPublished = document.getElementById('nav-published');

  // ── Boot ─────────────────────────────────────
  async function init() {
    try {
      const data = await loadGames();
      allGames = data.games || [];
    } catch (e) {
      showGlobalError();
      return;
    }
    buildCategoryBar();
    renderHomepage();
    updateNavStats();
  }

  // ── Load JSON ────────────────────────────────
  async function loadGames() {
    // Try localStorage override first (dev-saved games)
    const saved = localStorage.getItem('zaphive_games');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    const res = await fetch('games.json?v=' + Date.now());
    if (!res.ok) throw new Error('Failed to load games.json');
    return res.json();
  }

  // ── Categories ───────────────────────────────
  function getPublishedGames() {
    return allGames.filter(g => g.status === 'Published');
  }

  function buildCategoryBar() {
    const cats = ['All', ...getUniqueCategories()];
    catList.innerHTML = '';
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (cat === activeCategory ? ' active' : '');
      btn.textContent = cat;
      btn.setAttribute('aria-label', 'Filter: ' + cat);
      btn.addEventListener('click', () => {
        activeCategory = cat;
        searchQuery = '';
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderHomepage();
      });
      catList.appendChild(btn);
    });
  }

  function getUniqueCategories() {
    const set = new Set();
    getPublishedGames().forEach(g => { if (g.category) set.add(g.category); });
    return [...set].sort();
  }

  // ── Render Homepage ──────────────────────────
  function renderHomepage() {
    mainContent.innerHTML = '';
    const published = getPublishedGames();

    if (searchQuery.trim()) {
      renderSearchResults(published);
      return;
    }

    if (activeCategory !== 'All') {
      const filtered = published.filter(g => g.category === activeCategory);
      renderSection(activeCategory, filtered);
    } else {
      // All: group by category
      const cats = getUniqueCategories();
      if (cats.length === 0) {
        mainContent.innerHTML = emptyState('No published games yet.');
        return;
      }
      cats.forEach(cat => {
        const games = published.filter(g => g.category === cat);
        if (games.length > 0) renderSection(cat, games);
      });
    }
  }

  function renderSection(catName, games) {
    const section = document.createElement('section');

    // Header
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `
      <h2>
        ${escHtml(catName)}
        <span class="count">${games.length} game${games.length !== 1 ? 's' : ''}</span>
      </h2>`;
    section.appendChild(header);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'game-grid';
    games.forEach(g => grid.appendChild(createGameCard(g)));
    section.appendChild(grid);

    mainContent.appendChild(section);
  }

  function renderSearchResults(games) {
    const q = searchQuery.toLowerCase();
    const results = games.filter(g =>
      g.title.toLowerCase().includes(q) ||
      (g.category || '').toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q)
    );

    const section = document.createElement('section');
    section.id = 'search-results-section';

    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<h2>Search: "${escHtml(searchQuery)}" <span class="count">${results.length} result${results.length !== 1 ? 's' : ''}</span></h2>`;
    section.appendChild(header);

    if (results.length === 0) {
      section.innerHTML += emptyState('No games matched your search.');
    } else {
      const grid = document.createElement('div');
      grid.className = 'game-grid';
      results.forEach(g => grid.appendChild(createGameCard(g)));
      section.appendChild(grid);
    }
    mainContent.appendChild(section);
  }

  // ── Game Card ────────────────────────────────
  function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';

    const thumb = game.logo
      ? `<img class="card-thumb" src="${escHtml(game.logo)}" alt="${escHtml(game.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      + `<div class="card-thumb-placeholder" style="display:none">🎮</div>`
      : `<div class="card-thumb-placeholder">🎮</div>`;

    card.innerHTML = `
      ${thumb}
      <div class="card-body">
        <div class="card-cat">${escHtml(game.category || '')}</div>
        <div class="card-title">${escHtml(game.title)}</div>
        <div class="card-plays">▶ ${formatNum(game.playCount || 0)} plays</div>
        <a class="card-play-btn" href="game.html?id=${encodeURIComponent(game.id)}">Play Now</a>
      </div>`;

    return card;
  }

  // ── Nav Stats ────────────────────────────────
  function updateNavStats() {
    const published = getPublishedGames();
    const totalPlays = allGames.reduce((s, g) => s + (g.playCount || 0), 0);
    if (navTotal)     navTotal.textContent = formatNum(totalPlays);
    if (navPublished) navPublished.textContent = published.length;
  }

  // ── Search ───────────────────────────────────
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        if (searchQuery) {
          activeCategory = 'All';
          document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
          const allBtn = catList.querySelector('.cat-btn');
          if (allBtn) allBtn.classList.add('active');
        }
        renderHomepage();
      }, 220);
    });
  }

  // ── Helpers ──────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  function emptyState(msg) {
    return `<div class="empty-state"><div class="icon">🎮</div><p>${escHtml(msg)}</p></div>`;
  }

  function showGlobalError() {
    mainContent.innerHTML = `<div class="empty-state">
      <div class="icon">⚠️</div>
      <p>Could not load games. Make sure games.json is in the same folder.</p>
    </div>`;
  }

  // ── Start ────────────────────────────────────
  init();

})();
