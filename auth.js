/* =============================================
   ZAPHIVE — AUTH.JS
   Guest auto-login, Sign up, Login, Profile,
   XP/Zap system, Avatar, Settings
   ============================================= */
(function () {
  'use strict';

  const DB_URL = 'https://zaphive-736c0-default-rtdb.firebaseio.com';

  // ── Preset avatars ───────────────────────────
  const PRESET_AVATARS = [
    '🎮', '⚡', '🔥', '💀', '🐉', '🦊', '🐺', '🎯',
    '🚀', '💎', '🌙', '⚔️', '🛡️', '🎲', '🏆', '👾'
  ];

  // ── XP per level (cumulative) ─────────────────
  function zapForLevel(lvl) {
    // Each level needs more zap: L1=20, L2=50, L3=90, ...
    return Math.floor(20 * lvl + 10 * lvl * (lvl - 1));
  }

  function getLevelFromZap(zap) {
    let lvl = 1;
    while (zapForLevel(lvl + 1) <= zap) lvl++;
    return lvl;
  }

  function zapProgressPercent(zap) {
    const lvl     = getLevelFromZap(zap);
    const current = zapForLevel(lvl);
    const next    = zapForLevel(lvl + 1);
    return Math.min(100, Math.round(((zap - current) / (next - current)) * 100));
  }

  // ── State ─────────────────────────────────────
  let currentUser = null; // { uid, username, isGuest, zap, level, avatar, ... }

  // ── Helpers ───────────────────────────────────
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function uid()  { return 'u_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36); }
  function today(){ return new Date().toISOString().split('T')[0]; }
  function hashPass(p) {
    // Simple hash — not cryptographic, but fine for this use case
    let h = 0;
    for (let i = 0; i < p.length; i++) { h = (Math.imul(31, h) + p.charCodeAt(i)) | 0; }
    return 'h_' + Math.abs(h).toString(16);
  }
  function hasEmoji(str) {
    return /\p{Emoji}/u.test(str);
  }
  function calcAge(birthday) {
    const b = new Date(birthday);
    const n = new Date();
    let age = n.getFullYear() - b.getFullYear();
    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) age--;
    return age;
  }

  // ── Firebase user ops ────────────────────────
  async function dbGet(path) {
    try {
      const r = await fetch(DB_URL + path + '.json');
      return await r.json();
    } catch(e) { return null; }
  }

  async function dbSet(path, data) {
    try {
      await fetch(DB_URL + path + '.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch(e) {}
  }

  async function dbPatch(path, data) {
    try {
      await fetch(DB_URL + path + '.json', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch(e) {}
  }

  // Check if username is taken
  async function isUsernameTaken(username) {
    const usernames = await dbGet('/usernames');
    return !!(usernames && usernames[username.toLowerCase()]);
  }

  // Register username → uid mapping
  async function registerUsername(username, userUid) {
    await dbSet('/usernames/' + username.toLowerCase(), userUid);
  }

  // ── Session ──────────────────────────────────
  function saveSession(user) {
    localStorage.setItem('zh_user', JSON.stringify(user));
  }

  function loadSession() {
    try {
      const s = localStorage.getItem('zh_user');
      return s ? JSON.parse(s) : null;
    } catch(e) { return null; }
  }

  function clearSession() {
    localStorage.removeItem('zh_user');
  }

  // ── Guest auto-login ─────────────────────────
  async function autoGuest() {
    const guestId       = uid();
    const guestUsername = 'Guest_' + Math.random().toString(36).slice(2,7).toUpperCase();
    const guest = {
      uid:       guestId,
      username:  guestUsername,
      isGuest:   true,
      avatar:    '👾',
      avatarType:'preset',
      zap:       0,
      level:     1,
      description: '',
      gender:    'N/A',
      hideGender: false,
      birthday:  '',
      likedGames:[],
      playHistory:[],
      joinDate:  today(),
      passwordHash: ''
    };
    currentUser = guest;
    saveSession(guest);
    renderNav();
    return guest;
  }

  // ── Init ─────────────────────────────────────
  async function init() {
    const session = loadSession();
    if (session && session.uid) {
      if (!session.isGuest) {
        // Refresh from Firebase
        const fresh = await dbGet('/users/' + session.uid);
        currentUser = fresh || session;
      } else {
        currentUser = session;
      }
    } else {
      await autoGuest();
    }
    renderNav();
    buildAuthUI();
  }

  // ── NAV avatar + username ─────────────────────
  function renderNav() {
    const wrap = document.getElementById('nav-user-wrap');
    if (!wrap || !currentUser) return;

    const isGuest = currentUser.isGuest;
    const avatarHtml = getAvatarHtml(currentUser.avatar, currentUser.avatarType, 32);
    const displayName = isGuest
      ? `<span style="color:var(--text-muted);font-size:0.75rem">Guest</span>`
      : `<span style="font-size:0.8rem;font-weight:700;color:var(--text-white);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(currentUser.username)}</span>`;

    wrap.innerHTML = `
      <div id="nav-profile-trigger" style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;padding:0.2rem 0.5rem;border-radius:20px;transition:background 0.18s" onmouseenter="this.style.background='rgba(26,140,255,0.1)'" onmouseleave="this.style.background='transparent'">
        ${displayName}
        <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;border:2px solid var(--accent-blue);flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--bg-card);font-size:1.1rem">
          ${avatarHtml}
        </div>
      </div>`;

    document.getElementById('nav-profile-trigger').addEventListener('click', () => {
      openProfilePanel();
    });
  }

  function getAvatarHtml(avatar, type, size) {
    if (!avatar) return '👾';
    if (type === 'image') {
      return `<img src="${esc(avatar)}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%;" alt="avatar">`;
    }
    return avatar; // emoji preset
  }

  // ── XP / Zap ─────────────────────────────────
  async function addZap(amount) {
    if (!currentUser) return;
    currentUser.zap = (currentUser.zap || 0) + amount;
    currentUser.level = getLevelFromZap(currentUser.zap);
    saveSession(currentUser);
    if (!currentUser.isGuest) {
      await dbPatch('/users/' + currentUser.uid, { zap: currentUser.zap, level: currentUser.level });
    }
    // Update profile panel if open
    const panel = document.getElementById('zh-profile-panel');
    if (panel && !panel.classList.contains('zh-hidden')) {
      updateProfileStats();
    }
  }

  // Expose globally for main.js / game.html to call
  window.ZapHiveAuth = {
    addZap,
    getCurrentUser: () => currentUser,
    isLoggedIn: () => currentUser && !currentUser.isGuest,
    onLike: async (gameId) => {
      if (!currentUser) return;
      if (!currentUser.likedGames) currentUser.likedGames = [];
      if (!currentUser.likedGames.includes(gameId)) {
        currentUser.likedGames.push(gameId);
        await addZap(5);
        saveSession(currentUser);
        if (!currentUser.isGuest) {
          await dbPatch('/users/' + currentUser.uid, { likedGames: currentUser.likedGames });
        }
      }
    },
    onPlayGame: async (gameId, gameTitle) => {
      if (!currentUser) return;
      if (!currentUser.playHistory) currentUser.playHistory = [];
      // Add to history (max 50)
      currentUser.playHistory.unshift({ id: gameId, title: gameTitle, date: today() });
      if (currentUser.playHistory.length > 50) currentUser.playHistory = currentUser.playHistory.slice(0, 50);
      await addZap(3);
      saveSession(currentUser);
      if (!currentUser.isGuest) {
        await dbPatch('/users/' + currentUser.uid, { playHistory: currentUser.playHistory });
      }
    }
  };

  // ── Build Auth UI (modal) ────────────────────
  function buildAuthUI() {
    if (document.getElementById('zh-auth-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'zh-auth-modal';
    modal.className = 'zh-hidden';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,13,26,0.92);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem';
    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:12px;padding:2rem;max-width:380px;width:100%;max-height:90vh;overflow-y:auto">
        <div style="text-align:center;margin-bottom:1.5rem">
          <div style="font-family:var(--font-display);font-size:1.4rem;font-weight:900"><span style="color:var(--accent-yellow)">⚡Zap</span><span style="color:var(--accent-cyan)">Hive</span></div>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem">
          <button class="zh-tab active" id="tab-signup" onclick="ZapHiveAuth._switchTab('signup')" style="flex:1;padding:0.5rem;border-radius:6px;font-size:0.82rem;font-weight:700;background:var(--accent-blue);color:#fff;border:none;cursor:pointer">Sign Up</button>
          <button class="zh-tab" id="tab-login" onclick="ZapHiveAuth._switchTab('login')" style="flex:1;padding:0.5rem;border-radius:6px;font-size:0.82rem;font-weight:700;background:transparent;color:var(--text-muted);border:1px solid var(--border);cursor:pointer">Login</button>
        </div>

        <!-- SIGN UP FORM -->
        <form id="zh-signup-form" action="javascript:void(0)" novalidate>
          <div class="zh-field">
            <label class="zh-label">Username (max 13 chars, no emojis)</label>
            <input type="text" id="su-username" class="zh-input" placeholder="CoolPlayer" maxlength="13" autocomplete="off">
          </div>
          <div class="zh-field">
            <label class="zh-label">Password</label>
            <input type="password" id="su-password" class="zh-input" placeholder="••••••••" maxlength="40">
          </div>
          <div class="zh-field">
            <label class="zh-label">Confirm Password</label>
            <input type="password" id="su-confirm" class="zh-input" placeholder="••••••••" maxlength="40">
          </div>
          <div class="zh-field">
            <label class="zh-label">Birthday</label>
            <input type="date" id="su-birthday" class="zh-input">
          </div>
          <div class="zh-field">
            <label class="zh-label">Gender</label>
            <select id="su-gender" class="zh-input">
              <option value="N/A">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div id="su-error" style="color:#ff4d6d;font-size:0.78rem;margin-bottom:0.7rem;min-height:1em"></div>
          <button type="submit" style="width:100%;background:var(--accent-blue);color:#fff;font-family:var(--font-display);font-size:0.82rem;font-weight:700;padding:0.65rem;border-radius:6px;border:none;cursor:pointer;letter-spacing:0.5px">Create Account</button>
          <p style="text-align:center;margin-top:1rem;font-size:0.75rem;color:var(--text-muted)">Guest progress will carry over ✅</p>
        </form>

        <!-- LOGIN FORM -->
        <form id="zh-login-form" action="javascript:void(0)" novalidate style="display:none">
          <div class="zh-field">
            <label class="zh-label">Username</label>
            <input type="text" id="li-username" class="zh-input" placeholder="YourUsername" maxlength="13" autocomplete="off">
          </div>
          <div class="zh-field">
            <label class="zh-label">Password</label>
            <input type="password" id="li-password" class="zh-input" placeholder="••••••••" maxlength="40">
          </div>
          <div id="li-error" style="color:#ff4d6d;font-size:0.78rem;margin-bottom:0.7rem;min-height:1em"></div>
          <button type="submit" style="width:100%;background:var(--accent-blue);color:#fff;font-family:var(--font-display);font-size:0.82rem;font-weight:700;padding:0.65rem;border-radius:6px;border:none;cursor:pointer;letter-spacing:0.5px">Login</button>
        </form>

        <button onclick="ZapHiveAuth._closeAuth()" style="display:block;width:100%;margin-top:1rem;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.78rem;padding:0.4rem;cursor:pointer">Continue as Guest</button>
      </div>`;

    document.body.appendChild(modal);

    // Sign up submit
    document.getElementById('zh-signup-form').addEventListener('submit', handleSignup);
    document.getElementById('zh-login-form').addEventListener('submit', handleLogin);
  }

  ZapHiveAuth._switchTab = function(tab) {
    const su = document.getElementById('zh-signup-form');
    const li = document.getElementById('zh-login-form');
    const ts = document.getElementById('tab-signup');
    const tl = document.getElementById('tab-login');
    if (tab === 'signup') {
      su.style.display = ''; li.style.display = 'none';
      ts.style.cssText += ';background:var(--accent-blue);color:#fff;border:none';
      tl.style.cssText += ';background:transparent;color:var(--text-muted);border:1px solid var(--border)';
    } else {
      su.style.display = 'none'; li.style.display = '';
      tl.style.cssText += ';background:var(--accent-blue);color:#fff;border:none';
      ts.style.cssText += ';background:transparent;color:var(--text-muted);border:1px solid var(--border)';
    }
  };

  ZapHiveAuth._closeAuth = function() {
    const m = document.getElementById('zh-auth-modal');
    if (m) m.classList.add('zh-hidden');
  };

  ZapHiveAuth.openAuth = function() {
    buildAuthUI();
    const m = document.getElementById('zh-auth-modal');
    if (m) m.classList.remove('zh-hidden');
  };

  // ── Sign Up ──────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault();
    const errEl   = document.getElementById('su-error');
    errEl.textContent = '';

    const username = (document.getElementById('su-username').value || '').trim();
    const password = document.getElementById('su-password').value || '';
    const confirm  = document.getElementById('su-confirm').value  || '';
    const birthday = document.getElementById('su-birthday').value  || '';
    const gender   = document.getElementById('su-gender').value    || 'N/A';

    // Validate
    if (!username)              return errEl.textContent = 'Username is required.';
    if (username.length > 13)   return errEl.textContent = 'Username max 13 characters.';
    if (hasEmoji(username))     return errEl.textContent = 'Username cannot contain emojis.';
    if (!/^[a-zA-Z0-9_. -]+$/.test(username)) return errEl.textContent = 'Username has invalid characters.';
    if (password.length < 6)    return errEl.textContent = 'Password must be at least 6 characters.';
    if (password !== confirm)   return errEl.textContent = 'Passwords do not match.';
    if (!birthday)              return errEl.textContent = 'Birthday is required.';
    if (calcAge(birthday) < 5)  return errEl.textContent = 'You must be at least 5 years old.';

    errEl.textContent = 'Checking username…';

    const taken = await isUsernameTaken(username);
    if (taken) return errEl.textContent = 'This username is already taken.';

    // Build user — carry over guest progress
    const newUid = currentUser?.uid || uid();
    const user = {
      uid:         newUid,
      username,
      isGuest:     false,
      avatar:      currentUser?.avatar    || '👾',
      avatarType:  currentUser?.avatarType|| 'preset',
      zap:         currentUser?.zap       || 0,
      level:       currentUser?.level     || 1,
      description: '',
      gender,
      hideGender:  false,
      birthday,
      likedGames:  currentUser?.likedGames  || [],
      playHistory: currentUser?.playHistory || [],
      joinDate:    currentUser?.joinDate    || today(),
      passwordHash: hashPass(password)
    };

    await dbSet('/users/' + newUid, user);
    await registerUsername(username, newUid);

    currentUser = user;
    saveSession(user);
    renderNav();
    ZapHiveAuth._closeAuth();
    showAuthToast('Welcome, ' + username + '! 🎉');
  }

  // ── Login ────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    const errEl   = document.getElementById('li-error');
    errEl.textContent = '';

    const username = (document.getElementById('li-username').value || '').trim();
    const password = document.getElementById('li-password').value || '';

    if (!username || !password) return errEl.textContent = 'Please fill in all fields.';

    errEl.textContent = 'Logging in…';

    // Get uid from username
    const usernames = await dbGet('/usernames');
    const userUid   = usernames && usernames[username.toLowerCase()];
    if (!userUid) return errEl.textContent = 'Username not found.';

    const user = await dbGet('/users/' + userUid);
    if (!user) return errEl.textContent = 'Account not found.';

    if (user.passwordHash !== hashPass(password)) return errEl.textContent = 'Incorrect password.';

    currentUser = user;
    saveSession(user);
    renderNav();
    ZapHiveAuth._closeAuth();
    showAuthToast('Welcome back, ' + user.username + '! ⚡');
  }

  // ── Profile Panel ────────────────────────────
  function openProfilePanel() {
    let panel = document.getElementById('zh-profile-panel');
    if (!panel) {
      panel = buildProfilePanel();
      document.body.appendChild(panel);
    }
    updateProfileContent();
    panel.classList.remove('zh-hidden');
  }

  function buildProfilePanel() {
    const panel = document.createElement('div');
    panel.id = 'zh-profile-panel';
    panel.style.cssText = `
      position:fixed;top:0;right:0;width:320px;max-width:95vw;height:100vh;
      background:var(--bg-card);border-left:1px solid var(--border);
      z-index:400;overflow-y:auto;display:flex;flex-direction:column;
      box-shadow:-4px 0 24px rgba(0,0,0,0.4)`;
    panel.innerHTML = `
      <div style="padding:1rem 1.2rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <span style="font-family:var(--font-display);font-size:0.82rem;color:var(--accent-cyan);letter-spacing:1px">MY PROFILE</span>
        <button onclick="document.getElementById('zh-profile-panel').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;line-height:1">✕</button>
      </div>
      <div id="zh-profile-body" style="flex:1;padding:1.2rem;display:flex;flex-direction:column;gap:1rem"></div>`;
    return panel;
  }

  function updateProfileContent() {
    const body = document.getElementById('zh-profile-body');
    if (!body || !currentUser) return;
    const u = currentUser;
    const isGuest = u.isGuest;
    const lvl  = getLevelFromZap(u.zap || 0);
    const pct  = zapProgressPercent(u.zap || 0);
    const nextZap = zapForLevel(lvl + 1);

    body.innerHTML = `
      <!-- Avatar -->
      <div style="text-align:center">
        <div id="profile-avatar-display" style="width:80px;height:80px;border-radius:50%;border:3px solid var(--accent-blue);margin:0 auto 0.6rem;background:var(--bg-section);display:flex;align-items:center;justify-content:center;font-size:2.5rem;overflow:hidden;cursor:pointer" onclick="ZapHiveAuth._openAvatarPicker()" title="Change avatar">
          ${getAvatarHtml(u.avatar, u.avatarType, 80)}
        </div>
        <div style="font-size:0.7rem;color:var(--text-muted)">Click to change avatar</div>
        <div style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:#fff;margin-top:0.5rem">${esc(u.username)}</div>
        ${isGuest ? `<div style="font-size:0.72rem;color:var(--accent-yellow);margin-top:0.2rem">Guest Account</div>` : ''}
      </div>

      ${isGuest ? `
      <!-- Guest upgrade prompt -->
      <div style="background:rgba(26,140,255,0.08);border:1px solid var(--border);border-radius:8px;padding:0.9rem;text-align:center">
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.6rem">Save your progress! Create a free account.</div>
        <button onclick="ZapHiveAuth.openAuth()" style="background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:0.45rem 1.2rem;font-family:var(--font-display);font-size:0.75rem;font-weight:700;cursor:pointer;letter-spacing:0.5px">Sign Up / Login</button>
      </div>` : ''}

      <!-- Level & Zap -->
      <div style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.9rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <span style="font-family:var(--font-display);font-size:0.78rem;color:var(--accent-yellow)">⚡ LEVEL ${lvl}</span>
          <span style="font-size:0.7rem;color:var(--text-muted)">${u.zap||0} / ${nextZap} ZAP</span>
        </div>
        <div style="background:rgba(26,140,255,0.12);border-radius:20px;height:8px;overflow:hidden">
          <div style="width:${pct}%;background:linear-gradient(90deg,var(--accent-blue),var(--accent-cyan));height:100%;border-radius:20px;transition:width 0.4s"></div>
        </div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:0.4rem">${nextZap - (u.zap||0)} ZAP to Level ${lvl+1}</div>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.7rem;text-align:center">
          <div style="font-family:var(--font-display);font-size:1.1rem;color:var(--accent-cyan)">${(u.playHistory||[]).length}</div>
          <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Games Played</div>
        </div>
        <div style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.7rem;text-align:center">
          <div style="font-family:var(--font-display);font-size:1.1rem;color:var(--accent-cyan)">${(u.likedGames||[]).length}</div>
          <div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Liked Games</div>
        </div>
      </div>

      ${!isGuest ? `
      <!-- Description -->
      <div>
        <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.4rem">About Me</div>
        <div id="desc-display" style="font-size:0.82rem;color:var(--text-white);background:var(--bg-section);border:1px solid var(--border);border-radius:6px;padding:0.6rem;min-height:40px;cursor:pointer" onclick="ZapHiveAuth._editDesc()" title="Click to edit">
          ${u.description ? esc(u.description) : '<span style="color:var(--text-muted)">Click to add a description…</span>'}
        </div>
      </div>

      <!-- Info -->
      <div style="font-size:0.78rem;color:var(--text-muted);display:flex;flex-direction:column;gap:0.3rem">
        ${!u.hideGender ? `<div>👤 ${esc(u.gender || 'N/A')}</div>` : ''}
        <div>📅 Joined ${esc(u.joinDate || '')}</div>
      </div>

      <!-- Play History -->
      ${(u.playHistory||[]).length > 0 ? `
      <div>
        <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem">Recent Games</div>
        <div style="display:flex;flex-direction:column;gap:0.3rem;max-height:150px;overflow-y:auto">
          ${(u.playHistory||[]).slice(0,10).map(p => `
            <a href="game.html?id=${esc(p.id)}" style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-section);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.6rem;text-decoration:none">
              <span style="font-size:0.78rem;color:var(--text-white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.title||p.id)}</span>
              <span style="font-size:0.65rem;color:var(--text-muted);flex-shrink:0;margin-left:0.4rem">${esc(p.date||'')}</span>
            </a>`).join('')}
        </div>
      </div>` : ''}

      <!-- Liked Games -->
      ${(u.likedGames||[]).length > 0 ? `
      <div>
        <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem">Liked Games</div>
        <div style="font-size:0.78rem;color:var(--accent-cyan)">${(u.likedGames||[]).length} game${(u.likedGames||[]).length!==1?'s':''} liked</div>
      </div>` : ''}
      ` : ''}

      <!-- Settings & Logout buttons -->
      <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:auto;padding-top:1rem;border-top:1px solid var(--border)">
        ${!isGuest ? `<button onclick="ZapHiveAuth._openSettings()" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.8rem;padding:0.5rem;cursor:pointer;text-align:left">⚙️ Settings</button>` : ''}
        ${!isGuest ? `<button onclick="ZapHiveAuth._logout()" style="background:transparent;border:1px solid rgba(255,77,109,0.3);border-radius:6px;color:#ff4d6d;font-size:0.8rem;padding:0.5rem;cursor:pointer;text-align:left">🚪 Logout</button>` : ''}
      </div>`;

    updateProfileStats();
  }

  function updateProfileStats() {
    // Just re-render if open
  }

  // ── Avatar picker ────────────────────────────
  ZapHiveAuth._openAvatarPicker = function() {
    let picker = document.getElementById('zh-avatar-picker');
    if (picker) { picker.classList.remove('zh-hidden'); return; }

    picker = document.createElement('div');
    picker.id = 'zh-avatar-picker';
    picker.style.cssText = 'position:fixed;inset:0;background:rgba(5,13,26,0.92);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem';
    picker.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:12px;padding:1.5rem;max-width:360px;width:100%">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <span style="font-family:var(--font-display);font-size:0.82rem;color:var(--accent-cyan)">CHOOSE AVATAR</span>
          <button onclick="document.getElementById('zh-avatar-picker').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer">✕</button>
        </div>

        <!-- Preset grid -->
        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px">Preset Avatars</div>
        <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:0.4rem;margin-bottom:1rem">
          ${PRESET_AVATARS.map(av => `
            <button onclick="ZapHiveAuth._setPresetAvatar('${av}')" style="width:100%;aspect-ratio:1;font-size:1.3rem;background:var(--bg-section);border:2px solid transparent;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color 0.15s" onmouseenter="this.style.borderColor='var(--accent-blue)'" onmouseleave="this.style.borderColor='transparent'">${av}</button>
          `).join('')}
        </div>

        <!-- Upload from PC -->
        <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px">Upload from PC</div>
        <label style="display:block;background:rgba(26,140,255,0.07);border:1px dashed var(--accent-blue);border-radius:6px;padding:0.7rem;text-align:center;cursor:pointer;font-size:0.8rem;color:var(--accent-blue)">
          📁 Choose Image (max 500KB, square preferred)
          <input type="file" id="avatar-file-input" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none">
        </label>
        <div id="avatar-upload-error" style="color:#ff4d6d;font-size:0.72rem;margin-top:0.4rem;min-height:1em"></div>
      </div>`;

    document.body.appendChild(picker);

    document.getElementById('avatar-file-input').addEventListener('change', handleAvatarUpload);
  };

  ZapHiveAuth._setPresetAvatar = async function(emoji) {
    if (!currentUser) return;
    currentUser.avatar     = emoji;
    currentUser.avatarType = 'preset';
    saveSession(currentUser);
    if (!currentUser.isGuest) {
      await dbPatch('/users/' + currentUser.uid, { avatar: emoji, avatarType: 'preset' });
    }
    renderNav();
    updateProfileContent();
    document.getElementById('zh-avatar-picker').classList.add('zh-hidden');
  };

  async function handleAvatarUpload(e) {
    const errEl = document.getElementById('avatar-upload-error');
    errEl.textContent = '';
    const file = e.target.files[0];
    if (!file) return;

    // Size check (500KB)
    if (file.size > 500 * 1024) {
      errEl.textContent = 'Image too large. Max 500KB.';
      e.target.value = '';
      return;
    }

    // Type check
    if (!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type)) {
      errEl.textContent = 'Invalid file type. Use PNG, JPG, GIF or WEBP.';
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async ev => {
      const base64 = ev.target.result;
      currentUser.avatar     = base64;
      currentUser.avatarType = 'image';
      saveSession(currentUser);
      if (!currentUser.isGuest) {
        await dbPatch('/users/' + currentUser.uid, { avatar: base64, avatarType: 'image' });
      }
      renderNav();
      updateProfileContent();
      document.getElementById('zh-avatar-picker').classList.add('zh-hidden');
    };
    reader.readAsDataURL(file);
  }

  // ── Edit Description ─────────────────────────
  ZapHiveAuth._editDesc = function() {
    const desc = currentUser?.description || '';
    const newDesc = prompt('Edit your description (max 120 chars):', desc);
    if (newDesc === null) return;
    const trimmed = newDesc.slice(0, 120);
    currentUser.description = trimmed;
    saveSession(currentUser);
    if (!currentUser.isGuest) {
      dbPatch('/users/' + currentUser.uid, { description: trimmed });
    }
    updateProfileContent();
  };

  // ── Settings Panel ───────────────────────────
  ZapHiveAuth._openSettings = function() {
    let s = document.getElementById('zh-settings-modal');
    if (s) { s.classList.remove('zh-hidden'); populateSettings(); return; }

    s = document.createElement('div');
    s.id = 'zh-settings-modal';
    s.style.cssText = 'position:fixed;inset:0;background:rgba(5,13,26,0.92);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem';
    s.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:12px;padding:1.5rem;max-width:360px;width:100%;max-height:90vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem">
          <span style="font-family:var(--font-display);font-size:0.82rem;color:var(--accent-cyan)">⚙️ SETTINGS</span>
          <button onclick="document.getElementById('zh-settings-modal').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer">✕</button>
        </div>

        <!-- Hide gender -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.8rem 0;border-bottom:1px solid var(--border)">
          <span style="font-size:0.82rem;color:var(--text-white)">Hide gender from others</span>
          <label style="position:relative;display:inline-block;width:40px;height:22px">
            <input type="checkbox" id="setting-hide-gender" style="opacity:0;width:0;height:0" onchange="ZapHiveAuth._toggleHideGender(this.checked)">
            <span id="gender-toggle-track" style="position:absolute;inset:0;background:var(--border);border-radius:22px;cursor:pointer;transition:background 0.2s"></span>
            <span id="gender-toggle-thumb" style="position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s"></span>
          </label>
        </div>

        <!-- Change gender -->
        <div style="padding:0.8rem 0;border-bottom:1px solid var(--border)">
          <div style="font-size:0.82rem;color:var(--text-white);margin-bottom:0.5rem">Gender</div>
          <select id="setting-gender" class="zh-input" onchange="ZapHiveAuth._updateGender(this.value)" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.45rem 0.7rem;color:var(--text-white);font-size:0.82rem">
            <option value="N/A">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <!-- Change password -->
        <div style="padding:0.8rem 0">
          <div style="font-size:0.82rem;color:var(--text-white);margin-bottom:0.7rem">Change Password</div>
          <form id="change-pass-form" action="javascript:void(0)" novalidate>
            <input type="password" id="cp-current" placeholder="Current password" maxlength="40" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.45rem 0.7rem;color:var(--text-white);font-size:0.82rem;margin-bottom:0.4rem">
            <input type="password" id="cp-new" placeholder="New password (min 6)" maxlength="40" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.45rem 0.7rem;color:var(--text-white);font-size:0.82rem;margin-bottom:0.4rem">
            <input type="password" id="cp-confirm" placeholder="Confirm new password" maxlength="40" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.45rem 0.7rem;color:var(--text-white);font-size:0.82rem;margin-bottom:0.4rem">
            <div id="cp-error" style="color:#ff4d6d;font-size:0.72rem;min-height:1em;margin-bottom:0.4rem"></div>
            <button type="submit" style="width:100%;background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:0.5rem;font-size:0.8rem;font-weight:700;cursor:pointer;font-family:var(--font-display)">Change Password</button>
          </form>
        </div>
      </div>`;

    document.body.appendChild(s);
    document.getElementById('change-pass-form').addEventListener('submit', handleChangePassword);
    populateSettings();
  };

  function populateSettings() {
    if (!currentUser) return;
    const hg = document.getElementById('setting-hide-gender');
    const tr = document.getElementById('gender-toggle-track');
    const th = document.getElementById('gender-toggle-thumb');
    const sg = document.getElementById('setting-gender');
    if (hg) {
      hg.checked = !!currentUser.hideGender;
      if (tr) tr.style.background = currentUser.hideGender ? 'var(--accent-blue)' : 'var(--border)';
      if (th) th.style.left = currentUser.hideGender ? '21px' : '3px';
    }
    if (sg) sg.value = currentUser.gender || 'N/A';
  }

  ZapHiveAuth._toggleHideGender = async function(val) {
    if (!currentUser) return;
    currentUser.hideGender = val;
    saveSession(currentUser);
    const tr = document.getElementById('gender-toggle-track');
    const th = document.getElementById('gender-toggle-thumb');
    if (tr) tr.style.background = val ? 'var(--accent-blue)' : 'var(--border)';
    if (th) th.style.left = val ? '21px' : '3px';
    if (!currentUser.isGuest) {
      await dbPatch('/users/' + currentUser.uid, { hideGender: val });
    }
  };

  ZapHiveAuth._updateGender = async function(val) {
    if (!currentUser) return;
    currentUser.gender = val;
    saveSession(currentUser);
    if (!currentUser.isGuest) {
      await dbPatch('/users/' + currentUser.uid, { gender: val });
    }
  };

  async function handleChangePassword(e) {
    e.preventDefault();
    const errEl   = document.getElementById('cp-error');
    errEl.textContent = '';
    const current = document.getElementById('cp-current').value || '';
    const newPass = document.getElementById('cp-new').value    || '';
    const confirm = document.getElementById('cp-confirm').value || '';

    if (!current)              return errEl.textContent = 'Enter your current password.';
    if (hashPass(current) !== currentUser.passwordHash) return errEl.textContent = 'Current password is incorrect.';
    if (newPass.length < 6)    return errEl.textContent = 'New password must be at least 6 characters.';
    if (newPass !== confirm)   return errEl.textContent = 'Passwords do not match.';

    currentUser.passwordHash = hashPass(newPass);
    saveSession(currentUser);
    await dbPatch('/users/' + currentUser.uid, { passwordHash: currentUser.passwordHash });
    errEl.style.color = '#00c853';
    errEl.textContent = 'Password changed successfully!';
    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value     = '';
    document.getElementById('cp-confirm').value = '';
    setTimeout(() => { errEl.textContent = ''; errEl.style.color = '#ff4d6d'; }, 3000);
  }

  // ── Logout ───────────────────────────────────
  ZapHiveAuth._logout = async function() {
    if (!confirm('Are you sure you want to logout?')) return;
    clearSession();
    document.getElementById('zh-profile-panel').classList.add('zh-hidden');
    await autoGuest();
    showAuthToast('Logged out. See you soon!');
  };

  // ── Toast ────────────────────────────────────
  function showAuthToast(msg) {
    let t = document.getElementById('zh-auth-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'zh-auth-toast';
      t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:var(--bg-card);border:1px solid var(--accent-cyan);border-radius:10px;padding:0.7rem 1.4rem;color:var(--text-white);font-size:0.85rem;z-index:700;white-space:nowrap;transition:opacity 0.3s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
  }

  // ── Start ────────────────────────────────────
  init();
})();
