(function () {
  const { IC, CATS, Sim, pinNode, decode47 } = window.Trainer;
  const PRESETS = window.PRESETS;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const nodeOf = (k) => k.split('#')[0];
  const CK = [['ck1', 1, '1 Hz'], ['ck10', 10, '10 Hz'], ['ck100', 100, '100 Hz'], ['ck1k', 1000, '1 kHz'], ['ck10k', 10000, '10 kHz'], ['ck1m', 1000000, '1 MHz']];
  const WCOL = ['#e8453c', '#2f8cff', '#2fbf71', '#f2b01e', '#b86bff', '#ff7ab6', '#20c5c5', '#f2f2f2'];
  const SEGS = { a: 'M11,9 L33,9 L30,13 L14,13Z', b: 'M35,11 L35,33 L31,31 L31,15Z', c: 'M35,37 L35,59 L31,55 L31,39Z', d: 'M11,61 L33,61 L30,57 L14,57Z', e: 'M9,37 L9,59 L13,55 L13,39Z', f: 'M9,11 L9,33 L13,31 L13,15Z', g: 'M11,35 L14,32 L30,32 L33,35 L30,38 L14,38Z' };

  const S = { ics: [], wires: [], sw: Array(10).fill(0), power: true, strict: true, paused: false, simT: 0, pick: null, sel: null, pending: null, mp: false, mpUntil: 0, exp: null, dirty: true, clocksUsed: false, notes: true, id: 1 };
  const sim = new Sim();
  let circuit = { ics: [], wires: [] };

  // ---------- panel markup ----------
  const jack = (n, extra) => `<button class="jack" type="button" data-n="${n}" data-k="${n}" aria-label="${extra || n}"></button>`;
  const unit = (n, label, cls) => `<div class="unit">${jack(n, label)}<span class="lab ${cls || ''}">${label}</span></div>`;
  const digitSvg = (m) => `<svg class="digit" viewBox="0 0 44 70" data-digit="${m}" role="img" aria-label="Digit ${m}">${Object.entries(SEGS).map(([k, d]) => `<path class="s" data-s="${k}" d="${d}"/>`).join('')}</svg>`;

  function panelHTML() {
    const segRows = [1, 2, 3, 4].map((m) => `<div class="seg-row"><div class="seg-in"><span class="seg-ic">7447 · DIGIT ${m}</span>${[8, 4, 2, 1].map((b) => unit(`dg${m}-${b}`, b)).join('')}</div>${digitSvg(m)}</div>`).join('');
    const lamps = Array.from({ length: 10 }, (_, i) => `<div class="lrow"><span class="lab">${i + 1}</span>${jack('lamp' + (i + 1), 'Lamp ' + (i + 1))}<span class="led" data-led="${i}"></span></div>`).join('');
    const sw = Array.from({ length: 10 }, (_, i) => `<button class="tog" type="button" data-sw="${i}" aria-pressed="false" aria-label="Logic switch ${i + 1}"></button>`).join('');
    const swj = Array.from({ length: 10 }, (_, i) => jack('sw' + (i + 1), 'Switch ' + (i + 1) + ' output')).join('');
    const swn = Array.from({ length: 10 }, (_, i) => `<span class="lab">${i + 1}</span>`).join('');
    const clk = CK.map(([n, , l]) => `<div class="unit">${jack(n, 'Clock ' + l)}<span class="lab">${l}</span><span class="led sm green" data-ckled="${n}"></span></div>`).join('');
    return `
    <div class="row1">
      <div class="box segbox"><h3>7 segment displays</h3><div class="segs">${segRows}</div>
        <div class="gp"><div class="unit">${jack('gnd_4', 'GND')}<span class="lab">GND</span></div><div class="unit">${jack('v5_4', '+5V')}<span class="lab">+5V</span></div></div></div>
      <div class="box bb-box"><h3>Breadboard</h3><div class="bb" id="bb"></div><p class="bb-foot">Each column strip joins its five holes. The red and blue rails run the full length. ICs bridge the centre channel.</p></div>
      <div class="rcol">
        <div class="box titlebox"><span>Digital IC Trainer</span></div>
        <div class="box"><h3>Lamp monitors</h3><div class="lampcol">${lamps}</div></div>
      </div>
    </div>
    <div class="row2">
      <div class="box pulsebox">
        <h3>Mono pulser</h3>
        <div class="unit"><button class="pbtn" type="button" id="pulse" aria-label="Mono pulser button"></button></div>
        <div class="pair">${unit('mpqn', 'Q̅')}${unit('mpq', 'Q')}</div>
        <hr>
        <h3>Power</h3>
        <div class="rowc"><button class="rocker" id="rocker" type="button" aria-pressed="true" aria-label="Power switch"></button><span class="pwled on" id="pwled"></span></div>
        <div class="pair">${unit('gnd_3', 'GND')}${unit('v5_3', '+5V')}</div>
      </div>
      <div class="box"><h3>Logic switches</h3>
        <div class="swgrid"><div class="edge"><span>HIGH</span><span>HIGH</span></div>${sw}<div class="edge"><span>LOW</span><span>LOW</span></div>${swj}${swn}</div></div>
      <div class="box sockbox" id="sock1"></div>
      <div class="box sockbox" id="sock2"></div>
      <div class="rcol">
        <div class="box"><h3>Clock generator</h3><div class="cl-grid">${clk}</div></div>
        <div class="box"><h3>Power sources</h3><div class="cl-grid">${unit('v5_1', '+5V')}${unit('v5_2', '+5V')}${unit('v12_1', '+12V')}${unit('gnd_1', 'GND')}${unit('gnd_2', 'GND')}${unit('vm12_1', '−12V')}</div></div>
      </div>
    </div>
    <svg class="wires" id="wires" aria-hidden="false"></svg>`;
  }

  // ---------- breadboard ----------
  function buildBB() {
    const bb = $('#bb');
    let h = '';
    for (let c = 1; c <= 30; c++) h += `<span class="num" style="grid-row:1;grid-column:${c + 1};font-size:7px">${c % 5 === 0 || c === 1 ? c : ''}</span>`;
    const rails = [['rtp', 2, '+'], ['rtn', 3, '−'], ['rbp', 17, '+'], ['rbn', 18, '−']];
    for (const [n, row, sg] of rails) {
      h += `<span class="rl ${sg === '+' ? 'p' : 'n'}" style="grid-row:${row};grid-column:1">${sg}</span>`;
      let k = 0;
      for (let c = 1; c <= 30; c++) if ((c - 1) % 6 !== 5) h += `<button class="hole" type="button" data-n="${n}" data-k="${n}#${k++}" style="grid-row:${row};grid-column:${c + 1}" aria-label="${n} rail"></button>`;
    }
    for (let r = 0; r < 5; r++) {
      h += `<span class="rl" style="grid-row:${5 + r};grid-column:1">${'abcde'[r]}</span><span class="rl" style="grid-row:${11 + r};grid-column:1">${'fghij'[r]}</span>`;
      for (let c = 1; c <= 30; c++) {
        h += `<button class="hole" type="button" data-n="bt:${c}" data-k="bt:${c}#${r}" style="grid-row:${5 + r};grid-column:${c + 1}" aria-label="top column ${c} row ${'abcde'[r]}"></button>`;
        h += `<button class="hole" type="button" data-n="bb:${c}" data-k="bb:${c}#${r}" style="grid-row:${11 + r};grid-column:${c + 1}" aria-label="bottom column ${c} row ${'fghij'[r]}"></button>`;
      }
    }
    h += '<div class="chan"></div><div id="bbchips" style="display:contents"></div>';
    bb.innerHTML = h;
  }
  function renderChips() {
    $('#bbchips').innerHTML = S.ics.filter((i) => i.loc.kind === 'bb').map((ic) => {
      const H = IC[ic.type].n / 2;
      return `<button type="button" class="chip-on-bb${S.sel === ic.id ? ' sel' : ''}${sim.unpowered.has(ic.id) ? ' dead' : ''}" data-ic="${ic.id}" style="grid-column:${1 + ic.loc.col} / span ${H};grid-row:9 / span 3" aria-label="IC ${ic.type}">${ic.type}</button>`;
    }).join('');
  }

  // ---------- sockets ----------
  function renderSocket(n) {
    const ic = S.ics.find((i) => i.loc.kind === 'sock' && i.loc.n === n);
    const d = ic && IC[ic.type];
    const nameAt = (q) => { if (!d) return ''; const H = d.n / 2; const p = q <= 10 ? q : q - 20 + d.n; if (q <= 10) return p <= H ? d.names[p] : ''; return p > H ? d.names[p] : ''; };
    let rows = '';
    for (let i = 0; i < 10; i++) {
      const ql = i + 1, qr = 20 - i;
      rows += `<div class="l"><span class="pl">${nameAt(ql)}</span>${jack(`s${n}:${ql}`, `Socket ${n} pin ${ql}`)}</div><span style="grid-column:2"></span><div class="r">${jack(`s${n}:${qr}`, `Socket ${n} pin ${qr}`)}<span class="pl">${nameAt(qr)}</span></div>`;
    }
    let body;
    if (d) {
      const H = d.n / 2;
      body = `<button type="button" class="ic-body${S.sel === ic.id ? ' sel' : ''}" data-ic="${ic.id}" style="grid-column:2;grid-row:1 / span ${H}" aria-label="IC ${ic.type} in socket ${n}">${ic.type}</button>`;
    } else body = `<button type="button" class="sock-empty" data-sock="${n}" style="grid-column:2;grid-row:1 / span 10">insert IC</button>`;
    $('#sock' + n).innerHTML = `<h3>IC socket ${n}</h3><div class="sock">${rows}${body}</div><p class="scap">Powered automatically when an IC is inserted.</p>`;
  }
  // grid rows need explicit placement so the body spans correctly
  function fixSockRows() {
    $$('.sock').forEach((s) => {
      $$(':scope > .l, :scope > .r', s).forEach((c, idx) => { c.style.gridRow = Math.floor(idx / 2) + 1; c.style.gridColumn = idx % 2 === 0 ? 1 : 3; });
      $$(':scope > span', s).forEach((c) => c.remove());
    });
  }

  // ---------- keys and wires ----------
  function keyAlloc() {
    const used = {};
    return (n) => {
      const i = used[n] || 0; used[n] = i + 1;
      if (n.startsWith('bt:')) return `${n}#${Math.min(i, 3)}`;
      if (n.startsWith('bb:')) return `${n}#${Math.max(4 - i, 1)}`;
      if (/^r[tb][pn]$/.test(n)) return `${n}#${i * 2}`;
      return n;
    };
  }
  const toCircuit = () => ({ ics: S.ics, wires: S.wires.map((w) => ({ a: nodeOf(w.a), b: nodeOf(w.b) })) });
  function rebuild() {
    circuit = toCircuit();
    sim.build(circuit);
    S.clocksUsed = S.wires.some((w) => /^ck/.test(nodeOf(w.a)) || /^ck/.test(nodeOf(w.b)));
    S.dirty = true;
    save();
  }
  const panel = () => $('#panel');
  function centre(el) {
    const p = panel().getBoundingClientRect(), r = el.getBoundingClientRect();
    return [r.left - p.left + r.width / 2, r.top - p.top + r.height / 2];
  }
  const findEl = (k) => panel().querySelector(`[data-k="${k}"]`);
  const SVGNS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function curve(a, b) {
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const s = 14 + Math.min(dist * 0.07, 40);
    return `M${a[0]},${a[1]} C${a[0]},${a[1] + s} ${b[0]},${b[1] + s} ${b[0]},${b[1]}`;
  }
  function drawWires() {
    const svg = $('#wires'); if (!svg) return;
    svg.innerHTML = '';
    S.wires.forEach((w, i) => {
      const ea = findEl(w.a), eb = findEl(w.b); if (!ea || !eb) return;
      const a = centre(ea), b = centre(eb), d = curve(a, b), col = WCOL[i % WCOL.length];
      const g = mk('g', { 'data-w': i });
      g.appendChild(mk('title', {})).textContent = `${nodeOf(w.a)} to ${nodeOf(w.b)} (click to remove)`;
      g.appendChild(mk('path', { d, class: 'shade' }));
      g.appendChild(mk('path', { d, class: 'cable', stroke: col }));
      g.appendChild(mk('circle', { cx: a[0], cy: a[1], r: 4, fill: col, stroke: '#000', 'stroke-width': 1 }));
      g.appendChild(mk('circle', { cx: b[0], cy: b[1], r: 4, fill: col, stroke: '#000', 'stroke-width': 1 }));
      svg.appendChild(g);
    });
    renderWList();
  }
  function renderWList() {
    const box = $('#wlist'); if (!box) return;
    box.innerHTML = S.wires.length ? S.wires.map((w, i) => `<div class="wrow" data-wi="${i}"><i style="background:${WCOL[i % WCOL.length]}"></i><span>${nodeOf(w.a)} \u2192 ${nodeOf(w.b)}</span><button type="button" class="btn" data-wdel="${i}" aria-label="Remove wire ${i + 1}">Remove</button></div>`).join('') : '<p class="hint">No wires yet.</p>';
  }
  function drawGhost(pos) {
    $$('.ghost', $('#wires')).forEach((e) => e.remove());
    if (!S.pending || !pos) return;
    const ea = findEl(S.pending); if (!ea) return;
    $('#wires').appendChild(mk('path', { d: curve(centre(ea), pos), class: 'ghost' }));
  }

  // ---------- state changes ----------
  function toast(msg) {
    let t = $('.toast'); if (t) t.remove();
    t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  function save() { try { localStorage.setItem('ictrainer.v1', JSON.stringify({ ics: S.ics, wires: S.wires, sw: S.sw, strict: S.strict, exp: S.exp, id: S.id })); } catch (e) {} }
  function loadSaved() {
    try {
      const j = JSON.parse(localStorage.getItem('ictrainer.v1') || 'null');
      if (j && Array.isArray(j.ics) && Array.isArray(j.wires) && j.ics.every((i) => IC[i.type])) { S.ics = j.ics; S.wires = j.wires; S.sw = j.sw || S.sw; S.strict = j.strict !== false; S.exp = j.exp || null; S.id = j.id || 100; return true; }
    } catch (e) {}
    return false;
  }
  function loadPreset(p) {
    const ka = keyAlloc();
    S.ics = p.ics.map((i) => ({ id: 'i' + S.id++, type: i.type, loc: { ...i.loc } }));
    S.wires = p.wires.map(([a, b]) => ({ a: ka(a), b: ka(b) }));
    S.sw = Array.from({ length: 10 }, (_, i) => (p.sw && p.sw[i]) || 0);
    S.exp = p.id; S.sel = null; S.pick = null; S.pending = null; S.notes = true;
    sim.reset(); rebuild(); renderAll();
  }
  function placeBB(col0) {
    const type = S.pick, H = IC[type].n / 2, col = Math.max(1, Math.min(col0, 30 - H + 1));
    const clash = S.ics.some((i) => i.loc.kind === 'bb' && col < i.loc.col + IC[i.type].n / 2 && i.loc.col < col + H);
    if (clash) return toast('That spot overlaps another IC. Pick a free set of columns.');
    const ic = { id: 'i' + S.id++, type, loc: { kind: 'bb', col } };
    S.ics.push(ic); S.sel = ic.id; S.pick = null; S.exp = null; rebuild(); renderAll();
    if (IC[type].n / 2 + col - 1 >= 30 && col0 !== col) toast(`Moved to column ${col} so the chip fits.`);
  }
  function placeSock(n) {
    if (S.ics.some((i) => i.loc.kind === 'sock' && i.loc.n === n)) return;
    const ic = { id: 'i' + S.id++, type: S.pick, loc: { kind: 'sock', n } };
    S.ics.push(ic); S.sel = ic.id; S.pick = null; S.exp = null; rebuild(); renderAll();
  }
  function removeSel() {
    if (!S.sel) return;
    S.ics = S.ics.filter((i) => i.id !== S.sel); S.sel = null; sim.reset(); rebuild(); renderAll();
  }
  function onNode(el) {
    const k = el.dataset.k, n = el.dataset.n;
    if (S.pick && /^b[tb]:/.test(n)) return placeBB(+n.split(':')[1]);
    if (!S.pending) { S.pending = k; el.classList.add('pending'); updateStatus(); return; }
    if (S.pending === k) { S.pending = null; el.classList.remove('pending'); drawGhost(); updateStatus(); return; }
    S.wires.push({ a: S.pending, b: k }); S.pending = null; S.exp = null;
    $$('.pending').forEach((e) => e.classList.remove('pending'));
    rebuild(); drawWires(); drawGhost(); renderNotes(); updateStatus();
  }

  // ---------- simulation loop ----------
  let nodeEls = [], acc = null, last = 0, lastStatus = 0;
  const lvl = (t, f, k) => { const x = f <= 100 ? Math.floor(t * f * 2) : Math.floor(t * f * 2 + k * 0.381966); return ((x % 2) + 2) % 2; };
  function extVals(t, k) {
    if (!S.power) return [];
    const e = [['v5', 1], ['gnd', 0], ['v12', 12], ['vm12', -12]];
    S.sw.forEach((v, i) => e.push(['sw' + (i + 1), v]));
    CK.forEach(([n, f]) => e.push([n, lvl(t, f, k)]));
    const mp = S.mp || performance.now() < S.mpUntil;
    e.push(['mpq', +mp], ['mpqn', +!mp]);
    return e;
  }
  const bit = (v) => (v === null ? 1 : v === 'x' ? 0 : +(v !== 0));
  const newAcc = () => ({ n: 0, lamp: Array(10).fill(0), seg: [0, 1, 2, 3].map(() => ({})) });
  let kctr = 0;
  function sample(t) {
    sim.settle(circuit, extVals(t, kctr++), S.strict);
    for (let i = 0; i < 10; i++) { const v = sim.net('lamp' + (i + 1)); acc.lamp[i] += v === null ? 0 : v === 'x' ? 0.5 : +(v !== 0); }
    for (let m = 0; m < 4; m++) {
      const v = bit(sim.net(`dg${m + 1}-1`)) | (bit(sim.net(`dg${m + 1}-2`)) << 1) | (bit(sim.net(`dg${m + 1}-4`)) << 2) | (bit(sim.net(`dg${m + 1}-8`)) << 3);
      for (const c of decode47(v)) acc.seg[m][c] = (acc.seg[m][c] || 0) + 1;
    }
    acc.n++;
  }
  function paintNodes() {
    for (const el of nodeEls) {
      const v = S.power ? sim.net(el.dataset.n) : null;
      const s = v === null ? '' : v === 'x' ? 'x' : v ? '1' : '0';
      if (el._v !== s) { el._v = s; if (s) el.dataset.v = s; else delete el.dataset.v; }
    }
  }
  function paintOutputs() {
    const n = acc.n || 1;
    $$('[data-led]').forEach((e) => { e.style.setProperty('--b', S.power ? Math.min(1, acc.lamp[+e.dataset.led] / n).toFixed(2) : 0); });
    $$('[data-digit]').forEach((svg) => {
      const m = +svg.dataset.digit - 1;
      $$('.s', svg).forEach((p) => p.classList.toggle('on', S.power && (acc.seg[m][p.dataset.s] || 0) / n >= 0.5));
    });
    CK.forEach(([nn, f]) => { const e = $(`[data-ckled="${nn}"]`); if (e) e.style.setProperty('--b', S.power ? (f > 100 ? 0.5 : lvl(S.simT, f, 0)) : 0); });
  }
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    const now = performance.now();
    if (S.mpUntil && now >= S.mpUntil) { S.mpUntil = 0; S.dirty = true; }
    if (!S.power) {
      if (S.dirty) { sim.reset(); sim.build(circuit); acc = newAcc(); sim.val = new Map(); paintNodes(); paintOutputs(); S.dirty = false; }
    } else if (!S.paused && S.clocksUsed) {
      acc = newAcc(); const N = 24;
      for (let i = 0; i < N; i++) { S.simT += dt / N; sample(S.simT); }
      paintNodes(); paintOutputs(); S.dirty = false;
    } else if (S.dirty) {
      if (!S.paused) S.simT += dt;
      acc = newAcc(); sample(S.simT); paintNodes(); paintOutputs(); S.dirty = false;
    }
    if (ts - lastStatus > 250) { lastStatus = ts; updateStatus(); }
    requestAnimationFrame(frame);
  }

  // ---------- status, notes, library, datasheet ----------
  function updateStatus() {
    const st = $('#status'); if (!st) return;
    let msg = '';
    if (S.pick) msg = `<b>Placing ${S.pick}.</b> Click a breadboard column or an empty socket. Esc cancels.`;
    else if (S.pending) msg = `<b>Wire started at ${nodeOf(S.pending)}.</b> Click the second end. Click the same jack again or press Esc to cancel.`;
    else if (!S.power) msg = '<b>Power is off.</b> Flip the rocker switch to turn the trainer on.';
    else if (sim.unpowered.size) {
      const names = [...sim.unpowered].map((id) => { const ic = S.ics.find((i) => i.id === id); return ic ? ic.type : ''; }).join(', ');
      msg = `<span class="warn">No power on ${names}.</span> Wire +5V to its VCC pin and GND to its GND pin (use the rails on the breadboard).`;
    } else if (sim.conflicts) msg = `<span class="warn">${sim.conflicts} shorted net${sim.conflicts > 1 ? 's' : ''}.</span> Two outputs are driving a node to different levels (red dots).`;
    else msg = S.exp ? `Experiment: <b>${(PRESETS.find((p) => p.id === S.exp) || {}).title}</b>` : 'Click a jack or breadboard hole, then another, to run a wire.';
    const sig = msg + S.ics.length + S.wires.length + S.simT.toFixed(0);
    if (st._sig !== sig) {
      st._sig = sig;
      st.innerHTML = `<span>${msg}</span><span class="legend"><span><i style="background:var(--hi)"></i>1</span><span><i style="background:var(--lo)"></i>0</span><span><i style="background:var(--bad)"></i>short</span></span>`;
    }
    $('#meta').textContent = `${S.ics.length} IC${S.ics.length === 1 ? '' : 's'} · ${S.wires.length} wire${S.wires.length === 1 ? '' : 's'} · t = ${S.simT.toFixed(1)} s`;
    const ic = S.ics.find((i) => i.id === S.sel);
    $$('[data-pin]').forEach((c) => { if (!ic) return; const v = sim.net(pinNode(ic, +c.dataset.pin)); c.setAttribute('class', c._base + (S.power && v !== null ? (v === 'x' ? ' pvx' : v ? ' pv1' : ' pv0') : '')); });
  }
  function renderNotes() {
    const p = PRESETS.find((x) => x.id === S.exp), box = $('#notes');
    if (!p || !S.notes) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<h2>${p.title}</h2><p>${p.blurb}</p><ol>${p.steps.map((s) => `<li>${s}</li>`).join('')}</ol><button class="btn x" type="button" id="hideNotes">Hide</button>`;
  }
  function renderLibrary() {
    $('#library').innerHTML = CATS.map((c) => `<div class="grp"><h3>${c}</h3><div class="chips">${Object.values(IC).filter((d) => d.cat === c).map((d) => `<button type="button" class="chipbtn" data-pick="${d.id}" aria-pressed="${S.pick === d.id}"><b>${d.id}</b><span>${d.title}</span></button>`).join('')}</div></div>`).join('');
  }
  function pkgSVG(def) {
    const N = def.n, H = N / 2, pitch = 18, top = 16, bx = 105, bw = 90, h = top * 2 + H * pitch;
    let s = `<svg viewBox="0 0 300 ${h}" role="img" aria-label="${def.id} pin diagram"><rect class="pkg" x="${bx}" y="${top - 6}" width="${bw}" height="${H * pitch + 12}" rx="3"/><path class="pin" d="M${bx + bw / 2 - 8},${top - 6} a8,8 0 0 0 16,0"/><text x="${bx + bw / 2}" y="${top + H * pitch / 2 + 4}" text-anchor="middle" transform="rotate(-90 ${bx + bw / 2} ${top + H * pitch / 2})" style="font-size:13px;font-weight:600">${def.id}</text>`;
    for (let p = 1; p <= N; p++) {
      const left = p <= H, row = left ? p - 1 : N - p, y = top + row * pitch + pitch / 2, nm = def.names[p];
      const x0 = left ? bx - 14 : bx + bw + 14, x1 = left ? bx : bx + bw;
      const base = nm === 'VCC' ? 'pw' : nm === 'GND' ? 'gd' : 'pin';
      s += `<line class="pin" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/><circle data-pin="${p}" class="${base}" cx="${x0}" cy="${y}" r="3.6" stroke="currentColor" stroke-width=".6"/>`;
      s += `<text x="${left ? bx - 22 : bx + bw + 22}" y="${y + 3.5}" text-anchor="${left ? 'end' : 'start'}">${nm}</text>`;
      s += `<text class="pnum" x="${left ? bx + 5 : bx + bw - 5}" y="${y + 3}" text-anchor="${left ? 'start' : 'end'}">${p}</text>`;
    }
    return s + '</svg>';
  }
  function renderSheet() {
    const ic = S.ics.find((i) => i.id === S.sel), id = ic ? ic.type : S.pick, box = $('#sheet');
    if (!id) { box.innerHTML = '<p class="hint">Pick an IC from the library, or click one on the board, to see its pin diagram, function and live pin levels.</p>'; return; }
    const d = IC[id];
    box.innerHTML = `<h3>${d.id} · ${d.title}</h3><p>${d.desc}</p><span class="fn">${d.fnText}</span>${pkgSVG(d)}`;
    $$('[data-pin]', box).forEach((c) => (c._base = c.getAttribute('class')));
  }
  function renderExps() {
    $('#exps').innerHTML = PRESETS.map((p) => `<div class="exp"${S.exp === p.id ? ' aria-current="true"' : ''}><span class="g">${p.group}</span><b>${p.title}</b><p>${p.blurb}</p><button class="btn" type="button" data-load="${p.id}">${S.exp === p.id ? 'Reload' : 'Load'}</button></div>`).join('');
  }
  function renderTools() {
    $('#bPause').setAttribute('aria-pressed', S.paused); $('#bPause').textContent = S.paused ? 'Resume clocks' : 'Pause clocks';
    $('#bStep').disabled = !S.paused; $('#bRemove').disabled = !S.sel; $('#cStrict').checked = S.strict;
    $$('[data-sw]').forEach((b) => b.setAttribute('aria-pressed', !!S.sw[+b.dataset.sw]));
    $('#rocker').setAttribute('aria-pressed', S.power); $('#pwled').classList.toggle('on', S.power);
  }
  function renderAll() {
    renderSocket(1); renderSocket(2); fixSockRows(); renderChips(); renderLibrary(); renderSheet(); renderExps(); renderNotes(); renderTools();
    nodeEls = $$('[data-n]', panel()); nodeEls.forEach((e) => (e._v = undefined));
    S.dirty = true; requestAnimationFrame(() => { drawWires(); }); updateStatus();
  }

  // ---------- events ----------
  function wire() {
    const pn = panel();
    pn.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-ic]');
      if (chip) { S.sel = S.sel === chip.dataset.ic ? null : chip.dataset.ic; renderChips(); renderSocket(1); renderSocket(2); fixSockRows(); nodeEls = $$('[data-n]', pn); renderSheet(); renderTools(); drawWires(); return; }
      const sk = e.target.closest('[data-sock]');
      if (sk) { if (S.pick) placeSock(+sk.dataset.sock); else toast('Choose an IC in the library first, then click the socket.'); return; }
      const t = e.target.closest('[data-sw]');
      if (t) { S.sw[+t.dataset.sw] ^= 1; S.dirty = true; renderTools(); save(); return; }
      if (e.target.closest('#rocker')) { S.power = !S.power; if (!S.power) sim.reset(); S.dirty = true; renderTools(); return; }
      const n = e.target.closest('[data-n]');
      if (n) onNode(n);
    });
    const pb = $('#pulse');
    const down = (e) => { e.preventDefault(); S.mp = true; pb.classList.add('down'); S.dirty = true; };
    const up = () => { if (!S.mp) return; S.mp = false; S.mpUntil = performance.now() + 140; pb.classList.remove('down'); S.dirty = true; };
    pb.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); pb.addEventListener('pointerleave', up);
    pb.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { if (!S.mp) down(e); } });
    pb.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
    pn.addEventListener('pointermove', (e) => {
      if (!S.pending) return;
      const r = pn.getBoundingClientRect(); drawGhost([e.clientX - r.left, e.clientY - r.top]);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { S.pick = null; S.pending = null; $$('.pending').forEach((x) => x.classList.remove('pending')); drawGhost(); renderLibrary(); renderSheet(); updateStatus(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && S.sel && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); removeSel(); }
    });
    $('#library').addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      S.pick = S.pick === b.dataset.pick ? null : b.dataset.pick; S.sel = null; S.pending = null; drawGhost();
      renderLibrary(); renderChips(); renderSheet(); renderSocket(1); renderSocket(2); fixSockRows(); nodeEls = $$('[data-n]', pn); drawWires(); updateStatus();
    });
    const wl = $('#wlist');
    wl.addEventListener('click', (e) => { const b = e.target.closest('[data-wdel]'); if (b) { S.wires.splice(+b.dataset.wdel, 1); S.exp = null; rebuild(); drawWires(); renderNotes(); } });
    wl.addEventListener('mouseover', (e) => { const r = e.target.closest('[data-wi]'); $$('#wires g').forEach((g, i) => g.classList.toggle('hl', !!r && S.wires[+r.dataset.wi] && g.dataset.w === r.dataset.wi)); });
    wl.addEventListener('mouseleave', () => $$('#wires g.hl').forEach((g) => g.classList.remove('hl')));
    $('#exps').addEventListener('click', (e) => { const b = e.target.closest('[data-load]'); if (b) { loadPreset(PRESETS.find((p) => p.id === b.dataset.load)); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    $('#notes').addEventListener('click', (e) => { if (e.target.id === 'hideNotes') { S.notes = false; renderNotes(); } });
    $('#bPause').onclick = () => { S.paused = !S.paused; S.dirty = true; renderTools(); };
    $('#bStep').onclick = () => { S.simT = (Math.floor(S.simT * 2) + 1) / 2 + 1e-6; S.dirty = true; };
    $('#bRemove').onclick = removeSel;
    $('#bClear').onclick = () => { S.ics = []; S.wires = []; S.exp = null; S.sel = null; sim.reset(); rebuild(); renderAll(); };
    $('#bWires').onclick = () => { S.wires = []; S.exp = null; rebuild(); drawWires(); renderNotes(); };
    $('#cStrict').onchange = (e) => { S.strict = e.target.checked; S.dirty = true; save(); };
    window.addEventListener('resize', drawWires);
    if (window.ResizeObserver) new ResizeObserver(drawWires).observe(pn);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawWires);
  }

  function init() {
    panel().innerHTML = panelHTML();
    buildBB();
    wire();
    if (!loadSaved()) loadPreset(PRESETS[0]); else { rebuild(); renderAll(); }
    requestAnimationFrame(frame);
  }
  init();
})();
