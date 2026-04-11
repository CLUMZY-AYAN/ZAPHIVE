/* =============================================
   ZAPHIVE — FRIENDS.JS
   Friends, Chat, Online Status, Leaderboard
   ============================================= */
(function () {
  'use strict';

  const DB_URL = 'https://zaphive-736c0-default-rtdb.firebaseio.com';

  // ── Helpers ───────────────────────────────────
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function now()  { return Date.now(); }
  function tsNow(){ return new Date().toISOString(); }

  function getUser() {
    return window.ZapHiveAuth ? window.ZapHiveAuth.getCurrentUser() : null;
  }

  // ── Firebase helpers ──────────────────────────
  async function dbGet(path) {
    try {
      const r = await fetch(DB_URL + path + '.json');
      const d = await r.json();
      return d;
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

  async function dbDelete(path) {
    try {
      await fetch(DB_URL + path + '.json', { method: 'DELETE' });
    } catch(e) {}
  }

  // ── Online presence ───────────────────────────
  let presenceInterval = null;

  async function updatePresence(status, gameId = null, gameTitle = null) {
    const user = getUser();
    if (!user || user.isGuest) return;
    await dbSet('/presence/' + user.uid, {
      uid:       user.uid,
      username:  user.username,
      avatar:    user.avatar || '👾',
      avatarType:user.avatarType || 'preset',
      status,        // 'online' | 'playing' | 'offline'
      gameId:    gameId    || null,
      gameTitle: gameTitle || null,
      lastSeen:  now()
    });
  }

  function startPresence() {
    const user = getUser();
    if (!user || user.isGuest) return;
    updatePresence('online');
    presenceInterval = setInterval(() => updatePresence('online'), 30000);
    window.addEventListener('beforeunload', () => updatePresence('offline'));
  }

  // Expose so game.html can call it
  window.ZapHiveFriends = {
    setPlayingGame: (gameId, gameTitle) => updatePresence('playing', gameId, gameTitle),
    setOnline:      () => updatePresence('online'),
    openFriends:    () => openFriendsPanel(),
    openLeaderboard:() => openLeaderboard()
  };

  // ── Status ring color ─────────────────────────
  function statusColor(status) {
    if (status === 'playing') return '#1a8cff';
    if (status === 'online')  return '#00c853';
    return '#555';
  }

  function statusLabel(status) {
    if (status === 'playing') return '🎮 Playing';
    if (status === 'online')  return '🟢 Online';
    return '⚫ Offline';
  }

  function isOnline(lastSeen) {
    return lastSeen && (now() - lastSeen) < 60000; // 1 min
  }

  // ── Avatar HTML ───────────────────────────────
  function avatarHtml(avatar, avatarType, size, status) {
    const ring = statusColor(status);
    const inner = avatarType === 'image'
      ? `<img src="${esc(avatar)}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%">`
      : `<span style="font-size:${Math.floor(size*0.6)}px;line-height:1">${avatar||'👾'}</span>`;
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;border:2.5px solid ${ring};display:flex;align-items:center;justify-content:center;background:var(--bg-section);overflow:hidden;flex-shrink:0">${inner}</div>`;
  }

  // ── FRIENDS PANEL ─────────────────────────────
  let activeChatUid = null;
  let chatPollInterval = null;

  function openFriendsPanel() {
    const user = getUser();
    if (!user || user.isGuest) {
      showFriendToast('Sign up to use Friends! ✨');
      if (window.ZapHiveAuth) window.ZapHiveAuth.openAuth();
      return;
    }

    let panel = document.getElementById('zh-friends-panel');
    if (!panel) {
      panel = buildFriendsPanel();
      document.body.appendChild(panel);
    }
    panel.classList.remove('zh-hidden');
    loadFriendsTab('friends');
  }

  function buildFriendsPanel() {
    const panel = document.createElement('div');
    panel.id = 'zh-friends-panel';
    panel.style.cssText = `
      position:fixed;top:0;right:330px;width:300px;max-width:95vw;height:100vh;
      background:var(--bg-card);border-left:1px solid var(--border);
      z-index:399;display:flex;flex-direction:column;
      box-shadow:-4px 0 24px rgba(0,0,0,0.4)`;

    panel.innerHTML = `
      <!-- Header -->
      <div style="padding:0.9rem 1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
        <span style="font-family:var(--font-display);font-size:0.8rem;color:var(--accent-cyan);letter-spacing:1px">👥 FRIENDS</span>
        <button onclick="document.getElementById('zh-friends-panel').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer">✕</button>
      </div>

      <!-- Tabs -->
      <div style="display:flex;border-bottom:1px solid var(--border);flex-shrink:0">
        <button class="fp-tab active" data-tab="friends" style="flex:1;padding:0.55rem;font-size:0.72rem;font-weight:700;background:transparent;border:none;border-bottom:2px solid var(--accent-blue);color:var(--accent-blue);cursor:pointer;text-transform:uppercase;letter-spacing:0.5px">Friends</button>
        <button class="fp-tab" data-tab="requests" style="flex:1;padding:0.55rem;font-size:0.72rem;font-weight:700;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text-muted);cursor:pointer;text-transform:uppercase;letter-spacing:0.5px">Requests <span id="req-badge" style="background:#ff4d6d;color:#fff;border-radius:20px;padding:0.05rem 0.35rem;font-size:0.65rem;display:none">0</span></button>
        <button class="fp-tab" data-tab="search" style="flex:1;padding:0.55rem;font-size:0.72rem;font-weight:700;background:transparent;border:none;border-bottom:2px solid transparent;color:var(--text-muted);cursor:pointer;text-transform:uppercase;letter-spacing:0.5px">Search</button>
      </div>

      <!-- Body -->
      <div id="fp-body" style="flex:1;overflow-y:auto;padding:0.8rem"></div>

      <!-- Chat area (hidden by default) -->
      <div id="fp-chat" class="zh-hidden" style="display:flex;flex-direction:column;height:100%">
        <div style="padding:0.7rem 1rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:0.6rem;flex-shrink:0">
          <button onclick="closeChatPanel()" style="background:transparent;border:none;color:var(--text-muted);font-size:1rem;cursor:pointer">←</button>
          <div id="chat-header-info" style="flex:1;font-size:0.82rem;font-weight:700;color:var(--text-white)"></div>
        </div>
        <div id="chat-messages" style="flex:1;overflow-y:auto;padding:0.8rem;display:flex;flex-direction:column;gap:0.5rem"></div>
        <div style="padding:0.7rem;border-top:1px solid var(--border);display:flex;gap:0.5rem;flex-shrink:0">
          <input type="text" id="chat-input" placeholder="Message…" maxlength="200"
            style="flex:1;background:rgba(26,140,255,0.07);border:1px solid var(--border);border-radius:20px;padding:0.4rem 0.8rem;color:var(--text-white);font-size:0.82rem;outline:none"
            onkeydown="if(event.key==='Enter')window.ZhSendMsg()">
          <button onclick="window.ZhSendMsg()" style="background:var(--accent-blue);border:none;border-radius:20px;color:#fff;padding:0.4rem 0.9rem;font-size:0.78rem;font-weight:700;cursor:pointer">Send</button>
        </div>
      </div>`;

    // Tab switching
    panel.querySelectorAll('.fp-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.fp-tab').forEach(b => {
          b.style.borderBottom = '2px solid transparent';
          b.style.color = 'var(--text-muted)';
        });
        btn.style.borderBottom = '2px solid var(--accent-blue)';
        btn.style.color = 'var(--accent-blue)';
        loadFriendsTab(btn.dataset.tab);
      });
    });

    return panel;
  }

  window.closeChatPanel = function() {
    document.getElementById('fp-chat').classList.add('zh-hidden');
    document.getElementById('fp-body').style.display = '';
    clearInterval(chatPollInterval);
    activeChatUid = null;
  };

  // ── Friends Tab ───────────────────────────────
  async function loadFriendsTab(tab) {
    const body = document.getElementById('fp-body');
    const user = getUser();
    if (!body || !user) return;

    // Show/hide chat
    document.getElementById('fp-chat').classList.add('zh-hidden');
    body.style.display = '';

    if (tab === 'friends') {
      body.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">Loading…</div>';
      const friendsData = await dbGet('/friends/' + user.uid);
      const friends = friendsData ? Object.values(friendsData).filter(f => f.status === 'accepted') : [];

      if (!friends.length) {
        body.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.82rem">No friends yet.<br>Search for players to add!</div>';
        return;
      }

      body.innerHTML = '';
      for (const f of friends) {
        const presence = await dbGet('/presence/' + f.uid);
        const online   = presence && isOnline(presence.lastSeen);
        const status   = online ? (presence.status || 'online') : 'offline';
        body.appendChild(friendItem(f, status, presence));
      }

      // Check requests badge
      checkRequestsBadge();

    } else if (tab === 'requests') {
      body.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">Loading…</div>';
      const incoming = await dbGet('/friendRequests/' + user.uid + '/incoming');
      const reqs = incoming ? Object.values(incoming) : [];

      body.innerHTML = reqs.length ? '' : '<div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.82rem">No pending requests.</div>';
      reqs.forEach(req => body.appendChild(requestItem(req)));

    } else if (tab === 'search') {
      body.innerHTML = `
        <div style="margin-bottom:0.8rem">
          <input type="text" id="player-search-input" placeholder="Search username…" maxlength="13"
            style="width:100%;background:rgba(26,140,255,0.07);border:1px solid var(--border);border-radius:20px;padding:0.45rem 0.9rem;color:var(--text-white);font-size:0.82rem;outline:none"
            oninput="window.ZhSearchPlayers(this.value)">
        </div>
        <div id="player-search-results"></div>`;
    }
  }

  function friendItem(friend, status, presence) {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:0.7rem;padding:0.6rem;border-radius:8px;margin-bottom:0.4rem;background:var(--bg-section);border:1px solid var(--border);cursor:pointer';
    div.innerHTML = `
      ${avatarHtml(friend.avatar||'👾', friend.avatarType||'preset', 38, status)}
      <div style="flex:1;min-width:0">
        <div style="font-size:0.82rem;font-weight:700;color:var(--text-white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(friend.username)}</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">${statusLabel(status)}${status==='playing'&&presence?.gameTitle?' · '+esc(presence.gameTitle):''}</div>
      </div>
      <div style="display:flex;gap:0.3rem">
        <button title="Chat" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--accent-blue);font-size:0.7rem;padding:0.22rem 0.5rem;cursor:pointer" onclick="event.stopPropagation();window.ZhOpenChat('${friend.uid}','${esc(friend.username)}','${esc(friend.avatar||'👾')}','${friend.avatarType||'preset'}')">💬</button>
        <button title="Block" style="background:transparent;border:1px solid rgba(255,77,109,0.3);border-radius:6px;color:#ff4d6d;font-size:0.7rem;padding:0.22rem 0.5rem;cursor:pointer" onclick="event.stopPropagation();window.ZhBlockUser('${friend.uid}','${esc(friend.username)}')">🚫</button>
      </div>`;
    div.addEventListener('click', () => viewPlayerProfile(friend.uid));
    return div;
  }

  function requestItem(req) {
    const div = document.createElement('div');
    div.id = 'req-' + req.fromUid;
    div.style.cssText = 'display:flex;align-items:center;gap:0.7rem;padding:0.6rem;border-radius:8px;margin-bottom:0.4rem;background:var(--bg-section);border:1px solid var(--border)';
    div.innerHTML = `
      ${avatarHtml(req.avatar||'👾', req.avatarType||'preset', 36, 'offline')}
      <div style="flex:1;min-width:0">
        <div style="font-size:0.82rem;font-weight:700;color:var(--text-white)">${esc(req.username)}</div>
        <div style="font-size:0.68rem;color:var(--text-muted)">Friend request</div>
      </div>
      <div style="display:flex;gap:0.3rem">
        <button style="background:var(--accent-blue);border:none;border-radius:6px;color:#fff;font-size:0.7rem;padding:0.25rem 0.6rem;cursor:pointer;font-weight:700" onclick="window.ZhAcceptRequest('${req.fromUid}','${esc(req.username)}','${esc(req.avatar||'👾')}','${req.avatarType||'preset'}')">✓</button>
        <button style="background:transparent;border:1px solid rgba(255,77,109,0.3);border-radius:6px;color:#ff4d6d;font-size:0.7rem;padding:0.25rem 0.6rem;cursor:pointer" onclick="window.ZhDeclineRequest('${req.fromUid}')">✗</button>
      </div>`;
    return div;
  }

  async function checkRequestsBadge() {
    const user = getUser();
    if (!user) return;
    const incoming = await dbGet('/friendRequests/' + user.uid + '/incoming');
    const count = incoming ? Object.keys(incoming).length : 0;
    const badge = document.getElementById('req-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline' : 'none';
    }
  }

  // ── Player search ────────────────────────────
  window.ZhSearchPlayers = async function(query) {
    const results = document.getElementById('player-search-results');
    if (!results) return;
    const q = query.trim().toLowerCase();
    if (q.length < 2) { results.innerHTML = ''; return; }

    results.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:0.8rem">Searching…</div>';

    const usernames = await dbGet('/usernames');
    if (!usernames) { results.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;text-align:center">No results.</div>'; return; }

    const user = getUser();
    const matches = Object.entries(usernames)
      .filter(([name]) => name.includes(q) && name !== user.username.toLowerCase())
      .slice(0, 8);

    if (!matches.length) { results.innerHTML = '<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:0.8rem">No players found.</div>'; return; }

    results.innerHTML = '';
    for (const [, uid] of matches) {
      const p = await dbGet('/users/' + uid);
      if (!p) continue;

      // Check existing friendship
      const existing = await dbGet('/friends/' + user.uid + '/' + uid);
      const sentReq   = await dbGet('/friendRequests/' + uid + '/incoming/' + user.uid);
      const blocked   = await dbGet('/blocked/' + user.uid + '/' + uid);

      let actionBtn = '';
      if (blocked) {
        actionBtn = `<button style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.7rem;padding:0.22rem 0.6rem;cursor:pointer" onclick="window.ZhUnblock('${uid}','${esc(p.username)}')">Unblock</button>`;
      } else if (existing && existing.status === 'accepted') {
        actionBtn = `<span style="font-size:0.7rem;color:#00c853">✓ Friends</span>`;
      } else if (sentReq) {
        actionBtn = `<span style="font-size:0.7rem;color:var(--text-muted)">Sent</span>`;
      } else {
        actionBtn = `<button style="background:var(--accent-blue);border:none;border-radius:6px;color:#fff;font-size:0.7rem;padding:0.22rem 0.6rem;cursor:pointer;font-weight:700" onclick="window.ZhSendRequest('${uid}','${esc(p.username)}','${esc(p.avatar||'👾')}','${p.avatarType||'preset'}',this)">+ Add</button>`;
      }

      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:0.7rem;padding:0.6rem;border-radius:8px;margin-bottom:0.4rem;background:var(--bg-section);border:1px solid var(--border);cursor:pointer';
      item.innerHTML = `
        ${avatarHtml(p.avatar||'👾', p.avatarType||'preset', 36, 'offline')}
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;font-weight:700;color:var(--text-white)">${esc(p.username)}</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">Level ${p.level||1} · ${p.zap||0} ZAP</div>
        </div>
        ${actionBtn}`;
      item.addEventListener('click', e => { if (e.target.tagName !== 'BUTTON') viewPlayerProfile(uid); });
      results.appendChild(item);
    }
  };

  // ── Send friend request ───────────────────────
  window.ZhSendRequest = async function(toUid, toUsername, toAvatar, toAvatarType, btn) {
    const user = getUser();
    if (!user) return;
    btn.textContent = '…';
    btn.disabled = true;

    await dbSet('/friendRequests/' + toUid + '/incoming/' + user.uid, {
      fromUid:    user.uid,
      username:   user.username,
      avatar:     user.avatar || '👾',
      avatarType: user.avatarType || 'preset',
      sentAt:     tsNow()
    });

    // Mark as pending on sender side
    await dbSet('/friends/' + user.uid + '/' + toUid, {
      uid: toUid, username: toUsername, avatar: toAvatar, avatarType: toAvatarType, status: 'pending'
    });

    btn.textContent = 'Sent';
    showFriendToast('Friend request sent to ' + toUsername + '!');
  };

  // ── Accept request ────────────────────────────
  window.ZhAcceptRequest = async function(fromUid, fromUsername, fromAvatar, fromAvatarType) {
    const user = getUser();
    if (!user) return;

    // Add to both friends lists
    await dbSet('/friends/' + user.uid + '/' + fromUid, {
      uid: fromUid, username: fromUsername, avatar: fromAvatar, avatarType: fromAvatarType, status: 'accepted'
    });
    await dbSet('/friends/' + fromUid + '/' + user.uid, {
      uid: user.uid, username: user.username, avatar: user.avatar||'👾', avatarType: user.avatarType||'preset', status: 'accepted'
    });

    // Remove request
    await dbDelete('/friendRequests/' + user.uid + '/incoming/' + fromUid);

    document.getElementById('req-' + fromUid)?.remove();
    showFriendToast('You and ' + fromUsername + ' are now friends! 🎉');
    checkRequestsBadge();
  };

  // ── Decline request ───────────────────────────
  window.ZhDeclineRequest = async function(fromUid) {
    const user = getUser();
    if (!user) return;
    await dbDelete('/friendRequests/' + user.uid + '/incoming/' + fromUid);
    document.getElementById('req-' + fromUid)?.remove();
  };

  // ── Block user ────────────────────────────────
  window.ZhBlockUser = async function(targetUid, targetUsername) {
    const user = getUser();
    if (!user) return;
    if (!confirm('Block ' + targetUsername + '? They won\'t be able to send you requests.')) return;
    await dbSet('/blocked/' + user.uid + '/' + targetUid, { uid: targetUid, username: targetUsername });
    await dbDelete('/friends/' + user.uid + '/' + targetUid);
    await dbDelete('/friends/' + targetUid + '/' + user.uid);
    showFriendToast(targetUsername + ' has been blocked.');
    loadFriendsTab('friends');
  };

  window.ZhUnblock = async function(targetUid, targetUsername) {
    const user = getUser();
    if (!user) return;
    await dbDelete('/blocked/' + user.uid + '/' + targetUid);
    showFriendToast(targetUsername + ' unblocked.');
    window.ZhSearchPlayers(document.getElementById('player-search-input')?.value || '');
  };

  // ── Chat ──────────────────────────────────────
  window.ZhOpenChat = async function(friendUid, friendUsername, friendAvatar, friendAvatarType) {
    const user = getUser();
    if (!user) return;
    activeChatUid = friendUid;

    const body    = document.getElementById('fp-body');
    const chatDiv = document.getElementById('fp-chat');
    if (!body || !chatDiv) return;

    body.style.display = 'none';
    chatDiv.classList.remove('zh-hidden');
    chatDiv.style.display = 'flex';

    document.getElementById('chat-header-info').innerHTML = `
      ${avatarHtml(friendAvatar, friendAvatarType, 28, 'online')}
      <span style="margin-left:0.4rem">${esc(friendUsername)}</span>`;

    await loadMessages(friendUid);
    clearInterval(chatPollInterval);
    chatPollInterval = setInterval(() => loadMessages(friendUid), 4000);
    document.getElementById('chat-input')?.focus();
  };

  function chatKey(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
  }

  async function loadMessages(friendUid) {
    const user = getUser();
    if (!user || activeChatUid !== friendUid) return;
    const key  = chatKey(user.uid, friendUid);
    const msgs = await dbGet('/chats/' + key);
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const arr = msgs ? Object.values(msgs).sort((a,b) => a.ts - b.ts) : [];
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;

    container.innerHTML = arr.length ? '' : '<div style="text-align:center;color:var(--text-muted);font-size:0.78rem;padding:1rem">Say hi! 👋</div>';

    arr.forEach(msg => {
      const isMe = msg.fromUid === user.uid;
      const bubble = document.createElement('div');
      bubble.style.cssText = `display:flex;flex-direction:column;align-items:${isMe?'flex-end':'flex-start'}`;
      bubble.innerHTML = `
        <div style="max-width:80%;background:${isMe?'var(--accent-blue)':'var(--bg-section)'};border:1px solid ${isMe?'var(--accent-blue)':'var(--border)'};border-radius:${isMe?'12px 12px 2px 12px':'12px 12px 12px 2px'};padding:0.45rem 0.7rem;font-size:0.82rem;color:#fff;word-break:break-word">${esc(msg.text)}</div>
        <div style="font-size:0.62rem;color:var(--text-muted);margin-top:0.15rem">${new Date(msg.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>`;
      container.appendChild(bubble);
    });

    if (atBottom) container.scrollTop = container.scrollHeight;
  }

  window.ZhSendMsg = async function() {
    const user  = getUser();
    const input = document.getElementById('chat-input');
    if (!user || !activeChatUid || !input) return;
    const text = input.value.trim();
    if (!text) return;

    const key  = chatKey(user.uid, activeChatUid);
    const msgId = 'm_' + now();
    await dbSet('/chats/' + key + '/' + msgId, {
      fromUid:  user.uid,
      fromName: user.username,
      text,
      ts: now()
    });
    input.value = '';
    await loadMessages(activeChatUid);
  };

  // ── View player profile ───────────────────────
  async function viewPlayerProfile(uid) {
    const p = await dbGet('/users/' + uid);
    if (!p) return;
    const presence = await dbGet('/presence/' + uid);
    const online   = presence && isOnline(presence.lastSeen);
    const status   = online ? (presence.status||'online') : 'offline';

    let modal = document.getElementById('zh-player-profile-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'zh-player-profile-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,13,26,0.88);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem';
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('zh-hidden'); });
      document.body.appendChild(modal);
    }

    const user    = getUser();
    const isFriend= user ? await dbGet('/friends/' + user.uid + '/' + uid) : null;
    const isBlocked = user ? await dbGet('/blocked/' + user.uid + '/' + uid) : null;

    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:12px;padding:1.5rem;max-width:320px;width:100%;max-height:85vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem">
          <span style="font-family:var(--font-display);font-size:0.78rem;color:var(--accent-cyan)">PLAYER PROFILE</span>
          <button onclick="document.getElementById('zh-player-profile-modal').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer">✕</button>
        </div>

        <div style="text-align:center;margin-bottom:1rem">
          <div style="margin:0 auto 0.5rem;width:64px;height:64px">
            ${avatarHtml(p.avatar||'👾', p.avatarType||'preset', 64, status)}
          </div>
          <div style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:#fff">${esc(p.username)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.2rem">${statusLabel(status)}</div>
        </div>

        <div style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.8rem;margin-bottom:0.8rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem">
            <span style="font-family:var(--font-display);font-size:0.75rem;color:var(--accent-yellow)">⚡ LEVEL ${p.level||1}</span>
            <span style="font-size:0.7rem;color:var(--text-muted)">${p.zap||0} ZAP</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-top:0.5rem">
            <div style="text-align:center"><div style="font-family:var(--font-display);font-size:1rem;color:var(--accent-cyan)">${(p.playHistory||[]).length}</div><div style="font-size:0.65rem;color:var(--text-muted)">Games Played</div></div>
            <div style="text-align:center"><div style="font-family:var(--font-display);font-size:1rem;color:var(--accent-cyan)">${(p.likedGames||[]).length}</div><div style="font-size:0.65rem;color:var(--text-muted)">Liked</div></div>
          </div>
        </div>

        ${p.description ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.8rem;padding:0.6rem;background:var(--bg-section);border:1px solid var(--border);border-radius:6px">${esc(p.description)}</div>` : ''}
        ${!p.hideGender ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.8rem">👤 ${esc(p.gender||'N/A')}</div>` : ''}

        ${user && uid !== user.uid ? `
        <div style="display:flex;gap:0.5rem">
          ${isFriend && isFriend.status === 'accepted'
            ? `<button onclick="window.ZhOpenChat('${uid}','${esc(p.username)}','${esc(p.avatar||'👾')}','${p.avatarType||'preset'}')" style="flex:1;background:var(--accent-blue);border:none;border-radius:6px;color:#fff;font-size:0.78rem;font-weight:700;padding:0.5rem;cursor:pointer">💬 Chat</button>`
            : `<button onclick="window.ZhSendRequest('${uid}','${esc(p.username)}','${esc(p.avatar||'👾')}','${p.avatarType||'preset'}',this)" style="flex:1;background:var(--accent-blue);border:none;border-radius:6px;color:#fff;font-size:0.78rem;font-weight:700;padding:0.5rem;cursor:pointer">+ Add Friend</button>`
          }
          ${!isBlocked
            ? `<button onclick="window.ZhBlockUser('${uid}','${esc(p.username)}')" style="background:transparent;border:1px solid rgba(255,77,109,0.3);border-radius:6px;color:#ff4d6d;font-size:0.78rem;padding:0.5rem;cursor:pointer">🚫</button>`
            : `<button onclick="window.ZhUnblock('${uid}','${esc(p.username)}')" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.78rem;padding:0.5rem;cursor:pointer">Unblock</button>`
          }
        </div>` : ''}
      </div>`;

    modal.classList.remove('zh-hidden');
  }

  // ── LEADERBOARD ───────────────────────────────
  async function openLeaderboard() {
    let modal = document.getElementById('zh-leaderboard-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'zh-leaderboard-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(5,13,26,0.88);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem';
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('zh-hidden'); });
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:12px;padding:1.5rem;max-width:360px;width:100%;max-height:85vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem">
          <span style="font-family:var(--font-display);font-size:0.9rem;color:var(--accent-yellow)">🏆 LEADERBOARD</span>
          <button onclick="document.getElementById('zh-leaderboard-modal').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer">✕</button>
        </div>
        <div id="lb-content"><div style="text-align:center;color:var(--text-muted);padding:1.5rem">Loading…</div></div>
      </div>`;

    modal.classList.remove('zh-hidden');

    // Load top 10 users by zap
    const users = await dbGet('/users');
    if (!users) {
      document.getElementById('lb-content').innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1rem">No players yet.</div>';
      return;
    }

    const sorted = Object.values(users)
      .filter(u => !u.isGuest)
      .sort((a, b) => (b.zap||0) - (a.zap||0))
      .slice(0, 10);

    const currentUser = getUser();
    const medals = ['🥇','🥈','🥉'];
    const lbContent = document.getElementById('lb-content');
    lbContent.innerHTML = '';

    sorted.forEach((u, i) => {
      const isMe = currentUser && u.uid === currentUser.uid;
      const item = document.createElement('div');
      item.style.cssText = `display:flex;align-items:center;gap:0.7rem;padding:0.65rem;border-radius:8px;margin-bottom:0.4rem;background:${isMe?'rgba(26,140,255,0.1)':'var(--bg-section)'};border:1px solid ${isMe?'var(--accent-blue)':'var(--border)'}`;
      item.innerHTML = `
        <div style="width:24px;text-align:center;font-size:${i<3?'1.1rem':'0.82rem'};color:${i<3?'':'var(--text-muted)'};font-weight:700;flex-shrink:0">${i<3?medals[i]:i+1}</div>
        ${avatarHtml(u.avatar||'👾', u.avatarType||'preset', 36, 'offline')}
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;font-weight:700;color:${isMe?'var(--accent-cyan)':'var(--text-white)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(u.username)}${isMe?' (You)':''}</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">Level ${u.level||1}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:var(--font-display);font-size:0.82rem;color:var(--accent-yellow)">⚡${u.zap||0}</div>
          <div style="font-size:0.65rem;color:var(--text-muted)">ZAP</div>
        </div>`;
      lbContent.appendChild(item);
    });

    if (!sorted.length) {
      lbContent.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1rem">No players yet.</div>';
    }
  }

  // ── Toast ─────────────────────────────────────
  function showFriendToast(msg) {
    let t = document.getElementById('zh-friend-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'zh-friend-toast';
      t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:var(--bg-card);border:1px solid var(--accent-cyan);border-radius:10px;padding:0.7rem 1.4rem;color:var(--text-white);font-size:0.85rem;z-index:700;white-space:nowrap;transition:opacity 0.3s;pointer-events:none';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
  }

  // ── Init ──────────────────────────────────────
  function init() {
    // Wait for auth to be ready
    const tryStart = setInterval(() => {
      if (window.ZapHiveAuth && window.ZapHiveAuth.getCurrentUser()) {
        clearInterval(tryStart);
        startPresence();
        checkRequestsBadge();
      }
    }, 500);
  }

  init();
})();
