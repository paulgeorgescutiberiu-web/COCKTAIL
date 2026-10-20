h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80]); h=h.replace(a,b)
rep('<button role="tab" aria-selected="false" aria-controls="v-contracte" data-view="contracte" class="edit-only">Contracte</button>',
    '<button role="tab" aria-selected="false" aria-controls="v-oferte" data-view="oferte">Oferte</button>\n    <button role="tab" aria-selected="false" aria-controls="v-contracte" data-view="contracte" class="edit-only">Contracte</button>')
rep('<section class="view" id="v-contracte" role="tabpanel" hidden=""></section>','<section class="view" id="v-contracte" role="tabpanel" hidden=""></section>\n  <section class="view" id="v-oferte" role="tabpanel" hidden=""></section>')
rep('if(tb==="contracte"){','if(tb==="oferte"){h.innerHTML=`Oferte<span class="yr">și meniu</span>`;return}if(tb==="contracte"){')
o=open("oferte.js",encoding="utf-8").read()
rep('\n/* After a save reloads the page, reopen what was being edited */',o+'\n/* After a save reloads the page, reopen what was being edited */')
rep("</style>\n</head>",""".of-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.of-card{background:var(--card);border:1.5px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.of-cover{display:block;aspect-ratio:16/9;background:#111;overflow:hidden}
.of-cover img{width:100%;height:100%;object-fit:cover;display:block}
.of-cover.none{display:none}
.of-body{padding:12px 14px 14px}
.of-body b{font-size:1.05rem}
.of-tag{font-size:.72rem;font-weight:700;text-transform:uppercase;background:var(--line);border-radius:999px;padding:2px 8px;margin-left:4px}
a.btn{text-decoration:none;color:inherit;display:inline-flex;align-items:center}
a.btn.primary{color:var(--on-leaf)}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h);print("of ok")
