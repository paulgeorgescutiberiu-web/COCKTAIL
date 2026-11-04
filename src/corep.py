# Logica comună (cp-core.js) în aplicație + stilurile pentru „De făcut” la cereri și cardul „Săptămâna ta”
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:90]); h=h.replace(a,b)
core=open("cp-core.js",encoding="utf-8").read()
assert "</script" not in core
rep('<script id="app">','<script id="cp-core">\n'+core+'</script>\n<script id="app">')
rep("</style>\n</head>",""".tabs [role=tab]{position:relative}
.rz-s{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline;cursor:pointer;padding:2px 0;list-style:none}.rz-s::-webkit-details-marker{display:none}
.rz-s b{font-size:1.05rem}.rz-s span{color:var(--muted);font-size:.86rem}.rz-s::after{content:"▾";margin-left:auto;color:var(--muted)}.rz[open] .rz-s::after{content:"▴"}
.rz-n,.rz-red{color:#A3321F}.rz-p{margin:10px 0 4px;padding:10px 14px 10px 30px;border-radius:12px;background:#FBF3E2;color:#3A2A08;line-height:1.5}
.rz-h{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:14px 0 4px;font-weight:700}
.rz-r{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;padding:9px 0;border-top:1px solid var(--line)}.rz-r.off{opacity:.55}
.rz-r small{display:block;color:var(--muted);font-size:.82rem;margin-top:2px}.rz-t{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}
.rz-m{font-size:.76rem;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--line)}.rz-m.rz-da{background:#DCEBDF;color:#1F4A33}.rz-m.rz-da::after{content:" ✓"}.rz-m.rz-nu{background:#F6D9D3;color:#7A2414}.rz-m.rz-q::after{content:" ?";opacity:.6}
.rz-f{margin-top:10px}
.tab-n{display:inline-grid;place-items:center;min-width:19px;height:19px;padding:0 5px;margin-left:6px;border-radius:999px;background:#A3321F;color:#fff;font-size:.72rem;font-weight:700;line-height:1;vertical-align:1px}
.ld-pas{display:inline-block;font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--line);color:var(--ink);vertical-align:middle}
.ld-pas.ld-urgent{background:#A3321F;color:#fff}.ld-pas.ld-azi{background:#F3DFB4;color:#5A3B07}.ld-pas.ld-info{background:var(--line);color:var(--muted)}
.ld-todo{margin:10px 0 12px;padding:12px 14px;border:2px solid #C2862D;border-radius:14px;background:var(--paper)}
.ld-todo-h{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:baseline;margin-bottom:4px}.ld-todo-h b{font-size:1.05rem}.ld-todo-h span{color:var(--muted);font-size:.86rem}.ld-urg{color:#A3321F}
.ld-td{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line)}
.ld-td-t{flex:1 1 260px;min-width:0}.ld-td small{display:block;color:var(--muted);font-size:.82rem;margin-top:3px}.ld-td.ld-urgent .ld-td-t>b{color:#A3321F}
.ld-prev{margin-top:6px;font-size:.85rem}.ld-prev summary{cursor:pointer;color:var(--muted)}.ld-prev p{margin:6px 0 0;padding:8px 10px;border-radius:10px;background:var(--card);border:1px solid var(--line);white-space:normal;line-height:1.45}
.ld-more{margin-top:6px}
.ld-undo{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:8px 0;padding:8px 12px;border-radius:12px;background:#EEF4EF;color:#1F3B2D;font-size:.9rem}
.ld-tpl{margin:14px 0 4px;border-top:1px solid var(--line);padding-top:10px}.ld-tpl summary{cursor:pointer;font-weight:600}
.ld-tl{display:flex;flex-direction:column;gap:4px;margin:10px 0;font-size:.85rem;font-weight:600;color:var(--muted)}
.ld-tl textarea{width:100%;box-sizing:border-box;padding:10px;border:1.5px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink);font:inherit;font-weight:500;line-height:1.45}
</style>
</head>""")
rep('  if(window.__qr)h+=window.__qr.leadsHTML();','  if(window.__rez)h+=window.__rez.html();\n  if(window.__qr)h+=window.__qr.leadsHTML();')
rep('\n/* After a save reloads the page, reopen what was being edited */',"\n"+open("rezumat.js",encoding="utf-8").read()+'\n/* After a save reloads the page, reopen what was being edited */')
open("base2.html","w",encoding="utf-8").write(h)
print("core ok")
