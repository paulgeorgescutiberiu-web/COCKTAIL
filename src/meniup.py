# Meniul 2026: aducerea rețetelor la meniul de pe site, o singură dată (meniu.js)
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:80],h.count(a)); h=h.replace(a,b)
v=open("meniu.js",encoding="utf-8").read()
rep('\n/* After a save reloads the page, reopen what was being edited */',"\n"+v+'\n/* After a save reloads the page, reopen what was being edited */')
open("base2.html","w",encoding="utf-8").write(h);print("meniu ok")
