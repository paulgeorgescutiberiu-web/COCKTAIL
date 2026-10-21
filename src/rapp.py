h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80],h.count(a)); h=h.replace(a,b)
rep('''    <button role="tab" aria-selected="false" aria-controls="v-postare" data-view="postare" class="edit-only">Postare</button>''',
'''    <button role="tab" aria-selected="false" aria-controls="v-postare" data-view="postare" class="edit-only">Postare</button>
    <button role="tab" aria-selected="false" aria-controls="v-raport" data-view="raport" class="edit-only">Raport</button>''')
rep('<section class="view" id="v-postare" role="tabpanel" hidden=""></section>','<section class="view" id="v-postare" role="tabpanel" hidden=""></section>\n  <section class="view" id="v-raport" role="tabpanel" hidden=""></section>')
rep('if(tb==="postare"){','if(tb==="raport"){h.innerHTML=`Raport<span class="yr">lunar</span>`;return}if(tb==="postare"){')
r=open("raport.js",encoding="utf-8").read()
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
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h);print("rap ok")
