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
node tests/authcheck.js       # Anmeldung (PIN): Anmeldeseite, Einladungslink, Token je Anfrage, Seite „Mitarbeiter“, Abmelden, 30-Min-Abmeldung
node tests/backendcheck.js    # Server-Skript offline (ohne Chrome/Server; Dienste nachgebildet in tests/gas-env.js): Anmeldung, Sammel-Löschung, Drive-Import
node tests/importcheck.js     # Drive-Import Ende-zu-Ende: Code.gs legt aus HYDAC-Textdatei + MAN-Ladeliste Aufträge an → LKW-Seiten, Scan, Herkunftszeile, Desktop-Tabellen
node tests/erfassencheck.js   # Seite „Aufträge erfassen“: Parser = Original-Generator (tests/reference), QR-Inhalt, Direkt anlegen, Scan-Weg
node tests/regress.js         # Grundfunktionen: Scan, Batch, Startseite, Unterseiten, Info-Filter
node tests/synccheck.js       # Sync: Löschen/Deaktivieren bei schnellem Bedienen, langsamen/gestörten Antworten – nichts kommt zurück; Spinner mit Text
node tests/desktopcheck.js    # Desktop-Layout (≥ 992 px): Tabellen, Sendungsdetails, Packstück-Tabelle, Auswahl-Leiste
node tests/versioncheck.js    # Versionsangaben passen zusammen (js/01-start.js, sw.js, index.html, Code.gs, READMEs, CHANGELOG) – ohne Chrome
node tests/aufbaucheck.js     # Aufteilung passt: js/- und css/-Teile vollständig + in Reihenfolge in index.html, Skripte am Ende, sw.js lädt alles vor, Code.gs-Abschnitte – ohne Chrome
node tests/offlinecheck.js    # Offline (Service Worker): Vorladen, Start ohne Netz, Scan offline → Nachschicken, Cache-Wechsel bei neuer Version – eigener Server auf :8011
```
Jeder Test endet mit `ALL GOOD` (Exit-Code 0) oder `SOME FAILED` (Exit-Code 1) – Ketten wie `node tests/x.js && git push` brechen bei Fehlern ab.

Umgebungsvariablen: `APP_URL` (Standard `http://127.0.0.1:8000/index.html`), `CHROMIUM` (Pfad zur Chrome/Chromium-Datei),
`PUPPETEER_MODULE` (Pfad zu `puppeteer-core`). Ohne Chrome laufen `backendcheck.js`, `versioncheck.js` und `aufbaucheck.js`.
In GitHub Actions (`.github/workflows/test.yml`) laufen alle Suiten mit dem auf dem Runner vorinstallierten Chrome.

Service Worker in Tests: `openApp()` entfernt `navigator.serviceWorker` (sonst würde eine Testseite ihn registrieren und
alle weiteren Seiten bekämen Dateien aus dem Cache). Nur `offlinecheck.js` lässt ihn zu (`serviceWorker: true`).

## Offline von Hand prüfen (Handy/Zebra)
1. App online öffnen, kurz warten (der Service Worker lädt die Dateien im Hintergrund vor).
2. Flugmodus ein → App schließen und neu öffnen: sie startet, Sync-Punkt zeigt „Server nicht erreichbar“.
3. Einen Scan buchen → erscheint in der Liste; Sync-Anzeige meldet unbestätigte Änderung.
4. Flugmodus aus → nach wenigen Sekunden ist der Scan auf dem Server (anderes Gerät zeigt ihn an).

## Werkzeuge (keine Tests)
```bash
node tests/tools/nachweis-samples.js /tmp   # Beispiel-Sicherungsnachweise (VW 20 Packstücke, MAN) → /tmp/vw.pdf, /tmp/man.pdf
node tests/tools/pdfshot.js /tmp/vw.pdf .arena-shots/nachweis-vw 3   # PDF-Seiten als PNG (pdf.js im Headless-Chrome)
node tests/tools/make-icons.js   # App-Symbole (assets/icons/*.png) aus dem Barcode-Zeichen neu rendern (nur nach Design-Änderung nötig)
```
`pdfshot.js` braucht `.arena-shots/pdfjs/pdf.mjs` + `pdf.worker.mjs` (aus `npm pack pdfjs-dist@4`, Ordner `build/`) und den Server auf :8000.

`tests/reference/multi-auftrag-qr-generator.html` ist der frühere externe „Multi-Auftrag QR-Code Generator“ – Referenz für den QR-Inhalt (erfassencheck führt seine Parser mit aus und vergleicht).
