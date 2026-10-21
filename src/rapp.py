h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80],h.count(a)); h=h.replace(a,b)
rep('''    <button role="tab" aria-selected="false" aria-controls="v-postare" data-view="postare" class="edit-only">Postare</button>''',
'''    <button role="tab" aria-selected="false" aria-controls="v-postare" data-view="postare" class="edit-only">Postare</button>
    <button role="tab" aria-selected="false" aria-controls="v-raport" data-view="raport" class="edit-only">Raport</button>''')
rep('<section class="view" id="v-postare" role="tabpanel" hidden=""></section>','<section class="view" id="v-postare" role="tabpanel" hidden=""></section>\n  <section class="view" id="v-raport" role="tabpanel" hidden=""></section>\n  <section class="view" id="v-echipa" role="tabpanel" hidden=""></section>')
rep('<button role="tab" aria-selected="false" aria-controls="v-oferte" data-view="oferte">Oferte</button>','<button role="tab" aria-selected="false" aria-controls="v-echipa" data-view="echipa">Echipa</button>\n    <button role="tab" aria-selected="false" aria-controls="v-oferte" data-view="oferte">Oferte</button>')
rep('<div class="ev-tabs" id="evTabs" aria-label="Evenimente"></div>','<div id="dispBanner"></div>\n    <div class="ev-tabs" id="evTabs" aria-label="Evenimente"></div>')
rep('function render(){\n  const v=$("#evView");','function render(){\n  const v=$("#evView");if(window.__disp)setTimeout(window.__disp.banner);')
rep('if(tb==="postare"){','if(tb==="raport"){h.innerHTML=`Raport<span class="yr">lunar</span>`;return}if(tb==="echipa"){h.innerHTML=`Echipa<span class="yr">disponibilitate</span>`;return}if(tb==="postare"){')
r=open("raport.js",encoding="utf-8").read()+"\n"+open("disp.js",encoding="utf-8").read()
rep('\n/* After a save reloads the page, reopen what was being edited */',"\n"+r+'\n/* After a save reloads the page, reopen what was being edited */')
rep("</style>\n</head>",""".rp-kpi{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:12px 0}
.rp-k{border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--card);display:flex;flex-direction:column;gap:2px}
.rp-k b{font-family:"Big Shoulders Display",Impact,sans-serif;font-size:1.7rem;font-weight:900;line-height:1}
.rp-k span{font-weight:700;font-size:.85rem}.rp-k small{color:var(--muted);font-size:.78rem;line-height:1.3}
.rp-t{border:1.5px solid var(--line);border-radius:14px;overflow:hidden}
.rp-r{display:grid;grid-template-columns:minmax(0,2fr) 1fr 1fr;gap:8px;padding:9px 12px;border-top:1px solid var(--line)}.rp-r:first-child{border-top:0}
.rp-ed{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;padding:12px;border:1.5px solid var(--line);border-radius:12px;margin:8px 0}
.rp-ed label{display:flex;flex-direction:column;gap:4px;font-size:.85rem;font-weight:600;color:var(--muted)}
.rp-ed input,.rp-ev input{width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink);font:inherit}
.rp-two{display:grid;grid-template-columns:1fr 1fr;gap:6px}.rp-ed .st-acts{grid-column:1/-1}
.rp-evs{padding:6px 16px 14px;display:flex;flex-direction:column;gap:6px}
.rp-ev{display:grid;grid-template-columns:minmax(0,1fr) 110px auto;gap:8px;align-items:center}
.disp-ban{margin:0 0 12px}.disp-r{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid var(--line)}.disp-ban .disp-r{padding:8px 0}
.disp-r small{display:block;color:var(--muted);font-size:.82rem}.ev-list>.disp-r:first-child{border-top:0}
.disp-cal{border:1.5px solid var(--line);border-radius:14px;padding:10px;background:var(--card)}
.disp-h,.disp-g{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}.disp-h span{text-align:center;font-size:.75rem;font-weight:700;color:var(--muted)}
.disp-d{position:relative;aspect-ratio:1;border:1.5px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink);font:inherit;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0}
.disp-d b{font-size:.95rem}.disp-d small{font-size:.62rem;color:var(--muted);line-height:1}.disp-d i{font-style:normal;font-weight:800;font-size:.8rem;line-height:1}
.disp-d.ok{background:#d7f2df;border-color:#3a9a5b;color:#0f4d26}.disp-d.no{background:#f6dcdc;border-color:#c0392b;color:#7a1d14}.disp-d.past{opacity:.35;cursor:default}
.disp-d.ev::after{content:"";position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:var(--accent,#c9822b)}
.disp-ppl{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.disp-p{padding:3px 9px;border-radius:999px;background:var(--line);font-size:.85rem;font-weight:600}.disp-p.ok{background:#d7f2df;color:#0f4d26}.disp-p.no{background:#f6dcdc;color:#7a1d14}.disp-p a{text-decoration:none}
.disp-av{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:8px;padding:9px 12px;border-top:1px solid var(--line)}.disp-av:first-child{border-top:0}.disp-ok{color:#13612f;font-weight:600}.disp-no{color:#9a2a1f}
.en-av{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;font-size:.8rem;font-weight:500}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h);print("rap ok")
