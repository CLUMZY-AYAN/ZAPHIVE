/* =============================================
   ZAPHIVE — EVENTS.JS
   Events banner/popup, countdown, seasons
   ============================================= */
(function () {
  'use strict';

  const DB_URL = 'https://zaphive-736c0-default-rtdb.firebaseio.com';

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  async function dbGet(p) { try { const r=await fetch(DB_URL+p+'.json'); return await r.json(); } catch(e) { return null; } }
  async function dbSet(p,d) { try { await fetch(DB_URL+p+'.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); } catch(e) {} }
  async function dbPatch(p,d) { try { await fetch(DB_URL+p+'.json',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); } catch(e) {} }
  function getUser() { return window.ZapHiveAuth ? window.ZapHiveAuth.getCurrentUser() : null; }

  let countdownIntervals = [];

  function clearAllCountdowns() {
    countdownIntervals.forEach(clearInterval);
    countdownIntervals = [];
  }

  function formatCountdown(ms) {
    if (ms <= 0) return 'Ended';
    const s = Math.floor(ms/1000);
    const d = Math.floor(s/86400);
    const h = Math.floor((s%86400)/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s%60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
  }

  // ── Load and display active event ─────────────
  async function loadActiveEvent() {
    const events = await dbGet('/events');
    if (!events) return;

    const now = Date.now();
    const active = Object.values(events).find(e =>
      e.status === 'active' && e.startTime <= now && e.endTime >= now
    );

    if (!active) {
      removeEventUI();
      return;
    }

    renderEventBanner(active);

    // Show popup once per session
    const popupKey = 'zh_event_popup_' + active.id;
    if (!sessionStorage.getItem(popupKey)) {
      sessionStorage.setItem(popupKey, '1');
      setTimeout(() => renderEventPopup(active), 1200);
    }
  }

  function removeEventUI() {
    document.getElementById('zh-event-banner')?.remove();
  }

  function renderEventBanner(event) {
    // Remove old banner
    document.getElementById('zh-event-banner')?.remove();

    const hero = document.getElementById('hero');
    if (!hero) return;

    const banner = document.createElement('div');
    banner.id = 'zh-event-banner';
    banner.style.cssText = `
      position:relative;overflow:hidden;
      background:${event.bannerImage ? `url('${event.bannerImage}') center/cover no-repeat` : 'linear-gradient(135deg,#0a1628 0%,#1a0a2e 50%,#0a1628 100%)'};
      border-bottom:2px solid var(--accent-yellow);
      padding:1.8rem 1.5rem;text-align:center;`;

    // Overlay for readability
    banner.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(5,13,26,${event.bannerImage?'0.65':'0'})"></div>
      <div style="position:relative;z-index:1">
        <div style="display:inline-block;background:var(--accent-yellow);color:#000;font-family:var(--font-display);font-size:0.68rem;font-weight:800;padding:0.2rem 0.7rem;border-radius:20px;letter-spacing:1px;text-transform:uppercase;margin-bottom:0.5rem">⚡ LIVE EVENT</div>
        <h2 style="font-family:var(--font-display);font-size:clamp(1.2rem,4vw,2rem);color:#fff;font-weight:900;margin-bottom:0.4rem;text-shadow:0 2px 12px rgba(0,0,0,0.5)">${esc(event.title)}</h2>
        <p style="color:rgba(255,255,255,0.85);font-size:0.88rem;max-width:500px;margin:0 auto 0.8rem">${esc(event.description)}</p>
        ${event.gimmick ? `<div style="background:rgba(255,214,0,0.1);border:1px solid rgba(255,214,0,0.3);border-radius:8px;padding:0.5rem 1rem;display:inline-block;font-size:0.82rem;color:var(--accent-yellow);margin-bottom:0.8rem">🎯 ${esc(event.gimmick)}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;font-size:0.82rem;color:rgba(255,255,255,0.7)">
          <span>⏱ Ends in:</span>
          <span id="event-banner-countdown" style="font-family:var(--font-display);font-size:0.9rem;color:var(--accent-yellow);font-weight:700">…</span>
        </div>
      </div>`;

    // Replace hero content with banner
    hero.replaceWith(banner);

    // Start countdown
    const cdEl = document.getElementById('event-banner-countdown');
    const tick = () => {
      const remaining = event.endTime - Date.now();
      if (cdEl) cdEl.textContent = formatCountdown(remaining);
      if (remaining <= 0) { clearInterval(iv); removeEventUI(); }
    };
    tick();
    const iv = setInterval(tick, 1000);
    countdownIntervals.push(iv);
  }

  function renderEventPopup(event) {
    let popup = document.getElementById('zh-event-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'zh-event-popup';
      popup.style.cssText = 'position:fixed;inset:0;background:rgba(5,13,26,0.88);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem';
      popup.addEventListener('click', e => { if(e.target===popup) popup.classList.add('zh-hidden'); });
      document.body.appendChild(popup);
    }

    popup.innerHTML = `
      <div style="background:var(--bg-card);border:2px solid var(--accent-yellow);border-radius:16px;padding:0;max-width:420px;width:100%;overflow:hidden">
        ${event.bannerImage
          ? `<div style="height:160px;background:url('${event.bannerImage}') center/cover no-repeat;position:relative"><div style="position:absolute;inset:0;background:rgba(5,13,26,0.4)"></div></div>`
          : `<div style="height:80px;background:linear-gradient(135deg,#0a1628,#1a0a2e);display:flex;align-items:center;justify-content:center;font-size:3rem">🎉</div>`}
        <div style="padding:1.5rem;text-align:center">
          <div style="background:var(--accent-yellow);color:#000;font-family:var(--font-display);font-size:0.65rem;font-weight:800;padding:0.18rem 0.6rem;border-radius:20px;letter-spacing:1px;text-transform:uppercase;display:inline-block;margin-bottom:0.7rem">⚡ EVENT LIVE NOW</div>
          <h2 style="font-family:var(--font-display);font-size:1.3rem;color:#fff;font-weight:900;margin-bottom:0.5rem">${esc(event.title)}</h2>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.8rem">${esc(event.description)}</p>
          ${event.gimmick ? `<div style="background:rgba(255,214,0,0.08);border:1px solid rgba(255,214,0,0.25);border-radius:8px;padding:0.5rem 1rem;font-size:0.82rem;color:var(--accent-yellow);margin-bottom:0.8rem">🎯 ${esc(event.gimmick)}</div>` : ''}
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem">⏱ Ends in: <span id="event-popup-countdown" style="font-family:var(--font-display);color:var(--accent-yellow);font-weight:700">…</span></div>
          <button onclick="document.getElementById('zh-event-popup').classList.add('zh-hidden')" style="width:100%;background:var(--accent-yellow);border:none;border-radius:8px;color:#000;font-family:var(--font-display);font-size:0.85rem;font-weight:800;padding:0.65rem;cursor:pointer;letter-spacing:0.5px">LET'S GO! ⚡</button>
        </div>
      </div>`;

    popup.classList.remove('zh-hidden');

    const cdEl = document.getElementById('event-popup-countdown');
    const tick = () => {
      const remaining = event.endTime - Date.now();
      if (cdEl) cdEl.textContent = formatCountdown(remaining);
      if (remaining <= 0) clearInterval(iv);
    };
    tick();
    const iv = setInterval(tick, 1000);
    countdownIntervals.push(iv);
  }

  // ── Season system ─────────────────────────────
  async function loadCurrentSeason() {
    const season = await dbGet('/currentSeason');
    if (!season) return null;
    const now = Date.now();
    if (season.endTime && now > season.endTime) {
      // Season ended — auto distribute rewards
      await distributeSeasonRewards(season);
      return null;
    }
    return season;
  }

  async function distributeSeasonRewards(season) {
    if (season.rewardsDistributed) return;
    // Get all users sorted by seasonalZap
    const users = await dbGet('/users');
    if (!users) return;
    const sorted = Object.values(users)
      .filter(u => !u.isGuest && (u.seasonalZap||0) > 0)
      .sort((a,b) => (b.seasonalZap||0) - (a.seasonalZap||0));

    const rewards = season.rewards || {};

    for (let i = 0; i < sorted.length; i++) {
      const u = sorted[i];
      let reward = null;
      if (i === 0 && rewards.top1) reward = rewards.top1;
      else if (i < 10 && rewards.top10) reward = rewards.top10;
      else if (i < 100 && rewards.top100) reward = rewards.top100;
      if (!reward) continue;

      if (reward.credits) await ZapHiveAuth.awardCredits(u.uid, reward.credits, 'Season reward - Rank #'+(i+1), 'system');
      if (reward.cosmetics && Array.isArray(reward.cosmetics)) {
        const key = 'themes';
        const owned = u.owned || {};
        owned[key] = [...(owned[key]||[]), ...reward.cosmetics];
        await dbPatch('/users/'+u.uid, { owned });
      }
      // Reset seasonal zap
      await dbPatch('/users/'+u.uid, { seasonalZap: 0 });
    }

    // Mark rewards as distributed and archive season
    await dbPatch('/currentSeason', { rewardsDistributed: true });
    await dbSet('/pastSeasons/'+season.id, { ...season, rewardsDistributed: true, endedAt: Date.now() });
    await dbSet('/currentSeason', null);
  }

  // Add seasonal zap when regular zap is awarded
  async function addSeasonalZap(userId, amount) {
    const season = await dbGet('/currentSeason');
    if (!season || season.rewardsDistributed) return;
    const now = Date.now();
    if (now < season.startTime || now > season.endTime) return;
    const user = await dbGet('/users/'+userId);
    if (!user) return;
    const newSZap = (user.seasonalZap||0) + amount;
    await dbPatch('/users/'+userId, { seasonalZap: newSZap });
  }

  // Seasonal leaderboard
  async function openSeasonLeaderboard() {
    const season = await dbGet('/currentSeason');
    let modal = document.getElementById('zh-season-lb-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'zh-season-lb-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,13,26,0.88);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem';
      modal.addEventListener('click', e => { if(e.target===modal) modal.classList.add('zh-hidden'); });
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--accent-yellow);border-radius:12px;padding:1.5rem;max-width:400px;width:100%;max-height:88vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <span style="font-family:var(--font-display);font-size:0.9rem;color:var(--accent-yellow)">🏅 SEASON LEADERBOARD</span>
          <button onclick="document.getElementById('zh-season-lb-modal').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer">✕</button>
        </div>
        ${season ? `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;background:rgba(255,214,0,0.08);border:1px solid rgba(255,214,0,0.2);border-radius:8px;padding:0.6rem 0.9rem">
          <span style="font-size:0.78rem;color:var(--text-muted)">⏱ Season ends in:</span>
          <span id="season-lb-countdown" style="font-family:var(--font-display);font-size:0.85rem;color:var(--accent-yellow);font-weight:700">…</span>
        </div>` : '<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:1rem;text-align:center">No active season</div>'}
        <div id="season-lb-content"><div style="text-align:center;color:var(--text-muted);padding:1rem">Loading…</div></div>
      </div>`;

    modal.classList.remove('zh-hidden');

    // Countdown
    if (season) {
      const cdEl = document.getElementById('season-lb-countdown');
      const tick = () => { if(cdEl) cdEl.textContent = formatCountdown(season.endTime - Date.now()); };
      tick(); const iv = setInterval(tick, 1000); countdownIntervals.push(iv);
    }

    // Load rankings
    const lbContent = document.getElementById('season-lb-content');
    const users = await dbGet('/users');
    if (!users) { lbContent.innerHTML = '<div style="text-align:center;color:var(--text-muted)">No data.</div>'; return; }

    const sorted = Object.values(users)
      .filter(u => !u.isGuest)
      .sort((a,b) => (b.seasonalZap||0) - (a.seasonalZap||0))
      .slice(0, 10);

    const medals = ['🥇','🥈','🥉'];
    const currentUser = getUser();
    lbContent.innerHTML = '';

    if (!sorted.length || sorted.every(u => !(u.seasonalZap||0))) {
      lbContent.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1rem">No seasonal activity yet.</div>';
      return;
    }

    sorted.forEach((u, i) => {
      const isMe = currentUser && u.uid === currentUser.uid;
      const div = document.createElement('div');
      div.style.cssText = `display:flex;align-items:center;gap:0.7rem;padding:0.65rem;border-radius:8px;margin-bottom:0.4rem;background:${isMe?'rgba(26,140,255,0.1)':'var(--bg-section)'};border:1px solid ${isMe?'var(--accent-blue)':'var(--border)'}`;
      const avatarInner = u.avatarType==='image' ? `<img src="${u.avatar}" style="width:34px;height:34px;object-fit:cover;border-radius:50%">` : `<span style="font-size:1.2rem">${u.avatar||'👾'}</span>`;
      div.innerHTML = `
        <div style="width:22px;text-align:center;font-size:${i<3?'1rem':'0.8rem'};font-weight:700;flex-shrink:0">${i<3?medals[i]:i+1}</div>
        <div style="width:34px;height:34px;border-radius:50%;border:2px solid var(--accent-blue);display:flex;align-items:center;justify-content:center;background:var(--bg-section);overflow:hidden;flex-shrink:0">${avatarInner}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;font-weight:700;color:${isMe?'var(--accent-cyan)':'var(--text-white)'};">${esc(u.username)}${isMe?' (You)':''}</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">Level ${u.level||1}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:var(--font-display);font-size:0.82rem;color:var(--accent-yellow)">⚡${u.seasonalZap||0}</div>
          <div style="font-size:0.62rem;color:var(--text-muted)">SZAP</div>
        </div>`;
      lbContent.appendChild(div);
    });
  }

  // ── Expose ────────────────────────────────────
  window.ZapHiveEvents = {
    loadActiveEvent,
    openSeasonLeaderboard,
    addSeasonalZap,
    formatCountdown
  };

  // Auto-init
  const tryInit = setInterval(() => {
    if (window.ZapHiveAuth && window.ZapHiveAuth.getCurrentUser()) {
      clearInterval(tryInit);
      loadActiveEvent();
    }
  }, 500);

})();
