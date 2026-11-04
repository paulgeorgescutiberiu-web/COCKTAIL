/* Imaginile de previzualizare (Open Graph, 1200×630) pentru paginile site-ului nou.
   Rulare: node tools/og-imagini.js   → site-nou/img/og/<pagina>.jpg
   Se rulează din nou doar când se schimbă o poză sau un titlu din tools/seo-pagini.json. */
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, ".."), SN = path.join(ROOT, "site-nou");
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, "seo-pagini.json"), "utf8"));
const b64 = f => fs.readFileSync(f).toString("base64");
const font = (n) => `url(data:font/woff2;base64,${b64(path.join(SN, "fonts", n))}) format("woff2")`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const logo = fs.readFileSync(path.join(SN, "img", "logo-negativ.svg"), "utf8");

function page(p) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Anton;src:${font("anton-latin-ext-400-normal.woff2")};unicode-range:U+0100-02AF,U+0218-021B}
@font-face{font-family:Anton;src:${font("anton-latin-400-normal.woff2")}}
@font-face{font-family:BC;font-weight:700;src:${font("barlow-condensed-latin-ext-700-normal.woff2")};unicode-range:U+0100-02AF,U+0218-021B}
@font-face{font-family:BC;font-weight:700;src:${font("barlow-condensed-latin-700-normal.woff2")}}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#1A1A18;color:#FFFEF1;font-family:BC,sans-serif}
.bg{position:absolute;inset:0;background:url(data:image/webp;base64,${b64(path.join(SN, "img", p.foto))}) center/cover}
.sh{position:absolute;inset:0;background:linear-gradient(90deg,rgba(26,26,24,.94) 0%,rgba(26,26,24,.82) 48%,rgba(26,26,24,.25) 100%)}
.in{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column;justify-content:space-between}
.logo svg{width:430px;height:auto;display:block}
.k{font-weight:700;font-size:26px;letter-spacing:.2em;text-transform:uppercase;color:#E3B25C;margin-bottom:18px}
h1{font-family:Anton,Impact,sans-serif;font-weight:400;text-transform:uppercase;font-size:86px;line-height:1.02;max-width:900px}
h1 span{color:#E3B25C;display:block}
.f{display:flex;gap:28px;align-items:center;font-weight:700;font-size:24px;letter-spacing:.14em;text-transform:uppercase;color:#EFE7CF}
.f i{width:44px;height:3px;background:#C2862D}
</style></head><body><div class="bg"></div><div class="sh"></div><div class="in">
<div class="logo">${logo}</div>
<div><p class="k">${esc(p.kicker)}</p><h1>${esc(p.titlu)}<span>${esc(p.accent)}</span></h1></div>
<div class="f"><i></i>cocktailphilosophy.ro<i></i>0743 785 655</div></div></body></html>`;
}

(async () => {
  const out = path.join(SN, "img", "og");
  fs.mkdirSync(out, { recursive: true });
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [file, p] of Object.entries(CFG.pagini)) {
    await pg.setContent(page(p), { waitUntil: "load" });
    await pg.evaluate(() => document.fonts.ready);
    const dest = path.join(out, file.replace(/\.html$/, ".jpg"));
    await pg.screenshot({ path: dest, type: "jpeg", quality: 84 });
    console.log("OG:", path.relative(ROOT, dest), Math.round(fs.statSync(dest).size / 1024) + " KB");
  }
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
