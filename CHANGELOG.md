# Änderungen

Neueste zuerst. Datum = Veröffentlichung auf dem Live-Branch `arena/01a06f82-arbeit`. App-Version siehe `js/01-start.js`
(`APP_VERSION`), Server-Skript siehe Kopf von `backend/Code.gs`.

## 2026-11-03 – App 9.1, Code.gs 2.7

Langfristige Nutzbarkeit (Phasen 2–4 des Auftrags vom 3.11.2026); Server-Skript unverändert 2.7 (nur Kommentare).

- `script.js` (488 KB, eine Datei) in 10 Teile `js/01-start.js` … `js/10-menue-events-start.js` aufgeteilt – reine
  Aufteilung in Originalreihenfolge, kein Code verschoben oder geändert; die bisherige `DOMContentLoaded`-Klammer
  entfällt (die Skripte stehen jetzt ganz am Ende von `index.html`, nach allen Elementen). Statische Prüfung: kein Teil
  greift beim Laden auf Funktionen eines späteren Teils zu, keine Namenskollision mit `window`. Alter auskommentierter
  Block „Screen Orientation Lock“ am Dateiende entfernt. `tests/zoomcheck.js`, `versioncheck.js`, `offlinecheck.js`
  lesen jetzt `js/01-start.js`; `sw.js` lädt alle Teile vor.
- `styles.css` (145 KB) an den vorhandenen Abschnittsgrenzen in 6 Teile `css/01-grundlagen.css` …
  `css/06-darkmode-js-klassen.css` aufgeteilt (Regeln und Reihenfolge unverändert, nur Kopfkommentare ergänzt);
  `index.html` bindet sie nacheinander ein, `sw.js` lädt sie vor.
- `backend/Code.gs`: Inhaltsverzeichnis im Kopf und durchnummerierte Abschnitte 1–12 (nur Kommentare, kein Code
  geändert – bleibt Code.gs 2.7). Hinweis im Abschnitt 10: `sendPdfEmail` wird von der App nicht mehr aufgerufen.
- Neuer Test `tests/aufbaucheck.js` (ohne Chrome): Teile vollständig und in Reihenfolge eingebunden, Skripte am Ende
  von `index.html`, Kopfkommentare, `sw.js` lädt alle lokalen Dateien vor, Code.gs-Abschnitte und Aktionen.
- GitHub Actions `.github/workflows/test.yml`: bei jedem Push auf `arena/01a06f82-arbeit` laufen alle Prüfskripte
  (ohne Chrome: versioncheck, aufbaucheck, backendcheck; im Chrome des Runners: alle übrigen Suiten). Kein
  `package.json` nötig – puppeteer-core wird außerhalb des Repos installiert. `tests/helpers.js`: mit `CHROMIUM`
  (normaler Chrome) ohne `--single-process`.
- Offline startbar: Service Worker `sw.js` (registriert in `index.html`) lädt alle App-Dateien in einen Cache je Version
  vor; online „Netz zuerst“ (Zeitlimit 6 s), ohne Netz aus dem Cache; alter Cache wird bei neuer Version gelöscht; Aufrufe
  zum Apps-Script bleiben unberührt (Offline-Puffer für Scans arbeitet wie bisher). Prüfung `tests/offlinecheck.js`
  (eigener Server auf :8011); Chrome-Tests schalten den Service Worker sonst ab (`openApp`).
- `tests/synccheck.js`: Zwischenstand „Server lehnt ab“ nicht mehr von der Abruf-Phase abhängig (Test war gelegentlich rot,
  die App nicht).

## 2026-11-03 – App 9.0, Code.gs 2.7

Bestandsaufnahme (Phase 1 des Auftrags).

- README im Hauptordner (Zweck, Live-Branch, Dateien, Backend bereitstellen, Tests) und dieses Änderungsprotokoll.
- Version sichtbar: `APP_VERSION` / `APP_VERSION_DATE` / `APP_BACKEND_VERSION` (damals `script.js`, heute `js/01-start.js`); Anzeige auf der
  Anmeldeseite, unten im Seitenmenü („Version 9.0 · Stand … · Server-Skript 2.7“) und am Desktop klein neben dem Titel
  (auf dem Handy fehlt neben dem Titel der Platz); `<title>` von „V8.18 - Refactored“ auf „Fracht Tracker 9.0“.
  Prüfung `tests/versioncheck.js`.
- Sync-Intervall geprüft: Code und `backend/README.md` sagen 3 s (Abruf pausiert, solange die App nicht sichtbar ist);
  die Angabe „15 s“ im Text von PR #1 war veraltet und wurde korrigiert. Code unverändert.
- Sicherheit geprüft: jede Daten-Aktion verlangt ein Sitzungs-Token (`verifySession_`), öffentlich sind nur
  `authUsers`/`authLogin`/`authAccept`/`authInviteInfo`; kein `doGet`. Sheet-ID aus `backend/README.md` entfernt;
  Code.gs 2.7 liest sie bevorzugt aus der Skript-Eigenschaft `SPREADSHEET_ID` (fester Wert bleibt als Rückfall).

## Davor (Auszug, Details in der Git-Historie)

- 2026-10-28 – Drive-Import 2.6: Ordner „MAN Ladelisten TXT“ (Format MAN Fracht), Prompt für den KI-Schritt.
- 2026-10-22/25 – Automatischer Import aus dem Drive-Ordner „HYDAC TXT“ (Code.gs 2.5), Anleitung, Härtung.
- 2026-10-18 – Löschen/Deaktivieren mehrgerätesicher (Code.gs 2.4, Sammel-Löschung).
- 2026-10-14/17 – LKW-Seite mit ⋮-Menü, „Aufträge erfassen“-Feinschliff, Seitenmenü aufgeräumt.
- 2026-09-24 – Als App installierbar (Manifest, Symbole, Hochformat).
- 2026-09-18 – Seite „Aufträge erfassen“ (MAN Fracht / Vorverladeliste / Standard).
- 2026-09-10 – Anmeldung mit PIN (Code.gs 2.2/2.3), Sicherungsnachweis-PDF verschlankt.
- 2026-09-05 – Pull Request #1: Stabilität, neues Design, Mehrgeräte-Sync (Code.gs 2.0/2.1, Archiv).
