/* Firebase simulat pentru teste: aplicația pornește ca administrator, cu datele din window.__SEED,
   fără internet și fără să atingă baza de date reală. Ține minte tot ce scrie aplicația în window.__WRITES.
   Acoperă doar ce folosește aplicația din SDK-ul „compat”: auth, firestore (doc/collection, get/set/add/delete/onSnapshot). */
(function(){
  const SEED=window.__SEED||{},STORE=new Map(),LIS=new Set();window.__WRITES=[];window.__STORE=STORE;
  Object.entries(SEED.docs||{}).forEach(([p,d])=>STORE.set(p,JSON.parse(JSON.stringify(d))));
  let auto=0;const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
  const DEL={__del:true};
  const parent=p=>p.split("/").slice(0,-1).join("/");
  const isDel=v=>v&&v.__del===true;
  function merge(a,b){const o={...(a||{})};Object.entries(b).forEach(([k,v])=>{if(isDel(v))delete o[k];else if(v&&typeof v==="object"&&!Array.isArray(v)&&o[k]&&typeof o[k]==="object"&&!Array.isArray(o[k]))o[k]=merge(o[k],v);else o[k]=clone(v)});return o}
  function snapDoc(path){const d=STORE.get(path);return {id:path.split("/").pop(),exists:d!==undefined,ref:{path},data:()=>clone(d),get:k=>d&&d[k],metadata:{hasPendingWrites:false}}}
  function snapCol(path,prev){const docs=[...STORE.keys()].filter(k=>parent(k)===path).sort().map(snapDoc);
    const prevIds=new Set(prev||[]);
    return {docs,size:docs.length,empty:!docs.length,forEach:f=>docs.forEach(f),
      docChanges:()=>docs.filter(d=>!prevIds.has(d.id)).map(d=>({type:"added",doc:d})),metadata:{hasPendingWrites:false}}}
  function notify(path){setTimeout(()=>LIS.forEach(l=>{if(l.path===path||l.path===parent(path))l.fire()}),0)}
  function write(op,path,data){window.__WRITES.push({op,path,data:clone(data),at:Date.now()});notify(path)}
  function docRef(path){return {id:path.split("/").pop(),path,
    get:async()=>snapDoc(path),
    set:async(d,o)=>{const v=o&&o.merge?merge(STORE.get(path),d):merge({},d);STORE.set(path,v);write("set",path,d)},
    update:async d=>{if(!STORE.has(path))throw {code:"not-found"};STORE.set(path,merge(STORE.get(path),d));write("update",path,d)},
    delete:async()=>{STORE.delete(path);write("delete",path,null)},
    collection:sub=>colRef(path+"/"+sub),
    onSnapshot(ok){const l={path,fire:()=>ok(snapDoc(path))};LIS.add(l);setTimeout(l.fire,0);return()=>LIS.delete(l)}}}
  function colRef(path){return {id:path.split("/").pop(),path,
    doc:id=>docRef(path+"/"+(id||("auto"+(++auto)))),
    get:async()=>snapCol(path),
    add:async d=>{const r=docRef(path+"/auto"+(++auto));await r.set(d);return r},
    where(){return this},orderBy(){return this},limit(){return this},
    onSnapshot(ok){let seen=null;const l={path,fire:()=>{const s=snapCol(path,seen);seen=s.docs.map(d=>d.id);ok(s)}};LIS.add(l);setTimeout(l.fire,0);return()=>LIS.delete(l)}}}
  const fs={doc:docRef,collection:colRef,settings(){},enablePersistence:async()=>{},batch:()=>{const ops=[];return {set:(r,d,o)=>ops.push(()=>r.set(d,o)),delete:r=>ops.push(()=>r.delete()),commit:async()=>{for(const f of ops)await f()}}}};
  const user=Object.assign({uid:"uid-paul",email:"paul.georgescu.tiberiu@gmail.com",emailVerified:true,isAnonymous:false,displayName:"Paul Georgescu",getIdToken:async()=>"fake"},SEED.user||{});
  const auth={currentUser:user,getRedirectResult:async()=>({user:null}),onAuthStateChanged(cb){setTimeout(()=>cb(user),0);return()=>{}},
    signInAnonymously:async()=>({user}),signOut:async()=>{},signInWithPopup:async()=>({user}),signInWithRedirect:async()=>{}};
  const firestore=()=>fs;
  firestore.FieldValue={delete:()=>DEL,serverTimestamp:()=>new Date().toISOString(),arrayUnion:(...a)=>a,increment:n=>n};
  const authFn=()=>auth;authFn.GoogleAuthProvider=function(){this.addScope=()=>{};this.setCustomParameters=()=>{}};
  window.firebase={apps:[],initializeApp(){this.apps.push({});return {}},app:()=>({}),auth:authFn,firestore,appCheck:()=>({activate(){}})};
})();
