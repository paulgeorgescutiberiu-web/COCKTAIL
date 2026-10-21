h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80]); h=h.replace(a,b)
ev=open("evnou.js",encoding="utf-8").read()
rep("\nfunction render(){\n  const v=$(\"#evView\");\n  if(!D){",ev+"\nfunction render(){\n  const v=$(\"#evView\");\n  if(EN&&route===\"nou\"){$(\"#evTabs\").innerHTML=\"\";v.innerHTML=viewNou();return}\n  if(route===\"arh\"){if(!ARH){ARH={list:null,msg:\"\",busy:\"\"};arhOpen();return}$(\"#evTabs\").innerHTML=\"\";v.innerHTML=viewArh();return}\n  if(!D){")
rep('<div class="edit-only"><button class="btn primary" type="button" id="evUpload">Încarcă alt Excel</button>','<div class="edit-only ev-btns"><button class="btn primary" type="button" id="evNou">Eveniment nou</button><button class="btn" type="button" id="evUpload">Încarcă Excel</button><button class="btn" type="button" id="evArh">Săptămâni anterioare</button>')
rep('$("#evUpload").onclick=()=>$("#evInput").click();','$("#evUpload").onclick=()=>$("#evInput").click();\n$("#evNou").onclick=()=>enStart({});\n$("#evArh").onclick=()=>arhOpen();')
rep('''  h+=`<div class="ev-pager">${prev?`<button data-r="${prev.id}"><small>Anterior</small><b>${esc(prev.name)}</b></button>`:"<span></span>"}${next?`<button data-r="${next.id}"><small>Următor</small><b>${esc(next.name)}</b></button>`:"<span></span>"}</div></div>`;
  return h;
}''','''  h+=enEditBtn(e);
  h+=`<div class="ev-pager">${prev?`<button data-r="${prev.id}"><small>Anterior</small><b>${esc(prev.name)}</b></button>`:"<span></span>"}${next?`<button data-r="${next.id}"><small>Următor</small><b>${esc(next.name)}</b></button>`:"<span></span>"}</div></div>`;
  return h;
}''')
rep('$("#evView").addEventListener("click",ev=>{\n  if(cxClick(ev.target))return;','$("#evView").addEventListener("click",ev=>{\n  if(enClick(ev.target))return;\n  if(arhClick(ev.target))return;\n  if(ev.target.closest("[data-prep]")){prepClick(ev.target);return}\n  const ed=ev.target.closest("[data-enedit]");if(ed){enFromEvent(ed.dataset.enedit);return}\n  if(cxClick(ev.target))return;')
rep("</style>\n</head>",""".ev-btns{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.en-days{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.en-day{padding:6px 10px;border:1.5px solid var(--line);border-radius:999px;background:transparent;color:var(--ink);font:inherit;font-size:.85rem;cursor:pointer}
.en-day.on{background:var(--accent,#1f6b4a);border-color:transparent;color:#fff}
.arh-l{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.arh-i{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px}
.arh-i small{display:block;color:var(--muted);font-size:.8rem;margin-top:2px;word-break:break-word}
.en-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}
.en-grid label,.en-q label{display:flex;flex-direction:column;gap:4px;font-size:.85rem;font-weight:600;color:var(--muted);min-width:0}
.en-grid input,.en-grid textarea,.en-q input{width:100%;box-sizing:border-box;padding:10px;border:1.5px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink);font:inherit;font-size:1rem}
.en-w{grid-column:1/-1}
.en-tg{display:flex;flex-direction:column;gap:8px;margin:6px 0 14px;font-size:.95rem}
.en-tg label{display:flex;gap:8px;align-items:center}
.en-acts{margin:6px 0 4px}
.en-q{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.en-lb{display:flex;align-items:flex-start;justify-content:space-between;gap:4px}
.en-u{font-weight:500;opacity:.75}
.en-st{font-weight:500;font-size:.78rem;color:var(--muted)}
.en-st .warn{color:#c0392b;font-weight:700}
.en-menu{margin:8px 0}.en-menu .btn{margin-top:8px}
.en-x{flex:none;border:0;background:transparent;color:var(--muted);font-size:18px;line-height:1;padding:0 2px;cursor:pointer;border-radius:6px}
.en-x:hover,.en-x:focus-visible{color:#c0392b;background:rgba(192,57,43,.1)}
.en-add{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto;gap:8px;margin:10px 0 4px}
.en-add input{width:100%;box-sizing:border-box;padding:9px 10px;border:1.5px dashed var(--line);border-radius:10px;background:transparent;color:var(--ink);font:inherit}
.en-save{position:sticky;bottom:0;display:flex;gap:10px;justify-content:flex-end;padding:12px 0;background:linear-gradient(transparent,var(--paper) 30%)}
@media (max-width:760px){.en-grid{grid-template-columns:1fr 1fr}.en-q{grid-template-columns:1fr 1fr}}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h);print("ev ok")
