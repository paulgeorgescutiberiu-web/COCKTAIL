# Tab „Bani”: încasări, cheltuieli, raport și analiză (doar administratorul)
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:90]); h=h.replace(a,b)
rep('''    <button role="tab" aria-selected="false" aria-controls="v-raport" data-view="raport" class="edit-only">Raport</button>''','''    <button role="tab" aria-selected="false" aria-controls="v-raport" data-view="raport" class="edit-only">Raport</button>
    <button role="tab" aria-selected="false" aria-controls="v-bani" data-view="bani" class="edit-only">Bani</button>''')
rep('<section class="view" id="v-raport" role="tabpanel" hidden=""></section>','<section class="view" id="v-raport" role="tabpanel" hidden=""></section>\n  <section class="view" id="v-bani" role="tabpanel" hidden=""></section>')
rep('if(tb==="raport"){','if(tb==="bani"){h.innerHTML=`Bani<span class="yr">încasări și cheltuieli</span>`;return}if(tb==="raport"){')
rep('\n/* After a save reloads the page, reopen what was being edited */',"\n"+open("bani.js",encoding="utf-8").read()+'\n/* After a save reloads the page, reopen what was being edited */')
rep("</style>\n</head>",""".bn-bin{background:#2F7253;color:#fff;border-color:transparent}.bn-bout{background:#A3321F;color:#fff;border-color:transparent}
.bn-form{border:2px solid var(--line);border-radius:16px;padding:14px;margin:12px 0;background:var(--card);display:flex;flex-direction:column;gap:10px}.bn-form.in{border-color:#2F7253}.bn-form.out{border-color:#A3321F}
.bn-fh{display:flex;justify-content:space-between;align-items:center}.bn-fh b{font-size:1.15rem}
.bn-sum{display:flex;gap:10px;align-items:center}.bn-sum input{flex:1;min-width:0;font:700 2.2rem/1 inherit;font-family:inherit;padding:10px 12px;border:1.5px solid var(--line);border-radius:12px;background:var(--paper);color:var(--ink)}
.bn-cur{display:flex;gap:6px}.bn-l{font-size:.85rem;font-weight:600;color:var(--muted)}
.bn-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.bn-g label,.bn-n{display:flex;flex-direction:column;gap:4px;font-size:.85rem;font-weight:600;color:var(--muted)}
.bn-g input,.bn-g select,.bn-n input,.bn-set input{width:100%;box-sizing:border-box;padding:10px;border:1.5px solid var(--line);border-radius:10px;background:var(--paper);color:var(--ink);font:inherit}
@media (max-width:520px){.bn-g{grid-template-columns:1fr 1fr}}
.bn-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 0 4px}.bn-nav b{font-size:1.1rem;text-transform:capitalize}.bn-nav .btn{min-width:44px;font-size:1.2rem}
.rp-k.bn-in b{color:#2F7253}.rp-k.bn-out b{color:#A3321F}
.bn-row{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:11px 14px;border-top:1px solid var(--line)}.ev-list>.bn-row:first-child{border-top:0}
.bn-row small{display:block;color:var(--muted);font-size:.82rem;margin-top:2px}.bn-row.in b{color:#2F7253}.bn-row.out b{color:#A3321F}.bn-cat{font-size:.8rem;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--line)}
.bn-act{display:flex;gap:10px;flex:none}
.bn-bars{display:flex;flex-direction:column;gap:7px;margin:6px 0}.bn-bar{display:grid;grid-template-columns:minmax(0,1.2fr) 2fr auto;gap:10px;align-items:center;font-size:.88rem}
.bn-bar i{display:block;height:10px;border-radius:5px;background:linear-gradient(90deg,var(--bc) var(--w),var(--line) var(--w))}.bn-bar.out{--bc:#A3321F}.bn-bar.in{--bc:#2F7253}.bn-bar b{font-weight:700;white-space:nowrap}
.bn-an{border:1.5px solid var(--line);border-radius:14px;padding:12px 14px;background:var(--card)}.bn-an p{margin:0 0 8px;line-height:1.45}.bn-an p:last-child{margin:0}
.bn-ch{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;align-items:end;height:170px;border-bottom:1.5px solid var(--line);padding-top:6px}
.bn-col{display:flex;flex-direction:column;align-items:center;gap:4px;height:100%}.bn-cb{flex:1;width:100%;display:flex;gap:2px;align-items:flex-end;justify-content:center}
.bn-cb i{width:42%;border-radius:3px 3px 0 0;min-height:1px}.bn-cb i.in,.bn-dot.in{background:#2F7253}.bn-cb i.out,.bn-dot.out{background:#A3321F}.bn-col small{font-size:.7rem;color:var(--muted)}
.bn-dot{display:inline-block;width:10px;height:10px;border-radius:3px;margin:0 3px 0 8px;vertical-align:middle}
.bn-set{margin-top:22px;border-top:1px solid var(--line);padding-top:10px}.bn-set summary{cursor:pointer;color:var(--muted)}.bn-set label{display:flex;flex-direction:column;gap:4px;margin:10px 0;font-size:.85rem;color:var(--muted)}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h)
print("bani ok")
