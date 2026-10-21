/* ---------- Raport lunar + echipa (barmani și plata lor) — doar administratorul ---------- */
(function(){
const V=document.getElementById("v-raport"),F=window.CPFS;
if(!V||!F)return;
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const MON=["ianuarie","februarie","martie","aprilie","mai","iunie","iulie","august","septembrie","octombrie","noiembrie","decembrie"];
const nrm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/\s+/g," ").trim();
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const lei=v=>Math.round(v||0).toLocaleString("ro-RO")+" lei";
const num=v=>(Math.round((v||0)*10)/10).toLocaleString("ro-RO");
const pct=v=>Math.round((v||0)*100)+"%";
const nr=v=>{const n=parseFloat(String(v??"").replace(/\s/g,"").replace(",","."));return isFinite(n)?n:0};
const tcase=s=>String(s||"").toLocaleLowerCase("ro-RO").replace(/(^|[\s-])(\S)/g,(m,a,b)=>a+b.toLocaleUpperCase("ro-RO"));
const telWa=t=>{let d=String(t||"").replace(/\D/g,"");if(d.startsWith("00"))d=d.slice(2);if(d.startsWith("0"))d="4"+d;return d};
const toast=m=>{const t=document.getElementById("toast");if(!t)return;t.textContent=m;t.classList.add("show");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),3500)};

let month=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`})();
let EQ=null,WEEKS=null,CT=[],LEADS=[],loading=false,openB=null,editT=false,msg="";
const dsKey=f=>"d-"+String(f).replace(/[^A-Za-z0-9_\-.~:@+]/g,"-").slice(0,150);

/* toate săptămânile: cea curentă + arhiva */
async function loadWeeks(){
  const out=[],seen=new Set(),cp=window.__cp;
  const add=evd=>{if(!evd||!evd.aoa||seen.has(evd.fileName))return;seen.add(evd.fileName);try{out.push({evd,D:cp.parseAOA(evd.aoa,evd.fileName),ds:dsKey(evd.fileName)})}catch(e){}};
  add(cp&&cp.evd());
  try{const L=window.__arh?await window.__arh.list():[];for(const x of L){try{add(await window.__arh.get(x.k))}catch(e){}}}catch(e){}
  return out;
}
async function load(force){
  if(loading)return;loading=true;render();
  try{
    const [eq,ct,ld,wk]=await Promise.all([
      F.fs.doc(`${F.base}/privat/echipa`).get().then(d=>d.exists?d.data():{}).catch(()=>({})),
      F.fs.collection(`${F.base}/contracte`).get().then(s=>s.docs.map(d=>({...d.data(),id:d.id}))).catch(()=>[]),
      F.fs.collection("barLead").get().then(s=>s.docs.map(d=>({...d.data(),id:d.id}))).catch(()=>[]),
      (!WEEKS||force)?loadWeeks():Promise.resolve(WEEKS)]);
    EQ={rates:{},tel:{},def:"",pay:{},paid:{},...eq};CT=ct;LEADS=ld;WEEKS=wk;
  }finally{loading=false;render()}
}
const saveEQ=part=>F.fs.doc(`${F.base}/privat/echipa`).set(part,{merge:true}).catch(()=>toast("Nu am putut salva. Verifică internetul."));

/* evenimentele lunii, din toate fișele */
function monthEvents(){
  const out=[];(WEEKS||[]).forEach(w=>w.D.events.forEach(e=>{const d=e.date||w.D.title.date;if(!d||iso(d).slice(0,7)!==month)return;out.push({w,e,d:iso(d)})}));
  return out.sort((a,b)=>a.d.localeCompare(b.d)||String(a.e.time||"").localeCompare(String(b.e.time||"")));
}
const payKey=(x,n)=>`${x.w.ds}|${x.e.col}|${nrm(n)}`;
function rateOf(n){const r=EQ.rates[nrm(n)];return r!=null&&r!==""?nr(r):nr(EQ.def)}
function amountOf(x,n){const k=payKey(x,n),v=EQ.pay[k];return v!=null&&v!==""?nr(v):rateOf(n)}
function team(){
  const T={};monthEvents().forEach(x=>(x.e.team||[]).forEach(n=>{const k=nrm(n);if(!k||k==="PAUL")return;const t=T[k]=T[k]||{n:tcase(n),k,ev:[],sum:0};const a=amountOf(x,n);t.ev.push({x,a});t.sum+=a}));
  return Object.values(T).sort((a,b)=>b.sum-a.sum||a.n.localeCompare(b.n,"ro"));
}

/* ---------- afișare ---------- */
function monthLabel(m){const [y,mm]=m.split("-");return `${MON[+mm-1]} ${y}`}
function shift(m,d){const [y,mm]=m.split("-").map(Number),t=new Date(y,mm-1+d,1);return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}`}
function render(){
  if(!F.isAdmin){V.innerHTML=`<div class="ev-ok">Raportul îl vede doar administratorul.</div>`;return}
  let h=`<div class="st-top"><div><p class="ev-sub">Raport · ${esc(monthLabel(month))}</p><p class="ev-file">Din fișele evenimentelor (inclusiv săptămânile anterioare), contracte, rentabilitate și cereri.</p></div>
    <div class="st-acts"><button class="btn" data-rp="prev" aria-label="Luna anterioară">←</button><button class="btn" data-rp="next" aria-label="Luna următoare">→</button><button class="btn" data-rp="reload">Actualizează</button></div></div>`;
  if(!EQ){V.innerHTML=h+`<p class="ev-file">Se încarcă…</p>`;return}
  const ME=monthEvents(),pers=ME.reduce((a,x)=>a+(typeof x.e.persons==="number"?x.e.persons:0),0);
  const MC=CT.filter(c=>String(c.dataEv||"").slice(0,7)===month),R=MC.filter(c=>c.rent&&c.rent.calc);
  const ven=R.reduce((a,c)=>a+(c.rent.calc.venit||0),0),prof=R.reduce((a,c)=>a+(c.rent.calc.profit||0),0),baut=R.reduce((a,c)=>a+(c.rent.calc.bautura||0),0);
  const invR=R.reduce((a,c)=>a+nr(c.rent.invitati||c.invitati),0);
  const T=team(),payTot=T.reduce((a,t)=>a+t.sum,0);
  const ML=LEADS.filter(x=>String(x.at||"").slice(0,7)===month),won=ML.filter(x=>x.st==="ct").length;
  const kp=(v,l,s)=>`<div class="rp-k"><b>${v}</b><span>${l}</span>${s?`<small>${s}</small>`:""}</div>`;
  h+=`<div class="rp-kpi">${kp(ME.length,"evenimente",`${num(pers)} persoane`)}${kp(MC.length,"contracte în lună","")}
    ${kp(R.length?lei(ven):"—","venit",R.length?`din ${R.length} cu rentabilitate calculată`:"calculează rentabilitatea la contracte")}
    ${kp(R.length?lei(prof):"—","profit",R.length&&ven?`marjă ${pct(prof/ven)}`:"")}
    ${kp(invR&&baut?lei(baut/invR):"—","consum / persoană",invR&&baut?"băutura, din rentabilitate":"")}
    ${kp(lei(payTot),"plată barmani",`${T.length} ${T.length===1?"om":"oameni"}`)}
    ${kp(ML.length,"cereri de ofertă",ML.length?`${won} câștigate (${pct(won/ML.length)})`:"")}</div>`;
  if(MC.length&&R.length<MC.length)h+=`<p class="ev-file">${MC.length-R.length} ${MC.length-R.length===1?"contract nu are":"contracte nu au"} rentabilitatea calculată, deci venitul și profitul sunt parțiale. Le completezi la Contracte → Rentabilitate, după eveniment.</p>`;
  /* locații */
  const loc={};ME.forEach(x=>{const k=x.e.name;loc[k]=loc[k]||{n:k,ev:0,p:0};loc[k].ev++;loc[k].p+=typeof x.e.persons==="number"?x.e.persons:0});
  const LL=Object.values(loc).sort((a,b)=>b.ev-a.ev||b.p-a.p);
  if(LL.length)h+=`<h2 class="ev-h2">Locații</h2><div class="rp-t">`+LL.slice(0,10).map(l=>`<div class="rp-r"><span>${esc(l.n)}</span><span>${l.ev} ${l.ev===1?"eveniment":"evenimente"}</span><span>${num(l.p)} pers.</span></div>`).join("")+`</div>`;
  /* barmani */
  h+=`<h2 class="ev-h2">Barmani · plata pe ${esc(MON[+month.split("-")[1]-1])}</h2>`;
  h+=`<p class="ev-file">Suma pe eveniment vine din tariful fiecărui om (sau tariful general). O poți schimba la orice eveniment. Numele se iau din rândul „Echipa” al fișei.</p>`;
  if(editT||!nr(EQ.def)&&!Object.keys(EQ.rates).length){
    const names=[...new Set([...T.map(t=>t.n),...Object.keys(EQ.rates).map(tcase)])].sort((a,b)=>a.localeCompare(b,"ro"));
    h+=`<div class="rp-ed"><label>Tarif general pe eveniment (lei)<input data-rt="__def" inputmode="decimal" value="${esc(EQ.def||"")}" placeholder="ex: 250"></label>`+
      names.map(n=>`<label>${esc(n)}<span class="rp-two"><input data-rt="${esc(nrm(n))}" inputmode="decimal" value="${esc(EQ.rates[nrm(n)]??"")}" placeholder="tarif general"><input data-tel="${esc(nrm(n))}" inputmode="tel" value="${esc(EQ.tel[nrm(n)]||"")}" placeholder="telefon"></span></label>`).join("")+
      `<div class="st-acts"><button class="btn primary" data-rp="saverates">Salvează tarifele</button>${editT?`<button class="btn" data-rp="canceltar">Renunță</button>`:""}</div></div>`;
  }else h+=`<p><button class="btn" data-rp="tarife">Tarife și telefoane</button></p>`;
  if(!T.length)h+=`<div class="ev-ok">Nicio echipă trecută în fișele din luna asta.</div>`;
  else{h+=`<div class="ev-list">`;T.forEach(t=>{const pk=`${month}|${t.k}`,paid=!!EQ.paid[pk];
    h+=`<div class="rp-b"><button class="st-row" data-rb="${esc(t.k)}" aria-expanded="${openB===t.k}"><span>${esc(t.n)}<small class="st-res">${t.ev.length} ${t.ev.length===1?"eveniment":"evenimente"}${paid?" · ✓ plătit":""}</small></span><b class="st-n">${lei(t.sum)}</b></button>`;
    if(openB===t.k){h+=`<div class="rp-evs">`+t.ev.map(({x,a})=>`<label class="rp-ev"><span>${esc(x.d.split("-").reverse().slice(0,2).join("."))} · ${esc(x.e.name)}</span><input data-pay="${esc(payKey(x,t.n))}" inputmode="decimal" value="${esc(String(a))}"><small>lei</small></label>`).join("")+
      `<div class="st-acts"><button class="btn primary" data-rp="savepay" data-k="${esc(t.k)}">Salvează sumele</button><button class="btn" data-rp="paid" data-k="${esc(t.k)}">${paid?"Marchează neplătit":"✓ Marchează plătit"}</button>${EQ.tel[t.k]?`<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${telWa(EQ.tel[t.k])}?text=${encodeURIComponent(payTxt(t))}">Trimite pe WhatsApp</a>`:`<small class="ev-file">Pune telefonul la „Tarife și telefoane” ca să-i trimiți decontul pe WhatsApp.</small>`}</div></div>`}
    h+=`</div>`});h+=`</div><p class="ev-sub" style="text-align:right">Total barmani: ${lei(payTot)}</p>`}
  if(msg)h+=`<p class="ev-ok">${esc(msg)}</p>`;
  V.innerHTML=h;
}
function payTxt(t){return `Salut, ${t.n.split(" ")[0]}! Decontul pe ${monthLabel(month)}:\n`+t.ev.map(({x,a})=>`- ${x.d.split("-").reverse().slice(0,2).join(".")} ${x.e.name}: ${Math.round(a)} lei`).join("\n")+`\nTotal: ${Math.round(t.sum)} lei\nMulțumesc!`}

V.addEventListener("click",async e=>{
  const t=e.target,b=t.closest("[data-rp]"),rb=t.closest("[data-rb]");
  if(rb){openB=openB===rb.dataset.rb?null:rb.dataset.rb;render();return}
  if(!b)return;const a=b.dataset.rp;
  if(a==="prev"||a==="next"){month=shift(month,a==="prev"?-1:1);openB=null;msg="";render();return}
  if(a==="reload"){msg="";load(true);return}
  if(a==="tarife"){editT=true;render();return}
  if(a==="canceltar"){editT=false;render();return}
  if(a==="saverates"){const rates={},tel={};let def=EQ.def;
    V.querySelectorAll("[data-rt]").forEach(i=>{const v=i.value.trim();if(i.dataset.rt==="__def")def=v;else if(v)rates[i.dataset.rt]=v});
    V.querySelectorAll("[data-tel]").forEach(i=>{const v=i.value.trim();if(v)tel[i.dataset.tel]=v});
    EQ.def=def;EQ.rates=rates;EQ.tel={...EQ.tel,...tel};editT=false;await F.fs.doc(`${F.base}/privat/echipa`).set({...EQ}).catch(()=>toast("Nu am putut salva."));msg="Tarifele sunt salvate.";render();return}
  if(a==="savepay"){const up={};V.querySelectorAll("[data-pay]").forEach(i=>{up[i.dataset.pay]=i.value.trim()});EQ.pay={...EQ.pay,...up};await saveEQ({pay:up});msg="Sumele sunt salvate.";render();return}
  if(a==="paid"){const pk=`${month}|${b.dataset.k}`,v=!EQ.paid[pk];EQ.paid[pk]=v;await saveEQ({paid:{[pk]:v}});render();return}
});
let started=false;
function start(){if(started){render();return}started=true;load()}
document.querySelectorAll("nav.tabs button").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.view==="raport")start()}));
if(store.get("tab","evenimente")==="raport")start();
window.__rap={team:()=>EQ?team():[]};
})();
