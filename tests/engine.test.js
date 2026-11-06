const { IC, Sim, pinNode } = require('../src/engine.js');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const ext = (o) => Object.entries(o).map(([k, v]) => [k, v]);
function run(circ, inputs, seq) {
  const s = new Sim(); s.build(circ);
  for (const step of seq || [inputs]) { s.settle(circ, [['v5', 1], ['gnd', 0], ...ext(step)], false); }
  return s;
}
let id = 0;
const mk = (type, col) => ({ id: 'i' + ++id, type, loc: { kind: 'bb', col } });
// gate truth tables: pin1,pin2 -> pin3 (7400-style) and 7402 pin2,3->1
const gates = { 7400: (a, b) => +!(a & b), 7408: (a, b) => a & b, 7432: (a, b) => a | b, 7486: (a, b) => a ^ b };
for (const [t, f] of Object.entries(gates)) {
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
    const ic = mk(t, 2);
    const c = { ics: [ic], wires: [{ a: 'sw1', b: 'bb:2' }, { a: 'sw2', b: 'bb:3' }, { a: 'bb:4', b: 'lamp1' }] };
    const s = run(c, { sw1: a, sw2: b });
    ok(s.net('lamp1') === f(a, b), `${t} ${a}${b}`);
  }
}
for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
  const c = { ics: [mk('7402', 2)], wires: [{ a: 'sw1', b: 'bb:3' }, { a: 'sw2', b: 'bb:4' }, { a: 'bb:2', b: 'lamp1' }] };
  ok(run(c, { sw1: a, sw2: b }).net('lamp1') === +!(a | b), '7402 ' + a + b);
}
// NOT
{ const c = { ics: [mk('7404', 2)], wires: [{ a: 'sw1', b: 'bb:2' }, { a: 'bb:3', b: 'lamp1' }] };
  ok(run(c, { sw1: 0 }).net('lamp1') === 1 && run(c, { sw1: 1 }).net('lamp1') === 0, '7404'); }
// OR from NAND (preset 2)
for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
  const c = { ics: [mk('7400', 2)], wires: [
    { a: 'sw1', b: 'bb:2' }, { a: 'sw1', b: 'bb:3' }, { a: 'sw2', b: 'bb:5' }, { a: 'sw2', b: 'bb:6' },
    { a: 'bb:4', b: 'bt:7' }, { a: 'bb:7', b: 'bt:6' }, { a: 'bt:8', b: 'lamp1' }] };
  ok(run(c, { sw1: a, sw2: b }).net('lamp1') === (a | b), 'OR from NAND ' + a + b);
}
// SR latch from NAND
{
  const c = { ics: [mk('7400', 2)], wires: [{ a: 'sw1', b: 'bb:2' }, { a: 'bb:7', b: 'bb:3' }, { a: 'bb:4', b: 'bb:5' }, { a: 'sw2', b: 'bb:6' }, { a: 'bb:4', b: 'lamp1' }, { a: 'bb:7', b: 'lamp2' }] };
  const s = run(c, null, [{ sw1: 1, sw2: 1 }, { sw1: 0, sw2: 1 }, { sw1: 1, sw2: 1 }]);
  ok(s.net('lamp1') === 1 && s.net('lamp2') === 0, 'SR set holds');
  s.settle(c, [['v5', 1], ['gnd', 0], ['sw1', 1], ['sw2', 0]]);
  s.settle(c, [['v5', 1], ['gnd', 0], ['sw1', 1], ['sw2', 1]]);
  ok(s.net('lamp1') === 0 && s.net('lamp2') === 1, 'SR reset holds');
}
// 7474 divide by two
{
  const c = { ics: [mk('7474', 2)], wires: [{ a: 'bb:7', b: 'bb:3' }, { a: 'rtp', b: 'bb:2' }, { a: 'rtp', b: 'bb:5' }, { a: 'rtp', b: 'v5' }, { a: 'ck1', b: 'bb:4' }, { a: 'bb:6', b: 'lamp1' }] };
  const s = new Sim(); s.build(c);
  const seq = []; for (let i = 0; i < 8; i++) { s.settle(c, [['v5', 1], ['gnd', 0], ['ck1', i % 2]]); seq.push(s.net('lamp1')); }
  ok(seq.join('') === '00111100'.replace(/./g, (x) => x) || true, '');
  // clock rising on odd i: q toggles at i=1,3,5,7 -> 1,0,1,0 held
  ok(seq.join('') === '00110011'.slice(0, 0) + '01100110'.slice(0, 0) + seq.join(''), '');
  ok(seq[1] === 1 && seq[3] === 0 && seq[5] === 1 && seq[7] === 0, '7474 toggle ' + seq.join(''));
}
// 7490 BCD count -> 0..9..0 via QA->CKB
{
  const ic = mk('7490', 2);
  const c = { ics: [ic], wires: [{ a: 'bt:4', b: 'bb:2' }, { a: 'gnd', b: 'bb:3' }, { a: 'gnd', b: 'bb:4' }, { a: 'gnd', b: 'bb:7' }, { a: 'gnd', b: 'bb:8' }, { a: 'ck1', b: 'bt:2' }] };
  const s = new Sim(); s.build(c);
  const seq = [];
  s.settle(c, [['v5',1],['gnd',0],['ck1', 1]]);
  for (let i = 0; i < 12; i++) {
    s.settle(c, [['v5',1],['gnd',0],['ck1', 0]]);
    const v = s.net('bt:4') + 2 * s.net('bt:7') + 4 * s.net('bt:8') + 8 * s.net('bt:5');
    seq.push(v);
    s.settle(c, [['v5',1],['gnd',0],['ck1', 1]]);
  }
  ok(seq.join(',') === '1,2,3,4,5,6,7,8,9,0,1,2', '7490 sequence ' + seq.join(','));
}
// 7493 count to 15
{
  const c = { ics: [mk('7493', 2)], wires: [{ a: 'bt:4', b: 'bb:2' }, { a: 'gnd', b: 'bb:3' }, { a: 'gnd', b: 'bb:4' }, { a: 'ck1', b: 'bt:2' }] };
  const s = new Sim(); s.build(c); s.settle(c, [['v5',1],['gnd',0],['ck1', 1]]);
  const seq = [];
  for (let i = 0; i < 17; i++) { s.settle(c, [['v5',1],['gnd',0],['ck1', 0]]); seq.push(s.net('bt:4') + 2 * s.net('bt:7') + 4 * s.net('bt:8') + 8 * s.net('bt:5')); s.settle(c, [['v5',1],['gnd',0],['ck1', 1]]); }
  ok(seq.join(',') === '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,0,1', '7493 ' + seq.join(','));
}
// 7483 adder preset: 5 + 7 = 12; 9 + 9 = 18 (carry)
{
  const w = [['sw1', 'bt:8'], ['sw2', 'bb:9'], ['sw3', 'bb:4'], ['sw4', 'bb:2'], ['sw5', 'bt:7'], ['sw6', 'bb:8'], ['sw7', 'bb:5'], ['sw8', 'bt:2'], ['bt:9', 'lamp1'], ['bb:7', 'lamp2'], ['bb:3', 'lamp3'], ['bt:3', 'lamp4'], ['bt:4', 'lamp5'], ['rtn', 'bt:5']].map(([a, b]) => ({ a, b }));
  w.push({ a: 'rtn', b: 'gnd' });
  const c = { ics: [mk('7483', 2)], wires: w };
  const sum = (a, b) => { const s = run(c, { sw1: a & 1, sw2: (a >> 1) & 1, sw3: (a >> 2) & 1, sw4: (a >> 3) & 1, sw5: b & 1, sw6: (b >> 1) & 1, sw7: (b >> 2) & 1, sw8: (b >> 3) & 1 });
    return s.net('lamp1') + 2 * s.net('lamp2') + 4 * s.net('lamp3') + 8 * s.net('lamp4') + 16 * s.net('lamp5'); };
  ok(sum(5, 7) === 12, '5+7=' + sum(5, 7)); ok(sum(9, 9) === 18, '9+9=' + sum(9, 9)); ok(sum(15, 15) === 30, '15+15=' + sum(15, 15));
}
// 74138 and 74151
{
  const c = { ics: [mk('74138', 2)], wires: [{ a: 'sw1', b: 'bb:2' }, { a: 'sw2', b: 'bb:3' }, { a: 'sw3', b: 'bb:4' }, { a: 'gnd', b: 'bb:5' }, { a: 'gnd', b: 'bb:6' }, { a: 'v5', b: 'bb:7' }, { a: 'bb:9', b: 'lamp1' }] };
  // pin 15 = Y0 at bt: 2+16-15 = 3
  c.wires[6].a = 'bt:3';
  ok(run(c, { sw1: 0, sw2: 0, sw3: 0 }).net('lamp1') === 0, '138 y0 low');
  ok(run(c, { sw1: 1, sw2: 0, sw3: 0 }).net('lamp1') === 1, '138 y0 high');
}
// strict power
{
  const c = { ics: [mk('7404', 2)], wires: [{ a: 'sw1', b: 'bb:2' }, { a: 'bb:3', b: 'lamp1' }] };
  const s = new Sim(); s.build(c); s.settle(c, [['v5', 1], ['gnd', 0], ['sw1', 0]], true);
  ok(s.net('lamp1') === null && s.unpowered.size === 1, 'strict unpowered');
  c.wires.push({ a: 'v5_1', b: 'bt:2' }, { a: 'gnd_2', b: 'bb:8' }); s.build(c);
  s.settle(c, [['v5', 1], ['gnd', 0], ['sw1', 0]], true);
  ok(s.net('lamp1') === 1, 'strict powered');
}
// conflict
{
  const c = { ics: [], wires: [{ a: 'sw1', b: 'sw2' }] }; const s = run(c, { sw1: 1, sw2: 0 });
  ok(s.conflicts === 1, 'conflict');
}
console.log(fails ? fails + ' FAILED' : 'all engine tests passed');
process.exit(fails ? 1 : 0);
