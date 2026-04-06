/* =============================================
   ZAPHIVE — MAIN.JS v3
   Tags, Likes/Dislikes, Firebase, Auth hooks
   ============================================= */
(function () {
  'use strict';

  const DB_URL = 'https://zaphive-736c0-default-rtdb.firebaseio.com';

  let allGames = [];
  let activeCategory = 'All';
  let searchQuery = '';

  const catList     = document.getElementById('cat-list');
  const mainContent = document.getElementById('main-content');
  const searchInput = document.getElementById('search-input');

  async function init() {
    try {
      const res  = await fetch(DB_URL + '/games.json');
      const data = await res.json();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        allGames = Object.values(data);
      } else {
        await seedFromJson();
      }
    } catch (e) { showGlobalError(); return; }
    buildCategoryBar();
    renderHomepage();
  }

  async function seedFromJson() {
    try {
      const res   = await fetch('games.json?v=' + Date.now());
      const data  = await res.json();
      for (const g of (data.games || [])) {
        await fetch(DB_URL + '/games/' + g.id + '.json', { method: 'PUT', body: JSON.stringify(g) });
      }
      const res2  = await fetch(DB_URL + '/games.json');
      const data2 = await res2.json();
      allGames = data2 ? Object.values(data2) : [];
    } catch (e) { allGames = []; }
  }

  // ── Tags ─────────────────────────────────────
  function getGameTags(game) {
    const tags = [];
    const published = getPublished();
    const now = Date.now();
    const ONE_WEEK   = 7 * 24 * 60 * 60 * 1000;
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

    const sortedPlays = [...published].sort((a,b)=>(b.playCount||0)-(a.playCount||0));
    if (sortedPlays.slice(0,3).find(g=>g.id===game.id) && (game.playCount||0)>=10) tags.push('hot');

    const sortedLikes = [...published].sort((a,b)=>(b.likes||0)-(a.likes||0));
    if (sortedLikes.slice(0,3).find(g=>g.id===game.id) && (game.likes||0)>=5) tags.push('likes');

    if (game.dateAdded && now - new Date(game.dateAdded).getTime() < ONE_WEEK) tags.push('new');
    if (game.lastUpdated && now - new Date(game.lastUpdated).getTime() < THREE_DAYS) tags.push('updated');

    return tags;
  }

  function renderTags(tags) {
    const labels = { hot:'🔥 Hot', likes:'❤️ Liked', new:'✨ New', updated:'🔄 Updated' };
    return tags.map(t => `<span class="tag tag-${t}">${labels[t]}</span>`).join('');
  }

  // ── Categories ───────────────────────────────
  function getPublished() { return allGames.filter(g => g.status === 'Published'); }

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
    const header  = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<h2>${esc(catName)} <span class="count">${games.length} game${games.length!==1?'s':''}</span></h2>`;
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
      (g.category||'').toLowerCase().includes(q) ||
      (g.description||'').toLowerCase().includes(q)
    );
    const section = document.createElement('section');
    const header  = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML = `<h2>Search: "${esc(searchQuery)}" <span class="count">${results.length} result${results.length!==1?'s':''}</span></h2>`;
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

  // ── Card ─────────────────────────────────────
  function createCard(game) {
    const card  = document.createElement('div');
    card.className = 'game-card';

    const tags    = getGameTags(game);
    const tagHtml = renderTags(tags);
    const votes   = getVote(game.id);

    const thumbInner = game.logo
      ? `<img class="card-thumb" src="${esc(game.logo)}" alt="${esc(game.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="card-thumb-placeholder" style="display:none">🎮</div>`
      : `<div class="card-thumb-placeholder">🎮</div>`;

    card.innerHTML = `
      <div class="card-thumb-wrap">
        ${thumbInner}
        ${tagHtml ? `<div class="card-tags">${tagHtml}</div>` : ''}
      </div>
      <div class="card-body">
        <div class="card-cat">${esc(game.category||'')}</div>
        <div class="card-title">${esc(game.title)}</div>
        <div class="card-likes">
          <button class="like-btn${votes==='like'?' voted':''}" data-id="${game.id}">👍 <span class="lcount">${fmt(game.likes||0)}</span></button>
          <button class="dislike-btn${votes==='dislike'?' voted':''}" data-id="${game.id}">👎 <span class="dcount">${fmt(game.dislikes||0)}</span></button>
        </div>
        <a class="card-play-btn" href="game.html?id=${encodeURIComponent(game.id)}" data-id="${game.id}" data-title="${esc(game.title)}">Play Now</a>
      </div>`;

    // Like/dislike
    card.querySelector('.like-btn').addEventListener('click', e => { e.preventDefault(); handleVote(game.id, 'like', card); });
    card.querySelector('.dislike-btn').addEventListener('click', e => { e.preventDefault(); handleVote(game.id, 'dislike', card); });

    // Play — award XP
    card.querySelector('.card-play-btn').addEventListener('click', () => {
      if (window.ZapHiveAuth) {
        window.ZapHiveAuth.onPlayGame(game.id, game.title);
      }
    });

    return card;
  }

  // ── Voting ───────────────────────────────────
  function getVote(id) { return localStorage.getItem('zh_vote_' + id) || null; }

  async function handleVote(id, type, card) {
    const prev = getVote(id);
    if (prev === type) return;
    const game = allGames.find(g => g.id === id);
    if (!game) return;

    if (prev === 'like')    game.likes    = Math.max(0, (game.likes||0)-1);
    if (prev === 'dislike') game.dislikes = Math.max(0, (game.dislikes||0)-1);
    if (type === 'like')    game.likes    = (game.likes||0)+1;
    if (type === 'dislike') game.dislikes = (game.dislikes||0)+1;

    localStorage.setItem('zh_vote_' + id, type);

    if (type === 'like' && window.ZapHiveAuth) window.ZapHiveAuth.onLike(id);

    try {
      await fetch(DB_URL+'/games/'+id+'/likes.json',    { method:'PUT', body: JSON.stringify(game.likes||0) });
      await fetch(DB_URL+'/games/'+id+'/dislikes.json', { method:'PUT', body: JSON.stringify(game.dislikes||0) });
    } catch(e) {}

    const lb = card.querySelector('.like-btn');
    const db = card.querySelector('.dislike-btn');
    lb.classList.toggle('voted', type==='like');
    db.classList.toggle('voted', type==='dislike');
    card.querySelector('.lcount').textContent = fmt(game.likes||0);
    card.querySelector('.dcount').textContent = fmt(game.dislikes||0);
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
          document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
          const allBtn = catList.querySelector('.cat-btn');
          if (allBtn) allBtn.classList.add('active');
        }
        renderHomepage();
      }, 220);
    });
  }

  // ── Helpers ──────────────────────────────────
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(n) { if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1000) return (n/1000).toFixed(1)+'K'; return String(n); }
  function emptyState(m) { return `<div class="empty-state"><div class="icon">🎮</div><p>${esc(m)}</p></div>`; }
  function showGlobalError() { mainContent.innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><p>Could not load games.</p></div>`; }

  init();
})();
