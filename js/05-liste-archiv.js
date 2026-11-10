// Fracht Tracker – Teil 5/10: 05-liste-archiv.js
// Sendungsliste (seitenweise), Archiv-Suche, Zeilen/Ampel/Gewicht, LKW-Namen, Desktop-Spalten + Sortierung, LKW-Menü (Seitenmenü)
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER NEUEN VERSION ---

// ERSETZEN SIE IHRE KOMPLETTE, ALTE renderTable-FUNKTION MIT DIESER NEUEN VERSION

// ===================================================================
// SENDUNGSLISTE
// Es werden nur die neuesten LIST_PAGE_SIZE Karten gezeichnet („Weitere anzeigen“ für den Rest).
// Die Suche läuft über die DATEN, nicht über gezeichnete Zeilen – sie findet also auch Sendungen,
// die gerade nicht in der Liste stehen: Sendungsnummer, VVL-Nummer, HU/VSE-Nummer, ab 4 Zeichen auch Notiztext.
// Grund: Ab ~1.000 Sendungen kosteten Aufbau und Neuzeichnen der kompletten Liste (inkl. unsichtbarer
// QR-Codes) mehrere Sekunden – und zwar nach JEDEM Scan.
// ===================================================================
const LIST_PAGE_SIZE = 30;
const HOME_RECENT_LIMIT = 5;        // Startseite ohne Suchtext: nur die zuletzt bearbeiteten Karten (Rest über Kacheln/Suche)
const HOME_RECENT_LIMIT_DESKTOP = 15; // Desktop-Tabelle: 15 Zeilen passen bequem unter Scanfeld + Kacheln
let listFilterText = '';            // aktueller Suchtext (getrimmt, Großschrift)
let listExtra = 0;                  // über „Weitere anzeigen“ zusätzlich aufgeklappte Karten
// Desktop (breiter Bildschirm, dichte Tabelle): mehr Zeilen auf einen Blick – dafür ist der Platz da
const isDesktopLayout = () => window.matchMedia && window.matchMedia('(min-width: 992px)').matches;
function currentListLimit(filter) { return ((filter || isBatchModeActive) ? LIST_PAGE_SIZE : (isDesktopLayout() ? HOME_RECENT_LIMIT_DESKTOP : HOME_RECENT_LIMIT)) + listExtra; }
const listMoreBtnEl = document.getElementById('listMoreBtn');
const listEmptyHintEl = document.getElementById('listEmptyHint');
if (listMoreBtnEl) listMoreBtnEl.addEventListener('click', () => { listExtra += LIST_PAGE_SIZE; drawShipmentList(); });

function shipmentMatchesListFilter(baseNumber, shipment, filter) {
    const parts = filter.split('+');
    const base = parts[0];
    const hasSuffix = parts.length > 1 && parts[1].length === SUFFIX_LENGTH && /^\d+$/.test(parts[1]);
    const b = String(baseNumber).toUpperCase();
    if (hasSuffix ? b === base : b.startsWith(base)) return true;                       // Sendungsnummer / Kundennr
    if (shipment.parentOrderNumber && String(shipment.parentOrderNumber).toUpperCase().startsWith(base)) return true; // VVL-Nummer
    const items = shipment.scannedItems || [];
    if (items.some(it => it && it.rawInput && String(it.rawInput).toUpperCase().startsWith(filter))) return true;   // HU / VSE
    if (filter.length > 3 && items.some(it => it && Array.isArray(it.notes) && it.notes.some(n => String(n).toUpperCase().includes(filter)))) return true;
    return false;
}
function setListFilter(text) {
    const next = (text || '').trim().toUpperCase();
    if (next !== listFilterText) { listFilterText = next; listExtra = 0; clearArchiveResults(); }
}
// Liste aus den Daten neu zeichnen; Filter = Inhalt des Eingabefelds (Signatur unverändert)
function renderTable() {
    setListFilter(shipmentNumberInputEl.value); drawShipmentList();
    // Adresse ?sendung=… beim Start: Sendung lag noch nicht lokal vor (Daten kommen erst vom Server) → jetzt öffnen
    if (pendingDetailFromUrl && loadShipments()[pendingDetailFromUrl]) { const b = pendingDetailFromUrl; pendingDetailFromUrl = null; showDetailView(b); }
}
// Liste nach einem bestimmten Text filtern (Signatur unverändert)
function filterTable(filterText) { setListFilter(filterText); drawShipmentList(); }

// QR-Codes erst zeichnen, wenn die Zelle wirklich sichtbar wird (mobil ist sie per CSS ausgeblendet – bisher
// wurde trotzdem für jede Karte ein QR-Code berechnet). Am Desktop erscheinen sie beim Scrollen.
const qrObserver = (typeof IntersectionObserver !== 'undefined') ? new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { qrObserver.unobserve(entry.target); drawQrCode(entry.target); } });
}) : null;
function drawQrCode(container) {
    if (!container || container.childElementCount > 0 || typeof QRCode === 'undefined') return;
    new QRCode(container, {
        text: container.dataset.qrText, width: 60, height: 60,
        colorDark: "#000000", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.L // Niedrige Fehlerkorrektur, gut für einfache Texte
    });
}
let lastListTotal = 0;
function updateListFooter(total, shownCount) {
    lastListTotal = total;
    const more = total - shownCount;
    if (listMoreBtnEl) {
        listMoreBtnEl.textContent = more > 0 ? `Weitere ${Math.min(more, LIST_PAGE_SIZE)} anzeigen (${shownCount} von ${total})` : '';
        listMoreBtnEl.classList.toggle('hidden', more <= 0);
    }
    if (listEmptyHintEl) {
        const filter = isBatchModeActive ? '' : listFilterText;
        listEmptyHintEl.textContent = filter ? `Keine Sendung zu „${filter}“ gefunden.` : '';
        listEmptyHintEl.classList.toggle('hidden', !(filter && total === 0));
    }
    updateArchiveHint(total);
}

// -------------------------------------------------------------------
// ARCHIV-SUCHE IN DER LISTE
// Unter der Liste erscheint bei einer Suche ein Knopf „Im Archiv: N Sendungen anzeigen“ (wenn die Nummern bekannt
// sind) bzw. „Im Archiv suchen“ (kein lokaler Treffer). Die Treffer kommen vom Server und werden in einem eigenen
// Block unter der Liste gezeigt – gleiche Karten, gekennzeichnet mit „Archiv“, statt Bearbeiten/Löschen ein
// „Wiederherstellen“. Tippen öffnet die Detailansicht nur lesend.
// -------------------------------------------------------------------
const archiveHintBtnEl = document.getElementById('archiveHintBtn');
const archiveResultsEl = document.getElementById('archiveResults');
const archiveTableBodyEl = document.getElementById('archiveTableBody');
const archiveResultsTitleEl = document.getElementById('archiveResultsTitle');
const archiveResultsNoteEl = document.getElementById('archiveResultsNote');
const archiveCloseBtnEl = document.getElementById('archiveCloseBtn');
let archiveResultsFilter = '';   // Suchtext, zu dem die gezeigten Archiv-Treffer gehören
let archiveResultsCache = {};    // base → Sendung (die gerade gezeigten Archiv-Treffer)
let archiveSearchSeq = 0;        // entwertet veraltete Antworten
let archiveAutoTimer = null;
let detailArchived = null;         // { base, shipment } – in der Detailansicht gezeigte Archiv-Sendung (nur lesen)
if (archiveHintBtnEl) archiveHintBtnEl.addEventListener('click', () => runArchiveSearch(listFilterText));
if (archiveCloseBtnEl) archiveCloseBtnEl.addEventListener('click', () => { clearArchiveResults(); updateArchiveHint(lastListTotal); });

function archiveAvailable() { return !archiveUnsupported && !serverIsLegacy; }
function updateArchiveHint(total) {
    if (!archiveHintBtnEl) return;
    const filter = isBatchModeActive ? '' : listFilterText;
    let label = '';
    if (filter && archiveAvailable() && archiveResultsFilter !== filter && archiveKnownBases.size > 0) {
        const n = archiveKnownPrefixCount(filter);
        if (n > 0) label = n === 1 ? 'Im Archiv: 1 Sendung anzeigen' : `Im Archiv: ${n} Sendungen anzeigen`;
        else if (total === 0 && filter.length >= 3) label = 'Im Archiv suchen'; // kein lokaler Treffer: z. B. HU/VSE-, VVL-Nummer, Notiztext
    }
    archiveHintBtnEl.textContent = label;
    archiveHintBtnEl.classList.toggle('hidden', !label);
}
function clearArchiveResults() {
    archiveSearchSeq++;
    archiveResultsFilter = ''; archiveResultsCache = {};
    if (archiveTableBodyEl) archiveTableBodyEl.innerHTML = '';
    if (archiveResultsEl) archiveResultsEl.classList.add('hidden');
}
async function runArchiveSearch(query) {
    const q = (query || '').trim().toUpperCase();
    if (!q || !archiveResultsEl || !archiveAvailable()) return;
    const seq = ++archiveSearchSeq;
    if (archiveHintBtnEl) { archiveHintBtnEl.textContent = 'Archiv wird durchsucht …'; archiveHintBtnEl.disabled = true; }
    try {
        const r = await postToServer('searchArchive', { query: q, mode: 'prefix' });
        if (seq !== archiveSearchSeq) return; // inzwischen anders gesucht oder geleert
        archiveResultsFilter = q; archiveResultsCache = r.results || {};
        const order = (Array.isArray(r.order) ? r.order : Object.keys(archiveResultsCache)).filter(b => archiveResultsCache[b]);
        let k = false; order.forEach(b => { if (!archiveKnownBases.has(b)) { archiveKnownBases.add(b); k = true; } }); if (k) saveArchiveKnownBases();
        drawArchiveResults(order, r.total || order.length, !!r.truncated);
    } catch (e) {
        if (seq !== archiveSearchSeq) return;
        if (isUnknownActionError(e)) { archiveUnsupported = true; displayError('Archivsuche benötigt das neue Server-Skript (backend/Code.gs neu bereitstellen).', 'orange', 6000); }
        else displayError(`Archiv nicht erreichbar: ${e.message}`, 'red', 5000);
    } finally {
        if (archiveHintBtnEl) archiveHintBtnEl.disabled = false;
        if (seq === archiveSearchSeq) updateArchiveHint(lastListTotal);
    }
}
function drawArchiveResults(order, total, truncated) {
    if (!archiveResultsEl || !archiveTableBodyEl) return;
    archiveTableBodyEl.innerHTML = '';
    order.forEach(b => appendShipmentRow(archiveTableBodyEl, b, archiveResultsCache[b], true));
    if (archiveResultsTitleEl) archiveResultsTitleEl.textContent = order.length === 0
        ? `Archiv: kein Treffer zu „${archiveResultsFilter}“`
        : `Archiv: ${order.length}${truncated ? ' von ' + total : ''} Treffer zu „${archiveResultsFilter}“`;
    if (archiveResultsNoteEl) {
        archiveResultsNoteEl.textContent = order.length === 0 ? ''
            : truncated ? `Nur die neuesten ${order.length} von ${total} Treffern – Suche weiter eingrenzen.`
            : 'Antippen zeigt die Sendung (nur lesen). „Wiederherstellen“ holt sie zurück in die Liste – ein Scan darauf tut das automatisch.';
        archiveResultsNoteEl.classList.toggle('hidden', !archiveResultsNoteEl.textContent);
    }
    archiveResultsEl.classList.remove('hidden');
}
function removeArchiveResultRow(base) {
    delete archiveResultsCache[base];
    delete infoArchiveCache[base]; // Info-Suche: Treffer ebenfalls vergessen (Seite zeichnet sich über renderTable neu)
    if (!archiveTableBodyEl) return;
    [...archiveTableBodyEl.rows].forEach(tr => { if (tr.dataset.basenumber === base) tr.remove(); });
    if (archiveResultsFilter && archiveTableBodyEl.rows.length === 0) { clearArchiveResults(); updateArchiveHint(lastListTotal); }
}
// „Wiederherstellen“ aus der Trefferliste oder der Detailansicht
function restoreArchivedShipment(base, fromDetail) {
    const obj = (fromDetail && detailArchived && detailArchived.base === base) ? detailArchived.shipment : (archiveResultsCache[base] || infoArchiveCache[base]);
    if (!base || !obj) return;
    const lkwReactivated = restoreArchivedShipmentLocally(base, JSON.parse(JSON.stringify(obj)));
    removeArchiveResultRow(base);
    detailArchived = null;
    renderTable(); renderLkwMenu();
    if (fromDetail) displayCurrentShipmentDetails(base); // jetzt mit Storno/Notizen
    const lkwNote = lkwReactivated ? ` LKW ${escapeHtml(lkwReactivated)} wurde dafür wieder aktiviert.` : '';
    displayError(`Sendung ${escapeHtml(base)} aus dem Archiv wiederhergestellt – sie steht wieder in der Liste.${lkwNote}`, 'blue', 4000);
}
// Eingabe einer bekannten Archiv-Nummer (z. B. Scan zum Nachsehen): Treffer automatisch holen
function scheduleArchiveAutoSearch(value) {
    if (archiveAutoTimer) { clearTimeout(archiveAutoTimer); archiveAutoTimer = null; }
    const filter = (value || '').trim().toUpperCase();
    const base = processShipmentNumber(filter).baseNumber;
    if (!filter || !base || !archiveAvailable() || !isArchivedBase(base)) return;
    archiveAutoTimer = setTimeout(() => { if (listFilterText === filter && archiveResultsFilter !== filter) runArchiveSearch(filter); }, 350);
}
// PDF für eine Archiv-Sendung: Daten aus den Treffern; bei einer VVL alle zugehörigen Aufträge aus dem Archiv dazuholen
async function sendArchivedPdf(event, base) {
    const s = archiveResultsCache[base] || infoArchiveCache[base];
    if (!s) return;
    const pool = Object.assign({}, loadShipments()); pool[base] = s;
    if (s.parentOrderNumber) {
        // Neuen Tab schon im Klick öffnen (Popup-Blocker) – der Nachweis kommt, sobald die Archiv-Aufträge da sind
        const tab = window.open('', '_blank');
        event.target.disabled = true;
        try { const r = await postToServer('searchArchive', { query: s.parentOrderNumber, mode: 'vvl' }); Object.assign(pool, r.results || {}); }
        catch (e) { if (tab) tab.close(); event.target.disabled = false; displayError(`Archiv nicht erreichbar: ${e.message}`, 'red', 5000); return; }
        event.target.disabled = false;
        openSecurityReport(base, pool, tab);
        return;
    }
    openSecurityReport(base, pool);
}
// Scan auf eine archivierte Sendung: erst zurückholen, dann normal verbuchen. Antwort: weiter scannen? (true/false)
async function restoreArchivedBeforeScan(base) {
    if (archiveAutoTimer) { clearTimeout(archiveAutoTimer); archiveAutoTimer = null; } // keine parallele Archivsuche zur selben Nummer
    mainActionButtonEl.disabled = true;
    displayError(`Sendung ${escapeHtml(base)} liegt im Archiv – wird geholt …`, 'blue');
    try {
        const found = await fetchArchivedShipments([base]);
        if (found[base]) { restoreArchivedShipmentLocally(base, found[base]); renderTable(); renderLkwMenu(); }
        else forgetArchivedBase(base); // nicht (mehr) im Archiv → wie bisher (neue Sendung)
        clearError();
        return true;
    } catch (e) {
        if (isUnknownActionError(e)) { archiveUnsupported = true; displayError('Archivsuche benötigt das neue Server-Skript (backend/Code.gs neu bereitstellen).', 'orange', 6000); return true; }
        displayError(`Archiv nicht erreichbar – Scan nicht gespeichert, bitte erneut versuchen. (${e.message})`, 'red', 6000);
        return false;
    } finally {
        mainActionButtonEl.disabled = false;
    }
}

function drawShipmentList() {
    const shipments = loadShipments();
    refreshTruckNames(shipments);
    const filter = isBatchModeActive ? '' : listFilterText; // im Batch-Modus alle zeigen (wie bisher)
    if (isBatchModeActive && archiveResultsFilter) clearArchiveResults();
    const matching = Object.keys(shipments)
        .filter(b => shipments[b] && isLkwActive(shipments[b].truckId) /* LKW deaktiviert → ausblenden */
                     && (!filter || shipmentMatchesListFilter(b, shipments[b], filter)))
        .map(b => [b, Date.parse(shipments[b].lastModified) || 0])
        .sort((x, y) => y[1] - x[1])   // neueste zuerst
        .map(x => x[0]);
    const shown = matching.slice(0, currentListLimit(filter));

    if (qrObserver) {
        qrObserver.disconnect();
        // Archiv-Treffer weiter beobachten (deren QR-Codes sind evtl. noch nicht gezeichnet)
        if (archiveTableBodyEl) archiveTableBodyEl.querySelectorAll('.qr-code-cell div').forEach(d => { if (d.childElementCount === 0) qrObserver.observe(d); });
    }
    tableBodyEl.innerHTML = '';
    shown.forEach(baseNumber => appendShipmentRow(tableBodyEl, baseNumber, shipments[baseNumber], false));
    updateEditButtonVisibilityInTable();
    updateListFooter(matching.length, shown.length);
    refreshHomeViews(); // Kacheln, offene Unterseite und Sichtbarkeit (Kacheln ↔ Treffer) nachziehen
}
// Eine Karte/Zeile zeichnen (Vorlage unverändert). archived = Archiv-Treffer: Kennzeichen „Archiv“,
// „Wiederherstellen“ + PDF statt Bearbeiten/PDF/Löschen.
function appendShipmentRow(tbody, baseNumber, shipment, archived) {
            const row = tbody.insertRow();
            
            row.dataset.basenumber = baseNumber;
            if (archived) { row.classList.add('archived'); row.dataset.archived = '1'; }

            const securityCount = calculateCurrentCountedPieces(shipment.scannedItems || []);
            const receiptCount = calculateGoodsReceiptCount(shipment.scannedItems || []);
            const expected = shipment.totalPiecesExpected;
            const expectedText = expected ?? 'N/A';

            let hawbCellHtml = '';
            let pdfButtonData = ''; 

            const badgeHtml = archived ? `<span class="archive-badge">Archiv</span>` : '';
            if (shipment.parentOrderNumber) {
                // VVL und Kundennr als zwei getrennte Spalten innerhalb der Zelle (Desktop: nebeneinander mit fester
                // Breite → alle Zeilen fluchten; Handy: untereinander wie bisher). Die Zelle bleibt das Klickziel.
                hawbCellHtml = `<td data-label="HAWB." class="hawb-cell hawb-cell-vvl">
                    <div class="vvl-table-entry">
                         <span class="vvl-col vvl-col-vvl"><span class="vvl-prefix">VVL</span><span class="vvl-no">${escapeHtml(shipment.parentOrderNumber)}</span></span>
                         <span class="vvl-col vvl-col-kunde"><span class="kundennr-prefix">Kundennr</span><span class="vvl-no">${escapeHtml(baseNumber)}</span></span>
                    </div>${badgeHtml}
                </td>`;
                pdfButtonData = `data-parentordernumber="${escapeHtml(shipment.parentOrderNumber)}"`;
            } else {
                hawbCellHtml = `<td data-label="HAWB." class="hawb-cell">${escapeHtml(baseNumber)}${badgeHtml}</td>`;
            }
            row.insertCell().outerHTML = hawbCellHtml;

            const receiptClass = getStatusClass(receiptCount, expected);
            const dunkelalarmCount = calculateOpenDunkelalarmCount(shipment.scannedItems || [], shipment); // offene Dunkelalarme
            let securityClass = '';

            if (expected !== null && (securityCount + dunkelalarmCount) === expected && dunkelalarmCount > 0) {
                securityClass = 'over'; 
            } else {
                securityClass = getStatusClass(securityCount, expected);
            }

            let summaryHtml = `
                <strong class="${receiptClass}">WE: ${receiptCount}/${expectedText}</strong>
                <div class="summary-divider"></div>
                <strong class="${securityClass}">Sich.: ${securityCount}/${expectedText}</strong>
            `;
            
            row.insertCell().outerHTML = `<td data-label="\u00DCbersicht" class="summary-cell">${summaryHtml}</td>`;
            
            // 9.3: dahinter der Name, der zuletzt gespeichert hat (lastModifiedBy; alte Sendungen ohne Angabe: nur die Zeit)
            const modifiedBy = shipment.lastModifiedBy ? `<span class="modified-by" title="Zuletzt geändert von ${escapeHtml(shipment.lastModifiedBy)}">${escapeHtml(shipment.lastModifiedBy)}</span>` : '';
            row.insertCell().outerHTML = `<td data-label="Letzte Änd." class="time-cell">${shipment.lastModified ? new Date(shipment.lastModified).toLocaleString('de-DE') : '-'}${modifiedBy}</td>`;
            
            const actionsCell = row.insertCell();
            actionsCell.setAttribute('data-label', 'Aktionen');
            actionsCell.classList.add('actions-cell');
            actionsCell.innerHTML = archived ? `
                <button class="restore-btn" data-basenumber="${escapeHtml(baseNumber)}" title="Sendung ${escapeHtml(baseNumber)} aus dem Archiv zurück in die Liste holen">Wiederherstellen</button>
                <button class="pdf-btn" data-basenumber="${escapeHtml(baseNumber)}" ${pdfButtonData}>PDF</button>
            ` : `
                <button class="edit-btn" data-basenumber="${escapeHtml(baseNumber)}" title="Sendung ${escapeHtml(baseNumber)} bearbeiten">Edit</button>
                <button class="pdf-btn" data-basenumber="${escapeHtml(baseNumber)}" ${pdfButtonData}>PDF</button>
                <button class="delete-btn main-delete-btn" data-basenumber="${escapeHtml(baseNumber)}">L\u00F6schen</button>
            `;
            
            // ===============================================================
            // HIER WIRD DER QR-CODE ERSTELLT
            // ===============================================================
            const qrCell = row.insertCell();
            qrCell.classList.add('qr-code-cell');
            qrCell.setAttribute('data-label', 'QR-Code'); // Für mobile Ansicht, obwohl versteckt
            
            // Eindeutiger Container; gezeichnet wird erst, wenn er sichtbar wird (siehe qrObserver)
            const qrContainerId = (archived ? 'qrcode-archiv-' : 'qrcode-') + baseNumber.replace(/[^a-zA-Z0-9]/g, ''); // Bereinige ID (Archiv-Block eigener Namensraum)
            qrCell.innerHTML = `<div id="${qrContainerId}" data-qr-text="${escapeHtml(baseNumber)}"></div>`;
            const qrContainer = qrCell.firstElementChild;
            if (qrObserver) qrObserver.observe(qrContainer);
            else setTimeout(() => drawQrCode(qrContainer), 0);
            // ===============================================================
            // ENDE DER QR-CODE-LOGIK
            // ===============================================================

            // Desktop-Spalten (ab 992 px sichtbar, auf dem Handy per CSS ausgeblendet) – direkt hinter der HAWB-Zelle.
            // Klick-Handler und Zusatzinhalte nutzen deshalb Klassen (.hawb-cell / .summary-cell) statt Zellenindizes.
            insertDesktopCells(row, baseNumber, shipment);
}
// ---- Desktop-Tabelle: Zusatzspalten + Sortierung -------------------------------------------------------------
// Status-Ampel: rot = Dunkelalarm dabei, grün = fertig, gelb = offen, grau = ohne Stückzahl
function shipmentTrafficLight(s) {
    const p = shipmentProgress(s);
    if (p.dunkel > 0) return { cls: 'danger', text: 'Dunkelalarm', order: 0 };
    if (p.unknown) return { cls: 'muted', text: 'ohne Stückzahl', order: 2 };
    if (p.open) return { cls: 'warn', text: 'Offen', order: 1 };
    return { cls: 'ok', text: 'Fertig', order: 3 };
}
// Gesamtgewicht aus den HU-Gewichten (nur wo Angaben vorliegen); null = keine Gewichtsangabe
function shipmentTotalKg(s) {
    let sum = 0, any = false;
    (Array.isArray(s.scannedItems) ? s.scannedItems : []).forEach(i => {
        if (!i || i.isCancelled) return;
        const kg = parseWeightKg(i.grossWeight);
        if (kg !== null) { sum += kg; any = true; }
    });
    return any ? sum : null;
}
function shipmentNoteCount(s) {
    return (Array.isArray(s.scannedItems) ? s.scannedItems : []).reduce((n, i) => n + (i && Array.isArray(i.notes) ? i.notes.length : 0), 0);
}
function truckDefaultName(truckId) {
    if (!truckId) return '';
    if (truckId.startsWith('VVL-')) return 'VW ' + truckId.slice(4);
    if (truckId === 'MAN-legacy') return 'MAN importiert';
    return truckId;
}
// Anzeigename (vom Nutzer vergeben, liegt als truckName an den Sendungen des LKW) – sonst der Standardname aus der Kennung
function truckShortName(truckId) {
    if (!truckId) return '';
    return truckNameMap[truckId] || truckDefaultName(truckId);
}
// Anzeigenamen einsammeln – läuft vor jedem Zeichnen der Liste (drawShipmentList) und der Seiten (collectTrucks)
function refreshTruckNames(shipments) {
    const map = {};
    Object.values(shipments || {}).forEach(s => { if (s && s.truckId && s.truckName && !map[s.truckId]) map[s.truckId] = String(s.truckName); });
    truckNameMap = map;
    return map;
}
function insertDesktopCells(row, baseNumber, shipment) {
    const p = shipmentProgress(shipment);
    const light = shipmentTrafficLight(shipment);
    const expectedText = p.expected === null ? '–' : p.expected;
    const kg = shipmentTotalKg(shipment);
    const notes = shipmentNoteCount(shipment);
    const truck = truckShortName(shipment.truckId);
    const secDone = p.counted + p.dunkel;
    row.dataset.sortStatus = light.order;
    row.dataset.sortTruck = truck.toLowerCase();
    row.dataset.sortWe = p.we;
    row.dataset.sortSich = secDone;
    row.dataset.sortKg = kg === null ? -1 : kg;
    row.dataset.sortTime = Date.parse(shipment.lastModified) || 0;
    const cells = [
        `<td class="dt-cell dt-status" data-label="Status"><span class="dt-light ${light.cls}" title="${escapeHtml(light.text)}"></span>${escapeHtml(light.text)}</td>`,
        `<td class="dt-cell dt-truck" data-label="LKW">${truck ? `<span class="dt-truck-chip">${escapeHtml(truck)}</span>` : '<span class="dt-dim">–</span>'}</td>`,
        `<td class="dt-cell dt-num ${chipClass(p.we, p.expected)}" data-label="WE">${p.we}<span class="dt-dim">/${expectedText}</span></td>`,
        `<td class="dt-cell dt-num ${p.dunkel > 0 ? 'over' : chipClass(secDone, p.expected)}" data-label="Sich.">${secDone}<span class="dt-dim">/${expectedText}</span></td>`,
        `<td class="dt-cell dt-num dt-kg" data-label="Gewicht">${kg === null ? '<span class="dt-dim">–</span>' : escapeHtml(formatKg(kg))}</td>`,
        `<td class="dt-cell dt-notes" data-label="Notizen">${notes ? `<span class="dt-note-badge" title="${notes} Notiz${notes === 1 ? '' : 'en'}">${notes}</span>` : ''}</td>`,
    ];
    row.cells[0].insertAdjacentHTML('afterend', cells.join(''));
}
// Klick auf einen sortierbaren Spaltenkopf (Desktop): Zeilen der zugehörigen Tabelle umsortieren
const DESKTOP_SORT_KEYS = { hawb: 'text', status: 'sortStatus', truck: 'sortTruck', we: 'sortWe', sich: 'sortSich', kg: 'sortKg', time: 'sortTime' };
function sortShipmentTable(table, key, dir) {
    const tbody = table.tBodies[0];
    if (!tbody) return;
    const rows = Array.from(tbody.rows).filter(r => r.dataset.basenumber);
    const field = DESKTOP_SORT_KEYS[key];
    const val = (r) => {
        if (field === 'text') return (r.dataset.basenumber || '').toLowerCase();
        if (field === 'sortTruck') return r.dataset.sortTruck || '';
        return Number(r.dataset[field] || 0);
    };
    rows.sort((a, b) => { const x = val(a), y = val(b); const c = typeof x === 'string' ? x.localeCompare(y, 'de') : x - y; return dir === 'desc' ? -c : c; });
    rows.forEach(r => tbody.appendChild(r));
    table.querySelectorAll('th[data-sort]').forEach(th => { th.classList.remove('sorted-asc', 'sorted-desc'); th.removeAttribute('aria-sort'); });
    const th = table.querySelector(`th[data-sort="${key}"]`);
    if (th) { th.classList.add(dir === 'desc' ? 'sorted-desc' : 'sorted-asc'); th.setAttribute('aria-sort', dir === 'desc' ? 'descending' : 'ascending'); }
}
document.addEventListener('click', (event) => {
    const th = event.target.closest('.shipment-table th[data-sort]');
    if (!th) return;
    const table = th.closest('table');
    const key = th.dataset.sort;
    // Erster Klick: Zahlen/Zeit absteigend (Größtes/Neuestes oben), Text aufsteigend; jeder weitere Klick dreht um
    let dir;
    if (th.classList.contains('sorted-asc')) dir = 'desc';
    else if (th.classList.contains('sorted-desc')) dir = 'asc';
    else dir = ['we', 'sich', 'kg', 'time'].includes(key) ? 'desc' : 'asc';
    sortShipmentTable(table, key, dir);
});
// Packstücktabelle in den Sendungsdetails (Desktop): Klick auf einen Spaltenkopf sortiert die Zeilen, dasselbe Dreieck wie
// in der Sendungsliste. Reine Darstellung – die Zeilen werden nur umgehängt, Daten und Auswahl-Kästchen bleiben unberührt.
// Die Wahl gilt für die Sitzung und wird nach jedem Neuaufbau der Details (Scan, Sync, Übernehmen) wieder angewendet.
function applyPackTableSort(table) {
    if (!table || !table.tBodies[0]) return;
    const tbody = table.tBodies[0];
    const rows = Array.from(tbody.rows);
    const s = packTableSort;
    table.querySelectorAll('th[data-psort]').forEach(th => { th.classList.remove('sorted-asc', 'sorted-desc'); th.removeAttribute('aria-sort'); });
    const byDefault = (a, b) => Number(a.dataset.psDefault || 0) - Number(b.dataset.psDefault || 0);
    if (s) {
        const attr = 'ps' + s.key.charAt(0).toUpperCase() + s.key.slice(1);
        const numeric = PACK_SORT_NUMERIC.includes(s.key);
        rows.sort((a, b) => {
            const x = a.dataset[attr] || '', y = b.dataset[attr] || '';
            if (x === '' || y === '') return x === y ? byDefault(a, b) : (x === '' ? 1 : -1);   // leere Werte („–“) immer ans Ende
            let c = numeric ? Number(x) - Number(y) : x.localeCompare(y, 'de', { numeric: true });
            if (s.dir === 'desc') c = -c;
            return c || byDefault(a, b);
        });
    } else rows.sort(byDefault);
    rows.forEach(r => tbody.appendChild(r));
    const th = s ? table.querySelector(`th[data-psort="${s.key}"]`) : null;
    if (th) { th.classList.add(s.dir === 'desc' ? 'sorted-desc' : 'sorted-asc'); th.setAttribute('aria-sort', s.dir === 'desc' ? 'descending' : 'ascending'); }
}
document.addEventListener('click', (event) => {
    const th = event.target.closest('.pack-table th[data-psort]');
    if (!th) return;
    const key = th.dataset.psort;
    // Erster Klick: Gewicht/Zeit/Notizen absteigend (Schwerstes/Neuestes oben), sonst aufsteigend; jeder weitere Klick dreht um
    let dir;
    if (th.classList.contains('sorted-asc')) dir = 'desc';
    else if (th.classList.contains('sorted-desc')) dir = 'asc';
    else dir = ['kg', 'time', 'notes'].includes(key) ? 'desc' : 'asc';
    packTableSort = { key, dir };
    applyPackTableSort(th.closest('table'));
});
function renderLkwMenu() {
    const container = document.getElementById('lkw-menu-container');
    if (!container) return;
    const shipments = loadShipments();
    const lkwStatus = loadLkwStatus();
    const trucks = {};

    // NEU: Zähle die Anzahl der HUs (Einzel-Sendungen) statt der Aufträge
    // In renderLkwMenu():
Object.values(shipments).forEach(s => {
    if (!s.truckId) return;
    if (!trucks[s.truckId]) trucks[s.truckId] = { count: 0, name: '' };
    if (s.truckName && !trucks[s.truckId].name) trucks[s.truckId].name = String(s.truckName);

    if (s.isHuListOrder) {
        // ✅ KORREKTUR: Verwende totalPiecesExpected, da diese Zahl exakt
        // die Anzahl der beim Import angelegten HU-Positionen widerspiegelt.
        // Sie wird beim Import gesetzt und nur bei explizitem Hinzufügen
        // neuer HUs erhöht. Kombi-Scans, Wareneingangs-Scans, Stornos etc.
        // verändern diese Zahl NICHT.
        trucks[s.truckId].count += (s.totalPiecesExpected || 0);
    } else {
        trucks[s.truckId].count++;
    }
});


    if (Object.keys(trucks).length === 0) {
// ... der restliche Code von renderLkwMenu() bleibt unverändert

        container.innerHTML = '<li class="lkw-empty">Keine LKWs importiert</li>';
        return;
    }

    if (!document.getElementById('vw-marquee-style')) {
        const style = document.createElement('style');
        style.id = 'vw-marquee-style';
        style.innerHTML = `
            @keyframes scrollVwNumber {
                0%, 15% { transform: translateX(0); }
                85%, 100% { transform: translateX(calc(-100% + 90px)); }
            }
        `;
        document.head.appendChild(style);
    }

    container.style.paddingLeft = '0';
    container.style.margin = '0';

    let html = '';
    let manCount = 1;
    
    Object.entries(trucks).forEach(([truckId, info]) => {
        const isActive = lkwStatus[truckId] !== false;
        
                let prefix = "";
        let scrollingText = "";
        let isVw = false;

        if (truckId.startsWith("VVL-")) {
            prefix = "🚚 VW ";
            scrollingText = truckId.replace("VVL-", "");
            isVw = true;
        } else if (truckId === "MAN-legacy") {
            prefix = "🚛 MAN importiert";
        } else if (truckId.startsWith("MAN-")) {
            // Altes System: Zählt nur alte, dynamische Einträge hoch
            prefix = "🚛 MAN " + manCount;
            manCount++;
        } else if (truckId.startsWith("MAN ")) {
            // NEU: Richtiges Icon für das neue System mit festen MAN-Nummern
            prefix = "🚛 ";
            scrollingText = truckId;
        } else {
            // Fallback für alle anderen manuell umbenannten LKWs
            prefix = "🚚 ";
            scrollingText = truckId; 
        }



        

        // Vom Nutzer vergebener Anzeigename (Seite „Anlieferung“ → Stift): ersetzt die Beschriftung, Symbol bleibt
        if (info.name) { prefix = prefix.startsWith('🚛') ? '🚛 ' : '🚚 '; scrollingText = info.name; isVw = true; }

        const animationStyle = (isVw && scrollingText.length > 11) 
            ? 'animation: scrollVwNumber 4s linear infinite alternate;' 
            : '';

        // Wir fügen hier die Klasse 'lkw-longpress-target' und data-truckid hinzu
        html += `<li class="lkw-menu-item lkw-longpress-target" data-truckid="${truckId}">
            
            <div style="display: flex; align-items: center; flex-grow: 1; min-width: 0; padding-right: 15px; overflow: hidden; pointer-events: none;">
                <span style="flex-shrink: 0; white-space: pre;">${prefix}</span>
                ${scrollingText ? `
                <div style="flex-grow: 1; overflow: hidden; min-width: 0; position: relative; margin-left: 2px;">
                    <span style="display: inline-block; white-space: nowrap; ${animationStyle}">${scrollingText}</span>
                </div>
                ` : ''}
                <small style="flex-shrink: 0; margin-left: 5px;">(${info.count})</small>
            </div>

            <label class="batch-toggle-switch" style="flex-shrink: 0; margin-bottom: 0;" onclick="event.stopPropagation()">
                <input type="checkbox" class="lkw-toggle" data-truckid="${truckId}" ${isActive ? 'checked' : ''}>
                <span class="batch-slider"></span>
            </label>
            
        </li>`;
    });
    
    container.innerHTML = html;
    
    // Toggle Switch Event Listener (wie vorher)
    container.querySelectorAll('.lkw-toggle').forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const status = loadLkwStatus();
            const on = e.target.checked;
            status[e.target.dataset.truckid] = on;
            runBlocking(on ? 'LKW wird aktiviert …' : 'LKW wird deaktiviert …', async () => {
                const saving = saveLkwStatus(status);
                renderTable();
                await saving;
            });
        });
    });

    // --- NEU: LONG PRESS LOGIK FÜR LÖSCHEN & UMBENENNEN ---
    let longPressTimer;
    container.querySelectorAll('.lkw-longpress-target').forEach(item => {
        
        const startPress = (e) => {
            // Verhindert Long-Press, wenn man den Schalter selbst berührt
            if (e.target.closest('.batch-toggle-switch')) return; 
            
            const targetTruckId = item.dataset.truckid;
            
            longPressTimer = setTimeout(() => {
                // Was passieren soll, wenn lange gedrückt wird:
                if (window.navigator && window.navigator.vibrate) navigator.vibrate(50); // Leichtes Vibrieren auf Android

                const action = confirm(`Möchtest du den LKW löschen?\n\n[OK] = LKW & alle Scans löschen\n[Abbrechen] = LKW umbenennen`);
                
                let currentShipments = loadShipments();

                if (action) {
                    // LÖSCHEN
                    const finalConfirm = confirm(`ACHTUNG: Willst du wirklich ALLE Sendungen für diesen LKW aus dem System entfernen?`);
                    if (finalConfirm) {
                        for (let baseNumber in currentShipments) {
                            if (currentShipments[baseNumber].truckId === targetTruckId) {
                                delete currentShipments[baseNumber];
                            }
                        }
                        runBlocking('LKW wird gelöscht …', async () => {
                            const saving = saveShipments(currentShipments);
                            renderTable();
                            renderLkwMenu();
                            await saving;
                        }).then(() => displayError('LKW gelöscht.', 'green', 2000));
                    }
                } else {
                    // UMBENENNEN
                    const newName = prompt(`Neuen Namen für den LKW eingeben:\n(z.B. MAN-12345 oder VVL-Test)`, targetTruckId);
                    if (newName && newName.trim() !== '' && newName !== targetTruckId) {
                        for (let baseNumber in currentShipments) {
                            if (currentShipments[baseNumber].truckId === targetTruckId) {
                                currentShipments[baseNumber].truckId = newName.trim();
                            }
                        }
                        // LKW Status (Toggle) mit umziehen
                        const status = loadLkwStatus();
                        if (status[targetTruckId] !== undefined) {
                            status[newName.trim()] = status[targetTruckId];
                            delete status[targetTruckId];
                            saveLkwStatus(status);
                        }
                        
                        runBlocking('LKW wird umbenannt …', async () => {
                            const saving = saveShipments(currentShipments);
                            renderTable();
                            renderLkwMenu();
                            await saving;
                        }).then(() => displayError('LKW umbenannt.', 'green', 2000));
                    }
                }
            }, 800); // 800 Millisekunden = 0.8 Sekunden gedrückt halten
        };

        const cancelPress = () => {
            clearTimeout(longPressTimer);
        };

        // Touch-Events für Handys
        item.addEventListener('touchstart', startPress, {passive: true});
        item.addEventListener('touchend', cancelPress);
        item.addEventListener('touchmove', cancelPress);
        
        // Maus-Events für Desktop/Testen
        item.addEventListener('mousedown', startPress);
        item.addEventListener('mouseup', cancelPress);
        item.addEventListener('mouseleave', cancelPress);
        
        // Verhindern, dass auf Handys beim langen Drücken das Menü kopiert wird
        item.addEventListener('contextmenu', e => { e.preventDefault(); });
    });
}


