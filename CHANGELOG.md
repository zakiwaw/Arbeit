# Änderungen

Neueste zuerst. Datum = Veröffentlichung (bis einschließlich 9.2 auf dem Branch `arena/01a06f82-arbeit`, seit dem
Zusammenführen von Pull Request #1 am 09.11.2026 auf `main`). App-Version siehe `js/01-start.js`
(`APP_VERSION`), Server-Skript siehe Kopf von `backend/Code.gs`.

## 2026-11-10 – App 9.5, Code.gs 2.9

Batch-Ansicht fest im Bild: Scanfeld oben, Anzahl und Liste in der Mitte, Notiz-/Ton-/Feedback-Schalter darunter,
Speichern und Leeren unten – jetzt auch am Desktop. Nur Frontend; `backend/Code.gs` bleibt unverändert 2.9,
keine neuen Skript-Eigenschaften, Tabellen- oder Sync-Änderungen.

- `index.html`, `css/02-scan-batch.css`, `css/05-feedback-anmeldung-desktop.css`: eigener Batch-Arbeitsbereich in einer
  auf `100dvh` begrenzten Hauptansicht. Die Liste füllt per Flex-Layout die verbleibende Höhe statt der alten
  65-vh-/560-px-Grenze; Anzahl, Schalter und feste Aktionsleiste werden nicht weggescrollt oder überdeckt. Status und
  Hinzufügen stehen platzsparend nebeneinander; nur im Batch entfallen leere Einzelnotiz-/Kombi-Abstände.
  Außerhalb des Batch-Modus ist die neue Klammer per `display: contents` layoutneutral; Unterseiten bleiben unverändert.
  Desktop-Regeln stehen ausschließlich im Block ab 992 px.
- `js/08-scan-batch.js`: nach einem neuen Scan sofort nach oben zum neuesten Eintrag scrollen. Löschen (weiter mit
  Nachfrage) und Notizänderungen erhalten die manuelle Listenposition. Die doppelte, überschriebene Funktion zum
  Überspringen der Batch-Notiz entfernt; auch dieser Scan-Weg markiert den neuen Eintrag und gibt die Aktionsleiste
  beim Schließen des Dialogs wieder frei.
- `tests/regress.js`: Batch-Geometrie am Handy und Desktop mit vollem/leerem Batch, Seiten- und Listen-Scroll,
  neue Scans, Löschen ohne Scrollsprung, Größenwechsel sowie unveränderte Normalansicht nach dem Ausschalten.
  `tests/desktopcheck.js`: alte Erwartung „Knöpfe in der Karte“ durch feste, hinter den Details verborgene Leiste ersetzt.
- Versionskette auf App 9.5 / Code.gs 2.9 angehoben (`js/01-start.js`, `sw.js`, `<title>`, README-Dateien,
  `tests/versioncheck.js`); Datum 2026-11-10.

## 2026-11-10 – App 9.4, Code.gs 2.9

Die Batch-Liste nutzt den verfügbaren Platz statt eines kleinen 180-px-Fensters. Das Scanfeld bleibt beim Scrollen sichtbar,
die Anzahl steht oberhalb der scrollenden Liste; HU, Zeit, Entfernen und neuer Scan sind optisch klarer. Ablauf und Daten
bleiben unverändert; Handy-Aktionsleiste bleibt bestehen, Desktop-Schaltflächen bleiben in der Karte. Nur Frontend –
`backend/Code.gs` bleibt unverändert auf 2.9.

- `css/02-scan-batch.css`, `css/05-feedback-anmeldung-desktop.css`, `index.html`, `js/08-scan-batch.js`: Batch-Darstellung,
  festes Scanfeld, längerer interner Listen-Scrollbereich, angepinnter Zähler, lesbarere Zeilen und kurzes grünes Aufleuchten
  des neu hinzugekommenen obersten Eintrags. Scan-Reihenfolge, Status, Notizen und Aktionen bleiben gleich.
- Versionskette auf App 9.4 / Code.gs 2.9 angehoben (`js/01-start.js`, `sw.js`, `<title>`, README-Dateien); Datum 2026-11-10.

## 2026-11-10 – App 9.3, Code.gs 2.9

Sichere Mehrgeräte-Synchronisation: Sendungs-Version, Name des letzten Bearbeiters, geordnete Offline-Warteschlange,
Versionsprüfung mit Konfliktmeldung und Änderungsprotokoll. Scan, Batch, PIN-Anmeldung, Menü, Tabelle, Details, Drive-Import,
Dark Mode sowie Handy- und Desktop-Ansicht bleiben wie in 9.2. **Code.gs 2.9 muss vor App 9.3 bereitgestellt sein.**

- `backend/Code.gs` 2.9: `saveShipmentsMerged` prüft je Sendung die mitgeschickte Version (`versions`). Passt sie, wird der
  Stand 1:1 übernommen; passt sie nicht, wird wie bisher feldweise zusammengeführt (`mergeShipment_`) und nur bei wirklich
  umkämpften Feldern (`describeConflict_`) ein Konflikt zurückgegeben (`conflicts`: Sendung, Server-Version, wer, welche Felder,
  was jetzt gilt). Jede gespeicherte Sendung erhält `version` (+1 je Speichern), `lastModifiedBy` (Name aus der Sitzung) und
  Protokolleinträge `changes` (`appendChange_`, max. 20 je Sendung: Zeit, Benutzer, alter/neuer Status aus
  `shipmentStatusLabel_`, Art neu/Änderung/Konflikt). Wiederholtes Senden desselben Stands ändert nichts
  (`sameShipmentContent_`). Alte Sendungen ohne Version gelten als Version 1 mit leerem Namen (`ensureShipmentMeta_`, auch
  beim Abruf). Sheet: Spalte F = `lastModifiedBy`, JSON-Fortsetzung großer Sendungen ab Spalte G; alte große Zeilen mit
  Fortsetzung ab F erkennt `readRowParts_` (F ist nur dann der Name, wenn B+G… gültiges JSON ergibt) – keine Migration nötig,
  beim nächsten Speichern liegt die Zeile in der neuen Aufteilung. Löschvermerke und Drive-Importe schreiben F ebenfalls;
  Importe tragen `Automatik` als Namen. Ältere Apps ohne `versions` werden wie bisher bedient.
- `js/02-sync-anmeldung.js`: Vorgemerkte Änderungen bilden eine geordnete Warteschlange (`pending.order`, ohne Doppelte, überlebt
  Neustart). Offline (`navigator.onLine === false`) wird nicht gesendet, der Sync-Punkt zeigt „Offline – N Änderungen warten“;
  nach „online“ wird in derselben Reihenfolge weitergesendet (`sendDeletes`/`sendChanges` in Gruppen). Jede Sendung geht mit
  Ausgangsstand, Version (`versions`), Name (`modifiedBy`) und Reihenfolge (`order`) an den Server; der zurückgegebene
  Stand (`merged`) wird übernommen, `conflicts` werden sofort als orangefarbene Meldung gezeigt (`showConflicts`: Sendung,
  wer gleichzeitig geändert hat, welches Feld jetzt welchen Wert hat, gültige Version). Beim Speichern setzt die App lokal
  `lastModifiedBy` auf den angemeldeten Namen, endgültig vergibt ihn der Server.
- Startseite: „Zuletzt bearbeitet“ zeigt unter der Zeit den Namen aus `lastModifiedBy` (`js/05-liste-archiv.js`,
  `.modified-by`; Handy weiterhin 5, Desktop 15 Einträge). Karten- bzw. Zeilenhöhe bleiben gleich (Handy: zweite Zeile im
  Zeit-Feld unterhalb der Icon-Leistenhöhe; Desktop: zwei Zeilen à 12 px in der 36-px-Zeile, Spalte wird nicht breiter).
  Neuer Knopf **Protokoll** neben der Überschrift öffnet das Änderungsprotokoll (`#changeLogModal` in `index.html`,
  `showChangeLog`/`renderChangeLog`/`closeChangeLog` in `js/06-seiten.js`, Ereignisse in `js/10-menue-events-start.js`):
  HAWB, alter Status, neuer Status, Benutzer, Zeit über alle Sendungen, neueste zuerst (max. 150); Tippen auf die HAWB öffnet
  die Sendung. Handy: ein Block je Eintrag, Desktop (ab 992 px): Tabelle in breiterem Fenster. CSS in
  `css/03-liste-seiten.css` und `css/04-details-menue-modals.css`.
- Tests: `tests/backendcheck.js` (Versionsprüfung, Merge ohne/mit Konflikt, Wiederholung, alte Zeile ohne Version, alte große
  Zeile mit Fortsetzung in F/G, Reihenfolge, Löschvermerk mit Name, Status-Kurzform), `tests/synccheck.js` (zwei Geräte mit
  dem echten Code.gs in der Nachbildung – `makeBackend(…, { gas: true })` in `tests/helpers.js`: offline mit `navigator.onLine`,
  zwei Geräte an derselben HAWB ohne und mit Konflikt, Protokoll-Modal, dieselbe neue Sendung auf beiden Geräten,
  verlorene Antwort/Wiederholung, alte Sendung ohne Version, Warteschlange in Reihenfolge), `tests/versioncheck.js`
  (ausdrücklich 9.3 ↔ 2.9), `tests/gas-env.js` (neue Spaltenaufteilung).
- Versionskette: `js/01-start.js`, `sw.js`, `<title>`, `CHANGELOG.md`, `README.md`, `backend/README.md` (Abschnitt „Version 2.9“).

## 2026-11-09 – App 9.2, Code.gs 2.8

Desktop-Ansicht feiner und kompakter (nur CSS, nur ab 992 px Breite; Handy/Zebra unverändert).

- `css/05-feedback-anmeldung-desktop.css`: Abschnitt „Feiner am Schreibtisch“ im Desktop-Block. Grundschrift 16 → 14 px (alle Schrift-Stufen eine Stufe kleiner, Zeilenabstand 1,4), Bedienhöhe `--control-h` 46 → 38 px (Status-Auswahl, „Hinzufügen“, Notiz-Knopf, sonstige Eingaben), Scanfeld 56 → 44 px bei 16 px Monospace-Schrift (Umschalter/Leeren-Knopf passend kleiner, Verhalten unverändert), Scanbereich mit 12 px Abständen, App-Leiste und Seitenkopf 61 → 49 px (Menü-/Zurück-Knopf 40 px, Titel und Version bleiben sichtbar), Startseiten-Kacheln 132 → 99 px (kleineres Symbol, kleinere Schrift, weniger Innenabstand), `.container` innen 12/16 px statt 20 px (max. 1280 px bleibt). Klebende Tabellenköpfe und das Filterfeld der Info-Seite auf die niedrigere Leiste nachgezogen (48/60 px).
- Die dichte Sendungs- und Packstücktabelle behält ihre bisherigen Werte (36 px Zeilen, 14 px) – die alten Schrift-Stufen sind dort lokal wiederhergestellt.
- Keine Änderung an Scan-Ablauf, Batch, Sync, Anmeldung, Menü, Details oder Backend (Code.gs bleibt 2.8). Auf dem Handy (< 992 px) ist die Darstellung pixelgleich wie in 9.1.

## 2026-11-03 – App 9.1, Code.gs 2.8

Datenschutz: Tabellen-ID nur noch aus der Skript-Eigenschaft, kein fester Rückfall mehr.

- `backend/Code.gs`: fester Rückfall (Tabellen-ID im Code) entfernt. `spreadsheetId_()` liest nur noch die Skript-Eigenschaft `SPREADSHEET_ID`; fehlt sie oder ist sie leer, wirft der Code einen klaren Fehler, statt auf eine andere Tabelle auszuweichen. Die Eigenschaft ist im Projekt gesetzt. Sonst keine Änderung gegenüber 2.7.
- `js/01-start.js`: `APP_BACKEND_VERSION` 2.7 → 2.8.
- `backend/README.md` und `README.md`: Version nachgezogen, Hinweis auf den festen Wert entfernt.
- `tests/backendcheck.js` und `tests/importcheck.js`: Skript-Eigenschaft wird in den Tests gesetzt (wie im echten Projekt); neuer Test: ohne Eigenschaft klarer Fehler statt fester Wert. `tests/gas-env.js`: der feste Wert wird nicht mehr exportiert.
- `backend/ANLEITUNG-Drive-Import.md`: Schritte auf Code.gs 2.8 nachgezogen, Prüfung der Skript-Eigenschaft statt der festen Zeile.

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
