# Anleitung: Automatischen Drive-Import für den Fracht-Tracker einrichten

Diese Anleitung ist für einen Assistenten (KI oder Person), der die Einrichtung **für Zakaria** übernimmt.
Sie ist vollständig – es wird kein weiteres Wissen über die App benötigt.

## Ziel

Der Fracht-Tracker (Web-App) speichert seine Daten über ein **Google Apps Script** (Datei `Code.gs`) in einem Google Sheet.
Ein anderes Skript legt im Google-Drive-Konto **bisbiss1992@gmail.com** im Ordner **„HYDAC TXT“** Textdateien ab
(z. B. `HYDAC_2026-10-22_18-34_Scan.txt`, Inhalt: Länder und 10-stellige Packstücknummern, durch Leerzeilen getrennt).

Nach der Einrichtung liest das Fracht-Tracker-Skript **alle 5 Minuten** automatisch zwei Ordner aus und legt aus jeder
neuen Datei die Aufträge in der App an. Verarbeitete Dateien wandern in den Unterordner „Verarbeitet“, unbrauchbare nach
„Fehler“. Es muss nichts mehr von Hand kopiert werden.

| Drive-Ordner | Dateiformat (wie auf der Seite „Aufträge erfassen“) | Ergebnis in der App |
|---|---|---|
| **HYDAC TXT** | Standard (Leerzeilen): erste Zeile Land/Auftragsnummer, darunter die Packstücknummern | LKW „HYDAC <Datum>“ mit Aufträgen „USA 22.10.“, „CHINA 22.10.“ … |
| **MAN Ladelisten TXT** | MAN Fracht: je Auftrag „Spediteur, Land“ / Rechnung / PLSO / „Pos HU\|Verpackung\|Maße\|Gewicht“ | neuer LKW „MAN <n>“ mit den Rechnungen – genau wie beim QR-Scan |

Ein am Ende angehängter Prüfbericht der KI (ab der Zeile „Abgleichprotokoll“) wird ignoriert.
Weitere Ordner/Formate lassen sich in Code.gs in der Liste `IMPORT_FOLDERS` ergänzen.

## Das brauchst du

- Zugang zum Google-Konto, in dem das **Fracht-Tracker-Skript** liegt (Apps-Script-Projekt mit dem Google Sheet).
- Die neue Skript-Version **Code.gs 2.6** – öffentlich hier:
  - Ansicht: https://github.com/zakiwaw/Arbeit/blob/arena/01a06f82-arbeit/backend/Code.gs
  - Roh-Text zum Kopieren: https://raw.githubusercontent.com/zakiwaw/Arbeit/arena/01a06f82-arbeit/backend/Code.gs

## Schritt 0 – Konto klären (wichtig)

Das Skript sucht die Ordner „HYDAC TXT“ und „MAN Ladelisten TXT“ **im Drive des Kontos, unter dem es läuft**.

1. Öffne https://script.google.com und melde dich mit dem Konto an, in dem das Fracht-Tracker-Projekt liegt.
   (Der Projektname ist der des Skripts, das zum Fracht-Tracker-Sheet gehört. Wenn unklar: Google Sheet des
   Fracht-Trackers öffnen → Menü **Erweiterungen → Apps Script** – das öffnet das richtige Projekt.)
2. Schau oben rechts am Konto-Avatar, **welches Konto** das ist.
   - **Ist es bisbiss1992@gmail.com** → weiter mit Schritt 1, nichts weiter zu beachten.
   - **Ist es ein anderes Konto** → zuerst den Abschnitt „Fall B: anderes Konto“ ganz unten erledigen, dann Schritt 1.

## Schritt 1 – Code.gs ersetzen

1. Im Apps-Script-Projekt links die Datei **Code.gs** öffnen.
2. **Gesamten** Inhalt markieren und löschen.
3. Den **gesamten** Inhalt von Code.gs 2.6 (Roh-Text-Link oben) einfügen.
4. Oben in der Datei prüfen, dass die Zeile `const SPREADSHEET_ID = "1uQJ2nHXyTP5Qen7jMW2UkRitKkqHto0ANg5NrBD1SOs";`
   dieselbe Sheet-ID enthält wie vorher. (Sie ist in der Datei bereits richtig gesetzt. **Nichts anderes ändern.**)
5. Speichern (Diskettensymbol oder Strg+S). Es darf keine rote Fehlermeldung erscheinen.

## Schritt 2 – Import einmalig starten und Berechtigung erteilen

1. Oben in der Werkzeugleiste des Editors im Auswahlfeld der Funktionen **`setupDriveImport`** auswählen.
2. Auf **Ausführen** klicken.
3. Google fragt nach Berechtigungen (neu dazu kommt **Google Drive**):
   **Berechtigungen überprüfen → Konto wählen → „Erweitert“ → „Zu <Projektname> (unsicher)“ → Zulassen.**
   (Die Warnung erscheint, weil es ein eigenes, nicht bei Google eingereichtes Skript ist – das ist normal.)
4. Unten im **Ausführungsprotokoll** muss stehen:
   `Drive-Import eingerichtet: alle 5 Minuten, Ordner: „HYDAC TXT“ (standard), „MAN Ladelisten TXT“ (man).` und danach z. B.
   `Drive-Import: 1 Datei(en), 1 ok, 0 fehlerhaft.`
   - Steht dort `0 Datei(en)` → der Ordner war leer, das ist in Ordnung.
   - Steht im Blatt `_import` (siehe Schritt 4) „Ordner … nicht gefunden“ → das Skript läuft in einem anderen Konto als
     der Ordner → Abschnitt „Fall B“ erledigen und `setupDriveImport` erneut ausführen.

**Hinweis:** `setupDriveImport` verarbeitet sofort alle Dateien, die bereits im Ordner liegen. Sollen alte Dateien
NICHT importiert werden, vorher in einen anderen Ordner verschieben.

## Schritt 3 – Trigger kontrollieren

Links im Editor das **Wecker-Symbol (Trigger)** anklicken. Es muss genau **ein** Trigger stehen:
Funktion `runDriveImport`, Ereignisquelle „Zeitgesteuert“, „Minutentimer“, „alle 5 Minuten“.
Mehr ist nicht nötig – ab jetzt läuft der Import von allein.

## Schritt 4 – Ergebnis prüfen (Abnahme)

1. **Google Drive (bisbiss1992@gmail.com):** In den Ordnern „HYDAC TXT“ bzw. „MAN Ladelisten TXT“ gibt es jetzt den
   Unterordner **„Verarbeitet“**; die importierte Datei liegt dort (ggf. zusätzlich „Fehler“, falls eine Datei unbrauchbar war).
2. **Google Sheet des Fracht-Trackers:** Menü **Ansicht → Ausgeblendete Tabellenblätter → `_import`** einblenden.
   Je Datei steht eine Zeile: Zeitpunkt | Datei | Ergebnis (`ok` / `fehler` / `später`) | Details
   (z. B. „HYDAC 22.10.2026: 5 Auftrag/Aufträge, 20 Packstücke – USA 22.10. (8 Pk.), …“).
3. **App** https://zakiwaw.github.io/Arbeit/ → Kachel **Anlieferung**: LKW **„HYDAC 22.10.2026“** mit 5 Aufträgen
   (`USA 22.10.`, `SOUTH KOREA 22.10.`, `AUSTRALIEN 22.10.`, `KANADA 22.10.`, `CHINA 22.10.`), 20 HUs – bzw. ein neuer LKW
   **„MAN <n>“** mit den Rechnungen der Ladeliste. Auf der LKW-Seite steht „Automatisch übernommen aus „…txt““.

Wenn alle drei Punkte stimmen, ist die Einrichtung abgeschlossen.

## Schritt 5 (empfohlen) – Web-App auf die neue Version stellen

Damit die ausgelieferte Web-App denselben Code hat wie der Editor:
**Bereitstellen → Bereitstellungen verwalten → Stift (Bearbeiten) → Version: „Neue Version“ → Bereitstellen.**
Die Web-App-URL bleibt dabei gleich; in der App muss nichts geändert werden.

## Fall B: Das Skript liegt in einem anderen Konto als der Ordner

Nur nötig, wenn Schritt 0 ein anderes Konto als bisbiss1992@gmail.com ergeben hat.

1. In Google Drive mit **bisbiss1992@gmail.com** anmelden, Ordner „HYDAC TXT“ (und „MAN Ladelisten TXT“) → Rechtsklick → **Freigeben** →
   die E-Mail-Adresse des Skript-Kontos eintragen, Rolle **„Mitbearbeiter“** (nicht „Betrachter“ – das Skript muss
   Unterordner anlegen und Dateien verschieben) → Senden.
2. Den Ordner öffnen und aus der Adresszeile die **Ordner-ID** kopieren:
   `https://drive.google.com/drive/folders/`**`HIER_STEHT_DIE_ID`**
3. In Code.gs (Skript-Konto) im Abschnitt „AUTOMATISCHER IMPORT AUS GOOGLE DRIVE“ in der Liste `IMPORT_FOLDERS` beim
   jeweiligen Ordner `id: ''` ändern zu `id: 'HIER_STEHT_DIE_ID'` (für beide Ordner, falls beide fremd sind) und speichern.
4. Weiter mit Schritt 2 (`setupDriveImport` ausführen).

## Was NICHT getan werden darf

- `SPREADSHEET_ID`, `AUTH_*`-Einstellungen oder andere Teile von Code.gs verändern – nur die Datei komplett durch 2.6 ersetzen
  (und in Fall B die `id`-Einträge in `IMPORT_FOLDERS`).
- Die Ordner „HYDAC TXT“ / „MAN Ladelisten TXT“ öffentlich („Jeder mit dem Link“) freigeben.
- Andere Trigger des Projekts löschen (`setupDriveImport` ersetzt nur seinen eigenen).
- Dateien aus „Verarbeitet“ zurück in „HYDAC TXT“ legen – sie würden erneut importiert (als „… (2)“).

## Störungen / Rückbau

- Eine Datei liegt nach dem Lauf noch im Ordner und im Blatt `_import` steht `später`: vorübergehende Störung
  (z. B. Sperre belegt) – sie wird beim nächsten Lauf erneut versucht, nach 3 Versuchen nach „Fehler“ verschoben.
- Datei im Ordner „Fehler“: Inhalt war nicht lesbar (keine Blöcke „Land + Nummern“). Details stehen in `_import`.
- Ausführungen ansehen: links im Editor das **Listen-Symbol (Ausführungen)** – dort steht jeder Lauf mit Status.
- Import abschalten: Funktion **`removeDriveImport`** einmal ausführen (entfernt nur den Trigger; Dateien und Daten bleiben).
- Intervall ändern: `const IMPORT_EVERY_MINUTES = 5;` auf 1, 10, 15 oder 30 setzen, speichern, `setupDriveImport` erneut ausführen.
