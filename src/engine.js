/* Digital IC Trainer: simulation engine and 74xx IC library.
   Node ids: sw1..sw10, lamp1..lamp10, ck1/ck10/ck100/ck1k/ck10k/ck1m, mpq, mpqn,
   dg{1-4}-{1,2,4,8}, v5_n, gnd_n, v12_n, vm12_n, s{1,2}:{1-16}, bt:{col}, bb:{col}, rtp rtn rbp rbn */
(function (root) {
  const IC = {};
  const nm = (s) => ['', ...s.split(' ')];
  const NAND = (a) => +!a.every(Boolean);
  const AND = (a) => +a.every(Boolean);
  const OR = (a) => +a.some(Boolean);
  const NOR = (a) => +!a.some(Boolean);
  const XOR = (a) => a.reduce((x, y) => x ^ y, 0);
  const NOT = (a) => +!a[0];
  const BUF = (a) => +!!a[0];

  function gateIC(id, title, cat, desc, fnText, groups, fn, n = 14) {
    const names = Array(n + 1).fill('NC');
    names[0] = '';
    names[n] = 'VCC';
    names[n / 2] = 'GND';
    groups.forEach(([ins, out], gi) => {
      const single = groups.length === 1;
      ins.forEach((p, k) => (names[p] = single ? 'ABCDEFGH'[k] : `${gi + 1}${'ABCD'[k]}`));
      names[out] = single ? 'Y' : `${gi + 1}Y`;
    });
    IC[id] = {
      id, title, cat, desc, fnText, n, vcc: n, gnd: n / 2, names,
      ev(g, o) { for (const [ins, out] of groups) o(out, fn(ins.map(g))); },
    };
  }
  const quad = [[[1, 2], 3], [[4, 5], 6], [[10, 9], 8], [[13, 12], 11]];
  const quadNor = [[[2, 3], 1], [[5, 6], 4], [[8, 9], 10], [[11, 12], 13]];
  const hex = [[[1], 2], [[3], 4], [[5], 6], [[9], 8], [[11], 10], [[13], 12]];
  const tri = [[[1, 2, 13], 12], [[3, 4, 5], 6], [[9, 10, 11], 8]];

  gateIC('7400', 'Quad 2-input NAND', 'Universal gates', 'Four NAND gates. NAND is a universal gate: NOT, AND, OR and every other function can be built from it.', 'Y = (A·B)′', quad, NAND);
  gateIC('7402', 'Quad 2-input NOR', 'Universal gates', 'Four NOR gates. NOR is the other universal gate.', 'Y = (A+B)′', quadNor, NOR);
  gateIC('7410', 'Triple 3-input NAND', 'Universal gates', 'Three NAND gates with three inputs each.', 'Y = (A·B·C)′', tri, NAND);
  gateIC('7427', 'Triple 3-input NOR', 'Universal gates', 'Three NOR gates with three inputs each.', 'Y = (A+B+C)′', tri, NOR);
  gateIC('7420', 'Dual 4-input NAND', 'Universal gates', 'Two NAND gates with four inputs each.', 'Y = (A·B·C·D)′', [[[1, 2, 4, 5], 6], [[9, 10, 12, 13], 8]], NAND);
  gateIC('7430', '8-input NAND', 'Universal gates', 'One NAND gate with eight inputs.', 'Y = (A·B·C·D·E·F·G·H)′', [[[1, 2, 3, 4, 5, 6, 11, 12], 8]], NAND);
  gateIC('7404', 'Hex inverter (NOT)', 'Basic gates', 'Six inverters.', 'Y = A′', hex, NOT);
  gateIC('7406', 'Hex inverter, open collector', 'Basic gates', 'Six inverters with open-collector outputs (modelled as plain inverters here).', 'Y = A′', hex, NOT);
  gateIC('7407', 'Hex buffer, open collector', 'Basic gates', 'Six non-inverting buffers (modelled as plain buffers here).', 'Y = A', hex, BUF);
  gateIC('7408', 'Quad 2-input AND', 'Basic gates', 'Four AND gates.', 'Y = A·B', quad, AND);
  gateIC('7411', 'Triple 3-input AND', 'Basic gates', 'Three AND gates with three inputs each.', 'Y = A·B·C', tri, AND);
  gateIC('7432', 'Quad 2-input OR', 'Basic gates', 'Four OR gates.', 'Y = A+B', quad, OR);
  gateIC('7486', 'Quad 2-input XOR', 'Basic gates', 'Four exclusive-OR gates.', 'Y = A⊕B', quad, XOR);

  const st0 = (st, k, init) => (st[k] === undefined ? (st[k] = init) : st[k]);

  // ---- flip-flops
  IC['7474'] = {
    id: '7474', title: 'Dual D flip-flop', cat: 'Flip-flops', n: 14, vcc: 14, gnd: 7,
    desc: 'Two D flip-flops with active-low preset and clear. Output Q takes D on the rising clock edge.',
    fnText: 'Q ← D on CLK ↑',
    names: nm('1CLR 1D 1CLK 1PRE 1Q 1QN GND 2QN 2Q 2PRE 2CLK 2D 2CLR VCC'),
    ev(g, o, st) {
      for (const f of [{ c: 1, d: 2, k: 3, p: 4, q: 5, n: 6, i: 0 }, { c: 13, d: 12, k: 11, p: 10, q: 9, n: 8, i: 1 }]) {
        const s = (st['f' + f.i] = st['f' + f.i] || { q: 0, prev: undefined });
        const clk = g(f.k), clr = g(f.c), pre = g(f.p);
        if (s.prev === undefined || st.warm) s.prev = clk;
        let both = false;
        if (!clr && !pre) { s.q = 1; both = true; }
        else if (!clr) s.q = 0;
        else if (!pre) s.q = 1;
        else if (clk && !s.prev) s.q = g(f.d);
        s.prev = clk;
        o(f.q, s.q);
        o(f.n, both ? 1 : +!s.q);
      }
    },
  };
  IC['7476'] = {
    id: '7476', title: 'Dual JK flip-flop', cat: 'Flip-flops', n: 16, vcc: 5, gnd: 13,
    desc: 'Two JK flip-flops with preset and clear (both active low). Changes on the falling clock edge. J=K=1 toggles.',
    fnText: 'JK on CLK ↓',
    names: nm('1CLK 1PRE 1CLR 1J VCC 2CLK 2PRE 2CLR 2J 2QN 2Q 2K GND 1QN 1Q 1K'),
    ev(g, o, st) {
      for (const f of [{ k: 1, p: 2, c: 3, j: 4, kk: 16, q: 15, n: 14, i: 0 }, { k: 6, p: 7, c: 8, j: 9, kk: 12, q: 11, n: 10, i: 1 }]) {
        const s = (st['f' + f.i] = st['f' + f.i] || { q: 0, prev: undefined });
        const clk = g(f.k), clr = g(f.c), pre = g(f.p);
        if (s.prev === undefined || st.warm) s.prev = clk;
        let both = false;
        if (!clr && !pre) { s.q = 1; both = true; }
        else if (!clr) s.q = 0;
        else if (!pre) s.q = 1;
        else if (!clk && s.prev) {
          const j = g(f.j), k = g(f.kk);
          if (j && k) s.q ^= 1; else if (j) s.q = 1; else if (k) s.q = 0;
        }
        s.prev = clk;
        o(f.q, s.q);
        o(f.n, both ? 1 : +!s.q);
      }
    },
  };

  // ---- counters and shift register
  const ctr = (id, title, desc, withR9) => {
    IC[id] = {
      id, title, cat: 'Counters and registers', n: 14, vcc: 5, gnd: 10, desc,
      fnText: withR9 ? 'QA: ÷2, QB-QD: ÷5 (falling edge)' : 'QA: ÷2, QB-QD: ÷8 (falling edge)',
      names: nm(withR9 ? 'CKB R0(1) R0(2) NC VCC R9(1) R9(2) QC QB GND QD QA NC CKA' : 'CKB R0(1) R0(2) NC VCC NC NC QC QB GND QD QA NC CKA'),
      ev(g, o, st) {
        const s = (st.c = st.c || { a: 0, v: 0, pa: undefined, pb: undefined });
        const ka = g(14), kb = g(1);
        if (s.pa === undefined || st.warm) { s.pa = ka; s.pb = kb; }
        const mod = withR9 ? 5 : 8;
        if (g(2) && g(3)) { s.a = 0; s.v = 0; }
        else if (withR9 && g(6) && g(7)) { s.a = 1; s.v = 4; }
        else {
          if (!ka && s.pa) s.a ^= 1;
          if (!kb && s.pb) s.v = (s.v + 1) % mod;
        }
        s.pa = ka; s.pb = kb;
        o(12, s.a); o(9, s.v & 1); o(8, (s.v >> 1) & 1); o(11, (s.v >> 2) & 1);
      },
    };
  };
  ctr('7490', 'Decade counter', 'Divide-by-2 and divide-by-5 sections with reset and set-to-9. Wire QA to CKB and clock CKA for a BCD count 0 to 9.', true);
  ctr('7493', '4-bit binary counter', 'Divide-by-2 and divide-by-8 sections with reset. Wire QA to CKB and clock CKA for a binary count 0 to 15.', false);

  IC['74161'] = {
    id: '74161', title: '4-bit synchronous counter', cat: 'Counters and registers', n: 16, vcc: 16, gnd: 8,
    desc: 'Synchronous binary counter with asynchronous clear (active low) and synchronous parallel load (active low). Counts when ENP and ENT are high.',
    fnText: 'Count on CLK ↑',
    names: nm('CLR CLK A B C D ENP GND LOAD ENT QD QC QB QA RCO VCC'),
    ev(g, o, st) {
      const s = (st.c = st.c || { v: 0, prev: undefined });
      const clk = g(2);
      if (s.prev === undefined || st.warm) s.prev = clk;
      if (!g(1)) s.v = 0;
      else if (clk && !s.prev) {
        if (!g(9)) s.v = g(3) | (g(4) << 1) | (g(5) << 2) | (g(6) << 3);
        else if (g(7) && g(10)) s.v = (s.v + 1) & 15;
      }
      s.prev = clk;
      o(14, s.v & 1); o(13, (s.v >> 1) & 1); o(12, (s.v >> 2) & 1); o(11, (s.v >> 3) & 1);
      o(15, +(g(10) && s.v === 15));
    },
  };
  IC['74164'] = {
    id: '74164', title: '8-bit serial-in shift register', cat: 'Counters and registers', n: 14, vcc: 14, gnd: 7,
    desc: 'Serial input is A AND B. Data shifts one place on every rising clock edge. Clear is active low.',
    fnText: 'Shift on CLK ↑',
    names: nm('A B QA QB QC QD GND CLK CLR QE QF QG QH VCC'),
    ev(g, o, st) {
      const s = (st.r = st.r || { r: [0, 0, 0, 0, 0, 0, 0, 0], prev: undefined });
      const clk = g(8);
      if (s.prev === undefined || st.warm) s.prev = clk;
      if (!g(9)) s.r = [0, 0, 0, 0, 0, 0, 0, 0];
      else if (clk && !s.prev) s.r = [g(1) & g(2), ...s.r.slice(0, 7)];
      s.prev = clk;
      [3, 4, 5, 6, 10, 11, 12, 13].forEach((p, i) => o(p, s.r[i]));
    },
  };

  // ---- decoder
  const SEG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'cdefg', 'abc', 'abcdefg', 'abcfg', 'deg', 'cdg', 'bfg', 'adfg', 'defg', ''];
  function decode47(v, lt = 1, bi = 1, rbi = 1) {
    if (!lt) return 'abcdefg';
    if (!bi) return '';
    if (v === 0 && !rbi) return '';
    return SEG[v];
  }
  IC['7447'] = {
    id: '7447', title: 'BCD to 7-segment decoder', cat: 'Decoders, mux and arithmetic', n: 16, vcc: 16, gnd: 8,
    desc: 'Drives a common-anode display. Outputs are active low. LT low lights every segment, BI low blanks the display.',
    fnText: 'BCD (DCBA) → segments a-g, active low',
    names: nm('B C LT BI RBI D A GND e d c b a g f VCC'),
    ev(g, o) {
      const v = g(7) | (g(1) << 1) | (g(2) << 2) | (g(6) << 3);
      const on = decode47(v, g(3), g(4), g(5));
      for (const [l, p] of [['a', 13], ['b', 12], ['c', 11], ['d', 10], ['e', 9], ['f', 15], ['g', 14]]) o(p, on.includes(l) ? 0 : 1);
    },
  };
  IC['74138'] = {
    id: '74138', title: '3-to-8 line decoder', cat: 'Decoders, mux and arithmetic', n: 16, vcc: 16, gnd: 8,
    desc: 'Selected output goes low when G1 is high and both G2A and G2B are low. A is the least significant select bit.',
    fnText: 'Y(ABC) = 0 when enabled',
    names: nm('A B C G2A G2B G1 Y7 GND Y6 Y5 Y4 Y3 Y2 Y1 Y0 VCC'),
    ev(g, o) {
      const sel = g(1) | (g(2) << 1) | (g(3) << 2);
      const en = g(6) && !g(4) && !g(5);
      const pin = { 0: 15, 1: 14, 2: 13, 3: 12, 4: 11, 5: 10, 6: 9, 7: 7 };
      for (let k = 0; k < 8; k++) o(pin[k], en && sel === k ? 0 : 1);
    },
  };
  IC['74151'] = {
    id: '74151', title: '8-to-1 multiplexer', cat: 'Decoders, mux and arithmetic', n: 16, vcc: 16, gnd: 8,
    desc: 'Selects one of D0 to D7 with C B A (A least significant). Strobe E is active low. W is the inverted output.',
    fnText: 'Y = D[CBA]',
    names: nm('D3 D2 D1 D0 Y W E GND C B A D7 D6 D5 D4 VCC'),
    ev(g, o) {
      const sel = g(11) | (g(10) << 1) | (g(9) << 2);
      const d = [4, 3, 2, 1, 15, 14, 13, 12];
      const y = g(7) ? 0 : g(d[sel]);
      o(5, y); o(6, +!y);
    },
  };
  IC['74153'] = {
    id: '74153', title: 'Dual 4-to-1 multiplexer', cat: 'Decoders, mux and arithmetic', n: 16, vcc: 16, gnd: 8,
    desc: 'Two 4-to-1 multiplexers sharing select inputs B and A. Strobes 1G and 2G are active low.',
    fnText: 'Y = C[BA]',
    names: nm('1G B 1C3 1C2 1C1 1C0 1Y GND 2Y 2C0 2C1 2C2 2C3 A 2G VCC'),
    ev(g, o) {
      const sel = g(14) | (g(2) << 1);
      o(7, g(1) ? 0 : g([6, 5, 4, 3][sel]));
      o(9, g(15) ? 0 : g([10, 11, 12, 13][sel]));
    },
  };
  IC['7483'] = {
    id: '7483', title: '4-bit full adder', cat: 'Decoders, mux and arithmetic', n: 16, vcc: 5, gnd: 12,
    desc: 'Adds two 4-bit numbers A and B plus carry-in C0. Sum on Σ1-Σ4, carry-out on C4.',
    fnText: 'Σ = A + B + C0',
    names: nm('A4 S3 A3 B3 VCC S2 B2 A2 S1 A1 B1 GND C0 C4 S4 B4'),
    ev(g, o) {
      const a = g(10) | (g(8) << 1) | (g(3) << 2) | (g(1) << 3);
      const b = g(11) | (g(7) << 1) | (g(4) << 2) | (g(16) << 3);
      const s = a + b + g(13);
      o(9, s & 1); o(6, (s >> 1) & 1); o(2, (s >> 2) & 1); o(15, (s >> 3) & 1); o(14, (s >> 4) & 1);
    },
  };

  const CATS = ['Basic gates', 'Universal gates', 'Flip-flops', 'Counters and registers', 'Decoders, mux and arithmetic'];

  function pinNode(ic, p) {
    const N = IC[ic.type].n, H = N / 2;
    if (ic.loc.kind === 'bb') return p <= H ? `bb:${ic.loc.col + p - 1}` : `bt:${ic.loc.col + N - p}`;
    return `s${ic.loc.n}:${p <= H ? p : p + 20 - N}`;
  }
  const canon = (id) => id.replace(/_\d+$/, '');

  class Sim {
    constructor() { this.states = new Map(); this.val = new Map(); this.outs = []; this.find = (x) => x; this.conflicts = 0; this.unpowered = new Set(); }
    build(c) {
      const p = new Map();
      const f = (x) => {
        if (!p.has(x)) p.set(x, x);
        while (p.get(x) !== x) { p.set(x, p.get(p.get(x))); x = p.get(x); }
        return x;
      };
      for (const w of c.wires) {
        const a = f(canon(w.a)), b = f(canon(w.b));
        if (a !== b) p.set(a, b);
      }
      this.find = f;
      this.outs = [];
      this.fresh = true;
      const live = new Set(c.ics.map((i) => i.id));
      for (const k of [...this.states.keys()]) if (!live.has(k)) this.states.delete(k);
    }
    reset() { this.states.clear(); this.val = new Map(); this.outs = []; this.fresh = true; }
    net(id) { const v = this.val.get(this.find(canon(id))); return v === undefined ? null : v; }
    settle(c, ext, strict) {
      const find = this.find;
      let prev = this.outs;
      this.unpowered = new Set();
      const warmN = this.fresh ? 3 : 0;
      for (let pass = 0; pass < 80; pass++) {
        const d = new Map();
        const add = (r, v) => { const cur = d.get(r); if (cur === undefined) d.set(r, v); else if (cur !== v) d.set(r, 'x'); };
        for (const [n, v] of ext) add(find(canon(n)), v);
        for (const [r, v] of prev) add(r, v);
        this.val = d;
        const rd = (n) => { const v = d.get(find(canon(n))); return v === undefined ? 1 : v === 'x' ? 0 : v; };
        const outs = [];
        for (const ic of c.ics) {
          const def = IC[ic.type];
          if (strict && ic.loc.kind !== 'sock') {
            const vv = d.get(find(canon(pinNode(ic, def.vcc)))), gg = d.get(find(canon(pinNode(ic, def.gnd))));
            if (vv !== 1 || gg !== 0) { this.unpowered.add(ic.id); continue; }
          }
          const st = this.states.get(ic.id) || (this.states.set(ic.id, {}), this.states.get(ic.id));
          st.warm = pass < warmN;
          def.ev((p) => rd(pinNode(ic, p)), (p, v) => outs.push([find(canon(pinNode(ic, p))), +v]), st);
        }
        const same = outs.length === prev.length && outs.every((x, i) => x[0] === prev[i][0] && x[1] === prev[i][1]);
        prev = outs;
        if (same && pass >= warmN) break;
      }
      this.outs = prev;
      this.fresh = false;
      for (const st of this.states.values()) st.warm = false;
      this.conflicts = 0;
      for (const v of this.val.values()) if (v === 'x') this.conflicts++;
    }
  }

  const api = { IC, CATS, Sim, pinNode, canon, decode47 };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Trainer = api;
})(typeof window !== 'undefined' ? window : globalThis);
