/* Guided experiments. Each one loads ICs on the breadboard and wires them. */
(function (root) {
  const T = typeof module !== 'undefined' ? require('./engine.js') : root.Trainer;
  const { IC, pinNode } = T;

  function make(o) {
    const ics = o.ics.map(([type, col]) => ({ type, loc: { kind: 'bb', col } }));
    const wires = [['v5_1', 'rtp'], ['gnd_1', 'rtn']];
    ics.forEach((ic) => {
      const d = IC[ic.type];
      wires.push(['rtp', pinNode(ic, d.vcc)], ['rtn', pinNode(ic, d.gnd)]);
    });
    return { ...o, ics, wires: [...wires, ...o.wires], sw: o.sw || [] };
  }

  const PRESETS = [
    make({
      id: 'nand', group: 'Gates', title: 'NAND truth table',
      blurb: 'One gate of a 7400 wired to two switches and a lamp.',
      steps: ['Flip switches 1 and 2 through all four combinations.', 'Lamp 1 is off only when both inputs are high.', 'Switch the strict-power option on and remove a power wire to see the IC stop working.'],
      ics: [['7400', 2]],
      wires: [['sw1', 'bb:2'], ['sw2', 'bb:3'], ['bb:4', 'lamp1'], ['sw1', 'lamp9'], ['sw2', 'lamp10']],
    }),
    make({
      id: 'or-nand', group: 'Gates', title: 'OR gate from NAND gates',
      blurb: 'Three NAND gates build an OR gate: invert each input, then NAND the results.',
      steps: ['Gates 1 and 2 are wired as inverters (both inputs tied together).', 'Gate 3 combines the two inverted signals.', 'Lamp 1 should match A + B for every input pair.'],
      ics: [['7400', 2]],
      wires: [['sw1', 'bb:2'], ['sw1', 'bb:3'], ['sw2', 'bb:5'], ['sw2', 'bb:6'], ['bb:4', 'bt:7'], ['bb:7', 'bt:6'], ['bt:8', 'lamp1'], ['sw1', 'lamp9'], ['sw2', 'lamp10']],
    }),
    make({
      id: 'and-nor', group: 'Gates', title: 'AND gate from NOR gates',
      blurb: 'NOR is also universal. Invert both inputs with two NOR gates, then NOR them.',
      steps: ['Gates 1 and 2 of the 7402 act as inverters.', 'Gate 3 NORs the inverted inputs, which gives A·B.', 'Lamp 1 lights only when both switches are high.'],
      ics: [['7402', 2]],
      wires: [['sw1', 'bb:3'], ['sw1', 'bb:4'], ['sw2', 'bb:6'], ['sw2', 'bb:7'], ['bb:2', 'bt:8'], ['bb:5', 'bt:7'], ['bt:6', 'lamp1'], ['sw1', 'lamp9'], ['sw2', 'lamp10']],
    }),
    make({
      id: 'half-adder', group: 'Arithmetic', title: 'Half adder',
      blurb: 'An XOR gate gives the sum bit and an AND gate gives the carry bit.',
      steps: ['Switches 1 and 2 are the two input bits.', 'Lamp 1 shows the sum, lamp 2 shows the carry.', 'Try 1 + 1: sum is 0 and carry is 1.'],
      ics: [['7486', 2], ['7408', 12]],
      wires: [['sw1', 'bb:2'], ['sw2', 'bb:3'], ['sw1', 'bb:12'], ['sw2', 'bb:13'], ['bb:4', 'lamp1'], ['bb:14', 'lamp2']],
    }),
    make({
      id: 'adder4', group: 'Arithmetic', title: '4-bit adder (7483)',
      blurb: 'Switches 1-4 are number A, switches 5-8 are number B. Lamps 1-4 show the sum and lamp 5 shows the carry.',
      steps: ['Switch 1 is the least significant bit of each number.', 'Set A = 0101 and B = 0111, the lamps show 1100 (12).', 'Set both numbers to 1111 to see the carry lamp light.'],
      ics: [['7483', 2]],
      wires: [['sw1', 'bt:8'], ['sw2', 'bb:9'], ['sw3', 'bb:4'], ['sw4', 'bb:2'], ['sw5', 'bt:7'], ['sw6', 'bb:8'], ['sw7', 'bb:5'], ['sw8', 'bt:2'],
        ['bt:9', 'lamp1'], ['bb:7', 'lamp2'], ['bb:3', 'lamp3'], ['bt:3', 'lamp4'], ['bt:4', 'lamp5'], ['rtn', 'bt:5']],
      sw: [1, 0, 1, 0, 1, 1, 1, 0],
    }),
    make({
      id: 'sr', group: 'Memory', title: 'SR latch from NAND gates',
      blurb: 'Two cross-coupled NAND gates remember which input was pulsed last. Inputs are active low.',
      steps: ['Both switches start high (idle).', 'Drop switch 1 low and back high: lamp 1 (Q) turns on and stays on.', 'Drop switch 2 low and back high: lamp 2 (Q′) takes over.', 'Both low at once is the forbidden state: both outputs go high.'],
      ics: [['7400', 2]],
      wires: [['sw1', 'bb:2'], ['bb:7', 'bb:3'], ['bb:4', 'bb:5'], ['sw2', 'bb:6'], ['bb:4', 'lamp1'], ['bb:7', 'lamp2']],
      sw: [1, 1],
    }),
    make({
      id: 'div2', group: 'Memory', title: 'Divide-by-2 with a D flip-flop',
      blurb: 'Feeding Q′ back to D makes a 7474 toggle on every clock pulse, halving the frequency.',
      steps: ['Lamp 2 follows the 1 Hz clock.', 'Lamp 1 changes only on each rising edge, so it blinks at half the speed.', 'Pause the clocks and use Step to follow single edges.'],
      ics: [['7474', 2]],
      wires: [['bb:7', 'bb:3'], ['rtp', 'bb:2'], ['rtp', 'bb:5'], ['ck1', 'bb:4'], ['bb:6', 'lamp1'], ['ck1', 'lamp2']],
    }),
    make({
      id: 'decade', group: 'Counters', title: 'Decade counter on a display',
      blurb: 'A 7490 counts the 1 Hz clock in BCD and the built-in 7447 decoder shows the digit.',
      steps: ['QA is wired to CKB so the chip counts 0 to 9.', 'Outputs QA-QD feed the digit 1 decoder inputs and lamps 1-4.', 'Pulse the reset by wiring a switch to R0 to return to zero.'],
      ics: [['7490', 2]],
      wires: [['bt:4', 'bb:2'], ['rtn', 'bb:3'], ['rtn', 'bb:4'], ['rtn', 'bb:7'], ['rtn', 'bb:8'], ['ck1', 'bt:2'],
        ['bt:4', 'dg1-1'], ['bt:7', 'dg1-2'], ['bt:8', 'dg1-4'], ['bt:5', 'dg1-8'],
        ['bt:4', 'lamp1'], ['bt:7', 'lamp2'], ['bt:8', 'lamp3'], ['bt:5', 'lamp4']],
    }),
    make({
      id: 'decoder', group: 'Counters', title: '3-to-8 decoder (74138)',
      blurb: 'Three switches select one of eight outputs. The selected output goes low, so its lamp goes dark.',
      steps: ['Switches 1-3 are the select inputs, switch 1 is the least significant bit.', 'Lamps 1-8 show outputs Y0 to Y7.', 'Count up in binary and watch the dark lamp move.'],
      ics: [['74138', 2]],
      wires: [['sw1', 'bb:2'], ['sw2', 'bb:3'], ['sw3', 'bb:4'], ['rtn', 'bb:5'], ['rtn', 'bb:6'], ['rtp', 'bb:7'],
        ['bt:3', 'lamp1'], ['bt:4', 'lamp2'], ['bt:5', 'lamp3'], ['bt:6', 'lamp4'], ['bt:7', 'lamp5'], ['bt:8', 'lamp6'], ['bt:9', 'lamp7'], ['bb:8', 'lamp8']],
    }),
  ];

  if (typeof module !== 'undefined') module.exports = PRESETS;
  else root.PRESETS = PRESETS;
})(typeof window !== 'undefined' ? window : globalThis);
