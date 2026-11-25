/* Reference Desk - app */
(function () {
  const KEY = 'refdesk.v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Math.random().toString(36).slice(2, 9);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const P = window.Prompts;
  const ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const ICON_CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  /* ---------------- state ---------------- */
  const defaults = () => ({
    mode: null, view: 'project',
    settings: { title: '', logline: '', format: 'luxury ad', brand: '', length: '30 second', audience: '', mood: '', palette: '', aspect: '16:9', film: 'Kodak Vision3 250D', guards: true, language: '' },
    story: '', script: '', characters: [], places: [], props: [], shots: [], boards: [],
    sel: { characters: null, places: null, props: null, shots: null },
    done: {}, open: {}, ui: { input: {}, q: {} }
  });
  function merge(o) {
    const d = defaults();
    return { ...d, ...o, settings: { ...d.settings, ...(o.settings || {}) }, sel: { ...d.sel, ...(o.sel || {}) }, done: o.done || {}, open: o.open || {}, ui: { ...d.ui, ...(o.ui || {}), input: { ...((o.ui || {}).input || {}) }, q: { ...((o.ui || {}).q || {}) } } };
  }
  let S = load();
  function load() { try { const raw = localStorage.getItem(KEY); if (raw) return merge(JSON.parse(raw)); } catch (e) { /* storage unavailable */ } return defaults(); }
  let saveTimer;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }, 250); }

  /* ---------------- image store ---------------- */
  const DB = {
    db: null, mem: new Map(), urls: new Map(),
    open() { return new Promise((res) => { try { const r = indexedDB.open('refdesk', 1); r.onupgradeneeded = () => r.result.createObjectStore('img'); r.onsuccess = () => { this.db = r.result; res(); }; r.onerror = () => res(); } catch (e) { res(); } }); },
    put(id, blob) { this.mem.set(id, blob); if (!this.db) return Promise.resolve(); return new Promise((res) => { try { const tx = this.db.transaction('img', 'readwrite'); tx.objectStore('img').put(blob, id); tx.oncomplete = res; tx.onerror = res; } catch (e) { res(); } }); },
    get(id) { if (this.mem.has(id)) return Promise.resolve(this.mem.get(id)); if (!this.db) return Promise.resolve(null); return new Promise((res) => { try { const rq = this.db.transaction('img').objectStore('img').get(id); rq.onsuccess = () => { if (rq.result) this.mem.set(id, rq.result); res(rq.result || null); }; rq.onerror = () => res(null); } catch (e) { res(null); } }); },
    del(id) { this.mem.delete(id); if (this.urls.has(id)) { URL.revokeObjectURL(this.urls.get(id)); this.urls.delete(id); } if (!this.db) return; try { this.db.transaction('img', 'readwrite').objectStore('img').delete(id); } catch (e) { /* ignore */ } },
    async url(id) { if (!id) return null; if (this.urls.has(id)) return this.urls.get(id); const b = await this.get(id); if (!b) return null; const u = URL.createObjectURL(b); this.urls.set(id, u); return u; }
  };
  function hydrate(root = document) { $$('img[data-img]', root).forEach(async (el) => { const u = await DB.url(el.dataset.img); if (u) el.src = u; else el.closest('.thumb, .thumb-lg')?.classList.add('is-missing'); }); }
  async function addImage(file) { const id = 'img_' + uid(); await DB.put(id, file); return id; }

  /* ---------------- field definitions ---------------- */
  const FIELDS = {
    characters: [
      ['Identity', [
        ['name', 'What is the character called?', 'Maya'],
        ['role', 'Main or secondary character?', '', [['main', 'Main character'], ['secondary', 'Secondary character']]],
        ['age', 'How old are they?', '32'], ['gender', 'Gender', 'woman'],
        ['ethnicity', 'Ethnicity or heritage', 'British-Indian'],
        ['height', 'How tall?', '172 cm'], ['build', 'Body build', 'slim, athletic']
      ]],
      ['Face and hair', [
        ['faceShape', 'Face shape', 'oval, defined cheekbones'], ['eyes', 'Eyes', 'dark brown, almond-shaped'],
        ['hair', 'Hair: color, length, texture, style', 'black, shoulder-length, loose waves, middle part', null, true],
        ['features', 'Anything that makes the face recognizable?', 'small mole above left lip, light freckles', null, true],
        ['details', 'Small details that must be exact (glasses, jewellery, watch)', 'thin rectangular glasses, three silver chain necklaces', null, true]
      ]],
      ['Wardrobe', [
        ['outfit', 'What are they wearing? Include colors and materials.', 'cream silk blouse, high-waisted black wool trousers, black leather loafers, thin gold chain', null, true],
        ['outfit2', 'Do they get a second look later? (hair, glasses or outfit change)', 'hair down below the shoulders, no glasses', null, true]
      ]],
      ['Performance', [
        ['want', 'What do they want in this story?', 'to be noticed for once without being laughed at', null, true],
        ['emotion', 'The key emotion they show in the story', 'quiet confidence, a hint of mischief'],
        ['voice', 'How do they sound? Describe the accent by its sounds.', 'low, soft, unhurried; French accent: soft uvular r, dropped h, rounded vowels', null, true]
      ]]
    ],
    places: [
      ['The place', [
        ['name', 'What is this place called?', 'Mayfair kitchen'],
        ['kind', 'Inside or outside?', '', [['interior', 'Interior'], ['exterior', 'Exterior']]],
        ['description', 'Describe it in one line', 'bright modern kitchen in a Georgian townhouse', null, true],
        ['mainArea', 'Where does the action happen?', 'the marble kitchen island'],
        ['materials', 'Key materials and surfaces', 'Calacatta marble, white oak floor, brass handles', null, true]
      ]],
      ['Light and time', [
        ['time', 'What time of day?', 'late afternoon, 5 pm'],
        ['lightSource', 'Where does the main light come from?', 'low warm sun through tall sash windows'],
        ['lightDir', 'From which side?', 'the left wall'],
        ['weather', 'Weather (if outside)', 'overcast, damp pavement']
      ]],
      ['Realism and variants', [
        ['livedIn', 'Small signs that people live or work here', 'a folded linen towel, a slightly crooked stool, dust in the sunbeam', null, true],
        ['coverage', 'An extra camera position you will need', 'low angle from the doorway at knee height looking toward the window', null, true],
        ['variant', 'A second lighting or weather version?', 'night, 10 pm, warm tungsten pendant lamps on, blue moonlight through the windows', null, true],
        ['layout', 'Location map: what is on each side, who stands where (compass)', 'West wall: tall windows. South end: the white table, he sits at its north corner facing north. The mark is 4 m north of him. All cameras on the east side.', null, true]
      ]]
    ],
    props: [
      ['The object', [
        ['name', 'What is the prop or product called?', 'HILLS sunglasses'],
        ['what', 'What exactly is it?', 'black acetate sunglasses with dark green lenses'],
        ['size', 'How big is it in real life?', '14 cm wide'],
        ['wearable', 'Is it worn on the body?', '', [['no', 'No'], ['yes', 'Yes: glasses, watch, jewelry, clothing']]]
      ]],
      ['Look', [
        ['materials', 'Materials', 'polished acetate, metal hinges, tinted glass'], ['colors', 'Colors', 'gloss black, bottle green'],
        ['logoText', 'Logo or label text, spelled exactly', 'HILLS'], ['detail', 'Which detail deserves a macro close-up?', 'the engraved logo on the temple arm']
      ]],
      ['Use and staging', [
        ['usage', 'How is it used or worn?', 'worn on the face, pushed up on the head'],
        ['scaleObject', 'An everyday object to show its size', 'an espresso cup'],
        ['surface', 'What should it sit on for the hero shot?', 'a slab of travertine stone']
      ]]
    ]
  };
  const SHORT = { name: 'Name', role: 'Role', age: 'Age', gender: 'Gender', ethnicity: 'Ethnicity', height: 'Height', build: 'Build', faceShape: 'Face shape', eyes: 'Eyes', hair: 'Hair', features: 'Distinguishing features', outfit: 'Main outfit', outfit2: 'Second look', details: 'Exact details', want: 'Want', layout: 'Location map', acting: 'Acting task', emotion: 'Key emotion', voice: 'Voice', kind: 'Type', description: 'Description', mainArea: 'Main action area', materials: 'Materials', time: 'Time of day', lightSource: 'Light source', lightDir: 'Light direction', weather: 'Weather', livedIn: 'Lived-in details', coverage: 'Extra camera position', variant: 'Variant lighting', what: 'What it is', size: 'Real size', wearable: 'Wearable', colors: 'Colors', logoText: 'Logo text', detail: 'Macro detail', usage: 'Usage', scaleObject: 'Scale object', surface: 'Hero surface' };
  const SHOT_TYPES = [['action', 'Action'], ['dialogue', 'Dialogue'], ['broll', 'B-roll'], ['transition', 'Transition']];
  const SIZES = ['EWS', 'WS', 'MS', 'MCU', 'CU', 'ECU', 'Insert'];
  const LENSES = ['24mm', '35mm', '50mm', '85mm', '100mm macro'];
  const KIND_LABEL = { characters: 'Character', places: 'Place', props: 'Prop' };
  const KIND_BUILDER = { characters: (x) => P.character(x, S, S.characters), places: (x) => P.place(x, S), props: (x) => P.prop(x, S, S.characters) };
  const ASSET = (v) => v === 'characters' || v === 'places' || v === 'props';

  /* ---------------- progress ---------------- */
  const doneKey = (scope, id, pid) => `${scope}:${id || '_'}:${pid}`;
  function stepProgress(v) {
    if (v === 'project') { const s = S.settings; const k = ['title', 'format', 'length', 'logline', 'mood', 'palette']; return k.filter((x) => (s[x] || '').trim()).length / k.length; }
    if (v === 'story') return S.story.trim() ? (S.characters.length + S.places.length + S.props.length ? 1 : 0.5) : 0;
    if (ASSET(v)) {
      if (!S[v].length) return 0;
      let tot = 0, d = 0;
      S[v].forEach((x) => { const req = KIND_BUILDER[v](x).filter((p) => p.required); tot += req.length + 1; d += req.filter((p) => S.done[doneKey(v, x.id, p.id)]).length + (x.sheet ? 1 : 0); });
      return d / tot;
    }
    if (v === 'script') return S.script.trim() ? 1 : Object.keys(S.done).some((k) => k.startsWith('script:')) ? 0.5 : 0;
    if (v === 'shotlist') return S.shots.length ? 1 : 0;
    if (v === 'shots') { if (!S.shots.length) return 0; let d = 0; S.shots.forEach((s) => { d += shotDone(s); }); return d / (S.shots.length * 2); }
    return 0;
  }
  function shotDone(s) { return (S.done[doneKey('shots', s.id, 'A')] ? 1 : 0) + ((S.done[doneKey('shots', s.id, 'B')] || S.done[doneKey('shots', s.id, 'C')]) ? 1 : 0); }

  /* ---------------- navigation ---------------- */
  const NAV = [
    ['project', 'Project'], ['story', 'Story breakdown'], ['characters', 'Characters'], ['places', 'Places'], ['props', 'Props'],
    ['script', 'Script and dialogue'], ['shotlist', 'Shotlist'], ['board', 'Storyboard'], ['shots', 'Shots'], ['edit', 'Edit and assembly'], ['fix', 'Fix library']
  ];
  function ring(p, n) {
    const C = 2 * Math.PI * 9;
    return `<span class="ring-wrap${p >= 1 ? ' is-full' : ''}"><svg class="ring" viewBox="0 0 24 24" aria-hidden="true"><circle class="ring-bg" cx="12" cy="12" r="9"/><circle class="ring-fg" cx="12" cy="12" r="9" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.min(1, p))}"/></svg><b>${n}</b></span>`;
  }
  function renderNav() {
    let sum = 0;
    $('#nav').innerHTML = NAV.map(([v, label], i) => {
      const skip = v === 'fix' || v === 'edit' || v === 'board'; const p = skip ? 0 : stepProgress(v); if (!skip) sum += p;
      const c = ASSET(v) || v === 'shots' ? S[v].length : '';
      return `<li><button class="nav-item${S.view === v ? ' is-active' : ''}" data-go="${v}" ${S.view === v ? 'aria-current="page"' : ''}>
        ${ring(p, i)}<span class="nav-label">${label}</span><span class="nav-count">${c || ''}</span></button></li>`;
    }).join('');
    const pct = Math.round((sum / (NAV.length - 3)) * 100);
    $('#overallPct').textContent = pct + '%';
    $('#overallBar').style.width = pct + '%';
  }
  function go(v) { S.view = v; save(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); $('#view').focus({ preventScroll: true }); }

  /* ---------------- prompt cards ---------------- */
  const copyStore = new Map();
  function highlight(text) { return esc(text).replace(/\[([^\]\n]{2,})\]/g, '<mark>[$1]</mark>'); }
  function promptCard(p, scope, itemId) {
    const key = doneKey(scope, itemId, p.id);
    copyStore.set(key, p.text);
    const blanks = (p.text.match(/\[[^\]\n]{2,}\]/g) || []).length;
    const done = !!S.done[key];
    const open = S.open[key] !== undefined ? S.open[key] : (p.required && !done);
    const attach = (p.attach || []).length ? `
      <div class="attach"><span class="attach-title">Attach in this order</span>
        <ol>${p.attach.map((a) => `<li class="thumb${a.img ? '' : ' is-empty'}"><span class="thumb-n">${a.n}</span>
          ${a.img ? `<img data-img="${a.img}" alt="">` : '<span class="thumb-ph">no image</span>'}<span class="thumb-label">${esc(a.label)}</span></li>`).join('')}</ol></div>` : '';
    return `<article class="prompt${p.required ? ' is-required' : ''}${done ? ' is-done' : ''}${open ? ' is-open' : ''}" data-key="${key}">
      <header class="prompt-head" data-toggle="${key}">
        <button class="check" data-done="${key}" aria-pressed="${done}" aria-label="Mark ${esc(p.title)} as done">${ICON_CHECK}</button>
        <span class="prompt-tag">${esc(p.tag)}</span>
        <h3>${esc(p.title)}</h3>
        <span class="blanks${blanks ? '' : ' is-zero'}">${blanks ? blanks + ' blank' + (blanks > 1 ? 's' : '') : 'ready'}</span>
        ${ICON_CHEV}
      </header>
      <div class="prompt-body"><div class="prompt-inner">
        ${p.note ? `<p class="prompt-note">${esc(p.note)}</p>` : ''}
        ${p.link ? `<p class="prompt-note"><a class="prompt-link" href="${esc(p.link)}" target="_blank" rel="noopener">Open the meme reference</a></p>` : ''}
        ${attach}
        <pre class="prompt-text" tabindex="0">${highlight(p.text)}</pre>
        <div class="prompt-actions"><span class="hint">${blanks ? 'Highlighted parts are still blank' : 'Copying marks it as done'}</span>
          <button class="btn btn-accent btn-copy" data-copy="${key}">Copy prompt</button></div>
      </div></div>
    </article>`;
  }
  const promptList = (list, scope, id) => list.map((p) => promptCard(p, scope, id)).join('');

  /* ---------------- form helpers ---------------- */
  function field(obj, [key, label, ph, options, wide], scope, shortLabel) {
    const val = obj[key] == null ? '' : obj[key];
    const id = 'f_' + scope + '_' + key;
    const lab = shortLabel ? (SHORT[key] || label) : label;
    const filled = String(val).trim() ? ' is-filled' : '';
    if (options) return `<label class="field${filled}" for="${id}"><span>${lab}</span><select id="${id}" data-field="${key}" data-scope="${scope}">${options.map(([v, l]) => `<option value="${v}"${val === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
    if (wide) return `<label class="field field-wide${filled}" for="${id}"><span>${lab}</span><textarea id="${id}" rows="2" data-field="${key}" data-scope="${scope}" placeholder="${esc(ph)}">${esc(val)}</textarea></label>`;
    return `<label class="field${filled}" for="${id}"><span>${lab}</span><input id="${id}" type="text" data-field="${key}" data-scope="${scope}" value="${esc(val)}" placeholder="${esc(ph)}" autocomplete="off"></label>`;
  }
  function imageSlot(title, hint, ids, slot, multiple) {
    const list = (ids || []).filter(Boolean);
    return `<div class="slot" data-slot="${slot}">
      <div class="slot-head"><strong>${title}</strong><span>${hint}</span></div>
      <div class="slot-grid">
        ${list.map((id, i) => `<figure class="thumb-lg"><img data-img="${id}" alt="${esc(title)} ${i + 1}"><span class="thumb-n">${i + 1}</span>
          <button class="thumb-x" data-remove-img="${id}" data-slot="${slot}" aria-label="Remove image">Remove</button></figure>`).join('')}
        ${multiple || !list.length ? `<label class="drop" tabindex="0"><input type="file" accept="image/*" ${multiple ? 'multiple' : ''} data-upload="${slot}" hidden>
          <span class="drop-plus">+</span><span>${list.length ? 'Add another' : 'Drop or choose'}</span></label>` : ''}
      </div></div>`;
  }
  const pageHead = (n, title, text) => `<header class="page-head"><span class="page-n">Step ${n}</span><h1>${title}</h1><p>${text}</p></header>`;
  function nextBar(v, label) {
    const i = NAV.findIndex((x) => x[0] === v);
    return `<div class="next-bar"><span>Up next: <strong>${NAV[i][1]}</strong></span><button class="btn btn-accent" data-go="${v}">${label} <span aria-hidden="true">&rarr;</span></button></div>`;
  }

  /* ---------------- views ---------------- */
  function viewProject() {
    const s = S.settings;
    const sel = (key, opts) => `<select data-field="${key}" data-scope="settings" id="s_${key}">${opts.map((o) => `<option${s[key] === o ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
    const inp = (k, l, ph, wide) => field(s, [k, l, ph, null, wide], 'settings');
    const person = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMax meet"><circle cx="50" cy="34" r="13"/><path d="M28 100V70c0-12 10-20 22-20s22 8 22 20v30z"/></svg>';
    const room = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 100L30 68h40l30 32z" opacity=".7"/><rect x="38" y="22" width="24" height="34"/><path d="M0 0l30 30v38L0 100z" opacity=".5"/></svg>';
    const thing = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><rect x="38" y="22" width="24" height="10" rx="2"/><rect x="32" y="34" width="36" height="50" rx="6"/></svg>';
    return `
    <section class="hero">
      <div>
        <p class="eyebrow"><span class="rec" aria-hidden="true"></span>AI video pre-production</p>
        <h1>Lock the assets.<br><span>Then shoot.</span></h1>
        <p class="lede">AI video looks fake when every shot reinvents the face, the room and the product. Lock each one into a reference sheet first, and every scene prompt is built from those sheets with the realism rules already written in.</p>
      </div>
      <div class="viewfinder" aria-hidden="true">
        <i class="vf-corner"></i><i class="vf-corner"></i><i class="vf-corner"></i><i class="vf-corner"></i>
        <div class="vf-hud"><span><span class="rec"></span>REC</span><span id="tc">00:00:00:00</span></div>
        <div class="vf-sheets">
          <div class="vf-sheet is-on">${person}<span>CHARACTER</span></div>
          <div class="vf-sheet">${room}<span>PLACE</span></div>
          <div class="vf-sheet">${thing}<span>PROP</span></div>
        </div>
        <div class="vf-foot"><span>#808080</span><span>${esc(s.film)}</span><span>${esc(s.aspect)}</span></div>
      </div>
    </section>

    <section class="paths">
      <button class="path${S.mode === 'assets' ? ' is-chosen' : ''}" data-mode="assets">
        <span class="path-n">Path A</span><span class="path-title">I have reference pictures</span>
        <span class="path-text">Upload a character, a place and a product. Answer a few questions for each and get the three sheets, then build the story around them.</span>
        <span class="path-go"><i>&rarr;</i>Start with characters</span>
      </button>
      <button class="path${S.mode === 'story' ? ' is-chosen' : ''}" data-mode="story">
        <span class="path-n">Path B</span><span class="path-title">I already have a story</span>
        <span class="path-text">Paste the story. One prompt breaks it into characters, places, props and shots. Then you refine each one with guided questions.</span>
        <span class="path-go"><i>&rarr;</i>Start with the story</span>
      </button>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Project settings</h2><p>Used in every prompt.</p></div>
      <div class="form-grid">
        ${inp('title', 'Project title', 'Golden Hour')}
        ${inp('format', 'Format', 'luxury ad, short film, music video, UGC ad')}
        ${inp('length', 'Length', '30 second')}
        ${inp('brand', 'Brand or purpose', 'an eyewear brand')}
        ${inp('logline', 'Logline (one sentence)', 'A woman\'s ordinary afternoon in London turns into a quiet show of confidence.', true)}
        ${inp('audience', 'Audience', '25 to 40, style-conscious')}
        ${inp('mood', 'Mood', 'aspirational, playful, quiet confidence')}
        ${inp('palette', 'Color palette', 'warm creams, honey, deep bottle green', true)}
        ${inp('language', 'Dialogue language and accent', 'natural conversational Malaysian Malay with casual English, Malaysian accent', true)}
        <label class="field" for="s_aspect"><span>Aspect ratio</span>${sel('aspect', ['16:9', '9:16', '4:5', '1:1', '2.39:1'])}</label>
        <label class="field" for="s_film"><span>Film look</span>${sel('film', ['Kodak Vision3 250D', 'Kodak Vision3 500T', 'Kodak Portra 400', 'Fujifilm Eterna 250D', 'Kodak Ektachrome 100'])}</label>
        <label class="switch" for="s_guards"><input type="checkbox" id="s_guards" data-field="guards" data-scope="settings" ${s.guards !== false ? 'checked' : ''}><span class="switch-track"></span>
          <span class="switch-text"><strong>Built-in quality guards</strong>Adds the fix-library rules to every prompt: identity lock, real skin, hands, exact logo spelling, a handheld camera, real physics and lip-sync.</span></label>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>How it works</h2><p>Three stages, always in this order.</p></div>
      <ol class="flow">
        <li><span>01 / Lock</span><strong>Sheets</strong><p>One reference sheet per character, place and prop. People and products on flat 18% grey. Places empty, with fixed angles and one light direction.</p></li>
        <li><span>02 / Plan</span><strong>Shotlist</strong><p>Script and dialogue sized for lip-sync, then shots with one action, one lens and one named light each.</p></li>
        <li><span>03 / Shoot</span><strong>Frames</strong><p>A start frame per shot built from the sheets, then a time-coded video spec. Trim, grade once, add real sound.</p></li>
      </ol>
    </section>`;
  }

  function importPanel(kind, title, hint) {
    return `<section class="panel import">
      <div class="panel-head"><h2>${title}</h2><p>${hint}</p></div>
      <textarea id="import_${kind}" rows="6" class="mono" placeholder='{ "characters": [ ... ] }'></textarea>
      <div class="row"><button class="btn btn-ink" data-import="${kind}">Import</button><span class="import-msg" id="msg_${kind}" role="status"></span></div>
    </section>`;
  }

  function viewStory() {
    return `${pageHead('01', 'Story or brief breakdown', 'Paste a story or a full creative brief, copy the breakdown prompt into Claude or ChatGPT, and paste the answer back. Every character, place, prop and shot is filled in for you, with dialogue, captions, sound and edit notes.')}
    <section class="panel">
      <label class="field field-wide" for="story"><span>Your story, script, idea or full creative brief</span>
      <textarea id="story" rows="9" data-field="story" data-scope="root" placeholder="Paste the whole story here. Rough notes are fine.">${esc(S.story)}</textarea></label>
    </section>
    <p class="live">Live prompt</p>
    <div id="prompts">${promptCard(P.breakdown(S), 'story', null)}</div>
    ${importPanel('breakdown', 'Paste the answer', 'Adds every character, place, prop and shot. Nothing already here is deleted.')}
    ${boardsPanel()}
    ${nextBar('characters', 'Refine characters')}`;
  }

  function boardsPanel() {
    const boards = S.boards || [];
    return `<section class="panel">
      <div class="panel-head"><h2>Reference boards</h2><p>Storyboards, meme sheets or mood boards. Cut panels out of them and assign each one to a shot as its composition reference.</p></div>
      <div class="slot" data-slot="boards"><div class="slot-grid boards-grid">
        ${boards.map((b) => `<figure class="thumb-lg board"><img data-img="${b.img}" alt="${esc(b.name || 'Board')}">
          <button class="board-cut" data-cut="${b.id}">Cut panels</button>
          <button class="thumb-x" data-remove-board="${b.id}" aria-label="Remove board">Remove</button></figure>`).join('')}
        <label class="drop" tabindex="0"><input type="file" accept="image/*" multiple data-upload="boards" hidden><span class="drop-plus">+</span><span>Add a board</span></label>
      </div></div>
    </section>`;
  }

  /* ---------------- board cutter ---------------- */
  const cut = { board: null, rect: null, shot: null };
  function openCutter(boardId, shotId) {
    const b = (S.boards || []).find((x) => x.id === boardId) || (S.boards || [])[0];
    if (!b) { toast('Add a reference board on the Story page first'); return; }
    cut.board = b; cut.rect = null;
    cut.shot = shotId || (S.shots.find((s) => !s.refImg) || S.shots[0] || {}).id || null;
    const m = document.createElement('div');
    m.className = 'modal'; m.id = 'cutter';
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="Cut panels from a board">
      <header class="modal-head"><div><strong>Cut panels</strong><span>Drag a box around a panel, pick the shot, then assign. Outlined boxes are already assigned.</span></div>
        <button class="btn btn-ghost" data-closecut="1">Done</button></header>
      ${(S.boards || []).length > 1 ? `<div class="tabs board-tabs">${S.boards.map((x, i) => `<button class="tab${x.id === b.id ? ' is-active' : ''}" data-cutboard="${x.id}">${esc(x.name || 'Board ' + (i + 1))}</button>`).join('')}</div>` : ''}
      <div class="crop-stage" id="cropStage"><img id="cropImg" alt="" draggable="false"><div class="crop-marks" id="cropMarks"></div><div class="crop-sel" id="cropSel" hidden></div></div>
      <div class="row crop-row">
        <label class="field"><span>Assign to shot</span><select id="cropShot">${S.shots.map((s) => `<option value="${s.id}"${s.id === cut.shot ? ' selected' : ''}>${esc(s.code || s.id)}${s.refImg ? ' (has reference)' : ''}${s.meme ? ' / ' + esc(s.meme) : ''}</option>`).join('')}</select></label>
        <button class="btn btn-accent" id="cropAssign" disabled>Assign panel</button>
      </div></div>`;
    document.body.appendChild(m);
    document.body.classList.add('has-modal');
    DB.url(b.img).then((u) => { $('#cropImg').src = u || ''; });
    drawMarks();
    const stage = $('#cropStage');
    let start = null;
    const pos = (e) => { const r = stage.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }; };
    stage.addEventListener('pointerdown', (e) => { e.preventDefault(); start = pos(e); stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', (e) => {
      if (!start) return; const p = pos(e);
      cut.rect = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
      const sel = $('#cropSel'); sel.hidden = false;
      Object.assign(sel.style, { left: cut.rect.x * 100 + '%', top: cut.rect.y * 100 + '%', width: cut.rect.w * 100 + '%', height: cut.rect.h * 100 + '%' });
    });
    stage.addEventListener('pointerup', () => { start = null; $('#cropAssign').disabled = !(cut.rect && cut.rect.w > 0.02 && cut.rect.h > 0.02); });
  }
  function drawMarks() {
    const box = $('#cropMarks'); if (!box || !cut.board) return;
    box.innerHTML = S.shots.filter((s) => s.ref && s.ref.board === cut.board.id).map((s) => `<span class="crop-mark" style="left:${s.ref.x * 100}%;top:${s.ref.y * 100}%;width:${s.ref.w * 100}%;height:${s.ref.h * 100}%"><b>${esc(s.code)}</b></span>`).join('');
  }
  function closeCutter() { $('#cutter')?.remove(); document.body.classList.remove('has-modal'); render(); }
  async function cropToImage(boardImg, r) {
    const blob = await DB.get(boardImg); if (!blob) return null;
    const bmp = await createImageBitmap(blob);
    const sx = Math.round(r.x * bmp.width), sy = Math.round(r.y * bmp.height), sw = Math.max(1, Math.round(r.w * bmp.width)), sh = Math.max(1, Math.round(r.h * bmp.height));
    const c = document.createElement('canvas'); c.width = sw; c.height = sh;
    c.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh);
    const out = await new Promise((res) => c.toBlob(res, 'image/png'));
    return out ? addImage(out) : null;
  }
  async function assignCut() {
    const shot = S.shots.find((s) => s.id === $('#cropShot').value); if (!shot || !cut.rect) return;
    if (shot.refImg) DB.del(shot.refImg);
    shot.ref = { board: cut.board.id, ...cut.rect };
    shot.refImg = await cropToImage(cut.board.img, cut.rect);
    save(); drawMarks(); toast(`Panel assigned to ${shot.code}`);
    const sel = $('#cropShot'); const opt = sel.selectedOptions[0]; if (opt && !opt.textContent.includes('(has reference)')) opt.textContent = opt.textContent.replace(/( \/ .*)?$/, ' (has reference)$1');
    if (sel.selectedIndex < sel.options.length - 1) sel.selectedIndex += 1;
    cut.rect = null; $('#cropSel').hidden = true; $('#cropAssign').disabled = true;
  }
  async function materializeRefs() {
    let changed = false;
    for (const s of S.shots) {
      if (!s.ref) continue;
      if (s.refImg && await DB.get(s.refImg)) continue;
      const b = (S.boards || []).find((x) => x.id === s.ref.board); if (!b) continue;
      const id = await cropToImage(b.img, s.ref); if (id) { s.refImg = id; changed = true; }
    }
    if (changed) { save(); render(); }
  }

  function guideCard(kind, sel) {
    const qs = FIELDS[kind].flatMap(([g, fs]) => fs.map((f) => ({ g, f })));
    const i = Math.max(0, Math.min(S.ui.q[sel.id] || 0, qs.length));
    if (i >= qs.length) {
      return `<section class="guide"><div class="guide-done">
        <h3>All questions answered</h3><p>The prompts on the right are filled in. Copy them in order, then upload your best sheet.</p>
        <div class="row" style="justify-content:center"><button class="btn btn-ghost" data-qto="0">Start over</button><button class="btn btn-accent" data-inputmode="form">Review all answers</button></div>
      </div></section>`;
    }
    const { g, f } = qs[i];
    const [key, label, ph, options, wide] = f;
    const val = sel[key] == null ? '' : sel[key];
    let control;
    if (options) control = `<div class="choices">${options.map(([v, l], j) => `<button class="choice${val === v ? ' is-on' : ''}" data-choice="${key}" value="${v}"><span>${l}</span><kbd>${j + 1}</kbd></button>`).join('')}</div>`;
    else if (wide) control = `<textarea id="gq" class="guide-input" rows="2" data-field="${key}" data-scope="${kind}" placeholder="${esc(ph)}">${esc(val)}</textarea>`;
    else control = `<input id="gq" class="guide-input" type="text" data-field="${key}" data-scope="${kind}" value="${esc(val)}" placeholder="${esc(ph)}" autocomplete="off">`;
    return `<section class="guide" data-guide="${kind}">
      <div class="guide-top"><span>${g}</span><span>${i + 1} / ${qs.length}</span></div>
      <div class="guide-bar"><span style="width:${(i / qs.length) * 100}%"></span></div>
      <label class="guide-q" for="gq">${label}</label>
      ${control}
      ${!options && ph ? `<p class="guide-hint">Example: <button data-example="${esc(ph)}" title="Use this example">${esc(ph)}</button></p>` : ''}
      <div class="guide-nav">
        <button class="btn btn-ghost" data-qstep="-1" ${i === 0 ? 'disabled' : ''}>Back</button>
        <button class="btn btn-ghost" data-qstep="1">Skip</button>
        <button class="btn btn-accent" data-qstep="1">Next <kbd>Enter</kbd></button>
      </div>
      <div class="guide-dots">${qs.map((q, j) => `<button class="gdot${j === i ? ' is-cur' : ''}${String(sel[q.f[0]] || '').trim() ? ' is-filled' : ''}" data-qto="${j}" aria-label="${esc(SHORT[q.f[0]] || q.f[1])}" title="${esc(SHORT[q.f[0]] || q.f[1])}"></button>`).join('')}</div>
    </section>`;
  }

  function viewAssets(kind) {
    const list = S[kind];
    const label = KIND_LABEL[kind];
    const n = { characters: '02', places: '03', props: '04' }[kind];
    const title = { characters: 'Characters', places: 'Places', props: 'Props and products' }[kind];
    const intro = {
      characters: 'Upload a face photo, answer the questions, then copy the prompts in order. Upload the finished sheet so later steps can use it.',
      places: 'Upload a photo of the location and set the light. Places stay empty and lit from one side, and the layout map keeps doors and windows where they belong.',
      props: 'Upload a clear product photo with the label visible. The exact logo spelling goes into every prompt.'
    }[kind];
    let sel = list.find((x) => x.id === S.sel[kind]) || list[0];
    if (sel) S.sel[kind] = sel.id;
    const next = { characters: ['places', 'Lock places'], places: ['props', 'Lock props'], props: ['script', 'Write the script'] }[kind];
    const tabs = `<div class="tabs" role="tablist">${list.map((x, i) => `<button role="tab" class="tab${sel && x.id === sel.id ? ' is-active' : ''}" aria-selected="${!!(sel && x.id === sel.id)}" data-select="${kind}:${x.id}">${esc(x.name || label + ' ' + (i + 1))}</button>`).join('')}
      <button class="tab tab-add" data-add="${kind}">+ Add ${label.toLowerCase()}</button></div>`;
    if (!sel) {
      return `${pageHead(n, title, intro)}<div class="toolbar">${tabs}</div>
        <section class="empty"><h3>No ${label.toLowerCase()}s yet</h3><p>Add one and answer a few quick questions.</p><button class="btn btn-accent" data-add="${kind}">Add the first ${label.toLowerCase()}</button></section>
        ${nextBar(next[0], next[1])}`;
    }
    const mode = S.ui.input[kind] || 'guided';
    const seg = `<div class="seg" role="group" aria-label="Input style"><button class="${mode === 'guided' ? 'is-on' : ''}" data-inputmode="guided">Guided</button><button class="${mode === 'form' ? 'is-on' : ''}" data-inputmode="form">All fields</button></div>`;
    const form = `<section class="panel">${FIELDS[kind].map(([g, fs]) => `<fieldset><legend>${g}</legend><div class="form-grid">${fs.map((f) => field(sel, f, kind, true)).join('')}</div></fieldset>`).join('')}
      <div class="row row-end"><button class="btn btn-ghost btn-danger" data-delete="${kind}:${sel.id}">Delete this ${label.toLowerCase()}</button></div></section>`;
    const photoHint = { characters: 'Image 1: face (C0). Image 2: outfit (C0b). Image 3: details close-up (C0c).', places: 'One or two photos of the location.', props: 'Front view with the label readable.' }[kind];
    const sheetName = { characters: 'C1', places: 'P1', props: 'R1' }[kind];
    return `${pageHead(n, title, intro)}
    <div class="toolbar">${tabs}${seg}</div>
    <div class="split">
      <div class="split-form">
        ${mode === 'guided' ? guideCard(kind, sel) : form}
        <section class="panel">
          ${imageSlot('Source photos', photoHint, sel.photos, 'photos', true)}
          ${imageSlot('Finished sheet', `Your best ${sheetName} result. Later prompts use it.`, sel.sheet ? [sel.sheet] : [], 'sheet', false)}
          ${kind === 'places' ? imageSlot('Layout map', 'Your P2 result.', sel.map ? [sel.map] : [], 'map', false) : ''}
        </section>
      </div>
      <div class="split-prompts"><p class="live">Live prompts</p><div id="prompts">${promptList(KIND_BUILDER[kind](sel), kind, sel.id)}</div></div>
    </div>
    ${nextBar(next[0], next[1])}`;
  }

  function viewScript() {
    return `${pageHead('05', 'Script and dialogue', 'Paste these into Claude or ChatGPT with your finished sheets attached. Then paste the final script below so the shotlist can use it.')}
    <div id="prompts">${promptList(P.script(S), 'script', null)}</div>
    <section class="panel">
      <label class="field field-wide" for="script"><span>Final script (used by the shotlist prompt)</span>
      <textarea id="script" rows="10" data-field="script" data-scope="root" placeholder="Paste the final script with dialogue here.">${esc(S.script)}</textarea></label>
    </section>
    ${nextBar('shotlist', 'Build the shotlist')}`;
  }

  const typeLabel = (t) => (SHOT_TYPES.find((x) => x[0] === t) || SHOT_TYPES[0])[1];
  function viewShotlist() {
    const scenes = {};
    S.shots.forEach((s) => { const k = s.scene || (s.code || '').split('_')[0] || 'SC01'; (scenes[k] = scenes[k] || []).push(s); });
    const boards = Object.entries(scenes).map(([k, arr]) => promptCard(P.storyboard(S, k, arr), 'board', k)).join('');
    const rows = S.shots.map((s, i) => {
      const pl = S.places.find((p) => p.id === s.placeId);
      return `<tr data-openshot="${s.id}" tabindex="0"><td class="mono">${esc(s.code || 'SH' + (i + 1))}</td><td>${esc(typeLabel(s.type))}</td><td>${esc(s.duration || '')}s</td><td>${esc(s.size || '')}</td><td>${esc(s.lens || '')}</td><td>${esc(pl ? pl.name : '')}</td><td class="t-moment">${esc(s.moment || '')}</td><td class="mono">${shotDone(s)}/2</td></tr>`;
    }).join('');
    const total = S.shots.reduce((a, s) => a + (Number(s.duration) || 0), 0);
    const [b1, b3] = P.shotlist(S);
    return `${pageHead('06', 'Shotlist', 'Generate the shotlist with an LLM and import it, or add shots by hand. Real ads cut every 2 to 5 seconds.')}
    <div id="prompts">${promptCard(b1, 'shotlist', null)}</div>
    ${importPanel('shots', 'Paste the shotlist answer', 'Shots are matched to your characters, places and props by name.')}
    <section class="panel">
      <div class="panel-head"><h2>Shots</h2><p>${S.shots.length} shots, ${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} total runtime</p></div>
      ${S.shots.length ? `<div class="table-wrap"><table class="shots"><thead><tr><th>Code</th><th>Type</th><th>Dur.</th><th>Size</th><th>Lens</th><th>Place</th><th>Moment</th><th>Done</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="muted">No shots yet.</p>'}
      <div class="row"><button class="btn btn-ink" data-add="shots">+ Add a shot</button></div>
    </section>
    ${boards ? `<div class="section-label">Storyboard per scene</div>${boards}` : ''}
    ${promptCard(b3, 'shotlist', null)}
    ${nextBar('board', 'See the storyboard')}`;
  }

  function viewShots() {
    const list = S.shots;
    let sel = list.find((x) => x.id === S.sel.shots) || list[0];
    if (sel) S.sel.shots = sel.id;
    if (!sel) {
      return `${pageHead('08', 'Shots', 'Each shot is an image first, then a video.')}
      <section class="empty"><h3>No shots yet</h3><p>Build them on the shotlist page, or add one here.</p><button class="btn btn-accent" data-add="shots">+ Add a shot</button></section>`;
    }
    const idx = list.indexOf(sel);
    const next = list[idx + 1];
    const opt = (arr, cur) => arr.map((v) => `<option${cur === v ? ' selected' : ''}>${v}</option>`).join('');
    const checks = (arr, ids, key) => arr.length ? arr.map((x) => `<label class="chip"><input type="checkbox" data-multi="${key}" value="${x.id}" ${(ids || []).includes(x.id) ? 'checked' : ''}><span>${esc(x.name || 'unnamed')}</span></label>`).join('') : '<span class="muted">none yet</span>';
    const f = (k, l, ph, wide) => field(sel, [k, l, ph, null, wide], 'shots');
    return `${pageHead('08', 'Shots', 'Each shot is an image first, then a video. Approve the start frame before you spend video credits.')}
    <div class="shot-strip" role="tablist">${list.map((s, i) => { const d = shotDone(s); return `<button role="tab" class="shot-chip${s.id === sel.id ? ' is-active' : ''}" aria-selected="${s.id === sel.id}" data-select="shots:${s.id}"><span class="mono">${esc(s.code || 'SH' + (i + 1))}</span><small>${esc(typeLabel(s.type))} / ${esc(s.duration || '?')}s</small><span class="dots"><i class="${d > 0 ? 'on' : ''}"></i><i class="${d > 1 ? 'on' : ''}"></i></span></button>`; }).join('')}<button class="shot-chip shot-add" data-add="shots">+ Add</button></div>
    <div class="split">
      <div class="split-form">
        <section class="panel">
          <fieldset><legend>Shot</legend><div class="form-grid">
            ${f('code', 'Shot code', 'SC01_SH01')}${f('scene', 'Scene', 'SC01')}
            <label class="field"><span>Type</span><select data-field="type" data-scope="shots" data-rerender="1">${SHOT_TYPES.map(([v, l]) => `<option value="${v}"${(sel.type || 'action') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
            ${f('duration', 'Clip length to generate (s)', '5')}
            ${f('screen', 'Screen time in the edit (s)', '2.5')}
            <label class="field"><span>Style</span><select data-field="style" data-scope="shots"><option value="comedy"${sel.style !== 'premium' ? ' selected' : ''}>Natural / comedy (handheld)</option><option value="premium"${sel.style === 'premium' ? ' selected' : ''}>Premium / product (smooth)</option></select></label>
            <label class="field"><span>Wardrobe</span><select data-field="outfit" data-scope="shots"><option value="main"${sel.outfit !== 'second' ? ' selected' : ''}>Main outfit</option><option value="second"${sel.outfit === 'second' ? ' selected' : ''}>Second outfit</option></select></label>
            <label class="field"><span>Speed</span><select data-field="speed" data-scope="shots"><option value="real"${sel.speed !== 'slow' ? ' selected' : ''}>Real-time</option><option value="slow"${sel.speed === 'slow' ? ' selected' : ''}>Slow motion</option></select></label>
            ${f('meme', 'Meme or reference format (optional)', 'Distracted Boyfriend')}
            <label class="field"><span>Meme key frame</span><select data-field="keyframe" data-scope="shots" data-rerender="1"><option value="start"${sel.keyframe !== 'end' ? ' selected' : ''}>Start frame only</option><option value="end"${sel.keyframe === 'end' ? ' selected' : ''}>Meme pose is the LAST frame</option></select></label>
          </div>
          ${(() => { const mm = P.memeFor(sel.meme); return mm || sel.keyframe === 'end' ? `<div class="meme-card">${mm ? `<div class="meme-head"><strong>${esc(mm.name)}</strong><span>${mm.media === 'video' ? 'video exists' : 'image only'}</span><a href="${esc(mm.link)}" target="_blank" rel="noopener">Reference</a></div><p>${esc(mm.acting)}</p>${mm.find ? `<p class="muted">Video: ${esc(mm.find)}</p>` : ''}` : ''}
            <div class="form-grid">${f('memeActing', 'How the meme is acted (leave empty to use the library)', mm ? 'uses the library guide above' : 'pose, expression and timing of the meme', true)}
            ${sel.keyframe === 'end' ? f('before', 'What we see 1 to 2 s BEFORE the meme pose (the start frame)', 'Aiman mid-step beside Sara, the Passing Woman just reaching him', true) : ''}</div></div>` : ''; })()}
          </fieldset>
          <fieldset><legend>In the shot</legend>
            <div class="chips"><span class="chips-label">Characters</span>${checks(S.characters, sel.charIds, 'charIds')}</div>
            <div class="chips"><span class="chips-label">Place</span>${S.places.length ? S.places.map((p) => `<label class="chip"><input type="radio" name="placeId" data-single="placeId" value="${p.id}" ${sel.placeId === p.id ? 'checked' : ''}><span>${esc(p.name || 'unnamed')}</span></label>`).join('') : '<span class="muted">none yet</span>'}</div>
            <div class="chips"><span class="chips-label">Props</span>${checks(S.props, sel.propIds, 'propIds')}</div>
          </fieldset>
          <fieldset><legend>Camera</legend><div class="form-grid">
            <label class="field"><span>Shot size</span><select data-field="size" data-scope="shots"><option value=""></option>${opt(SIZES, sel.size)}</select></label>
            <label class="field"><span>Lens</span><select data-field="lens" data-scope="shots"><option value=""></option>${opt(LENSES, sel.lens)}</select></label>
            ${f('aperture', 'Aperture (f/)', '2')}${f('angle', 'Angle and height', 'eye level, 1.5 m')}
            ${f('move', 'Camera move', 'handheld, slow push-in of about 20 cm', true)}
          </div></fieldset>
          <fieldset><legend>Action</legend><div class="form-grid">
            ${f('moment', 'Moment (what happens)', 'Maya lifts the sunglasses from the counter and slides them on', true)}
            ${f('blocking', 'Blocking (who is where on screen)', 'Maya right third x 65%, facing left; sunglasses foreground on the counter x 40%', true)}
            ${f('beats', sel.type === 'dialogue' ? 'Performance beats (time-coded)' : 'Action timing (time-coded)', '0-1.5s: she glances down\n1.5-3.5s: she lifts the glasses\n3.5-6s: she slides them on, small exhale', true)}
            ${f('acting', 'Acting task (motive, goal, obstacle, tactic)', 'MOTIVE: tired of fake faces. GOAL: find one real thing. OBSTACLE: everyone is the same. TACTIC: never raises his voice, it only gets quieter', true)}
            ${f('physics', 'Physics', 'the glasses have real weight; her hair moves as she turns', true)}
            ${f('light', 'Light (source and direction)', 'low warm sun from the left window, hard light on her cheek', true)}
            ${f('audio', 'Sound', 'room tone, distant traffic, click of the hinge', true)}
          </div></fieldset>
          ${sel.type === 'dialogue' ? `<fieldset><legend>Dialogue</legend><div class="form-grid">
            ${f('speaker', 'Speaker (character name)', 'Maya')}${f('delivery', 'Delivery', 'dry, quiet, slightly amused')}
            ${f('line', 'Line (under 8 seconds)', 'You were going to ask me that, weren\'t you?', true)}
          </div></fieldset>` : ''}
          <fieldset><legend>Edit (added after generation, never generated)</legend><div class="form-grid">
            ${f('onscreen', 'On-screen text / captions', 'Aku nampak semuanya.', true)}
            ${f('vo', 'Voice-over', 'Whatever your style...', true)}
            ${f('sfx', 'Sound effects', 'record scratch on the freeze', true)}
            ${f('music', 'Music cue', 'comedic instrumental continues', true)}
            ${f('edit', 'Edit notes', 'freeze last frame 0.6 s, crash zoom 150% on his face', true)}
            ${f('transition', 'Transition into the next shot', 'hard cut', true)}
          </div></fieldset>
        </section>
        <section class="panel">
          ${imageSlot('Composition reference', 'A storyboard panel or meme to copy the framing and poses from. It is attached last to the start-frame prompt.', sel.refImg ? [sel.refImg] : [], 'refImg', false)}
          ${(S.boards || []).length ? `<div class="row"><button class="btn btn-ghost" data-cutfor="${sel.id}">Cut from a board</button></div>` : ''}
        </section>
        <section class="panel">
          ${imageSlot('Approved start frame', 'The start frame you picked. The video prompt uses it.', sel.frame ? [sel.frame] : [], 'frame', false)}
          ${sel.keyframe === 'end' ? imageSlot('Approved meme key frame', 'The meme pose you picked. It becomes the LAST frame.', sel.keyImg ? [sel.keyImg] : [], 'keyImg', false) : ''}
          <div class="row row-between"><button class="btn btn-ghost" data-dup="${sel.id}">Duplicate shot</button><button class="btn btn-ghost btn-danger" data-delete="shots:${sel.id}">Delete shot</button></div>
        </section>
      </div>
      <div class="split-prompts"><p class="live">Live prompts</p><div id="prompts">${promptList(P.shotPrompts(S, sel, next), 'shots', sel.id)}</div></div>
    </div>
    ${nextBar('edit', 'Plan the edit')}`;
  }

  function viewBoard() {
    const rows = P.timeline(S);
    const fmt = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
    const vertical = (S.settings.aspect || '') === '9:16';
    const scenes = [];
    rows.forEach((r) => { const k = r.s.scene || (r.s.code || '').split('_')[0]; let g = scenes.find((x) => x.k === k); if (!g) scenes.push(g = { k, rows: [] }); g.rows.push(r); });
    const panel = (r) => {
      const s = r.s; const mm = P.memeFor(s.meme);
      const img = s.keyImg || s.frame || s.refImg;
      const place = S.places.find((p) => p.id === s.placeId);
      const who = (s.charIds || []).map((id) => (S.characters.find((c) => c.id === id) || {}).name).filter(Boolean).join(', ');
      return `<article class="sb-panel" data-openshot="${s.id}" tabindex="0">
        <div class="sb-frame${vertical ? ' is-vertical' : ''}">${img ? `<img data-img="${img}" alt="">` : `<span class="sb-empty">${esc(s.size || 'SHOT')}<br>${esc(s.lens || '')}</span>`}
          <span class="sb-code">${esc(s.code)}</span><span class="sb-time">${fmt(r.start)}  ${r.len}s</span>${mm ? `<span class="sb-meme">${esc(mm.name)}</span>` : ''}</div>
        <div class="sb-text">
          <p class="sb-tech">${esc([s.size, s.lens, s.move].filter(Boolean).join(' / '))}</p>
          <p>${esc(s.moment || '')}</p>
          ${who || place ? `<p class="sb-meta">${esc(who)}${place ? ' @ ' + esc(place.name) : ''}</p>` : ''}
          ${s.type === 'dialogue' && s.line ? `<p class="sb-line">${esc(s.speaker || '')}: "${esc(s.line)}"</p>` : ''}
          ${s.vo ? `<p class="sb-line">VO: "${esc(s.vo)}"</p>` : ''}
          ${s.onscreen ? `<p class="sb-meta">TEXT: ${esc(s.onscreen)}</p>` : ''}
          ${s.sfx ? `<p class="sb-meta">SFX: ${esc(s.sfx)}</p>` : ''}
        </div></article>`;
    };
    const lib = P.MEMES.filter((m) => S.shots.some((s) => P.memeFor(s.meme) === m));
    return `${pageHead('07', 'Storyboard', 'A black-and-white storyboard of every shot in order. Panels use the meme key frame, the start frame or the composition reference, whichever exists. Click a panel to open the shot, or print it.')}
    <div class="row sb-actions"><button class="btn btn-accent" id="printBoard">Print or save as PDF</button></div>
    <section class="sb-sheet">
      <header class="sb-title"><strong>${esc(S.settings.title || 'Untitled')}</strong><span>${rows.length} shots / ${fmt(rows.length ? rows[rows.length - 1].end : 0)} / ${esc(S.settings.aspect || '')}</span></header>
      ${scenes.map((g) => `<div class="sb-scene"><h3>${esc(g.k)}</h3><div class="sb-grid${vertical ? ' is-vertical' : ''}">${g.rows.map(panel).join('')}</div></div>`).join('') || '<p>No shots yet.</p>'}
    </section>
    ${lib.length ? `<section class="panel"><div class="panel-head"><h2>Meme references used</h2><p>How each meme is acted, and where to find the original.</p></div>
      <div class="meme-list">${lib.map((m) => `<div class="meme-card"><div class="meme-head"><strong>${esc(m.name)}</strong><span>${m.media === 'video' ? 'video exists' : 'image only, match the last frame'}</span><a href="${esc(m.link)}" target="_blank" rel="noopener">Reference</a></div><p>${esc(m.acting)}</p><p class="muted">Key frame: ${esc(m.pose)}. Timing: ${esc(m.timing)}${m.find ? ' Video: ' + esc(m.find) + '.' : ''}</p></div>`).join('')}</div></section>` : ''}
    <div class="section-label">Black-and-white storyboard prompts (one image per scene)</div>
    ${scenes.map((g) => promptCard(P.storyboard(S, g.k, g.rows.map((r) => r.s)), 'board', g.k)).join('')}
    ${nextBar('shots', 'Make the shots')}`;
  }

  function viewEdit() {
    const rows = P.timeline(S);
    const total = rows.length ? rows[rows.length - 1].end : 0;
    const fmt = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, '0')}`;
    const width = (r) => total ? (r.len / total) * 100 : 0;
    const bar = rows.map((r) => `<button class="tl-seg${r.s.style === 'premium' ? ' is-premium' : ''}" style="flex-basis:${width(r)}%" data-openshot="${r.s.id}" title="${esc(r.s.code)}: ${esc(r.s.moment || '')}"><span>${esc((r.s.code || '').replace(/^SC\d+_/, ''))}</span></button>`).join('');
    const table = rows.map((r) => `<tr data-openshot="${r.s.id}" tabindex="0"><td class="mono">${fmt(r.start)}</td><td class="mono">${esc(r.s.code)}</td><td>${r.len}s</td><td class="t-moment">${esc(r.s.onscreen || (r.s.line ? '"' + r.s.line + '"' : ''))}</td><td class="t-moment">${esc(r.s.sfx || '')}</td><td class="t-moment">${esc(r.s.edit || '')}</td></tr>`).join('');
    return `${pageHead('09', 'Edit and assembly', 'Everything you need to cut the generated clips into one video: the timeline, subtitles, sound cues, product placement and the continuity guide.')}
    <section class="panel">
      <div class="panel-head"><h2>Timeline</h2><p>${rows.length} shots, ${fmt(total)} total. Lime blocks are premium shots. Click a block to open the shot.</p></div>
      ${rows.length ? `<div class="tl">${bar}</div>
      <div class="table-wrap"><table class="shots"><thead><tr><th>In</th><th>Shot</th><th>Len</th><th>Text / dialogue</th><th>SFX</th><th>Edit</th></tr></thead><tbody>${table}</tbody></table></div>` : '<p class="muted">No shots yet.</p>'}
    </section>
    <div id="prompts">${promptList(P.assembly(S), 'edit', null)}</div>
    ${nextBar('fix', 'Fix library')}`;
  }

  function viewFix() {
    return `${pageHead('10', 'Fix library', 'When a result still looks generated. With quality guards on, these rules are already in every prompt, and these prompts repair what slips through.')}
    <div id="prompts">${promptList(P.fixes(S), 'fix', null)}</div>
    <section class="panel">
      <div class="panel-head"><h2>Video problems</h2><p>What to change in the prompt.</p></div>
      <dl class="fixes">${P.VIDEO_FIXES.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl>
    </section>
    <section class="panel">
      <div class="panel-head"><h2>Final realism check</h2><p>Watch every clip with these questions.</p></div>
      <ul class="qc">${P.QC.map((q, i) => `<li><label><input type="checkbox" id="qc${i}"><span>${q}</span></label></li>`).join('')}</ul>
    </section>`;
  }

  /* ---------------- render ---------------- */
  let tcTimer, vfTimer;
  function render() {
    copyStore.clear();
    clearInterval(tcTimer); clearInterval(vfTimer);
    renderNav();
    const v = S.view;
    $('#view').innerHTML = v === 'project' ? viewProject() : v === 'story' ? viewStory() : ASSET(v) ? viewAssets(v)
      : v === 'script' ? viewScript() : v === 'shotlist' ? viewShotlist() : v === 'shots' ? viewShots() : v === 'edit' ? viewEdit() : v === 'board' ? viewBoard() : viewFix();
    hydrate($('#view'));
    $('#projTitle').textContent = S.settings.title || 'Untitled project';
    if (v === 'project') startViewfinder();
    const gq = $('#gq'); if (gq) gq.focus({ preventScroll: true });
  }
  function startViewfinder() {
    const tc = $('#tc'); const t0 = performance.now();
    tcTimer = setInterval(() => {
      const f = Math.floor((performance.now() - t0) / (1000 / 24));
      const ff = f % 24, s = Math.floor(f / 24) % 60, m = Math.floor(f / 1440) % 60;
      if (tc) tc.textContent = `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
    }, 42);
    let k = 0; const sheets = $$('.vf-sheet');
    vfTimer = setInterval(() => { k = (k + 1) % sheets.length; sheets.forEach((el, i) => el.classList.toggle('is-on', i === k)); }, 1800);
  }

  function refreshPrompts() {
    const box = $('#prompts'); if (!box) return;
    const v = S.view; let html = '';
    if (v === 'story') html = promptCard(P.breakdown(S), 'story', null);
    else if (ASSET(v)) { const sel = S[v].find((x) => x.id === S.sel[v]); if (sel) html = promptList(KIND_BUILDER[v](sel), v, sel.id); }
    else if (v === 'script') html = promptList(P.script(S), 'script', null);
    else if (v === 'shotlist') html = promptCard(P.shotlist(S)[0], 'shotlist', null);
    else if (v === 'shots') { const i = S.shots.findIndex((x) => x.id === S.sel.shots); if (i > -1) html = promptList(P.shotPrompts(S, S.shots[i], S.shots[i + 1]), 'shots', S.shots[i].id); }
    else if (v === 'edit') html = promptList(P.assembly(S), 'edit', null);
    else return;
    const scroll = box.parentElement.scrollTop;
    box.innerHTML = html; box.querySelectorAll('.prompt').forEach((el) => (el.style.animation = 'none'));
    box.parentElement.scrollTop = scroll;
    hydrate(box);
  }
  let refreshTimer;
  const refreshSoon = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => { refreshPrompts(); renderNav(); }, 160); };

  function current(scope) {
    if (scope === 'settings') return S.settings;
    if (scope === 'root') return S;
    return S[scope] && S[scope].find((x) => x.id === S.sel[scope]);
  }

  /* ---------------- guided navigation ---------------- */
  function qStep(delta) {
    const kind = S.view; const sel = current(kind); if (!sel) return;
    const total = FIELDS[kind].reduce((a, [, fs]) => a + fs.length, 0);
    S.ui.q[sel.id] = Math.max(0, Math.min(total, (S.ui.q[sel.id] || 0) + delta));
    save(); rerenderGuide();
  }
  function rerenderGuide() {
    const kind = S.view; const sel = current(kind); const g = $('.guide'); if (!sel || !g) return render();
    g.outerHTML = guideCard(kind, sel);
    const gq = $('#gq'); if (gq) { gq.focus(); const l = gq.value.length; try { gq.setSelectionRange(l, l); } catch (e) { /* ignore */ } }
    refreshPrompts(); renderNav();
  }

  /* ---------------- import ---------------- */
  function parseJSON(text) {
    let s = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a > -1 && b > a) s = s.slice(a, b + 1);
    return JSON.parse(s);
  }
  const keysOf = (kind) => FIELDS[kind].flatMap(([, fs]) => fs.map((f) => f[0]));
  function cleanAsset(kind, o) {
    const out = { id: uid(), photos: [], sheet: null };
    keysOf(kind).forEach((k) => { if (o[k] != null) out[k] = String(o[k]); });
    if (kind === 'characters') out.role = out.role === 'secondary' ? 'secondary' : 'main';
    if (kind === 'places') out.kind = out.kind === 'exterior' ? 'exterior' : 'interior';
    if (kind === 'props') out.wearable = /^y/i.test(out.wearable || '') ? 'yes' : 'no';
    return out;
  }
  const byName = (arr, n) => arr.find((x) => (x.name || '').trim().toLowerCase() === String(n || '').trim().toLowerCase());
  function cleanShot(o, i) {
    const s = { id: uid(), frame: null };
    ['code', 'scene', 'type', 'style', 'speed', 'outfit', 'duration', 'screen', 'size', 'angle', 'lens', 'aperture', 'move', 'meme', 'keyframe', 'before', 'memeActing', 'moment', 'blocking', 'beats', 'acting', 'physics', 'light', 'speaker', 'line', 'delivery', 'audio', 'onscreen', 'vo', 'sfx', 'music', 'edit', 'transition'].forEach((k) => { if (o[k] != null) s[k] = String(o[k]); });
    if (!SHOT_TYPES.some((t) => t[0] === s.type)) s.type = 'action';
    s.style = s.style === 'premium' ? 'premium' : 'comedy';
    s.speed = /slow/i.test(s.speed || '') ? 'slow' : 'real';
    if (s.lens && /^\d+$/.test(s.lens.trim())) s.lens = s.lens.trim() + 'mm';
    s.aperture = (s.aperture || '').replace(/^f\/?/i, '');
    s.code = s.code || `SC01_SH${String(i + 1).padStart(2, '0')}`;
    s.scene = s.scene || s.code.split('_')[0];
    s.charIds = (o.characters || []).map((n) => byName(S.characters, n)).filter(Boolean).map((x) => x.id);
    s.propIds = (o.props || []).map((n) => byName(S.props, n)).filter(Boolean).map((x) => x.id);
    const pl = byName(S.places, o.place); s.placeId = pl ? pl.id : null;
    return s;
  }
  function doImport(kind) {
    const ta = $('#import_' + kind), msg = $('#msg_' + kind);
    try {
      const d = parseJSON(ta.value);
      const n = { characters: 0, places: 0, props: 0, shots: 0 };
      if (d.project) ['title', 'logline', 'format', 'length', 'mood', 'palette', 'aspect', 'language'].forEach((k) => { if (d.project[k] && !S.settings[k]) S.settings[k] = String(d.project[k]); });
      ['characters', 'places', 'props'].forEach((k) => (d[k] || []).forEach((o) => {
        const exist = byName(S[k], o.name);
        if (exist) { const c = cleanAsset(k, o); Object.keys(c).forEach((f) => { if (!['id', 'photos', 'sheet'].includes(f) && c[f]) exist[f] = c[f]; }); }
        else { const c = cleanAsset(k, o); S[k].push(c); S.ui.q[c.id] = 999; }
        n[k]++;
      }));
      ['characters', 'places', 'props'].forEach((k) => { if (n[k] && !S.ui.input[k]) S.ui.input[k] = 'form'; });
      const start = S.shots.length;
      (d.shots || []).forEach((o, i) => { S.shots.push(cleanShot(o, start + i)); n.shots++; });
      save(); renderNav();
      msg.textContent = `Imported ${n.characters} characters, ${n.places} places, ${n.props} props and ${n.shots} shots.`;
      msg.className = 'import-msg is-ok';
      toast('Imported');
      if (kind === 'shots') render();
    } catch (e) {
      msg.textContent = 'That is not valid JSON. Copy only the JSON block from the answer and try again.';
      msg.className = 'import-msg is-bad';
    }
  }

  /* ---------------- events ---------------- */
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('is-on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('is-on'), 1700); }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) { /* ignore */ }
      ta.remove(); return ok;
    }
  }
  function setDone(key, val) {
    S.done[key] = val; if (!val) delete S.done[key];
    const card = $(`.prompt[data-key="${CSS.escape(key)}"]`);
    if (card) { card.classList.toggle('is-done', !!val); card.querySelector('.check')?.setAttribute('aria-pressed', !!val); }
    save(); renderNav();
    if (S.view === 'shots') { const chip = $('.shot-chip.is-active .dots'); const s = current('shots'); if (chip && s) { const d = shotDone(s); chip.innerHTML = `<i class="${d > 0 ? 'on' : ''}"></i><i class="${d > 1 ? 'on' : ''}"></i>`; } }
  }
  function newItem(kind) {
    if (kind === 'characters') return { id: uid(), role: S.characters.length ? 'secondary' : 'main', photos: [], sheet: null };
    if (kind === 'places') return { id: uid(), kind: 'interior', photos: [], sheet: null, map: null };
    if (kind === 'props') return { id: uid(), wearable: 'no', photos: [], sheet: null };
    const last = S.shots[S.shots.length - 1];
    const scene = last ? last.scene || 'SC01' : 'SC01';
    const n = S.shots.filter((s) => (s.scene || 'SC01') === scene).length + 1;
    return { id: uid(), code: `${scene}_SH${String(n).padStart(2, '0')}`, scene, type: 'action', duration: '6', lens: '50mm', aperture: '2', charIds: last ? [...(last.charIds || [])] : [], placeId: last ? last.placeId : null, propIds: [], frame: null };
  }

  document.addEventListener('click', async (e) => {
    const t = e.target.closest('button, a[href], [data-go], [data-toggle], [data-openshot]');
    if (!t) return;
    const d = t.dataset;
    if (d.go) { e.preventDefault(); go(d.go); document.body.classList.remove('menu-open'); return; }
    if (d.done) { e.stopPropagation(); setDone(d.done, !S.done[d.done]); return; }
    if (d.toggle) { const card = t.closest('.prompt'); const open = !card.classList.contains('is-open'); card.classList.toggle('is-open', open); S.open[d.toggle] = open; save(); return; }
    if (d.copy) {
      const ok = await copyText(copyStore.get(d.copy) || '');
      t.textContent = ok ? 'Copied' : 'Select and copy'; t.classList.add('is-done');
      if (ok) setDone(d.copy, true);
      setTimeout(() => { t.textContent = 'Copy prompt'; t.classList.remove('is-done'); }, 1400);
      return;
    }
    if (d.mode) { S.mode = d.mode; save(); go(d.mode === 'story' ? 'story' : 'characters'); return; }
    if (d.inputmode) { S.ui.input[S.view] = d.inputmode; save(); render(); return; }
    if (d.qstep) { qStep(Number(d.qstep)); return; }
    if (d.qto !== undefined) { const sel = current(S.view); if (sel) { S.ui.q[sel.id] = Number(d.qto); if (S.ui.input[S.view] === 'form') S.ui.input[S.view] = 'guided'; save(); $('.guide') ? rerenderGuide() : render(); } return; }
    if (d.choice) { const sel = current(S.view); if (sel) { sel[d.choice] = t.value; save(); qStep(1); } return; }
    if (d.example !== undefined) { const gq = $('#gq'); if (gq) { gq.value = d.example; gq.dispatchEvent(new Event('input', { bubbles: true })); gq.focus(); } return; }
    if (d.add) {
      const item = newItem(d.add); S[d.add].push(item); S.sel[d.add] = item.id;
      if (ASSET(d.add)) { S.ui.input[d.add] = 'guided'; S.ui.q[item.id] = 0; }
      if (d.add === 'shots') S.view = 'shots';
      save(); render(); return;
    }
    if (d.select) { const [k, id] = d.select.split(':'); S.sel[k] = id; save(); render(); return; }
    if (d.openshot) { S.sel.shots = d.openshot; go('shots'); return; }
    if (d.dup) {
      const src = S.shots.find((x) => x.id === d.dup); if (!src) return;
      const copy = { ...JSON.parse(JSON.stringify(src)), id: uid(), frame: null, code: (src.code || 'SH') + 'b' };
      S.shots.splice(S.shots.indexOf(src) + 1, 0, copy); S.sel.shots = copy.id; save(); render(); toast('Shot duplicated'); return;
    }
    if (d.delete) {
      const [k, id] = d.delete.split(':'); const item = S[k].find((x) => x.id === id);
      if (!confirm(`Delete "${(item && (item.name || item.code)) || 'this item'}"? This cannot be undone.`)) return;
      S[k] = S[k].filter((x) => x.id !== id); S.sel[k] = null; save(); render(); return;
    }
    if (d.removeImg) {
      const item = current(S.view); if (!item) return;
      if (d.slot === 'photos') item.photos = (item.photos || []).filter((x) => x !== d.removeImg); else item[d.slot] = null;
      if (d.slot === 'refImg') delete item.ref;
      DB.del(d.removeImg); save(); render(); return;
    }
    if (d.import) { doImport(d.import); return; }
    if (d.cut) { openCutter(d.cut); return; }
    if (d.cutfor) { openCutter(((S.shots.find((s) => s.id === d.cutfor) || {}).ref || {}).board, d.cutfor); return; }
    if (d.cutboard) { $('#cutter')?.remove(); openCutter(d.cutboard, $('#cropShot') && $('#cropShot').value); return; }
    if (d.closecut) { closeCutter(); return; }
    if (t.id === 'cropAssign') { assignCut(); return; }
    if (t.id === 'printBoard') { window.print(); return; }
    if (d.removeBoard) {
      if (!confirm('Remove this board? Panels already cut from it stay on their shots.')) return;
      const b = S.boards.find((x) => x.id === d.removeBoard); if (b) DB.del(b.img);
      S.boards = S.boards.filter((x) => x.id !== d.removeBoard); save(); render(); return;
    }
    if (t.id === 'menuBtn') { const o = document.body.classList.toggle('menu-open'); t.setAttribute('aria-expanded', o); return; }
    if (t.id === 'exportBtn') return exportProject();
    if (t.id === 'importBtn') return $('#importFile').click();
    if (t.id === 'resetBtn') {
      if (!confirm('Start a new project? This clears every field and image saved in this browser.')) return;
      S = defaults(); save(); try { indexedDB.deleteDatabase('refdesk'); } catch (x) { /* ignore */ } DB.mem.clear(); await DB.open(); render(); return;
    }
    if (t.id === 'themeBtn') {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      const nt = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = nt;
      try { localStorage.setItem('refdesk.theme', nt); } catch (x) { /* ignore */ }
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target; const d = el.dataset;
    if (d.field && d.scope) {
      const obj = current(d.scope); if (!obj) return;
      obj[d.field] = el.type === 'checkbox' ? el.checked : el.value;
      save();
      el.closest('.field')?.classList.toggle('is-filled', !!String(el.value).trim());
      if (d.field === 'name') { const tab = $(`[data-select="${d.scope}:${obj.id}"]`); if (tab) tab.textContent = el.value || KIND_LABEL[d.scope] || ''; }
      if (d.field === 'code') { const tab = $(`[data-select="shots:${obj.id}"] .mono`); if (tab) tab.textContent = el.value; }
      if (d.scope === 'settings') { $('#projTitle').textContent = S.settings.title || 'Untitled project'; }
      if (d.rerender || ['kind', 'wearable', 'role'].includes(d.field)) { render(); return; }
      refreshSoon(); return;
    }
    if (d.multi) { const obj = current('shots'); if (!obj) return; const set = new Set(obj[d.multi] || []); el.checked ? set.add(el.value) : set.delete(el.value); obj[d.multi] = [...set]; save(); refreshSoon(); return; }
    if (d.single) { const obj = current('shots'); if (!obj) return; obj[d.single] = el.value; save(); refreshSoon(); }
  });

  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (e.key === 'Escape' && $('#cutter')) { closeCutter(); return; }
    if (el.id === 'gq' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); qStep(1); return; }
    if ($('.guide .choices') && /^[1-9]$/.test(e.key) && !/INPUT|TEXTAREA|SELECT/.test(el.tagName)) { const b = $$('.guide .choice')[Number(e.key) - 1]; if (b) { b.click(); return; } }
    if ((e.key === 'Enter' || e.key === ' ') && el.classList && el.classList.contains('drop')) { e.preventDefault(); el.querySelector('input').click(); return; }
    if ((e.key === 'Enter') && el.matches && el.matches('tr[data-openshot]')) { el.click(); }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset.upload === 'boards') { await addBoards([...el.files].filter((f) => f.type.startsWith('image/'))); return; }
    if (el.dataset.upload) { const item = current(S.view); if (!item) return; await attachFiles(item, el.dataset.upload, [...el.files].filter((f) => f.type.startsWith('image/'))); }
    if (el.id === 'importFile' && el.files[0]) importProject(el.files[0]);
  });
  async function addBoards(files) {
    if (!files.length) return;
    S.boards = S.boards || [];
    for (const f of files) S.boards.push({ id: 'b_' + uid(), name: f.name.replace(/.[^.]+$/, ''), img: await addImage(f) });
    save(); render(); toast('Board added. Click "Cut panels" to slice it.');
  }
  async function attachFiles(item, slot, files) {
    if (!files.length) return;
    for (const f of files) {
      const id = await addImage(f);
      if (slot === 'photos') { item.photos = item.photos || []; item.photos.push(id); }
      else { if (item[slot]) DB.del(item[slot]); item[slot] = id; break; }
    }
    save();
    const gq = $('#gq'); const keep = gq ? gq.value : null;
    render(); if (keep !== null && $('#gq')) $('#gq').value = keep;
    toast(slot === 'photos' ? 'Photo added' : 'Image saved');
  }
  document.addEventListener('dragover', (e) => { const s = e.target.closest('.slot'); if (s) { e.preventDefault(); s.classList.add('is-over'); } });
  document.addEventListener('dragleave', (e) => { const s = e.target.closest('.slot'); if (s && !s.contains(e.relatedTarget)) s.classList.remove('is-over'); });
  document.addEventListener('drop', (e) => {
    const s = e.target.closest('.slot'); if (!s) return; e.preventDefault(); s.classList.remove('is-over');
    if (s.dataset.slot === 'boards') { addBoards([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'))); return; }
    const item = current(S.view); if (!item) return;
    attachFiles(item, s.dataset.slot, [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')));
  });

  /* ---------------- project file ---------------- */
  const blobToData = (b) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); });
  async function exportProject() {
    const ids = new Set();
    ['characters', 'places', 'props'].forEach((k) => S[k].forEach((x) => { (x.photos || []).forEach((i) => ids.add(i)); ['sheet', 'map'].forEach((f) => x[f] && ids.add(x[f])); }));
    S.shots.forEach((s) => { ['frame', 'refImg', 'keyImg'].forEach((k) => s[k] && ids.add(s[k])); });
    (S.boards || []).forEach((b) => ids.add(b.img));
    const images = {};
    for (const id of ids) { const b = await DB.get(id); if (b) images[id] = await blobToData(b); }
    const blob = new Blob([JSON.stringify({ app: 'reference-desk', version: 1, state: S, images })], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (S.settings.title || 'project').replace(/[^\w-]+/g, '_') + '.refdesk.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Project file saved');
  }
  async function importProject(file) {
    try {
      const d = JSON.parse(await file.text()); if (!d.state) throw new Error('bad');
      for (const [id, url] of Object.entries(d.images || {})) { const b = await (await fetch(url)).blob(); await DB.put(id, b); }
      S = merge(d.state); save(); render(); toast('Project loaded'); materializeRefs();
    } catch (e) { toast('Could not read that project file'); }
    $('#importFile').value = '';
  }

  DB.open().then(() => { render(); materializeRefs(); });
})();
