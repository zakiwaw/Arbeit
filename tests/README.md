# Browser-Tests (Headless Chrome)

Automatische Prüfungen gegen die laufende App (kein Build nötig). Nicht Teil der App – wird nicht ausgeliefert.

## Voraussetzungen (einmalig)
```bash
# Chromium + puppeteer-core (ohne apt/pip; nur npm)
mkdir -p /tmp/chrome && cd /tmp/chrome && npm pack @sparticuz/chromium@131.0.1 && tar xzf sparticuz-chromium-131.0.1.tgz
cd package && npm install puppeteer-core@23
node -e "require('./build/index.js').executablePath('/tmp/chrome/package/bin')"     # entpackt nach /tmp/chromium
node -e "const z=require('zlib'),f=require('fs');f.writeFileSync('/tmp/chromelibs.tar',z.brotliDecompressSync(f.readFileSync('bin/al2023.tar.br')))"
mkdir -p /tmp/chromelibs && tar xf /tmp/chromelibs.tar -C /tmp/chromelibs
# App lokal ausliefern (im Repo-Root):
python3 -m http.server 8000 --bind 0.0.0.0
```

## Ausführen
```bash
node tests/soundcheck.js      # Töne: wann Fehler-/Nachlieferungs-Ton, parallel, vollständig
node tests/zoomcheck.js       # Browser-Zoom ist unterbunden, Scrollen/Tippen weiterhin möglich
node tests/authcheck.js       # Anmeldung (PIN): Anmeldeseite, Einladungslink, Token je Anfrage, Seite „Mitarbeiter“, Abmelden
node tests/regress.js         # Grundfunktionen: Scan, Batch, Startseite, Unterseiten, Info-Filter
```
Jeder Test endet mit `ALL GOOD` (Exit-Code 0) oder `SOME FAILED` (Exit-Code 1) – Ketten wie `node tests/x.js && git push` brechen bei Fehlern ab.

Umgebungsvariablen: `APP_URL` (Standard `http://127.0.0.1:8000/index.html`), `CHROMIUM`, `PUPPETEER_MODULE`.
