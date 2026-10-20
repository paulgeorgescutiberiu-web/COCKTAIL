h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80],h.count(a)); h=h.replace(a,b)
q=open("qr.js",encoding="utf-8").read()
rep('\n/* After a save reloads the page, reopen what was being edited */',"\n"+q+'\n/* After a save reloads the page, reopen what was being edited */')
rep('function enEditBtn(e){return `<p style="margin:14px 0 0" class="edit-only"><button class="btn" type="button" data-enedit="${e.col}">Modifică fișa</button></p>`}',
    'function enEditBtn(e){return `<p style="margin:14px 0 0;display:flex;gap:8px;flex-wrap:wrap" class="edit-only"><button class="btn" type="button" data-enedit="${e.col}">Modifică fișa</button><button class="btn" type="button" data-qrev="${e.col}">QR pentru bar</button></p>`}')
rep('  h+=`</div><h2 class="ev-h2">De verificat</h2>`;','  h+=`</div><p class="edit-only" style="margin:12px 0 0"><button class="btn" type="button" data-qrall="1">🔳 QR-urile pentru bar, toate evenimentele (PDF)</button></p><h2 class="ev-h2">De verificat</h2>`;')
rep('function viewZiua(){\n  const s=[...D.events]','function viewZiua(){\n  const pend=window.__qr&&window.__qr.pendHTML?window.__qr.pendHTML():"";\n  const s=[...D.events]')
rep('  const multi=D.days.length>1;let h="",lastDay=null;','  const multi=D.days.length>1;let h=pend,lastDay=null;')
rep("</style>\n</head>","""#qrModal{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px}
.qr-box{background:var(--paper);color:var(--ink);border-radius:18px;padding:18px;max-width:440px;width:100%;max-height:92vh;overflow:auto;display:flex;flex-direction:column;gap:10px;position:relative}
.qr-x{align-self:flex-end}
.qr-img{background:#fff;border-radius:12px;padding:10px;display:flex;justify-content:center}
.qr-img svg{width:100%;height:auto;max-width:340px}
.qr-acts,.qr-la{display:flex;gap:8px;flex-wrap:wrap}
.qr-lead{display:flex;gap:10px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--line)}
.qr-lead small{display:block;color:var(--muted);font-size:.82rem;margin-top:2px}
.qr-lead.off{opacity:.55}
.qr-lead a{color:inherit}
.ct-pend-r{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line)}
.ct-pend-r small{display:block;color:var(--muted)}
.ct-pend{margin-bottom:14px}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h);print("qr ok")
