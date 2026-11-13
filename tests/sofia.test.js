/* Testul Sofiei (asistentul vocal), cu Gemini, recunoașterea vocală și vocea simulate:
   - vocea telefonului: răspunsul vine în flux și Sofia începe să vorbească de la prima propoziție; „nu e bine” la confirmare înseamnă NU
   - Gemini Live: sunetul merge și vine, funcțiile se cheamă, scrierea trece doar după un „da” auzit după întrebare
   Rulare: npm test   (după bash src/build.sh) */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const { seed } = require("./date-test.js");

const ROOT = path.join(__dirname, "..");
const ORIGIN = "https://app.test/";
const FAKE = fs.readFileSync(path.join(__dirname, "fake-firebase.js"), "utf8");
let browser;

/* Recunoașterea vocală, vocea telefonului și Gemini, simulate în pagină */
function fakes() {
  window.__SAY = []; window.__SPOKEN = []; window.__REC = 0;
  class SR {
    start() { window.__REC++; const t = window.__SAY.shift();
      setTimeout(() => { if (t != null) this.onresult && this.onresult({ results: [Object.assign([{ transcript: t }], { isFinal: true })] }); setTimeout(() => this.stop(), 20); }, 30); }
    stop() { if (this.done) return; this.done = true; setTimeout(() => this.onend && this.onend(), 10); }
  }
  window.SpeechRecognition = window.webkitSpeechRecognition = SR;
  const synth = { speaking: false, pending: false, getVoices: () => [], cancel() {}, onvoiceschanged: null,
    speak(u) { if (u.text) window.__SPOKEN.push(u.text); setTimeout(() => u.onend && u.onend(), 20); } };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };

  /* Gemini: window.__SCRIPT = listă de răspunsuri; fiecare e {calls:[…]} sau {chunks:[…]} */
  window.__SCRIPT = []; window.__SENT = [];
  const resp = r => ({ functionCalls: () => r.calls || [], text: () => (r.chunks || []).join("") });
  const chat = { async sendMessageStream(msg) { window.__SENT.push(msg); const r = window.__SCRIPT.shift() || { chunks: ["Gata."] };
    return { stream: (async function* () { for (const c of r.chunks || []) { await new Promise(z => setTimeout(z, 60)); yield { text: () => c }; } })(), response: Promise.resolve().then(async () => { await new Promise(z => setTimeout(z, 60 * ((r.chunks || []).length + 1))); return resp(r); }) }; } };
  /* Gemini Live: WebSocket simulat (doar pentru adresa Gemini). window.__LIVE.push(mesaj) trimite un mesaj de la server;
     __LIVE.reject = motiv face ca serverul să închidă conexiunea la pornire */
  const L = window.__LIVE = { q: [], audio: 0, texts: [], fr: [], closed: false, cfg: null, url: "", ws: null, reject: null,
    push(m) { const { type, ...rest } = m; if (this.ws) this.ws._msg(type === "toolCall" ? { toolCall: rest } : { serverContent: rest }); } };
  const RealWS = window.WebSocket;
  class FakeWS {
    constructor(url) {
      if (!/generativelanguage\.googleapis\.com/.test(url)) return new RealWS(url);
      this.url = url; this.readyState = 0; L.url = url; L.ws = this;
      setTimeout(() => { this.readyState = 1; this.onopen && this.onopen(); }, 10);
    }
    send(s) {
      const m = JSON.parse(s);
      if (m.setup) { L.cfg = m.setup; L.closed = false;
        const r = (L.rejects || []).shift(); if (r) { setTimeout(() => this._close(1008, r), 5); return; }
        setTimeout(() => this._msg({ setupComplete: {} }), 5); }
      else if (m.realtimeInput && m.realtimeInput.audio) { if (m.realtimeInput.audio.data) L.audio++; }
      else if (m.realtimeInput && m.realtimeInput.text) L.texts.push(m.realtimeInput.text);
      else if (m.toolResponse) L.fr.push(JSON.parse(JSON.stringify(m.toolResponse.functionResponses)));
    }
    _msg(o) { this.onmessage && this.onmessage({ data: new TextEncoder().encode(JSON.stringify(o)).buffer }); }
    close() { this._close(1000, ""); }
    _close(code, reason) { if (this.readyState === 3) return; this.readyState = 3; L.closed = true; setTimeout(() => this.onclose && this.onclose({ code, reason }), 0); }
  }
  FakeWS.OPEN = 1; window.WebSocket = FakeWS;
  const aiM = { getGenerativeModel: () => ({ startChat: () => chat }) };
  const acM = { getToken: async () => ({ token: "appcheck-test" }) };
  window.__fakeAI = { loadAI: async () => ({ aiM, ai: {}, acM, appCheck: {} }), models: ["m"], ready: () => true, err: e => String(e && e.message) };
}

/* fn = cum răspunde serverul de bilete: implicit dă un bilet; {status:404} = neinstalat */
async function open(mode, fn) {
  const tickets = [];
  const S = seed();
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 }, locale: "ro-RO", timezoneId: "Europe/Bucharest", serviceWorkers: "block", permissions: ["microphone"] });
  await ctx.addInitScript(s => { window.__SEED = s; }, { docs: S.docs, user: S.user });
  await ctx.addInitScript(m => { try { localStorage.setItem("cp-voce-mod", m); } catch (e) {} }, mode);
  await ctx.addInitScript(fakes);
  await ctx.route("**/*", async route => {
    const url = route.request().url();
    if (url.startsWith(ORIGIN)) {
      const rel = decodeURIComponent(new URL(url).pathname.slice(1)) || "index.html";
      const f = path.join(ROOT, rel);
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: "" });
      return route.fulfill({ status: 200, contentType: /\.html$/.test(f) ? "text/html; charset=utf-8" : "application/octet-stream", body: fs.readFileSync(f) });
    }
    if (/firebasejs\/[\d.]+\/firebase-app-compat\.js/.test(url)) return route.fulfill({ contentType: "text/javascript", body: FAKE });
    if (/firebasejs\/[\d.]+\/firebase-[a-z-]+-compat\.js/.test(url)) return route.fulfill({ contentType: "text/javascript", body: "" });
    if (/xlsx(\.full)?\.min\.js/.test(url)) return route.fulfill({ contentType: "text/javascript", body: "window.XLSX={utils:{},read(){return{SheetNames:[],Sheets:{}}},writeFile(){}};" });
    if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return route.fulfill({ contentType: "text/css", body: "" });
    if (/cloudfunctions\.net\/sofiaLive$/.test(url)) {
      const req = route.request(), h = req.headers(), d = JSON.parse(req.postData() || "{}").data || {};
      tickets.push({ auth: h.authorization, appcheck: h["x-firebase-appcheck"], data: d });
      const cors = { "access-control-allow-origin": "*" };
      if (fn && fn.status) return route.fulfill({ status: fn.status, headers: cors, contentType: "application/json", body: JSON.stringify(fn.body || {}) });
      const model = d.motor === "expresiv" ? "gemini-9-flash-native-audio-test" : "gemini-9-live-test";
      return route.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify({ result: { token: "auth_tokens/bilet-" + tickets.length, model } }) });
    }
    return route.abort();
  });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.goto(ORIGIN + "index.html#k=" + S.TEAM);
  await page.waitForFunction(() => window.CPFS && window.__cpAI && document.getElementById("vcBtn"), null, { timeout: 15000 });
  await page.evaluate(() => { window.__cpAI = window.__fakeAI; });
  return { page, errors, ctx, tickets };
}
const log = page => page.$$eval("#vcLog .vc-m", m => m.map(x => x.className.replace("vc-m vc-", "") + ": " + x.textContent));
const avans = page => page.evaluate(() => { const d = window.__STORE.get([...window.__STORE.keys()].find(k => k.endsWith("/contracte/c1"))); return d && d.avansPlatit; });

before(async () => { browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] }); });
after(async () => { if (browser) await browser.close(); });

test("Sofia cu vocea telefonului: răspuns în flux, vorbește de la prima propoziție, conversație continuă", async () => {
  const { page, errors, ctx } = await open("clasic");
  await page.evaluate(() => {
    window.__SAY.push("Cum se face un Mojito", "gata");
    window.__SCRIPT.push({ calls: [{ name: "retete", args: { nume: "Mojito" } }] }, { chunks: ["Mojito are ", "rom alb și mentă. Mai ", "vrei ceva?"] });
  });
  await page.click("#vcBtn");
  await page.waitForFunction(() => window.__SPOKEN.includes("vrei ceva?") || window.__SPOKEN.some(s => /vrei ceva/.test(s)), null, { timeout: 8000 });
  const spoken = await page.evaluate(() => window.__SPOKEN);
  assert.equal(spoken[0], "Mojito are rom alb și mentă.", "prima propoziție se spune separat, cât vine restul");
  const L = await log(page);
  assert.ok(L.includes("eu: Cum se face un Mojito"), L.join("\n"));
  assert.ok(L.includes("act: Am căutat în rețetar ✓"), L.join("\n"));
  assert.ok(L.includes("ai: Mojito are rom alb și mentă. Mai vrei ceva?"), L.join("\n"));
  // după răspuns ascultă singură din nou; „gata” încheie
  await page.waitForFunction(() => [...document.querySelectorAll("#vcLog .vc-ai")].some(x => /Sunt aici când ai nevoie/.test(x.textContent)), null, { timeout: 8000 });
  assert.deepEqual(errors, [], errors.join("\n"));
  await ctx.close();
});

test("Sofia cu vocea telefonului: „nu e bine” la confirmare înseamnă NU, „da” salvează", async () => {
  const { page, errors, ctx } = await open("clasic");
  const call = { calls: [{ name: "marcheaza_incasare", args: { contract_id: "c1", ce: "avans", incasat: true } }] };
  await page.click("#vcBtn");   // deschide panoul și ascultă; nu spunem nimic
  await page.waitForFunction(() => window.__REC >= 1 && !/Gata, trimite/.test(document.getElementById("vcMic").textContent));
  await page.click("#vcCfgB"); await page.uncheck("#vcConv");   // fără ascultare automată între pași, ca replicile să ajungă unde trebuie
  await page.evaluate(c => { window.__SCRIPT.push(c, { chunks: ["Bine, am renunțat."] }); window.__SAY.push("nu e bine"); }, call);
  await page.fill("#vcIn", "Marchează avansul Anei ca încasat");
  await page.click("#vcF button[type=submit]");
  await page.waitForFunction(() => [...document.querySelectorAll("#vcLog .vc-ai")].some(x => /renunțat/.test(x.textContent)), null, { timeout: 8000 });
  assert.equal(await avans(page), false, "„nu e bine” nu trebuie să salveze");
  await page.evaluate(c => { window.__SCRIPT.push(c, { chunks: ["Gata, am marcat avansul."] }); window.__SAY.push("da"); }, call);
  await page.evaluate(() => { const i = document.getElementById("vcIn"); i.value = "Ba da, marchează-l"; document.getElementById("vcF").requestSubmit(); });   // imediat, cât Sofia încă termină tura
  await page.waitForFunction(() => [...document.querySelectorAll("#vcLog .vc-ai")].some(x => /am marcat/.test(x.textContent)), null, { timeout: 8000 });
  assert.equal(await avans(page), true);
  assert.deepEqual(errors, [], errors.join("\n"));
  await ctx.close();
});

test("Sofia cu Gemini Live: sunet în ambele sensuri, funcții, confirmare doar după „da”, închidere", async () => {
  const { page, errors, ctx, tickets } = await open("live");
  await page.click("#vcBtn");
  await page.waitForFunction(() => window.__LIVE.cfg && window.__LIVE.audio > 2, null, { timeout: 8000 });
  const cfg = await page.evaluate(() => ({ voice: window.__LIVE.cfg.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, mod: window.__LIVE.cfg.generationConfig.responseModalities, fn: window.__LIVE.cfg.tools[0].functionDeclarations.map(f => f.name), conf: !!window.__LIVE.cfg.tools[0].functionDeclarations.find(f => f.name === "marcheaza_incasare").parameters.properties.confirmat }));
  assert.equal(cfg.voice, "Sulafat");
  assert.deepEqual(cfg.mod, ["AUDIO"]);
  assert.ok(cfg.fn.includes("inchide_conversatia") && cfg.conf);
  // biletul se cere cu contul și App Check; conexiunea merge direct la Gemini, cu biletul, pe modelul dat de server
  assert.equal(tickets.length, 1);
  assert.equal(tickets[0].auth, "Bearer fake");
  assert.equal(tickets[0].appcheck, "appcheck-test");
  assert.ok(tickets[0].data.echipa.length >= 20, "trimite codul echipei");
  const live = await page.evaluate(() => ({ url: window.__LIVE.url, model: window.__LIVE.cfg.model, sys: window.__LIVE.cfg.systemInstruction.parts[0].text }));
  assert.match(live.url, /BidiGenerateContentConstrained\?access_token=auth_tokens%2Fbilet-1$/);
  assert.equal(live.model, "models/gemini-9-live-test");
  assert.match(live.sys, /Ești Sofia/);
  assert.match(await page.textContent("#vcMic"), /Încheie conversația/);
  assert.equal((await page.evaluate(() => window.__sofia.state())).loop, true, "vocea Sofiei trece prin legătura WebRTC (anularea ecoului)");
  if (process.env.CP_SHOTS) await page.screenshot({ path: path.join(process.env.CP_SHOTS, "sofia-live.png") });

  const tc = (id, args) => ({ type: "toolCall", functionCalls: [{ id, name: "marcheaza_incasare", args: { contract_id: "c1", ce: "avans", incasat: true, ...args } }] });
  const pcm = Buffer.alloc(4800).toString("base64");   // 0,1 s de liniște, 24 kHz
  await page.evaluate(([a, t]) => {
    window.__LIVE.push({ type: "serverContent", inputTranscription: { text: "Da, marchează avansul Anei" } });
    window.__LIVE.push(t);
    window.__LIVE.push({ type: "serverContent", modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: a } }] } });
  }, [pcm, tc("1", {})]);
  await page.waitForFunction(() => window.__LIVE.fr.length === 1);
  let fr = await page.evaluate(() => window.__LIVE.fr[0][0]);
  assert.equal(fr.id, "1");
  assert.match(fr.response.trebuie_confirmare, /Marchez avansul de la ANA POPESCU/);
  assert.ok(await page.isVisible("#vcAsk"), "butoanele Da / Nu sunt pe ecran");

  // Gemini cheamă cu confirmat=true fără ca utilizatorul să fi spus „da” după întrebare (acel „da” era dinainte): nu se salvează
  await page.evaluate(t => window.__LIVE.push(t), tc("2", { confirmat: true }));
  await page.waitForFunction(() => window.__LIVE.fr.length === 2);
  fr = await page.evaluate(() => window.__LIVE.fr[1][0]);
  assert.ok(fr.response.trebuie_confirmare, "fără „da” nu se salvează");
  assert.equal(await avans(page), false);

  // Sofia pune întrebarea, utilizatorul spune „da”, apoi chemarea cu confirmat=true salvează
  await page.evaluate(t => {
    window.__LIVE.push({ type: "serverContent", outputTranscription: { text: "Marchez avansul Anei ca încasat?" } });
    window.__LIVE.push({ type: "serverContent", turnComplete: true });
    window.__LIVE.push({ type: "serverContent", inputTranscription: { text: " Da." } });
    window.__LIVE.push(t);
  }, tc("3", { confirmat: true }));
  await page.waitForFunction(() => window.__LIVE.fr.length === 3);
  fr = await page.evaluate(() => window.__LIVE.fr[2][0]);
  assert.equal(fr.response.ok, true, JSON.stringify(fr));
  assert.equal(await avans(page), true);
  const L = await log(page);
  assert.ok(L.includes("eu: Da, marchează avansul Anei"), L.join("\n"));
  assert.ok(L.includes("ai: Marchez avansul Anei ca încasat?"), L.join("\n"));
  assert.ok(L.includes("act: Încasare ✓"), L.join("\n"));

  if (process.env.CP_SHOTS) await page.screenshot({ path: path.join(process.env.CP_SHOTS, "sofia-confirmare.png") });
  // textul scris merge direct în conversația live
  await page.fill("#vcIn", "Cât gin avem?");
  await page.click("#vcF button[type=submit]");
  await page.waitForFunction(() => window.__LIVE.texts.includes("Cât gin avem?"));

  // la revedere: Sofia închide singură conversația
  await page.evaluate(() => window.__LIVE.push({ type: "toolCall", functionCalls: [{ id: "4", name: "inchide_conversatia", args: {} }] }));
  await page.waitForFunction(() => window.__LIVE.closed, null, { timeout: 6000 });
  await page.waitForFunction(() => /Vorbește cu Sofia/.test(document.getElementById("vcMic").textContent));
  assert.deepEqual(errors, [], errors.join("\n"));
  await ctx.close();
});

test("ecoul pe difuzor: cât vorbește Sofia, microfonul rămâne închis la ecou și se deschide doar la o voce clar mai tare", async () => {
  const { page, errors, ctx } = await open("live");
  const r = await page.evaluate(() => {
    const g = window.__sofia.gate, L = { ctx: { currentTime: 10 }, playEnd: 15, pre: [], hot: 0, open: false }, out = [];
    const step = (t, r) => { L.ctx.currentTime = t; out.push(g(L, r)); };
    step(10.0, 0.12); step(10.1, 0.15); step(10.2, 0.1); step(10.3, 0.14);   // început: ecou tare, doar învață
    step(10.5, 0.13); step(10.6, 0.16); step(10.7, 0.12);                     // ecou: rămâne închis
    step(10.8, 0.7); step(10.9, 0.8);                                         // vorbești tu, tare: se deschide
    step(11.0, 0.1);                                                          // rămâne deschis până termină
    step(15.6, 0.1);                                                          // după ce a terminat: normal
    return out;
  });
  assert.deepEqual(r, ["off", "off", "off", "off", "off", "off", "off", "off", "flush", "on", "on"]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("pe laptop: ⌥S deschide Sofia, Space încheie, „Ascult-o” pornește cu vocea și motorul alese", async () => {
  const { page, errors, ctx, tickets } = await open("live");
  await page.keyboard.press("Alt+KeyS");
  await page.waitForFunction(() => window.__sofia.state().live, null, { timeout: 8000 });
  const st = await page.evaluate(() => window.__sofia.state());
  assert.equal(st.rate, 24000, "vocea se redă la 24 kHz, fără reeșantionare pe bucăți");
  assert.equal(st.loop, true, "legătura pentru ecou merge și cu Opus la calitate mare");
  assert.match(await page.textContent("#vcLog"), /Space/);
  await page.keyboard.press("Space");
  await page.waitForFunction(() => !window.__sofia.state().live);
  await page.click("#vcCfgB");
  await page.selectOption("#vcEng", "expresiv");
  await page.waitForFunction(() => window.__sofia.state().live && window.__LIVE.texts.some(x => /Salută-mă/.test(x)), null, { timeout: 8000 });
  assert.equal(tickets[tickets.length - 1].data.motor, "expresiv");
  assert.equal(await page.evaluate(() => window.__LIVE.cfg.model), "models/gemini-9-flash-native-audio-test");
  if (process.env.CP_SHOTS) { await page.setViewportSize({ width: 1440, height: 900 }); await page.screenshot({ path: path.join(process.env.CP_SHOTS, "sofia-laptop.png") }); }
  await page.selectOption("#vcLVoice", "Aoede");
  await page.waitForFunction(() => window.__LIVE.cfg.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === "Aoede", null, { timeout: 8000 });
  assert.deepEqual(errors, [], errors.join("\n"));
  await ctx.close();
});

test("serverul de bilete nu e instalat: Sofia spune de ce, trece imediat pe vocea telefonului și nu mai încearcă o vreme", async () => {
  const { page, errors, ctx, tickets } = await open("live", { status: 404 });
  await page.click("#vcBtn");
  await page.waitForFunction(() => /serverul pentru conversația live nu e încă instalat/.test(document.getElementById("vcLog").textContent), null, { timeout: 8000 });
  await page.waitForFunction(() => window.__REC >= 1, null, { timeout: 5000 });   // a trecut pe ascultarea telefonului
  assert.doesNotMatch(await page.textContent("#vcLog"), /nu e activat/);
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem("cp-voce-live-off")).motiv));
  // redeschis (ca după o reîncărcare): nu mai cere bilet, spune o dată de ce
  await page.evaluate(() => { window.__REC = 0; });
  await page.click("#vcX"); await page.click("#vcBtn");
  await page.waitForFunction(() => window.__REC >= 1, null, { timeout: 5000 });
  assert.equal(tickets.length, 1, "nu încearcă din nou Live");
  assert.match(await page.textContent("#vcLog"), /Conversația live e oprită/);
  assert.deepEqual(errors, [], errors.join("\n"));
  await ctx.close();
});

test("Gemini nu are modelul dat: Sofia cere un bilet pentru alt model și pornește", async () => {
  const { page, errors, ctx, tickets } = await open("live");
  await page.evaluate(() => { window.__LIVE.rejects = ["models/gemini-9-live-test is not found for API version v1beta, or is not supported for bidiGenerateContent"]; });
  await page.click("#vcBtn");
  await page.waitForFunction(() => window.__sofia.state().live, null, { timeout: 8000 });
  assert.equal(tickets.length, 2);
  assert.deepEqual(tickets[1].data.fara, ["gemini-9-live-test"]);
  assert.deepEqual(errors, [], errors.join("\n"));
  await ctx.close();
});
