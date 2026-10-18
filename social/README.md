# Postări automate Instagram + Facebook

- Claude pune fiecare postare aprobată de Paul în `social/coada/AAAA-LL-ZZ_nume/` (`poza.jpg` + `text.txt`).
- Acțiunea GitHub „Postare social” o mută în `social/postate/` și trimite poza și textul la scenariul Make.com, care publică pe Instagram și Facebook.
- Secret necesar în GitHub: `MAKE_WEBHOOK_URL` (adresa webhook-ului din Make).
