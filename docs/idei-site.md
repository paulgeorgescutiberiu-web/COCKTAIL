# Idei pentru site (de revenit)

Analiză din 30 oct 2026, după lansarea site-ului nou (`site-nou/`). În ordinea importanței:

1. **Previzualizare la linkuri (Open Graph)**: poză + titlu pe fiecare pagină, ca linkurile trimise pe WhatsApp/Facebook să arate bine.
2. **Fișa firmei pentru Google (schema LocalBusiness + canonical)**: adresă, telefon, zonă, notă, întrebări frecvente.
3. **Măsurarea cererilor**: evenimente Analytics la apăsarea pe WhatsApp și telefon (formularul are deja); Meta Pixel dacă faci reclame.
4. **Pagină de workshop-uri**: acum cardul duce doar la contact; plus vouchere cadou.
5. **Recenzii pe fiecare pagină**: de la miri pe Nunți, de la firme pe Corporate.
6. **Pagini / secțiune pe locații din Sibiu**: „bar cocktail [locația]”, cu poze.
7. **Verificarea datei pe loc**: site-ul spune dacă data e liberă, din contractele din aplicație (doar liber/ocupat).
8. **Variantă în engleză**: măcar prima pagină și Nunți.
9. **Video scurt** pe prima pagină (canalul YouTube există).

Recomandat: întâi 1, 2, 3 (rapide, nu schimbă aspectul); apoi 7.

## Făcut (4 nov 2026): 1, 2, 3

- **1. Open Graph**: fiecare pagină are imaginea ei 1200×630 (`site-nou/img/og/`), titlu și descriere. Imaginile se refac cu `node tools/og-imagini.js`.
- **2. Fișa firmei pentru Google**: canonical spre cocktailphilosophy.ro, schema LocalBusiness, pagina, firimituri și întrebările frecvente luate din pagină (cu avansul din `preturi.js`).
  Totul e generat de `python3 tools/seo-site.py`: se rulează după ce schimbi un titlu, o descriere, o întrebare sau avansul. Testele te anunță dacă ai uitat.
  Nota de pe Google nu e pusă în schemă, intenționat: Google nu afișează stele din recenziile puse de firmă pe propriul site și le poate considera înșelătoare.
- **3. Măsurarea**: `site-nou/masurare.js` trimite în Google Analytics `click_whatsapp`, `click_telefon`, `click_email`, `click_social`, `click_recenzii`, `descarca_meniu`, `intrebare_citita`, `calculator_folosit` (plus `generate_lead` din formular).

### De făcut o dată în Google Analytics (5 minute)

1. **Admin → Events**: după o zi-două apar evenimentele de mai sus. La `generate_lead`, `click_whatsapp` și `click_telefon` pornește **Mark as key event**.
2. **Admin → Custom definitions → Create custom dimension**: `zona` (unde pe pagină s-a apăsat) și `intrebare` (ce întrebare frecventă se citește), ambele „Event scope”.
3. Verifică previzualizarea linkurilor: lipește adresa în [developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug/) și apasă **Scrape Again**, ca Facebook și WhatsApp să uite poza veche.
4. Verifică datele structurate în [search.google.com/test/rich-results](https://search.google.com/test/rich-results) și cere reindexarea în Search Console.

Scos la cererea lui Paul (30 oct): asistent/chatbot pentru clienți pe site. Paul vrea ca fiecare client să vorbească direct cu echipa, nu cu un robot; site-ul subliniază asta ca avantaj.
