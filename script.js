'use strict';

/* =====================================================================
   Fracht Tracker (V9) – kompletter Neubau nach Spezifikation V8.18
   Reines Vanilla-JavaScript, kein Framework, kein Build-Schritt.
   Offline-first: jede Änderung wird zuerst lokal gespeichert,
   danach im Hintergrund mit dem Google-Apps-Script-Backend synchronisiert.
   ===================================================================== */

/* ------------------------- Backend-Konstanten ----------------------- */
// Mail_13 (E-Mail-Versand)
const WEB_APP_URL_BACKEND = 'https://script.google.com/macros/s/AKfycbyBtlm37WxzXdFCDjQuSIWfnQiTny6gwrmXuoq_cacGY9_bkqZxuuW7aJEqLuHJhWYg/exec';
// Daten-Sync (Google Sheet)
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbw_ug_levQ7LuOn27CijAdkabnz5utME2aEeN6s560RzSb8lKCsSo5VT4nyOebRJnd0gw/exec';
// WICHTIG: Key NICHT ändern – vorhandene Bestandsdaten der alten App werden übernommen!
const LOCAL_STORAGE_KEY = 'frachtSicherungMobile_V8_18_Refactored';
// Eigener Storage-Key für den LKW-Status
const LKW_STORAGE_KEY = 'frachtSicherungMobile_V8_18_TruckStatus';

/* ------------------------- Fachliche Konstanten --------------------- */
const SUFFIX_LENGTH = 4;                       // letzte 4 Zeichen = Suffix
const MIN_LENGTH_FOR_IMPLICIT_SUFFIX = 12;     // ab dieser Länge wird der Suffix abgetrennt
const NON_COUNTING_STATUSES = ['Dunkelalarm', 'Anstehend', 'NichtSichern', 'Abgelehnt', 'Wareneingang'];
const statusesThatTriggerWE = ['XRY', 'ETD', 'EDD', 'Dunkelalarm']; // lösen intern Wareneingang aus
const EXCLUSIVE_SECURITY_STATUSES = ['XRY', 'ETD', 'EDD'];
const NOTE_ALLOWED_STATUSES = ['XRY', 'Abgelehnt', 'Dunkelalarm', 'ETD', 'EDD'];
const SYNC_ERROR_MESSAGE = 'Lokal gespeichert, aber Server-Sync fehlgeschlagen!';
const NACHLIEFERUNG_MARKER = 'NACHLIEFERUNG';

/* ------------------------------ Zustand ----------------------------- */
let shipments = {};                       // Basis-Sendungsnummer -> Sendungsobjekt
let truckData = { trucks: {}, currentTruckId: null }; // LKW-Status + Zuordnungsziel
let currentShipmentNumber = null;         // aktuell in der Detailansicht
let batchScans = [];                      // gesammelte Scans im Batch-Modus
let pendingSingleScanNote = null;         // Notiz für den nächsten Einzelscan
let pendingNewShipment = null;            // wartende Nummer einer NEUEN Sendung
let activeHuTab = 'offeneSicherung';      // aktiver Tab im Offene-HUs-Modal
let menuOpen = false;                     // Seitenmenü offen?
let editTargetNumber = null;              // Sendung im Edit-Modal
let noteEditTarget = null;                // {baseNumber, itemIdx, noteIdx} im Notiz-Modal
let inlineNoteSaved = false;              // Schutz gegen doppeltes Speichern (Enter + blur)
let batchFeedbackTimer = null;            // Auto-Close des Feedback-Popups

/* ------------------------------ Helfer ------------------------------ */
const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function formatTime(iso) {
    try { return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' }); }
    catch (e) { return String(iso || ''); }
}

function displayStatus(status) {
    return status === 'NichtSichern' ? 'Nicht Erf.' : status;
}

function cssStatus(status) {
    return String(status).replace(/[^A-Za-z]/g, '');
}

function playSound(id) {
    try { const a = $(id); a.currentTime = 0; a.play().catch(() => {}); } catch (e) { /* ignoriert */ }
}

/* ------------------------- Meldungen / Feedback --------------------- */
let feedbackTimer = null;
function showFeedback(msg, type = 'success', duration = 3000) {
    const fb = $('feedbackMessage');
    fb.textContent = msg;
    fb.className = 'feedback-message visible ' + type;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { fb.className = 'feedback-message'; }, duration);
}
function showError(msg) { playSound('errorSound'); showFeedback(msg, 'error', 5000); }
function showSyncError() { showFeedback(SYNC_ERROR_MESSAGE, 'error', 5000); }

function setSheetStatus(text, type) {
    const el = $('sheetStatus');
    el.textContent = text || '';
    el.className = 'sheet-status' + (type ? ' ' + type : '');
}

/* ------------------------------ Modals ------------------------------ */
function openModal(id) { $(id).classList.remove('hidden'); }
function closeModal(id) {
    $(id).classList.add('hidden');
    if (id === 'batchFeedbackModal') clearTimeout(batchFeedbackTimer);
}
function anyModalOpen() {
    return !!document.querySelector('.modal-overlay:not(.hidden)');
}

/* --------------------------- Fokus-Management -----------------------
   Nach jedem Scan kehrt der Fokus sofort ins Eingabefeld zurück –
   AUSSER ein Modal, das Seitenmenü, der Inline-Notiz-Editor oder
   die "Neue Sendung"-Sektion ist offen.                          */
function inlineNoteEditorActive() { return !!document.querySelector('.note-inline-editor'); }
function newShipmentSectionOpen() { return !$('newShipmentSection').classList.contains('hidden'); }

function refocusInput() {
    if (anyModalOpen() || menuOpen || inlineNoteEditorActive() || newShipmentSectionOpen()) return;
    $('shipmentNumberInput').focus();
}

/* =====================================================================
   NUMMERN-PARSING (Kern der Scan-Logik)
   ===================================================================== */
function processShipmentNumber(input) {
    const raw = String(input || '').trim().toUpperCase();
    let baseNumber = raw;
    let suffix = null;
    let isSuffixFormat = false;

    // Impliziter Suffix: Nummer lang genug UND endet mit genau 4 Ziffern
    if (raw.length >= MIN_LENGTH_FOR_IMPLICIT_SUFFIX && /\d{4}$/.test(raw.slice(-SUFFIX_LENGTH))) {
        baseNumber = raw.slice(0, -SUFFIX_LENGTH); // z.B. 1234567890001 -> 123456789
        suffix = raw.slice(-SUFFIX_LENGTH);        // -> 0001
        isSuffixFormat = true;
    }
    const isValidFormat = raw.length > 0;
    return { baseNumber, suffix, isValidFormat, raw, isSuffixFormat };
}

/* =====================================================================
   SPEICHERN & SYNCHRONISIEREN (Offline-first)
   ===================================================================== */
function loadLocalState() {
    try {
        const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
        if (local && local.shipments) shipments = local.shipments;
    } catch (e) { shipments = {}; }
    try {
        const trucks = JSON.parse(localStorage.getItem(LKW_STORAGE_KEY) || 'null');
        if (trucks && trucks.trucks) truckData = trucks;
    } catch (e) { truckData = { trucks: {}, currentTruckId: null }; }
}

function saveLocal() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ shipments }));
    saveTrucksLocal();
}
function saveTrucksLocal() {
    localStorage.setItem(LKW_STORAGE_KEY, JSON.stringify(truckData));
}

// Synchronisiert den lokalen Stand per POST an das Daten-Backend.
// Schlägt der Sync fehl, bleibt der lokale Stand bestehen.
async function syncToServer() {
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST', mode: 'cors', cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'saveAll', shipments })
        });
    } catch (e) { showSyncError(); }
}

function saveAndSync() {
    saveLocal();
    syncToServer();
}

// Lädt die Sendungsdaten vom Server. Bei Fehler: lokaler Stand bleibt.
async function loadDataFromServer() {
    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST', mode: 'cors', cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getAll' })
        });
        const data = await res.json();
        if (data && data.shipments && Object.keys(data.shipments).length) {
            shipments = data.shipments;
            saveLocal();
        }
    } catch (e) { /* Offline: lokaler Stand wird weiter genutzt */ }
}

// LKW-Status separat vom Server laden und lokal cachen.
async function loadTruckStatusFromServer() {
    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST', mode: 'cors', cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getTrucks' })
        });
        const data = await res.json();
        if (data && data.trucks) {
            truckData.trucks = data.trucks;
            if (typeof data.currentTruckId !== 'undefined') truckData.currentTruckId = data.currentTruckId;
            saveTrucksLocal();
        }
    } catch (e) { /* Offline: lokaler LKW-Cache wird weiter genutzt */ }
}

async function syncTrucksToServer() {
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST', mode: 'cors', cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'saveTrucks', trucks: truckData.trucks, currentTruckId: truckData.currentTruckId })
        });
    } catch (e) { /* stiller Fehler – LKW-Stand bleibt lokal gültig */ }
}

// Hintergrund-Synchronisation: stört den Scan-Fluss nicht (keine UI-Blockade).
function startBackgroundSync() {
    setInterval(() => syncToServer(), 60000);          // jede Minute: lokal -> Server
    setInterval(() => loadDataFromServer(), 300000);   // alle 5 Minuten: Server -> lokal
    window.addEventListener('online', () => syncToServer());
}

/* =====================================================================
   ZÄHLUNG / FORTSCHRITT
   ===================================================================== */
function getCountedPieces(s) {
    return s.items.filter((it) => !NON_COUNTING_STATUSES.includes(it.status)).length;
}
function getGoodsReceiptCount(s) {
    const m = s.manualGoodsReceiptCount;
    if (m !== null && m !== '' && m !== undefined && !isNaN(Number(m))) return Number(m);
    return s.items.filter((it) => statusesThatTriggerWE.includes(it.status) || it.status === 'Wareneingang').length;
}

/* =====================================================================
   KUNDENNUMMER-/VORVERLADELISTEN-LOGIK
   Existiert eine Kundennummer bereits, aber mit einer ANDEREN
   Vorverladeliste, wird automatisch eine Nummer angehängt (z.B. "12345 (2)"),
   damit der alte LKW seinen Auftrag behält.
   ===================================================================== */
function resolveCustomerNumber(customerNumber, parentOrderNumber) {
    if (!parentOrderNumber) return customerNumber;
    const existing = shipments[customerNumber];
    if (!existing) return customerNumber;
    if (!existing.parentOrderNumber || existing.parentOrderNumber === parentOrderNumber) return customerNumber;
    let i = 2;
    while (Object.prototype.hasOwnProperty.call(shipments, `${customerNumber} (${i})`)) i++;
    return `${customerNumber} (${i})`;
}

function newShipmentObject(parentOrderNumber) {
    return {
        items: [],
        totalPiecesExpected: null,
        manualGoodsReceiptCount: null,
        isHuListOrder: false,
        huList: [],
        parentOrderNumber: parentOrderNumber || null
    };
}

/* =====================================================================
   SCAN-FLUSS (Einzelscan)
   ===================================================================== */
function handleScanSubmit(evt) {
    evt.preventDefault();
    const processed = processShipmentNumber($('shipmentNumberInput').value);
    if (!processed.isValidFormat) {
        showError('FEHLER: Ungültige oder leere Eingabe.');
        $('shipmentNumberInput').value = '';
        updateClearButton();
        refocusInput();
        return;
    }
    if ($('batchModeToggle').checked) { addScanToBatch(processed); return; }
    processSingleScan(processed);
}

function processSingleScan(processed) {
    if (!shipments[processed.baseNumber]) {
        // Unbekannte Basisnummer -> zuerst erwartetе Gesamtstückzahl abfragen
        pendingNewShipment = processed;
        $('newShipmentNumber').textContent = processed.baseNumber;
        $('newShipmentCount').value = '';
        $('newShipmentSection').classList.remove('hidden');
        $('shipmentNumberInput').value = '';
        updateClearButton();
        $('newShipmentCount').focus();
        return;
    }
    const ok = addScanToShipment(processed.baseNumber, processed, pendingSingleScanNote, $('comboCheckbox').checked, false);
    if (ok) {
        currentShipmentNumber = processed.baseNumber;
        if (pendingSingleScanNote !== null) { pendingSingleScanNote = null; hideNoteSection(); }
        $('comboCheckbox').checked = false; // Kombi gilt nur für den nächsten Scan
    }
    $('shipmentNumberInput').value = '';
    updateClearButton();
    refocusInput();
}

// Fügt einen Scan zu einer bestehenden Sendung hinzu.
// processed = {raw, suffix}; note/isCombo nur beim Einzelscan relevant.
function addScanToShipment(baseNumber, processed, note, isCombo, silent) {
    const shipment = shipments[baseNumber];
    if (!shipment) return false;
    const status = typeof processed.status === 'string' ? processed.status : $('securityStatusSelect').value;

    // Dunkelalarm pro Packstück nur 1x vergebbar
    if (status === 'Dunkelalarm' &&
        shipment.items.some((it) => it.raw === processed.raw && it.status === 'Dunkelalarm')) {
        if (!silent) showError(`FEHLER: Packstück ${processed.raw} wurde bereits als Dunkelalarm erfasst.`);
        else playSound('errorSound');
        return false;
    }

    const notes = [];
    if (note && NOTE_ALLOWED_STATUSES.includes(status)) notes.push(note);

    shipment.items.push({
        raw: processed.raw,
        suffix: processed.suffix,
        status,
        timestamp: new Date().toISOString(),
        notes,
        isCombo: !!isCombo
    });
    saveAndSync();
    renderAll();
    if (!silent) showFeedback(`Scan gespeichert: ${processed.raw} (${displayStatus(status)})`, 'success', 2000);
    return true;
}

/* ---------------------- NEUE Sendung anlegen ------------------------ */
function confirmNewShipment() {
    const val = $('newShipmentCount').value.trim();
    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
        showError('FEHLER: Bitte eine gültige Stückzahl eingeben.');
        return;
    }
    const p = pendingNewShipment;
    if (!p) return;

    // Kundennummer-Logik: ggf. fortlaufende Nummer anhängen (z.B. "12345 (2)")
    const key = resolveCustomerNumber(p.baseNumber, truckData.currentTruckId);
    shipments[key] = newShipmentObject(truckData.currentTruckId);
    shipments[key].totalPiecesExpected = val === '' ? null : Number(val);

    $('newShipmentSection').classList.add('hidden');
    pendingNewShipment = null;

    // Den ursprünglichen Scan jetzt in der neuen Sendung erfassen
    addScanToShipment(key, p, pendingSingleScanNote, $('comboCheckbox').checked, true);
    if (pendingSingleScanNote !== null) { pendingSingleScanNote = null; hideNoteSection(); }
    $('comboCheckbox').checked = false;
    currentShipmentNumber = key;
    renderAll();
    showFeedback(`Neue Sendung ${key} angelegt.`, 'success', 2500);
    refocusInput();
}

function cancelNewShipment() {
    pendingNewShipment = null;
    $('newShipmentSection').classList.add('hidden');
    refocusInput();
}

/* --------------------------- Notizen (Einzelscan) ------------------- */
function toggleNoteSection() {
    const sec = $('noteSection');
    if (sec.classList.contains('hidden')) {
        sec.classList.remove('hidden');
        $('singleNoteInput').value = pendingSingleScanNote || '';
        $('singleNoteInput').focus();
    } else {
        hideNoteSection();
        refocusInput();
    }
    updateNoteButton();
}
function hideNoteSection() { $('noteSection').classList.add('hidden'); }
function updateNoteButton() {
    $('noteButton').classList.toggle('active', pendingSingleScanNote !== null);
}
function saveSingleNote(evt) {
    evt.preventDefault();
    const v = $('singleNoteInput').value.trim();
    pendingSingleScanNote = v === '' ? null : v;
    hideNoteSection();
    updateNoteButton();
    showFeedback(pendingSingleScanNote ? 'Notiz für den nächsten Scan aktiv.' : 'Notiz entfernt.', 'success', 2000);
    refocusInput();
}
function cancelSingleNote() {
    pendingSingleScanNote = null;
    hideNoteSection();
    updateNoteButton();
    refocusInput();
}

/* --------------------- Notizen bearbeiten/löschen ------------------- */
function openInlineNoteEditor(itemIdx, noteIdx) {
    removeActiveInlineNoteEditor();
    const span = document.querySelector(`.note-text[data-note-edit="${itemIdx}:${noteIdx}"]`);
    if (!span) return;
    const s = shipments[currentShipmentNumber];
    if (!s) return;
    const note = s.items[itemIdx].notes[noteIdx];

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'note-inline-editor';
    input.value = note;
    inlineNoteSaved = false;
    span.replaceWith(input);
    input.focus();
    input.select();
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); saveInlineNote(itemIdx, noteIdx, input.value); }
        else if (e.key === 'Escape') { inlineNoteSaved = true; renderDetails(); refocusInput(); }
    });
    input.addEventListener('blur', () => saveInlineNote(itemIdx, noteIdx, input.value));
}
function removeActiveInlineNoteEditor() {
    const editor = document.querySelector('.note-inline-editor');
    if (editor) { inlineNoteSaved = true; renderDetails(); }
}
function saveInlineNote(itemIdx, noteIdx, value) {
    if (inlineNoteSaved) return;
    inlineNoteSaved = true;
    const s = shipments[currentShipmentNumber];
    if (!s) return;
    const v = value.trim();
    if (v === '') s.items[itemIdx].notes.splice(noteIdx, 1);
    else s.items[itemIdx].notes[noteIdx] = v;
    saveAndSync();
    renderAll();
}

function openNoteEditModal(baseNumber, itemIdx, noteIdx) {
    const s = shipments[baseNumber];
    if (!s || !s.items[itemIdx]) return;
    noteEditTarget = { baseNumber, itemIdx, noteIdx };
    $('noteEditTextarea').value = s.items[itemIdx].notes[noteIdx] || '';
    openModal('noteEditModal');
}
function saveNoteEditModal(evt) {
    evt.preventDefault();
    if (!noteEditTarget) return;
    const { baseNumber, itemIdx, noteIdx } = noteEditTarget;
    const s = shipments[baseNumber];
    if (!s) return;
    const v = $('noteEditTextarea').value.trim();
    if (v === '') s.items[itemIdx].notes.splice(noteIdx, 1);
    else s.items[itemIdx].notes[noteIdx] = v;
    noteEditTarget = null;
    closeModal('noteEditModal');
    saveAndSync();
    renderAll();
}
function deleteNote(baseNumber, itemIdx, noteIdx) {
    const s = shipments[baseNumber];
    if (!s || !s.items[itemIdx]) return;
    s.items[itemIdx].notes.splice(noteIdx, 1);
    saveAndSync();
    renderAll();
}
function deleteItem(baseNumber, itemIdx) {
    const s = shipments[baseNumber];
    if (!s || !s.items[itemIdx]) return;
    s.items.splice(itemIdx, 1);
    saveAndSync();
    renderAll();
    refocusInput();
}

/* =====================================================================
   BATCH-MODUS
   ===================================================================== */
function isBatchMode() { return $('batchModeToggle').checked; }

function addScanToBatch(processed) {
    batchScans.push({
        raw: processed.raw,
        baseNumber: processed.baseNumber,
        suffix: processed.suffix,
        status: $('securityStatusSelect').value, // Dropdown ist gesperrt, behält den Wert
        timestamp: new Date().toISOString(),
        note: $('batchNoteToggle').checked ? ($('batchNoteInput').value.trim() || null) : null,
        isCombo: false // im Batch-Modus gesperrt
    });
    renderBatchList();
    if ($('batchFeedbackToggle').checked) showBatchFeedback(processed);
    $('shipmentNumberInput').value = '';
    updateClearButton();
    refocusInput(); // sofort neu fokussieren (Scanner-Tempo)
}

function renderBatchList() {
    const list = $('batchList');
    $('batchCount').textContent = `Anzahl: ${batchScans.length}`;
    if (!batchScans.length) { list.innerHTML = '<div class="empty-hint">Noch keine Scans im Batch.</div>'; return; }
    list.innerHTML = batchScans.map((b, i) => `
        <div class="batch-entry">
            <span>${escapeHtml(b.raw)}<br><span class="entry-meta">${escapeHtml(displayStatus(b.status))}${b.note ? ' · 🗒️' : ''}</span></span>
            <button type="button" class="icon-btn tiny" data-batch-remove="${i}" title="Eintrag entfernen">×</button>
        </div>`).join('');
}

function removeBatchEntry(i) {
    batchScans.splice(i, 1);
    renderBatchList();
}

function saveBatch() {
    if (!batchScans.length) { showFeedback('Batch ist leer.', 'error', 2500); return; }
    let errorCount = 0;
    for (const scan of batchScans.slice()) {
        // Unbekannte Sendung im Batch: ohne Nachfrage mit offenem Soll anlegen
        if (!shipments[scan.baseNumber]) {
            const key = resolveCustomerNumber(scan.baseNumber, truckData.currentTruckId);
            shipments[key] = newShipmentObject(truckData.currentTruckId);
            if (key !== scan.baseNumber) scan.baseNumber = key;
        }
        const ok = addScanToShipment(scan.baseNumber, scan, scan.note, false, true);
        if (!ok) errorCount++;
    }
    batchScans = [];
    renderBatchList();
    saveAndSync();
    renderAll();
    showFeedback(errorCount
        ? `Batch gespeichert – ${errorCount} Scan(s) wegen Fehlern übersprungen.`
        : 'Batch gespeichert.', errorCount ? 'error' : 'success', 3500);
}

function clearBatch() {
    batchScans = [];
    renderBatchList();
}

function showBatchFeedback(processed) {
    $('batchFeedbackText').textContent = `${processed.raw} · ${displayStatus($('securityStatusSelect').value)}`;
    openModal('batchFeedbackModal');
    clearTimeout(batchFeedbackTimer);
    batchFeedbackTimer = setTimeout(() => closeModal('batchFeedbackModal'), 1200);
}

function onBatchModeToggleChange() {
    const toggle = $('batchModeToggle');
    if (toggle.checked) {
        $('batchArea').classList.remove('hidden');
        $('securityStatusSelect').disabled = true;   // Status-Dropdown gesperrt
        $('comboCheckbox').disabled = true;          // Kombi-Checkbox gesperrt
        $('comboLine').classList.remove('visible');
    } else {
        // Warnung bei ungespeicherten Scans
        if (batchScans.length) {
            const ok = confirm('Batch-Modus deaktivieren? Nicht gespeicherte Scans im aktuellen Batch gehen verloren!');
            if (!ok) { toggle.checked = true; return; } // Abbruch: Modus bleibt aktiv
            batchScans = [];
            renderBatchList();
        }
        $('batchArea').classList.add('hidden');
        $('securityStatusSelect').disabled = false;
        $('comboCheckbox').disabled = false;
        updateComboVisibility();
    }
    refocusInput();
}

function onBatchNoteToggleChange() {
    $('batchNoteRow').classList.toggle('hidden', !$('batchNoteToggle').checked);
}

/* =====================================================================
   HU-LISTEN
   ===================================================================== */
function setHuImportStatus(text, isError) {
    const el = $('huImportStatus');
    el.textContent = text || '';
    el.className = 'hu-import-status' + (isError ? ' error' : ' success');
}

// NACHLIEFERUNG-Automatik: Namen hochzählen, bis einer frei ist
function nextFreeName(base) {
    let i = 1;
    while (Object.prototype.hasOwnProperty.call(shipments, `${base} ${i}`)) i++;
    return `${base} ${i}`;
}

// Unterstützt "Nummer" oder "Nummer|Verpackung|Dimensionen|Bruttogewicht"
function parseHuLine(line) {
    const parts = line.split('|').map((p) => p.trim());
    return {
        number: parts[0] || line,
        verpackung: parts[1] || '–',
        dimensionen: parts[2] || '–',
        bruttogewicht: parts[3] || '–'
    };
}

function importHuList(andContinue) {
    const orderNumber = $('mainOrderNumberInput').value.trim().toUpperCase();
    if (!orderNumber) { setHuImportStatus('FEHLER: Bitte eine Auftragsnummer eingeben.', true); return; }
    const lines = $('huListTextarea').value.split('\n').map((l) => l.trim().toUpperCase()).filter(Boolean);
    if (!lines.length) { setHuImportStatus('FEHLER: Bitte HU-Nummern eingeben.', true); return; }

    // Normale Sendung kann nicht mit einer HU-Liste erweitert werden
    if (shipments[orderNumber] && !shipments[orderNumber].isHuListOrder) {
        playSound('errorSound');
        setHuImportStatus(`FEHLER: ${orderNumber} ist eine normale Sendung. Sie kann nicht mit einer HU-Liste erweitert werden.`, true);
        return;
    }

    let target = orderNumber;
    let isNachlieferung = false;
    if (orderNumber.includes(NACHLIEFERUNG_MARKER)) {
        target = nextFreeName(orderNumber); // z.B. "NACHLIEFERUNG 1", "NACHLIEFERUNG 2", ...
        isNachlieferung = true;
    }

    const huObjects = lines.map(parseHuLine);
    if (shipments[target] && shipments[target].isHuListOrder) {
        // bestehenden HU-Listen-Auftrag erweitern
        shipments[target].huList.push(...huObjects);
        shipments[target].totalPiecesExpected = shipments[target].huList.length;
    } else {
        shipments[target] = newShipmentObject(truckData.currentTruckId);
        shipments[target].isHuListOrder = true;
        shipments[target].huList = huObjects;
        shipments[target].totalPiecesExpected = huObjects.length;
    }

    saveAndSync();
    renderAll();
    if (isNachlieferung) {
        playSound('nachlieferungSound'); // Nachlieferungs-Sound
        setHuImportStatus(`${target} als NACHLIEFERUNG angelegt (${huObjects.length} HUs).`, false);
    } else {
        setHuImportStatus(`${target} gespeichert (${huObjects.length} HUs).`, false);
    }

    if (andContinue) {
        // "+"-Button: aktuelle Liste speichern und direkt die nächste eingeben
        $('mainOrderNumberInput').value = '';
        $('huListTextarea').value = '';
        $('mainOrderNumberInput').focus();
    } else {
        setTimeout(() => closeModal('huImportModal'), 700);
    }
}

/* --------------------- Offene-HUs-Modal (3 Tabs) -------------------- */
function openOpenHusModal() {
    renderHuTabs();
    openModal('openHusModal');
}

function switchHuTab(tab) {
    activeHuTab = tab;
    document.querySelectorAll('.hus-tab').forEach((b) => b.classList.toggle('active', b.dataset.hutab === tab));
    renderHuTabs();
}

function isHuSecured(shipment, huNumber) {
    return shipment.items.some((it) => it.raw === huNumber && !NON_COUNTING_STATUSES.includes(it.status));
}

function renderHuTabs() {
    const content = $('husTabContent');
    updateHuBadges();

    if (activeHuTab === 'offeneSicherung') {
        let html = '';
        for (const [num, s] of Object.entries(shipments)) {
            if (!s.isHuListOrder) continue;
            const open = (s.huList || []).filter((hu) => !isHuSecured(s, hu.number));
            if (!open.length) continue;
            html += `<div class="hus-order-header">${escapeHtml(num)}</div>`;
            html += open.map((hu) => {
                const da = s.items.some((it) => it.raw === hu.number && it.status === 'Dunkelalarm');
                return `<div class="hus-entry ${da ? 'dunkelalarm' : ''}" data-hu-details="${escapeHtml(num)}|${escapeHtml(hu.number)}">
                    <span>${escapeHtml(hu.number)}${da ? ' 🔴' : ''}</span><span>›</span></div>`;
            }).join('');
        }
        content.innerHTML = html || '<div class="empty-hint">Keine offenen Sicherungen. ✅</div>';
        return;
    }

    if (activeHuTab === 'fehlendeEingaenge') {
        let html = '';
        for (const [num, s] of Object.entries(shipments)) {
            if (!s.totalPiecesExpected) continue;
            const we = getGoodsReceiptCount(s);
            if (we >= s.totalPiecesExpected) continue;
            html += `<div class="hus-entry"><span>${escapeHtml(num)}</span>
                <span>WE ${we}/${s.totalPiecesExpected} – fehlen ${s.totalPiecesExpected - we}</span></div>`;
        }
        content.innerHTML = html || '<div class="empty-hint">Keine fehlenden Eingänge. ✅</div>';
        return;
    }

    // Tab: Dunkelalarm – Positionen rot hervorgehoben
    let html = '';
    for (const [num, s] of Object.entries(shipments)) {
        const da = s.items.filter((it) => it.status === 'Dunkelalarm');
        if (!da.length) continue;
        html += `<div class="hus-order-header">${escapeHtml(num)}</div>`;
        html += da.map((it) => `<div class="hus-entry dunkelalarm"><span>${escapeHtml(it.raw)}</span>
            <span>${formatTime(it.timestamp)}</span></div>`).join('');
    }
    content.innerHTML = html || '<div class="empty-hint">Keine Dunkelalarme. ✅</div>';
}

function updateHuBadges() {
    let missing = 0;
    for (const s of Object.values(shipments)) {
        if (s.totalPiecesExpected && getGoodsReceiptCount(s) < s.totalPiecesExpected) missing++;
    }
    const da = Object.values(shipments)
        .reduce((sum, s) => sum + s.items.filter((it) => it.status === 'Dunkelalarm').length, 0);

    const mrB = $('missingReceiptsBadge');
    mrB.textContent = missing;
    mrB.classList.toggle('hidden', missing === 0);
    const daB = $('dunkelalarmBadge');
    daB.textContent = da;
    daB.classList.toggle('hidden', da === 0);
}

function showHuDetails(orderNumber, huNumber) {
    const s = shipments[orderNumber];
    if (!s) return;
    const hu = (s.huList || []).find((h) => h.number === huNumber) || { number: huNumber };
    $('huDetailsList').innerHTML = `
        <div><dt>Nummer:</dt><dd>${escapeHtml(hu.number)}</dd></div>
        <div><dt>Verpackung:</dt><dd>${escapeHtml(hu.verpackung || '–')}</dd></div>
        <div><dt>Dimensionen:</dt><dd>${escapeHtml(hu.dimensionen || '–')}</dd></div>
        <div><dt>Bruttogewicht:</dt><dd>${escapeHtml(hu.bruttogewicht || '–')}</dd></div>`;
    openModal('huDetailsModal');
}

/* =====================================================================
   SENDUNGSLISTE & DETAILANSICHT
   ===================================================================== */
function lastActivity(key) {
    const items = shipments[key].items;
    if (!items.length) return 0;
    return new Date(items[items.length - 1].timestamp).getTime();
}

function renderShipmentList() {
    const list = $('shipmentList');
    const filter = ($('shipmentSearchInput').value || '').trim().toUpperCase();
    const keys = Object.keys(shipments)
        .filter((k) => !filter || k.includes(filter) || String(shipments[k].parentOrderNumber || '').includes(filter))
        .sort((a, b) => lastActivity(b) - lastActivity(a));

    if (!keys.length) {
        list.innerHTML = '<div class="empty-hint">Keine Sendungen vorhanden.</div>';
        return;
    }
    list.innerHTML = keys.map((k) => shipmentCardHtml(k)).join('');
}

function shipmentCardHtml(k) {
    const s = shipments[k];
    const counted = getCountedPieces(s);
    const expected = s.totalPiecesExpected;
    const pct = expected ? Math.min(100, Math.round((counted / expected) * 100)) : 0;
    const done = expected && counted >= expected ? ' done' : '';
    const parent = s.parentOrderNumber ? `<span class="parent-badge">LKW ${escapeHtml(s.parentOrderNumber)}</span>` : '';
    const hu = s.isHuListOrder ? '<span class="chip-hu">HU-Liste</span>' : '';
    return `
    <div class="shipment-card card ${currentShipmentNumber === k ? 'selected' : ''}" data-number="${escapeHtml(k)}">
        <button type="button" class="shipment-card-header" data-select="${escapeHtml(k)}">
            <span class="shipment-number">${escapeHtml(k)}</span>
            ${parent}${hu}
            <span class="counter">${expected ? `${counted}/${expected}` : `${counted}`}</span>
            <span class="progress-track"><span class="progress-fill${done}" style="width:${pct}%"></span></span>
        </button>
        <div class="shipment-card-actions">
            <button type="button" class="btn small primary" data-edit="${escapeHtml(k)}">Edit</button>
            <button type="button" class="btn small info" data-pdf="${escapeHtml(k)}">PDF</button>
            <button type="button" class="btn small danger" data-delete="${escapeHtml(k)}">Löschen</button>
        </div>
    </div>`;
}

function renderDetails() {
    const placeholder = $('detailsPlaceholder');
    const content = $('detailsContent');
    const s = currentShipmentNumber ? shipments[currentShipmentNumber] : null;
    if (!s) {
        placeholder.classList.remove('hidden');
        content.classList.add('hidden');
        return;
    }
    placeholder.classList.add('hidden');
    content.classList.remove('hidden');

    const k = currentShipmentNumber;
    const counted = getCountedPieces(s);
    const expected = s.totalPiecesExpected;
    const we = getGoodsReceiptCount(s);
    const pct = expected ? Math.min(100, Math.round((counted / expected) * 100)) : 0;
    const done = expected && counted >= expected ? ' done' : '';

    content.innerHTML = `
        <div class="details-header">
            <span class="shipment-number">${escapeHtml(k)}</span>
            ${s.parentOrderNumber ? `<span class="parent-badge">LKW ${escapeHtml(s.parentOrderNumber)}</span>` : ''}
            ${s.isHuListOrder ? '<span class="chip-hu">HU-Liste</span>' : ''}
        </div>
        <div class="details-header">
            <span class="status-chip chip-XRY">Gezählt: ${counted}${expected ? '/' + expected : ''}</span>
            <span class="status-chip chip-Wareneingang">WE: ${we}</span>
            <span class="progress-track"><span class="progress-fill${done}" style="width:${pct}%"></span></span>
        </div>
        <div class="details-list">
            ${s.items.map((it, idx) => `
                <div class="detail-item ${it.status === 'Dunkelalarm' ? 'dunkelalarm' : ''}">
                    <div class="detail-item-main">
                        <span class="item-number">${escapeHtml(it.raw)}${it.isCombo ? ' <em class="kombi">Kombi</em>' : ''}</span>
                        <span class="status-chip chip-${cssStatus(it.status)}">${escapeHtml(displayStatus(it.status))}</span>
                        <button type="button" class="icon-btn tiny" data-del-item="${idx}" title="Packstück löschen">🗑</button>
                    </div>
                    <div class="item-timestamp">${escapeHtml(formatTime(it.timestamp))}${it.suffix ? ' · Suffix ' + escapeHtml(it.suffix) : ''}</div>
                    ${(it.notes || []).map((n, ni) => `
                        <div class="item-note">
                            <em>Notiz:</em>
                            <span class="note-text" data-note-edit="${idx}:${ni}" title="Klicken zum Bearbeiten">${escapeHtml(n)}</span>
                            <button type="button" class="icon-btn tiny" data-note-modal="${idx}:${ni}" title="Notiz bearbeiten">✏️</button>
                            <button type="button" class="icon-btn tiny" data-note-del="${idx}:${ni}" title="Notiz löschen">🗑</button>
                        </div>`).join('')}
                </div>`).join('') || '<div class="empty-hint">Noch keine Scans für diese Sendung.</div>'}
        </div>`;
}

function renderLkwMenu() {
    const c = $('lkw-menu-container');
    const ids = Object.keys(truckData.trucks);
    if (!ids.length) {
        c.innerHTML = '<div class="empty-hint">Keine LKW vorhanden.</div><div class="lkw-hint">Tipp: LKW hinzufügen – neue Sendungen werden dann dieser Vorverladeliste zugeordnet. Long-Press = Löschen/Umbenennen.</div>';
        return;
    }
    c.innerHTML = ids.sort().map((id) => {
        const t = truckData.trucks[id];
        return `
        <div class="lkw-entry ${t.active ? 'active' : ''}" data-truckid="${escapeHtml(id)}">
            <span>
                <span class="lkw-name">${escapeHtml(id)}</span>
                ${truckData.currentTruckId === id ? '<br><span class="lkw-current">● Zuordnungsziel</span>' : ''}
            </span>
            <label class="toggle-switch small">
                <input type="checkbox" class="lkw-toggle" data-truckid="${escapeHtml(id)}" ${t.active ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        </div>`;
    }).join('') + '<div class="lkw-hint">Long-Press auf einen LKW: Löschen oder Umbenennen.</div>';
}

function renderAll() {
    renderShipmentList();
    renderDetails();
    renderLkwMenu();
    updateHuBadges();
}

/* --------------------------- Edit-Modal ----------------------------- */
function openEditModal(baseNumber) {
    const s = shipments[baseNumber];
    if (!s) return;
    editTargetNumber = baseNumber;
    $('editShipmentNumber').value = baseNumber;
    $('editManualWeCount').value = s.manualGoodsReceiptCount ?? '';
    $('editExpectedCount').value = s.totalPiecesExpected ?? '';
    openModal('editModal');
}

function saveEditModal(evt) {
    evt.preventDefault();
    const s = shipments[editTargetNumber];
    if (!s) { closeModal('editModal'); return; }
    const we = $('editManualWeCount').value.trim();
    const exp = $('editExpectedCount').value.trim();
    s.manualGoodsReceiptCount = (we === '' || isNaN(Number(we))) ? null : Number(we);
    s.totalPiecesExpected = (exp === '' || isNaN(Number(exp))) ? null : Number(exp);
    closeModal('editModal');
    saveAndSync();
    renderAll();
    showFeedback(`Sendung ${editTargetNumber} gespeichert.`, 'success', 2000);
}

function deleteShipment(baseNumber) {
    if (!confirm(`Sendung ${baseNumber} wirklich löschen?`)) return;
    delete shipments[baseNumber];
    if (currentShipmentNumber === baseNumber) currentShipmentNumber = null;
    saveAndSync();
    renderAll();
    showFeedback(`Sendung ${baseNumber} gelöscht.`, 'success', 2000);
}

/* =====================================================================
   PDF & E-MAIL
   ===================================================================== */
function generateShipmentPdf(baseNumber) {
    const s = shipments[baseNumber];
    if (!s) return null;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Überschriften in Courier, fett
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    const title = s.parentOrderNumber
        ? `Vorverladeliste ${s.parentOrderNumber}`   // Titel beginnt mit "Vorverladeliste ..."
        : `Sendung ${baseNumber}`;
    doc.text(title, 14, 16);

    let y = 24;
    if (s.parentOrderNumber) {
        doc.setFontSize(11);
        doc.text(`Gesamtübersicht Vorverladeliste ${s.parentOrderNumber}:`, 14, y);
        y += 6;
    }
    doc.setFontSize(9);
    doc.text(`Sendung: ${baseNumber}`, 14, y);
    doc.text(`Gezaehlt: ${getCountedPieces(s)}${s.totalPiecesExpected ? '/' + s.totalPiecesExpected : ''}   Wareneingang: ${getGoodsReceiptCount(s)}`, 14, y + 5);

    const body = s.items.map((it) => [
        it.raw,
        displayStatus(it.status) + (it.isCombo ? ' (Kombi)' : ''),
        formatTime(it.timestamp),
        (it.notes || []).join(' | ')
    ]);
    doc.autoTable({
        startY: y + 10,
        head: [['Nummer', 'Status', 'Zeit', 'Notizen']],
        body,
        styles: { font: 'courier', fontSize: 9 },
        headStyles: { fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 42 } }
    });
    return doc;
}

// PDF pro Sendung als E-Mail-Anhang über das Mail-Backend versenden
async function sendPdfEmailViaBackend(baseNumber) {
    const s = shipments[baseNumber];
    if (!s) return;
    const doc = generateShipmentPdf(baseNumber);
    if (!doc) return;
    const pdfBase64 = doc.output('base64');
    const subject = s.parentOrderNumber ? `Vorverladeliste ${s.parentOrderNumber}` : `Sendung ${baseNumber}`;
    try {
        const res = await fetch(WEB_APP_URL_BACKEND, {
            method: 'POST', mode: 'cors', cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'sendPdf',
                subject,
                filename: `${baseNumber}.pdf`,
                pdfBase64
            })
        });
        showFeedback(res.ok ? `PDF für ${baseNumber} per E-Mail versendet.` : 'FEHLER: PDF-Versand fehlgeschlagen.',
            res.ok ? 'success' : 'error');
    } catch (e) {
        showError('FEHLER: PDF-E-Mail-Versand fehlgeschlagen.');
    }
}

function buildSummaryText() {
    const lines = [];
    lines.push(`Fracht Tracker - Zusammenfassung (${formatTime(new Date().toISOString())})`);
    lines.push(`Sendungen gesamt: ${Object.keys(shipments).length}`);
    for (const [k, s] of Object.entries(shipments)) {
        const counted = getCountedPieces(s);
        const expected = s.totalPiecesExpected ?? '-';
        const we = getGoodsReceiptCount(s);
        const da = s.items.filter((it) => it.status === 'Dunkelalarm').length;
        const offen = (s.totalPiecesExpected && counted < s.totalPiecesExpected)
            ? `OFFEN: ${s.totalPiecesExpected - counted}` : 'vollstaendig';
        lines.push(`- ${k}${s.parentOrderNumber ? ` (Vorverladeliste ${s.parentOrderNumber})` : ''}: ` +
            `${counted}/${expected} gezaehlt, WE ${we}, Dunkelalarm ${da}, ${offen}`);
    }
    return lines.join('\n');
}

async function sendSummaryEmail() {
    if (webAppUrlMissing()) { setSheetStatus('Fehler: Web App URL fehlt.', 'error'); return; }
    try {
        const res = await fetch(WEB_APP_URL_BACKEND, {
            method: 'POST', mode: 'cors', cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'sendSummary',
                subject: 'Fracht Tracker – Taegliche Zusammenfassung',
                text: buildSummaryText()
            })
        });
        setSheetStatus(res.ok ? 'Zusammenfassung per E-Mail gesendet.' : 'Fehler beim E-Mail-Versand.',
            res.ok ? 'success' : 'error');
    } catch (e) {
        setSheetStatus('Fehler beim E-Mail-Versand.', 'error');
    }
}

function webAppUrlMissing() {
    return !WEB_APP_URL || WEB_APP_URL.includes('YOUR_DEPLOYED_WEB_APP_URL_HERE');
}

async function sendToSheet() {
    if (webAppUrlMissing()) { setSheetStatus('Fehler: Web App URL fehlt.', 'error'); return; }
    setSheetStatus('Sende an Google Sheet…', 'info');
    try {
        const res = await fetch(WEB_APP_URL, {
            method: 'POST', mode: 'cors', cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'syncSheet', shipments })
        });
        setSheetStatus(res.ok ? 'Daten erfolgreich an Google Sheet gesendet.' : 'Fehler beim Senden an Google Sheet.',
            res.ok ? 'success' : 'error');
    } catch (e) {
        setSheetStatus('Fehler beim Senden an Google Sheet.', 'error');
    }
}

function resetAllData() {
    if (!confirm('Wirklich ALLE Daten zurücksetzen? Das kann NICHT rückgängig gemacht werden!')) return;
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LKW_STORAGE_KEY);
    shipments = {};
    truckData = { trucks: {}, currentTruckId: null };
    currentShipmentNumber = null;
    batchScans = [];
    renderBatchList();
    renderAll();
    setSheetStatus('Alle Daten zurückgesetzt.', 'success');
}

/* =====================================================================
   LKW-VERWALTUNG
   ===================================================================== */
function addTruck() {
    const name = prompt('LKW-ID / Vorverladeliste-Nr. eingeben:');
    if (!name || !name.trim()) return;
    const id = name.trim().toUpperCase();
    if (truckData.trucks[id]) { showFeedback('LKW existiert bereits.', 'error', 2500); return; }
    truckData.trucks[id] = { active: true };
    truckData.currentTruckId = id; // zuletzt aktivierter LKW = Zuordnungsziel
    saveTrucksLocal();
    syncTrucksToServer();
    renderLkwMenu();
    showFeedback(`LKW ${id} hinzugefügt (Zuordnungsziel).`, 'success', 2500);
}

function handleTruckToggle(truckId, checked) {
    if (!truckData.trucks[truckId]) return;
    truckData.trucks[truckId].active = checked;
    if (checked) truckData.currentTruckId = truckId; // zuletzt aktivierter LKW = Zuordnungsziel
    saveTrucksLocal();
    syncTrucksToServer();
    renderLkwMenu();
}

// Long-Press: Vibrieren (50 ms), dann Löschen (OK) oder Umbenennen (Abbrechen)
function handleTruckLongPress(truckId) {
    if (navigator.vibrate) { try { navigator.vibrate(50); } catch (e) { /* ignoriert */ } }
    const del = confirm('Möchtest du den LKW löschen?\n[OK] = LKW & alle Scans löschen\n[Abbrechen] = LKW umbenennen');
    if (del) {
        // LKW & alle zugeordneten Scans löschen
        delete truckData.trucks[truckId];
        for (const k of Object.keys(shipments)) {
            if (shipments[k].parentOrderNumber === truckId) delete shipments[k];
        }
        if (truckData.currentTruckId === truckId) truckData.currentTruckId = null;
        if (currentShipmentNumber && !shipments[currentShipmentNumber]) currentShipmentNumber = null;
        saveAndSync();
        saveTrucksLocal();
        syncTrucksToServer();
        renderAll();
        showFeedback(`LKW ${truckId} gelöscht.`, 'success', 2500);
    } else {
        const neu = prompt('Neuen LKW-Namen eingeben:', truckId);
        if (neu && neu.trim()) {
            const neuId = neu.trim().toUpperCase();
            if (neuId !== truckId && !truckData.trucks[neuId]) {
                truckData.trucks[neuId] = truckData.trucks[truckId];
                delete truckData.trucks[truckId];
                for (const k of Object.keys(shipments)) {
                    if (shipments[k].parentOrderNumber === truckId) shipments[k].parentOrderNumber = neuId;
                }
                if (truckData.currentTruckId === truckId) truckData.currentTruckId = neuId;
                saveAndSync();
                saveTrucksLocal();
                syncTrucksToServer();
                renderAll();
            }
        }
    }
}

/* =====================================================================
   SEITENMENÜ
   ===================================================================== */
function openMenu() {
    menuOpen = true;
    $('sideMenu').classList.add('open');
    $('menu-overlay').classList.remove('hidden');
}
function closeMenu() {
    menuOpen = false;
    $('sideMenu').classList.remove('open');
    $('menu-overlay').classList.add('hidden');
}

/* =====================================================================
   KLEINE UI-HILFEN
   ===================================================================== */
function updateClearButton() {
    $('clearInputButton').classList.toggle('hidden', $('shipmentNumberInput').value === '');
}

// Kombi-Zeile nur "bei Bedarf" einblenden: wenn ein Scan ansteht (Eingabe vorhanden)
function updateComboVisibility() {
    const show = $('shipmentNumberInput').value !== '' && !isBatchMode();
    $('comboLine').classList.toggle('visible', show);
}

/* =====================================================================
   EVENTS & START
   ===================================================================== */
function bindEvents() {
    // --- Scan ---
    $('scanForm').addEventListener('submit', handleScanSubmit);
    $('shipmentNumberInput').addEventListener('input', () => { updateClearButton(); updateComboVisibility(); });
    $('clearInputButton').addEventListener('click', () => {
        $('shipmentNumberInput').value = '';
        updateClearButton();
        updateComboVisibility();
        $('shipmentNumberInput').focus();
    });

    // --- Neue Sendung ---
    $('confirmNewShipmentButton').addEventListener('click', confirmNewShipment);
    $('cancelNewShipmentButton').addEventListener('click', cancelNewShipment);
    $('newShipmentCount').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewShipment(); } });

    // --- Notizen (Einzelscan) ---
    $('noteButton').addEventListener('click', toggleNoteSection);
    $('singleNoteForm').addEventListener('submit', saveSingleNote);
    $('cancelNoteButton').addEventListener('click', cancelSingleNote);
    $('note-edit-form').addEventListener('submit', saveNoteEditModal);

    // --- Batch-Modus ---
    $('batchModeToggle').addEventListener('change', onBatchModeToggleChange);
    $('saveBatchButton').addEventListener('click', saveBatch);
    $('clearBatchButton').addEventListener('click', clearBatch);
    $('batchFeedbackToggle').addEventListener('change', () => {});
    $('batchNoteToggle').addEventListener('change', onBatchNoteToggleChange);
    $('batchList').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-batch-remove]');
        if (btn) removeBatchEntry(Number(btn.dataset.batchRemove));
    });

    // --- Suche (nur Anzeige-Filterung) ---
    $('shipmentSearchInput').addEventListener('input', renderShipmentList);

    // --- Sendungsliste (Delegation) ---
    $('shipmentList').addEventListener('click', (e) => {
        const select = e.target.closest('[data-select]');
        if (select) {
            currentShipmentNumber = select.dataset.select;
            renderAll();
            $('currentShipmentDetails').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return;
        }
        const edit = e.target.closest('[data-edit]');
        if (edit) { openEditModal(edit.dataset.edit); return; }
        const pdf = e.target.closest('[data-pdf]');
        if (pdf) { sendPdfEmailViaBackend(pdf.dataset.pdf); return; }
        const del = e.target.closest('[data-delete]');
        if (del) { deleteShipment(del.dataset.delete); }
    });
    $('edit-form').addEventListener('submit', saveEditModal);

    // --- Detailansicht (Delegation) ---
    $('detailsContent').addEventListener('click', (e) => {
        const delItem = e.target.closest('[data-del-item]');
        if (delItem) { deleteItem(currentShipmentNumber, Number(delItem.dataset.delItem)); return; }
        const noteModal = e.target.closest('[data-note-modal]');
        if (noteModal) {
            const [i, n] = noteModal.dataset.noteModal.split(':').map(Number);
            openNoteEditModal(currentShipmentNumber, i, n);
            return;
        }
        const noteDel = e.target.closest('[data-note-del]');
        if (noteDel) {
            const [i, n] = noteDel.dataset.noteDel.split(':').map(Number);
            deleteNote(currentShipmentNumber, i, n);
            return;
        }
        const noteEdit = e.target.closest('[data-note-edit]');
        if (noteEdit) {
            const [i, n] = noteEdit.dataset.noteEdit.split(':').map(Number);
            openInlineNoteEditor(i, n);
        }
    });

    // --- Seitenmenü ---
    $('menu-toggle-btn').addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
    $('menu-overlay').addEventListener('click', closeMenu);
    $('importHuButton').addEventListener('click', () => { closeMenu(); setHuImportStatus(''); openModal('huImportModal'); });
    $('showOpenHusButton').addEventListener('click', () => { closeMenu(); openOpenHusModal(); });
    $('sendToSheetButton').addEventListener('click', sendToSheet);
    $('sendSummaryEmailButton').addEventListener('click', sendSummaryEmail);
    $('resetDataButton').addEventListener('click', resetAllData);
    $('addTruckButton').addEventListener('click', addTruck);

    // --- HU-Import ---
    $('importHuConfirmButton').addEventListener('click', () => importHuList(false));
    $('addAndContinueHuButton').addEventListener('click', () => importHuList(true));

    // --- Offene-HUs-Modal: Tabs + Details ---
    document.querySelectorAll('.hus-tab').forEach((btn) => {
        btn.addEventListener('click', () => switchHuTab(btn.dataset.hutab));
    });
    $('husTabContent').addEventListener('click', (e) => {
        const entry = e.target.closest('[data-hu-details]');
        if (!entry) return;
        const [order, hu] = entry.dataset.huDetails.split('|');
        showHuDetails(order, hu);
    });

    // --- Modals: Schließen-X und Klick auf den Hintergrund ---
    document.addEventListener('click', (e) => {
        const closer = e.target.closest('[data-close-modal]');
        if (closer) {
            const overlay = closer.closest('.modal-overlay');
            if (overlay) closeModal(overlay.id);
            return;
        }
        if (e.target.classList && e.target.classList.contains('modal-overlay')) {
            closeModal(e.target.id);
            refocusInput();
        }
    });

    // --- Escape: oberstes Modal bzw. Menü schließen ---
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const open = document.querySelector('.modal-overlay:not(.hidden)');
        if (open) { closeModal(open.id); refocusInput(); return; }
        if (menuOpen) closeMenu();
    });

    // --- LKW: Toggles + Long-Press (Pointer-Events, Touch & Maus) ---
    let longPressTimer = null;
    let longPressTruckId = null;
    const lkwContainer = $('lkw-menu-container');

    lkwContainer.addEventListener('change', (e) => {
        const toggle = e.target.closest('.lkw-toggle');
        if (toggle) handleTruckToggle(toggle.dataset.truckid, toggle.checked);
    });

    lkwContainer.addEventListener('pointerdown', (e) => {
        const entry = e.target.closest('.lkw-entry');
        if (!entry || e.target.closest('.lkw-toggle')) return; // Toggle nicht als Long-Press werten
        longPressTruckId = entry.dataset.truckid;
        longPressTimer = setTimeout(() => {
            longPressTimer = null;
            handleTruckLongPress(longPressTruckId);
        }, 600);
    });
    const cancelLongPress = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
    lkwContainer.addEventListener('pointerup', cancelLongPress);
    lkwContainer.addEventListener('pointerleave', cancelLongPress);
    lkwContainer.addEventListener('pointercancel', cancelLongPress);
    lkwContainer.addEventListener('contextmenu', (e) => e.preventDefault()); // kein Browser-Menü beim Long-Press
}

/* ------------------------------ Start ------------------------------- */
async function initApp() {
    loadLocalState();
    bindEvents();
    renderBatchList();
    updateComboVisibility();
    updateNoteButton();

    $('loadingOverlay').classList.remove('hidden');
    await Promise.allSettled([loadDataFromServer(), loadTruckStatusFromServer()]);
    $('loadingOverlay').classList.add('hidden');

    renderAll();
    startBackgroundSync();
    $('shipmentNumberInput').focus();
}

document.addEventListener('DOMContentLoaded', initApp);
