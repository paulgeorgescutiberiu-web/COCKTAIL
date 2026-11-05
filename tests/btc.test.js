// Semnal BTC (btc/semnal.js): indicatorii, verificarea pe date nevăzute și regulile de decizie, fără internet.
const test = require('node:test');
const assert = require('node:assert');
const S = require('../btc/semnal.js');

// Lumânări sintetice: random walk (fără avantaj) sau cu tendință care persistă (avantaj învățabil).
function lumanari(n, seed, drift = () => 0) {
  let x = seed, p = 50000; const out = [];
  const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const r = (rnd() - 0.5) * 0.02 + drift(i);
    const o = p; p = p * (1 + r);
    out.push({ t: i * 36e5, o, c: p, h: Math.max(o, p) * (1 + rnd() * 0.003), l: Math.min(o, p) * (1 - rnd() * 0.003), v: 100 + rnd() * 50 });
  }
  return out;
}

test('RSI și ATR au valori corecte pe serii simple', () => {
  const sus = Array.from({ length: 30 }, (_, i) => 100 + i);
  assert.strictEqual(S.rsi(sus)[29], 100);
  const a = S.atr(sus.map(c => c + 1), sus.map(c => c - 1), sus);
  assert.ok(Math.abs(a[29] - 2) < 1e-9);
  assert.ok(Math.abs(S.ema([5, 5, 5, 5], 3)[3] - 5) < 1e-12);
});

test('pe un mers aleator nu dă CUMPĂRĂ/VINDE cu fiabilitate bună', () => {
  const r = S.analizeaza(lumanari(1200, 42), { H: 12 });
  assert.ok(!r.eroare, r.eroare);
  assert.ok(r.p > 0 && r.p < 1);
  assert.notStrictEqual(r.fiabilitate, 'bună');
  assert.strictEqual(r.motive.length, 4);
});

test('când tendința persistă, modelul o învață și trece verificarea', () => {
  // regimuri de câte 100 de lumânări care urcă sau coboară: impulsul prezice direcția
  const r = S.analizeaza(lumanari(1500, 7, i => (Math.floor(i / 100) % 2 ? -1 : 1) * 0.004), { H: 6 });
  assert.ok(r.verificare.skill > 0.02, 'skill ' + r.verificare.skill);
  assert.strictEqual(r.fiabilitate, 'bună');
});

test('prea puțin istoric -> eroare clară', () => {
  assert.match(S.analizeaza(lumanari(100, 1)).eroare, /Prea puțin istoric/);
});

test('mărimea poziției respectă riscul și nu folosește levier', () => {
  const p = S.marimePozitie(1000, 1, 80000, 79000);
  assert.ok(Math.abs(p.risc - 10) < 1e-9);
  assert.ok(S.marimePozitie(1000, 50, 80000, 79990).valoare <= 1000 + 1e-9);
  const n = S.niveluri(100, 2, -1);
  assert.ok(n.stop > 100 && n.tinta1 < 100);
});

test('consensul ignoră intervalele nevalidate și cere acord', () => {
  const r = (p, d, f = 'bună') => ({ p, decizie: d, fiabilitate: f, verificare: { skill: 0.05 } });
  assert.strictEqual(S.consens([r(0.9, 'CUMPĂRĂ', 'slabă')]).decizie, 'AȘTEAPTĂ');
  assert.strictEqual(S.consens([r(0.65, 'CUMPĂRĂ'), r(0.62, 'CUMPĂRĂ')]).decizie, 'CUMPĂRĂ');
  assert.strictEqual(S.consens([r(0.7, 'CUMPĂRĂ'), r(0.4, 'VINDE')]).decizie, 'AȘTEAPTĂ');
  assert.strictEqual(S.consens([r(0.3, 'VINDE'), r(0.36, 'VINDE')]).decizie, 'VINDE');
});
