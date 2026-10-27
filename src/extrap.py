# Retur: articole luate în plus, fără cantitate trimisă în fișă (luat + întors -> consum și stoc)
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:90]); h=h.replace(a,b)

# date: returns[ev].extra = {cheie: {luat, retur}}
rep('''function setRetNote(ev,txt){''','''function retExtra(ev){const x=retFor(ev).extra;const o={};if(x&&typeof x==="object")Object.entries(x).forEach(([k,v])=>{if(v&&typeof v==="object")o[k]=v});return o}
function setExtra(ev,k,obj){
  const meta={by:UID||"",at:new Date().toISOString()};
  if(!DB){const r=retFor(ev);r.extra=r.extra||{};if(obj)r.extra[k]=obj;else delete r.extra[k];Object.assign(r,meta);retSaveLocal(ev,r);return}
  const r=returns[ev]=returns[ev]||{items:{}};r.extra=r.extra||{};if(obj)r.extra[k]=obj;else delete r.extra[k];Object.assign(r,meta);
  queueWrite("r:"+ev,async()=>{const ref=retRef().doc(ev);
    if(returnDocs.has(ev))await ref.update({extra:{[k]:obj||null},by:meta.by,at:meta.at});
    else{const items={};Object.entries(r.items||{}).forEach(([a,b])=>{if(typeof b==="number")items[a]=b});const extra={};Object.entries(r.extra||{}).forEach(([a,b])=>{if(b)extra[a]=b});
      await ref.set({items,note:r.note||"",extra,by:meta.by,at:meta.at});returnDocs.add(ev)}},{t:"extra",k,obj});
}
function setRetNote(ev,txt){''')
rep('''next[d.id]={items:Object.assign({},x.items||{}),note:x.note||"",by:x.by||"",at:x.at||""}''','''next[d.id]={items:Object.assign({},x.items||{}),extra:Object.assign({},x.extra||{}),note:x.note||"",by:x.by||"",at:x.at||""}''')
rep('''if(o.t==="ret")r.items[o.k]=o.v;else if(o.t==="note")r.note=o.txt''','''if(o.t==="ret")r.items[o.k]=o.v;else if(o.t==="note")r.note=o.txt;else if(o.t==="extra"){r.extra=r.extra||{};r.extra[o.k]=o.obj||null}''')

# afișare în „Retur și consum”
rep('''  if(!G.length)h+=`<div class="ev-ok">La acest eveniment nu sunt cantități de marfă de returnat.</div>`;''','''  if(!G.length)h+=`<div class="ev-ok">La acest eveniment nu sunt cantități de marfă de returnat.</div>`;
  h+=extraHTML(e,ro);''')
rep('''function pagerHTML(prev,next){''','''/* Luat în plus: articole fără cantitate trimisă în fișă */
const XADD={};
function extraCand(e){return D.items.filter(it=>QTY_CATS.includes(it.cat)&&!(e.values[it.key]&&typeof e.values[it.key].v==="number"&&e.values[it.key].v>0))}
function extraHTML(e,ro){
  const C=extraCand(e);if(!C.length)return "";
  const X=retExtra(e.id),add=XADD[e.id]=XADD[e.id]||[],keys=[...new Set([...Object.keys(X),...add])].filter(k=>C.some(it=>it.key===k));
  const lab=k=>(C.find(it=>it.key===k)||{}).label||k,nv=v=>typeof v==="number"?num(v):"";
  let h=`<h2 class="ev-h2">Luat în plus <span class="cnt">fără cantitate în fișă</span></h2>
    <p class="ev-mode">Dacă ați luat la eveniment ceva ce nu era trecut în fișă, adaugă-l aici: cât s-a luat și cât s-a întors. Consumul = luat minus întors. Intră în Excelul de consum și în stoc.</p>`;
  if(keys.length)h+=`<div class="ev-list">`+keys.map(k=>{const x=X[k]||{},over=typeof x.luat==="number"&&typeof x.retur==="number"&&x.retur>x.luat;
    return `<div class="ev-ret ev-xrow ${x.luat!=null?"has":""} ${over?"over":""}" data-xk="${esc(k)}"><div class="lbl">${esc(lab(k))}<small>fără cantitate trimisă</small>${over?`<small class="warn">Întors mai mult decât s-a luat</small>`:""}</div>
      <label class="xf"><small>luat</small><input class="ev-xin" data-f="luat" type="text" inputmode="decimal" autocomplete="off" value="${nv(x.luat)}" aria-label="Luat ${esc(lab(k))}" ${ro?"disabled":""}></label>
      <label class="xf"><small>întors</small><input class="ev-xin" data-f="retur" type="text" inputmode="decimal" autocomplete="off" value="${nv(x.retur)}" aria-label="Întors ${esc(lab(k))}" ${ro?"disabled":""}></label>
      <div class="cons">${typeof x.luat==="number"?consHTML(x.luat,typeof x.retur==="number"?x.retur:0):`<small>Consum</small><b>—</b>`}</div>
      ${ro?"":`<button class="ev-xdel" data-xdel="${esc(k)}" aria-label="Scoate ${esc(lab(k))}">✕</button>`}</div>`}).join("")+`</div>`;
  if(!ro){const left=C.filter(it=>!keys.includes(it.key));
    if(left.length)h+=`<select class="ev-xadd" aria-label="Adaugă articol luat în plus"><option value="">+ Adaugă un articol luat în plus…</option>${CATS.filter(c=>QTY_CATS.includes(c.id)).map(c=>{const L=left.filter(it=>it.cat===c.id);return L.length?`<optgroup label="${esc(c.name)}">${L.map(it=>`<option value="${esc(it.key)}">${esc(it.label)}</option>`).join("")}</optgroup>`:""}).join("")}</select>`}
  return h;
}
function pagerHTML(prev,next){''')

# consumul pe săptămână (tab-ul Consum) include ce s-a luat în plus
rep('''      const parts=D.events.map(e=>{const x=e.values[it.key];if(!x||typeof x.v!=="number"||!(x.v>0))return null;const rv=retVal(e.id,it.key);return rv==null?null:{e,sent:x.v,cons:x.v-rv}}).filter(Boolean);''','''      const parts=D.events.map(e=>{const x=e.values[it.key];if(!x||typeof x.v!=="number"||!(x.v>0)){const xe=retExtra(e.id)[it.key];return xe&&typeof xe.luat==="number"&&xe.luat>0?{e,sent:xe.luat,cons:Math.max(0,xe.luat-(typeof xe.retur==="number"?xe.retur:0)),plus:true}:null}const rv=retVal(e.id,it.key);return rv==null?null:{e,sent:x.v,cons:x.v-rv}}).filter(Boolean);''')
rep('''        <div class="ev-bd">${parts.map(p=>`${esc(p.e.name)} ${num(p.cons)} din ${num(p.sent)}`).join(", ")}</div></div>`;''','''        <div class="ev-bd">${parts.map(p=>`${esc(p.e.name)} ${num(p.cons)} din ${num(p.sent)}${p.plus?" (luat în plus)":""}`).join(", ")}</div></div>`;''')

# evenimente: nu redesena cât scrii; salvare la ieșirea din câmp
rep('''a.matches("#evView .ev-rin, #evView .ev-rnote")){pendingRender=true;return}''','''a.matches("#evView .ev-rin, #evView .ev-rnote, #evView .ev-xin")){pendingRender=true;return}''')
rep('''const nx=ev.relatedTarget;if(nx&&nx.matches&&nx.matches("#evView .ev-rin, #evView .ev-rnote"))return;''','''const nx=ev.relatedTarget;if(nx&&nx.matches&&nx.matches("#evView .ev-rin, #evView .ev-rnote, #evView .ev-xin"))return;''')
rep('''  if(t.id==="evRetNote"){setRetNote(route,t.value.trim());return}''','''  if(t.id==="evRetNote"){setRetNote(route,t.value.trim());return}
  if(t.matches(".ev-xadd")){const k=t.value;if(k){const a=XADD[route]=XADD[route]||[];if(!a.includes(k))a.push(k);rerender();const i=document.querySelector(`[data-xk="${CSS.escape(k)}"] .ev-xin`);if(i)i.focus()}return}
  if(t.matches(".ev-xin")){const row=t.closest("[data-xk]"),k=row.dataset.xk,ins=row.querySelectorAll(".ev-xin"),vals={};let bad=false;
    ins.forEach(i=>{const v=parseRet(i.value);if(Number.isNaN(v)){bad=true;i.value=""}else{vals[i.dataset.f]=v;i.value=v==null?"":num(v)}});
    if(bad)toast("Scrie un număr, de exemplu 2 sau 0,5.");
    if(vals.luat==null&&vals.retur!=null)toast("Scrie și cât s-a luat, altfel nu se poate calcula consumul.");
    setExtra(route,k,vals.luat==null&&vals.retur==null?null:{luat:vals.luat,retur:vals.retur});
    const l=vals.luat,r=vals.retur;row.querySelector(".cons").innerHTML=typeof l==="number"?consHTML(l,typeof r==="number"?r:0):`<small>Consum</small><b>—</b>`;
    row.classList.toggle("has",l!=null);row.classList.toggle("over",typeof l==="number"&&typeof r==="number"&&r>l);return}''')
rep('''$("#evView").addEventListener("input",ev=>{''','''$("#evView").addEventListener("click",ev=>{const x=ev.target.closest("[data-xdel]");if(!x)return;const k=x.dataset.xdel;
  if(!x.dataset.armed){x.dataset.armed="1";x.textContent="Sigur?";setTimeout(()=>{if(document.contains(x)){delete x.dataset.armed;x.textContent="✕"}},3000);return}
  if(XADD[route])XADD[route]=XADD[route].filter(y=>y!==k);setExtra(route,k,null);rerender()});
$("#evView").addEventListener("input",ev=>{''')
rep('.ev-ret .cons{text-align:right;line-height:1.05}','''.ev-ret .cons{text-align:right;line-height:1.05}
.ev-xrow{grid-template-columns:1fr 1fr 72px 34px;grid-template-areas:"l l l l" "a b c d";row-gap:6px}
.ev-xrow .lbl{grid-area:l}.ev-xrow .xf{display:flex;flex-direction:column;gap:2px}.ev-xrow .xf small{color:var(--muted);font-size:.72rem}
.ev-xin{width:100%;font:inherit;font-size:1.05rem;font-weight:700;text-align:center;padding:9px 6px;border:1.5px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink)}
.ev-xin:focus{outline:none;border-color:var(--c)}.ev-xrow.has .ev-xin{border-color:var(--c)}.ev-xrow.over .ev-xin{border-color:var(--warn)}
.ev-xdel{border:0;background:none;color:var(--muted);font:inherit;font-size:.95rem;cursor:pointer;padding:6px 0;align-self:end}
.ev-xadd{width:100%;margin-top:10px;font:inherit;padding:12px;border:1.5px dashed var(--line);border-radius:12px;background:var(--card);color:var(--ink)}''')
open("base2.html","w",encoding="utf-8").write(h)
print("extra ok")
