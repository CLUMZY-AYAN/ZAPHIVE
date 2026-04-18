/* =============================================
   ZAPHIVE — COSMETICS.JS
   Themes, Avatar Frames, Name Colors, Store
   ============================================= */
(function () {
  'use strict';

  const DB_URL = 'https://zaphive-736c0-default-rtdb.firebaseio.com';

  // ── Helpers ───────────────────────────────────
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmt(n) { if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1000) return (n/1000).toFixed(1)+'K'; return String(n); }
  async function dbGet(p) { try { const r=await fetch(DB_URL+p+'.json'); return await r.json(); } catch(e) { return null; } }
  async function dbSet(p,d) { try { await fetch(DB_URL+p+'.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); } catch(e) {} }
  async function dbPatch(p,d) { try { await fetch(DB_URL+p+'.json',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); } catch(e) {} }
  function getUser() { return window.ZapHiveAuth ? window.ZapHiveAuth.getCurrentUser() : null; }

  // ── Apply theme to page ───────────────────────
  function applyTheme(theme) {
    if (!theme || !theme.colors) return;
    const root = document.documentElement;
    const c = theme.colors;
    if (c.primary)    root.style.setProperty('--bg-primary',    c.primary);
    if (c.background) root.style.setProperty('--bg-card',       c.background);
    if (c.text)       root.style.setProperty('--text-white',    c.text);
    if (c.accent)     root.style.setProperty('--accent-blue',   c.accent);
    if (c.nav)        root.style.setProperty('--bg-nav',        c.nav);
    if (c.section)    root.style.setProperty('--bg-section',    c.section);
    if (c.cyan)       root.style.setProperty('--accent-cyan',   c.cyan);
    if (c.yellow)     root.style.setProperty('--accent-yellow', c.yellow);
    if (c.border)     root.style.setProperty('--border',        c.border);
  }

  function resetTheme() {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary',    '#050d1a');
    root.style.setProperty('--bg-card',       '#0a1628');
    root.style.setProperty('--bg-nav',        '#060f1e');
    root.style.setProperty('--bg-section',    '#081220');
    root.style.setProperty('--accent-blue',   '#1a8cff');
    root.style.setProperty('--accent-cyan',   '#00cfff');
    root.style.setProperty('--accent-yellow', '#ffd600');
    root.style.setProperty('--text-white',    '#e8f0ff');
    root.style.setProperty('--border',        'rgba(26,140,255,0.18)');
  }

  // ── Load active theme ─────────────────────────
  async function loadActiveTheme() {
    const user = getUser();
    // User equipped theme takes priority
    if (user && !user.isGuest && user.equipped?.theme) {
      const theme = await dbGet('/cosmetics/' + user.equipped.theme);
      if (theme) { applyTheme(theme); return; }
    }
    // Global theme set by dev
    const globalTheme = await dbGet('/settings/activeTheme');
    if (globalTheme) {
      const theme = await dbGet('/cosmetics/' + globalTheme);
      if (theme) applyTheme(theme);
    }
  }

  // ── Apply avatar frame ────────────────────────
  function applyAvatarFrame(frameId, frameData) {
    // Inject frame CSS dynamically
    let style = document.getElementById('zh-frame-style');
    if (!style) { style = document.createElement('style'); style.id = 'zh-frame-style'; document.head.appendChild(style); }
    if (!frameId || !frameData) { style.textContent = ''; return; }
    if (frameData.image) {
      style.textContent = `
        #nav-profile-trigger .zh-avatar-ring {
          border-image: url('${frameData.image}') 4 round !important;
          border-width: 4px !important;
        }`;
    }
  }

  // ── Apply name color ──────────────────────────
  function applyNameColor(colorHex) {
    let style = document.getElementById('zh-namecolor-style');
    if (!style) { style = document.createElement('style'); style.id = 'zh-namecolor-style'; document.head.appendChild(style); }
    if (!colorHex) { style.textContent = ''; return; }
    style.textContent = `#nav-profile-trigger span { color: ${colorHex} !important; }`;
  }

  // ── Store ─────────────────────────────────────
  async function openStore() {
    const user = getUser();
    let modal = document.getElementById('zh-store-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'zh-store-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,13,26,0.92);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem';
      modal.addEventListener('click', e => { if(e.target===modal) modal.classList.add('zh-hidden'); });
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:12px;padding:1.5rem;max-width:520px;width:100%;max-height:88vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem">
          <span style="font-family:var(--font-display);font-size:0.95rem;color:var(--accent-yellow)">🛒 STORE</span>
          <div style="display:flex;align-items:center;gap:0.8rem">
            ${user&&!user.isGuest?`<span style="font-size:0.8rem;color:#00cfff;font-family:var(--font-display)">💳 ${user.credits||0} Credits</span>`:''}
            <button onclick="document.getElementById('zh-store-modal').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer">✕</button>
          </div>
        </div>
        <div id="store-content"><div style="text-align:center;color:var(--text-muted);padding:2rem">Loading…</div></div>
      </div>`;

    modal.classList.remove('zh-hidden');
    await renderStore();
  }

  async function renderStore() {
    const content = document.getElementById('store-content');
    if (!content) return;
    const user = getUser();
    const cosmetics = await dbGet('/cosmetics');
    if (!cosmetics) { content.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:2rem">No items in store yet.</div>'; return; }

    const items = Object.values(cosmetics).filter(c => c.inStore);
    if (!items.length) { content.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:2rem">No items for sale yet.</div>'; return; }

    const byType = {};
    items.forEach(item => {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push(item);
    });

    const typeLabels = { theme:'🎨 Themes', frame:'🖼 Avatar Frames', nameColor:'✏️ Name Colors' };
    content.innerHTML = '';

    Object.entries(byType).forEach(([type, typeItems]) => {
      const section = document.createElement('div');
      section.style.marginBottom = '1.5rem';
      section.innerHTML = `<div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.7rem;font-weight:700">${typeLabels[type]||type}</div>`;

      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.6rem';

      typeItems.forEach(item => {
        const owned = user && (user.owned?.[item.type+'s']||[]).includes(item.id);
        const card  = document.createElement('div');
        card.style.cssText = 'background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.8rem;text-align:center';

        const preview = item.type==='nameColor'
          ? `<div style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:${item.colorHex||'#fff'};margin-bottom:0.5rem">Aa</div>`
          : item.image
            ? `<img src="${esc(item.image)}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;margin:0 auto 0.5rem">`
            : `<div style="width:48px;height:48px;border-radius:8px;margin:0 auto 0.5rem;background:${item.colors?.accent||'var(--accent-blue)'}"></div>`;

        const stock = item.unlimited ? '∞' : (item.stock||0);
        const stockColor = !item.unlimited && item.stock<=0 ? '#ff4d6d' : 'var(--text-muted)';

        card.innerHTML = `
          ${preview}
          <div style="font-size:0.78rem;font-weight:700;color:var(--text-white);margin-bottom:0.3rem">${esc(item.name)}</div>
          <div style="font-size:0.68rem;color:${stockColor};margin-bottom:0.5rem">Stock: ${stock}</div>
          <div style="font-family:var(--font-display);font-size:0.82rem;color:#00cfff;margin-bottom:0.5rem">💳 ${item.price||0}</div>
          ${owned
            ? `<button onclick="equipCosmetic('${item.id}','${item.type}')" style="width:100%;background:rgba(0,200,83,0.15);border:1px solid #00c853;border-radius:6px;color:#00c853;font-size:0.72rem;padding:0.35rem;cursor:pointer">✓ Owned — Equip</button>`
            : (!item.unlimited && item.stock<=0)
              ? `<button disabled style="width:100%;background:rgba(255,77,109,0.1);border:1px solid rgba(255,77,109,0.3);border-radius:6px;color:#ff4d6d;font-size:0.72rem;padding:0.35rem;cursor:not-allowed">Sold Out</button>`
              : user&&!user.isGuest
                ? `<button onclick="buyCosmetic('${item.id}')" style="width:100%;background:var(--accent-blue);border:none;border-radius:6px;color:#fff;font-size:0.72rem;font-weight:700;padding:0.35rem;cursor:pointer;font-family:var(--font-display)">Buy</button>`
                : `<button onclick="ZapHiveAuth.openAuth()" style="width:100%;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.72rem;padding:0.35rem;cursor:pointer">Sign in to buy</button>`
          }`;
        grid.appendChild(card);
      });
      section.appendChild(grid);
      content.appendChild(section);
    });
  }

  window.buyCosmetic = async function(itemId) {
    const user = getUser();
    if (!user || user.isGuest) { ZapHiveAuth.openAuth(); return; }
    const item = await dbGet('/cosmetics/' + itemId);
    if (!item) return showCosmeticToast('Item not found.', 'error');
    if (item.unlimited === false && item.stock <= 0) return showCosmeticToast('Sold out!', 'error');
    if ((user.credits||0) < (item.price||0)) return showCosmeticToast('Not enough Credits!', 'error');

    // Deduct credits via transaction
    const newCredits = (user.credits||0) - (item.price||0);
    await dbPatch('/users/'+user.uid, { credits: newCredits });
    await ZapHiveAuth.logTransaction(user.uid, 'store_purchase', { credits: -(item.price||0), itemId, itemName: item.name }, 'Store purchase', 'store');

    // Add to owned
    const key = item.type + 's';
    if (!user.owned) user.owned = {};
    if (!user.owned[key]) user.owned[key] = [];
    user.owned[key].push(itemId);
    user.credits = newCredits;

    await dbPatch('/users/'+user.uid, { owned: user.owned });

    // Decrease stock if limited
    if (!item.unlimited) {
      await dbPatch('/cosmetics/'+itemId, { stock: (item.stock||0) - 1 });
    }

    // Save session
    localStorage.setItem('zh_user', JSON.stringify(user));
    showCosmeticToast('✓ Purchased: ' + item.name + '!', 'success');
    await renderStore();
  };

  window.equipCosmetic = async function(itemId, type) {
    const user = getUser();
    if (!user || user.isGuest) return;
    if (!user.equipped) user.equipped = {};
    user.equipped[type] = itemId;
    await dbPatch('/users/'+user.uid, { equipped: user.equipped });
    localStorage.setItem('zh_user', JSON.stringify(user));
    showCosmeticToast('Equipped!', 'success');
    // Apply immediately
    if (type === 'theme') {
      const theme = await dbGet('/cosmetics/' + itemId);
      if (theme) applyTheme(theme);
    }
    if (type === 'nameColor') {
      const item = await dbGet('/cosmetics/' + itemId);
      if (item) applyNameColor(item.colorHex);
    }
  };

  function showCosmeticToast(msg, type='success') {
    let t = document.getElementById('zh-cosmetic-toast');
    if (!t) { t=document.createElement('div'); t.id='zh-cosmetic-toast'; t.style.cssText='position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:var(--bg-card);border:1px solid var(--accent-cyan);border-radius:10px;padding:0.7rem 1.4rem;color:var(--text-white);font-size:0.85rem;z-index:900;white-space:nowrap;transition:opacity 0.3s;pointer-events:none'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.borderColor = type==='error' ? '#ff4d6d' : 'var(--accent-cyan)';
    t.style.opacity = '1';
    clearTimeout(t._t); t._t = setTimeout(() => { t.style.opacity='0'; }, 3000);
  }

  // ── Expose ────────────────────────────────────
  window.ZapHiveCosmetics = { applyTheme, resetTheme, loadActiveTheme, openStore, applyNameColor, applyAvatarFrame };

  // ── Auto-init ─────────────────────────────────
  const tryInit = setInterval(() => {
    if (window.ZapHiveAuth && window.ZapHiveAuth.getCurrentUser()) {
      clearInterval(tryInit);
      loadActiveTheme();
    }
  }, 400);

})();
