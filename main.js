/* =============================================
   ZAPHIVE — MAIN.JS v4
   Favorites, Continue Playing, Guest blocks,
   Tags, Likes/Dislikes, Firebase
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
    } catch(e) { showGlobalError(); return; }
    buildCategoryBar();
    renderHomepage();
  }

  async function seedFromJson() {
    try {
      const res  = await fetch('games.json?v='+Date.now());
      const data = await res.json();
      for (const g of (data.games||[])) {
        await fetch(DB_URL+'/games/'+g.id+'.json',{method:'PUT',body:JSON.stringify(g)});
      }
      const res2  = await fetch(DB_URL+'/games.json');
      const data2 = await res2.json();
      allGames = data2 ? Object.values(data2) : [];
    } catch(e) { allGames=[]; }
  }

  // ── Tags ─────────────────────────────────────
  function getGameTags(game) {
    const tags=[], mt=game.manualTags||{}, published=getPublished();
    const n=Date.now(), WEEK=7*24*60*60*1000, THREE_DAYS=3*24*60*60*1000;
    // HOT
    if(mt.hot){ tags.push('hot'); }
    else{ const sp=[...published].sort((a,b)=>(b.playCount||0)-(a.playCount||0)); if(sp.slice(0,3).find(g=>g.id===game.id)&&(game.playCount||0)>=10) tags.push('hot'); }
    // LIKES
    if(mt.likes){ tags.push('likes'); }
    else{ const sl=[...published].sort((a,b)=>(b.likes||0)-(a.likes||0)); if(sl.slice(0,3).find(g=>g.id===game.id)&&(game.likes||0)>=5) tags.push('likes'); }
    // NEW
    if(mt.new){ tags.push('new'); }
    else if(game.dateAdded&&n-new Date(game.dateAdded).getTime()<WEEK){ tags.push('new'); }
    // UPDATED
    if(mt.updated){ tags.push('updated'); }
    else if(game.lastUpdated&&n-new Date(game.lastUpdated).getTime()<THREE_DAYS){ tags.push('updated'); }
    return tags;
  }

  function renderTags(tags) {
    const labels={hot:'🔥 Hot',likes:'❤️ Liked',new:'✨ New',updated:'🔄 Updated'};
    return tags.map(t=>`<span class="tag tag-${t}">${labels[t]}</span>`).join('');
  }

  // ── Categories ────────────────────────────────
  function getPublished(){ return allGames.filter(g=>g.status==='Published'); }

  function getUniqueCategories(){
    const set=new Set(); getPublished().forEach(g=>{ if(g.category) set.add(g.category); }); return [...set].sort();
  }

  function buildCategoryBar(){
    const cats=['All',...getUniqueCategories()];
    catList.innerHTML='';
    cats.forEach(cat=>{
      const btn=document.createElement('button');
      btn.className='cat-btn'+(cat===activeCategory?' active':'');
      btn.textContent=cat;
      btn.addEventListener('click',()=>{
        activeCategory=cat; searchQuery='';
        if(searchInput) searchInput.value='';
        document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active'); renderHomepage();
      });
      catList.appendChild(btn);
    });
  }

  // ── Render Homepage ───────────────────────────
  function renderHomepage(){
    mainContent.innerHTML='';
    const published=getPublished();
    if(searchQuery.trim()){ renderSearchResults(published); return; }

    // Continue Playing row (logged in users only)
    const auth=window.ZapHiveAuth;
    if(auth&&auth.isLoggedIn()){
      const user=auth.getCurrentUser();
      const recent=(user.recentlyPlayed||[]).slice(0,10);
      if(recent.length>0){
        const recentGames=recent.map(r=>allGames.find(g=>g.id===r.id)).filter(Boolean);
        if(recentGames.length>0) renderSection('Continue Playing',recentGames,'▶️');
      }

      // Favorites row
      const favIds=Object.keys(user.favorites||{});
      if(favIds.length>0){
        const favGames=favIds.map(id=>allGames.find(g=>g.id===id)).filter(Boolean);
        if(favGames.length>0) renderSection('⭐ Favorites',favGames,'⭐');
      }
    }

    if(activeCategory!=='All'){
      renderSection(activeCategory,published.filter(g=>g.category===activeCategory));
    } else {
      const cats=getUniqueCategories();
      if(!cats.length){ mainContent.innerHTML=emptyState('No published games yet.'); return; }
      cats.forEach(cat=>{
        const games=published.filter(g=>g.category===cat);
        if(games.length) renderSection(cat,games);
      });
    }
  }

  function renderSection(catName,games,icon){
    const section=document.createElement('section');
    const header=document.createElement('div');
    header.className='section-header';
    header.innerHTML=`<h2>${esc(catName)} <span class="count">${games.length} game${games.length!==1?'s':''}</span></h2>`;
    section.appendChild(header);
    const grid=document.createElement('div');
    grid.className='game-grid';
    games.forEach(g=>grid.appendChild(createCard(g)));
    section.appendChild(grid);
    mainContent.appendChild(section);
  }

  function renderSearchResults(games){
    const q=searchQuery.toLowerCase();
    const results=games.filter(g=>g.title.toLowerCase().includes(q)||(g.category||'').toLowerCase().includes(q)||(g.description||'').toLowerCase().includes(q));
    const section=document.createElement('section');
    const header=document.createElement('div');
    header.className='section-header';
    header.innerHTML=`<h2>Search: "${esc(searchQuery)}" <span class="count">${results.length} result${results.length!==1?'s':''}</span></h2>`;
    section.appendChild(header);
    if(!results.length){ section.innerHTML+=emptyState('No games found.'); }
    else{ const grid=document.createElement('div'); grid.className='game-grid'; results.forEach(g=>grid.appendChild(createCard(g))); section.appendChild(grid); }
    mainContent.appendChild(section);
  }

  // ── Card ──────────────────────────────────────
  function createCard(game){
    const card=document.createElement('div');
    card.className='game-card';
    const auth=window.ZapHiveAuth;
    const isGuest=!auth||auth.isGuest();
    const tags=getGameTags(game);
    const tagHtml=renderTags(tags);
    const votes=getVote(game.id);
    const isFav=auth&&auth.isFavorite(game.id);

    const thumbInner=game.logo
      ?`<img class="card-thumb" src="${esc(game.logo)}" alt="${esc(game.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="card-thumb-placeholder" style="display:none">🎮</div>`
      :`<div class="card-thumb-placeholder">🎮</div>`;

    card.innerHTML=`
      <div class="card-thumb-wrap">
        ${thumbInner}
        ${tagHtml?`<div class="card-tags">${tagHtml}</div>`:''}
        <!-- Favorite star -->
        <button class="fav-btn${isFav?' fav-active':''}" data-id="${game.id}" title="${isGuest?'Sign in to save favorites':'Toggle favorite'}" style="position:absolute;top:0.35rem;right:0.35rem;background:${isFav?'rgba(255,214,0,0.9)':'rgba(0,0,0,0.5)'};border:none;border-radius:50%;width:26px;height:26px;font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.18s">
          ${isFav?'⭐':'☆'}
        </button>
      </div>
      <div class="card-body">
        <div class="card-cat">${esc(game.category||'')}</div>
        <div class="card-title">${esc(game.title)}</div>
        <div class="card-likes">
          <button class="like-btn${votes==='like'?' voted':''}" data-id="${game.id}" ${isGuest?'title="Sign in to like"':''}>👍 <span class="lcount">${fmt(game.likes||0)}</span></button>
          <button class="dislike-btn${votes==='dislike'?' voted':''}" data-id="${game.id}" ${isGuest?'title="Sign in to dislike"':''}>👎 <span class="dcount">${fmt(game.dislikes||0)}</span></button>
        </div>
        <a class="card-play-btn" href="game.html?id=${encodeURIComponent(game.id)}" data-id="${game.id}" data-title="${esc(game.title)}">Play Now</a>
      </div>`;

    // Favorite toggle
    card.querySelector('.fav-btn').addEventListener('click',async e=>{
      e.preventDefault(); e.stopPropagation();
      if(isGuest){ showGuestBlock('Save favorites'); return; }
      const nowFav=await auth.toggleFavorite(game.id);
      const btn=card.querySelector('.fav-btn');
      btn.textContent=nowFav?'⭐':'☆';
      btn.style.background=nowFav?'rgba(255,214,0,0.9)':'rgba(0,0,0,0.5)';
      // Refresh homepage to update Favorites row
      setTimeout(renderHomepage,300);
    });

    // Like
    card.querySelector('.like-btn').addEventListener('click',e=>{
      e.preventDefault();
      if(isGuest){ showGuestBlock('Like games'); return; }
      handleVote(game.id,'like',card);
    });

    // Dislike
    card.querySelector('.dislike-btn').addEventListener('click',e=>{
      e.preventDefault();
      if(isGuest){ showGuestBlock('Dislike games'); return; }
      handleVote(game.id,'dislike',card);
    });

    // Play → award XP
    card.querySelector('.card-play-btn').addEventListener('click',()=>{
      if(auth) auth.onPlayGame(game.id,game.title);
    });

    return card;
  }

  // ── Guest block popup ─────────────────────────
  function showGuestBlock(action){
    let t=document.getElementById('zh-guest-block');
    if(!t){t=document.createElement('div');t.id='zh-guest-block';t.style.cssText='position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:var(--bg-card);border:1px solid var(--accent-yellow);border-radius:10px;padding:0.7rem 1.2rem;color:var(--text-white);font-size:0.82rem;z-index:700;white-space:nowrap;transition:opacity 0.3s;pointer-events:none;text-align:center';document.body.appendChild(t);}
    t.innerHTML=`🔒 Sign in to ${action} <span style="color:var(--accent-blue);cursor:pointer;pointer-events:all" onclick="if(window.ZapHiveAuth)window.ZapHiveAuth.openAuth()">Sign Up</span>`;
    t.style.opacity='1';clearTimeout(t._timer);t._timer=setTimeout(()=>{t.style.opacity='0';},3000);
  }

  // ── Voting ────────────────────────────────────
  function getVote(id){ return localStorage.getItem('zh_vote_'+id)||null; }

  async function handleVote(id,type,card){
    const prev=getVote(id);
    if(prev===type) return;
    const game=allGames.find(g=>g.id===id);
    if(!game) return;
    if(prev==='like')    game.likes    =Math.max(0,(game.likes||0)-1);
    if(prev==='dislike') game.dislikes =Math.max(0,(game.dislikes||0)-1);
    if(type==='like')    game.likes    =(game.likes||0)+1;
    if(type==='dislike') game.dislikes =(game.dislikes||0)+1;
    localStorage.setItem('zh_vote_'+id,type);
    if(type==='like'&&window.ZapHiveAuth) window.ZapHiveAuth.onLike(id);
    try{
      await fetch(DB_URL+'/games/'+id+'/likes.json',   {method:'PUT',body:JSON.stringify(game.likes||0)});
      await fetch(DB_URL+'/games/'+id+'/dislikes.json',{method:'PUT',body:JSON.stringify(game.dislikes||0)});
    }catch(e){}
    const lb=card.querySelector('.like-btn'), db=card.querySelector('.dislike-btn');
    lb.classList.toggle('voted',type==='like'); db.classList.toggle('voted',type==='dislike');
    card.querySelector('.lcount').textContent=fmt(game.likes||0);
    card.querySelector('.dcount').textContent=fmt(game.dislikes||0);
  }

  // ── Search ────────────────────────────────────
  if(searchInput){
    let timer;
    searchInput.addEventListener('input',()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        searchQuery=searchInput.value.trim();
        if(searchQuery){ activeCategory='All'; document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active')); catList.querySelector('.cat-btn')?.classList.add('active'); }
        renderHomepage();
      },220);
    });
  }

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(n){ if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1000) return (n/1000).toFixed(1)+'K'; return String(n); }
  function emptyState(m){ return `<div class="empty-state"><div class="icon">🎮</div><p>${esc(m)}</p></div>`; }
  function showGlobalError(){ mainContent.innerHTML=`<div class="empty-state"><div class="icon">⚠️</div><p>Could not load games.</p></div>`; }

  init();
})();
