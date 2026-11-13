/* Postările programate (logica, fără Firebase, ca s-o poată testa tests/social.test.js).
   Aplicația pune în socialCoada/{id}: {cand, caption, hook, mic, stare:"programat", incercari}, iar poza în socialPoze/{id}: {img (JPEG base64)}.
   postariProgramate (index.js) le ia pe cele ajunse la ora lor, le trimite la webhook-ul Make
   (aceleași câmpuri ca „Postează acum”: id, caption, photo) și le mută în socialPostate/{id}. */
const HOOK_RE = /^https:\/\/hook\.[a-z0-9]+\.make\.com\//;
const INCERCARI = 3;

/* care se trimit acum: ajunse la oră, programate sau cu eroare și mai puțin de 3 încercări */
function deTrimis(docs, acum) {
  return docs
    .filter(d => typeof d.cand === "number" && d.cand <= acum)
    .filter(d => d.stare === "programat" || (d.stare === "eroare" && (d.incercari || 0) < INCERCARI))
    .sort((a, b) => a.cand - b.cand);
}

/* formularul pentru Make; aruncă dacă datele nu sunt bune (atunci nu se mai reîncearcă) */
function formular(id, d, poza) {
  if (!HOOK_RE.test(String(d.hook || ""))) throw Object.assign(new Error("Adresa webhook-ului din Make nu e bună."), { final: true });
  const caption = String(d.caption || "").trim();
  if (!caption) throw Object.assign(new Error("Postarea nu are text."), { final: true });
  if (!poza || !poza.img) throw Object.assign(new Error("Lipsește poza."), { final: true });
  const buf = Buffer.from(poza.img, "base64");
  if (buf.length < 1000 || buf[0] !== 0xff || buf[1] !== 0xd8) throw Object.assign(new Error("Poza nu e un JPEG bun."), { final: true });
  const fd = new FormData();
  fd.append("id", id);
  fd.append("caption", caption);
  fd.append("photo", new Blob([buf], { type: "image/jpeg" }), id + ".jpg");
  return fd;
}

/* trimite o postare; întoarce {ok:true} sau {ok:false, err, final} */
async function trimite(id, d, poza, fetchFn = fetch) {
  let fd;
  try { fd = formular(id, d, poza); } catch (e) { return { ok: false, err: e.message, final: !!e.final }; }
  try {
    const r = await fetchFn(d.hook, { method: "POST", body: fd, signal: AbortSignal.timeout(60e3) });
    if (!r.ok) return { ok: false, err: `Make a răspuns ${r.status}` + (r.status === 410 ? " (scenariul e oprit?)" : ""), final: false };
    return { ok: true };
  } catch (e) {
    return { ok: false, err: "Nu am putut ajunge la Make: " + (e && e.message || e), final: false };
  }
}

/* ce se scrie înapoi în socialCoada după o încercare nereușită */
function dupaEroare(d, rez) {
  const incercari = (d.incercari || 0) + 1;
  return { stare: "eroare", incercari: rez.final ? INCERCARI : incercari, err: String(rez.err || "").slice(0, 300) };
}

/* postări rămase pe „trimit” (funcția s-a oprit la mijloc): după 15 minute le marchez ca eroare, fără reîncercare automată,
   ca să nu se posteze de două ori; Paul vede eroarea și apasă „Reîncearcă” dacă nu a apărut pe Instagram */
const BLOCAT_MS = 15 * 60e3;
function blocate(docs, acum) {
  return docs.filter(d => d.stare === "trimit" && (!d.trimitLa || acum - d.trimitLa > BLOCAT_MS));
}
const BLOCAT = { stare: "eroare", incercari: INCERCARI, err: "Trimiterea s-a întrerupt. Verifică pe Instagram dacă a apărut; dacă nu, apasă Reîncearcă." };

module.exports = { HOOK_RE, INCERCARI, BLOCAT_MS, BLOCAT, deTrimis, blocate, formular, trimite, dupaEroare };
