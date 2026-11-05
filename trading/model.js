/* Modelul de probabilitate pentru trading.html (merge și în browser, și în Node pentru teste).
 *
 * Întrebarea la care răspunde: „care e probabilitatea ca prețul să fie MAI SUS peste H zile de bursă?”
 * 1. Din lumânările zilnice calculează 7 indicatori clasici (trend, MACD, RSI, randament 5 zile,
 *    Bollinger, volum, volatilitate).
 * 2. Antrenează o regresie logistică mică, cu regularizare puternică, DOAR pe istoricul acțiunii.
 * 3. Verifică onest cât de bine ar fi mers: test „walk-forward” (la fiecare zi din trecut modelul
 *    vede numai ce era cunoscut atunci). Dacă n-a bătut hazardul, probabilitatea e trasă spre 50%.
 * Totul durează câteva milisecunde: nicio bibliotecă, niciun server.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ModelTrading = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const NUME = ["Trend (față de media 20 zile)", "MACD", "RSI 14", "Randament 5 zile", "Bollinger %B", "Volum", "Volatilitate (ATR)"];
  const PRAG_BUY = 0.57, PRAG_SELL = 0.43;

  function sma(a, n, i) { if (i < n - 1) return NaN; let s = 0; for (let k = i - n + 1; k <= i; k++) s += a[k]; return s / n; }
  function ema(a, n) { const k = 2 / (n + 1), o = []; let e = a[0]; for (let i = 0; i < a.length; i++) { e = i ? a[i] * k + e * (1 - k) : a[0]; o.push(e); } return o; }
  function std(a, n, i) { const m = sma(a, n, i); let s = 0; for (let k = i - n + 1; k <= i; k++) s += (a[k] - m) ** 2; return Math.sqrt(s / n); }

  /* RSI Wilder */
  function rsi(c, n) {
    const o = new Array(c.length).fill(NaN); let g = 0, l = 0;
    for (let i = 1; i < c.length; i++) {
      const d = c[i] - c[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
      if (i <= n) { g += up / n; l += dn / n; if (i === n) o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); continue; }
      g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n;
      o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    }
    return o;
  }
  function atr(h, l, c, n) {
    const o = new Array(c.length).fill(NaN); let a = 0;
    for (let i = 1; i < c.length; i++) {
      const tr = Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
      if (i <= n) { a += tr / n; if (i === n) o[i] = a; continue; }
      a = (a * (n - 1) + tr) / n; o[i] = a;
    }
    return o;
  }

  /* zile: [[data, deschidere, maxim, minim, închidere, volum], ...] în ordine cronologică */
  function indicatori(zile) {
    const c = zile.map(z => z[4]), h = zile.map(z => z[2]), l = zile.map(z => z[3]), v = zile.map(z => z[5]);
    const e12 = ema(c, 12), e26 = ema(c, 26), macd = e12.map((x, i) => x - e26[i]), sem = ema(macd, 9);
    const r = rsi(c, 14), at = atr(h, l, c, 14);
    const rows = [];
    for (let i = 0; i < c.length; i++) {
      const m20 = sma(c, 20, i), sd = i >= 19 ? std(c, 20, i) : NaN, va = sma(v, 20, i);
      const pb = sd > 0 ? (c[i] - (m20 - 2 * sd)) / (4 * sd) : NaN;
      const r1 = i ? c[i] / c[i - 1] - 1 : 0;
      const x = [
        c[i] / m20 - 1,
        i >= 33 ? (macd[i] - sem[i]) / c[i] : NaN,
        (r[i] - 50) / 50,
        i >= 5 ? c[i] / c[i - 5] - 1 : NaN,
        pb - 0.5,
        va > 0 && v[i] > 0 ? Math.log(v[i] / va) * Math.sign(r1) : NaN,
        at[i] / c[i],
      ];
      rows.push({ data: zile[i][0], pret: c[i], atr: at[i], rsi: r[i], sma20: m20, x, ok: x.every(Number.isFinite) });
    }
    return rows;
  }

  function sig(z) { return 1 / (1 + Math.exp(-z)); }

  /* regresie logistică cu L2 (lambda mare = prudentă), coborâre pe gradient; X deja standardizat */
  function antreneaza(X, y, lambda) {
    const n = X.length, d = X[0].length, w = new Array(d).fill(0);
    const pm = y.reduce((s, t) => s + t, 0) / n; let b = Math.log((pm + 0.01) / (1.01 - pm));
    const lr = 0.3;
    for (let it = 0; it < 300; it++) {
      const gw = new Array(d).fill(0); let gb = 0;
      for (let i = 0; i < n; i++) {
        let z = b; for (let j = 0; j < d; j++) z += w[j] * X[i][j];
        const e = sig(z) - y[i]; gb += e; for (let j = 0; j < d; j++) gw[j] += e * X[i][j];
      }
      b -= lr * gb / n; for (let j = 0; j < d; j++) w[j] = (w[j] - lr * gw[j] / n) / (1 + lr * lambda); // pas proximal: stabil la orice lambda
    }
    return { w, b };
  }
  function scaler(X) {
    const d = X[0].length, mu = [], sd = [];
    for (let j = 0; j < d; j++) {
      const col = X.map(r => r[j]), m = col.reduce((s, t) => s + t, 0) / col.length;
      mu.push(m); sd.push(Math.sqrt(col.reduce((s, t) => s + (t - m) ** 2, 0) / col.length) || 1);
    }
    return { mu, sd, f: r => r.map((t, j) => Math.max(-4, Math.min(4, (t - mu[j]) / sd[j]))) };
  }
  function potriveste(rows, lambda) {
    const X = rows.map(r => r.x), y = rows.map(r => r.y), sc = scaler(X);
    const m = antreneaza(X.map(sc.f), y, lambda);
    return {
      ...m, sc,
      p(x) { const z = sc.f(x); let s = m.b; for (let j = 0; j < z.length; j++) s += m.w[j] * z[j]; return sig(s); },
      contributii(x) { const z = sc.f(x); return z.map((t, j) => m.w[j] * t); },
    };
  }

  /* Opțiuni: H = orizontul în zile de bursă, lambda = regularizarea, minAntrenare = câte exemple înainte de primul test */
  function analizeaza(zile, opt) {
    opt = Object.assign({ H: 5, lambda: 2, minAntrenare: 25 }, opt || {});
    const H = opt.H, rows = indicatori(zile);
    rows.forEach((r, i) => { r.y = i + H < rows.length ? (rows[i + H].pret > r.pret ? 1 : 0) : null; r.ret = i + H < rows.length ? rows[i + H].pret / r.pret - 1 : null; });
    const etichetate = rows.filter(r => r.ok && r.y !== null);
    const ultim = rows[rows.length - 1];
    const rez = { H, ultim, rows, nAntrenare: etichetate.length, gata: false };
    if (!ultim.ok || etichetate.length < opt.minAntrenare + 5) { rez.motiv = "Istoric prea scurt pentru un model (" + etichetate.length + " exemple)."; return rez; }

    /* test walk-forward: pentru ziua i antrenăm doar pe exemplele a căror etichetă se știa în ziua i */
    const valid = rows.map((r, i) => ({ r, i })).filter(o => o.r.ok);
    const test = [];
    for (const { r, i } of valid) {
      if (r.y === null) continue;
      const tren = valid.filter(o => o.i + H <= i && o.r.y !== null).map(o => o.r);
      if (tren.length < opt.minAntrenare) continue;
      const p = potriveste(tren, opt.lambda).p(r.x);
      const baza = tren.reduce((s, t) => s + t.y, 0) / tren.length;
      test.push({ data: r.data, p, y: r.y, ret: r.ret, baza });
    }
    let brier = 0, brierBaza = 0, nimerite = 0, semnale = 0, nimSemnale = 0, castig = 0;
    for (const t of test) {
      brier += (t.p - t.y) ** 2; brierBaza += (t.baza - t.y) ** 2;
      if ((t.p >= 0.5) === (t.y === 1)) nimerite++;
      if (t.p >= PRAG_BUY || t.p <= PRAG_SELL) { semnale++; const bun = t.p >= PRAG_BUY ? t.y === 1 : t.y === 0; if (bun) nimSemnale++; castig += (t.p >= PRAG_BUY ? 1 : -1) * t.ret; }
    }
    const nT = test.length || 1;
    const test_ = {
      n: test.length, acuratete: nimerite / nT, brier: brier / nT, brierBaza: brierBaza / nT,
      semnale, acurateteSemnale: semnale ? nimSemnale / semnale : null, randamentMediuSemnal: semnale ? castig / semnale : null,
      skill: brierBaza > 0 ? 1 - brier / brierBaza : 0, istoric: test,
    };

    const model = potriveste(etichetate, opt.lambda);
    const pBrut = model.p(ultim.x);
    /* încredere: crește cu nr. de exemple și cu cât a bătut modelul hazardul în test; fără skill -> spre 50% */
    const incrDate = etichetate.length / (etichetate.length + 60);
    const incrSkill = test_.n >= 10 ? Math.max(0.15, Math.min(1, 0.5 + 5 * test_.skill)) : 0.3;
    const incredere = incrDate * incrSkill;
    const p = 0.5 + (pBrut - 0.5) * incredere;

    const contr = model.contributii(ultim.x).map((c, j) => ({ nume: NUME[j], valoare: ultim.x[j], efect: c }))
      .sort((a, b) => Math.abs(b.efect) - Math.abs(a.efect));

    Object.assign(rez, { gata: true, p, pBrut, incredere, test: test_, contributii: contr, semnal: semnal(p), model });
    return rez;
  }

  function semnal(p) { return p >= PRAG_BUY ? "BUY" : p <= PRAG_SELL ? "SELL" : "AȘTEAPTĂ"; }

  /* Plan concret: stop și țintă din ATR, mărimea poziției după riscul acceptat din capital */
  function plan(rez, capital, riscProc) {
    const u = rez.ultim, a = u.atr, s = rez.semnal;
    if (!rez.gata || !Number.isFinite(a)) return null;
    const dir = s === "SELL" ? -1 : 1;
    const stop = u.pret - dir * 1.5 * a, tinta = u.pret + dir * 2.5 * a;
    const riscPeActiune = Math.abs(u.pret - stop);
    const bucati = capital > 0 ? Math.floor((capital * (riscProc / 100)) / riscPeActiune) : 0;
    const maxBucati = capital > 0 ? Math.floor(capital / u.pret) : 0;
    return { semnal: s, pret: u.pret, stop, tinta, atr: a, bucati: Math.min(bucati, maxBucati), riscPeActiune, raport: 2.5 / 1.5 };
  }

  /* „Ce-ar fi dacă”: înlocuiește/adaugă prețul curent (de la broker) ca închidere a zilei de azi */
  function cuPretCurent(zile, pret, dataAzi) {
    const z = zile.map(r => r.slice()); const u = z[z.length - 1];
    if (u[0] === dataAzi) { u[4] = pret; u[2] = Math.max(u[2], pret); u[3] = Math.min(u[3], pret); }
    else z.push([dataAzi, u[4], Math.max(u[4], pret), Math.min(u[4], pret), pret, u[5]]);
    return z;
  }

  return { analizeaza, indicatori, plan, cuPretCurent, semnal, PRAG_BUY, PRAG_SELL, NUME };
});
