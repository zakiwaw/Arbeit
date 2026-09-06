# Backend (Google Apps Script)

`Code.gs` ist das Server-Skript, das die App unter `WEB_APP_URL` (in `script.js`) anspricht.
Es liest und schreibt das Google Sheet `1uQJ2nHXyTP5Qen7jMW2UkRitKkqHto0ANg5NrBD1SOs`.

## Version 2 – Mehrgeräte-Sync

Bis V1 hat jedes Gerät bei jedem Scan **den kompletten Datensatz** geschickt und der Server hat alle
Zeilen gelöscht und neu geschrieben. Zwei Geräte gleichzeitig → das langsamere überschreibt die Scans
des anderen („last writer wins“).

V2 ändert das:

| Aktion | Zweck |
|---|---|
| `saveShipments` | Gerät schickt **nur die geänderten Sendungen** plus den Serverstand, von dem es ausging. Der Server führt zusammen (3-Wege-Merge) und antwortet mit dem gemeinsamen Stand. Läuft unter `LockService`-Sperre. |
| `loadChanges` | Gerät holt **nur die Änderungen seit Version X** (alle 3 s, beim Zurückkehren in den Vordergrund, bei „online“). „Nichts Neues“ wird aus dem Script-Cache beantwortet, ohne die Tabelle zu öffnen. Liefert auch den LKW-Status mit; archivierte Sendungen werden nicht ausgeliefert (siehe Archiv). |
| `searchArchive` | Archivsuche (siehe Abschnitt Archiv). |
| `deleteShipment` | Löschung als Markierung (Tombstone, Spalte E = TRUE), damit andere Geräte die Sendung nicht wiederbeleben. |
| `loadAllData`, `saveAllData`, `clearAllData`, `sendPdfEmail`, `saveLkwStatus`, `loadLkwStatus` | Wie bisher – `saveAllData` läuft jetzt ebenfalls durch den Merge, ein altes Gerät kann also nichts mehr überschreiben. |

Nicht im Skript enthalten: `shipmentComplete` (Abschluss-Benachrichtigung) und `sendSummaryEmail`. Die App wertet die
Antwort „Unbekannte Aktion“ auf `shipmentComplete` **nicht** als Fehler – die Scans sind zu dem Zeitpunkt längst über
`saveShipments` gespeichert, es entfällt nur die Zusatz-Benachrichtigung. Soll beim Abschluss einer Sendung wirklich eine
E-Mail verschickt werden, muss dafür ein `case "shipmentComplete"` mit `MailApp.sendEmail(...)` ergänzt werden.

Merge-Regeln (je Scan-Eintrag, identifiziert über eine stabile `id`):
- Einträge beider Seiten bleiben erhalten; nur was ein Gerät **selbst** geändert hat, setzt sich durch.
- **Storno geht nie verloren** (ein Gerät, das das Storno noch nicht kannte, kann es nicht aufheben).
- Notizen werden vereinigt; bewusst gelöschte Notizen bleiben gelöscht.
- Eine gelöschte Sendung bleibt gelöscht, auch wenn ein anderes Gerät kurz danach noch einen alten Stand schickt.

Sheet-Layout `shipments`: A = Sendungsnummer, B = JSON (wie bisher), **neu:** C = Version, D = geändert am,
E = gelöscht, F… = Fortsetzung des JSON bei sehr großen Sendungen (eine Zelle fasst max. 50.000 Zeichen –
ein großer VVL-Import würde sonst nicht gespeichert). Alte Zeilen ohne C–E funktionieren weiterhin.
Das Sheet `_meta` (ausgeblendet) hält den globalen Versionszähler in A1 und wird automatisch angelegt.

## Version 2.1 – Archiv

Ab einigen hundert Sendungen wurde die App langsam, weil **jedes Gerät immer den kompletten Bestand** hielt
(Laden, Speicherplatz auf dem Handy – Safari erlaubt nur ca. 5 MB). Deshalb legt der Server fertige, alte Sendungen
jetzt ins **Archiv**: Sie bleiben vollständig im Sheet `shipments` (nichts wird gelöscht), bekommen in Spalte E die
Markierung `ARCHIV` und werden **nicht mehr an die Geräte ausgeliefert**. Die App hält nur noch den laufenden Bestand.

Wann wird archiviert (Durchlauf höchstens alle 6 h, ausgelöst durch einen normalen Abruf)?

| Sendungsart | Bedingung |
|---|---|
| Einzelsendung (ohne LKW) | **vollständig erfasst** (Sicherungen ggf. + Dunkelalarm = erwartete Stückzahl) **und 7 Tage** keine Änderung. Ohne erwartete Stückzahl („N/A“) nie automatisch. |
| LKW-Sendung (VVL / MAN, HU-Liste) | **erst wenn der LKW im Menü deaktiviert wurde**, und das ist 7 Tage her (bzw. die letzte Änderung – was später war). Ob alle Positionen gescannt sind, spielt keine Rolle. Solange die Frist läuft, steht der LKW noch im Menü und kann wieder eingeschaltet werden. |

Damit ein später neu importierter LKW mit gleichem Namen nicht sofort als „deaktiviert“ gilt, räumt der Durchlauf
`lkw_status`-Einträge auf, zu denen keine aktive Sendung mehr gehört. Der Zeitpunkt der Deaktivierung wird in
`lkw_status!B1` mitgeführt (automatisch).

In der App:
- Suchfeld zeigt unter der Liste **„Im Archiv: N Sendungen anzeigen“** (Nummer bekannt) bzw. **„Im Archiv suchen“**
  (kein lokaler Treffer, z. B. HU/VSE-Nummer oder Notiztext). Treffer erscheinen als eigener Block, gekennzeichnet
  mit „Archiv“; Antippen öffnet die Details **nur lesend**, PDF geht weiterhin.
- **Wiederherstellen** (Knopf) holt die Sendung zurück in die Liste; ein zugehöriger deaktivierter LKW wird dabei
  wieder aktiviert. **Ein Scan auf eine archivierte Nummer** (einzeln oder im Batch) holt sie automatisch zurück und
  verbucht den Scan ganz normal – es entsteht keine zweite Sendung mit gleicher Nummer.
- Sobald ein Gerät eine archivierte Sendung speichert, schreibt `saveShipments` die Zeile **ohne** Markierung zurück:
  auf allen Geräten wieder aktiv. Umgekehrt melden `loadChanges`-Antworten neu archivierte Nummern (`archived`), damit
  die Geräte sie ablegen; der Komplettabruf liefert zusätzlich die Liste aller archivierten Nummern (`archivedBases`).
- Importe (HU-Liste, Multi-QR, VVL) legen bei einer archivierten Nummer keinen Auftrag *unter derselben Nummer* an
  (Kollision mit alten HUs), sondern `NUMMER (2)` – wie bisher bei doppelten Kundennummern verschiedener VVLs.

Neue Aktion: `searchArchive` mit `{ bases: [...] }` (bestimmte Nummern), `{ query, mode: 'prefix' }` (wie die Suche
in der App, max. 50 Treffer, neueste zuerst), `{ query, mode: 'vvl' }` (alle Aufträge einer Vorverladeliste) oder
`{ query, mode: 'truck' }` (alle Aufträge eines LKW).

Von Hand im Skript-Editor: `runArchiveSweep()` führt den Durchlauf sofort aus (z. B. direkt nach der Bereitstellung).
Einstellungen oben in `Code.gs`: `ARCHIVE_AFTER_DAYS`, `ARCHIVE_LKW_AFTER_DAYS`, `ARCHIVE_SWEEP_INTERVAL_MS`.

Solange das alte Skript läuft, arbeitet die App ohne Archiv (alles bleibt in der Liste); beim Versuch einer
Archivsuche erscheint der Hinweis, das Skript neu bereitzustellen.

## Startseite (Kacheln) – nur App, keine Server-Änderung

Unter der Scan-Box zeigt die App eine Startseite: Suchfeld und vier Kacheln **Anlieferung** (LKW → seine
Sendungen), **Dunkelalarm**, **Offene Sendungen**, **Info** (Suche mit Filtern Status / LKW / Zeitraum, optional
inkl. Archiv über `searchArchive`). Die Liste darunter zeigt ohne Suchtext nur die **5 zuletzt bearbeiteten** Sendungen
(„Weitere anzeigen“ für den Rest); tippt man ins Scan-Feld, erscheinen die Treffer. Die Unterseiten sind keine
Modals: sie liegen im Browser-Verlauf, die **Zurück-Geste/-Taste** schließt sie (ebenso die Detailansicht).
Scan-Box, Batch-Modus und Sync laufen auf jeder Seite unverändert weiter.

## Neue Version bereitstellen (gleiche URL bleibt gültig)

1. <https://script.google.com> öffnen → das Projekt des Fracht Trackers öffnen.
2. Inhalt von `Code.gs` **komplett** durch den Inhalt dieser Datei ersetzen → speichern (💾).
3. Oben rechts **Bereitstellen → Bereitstellungen verwalten**.
4. Bei der aktiven Web-App auf ✏️ **Bearbeiten**, unter „Version“ **Neue Version** wählen → **Bereitstellen**.
   (Nicht „Neue Bereitstellung“ – das würde eine neue URL erzeugen.)
5. Fertig. Die URL in `script.js` bleibt unverändert.

Falls doch eine **neue Bereitstellung** entstanden ist (neue ID), die neue Web-App-URL in `script.js` bei
`const WEB_APP_URL = …` eintragen. Die zweite Konstante `WEB_APP_URL_BACKEND` (PDF-Mail-Versand) ist eine
andere Bereitstellung und bleibt unberührt.

Prüfen: App auf zwei Geräten öffnen, auf Gerät A scannen → nach spätestens ~3 s erscheint der Scan auf
Gerät B ohne Neuladen. Der Sync-Punkt in der Kopfzeile ist grün.

Solange das alte Skript noch läuft, zeigt die neue App den Hinweis „Server-Skript ist veraltet …“ und
arbeitet wie bisher (kompletter Datensatz, kein Mehrgeräte-Schutz).

## Auslegung

Abgestimmt auf **bis zu 3 Geräte gleichzeitig** mit einem Abruf **alle 3 s** je sichtbarem Gerät (max. 60 Anfragen/Minute).
Damit das nicht teuer wird, beantwortet der Server die häufige Frage „gibt es etwas Neues?" aus dem
**Script-Cache** (Versionszähler + LKW-Status), ohne die Tabelle zu öffnen – erst wenn wirklich etwas geändert
wurde, wird das Sheet gelesen. Der Cache wird bei jedem Schreibvorgang unter Sperre aktualisiert und läuft nach
30 s ab (`CACHE_TTL_S`), sodass ein veralteter Eintrag höchstens 30 s verzögern könnte.

Auf dem Gerät: im Hintergrund kein Abruf; beim Zurückkehren/„online" sofort; bei Verbindungsfehlern
verlangsamt sich der Takt schrittweise (3 → 6 → 12 → 24 → 30 s) und springt beim nächsten Erfolg zurück.
Bei deutlich mehr Geräten `SYNC_POLL_INTERVAL_MS` in `script.js` erhöhen.

## Optional: Aufräumen

`purgeDeletedRows()` im Skript-Editor manuell ausführen, um Lösch-Markierungen physisch aus dem Sheet zu entfernen.
Archivierte Zeilen (`ARCHIV`) bleiben davon unberührt – sie werden nie automatisch gelöscht.
