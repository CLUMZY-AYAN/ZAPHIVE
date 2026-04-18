/* =============================================
   ZAPHIVE — DEV-EXTRAS.JS
   Themes, Cosmetics, Events, Seasons, Categories
   for Developer Panel
   ============================================= */
(function () {
  'use strict';

  const DB_URL = 'https://zaphive-736c0-default-rtdb.firebaseio.com';

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function genId(prefix) { return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }
  function today() { return new Date().toISOString().split('T')[0]; }

  async function dbGet(p) { try { const r=await fetch(DB_URL+p+'.json'); return await r.json(); } catch(e) { return null; } }
  async function dbSet(p,d) { try { await fetch(DB_URL+p+'.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); } catch(e){} }
  async function dbPatch(p,d) { try { await fetch(DB_URL+p+'.json',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}); } catch(e){} }
  async function dbDelete(p) { try { await fetch(DB_URL+p+'.json',{method:'DELETE'}); } catch(e){} }

  function showToast(msg, type='success') {
    let t = document.getElementById('dev-extras-toast');
    if (!t) { t=document.createElement('div'); t.id='dev-extras-toast'; t.style.cssText='position:fixed;bottom:1.5rem;right:1.5rem;background:var(--bg-card);border:1px solid var(--accent-blue);border-radius:10px;padding:0.8rem 1.2rem;color:var(--text-white);font-size:0.85rem;z-index:1000;max-width:280px;transition:opacity 0.3s'; document.body.appendChild(t); }
    t.textContent = (type==='success'?'✓ ':'✗ ') + msg;
    t.style.borderColor = type==='success' ? 'var(--accent-cyan)' : '#ff4d6d';
    t.style.opacity = '1';
    clearTimeout(t._t); t._t = setTimeout(()=>{ t.style.opacity='0'; }, 3200);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = e => resolve(e.target.result);
      r.onerror = () => reject(new Error('Read failed'));
      r.readAsDataURL(file);
    });
  }

  // ══════════════════════════════════════════════
  // THEMES
  // ══════════════════════════════════════════════
  function buildThemesPanel() {
    const panel = document.createElement('div');
    panel.id = 'dev-themes-panel';
    panel.style.cssText = 'margin-top:1.5rem';
    panel.innerHTML = `
      <div class="panel">
        <h2>🎨 Themes</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">

          <!-- Create theme -->
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">Create Theme</div>
            <div class="field"><label>Theme Name *</label><input type="text" id="theme-name" placeholder="e.g. Ocean Blue" maxlength="40"></div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.8rem">
              <div class="field"><label>Background</label><div style="display:flex;gap:0.4rem;align-items:center"><input type="color" id="theme-primary" value="#050d1a" style="width:36px;height:32px;border:none;border-radius:4px;cursor:pointer;background:none;padding:0"><input type="text" id="theme-primary-hex" value="#050d1a" maxlength="7" style="flex:1;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.5rem;color:var(--text-white);font-size:0.78rem;font-family:monospace"></div></div>
              <div class="field"><label>Card BG</label><div style="display:flex;gap:0.4rem;align-items:center"><input type="color" id="theme-bg" value="#0a1628" style="width:36px;height:32px;border:none;border-radius:4px;cursor:pointer;background:none;padding:0"><input type="text" id="theme-bg-hex" value="#0a1628" maxlength="7" style="flex:1;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.5rem;color:var(--text-white);font-size:0.78rem;font-family:monospace"></div></div>
              <div class="field"><label>Accent</label><div style="display:flex;gap:0.4rem;align-items:center"><input type="color" id="theme-accent" value="#1a8cff" style="width:36px;height:32px;border:none;border-radius:4px;cursor:pointer;background:none;padding:0"><input type="text" id="theme-accent-hex" value="#1a8cff" maxlength="7" style="flex:1;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.5rem;color:var(--text-white);font-size:0.78rem;font-family:monospace"></div></div>
              <div class="field"><label>Text</label><div style="display:flex;gap:0.4rem;align-items:center"><input type="color" id="theme-text" value="#e8f0ff" style="width:36px;height:32px;border:none;border-radius:4px;cursor:pointer;background:none;padding:0"><input type="text" id="theme-text-hex" value="#e8f0ff" maxlength="7" style="flex:1;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.5rem;color:var(--text-white);font-size:0.78rem;font-family:monospace"></div></div>
              <div class="field"><label>Cyan</label><div style="display:flex;gap:0.4rem;align-items:center"><input type="color" id="theme-cyan" value="#00cfff" style="width:36px;height:32px;border:none;border-radius:4px;cursor:pointer;background:none;padding:0"><input type="text" id="theme-cyan-hex" value="#00cfff" maxlength="7" style="flex:1;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.5rem;color:var(--text-white);font-size:0.78rem;font-family:monospace"></div></div>
              <div class="field"><label>Yellow</label><div style="display:flex;gap:0.4rem;align-items:center"><input type="color" id="theme-yellow" value="#ffd600" style="width:36px;height:32px;border:none;border-radius:4px;cursor:pointer;background:none;padding:0"><input type="text" id="theme-yellow-hex" value="#ffd600" maxlength="7" style="flex:1;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.5rem;color:var(--text-white);font-size:0.78rem;font-family:monospace"></div></div>
            </div>

            <div class="field"><label>Optional Image (derives mood)</label><input type="file" id="theme-image-file" accept="image/*" style="background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.45rem;color:var(--text-white);font-size:0.78rem;width:100%"></div>

            <div style="display:flex;gap:0.5rem">
              <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;color:var(--text-white);cursor:pointer"><input type="checkbox" id="theme-in-store"> Sell in Store</label>
              <div class="field" style="margin:0;flex:1"><input type="number" id="theme-price" placeholder="Price (Credits)" min="0" style="background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.6rem;color:var(--text-white);font-size:0.78rem;width:100%"></div>
            </div>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
              <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;color:var(--text-white);cursor:pointer"><input type="checkbox" id="theme-unlimited" checked> Unlimited stock</label>
              <div class="field" style="margin:0;flex:1"><input type="number" id="theme-stock" placeholder="Stock amount" min="1" style="background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.6rem;color:var(--text-white);font-size:0.78rem;width:100%"></div>
            </div>

            <div style="display:flex;gap:0.5rem;margin-top:0.8rem">
              <button onclick="saveTheme()" style="flex:1;background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:0.55rem;font-family:var(--font-display);font-size:0.78rem;font-weight:700;cursor:pointer">Save Theme</button>
              <button onclick="previewTheme()" style="flex:1;background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:6px;padding:0.55rem;font-size:0.78rem;cursor:pointer">Preview</button>
            </div>
          </div>

          <!-- Theme list -->
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">Saved Themes</div>
            <div id="themes-list" style="display:flex;flex-direction:column;gap:0.5rem;max-height:420px;overflow-y:auto">
              <div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">Loading…</div>
            </div>
          </div>
        </div>
      </div>`;

    // Sync color pickers with hex inputs
    ['primary','bg','accent','text','cyan','yellow'].forEach(key => {
      const picker = document.getElementById('theme-'+key);
      const hex    = document.getElementById('theme-'+key+'-hex');
      if (picker && hex) {
        picker.addEventListener('input', () => { hex.value = picker.value; });
        hex.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hex.value)) picker.value = hex.value; });
      }
    });

    return panel;
  }

  window.saveTheme = async function() {
    const name = document.getElementById('theme-name')?.value.trim();
    if (!name) return showToast('Theme name required.', 'error');
    const imageFile = document.getElementById('theme-image-file')?.files[0];
    let imageData = null;
    if (imageFile) { try { imageData = await fileToBase64(imageFile); } catch(e) {} }
    const inStore   = document.getElementById('theme-in-store')?.checked || false;
    const price     = parseInt(document.getElementById('theme-price')?.value) || 0;
    const unlimited = document.getElementById('theme-unlimited')?.checked !== false;
    const stock     = parseInt(document.getElementById('theme-stock')?.value) || 0;

    const theme = {
      id:   genId('theme'),
      type: 'theme',
      name,
      colors: {
        primary:    document.getElementById('theme-primary-hex')?.value || '#050d1a',
        background: document.getElementById('theme-bg-hex')?.value      || '#0a1628',
        accent:     document.getElementById('theme-accent-hex')?.value  || '#1a8cff',
        text:       document.getElementById('theme-text-hex')?.value    || '#e8f0ff',
        cyan:       document.getElementById('theme-cyan-hex')?.value    || '#00cfff',
        yellow:     document.getElementById('theme-yellow-hex')?.value  || '#ffd600'
      },
      image:     imageData || null,
      inStore,
      price:     inStore ? price : 0,
      unlimited: inStore ? unlimited : true,
      stock:     (!unlimited && inStore) ? stock : 999,
      createdAt: Date.now()
    };

    await dbSet('/cosmetics/'+theme.id, theme);
    showToast('Theme saved: '+name, 'success');
    loadThemesList();
  };

  window.previewTheme = function() {
    const colors = {
      primary:    document.getElementById('theme-primary-hex')?.value,
      background: document.getElementById('theme-bg-hex')?.value,
      accent:     document.getElementById('theme-accent-hex')?.value,
      text:       document.getElementById('theme-text-hex')?.value,
      cyan:       document.getElementById('theme-cyan-hex')?.value,
      yellow:     document.getElementById('theme-yellow-hex')?.value
    };
    if (window.ZapHiveCosmetics) window.ZapHiveCosmetics.applyTheme({ colors });
    showToast('Previewing theme. Save to keep.', 'success');
  };

  window.setGlobalTheme = async function(themeId) {
    await dbSet('/settings/activeTheme', themeId);
    showToast('Global theme set!', 'success');
  };

  window.deleteTheme = async function(themeId) {
    if (!confirm('Delete this theme?')) return;
    await dbDelete('/cosmetics/'+themeId);
    loadThemesList();
    showToast('Theme deleted.', 'success');
  };

  async function loadThemesList() {
    const list = document.getElementById('themes-list');
    if (!list) return;
    const cosmetics = await dbGet('/cosmetics');
    const themes = cosmetics ? Object.values(cosmetics).filter(c=>c.type==='theme') : [];
    if (!themes.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">No themes yet.</div>'; return; }
    list.innerHTML = '';
    themes.forEach(t => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;gap:0.6rem;background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.6rem';
      const preview = `<div style="width:36px;height:36px;border-radius:6px;background:${t.colors?.primary||'#050d1a'};border:2px solid ${t.colors?.accent||'#1a8cff'};flex-shrink:0"></div>`;
      item.innerHTML = `
        ${preview}
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;font-weight:700;color:var(--text-white)">${esc(t.name)}</div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${t.inStore?'Store: '+t.price+' Credits':'Dev only'}</div>
        </div>
        <div style="display:flex;gap:0.3rem">
          <button onclick="setGlobalTheme('${t.id}')" style="background:rgba(255,214,0,0.1);border:1px solid rgba(255,214,0,0.3);border-radius:6px;color:var(--accent-yellow);font-size:0.68rem;padding:0.22rem 0.5rem;cursor:pointer" title="Set as global">🌍</button>
          <button onclick="deleteTheme('${t.id}')" class="btn-danger" style="font-size:0.68rem;padding:0.22rem 0.5rem">Del</button>
        </div>`;
      list.appendChild(item);
    });
  }

  // ══════════════════════════════════════════════
  // COSMETICS (Frames & Name Colors)
  // ══════════════════════════════════════════════
  function buildCosmeticsPanel() {
    const panel = document.createElement('div');
    panel.id = 'dev-cosmetics-panel';
    panel.style.cssText = 'margin-top:1.5rem';
    panel.innerHTML = `
      <div class="panel">
        <h2>✨ Cosmetics (Frames & Name Colors)</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">Create Cosmetic</div>
            <div class="field"><label>Type</label><select id="cosm-type" class="zh-input"><option value="frame">Avatar Frame</option><option value="nameColor">Name Color</option></select></div>
            <div class="field"><label>Name *</label><input type="text" id="cosm-name" maxlength="40" placeholder="e.g. Golden Frame"></div>
            <div id="cosm-frame-fields">
              <div class="field"><label>Frame Image URL or upload</label><input type="url" id="cosm-image-url" placeholder="https://…"><input type="file" id="cosm-image-file" accept="image/*" style="margin-top:0.4rem;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem;color:var(--text-white);font-size:0.78rem;width:100%"></div>
            </div>
            <div id="cosm-color-fields" style="display:none">
              <div class="field"><label>Name Color</label><div style="display:flex;gap:0.5rem;align-items:center"><input type="color" id="cosm-color-picker" value="#ff4d00" style="width:40px;height:34px;border:none;border-radius:4px;cursor:pointer;padding:0"><input type="text" id="cosm-color-hex" value="#ff4d00" maxlength="7" style="flex:1;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem;color:var(--text-white);font-size:0.82rem;font-family:monospace"></div></div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem">
              <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;color:var(--text-white);cursor:pointer"><input type="checkbox" id="cosm-in-store"> Sell in Store</label>
              <input type="number" id="cosm-price" placeholder="Price" min="0" style="width:80px;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem;color:var(--text-white);font-size:0.78rem">
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.8rem">
              <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.78rem;color:var(--text-white);cursor:pointer"><input type="checkbox" id="cosm-unlimited" checked> Unlimited</label>
              <input type="number" id="cosm-stock" placeholder="Stock" min="1" style="width:80px;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem;color:var(--text-white);font-size:0.78rem">
            </div>
            <button onclick="saveCosmetic()" style="width:100%;background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:0.55rem;font-family:var(--font-display);font-size:0.78rem;font-weight:700;cursor:pointer">Save Cosmetic</button>

            <div style="margin-top:1.2rem;padding-top:1rem;border-top:1px solid var(--border)">
              <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.6rem;font-weight:700">Grant to Player</div>
              <input type="text" id="grant-username" placeholder="Username" maxlength="13" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.45rem 0.7rem;color:var(--text-white);font-size:0.82rem;margin-bottom:0.4rem">
              <select id="grant-cosmetic-id" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.45rem 0.7rem;color:var(--text-white);font-size:0.82rem;margin-bottom:0.6rem">
                <option value="">Select cosmetic…</option>
              </select>
              <button onclick="grantCosmetic()" style="width:100%;background:rgba(0,207,255,0.1);border:1px solid var(--accent-cyan);color:var(--accent-cyan);border-radius:6px;padding:0.45rem;font-size:0.78rem;font-weight:700;cursor:pointer">Grant Cosmetic</button>
              <div id="grant-result" style="font-size:0.72rem;margin-top:0.4rem;min-height:1em"></div>
            </div>
          </div>

          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">All Cosmetics</div>
            <div id="cosmetics-list" style="display:flex;flex-direction:column;gap:0.4rem;max-height:480px;overflow-y:auto">
              <div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">Loading…</div>
            </div>
          </div>
        </div>
      </div>`;

    // Type toggle
    setTimeout(() => {
      const typeEl = document.getElementById('cosm-type');
      const colorEl = document.getElementById('cosm-color-picker');
      const hexEl   = document.getElementById('cosm-color-hex');
      if (typeEl) {
        typeEl.addEventListener('change', () => {
          const isColor = typeEl.value === 'nameColor';
          document.getElementById('cosm-frame-fields').style.display = isColor ? 'none' : '';
          document.getElementById('cosm-color-fields').style.display = isColor ? '' : 'none';
        });
      }
      if (colorEl && hexEl) {
        colorEl.addEventListener('input', () => { hexEl.value = colorEl.value; });
        hexEl.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(hexEl.value)) colorEl.value = hexEl.value; });
      }
    }, 100);

    return panel;
  }

  window.saveCosmetic = async function() {
    const type    = document.getElementById('cosm-type')?.value;
    const name    = document.getElementById('cosm-name')?.value.trim();
    if (!name) return showToast('Name required.', 'error');
    const inStore   = document.getElementById('cosm-in-store')?.checked || false;
    const price     = parseInt(document.getElementById('cosm-price')?.value) || 0;
    const unlimited = document.getElementById('cosm-unlimited')?.checked !== false;
    const stock     = parseInt(document.getElementById('cosm-stock')?.value) || 0;

    const cosm = { id: genId(type), type, name, inStore, price: inStore?price:0, unlimited: inStore?unlimited:true, stock: (!unlimited&&inStore)?stock:999, createdAt: Date.now() };

    if (type === 'frame') {
      const urlVal  = document.getElementById('cosm-image-url')?.value.trim();
      const imgFile = document.getElementById('cosm-image-file')?.files[0];
      if (imgFile) { cosm.image = await fileToBase64(imgFile); }
      else if (urlVal) { cosm.image = urlVal; }
    } else if (type === 'nameColor') {
      cosm.colorHex = document.getElementById('cosm-color-hex')?.value || '#ffffff';
    }

    await dbSet('/cosmetics/'+cosm.id, cosm);
    showToast('Cosmetic saved: '+name, 'success');
    loadCosmeticsList();
    loadGrantDropdown();
  };

  window.deleteCosmetic = async function(id) {
    if (!confirm('Delete this cosmetic?')) return;
    await dbDelete('/cosmetics/'+id);
    loadCosmeticsList(); loadGrantDropdown();
    showToast('Deleted.', 'success');
  };

  window.grantCosmetic = async function() {
    const username  = document.getElementById('grant-username')?.value.trim();
    const cosmId    = document.getElementById('grant-cosmetic-id')?.value;
    const resultEl  = document.getElementById('grant-result');
    if (!username || !cosmId) return resultEl.textContent = '✗ Fill in both fields.';
    resultEl.style.color = 'var(--text-muted)'; resultEl.textContent = 'Granting…';
    const uns = await dbGet('/usernames');
    const uid = uns && uns[username.toLowerCase()];
    if (!uid) { resultEl.style.color='#ff4d6d'; resultEl.textContent='✗ User not found.'; return; }
    const user = await dbGet('/users/'+uid);
    if (!user) { resultEl.style.color='#ff4d6d'; resultEl.textContent='✗ User not found.'; return; }
    const cosm = await dbGet('/cosmetics/'+cosmId);
    if (!cosm) { resultEl.style.color='#ff4d6d'; resultEl.textContent='✗ Cosmetic not found.'; return; }
    const key = cosm.type+'s';
    const owned = user.owned || {};
    owned[key] = [...(owned[key]||[])];
    if (!owned[key].includes(cosmId)) owned[key].push(cosmId);
    await dbPatch('/users/'+uid, { owned });
    // Log transaction
    const txId = 'tx_'+Date.now();
    await dbSet('/transactions/'+txId, { transactionId:txId, userId:uid, givenBy:'dev', type:'cosmetic_grant', items:{ cosmetic:cosmId, name:cosm.name }, reason:'Dev grant', timestamp:Date.now() });
    resultEl.style.color = '#00c853'; resultEl.textContent = '✓ Granted '+cosm.name+' to '+username+'!';
    setTimeout(() => { resultEl.textContent=''; }, 3000);
  };

  async function loadCosmeticsList() {
    const list = document.getElementById('cosmetics-list'); if (!list) return;
    const cosmetics = await dbGet('/cosmetics');
    const items = cosmetics ? Object.values(cosmetics).filter(c=>c.type!=='theme') : [];
    if (!items.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">No cosmetics yet.</div>'; return; }
    list.innerHTML = '';
    items.forEach(c => {
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;align-items:center;gap:0.6rem;background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.55rem';
      const preview = c.type==='nameColor'
        ? `<div style="width:32px;height:32px;border-radius:6px;background:${c.colorHex};flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#fff;font-weight:700">Aa</div>`
        : c.image
          ? `<img src="${esc(c.image)}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;flex-shrink:0">`
          : `<div style="width:32px;height:32px;border-radius:6px;background:var(--bg-card);border:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center">🖼</div>`;
      div.innerHTML = `${preview}<div style="flex:1;min-width:0"><div style="font-size:0.8rem;font-weight:700;color:var(--text-white)">${esc(c.name)}</div><div style="font-size:0.68rem;color:var(--text-muted)">${c.type} · ${c.inStore?'💳'+c.price:'Dev only'}</div></div><button onclick="deleteCosmetic('${c.id}')" class="btn-danger" style="font-size:0.68rem;padding:0.22rem 0.5rem">Del</button>`;
      list.appendChild(div);
    });
  }

  async function loadGrantDropdown() {
    const sel = document.getElementById('grant-cosmetic-id'); if (!sel) return;
    const cosmetics = await dbGet('/cosmetics');
    const items = cosmetics ? Object.values(cosmetics) : [];
    sel.innerHTML = '<option value="">Select cosmetic…</option>';
    items.forEach(c => { const opt=document.createElement('option'); opt.value=c.id; opt.textContent=c.name+' ('+c.type+')'; sel.appendChild(opt); });
  }

  // ══════════════════════════════════════════════
  // EVENTS
  // ══════════════════════════════════════════════
  function buildEventsPanel() {
    const panel = document.createElement('div');
    panel.id = 'dev-events-panel';
    panel.style.cssText = 'margin-top:1.5rem';
    panel.innerHTML = `
      <div class="panel">
        <h2>🎉 Events</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">Create Event</div>
            <div class="field"><label>Title *</label><input type="text" id="ev-title" maxlength="60" placeholder="e.g. Summer Blast"></div>
            <div class="field"><label>Description</label><textarea id="ev-desc" rows="2" maxlength="200" placeholder="What's this event about?"></textarea></div>
            <div class="field"><label>Banner Image URL</label><input type="url" id="ev-banner" placeholder="https://…"></div>
            <div class="field"><label>Gimmick (text only)</label><input type="text" id="ev-gimmick" maxlength="100" placeholder="e.g. Double XP this weekend!"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
              <div class="field"><label>Start Date/Time</label><input type="datetime-local" id="ev-start"></div>
              <div class="field"><label>End Date/Time</label><input type="datetime-local" id="ev-end"></div>
            </div>
            <button onclick="saveEvent()" style="width:100%;background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:0.55rem;font-family:var(--font-display);font-size:0.78rem;font-weight:700;cursor:pointer;margin-top:0.5rem">Create Event</button>
          </div>
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">Events</div>
            <div id="events-list" style="display:flex;flex-direction:column;gap:0.4rem;max-height:400px;overflow-y:auto">
              <div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">Loading…</div>
            </div>
          </div>
        </div>
      </div>`;
    return panel;
  }

  window.saveEvent = async function() {
    const title   = document.getElementById('ev-title')?.value.trim();
    const desc    = document.getElementById('ev-desc')?.value.trim();
    const banner  = document.getElementById('ev-banner')?.value.trim();
    const gimmick = document.getElementById('ev-gimmick')?.value.trim();
    const start   = document.getElementById('ev-start')?.value;
    const end     = document.getElementById('ev-end')?.value;
    if (!title) return showToast('Title required.', 'error');
    if (!start || !end) return showToast('Start and end dates required.', 'error');
    const startTs = new Date(start).getTime();
    const endTs   = new Date(end).getTime();
    if (endTs <= startTs) return showToast('End must be after start.', 'error');
    const ev = { id: genId('ev'), title, description:desc, bannerImage:banner||null, gimmick:gimmick||null, startTime:startTs, endTime:endTs, status:'active', createdAt:Date.now() };
    await dbSet('/events/'+ev.id, ev);
    showToast('Event created!', 'success');
    loadEventsList();
  };

  window.deleteEvent = async function(id) {
    if (!confirm('Delete this event?')) return;
    await dbDelete('/events/'+id);
    loadEventsList(); showToast('Event deleted.', 'success');
  };

  window.toggleEventStatus = async function(id, current) {
    const newStatus = current==='active' ? 'inactive' : 'active';
    await dbPatch('/events/'+id, { status: newStatus });
    loadEventsList(); showToast('Event '+(newStatus==='active'?'activated':'deactivated')+'.', 'success');
  };

  async function loadEventsList() {
    const list = document.getElementById('events-list'); if (!list) return;
    const events = await dbGet('/events');
    const items = events ? Object.values(events).sort((a,b)=>b.createdAt-a.createdAt) : [];
    if (!items.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">No events yet.</div>'; return; }
    list.innerHTML = '';
    const now = Date.now();
    items.forEach(ev => {
      const isActive = ev.status==='active' && ev.startTime<=now && ev.endTime>=now;
      const div = document.createElement('div');
      div.style.cssText = 'background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.7rem';
      div.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.3rem">
          <div style="font-size:0.82rem;font-weight:700;color:var(--text-white)">${esc(ev.title)}</div>
          <span style="font-size:0.65rem;font-weight:700;padding:0.12rem 0.4rem;border-radius:20px;background:${isActive?'rgba(0,200,83,0.15)':'rgba(255,77,109,0.1)'};color:${isActive?'#00c853':'#ff4d6d'}">${isActive?'LIVE':'OFF'}</span>
        </div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:0.5rem">${new Date(ev.startTime).toLocaleString()} → ${new Date(ev.endTime).toLocaleString()}</div>
        <div style="display:flex;gap:0.4rem">
          <button onclick="toggleEventStatus('${ev.id}','${ev.status}')" style="flex:1;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.72rem;padding:0.25rem;cursor:pointer">${ev.status==='active'?'Deactivate':'Activate'}</button>
          <button onclick="deleteEvent('${ev.id}')" class="btn-danger" style="font-size:0.72rem;padding:0.25rem 0.6rem">Del</button>
        </div>`;
      list.appendChild(div);
    });
  }

  // ══════════════════════════════════════════════
  // SEASONS
  // ══════════════════════════════════════════════
  function buildSeasonsPanel() {
    const panel = document.createElement('div');
    panel.id = 'dev-seasons-panel';
    panel.style.cssText = 'margin-top:1.5rem';
    panel.innerHTML = `
      <div class="panel">
        <h2>🏅 Season Management</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">
          <div>
            <div id="current-season-status" style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.8rem;margin-bottom:1rem;font-size:0.82rem;color:var(--text-muted)">Loading…</div>

            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">Start New Season</div>
            <div class="field"><label>Season Name *</label><input type="text" id="season-name" maxlength="40" placeholder="e.g. Season 1 — Winter"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
              <div class="field"><label>Start</label><input type="datetime-local" id="season-start"></div>
              <div class="field"><label>End</label><input type="datetime-local" id="season-end"></div>
            </div>

            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:0.8rem 0 0.5rem;font-weight:700">Rewards</div>
            <div style="display:flex;flex-direction:column;gap:0.4rem">
              <div style="background:rgba(255,214,0,0.06);border:1px solid rgba(255,214,0,0.2);border-radius:6px;padding:0.6rem">
                <div style="font-size:0.7rem;color:var(--accent-yellow);font-weight:700;margin-bottom:0.4rem">🥇 #1 Reward</div>
                <input type="number" id="reward-top1-credits" placeholder="Credits" min="0" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem;color:var(--text-white);font-size:0.78rem">
              </div>
              <div style="background:rgba(255,214,0,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:0.6rem">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;margin-bottom:0.4rem">🥈 Top 10 Reward</div>
                <input type="number" id="reward-top10-credits" placeholder="Credits" min="0" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem;color:var(--text-white);font-size:0.78rem">
              </div>
              <div style="background:rgba(255,214,0,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.6rem">
                <div style="font-size:0.7rem;color:var(--text-muted);font-weight:700;margin-bottom:0.4rem">🥉 Top 100 Reward</div>
                <input type="number" id="reward-top100-credits" placeholder="Credits" min="0" style="width:100%;background:rgba(26,140,255,0.06);border:1px solid var(--border);border-radius:6px;padding:0.4rem;color:var(--text-white);font-size:0.78rem">
              </div>
            </div>
            <button onclick="startSeason()" style="width:100%;background:var(--accent-yellow);color:#000;border:none;border-radius:6px;padding:0.55rem;font-family:var(--font-display);font-size:0.78rem;font-weight:800;cursor:pointer;margin-top:0.8rem">⚡ Start Season</button>
            <button onclick="endSeasonNow()" style="width:100%;background:transparent;border:1px solid rgba(255,77,109,0.3);color:#ff4d6d;border-radius:6px;padding:0.45rem;font-size:0.78rem;cursor:pointer;margin-top:0.4rem">End Season Now</button>
          </div>

          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">Season Countdown</div>
            <div id="season-dev-countdown" style="background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:1rem;text-align:center">
              <div style="font-family:var(--font-display);font-size:1.8rem;color:var(--accent-yellow)" id="season-cd-display">—</div>
              <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.3rem">Until season ends</div>
            </div>
          </div>
        </div>
      </div>`;
    return panel;
  }

  window.startSeason = async function() {
    const name  = document.getElementById('season-name')?.value.trim();
    const start = document.getElementById('season-start')?.value;
    const end   = document.getElementById('season-end')?.value;
    if (!name) return showToast('Season name required.', 'error');
    if (!start || !end) return showToast('Start and end dates required.', 'error');
    const startTs = new Date(start).getTime();
    const endTs   = new Date(end).getTime();
    if (endTs <= startTs) return showToast('End must be after start.', 'error');
    const existing = await dbGet('/currentSeason');
    if (existing && existing.id && !existing.rewardsDistributed) {
      if (!confirm('A season is already running. End it and start new?')) return;
    }
    const season = {
      id: genId('season'), name, startTime: startTs, endTime: endTs,
      rewards: {
        top1:   { credits: parseInt(document.getElementById('reward-top1-credits')?.value)||0 },
        top10:  { credits: parseInt(document.getElementById('reward-top10-credits')?.value)||0 },
        top100: { credits: parseInt(document.getElementById('reward-top100-credits')?.value)||0 }
      },
      createdAt: Date.now(), rewardsDistributed: false
    };
    await dbSet('/currentSeason', season);
    showToast('Season started: '+name, 'success');
    loadSeasonStatus();
  };

  window.endSeasonNow = async function() {
    if (!confirm('End the current season now and distribute rewards?')) return;
    const season = await dbGet('/currentSeason');
    if (!season) return showToast('No active season.', 'error');
    await dbPatch('/currentSeason', { endTime: Date.now()-1 });
    if (window.ZapHiveEvents) await window.ZapHiveEvents.loadActiveEvent();
    showToast('Season ended. Rewards distributed!', 'success');
    loadSeasonStatus();
  };

  async function loadSeasonStatus() {
    const statusEl = document.getElementById('current-season-status');
    const cdEl = document.getElementById('season-cd-display');
    const season = await dbGet('/currentSeason');
    if (!season || !season.id || season.rewardsDistributed) {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--text-muted)">No active season.</span>';
      if (cdEl) cdEl.textContent = '—';
      return;
    }
    const now = Date.now();
    const active = season.startTime <= now && season.endTime >= now;
    if (statusEl) statusEl.innerHTML = `<strong style="color:${active?'#00c853':'var(--accent-yellow)'}">${esc(season.name)}</strong><br><span style="font-size:0.72rem">${active?'ACTIVE':'Scheduled'} · ${new Date(season.startTime).toLocaleDateString()} → ${new Date(season.endTime).toLocaleDateString()}</span>`;
    if (cdEl && window.ZapHiveEvents) {
      const tick = () => { if(cdEl) cdEl.textContent = window.ZapHiveEvents.formatCountdown(season.endTime - Date.now()); };
      tick(); setInterval(tick, 1000);
    }
  }

  // ══════════════════════════════════════════════
  // CATEGORIES
  // ══════════════════════════════════════════════
  function buildCategoriesPanel() {
    const panel = document.createElement('div');
    panel.id = 'dev-categories-panel';
    panel.style.cssText = 'margin-top:1.5rem';
    panel.innerHTML = `
      <div class="panel">
        <h2>📂 Categories</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem">
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">Add Category</div>
            <div class="field"><label>Category Name *</label><input type="text" id="cat-name" maxlength="30" placeholder="e.g. Sports"></div>
            <div class="field"><label>Icon (emoji)</label><input type="text" id="cat-icon" maxlength="4" placeholder="⚽"></div>
            <button onclick="saveCategory()" style="width:100%;background:var(--accent-blue);color:#fff;border:none;border-radius:6px;padding:0.55rem;font-family:var(--font-display);font-size:0.78rem;font-weight:700;cursor:pointer">Add Category</button>
          </div>
          <div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.8rem;font-weight:700">Current Categories</div>
            <div id="categories-list" style="display:flex;flex-direction:column;gap:0.4rem;max-height:300px;overflow-y:auto">
              <div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">Loading…</div>
            </div>
          </div>
        </div>
      </div>`;
    return panel;
  }

  window.saveCategory = async function() {
    const name = document.getElementById('cat-name')?.value.trim();
    const icon = document.getElementById('cat-icon')?.value.trim();
    if (!name) return showToast('Category name required.', 'error');
    const id = 'cat_'+name.toLowerCase().replace(/[^a-z0-9]/g,'_')+'_'+Date.now();
    await dbSet('/categories/'+id, { id, name, icon: icon||'🎮', createdAt: Date.now() });
    showToast('Category added: '+name, 'success');
    document.getElementById('cat-name').value='';
    document.getElementById('cat-icon').value='';
    loadCategoriesList();
    // Refresh upload form dropdowns
    if (window.refreshCategoryDropdowns) window.refreshCategoryDropdowns();
  };

  window.deleteCategory = async function(id) {
    if (!confirm('Delete this category?')) return;
    await dbDelete('/categories/'+id);
    loadCategoriesList();
    if (window.refreshCategoryDropdowns) window.refreshCategoryDropdowns();
    showToast('Category deleted.', 'success');
  };

  async function loadCategoriesList() {
    const list = document.getElementById('categories-list'); if (!list) return;
    const cats = await dbGet('/categories');
    const items = cats ? Object.values(cats).sort((a,b)=>a.name.localeCompare(b.name)) : [];
    if (!items.length) { list.innerHTML='<div style="color:var(--text-muted);font-size:0.78rem;text-align:center;padding:1rem">No categories yet. Using game data.</div>'; return; }
    list.innerHTML = '';
    items.forEach(c => {
      const div = document.createElement('div');
      div.style.cssText = 'display:flex;align-items:center;gap:0.6rem;background:var(--bg-section);border:1px solid var(--border);border-radius:8px;padding:0.55rem';
      div.innerHTML = `<span style="font-size:1.2rem">${c.icon||'🎮'}</span><div style="flex:1;font-size:0.82rem;font-weight:700;color:var(--text-white)">${esc(c.name)}</div><button onclick="deleteCategory('${c.id}')" class="btn-danger" style="font-size:0.68rem;padding:0.22rem 0.5rem">Del</button>`;
      list.appendChild(div);
    });
  }

  // Expose refresher for upload form
  window.refreshCategoryDropdowns = async function() {
    const cats = await dbGet('/categories');
    const catNames = cats ? Object.values(cats).map(c=>c.name).sort() : ['Action','Driving','Multiplayer','Puzzle','Arcade','IO Games','New Games'];
    ['upload-category','edit-category'].forEach(id => {
      const sel = document.getElementById(id); if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = '<option value="">Select category…</option>';
      catNames.forEach(n => { const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); });
      if (cur) sel.value = cur;
    });
  };

  // ══════════════════════════════════════════════
  // INJECT ALL PANELS INTO DEV DASHBOARD
  // ══════════════════════════════════════════════
  function injectPanels() {
    const inner = document.getElementById('dev-dashboard-inner');
    if (!inner) return;

    inner.appendChild(buildThemesPanel());
    inner.appendChild(buildCosmeticsPanel());
    inner.appendChild(buildEventsPanel());
    inner.appendChild(buildSeasonsPanel());
    inner.appendChild(buildCategoriesPanel());

    // Load all data
    setTimeout(() => {
      loadThemesList();
      loadCosmeticsList();
      loadGrantDropdown();
      loadEventsList();
      loadSeasonStatus();
      loadCategoriesList();
      window.refreshCategoryDropdowns();
    }, 300);
  }

  // Wait for dev dashboard to be visible
  const waitForDash = setInterval(() => {
    const inner = document.getElementById('dev-dashboard-inner');
    if (inner && !document.getElementById('dev-themes-panel')) {
      clearInterval(waitForDash);
      injectPanels();
    }
  }, 500);

})();
