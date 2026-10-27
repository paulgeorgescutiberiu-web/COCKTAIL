# Contoare pe bife, text „Încarcă alt Excel” doar pentru admin, starea sincronizării bifelor și a returului.
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:90]); h=h.replace(a,b)

# 1. contoarele din secțiunile de încărcare numără bifele, nu valorile din Excel
rep('''    const gf=g.rows.filter(r=>!r.blank).length;
    h+=`<h2 class="ev-h2">${g.name} <span class="cnt">${gf?gf+" completate din "+g.rows.length:"nimic completat"}</span></h2><div class="ev-list">`;''',
'''    const gf=g.rows.filter(r=>isChecked(e.id,r.k)).length,gn=g.rows.length;
    h+=`<h2 class="ev-h2">${g.name} <span class="cnt ${gf===gn?"all":""}">${gf===gn?"toate bifate ✓":gf?gf+" din "+gn+" bifate":"nimic bifat din "+gn}</span></h2><div class="ev-list">`;''')

# 2. instrucțiunea „Încarcă alt Excel” doar pentru administrator
rep('''  h+=`<p class="ev-help">Pentru alt weekend apasă „Încarcă alt Excel”.''','''  h+=`<p class="ev-help ro-only">Evenimentele pentru alt weekend le încarcă Paul. Ce vezi aici se actualizează singur când apare săptămâna nouă.</p>`;
  h+=`<p class="ev-help edit-only">Pentru alt weekend apasă „Încarcă alt Excel”.''')
rep('body.readonly .edit-only{display:none!important}','body.readonly .edit-only{display:none!important}\nbody:not(.readonly) .ro-only{display:none!important}')

# 3. sincronizare: scrierile în așteptare se țin minte până confirmă serverul
rep('''function queueWrite(ev,fn){
  queues[ev]=(queues[ev]||Promise.resolve()).then(async()=>{
    try{await fn()}catch(e){''','''/* Ce s-a modificat pe acest telefon și serverul încă n-a confirmat.
   Se aplică peste ce vine de la server, ca bifele să nu „dispară” cât timp așteaptă. */
let SY={ops:{},seq:0,n:0,shown:false,okT:0};
function syOp(key,op){op.seq=++SY.seq;(SY.ops[key]=SY.ops[key]||[]).push(op);SY.n++;syncUI();return op}
function syDone(key,op){const L=SY.ops[key];if(!L)return;const i=L.indexOf(op);if(i<0)return;L.splice(i,1);if(!L.length)delete SY.ops[key];SY.n--;syncUI()}
function syOverlayChecks(next){Object.keys(SY.ops).forEach(k=>{if(k.startsWith("r:"))return;SY.ops[k].forEach(o=>{if(o.t==="reset")next[k]={};else{next[k]=next[k]||{};if(o.val)next[k][o.it]=o.val;else delete next[k][o.it]}})})}
function syOverlayRet(next){Object.keys(SY.ops).forEach(k=>{if(!k.startsWith("r:"))return;const ev=k.slice(2);SY.ops[k].forEach(o=>{const r=next[ev]=next[ev]||{items:{}};r.items=r.items||{};if(o.t==="ret")r.items[o.k]=o.v;else if(o.t==="note")r.note=o.txt})})}
function syncUI(){
  let b=document.getElementById("syncBar");
  if(!b){b=document.createElement("div");b.id="syncBar";b.setAttribute("role","status");b.setAttribute("aria-live","polite");document.body.appendChild(b)}
  const off=navigator.onLine===false,n=SY.n;
  clearTimeout(SY.wait);
  if(off){b.className="sy-off";b.innerHTML=`<b>Fără conexiune.</b> ${n?`${n} ${n===1?"modificare așteaptă":"modificări așteaptă"} să fie trimise. `:""}Se trimit singure când revine internetul. Nu închide și nu reîncărca aplicația până atunci.`;SY.shown=true;return}
  if(n){
    if(SY.shown){b.className="sy-wait";b.innerHTML=`${n} ${n===1?"modificare așteaptă":"modificări așteaptă"} confirmarea serverului…`;return}
    SY.wait=setTimeout(()=>{SY.shown=true;syncUI()},2000);return}
  if(SY.shown){SY.shown=false;b.className="sy-ok";b.textContent="Sincronizat ✓ Bifele au ajuns la echipă.";clearTimeout(SY.okT);SY.okT=setTimeout(()=>{if(!SY.n&&navigator.onLine!==false)b.className=""},2500);return}
  if(b.className!=="sy-ok")b.className="";
}
window.addEventListener("online",syncUI);window.addEventListener("offline",syncUI);
window.addEventListener("beforeunload",e=>{if(SY.n){e.preventDefault();e.returnValue=""}});
function queueWrite(ev,fn,op){
  if(op)syOp(ev,op);
  queues[ev]=(queues[ev]||Promise.resolve()).then(async()=>{
    try{await fn();if(op)syDone(ev,op)}catch(e){''')
rep('''      else toast("Bifa nu s-a salvat. Încearcă din nou.");
      subscribe();''','''      else toast("Bifa nu s-a salvat. Încearcă din nou.");
      if(op)syDone(ev,op);
      subscribe();''')
rep('''    else{const body={};Object.entries(shared[ev]).forEach(([k,x])=>{if(x)body[k]=x});await ref.set({items:body});sharedDocs.add(ev)}
  });''','''    else{const body={};Object.entries(shared[ev]).forEach(([k,x])=>{if(x)body[k]=x});await ref.set({items:body});sharedDocs.add(ev)}
  },{t:"set",it,val});''')
rep('''  queueWrite(ev,async()=>{await colRef().doc(ev).set({items:{}});sharedDocs.add(ev)});''','''  queueWrite(ev,async()=>{await colRef().doc(ev).set({items:{}});sharedDocs.add(ev)},{t:"reset"});''')
rep('''    shared=next;sharedDocs=docs;rerender();resolveNames();''','''    syOverlayChecks(next);shared=next;sharedDocs=docs;rerender();resolveNames();''')
rep('''    else{const items={};Object.entries(r.items).forEach(([a,b])=>{if(typeof b==="number")items[a]=b});await ref.set({items,note:r.note||"",by:meta.by,at:meta.at});returnDocs.add(ev)}});''','''    else{const items={};Object.entries(r.items).forEach(([a,b])=>{if(typeof b==="number")items[a]=b});await ref.set({items,note:r.note||"",by:meta.by,at:meta.at});returnDocs.add(ev)}},{t:"ret",k,v});''')
rep('''    else{const items={};Object.entries(r.items||{}).forEach(([a,b])=>{if(typeof b==="number")items[a]=b});await ref.set({items,note:txt,by:meta.by,at:meta.at});returnDocs.add(ev)}});''','''    else{const items={};Object.entries(r.items||{}).forEach(([a,b])=>{if(typeof b==="number")items[a]=b});await ref.set({items,note:txt,by:meta.by,at:meta.at});returnDocs.add(ev)}},{t:"note",txt});''')
rep('''    returns=next;returnDocs=docs;rerender();resolveNames();''','''    syOverlayRet(next);returns=next;returnDocs=docs;rerender();resolveNames();''')
rep('.ev-mode{margin:6px 0 0;font-size:.82rem;color:var(--muted)}','''.ev-mode{margin:6px 0 0;font-size:.82rem;color:var(--muted)}
#syncBar{display:none;position:fixed;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:60;padding:12px 14px;border-radius:12px;font-size:.92rem;line-height:1.35;box-shadow:0 6px 24px rgba(0,0,0,.25);max-width:560px;margin:0 auto}
#syncBar.sy-off{display:block;background:#A3321F;color:#fff}#syncBar.sy-wait{display:block;background:#E0A73A;color:#1a1300}#syncBar.sy-ok{display:block;background:#2F7253;color:#fff}
.ev-h2 .cnt.all{color:var(--c2,#2F7253)}''')
open("base2.html","w",encoding="utf-8").write(h)
print("sync ok")
