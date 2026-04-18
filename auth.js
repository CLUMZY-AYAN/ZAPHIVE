/* =============================================
   ZAPHIVE — AUTH.JS v3
   Roles, Credits, Transactions, Dev userId check
   ============================================= */
(function () {
  'use strict';

  const DB_URL       = 'https://zaphive-736c0-default-rtdb.firebaseio.com';
  const DEV_USER_ID  = 'CLUMZY_DEV_UID_001';
  const DEV_USERNAME = 'CLUMZY';
  const DEV_CODE     = 'CLUMZY1357';

  const ROLE_META = {
    dev:   { label:'⚡ DEV',   color:'#ffd600', bg:'rgba(255,214,0,0.15)'  },
    admin: { label:'🛡 ADMIN', color:'#00cfff', bg:'rgba(0,207,255,0.15)'  },
    mod:   { label:'🔨 MOD',   color:'#00c853', bg:'rgba(0,200,83,0.15)'   },
    user:  { label:'',         color:'',         bg:''                      },
    guest: { label:'',         color:'',         bg:''                      }
  };

  const PRESET_AVATARS = ['🎮','⚡','🔥','💀','🐉','🦊','🐺','🎯','🚀','💎','🌙','⚔️','🛡️','🎲','🏆','👾'];

  function zapForLevel(l){ return Math.floor(20*l+10*l*(l-1)); }
  function getLevelFromZap(z){ let l=1; while(zapForLevel(l+1)<=z) l++; return l; }
  function zapPct(z){ const l=getLevelFromZap(z),c=zapForLevel(l),n=zapForLevel(l+1); return Math.min(100,Math.round(((z-c)/(n-c))*100)); }

  let currentUser=null;

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function genUid(){ return 'u_'+Math.random().toString(36).slice(2,11)+Date.now().toString(36); }
  function today(){ return new Date().toISOString().split('T')[0]; }
  function hashPass(p){ let h=0; for(let i=0;i<p.length;i++) h=(Math.imul(31,h)+p.charCodeAt(i))|0; return 'h_'+Math.abs(h).toString(16); }
  function hasEmoji(s){ return /\p{Emoji}/u.test(s); }
  function calcAge(b){ const bd=new Date(b),n=new Date(); let a=n.getFullYear()-bd.getFullYear(); if(n<new Date(n.getFullYear(),bd.getMonth(),bd.getDate())) a--; return a; }

  async function dbGet(p){ try{ const r=await fetch(DB_URL+p+'.json'); return await r.json(); }catch(e){ return null; } }
  async function dbSet(p,d){ try{ await fetch(DB_URL+p+'.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); }catch(e){} }
  async function dbPatch(p,d){ try{ await fetch(DB_URL+p+'.json',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); }catch(e){} }

  // ── Transaction logger ────────────────────────
  async function logTransaction(userId, type, items, reason, givenBy) {
    const txId = 'tx_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
    const tx = { transactionId:txId, userId, givenBy:givenBy||'system', type, items:items||{}, reason:reason||'', timestamp:Date.now() };
    await dbSet('/transactions/'+txId, tx);
    await dbSet('/users/'+userId+'/transactions/'+txId, { type, timestamp:Date.now() });
    return txId;
  }

  async function awardZap(userId, amount, reason) {
    const u = userId===currentUser?.uid ? currentUser : await dbGet('/users/'+userId);
    if (!u) return;
    const nz=( u.zap||0)+amount, nl=getLevelFromZap(nz);
    await dbPatch('/users/'+userId, { zap:nz, level:nl });
    await logTransaction(userId,'zap_reward',{zap:amount},reason,'system');
    if (userId===currentUser?.uid) { currentUser.zap=nz; currentUser.level=nl; saveSession(currentUser); }
  }

  async function awardCredits(userId, amount, reason, givenBy) {
    const u = userId===currentUser?.uid ? currentUser : await dbGet('/users/'+userId);
    if (!u) return;
    const nc=(u.credits||0)+amount;
    await dbPatch('/users/'+userId, { credits:nc });
    await logTransaction(userId,'credit_reward',{credits:amount},reason,givenBy||'system');
    if (userId===currentUser?.uid) { currentUser.credits=nc; saveSession(currentUser); updateCurrencyDisplay(); }
  }

  function saveSession(u){ localStorage.setItem('zh_user',JSON.stringify(u)); }
  function loadSession(){ try{ const s=localStorage.getItem('zh_user'); return s?JSON.parse(s):null; }catch(e){ return null; } }
  function clearSession(){ localStorage.removeItem('zh_user'); }

  async function autoGuest() {
    const guest={uid:'guest_'+Math.random().toString(36).slice(2,9),username:'Guest',isGuest:true,role:'guest',avatar:'👾',avatarType:'preset',zap:0,credits:0,level:1,description:'',gender:'N/A',hideGender:false,birthday:'',likedGames:[],dislikedGames:[],favorites:{},recentlyPlayed:[],joinDate:today(),passwordHash:'',owned:{frames:[],themes:[],nameColors:[]}};
    currentUser=guest; saveSession(guest); renderNav(); return guest;
  }

  async function isUsernameTaken(u){ const uns=await dbGet('/usernames'); return !!(uns&&uns[u.toLowerCase()]); }
  async function registerUsername(u,id){ await dbSet('/usernames/'+u.toLowerCase(),id); }

  function roleBadgeHtml(role){
    const m=ROLE_META[role]; if(!m||!m.label) return '';
    return `<span style="font-size:0.62rem;font-weight:800;padding:0.12rem 0.45rem;border-radius:20px;background:${m.bg};color:${m.color};letter-spacing:0.4px;text-transform:uppercase">${m.label}</span>`;
  }

  function getAvatarHtml(avatar,type,size){
    if(!avatar) return '👾';
    if(type==='image') return `<img src="${esc(avatar)}" style="width:${size}px;height:${size}px;object-fit:cover;border-radius:50%" alt="avatar">`;
    return avatar;
  }

  function renderNav(){
    const wrap=document.getElementById('nav-user-wrap');
    if(!wrap||!currentUser) return;
    const isGuest=currentUser.isGuest;
    const role=currentUser.role||'user';
    const meta=ROLE_META[role]||ROLE_META.user;
    const ringColor=meta.color||'var(--accent-blue)';
    wrap.innerHTML=`
      <div id="nav-profile-trigger" style="display:flex;align-items:center;gap:0.45rem;cursor:pointer;padding:0.2rem 0.5rem;border-radius:20px;transition:background 0.18s" onmouseenter="this.style.background='rgba(26,140,255,0.1)'" onmouseleave="this.style.background='transparent'">
        ${isGuest
          ?`<span style="font-size:0.75rem;color:var(--text-muted)">Guest</span>`
          :`<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.1rem">
              <span style="font-size:0.78rem;font-weight:700;color:${ringColor};max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(currentUser.username)}</span>
              ${meta.label?`<span style="font-size:0.58rem;font-weight:800;color:${meta.color};letter-spacing:0.5px">${meta.label}</span>`:''}
            </div>`}
        <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;border:2.5px solid ${ringColor};flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--bg-card);font-size:1.1rem">${getAvatarHtml(currentUser.avatar,currentUser.avatarType,30)}</div>
      </div>`;
    document.getElementById('nav-profile-trigger').addEventListener('click',openProfilePanel);
    updateCurrencyDisplay();
  }

  function updateCurrencyDisplay(){
    const ze=document.getElementById('nav-zap'); const ce=document.getElementById('nav-credits');
    if(ze&&currentUser) ze.textContent=currentUser.zap||0;
    if(ce&&currentUser) ce.textContent=currentUser.credits||0;
  }

  window.ZapHiveAuth={
    getCurrentUser:()=>currentUser,
    isLoggedIn:()=>currentUser&&!currentUser.isGuest,
    isGuest:()=>!currentUser||currentUser.isGuest,
    getRole:()=>currentUser?.role||'guest',
    isDev:()=>currentUser?.role==='dev',
    isAdminOrAbove:()=>['dev','admin'].includes(currentUser?.role),
    isModOrAbove:()=>['dev','admin','mod'].includes(currentUser?.role),
    roleBadgeHtml,getAvatarHtml,ROLE_META,DEV_USER_ID,DEV_CODE,
    openAuth:()=>{ buildAuthUI(); document.getElementById('zh-auth-modal')?.classList.remove('zh-hidden'); },
    awardZap,awardCredits,logTransaction,

    onLike: async(gameId)=>{
      if(!currentUser||currentUser.isGuest) return false;
      if(!currentUser.likedGames) currentUser.likedGames=[];
      if(currentUser.likedGames.includes(gameId)) return false;
      currentUser.likedGames.push(gameId);
      await awardZap(currentUser.uid,5,'Liked a game');
      saveSession(currentUser);
      if(!currentUser.isGuest) await dbPatch('/users/'+currentUser.uid,{likedGames:currentUser.likedGames});
      return true;
    },

    onPlayGame: async(gameId,gameTitle)=>{
      if(!currentUser) return;
      if(!currentUser.recentlyPlayed) currentUser.recentlyPlayed=[];
      currentUser.recentlyPlayed=currentUser.recentlyPlayed.filter(p=>p.id!==gameId);
      currentUser.recentlyPlayed.unshift({id:gameId,title:gameTitle,date:today(),ts:Date.now()});
      if(currentUser.recentlyPlayed.length>10) currentUser.recentlyPlayed=currentUser.recentlyPlayed.slice(0,10);
      saveSession(currentUser);
      if(!currentUser.isGuest){ await dbPatch('/users/'+currentUser.uid,{recentlyPlayed:currentUser.recentlyPlayed}); await awardZap(currentUser.uid,3,'Played a game'); }
    },

    toggleFavorite: async(gameId)=>{
      if(!currentUser||currentUser.isGuest) return false;
      if(!currentUser.favorites) currentUser.favorites={};
      const isFav=!!currentUser.favorites[gameId];
      if(isFav) delete currentUser.favorites[gameId]; else currentUser.favorites[gameId]=true;
      saveSession(currentUser);
      if(!currentUser.isGuest) await dbPatch('/users/'+currentUser.uid,{favorites:currentUser.favorites});
      return !isFav;
    },

    isFavorite:(gameId)=>!!(currentUser?.favorites?.[gameId]),

    assignRole: async(targetUid,newRole)=>{
      if(!currentUser||currentUser.role!=='dev') return false;
      await dbPatch('/users/'+targetUid,{role:newRole});
      await logTransaction(targetUid,'role_change',{role:newRole},'Role assigned by dev',currentUser.uid);
      return true;
    }
  };

  async function init(){
    const session=loadSession();
    if(session&&session.uid&&!session.isGuest){
      const fresh=await dbGet('/users/'+session.uid);
      currentUser=fresh||session;
    } else { await autoGuest(); return; }
    renderNav(); buildAuthUI();
  }

  function buildAuthUI(){
    if(document.getElementById('zh-auth-modal')) return;
    const modal=document.createElement('div');
    modal.id='zh-auth-modal'; modal.className='zh-hidden';
    modal.style.cssText='position:fixed;inset:0;background:rgba(5,13,26,0.92);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem';
    modal.innerHTML=`
      <div style="background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:12px;padding:2rem;max-width:380px;width:100%;max-height:90vh;overflow-y:auto">
        <div style="text-align:center;margin-bottom:1.5rem"><div style="font-family:var(--font-display);font-size:1.4rem;font-weight:900"><span style="color:var(--accent-yellow)">⚡Zap</span><span style="color:var(--accent-cyan)">Hive</span></div></div>
        <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem">
          <button id="tab-signup" onclick="ZapHiveAuth._switchTab('signup')" style="flex:1;padding:0.5rem;border-radius:6px;font-size:0.82rem;font-weight:700;background:var(--accent-blue);color:#fff;border:none;cursor:pointer">Sign Up</button>
          <button id="tab-login"  onclick="ZapHiveAuth._switchTab('login')"  style="flex:1;padding:0.5rem;border-radius:6px;font-size:0.82rem;font-weight:700;background:transparent;color:var(--text-muted);border:1px solid var(--border);cursor:pointer">Login</button>
        </div>
        <form id="zh-signup-form" action="javascript:void(0)" novalidate>
          <div class="zh-field"><label class="zh-label">Username (max 13, no emojis)</label><input type="text" id="su-username" class="zh-input" placeholder="CoolPlayer" maxlength="13" autocomplete="off"></div>
          <div class="zh-field"><label class="zh-label">Password</label><input type="password" id="su-password" class="zh-input" placeholder="••••••••" maxlength="40"></div>
          <div class="zh-field"><label class="zh-label">Confirm Password</label><input type="password" id="su-confirm" class="zh-input" placeholder="••••••••" maxlength="40"></div>
          <div class="zh-field"><label class="zh-label">Birthday</label><input type="date" id="su-birthday" class="zh-input"></div>
          <div class="zh-field"><label class="zh-label">Gender</label><select id="su-gender" class="zh-input"><option value="N/A">Prefer not to say</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
          <div id="su-error" style="color:#ff4d6d;font-size:0.78rem;margin-bottom:0.7rem;min-height:1em"></div>
          <button type="submit" style="width:100%;background:var(--accent-blue);color:#fff;font-family:var(--font-display);font-size:0.82rem;font-weight:700;padding:0.65rem;border-radius:6px;border:none;cursor:pointer">Create Account</button>
          <p style="text-align:center;margin-top:1rem;font-size:0.75rem;color:var(--text-muted)">Guest progress carries over ✅</p>
        </form>
        <form id="zh-login-form" action="javascript:void(0)" novalidate style="display:none">
          <div class="zh-field"><label class="zh-label">Username</label><input type="text" id="li-username" class="zh-input" placeholder="YourUsername" maxlength="13" autocomplete="off"></div>
          <div class="zh-field"><label class="zh-label">Password</label><input type="password" id="li-password" class="zh-input" placeholder="••••••••" maxlength="40"></div>
          <div id="li-error" style="color:#ff4d6d;font-size:0.78rem;margin-bottom:0.7rem;min-height:1em"></div>
          <button type="submit" style="width:100%;background:var(--accent-blue);color:#fff;font-family:var(--font-display);font-size:0.82rem;font-weight:700;padding:0.65rem;border-radius:6px;border:none;cursor:pointer">Login</button>
        </form>
        <button onclick="ZapHiveAuth._closeAuth()" style="display:block;width:100%;margin-top:1rem;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.78rem;padding:0.4rem;cursor:pointer">Continue as Guest</button>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('zh-signup-form').addEventListener('submit',handleSignup);
    document.getElementById('zh-login-form').addEventListener('submit',handleLogin);
  }

  ZapHiveAuth._switchTab=function(tab){
    const su=document.getElementById('zh-signup-form'),li=document.getElementById('zh-login-form');
    const ts=document.getElementById('tab-signup'),tl=document.getElementById('tab-login');
    if(tab==='signup'){su.style.display='';li.style.display='none';ts.style.background='var(--accent-blue)';ts.style.color='#fff';ts.style.border='none';tl.style.background='transparent';tl.style.color='var(--text-muted)';tl.style.border='1px solid var(--border)';}
    else{su.style.display='none';li.style.display='';tl.style.background='var(--accent-blue)';tl.style.color='#fff';tl.style.border='none';ts.style.background='transparent';ts.style.color='var(--text-muted)';ts.style.border='1px solid var(--border)';}
  };
  ZapHiveAuth._closeAuth=function(){ document.getElementById('zh-auth-modal')?.classList.add('zh-hidden'); };

  async function handleSignup(e){
    e.preventDefault();
    const err=document.getElementById('su-error'); err.textContent='';
    const username=(document.getElementById('su-username').value||'').trim();
    const password=document.getElementById('su-password').value||'';
    const confirm=document.getElementById('su-confirm').value||'';
    const birthday=document.getElementById('su-birthday').value||'';
    const gender=document.getElementById('su-gender').value||'N/A';
    if(!username) return err.textContent='Username required.';
    if(username.length>13) return err.textContent='Max 13 chars.';
    if(hasEmoji(username)) return err.textContent='No emojis allowed.';
    if(!/^[a-zA-Z0-9_. -]+$/.test(username)) return err.textContent='Invalid characters.';
    if(password.length<6) return err.textContent='Password min 6 chars.';
    if(password!==confirm) return err.textContent='Passwords do not match.';
    if(!birthday) return err.textContent='Birthday required.';
    if(calcAge(birthday)<5) return err.textContent='Must be at least 5 years old.';
    err.textContent='Checking…';
    if(await isUsernameTaken(username)) return err.textContent='Username already taken.';
    const isDevAcc=username.toUpperCase()===DEV_USERNAME;
    const newUid=isDevAcc?DEV_USER_ID:(currentUser?.uid||genUid());
    const user={uid:newUid,username,isGuest:false,role:isDevAcc?'dev':'user',avatar:currentUser?.avatar||'👾',avatarType:currentUser?.avatarType||'preset',zap:currentUser?.zap||0,credits:currentUser?.credits||0,level:currentUser?.level||1,description:'',gender,hideGender:false,birthday,likedGames:currentUser?.likedGames||[],dislikedGames:currentUser?.dislikedGames||[],favorites:currentUser?.favorites||{},recentlyPlayed:currentUser?.recentlyPlayed||[],joinDate:currentUser?.joinDate||today(),passwordHash:hashPass(password),owned:{frames:[],themes:[],nameColors:[]},transactions:{}};
    await dbSet('/users/'+newUid,user);
    await registerUsername(username,newUid);
    currentUser=user; saveSession(user); renderNav(); ZapHiveAuth._closeAuth();
    showAuthToast('Welcome, '+username+'! 🎉');
  }

  async function handleLogin(e){
    e.preventDefault();
    const err=document.getElementById('li-error'); err.textContent='';
    const username=(document.getElementById('li-username').value||'').trim();
    const password=document.getElementById('li-password').value||'';
    if(!username||!password) return err.textContent='Fill in all fields.';
    err.textContent='Logging in…';
    const uns=await dbGet('/usernames'); const uid2=uns&&uns[username.toLowerCase()];
    if(!uid2) return err.textContent='Username not found.';
    const user=await dbGet('/users/'+uid2);
    if(!user) return err.textContent='Account not found.';
    if(user.passwordHash!==hashPass(password)) return err.textContent='Incorrect password.';
    currentUser=user; saveSession(user); renderNav(); ZapHiveAuth._closeAuth();
    showAuthToast('Welcome back, '+user.username+'! ⚡');
  }

  function openProfilePanel(){
    let p=document.getElementById('zh-profile-panel');
    if(!p){ p=buildProfilePanel(); document.body.appendChild(p); }
    updateProfileContent(); p.classList.remove('zh-hidden');
  }

  function buildProfilePanel(){
    const p=document.createElement('div'); p.id='zh-profile-panel';
    p.style.cssText='position:fixed;top:0;right:0;width:320px;max-width:100vw;height:100vh;background:var(--bg-card);border-left:1px solid var(--border);z-index:400;overflow-y:auto;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,0.4)';
    p.innerHTML=`<div style="padding:1rem 1.2rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0"><span style="font-family:var(--font-display);font-size:0.82rem;color:var(--accent-cyan);letter-spacing:1px">MY PROFILE</span><button onclick="document.getElementById('zh-profile-panel').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer">✕</button></div><div id="zh-profile-body" style="flex:1;padding:1.2rem;display:flex;flex-direction:column;gap:1rem;overflow-y:auto"></div>`;
    return p;
  }

  function updateProfileContent(){
    const body=document.getElementById('zh-profile-body');
    if(!body||!currentUser) return;
    const u=currentUser, isGuest=u.isGuest, lvl=getLevelFromZap(u.zap||0), pct=zapPct(u.zap||0), nextZap=zapForLevel(lvl+1);
    const role=u.role||'guest', meta=ROLE_META[role]||ROLE_META.user, ringColor=meta.color||'var(--accent-blue)';
    body.innerHTML=`
      <div style="text-align:center">
        <div style="width:80px;height:80px;border-radius:50%;border:3px solid ${ringColor};margin:0 auto 0.6rem;background:var(--bg-section);display:flex;align-items:center;justify-content:center;font-size:2.5rem;overflow:hidden;cursor:pointer" onclick="ZapHiveAuth._openAvatarPicker()" title="Change avatar">${getAvatarHtml(u.avatar,u.avatarType,80)}</div>
        <div style="font-size:0.65rem;color:var(--text-muted)">Click to change avatar</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:0.5rem">
          <div style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:${ringColor}">${esc(u.username)}</div>
          ${roleBadgeHtml(role)}
        </div>
        ${isGuest?'<div style="font-size:0.72rem;color:var(--accent-yellow);margin-top:0.2rem">Guest Account</div>':''}
      </div>
      ${isGuest?`<div style="background:rgba(26,140,255,0.08);border:1px solid var(--border);border-radius:8px;padding:0.9rem;text-align:center"><div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.6rem">Save your progress!</div><button onclick="ZapHiveAuth.openAuth()" style="background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:0.45rem 1.2rem;font-family:var(--font-display);font-size:0.75rem;font-weight:700;cursor:pointer">Sign Up / Login</button></div>`:''}
      ${!isGuest?`<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem"><div style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.7rem;text-align:center"><div style="font-family:var(--font-display);font-size:1.1rem;color:var(--accent-yellow)">⚡${u.zap||0}</div><div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">ZAP (XP)</div></div><div style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.7rem;text-align:center"><div style="font-family:var(--font-display);font-size:1.1rem;color:#00cfff">💳${u.credits||0}</div><div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Credits</div></div></div>`:''}
      <div style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.9rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem"><span style="font-family:var(--font-display);font-size:0.78rem;color:var(--accent-yellow)">⚡ LEVEL ${lvl}</span><span style="font-size:0.7rem;color:var(--text-muted)">${u.zap||0}/${nextZap} ZAP</span></div>
        <div style="background:rgba(26,140,255,0.12);border-radius:20px;height:8px;overflow:hidden"><div style="width:${pct}%;background:linear-gradient(90deg,var(--accent-blue),var(--accent-cyan));height:100%;border-radius:20px;transition:width 0.4s"></div></div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:0.4rem">${nextZap-(u.zap||0)} ZAP to Level ${lvl+1}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.7rem;text-align:center"><div style="font-family:var(--font-display);font-size:1.1rem;color:var(--accent-cyan)">${(u.recentlyPlayed||[]).length}</div><div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Played</div></div>
        <div style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.7rem;text-align:center"><div style="font-family:var(--font-display);font-size:1.1rem;color:var(--accent-cyan)">${Object.keys(u.favorites||{}).length}</div><div style="font-size:0.65rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Favorites</div></div>
      </div>
      ${!isGuest?`
      <div>
        <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.4rem">About Me</div>
        <div style="font-size:0.82rem;color:var(--text-white);background:var(--bg-section);border:1px solid var(--border);border-radius:6px;padding:0.6rem;min-height:40px;cursor:pointer" onclick="ZapHiveAuth._editDesc()" title="Click to edit">${u.description?esc(u.description):'<span style="color:var(--text-muted)">Click to add description…</span>'}</div>
      </div>
      <div style="font-size:0.78rem;color:var(--text-muted);display:flex;flex-direction:column;gap:0.3rem">${!u.hideGender?`<div>👤 ${esc(u.gender||'N/A')}</div>`:''}<div>📅 Joined ${esc(u.joinDate||'')}</div></div>
      ${(u.recentlyPlayed||[]).length>0?`<div><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem">Recent Games</div><div style="display:flex;flex-direction:column;gap:0.3rem;max-height:140px;overflow-y:auto">${(u.recentlyPlayed||[]).slice(0,8).map(p=>`<a href="game.html?id=${esc(p.id)}" style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-section);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.6rem;text-decoration:none"><span style="font-size:0.78rem;color:var(--text-white);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.title||p.id)}</span><span style="font-size:0.65rem;color:var(--text-muted);flex-shrink:0;margin-left:0.4rem">${esc(p.date||'')}</span></a>`).join('')}</div></div>`:''}
      <div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:auto;padding-top:1rem;border-top:1px solid var(--border)">
        <button onclick="ZapHiveAuth._openSettings()" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.8rem;padding:0.5rem;cursor:pointer;text-align:left">⚙️ Settings</button>
        <button onclick="ZapHiveAuth._logout()" style="background:transparent;border:1px solid rgba(255,77,109,0.3);border-radius:6px;color:#ff4d6d;font-size:0.8rem;padding:0.5rem;cursor:pointer;text-align:left">🚪 Logout</button>
      </div>`:''}`;
  }

  ZapHiveAuth._openAvatarPicker=function(){
    let p=document.getElementById('zh-avatar-picker');
    if(p){p.classList.remove('zh-hidden');return;}
    p=document.createElement('div');p.id='zh-avatar-picker';p.style.cssText='position:fixed;inset:0;background:rgba(5,13,26,0.92);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem';
    p.innerHTML=`<div style="background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:12px;padding:1.5rem;max-width:360px;width:100%"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"><span style="font-family:var(--font-display);font-size:0.82rem;color:var(--accent-cyan)">CHOOSE AVATAR</span><button onclick="document.getElementById('zh-avatar-picker').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer">✕</button></div><div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px">Preset Avatars</div><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:0.4rem;margin-bottom:1rem">${PRESET_AVATARS.map(av=>`<button onclick="ZapHiveAuth._setPresetAvatar('${av}')" style="width:100%;aspect-ratio:1;font-size:1.3rem;background:var(--bg-section);border:2px solid transparent;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center" onmouseenter="this.style.borderColor='var(--accent-blue)'" onmouseleave="this.style.borderColor='transparent'">${av}</button>`).join('')}</div><div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.5px">Upload from PC</div><label style="display:block;background:rgba(26,140,255,0.07);border:1px dashed var(--accent-blue);border-radius:6px;padding:0.7rem;text-align:center;cursor:pointer;font-size:0.8rem;color:var(--accent-blue)">📁 Choose Image (max 500KB)<input type="file" id="avatar-file-input" accept="image/png,image/jpeg,image/gif,image/webp" style="display:none"></label><div id="avatar-upload-error" style="color:#ff4d6d;font-size:0.72rem;margin-top:0.4rem;min-height:1em"></div></div>`;
    document.body.appendChild(p);
    document.getElementById('avatar-file-input').addEventListener('change',handleAvatarUpload);
  };

  ZapHiveAuth._setPresetAvatar=async function(emoji){
    if(!currentUser) return;
    currentUser.avatar=emoji;currentUser.avatarType='preset';saveSession(currentUser);
    if(!currentUser.isGuest) await dbPatch('/users/'+currentUser.uid,{avatar:emoji,avatarType:'preset'});
    renderNav();updateProfileContent();document.getElementById('zh-avatar-picker')?.classList.add('zh-hidden');
  };

  async function handleAvatarUpload(e){
    const errEl=document.getElementById('avatar-upload-error');errEl.textContent='';
    const file=e.target.files[0];if(!file) return;
    if(file.size>500*1024){errEl.textContent='Max 500KB.';e.target.value='';return;}
    if(!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type)){errEl.textContent='Invalid type.';e.target.value='';return;}
    const reader=new FileReader();
    reader.onload=async ev=>{const b64=ev.target.result;currentUser.avatar=b64;currentUser.avatarType='image';saveSession(currentUser);if(!currentUser.isGuest)await dbPatch('/users/'+currentUser.uid,{avatar:b64,avatarType:'image'});renderNav();updateProfileContent();document.getElementById('zh-avatar-picker')?.classList.add('zh-hidden');};
    reader.readAsDataURL(file);
  }

  ZapHiveAuth._editDesc=function(){
    const d=currentUser?.description||'';const nd=prompt('Edit description (max 120 chars):',d);if(nd===null)return;
    currentUser.description=nd.slice(0,120);saveSession(currentUser);
    if(!currentUser.isGuest)dbPatch('/users/'+currentUser.uid,{description:currentUser.description});updateProfileContent();
  };

  ZapHiveAuth._openSettings=function(){
    let s=document.getElementById('zh-settings-modal');if(s){s.classList.remove('zh-hidden');populateSettings();return;}
    s=document.createElement('div');s.id='zh-settings-modal';s.style.cssText='position:fixed;inset:0;background:rgba(5,13,26,0.92);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem';
    s.innerHTML=`<div style="background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:12px;padding:1.5rem;max-width:360px;width:100%;max-height:90vh;overflow-y:auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem"><span style="font-family:var(--font-display);font-size:0.82rem;color:var(--accent-cyan)">⚙️ SETTINGS</span><button onclick="document.getElementById('zh-settings-modal').classList.add('zh-hidden')" style="background:transparent;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer">✕</button></div><div style="display:flex;justify-content:space-between;align-items:center;padding:0.8rem 0;border-bottom:1px solid var(--border)"><span style="font-size:0.82rem;color:var(--text-white)">Hide gender from others</span><label style="position:relative;display:inline-block;width:40px;height:22px"><input type="checkbox" id="setting-hide-gender" style="opacity:0;width:0;height:0" onchange="ZapHiveAuth._toggleHideGender(this.checked)"><span id="gender-toggle-track" style="position:absolute;inset:0;background:var(--border);border-radius:22px;cursor:pointer;transition:background 0.2s"></span><span id="gender-toggle-thumb" style="position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left 0.2s"></span></label></div><div style="padding:0.8rem 0;border-bottom:1px solid var(--border)"><div style="font-size:0.82rem;color:var(--text-white);margin-bottom:0.5rem">Gender</div><select id="setting-gender" class="zh-input" onchange="ZapHiveAuth._updateGender(this.value)" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.45rem 0.7rem;color:var(--text-white);font-size:0.82rem"><option value="N/A">Prefer not to say</option><option value="Male">Male</option><option value="Female">Female</option></select></div><div style="padding:0.8rem 0"><div style="font-size:0.82rem;color:var(--text-white);margin-bottom:0.7rem">Change Password</div><form id="change-pass-form" action="javascript:void(0)" novalidate><input type="password" id="cp-current" placeholder="Current password" maxlength="40" class="zh-input" style="margin-bottom:0.4rem"><input type="password" id="cp-new" placeholder="New password (min 6)" maxlength="40" class="zh-input" style="margin-bottom:0.4rem"><input type="password" id="cp-confirm" placeholder="Confirm new password" maxlength="40" class="zh-input" style="margin-bottom:0.4rem"><div id="cp-error" style="color:#ff4d6d;font-size:0.72rem;min-height:1em;margin-bottom:0.4rem"></div><button type="submit" style="width:100%;background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:0.5rem;font-size:0.8rem;font-weight:700;cursor:pointer;font-family:var(--font-display)">Change Password</button></form></div></div>`;
    document.body.appendChild(s);document.getElementById('change-pass-form').addEventListener('submit',handleChangePassword);populateSettings();
  };

  function populateSettings(){
    if(!currentUser)return;
    const hg=document.getElementById('setting-hide-gender'),tr=document.getElementById('gender-toggle-track'),th=document.getElementById('gender-toggle-thumb'),sg=document.getElementById('setting-gender');
    if(hg){hg.checked=!!currentUser.hideGender;if(tr)tr.style.background=currentUser.hideGender?'var(--accent-blue)':'var(--border)';if(th)th.style.left=currentUser.hideGender?'21px':'3px';}
    if(sg)sg.value=currentUser.gender||'N/A';
  }

  ZapHiveAuth._toggleHideGender=async function(val){if(!currentUser)return;currentUser.hideGender=val;saveSession(currentUser);const tr=document.getElementById('gender-toggle-track'),th=document.getElementById('gender-toggle-thumb');if(tr)tr.style.background=val?'var(--accent-blue)':'var(--border)';if(th)th.style.left=val?'21px':'3px';if(!currentUser.isGuest)await dbPatch('/users/'+currentUser.uid,{hideGender:val});};
  ZapHiveAuth._updateGender=async function(val){if(!currentUser)return;currentUser.gender=val;saveSession(currentUser);if(!currentUser.isGuest)await dbPatch('/users/'+currentUser.uid,{gender:val});};

  async function handleChangePassword(e){
    e.preventDefault();const errEl=document.getElementById('cp-error');errEl.textContent='';
    const cur=document.getElementById('cp-current').value||'',np=document.getElementById('cp-new').value||'',cf=document.getElementById('cp-confirm').value||'';
    if(!cur)return errEl.textContent='Enter current password.';
    if(hashPass(cur)!==currentUser.passwordHash)return errEl.textContent='Current password incorrect.';
    if(np.length<6)return errEl.textContent='New password too short.';
    if(np!==cf)return errEl.textContent='Passwords do not match.';
    currentUser.passwordHash=hashPass(np);saveSession(currentUser);
    await dbPatch('/users/'+currentUser.uid,{passwordHash:currentUser.passwordHash});
    errEl.style.color='#00c853';errEl.textContent='Password changed! ✓';
    setTimeout(()=>{errEl.textContent='';errEl.style.color='#ff4d6d';},3000);
    document.getElementById('cp-current').value='';document.getElementById('cp-new').value='';document.getElementById('cp-confirm').value='';
  }

  ZapHiveAuth._logout=async function(){
    if(!confirm('Logout?'))return;clearSession();document.getElementById('zh-profile-panel')?.classList.add('zh-hidden');await autoGuest();showAuthToast('Logged out!');
  };

  function showAuthToast(msg){
    let t=document.getElementById('zh-auth-toast');
    if(!t){t=document.createElement('div');t.id='zh-auth-toast';t.style.cssText='position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:var(--bg-card);border:1px solid var(--accent-cyan);border-radius:10px;padding:0.7rem 1.4rem;color:var(--text-white);font-size:0.85rem;z-index:700;white-space:nowrap;transition:opacity 0.3s;pointer-events:none';document.body.appendChild(t);}
    t.textContent=msg;t.style.opacity='1';clearTimeout(t._timer);t._timer=setTimeout(()=>{t.style.opacity='0';},3000);
  }

  init();
})();
