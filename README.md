# Fracht Tracker

Web-App für die Luftfracht-Sicherheitskontrolle im Lager (reglementierter Beauftragter): HAWB-/HU-Nummern scannen,
Kontrollmethode erfassen (XRY, ETD, EDD, PHS, VCK) oder Wareneingang buchen, Batch-Modus für viele Scans hintereinander,
LKW-Anlieferungen (Vorverladelisten VW, MAN-Ladelisten), Dunkelalarm-Übersicht, Sicherungsnachweis als PDF, Anmeldung
mit PIN. Bis zu drei Geräte (Zebra-Scanner, iPhone, PC) arbeiten gleichzeitig auf demselben Datenbestand – gespeichert
in einem Google Sheet über ein Google-Apps-Script. Textdateien aus Google Drive (HYDAC, MAN) werden automatisch als
Aufträge übernommen.

## Live-Stand und Branches

- **Live-Branch: `main`** – GitHub Pages liefert die App aus `main` (https://zakiwaw.github.io/Arbeit/). Seit dem
  Zusammenführen von Pull Request #1 am 09.11.2026 (App 9.2, Code.gs 2.8) ist `main` der aktuelle Stand.
- Gearbeitet wird im Arbeits-Branch `arena/01a06f82-arbeit`; Änderungen gehen per Pull Request nach `main` und sind erst
  nach dem Zusammenführen live. Zusammenführen nur nach Freigabe durch Zakaria.
- Die App braucht **keinen Build-Schritt**: `index.html` öffnen bzw. ausliefern genügt.

## Dateien

| Datei / Ordner | Inhalt |
|---|---|
| `index.html` | Oberfläche (Ansichten, Modals, Seitenmenü), bindet Stylesheet, Bibliotheken und die Skripte aus `js/` ein |
| `js/01-start.js` … `js/10-menue-events-start.js` | App-Logik in 10 Teilen (früher eine Datei `script.js`). Klassische Skripte mit gemeinsamem Geltungsbereich, `index.html` lädt sie in Nummern-Reihenfolge; jeder Teil beginnt mit einer Inhaltsangabe. Teil 01: Version, Einstellungen (`WEB_APP_URL`, `LOCAL_STORAGE_KEY`), DOM-Elemente, Start · 02: Sync + Anmeldung · 03: Töne/Helfer · 04: Sendungsdetails · 05: Liste/Archiv · 06: Seiten/LKW · 07: Import + „Aufträge erfassen“ · 08: Scan/Batch · 09: PDF · 10: Menü, alle Bedienelemente, Start |
| `css/01-grundlagen.css` … `css/06-darkmode-js-klassen.css` | Gestaltung in 6 Teilen (früher `styles.css`; Handy zuerst, Desktop-Ergänzungen ab 992 px in Teil 05, automatischer Dunkelmodus in Teil 06). `index.html` bindet sie in Nummern-Reihenfolge ein |
| `manifest.webmanifest`, `assets/icons/` | Installierbar als App (Startbildschirm, Hochformat) |
| `sw.js` | Service Worker: App-Dateien im Cache, Start ohne Netz (siehe „Offline“) |
| `assets/vendor/` | Lokale Bibliotheken: jsPDF, jsPDF-AutoTable, qrcode.js |
| `assets/*.mp3` | Hinweistöne |
| `backend/Code.gs` | Google-Apps-Script (Server): Sync (Sendungs-Version, Name des letzten Bearbeiters, Konfliktmeldung, Änderungsprotokoll), Archiv, Anmeldung, Drive-Import – siehe `backend/README.md` |
| `backend/ANLEITUNG-Drive-Import.md` | Einrichtung des automatischen Drive-Imports |
| `backend/PROMPT-MAN-Ladeliste.md` | Prompt für den KI-Schritt „MAN-PDF → Textdatei“ |
| `tests/` | Prüfskripte (Node + Chrome), siehe `tests/README.md` |
| `CHANGELOG.md` | Änderungen mit Datum |

## Versionen

Die App-Version steht zentral in `js/01-start.js` (`APP_VERSION`, `APP_VERSION_DATE`, `APP_BACKEND_VERSION`) und wird in der
App angezeigt: auf der Anmeldeseite, unten im Seitenmenü und am Desktop klein neben dem Titel („Version 9.6 · Stand … ·
Server-Skript 2.9“). So sieht man auf jedem Gerät sofort, ob noch eine alte Version offen ist. Bei jeder veröffentlichten
Änderung: Version hochzählen und in `index.html` (`<title>`), `CHANGELOG.md` und `backend/README.md` nachziehen –
`node tests/versioncheck.js` prüft, dass alle Stellen zusammenpassen. Das Server-Skript hat eine eigene Versionszählung
(oben in `backend/Code.gs`).

App 9.6 macht die Batch-Ansicht auf kleinen Bildschirmen kompakter: Status-Zeile mit Hinzufügen-Knopf unter 992 px ausgeblendet
(Scanfeld voll breit), Einstell-Schalter in aufklappbarer Kopfzeile. Mehr vertikaler Platz für die Batch-Liste.
Code.gs bleibt unverändert auf 2.9; keine neue Backend-Bereitstellung oder Skript-Eigenschaft nötig.

## Offline

`sw.js` (Service Worker, registriert in `index.html`) hält alle App-Dateien in einem Cache je Version
(`fracht-tracker-<APP_VERSION>`). Online kommen die Dateien immer vom Server („Netz zuerst“, Zeitlimit 6 s), offline aus
dem Cache – die App startet also auch ohne Netz, inklusive Unterseiten-Adressen (`?seite=…`). Scans ohne Netz werden wie
bisher lokal gespeichert und als unbestätigt vorgemerkt; sobald der Server wieder erreichbar ist, schickt die App sie nach.
Der Service Worker fasst die Aufrufe zum Google-Apps-Script nicht an. Bei einer neuen Version wird der alte Cache
automatisch gelöscht. Prüfung: `node tests/offlinecheck.js`; Handprobe siehe `tests/README.md`.

## Backend bereitstellen (Google Apps Script)

1. Apps-Script-Projekt öffnen (das Projekt, das zum Google Sheet der App gehört).
2. Datei `Code.gs` öffnen, **gesamten Inhalt ersetzen** durch den Inhalt von `backend/Code.gs` aus diesem Repo, speichern.
3. **Bereitstellen → Bereitstellungen verwalten → aktive Web-App bearbeiten (Stift) → Version: „Neue Version“ → Bereitstellen.**
   **Keine neue Bereitstellung anlegen** – sonst ändert sich die Web-App-URL und die App (`WEB_APP_URL` in `js/01-start.js`)
   würde ins Leere laufen.
4. Die App zeigt im Seitenmenü, zu welcher Skript-Version sie gehört; eine ältere Skript-Version meldet bei neuen
   Aktionen „Unbekannte Aktion“ (die App fängt das ab und weist auf die Bereitstellung hin).

Die Tabellen-ID liest das Skript nur aus den **Skript-Eigenschaften** (Projekteinstellungen → Skript-Eigenschaften →
`SPREADSHEET_ID`); fehlt die Eigenschaft, meldet der Code einen klaren Fehler und greift auf keine andere Tabelle zu. IDs, PINs oder Tokens gehören nicht in dieses Repo.

## Tests

Alle Befehle stehen in `tests/README.md`. Kurzfassung:

```
node tests/backendcheck.js      # Server-Skript offline (kein Chrome nötig)
node tests/versioncheck.js      # Versionsangaben passen zusammen (kein Chrome nötig)
node tests/aufbaucheck.js       # js/- und css/-Teile vollständig und in Reihenfolge eingebunden, sw.js lädt alles vor (kein Chrome nötig)
python3 -m http.server 8000     # App lokal ausliefern (für die Chrome-Tests)
node tests/regress.js           # App im Chrome (weitere Suiten siehe tests/README.md)
node tests/offlinecheck.js      # Offline-Start, Scan ohne Netz, Nachschicken (eigener Server auf :8011)
```

GitHub Actions führt bei jedem Push auf `arena/01a06f82-arbeit` (und bei Pull Requests nach `main`) alle Prüfskripte aus
(`.github/workflows/test.yml`, Reiter „Actions“ im Repository): die drei Suiten ohne Chrome und parallel die
Chrome-Suiten mit dem auf dem Runner vorinstallierten Google Chrome. Ein roter Lauf heißt: diesen Stand nicht ausrollen.

Nach jeder Änderung: betroffene Suiten laufen lassen, erst bei „ALL GOOD“ veröffentlichen.
