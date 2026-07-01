/*
 * Flashr Mac — renderer bridge.
 * Loaded AFTER the inline app script, so start()/pause()/etc. are already global.
 * Wires the UI to the native window.flashr API, runs the hotkey recorder in
 * Settings, and manages the workspace library panel.
 */
(function () {
  const params = new URLSearchParams(location.search);
  const FLOAT = params.get('mode') === 'float';
  const NATIVE = !!window.flashr;

  if (NATIVE && !FLOAT) document.body.classList.add('desktop');

  if (FLOAT) {
    document.body.classList.add('floatmode');
    const reader = document.getElementById('reader');
    const home = document.getElementById('home');
    if (reader) reader.classList.remove('hidden');
    if (home) home.classList.add('hidden');
  }

  if (NATIVE) {
    const clip = document.getElementById('clip');
    if (clip) clip.addEventListener('click', async (e) => {
      e.stopImmediatePropagation();
      const t = await window.flashr.readClipboard();
      if (t && t.trim()) start(t, 'clipboard');
    }, true);

    const openfile = document.getElementById('openfile');
    if (openfile) openfile.addEventListener('click', async (e) => {
      e.stopImmediatePropagation();
      const r = await window.flashr.openFile();
      if (r && r.text) start(r.text, r.name || 'file');
    }, true);

    window.flashr.onText((t) => { if (t && t.trim()) start(t, 'selection'); });

    // Drag a file anywhere onto the window (launcher or floating reader) to read it.
    const swallow = (e) => { e.preventDefault(); e.stopPropagation(); };
    ['dragenter', 'dragover', 'dragleave'].forEach((ev) => window.addEventListener(ev, swallow, false));
    window.addEventListener('dragover', (e) => {
      // Only highlight the window for real OS file drops, not internal row drags.
      if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) document.body.classList.add('dropping');
    }, false);
    window.addEventListener('dragleave', () => document.body.classList.remove('dropping'), false);
    window.addEventListener('drop', async (e) => {
      swallow(e);
      document.body.classList.remove('dropping');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      const p = window.flashr.pathForFile(file);
      if (!p) return;
      const r = await window.flashr.readPath(p);
      if (r && r.text && r.text.trim()) start(r.text, r.name || 'file');
      else if (r && r.error) alert(r.error);
    }, false);
  }

  addEventListener('keydown', (e) => {
    if (FLOAT && e.key === 'Escape' && window.flashr) { window.flashr.closeFloat(); }
  });

  /* ----------------------- panel navigation ----------------------- */
  const panels = {
    home: document.getElementById('home'),
    settings: document.getElementById('settings'),
    workspace: document.getElementById('workspace'),
    reader: document.getElementById('reader'),
  };

  function showPanel(name) {
    Object.entries(panels).forEach(([k, el]) => {
      if (el) el.classList.toggle('hidden', k !== name);
    });
  }

  /* ----------------------- settings + hotkey recorder ----------------------- */
  const gear = document.getElementById('gear');
  if (gear) {
    gear.addEventListener('click', () => {
      const isOpen = panels.settings && !panels.settings.classList.contains('hidden');
      if (isOpen) showPanel('home');
      else { try { pause(); } catch (_) {} showPanel('settings'); renderHotkeys(); }
    });
  }

  const doneBtn = document.getElementById('settingsDone');
  if (doneBtn) doneBtn.addEventListener('click', () => showPanel('home'));

  if (NATIVE && window.flashr.onOpenSettings) {
    window.flashr.onOpenSettings(() => { showPanel('settings'); renderHotkeys(); });
  }

  function prettyAccel(a) {
    if (!a) return 'Off';
    const sym = { Command: '⌘', Cmd: '⌘', Control: '⌃', Ctrl: '⌃', Alt: '⌥', Option: '⌥', Shift: '⇧', Space: 'Space', Return: '↩', Up: '↑', Down: '↓', Left: '←', Right: '→' };
    return a.split('+').map((p) => sym[p] || p).join(' ');
  }

  const pivotInput = document.getElementById('pivot-color-input');
  const bgInput = document.getElementById('bg-color-input');

  function applyPivotColor(color) {
    document.documentElement.style.setProperty('--pivot', color);
    if (pivotInput) pivotInput.value = color;
  }

  function applyBgColor(color) {
    if (!color) return;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const lighten = (v, amt) => Math.min(255, v + amt).toString(16).padStart(2, '0');
    const bg1 = '#' + lighten(r, 10) + lighten(g, 10) + lighten(b, 10);
    document.documentElement.style.setProperty('--bg-0', color);
    document.documentElement.style.setProperty('--bg-1', bg1);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    document.body.dataset.theme = lum > 0.5 ? 'light' : 'dark';
    // Tint --glow to match the background hue so the atmos top-radial gradient
    // doesn't produce a visible white cap on medium-brightness custom colors.
    const gr = Math.min(255, r + 60); const gg = Math.min(255, g + 60); const gb = Math.min(255, b + 60);
    document.documentElement.style.setProperty('--glow',
      lum > 0.5 ? 'rgba(0,0,0,0.06)' : `rgba(${gr},${gg},${gb},0.10)`);
    if (bgInput) bgInput.value = color;
  }

  if (pivotInput) {
    pivotInput.addEventListener('input', (e) => applyPivotColor(e.target.value));
    pivotInput.addEventListener('change', async (e) => {
      if (NATIVE) await window.flashr.setPivotColor(e.target.value);
    });
  }

  if (bgInput) {
    bgInput.addEventListener('input', (e) => applyBgColor(e.target.value));
    bgInput.addEventListener('change', async (e) => {
      if (NATIVE) await window.flashr.setBgColor(e.target.value);
    });
  }

  if (NATIVE && window.flashr.onPivotColor) {
    window.flashr.onPivotColor(applyPivotColor);
  }

  if (NATIVE && window.flashr.onBgColor) {
    window.flashr.onBgColor(applyBgColor);
  }

  async function renderHotkeys() {
    if (!NATIVE) return;
    const s = await window.flashr.getSettings();
    applyPivotColor(s.pivotColor || '#ffd60a');
    applyBgColor(s.bgColor || '#070708');
    document.querySelectorAll('.hk').forEach((btn) => {
      const which = btn.dataset.hk;
      const el = document.getElementById('hk-' + which);
      if (!el) return;
      el.textContent = prettyAccel(s.hotkeys[which]);
      const taken = s.hotkeys[which] && s.registered && s.registered[which] === false;
      btn.classList.toggle('warn', !!taken);
    });
  }

  function accelFrom(e) {
    const mods = [];
    if (e.ctrlKey) mods.push('Control');
    if (e.altKey) mods.push('Alt');
    if (e.shiftKey) mods.push('Shift');
    if (e.metaKey) mods.push('Command');
    let k = e.key;
    if (['Control', 'Alt', 'Shift', 'Meta', 'OS', 'Dead'].includes(k)) return null;
    const map = { ' ': 'Space', Spacebar: 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Enter: 'Return', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete' };
    if (map[k]) k = map[k];
    else if (k.length === 1) k = k.toUpperCase();
    else k = k.charAt(0).toUpperCase() + k.slice(1);
    if (!mods.length) return null;
    return mods.concat(k).join('+');
  }

  let recording = null;
  function stopRecord() {
    if (!recording) return;
    window.removeEventListener('keydown', recording._onKey, true);
    recording.classList.remove('recording');
    recording = null;
  }
  function startRecord(btn) {
    if (recording) stopRecord();
    recording = btn;
    btn.classList.add('recording');
    const combo = btn.querySelector('.combo');
    const prev = combo.textContent;
    combo.textContent = 'Press keys…';
    const hint = document.getElementById('sethint');
    const onKey = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { combo.textContent = prev; stopRecord(); return; }
      const accel = accelFrom(e);
      if (!accel) return;
      const which = btn.dataset.hk;
      stopRecord();
      const res = await window.flashr.setHotkey(which, accel);
      if (res && res.ok) hint.textContent = 'Saved. ' + prettyAccel(accel) + ' now works from any app.';
      else hint.textContent = 'That combo is taken by the system or another app. Try another.';
      renderHotkeys();
    };
    btn._onKey = onKey;
    window.addEventListener('keydown', onKey, true);
  }

  document.querySelectorAll('.hk').forEach((btn) => btn.addEventListener('click', () => startRecord(btn)));

  const resetBtn = document.getElementById('resetHk');
  if (resetBtn) resetBtn.addEventListener('click', async () => {
    await window.flashr.resetHotkeys();
    document.getElementById('sethint').textContent = 'Reset to defaults.';
    renderHotkeys();
  });

  if (NATIVE && !FLOAT) {
    window.flashr.getSettings().then((s) => {
      const k = document.querySelector('.floatchip .k');
      if (k && s.hotkeys.flashSelection) k.textContent = prettyAccel(s.hotkeys.flashSelection);
      if (s.pivotColor) applyPivotColor(s.pivotColor);
      if (s.bgColor) applyBgColor(s.bgColor);
    });
  }
  if (NATIVE && FLOAT) {
    window.flashr.getSettings().then((s) => {
      if (s.pivotColor) applyPivotColor(s.pivotColor);
      if (s.bgColor) applyBgColor(s.bgColor);
    });
    if (window.flashr.onPivotColor) window.flashr.onPivotColor(applyPivotColor);
    if (window.flashr.onBgColor) window.flashr.onBgColor(applyBgColor);
  }

  /* ----------------------- library: projects + files ----------------------- */
  const libraryBtn = document.getElementById('library');
  const workspaceDoneBtn = document.getElementById('workspaceDone');
  const wsImportBtn = document.getElementById('ws-import');
  const wsListEl = document.getElementById('ws-list');
  const wsEmptyEl = document.getElementById('ws-empty');
  const wsListWrap = document.getElementById('ws-list-wrap');
  const wsSidebarEl = document.getElementById('ws-sidebar');
  const wsWatchedEl = document.getElementById('ws-watched');
  const wsPaneTitle = document.getElementById('ws-pane-title');
  const wsPaneActions = document.getElementById('ws-pane-actions');
  const wsConnectBtn = document.getElementById('ws-connect');
  const wsPathEl = document.getElementById('ws-path');
  const wsExtListEl = document.getElementById('ws-ext-list');
  const wsExtEmptyEl = document.getElementById('ws-ext-empty');

  // selected: 'all' | 'unsorted' | 'watched' | '<projectName>'
  const lib = { files: [], projects: [], selected: 'all' };
  let dragPath = null;

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function makeFileIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', '14 2 14 8 20 8');
    svg.append(p, poly);
    return svg;
  }

  function makeBoltIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'currentColor');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M13 2 4 14h6l-1 8 9-12h-6l1-8z');
    svg.appendChild(p); return svg;
  }

  function makeXIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('stroke-linecap', 'round');
    const l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l1.setAttribute('x1','18'); l1.setAttribute('y1','6'); l1.setAttribute('x2','6'); l1.setAttribute('y2','18');
    const l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l2.setAttribute('x1','6'); l2.setAttribute('y1','6'); l2.setAttribute('x2','18'); l2.setAttribute('y2','18');
    svg.append(l1, l2); return svg;
  }

  async function flashFile(f) {
    if (!NATIVE || !f) return;
    const r = await window.flashr.readPath(f.path);
    if (r && r.text && r.text.trim()) {
      window._flashrFromLibrary = true;
      start(r.text, r.name || 'file');
    } else {
      // Never fail silently: tell the user why nothing flashed.
      alert((r && r.error) ? r.error : "Couldn't read \"" + f.name + "\". It may be empty or unsupported.");
    }
  }

  /* ---- derived views ---- */
  function rootFiles() { return lib.files.filter((f) => !f.dir); }
  function projectFiles(name) { return lib.files.filter((f) => (f.dir || '') === name); }
  function currentProject() {
    return ['all', 'unsorted', 'watched'].includes(lib.selected) ? null : lib.selected;
  }

  /* ---- a single file row (shared by vault + watched views) ---- */
  function makeFileRow(f, opts) {
    const { removable, draggable, movable } = opts || {};
    const row = document.createElement('div');
    row.className = 'ws-file';
    row.addEventListener('click', () => flashFile(f));

    if (draggable) {
      row.draggable = true;
      row.addEventListener('dragstart', (e) => {
        dragPath = f.path; row.classList.add('dragging');
        try { e.dataTransfer.setData('text/plain', f.path); e.dataTransfer.effectAllowed = 'move'; } catch (_) {}
      });
      row.addEventListener('dragend', () => { dragPath = null; row.classList.remove('dragging'); });
    }

    const info = document.createElement('div');
    info.className = 'ws-file-info';
    const nameEl = document.createElement('span');
    nameEl.className = 'ws-file-name'; nameEl.textContent = f.name;
    const sizeEl = document.createElement('span');
    sizeEl.className = 'ws-file-size';
    sizeEl.textContent = formatSize(f.size) + (lib.selected === 'all' && f.dir ? '  ·  ' + f.dir : '');
    info.append(nameEl, sizeEl);

    const actions = document.createElement('div');
    actions.className = 'ws-file-actions';

    const flashBtn = document.createElement('button');
    flashBtn.className = 'ws-flash-btn';
    flashBtn.append(makeBoltIcon(), document.createTextNode('Flash'));
    flashBtn.addEventListener('click', (e) => { e.stopPropagation(); flashFile(f); });
    actions.appendChild(flashBtn);

    // Move control: only for vault files, and only when there's somewhere to move.
    if (movable && (lib.projects.length || f.dir)) {
      const move = document.createElement('select');
      move.className = 'ws-move';
      const ph = document.createElement('option');
      ph.textContent = 'Move…'; ph.value = '__'; ph.disabled = true; ph.selected = true;
      move.appendChild(ph);
      const optU = document.createElement('option');
      optU.textContent = 'Unsorted'; optU.value = ''; move.appendChild(optU);
      for (const p of lib.projects) {
        const o = document.createElement('option'); o.textContent = p; o.value = p; move.appendChild(o);
      }
      move.addEventListener('click', (e) => e.stopPropagation());
      move.addEventListener('change', async (e) => { e.stopPropagation(); await doMove(f.path, move.value); });
      actions.appendChild(move);
    }

    if (removable) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'ws-remove-btn';
      removeBtn.title = 'Remove from library';
      removeBtn.appendChild(makeXIcon());
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Remove "' + f.name + '" from your library? This deletes the imported copy.')) return;
        const res = await window.flashr.removeFromVault(f.path);
        if (res && res.ok) applyVault(res);
        else if (res && res.error) alert(res.error);
      });
      actions.appendChild(removeBtn);
    }

    row.append(makeFileIcon(), info, actions);
    return row;
  }

  /* ---- sidebar (projects) ---- */
  function renderSidebar() {
    if (!wsSidebarEl) return;
    wsSidebarEl.textContent = '';

    const addNav = (key, label, count, onClick, dropTarget) => {
      const el = document.createElement('button');
      el.className = 'ws-nav' + (lib.selected === key ? ' on' : '');
      const lab = document.createElement('span'); lab.className = 'ws-nav-label'; lab.textContent = label;
      el.appendChild(lab);
      if (count != null) {
        const c = document.createElement('span'); c.className = 'ws-nav-count'; c.textContent = count; el.appendChild(c);
      }
      el.addEventListener('click', onClick);
      if (dropTarget !== undefined) {
        el.addEventListener('dragover', (e) => { if (dragPath != null) { e.preventDefault(); el.classList.add('drop'); } });
        el.addEventListener('dragleave', () => el.classList.remove('drop'));
        el.addEventListener('drop', async (e) => {
          e.preventDefault(); e.stopPropagation(); el.classList.remove('drop');
          if (dragPath != null) await doMove(dragPath, dropTarget);
        });
      }
      wsSidebarEl.appendChild(el);
      return el;
    };

    addNav('all', 'All files', lib.files.length, () => select('all'));
    if (rootFiles().length) addNav('unsorted', 'Unsorted', rootFiles().length, () => select('unsorted'), '');
    for (const p of lib.projects) addNav(p, p, projectFiles(p).length, () => select(p), p);

    const nw = document.createElement('button');
    nw.className = 'ws-nav ws-nav-new';
    nw.textContent = '+ New project';
    nw.addEventListener('click', () => startNewProject(nw));
    wsSidebarEl.appendChild(nw);

    const div = document.createElement('div'); div.className = 'ws-nav-div'; wsSidebarEl.appendChild(div);
    addNav('watched', 'Watched folder', null, () => select('watched'));
  }

  /* ---- main pane ---- */
  function renderMain() {
    const proj = currentProject();
    if (wsPaneTitle) {
      wsPaneTitle.textContent =
        lib.selected === 'all' ? 'All files' :
        lib.selected === 'unsorted' ? 'Unsorted' :
        lib.selected === 'watched' ? 'Watched folder' : proj;
    }
    if (wsPaneActions) {
      wsPaneActions.textContent = '';
      if (proj) {
        const ren = document.createElement('button'); ren.className = 'ws-pane-btn'; ren.textContent = 'Rename';
        ren.addEventListener('click', () => startRename(proj));
        const del = document.createElement('button'); del.className = 'ws-pane-btn danger'; del.textContent = 'Delete';
        del.addEventListener('click', () => deleteProject(proj));
        wsPaneActions.append(ren, del);
      }
    }

    if (lib.selected === 'watched') {
      if (wsListWrap) wsListWrap.classList.add('hidden');
      if (wsWatchedEl) wsWatchedEl.classList.remove('hidden');
      if (wsImportBtn) wsImportBtn.classList.add('hidden');
      return;
    }
    if (wsWatchedEl) wsWatchedEl.classList.add('hidden');
    if (wsListWrap) wsListWrap.classList.remove('hidden');
    if (wsImportBtn) wsImportBtn.classList.remove('hidden');

    const files = lib.selected === 'all' ? lib.files
      : lib.selected === 'unsorted' ? rootFiles()
      : projectFiles(proj);

    if (!files.length) { wsEmptyEl.classList.remove('hidden'); wsListEl.classList.add('hidden'); return; }
    wsEmptyEl.classList.add('hidden'); wsListEl.classList.remove('hidden');
    wsListEl.textContent = '';
    for (const f of files) wsListEl.appendChild(makeFileRow(f, { removable: true, draggable: true, movable: true }));
  }

  function applyVault(payload) {
    if (!payload) return;
    lib.files = payload.files || [];
    lib.projects = payload.projects || [];
    if (currentProject() && !lib.projects.includes(lib.selected)) lib.selected = 'all';
    if (lib.selected === 'unsorted' && !rootFiles().length) lib.selected = 'all';
    renderSidebar(); renderMain();
  }

  function select(key) { lib.selected = key; renderSidebar(); renderMain(); }

  async function doMove(filePath, project) {
    const res = await window.flashr.moveToProject(filePath, project);
    if (res && res.ok) applyVault(res);
    else if (res && res.error) alert(res.error);
  }

  // Electron has no window.prompt, so name projects with an inline input.
  function startNewProject(btn) {
    let done = false;
    const input = document.createElement('input');
    input.className = 'ws-nav-input'; input.placeholder = 'Project name';
    const commit = async () => {
      if (done) return; done = true;
      const name = input.value.trim();
      if (!name) { renderSidebar(); return; }
      const res = await window.flashr.createProject(name);
      if (res && res.ok) { lib.selected = res.project; applyVault(res); }
      else { if (res && res.error) alert(res.error); renderSidebar(); }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { done = true; renderSidebar(); }
    });
    input.addEventListener('blur', commit);
    btn.replaceWith(input); input.focus();
  }

  function startRename(proj) {
    let done = false;
    const input = document.createElement('input');
    input.className = 'ws-pane-input'; input.value = proj;
    const commit = async () => {
      if (done) return; done = true;
      const name = input.value.trim();
      if (!name || name === proj) { renderMain(); return; }
      const res = await window.flashr.renameProject(proj, name);
      if (res && res.ok) { lib.selected = res.project; applyVault(res); }
      else { if (res && res.error) alert(res.error); renderMain(); }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { done = true; renderMain(); }
    });
    input.addEventListener('blur', commit);
    if (wsPaneTitle) { wsPaneTitle.replaceWith(input); input.focus(); input.select(); }
  }

  async function deleteProject(proj) {
    if (!confirm('Delete project "' + proj + '"? Its files move back to Unsorted (they are not deleted).')) return;
    const res = await window.flashr.deleteProject(proj);
    if (res && res.ok) { lib.selected = 'all'; applyVault(res); }
    else if (res && res.error) alert(res.error);
  }

  /* ---- watched folder pane ---- */
  function renderWatchedFiles(files) {
    if (!files || !files.length) { wsExtEmptyEl.classList.remove('hidden'); wsExtListEl.classList.add('hidden'); return; }
    wsExtEmptyEl.classList.add('hidden'); wsExtListEl.classList.remove('hidden');
    wsExtListEl.textContent = '';
    const groups = {};
    for (const f of files) { const g = f.dir || ''; (groups[g] = groups[g] || []).push(f); }
    for (const [dir, items] of Object.entries(groups)) {
      if (dir) { const hdr = document.createElement('div'); hdr.className = 'ws-group'; hdr.textContent = dir; wsExtListEl.appendChild(hdr); }
      for (const f of items) wsExtListEl.appendChild(makeFileRow(f, { removable: false, draggable: false, movable: false }));
    }
  }
  async function loadWatched() {
    if (!NATIVE) return;
    const ws = await window.flashr.listWorkspace();
    if (ws && wsPathEl && wsConnectBtn) {
      wsPathEl.textContent = ws.path; wsPathEl.classList.remove('empty');
      wsConnectBtn.textContent = 'Change folder';
      renderWatchedFiles(ws.files);
    }
  }

  /* ---- wiring ---- */
  if (libraryBtn) {
    libraryBtn.addEventListener('click', async () => {
      const isOpen = panels.workspace && !panels.workspace.classList.contains('hidden');
      if (isOpen) { showPanel('home'); return; }
      showPanel('workspace');
      if (NATIVE) {
        const vault = await window.flashr.listVault();
        applyVault(vault);
        loadWatched();
      }
    });
  }

  if (workspaceDoneBtn) workspaceDoneBtn.addEventListener('click', () => showPanel('home'));

  if (wsImportBtn && NATIVE) {
    wsImportBtn.addEventListener('click', async () => {
      const res = await window.flashr.importToVault(currentProject() || '');
      if (res) applyVault(res);
    });
  }

  if (wsConnectBtn && NATIVE) {
    wsConnectBtn.addEventListener('click', async () => {
      const ws = await window.flashr.openWorkspace();
      if (!ws) return;
      wsPathEl.textContent = ws.path; wsPathEl.classList.remove('empty');
      wsConnectBtn.textContent = 'Change folder';
      renderWatchedFiles(ws.files);
    });
  }

})();
