#!/usr/bin/env python3
"""Etichetele pentru Google și pentru previzualizarea linkurilor, pe paginile din site-nou/.

Pune în <head>, între <!-- SEO --> și <!-- /SEO -->:
  - adresa canonică (cocktailphilosophy.ro/...), ca Google să nu numere copia de pe GitHub Pages;
  - Open Graph + Twitter: poza, titlul și descrierea care apar pe WhatsApp, Facebook, Messenger;
  - fișa firmei pentru Google (schema.org LocalBusiness), pagina, firimiturile și întrebările frecvente
    luate chiar din secțiunea „Întrebări” a paginii (cu avansul din preturi.js);
  - scriptul de măsurare a apăsărilor (masurare.js).

Rulare:  python3 tools/seo-site.py           → actualizează paginile
         python3 tools/seo-site.py --check   → doar verifică (iese cu 1 dacă ceva nu e la zi; folosit de teste)
Se rulează după ce schimbi un titlu, o descriere, o întrebare frecventă sau avansul din preturi.js.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SN = ROOT / "site-nou"
CFG = json.loads((Path(__file__).parent / "seo-pagini.json").read_text(encoding="utf-8"))
SITE, ASSETS = CFG["site"], CFG["assets"]
START, END = "<!-- SEO -->", "<!-- /SEO -->"
MASURARE_V = "1"

FIRMA = {
    "@type": "LocalBusiness",
    "@id": SITE + "/#firma",
    "name": "Cocktail Philosophy",
    "description": "Bar mobil de cocktailuri pentru nunți, evenimente corporate și petreceri private, în Sibiu și în toată țara, din 2013.",
    "url": SITE + "/",
    "logo": ASSETS + "img/logo.svg",
    "image": [ASSETS + "img/og/index.jpg", ASSETS + "img/barmani-show-shaker.webp", ASSETS + "img/margarita-turnare-pocale.webp"],
    "telephone": "+40743785655",
    "email": "cocktailphilosophy@gmail.com",
    "foundingDate": "2013",
    "priceRange": "€€",
    "currenciesAccepted": "EUR, RON",
    "paymentAccepted": "Numerar, transfer bancar, card",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "Str. Tractorului 4",
        "addressLocality": "Sibiu",
        "addressRegion": "Sibiu",
        "addressCountry": "RO",
    },
    "areaServed": [
        {"@type": "City", "name": "Sibiu"},
        {"@type": "AdministrativeArea", "name": "Județul Sibiu"},
        {"@type": "Country", "name": "România"},
    ],
    "knowsAbout": ["Cocktailuri", "Bar mobil", "Barmani pentru evenimente", "Mixologie"],
    "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+40743785655",
        "contactType": "customer service",
        "availableLanguage": ["ro", "en"],
    },
    "sameAs": [
        "https://www.instagram.com/cocktailphilosophy/",
        "https://www.facebook.com/cocktailphilosophy",
        "https://www.youtube.com/channel/UCvdCIqtAW1NMqHujgbYOLKQ",
    ],
    "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Bar mobil de cocktailuri",
        "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Bar de cocktailuri pentru nunți", "url": SITE + "/nunti/"}},
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Bar de cocktailuri pentru evenimente corporate", "url": SITE + "/corporate/"}},
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Bar de cocktailuri pentru petreceri private", "url": SITE + "/petreceri/"}},
        ],
    },
}


def preturi():
    """Valorile din site-nou/preturi.js de care au nevoie răspunsurile (doar avansul și suplimentul)."""
    js = (SN / "preturi.js").read_text(encoding="utf-8")
    out = {}
    m = re.search(r"\bavans\s*:\s*(\d+(?:\.\d+)?)", js)
    if m:
        out["avans"] = f"{round(float(m.group(1))):,}".replace(",", ".") + " €"
    m = re.search(r"suplimentBauturaClient\s*:\s*(\d+)", js)
    if m:
        out["supliment"] = m.group(1) + "%"
    return out


def text(fragment, P):
    """HTML din pagină → text simplu, cu prețurile dinamice înlocuite ca pe pagină."""
    def span(m):
        key = m.group(1)
        return P.get(key, m.group(2))
    fragment = re.sub(r'<span[^>]*data-p="([a-z-]+)"[^>]*>(.*?)</span>', span, fragment, flags=re.S)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return re.sub(r"\s+", " ", html.unescape(fragment)).strip()


def faq(page_html, P):
    box = re.search(r'<div class="faq-list">(.*?)</div>', page_html, flags=re.S)
    if not box:
        return []
    out = []
    for q, a in re.findall(r"<details[^>]*>\s*<summary>(.*?)</summary>\s*<p>(.*?)</p>\s*</details>", box.group(1), flags=re.S):
        out.append({"@type": "Question", "name": text(q, P),
                    "acceptedAnswer": {"@type": "Answer", "text": text(a, P)}})
    return out


def meta(page_html, name):
    m = re.search(r'<meta name="%s" content="([^"]*)">' % name, page_html)
    return html.unescape(m.group(1)) if m else ""


def title(page_html):
    m = re.search(r"<title>(.*?)</title>", page_html, flags=re.S)
    return html.unescape(m.group(1).strip()) if m else ""


def block(file, p, page_html, P):
    url = SITE + p["url"]
    img = ASSETS + "img/og/" + file.replace(".html", ".jpg")
    desc = meta(page_html, "description")
    og_title = p.get("ogTitle") or title(page_html)
    e = lambda s: html.escape(s, quote=True)

    graph = [FIRMA, {
        "@type": "WebSite", "@id": SITE + "/#site", "url": SITE + "/", "name": "Cocktail Philosophy",
        "inLanguage": "ro-RO", "publisher": {"@id": SITE + "/#firma"},
    }]
    page = {
        "@type": "WebPage", "@id": url + "#pagina", "url": url, "name": title(page_html), "description": desc,
        "inLanguage": "ro-RO", "isPartOf": {"@id": SITE + "/#site"}, "about": {"@id": SITE + "/#firma"},
        "primaryImageOfPage": {"@type": "ImageObject", "url": img, "width": 1200, "height": 630},
    }
    if p["url"] != "/":
        page["breadcrumb"] = {"@id": url + "#firimituri"}
        graph.append({"@type": "BreadcrumbList", "@id": url + "#firimituri", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Acasă", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": p.get("nume", og_title), "item": url},
        ]})
    graph.insert(2, page)
    qs = faq(page_html, P)
    if qs:
        graph.append({"@type": "FAQPage", "@id": url + "#intrebari", "url": url, "mainEntity": qs})

    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))
    ld = ld.replace("</", "<\\/")
    lines = [
        START,
        f'<link rel="canonical" href="{e(url)}">',
        '<meta name="theme-color" content="#1A1A18">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Cocktail Philosophy">',
        '<meta property="og:locale" content="ro_RO">',
        f'<meta property="og:url" content="{e(url)}">',
        f'<meta property="og:title" content="{e(og_title)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:image" content="{e(img)}">',
        '<meta property="og:image:type" content="image/jpeg">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{e(p["kicker"] + " · Cocktail Philosophy")}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{e(og_title)}">',
        f'<meta name="twitter:description" content="{e(desc)}">',
        f'<meta name="twitter:image" content="{e(img)}">',
        f'<script type="application/ld+json">{ld}</script>',
        f'<script src="{ASSETS}masurare.js?v={MASURARE_V}" defer></script>',
        END,
    ]
    return "\n".join(lines)


def main():
    check = "--check" in sys.argv
    P = preturi()
    stale = []
    for file, p in CFG["pagini"].items():
        f = SN / file
        src = f.read_text(encoding="utf-8")
        clean = re.sub(re.escape(START) + r".*?" + re.escape(END) + r"\n?", "", src, flags=re.S)
        new = clean.replace("</head>", block(file, p, clean, P) + "\n</head>", 1)
        if "</head>" not in clean:
            raise SystemExit(f"{file}: nu are </head>")
        if new != src:
            stale.append(file)
            if not check:
                f.write_text(new, encoding="utf-8")
    if check:
        if stale:
            print("Etichetele SEO nu sunt la zi pe: " + ", ".join(stale) + ". Rulează: python3 tools/seo-site.py")
            sys.exit(1)
        print("SEO: toate paginile sunt la zi.")
    else:
        print("SEO actualizat pe: " + (", ".join(stale) if stale else "nimic (era deja la zi)"))


if __name__ == "__main__":
    main()
