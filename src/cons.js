
/* ---------- Excel consumație per eveniment (pentru client) ---------- */
const CX_SECT=[
  {id:"alcool",name:"BAZE ALCOOLICE",color:"C00000"},
  {id:"suc",name:"SUC / APE",color:"38761D"},
  {id:"piure",name:"PIUREURI FRUCTE & SIROPURI HOMEMADE",color:"990000"},
  {id:"fructe",name:"FRUCTE / CONDIMENTE",color:"6AA84F"},
  {id:"consum",name:"CONSUMABILE",color:"3C78D8"}];
const CX_CAT2SECT={alcool:"alcool",soft:"suc",premix:"piure",garnish:"fructe",altele:"consum",echip:"consum",scule:"consum"};
const cxR=(s,tip,brand,unit,pret,k,f)=>({s,tip,brand,unit,pret,k:k||"",f:f||1});
/* Siropurile păstrate (din oct. 2026): toate la 700 ml */
const CX_SYRUPS=()=>[cxR("piure","Whiskey sour","","sticla 700 ml",39.00,"WHISKEY SOUR"),cxR("piure","Platon","","sticla 700 ml",28.00,"PLATON"),
  cxR("piure","Hugo","","sticla 700 ml",28.00,"HUGO"),cxR("piure","Erasmus","","sticla 700 ml",53.50,"ERASMUS"),
  cxR("piure","Passiflora","Pornstar","sticla 700 ml",53.50,"PORNSTAR"),cxR("piure","Harmony","","sticla 700 ml",53.50,"HARMONY")];
const CX_DEFAULT={furnizor:"BETA PLUS",discPct:8,discLabel:"BETA PLUS SRL",rows:[
  cxR("alcool","Vodka","ABSOLUT","sticla 700 ml",85.99,"VODKA 1L"),cxR("alcool","Rom","HAVANA","sticla 700 ml",92.40,"ROM 1L"),
  cxR("alcool","WHISKEY","JAMESON","sticla 700 ml",111.60,"JAMESON"),cxR("alcool","Bitter","APEROL","sticla 700 ml",82.40,"APEROL"),
  cxR("alcool","Gin","BEEFEATER","sticla 700 ml",94.00,"GIN"),cxR("alcool","Gin","TANQUERAY","sticla 700 ml",89.00,"GIN"),
  cxR("alcool","Amaretto","Disaronno","sticla 700 ml",105.00,"AMARETTO"),cxR("alcool","Prosecco","ZAZ","sticla 700 ml",33.00,"PROSECCO"),
  cxR("alcool","PALOMA","prebatch","sticla 700 ml",84.00,"PALOMA"),cxR("alcool","NEGRONI","prebatch","sticla 500 ml",67.00,"NEGRONI"),
  cxR("alcool","BITTER","RAMAZOTTI","sticla 700 ml",80.00,""),cxR("alcool","Whiskey","JACK DANIELS","",145.00,"JACK DANIELS"),
  cxR("suc","Aloe Vera","KING / BABU","sticlă 1500 ml",16.00,"ALOE 1,5L"),cxR("suc","PFANNER","CRANBERRY","cutie 1000 ml",12.79,"CRANBERRY"),
  cxR("suc","PFANNER","ORANGE","cutie 1000 ml",14.17,"ORANGE"),cxR("suc","PFANNER","MAR VERDE","cutie 1000 ml",10.71,"MAR VERDE"),
  cxR("suc","Cola","COCA COLA","sticla 1000 ml",7.50,"COLA 1 L"),cxR("suc","Apa tonica","kinley","sticla 1500 ml",8.40,"KINLEY 1,5"),
  cxR("suc","Apa MINER","PERLA HARGHITEI","sticla 1000 ml",2.97,"APA MINERALA"),cxR("suc","San Pellegrino","","",8.50,"SAN PELEGRIN"),
  ...CX_SYRUPS(),
  cxR("fructe","Lime","","kg",19.00,"LADA LIME"),cxR("fructe","Portocale","","kg",7.00,"PORTO BUC"),cxR("fructe","Flori decor","","buc",13.50,"FLORI COMES"),
  cxR("fructe","FRUCTE DECOR","","buc",14.50,""),cxR("fructe","Fructe deshidratate","","buc",39.00,"DESHIDRATATE"),cxR("fructe","Menta","","kg",75.00,"MENTA"),
  cxR("fructe","Bitter ANGOSTURA","","sticla 330 ml",78.60,""),cxR("fructe","FRESH LAMAIE","","sticlă 1000 ml",29.00,"FRESH LAMAIE"),
  cxR("fructe","Rozmarin","","caserola",5.50,"ROZMARIN"),cxR("fructe","Cimbrișor","","caserola",5.00,"CIMBRISOR"),cxR("fructe","Grapefruit","","kg",8.00,"GREF"),
  cxR("consum","PAIE","","punga",31.80,""),cxR("consum","MENIURI","","",2.00,"MENIURI"),cxR("consum","GHEATA","","kg",4.00,"GHEATA")]};
/* În aplicație alcoolul și premixurile sunt în sticle de 1 L; în consumație, în sticlele de pe factură (700 ml etc.) */
const CX_LITRE_CATS=["alcool"],CX_NOCONV=["PROSECCO"];
function cxAutoF(r){const m=String(r.unit||"").match(/(\d+(?:[.,]\d+)?)\s*ml/i),kn=KNOWN[r.k],cat=kn?kn[1]:null;
  if(!m||!cat||!CX_LITRE_CATS.includes(cat)||CX_NOCONV.includes(r.k))return null;const ml=parseFloat(m[1].replace(",","."));return ml>0?Math.round(1000/ml*10000)/10000:null}
CX_DEFAULT.rows.forEach(r=>{const f=cxAutoF(r);if(f)r.f=f});CX_DEFAULT.v=4;
let PRICES=null,pricesP=null,pDraft=null,pMsg="";
const cxAdmin=()=>!!(window.CPFS&&window.CPFS.isAdmin);
const cxKey=s=>norm(s).replace(/[.\/\[\]*~`#$]/g," ").replace(/\s+/g," ").trim();
function loadPrices(){
  if(PRICES)return Promise.resolve(PRICES);
  if(!pricesP)pricesP=(async()=>{
    try{const F=window.CPFS;const d=await F.fs.doc(`${F.base}/privat/preturi`).get();PRICES=d.exists&&d.data()&&Array.isArray(d.data().rows)?d.data():JSON.parse(JSON.stringify(CX_DEFAULT));PRICES._saved=d.exists;
      if(PRICES._saved&&!(PRICES.v>=3)){const old=r=>{const m=String(r.unit||"").match(/(\d+(?:[.,]\d+)?)\s*ml/i);return m?Math.round(1000/parseFloat(m[1].replace(",","."))*10000)/10000:null};
        PRICES.rows.forEach(r=>{const f=cxAutoF(r),cur=Number(r.f)||1;if(f){if(cur===1)r.f=f}else if(old(r)===cur)r.f=1});PRICES.v=3;PRICES._saved=false;PRICES._migr=true}
      if(!(PRICES.v>=4)){const ins=PRICES.rows.findIndex(r=>r.s==="piure"),keep=PRICES.rows.filter(r=>r.s!=="piure");
        const at=ins<0?keep.findIndex(r=>r.s==="fructe"):ins;keep.splice(at<0?keep.length:at,0,...CX_SYRUPS());PRICES.rows=keep;
        if(!PRICES.rows.some(r=>r.k==="SAN PELEGRIN")){const i=PRICES.rows.map(r=>r.s).lastIndexOf("suc");PRICES.rows.splice(i+1,0,cxR("suc","San Pellegrino","","",8.50,"SAN PELEGRIN"))}
        if(!PRICES.rows.some(r=>r.k==="JACK DANIELS")){const i=PRICES.rows.map(r=>r.s).lastIndexOf("alcool");PRICES.rows.splice(i+1,0,cxR("alcool","Whiskey","JACK DANIELS","",145.00,"JACK DANIELS"))}
        PRICES.rows=PRICES.rows.filter(r=>!(r.s==="consum"&&/jack/i.test(r.tip)));
        PRICES.v=4;PRICES._saved=false;PRICES._migr="sir"}}
    catch(e){PRICES=JSON.parse(JSON.stringify(CX_DEFAULT));PRICES._saved=false;PRICES._err=true}
    return PRICES;
  })();
  return pricesP;
}
function cxArticles(){
  const m={};D.items.forEach(it=>{const k=cxKey(it.excelLabel);if(!m[k])m[k]={label:it.label,cat:it.cat}});
  (PRICES?PRICES.rows:[]).forEach(r=>{if(r.k&&!m[r.k])m[r.k]={label:r.k,cat:"altele"}});
  return m;
}
/* Consumul unui eveniment, pe articol: trimis minus retur (sau tot ce s-a trimis, dacă nu s-a notat returul) */
function eventConsumption(e){
  const out=[];
  D.items.forEach(it=>{const x=e.values[it.key];if(!x||typeof x.v!=="number"||!(x.v>0))return;
    const rv=QTY_CATS.includes(it.cat)?retVal(e.id,it.key):null;
    out.push({k:cxKey(it.excelLabel),label:it.label,cat:it.cat,note:x.note||"",sent:x.v,ret:rv,cons:Math.max(0,rv==null?x.v:x.v-rv)})});
  return out;
}
function buildRows(e,P){
  const rows=P.rows.map(r=>({...r,q:0,used:false})),extra=[],cons=eventConsumption(e);
  cons.forEach(c=>{
    const cand=rows.filter(r=>r.k===c.k);
    if(!cand.length){extra.push({s:CX_CAT2SECT[c.cat]||"consum",tip:c.label,brand:c.note,unit:"",pret:null,q:c.cons,extra:true});return}
    const nb=norm(c.note),pick=(nb&&cand.find(r=>r.brand&&nb.includes(norm(r.brand))))||cand[0];
    pick.q+=c.cons*(Number(pick.f)||1);pick.used=true;
  });
  return {rows:rows.concat(extra),cons,noRet:cons.filter(c=>c.ret==null&&QTY_CATS.includes(c.cat)).length,extra:extra.length};
}
let xlP=null;
function loadExcelJS(){
  if(window.ExcelJS)return Promise.resolve(window.ExcelJS);
  if(!xlP)xlP=new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
    s.onload=()=>window.ExcelJS?res(window.ExcelJS):rej(new Error("exceljs"));s.onerror=()=>{xlP=null;rej(new Error("exceljs"))};document.head.appendChild(s)});
  return xlP;
}
async function downloadConsum(e,btn){
  const lbl=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent="Se pregătește…"}
  try{
    const [XL,P]=await Promise.all([loadExcelJS(),loadPrices()]);
    const {rows,noRet,extra}=buildRows(e,P);
    const wb=new XL.Workbook();wb.creator="Cocktail Philosophy";
    const ws=wb.addWorksheet("Consumație",{pageSetup:{paperSize:9,orientation:"portrait",fitToPage:true,fitToWidth:1,fitToHeight:0},views:[{state:"frozen",ySplit:4}]});
    ws.columns=[{width:6},{width:26},{width:20},{width:11},{width:16},{width:14},{width:14}];
    const dash={style:"hair",color:{argb:"FF999999"}},B={top:dash,bottom:dash,left:dash,right:dash};
    const money="#,##0.00";
    const dateTxt=e.date?`${dLong(e.date)} ${e.date.getFullYear()}`:(D.title.day?D.title.day+", ":"")+D.title.big;
    ws.mergeCells("A1:G1");ws.getCell("A1").value=`Consumație ${e.name}`;ws.getCell("A1").font={bold:true,size:15};
    ws.mergeCells("A2:G2");ws.getCell("A2").value=[dateTxt,e.persons?e.persons+" persoane":""].filter(Boolean).join(" · ");ws.getCell("A2").font={color:{argb:"FF555555"}};
    const hr=ws.getRow(3);["Gen","Tip Produs","BRAND","Cantitate","Tip unitate","Pret furnizor","TOTAL"].forEach((t,i)=>{const c=hr.getCell(i+1);c.value=t;c.font={bold:true};c.alignment={horizontal:"center"};c.border=B});
    const r4=ws.getRow(4);r4.getCell(6).value=P.furnizor||"";r4.getCell(6).font={bold:true};r4.getCell(6).alignment={horizontal:"center"};
    for(let i=1;i<=7;i++)r4.getCell(i).border=B;
    let rn=5;const itemRows=[];
    CX_SECT.forEach(S=>{
      const list=rows.filter(r=>r.s===S.id);
      const isAlc=S.id==="alcool"&&Number(P.discPct)>0;
      if(!list.length&&!isAlc)return;
      ws.mergeCells(`A${rn}:G${rn}`);const sc=ws.getCell(`A${rn}`);sc.value=S.name;sc.font={bold:true,color:{argb:"FFFFFFFF"}};
      sc.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+S.color}};rn++;
      const first=rn;
      list.forEach(r=>{const row=ws.getRow(rn);
        row.getCell(2).value=r.tip||"";row.getCell(3).value=r.brand||"";
        row.getCell(4).value=Math.round((r.q||0)*100)/100;row.getCell(4).numFmt="0.00";
        row.getCell(5).value=r.unit||"";row.getCell(5).alignment={horizontal:"right"};
        if(r.pret!=null&&r.pret!=="")row.getCell(6).value=Number(r.pret);row.getCell(6).numFmt=money;
        row.getCell(7).value={formula:`D${rn}*F${rn}`};row.getCell(7).numFmt=money;
        [2,3].forEach(i=>row.getCell(i).font={bold:true});
        if(r.extra)[2,3,4,5,6].forEach(i=>row.getCell(i).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFFFF2CC"}});
        for(let i=1;i<=7;i++)row.getCell(i).border=B;itemRows.push(rn);rn++});
      if(isAlc){const row=ws.getRow(rn),last=rn-1;
        row.getCell(2).value=`DISCOUNT ${P.discPct}%`;row.getCell(3).value=P.discLabel||"";row.getCell(4).value=1;row.getCell(5).value="furnizor";
        row.getCell(6).value={formula:last>=first?`-ROUND(SUM(G${first}:G${last})*${Number(P.discPct)/100},2)`:"0"};row.getCell(6).numFmt=money;
        row.getCell(7).value={formula:`D${rn}*F${rn}`};row.getCell(7).numFmt=money;
        [2,3,4,5,6,7].forEach(i=>row.getCell(i).font={bold:true,italic:true,color:{argb:"FFE00000"}});
        for(let i=1;i<=7;i++)row.getCell(i).border=B;itemRows.push(rn);rn++}
    });
    rn++;
    const tr=ws.getRow(rn);ws.mergeCells(`A${rn}:F${rn}`);tr.getCell(1).value="PRET TOTAL";
    tr.getCell(7).value={formula:`SUM(G5:G${rn-1})`};tr.getCell(7).numFmt=money;
    [1,7].forEach(i=>{tr.getCell(i).font={bold:true,size:12,color:{argb:"FFFFFFFF"}};tr.getCell(i).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF000000"}}});
    for(let i=2;i<=6;i++)tr.getCell(i).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF000000"}};
    if(extra){const n=ws.getRow(rn+2);ws.mergeCells(`A${rn+2}:G${rn+2}`);n.getCell(1).value="Rândurile galbene nu sunt în lista de prețuri: completează prețul.";n.getCell(1).font={italic:true,color:{argb:"FF7F6000"}}}
    const buf=await wb.xlsx.writeBuffer();
    const fname=`consumatie_${String(e.name).replace(/[^\p{L}\p{N}]+/gu,"_")}_${e.date?dKey(e.date):String(D.fileName).replace(/\.[^.]+$/,"").replace(/[^\p{L}\p{N}]+/gu,"_")}.xlsx`;
    const url=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
    const a=document.createElement("a");a.href=url;a.download=fname;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
    toast(noRet?`Excelul e gata. La ${noRet} ${noRet===1?"articol":"articole"} nu s-a notat returul, așa că am pus toată cantitatea trimisă.`:"Excelul cu consumația e gata.");
  }catch(err){console.warn(err);toast(String(err&&err.message)==="exceljs"?"Nu s-a putut încărca generatorul de Excel. Verifică internetul.":"Nu am putut genera Excelul. Încearcă din nou.")}
  finally{if(btn&&document.contains(btn)){btn.disabled=false;btn.textContent=lbl}}
}
function cxButtons(){
  if(!cxAdmin()||!D)return "";
  return `<h2 class="ev-h2">Excel consumație</h2><p class="ev-mode">Pentru client: produsele consumate, cu prețurile tale și totalul. Fișierul se poate edita în Excel.</p>
    <div class="cx-btns">${D.events.map(e=>`<button class="btn" data-cx="${e.id}" style="--c:var(${e.c})"><span class="dot"></span>${esc(e.name)}</button>`).join("")}</div>
    <p style="margin-top:10px"><button class="btn" data-r="preturi">Lista de prețuri</button></p>`;
}
function viewPreturi(){
  if(!cxAdmin())return `<div class="ev-ok">Lista de prețuri o vede doar administratorul.</div>`;
  if(!PRICES){loadPrices().then(()=>{if(route==="preturi")render()});return `<p class="ev-mode">Se încarcă lista de prețuri…</p>`}
  if(!pDraft)pDraft=JSON.parse(JSON.stringify(PRICES));
  const arts=cxArticles(),opt=k=>`<option value="">— nelegat —</option>${Object.entries(arts).sort((a,b)=>a[1].label.localeCompare(b[1].label,"ro")).map(([key,x])=>`<option value="${esc(key)}"${key===k?" selected":""}>${esc(x.label)}</option>`).join("")}`;
  let h=`<p class="ev-mode">Fiecare rând apare în Excelul de consumație. Leagă-l de articolul din aplicație ca să i se pună cantitatea consumată. „× factor” transformă unitatea din aplicație în unitatea de aici. La alcool (fără Prosecco și premixuri), aplicația numără sticle de 1 L, deci pentru sticla de 700 ml factorul e 1,4286 (1 L = 1,43 sticle de 0,7 L). Prosecco și premixurile rămân cu factor 1. Când schimbi unitatea, factorul se recalculează singur. La fructe pui tu factorul (de ex. 1 ladă lime = 5 kg → 5). Dacă un articol are mai multe rânduri (de ex. Gin Beefeater și Tanqueray), merge la cel al cărui brand e scris lângă cantitate în Excel, altfel la primul.</p>
    ${PRICES._saved?"":`<div class="ev-alert">${PRICES._migr==="sir"?"Am actualizat siropurile (Whiskey sour, Platon, Hugo, Erasmus, Passiflora, Harmony, toate la 700 ml) și am adăugat San Pellegrino și Jack Daniels.":PRICES._migr?"Am pus factorii pentru sticlele de 1 L la alcool (fără Prosecco și premixuri).":"Lista e precompletată după modelul tău."} Verifică legăturile și factorii, apoi apasă Salvează.</div>`}
    ${pMsg?`<div class="ev-ok">${esc(pMsg)}</div>`:""}
    <div class="st-meta"><label>Furnizor (sub „Pret furnizor”)<input data-pf="furnizor" value="${esc(pDraft.furnizor||"")}"></label>
    <label>Discount la alcool (%)<input data-pf="discPct" inputmode="decimal" value="${esc(pDraft.discPct??"")}"></label>
    <label>Text la discount<input data-pf="discLabel" value="${esc(pDraft.discLabel||"")}"></label></div>`;
  CX_SECT.forEach(S=>{
    h+=`<h2 class="ev-h2" style="color:#${S.color}">${esc(S.name)}</h2><div class="ev-list cx-list">`;
    pDraft.rows.forEach((r,i)=>{if(r.s!==S.id)return;
      h+=`<div class="cx-row"><input data-pi="${i}" data-pk="tip" value="${esc(r.tip)}" placeholder="Produs" aria-label="Tip produs">
        <input data-pi="${i}" data-pk="brand" value="${esc(r.brand)}" placeholder="Brand" aria-label="Brand">
        <input data-pi="${i}" data-pk="unit" value="${esc(r.unit)}" placeholder="Unitate" aria-label="Unitate">
        <input data-pi="${i}" data-pk="pret" inputmode="decimal" value="${esc(r.pret??"")}" placeholder="Preț" aria-label="Preț">
        <select data-pi="${i}" data-pk="k" aria-label="Articol din aplicație">${opt(r.k)}</select>
        <input data-pi="${i}" data-pk="f" inputmode="decimal" value="${esc(r.f??1)}" aria-label="Factor" title="× factor">
        <button class="btn cx-del" data-pdel="${i}" aria-label="Șterge rândul">×</button></div>`});
    h+=`</div><button class="btn cx-add" data-padd="${S.id}">+ Rând în ${esc(S.name.toLowerCase())}</button>`;
  });
  h+=`<div class="st-save"><button class="btn" data-r="consum">Înapoi</button> <button class="btn primary" data-psave="1">Salvează lista</button></div>`;
  return h;
}
function cxEditChange(el){
  if(!el||!el.dataset||!el.dataset.pi||!["unit","k"].includes(el.dataset.pk))return;
  const row=el.closest(".cx-row");if(!row)return;
  const unit=row.querySelector("[data-pk=unit]").value,k=row.querySelector("[data-pk=k]").value,f=cxAutoF({unit,k});
  if(f)row.querySelector("[data-pk=f]").value=String(f);
}
function grabPrices(){
  if(!pDraft)return;
  document.querySelectorAll("#evView [data-pi]").forEach(el=>{const r=pDraft.rows[+el.dataset.pi],k=el.dataset.pk;if(!r)return;
    let v=el.value;if(k==="pret"||k==="f"){const n=Number(String(v).replace(",","."));v=v.trim()===""?(k==="f"?1:null):isFinite(n)?n:r[k]}r[k]=v});
  document.querySelectorAll("#evView [data-pf]").forEach(el=>{const k=el.dataset.pf;pDraft[k]=k==="discPct"?(Number(String(el.value).replace(",","."))||0):el.value});
}
function cxClick(t){
  const cx=t.closest("[data-cx]");if(cx){const e=D.events.find(x=>x.id===cx.dataset.cx);if(e)downloadConsum(e,cx);return true}
  const add=t.closest("[data-padd]");if(add){grabPrices();pDraft.rows.push(cxR(add.dataset.padd,"","","",null,""));pMsg="";render();return true}
  const del=t.closest("[data-pdel]");if(del){grabPrices();pDraft.rows.splice(+del.dataset.pdel,1);pMsg="";render();return true}
  const sv=t.closest("[data-psave]");if(sv){savePrices(sv);return true}
  if(t.closest("[data-r]")&&route==="preturi")grabPrices();
  return false;
}
async function savePrices(sv){grabPrices();sv.disabled=true;sv.textContent="Se salvează…";
    const data={v:4,furnizor:pDraft.furnizor||"",discPct:Number(pDraft.discPct)||0,discLabel:pDraft.discLabel||"",rows:pDraft.rows.map(({s,tip,brand,unit,pret,k,f})=>({s,tip:tip||"",brand:brand||"",unit:unit||"",pret:pret==null||pret===""?null:Number(pret),k:k||"",f:Number(f)||1})),at:new Date().toISOString()};
    try{const F=window.CPFS;await F.fs.doc(`${F.base}/privat/preturi`).set(data);PRICES={...data,_saved:true};pDraft=null;pMsg="Lista de prețuri a fost salvată.";render();window.scrollTo(0,0)}
    catch(e){toast(e&&e.code==="permission-denied"?"Nu ai drept să salvezi. Verifică regulile din Firebase (privat).":"Salvarea nu a reușit. Încearcă din nou.");sv.disabled=false;sv.textContent="Salvează lista"}
}

window.__cx={loadPrices,loadExcelJS,buildRows,dKey,getD:()=>D};
