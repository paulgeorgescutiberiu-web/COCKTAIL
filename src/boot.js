(async function(){
/* ---------- Cocktail Philosophy · conectare la Firebase ---------- */
const CFG={
  apiKey:"AIzaSyBdnMe0062NUOsIBlRZ1NqKlPniDwWXebI",
  authDomain:"cocktail-philosophy-dc34b.firebaseapp.com",
  projectId:"cocktail-philosophy-dc34b",
  storageBucket:"cocktail-philosophy-dc34b.firebasestorage.app",
  messagingSenderId:"924422421135",
  appId:"1:924422421135:web:127a3c78598b64afb84efa"
};
/* Cheia publică reCAPTCHA v3 (site key), pentru citirea facturilor din poză */
const RECAPTCHA_SITE_KEY="6LforeItAAAAADua-qYPn8qJ0c7DlI_lapQPpwmo";
const ADMIN_EMAIL="paul.georgescu.tiberiu@gmail.com";
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const escH=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function screen(html){
  let o=document.getElementById("fbScreen");
  if(!o){o=document.createElement("div");o.id="fbScreen";document.body.appendChild(o)}
  o.innerHTML=`<div class="fb-box">${html}</div>`;return o;
}
function closeScreen(){const o=document.getElementById("fbScreen");if(o)o.remove()}
function runApp(){
  const src=document.getElementById("app");
  const s=document.createElement("script");s.textContent=src.textContent;
  document.body.appendChild(s);
}

/* Codul echipei vine din link (#k=...) și se ține minte pe dispozitiv */
const m=location.hash.match(/k=([A-Za-z0-9]{20,})/);
let T=m?m[1]:ls.get("cp-team");
if(m)ls.set("cp-team",T);
if(!T){
  screen(`<h2>Cocktail Philosophy</h2><p>Deschide aplicația din linkul primit de la Paul. Linkul conține codul echipei.</p>`);
  return;
}
if(!window.firebase){
  screen(`<h2>Fără conexiune</h2><p>Aplicația nu s-a putut conecta. Verifică internetul și reîncarcă pagina.</p><button class="fb-btn" onclick="location.reload()">Reîncarcă</button>`);
  return;
}

firebase.initializeApp(CFG);
const auth=firebase.auth(), fs=firebase.firestore();
const base=`echipe/${T}`;
const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r({code:"timeout"}),ms))]);

try{await auth.getRedirectResult()}catch(e){}
await new Promise(res=>{const u=auth.onAuthStateChanged(()=>{u();res()})});
if(!auth.currentUser){
  try{await withTimeout(auth.signInAnonymously(),15000)}
  catch(e){
    screen(`<h2>Nu mă pot conecta</h2><p>Verifică internetul și reîncarcă pagina.</p><button class="fb-btn" onclick="location.reload()">Reîncarcă</button>`);
    return;
  }
}
const me=auth.currentUser, UID=me.uid;
const isAdmin=!me.isAnonymous&&me.email===ADMIN_EMAIL;

/* Numele cu care apare la bife și retur */
let NAME=ls.get("cp-name");
if(!NAME&&isAdmin&&me.displayName)NAME=me.displayName.split(" ")[0];
if(!NAME){
  NAME=await new Promise(res=>{
    const o=screen(`<h2>Bine ai venit!</h2><p>Scrie-ți numele. Așa vor vedea colegii cine a bifat și cine a notat returul.</p>
      <form id="fbNameF"><input id="fbName" maxlength="30" autocomplete="given-name" placeholder="Prenumele tău" required><button class="fb-btn" type="submit">Intră</button></form>`);
    o.querySelector("#fbName").focus();
    o.querySelector("#fbNameF").onsubmit=e=>{e.preventDefault();const v=o.querySelector("#fbName").value.trim();if(v)res(v)};
  });
  closeScreen();
}
ls.set("cp-name",NAME);
fs.doc(`${base}/oameni/${UID}`).set({name:NAME}).catch(()=>{});

/* Rețetele și evenimentele curente, din baza de date */
try{
  const [rs,es]=await withTimeout(Promise.all([fs.doc(`${base}/config/retete`).get(),fs.doc(`${base}/config/evenimente`).get()]),10000);
  if(rs.exists&&rs.data().json)document.getElementById("recipes-data").textContent=rs.data().json;
  if(es.exists&&es.data().json)document.getElementById("events-data").textContent=es.data().json;
}catch(e){}

/* Puntea către aplicație (aceeași interfață pe care o folosea în Claude) */
const errCode=e=>{const c=e&&e.code;return {code:c==="permission-denied"?"not_granted":c==="resource-exhausted"?"quota_exceeded":c||"unknown"}};
const pick=(html,id)=>{const r=new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`).exec(html);return r?r[1]:null};
const arhKey=fn=>"arh-"+String(fn).replace(/[^A-Za-z0-9_.-]+/g,"-").slice(0,120);
async function archiveWeek(o,now){
  const k=arhKey(o.fileName),ref=fs.doc(`${base}/config/arhiva`);
  try{await fs.doc(`${base}/config/${k}`).set({json:JSON.stringify(o),fileName:o.fileName,at:now});
    const d=await ref.get(),L=(d.exists&&d.data().list)||[];
    const nL=[{k,fileName:o.fileName,at:now,ev:Math.max(0,((o.aoa[0]||[]).filter((v,i)=>i>0&&v!=null&&String(v).trim()&&String(v).trim().toUpperCase()!=="TOTAL")).length)},...L.filter(x=>x.k!==k)].slice(0,60);
    await ref.set({list:nL});
  }catch(e){throw errCode(e)}
}
window.__arh={key:arhKey,
  async list(){const d=await fs.doc(`${base}/config/arhiva`).get();return (d.exists&&d.data().list)||[]},
  async get(k){const d=await fs.doc(`${base}/config/${k}`).get();return d.exists?JSON.parse(d.data().json):null},
  save:o=>archiveWeek(o,new Date().toISOString())};
const artifact={
  async publish(html){
    if(!isAdmin)throw {code:"not_writer"};
    const rj=pick(html,"recipes-data"),ej=pick(html,"events-data");
    const now=new Date().toISOString(),jobs=[];
    if(rj!=null&&rj!==document.getElementById("recipes-data").textContent)jobs.push(fs.doc(`${base}/config/retete`).set({json:rj,at:now}));
    const oldEj=document.getElementById("events-data").textContent;
    if(ej!=null&&ej!==oldEj){
      /* Arhivă: săptămâna veche nu se pierde niciodată când e înlocuită cu alt fișier */
      try{const o=JSON.parse(oldEj||"null"),n=JSON.parse(ej);
        if(o&&o.fileName&&o.aoa&&o.aoa.length&&(!n||n.fileName!==o.fileName))await archiveWeek(o,now);
      }catch(e){if(e&&e.code)throw e}
      jobs.push(fs.doc(`${base}/config/evenimente`).set({json:ej,at:now}));
    }
    try{await Promise.all(jobs)}catch(e){throw errCode(e)}
    if(rj!=null)document.getElementById("recipes-data").textContent=rj;
    if(ej!=null)document.getElementById("events-data").textContent=ej;
  }
};
const user={
  async id(){return UID},
  async can(){return true},
  async canEdit(){return isAdmin},
  async profiles(ids){
    const out={};
    await Promise.all(ids.map(async id=>{
      try{const d=await fs.doc(`${base}/oameni/${id}`).get();out[id]=d.exists?{name:d.data().name||"",isMe:id===UID}:null}catch(e){out[id]=null}
    }));
    return out;
  }
};
const db={
  collection(p){
    const c=fs.collection(`${base}/${p}`);
    return {
      doc(id){const d=c.doc(id);return{
        set:x=>d.set(x).catch(e=>{throw errCode(e)}),
        update:x=>d.set(x,{merge:true}).catch(e=>{throw errCode(e)})
      }},
      onSnapshot:(ok,err)=>c.onSnapshot(ok,e=>err&&err(errCode(e)))
    };
  }
};
window.claude={use:async n=>n==="artifact"?artifact:n==="user"?user:n==="db"?db:null};

window.CPFS={fs,base,isAdmin,NAME,UID,cfg:CFG,recaptcha:RECAPTCHA_SITE_KEY};
/* Data și ora: pe telefon deschide direct calendarul / ceasul la atingere oriunde în câmp */
document.addEventListener("click",e=>{const i=e.target;
  if(i&&i.tagName==="INPUT"&&(i.type==="date"||i.type==="time"||i.type==="datetime-local")&&!i.readOnly&&!i.disabled&&typeof i.showPicker==="function"){try{i.showPicker()}catch(x){}}
},true);
runApp();

/* Rândul de jos: cine ești și intrarea de administrator */
const foot=document.querySelector("footer");
if(foot){
  const w=document.createElement("div");w.className="fb-who";
  w.innerHTML=`Ești <b>${escH(NAME)}</b>${isAdmin?" (administrator)":""} · <button type="button" id="fbRename">Schimbă numele</button> · `+
    (isAdmin?`<button type="button" id="fbOut">Ieși din administrare</button>`:`<button type="button" id="fbIn">Intră ca administrator</button>`);
  foot.appendChild(w);
  w.querySelector("#fbRename").onclick=()=>{const v=prompt("Numele tău:",NAME);if(v&&v.trim()){ls.set("cp-name",v.trim());fs.doc(`${base}/oameni/${UID}`).set({name:v.trim()}).finally(()=>location.reload())}};
  const bIn=w.querySelector("#fbIn"),bOut=w.querySelector("#fbOut");
  if(bIn)bIn.onclick=async()=>{
    const p=new firebase.auth.GoogleAuthProvider();
    try{await auth.signInWithPopup(p);location.reload()}
    catch(e){if(e&&(e.code==="auth/popup-blocked"||e.code==="auth/operation-not-supported-in-this-environment"))auth.signInWithRedirect(p);else if(e&&e.code!=="auth/popup-closed-by-user")alert("Intrarea nu a reușit: "+(e.code||e.message))}
  };
  if(bOut)bOut.onclick=async()=>{await auth.signOut();location.reload()};
  if(!me.isAnonymous&&!isAdmin){const n=document.createElement("p");n.className="notice";n.textContent="Contul "+me.email+" nu este de administrator. Poți bifa și nota returul, dar nu poți schimba rețetele.";document.querySelector("main")?.prepend(n)}
}
})();
