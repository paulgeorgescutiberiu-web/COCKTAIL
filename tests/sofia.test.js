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
  /* Gemini Live: window.__LIVE.push(mesaj) trimite un mesaj de la server */
  const L = window.__LIVE = { q: [], w: null, audio: 0, texts: [], fr: [], closed: false, cfg: null,
    push(m) { this.q.push(m); if (this.w) { const w = this.w; this.w = null; w(); } } };
  const session = { isClosed: false,
    async *receive() { while (!L.closed) { if (!L.q.length) await new Promise(r => L.w = r); while (L.q.length) yield L.q.shift(); } },
    async sendAudioRealtime(b) { if (b && b.data) L.audio++; }, async sendTextRealtime(t) { L.texts.push(t); },
    async sendFunctionResponses(r) { L.fr.push(JSON.parse(JSON.stringify(r))); }, async close() { L.closed = true; session.isClosed = true; if (L.w) L.w(); } };
  const aiM = { ResponseModality: { AUDIO: "AUDIO" },
    getGenerativeModel: () => ({ startChat: () => chat }),
    getLiveGenerativeModel: (ai, cfg) => { L.cfg = cfg; return { connect: async () => session }; } };
  window.__fakeAI = { loadAI: async () => ({ aiM, ai: {} }), models: ["m"], ready: () => true, err: e => String(e && e.message) };
}

async function open(mode) {
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
    return route.abort();
  });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.goto(ORIGIN + "index.html#k=" + S.TEAM);
  await page.waitForFunction(() => window.CPFS && window.__cpAI && document.getElementById("vcBtn"), null, { timeout: 15000 });
  await page.evaluate(() => { window.__cpAI = window.__fakeAI; });
  return { page, errors, ctx };
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
  await page.evaluate(c => { window.__SCRIPT.push(c, { chunks: ["Bine, am renunțat."] }); window.__SAY.push("nu e bine"); }, call);
  await page.fill("#vcIn", "Marchează avansul Anei ca încasat");
  await page.click("#vcF button[type=submit]");
  await page.waitForFunction(() => [...document.querySelectorAll("#vcLog .vc-ai")].some(x => /renunțat/.test(x.textContent)), null, { timeout: 8000 });
  assert.equal(await avans(page), false, "„nu e bine” nu trebuie să salveze");
  await page.evaluate(c => { window.__SCRIPT.push(c, { chunks: ["Gata, am marcat avansul."] }); window.__SAY.push("da"); }, call);
  await page.fill("#vcIn", "Ba da, marchează-l");
  await page.click("#vcF button[type=submit]");
  await page.waitForFunction(() => [...document.querySelectorAll("#vcLog .vc-ai")].some(x => /am marcat/.test(x.textContent)), null, { timeout: 8000 });
  assert.equal(await avans(page), true);
  assert.deepEqual(errors, [], errors.join("\n"));
  await ctx.close();
});

test("Sofia cu Gemini Live: sunet în ambele sensuri, funcții, confirmare doar după „da”, închidere", async () => {
  const { page, errors, ctx } = await open("live");
  await page.click("#vcBtn");
  await page.waitForFunction(() => window.__LIVE.cfg && window.__LIVE.audio > 2, null, { timeout: 8000 });
  const cfg = await page.evaluate(() => ({ voice: window.__LIVE.cfg.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, mod: window.__LIVE.cfg.generationConfig.responseModalities, fn: window.__LIVE.cfg.tools[0].functionDeclarations.map(f => f.name), conf: !!window.__LIVE.cfg.tools[0].functionDeclarations.find(f => f.name === "marcheaza_incasare").parameters.properties.confirmat }));
  assert.equal(cfg.voice, "Sulafat");
  assert.deepEqual(cfg.mod, ["AUDIO"]);
  assert.ok(cfg.fn.includes("inchide_conversatia") && cfg.conf);
  assert.match(await page.textContent("#vcMic"), /Încheie conversația/);
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
