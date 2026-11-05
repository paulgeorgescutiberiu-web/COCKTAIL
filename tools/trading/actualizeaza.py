#!/usr/bin/env python3
"""Aduce cotațiile zilnice SPCX (SpaceX, Nasdaq) și le scrie în trading/spcx.json.

Rulează din GitHub Actions de câteva ori pe zi (vezi .github/workflows/trading.yml),
așa că pagina trading.html citește un fișier static mic: zero server, zero chei, consum minim.
Doar biblioteca standard. Folosire: python3 tools/trading/actualizeaza.py [SIMBOL]
"""
import json, os, sys, time, urllib.request
from datetime import datetime, timezone

SIM = (sys.argv[1] if len(sys.argv) > 1 else "SPCX").upper()
RADACINA = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IESIRE = os.path.join(RADACINA, "trading", SIM.lower() + ".json")
URL = "https://query1.finance.yahoo.com/v8/finance/chart/{}?range=2y&interval=1d&includePrePost=false"


def aduce(sim):
    req = urllib.request.Request(URL.format(sim), headers={"User-Agent": "Mozilla/5.0 (cotatii-zilnice)"})
    for incercare in range(4):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except Exception as e:  # rețea instabilă: reîncearcă 2s, 4s, 8s
            if incercare == 3:
                raise
            print("Reîncerc după eroare:", e, file=sys.stderr)
            time.sleep(2 ** (incercare + 1))


def transforma(raw):
    res = raw["chart"]["result"][0]
    meta, ts = res["meta"], res.get("timestamp") or []
    q = res["indicators"]["quote"][0]
    off = meta.get("gmtoffset", 0)
    zile = []
    for i, t in enumerate(ts):
        o, h, l, c, v = (q[k][i] for k in ("open", "high", "low", "close", "volume"))
        if None in (o, h, l, c):
            continue  # zi fără tranzacții / lumânare incompletă
        d = datetime.fromtimestamp(t + off, timezone.utc).strftime("%Y-%m-%d")
        rand = [d, round(o, 4), round(h, 4), round(l, 4), round(c, 4), int(v or 0)]
        if zile and zile[-1][0] == d:
            zile[-1] = rand
        else:
            zile.append(rand)
    return {
        "simbol": meta.get("symbol", SIM),
        "nume": meta.get("longName") or meta.get("shortName") or SIM,
        "bursa": meta.get("fullExchangeName") or meta.get("exchangeName"),
        "moneda": meta.get("currency", "USD"),
        "pret": meta.get("regularMarketPrice"),
        "ora_pret": datetime.fromtimestamp(meta.get("regularMarketTime", 0), timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "actualizat": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "coloane": ["data", "deschidere", "maxim", "minim", "inchidere", "volum"],
        "zile": zile,
    }


def main():
    date = transforma(aduce(SIM))
    if len(date["zile"]) < 20:
        sys.exit("Prea puține zile primite (%d); nu suprascriu fișierul." % len(date["zile"]))
    os.makedirs(os.path.dirname(IESIRE), exist_ok=True)
    with open(IESIRE, "w", encoding="utf-8") as f:
        json.dump(date, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    print("Scris %s: %d zile, ultimul preț %s (%s)" % (IESIRE, len(date["zile"]), date["pret"], date["ora_pret"]))


if __name__ == "__main__":
    main()
