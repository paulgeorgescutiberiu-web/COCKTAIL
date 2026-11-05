/*
 * Semnal BTC — logica de analiză (fără dependențe, merge în browser și în Node).
 *
 * Ideea: nu inventăm probabilități. Din istoricul de lumânări calculăm câțiva indicatori clasici,
 * antrenăm o regresie logistică mică pe ce s-a întâmplat după fiecare lumânare (a crescut prețul
 * după H lumânări sau nu?) și verificăm modelul pe o perioadă pe care NU a văzut-o la antrenare.
 * Doar dacă trece verificarea, probabilitatea lui devine sugestie de CUMPĂRARE / VÂNZARE.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Semnal = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- indicatori ----------
  function ema(v, n) {
    const k = 2 / (n + 1), out = new Array(v.length);
    let e = v[0];
    for (let i = 0; i < v.length; i++) { e = i === 0 ? v[0] : v[i] * k + e * (1 - k); out[i] = e; }
    return out;
  }

  function sma(v, n) {
    const out = new Array(v.length).fill(NaN);
    let s = 0;
    for (let i = 0; i < v.length; i++) {
      s += v[i];
      if (i >= n) s -= v[i - n];
      if (i >= n - 1) out[i] = s / n;
    }
    return out;
  }

  function stdev(v, n) {
    const m = sma(v, n), out = new Array(v.length).fill(NaN);
    for (let i = n - 1; i < v.length; i++) {
      let s = 0;
      for (let j = i - n + 1; j <= i; j++) s += (v[j] - m[i]) ** 2;
      out[i] = Math.sqrt(s / n);
    }
    return out;
  }

  // RSI Wilder
  function rsi(c, n = 14) {
    const out = new Array(c.length).fill(NaN);
    let g = 0, l = 0;
    for (let i = 1; i < c.length; i++) {
      const d = c[i] - c[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (i <= n) { g += up / n; l += dn / n; }
      else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; }
      if (i >= n) out[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    }
    return out;
  }

  // ATR Wilder
  function atr(h, l, c, n = 14) {
    const out = new Array(c.length).fill(NaN);
    let a = 0;
    for (let i = 1; i < c.length; i++) {
      const tr = Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
      if (i <= n) a += tr / n; else a = (a * (n - 1) + tr) / n;
      if (i >= n) out[i] = a;
    }
    return out;
  }

  // ---------- caracteristicile (ce „vede” modelul) ----------
  const NUME = [
    'Mișcarea ultimei lumânări', 'Impuls pe 5 lumânări', 'Impuls pe 20 de lumânări',
    'Distanța față de EMA20', 'Distanța față de EMA50', 'Distanța față de EMA200',
    'EMA20 față de EMA50', 'RSI 14', 'Histograma MACD', 'Poziția în benzile Bollinger',
    'Volumul față de medie', 'Volatilitatea (ATR %)'
  ];
  const INCALZIRE = 200; // lumânări necesare pentru EMA200

  function indicatori(candles) {
    const c = candles.map(k => k.c), h = candles.map(k => k.h), l = candles.map(k => k.l), v = candles.map(k => k.v);
    const e12 = ema(c, 12), e26 = ema(c, 26);
    const macd = c.map((_, i) => e12[i] - e26[i]);
    const sig = ema(macd, 9);
    return {
      c, h, l, v,
      e20: ema(c, 20), e50: ema(c, 50), e200: ema(c, 200),
      rsi: rsi(c, 14), atr: atr(h, l, c, 14),
      hist: macd.map((m, i) => m - sig[i]),
      bbm: sma(c, 20), bbs: stdev(c, 20), vs: sma(v, 20)
    };
  }

  // Valorile brute ale caracteristicilor pentru lumânarea i (null dacă nu e destul istoric).
  function rand(I, i) {
    if (i < INCALZIRE || i < 20) return null;
    const c = I.c[i], a = I.atr[i];
    if (!(a > 0) || !(I.bbs[i] >= 0) || !(I.vs[i] > 0)) return null;
    const pct = a / c;
    const r = x => Math.log(c / I.c[i - x]) / pct; // randament în unități de volatilitate
    return [
      r(1), r(5) / Math.sqrt(5), r(20) / Math.sqrt(20),
      (c - I.e20[i]) / a, (c - I.e50[i]) / a, (c - I.e200[i]) / a,
      (I.e20[i] - I.e50[i]) / a,
      (I.rsi[i] - 50) / 50,
      I.hist[i] / a,
      I.bbs[i] > 0 ? (c - I.bbm[i]) / (2 * I.bbs[i]) : 0,
      Math.log(Math.max(I.v[i], 1e-9) / I.vs[i]),
      Math.log(pct * 100)
    ];
  }

  // ---------- regresie logistică cu regularizare L2 ----------
  const sigm = z => 1 / (1 + Math.exp(-z));

  function antreneaza(X, y, opt = {}) {
    const n = X.length, d = X[0].length, lambda = opt.lambda ?? 2, iter = opt.iter ?? 200;
    // standardizare cu media/abaterea DOAR din datele de antrenare
    const mu = new Array(d).fill(0), sd = new Array(d).fill(0);
    for (const x of X) for (let j = 0; j < d; j++) mu[j] += x[j] / n;
    for (const x of X) for (let j = 0; j < d; j++) sd[j] += (x[j] - mu[j]) ** 2 / n;
    for (let j = 0; j < d; j++) sd[j] = Math.sqrt(sd[j]) || 1;
    const Z = X.map(x => x.map((v, j) => Math.max(-4, Math.min(4, (v - mu[j]) / sd[j]))));
    // Adam, gradient pe tot lotul (n ~ 800, d = 12: câteva milisecunde)
    const w = new Array(d).fill(0), m = new Array(d + 1).fill(0), s = new Array(d + 1).fill(0);
    let b = 0;
    const lr = 0.05, b1 = 0.9, b2 = 0.999;
    for (let t = 1; t <= iter; t++) {
      const g = new Array(d + 1).fill(0);
      for (let i = 0; i < n; i++) {
        let z = b;
        for (let j = 0; j < d; j++) z += w[j] * Z[i][j];
        const e = sigm(z) - y[i];
        for (let j = 0; j < d; j++) g[j] += e * Z[i][j] / n;
        g[d] += e / n;
      }
      for (let j = 0; j < d; j++) g[j] += lambda * w[j] / n;
      for (let j = 0; j <= d; j++) {
        m[j] = b1 * m[j] + (1 - b1) * g[j];
        s[j] = b2 * s[j] + (1 - b2) * g[j] * g[j];
        const step = lr * (m[j] / (1 - b1 ** t)) / (Math.sqrt(s[j] / (1 - b2 ** t)) + 1e-8);
        if (j < d) w[j] -= step; else b -= step;
      }
    }
    return { w, b, mu, sd };
  }

  function standard(model, x) {
    return x.map((v, j) => Math.max(-4, Math.min(4, (v - model.mu[j]) / model.sd[j])));
  }
  function prezice(model, x) {
    const z = standard(model, x);
    let s = model.b;
    for (let j = 0; j < z.length; j++) s += model.w[j] * z[j];
    return sigm(s);
  }

  // ---------- analiza completă pentru un interval ----------
  // H = câte lumânări în viitor privim; fee = comision pe o parte (0.001 = 0,1%).
  function analizeaza(candles, opt = {}) {
    const H = opt.H ?? 12, fee = opt.fee ?? 0.001, prag = opt.prag ?? 0.07;
    const N = candles.length;
    if (N < INCALZIRE + 150) return { eroare: 'Prea puțin istoric (' + N + ' lumânări)' };
    const I = indicatori(candles);
    const idx = [], X = [], y = [];
    for (let i = INCALZIRE; i < N - H; i++) {
      const x = rand(I, i);
      if (!x) continue;
      idx.push(i); X.push(x); y.push(I.c[i + H] > I.c[i] ? 1 : 0);
    }
    if (X.length < 150) return { eroare: 'Prea puține exemple pentru verificare' };

    // 1) verificare „pe date nevăzute” (walk-forward): de 5 ori antrenăm doar pe trecut și testăm pe
    //    următoarea bucată, cu o pauză de H lumânări între ele ca rezultatele să nu se suprapună
    const lambda = opt.lambda ?? 50;
    let n = 0, ok = 0, brier = 0, brierBaza = 0, sus = 0, nc = 0, okc = 0;
    const test = []; // [k, p] în ordine
    const FOLD = 5, start = Math.floor(X.length * 0.5), pas = Math.floor((X.length - start) / FOLD);
    for (let f = 0; f < FOLD; f++) {
      const cut = start + f * pas, end = f === FOLD - 1 ? X.length : cut + pas;
      const m1 = antreneaza(X.slice(0, cut), y.slice(0, cut), { lambda });
      const baza = y.slice(0, cut).reduce((a, b) => a + b, 0) / cut; // cât de des a crescut până atunci
      for (let k = cut + H; k < end; k++) {
        const p = prezice(m1, X[k]);
        test.push([k, p]);
        n++; sus += y[k];
        ok += (p >= 0.5 ? 1 : 0) === y[k] ? 1 : 0;
        brier += (p - y[k]) ** 2; brierBaza += (baza - y[k]) ** 2;
        if (Math.abs(p - 0.5) >= prag) { nc++; okc += (p >= 0.5 ? 1 : 0) === y[k] ? 1 : 0; }
      }
    }
    const rataSus = sus / n;
    const verificare = {
      exemple: n,
      acuratete: ok / n,
      referinta: Math.max(rataSus, 1 - rataSus), // ce obții spunând mereu „direcția mai frecventă”
      skill: brierBaza > 0 ? 1 - brier / brierBaza : 0, // > 0 = mai bun decât să ghicești din frecvență
      semnale: nc,
      precizieSemnale: nc ? okc / nc : NaN
    };

    // 2) simulare de tranzacționare pe aceleași perioade nevăzute (o poziție odată, comisioane incluse)
    let cap = 1, tr = 0, castig = 0, liberDe = -1;
    for (const [k, p] of test) {
      if (k < liberDe) continue;
      const dir = p >= 0.5 + prag ? 1 : p <= 0.5 - prag ? -1 : 0;
      if (!dir) continue;
      const i = idx[k], r = dir * (I.c[i + H] / I.c[i] - 1) - 2 * fee;
      cap *= 1 + r; tr++; if (r > 0) castig++;
      liberDe = k + H;
    }
    const i0 = idx[test[0][0]], i1 = idx[test[test.length - 1][0]] + H;
    const simulare = { tranzactii: tr, castigatoare: tr ? castig / tr : NaN, randament: cap - 1, cumparaSiTine: I.c[i1] / I.c[i0] - 1 };

    // 3) modelul final, antrenat pe tot istoricul, aplicat pe lumânarea curentă
    const model = antreneaza(X, y, { lambda });
    const xNow = rand(I, N - 1);
    const p = prezice(model, xNow);
    const z = standard(model, xNow);
    const motive = z.map((v, j) => ({ nume: NUME[j], contributie: model.w[j] * v, valoare: xNow[j] }))
      .sort((a, b) => Math.abs(b.contributie) - Math.abs(a.contributie));

    const fiabilitate = verificare.skill > 0.02 && verificare.acuratete > verificare.referinta + 0.02 ? 'bună'
      : verificare.skill > 0 && verificare.acuratete >= verificare.referinta ? 'modestă' : 'slabă';
    let decizie = 'AȘTEAPTĂ';
    if (fiabilitate !== 'slabă') {
      if (p >= 0.5 + prag) decizie = 'CUMPĂRĂ';
      else if (p <= 0.5 - prag) decizie = 'VINDE';
    }

    const pret = I.c[N - 1], a = I.atr[N - 1];
    return {
      p, decizie, fiabilitate, verificare, simulare, motive: motive.slice(0, 4), H,
      pret, atr: a, rsi: I.rsi[N - 1], ema20: I.e20[N - 1], ema50: I.e50[N - 1], ema200: I.e200[N - 1],
      niveluri: niveluri(pret, a, decizie === 'VINDE' ? -1 : 1)
    };
  }

  // Stop-loss și ținte după volatilitate (ATR): 1,5 ATR risc, 1,5 / 3 ATR țintă.
  function niveluri(pret, a, dir) {
    return { intrare: pret, stop: pret - dir * 1.5 * a, tinta1: pret + dir * 1.5 * a, tinta2: pret + dir * 3 * a };
  }

  // Câți BTC poți lua ca să pierzi cel mult risc% din capital dacă se atinge stop-ul.
  function marimePozitie(capital, riscPct, intrare, stop) {
    const dist = Math.abs(intrare - stop);
    if (!(dist > 0) || !(capital > 0)) return { btc: 0, valoare: 0, risc: 0 };
    let btc = (capital * riscPct / 100) / dist;
    btc = Math.min(btc, capital / intrare); // fără levier
    return { btc, valoare: btc * intrare, risc: btc * dist };
  }

  // Consensul celor trei intervale: contează doar cele care au trecut verificarea, ponderate după skill.
  function consens(rezultate) {
    let s = 0, w = 0;
    for (const r of rezultate) {
      if (!r || r.eroare || r.fiabilitate === 'slabă') continue;
      const pond = Math.max(r.verificare.skill, 0.005) * (r.fiabilitate === 'bună' ? 2 : 1);
      s += (r.p - 0.5) * pond; w += pond;
    }
    if (!w) return { p: 0.5, decizie: 'AȘTEAPTĂ', valide: 0 };
    const p = 0.5 + s / w;
    const valide = rezultate.filter(r => r && !r.eroare && r.fiabilitate !== 'slabă').length;
    const acord = rezultate.filter(r => r && !r.eroare && r.fiabilitate !== 'slabă' && r.decizie !== 'AȘTEAPTĂ');
    const toateLaFel = acord.length > 0 && acord.every(r => r.decizie === acord[0].decizie);
    let decizie = 'AȘTEAPTĂ';
    if (p >= 0.56 && toateLaFel) decizie = 'CUMPĂRĂ';
    else if (p <= 0.44 && toateLaFel) decizie = 'VINDE';
    return { p, decizie, valide };
  }

  return { ema, sma, rsi, atr, indicatori, rand, antreneaza, prezice, analizeaza, niveluri, marimePozitie, consens, NUME, INCALZIRE };
});
