
/* ---------- Oferte și meniu ---------- */
(function(){
const V=$("#v-oferte"),F=window.CPFS;
if(!V||!F)return;
/* Ofertele trimit la paginile de pe site (aceleași prețuri, din site-nou/preturi.js); PDF-urile vechi nu mai sunt la zi */
const CPP=window.CP_PRETURI||{},nr=v=>String(v).replace(".",","),AI=CPP.allInclusive||[],BM=CPP.barmani||{};
const AI_TXT=AI.length?`de la ${nr(AI[AI.length-1][2])} la ${nr(AI[0][2])} € / invitat`:"preț fix pe invitat";
const BM_TXT=Object.entries(BM).map(([n,v])=>`${n} ${n==="1"?"barman":"barmani"} ${v} €`).join(", ");
const SITE="https://cocktailphilosophy.ro";
const DEF=[
  {id:"meniu",titlu:"Meniu 2026",desc:"Meniul de cocktailuri pe site: signature, clasice și fără alcool",fisier:SITE+"/meniu/",cover:"meniu-2026.jpg",toti:true},
  {id:"allinc",titlu:"Ofertă All you can drink",desc:`Băutură nelimitată, ${AI_TXT}, cu calculator de preț`,fisier:SITE+"/oferte/#all-inclusive",cover:"oferta-all-inclusive.jpg",toti:false},
  {id:"barmani",titlu:"Ofertă Pachet barmani",desc:`Servicii de barman${BM_TXT?": "+BM_TXT:""}`,fisier:SITE+"/oferte/#pachet-barmani",cover:"oferta-barmani.jpg",toti:false}];
let docs=null,editing=null,saved=false;
/* linkurile vechi (PDF-uri pe GitHub sau WordPress) trec pe paginile noi ale site-ului, cu textul la zi */
const OLD=/(meniu-2026|MENIU-2026-GOLD|oferta-all-inclusive|OFERTA-ALL-INCLUSIVE|oferta-barmani|PACHET-BARMANI)[^/]*\.pdf$/i;
const fixUrls=L=>L.map(d=>{const n=DEF.find(x=>x.id===d.id);return n&&OLD.test(d.fisier||"")?{...d,titlu:n.titlu,desc:n.desc,fisier:n.fisier}:d});
const adm=()=>!!F.isAdmin;
const url=p=>{try{return new URL(p,location.href.split("#")[0]).href}catch(e){return p}};
async function load(){
  try{const d=await F.fs.doc(`${F.base}/config/oferte`).get();docs=d.exists&&Array.isArray(d.data().docs)?fixUrls(d.data().docs):DEF.map(x=>({...x}));saved=d.exists}
  catch(e){docs=DEF.map(x=>({...x}))}
  render();
}
async function persist(){
  try{await F.fs.doc(`${F.base}/config/oferte`).set({docs,at:new Date().toISOString()});saved=true;return true}
  catch(e){toast("Nu am putut salva lista. Verifică internetul.");return false}
}
function card(d,i){
  return `<div class="of-card">
    ${d.cover?`<a href="${esc(url(d.fisier))}" target="_blank" rel="noopener" class="of-cover"><img src="${esc(url(d.cover))}" alt="" loading="lazy" onerror="this.parentNode.classList.add('none')"></a>`:""}
    <div class="of-body"><b>${esc(d.titlu)}</b>${adm()&&!d.toti?` <span class="of-tag">doar eu</span>`:""}<p class="ev-file">${esc(d.desc||"")}</p>
    <div class="ct-b"><a class="btn primary" href="${esc(url(d.fisier))}" target="_blank" rel="noopener">Deschide</a>
      <button class="btn" data-share="${i}">Trimite clientului</button><button class="btn" data-copy="${i}">Copiază linkul</button>
      ${adm()?`<button class="btn" data-oed="${i}">Editează</button>`:""}</div></div></div>`;
}
function viewList(){
  if(!docs)return `<p class="ev-file">Se încarcă…</p>`;
  const L=docs.map((d,i)=>[d,i]).filter(([d])=>adm()||d.toti);
  let h=`<div class="st-top"><div><p class="ev-sub">Oferte și meniu</p><p class="ev-file">Deschide sau trimite clientului ultima variantă, direct de aici.</p></div>
    ${adm()?`<div class="st-acts"><button class="btn" data-oadd="1">Adaugă document</button></div>`:""}</div>`;
  if(!L.length)return h+`<div class="ev-ok">Nu e niciun document încă.</div>`;
  h+=`<div class="of-grid">${L.map(([d,i])=>card(d,i)).join("")}</div>`;
  if(adm())h+=`<p class="ev-help">Ca să actualizezi o ofertă: în WordPress, la Media, deschide fișierul și folosește „Înlocuiește media”, cu opțiunea de a înlocui doar fișierul. Adresa rămâne aceeași, deci site-ul și aplicația arată imediat noua variantă. Pentru un document nou, apasă „Adaugă document” și alege PDF-ul; îl pun eu în Google Drive. Atenție: oricine are linkul unui PDF îl poate deschide, așa că pune acolo doar ce poți trimite clienților.</p>`;
  return h;
}
function viewEdit(){
  const d=editing.d,row=(k,l,ph)=>`<label>${l}<input data-od="${k}" value="${esc(d[k]||"")}" placeholder="${esc(ph||"")}"></label>`;
  return `<div class="st-top"><div><p class="ev-sub">${editing.i==null?"Document nou":"Editează documentul"}</p></div><div class="st-acts"><button class="btn" data-oback="1">Renunță</button></div></div>
    <div class="st-meta">${row("titlu","Titlu","Ofertă Nuntă 2027")}${row("desc","Descriere scurtă","")}</div>
    <div class="st-ai"><p class="ev-sub" style="margin:0 0 6px">Fișierul PDF</p>
      ${editing.up?`<p class="ev-file">Se încarcă în Google Drive…</p>`:d.fisier?`<p class="ev-file">✓ ${esc(editing.upName||"Fișier ales")} · <a href="${esc(url(d.fisier))}" target="_blank" rel="noopener">deschide</a></p>`:""}
      <label class="btn primary ct-up">${d.fisier?"Alege alt PDF":"Alege PDF-ul de pe calculator sau telefon"}<input type="file" id="ofFile" accept="application/pdf" hidden></label>
      <p class="ev-file">Îl pun în Google Drive, în dosarul „Oferte și meniuri”, cu link pe care îl poate deschide oricine îl primește.</p>
      <details${d.fisier&&!editing.upName?" open":""}><summary class="ev-file">Sau pune un link</summary><div class="st-meta">${row("fisier","Link către PDF","https://…")}${row("cover","Imagine copertă (opțional, link)","")}</div></details></div>
    <label class="ct-opt"><input type="checkbox" data-od="toti"${d.toti?" checked":""}><span>Îl vede toată echipa (altfel doar tu)</span></label>
    <div class="st-save">${editing.i!=null?`<button class="btn st-del" data-odel="1">Șterge din listă</button> `:""}<button class="btn primary" data-osave="1">Salvează</button></div>`;
}
function render(){V.innerHTML=editing?viewEdit():viewList()}
async function share(d,btn){
  const u=url(d.fisier),lbl=btn.textContent,txt=`${d.titlu} · Cocktail Philosophy`,wa=()=>window.open("https://wa.me/?text="+encodeURIComponent(`${txt}\n${u}`),"_blank");
  btn.disabled=true;btn.textContent="Se pregătește…";
  try{
    if(navigator.canShare&&/\.pdf(\?|$)/i.test(u)){   // PDF-ul se trimite ca fișier; o pagină de pe site, ca link
      try{const r=await fetch(u);if(r.ok){const b=await r.blob(),file=new File([b],decodeURIComponent(u.split("/").pop().split("?")[0])||"oferta.pdf",{type:b.type||"application/pdf"});
        if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:d.titlu,text:txt});return}}}catch(x){if(x&&x.name==="AbortError")return}
    }
    if(navigator.share){await navigator.share({title:d.titlu,text:txt,url:u});return}
    wa();
  }catch(e){if(!e||e.name!=="AbortError")wa()}
  finally{btn.disabled=false;btn.textContent=lbl}
}
V.addEventListener("change",async e=>{
  if(e.target.id!=="ofFile"||!editing)return;const fl=e.target.files&&e.target.files[0];if(!fl)return;
  V.querySelectorAll("[data-od]").forEach(el=>{editing.d[el.dataset.od]=el.type==="checkbox"?el.checked:el.value.trim()});
  if(fl.type&&fl.type!=="application/pdf"){toast("Alege un fișier PDF.");return}
  if(!window.__gd){toast("Legătura cu Google Drive nu e disponibilă acum.");return}
  editing.up=true;render();
  try{const r=await window.__gd.uploadPublic(fl,"Oferte și meniuri");editing.d.fisier=r.link;editing.upName=r.name;if(!editing.d.titlu)editing.d.titlu=fl.name.replace(/\.pdf$/i,"");toast("PDF-ul e încărcat. Apasă Salvează.")}
  catch(err){console.warn(err);toast(err&&err.msg||"Nu am putut încărca PDF-ul în Drive.")}
  finally{editing.up=false;render()}
});
V.addEventListener("click",async e=>{
  const t=e.target;
  const sh=t.closest("[data-share]");if(sh){share(docs[+sh.dataset.share],sh);return}
  const cp=t.closest("[data-copy]");if(cp){const u=url(docs[+cp.dataset.copy].fisier);try{await navigator.clipboard.writeText(u);toast("Linkul e copiat. Îl poți lipi în mesaj sau e-mail.")}catch(x){prompt("Linkul documentului:",u)}return}
  const ed=t.closest("[data-oed]");if(ed){const i=+ed.dataset.oed;editing={i,d:{...docs[i]}};render();return}
  if(t.closest("[data-oadd]")){editing={i:null,d:{id:"d"+Date.now(),titlu:"",desc:"",fisier:"",cover:"",toti:false}};render();return}
  if(t.closest("[data-oback]")){editing=null;render();return}
  const grab=()=>V.querySelectorAll("[data-od]").forEach(el=>{editing.d[el.dataset.od]=el.type==="checkbox"?el.checked:el.value.trim()});
  if(t.closest("[data-osave]")){grab();if(!editing.d.titlu||!editing.d.fisier){toast("Completează titlul și alege PDF-ul.");return}delete editing.up;delete editing.upName;
    if(editing.i==null)docs.push(editing.d);else docs[editing.i]=editing.d;if(await persist()){editing=null;render();toast("Lista a fost salvată.")}return}
  if(t.closest("[data-odel]")){docs.splice(editing.i,1);if(await persist()){editing=null;render();toast("Documentul a fost scos din listă.")}return}
});
let started=false;
function start(){if(started)return;started=true;load()}
document.querySelectorAll("nav.tabs button").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.view==="oferte")start()}));
if(store.get("tab","retete")==="oferte")start();
})();
