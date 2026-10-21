/* ---------- Echipa: disponibilitatea barmanilor, evenimentele mele, anunțarea echipei ---------- */
(function(){
const V=document.getElementById("v-echipa"),F=window.CPFS;
if(!V||!F)return;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const MON=["ian","feb","mar","apr","mai","iun","iul","aug","sep","oct","nov","dec"],DAY=["Dum","Lun","Mar","Mie","Joi","Vin","Sâm"];
const DAYL=["duminică","luni","marți","miercuri","joi","vineri","sâmbătă"],MONL=["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
const nrm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/\s+/g," ").trim();
const first=s=>nrm(s).split(" ")[0]||"";
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const pd=s=>{const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]):null};
const fday=s=>{const d=pd(s);return d?`${DAYL[d.getDay()]}, ${d.getDate()} ${MONL[d.getMonth()]}`:""};
const telWa=t=>{let d=String(t||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.startsWith("0"))d="4"+d;return d};
const toast=m=>{const t=document.getElementById("toast");if(!t)return;t.textContent=m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),3500)};
const dsKey=f=>"d-"+String(f).replace(/[^A-Za-z0-9_\-.~:@+]/g,"-").slice(0,150);

let ALL={},sub=null,TEL=null,started=false,view="mine";
const me=()=>({uid:F.UID,name:F.NAME||""});
const my=()=>ALL[F.UID]||{days:{},conf:{}};
function subscribe(){if(sub)return;sub=F.fs.collection(`${F.base}/disp`).onSnapshot(s=>{const n={};s.docs.forEach(d=>n[d.id]=d.data());ALL=n;render();banner();document.dispatchEvent(new Event("cp-disp"))},()=>{V.innerHTML=`<p class="notice">Disponibilitatea nu se poate încărca. ${F.isAdmin?"Verifică regulile din Firebase (disp).":"Verifică internetul."}</p>`})}
const save=part=>F.fs.doc(`${F.base}/disp/${F.UID}`).set({name:F.NAME||"",...part,at:new Date().toISOString()},{merge:true}).catch(()=>toast("Nu am putut salva. Verifică internetul."));

/* evenimentele săptămânii încărcate și cine e în echipă */
function weekEvents(){try{const e=window.__cp.evd();if(!e||!e.aoa)return {D:null,ds:""};return {D:window.__cp.parseAOA(e.aoa,e.fileName),ds:dsKey(e.fileName)}}catch(x){return {D:null,ds:""}}}
function evISO(e,D){const d=e.date||(D&&D.title&&D.title.date);return d?iso(d):""}
function mine(){const {D,ds}=weekEvents();if(!D)return [];const f=first(F.NAME);if(!f)return [];
  return D.events.filter(e=>(e.team||[]).some(n=>first(n)===f)).map(e=>({e,ds,key:`${ds}|${e.col}`,d:evISO(e,D)}))}
/* cine a marcat că poate / nu poate într-o zi */
function availFor(d){const ok=[],no=[];Object.values(ALL).forEach(x=>{const v=x.days&&x.days[d];if(v==="da")ok.push(x.name);else if(v==="nu")no.push(x.name)});return {ok:ok.sort(),no:no.sort()}}
function confOf(name,key){const f=first(name);const x=Object.values(ALL).find(y=>first(y.name)===f);return x&&x.conf?x.conf[key]:null}

/* ---------- banner pentru barmani: „Ești în echipă la…” ---------- */
function banner(){
  const B=document.getElementById("dispBanner");if(!B)return;if(F.isAdmin){B.innerHTML="";return}
  const L=mine().filter(x=>!x.d||x.d>=iso(new Date())),c=my().conf||{},todo=L.filter(x=>!c[x.key]);
  if(!todo.length){B.innerHTML="";return}
  B.innerHTML=`<div class="ev-alert disp-ban"><b>Ești în echipă ${todo.length===1?"la un eveniment":"la "+todo.length+" evenimente"}:</b>`+todo.map(x=>`<div class="disp-r"><span>${esc(x.e.name)}${x.d?" · "+esc(fday(x.d)):""}${x.e.time?" · ora "+esc(x.e.time):""}</span><span class="qr-la"><button class="btn primary" data-dc="da" data-k="${esc(x.key)}">Confirm</button><button class="btn" data-dc="nu" data-k="${esc(x.key)}">Nu pot</button></span></div>`).join("")+`</div>`;
}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-dc]");if(!b)return;const k=b.dataset.k,v=b.dataset.dc;
  const conf={...(my().conf||{}),[k]:v};ALL[F.UID]={...my(),conf};await save({conf:{[k]:v}});banner();render();toast(v==="da"?"Mulțumim! Paul vede că ai confirmat.":"Am anunțat că nu poți.")});

/* ---------- afișare ---------- */
/* calendar lună cu lună, de azi până la 31 decembrie 2027 */
const CAL_END=new Date(2027,11,31);let calM=null,admM=null;
const MONC=m=>MONL[m][0].toUpperCase()+MONL[m].slice(1);
function calHTML(){
  const today=new Date();today.setHours(0,0,0,0);const m0=new Date(today.getFullYear(),today.getMonth(),1);
  if(!calM||calM<m0)calM=new Date(m0);const mEnd=new Date(CAL_END.getFullYear(),CAL_END.getMonth(),1);if(calM>mEnd)calM=new Date(mEnd);
  const y=calM.getFullYear(),mo=calM.getMonth(),n=new Date(y,mo+1,0).getDate(),lead=(new Date(y,mo,1).getDay()+6)%7;
  const days=my().days||{},{D}=weekEvents(),evd=new Set(D?D.events.map(e=>evISO(e,D)).filter(Boolean):[]);
  let cOk=0,cNo=0;Object.entries(days).forEach(([k,v])=>{if(k.startsWith(`${y}-${String(mo+1).padStart(2,"0")}`)){if(v==="da")cOk++;else if(v==="nu")cNo++}});
  let h=`<div class="disp-cal"><div class="disp-nav"><button class="btn" data-dm="-1" ${calM<=m0?"disabled":""} aria-label="Luna anterioară">‹</button><b>${MONC(mo)} ${y}</b><button class="btn" data-dm="1" ${calM>=mEnd?"disabled":""} aria-label="Luna următoare">›</button></div>
  <p class="ev-file disp-sum">${cOk||cNo?`✓ ${cOk} ${cOk===1?"zi":"zile"} pot · ✕ ${cNo} nu pot`:"Nicio zi marcată în luna asta."}</p>
  <div class="disp-h">${["Lun","Mar","Mie","Joi","Vin","Sâm","Dum"].map(x=>`<span>${x}</span>`).join("")}</div><div class="disp-g">`;
  for(let i=0;i<lead;i++)h+=`<span></span>`;
  for(let dn=1;dn<=n;dn++){const d=new Date(y,mo,dn),k=iso(d),past=d<today,v=days[k];
    h+=`<button class="disp-d ${v==="da"?"ok":v==="nu"?"no":""} ${past?"past":""} ${evd.has(k)?"ev":""}" data-dd="${k}" ${past?"disabled":""} aria-label="${esc(fday(k))}: ${v==="da"?"pot":v==="nu"?"nu pot":"nemarcat"}"><b>${dn}</b><i>${v==="da"?"✓":v==="nu"?"✕":""}</i></button>`}
  return h+`</div><div class="qr-la disp-quick"><button class="btn" data-dq="we">✓ Toate weekendurile lunii</button><button class="btn" data-dq="clr">Golește luna</button></div>
  <p class="ev-file">Atinge o zi: o dată = <b>✓ pot</b>, a doua oară = <b>✕ nu pot</b>, a treia oară o golești. Cu ‹ › mergi lună cu lună, până în decembrie 2027. Paul vede zilele tale când face echipa.</p></div>`}
async function saveDays(days){ALL[F.UID]={...my(),days};render();
  await F.fs.doc(`${F.base}/disp/${F.UID}`).set({name:F.NAME||"",days,conf:my().conf||{},at:new Date().toISOString()}).catch(()=>toast("Nu am putut salva."))}
function render(){
  if(!started)return;
  let h=`<div class="st-top"><div><p class="ev-sub">${F.isAdmin?"Echipa":"Salut, "+esc(F.NAME||"")+"!"}</p><p class="ev-file">${F.isAdmin?"Cine poate lucra și cine a confirmat evenimentele.":"Evenimentele la care ești în echipă și zilele în care poți lucra."}</p></div>`;
  if(F.isAdmin)h+=`<div class="st-acts"><button class="btn${view==="mine"?"":" primary"}" data-dv="team">Echipa</button><button class="btn${view==="mine"?" primary":""}" data-dv="mine">Zilele mele</button></div>`;
  h+=`</div>`;
  if(F.isAdmin&&view==="team")h+=teamHTML();
  else{const L=mine().filter(x=>!x.d||x.d>=iso(new Date()));h+=`<h2 class="ev-h2">Evenimentele mele</h2>`;
    if(!L.length)h+=`<div class="ev-ok">Nu ești în echipă la evenimentele din săptămâna încărcată.</div>`;
    else{const c=my().conf||{};h+=`<div class="ev-list">`+L.map(x=>`<div class="disp-r"><span><b>${esc(x.e.name)}</b><small>${x.d?esc(fday(x.d)):""}${x.e.time?" · ora "+esc(x.e.time):""}${x.e.persons?" · "+x.e.persons+" persoane":""} · echipa: ${esc((x.e.team||[]).join(", "))}</small></span><span class="qr-la">${c[x.key]==="da"?`<span class="ct-chip on">✓ confirmat</span>`:c[x.key]==="nu"?`<span class="ct-chip">✕ nu pot</span>`:""}<button class="btn${c[x.key]==="da"?"":" primary"}" data-dc="da" data-k="${esc(x.key)}">Confirm</button><button class="btn" data-dc="nu" data-k="${esc(x.key)}">Nu pot</button></span></div>`).join("")+`</div>`}
    h+=`<h2 class="ev-h2">Când pot lucra</h2>`+calHTML();}
  V.innerHTML=h;
}
function teamHTML(){
  const {D,ds}=weekEvents();let h="";
  if(D&&D.events.length){h+=`<h2 class="ev-h2">Echipa săptămânii · ${esc(D.title.big)}</h2><div class="ev-list">`;
    D.events.forEach(e=>{const key=`${ds}|${e.col}`,d=evISO(e,D),T=e.team||[];
      h+=`<div class="disp-r disp-ev"><span><b>${esc(e.name)}</b><small>${d?esc(fday(d)):""}${e.time?" · ora "+esc(e.time):""}</small></span><span class="disp-ppl">${T.length?T.map(n=>{const c=confOf(n,key),tel=TEL&&TEL[first(n)];
        const txt=`Salut, ${n}! Te-am pus în echipă la ${e.name}${d?", "+fday(d):""}${e.time?", ora "+e.time:""}. Confirmă în aplicație (tab-ul Echipa) sau răspunde-mi aici. Mulțumesc!`;
        return `<span class="disp-p ${c==="da"?"ok":c==="nu"?"no":""}">${esc(n)} ${c==="da"?"✓":c==="nu"?"✕":"·"}${tel?` <a href="https://wa.me/${telWa(tel)}?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener" title="Anunță pe WhatsApp">💬</a>`:""}</span>`}).join(""):`<small class="ev-file">fără echipă în fișă</small>`}</span></div>`});
    h+=`</div><p class="ev-file">✓ a confirmat în aplicație · ✕ nu poate · punct = încă nu a răspuns. 💬 trimite mesajul pe WhatsApp (telefoanele le pui la Raport → Tarife și telefoane). Barmanii văd evenimentele lor în aplicație, în tab-ul Echipa, imediat ce salvezi fișa.</p>`}
  const today=iso(new Date()),dates=new Set();Object.values(ALL).forEach(x=>Object.keys(x.days||{}).forEach(k=>{if(k>=today)dates.add(k)}));
  if(D)D.events.forEach(e=>{const d=evISO(e,D);if(d>=today)dates.add(d)});
  const t0=new Date();t0.setHours(0,0,0,0);const m0=new Date(t0.getFullYear(),t0.getMonth(),1),mEnd=new Date(CAL_END.getFullYear(),CAL_END.getMonth(),1);
  if(!admM||admM<m0)admM=new Date(m0);if(admM>mEnd)admM=new Date(mEnd);const pre=`${admM.getFullYear()}-${String(admM.getMonth()+1).padStart(2,"0")}`;
  h+=`<h2 class="ev-h2">Cine poate lucra</h2><div class="disp-nav"><button class="btn" data-am="-1" ${admM<=m0?"disabled":""} aria-label="Luna anterioară">‹</button><b>${MONC(admM.getMonth())} ${admM.getFullYear()}</b><button class="btn" data-am="1" ${admM>=mEnd?"disabled":""} aria-label="Luna următoare">›</button></div>`;
  const L=[...dates].filter(d=>d.startsWith(pre)).sort();
  if(!L.length)h+=`<div class="ev-ok">Nimeni nu și-a marcat zile în luna asta. Spune-le barmanilor să intre în aplicație, la tab-ul Echipa.</div>`;
  else h+=`<div class="rp-t">`+L.map(d=>{const a=availFor(d);return `<div class="disp-av"><span><b>${esc(fday(d))}</b></span><span>${a.ok.length?`<span class="disp-ok">✓ ${a.ok.map(esc).join(", ")}</span>`:""}${a.no.length?` <span class="disp-no">✕ ${a.no.map(esc).join(", ")}</span>`:""}${!a.ok.length&&!a.no.length?`<small class="ev-file">nimeni nu a marcat</small>`:""}</span></div>`}).join("")+`</div>`;
  const who=Object.values(ALL).map(x=>x.name).filter(Boolean).sort();
  if(who.length)h+=`<p class="ev-file">Și-au marcat zilele: ${who.map(esc).join(", ")}.</p>`;
  return h;
}
V.addEventListener("click",async e=>{
  const dv=e.target.closest("[data-dv]");if(dv){view=dv.dataset.dv;render();return}
  const am=e.target.closest("[data-am]");if(am&&!am.disabled){admM=new Date(admM.getFullYear(),admM.getMonth()+Number(am.dataset.am),1);render();return}
  const dm=e.target.closest("[data-dm]");if(dm&&!dm.disabled){calM=new Date(calM.getFullYear(),calM.getMonth()+Number(dm.dataset.dm),1);render();return}
  const dq=e.target.closest("[data-dq]");if(dq){const y=calM.getFullYear(),mo=calM.getMonth(),n=new Date(y,mo+1,0).getDate(),today=new Date();today.setHours(0,0,0,0);const days={...(my().days||{})};
    for(let dn=1;dn<=n;dn++){const d=new Date(y,mo,dn);if(d<today)continue;const k=iso(d);if(dq.dataset.dq==="clr")delete days[k];else if([0,5,6].includes(d.getDay())&&!days[k])days[k]="da"}
    await saveDays(days);toast(dq.dataset.dq==="clr"?"Am golit luna.":"Am marcat vinerea, sâmbăta și duminica.");return}
  const dd=e.target.closest("[data-dd]");if(dd&&!dd.disabled){const k=dd.dataset.dd,cur=(my().days||{})[k],nx=!cur?"da":cur==="da"?"nu":null;
    const days={...(my().days||{})};if(nx)days[k]=nx;else delete days[k];await saveDays(days);return}
});
function start(){if(!started){started=true;V.innerHTML=`<p class="ev-file">Se încarcă…</p>`;view=F.isAdmin?"team":"mine"}subscribe();
  if(F.isAdmin&&!TEL)F.fs.doc(`${F.base}/privat/echipa`).get().then(d=>{const t=d.exists&&d.data().tel||{};TEL={};Object.entries(t).forEach(([k,v])=>TEL[first(k)]=v);render()}).catch(()=>{TEL={}});
  render()}
document.querySelectorAll("nav.tabs button").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.view==="echipa")start()}));
if(store.get("tab","evenimente")==="echipa")start();
/* pornește în fundal ca să apară bannerul și disponibilitatea în fișă */
setTimeout(subscribe,1200);
window.__disp={availFor,banner};
document.addEventListener("cp-evd",banner);
})();
