# Sofia, asistentul vocal: butonul cu microfon și panoul de conversație (voce.js)
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80],h.count(a)); h=h.replace(a,b)
v=open("voce.js",encoding="utf-8").read()
rep('\n/* After a save reloads the page, reopen what was being edited */',"\n"+v+'\n/* After a save reloads the page, reopen what was being edited */')
rep("</style>\n</head>","""#vcBtn{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:61;width:60px;height:60px;border-radius:50%;border:0;background:var(--leaf-deep);color:#fff;font-size:26px;box-shadow:0 6px 20px rgba(0,0,0,.3);cursor:pointer;display:grid;place-items:center}
#vcBtn::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:3px solid var(--gold);opacity:.9}
#vcBtn.on{background:var(--danger)}#vcBtn.on::after{animation:vcPulse 1.2s ease-out infinite}
@keyframes vcPulse{from{transform:scale(1);opacity:.9}to{transform:scale(1.45);opacity:0}}
#vcPanel{box-sizing:border-box;position:fixed;right:12px;bottom:calc(88px + env(safe-area-inset-bottom));z-index:61;width:min(420px,calc(100vw - 24px));max-height:min(70vh,560px);display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:18px;background:var(--card);color:var(--ink);border:1.5px solid var(--line);box-shadow:0 12px 40px rgba(0,0,0,.3)}
#vcPanel[hidden]{display:none}
.vc-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.vc-top b{font-family:"Big Shoulders Display",Impact,sans-serif;font-size:1.5rem;color:var(--gold);line-height:1}
.vc-top span{color:var(--muted);font-size:.85rem}.vc-t{margin-left:auto;font-size:.8rem;color:var(--muted);display:flex;gap:4px;align-items:center}
.vc-x{background:none;border:0;font-size:1.1rem;color:var(--muted);cursor:pointer;padding:4px 6px}
.vc-log{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px;min-height:120px}
.vc-hint{color:var(--muted);font-size:.9rem;margin:0;line-height:1.6}
.vc-m{padding:8px 12px;border-radius:14px;max-width:88%;font-size:.95rem;line-height:1.4;white-space:pre-wrap}
.vc-eu{align-self:flex-end;background:var(--leaf);color:var(--on-leaf)}.vc-ai{align-self:flex-start;background:var(--paper);border:1px solid var(--line)}
.vc-act{align-self:center;font-size:.78rem;color:var(--muted);padding:2px 8px}
.vc-go{width:100%}.vc-go[hidden]{display:none}
.vc-ask{display:flex;gap:8px}.vc-ask[hidden]{display:none}.vc-ask .btn{flex:1}
.vc-mic{border:0;border-radius:14px;padding:14px;font:inherit;font-weight:700;font-size:1.05rem;background:var(--leaf);color:var(--on-leaf);cursor:pointer}.vc-mic.on{background:var(--danger)}
.vc-f{display:flex;gap:8px}.vc-f input{flex:1;min-width:0;padding:10px 12px;border-radius:12px;border:1.5px solid var(--line);background:var(--paper);color:var(--ink)}
@media print{#vcBtn,#vcPanel{display:none!important}}
</style>
</head>""")
open("base2.html","w",encoding="utf-8").write(h);print("voce ok")
