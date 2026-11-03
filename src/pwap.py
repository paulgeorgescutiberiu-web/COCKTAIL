# Instalare pe telefon ca aplicație: manifest, iconițe, culoarea barei
h=open("base2.html",encoding="utf-8").read()
def rep(a,b):
    global h
    assert h.count(a)==1,("x",a[:90]); h=h.replace(a,b)
rep('<title>Cocktail Philosophy · Rețetar și evenimente</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">','''<title>Cocktail Philosophy · Rețetar și evenimente</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<meta name="theme-color" content="#14432F">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Cocktail Ph.">
<link rel="preconnect" href="https://fonts.googleapis.com">''')
open("base2.html","w",encoding="utf-8").write(h)
print("pwa ok")
