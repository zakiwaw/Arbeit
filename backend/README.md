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
| `loadChanges` | Gerät holt **nur die Änderungen seit Version X** (alle 15 s, beim Zurückkehren in den Vordergrund, bei „online“). Liefert auch den LKW-Status mit. |
| `deleteShipment` | Löschung als Markierung (Tombstone, Spalte E = TRUE), damit andere Geräte die Sendung nicht wiederbeleben. |
| `loadAllData`, `saveAllData`, `clearAllData`, `sendPdfEmail`, `saveLkwStatus`, `loadLkwStatus` | Wie bisher – `saveAllData` läuft jetzt ebenfalls durch den Merge, ein altes Gerät kann also nichts mehr überschreiben. |

Merge-Regeln (je Scan-Eintrag, identifiziert über eine stabile `id`):
- Einträge beider Seiten bleiben erhalten; nur was ein Gerät **selbst** geändert hat, setzt sich durch.
- **Storno geht nie verloren** (ein Gerät, das das Storno noch nicht kannte, kann es nicht aufheben).
- Notizen werden vereinigt; bewusst gelöschte Notizen bleiben gelöscht.
- Eine gelöschte Sendung bleibt gelöscht, auch wenn ein anderes Gerät kurz danach noch einen alten Stand schickt.

Sheet-Layout `shipments`: A = Sendungsnummer, B = JSON (wie bisher), **neu:** C = Version, D = geändert am,
E = gelöscht, F… = Fortsetzung des JSON bei sehr großen Sendungen (eine Zelle fasst max. 50.000 Zeichen –
ein großer VVL-Import würde sonst nicht gespeichert). Alte Zeilen ohne C–E funktionieren weiterhin.
Das Sheet `_meta` (ausgeblendet) hält den globalen Versionszähler in A1 und wird automatisch angelegt.

## Neue Version bereitstellen (gleiche URL bleibt gültig)

1. <https://script.google.com> öffnen → das Projekt des Fracht Trackers öffnen.
2. Inhalt von `Code.gs` **komplett** durch den Inhalt dieser Datei ersetzen → speichern (💾).
3. Oben rechts **Bereitstellen → Bereitstellungen verwalten**.
4. Bei der aktiven Web-App auf ✏️ **Bearbeiten**, unter „Version“ **Neue Version** wählen → **Bereitstellen**.
   (Nicht „Neue Bereitstellung“ – das würde eine neue URL erzeugen.)
5. Fertig. Die URL in `script.js` bleibt unverändert.

Prüfen: App auf zwei Geräten öffnen, auf Gerät A scannen → nach spätestens 15 s erscheint der Scan auf
Gerät B ohne Neuladen. Der Sync-Punkt in der Kopfzeile ist grün.

Solange das alte Skript noch läuft, zeigt die neue App den Hinweis „Server-Skript ist veraltet …“ und
arbeitet wie bisher (kompletter Datensatz, kein Mehrgeräte-Schutz).

## Auslegung

Abgestimmt auf **bis zu 3 Geräte gleichzeitig**: Abruf alle 15 s je sichtbarem Gerät → maximal ~12 Anfragen/Minute
insgesamt. Ein Abruf ohne Änderungen liest nur den Versionszähler (kein Sendungs-Sheet), Schreibzugriffe laufen
nacheinander unter Sperre. Apps Script erlaubt 30 gleichzeitige Ausführungen; davon sind wir weit entfernt.
Bei deutlich mehr Geräten `SYNC_POLL_INTERVAL_MS` in `script.js` erhöhen (z. B. 25000).

## Optional: Aufräumen

`purgeDeletedRows()` im Skript-Editor manuell ausführen, um Lösch-Markierungen physisch aus dem Sheet zu entfernen.
