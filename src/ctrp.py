h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80]); h=h.replace(a,b)
rep('<button role="tab" aria-selected="false" aria-controls="v-stoc" data-view="stoc">Stoc depozit</button>',
    '<button role="tab" aria-selected="false" aria-controls="v-stoc" data-view="stoc">Stoc depozit</button>\n    <button role="tab" aria-selected="false" aria-controls="v-contracte" data-view="contracte" class="edit-only">Contracte</button>')
rep('<section class="view" id="v-stoc" role="tabpanel" hidden=""></section>','<section class="view" id="v-stoc" role="tabpanel" hidden=""></section>\n  <section class="view" id="v-contracte" role="tabpanel" hidden=""></section>')
rep('if(tb==="stoc"){h.innerHTML=`Stoc<span class="yr">depozit</span>`;return}','if(tb==="stoc"){h.innerHTML=`Stoc<span class="yr">depozit</span>`;return}if(tb==="contracte"){h.innerHTML=`Contracte<span class="yr">clienți</span>`;return}')
ct=open("contracte.js",encoding="utf-8").read()
rep('\n/* After a save reloads the page, reopen what was being edited */',ct+'\n/* After a save reloads the page, reopen what was being edited */')
rep("</style>\n</head>",""".ct-ocr input{background:#FFF4C2!important;color:#16241C!important}
.ct-bad input{border-color:var(--danger)!important}
.ct-msg ul,.ev-alert ul{margin:6px 0 0;padding-left:18px}
.ct-card{background:var(--card);border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;margin:0 0 10px}
.ct-h{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
.ct-rt{display:table!important;width:100%!important;border-collapse:collapse;margin:4px 0 12px}.ct-rt td{padding:7px 4px;border-bottom:1px solid var(--line)}.ct-rt td:last-child{text-align:right;font-variant-numeric:tabular-nums}.ct-rt .tot td{font-weight:800;font-size:1.1rem;border-bottom:0}
.ct-note{margin:8px 0 0;line-height:1.45}.ct-sg{align-items:center}.ct-sg a.ct-chip{text-decoration:none}.ct-up{cursor:pointer}.soc-cv{display:block;width:100%;max-width:420px;height:auto;border-radius:12px;margin:12px 0;background:#000}.soc-r{margin-top:12px}.ct-up.busy{opacity:.6;pointer-events:none}.ct-full{display:flex!important;flex-direction:column;align-items:stretch;gap:6px;margin:10px 0;font-weight:600;font-size:.9rem;color:var(--muted)}.ct-full textarea{box-sizing:border-box;width:100%!important;min-height:140px;font-size:1rem!important;font-family:inherit!important;padding:10px;border:1.5px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink,inherit);resize:vertical}
.ct-h span,.ct-m{color:var(--muted);font-size:.9rem}
.ct-b{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.ct-chip{border:1.5px solid var(--line);background:var(--paper);border-radius:999px;padding:6px 12px;font-size:.85rem;cursor:pointer;color:var(--ink)}
.ct-chip.on{background:var(--sage);border-color:var(--sage);font-weight:700}
.ct-q{width:100%;margin:0 0 6px}
.ct-opt{display:flex;gap:12px;align-items:center;padding:10px 14px;border-top:1px solid var(--line);cursor:pointer}
.ev-list>.ct-opt:first-child{border-top:0}
.ct-opt>input{width:20px;height:20px;flex:none}
.ct-opt span{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.ct-mini{width:60px!important;padding:6px!important}
.ct-opt select{padding:6px 8px;border:1.5px solid var(--line);border-radius:9px;background:var(--paper);color:var(--ink)}
.ct-sig{max-width:280px;width:100%;display:block;margin:0 0 8px;background:#fff;border-radius:8px}
nav.tabs{overflow-x:auto;scrollbar-width:none}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h);print("ct ok")
