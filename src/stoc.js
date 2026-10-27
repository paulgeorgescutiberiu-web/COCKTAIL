
/* ---------- Stoc depozit ---------- */
(function(){
const CP=window.__cp, F=window.CPFS;
const V=$("#v-stoc");
if(!V)return;
const {norm,KNOWN,CATS,QTY_CATS,parseAOA}=CP;
const num=n=>{const r=Math.round(n*100)/100;return String(r).replace(".",",")};
const pnum=s=>{s=String(s??"").trim().replace(",",".");if(s==="")return null;const n=Number(s);return isFinite(n)?n:NaN};
const K=label=>norm(label).replace(/[.\/\[\]*~`#$]/g," ").replace(/\s+/g," ").trim();
const today=()=>{const d=new Date(),p=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const fdate=s=>{if(!s)return"";const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[3]}.${m[2]}.${m[1]}`;const d=new Date(s);return isNaN(d)?"":`${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`};
const dsKey=f=>"d-"+String(f).replace(/[^A-Za-z0-9_\-.~:@+]/g,"-").slice(0,150);

let extraCat={}, docs={}, rets={}, retSubs={}, sub=null, mode="list", q="", open=null, confirmDel=null, busy=false, form=null;
const admin=()=>!!(F&&F.isAdmin);

/* ---------- Citire factură din poză (Gemini prin Firebase AI Logic) ---------- */
const AI_VER="12.19.0", AI_MODELS=["gemini-3.5-flash","gemini-3.5-flash-lite","gemini-3.1-flash-lite"];
let aiP=null, aliasMap=null;
const hashK=s=>{let h=5381;for(const c of s)h=((h<<5)+h+c.charCodeAt(0))>>>0;return "a"+h.toString(36)};
function aiReady(){return !!(F&&F.recaptcha)}
function loadAI(){
  if(!aiP)aiP=(async()=>{
    const u=m=>`https://www.gstatic.com/firebasejs/${AI_VER}/firebase-${m}.js`;
    const [appM,acM,aiM]=await Promise.all([import(u("app")),import(u("app-check")),import(u("ai"))]);
    const app=appM.initializeApp(F.cfg,"cp-ai");
    acM.initializeAppCheck(app,{provider:new acM.ReCaptchaEnterpriseProvider(F.recaptcha),isTokenAutoRefreshEnabled:true});
    return {aiM,ai:aiM.getAI(app,{backend:new aiM.GoogleAIBackend()})};
  })().catch(e=>{aiP=null;throw e});
  return aiP;
}
async function loadAliases(){
  if(aliasMap)return aliasMap;
  aliasMap={};
  try{const s=await F.fs.collection(`${F.base}/alias`).get();s.docs.forEach(d=>{const x=d.data();if(x&&x.text)aliasMap[x.text]=x})}catch(e){}
  return aliasMap;
}
function fileToPart(f){
  return new Promise((res,rej)=>{
    const fr=new FileReader();
    fr.onerror=()=>rej(new Error("read"));
    if(f.type==="application/pdf"){fr.onload=()=>res({inlineData:{data:String(fr.result).split(",")[1],mimeType:"application/pdf"}});fr.readAsDataURL(f);return}
    fr.onload=()=>{const img=new Image();img.onerror=()=>rej(new Error("img"));img.onload=()=>{
      const M=2200,s=Math.min(1,M/Math.max(img.width,img.height)),c=document.createElement("canvas");
      c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      res({inlineData:{data:c.toDataURL("image/jpeg",0.85).split(",")[1],mimeType:"image/jpeg"}})};img.src=fr.result};
    fr.readAsDataURL(f);
  });
}
function invoicePrompt(cat,al){
  const list=Object.entries(cat).map(([k,x])=>`${k} | ${x.label}`).join("\n");
  const ex=Object.values(al).slice(-150).map(a=>`"${a.text}" -> ${a.k} (x${a.f})`).join("\n");
  return `Ești asistentul unui catering de cocktailuri din România. Primești poza (sau PDF-ul) unei facturi de la un furnizor.
Citește TOATE rândurile de produse și răspunde DOAR cu JSON, exact în forma:
{"furnizor":"","nr":"","data":"AAAA-LL-ZZ","linii":[{"text":"","cantitate":0,"unitate":"","pret_unitar":null,"articol":null,"cantitate_stoc":null}]}

Reguli:
- "furnizor" = firma care emite factura (nu cumpărătorul Cocktail Philosophy). "nr" = numărul facturii, cu seria. "data" = data facturii.
- "text" = denumirea produsului exact cum apare pe factură. "cantitate" = cantitatea de pe factură, ca număr. "unitate" = unitatea de pe factură (BUC, BAX, CUT, KG, L etc.).
- "articol" = codul din LISTA DE STOC de mai jos care corespunde produsului, sau null dacă nu se potrivește niciunul. Mărcile se pun la articolul general (de ex. orice gin -> GIN, Coca-Cola 1L -> COLA 1 L), dacă nu există un cod mai precis.
- Stocul se ține în bucăți: sticle, cutii, saci, lăzi, ca în listă. "cantitate_stoc" = câte bucăți din articolul de stoc reprezintă rândul. Dacă factura e la bax/cutie și denumirea arată câte bucăți are (de ex. "6X1L", "BAX 12"), înmulțește. Dacă nu ești sigur de conversie, pune cantitatea de pe factură.
- Rândurile care nu sunt marfă (transport, garanție SGR, ambalaje, discount) au "articol": null.
- Nu inventa rânduri. Dacă un câmp nu se citește, pune "" sau null.

LISTA DE STOC (cod | denumire):
${list}
${ex?`\nPotriviri confirmate anterior de proprietar (text de pe factură -> cod, factor de conversie):\n${ex}`:""}`;
}
function parseJSON(t){
  t=String(t||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"");
  const i=t.indexOf("{"),j=t.lastIndexOf("}");if(i<0||j<i)throw new Error("json");
  return JSON.parse(t.slice(i,j+1));
}
function aiErr(e){
  const m=String(e&&(e.message||e.code)||e).replace(/https?:\/\/\S+/g," ");
  if(/billing|API has not been used|disabled|SERVICE_DISABLED|not enabled/i.test(m))return "Serviciul Gemini nu e activat în proiectul Firebase (AI Logic → Get started).";
  if(/app.?check|appcheck|recaptcha|403|permission/i.test(m))return "Google a refuzat cererea: protecția App Check nu e încă activă. Verifică pașii de configurare din Firebase.";
  if(/\b429\b|quota|exhausted|rate.?limit/i.test(m))return "S-a atins limita gratuită de citiri pentru moment. Încearcă peste câteva minute sau mâine.";
  if(/failed to fetch|network|import|load failed|dynamically imported/i.test(m))return "Nu m-am putut conecta la serviciul de citire. Verifică internetul și încearcă din nou.";
  if(/blocked|safety|SAFETY|recitation/i.test(m))return "Google a refuzat să descrie poza (filtrul lor de siguranță). Încearcă altă poză.";
  if(/json/i.test(m))return "Nu am înțeles răspunsul. Încearcă o poză mai clară, dreaptă și bine luminată.";
  return "Citirea facturii nu a reușit. Încearcă din nou sau completează manual.";
}
async function readInvoice(files){
  form.aiBusy=true;form.aiErr="";render();
  try{
    const [parts,{aiM,ai},al]=await Promise.all([Promise.all([...files].map(fileToPart)),loadAI(),loadAliases()]);
    const cat=catalog(),prompt=invoicePrompt(cat,al);
    let res,last;
    for(const m of AI_MODELS){
      try{const model=aiM.getGenerativeModel(ai,{model:m,generationConfig:{responseMimeType:"application/json",temperature:0}});
        res=await model.generateContent([prompt,...parts]);break}
      catch(e){last=e;if(!/not.?found|404|unsupported|is not available|invalid.*model/i.test(String(e&&e.message)))throw e}
    }
    if(!res)throw last;
    const j=parseJSON(res.response.text());
    const lines=(Array.isArray(j.linii)?j.linii:[]).filter(l=>l&&String(l.text||"").trim()).map(l=>{
      const text=String(l.text).trim(),q=Number(l.cantitate)||0,a=al[norm(text)];
      let k=l.articol&&cat[l.articol]?l.articol:null,qs=l.cantitate_stoc!=null&&isFinite(+l.cantitate_stoc)?+l.cantitate_stoc:q;
      if(a&&cat[a.k]){k=a.k;qs=Math.round(q*a.f*1000)/1000}
      return {text,q,u:String(l.unitate||""),p:l.pret_unitar,k,qs,learned:!!a};
    });
    if(!lines.length)throw new Error("json");
    if(j.furnizor&&!form.furnizor)form.furnizor=String(j.furnizor).trim();
    if(j.nr&&!form.nr)form.nr=String(j.nr).trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(j.data||""))form.data=j.data;
    form.ai={lines};
  }catch(e){form.aiErr=aiErr(e);console.warn("AI",e)}
  form.aiBusy=false;render();
  const r=V.querySelector(".st-rev,.st-ai");if(r)r.scrollIntoView({block:"start"});
}
function aiBlock(){
  if(mode!=="factura")return "";
  if(!aiReady())return `<div class="st-ai"><p class="ev-file">Citirea facturii din poză nu e încă pornită.</p></div>`;
  if(form.aiBusy)return `<div class="st-ai"><p class="ev-sub">Se citește factura…</p><p class="ev-file">Durează de obicei 10–30 de secunde.</p></div>`;
  if(form.ai){
    const cat=catalog(),opts=groups(()=>true);
    let h=`<div class="st-rev"><h2 class="ev-h2">Ce am citit de pe factură<span class="cnt">${form.ai.lines.length} rânduri</span></h2>
      <p class="ev-file">Verifică fiecare rând: articolul din stoc și câte bucăți intră. Aplicația ține minte alegerile tale pentru facturile următoare.</p><div class="ev-list">`;
    form.ai.lines.forEach((l,i)=>{
      h+=`<div class="st-rl${l.k?"":" off"}"><div class="st-rt"><b>${esc(l.text)}</b><small>${num(l.q)} ${esc(l.u)}${l.p!=null&&l.p!==""?` · preț ${esc(l.p)} lei`:""}${l.learned?" · potrivire ținută minte":""}</small></div>
        <select data-ai="${i}" aria-label="Articol din stoc"><option value="">Nu intră în stoc</option>${opts.map(g=>`<optgroup label="${esc(g.c.name)}">${g.rows.map(([k,x])=>`<option value="${esc(k)}"${l.k===k?" selected":""}>${esc(x.label)}</option>`).join("")}</optgroup>`).join("")}</select>
        <input class="ev-rin" inputmode="decimal" data-aiq="${i}" value="${l.qs!=null?esc(num(l.qs)):""}" aria-label="Bucăți în stoc"></div>`;
    });
    h+=`</div><div class="st-acts st-revb"><button class="btn primary" data-a="aiapply">Pune cantitățile în factură</button><button class="btn" data-a="aidrop">Renunță la citire</button></div></div>`;
    return h;
  }
  return `<div class="st-ai"><button class="btn primary" data-a="foto">Citește factura din poză</button>
    <input type="file" id="stFoto" accept="image/*,application/pdf" multiple hidden>
    <p class="ev-file">Fă o poză dreaptă, cu toată factura în cadru. Dacă are mai multe pagini, alege toate pozele odată.</p>
    ${form.aiErr?`<p class="ev-alert">${esc(form.aiErr)}</p>`:""}</div>`;
}
function grabAI(){
  if(!form||!form.ai)return;
  V.querySelectorAll("select[data-ai]").forEach(s=>{form.ai.lines[+s.dataset.ai].k=s.value||null});
  V.querySelectorAll("input[data-aiq]").forEach(i=>{const v=pnum(i.value);form.ai.lines[+i.dataset.aiq].qs=v==null||isNaN(v)?null:v});
}
async function applyAI(){
  grabAI();let n=0;const learn=[];
  form.ai.lines.forEach(l=>{
    if(!l.k||!(l.qs>0))return;
    form.items[l.k]=num((pnum(form.items[l.k])||0)+l.qs);n++;
    if(l.q>0)learn.push({text:norm(l.text),k:l.k,f:Math.round(l.qs/l.q*1000)/1000});
  });
  form.ai=null;render();
  toast(n?`Am pus ${n} ${n===1?"rând":"rânduri"} în factură. Verifică și apasă Salvează factura.`:"Niciun rând nu a fost pus în stoc.");
  for(const a of learn){aliasMap&&(aliasMap[a.text]=a);F.fs.doc(`${F.base}/alias/${hashK(a.text)}`).set({...a,at:new Date().toISOString()}).catch(()=>{})}
}

/* Articolele cunoscute: din lista fixă, din Excelul curent și din mișcările salvate */
function catalog(){
  const out={};
  Object.entries(KNOWN).forEach(([L,[label,cat]])=>{if(QTY_CATS.includes(cat))out[K(L)]={label,cat}});
  try{const D=parseAOA(CP.evd().aoa,CP.evd().fileName);D.items.forEach(it=>{if(QTY_CATS.includes(it.cat)){const k=K(it.excelLabel);out[k]=out[k]||{label:it.label,cat:it.cat}}})}catch(e){}
  Object.values(docs).forEach(d=>Object.keys(d.items||{}).forEach(k=>{if(!out[k])out[k]={label:(d.labels||{})[k]||k,cat:(d.cats||{})[k]||"altele"}}));
  Object.assign(out,extraCat);
  return out;
}
function retFor(d){
  const r=rets[d.ds]||{},m=d.map||{},out={};
  Object.values(r).forEach(x=>{Object.entries(x.items||{}).forEach(([ik,v])=>{const k=m[ik];if(k&&typeof v==="number")out[k]=(out[k]||0)+v});
    Object.entries(x.extra||{}).forEach(([ik,v])=>{const k=m[ik];if(k&&v&&typeof v.retur==="number")out[k]=(out[k]||0)+v.retur})});
  return out;
}
/* ce s-a luat în plus la evenimente (fără cantitate în fișă) iese și el din depozit */
function extraOut(d){
  const r=rets[d.ds]||{},m=d.map||{},out={};
  Object.values(r).forEach(x=>Object.entries(x.extra||{}).forEach(([ik,v])=>{const k=m[ik];if(k&&v&&typeof v.luat==="number")out[k]=(out[k]||0)+v.luat}));
  return out;
}
const isoToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
/* O ieșire e „planificată” până în ziua primului eveniment din săptămâna ei: marfa e rezervată, nu scoasă încă din depozit */
const isPlanned=d=>d.tip==="iesire"&&d.when&&d.when>isoToday();
function totals(skipDs){
  const t={};const g=k=>t[k]=t[k]||{in:0,out:0,ret:0,adj:0,plan:0};
  Object.values(docs).forEach(d=>{
    const it=d.items||{};
    if(d.tip==="factura")Object.entries(it).forEach(([k,v])=>g(k).in+=v);
    else if(d.tip==="corectie")Object.entries(it).forEach(([k,v])=>g(k).adj+=v);
    else if(d.tip==="iesire"){if(skipDs&&d.ds===skipDs)return;
      if(isPlanned(d))Object.entries(it).forEach(([k,v])=>g(k).plan+=v);
      else{Object.entries(it).forEach(([k,v])=>g(k).out+=v);Object.entries(extraOut(d)).forEach(([k,v])=>g(k).out+=v);Object.entries(retFor(d)).forEach(([k,v])=>g(k).ret+=v)}}
  });
  Object.values(t).forEach(x=>{x.stoc=x.in+x.adj-x.out+x.ret;x.disp=x.stoc-x.plan});
  return t;
}

/* Ieșirea din stoc pentru un Excel încărcat */
function iesireFrom(evd){
  const D=parseAOA(evd.aoa,evd.fileName),items={},map={},labels={},cats={};
  D.items.forEach(it=>{
    if(!QTY_CATS.includes(it.cat))return;
    const s=D.events.reduce((a,e)=>{const x=e.values[it.key];return a+(x&&typeof x.v==="number"&&x.v>0?x.v:0)},0);
    const k=K(it.excelLabel);map[it.key]=k;
    if(s>0){items[k]=(items[k]||0)+s;labels[k]=it.label;cats[k]=it.cat}
  });
  const ds2=D.events.map(e=>e.date).filter(Boolean).sort((a,b)=>a-b),w=ds2[0]||D.title.date;
  const when=w?`${w.getFullYear()}-${String(w.getMonth()+1).padStart(2,"0")}-${String(w.getDate()).padStart(2,"0")}`:"";
  return {tip:"iesire",file:evd.fileName,title:D.title.big,ds:dsKey(evd.fileName),items,map,labels,cats,when,by:F.NAME,at:new Date().toISOString()};
}
async function writeIesire(evd){
  if(!admin()||!evd||!evd.aoa)return false;
  const d=iesireFrom(evd);
  try{await F.fs.doc(`${F.base}/stoc/ies-${d.ds}`).set(d);return true}
  catch(e){toast("Nu am putut scădea marfa din stoc. Încearcă din nou din Stoc depozit.");return false}
}
window.__cpAI={loadAI,models:AI_MODELS,ready:aiReady,err:aiErr};
window.__stocAvail=(label,skipDs)=>{const t=totals(skipDs),x=t[K(label)];const any=Object.values(docs).some(d=>d.tip==="factura"||d.tip==="corectie");return any?{stoc:x?x.stoc:0,disp:x?x.disp:0}:null};
window.__stocDs=evd=>evd&&evd.fileName?dsKey(evd.fileName):"";
window.__stocIesire=async evd=>{if(await writeIesire(evd))toast(`Marfa pentru ${parseAOA(evd.aoa,evd.fileName).title.big} a fost scăzută din stoc.`)};

function subscribe(){
  if(sub||!F)return;
  sub=F.fs.collection(`${F.base}/stoc`).onSnapshot(snap=>{
    const next={};snap.docs.forEach(d=>next[d.id]=d.data());docs=next;loaded=true;
    Object.values(docs).filter(d=>d.tip==="iesire"&&d.ds&&!retSubs[d.ds]).forEach(d=>{
      retSubs[d.ds]=F.fs.collection(`${F.base}/retur/${d.ds}/events`).onSnapshot(s=>{
        const r={};s.docs.forEach(x=>{const y=x.data()||{};r[x.id]={items:y.items||{},extra:y.extra||{}}});rets[d.ds]=r;if(mode==="list")render();
      },()=>{});
    });
    if(mode==="list")render();
    document.dispatchEvent(new Event("cp-stoc"));
  },()=>{V.innerHTML=`<p class="notice">Stocul nu se poate încărca acum. Verifică internetul și reîncarcă pagina.</p>`});
}


/* ---------- Comandă la furnizor: ce lipsește din stoc (alcool și sucuri) ---------- */
const ORD_CATS=[{id:"alcool",sect:"alcool",name:"ALCOOL",color:"C00000"},{id:"soft",sect:"suc",name:"SUCURI / APE",color:"38761D"},{id:"altele",sect:"",name:"ALTELE",color:"7F6000"}];
let ord=null;
const ORD_LOC_DEF="Str. Tractorului 4, Sibiu";
const ordTomorrow=()=>{const d=new Date();d.setDate(d.getDate()+1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const ordDayTxt=v=>{const m=String(v||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return "";const d=new Date(+m[1],+m[2]-1,+m[3]);
  return `${["duminică","luni","marți","miercuri","joi","vineri","sâmbătă"][d.getDay()]}, ${m[3]}.${m[2]}.${m[1]}`};
async function buildOrder(){
  const P=await window.__cx.loadPrices(),t=totals(),cat=catalog(),lines=[];
  ORD_CATS.filter(C=>C.id!=="altele").forEach(C=>{
    Object.entries(cat).filter(([k,x])=>x.cat===C.id).forEach(([k,x])=>{
      const s=t[k]?t[k].disp:0;if(!(s<0))return;
      const row=(P.rows||[]).find(r=>r.k===k&&r.s===C.sect)||(P.rows||[]).find(r=>r.k===k);
      /* La furnizor se comandă în aceleași unități ca în Excel (sticle de 1 L). Conversia în 0,7 L e doar pentru consumația clientului. */
      const f=row?(Number(row.f)||1):1,need=-s,conv=f!==1;
      lines.push({cat:C.id,k,label:x.label,tip:row?row.tip:x.label,brand:row?row.brand:"",unit:conv||!row||!row.unit?"sticlă 1 L":row.unit,
        pret:row&&row.pret!=null?Math.round(Number(row.pret)*f*100)/100:null,est:conv,need,q:Math.ceil(need-1e-9)});
    });
  });
  lines.sort((a,b)=>a.cat===b.cat?a.label.localeCompare(b.label,"ro"):a.cat==="alcool"?-1:1);
  return {lines,furnizor:P.furnizor||"",livrare:ordTomorrow(),loc:store.get("ordloc",ORD_LOC_DEF),hasBase:Object.values(docs).some(d=>d.tip==="factura"||d.tip==="corectie")};
}
function viewOrder(){
  let h=`<div class="st-top"><div><p class="ev-sub">Comandă la furnizor</p><p class="ev-file">Alcool și sucuri care lipsesc din stoc după evenimentele încărcate. Cantitățile sunt în aceleași unități ca în Excel (alcoolul în sticle de 1 L), rotunjite în sus. Le poți modifica. </p></div>
    <div class="st-acts"><button class="btn" data-a="cancel">Înapoi</button></div></div>`;
  if(!ord)return h+`<p class="ev-file">Se calculează…</p>`;
  if(!ord.hasBase)h+=`<div class="ev-alert">Nu ai făcut încă Inventarul, așa că aplicația pornește de la stoc 0 și pune pe listă tot ce s-a încărcat la evenimente.</div>`;
  if(!ord.lines.length)h+=`<div class="ev-ok">Nu lipsește nimic la alcool și sucuri. Stocul acoperă evenimentele încărcate. Poți adăuga mai jos ce vrei să comanzi.</div>`;
  h+=`<div class="st-meta"><label>Ziua livrării<input id="ordDay" type="date" value="${esc(ord.livrare)}"></label><label>Locația livrării<input id="ordLoc" value="${esc(ord.loc)}"></label></div>`;
  ORD_CATS.forEach(C=>{const L=ord.lines.map((l,i)=>[l,i]).filter(([l])=>l.cat===C.id);if(!L.length)return;
    h+=`<h2 class="ev-h2">${esc(C.name)}</h2><div class="ev-list">`;
    L.forEach(([l,i])=>{
      h+=`<div class="st-in ord-row"><span><b>${esc(l.tip)}${l.brand?" "+esc(l.brand):""}</b><small>${l.manual?"adăugat de tine":`lipsesc ${num(l.need)} ${l.cat==="alcool"&&l.k!=="PROSECCO"?"sticle de 1 L":"buc. (ca în Excel)"}`}</small></span>
        <span class="ord-q"><input class="ev-rin" inputmode="decimal" data-oq="${i}" value="${esc(num(l.q))}" aria-label="Cantitate de comandat"><small>${esc(l.unit)}</small></span></div>`});
    h+=`</div>`});
  const opts=Object.values(catalog()).map(x=>x.label).sort((a,b)=>a.localeCompare(b,"ro"));
  h+=`<div class="ord-add"><input data-on="tip" list="ordList" placeholder="Adaugă în comandă, ex: Lime" aria-label="Produs"><datalist id="ordList">${opts.map(o=>`<option value="${esc(o)}">`).join("")}</datalist>
    <input data-on="q" inputmode="decimal" placeholder="cant." aria-label="Cantitate"><input data-on="unit" placeholder="unitate" aria-label="Unitate">
    <select data-on="cat" aria-label="Secțiune"><option value="alcool">Alcool</option><option value="soft">Sucuri / ape</option><option value="altele" selected>Altele</option></select>
    <button class="btn" data-a="ordadd">+ Adaugă</button></div>`;
  if(!ord.lines.length)return h;
  h+=`<div class="st-save"><button class="btn" data-a="ordcopy">Copiază pentru WhatsApp</button> <button class="btn primary" data-a="ordxl">Descarcă Excel</button></div>`;
  return h;
}
function grabOrder(){if(!ord)return;const d=V.querySelector("#ordDay"),lc=V.querySelector("#ordLoc");if(d)ord.livrare=d.value;if(lc){ord.loc=lc.value.trim();store.set("ordloc",ord.loc)}V.querySelectorAll("[data-oq]").forEach(i=>{const v=pnum(i.value);ord.lines[+i.dataset.oq].q=v==null||isNaN(v)?0:v})}
const ordDate=()=>{const d=new Date();return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`};
function orderText(){
  const L=ord.lines.filter(l=>l.q>0);
  return `Comandă Cocktail Philosophy, ${ordDate()}\n`+(ord.livrare?`Livrare: ${ordDayTxt(ord.livrare)}\n`:"")+(ord.loc?`Locație: ${ord.loc}\n`:"")+ORD_CATS.map(C=>{const x=L.filter(l=>l.cat===C.id);return x.length?`\n${C.name}\n`+x.map(l=>`- ${l.tip}${l.brand?" "+l.brand:""}: ${num(l.q)} × ${l.unit}`).join("\n"):""}).join("")+"\n\nMulțumesc!";
}
async function orderExcel(btn){
  const lbl=btn.textContent;btn.disabled=true;btn.textContent="Se pregătește…";
  try{
    const XL=await window.__cx.loadExcelJS(),wb=new XL.Workbook(),ws=wb.addWorksheet("Comandă");
    ws.columns=[{width:26},{width:22},{width:12},{width:18}];
    const dash={style:"hair",color:{argb:"FF999999"}},B={top:dash,bottom:dash,left:dash,right:dash},money="#,##0.00";
    ws.mergeCells("A1:D1");ws.getCell("A1").value=`Comandă${ord.furnizor?" "+ord.furnizor:""}`;ws.getCell("A1").font={bold:true,size:15};
    ws.mergeCells("A2:D2");ws.getCell("A2").value=`Cocktail Philosophy · ${ordDate()}`;ws.getCell("A2").font={color:{argb:"FF555555"}};
    ws.getCell("A3").value="Livrare:";ws.getCell("A3").font={bold:true};ws.mergeCells("B3:D3");ws.getCell("B3").value=ordDayTxt(ord.livrare);
    ws.getCell("A4").value="Locație:";ws.getCell("A4").font={bold:true};ws.mergeCells("B4:D4");ws.getCell("B4").value=ord.loc||"";
    const hr=ws.getRow(6);["Produs","Brand","Cantitate","Unitate"].forEach((t,i)=>{const c=hr.getCell(i+1);c.value=t;c.font={bold:true};c.border=B;c.alignment={horizontal:"center"}});
    let rn=7;
    ORD_CATS.forEach(C=>{const L=ord.lines.filter(l=>l.cat===C.id&&l.q>0);if(!L.length)return;
      ws.mergeCells(`A${rn}:D${rn}`);const sc=ws.getCell(`A${rn}`);sc.value=C.name;sc.font={bold:true,color:{argb:"FFFFFFFF"}};sc.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+C.color}};rn++;
      L.forEach(l=>{const r=ws.getRow(rn);r.getCell(1).value=l.tip;r.getCell(2).value=l.brand||"";r.getCell(3).value=l.q;r.getCell(4).value=l.unit;
        r.getCell(1).font={bold:true};for(let i=1;i<=4;i++)r.getCell(i).border=B;rn++});
    });
    const buf=await wb.xlsx.writeBuffer(),d=new Date();
    const url=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
    const a=document.createElement("a");a.href=url;a.download=`comanda_furnizor_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}.xlsx`;
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);toast("Excelul cu comanda e gata.");
  }catch(e){console.warn(e);toast("Nu am putut genera Excelul. Verifică internetul și încearcă din nou.")}
  btn.disabled=false;btn.textContent=lbl;
}

/* ---------- Afișare ---------- */
function groups(filterFn){
  const cat=catalog();
  return CATS.filter(c=>QTY_CATS.includes(c.id)).map(c=>({c,rows:Object.entries(cat).filter(([k,x])=>x.cat===c.id&&filterFn(k,x)).sort((a,b)=>a[1].label.localeCompare(b[1].label,"ro"))})).filter(g=>g.rows.length);
}
function viewList(){
  const t=totals(),cat=catalog(),qq=norm(q);
  const list=Object.values(docs).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const evd=CP.evd(),pend=evd&&evd.aoa&&!docs["ies-"+dsKey(evd.fileName)];
  const neg=Object.entries(t).filter(([k,x])=>x.stoc<0).length,short=Object.entries(t).filter(([k,x])=>x.stoc>=0&&x.disp<0).length,hasIn=Object.values(docs).some(d=>d.tip==="factura"||d.tip==="corectie");
  let h=`<div class="st-top"><div><p class="ev-sub">${list.length?`${Object.keys(t).length} articole urmărite`:"Stocul e gol"}</p>
    <p class="ev-file">Marfa pentru un eveniment e rezervată când faci fișa și iese din depozit în ziua evenimentului. Returul notat de barmani se adaugă înapoi.</p></div>
    ${admin()?`<div class="st-acts"><button class="btn primary" data-a="factura">Adaugă factură</button><button class="btn" data-a="inventar">Inventar</button><button class="btn" data-a="comanda">Comandă furnizor</button></div>`:""}</div>`;
  if(!list.length)h+=`<div class="ev-ok">${admin()?"Începe cu <b>Inventar</b>: numără ce ai acum în depozit și scrie cantitățile. Apoi adaugi facturile pe măsură ce vin.":"Paul nu a introdus încă stocul."}</div>`;
  if(pend&&admin())h+=`<div class="ev-alert st-pend">Excelul curent, <b>${esc(evd.fileName)}</b>, nu e scăzut din stoc. <button class="btn" data-a="scade">Scade acum</button></div>`;
  if(neg)h+=`<div class="ev-alert">${neg} ${neg===1?"articol are":"articole au"} stoc sub zero. ${hasIn?"Probabil lipsește o factură.":"Încă nu ai introdus stocul din depozit."} Fă un <b>Inventar</b> cu ce ai acum pe raft: aplicația pornește de la cifrele reale și minusurile dispar.</div>`;
  if(short)h+=`<div class="ev-alert">${short} ${short===1?"articol nu ajunge":"articole nu ajung"} pentru evenimentele planificate. Le găsești la <b>Comandă furnizor</b>.</div>`;
  if(list.length){
    h+=`<input class="search st-q" type="search" placeholder="Caută articol" value="${esc(q)}" aria-label="Caută articol">`;
    groups((k,x)=>!qq||norm(x.label).includes(qq)).forEach(g=>{
      h+=`<h2 class="ev-h2">${esc(g.c.name)}</h2><div class="ev-list">`;
      g.rows.forEach(([k,x])=>{
        const s=t[k]||{in:0,out:0,ret:0,adj:0,plan:0,stoc:0,disp:0},cls=s.stoc<0?"neg":s.disp<0?"neg":s.stoc===0?"zero":"";
        h+=`<button class="st-row" data-k="${esc(k)}" aria-expanded="${open===k}"><span>${esc(x.label)}${s.plan?`<small class="st-res">rezervat ${num(s.plan)} → rămân ${num(s.disp)}</small>`:""}</span><b class="st-n ${cls}">${num(s.stoc)}</b></button>`;
        if(open===k){
          h+=`<div class="st-det"><span>Intrat din facturi <b>${num(s.in)}</b></span><span>Încărcat la evenimente <b>−${num(s.out)}</b></span><span>Retur <b>+${num(s.ret)}</b></span>${s.adj?`<span>Corecții inventar <b>${s.adj>0?"+":""}${num(s.adj)}</b></span>`:""}${s.plan?`<span>Rezervat pentru evenimente viitoare <b>${num(s.plan)}</b></span>`:""}</div>`;
        }
      });
      h+=`</div>`;
    });
    h+=`<h2 class="ev-h2">Istoric<span class="cnt">${list.length}</span></h2><div class="ev-list">`;
    list.forEach(d=>{
      const id=Object.keys(docs).find(i=>docs[i]===d),n=Object.keys(d.items||{}).length;
      const title=d.tip==="factura"?`Factură${d.furnizor?" "+esc(d.furnizor):""}${d.nr?" nr. "+esc(d.nr):""}`:d.tip==="iesire"?`Evenimente ${esc(d.title||d.file)}`:`Inventar${d.note?": "+esc(d.note):""}`;
      const when=d.tip==="factura"?fdate(d.data):fdate(d.at);
      const tag=d.tip==="factura"?"Intrare":d.tip==="iesire"?"Ieșire":"Corecție";
      h+=`<div class="st-hist"><span class="st-tag ${d.tip}">${tag}</span><div><b>${title}</b><br><small>${when} · ${n} ${n===1?"articol":"articole"}${d.by?" · "+esc(d.by):""}</small></div>
        ${admin()?`<button class="btn st-del" data-del="${esc(id)}">${confirmDel===id?"Sigur? Șterge":"Șterge"}</button>`:""}</div>`;
    });
    h+=`</div>`;
  }
  return h;
}
function viewForm(){
  const cat=catalog(),t=totals(),inv=mode==="inventar";
  let h=`<div class="st-top"><div><p class="ev-sub">${inv?"Inventar":"Factură nouă"}</p><p class="ev-file">${inv?"Scrie doar ce ai numărat. Articolele lăsate goale rămân neschimbate.":"Scrie cantitățile în aceleași unități ca în Excel (sticle, baxuri, saci)."}</p></div>
    <div class="st-acts"><button class="btn" data-a="cancel">Renunță</button></div></div>`;
  h+=aiBlock();
  if(!inv)h+=`<div class="st-meta"><label>Furnizor<input id="stF" list="stFL" value="${esc(form.furnizor||"")}" autocomplete="off"></label>
    <label>Nr. factură<input id="stN" value="${esc(form.nr||"")}"></label><label>Data<input id="stD" type="date" value="${esc(form.data||today())}"></label>
    <datalist id="stFL">${[...new Set(Object.values(docs).map(d=>d.furnizor).filter(Boolean))].map(f=>`<option value="${esc(f)}">`).join("")}</datalist></div>`;
  else h+=`<div class="st-meta"><label>Notă (opțional)<input id="stNote" value="${esc(form.note||"")}" placeholder="de ex. Inventar lunar"></label></div>`;
  groups(()=>true).forEach(g=>{
    h+=`<h2 class="ev-h2">${esc(g.c.name)}</h2><div class="ev-list">`;
    g.rows.forEach(([k,x])=>{const s=t[k]?t[k].stoc:0;
      h+=`<label class="st-in"><span>${esc(x.label)}${inv?`<small>în aplicație: ${num(s)}</small>`:""}</span><input class="ev-rin" inputmode="decimal" data-k="${esc(k)}" value="${esc(form.items[k]??"")}" placeholder="${inv?num(s):"0"}"></label>`});
    h+=`</div>`;
  });
  h+=`<h2 class="ev-h2">Articol nou</h2><div class="st-meta st-new"><label>Nume<input id="stNewN" placeholder="de ex. Tequila 1 L"></label>
    <label>Categorie<select id="stNewC">${CATS.filter(c=>QTY_CATS.includes(c.id)).map(c=>`<option value="${c.id}"${c.id==="alcool"?" selected":""}>${esc(c.name)}</option>`).join("")}</select></label>
    <label>Cantitate<input id="stNewQ" inputmode="decimal"></label><button class="btn" data-a="addnew">Adaugă în listă</button></div>
    <p class="ev-alert" id="stErr" hidden></p>
    <div class="st-save"><button class="btn primary" data-a="save">${inv?"Salvează inventarul":"Salvează factura"}</button></div>`;
  return h;
}
function render(){
  const y=window.scrollY,a=document.activeElement,fq=a&&a.classList&&a.classList.contains("st-q");
  V.innerHTML=mode==="list"?viewList():mode==="comanda"?viewOrder():viewForm();
  if(fq){const i=V.querySelector(".st-q");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}}
  window.scrollTo(0,y);
}
function grab(){
  if(mode==="list")return;
  if(mode==="comanda"){grabOrder();return}
  grabAI();
  V.querySelectorAll("input[data-k]").forEach(i=>{if(i.value.trim()!=="")form.items[i.dataset.k]=i.value;else delete form.items[i.dataset.k]});
  const v=id=>{const e=V.querySelector(id);return e?e.value.trim():""};
  if(mode==="factura"){form.furnizor=v("#stF");form.nr=v("#stN");form.data=v("#stD")}else form.note=v("#stNote");
}
const err=m=>{const e=$("#stErr");e.textContent=m;e.hidden=!m;if(m)e.scrollIntoView({block:"center"})};

V.addEventListener("input",e=>{if(e.target.classList.contains("st-q")){q=e.target.value;render()}});
V.addEventListener("click",async e=>{
  const row=e.target.closest(".st-row");if(row){open=open===row.dataset.k?null:row.dataset.k;render();return}
  const del=e.target.closest("[data-del]");
  if(del){const id=del.dataset.del;if(confirmDel!==id){confirmDel=id;render();setTimeout(()=>{if(confirmDel===id){confirmDel=null;if(mode==="list")render()}},4000);return}
    confirmDel=null;try{await F.fs.doc(`${F.base}/stoc/${id}`).delete();toast("Mișcarea a fost ștearsă din stoc.")}catch(x){toast("Nu am putut șterge. Încearcă din nou.")}return}
  const b=e.target.closest("[data-a]");if(!b||busy)return;
  const act=b.dataset.a;
  if(act==="factura"||act==="inventar"){mode=act;form={items:{},extra:{}};render();window.scrollTo(0,V.offsetTop-10);return}
  if(act==="foto"){const i=$("#stFoto");if(i){i.onchange=()=>{const fs=i.files;if(fs&&fs.length){grab();readInvoice(fs)}};i.click()}return}
  if(act==="aiapply"){grab();await applyAI();return}
  if(act==="aidrop"){grab();form.ai=null;render();return}
  if(act==="comanda"){mode="comanda";ord=null;render();window.scrollTo(0,V.offsetTop-10);
    buildOrder().then(x=>{ord=x;if(mode==="comanda")render()}).catch(e=>{console.warn(e);toast("Nu am putut calcula comanda. Verifică internetul.")});return}
  if(act==="ordadd"){grabOrder();const g=n=>{const i=V.querySelector(`[data-on=${n}]`);return i?i.value.trim():""};const t=g("tip");if(!t){toast("Scrie produsul.");return}
    const q=pnum(g("q"));ord.lines.push({cat:g("cat")||"altele",k:K(t),label:t,tip:t,brand:"",unit:g("unit")||"buc",pret:null,need:0,q:q==null||isNaN(q)?1:q,manual:true});render();return}
  if(act==="ordcopy"){grabOrder();const txt=orderText();
    try{await navigator.clipboard.writeText(txt);toast("Comanda e copiată. Lipește-o în WhatsApp la furnizor.")}
    catch(x){window.open("https://wa.me/?text="+encodeURIComponent(txt),"_blank")}return}
  if(act==="ordxl"){grabOrder();await orderExcel(b);return}
  if(act==="cancel"){ord=null;mode="list";form=null;extraCat={};render();return}
  if(act==="scade"){busy=true;b.disabled=true;await window.__stocIesire(CP.evd());busy=false;return}
  if(act==="addnew"){
    grab();const n=$("#stNewN").value.trim(),c=$("#stNewC").value,qv=$("#stNewQ").value.trim();
    if(!n){err("Scrie numele articolului nou.");return}
    const k=K(n);if(!k){err("Numele nu e valid.");return}
    form.extra[k]={label:n.charAt(0).toUpperCase()+n.slice(1),cat:c};
    extraCat[k]=form.extra[k];
    if(qv)form.items[k]=qv;render();return;
  }
  if(act==="save"){
    grab();const cat=catalog(),t=totals(),items={},labels={},cats={};
    for(const [k,raw] of Object.entries(form.items)){
      const v=pnum(raw);if(v===null)continue;
      if(isNaN(v)||v<0){err(`La ${cat[k]?cat[k].label:k} cantitatea „${raw}” nu e un număr valid.`);return}
      const val=mode==="inventar"?v-(t[k]?t[k].stoc:0):v;
      if(mode==="factura"&&val===0)continue;
      if(mode==="inventar"&&Math.abs(val)<1e-9)continue;
      items[k]=Math.round(val*1000)/1000;labels[k]=(cat[k]||{}).label||k;cats[k]=(cat[k]||{}).cat||"altele";
    }
    if(!Object.keys(items).length){err(mode==="inventar"?"Nu ai schimbat nicio cantitate față de stocul din aplicație.":"Scrie cel puțin o cantitate.");return}
    const doc=mode==="factura"?{tip:"factura",furnizor:form.furnizor,nr:form.nr,data:form.data||today()}:{tip:"corectie",note:form.note};
    Object.assign(doc,{items,labels,cats,by:F.NAME,at:new Date().toISOString()});
    busy=true;b.disabled=true;b.textContent="Se salvează…";
    try{await F.fs.collection(`${F.base}/stoc`).add(doc);mode="list";form=null;render();
      toast(doc.tip==="factura"?`Factura a fost adăugată în stoc (${Object.keys(items).length} articole).`:"Inventarul a fost salvat.")}
    catch(x){err(x&&x.code==="permission-denied"?"Doar administratorul poate modifica stocul. Intră ca administrator, jos în pagină.":"Salvarea nu a reușit. Verifică internetul și încearcă din nou.");b.disabled=false;b.textContent=mode==="inventar"?"Salvează inventarul":"Salvează factura"}
    busy=false;
  }
});

let started=false;
let loaded=false;
function start(){if(started)return;started=true;if(loaded){render();return}V.innerHTML=`<p class="ev-file">Se încarcă stocul…</p>`;subscribe()}
document.querySelectorAll("nav.tabs button").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.view==="stoc")start()}));
if(store.get("tab","retete")==="stoc")start();
window.__stocRefresh=()=>{if(started&&mode==="list")render()};
if(F&&F.isAdmin)setTimeout(subscribe,1500);
})();
