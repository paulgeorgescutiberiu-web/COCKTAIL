/* „Săptămâna ta”: cardul din Contracte și sursa pentru emailul de luni dimineață.
   Calculul e în cp-core.js (CPCore.rezumat), același și în aplicație, și în email.
   Aplicația salvează în privat/rezumat ce știe doar ea (fișa săptămânii cu echipele și ce lipsește din stoc),
   ca robotul de luni (tools/rezumat/) să aibă datele chiar dacă nu deschizi aplicația în dimineața aceea. */
(function(){
const F=window.CPFS,C=window.CPCore;if(!F||!F.isAdmin||!C)return;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const dsKey=f=>"d-"+String(f).replace(/[^A-Za-z0-9_\-.~:@+]/g,"-").slice(0,150);
let DISP={},STOC=null,lastSig="",OPEN=null;

F.fs.collection(`${F.base}/disp`).onSnapshot(s=>{const n={};s.docs.forEach(d=>{const x=d.data()||{};n[d.id]={name:x.name||"",conf:x.conf||{}}});DISP=n;refresh()},()=>{});

/* fișa săptămânii încărcate: evenimente, ore, persoane, echipă */
function fisa(){try{const e=window.__cp&&window.__cp.evd();if(!e||!e.aoa)return null;const D=window.__cp.parseAOA(e.aoa,e.fileName),ds=dsKey(e.fileName);
  return {ds,title:D.title&&D.title.big||e.fileName,events:D.events.map(x=>{const d=x.date||(D.title&&D.title.date);
    return {key:`${ds}|${x.col}`,name:x.name,date:d?C.iso(d):"",time:x.time||"",persons:typeof x.persons==="number"?x.persons:(x.persons?String(x.persons):""),team:x.team||[]}})}}catch(err){return null}}
/* ce nu ajunge din stoc pentru evenimentele planificate și ce e sub zero */
async function stoc(){if(!window.__stocAll)return null;try{const all=await window.__stocAll();
  return {lipsa:all.filter(a=>a.disponibil<0).map(a=>({label:a.articol,lipsa:Math.round(-a.disponibil*100)/100})).sort((a,b)=>b.lipsa-a.lipsa).slice(0,30),
    minus:all.filter(a=>a.stoc<0).map(a=>a.articol).slice(0,30)}}catch(e){return null}}
async function publish(){if(document.visibilityState!=="visible")return;
  const s=await stoc();if(s)STOC=s;const f=fisa();
  const data={fisa:f||{ds:"",title:"",events:[]},stoc:STOC||{lipsa:[],minus:[]}},sig=JSON.stringify(data);
  if(sig===lastSig)return;
  try{await F.fs.doc(`${F.base}/privat/rezumat`).set({...data,at:new Date().toISOString(),by:F.NAME||""});lastSig=sig;refresh()}catch(e){}}
setTimeout(publish,6000);setInterval(publish,90000);
document.addEventListener("cp-stoc",()=>{clearTimeout(publish._t);publish._t=setTimeout(publish,3000)});

function calc(){const q=window.__qr&&window.__qr.data?window.__qr.data():{CT:[],LEADS:[]};
  return C.rezumat({contracte:q.CT,leads:q.LEADS,disp:DISP,sursa:{fisa:fisa()||{events:[]},stoc:STOC||{lipsa:[],minus:[]},at:new Date().toISOString()}},Date.now())}
function html(){let R;try{R=calc()}catch(e){console.warn(e);return ""}
  const luni=new Date().getDay()===1,saved=ls.get("cp-rz-open-"+R.sapt.de),open=OPEN!=null?OPEN:saved!=null?saved==="1":luni||R.prioritati.length>0;
  const n=R.prioritati.length;
  let h=`<details class="ct-card rz"${open?" open":""}><summary class="rz-s"><b>Săptămâna ta</b><span>${esc(C.intervalText(R.sapt))} · ${R.evenimente.length} ${R.evenimente.length===1?"eveniment":"evenimente"}${n?` · <b class="rz-n">${n} ${n===1?"lucru important":"lucruri importante"}</b>`:" · totul e la zi"}</span></summary>`;
  if(n)h+=`<ol class="rz-p">${R.prioritati.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`;
  h+=`<h3 class="rz-h">Evenimente</h3>`;
  if(!R.evenimente.length)h+=`<p class="ev-file">Nimic săptămâna asta.</p>`;
  R.evenimente.forEach(x=>{const t=x.echipa&&x.echipa.length?x.echipa.map(m=>`<span class="rz-m rz-${m.conf==="da"?"da":m.conf==="nu"?"nu":"q"}" title="${m.conf==="da"?"a confirmat":m.conf==="nu"?"nu poate":"nu a răspuns încă"}">${esc(m.nume)}</span>`).join(""):`<span class="rz-m rz-nu">fără echipă în fișă</span>`;
    h+=`<div class="rz-r${x.trecut?" off":""}"><div><b>${esc(x.nume)}</b><small>${esc([C.ziSiData(x.data),x.ora?"ora "+x.ora:"",x.invitati?x.invitati+" invitați":""].filter(Boolean).join(" · "))}${!x.semnat?" · <b class=rz-red>nesemnat</b>":x.faraContract?"":!x.avans?" · <b class=rz-red>avans neîncasat</b>":""}</small></div><div class="rz-t">${t}</div></div>`});
  if(R.avans.length||R.rest.length){h+=`<h3 class="rz-h">Bani de urmărit</h3>`;
    R.rest.forEach(x=>h+=`<div class="rz-r"><div><b>Diferența · ${esc(x.nume)}</b><small>${x.intarziat?`<b class=rz-red>întârziată</b> · `:""}${esc(x.scadenta?"scadentă "+C.dataScurta(x.scadenta):"eveniment "+C.dataScurta(x.data))}</small></div>${x.tel?`<a class="btn" href="https://wa.me/${esc(C.telWa(x.tel))}" target="_blank" rel="noopener">WhatsApp</a>`:""}</div>`);
    R.avans.forEach(x=>h+=`<div class="rz-r"><div><b>Avans${x.suma?" "+esc(x.suma):""} · ${esc(x.nume)}</b><small>eveniment ${esc(C.dataLunga(x.data))}${x.semnat?"":" · contract nesemnat"}</small></div>${x.tel?`<a class="btn" href="https://wa.me/${esc(C.telWa(x.tel))}" target="_blank" rel="noopener">WhatsApp</a>`:""}</div>`)}
  if(R.stoc.lipsa.length){h+=`<h3 class="rz-h">Stoc</h3><p class="ev-file">Nu ajung pentru evenimentele planificate: ${R.stoc.lipsa.slice(0,10).map(s=>`${esc(s.label)} (−${esc(String(s.lipsa).replace(".",","))})`).join(", ")}. Le găsești la Stoc → Comandă furnizor.</p>`}
  h+=`<p class="ev-file rz-f">Săptămâna viitoare: ${R.viitoare.length?R.viitoare.map(v=>esc(v.nume)+" "+esc(C.dataScurta(v.data))).join(", "):"nimic încă"}. Același rezumat îți vine pe email luni dimineață.</p></details>`;
  return h}
function refresh(){if(window.__ctRefresh)window.__ctRefresh()}
document.addEventListener("toggle",e=>{if(e.target.classList&&e.target.classList.contains("rz")){OPEN=e.target.open;ls.set("cp-rz-open-"+C.saptamana(Date.now()).de,OPEN?"1":"0")}},true);
window.__rez={html,calc,publish};
})();
