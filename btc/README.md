# Semnal BTC

Aplicație web ușoară (un HTML + un JS, fără dependențe, fără server, fără chei) care dă sugestii **CUMPĂRĂ / VINDE / AȘTEAPTĂ** pentru BTC/USDT, cu probabilitate și cu verificarea fiabilității.

Deschidere: `btc/index.html` (sau `/btc/` pe site). Local: `python3 -m http.server` în rădăcina repo-ului → http://localhost:8000/btc/

## Cum decide
1. Aduce lumânări publice BTC/USDT pentru 1h (2000), 4h și 1d (1000) de la Binance (rezervă: Coinbase).
2. Calculează 12 indicatori: randamente pe 1/5/20 lumânări, distanța față de EMA20/50/200, EMA20 vs EMA50, RSI14, MACD, Bollinger, volum, ATR.
3. Antrenează în browser o regresie logistică: „a crescut prețul după H lumânări?” (1h → 12 ore, 4h → 24 de ore, 1d → 5 zile).
4. **Verificare walk-forward**: de 5 ori învață doar din trecut și e testată pe perioada următoare (cu pauză de H lumânări). Măsoară acuratețea față de referință, Brier skill și o simulare de tranzacționare cu comision 0,1%.
5. Semnalul apare doar dacă modelul a bătut ghicitul pe date nevăzute **și** P(creștere) ≥ 57% sau ≤ 43%. Consensul cere ca intervalele valide să fie de acord.
6. Planul de risc: stop-loss 1,5×ATR, ținte 1,5 și 3×ATR, mărimea poziției după riscul ales (implicit 1% din capital), fără levier.

Include și un portofoliu de exercițiu (10.000 USDT virtuali, salvat în browser).

## Consum
Un preț la 30 s; lumânările se reîmprospătează la 5 min (1h) / 15 min (4h, 1d); calculul durează ~200 ms; totul se oprește cât fila e ascunsă.

## Atenție
Nu e sfat financiar. Pe date reale BTC, de cele mai multe ori modelul **nu** găsește un avantaj statistic, iar aplicația spune asta deschis (AȘTEAPTĂ) în loc să inventeze semnale.

Teste: `node --test tests/btc.test.js`
