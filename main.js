/* =============================================
   ZAPHIVE — MAIN.JS (Firebase Edition)
   ============================================= */

(function () {
  'use strict';

  const DB_URL = 'https://zaphive-736c0-default-rtdb.firebaseio.com';

  let allGames = [];
  let activeCategory = 'All';
  let searchQuery = '';

  const catList      = document.getElementById('cat-list');
  const mainContent  = document.getElementById('main-content');
  const searchInput  = document.getElementById('search-input');
  const navTotal     = document.getElementById('nav-total-plays');
  const navPublished = document.getElementById('nav-published');

  // ── Load from Firebase ───────────────────────
  async function init() {
    try {
      const res = await fetch(DB_URL + '/games.json');
      const data = await res.json();
      if (data && typeof data === 'object') {
        allGames = Object.entries(data).map(([key, val]) => ({ ...val, _key: key }));
      } else {
        await seedFromJson();
      }
    } catch (e) {
      showGlobalError();
      return;
    }
    buildCategoryBar();
    renderHomepage();
    updateNavStats();
  }

  // Seed Firebase with games.json on first run
  async function seedFromJson() {
    try {
      const res = await fetch('games.json?v=' + Date.now());
      const data = await res.json();
      const games = data.games || [];
      for (const game of games) {
        await fetch(DB_URL + '/games/' + game.id + '.json', {
          method: 'PUT',
          body: JSON.stringify(game)
        });
      }
      const res2 = await fetch(DB_URL + '/games.json');
      const data2 = await res2.json();
      allGames = data2 ? Object.entries(data2).map(([k, v]) => ({ ...v, _key: k })) : [];
    } catch (e) {
      allGames = [];
    }
  }

  // ── Categories ───────────────────────────────
  function getPublished() {
    return allGames.filter(g => g.status === 'Published');
  }

  function getUniqueCategories() {
    const set = new Set();
    getPublished().forEach(g => { if (g.category) set.add(g.category); });
    return [...set].sort();
  }

  function buildCategoryBar() {
    const cats = ['All', ...getUniqueCategories()];
    catList.innerHTML = '';
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (cat === activeCategory ? ' active' : '');
      btn.textContent = cat;
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

  // ── Render ───────────────────────────────────
  function renderHomepage() {
    mainContent.innerHTML = '';
    const published = getPublished();

    if (searchQuery.trim()) { renderSearchResults(published); return; }

    if (activeCategory !== 'All') {
      renderSection(activeCategory, published.filter(g => g.category === activeCategory));
    } else {
      const cats = getUniqueCategories();
      if (!cats.length) { mainContent.innerHTML = emptyState('No published games yet.'); return; }
      cats.forEach(cat => {
        const games = published.filter(g => g.category === cat);
        if (games.length) renderSection(cat, games);
      });
    }
  }

  function renderSection(catName, games) {
    const section = document.createElement('section');
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<h2>${esc(catName)} <span class="count">${games.length} game${games.length !== 1 ? 's' : ''}</span></h2>`;
    section.appendChild(header);
    const grid = document.createElement('div');
    grid.className = 'game-grid';
    games.forEach(g => grid.appendChild(createCard(g)));
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
    const header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<h2>Search: "${esc(searchQuery)}" <span class="count">${results.length} result${results.length !== 1 ? 's' : ''}</span></h2>`;
    section.appendChild(header);
    if (!results.length) {
      section.innerHTML += emptyState('No games matched your search.');
    } else {
      const grid = document.createElement('div');
      grid.className = 'game-grid';
      results.forEach(g => grid.appendChild(createCard(g)));
      section.appendChild(grid);
    }
    mainContent.appendChild(section);
  }

  function createCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    const thumb = game.logo
      ? `<img class="card-thumb" src="${esc(game.logo)}" alt="${esc(game.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="card-thumb-placeholder" style="display:none">🎮</div>`
      : `<div class="card-thumb-placeholder">🎮</div>`;
    card.innerHTML = `${thumb}
      <div class="card-body">
        <div class="card-cat">${esc(game.category || '')}</div>
        <div class="card-title">${esc(game.title)}</div>
        <div class="card-plays">▶ ${fmt(game.playCount || 0)} plays</div>
        <a class="card-play-btn" href="game.html?id=${encodeURIComponent(game.id)}">Play Now</a>
      </div>`;
    return card;
  }

  function updateNavStats() {
    const published = getPublished();
    const totalPlays = allGames.reduce((s, g) => s + (g.playCount || 0), 0);
    if (navTotal)     navTotal.textContent = fmt(totalPlays);
    if (navPublished) navPublished.textContent = published.length;
  }

  // ── Search ───────────────────────────────────
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
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
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function fmt(n) {
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1000) return (n/1000).toFixed(1)+'K';
    return String(n);
  }
  function emptyState(msg) {
    return `<div class="empty-state"><div class="icon">🎮</div><p>${esc(msg)}</p></div>`;
  }
  function showGlobalError() {
    mainContent.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Could not load games. Check your connection.</p></div>`;
  }

  init();
})();
