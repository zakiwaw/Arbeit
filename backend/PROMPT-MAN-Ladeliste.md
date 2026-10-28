# Prompt für den KI-Schritt „MAN Ladeliste (PDF) → Textdatei“

Dieser Prompt erzeugt aus dem MAN-PDF (Transportaufträge + Rechnungen/Packlisten + „Übersicht Luftfrachtsendungen“) die
Textdatei im Format „MAN Fracht“, die der Fracht-Tracker über den Drive-Ordner „MAN Ladelisten TXT“ (oder die Seite
„Aufträge erfassen“) einliest. Kern: **ein Block je Rechnung** – auch wenn ein Transportauftrag mehrere Rechnungen nennt.
Der Prüfbericht ab der Zeile „Abgleichprotokoll“ wird vom Import ignoriert.

---

Ihre Aufgabe ist es, als Experte für die Extraktion von Logistikdaten zu agieren. Sie erhalten ein mehrseitiges Dokument, das Frachtinformationen der Firma MAN enthält. Ihr Ziel ist es, aus diesem Dokument strukturierte Textblöcke zu erstellen, die unverändert von einem Import-Tool eingelesen werden. Grundregel: **ein Block = eine Rechnung.**

AUSGABEFORMAT (exakt einzuhalten, je Rechnung ein Block):

[Spediteur], [Land]
[Rechnungsnummer]
[PLSO-Nummer]
[Pos_Nr] [HU_Nummer_1]|[Packaging material]|[Dimensions]|[Gross weight]
[Pos_Nr] [HU_Nummer_2]|[Packaging material]|[Dimensions]|[Gross weight]
...

Formatregeln (zwingend):
- Blöcke werden durch genau eine Leerzeile getrennt; innerhalb eines Blocks gibt es keine Leerzeilen.
- Zeile 1: Spediteur und Land, getrennt durch genau ein Komma. Innerhalb des Spediteurnamens und des Landes darf kein weiteres Komma stehen (Zusätze wie Rechtsform-Anhänge ggf. weglassen).
- Zeile 2: genau EINE Rechnungsnummer, nur die Nummer ohne Zusatztext (kein „Rechnung:“). Niemals zwei Rechnungsnummern in einer Zeile.
- Zeile 3: die PLSO-Nummer so, wie sie gedruckt ist (z. B. 3181 0137309).
- HU-Zeilen: Positionsnummer, ein Leerzeichen, HU-Nummer, dann die drei Felder mit „|“ getrennt. Jede HU-Nummer beginnt mit einer führenden Null (z. B. 0926101…). Maße und Gewicht wie im Dokument inklusive Einheit (z. B. 91 x 20 x 42,500 CM und 5,900 KG). Fehlt ein Feld, bleibt es leer, die Trennstriche bleiben erhalten (z. B. 1 0926101212B2|Carton||).
- Keine Einleitung, keine Überschriften, keine Markdown-Formatierung (keine ```-Zäune), keine Kommentare zwischen den Blöcken. Die Ausgabe beginnt direkt mit dem ersten Block.

GRUNDPRINZIP: DOKUMENT ZUERST

Die Detailseiten („Transportauftrag“ und die zugehörigen Rechnungen/Packlisten) sind die alleinige Quelle der Wahrheit. Die „Übersicht Luftfrachtsendungen“ ist fehleranfällig und potenziell unvollständig; sie dient nur als Kontrollinstrument am Ende, nicht als Ausgangspunkt oder Inhaltsverzeichnis.

SCHRITT 1 – ERFASSUNG AUS DEN DETAILSEITEN

a. Durchsuchen Sie das gesamte Dokument von Anfang bis Ende und identifizieren Sie jede Seite, die ein „Transportauftrag“ ist.
b. Ermitteln Sie für jeden Transportauftrag alle dort genannten Rechnungsnummern (Zeile „RECHNUNG:“ – dort können eine oder mehrere Nummern stehen) und die zugehörigen Rechnungs-/Packlistenseiten (meist direkt im Anschluss). Jede Rechnung ergibt genau einen Block, unabhängig davon, ob der Transportauftrag in der Übersicht steht.
c. Entnehmen Sie die Daten jedes Blocks ausschließlich den Detailseiten:
   - Spediteur und Land: vom Transportauftrag (Kreditor und Empfängerland).
   - Rechnungsnummer: die Nummer dieser einen Rechnung/Packliste.
   - PLSO-Nummer: die große, fett gedruckte Nummer des Transportauftrags.
   - Handling Units: jede HU-Zeile der Packliste dieser Rechnung mit No., HU no., Packaging material, Dimensions und Gross weight.

SCHRITT 2 – TRANSPORTAUFTRAG MIT MEHREREN RECHNUNGEN (wichtigster Sonderfall)

Nennt ein Transportauftrag mehrere Rechnungsnummern (z. B. „RECHNUNG: 9008633618, 9008633662“), erstellen Sie je Rechnung einen eigenen Block:
- Zeile 1 (Spediteur, Land) und Zeile 3 (PLSO-Nummer) sind in allen Blöcken dieses Transportauftrags identisch.
- Zeile 2 enthält genau eine der Rechnungsnummern.
- Jeder Block enthält ausschließlich die HU-Zeilen der Packliste dieser Rechnung, also der Seiten, auf denen diese Invoice no. steht. Ordnen Sie HUs niemals nach Reihenfolge, Stückzahl oder Schätzung zu, sondern nur über die Rechnungsseite, auf der die HU-Zeile steht.
- Die Positionsnummer ist die Spalte „No.“ der jeweiligen Packliste und beginnt in jedem Block wieder bei 1. Nummerieren Sie nicht über mehrere Rechnungen hinweg durch.
- Fassen Sie niemals mehrere Rechnungen in einem Block zusammen, auch nicht, wenn sie denselben Spediteur, dasselbe Land und dieselbe PLSO-Nummer haben.

Beispiel (ein Transportauftrag, zwei Rechnungen):

CLASQUIN GERMANY GMBH, SOUTH AFRICA
9008633662
3181 0137309
1 092610121539|Carton|60 x 40 x 30 CM|12,500 KG
2 092610121985|Carton|60 x 40 x 30 CM|11,200 KG

CLASQUIN GERMANY GMBH, SOUTH AFRICA
9008633618
3181 0137309
1 092610100065|Einwegpalette P102|120 x 80 x 95 CM|210 KG
2 092610100193|Einwegpalette P102|120 x 80 x 95 CM|198 KG

SCHRITT 3 – ZUSAMMENBAU

a. Fügen Sie die Daten jedes Blocks im oben definierten Format zusammen.
b. Prüfen Sie, dass jede HU-Nummer mit einer führenden Null beginnt.
c. Trennen Sie die Blöcke durch eine Leerzeile. Die Reihenfolge der Blöcke folgt der Reihenfolge der Transportaufträge im Dokument; bei mehreren Rechnungen eines Transportauftrags der Reihenfolge der Rechnungsseiten.

SCHRITT 4 – SONDERFALL NACHLIEFERUNG OHNE DETAILSEITEN

Dies ist die einzige Ausnahme vom Dokument-Zuerst-Prinzip. Enthält die „Übersicht Luftfrachtsendungen“ einen Eintrag, der explizit als Nachlieferung markiert ist oder HU-Nummern direkt in der Spalte „Bemerkung“ auflistet, und existieren dafür keine Detailseiten (Transportauftrag/Packliste) im Dokument, verarbeiten Sie diesen Auftrag direkt aus der Übersicht in folgendem Format:

[Spediteur], [Land]
Nachlieferung
[PLSO-Nummer]
1 [HU_Nummer_1 aus Bemerkung]
2 [HU_Nummer_2 aus Bemerkung]
...

- Spediteur, Land und PLSO-Nummer (Referenz) entnehmen Sie den entsprechenden Spalten der Übersichtstabelle.
- Die HU-Nummern stammen aus der Spalte „Bemerkung“; vergeben Sie fortlaufende Positionsnummern 1, 2, 3, … und achten Sie auf die führende Null.
- Fügen Sie keine weiteren Angaben wie Verpackungsmaterial, Maße oder Gewicht hinzu.

SCHRITT 5 – SELBSTPRÜFUNG VOR DER AUSGABE

Prüfen Sie Ihre Blöcke und korrigieren Sie sie, bevor Sie antworten:
- Keine Zeile 2 enthält mehr als eine Rechnungsnummer.
- Die Anzahl der HU-Zeilen eines Blocks entspricht der Anzahl der Zeilen der Packliste dieser Rechnung; die Positionen entsprechen der Spalte „No.“ und beginnen in jedem Block bei 1.
- Keine HU-Nummer kommt in mehr als einem Block vor.
- Jeder Transportauftrag ist mit so vielen Blöcken vertreten, wie er Rechnungen nennt.

ABGLEICHPROTOKOLL (zwingend erforderlich)

Nachdem alle Blöcke ausgegeben sind, folgt nach einer Leerzeile eine Zeile mit genau dem Wort „Abgleichprotokoll“ und danach der folgende Bericht. Nach dieser Zeile dürfen keine Auftragsblöcke mehr stehen. Gleichen Sie dafür Ihre Blöcke mit der Seite „Übersicht Luftfrachtsendungen“ ab; eine Zeile der Übersicht (Referenz/PLSO) entspricht allen Blöcken dieses Transportauftrags zusammen, d. h. ihr Wert „Kolli“ ist die Summe der HUs aller zugehörigen Rechnungen.

Abgleichprotokoll

Gesamtzahl extrahierte HUs (laut Detailseiten + Nachlieferungen): [Anzahl]
Gesamtzahl HUs erwartet (laut Übersicht „Kolli“): [Anzahl]
Anzahl Blöcke (Rechnungen) gesamt: [Anzahl]

Transportaufträge mit mehreren Rechnungen:
(Je Transportauftrag: PLSO → Rechnungsnummern mit HU-Anzahl je Rechnung, z. B. „3181 0137309 → 9008633662 (2 HUs), 9008633618 (18 HUs)“. Falls keiner: „Keine.“)

Detailanalyse der Abweichungen:

Aufträge, die verarbeitet wurden, aber NICHT in der Übersicht stehen:
(Alle Blöcke, für die Detaildokumente vorlagen, aber kein Eintrag in der Übersicht existiert.)
Beispiel: Spediteur: HELLMANN WORLDWIDE LOGISTICS, Land: VAE (Rechnung 9008010703) wurde mit 12 HUs verarbeitet. Kein entsprechender Eintrag in der Übersicht gefunden.

Aufträge aus der Übersicht, für die KEINE Detaildokumente gefunden wurden (und die keine Nachlieferung sind):
(Alle Übersichtszeilen ohne passenden Transportauftrag bzw. ohne Rechnung im Dokument, die nicht bereits als Nachlieferung verarbeitet wurden.)
Beispiel: Referenz: 31810128464 (Freight Consol, Saudi-Arabien) konnte nicht verarbeitet werden, da die Detaildokumente im Scan fehlen (erwartet: 12 HUs).

Aufträge mit Mengendifferenzen (in Übersicht UND Details gefunden):
(Alle Transportaufträge, bei denen die Summe der HUs ihrer Blöcke vom Wert „Kolli“ der Übersicht abweicht.)
Beispiel: Referenz: 31810128467 (Kühne & Nagel, Brasilien) erwartete laut Übersicht 13 HUs, die zugehörigen Detaildokumente (Rechnung 9008001235) listen jedoch nur 5 HUs auf.
