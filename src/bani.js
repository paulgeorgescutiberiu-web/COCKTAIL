/* ---------- Bani: încasări și cheltuieli, raport și analiză (doar administratorul) ---------- */
(function(){
const V=document.getElementById("v-bani"),F=window.CPFS;
if(!V||!F)return;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const MON=["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const ym=d=>iso(d).slice(0,7);
const nr=v=>{const n=parseFloat(String(v??"").replace(/\s/g,"").replace(",","."));return isFinite(n)?n:0};
const fm=(v,c)=>`${(Math.round((v||0)*100)/100).toLocaleString("ro-RO",{maximumFractionDigits:2})} ${c==="EUR"?"€":"lei"}`;
const mLabel=k=>{const [y,m]=k.split("-");return `${MON[+m-1]} ${y}`};
const fday=s=>{const [y,m,d]=String(s).split("-");return d?`${+d} ${MON[+m-1].slice(0,3)}`:""};
const tcase=s=>String(s||"").toLocaleLowerCase("ro-RO").replace(/(^|[\s-])(\S)/g,(m,a,b)=>a+b.toLocaleUpperCase("ro-RO"));
const toast=m=>{const t=document.getElementById("toast");if(!t)return;t.textContent=m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),3500)};
const CAT={in:["Avans eveniment","Rest eveniment","Bar / servicii","Vânzare marfă","Altele"],
  out:["Marfă și alcool","Fructe, gheață","Consumabile","Barmani","Transport și combustibil","Chirie","Echipamente","Marketing","Taxe și impozite","Contabilitate","Utilități și telefon","Altele"]};
const FIRME=["Bar Philosophy SRL","Fresh Philosophy"],MET=["numerar","card","transfer"];
/* datele: un document pe lună, privat/bani-AAAA-LL {items:{id:{...}}} */
const ref=k=>F.fs.doc(`${F.base}/privat/bani-${k}`);
let month=ym(new Date()),M={},CFG=null,form=null,view="luna",delArm=null,msg="",CT=null,loadingYear=false;
async function loadMonth(k){if(M[k])return M[k];try{const d=await ref(k).get();M[k]=d.exists?(d.data().items||{}):{}}catch(e){M[k]={};msg="Nu am putut citi datele. Verifică regulile Firestore (privat) și internetul."}return M[k]}
async function loadCfg(){if(CFG)return;try{const d=await F.fs.doc(`${F.base}/privat/bani`).get();CFG=d.exists?d.data():{}}catch(e){CFG={}}CFG.curs=CFG.curs||"";CFG.firma=CFG.firma||FIRME[0]}
async function loadCT(){if(CT)return;try{const s=await F.fs.collection(`${F.base}/contracte`).get();CT=s.docs.map(d=>({...d.data(),id:d.id}))}catch(e){CT=[]}}
const shift=(k,n)=>{const [y,m]=k.split("-").map(Number);const d=new Date(y,m-1+n,1);return ym(d)};
const list=k=>Object.entries(M[k]||{}).filter(([id,x])=>x&&x.tip&&x.suma).map(([id,x])=>({...x,id})).sort((a,b)=>String(b.data).localeCompare(String(a.data))||String(b.at).localeCompare(String(a.at)));
const curs=()=>nr(CFG&&CFG.curs);
const inLei=x=>x.moneda==="EUR"?(curs()?x.suma*curs():null):x.suma;
function sums(L){const o={in:{RON:0,EUR:0},out:{RON:0,EUR:0}};L.forEach(x=>{o[x.tip][x.moneda==="EUR"?"EUR":"RON"]+=nr(x.suma)});return o}
const both=(o,t)=>[o[t].RON?fm(o[t].RON,"RON"):"",o[t].EUR?fm(o[t].EUR,"EUR"):""].filter(Boolean).join(" + ")||"0 lei";
function leiTot(L,t){let s=0,miss=0;L.filter(x=>x.tip===t).forEach(x=>{const v=inLei(x);if(v==null)miss++;else s+=v});return {s,miss}}

/* ---------- formular ---------- */
function newForm(tip,pre){form={tip,suma:"",moneda:"RON",cat:CAT[tip][0],data:iso(new Date()),firma:CFG.firma,met:"numerar",nota:"",id:null,ref:"",...(pre||{})}}
function formHTML(){const f=form,isIn=f.tip==="in";
  return `<div class="bn-form ${isIn?"in":"out"}"><div class="bn-fh"><b>${f.id?"Modifică":isIn?"+ Încasare":"− Cheltuială"}</b><button class="btn" data-bn="cancel">Renunță</button></div>
  <div class="bn-sum"><input data-bf="suma" inputmode="decimal" placeholder="0" value="${esc(f.suma)}" aria-label="Suma"><div class="bn-cur">${["RON","EUR"].map(c=>`<button class="en-day${f.moneda===c?" on":""}" data-bn="cur" data-v="${c}">${c==="EUR"?"€":"lei"}</button>`).join("")}</div></div>
  <div class="bn-l">Categorie</div><div class="en-days">${CAT[f.tip].map(c=>`<button class="en-day${f.cat===c?" on":""}" data-bn="cat" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>
  <div class="bn-g"><label>Data<input type="date" data-bf="data" value="${esc(f.data)}"></label>
  <label>Plătit<select data-bf="met">${MET.map(m=>`<option${f.met===m?" selected":""}>${m}</option>`).join("")}</select></label>
  <label>Firma<select data-bf="firma">${FIRME.map(m=>`<option${f.firma===m?" selected":""}>${esc(m)}</option>`).join("")}</select></label></div>
  <label class="bn-n">Notă (opțional)<input data-bf="nota" value="${esc(f.nota)}" placeholder="${isIn?"ex: Avans nunta Popescu, 14 iunie":"ex: Metro — lămâi, gheață"}"></label>
  <div class="st-acts"><button class="btn primary" data-bn="save">${f.id?"Salvează":"Adaugă"}</button></div></div>`}
function grab(){if(!form)return;V.querySelectorAll("[data-bf]").forEach(i=>form[i.dataset.bf]=i.value.trim())}
async function saveForm(){grab();const f=form,s=nr(f.suma);if(!(s>0)){toast("Scrie suma.");return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(f.data)){toast("Alege data.");return}
  const k=f.data.slice(0,7),id=f.id||("b"+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  const x={tip:f.tip,suma:Math.round(s*100)/100,moneda:f.moneda,cat:f.cat,data:f.data,firma:f.firma,met:f.met,nota:f.nota.slice(0,200),ref:f.ref||"",at:new Date().toISOString()};
  try{
    if(f.id&&f.oldK&&f.oldK!==k){await ref(f.oldK).set({items:{[f.id]:firebase.firestore.FieldValue?firebase.firestore.FieldValue.delete():null}},{merge:true});if(M[f.oldK])delete M[f.oldK][f.id]}
    await ref(k).set({items:{[id]:x}},{merge:true});(M[k]=M[k]||{})[id]=x;
    if(f.firma!==CFG.firma){CFG.firma=f.firma;F.fs.doc(`${F.base}/privat/bani`).set({firma:f.firma},{merge:true}).catch(()=>{})}
    toast(f.tip==="in"?"Încasarea e notată.":"Cheltuiala e notată.");form=null;month=k;render()}
  catch(e){toast("Nu am putut salva. Verifică internetul.")}}
async function del(k,id){try{const FV=firebase.firestore.FieldValue;await ref(k).set({items:{[id]:FV?FV.delete():null}},{merge:true});delete M[k][id];toast("Șters.")}catch(e){toast("Nu am putut șterge.")}render()}

/* ---------- sugestii din contracte: avansuri și resturi bifate ca încasate, dar nenotate aici ---------- */
function sugg(){
  if(!CT)return [];const have=new Set();Object.values(M).forEach(L=>Object.values(L||{}).forEach(x=>{if(x&&x.ref)have.add(x.ref)}));
  const out=[];CT.forEach(c=>{const who=tcase(String(c.nume||"").split(" ")[0]);
    if(c.avansPlatit&&nr(c.avans)>0&&!have.has(c.id+"|avans"))out.push({ref:c.id+"|avans",tip:"in",cat:"Avans eveniment",suma:String(nr(c.avansSuma||c.avans)),moneda:c.avansMoneda||(c.monedaAvans==="EURO"?"EUR":"RON"),data:c.avansPlatitLa||c.dataContract||iso(new Date()),met:c.avansMet||(c.avansCard?"card":"numerar"),nota:`Avans ${who}${c.locatie?" · "+tcase(c.locatie):""}${c.dataEv?" · "+fday(c.dataEv):""}`});
    if(c.restPlatit&&!have.has(c.id+"|rest")){const tot=String(c.unitate||"").includes("PERSOAN")?nr(c.pret)*nr(c.invitati):nr(c.pret),cur=c.moneda==="EURO"?"EUR":"RON",av=(c.monedaAvans==="EURO"?"EUR":"RON")===cur?nr(c.avans):0;
      out.push({ref:c.id+"|rest",tip:"in",cat:"Rest eveniment",suma:tot>av?String(Math.round((tot-av)*100)/100):"",moneda:cur,data:c.dataRest||c.dataEv||iso(new Date()),met:/numerar/.test(c.plata||"")?"numerar":"transfer",nota:`Rest ${who}${c.locatie?" · "+tcase(c.locatie):""}${c.dataEv?" · "+fday(c.dataEv):""}`})}});
  return out.sort((a,b)=>String(b.data).localeCompare(String(a.data))).slice(0,12)}

/* ---------- afișare ---------- */
function bars(rows,max,cls){return rows.map(([n,v,lab])=>`<div class="bn-bar ${cls}"><span>${esc(n)}</span><i style="--w:${max?Math.max(2,Math.round(v/max*100)):0}%"></i><b>${esc(lab)}</b></div>`).join("")}
function monthHTML(){
  const L=list(month),S=sums(L),I=leiTot(L,"in"),O=leiTot(L,"out"),prof=I.s-O.s,miss=I.miss+O.miss;
  let h=`<div class="bn-nav"><button class="btn" data-bn="m" data-d="-1" aria-label="Luna anterioară">‹</button><b>${esc(mLabel(month))}</b><button class="btn" data-bn="m" data-d="1" aria-label="Luna următoare">›</button></div>
  <div class="rp-kpi"><div class="rp-k bn-in"><span>Încasat</span><b>${esc(both(S,"in"))}</b></div><div class="rp-k bn-out"><span>Cheltuit</span><b>${esc(both(S,"out"))}</b></div>
  <div class="rp-k ${prof>=0?"bn-in":"bn-out"}"><span>Rămas</span><b>${esc(fm(prof,"RON"))}</b><small>${miss?`fără ${miss} sume în euro: pune cursul jos`:S.in.EUR||S.out.EUR?`euro socotit la ${curs()} lei`:"încasat minus cheltuit"}</small></div></div>`;
  const cats=t=>{const m={};L.filter(x=>x.tip===t).forEach(x=>{const v=inLei(x);if(v!=null)m[x.cat]=(m[x.cat]||0)+v});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  const co=cats("out"),ci=cats("in");
  if(co.length){h+=`<h2 class="ev-h2">Pe ce s-au dus banii</h2><div class="bn-bars">${bars(co.map(([n,v])=>[n,v,fm(v,"RON")]),co[0][1],"out")}</div>`}
  if(ci.length>1){h+=`<h2 class="ev-h2">De unde au venit</h2><div class="bn-bars">${bars(ci.map(([n,v])=>[n,v,fm(v,"RON")]),ci[0][1],"in")}</div>`}
  const SG=sugg().filter(s=>s.data.slice(0,7)<=month);
  if(SG.length)h+=`<h2 class="ev-h2">Din contracte, încă nenotate</h2><p class="ev-file">Avansuri și resturi bifate ca încasate la Contracte. Atinge ca să le adaugi; verifici suma înainte.</p><div class="ev-list">${SG.map((s,i)=>`<div class="bn-row"><div><b>${esc(s.nota)}</b><small>${esc(fday(s.data))} · ${s.suma?esc(fm(nr(s.suma),s.moneda)):"sumă de completat"}</small></div><button class="btn" data-bn="sg" data-i="${i}">+ Adaugă</button></div>`).join("")}</div>`;
  h+=`<h2 class="ev-h2">Toate în ${esc(MON[+month.slice(5)-1])} <span class="cnt">${L.length}</span></h2>`;
  h+=L.length?`<div class="ev-list">${L.map(x=>`<div class="bn-row ${x.tip}"><div><b>${x.tip==="in"?"+":"−"} ${esc(fm(x.suma,x.moneda))}</b> <span class="bn-cat">${esc(x.cat)}</span><small>${esc(fday(x.data))} · ${esc(x.met||"")}${x.nota?" · "+esc(x.nota):""}${x.firma&&x.firma!==FIRME[0]?" · "+esc(x.firma):""}</small></div><span class="bn-act"><button class="ev-link" data-bn="ed" data-id="${esc(x.id)}">Modifică</button><button class="ev-link" data-bn="del" data-id="${esc(x.id)}">${delArm===x.id?"Sigur?":"Șterge"}</button></span></div>`).join("")}</div>`
    :`<div class="ev-ok">Nimic notat luna asta. Apasă „+ Încasare” sau „− Cheltuială”.</div>`;
  return h}
async function yearHTML(){
  const keys=[];for(let i=11;i>=0;i--)keys.push(shift(month,-i));
  await Promise.all(keys.map(loadMonth));
  const R=keys.map(k=>{const L=list(k);return {k,i:leiTot(L,"in").s,o:leiTot(L,"out").s,n:L.length}}),mx=Math.max(1,...R.map(r=>Math.max(r.i,r.o)));
  const T={i:R.reduce((s,r)=>s+r.i,0),o:R.reduce((s,r)=>s+r.o,0)},all=keys.flatMap(list);
  const cat={};all.filter(x=>x.tip==="out").forEach(x=>{const v=inLei(x);if(v!=null)cat[x.cat]=(cat[x.cat]||0)+v});const co=Object.entries(cat).sort((a,b)=>b[1]-a[1]);
  const act=R.filter(r=>r.n),best=act.slice().sort((a,b)=>(b.i-b.o)-(a.i-a.o))[0],worst=act.slice().sort((a,b)=>(a.i-a.o)-(b.i-b.o))[0];
  const cur=R[R.length-1],prev=R[R.length-2];
  /* analiza, în cuvinte */
  const A=[];
  if(!all.length)A.push("Încă nu ai date. După câteva săptămâni de notat încasări și cheltuieli, aici apare analiza.");
  else{
    A.push(`În ultimele 12 luni ai încasat ${fm(T.i,"RON")} și ai cheltuit ${fm(T.o,"RON")}: rămân ${fm(T.i-T.o,"RON")}${T.i?` (${Math.round((T.i-T.o)/T.i*100)}% din încasări)`:""}.`);
    if(co.length)A.push(`Cea mai mare cheltuială e „${co[0][0]}”: ${fm(co[0][1],"RON")}, adică ${T.o?Math.round(co[0][1]/T.o*100):0}% din tot ce ai cheltuit${co[1]?`; urmează „${co[1][0]}” (${T.o?Math.round(co[1][1]/T.o*100):0}%)`:""}.`);
    if(best&&best.n)A.push(`Cea mai bună lună: ${mLabel(best.k)}, cu ${fm(best.i-best.o,"RON")} rămași.`);
    if(worst&&worst!==best&&worst.i-worst.o<0)A.push(`În ${mLabel(worst.k)} ai cheltuit mai mult decât ai încasat (${fm(worst.i-worst.o,"RON")}).`);
    if(prev&&(prev.i||prev.o)&&(cur.i||cur.o)){const d=(cur.i-cur.o)-(prev.i-prev.o);A.push(`Față de luna trecută, rămâi cu ${fm(Math.abs(d),"RON")} ${d>=0?"mai mult":"mai puțin"}.`)}
    const mk=cat["Marfă și alcool"]||0;if(T.i&&mk)A.push(`Marfa și alcoolul înseamnă ${Math.round(mk/T.i*100)}% din încasări${mk/T.i>0.4?", destul de mult: merită verificat la ce evenimente consumul a ieșit peste ce ai socotit în ofertă":""}.`);
    const miss=all.filter(x=>inLei(x)==null).length;if(miss)A.push(`${miss} sume în euro nu sunt incluse, pentru că nu e pus cursul (jos).`);
  }
  let h=`<div class="bn-nav"><button class="btn" data-bn="m" data-d="-12" aria-label="Anul anterior">‹</button><b>${esc(mLabel(keys[0]))} – ${esc(mLabel(month))}</b><button class="btn" data-bn="m" data-d="12" aria-label="Anul următor">›</button></div>
  <div class="rp-kpi"><div class="rp-k bn-in"><span>Încasat</span><b>${esc(fm(T.i,"RON"))}</b></div><div class="rp-k bn-out"><span>Cheltuit</span><b>${esc(fm(T.o,"RON"))}</b></div><div class="rp-k ${T.i-T.o>=0?"bn-in":"bn-out"}"><span>Rămas</span><b>${esc(fm(T.i-T.o,"RON"))}</b></div></div>
  <h2 class="ev-h2">Analiză</h2><div class="bn-an">${A.map(t=>`<p>${esc(t)}</p>`).join("")}</div>
  <h2 class="ev-h2">Lună cu lună</h2><div class="bn-ch">${R.map(r=>`<div class="bn-col" title="${esc(mLabel(r.k))}"><div class="bn-cb"><i class="in" style="height:${Math.round(r.i/mx*100)}%"></i><i class="out" style="height:${Math.round(r.o/mx*100)}%"></i></div><small>${esc(MON[+r.k.slice(5)-1].slice(0,3))}</small></div>`).join("")}</div>
  <p class="ev-file"><span class="bn-dot in"></span> încasat <span class="bn-dot out"></span> cheltuit</p>`;
  if(co.length)h+=`<h2 class="ev-h2">Cheltuieli pe categorii</h2><div class="bn-bars">${bars(co.map(([n,v])=>[n,v,fm(v,"RON")+(T.o?` · ${Math.round(v/T.o*100)}%`:"")]),co[0][1],"out")}</div>`;
  h+=`<div class="st-acts" style="margin-top:14px"><button class="btn" data-bn="xls">Descarcă Excel (12 luni)</button></div>
  <p class="ev-file">Excelul îl poți da contabilului sau mi-l trimiți mie pentru o analiză mai detaliată.</p>`;
  return h}
async function render(){
  if(!started)return;
  await loadCfg();await loadMonth(month);
  let h=`<div class="st-top"><div><p class="ev-sub">Bani</p><p class="ev-file">Încasări și cheltuieli, notate repede. Le vezi doar tu.</p></div>
    <div class="st-acts"><button class="btn bn-bin" data-bn="new" data-t="in">+ Încasare</button><button class="btn bn-bout" data-bn="new" data-t="out">− Cheltuială</button></div></div>`;
  if(form)h+=formHTML();
  h+=`<div class="ev-seg" role="tablist"><button role="tab" data-bn="v" data-v="luna" aria-selected="${view==="luna"}">Luna</button><button role="tab" data-bn="v" data-v="an" aria-selected="${view==="an"}">Raport și analiză</button></div>`;
  if(msg)h+=`<p class="ev-alert">${esc(msg)}</p>`;
  h+=view==="an"?await yearHTML():monthHTML();
  h+=`<details class="bn-set"><summary>Setări</summary><label>Cursul euro (lei pentru 1 €), ca sumele în euro să intre în totaluri<input data-bc="curs" inputmode="decimal" value="${esc(CFG.curs)}" placeholder="ex: 5,09"></label><button class="btn" data-bn="curs">Salvează cursul</button></details>`;
  const y=window.scrollY;V.innerHTML=h;window.scrollTo(0,y);
  if(form){const i=V.querySelector("[data-bf=suma]");if(i&&!i.value)i.focus()}
}
async function xls(){
  try{const keys=[];for(let i=11;i>=0;i--)keys.push(shift(month,-i));await Promise.all(keys.map(loadMonth));
    const rows=keys.flatMap(list).sort((a,b)=>String(a.data).localeCompare(String(b.data))).map(x=>({Data:x.data,Tip:x.tip==="in"?"Încasare":"Cheltuială",Categorie:x.cat,Suma:x.suma,Moneda:x.moneda,"Suma în lei":inLei(x)??"",Plata:x.met,Firma:x.firma,Nota:x.nota}));
    if(!window.XLSX){toast("Excelul nu e disponibil acum.");return}
    const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Încasări și cheltuieli");
    XLSX.writeFile(wb,`Bani Cocktail Philosophy ${keys[0]} - ${month}.xlsx`)}catch(e){toast("Nu am putut face Excelul.")}}
V.addEventListener("click",async e=>{const b=e.target.closest("[data-bn]");if(!b)return;const a=b.dataset.bn;
  if(a!=="save")grab();
  if(a==="new"){newForm(b.dataset.t);render();V.scrollIntoView({block:"start"});return}
  if(a==="cancel"){form=null;render();return}
  if(a==="cur"){form.moneda=b.dataset.v;render();return}
  if(a==="cat"){form.cat=b.dataset.v;render();return}
  if(a==="save"){saveForm();return}
  if(a==="m"){month=shift(month,+b.dataset.d);delArm=null;render();return}
  if(a==="v"){view=b.dataset.v;render();return}
  if(a==="sg"){const s=sugg().filter(x=>x.data.slice(0,7)<=month)[+b.dataset.i];if(s){newForm("in",s);render();V.scrollIntoView({block:"start"})}return}
  if(a==="ed"){const x=(M[month]||{})[b.dataset.id];if(x){form={...x,suma:String(x.suma),id:b.dataset.id,oldK:month};render();V.scrollIntoView({block:"start"})}return}
  if(a==="del"){const id=b.dataset.id;if(delArm!==id){delArm=id;render();setTimeout(()=>{if(delArm===id){delArm=null;render()}},3500);return}delArm=null;del(month,id);return}
  if(a==="curs"){const v=(V.querySelector("[data-bc=curs]")||{}).value||"";CFG.curs=v.trim();await F.fs.doc(`${F.base}/privat/bani`).set({curs:CFG.curs},{merge:true}).catch(()=>toast("Nu am putut salva."));toast("Cursul e salvat.");render();return}
  if(a==="xls"){xls();return}
});
V.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.closest("[data-bf]")){e.preventDefault();saveForm()}});
let started=false;
function start(){if(!F.isAdmin){V.innerHTML=`<p class="ev-file">Doar administratorul vede secțiunea Bani.</p>`;return}if(!started){started=true;V.innerHTML=`<p class="ev-file">Se încarcă…</p>`;loadCT().then(()=>{if(view==="luna")render()})}render()}
document.querySelectorAll("nav.tabs button").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.view==="bani")start()}));
if(store.get("tab","evenimente")==="bani")start();
/* pentru asistenta vocală: „am încasat 500 de lei avans de la…”, „am dat 300 de lei pe gheață” */
window.__bani={async add(x){await loadCfg();const d=x.data&&/^\d{4}-\d{2}-\d{2}$/.test(x.data)?x.data:iso(new Date()),k=d.slice(0,7),id="b"+Date.now().toString(36);
  const it={tip:x.tip==="out"?"out":"in",suma:Math.round(nr(x.suma)*100)/100,moneda:x.moneda==="EUR"?"EUR":"RON",cat:CAT[x.tip==="out"?"out":"in"].includes(x.cat)?x.cat:"Altele",data:d,firma:x.firma||CFG.firma,met:MET.includes(x.met)?x.met:"numerar",nota:String(x.nota||"").slice(0,200),ref:"",at:new Date().toISOString()};
  if(!(it.suma>0))throw new Error("suma");await ref(k).set({items:{[id]:it}},{merge:true});(M[k]=M[k]||{})[id]=it;if(started)render();return it},
  async month(k){k=k||ym(new Date());await loadCfg();await loadMonth(k);const L=list(k),S=sums(L);return {luna:mLabel(k),incasat:both(S,"in"),cheltuit:both(S,"out"),rămas_lei:Math.round(leiTot(L,"in").s-leiTot(L,"out").s),numar:L.length}},CAT};
})();
