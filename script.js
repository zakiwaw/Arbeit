
// Bibliotheken defensiv einbinden: Fehlt eine Lib (z. B. Datei nicht geladen),
// darf nur die jeweilige Funktion (PDF / QR-Code) ausfallen – nicht die ganze App.
const jsPDF = (window.jspdf && window.jspdf.jsPDF) || null;
if (!jsPDF) console.error('jsPDF konnte nicht geladen werden – PDF-Export ist deaktiviert.');
if (typeof window.QRCode === 'undefined') console.error('qrcode.js konnte nicht geladen werden – QR-Codes werden nicht angezeigt.');

// Browser-Zoom unterbinden. Schicht 1 ist das Viewport-Meta (user-scalable=no, maximum-scale=1), Schicht 2
// touch-action: pan-x pan-y in styles.css. Safari auf iOS ignoriert user-scalable=no seit iOS 10 – dort greifen
// zusätzlich die WebKit-Gestenereignisse und der Zwei-Finger-Schutz bei touchmove. Einfaches Scrollen und Tippen
// bleiben unberührt; die Bedienungshilfen-Lupe des Systems lässt sich (gewollt) nicht blockieren.
(function preventBrowserZoom() {
    const block = (e) => { if (e.cancelable) e.preventDefault(); };
    // WebKit (iPhone/iPad): Pinch löst gesturestart/-change/-end aus – hier komplett unterbinden
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(type => document.addEventListener(type, block, { passive: false }));
    // Zwei-Finger-Bewegung (Pinch) – nur auf WebKit registrieren; Android/Chrome respektiert bereits touch-action
    // und soll keinen blockierenden touchmove-Listener bekommen (Scroll-Performance).
    if (typeof window.GestureEvent !== 'undefined') {
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1 || (typeof e.scale === 'number' && e.scale !== 1)) block(e);
        }, { passive: false });
    }
    // Desktop/Tablet mit Trackpad oder Tastatur: Strg/Cmd + Mausrad/Pinch sowie Strg/Cmd + Plus/Minus.
    // Strg/Cmd + 0 (Zoom zurücksetzen) bleibt absichtlich erlaubt.
    document.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) block(e); }, { passive: false });
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', 'Add', 'Subtract'].includes(e.key)) block(e);
    });
})();

document.addEventListener('DOMContentLoaded', function() {

    const mainInputFormEl = document.getElementById('main-input-form'); // Dieser sollte schon da sein
    const noteInputFormEl = document.getElementById('note-input-form'); // NEU
    const noteEditFormEl = document.getElementById('note-edit-form');   // NEU
    const mainViewEl = document.getElementById('mainView');
    const detailViewEl = document.getElementById('detailView');
    const detailViewContentEl = document.getElementById('detailViewContent');
    const backToMainViewBtnEl = document.getElementById('backToMainViewBtn');
    const noteEditModalEl = document.getElementById('noteEditModal');
    const noteEditContextEl = document.getElementById('noteEditContext');
    const noteEditBaseNumberEl = document.getElementById('noteEditBaseNumber');
    const noteEditTimestampEl = document.getElementById('noteEditTimestamp');
    const noteEditNoteIndexEl = document.getElementById('noteEditNoteIndex');
    const noteEditTextareaEl = document.getElementById('noteEditTextarea');
    const saveNoteEditButtonEl = document.getElementById('saveNoteEditButton');
    const cancelNoteEditButtonEl = document.getElementById('cancelNoteEditButton');
    const shipmentNumberInputEl = document.getElementById('shipmentNumberInput');
    const editGoodsReceiptCountInputEl = document.getElementById('editGoodsReceiptCount');
    const clearInputButtonEl = document.getElementById('clearInputButton');
    const securityStatusSelectEl = document.getElementById('securityStatusSelect');
    const comboCheckboxEl = document.getElementById('comboCheckbox');
    const comboCheckboxContainerEl = document.getElementById('comboCheckboxContainer');
    const mainActionButtonEl = document.getElementById('mainActionButton');
    const tableBodyEl = document.getElementById('shipmentTableBody');
    const currentDetailsDivEl = document.getElementById('currentShipmentDetails');
    const errorDisplayEl = document.getElementById('errorDisplay');
    const batchModeToggleEl = document.getElementById('batchModeToggle');
    const batchStatusDisplayEl = document.getElementById('batchStatusDisplay');
    const batchAreaEl = document.getElementById('batchArea');
    const batchModeStatusLabelEl = document.getElementById('batchModeStatusLabel');
    const batchListEl = document.getElementById('batchList');
    const batchItemCountEl = document.getElementById('batchItemCount');
    const saveBatchButtonEl = document.getElementById('saveBatchButton');
    const clearBatchButtonEl = document.getElementById('clearBatchButton');
    const editModalEl = document.getElementById('editModal');
    const editShipmentBaseNumberInputEl = document.getElementById('editShipmentBaseNumber');
    const editShipmentNumberDisplayEl = document.getElementById('editShipmentNumberDisplay');
    const editTotalPiecesExpectedInputEl = document.getElementById('editTotalPiecesExpected');
    const saveEditButtonEl = document.getElementById('saveEditButton');
    const cancelEditButtonEl = document.getElementById('cancelEditButton');
    const newTotalSectionEl = document.getElementById('newTotalSection');
    const newTotalLabelEl = document.getElementById('newTotalLabel');
    const newTotalInputEl = document.getElementById('newTotalInput');
    const confirmNewTotalBtnEl = document.getElementById('confirmNewTotalBtn');
    const skipNewTotalBtnEl = document.getElementById('skipNewTotalBtn');
    const sendToSheetButtonEl = document.getElementById('sendToSheetButton');
    const sheetStatusEl = document.getElementById('sheetStatus');
    const menuToggleBtnEl = document.getElementById('menu-toggle-btn');
    const sideMenuEl = document.getElementById('side-menu');
    const menuOverlayEl = document.getElementById('menu-overlay');
    const resetDataButtonEl = document.getElementById('resetDataButton');
    const sendSummaryEmailButtonEl = document.getElementById('sendSummaryEmailButton');
    const noteToggleButtonEl = document.getElementById('noteToggleButton');
    const noteInputContainerEl = document.getElementById('noteInputContainer');
    const noteInputEl = document.getElementById('noteInput');
    const clearNoteButtonEl = document.getElementById('clearNoteButton');
    const batchNoteModalEl = document.getElementById('batchNoteModal');
    const batchNoteInputEl = document.getElementById('batchNoteInput');
    const confirmBatchNoteButtonEl = document.getElementById('confirmBatchNoteButton');
    const skipBatchNoteButtonEl = document.getElementById('skipBatchNoteButton');
    const batchNoteToggleEl = document.getElementById('batchNoteToggle');
    const currentBatchNoteDisplayEl = document.getElementById('currentBatchNoteDisplay');
    const containerEl = document.querySelector('.container');
    const importHuListButtonEl = document.getElementById('importHuListButton');
    const importHuModalEl = document.getElementById('importHuModal');
    const mainOrderNumberInputEl = document.getElementById('mainOrderNumberInput');
    const huListTextareaEl = document.getElementById('huListTextarea');
    const saveHuListButtonEl = document.getElementById('saveHuListButton');
    const cancelHuImportButtonEl = document.getElementById('cancelHuImportButton');
    const addAndContinueHuButtonEl = document.getElementById('addAndContinueHuButton');
    const showOpenHusButtonEl = document.getElementById('showOpenHusButton');
    const openHusModalEl = document.getElementById('openHusModal');
    const openHusListContainerEl = document.getElementById('openHusListContainer');
    const closeOpenHusModalButtonEl = document.getElementById('closeOpenHusModalButton');
    const showOpenSecurityHusBtnEl = document.getElementById('showOpenSecurityHusBtn');
    const showMissingReceiptHusBtnEl = document.getElementById('showMissingReceiptHusBtn');
    const missingReceiptHusListContainerEl = document.getElementById('missingReceiptHusListContainer');
    const showDunkelalarmHusBtnEl = document.getElementById('showDunkelalarmHusBtn');
    const dunkelalarmHusListContainerEl = document.getElementById('dunkelalarmHusListContainer');
    const showUeberzaehligHusBtnEl = document.getElementById('showUeberzaehligHusBtn'); // NEU
    const ueberzaehligHusListContainerEl = document.getElementById('ueberzaehligHusListContainer'); // NEU
    const errorSoundEl = document.getElementById('errorSound');
    const suspicionModalEl = document.getElementById('suspicionModal');
const suspicionBatchIndexEl = document.getElementById('suspicionBatchIndex');
const suspicionExpectedHuValueEl = document.getElementById('suspicionExpectedHuValue');
const suspicionScannedHuEl = document.getElementById('suspicionScannedHu');
const suspicionExpectedHuEl = document.getElementById('suspicionExpectedHu');
const suspicionQuestionEl = document.getElementById('suspicionQuestion');
const suspicionConfirmBtnEl = document.getElementById('suspicionConfirmBtn');
const suspicionDeclineBtnEl = document.getElementById('suspicionDeclineBtn');

    const nachlieferungSoundEl = document.getElementById('nachlieferungSound');
    const unexpectedHuSoundToggleEl = document.getElementById('unexpectedHuSoundToggle');
    const batchScanFeedbackModalEl = document.getElementById('batchScanFeedbackModal');
    const feedbackScanNumberEl = document.getElementById('feedbackScanNumber');
    const feedbackCarrierEl = document.getElementById('feedbackCarrier');
    const batchFeedbackToggleEl = document.getElementById('batchFeedbackToggle');
    const closeBatchScanFeedbackModalButtonEl = document.getElementById('closeBatchScanFeedbackModalButton');
    const loadingOverlayEl = document.getElementById('loadingOverlay');
    const huDetailsModalEl = document.getElementById('huDetailsModal');
    const huDetailsNumberEl = document.getElementById('huDetailsNumber');
    const huDetailsPackagingEl = document.getElementById('huDetailsPackaging');
    const huDetailsDimensionsEl = document.getElementById('huDetailsDimensions');
    const huDetailsWeightEl = document.getElementById('huDetailsWeight');


    async function initializeApp() {
        showLoader(); // <<<< NEU: Lade-Spinner anzeigen
        const initialShipments = await loadDataFromServer();
// LKW-Status vom Server laden und lokal cachen
    try {
        const lkwRes = await fetch(WEB_APP_URL, {
            method: 'POST', mode: 'cors', cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'loadLkwStatus' })
        });
        const lkwResult = await lkwRes.json();
        if (lkwResult.status === 'success') {
            localStorage.setItem(LKWSTATUSKEY, JSON.stringify(lkwResult.data));
        }
    } catch(e) {
        console.warn('LKW-Status vom Server konnte nicht geladen werden. Nutze lokalen Cache.', e);
    }

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialShipments));
    
        renderTable();
        isBatchModeActive = batchModeToggleEl.checked;
        sessionFirstSuffixScans = {};
        notifiedCompletions = new Set();
	renderLkwMenu();
        
        resetSingleScanNoteInputState();
        toggleBatchMode(isBatchModeActive);
        batchFeedbackToggleEl.checked = false;
        updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
        updateClearButtonVisibility(noteInputEl, clearNoteButtonEl);
        updateCurrentBatchNoteDisplay();
    
        setupEventListeners();
        startSyncPolling();
        if (serverIsLegacy) displayError(SYNC_LEGACY_MESSAGE, 'orange'); // (toggleBatchMode oben hat Meldungen gelöscht)
        flushPendingChanges(); // offline erfasste Änderungen vom letzten Mal nachschicken
        focusShipmentInput();
        console.log(`Fracht Tracker ${document.title.split('(')[1].split(')')[0]} initialized.`);
        hideLoader(); // <<<< NEU: Lade-Spinner verstecken, wenn alles fertig ist
    }


    
                    // Wiederverwendbare Funktion zum Speichern der HU-Liste
                    function saveAndProcessHuListData() {
    let mainOrderNumber = mainOrderNumberInputEl.value.trim().toUpperCase();
    const huListText = huListTextareaEl.value.trim();

    if (!mainOrderNumber || !huListText) {
        alert("Bitte Auftragsnummer und mindestens eine HU-Nummer eingeben.");
        return { success: false };
    }

    const hus = huListText.split('\n').map(hu => hu.trim().toUpperCase()).filter(hu => hu.length > 0);
    if (hus.length === 0) {
        alert("Keine gültigen HU-Nummern in der Liste gefunden.");
        return { success: false };
    }

    const shipments = loadShipments();

    if (!shipments[mainOrderNumber] && isArchivedBase(mainOrderNumber)) {
        alert(`Auftrag ${mainOrderNumber} liegt im Archiv.\n\nBitte zuerst wiederherstellen: Nummer ins Suchfeld eingeben → „Im Archiv“ → Wiederherstellen. Danach kann die HU-Liste ergänzt werden.`);
        return { success: false };
    }

    // --- START: AUTOMATISCHE UMBENENNUNG FÜR NACHLIEFERUNGEN ---
    if (mainOrderNumber.includes('NACHLIEFERUNG')) {
        let suffixNum = 1;
        let proposedName = mainOrderNumber;
        
        // Solange der Name im System bereits existiert (oder im Archiv liegt), zähle hoch
        while (isBaseTaken(shipments, proposedName)) {
            proposedName = `NACHLIEFERUNG ${suffixNum}`;
            suffixNum++;
        }
        // Überschreibe den Namen mit dem neuen, einzigartigen Namen
        mainOrderNumber = proposedName;
    }
    // --- ENDE: AUTOMATISCHE UMBENENNUNG ---

    const now = new Date().toISOString();
    let addedCount = 0;
    let duplicateCount = 0;

        
                        if (!shipments[mainOrderNumber]) {
                            shipments[mainOrderNumber] = {
                                hawb: mainOrderNumber, lastModified: now, totalPiecesExpected: hus.length,
                                scannedItems: [], mitarbeiter: MITARBEITER_NAME, isHuListOrder: true
                            };
                            hus.forEach(hu => {
                                shipments[mainOrderNumber].scannedItems.push({ rawInput: hu, status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null });
                                addedCount++;
                            });
                        } else {
                            if (!shipments[mainOrderNumber].isHuListOrder) {
                                alert(`FEHLER: ${mainOrderNumber} ist eine normale Sendung. Sie kann nicht mit einer HU-Liste erweitert werden.`);
                                return { success: false };
                            }
                            hus.forEach(hu => {
                                if (!shipments[mainOrderNumber].scannedItems.find(item => item.rawInput.toUpperCase() === hu)) {
                                    shipments[mainOrderNumber].scannedItems.push({ rawInput: hu, status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null });
                                    addedCount++;
                                } else { duplicateCount++; }
                            });
                            if (addedCount > 0) {
                                shipments[mainOrderNumber].lastModified = now;
                                shipments[mainOrderNumber].totalPiecesExpected += addedCount;
                            }
                        }
        
                        saveShipments(shipments);
                        renderTable();
                        
                        let message = '';
                        let messageType = 'green';
                        if (addedCount > 0 && duplicateCount === 0) {
                            message = `${addedCount} neue HU(s) zum Auftrag ${mainOrderNumber} hinzugefügt.`;
                        } else if (addedCount > 0 && duplicateCount > 0) {
                            message = `${addedCount} neue HU(s) hinzugefügt, ${duplicateCount} Duplikate übersprungen.`;
                            messageType = 'orange';
                        } else if (addedCount === 0 && duplicateCount > 0) {
                            alert(`Import für ${mainOrderNumber}:\n\nKeine neuen HUs gefunden. Alle ${duplicateCount} eingegebenen HUs sind bereits im Auftrag vorhanden.`);
                        }
                        
                        return { success: true, message: message, messageType: messageType, baseNumber: mainOrderNumber };
                    }
        

    // --- Konstanten & Konfiguration ---
    const WEB_APP_URL_BACKEND = 'https://script.google.com/macros/s/AKfycbyBtlm37WxzXdFCDjQuSIWfnQiTny6gwrmXuoq_cacGY9_bkqZxuuW7aJEqLuHJhWYg/exec'; // Mail_13
    // Daten-Backend (backend/Code.gs). Bereitstellung "Version 10" vom 05.09.2026 – bei einer NEUEN Bereitstellung hier die URL anpassen.
    // Vorherige Bereitstellung (altes Skript V1): AKfycbw_ug_levQ7LuOn27CijAdkabnz5utME2aEeN6s560RzSb8lKCsSo5VT4nyOebRJnd0gw
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyjaxBurmTWWJENUF2nr2WB5S6Le5ja-bcZ9OtBLktATx1zGAAZCa5IlvFaL1_yl6jjgA/exec';
    const LOCAL_STORAGE_KEY = 'frachtSicherungMobile_V8_18_Refactored';
const LKWSTATUSKEY = 'frachtLkwStatusV1';
    const SUFFIX_LENGTH = 4;
    const MITARBEITER_NAME = "Zakaria Bisbiss";
    const RAC_NUMMER = "DE/RA/00889-07";
    const NON_COUNTING_STATUSES = ['Dunkelalarm', 'Anstehend', 'NichtSichern', 'Abgelehnt', 'Wareneingang'];
    // Sicherheits-Kontrollmethoden (zählen als Sicherung, schließen sich je Packstück gegenseitig aus,
    // lösen automatisch den Wareneingang aus). Neue Methoden NUR hier und im <select id="securityStatusSelect"> ergänzen.
    // Kürzel wie in der Sicherheitserklärung: XRY = Röntgen, ETD = Sprengstoffspurendetektion, EDD = Sprengstoffspürhund,
    // PHS = Handdurchsuchung, VCK = Sichtkontrolle. PHS/VCK verhalten sich in der App exakt wie ETD/EDD.
    const EXCLUSIVE_SECURITY_STATUSES = ['XRY', 'ETD', 'EDD', 'PHS', 'VCK'];
    const NOTE_ALLOWED_STATUSES = [...EXCLUSIVE_SECURITY_STATUSES, 'Abgelehnt', 'Dunkelalarm'];
    const STATUSES_THAT_TRIGGER_WE = [...EXCLUSIVE_SECURITY_STATUSES, 'Dunkelalarm']; // Scan erzeugt automatisch den Wareneingang
    // Kontrollmethoden, die zusätzlich als „Kombi-Sicherung“ verbucht werden können (zählt nicht als finale Sicherung, das
    // Packstück bleibt offen). Im Scan-Feld/Batch gibt es das Häkchen weiterhin nur bei XRY (updateNoteAndComboVisibility);
    // VCK-Kombi ist nur über die Auswahl-Leiste der Packstücktabelle (Desktop) erreichbar.
    const KOMBI_CAPABLE_STATUSES = ['XRY', 'VCK'];
    
    // AKTUALISIERTE LISTE BASIEREND AUF Kundennummerliste VW.xlsx (Stand: 16.10.2025)
    const KUNDENNR_CARRIER_MAP = {
        "294": "DSV",
        "334": "DHL",
        "341": "DWF",
        "355201": "Kühne + Nagel",
        "360": "Maersk",
        "381": "DSV",
        "524": "DSV",
        "541": "Kühne + Nagel",
        "595": "DSV",
        "602201": "DSV",
        "603": "DSV",
        "607": "Maersk",
        "608": "WWS Freight",
        "613": "DSV",
        "615": "Kühne + Nagel",
        "631": "Maersk",
        "637": "DSV",
        "726": "DHL",
        "730": "UPS",
        "730201": "UPS",
        "758001": "DHL",
        "758204": "Geodis",
        "7589911": "Geodis",
        "7589983": "Geodis",
        "7589984": "Geodis",
        "7589988": "Geodis",
        "7650201": "DHL",
        "772201": "DHL",
        "7960032": "DHL",
        "7960041": "DHL",
        "796022": "DHL",
        "796201": "DHL",
        "796203": "DHL",
        "796204": "DHL",
        "796206": "DHL",
        "796207": "DHL",
        "796208": "DHL",
        "801": "WWS Freight",
        "802": "DSV",
        "804": "DHL",
        "811205": "DB Schenker",
        "813": "DSV",
        "815": "DHL",
        "817": "DSV",
        "819202": "DHL",
        "824": "Kühne + Nagel",
        "862": "DSV",
        "865": "DHL",
        "868": "WWS Freight",
        "875201": "Maersk",
        "897": "DSV",
        "9380011": "DHL",
        "938203": "DHL",
        "945": "DSV",
        "959201": "DHL",
        "959202": "DHL",
        "959203": "DHL",
        "981": "DHL",
        "981299": "DHL",
        "985202": "Kühne + Nagel",
        "996001": "DB Schenker",
        "9969726": "DB Schenker",
        "9969729": "DB Schenker",
        "9974021": "Kühne + Nagel",
        "9974024": "Kühne + Nagel",
        "9974029": "Kühne + Nagel",
        "9974051": "Kühne + Nagel",
        "9974054": "Kühne + Nagel",
        "9974071": "Kühne + Nagel",
        "9974074": "Kühne + Nagel",
        "9974079": "Kühne + Nagel",
        "9974101": "Kühne + Nagel",
        "9974104": "Kühne + Nagel",
        "9974109": "Kühne + Nagel",
        "9974141": "Kühne + Nagel",
        "9974144": "Kühne + Nagel",
        "9974149": "Kühne + Nagel",
        "9974221": "Kühne + Nagel",
        "9974224": "Kühne + Nagel",
        "9974229": "Kühne + Nagel",
        "9974251": "Kühne + Nagel",
        "9974261": "Kühne + Nagel",
        "9974264": "Kühne + Nagel",
        "9974269": "Kühne + Nagel",
        "9975001": "Kühne + Nagel",
        "9975006": "Kühne + Nagel",
        "998": "DSV",
        "9994951": "DB Schenker",
        "9994954": "DB Schenker",
        "9994959": "DB Schenker",
        "9994991": "DB Schenker",
        "9994994": "DB Schenker",
        "9994999": "DB Schenker",
        "285201": "WWS Freight"
    };

// ... (Weiter im Code)


    // --- Anwendungsstatus ---
    let lastScrollPosition = 0;
    let isBatchModeActive = false;
    let packTableSort = null;   // Sortierung der Packstücktabelle in den Details: { key, dir } oder null = wie bisher (Position, dann HU/VSE)
    let truckNameMap = {};      // Anzeigenamen der LKW (truckName an den Sendungen), aufgefrischt von refreshTruckNames()
    const PACK_SORT_NUMERIC = ['pos', 'kg', 'we', 'time', 'notes'];
    let currentBatch = [];
    let batchStatus = '';
    let batchIsCombination = false;
    let pendingScanDataForNewShipment = null;
    let pendingTotalUpdateInfo = null;
    let sessionFirstSuffixScans = {};
    let notifiedCompletions = new Set();
    let currentBatchGlobalNote = null;
    let isBatchNotePromptRequired = true;
    let pendingFirstBatchScanData = null;
    let suspicionQueue = []; // Speichert die Liste der Verdachtsfälle
    let currentSuspicionIndex = 0; // Speichert, welcher Vorschlag gerade angezeigt wird
    


        // --- Hilfsfunktionen: Persistenz ---
        function loadShipments() {
            const data = localStorage.getItem(LOCAL_STORAGE_KEY);
            const shipments = data ? JSON.parse(data) : {};
    
            // Datenmigration
            Object.values(shipments).forEach(shipment => {
                if (shipment.scannedItems && Array.isArray(shipment.scannedItems)) {
                    shipment.scannedItems.forEach(item => {
                        if (item.hasOwnProperty('note') && !item.hasOwnProperty('notes')) {
                            item.notes = item.note ? [item.note] : [];
                            delete item.note;
                        } else if (!item.hasOwnProperty('notes')) {
                            item.notes = [];
                        }
                    });
                }
            });
// Migration: stabile Kennung je Scan-Eintrag (Mehrgeräte-Sync)
    Object.values(shipments).forEach(ensureItemIds);
// Migration: truckId für ältere Einträge
    Object.values(shipments).forEach(shipment => {
        if (!shipment.truckId) {
            if (shipment.parentOrderNumber) {
                shipment.truckId = 'VVL-' + shipment.parentOrderNumber;
            } else if (shipment.freightForwarder) {
                shipment.truckId = 'MAN-legacy';
            }
        }
    });

            return shipments;
        }
function loadLkwStatus() {
    const data = localStorage.getItem(LKWSTATUSKEY);
    return data ? JSON.parse(data) : {};
}
async function saveLkwStatus(status) {
    localStorage.setItem(LKWSTATUSKEY, JSON.stringify(status));
    lkwStatusSaveInFlight++;
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST', mode: 'cors', cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'saveLkwStatus', payload: status })
        });
    } catch(e) {
        console.warn('LKW-Status Server-Sync fehlgeschlagen:', e);
    } finally {
        lkwStatusSaveInFlight--;
    }
}

function isLkwActive(truckId) {
    if (!truckId) return true; // alte Daten ohne truckId → immer aktiv
    const status = loadLkwStatus();
    return status[truckId] !== false; // Standard: aktiv
}

// In der Nähe von calculateCurrentCountedPieces einfügen

function calculateGoodsReceiptCount(scannedItems) {
    if (!Array.isArray(scannedItems)) return 0;
    return scannedItems.filter(item => item.status === 'Wareneingang' && !item.isCancelled).length;
}

// --- NEUE HILFSFUNKTIONEN FÜR DEN LADE-SPINNER ---
function showLoader() {
    if (loadingOverlayEl) {
        loadingOverlayEl.classList.add('visible');
    }
}

function hideLoader() {
    if (loadingOverlayEl) {
        loadingOverlayEl.classList.remove('visible');
    }
}
// ERSETZEN SIE DIE ALTE FUNKTION MIT DIESER NEUEN VERSION

// ERSETZEN SIE DIE ALTE findSimilarExpectedHu FUNKTION MIT DIESER NEUEN VERSION

/**
 * Findet ALLE ähnlichen HUs in den Listen und gibt für jede den Eintrag
 * mit den Detaildaten (wie grossWeight) zurück.
 * @param {string} scannedHu Die gescannte, unerwartete HU.
 * @returns {Array<object>} Ein Array von HU-Item-Objekten mit allen Details oder ein leeres Array.
 */
function findAllSimilarExpectedHus(scannedHu) {
    const shipments = loadShipments();
    const upperScannedHu = scannedHu.toUpperCase();
    const similarItemsWithDetails = [];
    const foundCorrectHuNumbers = new Set(); // Verhindert doppelte Vorschläge

    // Schritt 1: Finde alle potenziell korrekten HU-Nummern durch Ähnlichkeitssuche.
    for (const baseNumber in shipments) {
        const shipment = shipments[baseNumber];
        if (shipment.isHuListOrder && shipment.scannedItems) {
            shipment.scannedItems.forEach(item => {
                if (areStringsSimilar(upperScannedHu, item.rawInput.toUpperCase())) {
                    if (!foundCorrectHuNumbers.has(item.rawInput.toUpperCase())) {
                        foundCorrectHuNumbers.add(item.rawInput.toUpperCase());
                    }
                }
            });
        }
    }

    // Wenn keine Ähnlichkeiten gefunden wurden, abbrechen.
    if (foundCorrectHuNumbers.size === 0) {
        return [];
    }

    // Schritt 2: Für jede gefundene korrekte HU-Nummer, hole den "Master-Eintrag" mit den Details.
    foundCorrectHuNumbers.forEach(correctHu => {
        // Erneute Suche in allen Sendungen nach dem Master-Eintrag für diese HU
        for (const baseNumber in shipments) {
            const shipment = shipments[baseNumber];
            if (shipment.isHuListOrder && shipment.scannedItems) {
                 const allItemsForThisHu = shipment.scannedItems.filter(
                    i => i.rawInput.toUpperCase() === correctHu
                );

                const itemWithDetails = allItemsForThisHu.find(i => i.hasOwnProperty('grossWeight') && i.grossWeight);
                
                if (itemWithDetails) {
                    similarItemsWithDetails.push(itemWithDetails);
                    break; // Nächste correctHu bearbeiten
                } else if (allItemsForThisHu.length > 0) {
                    // Fallback: Nimm den ersten Eintrag, wenn keiner explizit Gewicht hat
                    similarItemsWithDetails.push(allItemsForThisHu[0]);
                    break; // Nächste correctHu bearbeiten
                }
            }
        }
    });

    return similarItemsWithDetails;
}
// ERSETZEN SIE DIE ALTE showSuspicionModal FUNKTION MIT DIESER NEUEN VERSION

/**
 * Zeigt den aktuellen Korrekturvorschlag aus der Warteschlange an.
 * @param {string} scannedInput Die ursprünglich gescannte HU.
 * @param {number} batchIndex Der Index des Items im aktuellen Batch.
 */
function showSuspicionModal(scannedInput, batchIndex) {
    // Prüfen, ob noch Vorschläge in der Warteschlange sind
    if (currentSuspicionIndex >= suspicionQueue.length) {
        closeSuspicionModal(); // Keine Vorschläge mehr, Modal schließen
        return;
    }

    const expectedItem = suspicionQueue[currentSuspicionIndex];
    
    // UI des Modals aktualisieren
    suspicionScannedHuEl.textContent = scannedInput;
    suspicionExpectedHuEl.textContent = expectedItem.rawInput;
    
    const weight = expectedItem.grossWeight;
    suspicionQuestionEl.textContent = weight 
        ? `Handelt es sich um die Sendung mit Gewicht: ${weight}?`
        : `Ist dies die korrekte Sendungsnummer?`;

    // Metadaten für die Aktionen speichern
    suspicionBatchIndexEl.value = batchIndex;
    suspicionExpectedHuValueEl.value = expectedItem.rawInput;

    // Button-Text anpassen, wenn es der letzte Vorschlag ist
    if (currentSuspicionIndex === suspicionQueue.length - 1) {
        suspicionDeclineBtnEl.textContent = 'Nein, beibehalten';
    } else {
        suspicionDeclineBtnEl.textContent = 'Nein, nächsten Vorschlag anzeigen';
    }

    // Modal anzeigen, falls es noch nicht sichtbar ist
    if (!suspicionModalEl.classList.contains('visible')) {
        suspicionModalEl.classList.add('visible');
        document.body.classList.add('modal-open');
    }
}

function closeSuspicionModal() {
    if (suspicionModalEl.classList.contains('visible')) {
        suspicionModalEl.classList.remove('visible');
        document.body.classList.remove('modal-open');
    }
    // Wichtig: Warteschlange und Index für den nächsten Durchlauf zurücksetzen
    suspicionQueue = [];
    currentSuspicionIndex = 0;
    focusShipmentInput();
}

// =========================================================================
// ERSETZEN SIE IHRE GESAMTE showOpenHusSummary FUNKTION MIT DIESER
// =========================================================================

// HTML-Bausteine für HU-Listen (Modal „Offene HUs“ und Unterseite „Dunkelalarm“ – Vorlagen unverändert)
const sortByCountryAndOrder = (a, b) => (a.destinationCountry || 'zz').localeCompare(b.destinationCountry || 'zz') || (a.orderNumber || a.hawb).localeCompare(b.orderNumber || a.hawb);
function generateHuListHtml(items, allScannedItemsForContext, shipments) {
    shipments = shipments || loadShipments();
    if (!items || items.length === 0) return '';
    const dunkelalarmedNumbers = new Set(
        allScannedItemsForContext
        .filter(scan => scan.status === 'Dunkelalarm' && !scan.isCancelled)
        .map(scan => scan.rawInput)
    );
    const sortedItems = items.sort((a, b) => (a.position || 9999) - (b.position || 9999));
    const isVvlList = sortedItems[0] && sortedItems[0].sendnr;
    if (isVvlList) {
        let html = '<div class="hu-list-header"><span>VSE-Nummer</span><span>Sendungs-Nr.</span></div>';
        const listItems = sortedItems.map(item => {
            const hasDunkelalarm = dunkelalarmedNumbers.has(item.rawInput);
            const alarmClass = hasDunkelalarm ? 'has-dunkelalarm' : '';
            return `
            <li>
                <div class="pending-item-details">
                    <span class="pending-vse hu-value ${alarmClass}" style="cursor:pointer;" title="Klicken zum Kopieren. Details f\u00FCr ${escapeHtml(item.rawInput)} anzeigen">${escapeHtml(item.rawInput)}</span>
                    <span class="pending-sendnr">${escapeHtml(item.sendnr)}</span>
                </div>
            </li>`;
        }).join('');
        return html + `<ul class="hu-list vvl-list">${listItems}</ul>`;
    } else {
        const listItems = sortedItems.map(item => {
            const parentOrder = shipments[item.orderNumber] || shipments[Object.keys(shipments).find(key => shipments[key].scannedItems && shipments[key].scannedItems.some(i => i.rawInput === item.rawInput))];
            const isManOrderContext = parentOrder && parentOrder.freightForwarder;
            const positionHtml = isManOrderContext && item.position ? `<span class="position-number">${item.position}.</span>` : ``;
            const hasDunkelalarm = dunkelalarmedNumbers.has(item.rawInput);
            const alarmClass = hasDunkelalarm ? 'has-dunkelalarm' : '';
           return `<li>${positionHtml}<span class="hu-value ${alarmClass}" style="cursor:pointer;" title="Details f\u00FCr ${escapeHtml(item.rawInput)} anzeigen">${escapeHtml(item.rawInput)}</span></li>`;
        }).join('');
        return `<ul class="hu-list">${listItems}</ul>`;
    }
}
function generateHtmlForOrderGroup(order, listItemsHtml, forSpecialList = false) {
    const orderNumber = order.orderNumber || order.hawb;
    let countText = '';
    if (!forSpecialList) {
        countText = order.receiptCount !== undefined ? `(${order.receiptCount} von ${order.totalHus} erfasst)` : `(${(order.totalHus - order.pendingHus.length)} von ${order.totalHus} erfasst)`;
    }
    let titleHtml = '';
    if (order.parentOrderNumber) {
        titleHtml = `VVL: ${escapeHtml(order.parentOrderNumber)}<br><small>Kundennr: ${escapeHtml(orderNumber)} ${countText}</small>`;
    } else {
        const isManOrder = order.freightForwarder && order.destinationCountry;
        const titlePrefix = isManOrder ? 'Rechnung: ' : 'Sendung: ';
        let metaLineHtml = '';
        if (order.plsoNumber && order.plsoNumber !== 'N/A') {
            metaLineHtml += `<br><small>PLSO: ${escapeHtml(order.plsoNumber)}</small>`;
        }
        if (isManOrder) {
            const shortForwarderName = shortenForwarderName(order.freightForwarder);
            metaLineHtml += `<br><small>Sped.: ${escapeHtml(shortForwarderName)} / Land: ${escapeHtml(order.destinationCountry)}</small>`;
        }
        titleHtml = `${titlePrefix}${escapeHtml(orderNumber)} ${countText}${metaLineHtml}`;
    }
    return `<div class="hu-order-group"><div class="hu-order-title">${titleHtml}</div>${listItemsHtml}</div>`;
}

// Berechnung der offenen HUs (ohne Anzeige). Genutzt vom Modal „Offene HUs“ (showOpenHusSummary) und von der
// Unterseite „Dunkelalarm“ der Startseite – die Regeln stehen damit nur einmal hier.
function computeOpenHusSummary() {
    const shipments = loadShipments();
    const securityClearanceStatuses = EXCLUSIVE_SECURITY_STATUSES;
    let openSecurityHusByOrder = [],
        missingReceiptHusByOrder = [],
        dunkelalarmItemsByOrder = {},
        ueberzaehligItemsByOrder = {},
        suspiciousPairs = [];

    const processedUeberzaehligHus = new Set();

    // 1. Zuerst eine Liste aller erwarteten HUs aus allen HU-Listen-Aufträgen erstellen
    const expectedHuSet = new Set();
    Object.values(shipments).forEach(shipment => {
        if (shipment.isHuListOrder && shipment.scannedItems) {
                        if (!isLkwActive(shipment.truckId)) return; // NEU: LKW deaktiviert -> komplett ignorieren

            shipment.scannedItems.forEach(item => {
                if (item.status === 'Anstehend' || securityClearanceStatuses.includes(item.status)) {
                   expectedHuSet.add(item.rawInput.toUpperCase());
                }
            });
        }
    });

    // 2. Alle Sendungen durchgehen und die Daten für die Tabs sammeln
    Object.keys(shipments).forEach(baseNumber => {
        const shipment = shipments[baseNumber];
        if (!isLkwActive(shipment.truckId)) return; // NEU: LKW deaktiviert -> ausblenden

        // Dunkelalarm-Logik
        if (shipment.scannedItems && shipment.scannedItems.length > 0) {
            const itemsWithDunkelalarm = shipment.scannedItems.filter(item => item.status === 'Dunkelalarm' && !item.isCancelled);
            if (itemsWithDunkelalarm.length > 0) {
                if (!dunkelalarmItemsByOrder[baseNumber]) dunkelalarmItemsByOrder[baseNumber] = { items: [], ...shipment };
                itemsWithDunkelalarm.forEach(item => {
                    const enhancedItem = { ...item, orderNumber: baseNumber };
                    dunkelalarmItemsByOrder[baseNumber].items.push(enhancedItem);
                });
            }
        }

        // ERWEITERTE LOGIK FÜR ÜBERZÄHLIGE SCANS
        if (shipment.scannedItems && shipment.scannedItems.length > 0) {
            const allUeberzaehligItems = shipment.scannedItems.filter(item =>
                item.status !== 'Anstehend' &&
                !item.isCancelled &&
                !expectedHuSet.has(item.rawInput.toUpperCase())
            );

            const normalUeberzaehligForThisOrder = [];

            allUeberzaehligItems.forEach(item => {
                const surplusHu = item.rawInput.toUpperCase();
                
                if (processedUeberzaehligHus.has(surplusHu)) {
                    return; 
                }
                processedUeberzaehligHus.add(surplusHu);
                
                let foundSimilar = false;

                for (const expectedHu of expectedHuSet) {
                    if (areStringsSimilar(surplusHu, expectedHu)) {
                        suspiciousPairs.push({ surplus: item, expected: expectedHu, orderNumber: baseNumber });
                        foundSimilar = true;
                        break;
                    }
                }

                if (!foundSimilar) {
                    normalUeberzaehligForThisOrder.push(item);
                }
            });

            if (normalUeberzaehligForThisOrder.length > 0) {
                if (!ueberzaehligItemsByOrder[baseNumber]) {
                    ueberzaehligItemsByOrder[baseNumber] = { items: [], ...shipment };
                }
                normalUeberzaehligForThisOrder.forEach(item => {
                    const enhancedItem = { ...item, orderNumber: baseNumber };
                    ueberzaehligItemsByOrder[baseNumber].items.push(enhancedItem);
                });
            }
        }

        // Logik für HU-Listen-Aufträge (Offene Sicherung & Fehlende WE)
        if (shipment.isHuListOrder && shipment.scannedItems && shipment.scannedItems.length > 0) {
            const manifestSlots = shipment.scannedItems.filter(item =>
                item.status === 'Anstehend' || securityClearanceStatuses.includes(item.status)
            );
            const pendingSecurityHus = manifestSlots.filter(item => item.status === 'Anstehend');
            if (pendingSecurityHus.length > 0) {
                openSecurityHusByOrder.push({
                    ...shipment,
                    orderNumber: baseNumber,
                    pendingHus: pendingSecurityHus,
                    totalHus: manifestSlots.length
                });
            }
            const receiptCounts = shipment.scannedItems
                .filter(item => item.status === 'Wareneingang' && !item.isCancelled)
                .reduce((acc, item) => {
                    acc[item.rawInput] = (acc[item.rawInput] || 0) + 1;
                    return acc;
                }, {});
            const tempReceiptCounts = { ...receiptCounts };
            const missingReceiptHus = manifestSlots.filter(slot => {
                const hu = slot.rawInput;
                if (tempReceiptCounts[hu] && tempReceiptCounts[hu] > 0) {
                    tempReceiptCounts[hu]--;
                    return false;
                }
                return true;
            });
            if (missingReceiptHus.length > 0) {
                missingReceiptHusByOrder.push({
                    ...shipment,
                    orderNumber: baseNumber,
                    pendingHus: missingReceiptHus,
                    totalHus: manifestSlots.length,
                    receiptCount: manifestSlots.length - missingReceiptHus.length
                });
            }
        }
    });

    const totalMissingReceipts = missingReceiptHusByOrder.reduce((sum, order) => sum + order.pendingHus.length, 0);
    const totalDunkelalarms = Object.values(dunkelalarmItemsByOrder).reduce((sum, data) => sum + data.items.length, 0);
    const totalUeberzaehlig = Object.values(ueberzaehligItemsByOrder).reduce((sum, data) => sum + data.items.length, 0) + suspiciousPairs.length;
    return { shipments, openSecurityHusByOrder, missingReceiptHusByOrder, dunkelalarmItemsByOrder, ueberzaehligItemsByOrder,
             suspiciousPairs, totalMissingReceipts, totalDunkelalarms, totalUeberzaehlig };
}

function showOpenHusSummary() {
    removeActiveInlineNoteEditor();
    const { shipments, openSecurityHusByOrder, missingReceiptHusByOrder, dunkelalarmItemsByOrder, ueberzaehligItemsByOrder,
            suspiciousPairs, totalMissingReceipts, totalDunkelalarms, totalUeberzaehlig } = computeOpenHusSummary();

    // 3. Badges aktualisieren
    const missingBadge = document.getElementById('missingReceiptsBadge');
    const dunkelalarmBadge = document.getElementById('dunkelalarmBadge');
    const ueberzaehligBadge = document.getElementById('ueberzaehligBadge');

    if (missingBadge) {
        missingBadge.textContent = totalMissingReceipts;
        missingBadge.classList.toggle('hidden', totalMissingReceipts === 0);
    }
    if (dunkelalarmBadge) {
        dunkelalarmBadge.textContent = totalDunkelalarms;
        dunkelalarmBadge.classList.toggle('hidden', totalDunkelalarms === 0);
    }
    if (ueberzaehligBadge) {
        ueberzaehligBadge.textContent = totalUeberzaehlig;
        ueberzaehligBadge.classList.toggle('hidden', totalUeberzaehlig === 0);
    }

    // 4. HTML für die Listen: generateHuListHtml / generateHtmlForOrderGroup (siehe oberhalb von showOpenHusSummary)

    // 5. Daten sortieren und in die Container rendern
    openSecurityHusByOrder.sort(sortByCountryAndOrder);
    missingReceiptHusByOrder.sort(sortByCountryAndOrder);
    const dunkelalarmArray = Object.values(dunkelalarmItemsByOrder).sort(sortByCountryAndOrder);
    const ueberzaehligArray = Object.values(ueberzaehligItemsByOrder).sort(sortByCountryAndOrder);

    openHusListContainerEl.innerHTML = openSecurityHusByOrder.map(order => generateHtmlForOrderGroup(order, generateHuListHtml(order.pendingHus, order.scannedItems, shipments))).join('') || '<p class="no-open-hus-message">Glückwunsch! Alle HUs sind sicherheitstechnisch bearbeitet.</p>';
    missingReceiptHusListContainerEl.innerHTML = missingReceiptHusByOrder.map(order => generateHtmlForOrderGroup(order, generateHuListHtml(order.pendingHus, order.scannedItems, shipments))).join('') || '<p class="no-open-hus-message">Perfekt! Alle HUs wurden im Wareneingang erfasst.</p>';
    dunkelalarmHusListContainerEl.innerHTML = dunkelalarmArray.map(data => generateHtmlForOrderGroup(data, generateHuListHtml(data.items, data.scannedItems, shipments), true)).join('') || '<p class="no-open-hus-message">Keine Eintr\u00E4ge mit Status "Dunkelalarm" gefunden.</p>';
    
    // ERWEITERTE HTML-GENERIERUNG FÜR DEN "ÜBERZÄHLIG"-TAB
    
    // ===== ÄNDERUNG HIER =====
    // Wir rufen nicht mehr `generateHtmlForOrderGroup` auf, sondern generieren direkt die Listen.
    // Das entfernt die Titel (`hu-order-title`).
    let ueberzaehligHtml = ueberzaehligArray.map(data => generateHuListHtml(data.items, data.scannedItems, shipments)).join('');
    // ===== ENDE DER ÄNDERUNG =====

    console.log("Verdächtige Paare gefunden:", suspiciousPairs);
    if (suspiciousPairs.length > 0) {
        ueberzaehligHtml += `<h3 class="suspicion-heading">Mögliche Tippfehler (Verdachte):</h3>`;
        suspiciousPairs.forEach((pair, index) => {
            const diffHtml = highlightDifference(pair.surplus.rawInput, pair.expected);

            ueberzaehligHtml += `
                <div class="hu-order-group hu-order-group-warning">
                    <ul class="hu-list">
<li><strong>Gescant: </strong>&nbsp;<span class="hu-value has-dunkelalarm" style="cursor:pointer;" title="Klicken zum Kopieren. Details f\u00FCr ${escapeHtml(pair.surplus.rawInput)} anzeigen">${diffHtml.html1}</span></li>
                        <li><strong>Erwartet:</strong>&nbsp;<span class="hu-value" style="cursor:pointer;" title="Klicken zum Kopieren">${diffHtml.html2}</span></li>
                    </ul>
                    ${index < suspiciousPairs.length - 1 ? '<hr class="detail-divider">' : ''}
                </div>
            `;
        });
    }
    
    ueberzaehligHusListContainerEl.innerHTML = ueberzaehligHtml || '<p class="no-open-hus-message">Keine überzähligen Scans gefunden.</p>';

    // 6. Initialen Zustand der Tabs setzen
    showOpenSecurityHusBtnEl.classList.add('active');
    missingReceiptHusListContainerEl.style.display = 'none';
    showMissingReceiptHusBtnEl.classList.remove('active');
    openHusListContainerEl.style.display = 'block';
    dunkelalarmHusListContainerEl.style.display = 'none';
    showDunkelalarmHusBtnEl.classList.remove('active');
    ueberzaehligHusListContainerEl.style.display = 'none';
    showUeberzaehligHusBtnEl.classList.remove('active');
    
    openHusModalEl.classList.add('visible');
    document.body.classList.add('modal-open');
    closeSideMenu();
}
   
        
        
        
        
        
        
// --- ENDE DER ÄNDERUNG ---
// --- ENDE DER ÄNDERUNG ---
        // --- START: NEUE HILFSFUNKTION ---
        function calculateXryKombiCount(scannedItems) {
            if (!Array.isArray(scannedItems)) return 0;
            return scannedItems.filter(item =>
                item.status === 'XRY' &&
                item.isCombination &&
                !item.isCancelled
            ).length;
        }
    
        // --- ENDE: NEUE HILFSFUNKTION ---

/**
 * Speichert Sendungen zuerst lokal und synchronisiert dann mit dem Server.
 * @param {object} shipments Das Objekt mit allen Sendungen.
 */
const SYNC_FAILED_MESSAGE = "Lokal gespeichert – Server nicht erreichbar. Wird beim nächsten Speichern erneut versucht.";
const SYNC_LEGACY_MESSAGE = "Server-Skript ist veraltet (backend/Code.gs neu bereitstellen). Mehrgeräte-Sync inaktiv – Daten werden wie bisher gespeichert.";

// ===================================================================
// MEHRGERÄTE-SYNC (siehe backend/Code.gs)
// - Jedes Gerät schickt nur die Sendungen, die es selbst geändert hat, zusammen mit dem
//   Server-Stand, von dem es ausging. Der Server führt zusammen (3-Wege-Merge) und liefert
//   den gemeinsamen Stand zurück – nichts wird mehr blind überschrieben.
// - Zusätzlich holt das Gerät regelmäßig nur die Änderungen der anderen Geräte ab.
// - Offline: Änderungen werden vorgemerkt und beim nächsten Kontakt nachgeschickt.
// ===================================================================
const SYNC_VERSION_KEY = LOCAL_STORAGE_KEY + '_syncVersion';    // zuletzt gesehene Server-Version
const SYNC_SNAPSHOT_KEY = LOCAL_STORAGE_KEY + '_syncSnapshot';  // Server-Stand je Sendung, von dem die lokalen Daten ausgehen
const SYNC_PENDING_KEY = LOCAL_STORAGE_KEY + '_syncPending';    // noch nicht bestätigte Änderungen/Löschungen
const ARCHIVE_BASES_KEY = LOCAL_STORAGE_KEY + '_archiveBases';  // Nummern der Sendungen, die auf dem Server im Archiv liegen (nur die Nummern)
const SYNC_POLL_INTERVAL_MS = 3000;      // Grundtakt des Abrufs (Server beantwortet "nichts Neues" aus dem Cache, ohne die Tabelle zu öffnen)
const SYNC_POLL_MAX_INTERVAL_MS = 30000; // bei Verbindungsfehlern schrittweise bis hierhin verlangsamen, danach wieder Grundtakt
const SYNC_DEVICE_ID = (function () {
    const k = 'frachtTracker_deviceId';
    let id = localStorage.getItem(k);
    if (!id) { id = 'dev-' + Math.random().toString(36).slice(2, 10); localStorage.setItem(k, id); }
    return id;
})();
let syncInFlight = false;   // gerade ein Senden/Abruf unterwegs?
let syncQueued = false;     // währenddessen erneut gespeichert → danach nochmal senden
let syncPollTimer = null;
let syncPollDelay = SYNC_POLL_INTERVAL_MS;
let syncPollFailures = 0;
let serverIsLegacy = false; // Backend noch V1 (kennt loadChanges/saveShipments nicht) → altes Verhalten
let lkwStatusSaveInFlight = 0;

function getSyncVersion() { return Number(localStorage.getItem(SYNC_VERSION_KEY)) || 0; }
function setSyncVersion(v) { if (typeof v === 'number' && !isNaN(v)) localStorage.setItem(SYNC_VERSION_KEY, String(v)); }
function readSnapshot() { try { return JSON.parse(localStorage.getItem(SYNC_SNAPSHOT_KEY) || '{}'); } catch (e) { return {}; } }
function writeSnapshot(snap) { localStorage.setItem(SYNC_SNAPSHOT_KEY, JSON.stringify(snap)); }
function writeSnapshotFrom(shipments) {
    const snap = {};
    Object.keys(shipments || {}).forEach(b => { snap[b] = JSON.stringify(shipments[b]); });
    writeSnapshot(snap);
}
function readPending() { try { const p = JSON.parse(localStorage.getItem(SYNC_PENDING_KEY) || '{}'); return { changed: p.changed || {}, deleted: p.deleted || {} }; } catch (e) { return { changed: {}, deleted: {} }; } }
function writePending(p) { localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify(p)); }
function hasPending(p) { p = p || readPending(); return Object.keys(p.changed).length > 0 || Object.keys(p.deleted).length > 0; }
function clearSyncState() { [SYNC_VERSION_KEY, SYNC_SNAPSHOT_KEY, SYNC_PENDING_KEY, ARCHIVE_BASES_KEY].forEach(k => localStorage.removeItem(k)); archiveKnownBases = new Set(); }

// ===================================================================
// ARCHIV (siehe backend/Code.gs, Abschnitt ARCHIV)
// Fertige, alte Sendungen verschiebt der Server ins Archiv: sie bleiben vollständig im Google Sheet, werden aber
// nicht mehr an die Geräte ausgeliefert – das Gerät hält nur den laufenden Bestand. Lokal merken wir uns nur die
// NUMMERN der archivierten Sendungen (klein), damit ein Scan einer archivierten Nummer sofort erkannt wird.
// Regel (Server): Einzelsendung vollständig erfasst + 7 Tage unverändert; LKW-Sendungen (VVL/MAN) erst, wenn der
// LKW im Menü deaktiviert wurde (+ 7 Tage). Jede Änderung an einer archivierten Sendung (Scan, Storno, Notiz,
// „Wiederherstellen“) macht sie auf allen Geräten wieder aktiv. Gelöscht wird nie automatisch.
// ===================================================================
let archiveKnownBases = (() => { try { return new Set(JSON.parse(localStorage.getItem(ARCHIVE_BASES_KEY) || '[]')); } catch (e) { return new Set(); } })();
let archiveUnsupported = false;     // Server-Skript kennt 'searchArchive' nicht (alte Bereitstellung)
function saveArchiveKnownBases() { try { localStorage.setItem(ARCHIVE_BASES_KEY, JSON.stringify([...archiveKnownBases])); } catch (e) { console.warn('Archiv-Nummern konnten nicht gespeichert werden:', e); } }
function setArchiveKnownBases(list) { archiveKnownBases = new Set(Array.isArray(list) ? list : []); saveArchiveKnownBases(); }
function forgetArchivedBase(base) { if (archiveKnownBases.delete(base)) saveArchiveKnownBases(); }
function isArchivedBase(base) { return !!base && archiveKnownBases.has(base); }
// Für Importe: Nummer ist vergeben, wenn sie lokal existiert ODER im Archiv liegt. Sonst würde ein neuer Auftrag
// unter derselben Nummer angelegt und auf dem Server mit dem archivierten (alte HUs!) zusammengeführt.
function isBaseTaken(shipments, base) { return !!(shipments && shipments[base]) || isArchivedBase(base); }
// Nächste freie Variante „NUMMER (2)“, „NUMMER (3)“ … (wie bei doppelten Kundennummern verschiedener VVLs)
function nextFreeBaseName(shipments, base) {
    let n = 2, name = `${base} (${n})`;
    while (isBaseTaken(shipments, name)) { n++; name = `${base} (${n})`; }
    return name;
}
function archiveKnownPrefixCount(filter) {
    const head = String(filter || '').split('+')[0].toUpperCase();
    if (!head) return 0;
    let n = 0; archiveKnownBases.forEach(b => { if (String(b).toUpperCase().startsWith(head)) n++; }); return n;
}
// Archivierte Sendung wieder in den laufenden Bestand übernehmen. Sie wird als geändert vorgemerkt: der Server schreibt
// die Zeile ohne Archiv-Markierung zurück (= aktiv), alle anderen Geräte erhalten sie beim nächsten Abruf.
// Gehört die Sendung zu einem deaktivierten LKW, wird der LKW wieder aktiviert (sonst bliebe sie unsichtbar).
// Rückgabe: Kennung des reaktivierten LKW oder null.
function restoreArchivedShipmentLocally(base, shipmentObj) {
    ensureItemIds(shipmentObj);
    const shipments = loadShipments();
    shipments[base] = shipmentObj;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shipments));
    const snap = readSnapshot(); snap[base] = JSON.stringify(shipmentObj); writeSnapshot(snap); // Ausgangsstand = Serverstand (3-Wege-Merge)
    const pending = readPending(); pending.changed[base] = true; writePending(pending);
    forgetArchivedBase(base);
    let lkwReactivated = null;
    if (shipmentObj.truckId && !isLkwActive(shipmentObj.truckId)) {
        const status = loadLkwStatus(); status[shipmentObj.truckId] = true; saveLkwStatus(status);
        lkwReactivated = shipmentObj.truckId;
    }
    flushPendingChanges();
    return lkwReactivated;
}
// Holt genau diese Nummern aus dem Archiv (nur die, die dort liegen). Antwort: { base: shipmentObj }
async function fetchArchivedShipments(bases) {
    const r = await postToServer('searchArchive', { bases });
    return r.results || {};
}

// Stabile Kennung je Scan-Eintrag (gleiche Formel wie im Backend), damit Geräte denselben Eintrag erkennen –
// auch wenn sich Zeitstempel/Status ändern (z. B. "Anstehend"-Platzhalter, der gescannt wird).
function ensureItemIds(shipment) {
    if (!shipment || !Array.isArray(shipment.scannedItems)) return shipment;
    const seen = {};
    shipment.scannedItems.forEach(it => { if (it && it.id) seen[it.id] = true; });
    shipment.scannedItems.forEach(it => {
        if (!it || it.id) return;
        const baseKey = String(it.timestamp || '') + '|' + String(it.rawInput || '');
        let key = baseKey, n = 1;
        while (seen[key]) { n++; key = baseKey + '#' + n; }
        seen[key] = true;
        it.id = key;
    });
    return shipment;
}

function isUnknownActionError(err) { return /Unbekannte Aktion/i.test((err && err.message) || ''); }

async function postToServer(action, payload) {
    const response = await fetch(WEB_APP_URL, {
        method: 'POST', mode: 'cors', cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
    });
    if (!response.ok) throw new Error(`Server-Fehler: ${response.status}`);
    const result = await response.json();
    if (result.status !== 'success') throw new Error(result.message || 'Unbekannter Serverfehler');
    return result;
}

function showSyncOk() {
    setSyncIndicator('ok', 'Synchronisiert');
    if (errorDisplayEl.textContent === SYNC_FAILED_MESSAGE) clearError();
}

// Wird von allen Stellen aufgerufen, die etwas geändert haben (Signatur unverändert):
// 1) lokal speichern  2) geänderte/gelöschte Sendungen vormerken  3) an den Server schicken
async function saveShipments(shipments) {
    Object.values(shipments).forEach(ensureItemIds);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shipments));

    const snap = readSnapshot();
    const pending = readPending();
    Object.keys(shipments).forEach(b => {
        if (snap[b] !== JSON.stringify(shipments[b])) pending.changed[b] = true;
    });
    Object.keys(pending.changed).forEach(b => { if (!(b in shipments)) delete pending.changed[b]; });
    Object.keys(snap).forEach(b => { if (!(b in shipments)) pending.deleted[b] = true; });
    writePending(pending);

    await flushPendingChanges();
}

// Schickt alles Vorgemerkte an den Server; läuft nie doppelt parallel.
async function flushPendingChanges() {
    if (syncInFlight) { syncQueued = true; return; }
    if (!hasPending()) return;

    syncInFlight = true;
    setSyncIndicator('busy', 'Wird synchronisiert …');
    try {
        if (serverIsLegacy) {
            // Altes Backend: kompletter Datensatz wie früher
            await postToServer('saveAllData', loadShipments());
            writeSnapshotFrom(loadShipments());
            writePending({ changed: {}, deleted: {} });
        } else {
            const pending = readPending();

            // Löschungen zuerst (Tombstones), damit kein anderes Gerät die Sendung wiederbelebt
            for (const b of Object.keys(pending.deleted)) {
                await postToServer('deleteShipment', { baseNumber: b });
                const p = readPending(); delete p.deleted[b]; writePending(p);
                const s = readSnapshot(); delete s[b]; writeSnapshot(s);
            }

            const changedBases = Object.keys(readPending().changed);
            if (changedBases.length > 0) {
                const local = loadShipments();
                const snap = readSnapshot();
                const toSend = {}, bases = {}, sentJson = {};
                changedBases.forEach(b => {
                    if (!local[b]) return;
                    toSend[b] = local[b];
                    sentJson[b] = JSON.stringify(local[b]);
                    bases[b] = snap[b] ? JSON.parse(snap[b]) : null; // Ausgangsstand für den 3-Wege-Merge
                });
                const r = await postToServer('saveShipments', { shipments: toSend, bases, deviceId: SYNC_DEVICE_ID });

                // Zusammengeführten Stand übernehmen (enthält ggf. Scans anderer Geräte)
                const merged = r.merged || {};
                const after = loadShipments(); const snapNow = readSnapshot(); const p = readPending();
                let touched = false;
                Object.keys(merged).forEach(b => {
                    const mj = JSON.stringify(merged[b]);
                    if (JSON.stringify(after[b]) === sentJson[b]) {
                        // lokal seit dem Senden unverändert → Server-Stand ist jetzt unser Stand
                        snapNow[b] = mj;
                        if (mj !== sentJson[b]) { after[b] = merged[b]; touched = true; }
                        delete p.changed[b];
                    }
                    // sonst: währenddessen weiter geändert → bleibt vorgemerkt, wird mit altem Ausgangsstand erneut gesendet
                });
                changedBases.forEach(b => { if (!toSend[b]) delete p.changed[b]; });
                writeSnapshot(snapNow); writePending(p);
                { let k = false; Object.keys(merged).forEach(b => { if (archiveKnownBases.delete(b)) k = true; }); if (k) saveArchiveKnownBases(); } // gespeichert = (wieder) aktiv
                if (touched) { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(after)); refreshViewsAfterRemoteChange(); }
                // Hinweis: die Server-Version wird bewusst NUR beim Abruf (pullRemoteChanges) weitergeschaltet,
                // sonst würden zwischenzeitliche Änderungen anderer Geräte übersprungen.
            }
        }
        if (!hasPending()) showSyncOk();
    } catch (error) {
        console.warn("Server-Synchronisierung fehlgeschlagen:", error.message);
        if (isUnknownActionError(error) && !serverIsLegacy) {
            serverIsLegacy = true; displayError(SYNC_LEGACY_MESSAGE, 'orange'); syncQueued = true;
        } else {
            setSyncIndicator('error', 'Server nicht erreichbar – Daten sind lokal gespeichert');
            displayError(SYNC_FAILED_MESSAGE, 'red');
        }
    } finally {
        syncInFlight = false;
        if (syncQueued) { syncQueued = false; flushPendingChanges(); }
    }
}

// Übernimmt Sendungen vom Server in den lokalen Bestand.
// Sendungen mit lokal wartenden Änderungen werden NICHT angefasst (sie gehen beim Senden durch den Server-Merge).
function applyServerShipments(changed, deleted, fullSet, archived) {
    const local = loadShipments();
    const pending = readPending();
    const snap = readSnapshot();
    let touched = false, skipped = false, knownChanged = false;
    Object.keys(changed || {}).forEach(b => {
        if (archiveKnownBases.delete(b)) knownChanged = true; // wieder aktiv (z. B. von einem anderen Gerät wiederhergestellt)
        if (pending.changed[b] || pending.deleted[b]) { skipped = true; return; }
        ensureItemIds(changed[b]);
        const serverJson = JSON.stringify(changed[b]);
        snap[b] = serverJson;
        if (JSON.stringify(local[b]) !== serverJson) { local[b] = changed[b]; touched = true; }
    });
    (deleted || []).forEach(b => {
        if (archiveKnownBases.delete(b)) knownChanged = true;
        if (pending.changed[b]) { skipped = true; return; }
        delete snap[b];
        if (b in local) { delete local[b]; touched = true; }
    });
    // Vom Server archiviert → vom Gerät nehmen (bleibt im Sheet, per Archivsuche erreichbar).
    // Mit lokal wartender Änderung NICHT anfassen: unser Senden macht die Sendung auf dem Server ohnehin wieder aktiv.
    (archived || []).forEach(b => {
        if (pending.changed[b] || pending.deleted[b]) return;
        if (!archiveKnownBases.has(b)) { archiveKnownBases.add(b); knownChanged = true; }
        delete snap[b];
        if (b in local) { delete local[b]; touched = true; }
    });
    if (knownChanged) saveArchiveKnownBases();
    if (fullSet) { // kompletter Bestand: alles Unbekannte entfernen (außer lokal Vorgemerktes)
        Object.keys(local).forEach(b => {
            if (!(b in changed) && !pending.changed[b]) { delete local[b]; delete snap[b]; touched = true; }
        });
    }
    writeSnapshot(snap);
    if (touched) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
        refreshViewsAfterRemoteChange();
    }
    return { touched, skipped };
}

function applyServerLkwStatus(status) {
    if (!status || typeof status !== 'object' || lkwStatusSaveInFlight > 0) return;
    const json = JSON.stringify(status);
    if (json === JSON.stringify(loadLkwStatus())) return;
    localStorage.setItem(LKWSTATUSKEY, json);
    refreshViewsAfterRemoteChange();
}

// Oberfläche nach Fremdänderung aktualisieren – ohne den Nutzer zu stören
function refreshViewsAfterRemoteChange() {
    const msg = errorDisplayEl.textContent, msgColor = errorDisplayEl.style.color;
    if (typeof renderTable === 'function') renderTable();
    if (typeof renderLkwMenu === 'function') renderLkwMenu();
    const detailOpen = detailViewEl && !detailViewEl.classList.contains('hidden');
    const editing = currentDetailsDivEl && currentDetailsDivEl.querySelector('.inline-note-editor');
    if (detailOpen && !editing) {
        const title = document.getElementById('shipmentDetailTitle');
        const base = title ? title.dataset.hawb : '';
        if (base && loadShipments()[base]) {
            displayCurrentShipmentDetails(base);
            if (msg) { errorDisplayEl.textContent = msg; errorDisplayEl.style.color = msgColor; } // Meldung nicht wegwischen
        }
    }
}

// Änderungen anderer Geräte abholen
async function pullRemoteChanges() {
    if (syncInFlight || document.hidden) return;
    // Während der Stückzahl-Abfrage für eine NEUE Sendung nicht abrufen: die Sendung wird gleich lokal neu angelegt
    // und soll dann per Vereinigung (nicht per Ausgangsstand) mit einer evtl. gleichzeitig angelegten Fremd-Sendung zusammenlaufen.
    if (document.querySelector('#newTotalSection.visible')) return;
    syncInFlight = true;
    try {
        if (serverIsLegacy) {
            const r = await postToServer('loadAllData');
            applyServerShipments(r.data || {}, [], true);
        } else {
            const r = await postToServer('loadChanges', { sinceVersion: getSyncVersion() });
            if (r.full && Array.isArray(r.archivedBases)) setArchiveKnownBases(r.archivedBases);
            const skipped = applyServerShipments(r.changed || {}, r.deleted || [], !!r.full, r.archived || []).skipped;
            applyServerLkwStatus(r.lkwStatus);
            // Wurde eine Fremdänderung wegen lokal wartender Änderungen übersprungen, Version NICHT weiterschalten –
            // sie wird beim nächsten Abruf erneut geliefert (und ist dann nach dem Server-Merge längst enthalten).
            if (!skipped) setSyncVersion(r.version);
        }
        syncPollFailures = 0; syncPollDelay = SYNC_POLL_INTERVAL_MS;
        if (!hasPending()) showSyncOk();
    } catch (error) {
        console.warn("Abruf der Änderungen fehlgeschlagen:", error.message);
        syncPollFailures++;
        syncPollDelay = Math.min(syncPollDelay * 2, SYNC_POLL_MAX_INTERVAL_MS); // Server nicht mit Anfragen fluten
        if (isUnknownActionError(error) && !serverIsLegacy) { serverIsLegacy = true; displayError(SYNC_LEGACY_MESSAGE, 'orange'); }
        else if (syncPollFailures >= 2) setSyncIndicator('error', 'Server nicht erreichbar'); // ein einzelner Aussetzer flackert nicht rot
    } finally {
        syncInFlight = false;
        if (syncQueued || hasPending()) { syncQueued = false; flushPendingChanges(); }
    }
}

function scheduleNextPoll() {
    if (syncPollTimer) clearTimeout(syncPollTimer);
    syncPollTimer = setTimeout(async () => {
        try { await pullRemoteChanges(); } finally { scheduleNextPoll(); }
    }, syncPollDelay);
}
// Sofort abrufen (Vordergrund, Netz zurück) – und den Takt wieder auf den Grundwert setzen
function pollNow() {
    syncPollDelay = SYNC_POLL_INTERVAL_MS;
    if (syncPollTimer) clearTimeout(syncPollTimer);
    pullRemoteChanges().finally(scheduleNextPoll);
}
function startSyncPolling() {
    scheduleNextPoll();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pollNow(); });
    window.addEventListener('online', pollNow);
}

function waitForSyncIdle(maxMs = 20000) {
    return new Promise(resolve => {
        const t0 = Date.now();
        (function check() { if (!syncInFlight || Date.now() - t0 > maxMs) resolve(); else setTimeout(check, 100); })();
    });
}

// Start: kompletten Stand laden; lokal vorgemerkte (offline erfasste) Änderungen bleiben erhalten
async function loadDataFromServer() {
    console.log("Versuche Daten vom Server zu laden...");
    const localRaw = (() => { try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'); } catch (e) { return {}; } })();
    try {
        let serverData, version = null;
        try {
            const r = await postToServer('loadChanges', { sinceVersion: 0 });
            serverData = r.changed || {}; version = r.version;
            Object.values(serverData).forEach(ensureItemIds);
            applyServerLkwStatus(r.lkwStatus);
            setArchiveKnownBases(r.archivedBases || []); // Server ohne Archiv-Funktion → leere Liste
        } catch (e) {
            if (!isUnknownActionError(e)) throw e;
            serverIsLegacy = true;
            const r = await postToServer('loadAllData');
            serverData = r.data || {};
            Object.values(serverData).forEach(ensureItemIds);
            setArchiveKnownBases([]);
            displayError(SYNC_LEGACY_MESSAGE, 'orange');
        }
        const pending = readPending();
        const data = Object.assign({}, serverData);
        Object.keys(pending.changed).forEach(b => { if (localRaw[b]) data[b] = localRaw[b]; });
        Object.keys(pending.deleted).forEach(b => { delete data[b]; });
        { let k = false; Object.keys(pending.changed).concat(Object.keys(pending.deleted)).forEach(b => { if (archiveKnownBases.delete(b)) k = true; }); if (k) saveArchiveKnownBases(); }
        // Ausgangsstand = Serverstand (für Sendungen mit wartenden Änderungen bleibt der alte Ausgangsstand erhalten)
        const oldSnap = readSnapshot(); const snap = {};
        Object.keys(serverData).forEach(b => { snap[b] = pending.changed[b] && oldSnap[b] ? oldSnap[b] : JSON.stringify(serverData[b]); });
        writeSnapshot(snap);
        if (version !== null) setSyncVersion(version);
        console.log("Daten erfolgreich vom Server geladen.");
        return data;
    } catch (error) {
        console.error("Fehler beim Laden vom Server:", error);
        displayError("Keine Serververbindung. Lade lokale Daten.", 'orange', 4000);
        setSyncIndicator('error', 'Server nicht erreichbar');
        return localRaw;
    }
}
// Gibt es mindestens einen HU-Listen-Auftrag (MAN/VVL) mit aktivem LKW? Nur dann ist „HU steht auf keiner Liste“
// eine sinnvolle Aussage – ohne Listen würde sonst jeder Scan als unerwartet gelten (und piepen).
function hasActiveHuListOrders() {
    const shipments = loadShipments();
    return Object.values(shipments).some(s => s && s.isHuListOrder && isLkwActive(s.truckId));
}
function isHuExpected(huNumber) {
    const upperHu = huNumber.trim().toUpperCase();
    if (!upperHu) return true;

    const shipments = loadShipments();

    // Zuerst prüfen, ob es überhaupt HU-Listen-Aufträge gibt
    for (const baseNumber in shipments) {
        const shipment = shipments[baseNumber];
        if (shipment.isHuListOrder && shipment.scannedItems) {
            // NEU: Wenn der LKW deaktiviert ist, wird er hier komplett übersprungen
            if (!isLkwActive(shipment.truckId)) continue; 
            
            if (shipment.scannedItems.some(item => item.rawInput.toUpperCase() === upperHu)) {
                return true;
            }
        }
    }

    // Die HU wurde in keiner der existierenden und aktiven Listen gefunden. Sie ist "unerwartet".
    return false;
}



    
/**
 * Kürzt lange Spediteurnamen für eine saubere Anzeige basierend auf vordefinierten Regeln.
 * @param {string} fullName Der vollständige Name des Spediteurs.
 * @returns {string} Der gekürzte Name oder der Originalname, falls keine Regel zutrifft.
 */
/**
 * Spielt den Fehlerton für eine definierte Dauer (500ms) ab.
 */
/**
 * Spielt den Fehlerton für eine definierte Dauer (500ms) mit maximaler Lautstärke ab.
 */
// ---- Töne (Überzählig / Nachlieferung) ----------------------------------------------------------
// Web Audio: beide Dateien werden EINMAL geladen und dekodiert; jeder Scan startet daraus sofort eine eigene
// Wiedergabe – ohne Verzögerung, beliebig oft parallel, jeder Ton läuft vollständig zu Ende. Solange Web Audio
// noch nicht bereit ist (erster Start, Freischaltung steht noch aus), springen die <audio>-Elemente als
// Fallback ein (Kopie pro Ton, damit sich auch dort nichts abschneidet).
//
// iPhone/iPad: Der Browser gibt Ton erst nach der ersten Berührung/Taste frei. Das erledigt unlockAudio() beim
// ersten touchend/mousedown/keydown irgendwo auf der Seite – auch ein Enter vom Bluetooth-Scanner zählt.
// navigator.audioSession.type = 'playback' (iOS 17+) sorgt dafür, dass Web-Audio-Töne wie Medien behandelt
// werden – sonst wären sie bei umgelegtem Klingelschalter stumm, obwohl <audio> weiter hörbar wäre.
const SOUND_FILES = { error: 'assets/error-sound.mp3', nachlieferung: 'assets/nachlieferung-sound.mp3' };
const SOUND_MAX_PARALLEL = 4;           // mehr gleichzeitige Wiedergaben pro Ton bringen hörbar nichts (nur Lärm)
const soundBuffers = {};                // kind → AudioBuffer (dekodiert)
const soundActive = { error: 0, nachlieferung: 0 };
const fallbackActive = { error: [], nachlieferung: [] };
let audioCtx = null;
let audioUnlocked = false;

if ('audioSession' in navigator) { try { navigator.audioSession.type = 'playback'; } catch (e) { /* optional */ } }

function getAudioContext() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { audioCtx = new Ctx(); } catch (e) { console.warn('Web Audio nicht verfügbar:', e); return null; }
    Object.keys(SOUND_FILES).forEach(loadSoundBuffer);
    return audioCtx;
}

function loadSoundBuffer(kind) {
    if (!audioCtx || soundBuffers[kind]) return;
    fetch(SOUND_FILES[kind])
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
        .then(data => new Promise((resolve, reject) => {
            // Callback-Form: ältere Safari-Versionen liefern in decodeAudioData kein Promise
            const p = audioCtx.decodeAudioData(data, resolve, reject);
            if (p && p.then) p.then(resolve, reject);
        }))
        .then(buffer => { soundBuffers[kind] = buffer; })
        .catch(e => console.warn(`Ton "${kind}" konnte nicht geladen werden – nutze <audio>-Fallback:`, e));
}

/** Beim ersten Nutzerkontakt Audio freischalten (iOS/Android/Chrome verlangen eine Interaktion vor dem ersten Ton). */
function unlockAudio() {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (!audioUnlocked) {
        audioUnlocked = true;
        // <audio>-Elemente ebenfalls „anfassen“: stumm abspielen + sofort stoppen erlaubt späteres play() ohne Geste
        [errorSoundEl, nachlieferungSoundEl].forEach(el => {
            if (!el) return;
            try { el.muted = true; const p = el.play(); const done = () => { el.pause(); el.currentTime = 0; el.muted = false; };
                  if (p && p.then) p.then(done, () => { el.muted = false; }); else done(); } catch (e) { el.muted = false; }
        });
    }
}
['touchend', 'mousedown', 'keydown'].forEach(type => document.addEventListener(type, unlockAudio, { passive: true }));

function playSoundNow(kind) {
    const ctx = getAudioContext();
    const buffer = soundBuffers[kind];
    if (ctx && buffer && ctx.state === 'running') {
        if (soundActive[kind] >= SOUND_MAX_PARALLEL) return; // es spielen schon genug – der Hinweis ist längst hörbar
        try {
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.connect(ctx.destination);
            soundActive[kind]++;
            src.onended = () => { soundActive[kind] = Math.max(0, soundActive[kind] - 1); try { src.disconnect(); } catch (e) { /* egal */ } };
            src.start(0);
            return;
        } catch (e) { console.warn(`Web Audio (${kind}) fehlgeschlagen, nutze <audio>:`, e); }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); // z. B. nach Tab-Wechsel – nächster Ton läuft dann wieder über Web Audio
    playSoundViaElement(kind);
}

// Fallback über <audio>: eigene Kopie je Ton (ein einzelnes Element könnte den laufenden Ton nur abschneiden)
function playSoundViaElement(kind) {
    const base = kind === 'nachlieferung' ? nachlieferungSoundEl : errorSoundEl;
    if (!base) return;
    const list = fallbackActive[kind];
    for (let i = list.length - 1; i >= 0; i--) { if (list[i].ended || list[i].paused) list.splice(i, 1); }
    if (list.length >= SOUND_MAX_PARALLEL) return;
    let el;
    try { el = base.cloneNode(false); el.removeAttribute('id'); el.muted = false; el.volume = 1.0; el.currentTime = 0; } catch (e) { el = base; }
    const done = () => { const i = list.indexOf(el); if (i !== -1) list.splice(i, 1); el.removeEventListener('ended', done); el.removeEventListener('error', done); };
    el.addEventListener('ended', done);
    el.addEventListener('error', done);
    list.push(el);
    try {
        const p = el.play();
        if (p && p.catch) p.catch(error => { console.warn(`Audio (${kind}) konnte nicht abgespielt werden:`, error); done(); });
    } catch (e) { console.warn(`Audio (${kind}) Fehler:`, e); done(); }
}

/** Fehlerton (Überzählig, ~0,7 s): startet sofort, spielt vollständig – auch parallel zu laufenden Tönen. */
function playShortErrorSound() { playSoundNow('error'); }

/** Nachlieferungs-Ton (~2,2 s): startet sofort, spielt vollständig – auch parallel zu laufenden Tönen. */
function playNachlieferungSound() { playSoundNow('nachlieferung'); }



function shortenForwarderName(fullName) {
    if (!fullName) return ''; // Leere Eingaben abfangen

    const lowerCaseName = fullName.toLowerCase();

    if (lowerCaseName.includes('Kühne + nagel') || lowerCaseName.includes('Kühne')) return 'Kühne + Nagel';
    if (lowerCaseName.includes('dhl') || lowerCaseName.includes('danmar')) return 'DHL';
    if (lowerCaseName.includes('ups')) return 'UPS';
    if (lowerCaseName.includes('maersk') || lowerCaseName.includes('senator')) return 'Maersk';
    if (lowerCaseName.includes('freight consol')) return 'Freight Consol';
    if (lowerCaseName.includes('logwin')) return 'Logwin';
    if (lowerCaseName.includes('hartrodt')) return 'Hartrodt';
    if (lowerCaseName.includes('db schenker') || lowerCaseName.includes('schenker')) return 'DB Schenker';
    if (lowerCaseName.includes('ait worldwide')) return 'AIT Worldwide';
    if (lowerCaseName.includes('dachser')) return 'Dachser';
    if (lowerCaseName.includes('dsv')) return 'DSV';
    if (lowerCaseName.includes('hermes')) return 'HERMES';
    if (lowerCaseName.includes('wws') || lowerCaseName.includes('wws freight')) return 'WWS';
    if (lowerCaseName.includes('tra')) return 'TRA';
    // --- NEUE EINTRÄGE AUS DER EXCEL-LISTE ---
    if (lowerCaseName.includes('geodis')) return 'Geodis';
    if (lowerCaseName.includes('dwf')) return 'DWF';

    // Wenn keine Regel zutrifft, den Originalnamen zurückgeben
    return fullName;
}
/**
 * Vergleicht zwei Strings und gibt true zurück, wenn sie die gleiche Länge haben
 * und sich an genau einer Position unterscheiden.
 * @param {string} str1 Der erste String.
 * @param {string} str2 Der zweite String.
 * @returns {boolean} True, wenn die Strings um genau ein Zeichen abweichen.
 */
function areStringsSimilar(str1, str2) {
    if (str1.length !== str2.length) {
        return false; // Müssen die gleiche Länge haben
    }
    let diffCount = 0;
    for (let i = 0; i < str1.length; i++) {
        if (str1[i] !== str2[i]) {
            diffCount++;
        }
        // Optimierung: Bei mehr als einem Unterschied sofort abbrechen
        if (diffCount > 1) {
            return false;
        }
    }
    // Gibt nur dann true zurück, wenn exakt ein Unterschied gefunden wurde
    return diffCount === 1;
}

/**
 * Vergleicht zwei Strings und gibt HTML zurück, bei dem das unterschiedliche Zeichen
 * mit der Klasse 'blinking-char' umhüllt ist.
 * @param {string} str1 Der erste String.
 * @param {string} str2 Der zweite String.
 * @returns {object} Ein Objekt mit {html1, html2} für die beiden HTML-Strings.
 */
function highlightDifference(str1, str2) {
    let html1 = '';
    let html2 = '';
    for (let i = 0; i < str1.length; i++) {
        const char1 = escapeHtml(str1[i]);
        const char2 = escapeHtml(str2[i]);
        if (char1 !== char2) {
            html1 += `<span class="blinking-char">${char1}</span>`;
            html2 += `<span class="blinking-char">${char2}</span>`;
        } else {
            html1 += char1;
            html2 += char2;
        }
    }
    return { html1, html2 };
}
/**
 * Findet den Spediteur für eine gegebene HU-Nummer, wenn sie in einem HU-Listen-Auftrag existiert.
 * @param {string} huNumber Die zu prüfende HU-Nummer.
 * @returns {string|null} Den gekürzten Spediteurnamen oder null, wenn nicht gefunden.
 */
// --- START DER ÄNDERUNG: findCarrierForHu Funktion angepasst ---
/**
 * Findet den Spediteur und das Zielland für eine gegebene HU-Nummer,
 * wenn sie in einem HU-Listen-Auftrag existiert.
 * @param {string} huNumber Die zu prüfende HU-Nummer.
 * @returns {object|null} Ein Objekt { carrier: string, country: string } oder null, wenn nicht gefunden.
 */
function findCarrierForHu(huNumber) {
    const shipments = loadShipments();
    const upperHuNumber = huNumber.trim().toUpperCase();

    for (const baseNumber in shipments) {
        const shipment = shipments[baseNumber];
        if (shipment.isHuListOrder && shipment.scannedItems) {
            const foundItem = shipment.scannedItems.find(item => item.rawInput.toUpperCase() === upperHuNumber);
            if (foundItem) {
                // Wenn der übergeordnete Auftrag einen Spediteur und ein Zielland hat, gib beides zurück
                if (shipment.freightForwarder || shipment.destinationCountry) {
                    return {
                        carrier: shipment.freightForwarder ? shortenForwarderName(shipment.freightForwarder) : null,
                        country: shipment.destinationCountry || null
                    };
                }
                return { carrier: null, country: null }; // HU gefunden, aber keine Spediteur/Land-Info im Auftrag
            }
        }
    }
    return null; // HU nicht in einem HU-Listen-Auftrag gefunden
}
// --- ENDE DER ÄNDERUNG: findCarrierForHu Funktion angepasst ---
// --- ENDE DER ÄNDERUNG: Neue Hilfsfunktion für Spediteur-Info ---
        // --- Hilfsfunktionen: UI & Fehler ---
        function clearError() { errorDisplayEl.textContent = ''; }
        // Sync-Punkt in der App-Bar: 'ok' | 'busy' | 'error'. Ersetzt die grünen Erfolgsmeldungen,
        // damit im Scan-Betrieb nichts mehr blinkt und springt. Fehler laufen weiterhin über die Meldungsbox.
        function setSyncIndicator(state, title) {
            const el = document.getElementById('syncIndicator');
            if (!el) return;
            el.classList.remove('is-ok', 'is-busy', 'is-error');
            el.classList.add('is-' + state);
            if (title) el.title = title;
        }
        function displayError(message, color = 'red', autoClearTimeout = null) {
            if (color === 'green') {
                // Erfolg wird nicht mehr als Box gezeigt – kurz grün am Sync-Punkt anzeigen.
                setSyncIndicator('ok', message);
                if (errorDisplayEl.style.color === 'green') clearError();
                return;
            }
            errorDisplayEl.textContent = message;
            errorDisplayEl.style.color = color;
            if (autoClearTimeout) {
                setTimeout(() => {
                    if (errorDisplayEl.textContent === message && errorDisplayEl.style.color === color) {
                        clearError();
                    }
                }, autoClearTimeout);
            }
        }
        function escapeHtml(unsafe) {
            if (unsafe === null || unsafe === undefined) return '';
            return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }

// --- START: NEUE HILFSFUNKTION ZUM PARSEN VON HU-DATEN ---
/**
 * Parst einen HU-String, der zusätzliche, mit | getrennte Daten enthalten kann.
 * @param {string} huString Der zu parsende String (z.B. "1 09250929101E|box|10x10|5kg").
 * @returns {object} Ein Objekt mit den extrahierten Daten.
 */

function normalizeVwDimensions(length, width, height) {
    const clean = (value) => {
        const raw = String(value || '').replace(/mm/gi, '').trim();
        if (!raw) return '0';
        const parsed = parseInt(raw, 10);
        return Number.isNaN(parsed) ? raw : String(parsed);
    };

    return `${clean(length)}x${clean(width)}x${clean(height)} MM`;
}

function parseComplexHuString(huString) {
    const parts = huString.split('|');
    const mainPart = parts[0].trim();
    
    // Extrahieren von Position und HU-Nummer aus dem ersten Teil
    const mainPartMatch = mainPart.match(/^(?:(\d+)\s+)?([0-9A-Z]+)$/);
    
    const result = {
        position: mainPartMatch && mainPartMatch[1] ? parseInt(mainPartMatch[1], 10) : null,
        rawInput: mainPartMatch ? mainPartMatch[2] : mainPart, // Die reine HU
        fullInput: mainPart, // Position + HU
        packaging: parts[1] ? parts[1].trim() : null,
        dimensions: parts[2] ? parts[2].trim() : null,
        grossWeight: parts[3] ? parts[3].trim() : null
    };
    return result;
}
// --- ENDE: NEUE HILFSFUNKTION ---
/**
 * Passt die Schriftgröße eines HTML-Elements dynamisch an, damit sein Inhalt in einen Container passt.
 * @param {HTMLElement} element Das zu skalierende Element (z.B. feedbackScanNumberEl).
 * @param {HTMLElement} container Das Elternelement, dessen Breite als Referenz dient (z.B. batchScanFeedbackModalEl.querySelector('.modal-content')).
 * @param {number} initialFontSize Der Startwert für die Schriftgröße in px (z.B. 56 für 3.5em bei 16px body font-size).
 * @param {number} minFontSize Die minimale Schriftgröße, die nicht unterschritten werden soll (in px).
 * @param {number} paddingPercent Optionaler Padding-Anteil (z.B. 0.1 für 10% links/rechts).
 */

function fitTextToContainer(element, container, initialFontSize, minFontSize, paddingPercent = 0.05) {
    // Setzen Sie die Schriftgröße zuerst auf den maximalen Wert.
    element.style.fontSize = `${initialFontSize}px`;

    // Berücksichtigen Sie das Padding des Containers oder des Elements selbst
    const containerStyle = getComputedStyle(container);
    const containerWidth = container.clientWidth - parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight);

    let currentFontSize = initialFontSize;
    const maxTextWidth = containerWidth * (1 - (paddingPercent * 2)); // Beispiel: 10% Padding links/rechts

    // Reduzieren Sie die Schriftgröße, bis der Text passt oder die minimale Größe erreicht ist.
    while (element.scrollWidth > maxTextWidth && currentFontSize > minFontSize) {
        currentFontSize -= 1; // Schrittweise verringern
        element.style.fontSize = `${currentFontSize}px`;
    }
}
// --- ENDE DER ÄNDERUNG: Dynamisches Font-Sizing Hilfsfunktion ---
        function focusShipmentInput() {
            const isModalVisible = (sel) => document.querySelector(sel)?.classList.contains('visible');
            // ANFORDERUNG 2: Das neue HU-Import-Modal zur Prüfung hinzufügen
            if (isModalVisible('#editModal') || isModalVisible('#batchNoteModal') || isModalVisible('#importHuModal') || isModalVisible('#huEditModal') ||
                (sideMenuEl && sideMenuEl.classList.contains('open')) ||
                (newTotalSectionEl && newTotalSectionEl.classList.contains('visible')) ||
                document.querySelector('#currentShipmentDetails .inline-note-editor')) {
                return; // Kein Fokus, wenn ein Modal, Menü oder Editor aktiv ist
            }
            // Auf einer Unterseite (Vollbild) ist das Scan-Feld nicht sichtbar – dort nichts fokussieren
            if (typeof currentPage !== 'undefined' && currentPage && pageViewEl && !pageViewEl.classList.contains('hidden')) return;
            if (shipmentNumberInputEl && !shipmentNumberInputEl.disabled) {
                shipmentNumberInputEl.inputMode = 'none'; // Für Scanner
                setTimeout(() => shipmentNumberInputEl.focus(), 0);
            }
        }

        function processShipmentNumber(rawInput) {
            if (!rawInput) return { baseNumber: '', suffix: null, isValidFormat: false, raw: '', isSuffixFormat: false };
            const raw = rawInput.trim().toUpperCase();
            
            let baseNumber = '';
            let suffix = null;
            let isValidFormat = false;
            let isSuffixFormat = false; // <-- NEUES FELD
            
            const MIN_LENGTH_FOR_IMPLICIT_SUFFIX = 12;

            if (raw.includes('+')) {
                const parts = raw.split('+');
                if (parts.length === 2 && parts[0].length > 0 && parts[1].length === SUFFIX_LENGTH && /^\d+$/.test(parts[1])) {
                    baseNumber = parts[0];
                    suffix = parts[1];
                    isValidFormat = true;
                    isSuffixFormat = true; // <-- SETZEN
                }
            } 
            else if (raw.length >= MIN_LENGTH_FOR_IMPLICIT_SUFFIX && /\d{4}$/.test(raw.slice(-SUFFIX_LENGTH))) {
                suffix = raw.slice(-SUFFIX_LENGTH);
                let preSuffixPart = raw.slice(0, -SUFFIX_LENGTH);
                baseNumber = preSuffixPart.replace(/0+$/, '');
                if (baseNumber.length > 0) {
                    isValidFormat = true;
                    isSuffixFormat = true; // <-- SETZEN
                }
            } 
            else if (raw.length > 0) {
                baseNumber = raw;
                suffix = null;
                isValidFormat = true;
                isSuffixFormat = false; // <-- SETZEN
            }

            if (baseNumber.length === 0) {
                 isValidFormat = false;
            }

            return { baseNumber, suffix, isValidFormat, raw, isSuffixFormat }; // <-- NEUES FELD ZURÜCKGEBEN
        }
        function findShipmentByNoteContent(searchText) {
            const shipments = loadShipments();
            const upperSearchText = searchText.trim().toUpperCase();
            if (!upperSearchText) return null;

            for (const baseNumber in shipments) {
                if (shipments.hasOwnProperty(baseNumber)) {
                    const shipment = shipments[baseNumber];
                    if (shipment.scannedItems && Array.isArray(shipment.scannedItems)) {
                        for (const item of shipment.scannedItems) {
                            // *** ÄNDERUNG HIER ***
                            // Überprüft, ob das 'notes'-Array existiert und durchsucht es.
                            if (item.notes && Array.isArray(item.notes)) {
                                for (const note of item.notes) {
                                    if (note && note.trim().toUpperCase() === upperSearchText) {
                                        // Treffer gefunden! Gib die HAWB zurück.
                                        return baseNumber;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return null; // Keine passende Notiz in keiner Sendung gefunden.
        }
        function findShipmentByHuNumber(huNumber) {
            const shipments = loadShipments();
            const upperHuNumber = huNumber.trim().toUpperCase();
            if (!upperHuNumber) return null;

            for (const baseNumber in shipments) {
                const shipment = shipments[baseNumber];
                // Suche nur in Aufträgen, die als HU-Listen-Auftrag markiert sind!
                if (shipment.isHuListOrder && shipment.scannedItems && Array.isArray(shipment.scannedItems)) {
                    const foundItem = shipment.scannedItems.find(item => item.rawInput.toUpperCase() === upperHuNumber);
                    if (foundItem) {
                // LKW deaktiviert → HU wird als unbekannt behandelt
                if (!isLkwActive(shipment.truckId)) return null;
                return baseNumber;
            

                    }
                }
            }
            return null; // Keine passende HU in keinem HU-Auftrag gefunden.
        }
        function calculateCurrentCountedPieces(scannedItems) {
            if (!Array.isArray(scannedItems)) return 0;
            return scannedItems.filter(item => !item.isCombination && !item.isCancelled && !NON_COUNTING_STATUSES.includes(item.status)).length;
        }

        function calculateStatusSummary(scannedItems) {
            const summary = {};
            if (!Array.isArray(scannedItems)) return summary;
            scannedItems.filter(item => !item.isCombination && !item.isCancelled && !NON_COUNTING_STATUSES.includes(item.status))
                .forEach(item => { summary[item.status] = (summary[item.status] || 0) + 1; });
            return summary;
        }

        // --- UI Update Funktionen ---
        function updateClearButtonVisibility(inputElement, clearButtonElement) {
            const el = inputElement || shipmentNumberInputEl;
            const btn = clearButtonElement || clearInputButtonEl;
            const hasText = el.value.trim() !== '';
            btn.style.display = (hasText && !el.disabled) ? 'block' : 'none';
        }

        function updateNoteAndComboVisibility() {
            const selectedStatus = securityStatusSelectEl.value;
            const showCombo = selectedStatus === 'XRY' && !isBatchModeActive;
            comboCheckboxContainerEl.classList.toggle('visible', showCombo);
            comboCheckboxContainerEl.style.display = showCombo ? 'flex' : 'none';
            comboCheckboxEl.disabled = !showCombo;
            if (!showCombo) comboCheckboxEl.checked = false;

            const showNoteButton = NOTE_ALLOWED_STATUSES.includes(selectedStatus) && !isBatchModeActive;
            noteToggleButtonEl.style.display = showNoteButton ? 'flex' : 'none';
            if (!showNoteButton) { // Wenn Button nicht sichtbar, Notizeingabe schließen
                resetSingleScanNoteInputState();
            }
        }

        function resetSingleScanNoteInputState() {
            noteInputEl.value = '';
            noteInputContainerEl.style.display = 'none';
            noteToggleButtonEl.classList.remove('note-active');
            updateClearButtonVisibility(noteInputEl, clearNoteButtonEl);
        }
        
        function removeActiveInlineNoteEditor() {
            const activeEditor = currentDetailsDivEl.querySelector('.inline-note-editor');
            if (activeEditor) {
                const liElement = activeEditor.closest('li');
                activeEditor.remove();
                if (liElement) liElement.classList.remove('editing-note');
            }
        }

        // Hilfsfunktion zur Bestimmung der CSS-Klasse für Zähler
        function getStatusClass(count, expected) {
            // Wenn keine Erwartung gesetzt ist oder die Zählung 0 ist, keine Farbe (Standard schwarz)
            if (expected === null || expected === undefined || count === 0) {
                return ''; 
            }
            if (count < expected) {
                return 'mismatch'; // Orange
            }
            if (count === expected) {
                return 'ok'; // Grün
            }
            if (count > expected) {
                return 'over'; // Rot
            }
            return ''; // Fallback
        }




        // Ersetzen Sie die komplette Funktion mit dieser Version
        
        
        
        
        
        
        
        
        
        
        
        
        
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESEM CODE ---

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESEM CODE ---

// =========================================================================
// ERSETZEN SIE IHRE GESAMTE displayCurrentShipmentDetails FUNKTION MIT DIESER
// =========================================================================
// ERSETZEN SIE IHRE ALTE 'displayCurrentShipmentDetails' FUNKTION MIT DIESER

// ---- Detailansicht am Desktop: Kopfzeile und Packstücktabelle (nur Darstellung, keine Datenänderung) --------------
function detailTruckInfo(shipment) {
    if (!shipment || !shipment.truckId) return null;
    const t = collectTrucks(loadShipments(), loadLkwStatus()).find(x => x.truckId === shipment.truckId);
    return t || { truckId: shipment.truckId, icon: '🚚', name: truckShortName(shipment.truckId) };
}
function detailUniqueKg(shipment) {
    const seen = new Set(); let sum = 0, any = false;
    (Array.isArray(shipment.scannedItems) ? shipment.scannedItems : []).forEach(i => {
        if (!i || i.isCancelled) return;
        const key = String(i.rawInput).toUpperCase();
        const kg = parseWeightKg(i.grossWeight);
        if (kg === null || seen.has(key)) return;
        seen.add(key); sum += kg; any = true;
    });
    return any ? sum : null;
}
function buildDetailHead(base, shipment, archivedView) {
    const truck = detailTruckInfo(shipment);
    const light = shipmentTrafficLight(shipment);
    // Gewicht: pro HU nur einmal zählen (Scan-Einträge derselben HU tragen ggf. dasselbe Gewicht)
    const kg = shipment.isHuListOrder ? detailUniqueKg(shipment) : shipmentTotalKg(shipment);
    const notes = shipmentNoteCount(shipment);
    const expected = expectedPiecesOf(shipment);
    const changed = shipment.lastModified ? new Date(shipment.lastModified).toLocaleString('de-DE') : '–';
    const pdfData = shipment.parentOrderNumber ? ` data-parentordernumber="${escapeHtml(shipment.parentOrderNumber)}"` : '';
    const qrId = 'qrcode-detail-' + String(base).replace(/[^a-zA-Z0-9]/g, '');

    let crumbs = `<a href="#" class="detail-crumb" data-crumb-page="home">Startseite</a>`;
    if (truck && !archivedView) {
        crumbs += `<span class="detail-crumb-sep">›</span><a href="#" class="detail-crumb" data-crumb-page="anlieferung">Anlieferung</a>`
            + `<span class="detail-crumb-sep">›</span><a href="#" class="detail-crumb" data-crumb-page="lkw" data-crumb-truck="${escapeHtml(truck.truckId)}">${truckLabelHtml(truck)}</a>`;
    } else if (archivedView) {
        crumbs += `<span class="detail-crumb-sep">›</span><a href="#" class="detail-crumb" data-crumb-page="info">Info &amp; Suche</a>`;
    }
    crumbs += `<span class="detail-crumb-sep">›</span><span class="detail-crumb-current">${escapeHtml(base)}</span>`;

    const facts = [
        ['Status', `<span class="dt-light ${light.cls}"></span>${escapeHtml(light.text)}`],
        ['LKW', truck ? truckLabelHtml(truck) : '–'],
        ['Kolli', expected !== null && expected !== undefined ? String(expected) : '–'],
        ['Gewicht', kg === null ? '–' : escapeHtml(formatKg(kg))],
        ['Notizen', notes ? String(notes) : '–'],
        ['Letzte Änd.', escapeHtml(changed)]
    ];
    if (shipment.mitarbeiter) facts.push(['Erfasst von', escapeHtml(shipment.mitarbeiter)]);
    const factsHtml = facts.map(([k, v]) => `<div class="detail-fact"><span class="detail-fact-label">${k}</span><span class="detail-fact-value">${v}</span></div>`).join('');

    const actions = archivedView
        ? `<button type="button" class="pdf-btn" data-basenumber="${escapeHtml(base)}"${pdfData}>PDF</button>`
        : `<button type="button" class="edit-btn" data-basenumber="${escapeHtml(base)}" title="Sendung ${escapeHtml(base)} bearbeiten">Edit</button>`
          + `<button type="button" class="pdf-btn" data-basenumber="${escapeHtml(base)}"${pdfData}>PDF</button>`
          + `<button type="button" class="delete-btn main-delete-btn" data-basenumber="${escapeHtml(base)}" title="Sendung ${escapeHtml(base)} löschen">Löschen</button>`;

    return `<div class="detail-head">`
        + `<div class="detail-crumbs">${crumbs}</div>`
        + `<div class="detail-head-row"><div class="detail-facts">${factsHtml}</div>`
        + `<div class="detail-head-side"><div class="detail-actions actions-cell">${actions}</div>`
        + `<div class="detail-qr" title="QR-Code ${escapeHtml(base)}"><div id="${qrId}" data-qr-text="${escapeHtml(base)}"></div></div></div></div>`
        + `</div>`;
}
// Packstücke eines HU-Listen-Auftrags: pro Platz (Anstehend bzw. Sicherungsstatus) eine Zeile; Wareneingang, Dunkelalarm
// und Notizen werden über die HU-Nummer zugeordnet. Zählung wie in der Zusammenfassung (calculate…-Funktionen).
function buildDetailPackTable(shipment, readOnly, base) {
    const items = Array.isArray(shipment.scannedItems) ? shipment.scannedItems : [];
    const slots = items.filter(i => i && !i.isCancelled && (i.status === 'Anstehend' || EXCLUSIVE_SECURITY_STATUSES.includes(i.status)));
    if (!slots.length) return '';
    const byHu = (hu, pred) => items.filter(i => i && !i.isCancelled && String(i.rawInput).toUpperCase() === String(hu).toUpperCase() && pred(i));
    const isVvl = slots.some(i => i.sendnr);
    const todayStr = new Date().toLocaleDateString('de-DE');
    const fmtTime = iso => { const d = new Date(iso); if (isNaN(d)) return ''; const ds = d.toLocaleDateString('de-DE'); return ds === todayStr ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ds + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
    const openCount = slots.filter(i => i.status === 'Anstehend').length;
    const packCount = slots.filter(i => !i.isCombination).length;   // Kombi-Sicherungen sind Zusatzzeilen, keine eigenen Packstücke
    const hasPos = slots.some(i => i.position);   // VVL-Positionen tragen keine Nummer → Spalte weglassen

    const rows = slots.slice().sort((a, b) => ((a.position || 9999) - (b.position || 9999)) || String(a.rawInput).localeCompare(String(b.rawInput))).map((item, idx) => {
        const hu = item.rawInput;
        const detail = items.find(i => i && String(i.rawInput).toUpperCase() === String(hu).toUpperCase() && (i.packaging || i.dimensions || i.grossWeight)) || item;
        const we = byHu(hu, i => i.status === 'Wareneingang').length > 0;
        const dunkelAll = byHu(hu, i => i.status === 'Dunkelalarm');
        // offen = nach dem Dunkelalarm keine Sicherung mehr auf dieser HU
        const dunkel = dunkelAll.filter(a => !byHu(hu, i => EXCLUSIVE_SECURITY_STATUSES.includes(i.status) && (Date.parse(i.timestamp) || 0) >= (Date.parse(a.timestamp) || 0)).length);
        const notes = byHu(hu, () => true).reduce((arr, i) => arr.concat(Array.isArray(i.notes) ? i.notes : []), []);
        const open = item.status === 'Anstehend';
        let statusHtml;
        if (dunkel.length) statusHtml = `<span class="pack-status danger">Dunkelalarm</span>`;
        else if (open) statusHtml = `<span class="pack-status open">Offen</span>`;
        else statusHtml = `<span class="pack-status ok">${escapeHtml(item.status)}${item.isCombination ? ' (Kombi)' : ''}</span>${dunkelAll.length ? '<span class="pack-status-note" title="Dunkelalarm erledigt – danach gesichert">nach Dunkelalarm</span>' : ''}`;
        const weHtml = we ? `<span class="pack-we ok" title="Wareneingang erfasst">WE</span>` : `<span class="pack-we" title="Kein Wareneingang">–</span>`;
        const timeHtml = open ? '' : escapeHtml(fmtTime(item.timestamp));
        const rowClass = dunkel.length ? 'pack-row-danger' : (open ? 'pack-row-open' : 'pack-row-done');
        // Auswahl-Kästchen an jeder Zeile: offene Packstücke können eine Kontrollmethode bekommen, gesicherte storniert werden
        // (data-state steuert, welche Knöpfe die Leiste zeigt; data-timestamp = der Sicherungs-Eintrag für den Storno)
        const selectCell = readOnly ? '' : `<td class="pack-select-cell"><input type="checkbox" class="pack-select" data-hu="${escapeHtml(hu)}" data-state="${open ? 'open' : 'secured'}"${open ? '' : ` data-timestamp="${escapeHtml(item.timestamp)}"`} title="${escapeHtml(hu)} auswählen" aria-label="${escapeHtml(hu)} auswählen"></td>`;
        // Sortierwerte für den Klick auf einen Spaltenkopf (applyPackTableSort): leer = „–“, landet immer am Ende
        const kg = parseWeightKg(detail.grossWeight);
        const sortAttrs = ` data-ps-default="${idx}" data-ps-pos="${item.position || ''}" data-ps-hu="${escapeHtml(hu)}"${isVvl ? ` data-ps-sendnr="${escapeHtml(item.sendnr || '')}"` : ''}`
            + ` data-ps-pack="${escapeHtml(detail.packaging || '')}" data-ps-dim="${escapeHtml(detail.dimensions || '')}" data-ps-kg="${kg === null ? '' : kg}" data-ps-we="${we ? 1 : 0}"`
            + ` data-ps-status="${dunkel.length ? '0 Dunkelalarm' : (open ? '1 Offen' : '2 ' + escapeHtml(item.status))}" data-ps-time="${open ? '' : (Date.parse(item.timestamp) || '')}" data-ps-notes="${notes.length}"`;
        return `<tr class="${rowClass}"${sortAttrs}>`
            + selectCell
            + (hasPos ? `<td class="pack-pos">${item.position ? escapeHtml(String(item.position)) + '.' : ''}</td>` : '')
            + `<td class="pack-hu"><span class="hu-value${dunkel.length ? ' has-dunkelalarm' : ''}" title="Klicken zum Kopieren">${escapeHtml(hu)}</span></td>`
            + (isVvl ? `<td class="pack-sendnr-cell">${item.sendnr ? `<span class="pack-sendnr">${escapeHtml(item.sendnr)}</span>` : '<span class="dt-dim">–</span>'}</td>` : '')
            + `<td class="pack-text">${escapeHtml(detail.packaging || '–')}</td>`
            + `<td class="pack-text">${escapeHtml(detail.dimensions || '–')}</td>`
            + `<td class="pack-num">${escapeHtml(detail.grossWeight || '–')}</td>`
            + `<td class="pack-we-cell">${weHtml}</td>`
            + `<td>${statusHtml}</td>`
            + `<td class="pack-time">${timeHtml}</td>`
            + `<td class="pack-notes">${notes.map(n => `<span class="pack-note">${escapeHtml(n)}</span>`).join('')}</td>`
            + (readOnly ? '' : `<td class="pack-edit-cell"><button type="button" class="pack-edit-btn" data-basenumber="${escapeHtml(base || shipment.hawb || '')}" data-hu="${escapeHtml(hu)}" title="Packstück ${escapeHtml(hu)} bearbeiten (Nummer, Verpackung, Maße, Gewicht)" aria-label="Packstück bearbeiten"></button></td>`)
            + `</tr>`;
    }).join('');

    // Leiste für die Auswahl: erscheint, sobald mindestens ein Packstück angehakt ist – Kontrollmethode wählen, „Übernehmen“
    // verbucht sie für jede gewählte HU genau wie einen Scan (gleiche Funktion, gleiche Regeln, gleicher Sync)
    const selectBar = readOnly ? '' : `<div class="pack-select-bar hidden" data-basenumber="${escapeHtml(base || shipment.hawb || '')}">`
        + `<span class="pack-select-count">0 ausgewählt</span>`
        + `<span class="pack-select-group pack-select-group-apply"><label class="pack-select-label">Kontrollmethode <select class="pack-select-status">${EXCLUSIVE_SECURITY_STATUSES.map(s => `<option value="${s}">${s}</option>`).join('')}<option value="Wareneingang">Wareneingang</option><option value="Dunkelalarm">Dunkelalarm</option></select></label>`
        + `<label class="pack-select-label pack-select-combo-wrap" title="Kombi-Sicherung: zusätzliche Kontrolle, zählt nicht als finale Sicherung – das Packstück bleibt offen"><input type="checkbox" class="pack-select-combo"> Kombi</label>`
        + `<button type="button" class="pack-select-apply">Übernehmen</button></span>`
        + `<span class="pack-select-group pack-select-group-cancel"><button type="button" class="pack-select-cancel">Storno</button></span>`
        + `<button type="button" class="pack-select-clear">Auswahl aufheben</button>`
        + `</div>`;
    return `<div class="detail-pack">`
        + `<div class="detail-pack-head"><h4>Packstücke (${packCount})</h4><span class="detail-pack-meta">${openCount ? `${openCount} offen` : 'alle gesichert'}</span>${readOnly ? '' : `<button type="button" class="pack-add-btn" data-basenumber="${escapeHtml(base || shipment.hawb || '')}" title="Weiteres Packstück zu diesem Auftrag aufnehmen">+ Packstück</button>`}</div>`
        + selectBar
        + `<table class="pack-table"><thead><tr>${readOnly ? '' : `<th class="pack-select-cell"><input type="checkbox" class="pack-select-all" title="Alle Packstücke auswählen" aria-label="Alle Packstücke auswählen"></th>`}${hasPos ? '<th data-psort="pos">Pos.</th>' : ''}<th data-psort="hu">${isVvl ? 'VSE' : 'HU'}</th>${isVvl ? '<th data-psort="sendnr">Sendungs-Nr.</th>' : ''}<th data-psort="pack">Verpackung</th><th data-psort="dim">Maße</th><th data-psort="kg">Gewicht</th><th data-psort="we">WE</th><th data-psort="status">Sicherung</th><th data-psort="time">Zeit</th><th data-psort="notes">Notiz</th>${readOnly ? '' : '<th class="pack-edit-head"></th>'}</tr></thead>`
        + `<tbody>${rows}</tbody></table></div>`;
}

// Normale Sendung (kein HU-Auftrag, alle Scans tragen dieselbe Nummer): Tabelle mit einer Zeile je erwartetem Stück.
// Zeile n = n-ter Sicherungsscan (chronologisch); Wareneingang wird dem gleichen Platz zugeordnet; Dunkelalarme und
// Kombi-Scans erscheinen als eigene Zeilen dahinter. Reine Darstellung der Zeitleiste – Zählung wie in der Zusammenfassung.
function buildDetailScanTable(shipment, base, readOnly) {
    const items = (Array.isArray(shipment.scannedItems) ? shipment.scannedItems : []).filter(i => i && !i.isCancelled && i.status !== 'Anstehend');
    const expected = expectedPiecesOf(shipment);
    const byTime = (a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0);
    const secured = items.filter(i => EXCLUSIVE_SECURITY_STATUSES.includes(i.status) && !i.isCombination).sort(byTime);
    const receipts = items.filter(i => i.status === 'Wareneingang').sort(byTime);
    const alarms = items.filter(i => i.status === 'Dunkelalarm').sort(byTime);
    const kombis = items.filter(i => i.isCombination).sort(byTime);
    const others = items.filter(i => !EXCLUSIVE_SECURITY_STATUSES.includes(i.status) && i.status !== 'Wareneingang' && i.status !== 'Dunkelalarm' && !i.isCombination).sort(byTime);
    const rowsCount = Math.max(expected || 0, secured.length, receipts.length);
    if (!rowsCount && !alarms.length && !kombis.length && !others.length) return '';
    const todayStr = new Date().toLocaleDateString('de-DE');
    const fmtTime = iso => { const d = new Date(iso); if (isNaN(d)) return ''; const ds = d.toLocaleDateString('de-DE'); const ts = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); return ds === todayStr ? ts : ds + ' ' + ts; };
    const lastAlarm = alarms.length ? Date.parse(alarms[alarms.length - 1].timestamp) || 0 : 0;
    const openAlarm = alarms.length && !(expected > 0 && secured.length >= expected) && !secured.some(i => (Date.parse(i.timestamp) || 0) >= lastAlarm);
    const notesOf = it => (it && Array.isArray(it.notes) ? it.notes : []).map(n => `<span class="pack-note">${escapeHtml(n)}</span>`).join('');
    const hasDetail = it => !!(it && (it.packaging || it.dimensions || it.grossWeight));
    const notesCount = it => (it && Array.isArray(it.notes) ? it.notes.length : 0);
    const tsOf = it => (it && (Date.parse(it.timestamp) || '')) || '';
    const detailCells = d => `<td class="pack-text">${escapeHtml((d && d.packaging) || '–')}</td><td class="pack-text">${escapeHtml((d && d.dimensions) || '–')}</td><td class="pack-num">${escapeHtml((d && d.grossWeight) || '–')}</td>`;
    const baseAttr = escapeHtml(base || shipment.hawb || '');
    let rows = '';
    for (let n = 0; n < rowsCount; n++) {
        const sec = secured[n], we = receipts[n];
        const open = !sec;
        // Angaben zum Stück (Verpackung/Maße/Gewicht) hängen am Sicherungsscan, sonst am Wareneingang dieses Platzes
        const anchor = sec || we || null;
        const detail = [sec, we].find(hasDetail) || null;
        const cls = open ? (openAlarm && n === secured.length ? 'pack-row-danger' : 'pack-row-open') : 'pack-row-done';
        const editCell = readOnly ? '' : `<td class="pack-edit-cell">${anchor ? `<button type="button" class="pack-edit-btn" data-basenumber="${baseAttr}" data-item-id="${escapeHtml(anchor.id || '')}" data-partner-id="${escapeHtml(sec && we ? we.id || '' : '')}" data-piece="${n + 1}" data-piece-total="${rowsCount}" title="Stück ${n + 1} bearbeiten (Verpackung, Maße, Gewicht)" aria-label="Stück bearbeiten"></button>` : ''}</td>`;
        const kg = parseWeightKg(detail && detail.grossWeight);
        rows += `<tr class="${cls}" data-ps-default="${n}" data-ps-pos="${n + 1}" data-ps-pack="${escapeHtml((detail && detail.packaging) || '')}" data-ps-dim="${escapeHtml((detail && detail.dimensions) || '')}" data-ps-kg="${kg === null ? '' : kg}" data-ps-we="${we ? 1 : 0}"`
            + ` data-ps-status="${sec ? '2 ' + escapeHtml(sec.status) : (openAlarm && n === secured.length ? '0 Dunkelalarm' : '1 Offen')}" data-ps-time="${tsOf(sec) || tsOf(we)}" data-ps-notes="${notesCount(sec) + notesCount(we)}">`
            + `<td class="pack-pos">${n + 1}.</td>`
            + detailCells(detail)
            + `<td class="pack-we-cell">${we ? `<span class="pack-we ok" title="Wareneingang ${escapeHtml(fmtTime(we.timestamp))}">WE</span>` : '<span class="pack-we" title="Kein Wareneingang">–</span>'}</td>`
            + `<td>${sec ? `<span class="pack-status ok">${escapeHtml(sec.status)}</span>` : (openAlarm && n === secured.length ? '<span class="pack-status danger">Dunkelalarm</span>' : '<span class="pack-status open">Offen</span>')}</td>`
            + `<td class="pack-time">${sec ? escapeHtml(fmtTime(sec.timestamp)) : (we ? `<span class="dt-dim">WE ${escapeHtml(fmtTime(we.timestamp))}</span>` : '')}</td>`
            + `<td class="pack-notes">${notesOf(sec)}${notesOf(we)}</td>`
            + editCell
            + `</tr>`;
    }
    let extraIdx = rowsCount;
    const extra = (list, label, cls) => list.map(it => `<tr class="${cls}" data-ps-default="${extraIdx++}" data-ps-pos="" data-ps-pack="" data-ps-dim="" data-ps-kg="" data-ps-we="" data-ps-status="${cls === 'pack-row-danger' ? '0 ' : '2 '}${escapeHtml(label || it.status)}" data-ps-time="${tsOf(it)}" data-ps-notes="${notesCount(it)}"><td class="pack-pos"></td>${detailCells(null)}<td class="pack-we-cell"></td><td><span class="pack-status ${cls === 'pack-row-danger' ? 'danger' : 'ok'}">${escapeHtml(label || it.status)}</span></td><td class="pack-time">${escapeHtml(fmtTime(it.timestamp))}</td><td class="pack-notes">${notesOf(it)}</td>${readOnly ? '' : '<td class="pack-edit-cell"></td>'}</tr>`).join('');
    rows += extra(alarms, openAlarm ? 'Dunkelalarm' : 'Dunkelalarm (erledigt)', openAlarm ? 'pack-row-danger' : 'pack-row-done');
    rows += extra(kombis.map(k => Object.assign({}, k, { status: k.status + ' (Kombi)' })), null, 'pack-row-done');
    rows += extra(others, null, 'pack-row-done');
    const openCount = Math.max(0, rowsCount - secured.length);
    return `<div class="detail-pack">`
        + `<div class="detail-pack-head"><h4>Stücke (${rowsCount}${expected === null ? ' erfasst' : ''})</h4><span class="detail-pack-meta">${openCount ? `${openCount} offen` : 'alle gesichert'}</span></div>`
        + `<table class="pack-table pack-table-plain"><thead><tr><th data-psort="pos">Nr.</th><th data-psort="pack">Verpackung</th><th data-psort="dim">Maße</th><th data-psort="kg">Gewicht</th><th data-psort="we">WE</th><th data-psort="status">Sicherung</th><th data-psort="time">Zeit</th><th data-psort="notes">Notiz</th>${readOnly ? '' : '<th class="pack-edit-head"></th>'}</tr></thead>`
        + `<tbody>${rows}</tbody></table></div>`;
}

// ---- Packstück bearbeiten (Desktop-Tabelle): HU-Nummer, Verpackung, Maße, Gewicht -------------------------------
// Alle Einträge derselben HU (Platz „Anstehend“, Wareneingang, Sicherung, Dunkelalarm, Stornos) werden gemeinsam
// geändert – die HU-Nummer ist der Schlüssel, über den der Scanner das Packstück findet. Zählung/Status bleiben unberührt.
function huItemsOf(shipment, hu) {
    const key = String(hu).toUpperCase();
    return (Array.isArray(shipment.scannedItems) ? shipment.scannedItems : []).filter(i => i && String(i.rawInput).toUpperCase() === key);
}
function openHuEditModal(base, hu) {
    const modal = document.getElementById('huEditModal');
    if (!modal) return;
    const shipments = loadShipments();
    const shipment = shipments[base];
    if (!shipment) { displayError(`Sendung ${escapeHtml(base)} nicht gefunden.`); return; }
    const items = huItemsOf(shipment, hu);
    if (!items.length) { displayError(`Packstück ${escapeHtml(hu)} nicht gefunden.`); return; }
    const detail = items.find(i => i.packaging || i.dimensions || i.grossWeight) || items[0];
    const scans = items.filter(i => i.status !== 'Anstehend' && !i.isCancelled).length;
    document.getElementById('huEditBaseNumber').value = base;
    document.getElementById('huEditOriginalHu').value = hu;
    document.getElementById('huEditNumber').value = hu;
    document.getElementById('huEditPackaging').value = detail.packaging && detail.packaging !== 'N/A' ? detail.packaging : '';
    document.getElementById('huEditDimensions').value = detail.dimensions && detail.dimensions !== 'N/A' ? detail.dimensions : '';
    document.getElementById('huEditWeight').value = detail.grossWeight && detail.grossWeight !== 'N/A' ? detail.grossWeight : '';
    document.getElementById('huEditContext').textContent = `${shipment.freightForwarder && shipment.destinationCountry ? 'Rechnung' : 'Auftrag'} ${base}` + (detail.position ? ` · Position ${detail.position}` : '') + (scans ? ` · ${pluralize(scans, 'Scan', 'Scans')} auf diesem Packstück` : ' · noch nicht gescannt');
    const err = document.getElementById('huEditError'); err.textContent = ''; err.classList.add('hidden');
    modal.classList.add('visible');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('huEditNumber').select(), 50);
}
// Stück einer normalen Sendung (ohne HU-Liste): Verpackung/Maße/Gewicht am Scan-Eintrag des Stücks (Sicherung, sonst WE).
// Gleiches Modal wie „Packstück bearbeiten“, nur ohne HU-Nummer – die Nummer ist hier die Sendungsnummer selbst.
function openPieceEditModal(base, itemId, partnerId, pieceNo, pieceTotal) {
    const modal = document.getElementById('huEditModal');
    if (!modal) return;
    const shipments = loadShipments();
    const shipment = shipments[base];
    if (!shipment) { displayError(`Sendung ${escapeHtml(base)} nicht gefunden.`); return; }
    const items = Array.isArray(shipment.scannedItems) ? shipment.scannedItems : [];
    const item = items.find(i => i && i.id === itemId);
    if (!item) { displayError('Stück nicht gefunden – bitte Ansicht neu öffnen.'); return; }
    const partner = partnerId ? items.find(i => i && i.id === partnerId) : null;
    const detail = (item.packaging || item.dimensions || item.grossWeight) ? item : (partner && (partner.packaging || partner.dimensions || partner.grossWeight) ? partner : item);
    modal.classList.add('piece-mode');
    modal.querySelector('h3').textContent = 'Stück bearbeiten';
    document.getElementById('huEditBaseNumber').value = base;
    document.getElementById('huEditOriginalHu').value = '';
    document.getElementById('huEditItemId').value = itemId;
    document.getElementById('huEditPartnerId').value = partner ? partnerId : '';
    document.getElementById('huEditNumber').value = String(item.rawInput || base);
    document.getElementById('huEditPackaging').value = detail.packaging && detail.packaging !== 'N/A' ? detail.packaging : '';
    document.getElementById('huEditDimensions').value = detail.dimensions && detail.dimensions !== 'N/A' ? detail.dimensions : '';
    document.getElementById('huEditWeight').value = detail.grossWeight && detail.grossWeight !== 'N/A' ? detail.grossWeight : '';
    const when = new Date(item.timestamp);
    document.getElementById('huEditContext').textContent = `Sendung ${base} · Stück ${pieceNo} von ${pieceTotal} · ${item.status}${isNaN(when) ? '' : ' ' + when.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    const err = document.getElementById('huEditError'); err.textContent = ''; err.classList.add('hidden');
    modal.classList.add('visible');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('huEditPackaging').focus(), 50);
}
function savePieceEditFromModal() {
    const base = document.getElementById('huEditBaseNumber').value;
    const itemId = document.getElementById('huEditItemId').value;
    const partnerId = document.getElementById('huEditPartnerId').value;
    const packaging = document.getElementById('huEditPackaging').value.trim();
    const dimensions = document.getElementById('huEditDimensions').value.trim();
    const weightRaw = document.getElementById('huEditWeight').value.trim();
    const err = document.getElementById('huEditError');
    const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };
    let grossWeight = null;
    if (weightRaw) {
        if (parseWeightKg(weightRaw) === null) return fail('Gewicht nicht lesbar – z. B. „42 KG“ oder „0,700 KG“.');
        grossWeight = /KG/i.test(weightRaw) ? weightRaw.toUpperCase() : `${weightRaw} KG`;
    }
    const shipments = loadShipments();
    const shipment = shipments[base];
    const items = shipment && Array.isArray(shipment.scannedItems) ? shipment.scannedItems : [];
    const item = items.find(i => i && i.id === itemId);
    if (!item) { closeHuEditModal(); displayError('Stück nicht mehr gefunden – Ansicht wurde aktualisiert.'); displayCurrentShipmentDetails(base); return; }
    item.packaging = packaging || null;
    item.dimensions = dimensions || null;
    item.grossWeight = grossWeight;
    // Wareneingang desselben Platzes trägt die Angaben nicht doppelt (Gewicht zählt sonst zweimal)
    const partner = partnerId ? items.find(i => i && i.id === partnerId) : null;
    if (partner && (partner.packaging || partner.dimensions || partner.grossWeight)) { partner.packaging = null; partner.dimensions = null; partner.grossWeight = null; }
    shipment.lastModified = new Date().toISOString();
    saveShipments(shipments);
    closeHuEditModal();
    renderTable();
    displayCurrentShipmentDetails(base);
    displayError('Stück gespeichert.', 'green', 2500);
}
// Nächste freie Position eines HU-Auftrags (höchste vorhandene + 1; Stornos zählen mit, damit keine Nummer doppelt vergeben wird)
function nextHuPosition(shipment) {
    const items = Array.isArray(shipment.scannedItems) ? shipment.scannedItems : [];
    let max = 0, any = false;
    items.forEach(i => { const n = Number(i && i.position); if (Number.isFinite(n) && n > 0) { any = true; if (n > max) max = n; } });
    return any ? max + 1 : (items.length ? null : 1);
}
// „+ Packstück“: mehrere HUs auf einmal zu einem HU-Auftrag aufnehmen – eigenes, breites Modal mit Zeilentabelle.
// Enter/Tab in der HU-Spalte springt zur nächsten Zeile (neue Zeile wird automatisch angehängt) – so lässt sich eine
// HU nach der anderen scannen. Gespeichert wird einmal am Ende: jede gefüllte Zeile wird als Platz „Anstehend“
// angelegt (wie beim Import), Positionen fortlaufend ab der höchsten vorhandenen, Kolli steigt um die Anzahl.
const HU_ADD_MIN_ROWS = 3;
// VW-Auftrag (Positionen tragen eine Sendungs-Nr.): Spalten VSE · Sendungs-Nr. statt Pos. · HU-Nummer – wie die Tabelle
// der bisherigen Packstücke rechts daneben. Die Sendungs-Nr. ist optional und startet leer (keine Vorbelegung).
function huAddIsVvl() { return document.getElementById('huAddRows').dataset.vvl === '1'; }
function huAddRowHtml(pos) {
    const vvl = huAddIsVvl();
    return `<tr class="hu-add-row">`
        + (vvl ? '' : `<td class="hu-add-pos"><span class="hu-add-pos-no">${pos ? pos + '.' : ''}</span></td>`)
        + `<td><input type="text" class="hu-add-hu" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="${vvl ? 'VSE eintippen oder scannen' : 'eintippen oder scannen'}"></td>`
        + (vvl ? `<td class="hu-add-sendnr-cell"><input type="text" class="hu-add-sendnr" autocomplete="off" inputmode="numeric" spellcheck="false" placeholder="optional"></td>` : '')
        + `<td><input type="text" class="hu-add-pack" autocomplete="off" placeholder="optional"></td>`
        + `<td><input type="text" class="hu-add-dim" autocomplete="off" placeholder="optional"></td>`
        + `<td class="hu-add-kg"><input type="text" class="hu-add-weight" autocomplete="off" inputmode="decimal" placeholder="optional"></td>`
        + `<td class="hu-add-x"><button type="button" class="hu-add-remove" title="Zeile leeren" aria-label="Zeile leeren">×</button></td>`
        + `</tr>`;
}
function huAddRenumber() {
    const tbody = document.getElementById('huAddRows');
    const start = Number(tbody.dataset.startPos) || 0;
    Array.from(tbody.rows).forEach((tr, i) => { const no = tr.querySelector('.hu-add-pos-no'); if (no) no.textContent = start ? (start + i) + '.' : ''; });
}
function huAddAppendRow() {
    const tbody = document.getElementById('huAddRows');
    tbody.insertAdjacentHTML('beforeend', huAddRowHtml(0));
    huAddRenumber();
    return tbody.rows[tbody.rows.length - 1];
}
function huAddEnsureTrailingEmptyRow() {
    const tbody = document.getElementById('huAddRows');
    const last = tbody.rows[tbody.rows.length - 1];
    if (!last || last.querySelector('.hu-add-hu').value.trim()) huAddAppendRow();
}
// Live-Prüfung der HU-Nummern: doppelt in der Liste / schon in einem Auftrag → Zeile rot, Hinweis im Titel der Zelle
function huAddValidateRows() {
    const tbody = document.getElementById('huAddRows');
    const base = document.getElementById('huAddBaseNumber').value;
    const shipments = loadShipments();
    const seen = {};
    let problems = 0;
    Array.from(tbody.rows).forEach(tr => {
        const input = tr.querySelector('.hu-add-hu');
        const hu = input.value.trim().toUpperCase().replace(/\s+/g, '');
        let msg = '';
        if (hu) {
            if (!/^[0-9A-Z-]+$/.test(hu)) msg = 'Nur Ziffern, Großbuchstaben und Bindestrich';
            else if (seen[hu]) msg = 'Doppelt in dieser Liste';
            else {
                for (const b in shipments) {
                    const other = shipments[b];
                    if (!other || !other.isHuListOrder) continue;
                    if (huItemsOf(other, hu).length) { msg = `Gibt es bereits${b === base ? ' in diesem Auftrag' : ` im Auftrag ${b}`}`; break; }
                }
                if (!msg && (shipments[hu] || isArchivedBase(hu))) msg = 'Ist bereits als eigene Sendung erfasst';
            }
            seen[hu] = true;
        }
        tr.classList.toggle('hu-add-row-bad', !!msg);
        input.title = msg;
        if (msg) problems++;
    });
    return problems;
}
function openHuAddModal(base) {
    const modal = document.getElementById('huAddModal');
    if (!modal) return;
    const shipment = loadShipments()[base];
    if (!shipment) { displayError(`Auftrag ${escapeHtml(base)} nicht gefunden.`); return; }
    if (!shipment.isHuListOrder) { displayError(`${escapeHtml(base)} ist eine normale Sendung – Packstücke gibt es nur bei HU-Aufträgen.`); return; }
    const pos = nextHuPosition(shipment);
    const expected = expectedPiecesOf(shipment);
    document.getElementById('huAddBaseNumber').value = base;
    const tbody = document.getElementById('huAddRows');
    const items = Array.isArray(shipment.scannedItems) ? shipment.scannedItems : [];
    const isVvl = !!shipment.parentOrderNumber || items.some(i => i && i.sendnr);
    tbody.dataset.vvl = isVvl ? '1' : '';
    tbody.dataset.startPos = pos === null ? '' : String(pos);
    // Kopfzeile passend zum Auftrag: VW = VSE · Sendungs-Nr. (ohne Pos.), sonst Pos. · HU-Nummer
    const thead = tbody.parentElement.tHead;
    if (thead) thead.innerHTML = `<tr>${isVvl ? '<th>VSE</th><th class="hu-add-sendnr-cell">Sendungs-Nr.</th>' : '<th class="hu-add-pos">Pos.</th><th>HU-Nummer</th>'}<th>Verpackung</th><th>Maße</th><th class="hu-add-kg">Gewicht</th><th class="hu-add-x"></th></tr>`;
    tbody.parentElement.classList.toggle('hu-add-table-vvl', isVvl);
    tbody.innerHTML = '';
    for (let i = 0; i < HU_ADD_MIN_ROWS; i++) huAddAppendRow();
    const what = isVvl ? 'Kundennr' : (shipment.freightForwarder && shipment.destinationCountry ? 'Rechnung' : 'Auftrag');
    document.getElementById('huAddContext').textContent = `${what} ${base}` + (isVvl && shipment.parentOrderNumber ? ` · VVL ${shipment.parentOrderNumber}` : '') + (pos === null ? '' : ` · ab Position ${pos}`) + (expected !== null ? ` · bisher ${pluralize(expected, 'Packstück', 'Packstücke')}` : '');
    // Rechts daneben: was der Auftrag schon hat – dieselbe Tabelle wie in den Sendungsdetails, nur lesend (kein Stift, kein „+“)
    const existing = document.getElementById('huAddExisting');
    if (existing) existing.innerHTML = (buildDetailPackTable(shipment, true, base) || '').replace('<h4>Packstücke (', '<h4>Bisherige Packstücke (') || '<div class="hu-add-empty">Noch keine Packstücke in diesem Auftrag.</div>';
    if (existing) applyPackTableSort(existing.querySelector('.pack-table'));
    huAddUpdateCount();
    const err = document.getElementById('huAddError'); err.textContent = ''; err.classList.add('hidden');
    modal.classList.add('visible');
    modal.scrollTop = 0;
    document.body.classList.add('modal-open');
    setTimeout(() => { const f = tbody.querySelector('.hu-add-hu'); if (f) f.focus(); }, 50);
}
// Zähler in der Kopfzeile der Eingabetabelle („3 eingetragen“) – reine Anzeige
function huAddUpdateCount() {
    const el = document.getElementById('huAddCount'); if (!el) return;
    const n = Array.from(document.getElementById('huAddRows').rows).filter(tr => tr.querySelector('.hu-add-hu').value.trim()).length;
    el.textContent = n ? `${n} eingetragen` : 'noch nichts eingetragen';
}
function closeHuAddModal() {
    const modal = document.getElementById('huAddModal');
    if (modal) modal.classList.remove('visible');
    const existing = document.getElementById('huAddExisting'); if (existing) existing.innerHTML = '';   // Lese-Kopie der Packstücke nicht im DOM stehen lassen
    document.body.classList.remove('modal-open');
    focusShipmentInput();
}
function saveHuAddFromModal() {
    const base = document.getElementById('huAddBaseNumber').value;
    const err = document.getElementById('huAddError');
    const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };
    const tbody = document.getElementById('huAddRows');
    const isVvl = huAddIsVvl();
    const label = isVvl ? 'VSE' : 'HU-Nummer';
    const rows = Array.from(tbody.rows).map(tr => ({
        hu: tr.querySelector('.hu-add-hu').value.trim().toUpperCase().replace(/\s+/g, ''),
        sendnr: isVvl ? tr.querySelector('.hu-add-sendnr').value.trim().replace(/\s+/g, '') : '',
        packaging: tr.querySelector('.hu-add-pack').value.trim(),
        dimensions: tr.querySelector('.hu-add-dim').value.trim(),
        weightRaw: tr.querySelector('.hu-add-weight').value.trim()
    })).filter(r => r.hu || r.sendnr || r.packaging || r.dimensions || r.weightRaw);
    if (!rows.length) return fail(`Bitte mindestens eine ${label} eingeben (oder scannen).`);
    const noHu = rows.find(r => !r.hu);
    if (noHu) return fail(`Eine Zeile hat Angaben, aber keine ${label}.`);
    if (isVvl) {   // Sendungs-Nr. ist optional – wenn angegeben, nur Ziffern/Buchstaben/Bindestrich
        const badSn = rows.find(r => r.sendnr && !/^[0-9A-Z-]+$/i.test(r.sendnr));
        if (badSn) return fail(`Sendungs-Nr. „${badSn.sendnr}“ nicht lesbar – nur Ziffern, Buchstaben und Bindestrich.`);
    }
    if (huAddValidateRows()) return fail(`Bitte die rot markierten ${isVvl ? 'VSE-Nummern' : 'HU-Nummern'} korrigieren (doppelt oder bereits vergeben).`);
    for (const r of rows) {
        if (r.weightRaw) {
            if (parseWeightKg(r.weightRaw) === null) return fail(`Gewicht bei HU ${r.hu} nicht lesbar – z. B. „42 KG“ oder „0,700 KG“.`);
            r.grossWeight = /KG/i.test(r.weightRaw) ? r.weightRaw.toUpperCase() : `${r.weightRaw} KG`;
        } else r.grossWeight = null;
    }
    const shipments = loadShipments();
    const shipment = shipments[base];
    if (!shipment || !shipment.isHuListOrder) { closeHuAddModal(); displayError(`Auftrag ${escapeHtml(base)} nicht mehr gefunden.`); return; }
    const now = new Date().toISOString();
    let position = nextHuPosition(shipment); // erneut bestimmen – seit dem Öffnen kann ein Sync etwas ergänzt haben
    rows.forEach((r, i) => {
        const item = {
            rawInput: r.hu, status: 'Anstehend', timestamp: new Date(Date.parse(now) + i).toISOString(), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null,
            position: position === null ? null : position + i, packaging: r.packaging || null, dimensions: r.dimensions || null, grossWeight: r.grossWeight
        };
        if (r.sendnr) item.sendnr = r.sendnr;   // VW: Sendungs-Nr. wie beim Import an der Position
        shipment.scannedItems.push(item);
    });
    const expected = expectedPiecesOf(shipment);
    shipment.totalPiecesExpected = (expected === null ? 0 : expected) + rows.length;
    shipment.lastModified = now;
    saveShipments(shipments);
    closeHuAddModal();
    renderTable();
    displayCurrentShipmentDetails(base);
    displayError(`${pluralize(rows.length, 'Packstück', 'Packstücke')} zu ${escapeHtml(base)} hinzugefügt${position ? ` (Pos. ${position}${rows.length > 1 ? `–${position + rows.length - 1}` : ''})` : ''}.`, 'green', 3000);
}
// Auswahl in der Packstücktabelle: Leiste ein-/ausblenden, Zähler und „Alle“-Kästchen nachführen (reine Anzeige)
function updatePackSelectionBar() {
    const bar = currentDetailsDivEl ? currentDetailsDivEl.querySelector('.pack-select-bar') : null;
    if (!bar) return;
    const boxes = Array.from(currentDetailsDivEl.querySelectorAll('.pack-select:not(:disabled)'));
    const checked = boxes.filter(cb => cb.checked);
    const n = checked.length, open = checked.filter(cb => cb.dataset.state === 'open').length, secured = n - open;
    bar.classList.toggle('hidden', n === 0);
    const parts = []; if (open) parts.push(`${open} offen`); if (secured) parts.push(`${secured} gesichert`);
    bar.querySelector('.pack-select-count').textContent = `${n} ausgewählt` + (n && parts.length ? ` (${parts.join(' · ')})` : '');
    bar.querySelector('.pack-select-group-apply').classList.toggle('hidden', open === 0);     // Kontrollmethode nur für offene
    bar.querySelector('.pack-select-group-cancel').classList.toggle('hidden', secured === 0); // Storno nur für gesicherte
    syncPackSelectCombo(bar);
    const all = currentDetailsDivEl.querySelector('.pack-select-all');
    if (all) { all.checked = boxes.length > 0 && n === boxes.length; all.indeterminate = n > 0 && n < boxes.length; }
}
// Häkchen „Kombi“ in der Leiste nur bei Kontrollmethoden mit Kombi-Sicherung (XRY, VCK) – sonst verborgen und abgewählt
function syncPackSelectCombo(bar) {
    const wrap = bar ? bar.querySelector('.pack-select-combo-wrap') : null;
    if (!wrap) return;
    const canCombo = KOMBI_CAPABLE_STATUSES.includes(bar.querySelector('.pack-select-status').value);
    wrap.classList.toggle('hidden', !canCombo);
    if (!canCombo) wrap.querySelector('.pack-select-combo').checked = false;
}
// Gewählte Kontrollmethode für alle angehakten Packstücke verbuchen – je HU exakt wie ein Scan über das Eingabefeld
// (processAndSaveSingleScan: Anstehend → Status, automatischer Wareneingang, Limits, Sync). Keine eigene Buchungslogik.
function applyStatusToSelectedPacks(bar) {
    if (!bar) return;
    const base = bar.dataset.basenumber;
    const status = bar.querySelector('.pack-select-status').value;
    const comboEl = bar.querySelector('.pack-select-combo');
    // Kombi-Sicherung (nur XRY/VCK): gleiches Flag wie das Häkchen im Scan-Feld → Eintrag „<Status> (Kombi)“, Packstück bleibt offen
    const isCombo = !!(comboEl && comboEl.checked && KOMBI_CAPABLE_STATUSES.includes(status));
    const label = `${status}${isCombo ? ' (Kombi)' : ''}`;
    const hus = Array.from(currentDetailsDivEl.querySelectorAll('.pack-select:checked:not(:disabled)')).filter(cb => cb.dataset.state === 'open').map(cb => cb.dataset.hu);
    if (!hus.length) { displayError('Bitte zuerst offene Packstücke auswählen.'); return; }
    if (!confirm(`${label} für ${pluralize(hus.length, 'Packstück', 'Packstücke')} eintragen?${isCombo ? '\n\nKombi-Sicherung: zusätzliche Kontrolle – die Packstücke bleiben für die finale Sicherung offen.' : ''}\n\n${hus.join(', ')}`)) return;
    const done = [], failed = [];
    hus.forEach(hu => {
        const r = processAndSaveSingleScan(hu, status, isCombo);
        if (r && r.success) done.push(hu); else failed.push(`${hu}: ${(r && r.message) || 'unbekannter Fehler'}`);
    });
    resetSingleScanNoteInputState();
    renderTable();
    displayCurrentShipmentDetails(base);
    if (done.length) displayError(`${label} für ${pluralize(done.length, 'Packstück', 'Packstücke')} eingetragen.`, 'green', 2500);
    if (failed.length) displayError(`Nicht übernommen – ${failed.join(' · ')}`.replace(/<[^>]+>/g, ''), 'orange');
}
// Storno für die Auswahl: je gesichertem Packstück wird der Sicherungs-Eintrag storniert – über dieselbe Funktion wie der
// Storno-Knopf in der Zeitleiste (Eintrag bleibt als „storniert“ sichtbar, die HU bekommt wieder einen offenen Platz).
function cancelSelectedPacks(bar) {
    if (!bar) return;
    const base = bar.dataset.basenumber;
    const picks = Array.from(currentDetailsDivEl.querySelectorAll('.pack-select:checked:not(:disabled)')).filter(cb => cb.dataset.state === 'secured' && cb.dataset.timestamp).map(cb => ({ hu: cb.dataset.hu, ts: cb.dataset.timestamp }));
    if (!picks.length) { displayError('Bitte zuerst gesicherte Packstücke auswählen.'); return; }
    if (!confirm(`Sicherung von ${pluralize(picks.length, 'Packstück', 'Packstücken')} stornieren?\n\n${picks.map(p => p.hu).join(', ')}\n\nDie Packstücke sind danach wieder offen; die Einträge bleiben als „storniert“ in der Zeitleiste.`)) return;
    picks.forEach(p => cancelScanItem(base, p.ts));   // zeichnet die Details je Aufruf neu und speichert
    renderTable();
    displayCurrentShipmentDetails(base);
    displayError(`${pluralize(picks.length, 'Sicherung', 'Sicherungen')} storniert – ${picks.map(p => p.hu).join(', ')} wieder offen.`, 'green', 3000);
}
function closeHuEditModal() {
    const modal = document.getElementById('huEditModal');
    if (modal) { modal.classList.remove('visible'); modal.classList.remove('piece-mode'); modal.querySelector('h3').textContent = 'Packstück bearbeiten'; }
    document.body.classList.remove('modal-open');
    focusShipmentInput();
}
// ---- „+ Auftrag“ (LKW-Seite, Desktop): weiteren Auftrag/Rechnung zu einem MAN-LKW aufnehmen ------------------------
// Legt den Auftrag genauso an wie der Multi-Import (isHuListOrder, truckId/originalManNumber des LKW, Spediteur/Land/PLSO)
// mit dem ersten Packstück als Platz „Anstehend“ (Pos. 1). Weitere HUs kommen über „+ Packstück“ in der Detailansicht.
function openOrderAddModal(truckId) {
    const modal = document.getElementById('orderAddModal');
    if (!modal) return;
    const shipments = loadShipments();
    const onTruck = Object.values(shipments).filter(s => s && s.truckId === truckId);
    if (!onTruck.length) { displayError(`LKW ${escapeHtml(truckId)} nicht gefunden.`); return; }
    document.getElementById('orderAddTruckId').value = truckId;
    // Alle Felder leer – Spediteur/Land werden je Rechnung eingegeben (keine Vorbelegung vom LKW)
    ['orderAddNumber', 'orderAddForwarder', 'orderAddCountry', 'orderAddPlso', 'orderAddHu', 'orderAddPackaging', 'orderAddDimensions', 'orderAddWeight'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('orderAddContext').textContent = `${truckShortName(truckId)} · ${pluralize(onTruck.length, 'Auftrag', 'Aufträge')} bisher`;
    const err = document.getElementById('orderAddError'); err.textContent = ''; err.classList.add('hidden');
    modal.classList.add('visible');
    document.body.classList.add('modal-open');
    setTimeout(() => document.getElementById('orderAddNumber').focus(), 50);
}
function closeOrderAddModal() {
    const modal = document.getElementById('orderAddModal');
    if (modal) modal.classList.remove('visible');
    document.body.classList.remove('modal-open');
    focusShipmentInput();
}
function saveOrderAddFromModal() {
    const truckId = document.getElementById('orderAddTruckId').value;
    const number = document.getElementById('orderAddNumber').value.trim().toUpperCase().replace(/\s+/g, '');
    const forwarder = document.getElementById('orderAddForwarder').value.trim();
    const country = document.getElementById('orderAddCountry').value.trim().toUpperCase();
    const plso = document.getElementById('orderAddPlso').value.trim();
    const hu = document.getElementById('orderAddHu').value.trim().toUpperCase().replace(/\s+/g, '');
    const packaging = document.getElementById('orderAddPackaging').value.trim();
    const dimensions = document.getElementById('orderAddDimensions').value.trim();
    const weightRaw = document.getElementById('orderAddWeight').value.trim();
    const err = document.getElementById('orderAddError');
    const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };

    if (!number) return fail('Bitte die Rechnungsnummer eingeben.');
    if (!/^[0-9A-Z-]+$/.test(number)) return fail('Rechnungsnummer darf nur Ziffern, Großbuchstaben und Bindestrich enthalten.');
    if (!forwarder) return fail('Bitte den Spediteur eingeben.');
    if (!country) return fail('Bitte das Land eingeben.');
    if (!hu) return fail('Bitte die erste HU-Nummer eingeben (oder scannen).');
    if (!/^[0-9A-Z-]+$/.test(hu)) return fail('HU-Nummer darf nur Ziffern, Großbuchstaben und Bindestrich enthalten.');
    if (hu === number) return fail('HU-Nummer und Rechnungsnummer dürfen nicht gleich sein.');
    let grossWeight = null;
    if (weightRaw) {
        if (parseWeightKg(weightRaw) === null) return fail('Gewicht nicht lesbar – z. B. „42 KG“ oder „0,700 KG“.');
        grossWeight = /KG/i.test(weightRaw) ? weightRaw.toUpperCase() : `${weightRaw} KG`;
    }

    const shipments = loadShipments();
    if (shipments[number]) return fail(`${number} gibt es bereits${shipments[number].truckId ? ` (${truckShortName(shipments[number].truckId)})` : ''}.`);
    if (isArchivedBase(number)) return fail(`${number} liegt im Archiv – bitte zuerst über die Suche wiederherstellen.`);
    for (const b in shipments) {
        const other = shipments[b];
        if (!other || !other.isHuListOrder) continue;
        if (huItemsOf(other, hu).length) return fail(`HU ${hu} gibt es bereits im Auftrag ${b}.`);
    }
    if (shipments[hu] || isArchivedBase(hu)) return fail(`${hu} ist bereits als eigene Sendung erfasst.`);
    const onTruck = Object.values(shipments).filter(s => s && s.truckId === truckId);
    if (!onTruck.length) { closeOrderAddModal(); displayError(`LKW ${escapeHtml(truckId)} nicht mehr gefunden.`); return; }
    const sample = onTruck.find(s => typeof s.originalManNumber === 'number') || onTruck[0];

    const now = new Date().toISOString();
    const newShipment = {
        hawb: number, lastModified: now, totalPiecesExpected: 1,
        scannedItems: [], mitarbeiter: MITARBEITER_NAME, isHuListOrder: true,
        truckId: truckId,
        freightForwarder: forwarder, destinationCountry: country
    };
    if (typeof sample.originalManNumber === 'number') newShipment.originalManNumber = sample.originalManNumber;
    if (plso) newShipment.plsoNumber = plso;
    newShipment.scannedItems.push({
        rawInput: hu, status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null,
        position: 1, packaging: packaging || null, dimensions: dimensions || null, grossWeight: grossWeight
    });
    shipments[number] = newShipment;
    saveShipments(shipments);
    closeOrderAddModal();
    renderTable();
    if (currentPage && currentPage.id === 'lkw') renderCurrentPage(true);
    displayError(`Auftrag ${escapeHtml(number)} mit HU ${escapeHtml(hu)} auf ${escapeHtml(truckShortName(truckId))} angelegt.`, 'green', 3000);
    showDetailView(number); // direkt weiter: dort „+ Packstück“ für die übrigen HUs
}
function saveHuEditFromModal() {
    if (document.getElementById('huEditModal').classList.contains('piece-mode')) return savePieceEditFromModal();
    const base = document.getElementById('huEditBaseNumber').value;
    const oldHu = document.getElementById('huEditOriginalHu').value;
    const newHu = document.getElementById('huEditNumber').value.trim().toUpperCase().replace(/\s+/g, '');
    const packaging = document.getElementById('huEditPackaging').value.trim();
    const dimensions = document.getElementById('huEditDimensions').value.trim();
    const weightRaw = document.getElementById('huEditWeight').value.trim();
    const err = document.getElementById('huEditError');
    const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };

    if (!newHu) return fail('Bitte eine HU-Nummer eingeben.');
    if (!/^[0-9A-Z-]+$/.test(newHu)) return fail('HU-Nummer darf nur Ziffern, Großbuchstaben und Bindestrich enthalten.');
    let grossWeight = null;
    if (weightRaw) {
        if (parseWeightKg(weightRaw) === null) return fail('Gewicht nicht lesbar – z. B. „42 KG“ oder „0,700 KG“.');
        grossWeight = /KG/i.test(weightRaw) ? weightRaw.toUpperCase() : `${weightRaw} KG`;
    }

    const shipments = loadShipments();
    const shipment = shipments[base];
    if (!shipment) { closeHuEditModal(); displayError(`Sendung ${escapeHtml(base)} nicht mehr gefunden.`); return; }
    const items = huItemsOf(shipment, oldHu);
    if (!items.length) { closeHuEditModal(); displayError(`Packstück ${escapeHtml(oldHu)} nicht mehr gefunden.`); return; }

    const renamed = newHu !== String(oldHu).toUpperCase();
    if (renamed) {
        // Neue Nummer darf in keinem Auftrag (auch nicht in diesem) schon vergeben sein
        for (const b in shipments) {
            const other = shipments[b];
            if (!other || !other.isHuListOrder) continue;
            if (huItemsOf(other, newHu).length) return fail(`HU ${newHu} gibt es bereits${b === base ? ' in diesem Auftrag' : ` im Auftrag ${b}`}.`);
        }
        const scans = items.filter(i => i.status !== 'Anstehend' && !i.isCancelled).length;
        if (scans && !confirm(`HU ${oldHu} → ${newHu}\n\n${pluralize(scans, 'Scan wird', 'Scans werden')} mit umbenannt. Fortfahren?`)) return;
    }

    const now = new Date().toISOString();
    items.forEach(i => {
        if (renamed) i.rawInput = newHu;
        i.packaging = packaging || null;
        i.dimensions = dimensions || null;
        i.grossWeight = grossWeight;
    });
    shipment.lastModified = now;
    saveShipments(shipments);
    closeHuEditModal();
    renderTable();
    displayCurrentShipmentDetails(base);
    displayError(`Packstück ${escapeHtml(renamed ? `${oldHu} → ${newHu}` : newHu)} gespeichert.`, 'green', 2500);
}

function displayCurrentShipmentDetails(baseNumberToDisplay) {
    clearError();
    removeActiveInlineNoteEditor();

    // Die Sendungsdetails werden ausschließlich im Container der Detailansicht
    // (#detailView → #currentShipmentDetails) gerendert. Die Hauptansicht zeigt
    // Startseite (Kacheln) bzw. Unterseite und die Liste.
    const displayTarget = currentDetailsDivEl;

    if (!displayTarget) {
        console.error("Fehler: Konnte kein Anzeige-Element f\u00FCr Details finden. Stellen Sie sicher, dass die HTML-Struktur korrekt ist.");
        return;
    }

    const shipments = loadShipments();
    // Archiv-Sendung (aus den Archiv-Treffern geöffnet): nur lesen – kein Storno, keine Notizen. Erst „Wiederherstellen“
    // (oder ein Scan darauf) macht sie wieder zur normalen, bearbeitbaren Sendung.
    const archivedView = !!(baseNumberToDisplay && !shipments[baseNumberToDisplay] && detailArchived && detailArchived.base === baseNumberToDisplay);
    const shipment = baseNumberToDisplay ? (shipments[baseNumberToDisplay] || (archivedView ? detailArchived.shipment : null)) : null;
    if (!archivedView) detailArchived = null;

    if (!baseNumberToDisplay || !shipment) {
        displayTarget.innerHTML = 'Geben Sie eine Sendungsnummer ein oder wählen Sie eine aus der Liste.';
        displayTarget.style.borderColor = '#aac';
        return;
    }
    
    // Ab hier ist der Code identisch zur Originalfunktion, aber alle
    // Änderungen werden auf die `displayTarget` Variable angewendet.

    let detailsHtml = '';

    // Desktop (≥ 992 px): Kopfzeile wie in einem Arbeitsplatz-System – Pfad (Startseite › Anlieferung › LKW › Nummer),
    // Kennzahlen, dieselben Aktionen wie in der Liste (Bearbeiten · PDF · Löschen) und der QR-Code.
    // Reine Darstellung: die Knöpfe tragen dieselben Klassen/data-Attribute wie die Listen-Icons und rufen dieselben Funktionen.
    // Auf dem Handy wird nichts davon erzeugt.
    if (isDesktopLayout()) detailsHtml += buildDetailHead(baseNumberToDisplay, shipment, archivedView);

    if (archivedView) {
        detailsHtml += `<div class="archive-banner"><span class="archive-badge">Archiv</span><span>Abgeschlossen und archiviert – nur lesen.</span>`
            + `<button type="button" id="detailRestoreBtn" class="restore-btn" data-basenumber="${escapeHtml(baseNumberToDisplay)}">Wiederherstellen</button></div>`;
    }

    if (shipment.parentOrderNumber) {
        detailsHtml += `<div class="detail-meta detail-meta-strong">VVL: ${escapeHtml(shipment.parentOrderNumber)}</div>`;
    }

    const isManOrder = shipment.freightForwarder && shipment.destinationCountry;
    
    if (shipment.isHuListOrder) {
        const titlePrefix = isManOrder ? 'Rechnung: ' : 'Kundennr: ';
        detailsHtml += `<strong>${titlePrefix}${escapeHtml(baseNumberToDisplay)}</strong>`;
        if (shipment.plsoNumber && shipment.plsoNumber !== 'N/A') {
            detailsHtml += `<div class="detail-meta">PLSO: ${escapeHtml(shipment.plsoNumber)}</div>`;
        }
        if (isManOrder) {
            const shortForwarderName = shortenForwarderName(shipment.freightForwarder);
            detailsHtml += `<div class="detail-meta">Sped.: ${escapeHtml(shortForwarderName)} / Land: ${escapeHtml(shipment.destinationCountry)}</div>`;
        }
        detailsHtml += `<hr class="detail-divider">`;
    } else {
        // --- START DER ÄNDERUNG ---
        // ID, data-Attribut und Titel für die Kopierfunktion hinzugefügt.
        // Der style-Tag sorgt für einen "Klick"-Cursor.
        detailsHtml += `<strong id="shipmentDetailTitle" 
                                style="cursor:pointer;" 
                                title="Klicken, um '${escapeHtml(baseNumberToDisplay)}' zu kopieren" 
                                data-hawb="${escapeHtml(baseNumberToDisplay)}">${escapeHtml(baseNumberToDisplay)}</strong>`;
        // --- ENDE DER ÄNDERUNG ---
    }

    // Desktop: alle Packstücke als Tabelle (Pos. · HU · Verpackung · Maße · Gewicht · Status · Zeit · Notiz) statt des
    // gelben Kastens mit den offenen Positionen – die Scan-Zeitleiste darunter bleibt unverändert.
    const desktopPackTable = shipment.isHuListOrder && isDesktopLayout();
    if (desktopPackTable) detailsHtml += buildDetailPackTable(shipment, archivedView, baseNumberToDisplay);
    // Normale Sendung (ohne HU-Liste): Scans als Tabelle – ein Platz je erwartetem Stück
    else if (isDesktopLayout()) detailsHtml += buildDetailScanTable(shipment, baseNumberToDisplay, archivedView);

    if (shipment.isHuListOrder && !desktopPackTable) {
        const securityClearanceStatuses = EXCLUSIVE_SECURITY_STATUSES;
        const manifestSlots = shipment.scannedItems.filter(item => 
            item.status === 'Anstehend' || securityClearanceStatuses.includes(item.status)
        );
        const pendingHuNumbers = manifestSlots.filter(item => item.status === 'Anstehend');
        
        if (pendingHuNumbers.length > 0) {
            const totalHus = manifestSlots.length;
            const listClass = (totalHus - pendingHuNumbers.length > 0) ? 'partial' : '';
            detailsHtml += `<div id="pendingHuList" class="${listClass}">`;
            detailsHtml += `<h4>Offene Positionen (${pendingHuNumbers.length} von ${totalHus}):</h4>`;
            
            const isVvlList = pendingHuNumbers.some(item => item.sendnr);
            if (isVvlList) {
                detailsHtml += `<div class="pending-list-header"><span>VSE-Nummer</span><span>Sendungs-Nr.</span></div>`;
            }

            const listItemsHtml = pendingHuNumbers.sort((a,b) => (a.position || 9999) - (b.position || 9999)).map(item => {
                const positionHtml = isManOrder && item.position ? `<span class="position-number">${item.position}.</span>` : `<span class="position-number"></span>`;
                let itemContentHtml = '';
                if (item.sendnr) {
                    itemContentHtml = `
                        <div class="pending-item-details">
                            <span class="pending-vse hu-value" style="cursor:pointer;" title="Klicken zum Kopieren">${escapeHtml(item.rawInput)}</span>
                            <span class="pending-sendnr">${escapeHtml(item.sendnr)}</span>
                        </div>
                    `;
                } else {
                    itemContentHtml = `<span class="hu-value">${escapeHtml(item.rawInput)}</span>`;
                }
                return `<li>${positionHtml}${itemContentHtml}</li>`;
            }).join('');
            
            detailsHtml += `<ul class="hu-list">${listItemsHtml}</ul>`;
            detailsHtml += `</div>`;
        }
    }
    
    // Zusammenfassung steht oben – das Wichtigste zuerst.
    const expected = shipment.totalPiecesExpected;
    const securityScansCount = calculateCurrentCountedPieces(shipment.scannedItems || []);
    const receiptScansCount = calculateGoodsReceiptCount(shipment.scannedItems || []);
    {
        const expectedText = (expected !== null && expected !== undefined) ? `${expected}` : 'N/A';
        const receiptClass = getStatusClass(receiptScansCount, expected);
        const securityClass = getStatusClass(securityScansCount, expected);
        detailsHtml += `<div class="summary">`;
        detailsHtml += `<span>Wareneingang<span class="${receiptClass}">${receiptScansCount}<small>/${expectedText}</small></span></span>`;
        detailsHtml += `<span>Sicherung<span class="${securityClass}">${securityScansCount}<small>/${expectedText}</small></span></span>`;
        detailsHtml += `</div>`;
    }

    const todayStr = new Date().toLocaleDateString('de-DE');
    detailsHtml += `<ul>`;
    // Neueste Scans zuerst – am Scanner will man sehen, was man gerade gemacht hat.
    (shipment.scannedItems || []).filter(item => item.status !== 'Anstehend').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).forEach(item => {
        const dt = new Date(item.timestamp);
        const timeStr = dt.toLocaleTimeString('de-DE');
        const dateStr = dt.toLocaleDateString('de-DE');
        const isCancelled = item.isCancelled;
        detailsHtml += `<li class="${isCancelled ? 'cancelled-item' : ''}">`;
        detailsHtml += `<div class="scan-main-info">`;
        // Datum nur anzeigen, wenn es nicht heute ist
        detailsHtml += `<span class="timestamp">${dateStr === todayStr ? timeStr : dateStr + ' ' + timeStr}</span> `;
//... innerhalb der Funktion displayCurrentShipmentDetails ...
let numberPart = isManOrder && item.position ? `<span class="position-number">${item.position}.</span> ` : '';
let sendnrHtml = item.sendnr ? `<span class="sendnr-display"> (${escapeHtml(item.sendnr)})</span>` : '';
// --- START DER ÄNDERUNG ---
// Cursor und Titel hinzugefügt, um Klickbarkeit zu signalisieren
detailsHtml += `${numberPart}<span class="hu-value" style="cursor:pointer;" title="Klicken zum Kopieren">${escapeHtml(item.rawInput)}</span>${sendnrHtml} \u2192 <span class="status">${escapeHtml(item.status)}</span>${item.isCombination ? ` <span class="combo">(Kombi)</span>` : ''}`;
// --- ENDE DER ÄNDERUNG ---
//...
        if (isCancelled) {
            const cancelDt = item.cancelledTimestamp ? new Date(item.cancelledTimestamp) : null;
            detailsHtml += `<span class="cancelled-info"> (storniert am ${cancelDt ? cancelDt.toLocaleString('de-DE') : 'Unbekannt'})</span>`;
        }
        detailsHtml += `</div>`;
        if (!isCancelled && !archivedView) {
            detailsHtml += `<button class="cancel-button" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}">Storno</button>`;
        }
        detailsHtml += `<div class="scan-actions-and-notes">`;
        if (Array.isArray(item.notes) && item.notes.length > 0) {
            let notesListHtml = '<div class="notes-container">';
            item.notes.forEach((note, index) => {
                if (isCancelled) {
                    notesListHtml += `<div class="note-item" style="color:var(--cancelled-color);">- ${escapeHtml(note)}</div>`;
                } else if (archivedView) {
                    // Archiv: Notiz wie gewohnt anzeigen, aber ohne Bearbeiten/Löschen
                    notesListHtml += `<div class="note-item"><span class="note-prefix">Notiz:</span><span class="note-readonly">${escapeHtml(note)}</span></div>`;
                } else {
                    notesListHtml += `<div class="note-item"><span class="note-prefix">Notiz:</span><span class="editable-note" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}" data-note-index="${index}" title="Notiz bearbeiten">${escapeHtml(note)}</span><button class="delete-note-btn" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}" data-note-index="${index}" title="Notiz L\u00F6schen">\u{1F5D1}</button></div>`;
                }
            });
            notesListHtml += '</div>';
            detailsHtml += notesListHtml;
        }
        if (!isCancelled && !archivedView) {
            detailsHtml += `<a href="#" class="add-note-link" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}" title="Weitere Notiz hinzuf\u00FCgen">Notiz hinzuf\u00FCgen</a>`;
        }
        detailsHtml += `<div class="inline-note-editor-placeholder"></div>`;
        detailsHtml += `</div>`;
        detailsHtml += `</li>`;
    });
    detailsHtml += `</ul>`;

    displayTarget.innerHTML = detailsHtml;
    applyPackTableSort(displayTarget.querySelector('.pack-table'));   // gewählte Sortierung der Packstücktabelle beibehalten
    const headQr = displayTarget.querySelector('.detail-qr div[data-qr-text]');
    if (headQr) drawQrCode(headQr);

    if (expected !== null && expected !== undefined) {
        if (receiptScansCount > expected || securityScansCount > expected) displayTarget.style.borderColor = 'red';
        else if (receiptScansCount < expected || securityScansCount < expected) displayTarget.style.borderColor = 'orange';
        else if (receiptScansCount === expected && securityScansCount === expected) displayTarget.style.borderColor = 'green';
        else displayTarget.style.borderColor = '#aac';
    } else {
        displayTarget.style.borderColor = '#aac';
    }
}



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
        event.target.disabled = true;
        try { const r = await postToServer('searchArchive', { query: s.parentOrderNumber, mode: 'vvl' }); Object.assign(pool, r.results || {}); }
        catch (e) { event.target.disabled = false; displayError(`Archiv nicht erreichbar: ${e.message}`, 'red', 5000); return; }
    }
    sendPdfEmailViaBackend(event, pool);
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
            
            row.insertCell().outerHTML = `<td data-label="Letzte Änd." class="time-cell">${shipment.lastModified ? new Date(shipment.lastModified).toLocaleString('de-DE') : '-'}</td>`;
            
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
        toggle.addEventListener('change', async (e) => {
            const status = loadLkwStatus();
            status[e.target.dataset.truckid] = e.target.checked;
            await saveLkwStatus(status);
            renderTable();
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
                        saveShipments(currentShipments);
                        renderTable();
                        renderLkwMenu();
                        displayError('LKW gelöscht.', 'green', 2000);
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
                        
                        saveShipments(currentShipments);
                        renderTable();
                        renderLkwMenu();
                        displayError('LKW umbenannt.', 'green', 2000);
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



// ===================================================================
// STARTSEITE (Kacheln) UND UNTERSEITEN
// Kacheln: Anlieferung (LKW → seine Sendungen), Dunkelalarm, Offene Sendungen, Info (Suche mit Filtern).
// Die Unterseiten sind eigene Vollbild-Ansichten (#pageView) wie die Sendungsdetails – die Hauptansicht ist dabei
// ausgeblendet. Sie liegen im Browser-Verlauf mit eigener Adresse (?seite=anlieferung usw.): Zurück-Geste/-Taste
// schließt sie, Neuladen öffnet sie wieder. Keine getrennten HTML-Dateien: Daten, Sync und Scan-Logik bleiben
// an einer Stelle. Nach jedem Zeichnen der Liste (drawShipmentList) – also nach Scan, Sync, Löschen, Import –
// werden Kacheln und eine offene Seite mit aktualisiert. Tippt man im Scan-Feld, weichen die Kacheln den Treffern.
// ===================================================================
const homeHubEl = document.getElementById('homeHub');
const pageViewEl = document.getElementById('pageView');
const pageTitleEl = document.getElementById('pageTitle');
const pageBadgeEl = document.getElementById('pageBadge');
const pageContentEl = document.getElementById('pageContent');
const pageBackBtnEl = document.getElementById('pageBackBtn');
const listCaptionEl = document.getElementById('listCaption');

const PAGE_LIST_STEP = LIST_PAGE_SIZE;
let currentPage = null;          // { id: 'anlieferung'|'lkw'|'dunkelalarm'|'offen'|'info', truckId }
let pageLimit = PAGE_LIST_STEP;  // wie viele Sendungskarten die offene Seite gerade zeigt
let infoArchiveCache = {};       // base → Sendung (Archiv-Treffer der Info-Suche)
const infoState = { text: '', status: 'all', truck: 'all', period: 'all', dateFrom: '', dateTo: '', weightMin: '', weightMax: '', archive: false,
                    archiveQuery: '', archiveOrder: [], archiveTotal: 0, archiveTruncated: false, archiveBusy: false, archiveNote: '' };
let infoTimer = null, infoArchiveTimer = null, infoArchiveSeq = 0;

// ---- Datenhilfen -------------------------------------------------------
function expectedPiecesOf(s) {
    const raw = s ? s.totalPiecesExpected : null;
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}
// Fortschritt einer Sendung – gleiche Regeln wie Karten und Server-Archiv: HU-Listen-Auftrag offen, solange eine
// Position „Anstehend“ ist; Einzelsendung offen, solange erfasste Stück + Dunkelalarm unter der Stückzahl liegen.
// Ohne Stückzahl (null/0) ist der Abschluss nicht bestimmbar (unknown).
function shipmentProgress(s) {
    const items = Array.isArray(s && s.scannedItems) ? s.scannedItems : [];
    const counted = calculateCurrentCountedPieces(items);
    const dunkel = calculateOpenDunkelalarmCount(items, s); // nur OFFENE Dunkelalarme (erledigt = danach gesichert)
    const we = calculateGoodsReceiptCount(items);
    const expected = expectedPiecesOf(s);
    if (s && s.isHuListOrder) {
        const pending = items.filter(i => i && i.status === 'Anstehend' && !i.isCancelled).length;
        return { counted, dunkel, we, expected, pending, unknown: false, open: pending > 0 };
    }
    if (expected === null || expected <= 0) return { counted, dunkel, we, expected: null, pending: null, unknown: true, open: false };
    const pending = Math.max(0, expected - counted - dunkel);
    return { counted, dunkel, we, expected, pending, unknown: false, open: pending > 0 };
}
// LKW mit Kennzahlen; Bezeichnung und Reihenfolge wie im Seitenmenü (renderLkwMenu)
function collectTrucks(shipments, lkwStatus) {
    const trucks = {};
    const names = refreshTruckNames(shipments);
    let manCount = 1;
    Object.keys(shipments).forEach(base => {
        const s = shipments[base];
        if (!s || !s.truckId) return;
        let t = trucks[s.truckId];
        if (!t) {
            const id = s.truckId;
            let icon = '🚚', name = id;
            if (id.startsWith('VVL-')) { name = 'VW ' + id.replace('VVL-', ''); }
            else if (id === 'MAN-legacy') { icon = '🚛'; name = 'MAN importiert'; }
            else if (id.startsWith('MAN-')) { icon = '🚛'; name = 'MAN ' + (manCount++); }
            else if (id.startsWith('MAN ')) { icon = '🚛'; }
            t = trucks[id] = { truckId: id, icon, name: names[id] || name, defaultName: name, custom: !!names[id], active: lkwStatus[id] !== false, bases: [], hus: 0,
                               counted: 0, dunkel: 0, we: 0, expected: 0, openOrders: 0, unknown: 0, lastModified: 0 };
        }
        const p = shipmentProgress(s);
        t.bases.push(base);
        t.hus += s.isHuListOrder ? (expectedPiecesOf(s) || 0) : 1; // gleiche Zählung wie der Zähler im Menü
        t.counted += p.counted; t.dunkel += p.dunkel; t.we += p.we;
        if (p.expected) t.expected += p.expected;
        if (p.open) t.openOrders++;
        if (p.unknown) t.unknown++;
        const ts = Date.parse(s.lastModified) || 0;
        if (ts > t.lastModified) t.lastModified = ts;
    });
    return Object.values(trucks);
}
function truckLabel(t) { return `${t.icon} ${t.name}`; }
function truckLabelHtml(t) { return `<span class="emoji">${t.icon}</span> ${escapeHtml(t.name)}`; }
function chipClass(count, expected) { return expected > 0 ? getStatusClass(count, expected) : ''; }
function ratioText(count, expected) { return expected > 0 ? `${count}/${expected}` : String(count); }
function pluralize(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

// ---- Kacheln -------------------------------------------------------------
function computeHomeStats() {
    const shipments = loadShipments();
    const lkwStatus = loadLkwStatus();
    const st = { total: 0, open: 0, unknown: 0, dunkel: 0, trucksActive: 0, trucksInactive: 0, archived: archiveKnownBases.size };
    const seen = new Set();
    Object.keys(shipments).forEach(base => {
        const s = shipments[base];
        if (!s) return;
        if (s.truckId && !seen.has(s.truckId)) { seen.add(s.truckId); if (lkwStatus[s.truckId] !== false) st.trucksActive++; else st.trucksInactive++; }
        if (s.truckId && lkwStatus[s.truckId] === false) return; // deaktivierter LKW → wie in der Liste ausgeblendet
        st.total++;
        const p = shipmentProgress(s);
        if (p.open) st.open++;
        if (p.unknown) st.unknown++;
        st.dunkel += p.dunkel;
    });
    return st;
}
function setTileText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setTileCount(id, n) { const el = document.getElementById(id); if (!el) return; el.textContent = n > 99 ? '99+' : String(n); el.classList.toggle('hidden', !(n > 0)); }
function updateHomeTiles() {
    if (!homeHubEl) return;
    const st = computeHomeStats();
    setTileText('tileAnlieferungMeta', st.trucksActive === 0
        ? (st.trucksInactive ? `${st.trucksInactive} deaktiviert` : 'Keine LKW importiert')
        : `${st.trucksActive} aktiv${st.trucksInactive ? ` · ${st.trucksInactive} deaktiviert` : ''}`);
    setTileCount('tileDunkelalarmCount', st.dunkel);
    setTileText('tileDunkelalarmMeta', st.dunkel === 0 ? 'Keine Alarme' : pluralize(st.dunkel, 'HU betroffen', 'HUs betroffen'));
    setTileCount('tileOffenCount', st.open);
    setTileText('tileOffenMeta', st.open === 0 ? (st.total ? 'Alles erfasst' : 'Keine Sendungen') : `von ${st.total} Sendungen`);
    setTileText('tileInfoMeta', `${pluralize(st.total, 'Sendung', 'Sendungen')}${st.archived ? ` · ${st.archived} im Archiv` : ''}`);
}

// ---- Sichtbarkeit: Kacheln ↔ Treffer, Seite (Vollbild) ↔ Hauptansicht ------------------------------
function updateHomeLayout() {
    const filter = isBatchModeActive ? '' : listFilterText;
    const pageOpen = !!currentPage;
    const detailOpen = detailViewEl && !detailViewEl.classList.contains('hidden');
    if (homeHubEl) homeHubEl.classList.toggle('hidden', !!filter);
    if (pageViewEl) pageViewEl.classList.toggle('hidden', !pageOpen);
    if (mainViewEl) mainViewEl.classList.toggle('hidden', pageOpen || detailOpen);
    if (listCaptionEl) listCaptionEl.textContent = filter ? `Treffer zu „${filter}“` : (isBatchModeActive ? 'Sendungen' : 'Zuletzt bearbeitet');
}
// Wird am Ende von drawShipmentList aufgerufen – also nach jedem Scan, Sync, Löschen, Import …
function refreshHomeViews() {
    updateHomeTiles();
    if (currentPage) renderCurrentPage(false);
    updateHomeLayout();
}

// ---- Navigation (Browser-Verlauf, Adresse ?seite=…) --------------------------------------------
function pageKey(p) { return p ? p.id + (p.truckId ? ':' + p.truckId : '') : ''; }
function pageUrl(page, detail) {
    const u = new URL(location.href);
    u.searchParams.delete('seite'); u.searchParams.delete('lkw'); u.searchParams.delete('sendung');
    if (page) { u.searchParams.set('seite', page.id === 'lkw' ? 'anlieferung' : page.id); if (page.truckId) u.searchParams.set('lkw', page.truckId); }
    if (detail) u.searchParams.set('sendung', detail);
    return u.pathname + u.search + u.hash;
}
function pushHistory(state) { try { history.pushState(state, '', pageUrl(state.frtPage, state.frtDetail)); } catch (e) { /* z. B. file:// */ } }
function replaceHistory(state) { try { history.replaceState(state, '', pageUrl(state.frtPage, state.frtDetail)); } catch (e) { /* ignorieren */ } }
function openPage(page) {
    if (!pageViewEl || !page || !PAGE_RENDERERS[page.id]) return;
    const next = { id: page.id, truckId: page.truckId || null };
    const same = pageKey(currentPage) === pageKey(next);
    currentPage = next;
    if (!same) pushHistory({ frtPage: currentPage });
    lastScrollPosition = window.scrollY;
    renderCurrentPage(true);
    pageViewEl.scrollTop = 0;
}
function showHome() {
    currentPage = null;
    if (pageContentEl) pageContentEl.innerHTML = '';
    updateHomeLayout();
    window.scrollTo(0, lastScrollPosition);
    focusShipmentInput(); // Scanner wieder scharf (wie nach dem Schließen der Detailansicht)
}
// Zurück-Knopf der Seite: über den Verlauf schließen, damit Verlauf und Anzeige zusammenpassen
function closePage() {
    if (history.state && history.state.frtPage) history.back();
    else showHome();
}
function goBackFromDetail() {
    if (history.state && history.state.frtDetail) history.back();
    else hideDetailView();
}
// Aus der Detailansicht direkt zu einer Seite springen (Pfad in der Desktop-Kopfzeile). Der Verlaufseintrag der Details
// wird ERSETZT (kein history.back(): das käme asynchron und würde die neue Seite gleich wieder überschreiben) –
// „Zurück“ führt danach dorthin, wo man vor den Details war.
function jumpFromDetail(page) {
    detailViewEl.classList.add('hidden');
    if (page && PAGE_RENDERERS[page.id]) {
        currentPage = { id: page.id, truckId: page.truckId || null };
        replaceHistory({ frtPage: currentPage });
        renderCurrentPage(true);
        if (pageViewEl) pageViewEl.scrollTop = 0;
    } else {
        replaceHistory({ frtHome: true });
        showHome();
    }
    focusShipmentInput();
}
window.addEventListener('popstate', (e) => {
    const st = (e.state && typeof e.state === 'object') ? e.state : {};
    if (!st.frtDetail && detailViewEl && !detailViewEl.classList.contains('hidden')) hideDetailView();
    if (st.frtPage && st.frtPage.id && PAGE_RENDERERS[st.frtPage.id]) {
        const next = { id: st.frtPage.id, truckId: st.frtPage.truckId || null };
        const same = pageKey(currentPage) === pageKey(next);
        currentPage = next;
        renderCurrentPage(!same);
    } else if (currentPage) {
        showHome();
    }
    // Vorwärts-Navigation zu einer Detailansicht (showDetailView ersetzt dann nur den Eintrag)
    if (st.frtDetail && detailViewEl && detailViewEl.classList.contains('hidden') && loadShipments()[st.frtDetail]) showDetailView(st.frtDetail);
});

// ---- Seiten zeichnen ----------------------------------------------------------
function setPageHeader(title, badge, titleHtml) {
    if (pageTitleEl) { if (titleHtml) pageTitleEl.innerHTML = titleHtml; else pageTitleEl.textContent = title; }
    if (pageBadgeEl) { pageBadgeEl.textContent = badge || ''; pageBadgeEl.classList.toggle('hidden', !badge); }
}
function renderCurrentPage(fresh) {
    if (!currentPage || !pageContentEl) return;
    const r = PAGE_RENDERERS[currentPage.id];
    if (!r) { showHome(); return; }
    if (fresh) pageLimit = PAGE_LIST_STEP;
    if (fresh || !r.update) r.render(); else r.update();
    updateHomeLayout();
}
const SHIPMENT_TABLE_HEAD = '<thead><tr><th data-sort="hawb"><span class="th-hawb">HAWB.</span><span class="th-vvl"><span>VVL</span><span>Kundennr</span></span></th>'
    + '<th class="dt-cell" data-sort="status">Status</th><th class="dt-cell" data-sort="truck">LKW</th><th class="dt-cell dt-num" data-sort="we" title="Wareneingang erfasst / erwartet">WE</th>'
    + '<th class="dt-cell dt-num" data-sort="sich" title="Gesichert (inkl. Dunkelalarm) / erwartet">Sich.</th><th class="dt-cell dt-num" data-sort="kg">Gewicht</th><th class="dt-cell dt-notes" title="Notizen">✎</th>'
    + '<th>Übersicht</th><th data-sort="time">Letzte Änd.</th><th>Aktionen</th><th class="qr-code-header">QR-Code</th></tr></thead>';
// Eine Sendungskarte (gleiche Vorlage wie in der Liste) in eine Seitentabelle; chip = Zusatzkennzeichen (z. B. LKW)
function appendPageShipmentRow(tbody, base, s, archived, chip, hits) {
    appendShipmentRow(tbody, base, s, !!archived);
    const row = tbody.rows[tbody.rows.length - 1];
    if (!row) return;
    const qr = row.querySelector('.qr-code-cell div');
    if (qr) qr.id = 'qrcode-page-' + base.replace(/[^a-zA-Z0-9]/g, ''); // eigener Namensraum (Liste kann dieselbe Sendung zeigen)
    if (chip) row.querySelector('.hawb-cell').insertAdjacentHTML('beforeend', `<span class="row-chip">${escapeHtml(chip)}</span>`);
    if (hits && hits.length) { // Gewichtsfilter: die passenden HUs mit Gewicht in der Übersichtszelle (Tippen → HU-Details)
        const shown = hits.slice(0, 6);
        let html = shown.map(h => `<button type="button" class="weight-hit" data-hu="${escapeHtml(h.hu)}" data-item-id="${escapeHtml(h.id || '')}" title="HU ${escapeHtml(h.hu)}: ${escapeHtml(h.raw)}"><span class="weight-hit-hu">${escapeHtml(h.hu)}</span>${escapeHtml(formatKg(h.kg))}</button>`).join('');
        if (hits.length > shown.length) html += `<span class="weight-hit weight-hit-more">+${hits.length - shown.length} weitere</span>`;
        row.querySelector('.summary-cell').insertAdjacentHTML('beforeend', `<span class="weight-hits">${html}</span>`);
    }
}
// Gruppen von Sendungskarten mit gemeinsamer Seitenblätterung („Weitere anzeigen“)
function appendShipmentGroups(container, groups) {
    let budget = pageLimit, total = 0, shown = 0;
    groups.forEach(g => {
        total += g.rows.length;
        if (!g.rows.length || budget <= 0) return;
        if (g.title) { const h = document.createElement('h4'); h.className = 'page-section-title'; h.textContent = g.title; container.appendChild(h); }
        const slice = g.rows.slice(0, budget);
        budget -= slice.length; shown += slice.length;
        const table = document.createElement('table');
        table.className = 'shipment-table page-shipments';
        table.innerHTML = SHIPMENT_TABLE_HEAD + '<tbody></tbody>';
        const tbody = table.tBodies[0];
        slice.forEach(r => appendPageShipmentRow(tbody, r.b, r.s, r.archived, r.chip, r.hits));
        // Nur VW-Sendungen (alle mit VVL) → Kopf „VVL | Kundennr“ statt „HAWB.“, Beschriftung nicht mehr in jeder Zeile
        if (slice.length && slice.every(r => r.s && r.s.parentOrderNumber)) table.classList.add('vw-only');
        container.appendChild(table);
    });
    if (shown < total) {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'list-more-btn page-more-btn';
        btn.textContent = `Weitere ${Math.min(PAGE_LIST_STEP, total - shown)} anzeigen (${shown} von ${total})`;
        container.appendChild(btn);
    }
    return { total, shown };
}
function truckRowHtml(t) {
    const progress = t.expected > 0 ? Math.min(100, Math.round((t.counted + t.dunkel) / t.expected * 100)) : 0;
    const state = t.openOrders > 0 ? `<span class="page-chip warn">${t.openOrders} offen</span>`
        : (t.unknown ? `<span class="page-chip">${t.unknown} ohne Stückzahl</span>` : `<span class="page-chip ok">fertig</span>`);
    // Desktop: Stift (Anzeigename) und Papierkorb (LKW mit allen Aufträgen löschen) rechts in der Karte – als Geschwister
    // des Zeilen-Knopfs (kein Knopf im Knopf); Klicks landen im pageContent-Handler (data-lkw-rename / data-lkw-delete)
    const tools = isDesktopLayout() ? `<span class="page-row-tools">`
        + `<button type="button" class="page-row-tool page-row-rename" data-lkw-rename="${escapeHtml(t.truckId)}" title="LKW umbenennen – Anzeigename auf allen Geräten" aria-label="LKW umbenennen">Umbenennen</button>`
        + `<button type="button" class="page-row-tool page-row-delete" data-lkw-delete="${escapeHtml(t.truckId)}" title="LKW mit allen Aufträgen löschen" aria-label="LKW löschen">Löschen</button></span>` : '';
    return `<li${tools ? ' class="page-row-wrap"' : ''}><button type="button" class="page-row" data-truckid="${escapeHtml(t.truckId)}" title="Sendungen von ${escapeHtml(t.name)} anzeigen">
        <span class="page-row-icon emoji" aria-hidden="true">${t.icon}</span>
        <span class="page-row-body">
            <span class="page-row-title">${escapeHtml(t.name)}</span>
            <span class="page-row-sub">${t.custom ? escapeHtml(t.defaultName) + ' · ' : ''}${pluralize(t.bases.length, 'Auftrag', 'Aufträge')} · ${t.hus} HUs · WE ${ratioText(t.we, t.expected)} · Sich. ${ratioText(t.counted, t.expected)}${t.dunkel ? ` · <span class="text-danger">${t.dunkel} Dunkelalarm</span>` : ''}</span>
            <span class="page-progress"><span style="width:${progress}%"></span></span>
        </span>
        <span class="page-row-end">${state}<span class="page-chevron" aria-hidden="true"></span></span>
    </button>${tools}</li>`;
}
// ---- LKW umbenennen / löschen (Seite „Anlieferung“, Desktop) ---------------------------------------------------------
// Der Anzeigename liegt als truckName an jeder Sendung des LKW und wandert über den normalen Sync auf alle Geräte.
// Die Kennung (truckId: „VVL-…“ / „MAN n“) bleibt unverändert – Importe, Adressen (?lkw=…) und der Archivlauf arbeiten damit.
function openLkwRenameModal(truckId) {
    const modal = document.getElementById('lkwRenameModal');
    if (!modal) return;
    const t = collectTrucks(loadShipments(), loadLkwStatus()).find(x => x.truckId === truckId);
    if (!t) { displayError(`LKW ${escapeHtml(truckId)} nicht gefunden.`); return; }
    document.getElementById('lkwRenameTruckId').value = truckId;
    const input = document.getElementById('lkwRenameName');
    input.value = t.custom ? t.name : '';
    input.placeholder = t.defaultName;
    document.getElementById('lkwRenameContext').textContent = `${t.icon} ${t.defaultName} · ${pluralize(t.bases.length, 'Auftrag', 'Aufträge')}`;
    const err = document.getElementById('lkwRenameError'); err.textContent = ''; err.classList.add('hidden');
    modal.classList.add('visible');
    document.body.classList.add('modal-open');
    setTimeout(() => { input.focus(); input.select(); }, 50);
}
function closeLkwRenameModal() {
    const modal = document.getElementById('lkwRenameModal');
    if (modal) modal.classList.remove('visible');
    document.body.classList.remove('modal-open');
    focusShipmentInput();
}
function saveLkwRenameFromModal() {
    const truckId = document.getElementById('lkwRenameTruckId').value;
    const name = document.getElementById('lkwRenameName').value.trim().replace(/\s+/g, ' ');
    const err = document.getElementById('lkwRenameError');
    const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };
    if (name.length > 40) return fail('Höchstens 40 Zeichen.');
    const shipments = loadShipments();
    const trucks = collectTrucks(shipments, loadLkwStatus());
    const t = trucks.find(x => x.truckId === truckId);
    if (!t) { closeLkwRenameModal(); displayError(`LKW ${escapeHtml(truckId)} nicht mehr gefunden.`); return; }
    const custom = name && name !== t.defaultName ? name : null;   // leer oder Standardname → Anzeigename entfernen
    // Kein doppelter Name – sonst wären zwei LKW in Listen und Auswahlfeldern nicht mehr zu unterscheiden
    if (custom && trucks.some(x => x.truckId !== truckId && x.name === custom)) return fail(`„${custom}“ gibt es schon – bitte einen anderen Namen wählen.`);
    t.bases.forEach(b => { const s = shipments[b]; if (!s) return; if (custom) s.truckName = custom; else delete s.truckName; });
    saveShipments(shipments);   // nur tatsächlich geänderte Sendungen gehen an den Server; lastModified bleibt (kein „zuletzt bearbeitet“-Sprung)
    closeLkwRenameModal();
    renderTable(); renderLkwMenu();
    displayError(custom ? `LKW heißt jetzt „${custom}“.` : `LKW heißt wieder „${t.defaultName}“.`, 'green', 3000);
}
// LKW löschen = alle seine Aufträge löschen (wie das Papierkorb-Symbol je Sendung, nur für den ganzen LKW) – mit Rückfrage.
// Läuft über saveShipments → Löschvermerke → auf allen Geräten weg. Bereits archivierte Aufträge bleiben im Archiv suchbar.
function deleteTruckFromPage(truckId) {
    const shipments = loadShipments();
    const t = collectTrucks(shipments, loadLkwStatus()).find(x => x.truckId === truckId);
    if (!t || !t.bases.length) { displayError(`LKW ${escapeHtml(truckId)} nicht mehr gefunden.`); renderTable(); return; }
    const what = `${pluralize(t.bases.length, 'Auftrag', 'Aufträge')} mit ${t.hus} HUs`;
    if (!confirm(`LKW „${t.name}“ löschen?\n\n${what} werden mit allen Scans auf allen Geräten entfernt. Das lässt sich nicht rückgängig machen.`)) return;
    t.bases.forEach(b => { delete shipments[b]; });
    const status = loadLkwStatus();
    if (truckId in status) { delete status[truckId]; saveLkwStatus(status); }   // sonst gälte ein später neu importierter LKW gleicher Kennung als deaktiviert
    saveShipments(shipments);
    renderTable(); renderLkwMenu();
    displayError(`LKW „${t.name}“ gelöscht (${what}).`, 'green', 3000);
}
async function setLkwActiveFromPage(truckId, active) {
    const status = loadLkwStatus();
    status[truckId] = active;
    const saving = saveLkwStatus(status); // schreibt sofort lokal, dann Server (wie der Schalter im Menü)
    renderTable(); renderLkwMenu();
    await saving;
}
function infoPeriodStart(period) {
    const now = new Date();
    if (period === 'today') { now.setHours(0, 0, 0, 0); return now.getTime(); }
    if (period === '7d') return Date.now() - 7 * 86400000;
    if (period === '30d') return Date.now() - 30 * 86400000;
    return 0;
}
// Zeitraum als [start, end] in ms (Ortszeit) oder null (kein Zeitfilter). Bei „Datum wählen“ zählen ganze Tage:
// „von“ ab 00:00, „bis“ einschließlich bis 23:59:59; nur ein Feld = offene Grenze; vertauschte Daten werden sortiert.
function infoDateBounds() {
    if (infoState.period === 'custom') {
        const day = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
        let from = day(infoState.dateFrom), to = day(infoState.dateTo);
        if (!from && !to) return null;
        if (from && to && from > to) { const t = from; from = to; to = t; }
        return { start: from ? from.getTime() : 0, end: to ? to.getTime() + 86400000 - 1 : Infinity, from, to };
    }
    const start = infoPeriodStart(infoState.period);
    return start ? { start, end: Infinity } : null;
}
function dateRangeText(b) {
    if (!b || !b.from && !b.to) return '';
    const f = (d) => d.toLocaleDateString('de-DE');
    if (b.from && b.to) return b.from.getTime() === b.to.getTime() ? `am ${f(b.from)}` : `${f(b.from)} – ${f(b.to)}`;
    return b.from ? `ab ${f(b.from)}` : `bis ${f(b.to)}`;
}
// ---- Gewicht (Info-Suche) ---------------------------------------------------------------------
// Gewicht einer HU steht als Text am Eintrag (grossWeight: „19.5 KG“, „19,500 KG“, „1.250,5 KG“, „N/A“ …).
// Liefert Kilogramm als Zahl oder null (kein/unlesbares Gewicht). Dient auch zum Lesen der Eingabefelder „von/bis“.
function parseWeightKg(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    const str = String(raw).trim().toUpperCase();
    if (!str || str === 'N/A') return null;
    const m = str.match(/\d[\d.,]*/);
    if (!m) return null;
    let num = m[0];
    const lastDot = num.lastIndexOf('.'), lastComma = num.lastIndexOf(',');
    if (lastDot !== -1 && lastComma !== -1) {
        // beide Zeichen vorhanden: das hintere ist das Dezimalzeichen, das andere ein Tausenderpunkt/-komma
        num = lastDot > lastComma ? num.replace(/,/g, '') : num.replace(/\./g, '').replace(',', '.');
    } else if (lastComma !== -1) {
        num = num.slice(0, lastComma).replace(/,/g, '') + '.' + num.slice(lastComma + 1);
    } else if (num.indexOf('.') !== lastDot) {
        num = num.slice(0, lastDot).replace(/\./g, '') + '.' + num.slice(lastDot + 1);
    }
    const n = parseFloat(num);
    if (!Number.isFinite(n)) return null;
    const unit = str.slice(m.index + m[0].length).trim();
    if (/^G(\b|R)/.test(unit)) return n / 1000;    // Gramm
    if (/^T(\b|O)/.test(unit)) return n * 1000;    // Tonnen
    return n;                                      // Kilogramm (Standard, auch ohne Einheit)
}
function formatKg(n) { return `${Number(n).toLocaleString('de-DE', { maximumFractionDigits: 3 })} kg`; }
// Eingaben „von/bis“ als Bereich in kg; null = kein Gewichtsfilter. Vertauschte Grenzen werden sortiert.
function infoWeightRange() {
    const a = parseWeightKg(infoState.weightMin), b = parseWeightKg(infoState.weightMax);
    if (a === null && b === null) return null;
    if (a !== null && b !== null) return { min: Math.min(a, b), max: Math.max(a, b) };
    return { min: a, max: b };
}
function weightRangeText(range) {
    if (!range) return '';
    if (range.min !== null && range.max !== null) return range.min === range.max ? formatKg(range.min) : `${formatKg(range.min).replace(' kg', '')}–${formatKg(range.max)}`;
    return range.min !== null ? `ab ${formatKg(range.min)}` : `bis ${formatKg(range.max)}`;
}
// HUs einer Sendung, deren Gewicht im Bereich liegt – je HU-Nummer ein Eintrag (weitere Scans derselben HU tragen kein Gewicht)
function shipmentWeightHits(s, range) {
    const items = Array.isArray(s && s.scannedItems) ? s.scannedItems : [];
    const hits = [], seen = new Set();
    items.forEach(it => {
        if (!it || !it.rawInput) return;
        const kg = parseWeightKg(it.grossWeight);
        if (kg === null) return;
        if (it.isCancelled && !s.isHuListOrder) return; // Stück einer normalen Sendung: Storno zählt nicht
        const key = s.isHuListOrder ? String(it.rawInput).toUpperCase() : String(it.id || it.timestamp);
        if (seen.has(key)) return;
        seen.add(key);
        if ((range.min !== null && kg < range.min - 1e-9) || (range.max !== null && kg > range.max + 1e-9)) return;
        hits.push({ hu: String(it.rawInput), kg, raw: String(it.grossWeight), id: it.id || '' });
    });
    return hits;
}
function infoMatches(base, s, text, range) {
    if (text && !shipmentMatchesListFilter(base, s, text)) return false;
    if (range && shipmentWeightHits(s, range).length === 0) return false;
    if (infoState.truck !== 'all') {
        if (infoState.truck === 'none' ? !!s.truckId : s.truckId !== infoState.truck) return false;
    }
    const bounds = infoDateBounds();
    if (bounds) { const t = Date.parse(s.lastModified) || 0; if (t < bounds.start || t > bounds.end) return false; }
    if (infoState.status !== 'all') {
        const p = shipmentProgress(s);
        if (infoState.status === 'open' && !p.open) return false;
        if (infoState.status === 'done' && !(!p.unknown && !p.open)) return false;
        if (infoState.status === 'dunkel' && p.dunkel === 0) return false;
        if (infoState.status === 'unknown' && !p.unknown) return false;
    }
    return true;
}
function scheduleInfoArchiveSearch() {
    if (infoArchiveTimer) { clearTimeout(infoArchiveTimer); infoArchiveTimer = null; }
    const q = infoState.text;
    if (!infoState.archive || !archiveAvailable() || q.length < 3) {
        infoState.archiveQuery = ''; infoState.archiveOrder = []; infoState.archiveNote = ''; infoArchiveCache = {};
        infoState.archiveBusy = false; infoArchiveSeq++;
        return;
    }
    if (infoState.archiveQuery === q) return;
    infoState.archiveBusy = true;
    const seq = ++infoArchiveSeq;
    infoArchiveTimer = setTimeout(async () => {
        try {
            const r = await postToServer('searchArchive', { query: q, mode: 'prefix' });
            if (seq !== infoArchiveSeq) return;
            infoArchiveCache = r.results || {};
            infoState.archiveOrder = (Array.isArray(r.order) ? r.order : Object.keys(infoArchiveCache)).filter(b => infoArchiveCache[b]);
            infoState.archiveTotal = r.total || infoState.archiveOrder.length;
            infoState.archiveTruncated = !!r.truncated;
            infoState.archiveQuery = q; infoState.archiveNote = '';
            let k = false; infoState.archiveOrder.forEach(b => { if (!archiveKnownBases.has(b)) { archiveKnownBases.add(b); k = true; } }); if (k) saveArchiveKnownBases();
        } catch (e) {
            if (seq !== infoArchiveSeq) return;
            infoState.archiveOrder = []; infoArchiveCache = {}; infoState.archiveQuery = q;
            if (isUnknownActionError(e)) { archiveUnsupported = true; infoState.archiveNote = 'Archivsuche benötigt das neue Server-Skript (backend/Code.gs neu bereitstellen).'; }
            else infoState.archiveNote = `Archiv nicht erreichbar: ${e.message}`;
        } finally {
            if (seq === infoArchiveSeq) { infoState.archiveBusy = false; if (currentPage && currentPage.id === 'info') PAGE_RENDERERS.info.update(); }
        }
    }, 400);
}
function infoOptionsHtml(options, selected) {
    return options.map(o => `<option value="${escapeHtml(o[0])}"${o[0] === selected ? ' selected' : ''}>${escapeHtml(o[1])}</option>`).join('');
}

const PAGE_RENDERERS = {
    anlieferung: {
        render() {
            const trucks = collectTrucks(loadShipments(), loadLkwStatus());
            const active = trucks.filter(t => t.active), inactive = trucks.filter(t => !t.active);
            setPageHeader('Anlieferung', trucks.length ? `${trucks.length} LKW` : '');
            let html = '';
            if (!trucks.length) html = '<p class="page-empty">Noch kein LKW vorhanden. Vorverladeliste (VVL) oder MAN-Liste per QR-Code scannen – die Aufträge erscheinen dann hier je LKW.</p>';
            if (active.length) html += `<ul class="page-list">${active.map(truckRowHtml).join('')}</ul>`;
            if (inactive.length) html += `<h4 class="page-section-title">Deaktiviert – in der Liste ausgeblendet (${inactive.length})</h4><ul class="page-list page-list-muted">${inactive.map(truckRowHtml).join('')}</ul>`;
            pageContentEl.innerHTML = html;
        }
    },
    lkw: {
        render() {
            const shipments = loadShipments();
            const t = collectTrucks(shipments, loadLkwStatus()).find(x => x.truckId === currentPage.truckId);
            if (!t) {
                setPageHeader(currentPage.truckId || 'LKW', '');
                pageContentEl.innerHTML = '<p class="page-empty">Zu diesem LKW gibt es keine Sendungen mehr.</p>';
                return;
            }
            setPageHeader(truckLabel(t), pluralize(t.bases.length, 'Auftrag', 'Aufträge'), truckLabelHtml(t));
            const rows = t.bases.map(b => ({ b, s: shipments[b], p: shipmentProgress(shipments[b]) }));
            rows.sort((x, y) => (Number(y.p.open) - Number(x.p.open)) || String(x.b).localeCompare(String(y.b), 'de', { numeric: true }));
            const open = rows.filter(r => r.p.open), rest = rows.filter(r => !r.p.open);
            let html = '';
            if (!t.active) html += `<div class="page-banner"><span>LKW ist deaktiviert – seine Sendungen sind in der Liste und unter „Offene Sendungen“ ausgeblendet.</span><button type="button" class="page-banner-btn" data-lkw-activate="${escapeHtml(t.truckId)}">Aktivieren</button></div>`;
            html += `<div class="page-summary">
                <span>${t.hus} HUs</span>
                <span class="${chipClass(t.we, t.expected)}">WE ${ratioText(t.we, t.expected)}</span>
                <span class="${chipClass(t.counted + t.dunkel, t.expected)}">Sich. ${ratioText(t.counted, t.expected)}</span>
                ${t.dunkel ? `<span class="over">${t.dunkel} Dunkelalarm</span>` : ''}
                ${t.openOrders ? `<span class="mismatch">${t.openOrders} offen</span>` : '<span class="ok">alles erfasst</span>'}
                ${t.active && isDesktopLayout() && String(t.truckId).startsWith('MAN') ? `<button type="button" class="page-summary-btn page-summary-add" data-order-add="${escapeHtml(t.truckId)}" title="Weiteren Auftrag (Rechnung) zu diesem LKW aufnehmen">+ Auftrag</button>` : ''}
                ${t.active ? `<button type="button" class="page-summary-btn" data-lkw-deactivate="${escapeHtml(t.truckId)}">LKW deaktivieren</button>` : ''}
            </div>`;
            pageContentEl.innerHTML = html;
            appendShipmentGroups(pageContentEl, [
                { title: `Offen (${open.length})`, rows: open },
                { title: `Abgeschlossen (${rest.length})`, rows: rest }
            ]);
        }
    },
    dunkelalarm: {
        render() {
            const sum = computeOpenHusSummary();
            const orders = Object.keys(sum.dunkelalarmItemsByOrder).map(b => Object.assign({}, sum.dunkelalarmItemsByOrder[b], { orderNumber: b })).sort(sortByCountryAndOrder);
            setPageHeader('Dunkelalarm', sum.totalDunkelalarms ? String(sum.totalDunkelalarms) : '');
            let html = orders.length ? '' : '<p class="page-empty">Keine Einträge mit Status „Dunkelalarm“.</p>';
            html += orders.map(d => `<div class="page-order" data-basenumber="${escapeHtml(d.orderNumber)}">${generateHtmlForOrderGroup(d, generateHuListHtml(d.items, d.scannedItems, sum.shipments), true)}</div>`).join('');
            html += '<div class="page-actions"><button type="button" class="page-link-btn" data-open-hus-modal="1">Alle offenen HUs anzeigen (Sicherung · Eingänge · Überzählig)</button></div>';
            pageContentEl.innerHTML = html;
        }
    },
    offen: {
        render() {
            const shipments = loadShipments();
            const lkwStatus = loadLkwStatus();
            const trucks = collectTrucks(shipments, lkwStatus);
            const byTruck = {}, singles = [], unknown = [];
            Object.keys(shipments).forEach(b => {
                const s = shipments[b];
                if (!s || (s.truckId && lkwStatus[s.truckId] === false)) return;
                const p = shipmentProgress(s);
                if (p.unknown) { unknown.push({ b, s, p }); return; }
                if (!p.open) return;
                if (s.truckId) (byTruck[s.truckId] = byTruck[s.truckId] || []).push({ b, s, p });
                else singles.push({ b, s, p });
            });
            const byTime = (x, y) => (Date.parse(y.s.lastModified) || 0) - (Date.parse(x.s.lastModified) || 0);
            const groups = [];
            trucks.forEach(t => { const rows = byTruck[t.truckId]; if (rows) groups.push({ title: `${truckLabel(t)} (${rows.length} offen)`, rows: rows.sort(byTime) }); });
            if (singles.length) groups.push({ title: `Einzelsendungen (${singles.length} offen)`, rows: singles.sort(byTime) });
            const openCount = groups.reduce((n, g) => n + g.rows.length, 0);
            setPageHeader('Offene Sendungen', openCount ? `${openCount} offen` : '');
            const detailsWasOpen = !!pageContentEl.querySelector('.page-details[open]'); // beim Neuzeichnen (Sync) offen lassen
            pageContentEl.innerHTML = openCount ? '' : '<p class="page-empty">Keine offenen Sendungen – alles erfasst.</p>';
            appendShipmentGroups(pageContentEl, groups);
            if (unknown.length) {
                unknown.sort(byTime);
                const det = document.createElement('details');
                det.className = 'page-details';
                det.open = detailsWasOpen;
                det.innerHTML = `<summary>Ohne Stückzahl (${unknown.length}) – Abschluss nicht bestimmbar</summary>`;
                const table = document.createElement('table');
                table.className = 'shipment-table page-shipments';
                table.innerHTML = SHIPMENT_TABLE_HEAD + '<tbody></tbody>';
                unknown.slice(0, PAGE_LIST_STEP).forEach(r => appendPageShipmentRow(table.tBodies[0], r.b, r.s, false));
                det.appendChild(table);
                if (unknown.length > PAGE_LIST_STEP) det.insertAdjacentHTML('beforeend', `<p class="page-note">Nur die neuesten ${PAGE_LIST_STEP} – die übrigen über „Info“ suchen (Status: ohne Stückzahl).</p>`);
                pageContentEl.appendChild(det);
            }
        }
    },
    info: {
        truckOptions(trucks) {
            return [['all', 'Alle LKW']].concat(trucks.map(t => [t.truckId, `${truckLabel(t)}${t.active ? '' : ' (deaktiviert)'}`]), [['none', 'Ohne LKW']]);
        },
        // LKW-Auswahl nachziehen, wenn sich die LKW geändert haben (z. B. Seite per Adresse geöffnet, bevor die Daten da waren; Import; Sync)
        syncTruckSelect(trucks) {
            const sel = document.getElementById('infoTruckSelect');
            if (!sel) return;
            const options = this.truckOptions(trucks);
            const current = [...sel.options].map(o => o.value + '\u0000' + o.textContent).join('\n');
            const next = options.map(o => o[0] + '\u0000' + o[1]).join('\n');
            if (current === next) return;
            const keep = options.some(o => o[0] === infoState.truck) ? infoState.truck : 'all';
            sel.innerHTML = infoOptionsHtml(options, keep);
            if (keep !== infoState.truck) infoState.truck = keep;
        },
        render() {
            setPageHeader('Info & Suche', '');
            const trucks = collectTrucks(loadShipments(), loadLkwStatus());
            const truckOptions = this.truckOptions(trucks);
            pageContentEl.innerHTML = `
              <div class="info-layout">
                <form id="infoForm" class="info-form" autocomplete="off">
                    <div class="info-form-head">
                        <span class="info-form-title">Filter</span>
                        <button type="button" id="infoResetBtn" class="info-reset-btn hidden" title="Alle Filter zurücksetzen">Zurücksetzen</button>
                    </div>
                    <div class="input-wrapper info-search-wrapper">
                        <input type="search" id="infoSearchInput" placeholder="Sendungsnummer, VVL, HU/VSE, Notiz …" autocapitalize="characters" autocomplete="off" enterkeyhint="search" value="${escapeHtml(infoState.text)}">
                    </div>
                    <div class="info-filters">
                        <label>Status<select id="infoStatusSelect">${infoOptionsHtml([['all', 'Alle'], ['open', 'Offen'], ['done', 'Abgeschlossen'], ['dunkel', 'Mit Dunkelalarm'], ['unknown', 'Ohne Stückzahl']], infoState.status)}</select></label>
                        <label>LKW<select id="infoTruckSelect">${infoOptionsHtml(truckOptions, truckOptions.some(o => o[0] === infoState.truck) ? infoState.truck : 'all')}</select></label>
                        <label>Zeitraum<select id="infoPeriodSelect">${infoOptionsHtml([['all', 'Gesamt'], ['today', 'Heute'], ['7d', '7 Tage'], ['30d', '30 Tage'], ['custom', 'Datum …']], infoState.period)}</select></label>
                        <div class="info-dates${infoState.period === 'custom' ? '' : ' hidden'}" id="infoDates" role="group" aria-label="Datum von bis">
                            <span class="info-weight-label">Datum</span>
                            <div class="info-weight-inputs">
                                <input type="date" id="infoDateFrom" aria-label="Datum von" value="${escapeHtml(infoState.dateFrom)}">
                                <span class="info-weight-sep" aria-hidden="true">–</span>
                                <input type="date" id="infoDateTo" aria-label="Datum bis" value="${escapeHtml(infoState.dateTo)}">
                            </div>
                        </div>
                        <div class="info-weight" role="group" aria-label="Gewicht in Kilogramm">
                            <span class="info-weight-label">Gewicht (kg)</span>
                            <div class="info-weight-inputs">
                                <input type="text" id="infoWeightMin" inputmode="decimal" placeholder="von" aria-label="Gewicht von (kg)" autocomplete="off" enterkeyhint="done" value="${escapeHtml(infoState.weightMin)}">
                                <span class="info-weight-sep" aria-hidden="true">–</span>
                                <input type="text" id="infoWeightMax" inputmode="decimal" placeholder="bis" aria-label="Gewicht bis (kg)" autocomplete="off" enterkeyhint="done" value="${escapeHtml(infoState.weightMax)}">
                            </div>
                        </div>
                        <label class="info-archive"><input type="checkbox" id="infoArchiveToggle"${infoState.archive ? ' checked' : ''}${archiveAvailable() ? '' : ' disabled'}> Archiv einbeziehen${archiveAvailable() ? '' : ' (Server ohne Archiv)'}</label>
                    </div>
                </form>
                <div class="info-main">
                    <p id="infoResultNote" class="page-note"></p>
                    <div id="infoResults"></div>
                </div>
              </div>`;
            const form = document.getElementById('infoForm');
            const input = document.getElementById('infoSearchInput');
            const setAndUpdate = () => { pageLimit = PAGE_LIST_STEP; scheduleInfoArchiveSearch(); PAGE_RENDERERS.info.update(); };
            form.addEventListener('submit', (e) => { e.preventDefault(); input.blur(); if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
            const debounced = () => { if (infoTimer) clearTimeout(infoTimer); infoTimer = setTimeout(setAndUpdate, 150); };
            input.addEventListener('input', () => { infoState.text = input.value.trim().toUpperCase(); debounced(); });
            document.getElementById('infoWeightMin').addEventListener('input', (e) => { infoState.weightMin = e.target.value.trim(); debounced(); });
            document.getElementById('infoWeightMax').addEventListener('input', (e) => { infoState.weightMax = e.target.value.trim(); debounced(); });
            // Nach der Auswahl den Fokus freigeben – sonst landen Scanner-Eingaben in der Auswahlliste
            document.getElementById('infoStatusSelect').addEventListener('change', (e) => { infoState.status = e.target.value; e.target.blur(); setAndUpdate(); });
            document.getElementById('infoTruckSelect').addEventListener('change', (e) => { infoState.truck = e.target.value; e.target.blur(); setAndUpdate(); });
            document.getElementById('infoPeriodSelect').addEventListener('change', (e) => {
                infoState.period = e.target.value; e.target.blur();
                const custom = infoState.period === 'custom';
                document.getElementById('infoDates').classList.toggle('hidden', !custom);
                if (custom && !infoState.dateFrom && !infoState.dateTo) { // Vorbelegung: heute – Anwender passt an
                    const d = new Date(), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    infoState.dateFrom = iso; infoState.dateTo = iso;
                    document.getElementById('infoDateFrom').value = iso; document.getElementById('infoDateTo').value = iso;
                }
                setAndUpdate();
            });
            // Datumsfelder: „input“ (Tastatur) und „change“ (Auswahl im Kalender) abdecken
            ['infoDateFrom', 'infoDateTo'].forEach((id, i) => {
                const el = document.getElementById(id);
                const apply = () => { infoState[i === 0 ? 'dateFrom' : 'dateTo'] = el.value || ''; debounced(); };
                el.addEventListener('input', apply); el.addEventListener('change', apply);
            });
            document.getElementById('infoArchiveToggle').addEventListener('change', (e) => { infoState.archive = e.target.checked; setAndUpdate(); });
            document.getElementById('infoResetBtn').addEventListener('click', () => {
                Object.assign(infoState, { text: '', status: 'all', truck: 'all', period: 'all', dateFrom: '', dateTo: '', weightMin: '', weightMax: '' });
                this.render(); // Formular mit leeren Werten neu aufbauen
            });
            scheduleInfoArchiveSearch();
            this.update();
            // Am Desktop gleich ins Suchfeld; auf Touch-Geräten nicht (Tastatur würde aufklappen, Scanner-Eingaben landeten hier)
            if (!infoState.text && !('ontouchstart' in window)) setTimeout(() => { input.focus(); }, 50);
        },
        update() {
            const results = document.getElementById('infoResults');
            const note = document.getElementById('infoResultNote');
            if (!results || !note) { this.render(); return; }
            const text = infoState.text;
            const range = infoWeightRange();
            const anyFilter = infoState.status !== 'all' || infoState.truck !== 'all' || infoState.period !== 'all' || !!range;
            const resetBtn = document.getElementById('infoResetBtn');
            if (resetBtn) resetBtn.classList.toggle('hidden', !text && !anyFilter);
            results.innerHTML = '';
            // Handy: erst nach Eingabe/Filter suchen (kurze Liste, wenig Scrollen). Desktop: sofort alle Sendungen als
            // Tabelle zeigen – die Seitenleiste filtert dann live.
            if (!text && !anyFilter && !isDesktopLayout()) {
                note.textContent = 'Suchbegriff eingeben oder Filter wählen. Gefunden werden Sendungs-, VVL-, HU/VSE-Nummern und (ab 4 Zeichen) Notiztexte – auf diesem Gerät und auf Wunsch im Archiv.';
                setPageHeader('Info & Suche', '');
                this.syncTruckSelect(collectTrucks(loadShipments(), loadLkwStatus()));
                return;
            }
            const shipments = loadShipments();
            const lkwStatus = loadLkwStatus();
            const trucks = collectTrucks(shipments, lkwStatus);
            this.syncTruckSelect(trucks);
            const nameOf = {}; trucks.forEach(t => { nameOf[t.truckId] = truckLabel(t) + (t.active ? '' : ' · deaktiviert'); });
            const hitsOf = (s) => range ? shipmentWeightHits(s, range) : null; // passende HUs (Gewicht) zur Anzeige an der Karte
            const local = Object.keys(shipments)
                .filter(b => shipments[b] && infoMatches(b, shipments[b], text, range))
                .map(b => ({ b, s: shipments[b], t: Date.parse(shipments[b].lastModified) || 0 }))
                .sort((x, y) => y.t - x.t)
                .map(r => ({ b: r.b, s: r.s, chip: r.s.truckId ? (nameOf[r.s.truckId] || r.s.truckId) : '', hits: hitsOf(r.s) }));
            const archived = infoState.archiveOrder
                .filter(b => infoArchiveCache[b] && !shipments[b] && infoMatches(b, infoArchiveCache[b], text, range))
                .map(b => ({ b, s: infoArchiveCache[b], archived: true, chip: infoArchiveCache[b].truckId ? (nameOf[infoArchiveCache[b].truckId] || infoArchiveCache[b].truckName || infoArchiveCache[b].truckId) : '', hits: hitsOf(infoArchiveCache[b]) }));
            const groups = [{ title: (!text && !anyFilter) ? `Alle Sendungen auf diesem Gerät (${local.length})` : `Auf diesem Gerät (${local.length})`, rows: local }];
            let archiveInfo = '';
            if (infoState.archive) {
                if (!archiveAvailable()) archiveInfo = 'Archiv: nicht verfügbar.';
                else if (text.length < 3) archiveInfo = 'Archiv: mindestens 3 Zeichen eingeben.';
                else if (infoState.archiveBusy) archiveInfo = 'Archiv wird durchsucht …';
                else if (infoState.archiveNote) archiveInfo = infoState.archiveNote;
                else groups.push({ title: `Archiv (${archived.length}${infoState.archiveTruncated ? ` von ${infoState.archiveTotal}` : ''})`, rows: archived });
            }
            const total = local.length + (groups.length > 1 ? archived.length : 0);
            setPageHeader('Info & Suche', total ? `${total} Treffer` : '');
            const parts = [];
            const dateInfo = infoState.period === 'custom' ? dateRangeText(infoDateBounds()) : '';
            const criteria = [dateInfo ? `Datum ${dateInfo}` : '', range ? `Gewicht ${weightRangeText(range)}` : ''].filter(Boolean).join(', ');
            if (!total) parts.push('Kein Treffer' + (text ? ` zu „${text}“` : '') + (criteria ? ` (${criteria})` : '') + '.');
            else if (criteria) parts.push(`${criteria}${range ? ' – passende HUs stehen an der Sendung' : ''}.`);
            if (infoState.period === 'custom' && !dateInfo) parts.push('Datum von/bis wählen – ohne Datum gilt der gesamte Zeitraum.');
            if (archiveInfo) parts.push(archiveInfo);
            if (infoState.archiveTruncated && groups.length > 1) parts.push('Archiv zeigt nur die neuesten Treffer – Suche weiter eingrenzen.');
            note.textContent = parts.join(' ');
            appendShipmentGroups(results, groups);
        }
    }
};

// ---- Klicks auf Kacheln und Seiteninhalt ------------------------------------------
if (homeHubEl) homeHubEl.addEventListener('click', (e) => {
    const tile = e.target.closest('.home-tile[data-page]');
    if (tile) openPage({ id: tile.dataset.page });
});
if (pageBackBtnEl) pageBackBtnEl.addEventListener('click', closePage);
if (pageContentEl) pageContentEl.addEventListener('click', (event) => {
    const target = event.target;
    const truckBtn = target.closest('.page-row[data-truckid]');
    if (truckBtn) { openPage({ id: 'lkw', truckId: truckBtn.dataset.truckid }); return; }
    const rename = target.closest('[data-lkw-rename]');
    if (rename) { if (!isBatchModeActive) openLkwRenameModal(rename.dataset.lkwRename); return; }
    const delTruck = target.closest('[data-lkw-delete]');
    if (delTruck) { if (!isBatchModeActive) deleteTruckFromPage(delTruck.dataset.lkwDelete); return; }
    const act = target.closest('[data-lkw-activate]');
    if (act) { setLkwActiveFromPage(act.dataset.lkwActivate, true); return; }
    const addOrder = target.closest('[data-order-add]');
    if (addOrder) { if (!isBatchModeActive) openOrderAddModal(addOrder.dataset.orderAdd); return; }
    const deact = target.closest('[data-lkw-deactivate]');
    if (deact) {
        if (confirm('LKW deaktivieren?\n\nSeine Sendungen werden in der Liste ausgeblendet; nach 7 Tagen wandern sie ins Archiv (bleiben suchbar).')) setLkwActiveFromPage(deact.dataset.lkwDeactivate, false);
        return;
    }
    if (target.closest('.page-more-btn')) { pageLimit += PAGE_LIST_STEP; renderCurrentPage(false); return; }
    if (target.closest('[data-open-hus-modal]')) { showOpenHusSummary(); return; }
    const row = target.closest('tr[data-basenumber]');
    if (row) { handlePageShipmentRowClick(event, row); return; }
    if (target.closest('.hu-value, .pending-vse')) { openHuDetailsModal(event); return; }
    const orderTitle = target.closest('.page-order .hu-order-title');
    if (orderTitle) {
        const base = orderTitle.closest('.page-order').dataset.basenumber;
        if (base && loadShipments()[base]) showDetailView(base);
    }
});
// Sendungskarte auf einer Seite: gleiche Aktionen wie in der Liste (Details, Edit, PDF, Löschen; Archiv: lesen/zurückholen)
function handlePageShipmentRowClick(event, row) {
    const base = row.dataset.basenumber;
    const target = event.target;
    if (!base) return;
    const hit = target.closest('.weight-hit[data-hu]');
    if (hit) { showHuDetailsFromShipment(base, hit.dataset.hu, !!row.dataset.archived, hit.dataset.itemId); return; }
    if (row.dataset.archived) {
        if (target.closest('button')) {
            if (target.classList.contains('restore-btn')) restoreArchivedShipment(base, false);
            else if (target.classList.contains('pdf-btn')) sendArchivedPdf(event, base);
            return;
        }
        const cell = target.closest('td');
        if (cell && cell.classList.contains('hawb-cell') && infoArchiveCache[base]) { detailArchived = { base, shipment: infoArchiveCache[base] }; showDetailView(base); }
        return;
    }
    if (target.closest('button')) {
        if (target.classList.contains('edit-btn') && !isBatchModeActive) openEditModal(base);
        else if (target.classList.contains('pdf-btn')) sendPdfEmailViaBackend(event);
        else if (target.classList.contains('main-delete-btn')) { if (confirm(`Sendung ${escapeHtml(base)} wirklich löschen?`)) deleteShipment(base); }
        return;
    }
    const cell = target.closest('td');
    if (cell && cell.classList.contains('hawb-cell')) showDetailView(base);
}
// Menü-Links (href="#") sollen keinen Verlaufseintrag „#“ erzeugen – sonst schließt die Zurück-Geste erst den Hash
if (sideMenuEl) sideMenuEl.addEventListener('click', (e) => { const a = e.target.closest('a[href="#"]'); if (a) e.preventDefault(); });

// Verlauf beim Start normalisieren; eine offene Seite (Adresse ?seite=… – z. B. nach Neuladen/Import) wieder öffnen
let pendingDetailFromUrl = null; // ?sendung=… aus der Adresse, das beim Start noch nicht lokal vorlag (s. renderTable)
(function initHistory() {
    let saved = (history.state && history.state.frtPage) ? history.state.frtPage : null;
    if (!saved) {
        const q = new URLSearchParams(location.search);
        const id = q.get('seite'), lkw = q.get('lkw');
        if (id && PAGE_RENDERERS[id]) saved = (id === 'anlieferung' && lkw) ? { id: 'lkw', truckId: lkw } : { id };
    }
    const sendung = new URLSearchParams(location.search).get('sendung');
    replaceHistory({ frtHome: true });
    if (saved && saved.id && PAGE_RENDERERS[saved.id]) openPage(saved);
    if (sendung && loadShipments()[sendung]) showDetailView(sendung); // Adresse ?sendung=… (z. B. geteilter Link)
    else if (sendung) pendingDetailFromUrl = sendung;                  // Daten kommen erst vom Server – s. renderTable
})();


function showDetailView(baseNumber) {
    // 1. Aktuelle Scroll-Position der Hauptseite speichern
    lastScrollPosition = window.scrollY;

    // 2. Die Detail-Daten in den Container der Detail-Ansicht laden
    displayCurrentShipmentDetails(baseNumber);

    // 3. Ansichten umschalten (auch eine offene Unterseite tritt zurück)
    mainViewEl.classList.add('hidden');
    if (pageViewEl) pageViewEl.classList.add('hidden');
    detailViewEl.classList.remove('hidden');
    
    // 4. In der neuen Ansicht nach ganz oben scrollen
    detailViewEl.scrollTop = 0;

    // 5. Verlaufseintrag (?sendung=…): Zurück-Geste/-Taste schließt die Detailansicht (popstate-Listener der Startseite)
    const st = history.state || {};
    if (st.frtDetail) replaceHistory({ frtPage: currentPage, frtDetail: baseNumber });
    else pushHistory({ frtPage: currentPage, frtDetail: baseNumber });
}


function hideDetailView() {
    // 1. Ansichten zurückschalten – zurück zur Unterseite, von der aus geöffnet wurde, sonst zur Hauptansicht
    detailViewEl.classList.add('hidden');
    if (currentPage && pageViewEl) pageViewEl.classList.remove('hidden');
    else mainViewEl.classList.remove('hidden');

    // 2. Zur gespeicherten Scroll-Position zurückkehren
    window.scrollTo(0, lastScrollPosition);
    focusShipmentInput(); // Fokus wieder auf das Eingabefeld setzen
}




        function updateEditButtonVisibilityInTable() {
            // Dies wird über CSS body.batch-mode-active td.actions-cell button.edit-btn { display: none; } gesteuert.
            // Diese Funktion könnte für komplexere Logik dienen, ist hier aber implizit durch CSS.
             document.body.classList.toggle('batch-mode-active', isBatchModeActive);
        }

        // filterTable(): siehe Sendungsliste (oberhalb von drawShipmentList) – filtert jetzt über die Daten statt über Zeilen

        
        
        
        
        
        
        
      // ERSETZEN SIE DIESE GESAMTE FUNKTION
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER KORRIGIERTEN VERSION ---

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER FINALEN KORREKTUR ---

// --- START DER ÄNDERUNG: Die komplette Funktion wird aktualisiert (mit WE-Prüfung) ---
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER NEUEN VERSION ---

function processAndSaveSingleScan(rawInputToSave, statusToUse, isCombinationFromCheckbox) {
    const statusesThatTriggerWE = STATUSES_THAT_TRIGGER_WE;

    const { baseNumber, suffix, isValidFormat, raw: processedRawInput, isSuffixFormat } = processShipmentNumber(rawInputToSave);
    if (!isValidFormat) { return { success: false, waitingForTotal: false, message: `Ungültiges Format: ${escapeHtml(rawInputToSave)}` }; }

    // --- START DER AKTUALISIERTEN SOUND-LOGIK ---
    if (unexpectedHuSoundToggleEl && unexpectedHuSoundToggleEl.checked) {
        
        const isCurrentHuExpected = isHuExpected(processedRawInput);
        
        // DIESE ZEILE HAT BEI IHNEN GEFEHLT: Wir müssen den Auftrag erst im System suchen!
        const parentHawbByHu = findShipmentByHuNumber(processedRawInput);
        
        // Jetzt weiß das System, was parentHawbByHu ist und kann danach suchen:
        const isNachlieferungHu = parentHawbByHu && parentHawbByHu.toUpperCase().indexOf('NACHLIEFERUNG') !== -1;

        if (isNachlieferungHu) {
            playNachlieferungSound();
        } else if (!isCurrentHuExpected && !isSuffixFormat && !loadShipments()[baseNumber] && hasActiveHuListOrders()) {
            // Überzählig-Ton: Nummer steht auf keiner aktiven HU-Liste (bisher war der Ton definiert, wurde aber nie ausgelöst).
            // Nicht bei normalen Sendungsnummern (Suffix-Format …+0001 / …0001), nicht bei bekannten Einzelsendungen und
            // nur, wenn überhaupt HU-Listen im System sind – sonst würde jeder Scan einer neuen Einzelsendung piepen.
            playShortErrorSound();
        }
    }
    // --- ENDE DER AKTUALISIERTEN SOUND-LOGIK ---

    const shipments = loadShipments();
    const parentHawb = findShipmentByHuNumber(processedRawInput);

    // ... (der restliche Code der Funktion bleibt unverändert) ...
    
    // --- LOGIK FÜR HU-LISTEN-AUFTRÄGE ---
    if (parentHawb) {
        const parentShipment = shipments[parentHawb];
        const now = new Date();
        const noteText = noteInputEl.value.trim() || null;
        const isNewScanKombi = (KOMBI_CAPABLE_STATUSES.includes(statusToUse) && isCombinationFromCheckbox);
        const isSecurityStatus = EXCLUSIVE_SECURITY_STATUSES.includes(statusToUse);
        const isFinalClearanceScan = isSecurityStatus && !isNewScanKombi;

        const packageLimitForThisHu = parentShipment.scannedItems.filter(item => 
            item.rawInput.toUpperCase() === processedRawInput.toUpperCase() && 
            (item.status === 'Anstehend' || EXCLUSIVE_SECURITY_STATUSES.includes(item.status))
        ).length;

        if (isFinalClearanceScan) {
            const anstehendIndex = parentShipment.scannedItems.findIndex(i => i.rawInput.toUpperCase() === processedRawInput.toUpperCase() && i.status === 'Anstehend' && !i.isCancelled);
            if (anstehendIndex === -1) { 
                return { success: false, waitingForTotal: false, message: `FEHLER: Für HU ${escapeHtml(processedRawInput)} ist keine offene Sicherung mehr möglich.` }; 
            }
            const itemToUpdate = parentShipment.scannedItems[anstehendIndex];
            itemToUpdate.status = statusToUse;
            itemToUpdate.timestamp = now.toISOString();
            itemToUpdate.isCombination = false;
            if (noteText) itemToUpdate.notes.push(noteText);
        } else {
            let currentScansOfType = 0;
            if(isNewScanKombi) {
                currentScansOfType = parentShipment.scannedItems.filter(item => item.rawInput.toUpperCase() === processedRawInput.toUpperCase() && item.isCombination && !item.isCancelled).length;
            } else {
                 currentScansOfType = parentShipment.scannedItems.filter(item => item.rawInput.toUpperCase() === processedRawInput.toUpperCase() && item.status === statusToUse && !item.isCancelled).length;
            }
            if (currentScansOfType >= packageLimitForThisHu) {
                const scanTypeText = isNewScanKombi ? 'Kombi-Sicherung' : statusToUse;
                return { success: false, waitingForTotal: false, message: `FEHLER: Limit (${packageLimitForThisHu}) für '${scanTypeText}' bei HU ${escapeHtml(processedRawInput)} erreicht.` };
            }
            const existingItemIndex = parentShipment.scannedItems.findIndex(i => i.rawInput.toUpperCase() === processedRawInput.toUpperCase());
            if (existingItemIndex === -1) { return { success: false, waitingForTotal: false, message: `FEHLER: HU ${escapeHtml(processedRawInput)} nicht im Auftrag ${parentHawb} gefunden.` }; }

            const originalItem = parentShipment.scannedItems[existingItemIndex];
            const newItem = {
                rawInput: processedRawInput, status: statusToUse, timestamp: now.toISOString(),
                isCombination: isNewScanKombi, notes: noteText ? [noteText] : [],
                isCancelled: false, cancelledTimestamp: null, position: originalItem.position,
                sendnr: originalItem.sendnr
            };
            parentShipment.scannedItems.push(newItem);
        }

        if (statusesThatTriggerWE.includes(statusToUse)) {
            const weAlreadyExistsForHu = parentShipment.scannedItems.some(item => 
                !item.isCancelled &&
                item.status === 'Wareneingang' &&
                item.rawInput.toUpperCase() === processedRawInput.toUpperCase()
            );
            if (!weAlreadyExistsForHu) {
                const originalItemForWE = parentShipment.scannedItems.find(i => i.rawInput.toUpperCase() === processedRawInput.toUpperCase());
                const weItem = {
                    rawInput: processedRawInput, status: 'Wareneingang', 
                    timestamp: new Date(now.getTime() + 1).toISOString(),
                    isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null,
                    position: originalItemForWE.position, sendnr: originalItemForWE.sendnr,
                    isAutoGeneratedWE: true 
                };
                parentShipment.scannedItems.push(weItem);
            }
        }

        parentShipment.lastModified = now.toISOString();
        saveShipments(shipments);
        resetSingleScanNoteInputState();
        setTimeout(() => displayCurrentShipmentDetails(parentHawb), 0);
        return { success: true, waitingForTotal: false, message: `Vorgang '${statusToUse}${isNewScanKombi ? ' (Kombi)' : ''}' für HU ${escapeHtml(processedRawInput)} erfasst.` };
    }

    // --- LOGIK FÜR NORMALE SENDUNGEN (NICHT-HU-LISTEN) ---
    if (shipments[baseNumber] && shipments[baseNumber].isHuListOrder) {
        return { success: false, waitingForTotal: false, message: `FEHLER: ${baseNumber} ist ein HU-Auftrag. Bitte scannen Sie eine der zugehörigen HU/VSE-Nummern.` };
    }
    if (!shipments[baseNumber]) {
        const tempIsCombination = (statusToUse === 'XRY' && !isBatchModeActive && isCombinationFromCheckbox);
        const tempFinalIsCombination = NON_COUNTING_STATUSES.includes(statusToUse) ? false : tempIsCombination;
        pendingScanDataForNewShipment = { baseNumber, rawInput: processedRawInput, status: statusToUse, isCombination: tempFinalIsCombination, note: noteInputEl.value.trim() || null, timestamp: new Date().toISOString(), suffix };
        newTotalLabelEl.textContent = `Erwartete gesamtstückzahl für NEUE Sendung ${escapeHtml(baseNumber)}:`; newTotalInputEl.value = ''; newTotalSectionEl.classList.remove('warning-existing'); toggleMainInputControls(false); newTotalInputEl.focus();
        return { success: false, waitingForTotal: true, message: `Bitte gesamtstückzahl für ${escapeHtml(baseNumber)} eingeben oder überspringen.` };
    }
    
    const shipment = shipments[baseNumber];
    const isCombination = (statusToUse === 'XRY' && isCombinationFromCheckbox);

    if (isSuffixFormat && !shipment.isHuListOrder) {
        const existingItemsForThisSuffix = shipment.scannedItems.filter(item => !item.isCancelled && item.rawInput.toUpperCase() === processedRawInput.toUpperCase());
        const isNewScanCounting = EXCLUSIVE_SECURITY_STATUSES.includes(statusToUse) && !isCombination;
        if (isNewScanCounting && existingItemsForThisSuffix.some(item => EXCLUSIVE_SECURITY_STATUSES.includes(item.status) && !item.isCombination)) {
            return { success: false, message: `FEHLER: Packstück ${escapeHtml(processedRawInput)} wurde bereits final gesichert.` };
        }
        if (isCombination && existingItemsForThisSuffix.some(item => item.isCombination)) {
            return { success: false, message: `FEHLER: Packstück ${escapeHtml(processedRawInput)} wurde bereits als Kombi-Sicherung erfasst.` };
        }
        if (statusToUse === 'Dunkelalarm' && existingItemsForThisSuffix.some(item => item.status === 'Dunkelalarm')) {
            return { success: false, message: `FEHLER: Packstück ${escapeHtml(processedRawInput)} wurde bereits als Dunkelalarm erfasst.` };
        }
        if (statusToUse === 'Wareneingang' && existingItemsForThisSuffix.some(item => item.status === 'Wareneingang')) {
            return { success: false, message: `FEHLER: Für Packstück ${escapeHtml(processedRawInput)} wurde bereits der Wareneingang erfasst.` };
        }
    }

    const expectedTotal = shipment.totalPiecesExpected;
    const existingNonCancelled = (shipment.scannedItems || []).filter(item => !item.isCancelled);
    if (isCombination && expectedTotal !== null && calculateXryKombiCount(existingNonCancelled) >= expectedTotal) {
        return { success: false, waitingForTotal: false, message: `Limit (${expectedTotal}) für XRY Kombi bei ${baseNumber} erreicht.` };
    }
    if (statusToUse === 'Dunkelalarm' && expectedTotal !== null && calculateDunkelalarmCount(existingNonCancelled) >= expectedTotal) {
        return { success: false, waitingForTotal: false, message: `Limit (${expectedTotal}) für Dunkelalarm bei ${baseNumber} erreicht.` };
    }
    if (statusToUse === 'Wareneingang' && expectedTotal !== null && calculateGoodsReceiptCount(existingNonCancelled) >= expectedTotal) {
        return { success: false, waitingForTotal: false, message: `Limit (${expectedTotal}) für Wareneingang bei ${baseNumber} erreicht.` };
    }
    if (!isCombination && !NON_COUNTING_STATUSES.includes(statusToUse) && expectedTotal !== null && calculateCurrentCountedPieces(existingNonCancelled) >= expectedTotal) {
        return { success: false, waitingForTotal: false, message: `Limit (${expectedTotal}) für normale Scans bei ${baseNumber} erreicht.` };
    }

    const now = new Date();
    const noteText = noteInputEl.value.trim() || null;
    const newItem = { rawInput: processedRawInput, status: statusToUse, timestamp: now.toISOString(), isCombination, notes: noteText ? [noteText] : [], isCancelled: false, cancelledTimestamp: null };
    shipment.scannedItems.push(newItem);

    if (statusesThatTriggerWE.includes(statusToUse)) {
        const weAlreadyExists = shipment.scannedItems.some(item =>
            !item.isCancelled &&
            item.status === 'Wareneingang' &&
            item.rawInput.toUpperCase() === processedRawInput.toUpperCase()
        );
        if (!weAlreadyExists) {
            const weItem = {
                rawInput: processedRawInput, status: 'Wareneingang',
                timestamp: new Date(now.getTime() + 1).toISOString(),
                isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null,
                isAutoGeneratedWE: true
            };
            shipment.scannedItems.push(weItem);
        }
    }

    shipment.lastModified = now.toISOString();
    saveShipments(shipments);
    resetSingleScanNoteInputState();
    
    const updatedShipment = loadShipments()[baseNumber];
    if (updatedShipment && updatedShipment.totalPiecesExpected !== null && calculateCurrentCountedPieces(updatedShipment.scannedItems) === updatedShipment.totalPiecesExpected && !notifiedCompletions.has(baseNumber)) {
        notifyShipmentCompletion(updatedShipment);
    }
    return { success: true, waitingForTotal: false, message: `${processedRawInput} (${statusToUse}) zu ${baseNumber} hinzugefügt.` };
}

        
        
        
        
        
        
            // --- ANFANG DER ÄNDERUNG FÜR BUTTON-LOGIK ---
            function resetNewTotalSectionUI() {
                toggleMainInputControls(true);
                newTotalSectionEl.classList.remove('warning-existing');
                shipmentNumberInputEl.value = '';
                updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
                focusShipmentInput();
            }
            
            confirmNewTotalBtnEl.addEventListener('click', () => {
                if (pendingTotalUpdateInfo) {
                    // Fall: Bestehende Sendung aktualisieren
                    const baseNumber = pendingTotalUpdateInfo.baseNumber;
                    const newTotalExpectedStr = newTotalInputEl.value.trim();
                    let newTotalExpected = null;

                    if (newTotalExpectedStr !== '') {
                        const parsedNum = parseInt(newTotalExpectedStr, 10);
                        if (!isNaN(parsedNum) && parsedNum > 0) {
                            newTotalExpected = parsedNum;
                        } else {
                            alert("Ungültige Eingabe für Stückzahl. Bitte eine positive Zahl eingeben oder Feld leer lassen.");
                            newTotalInputEl.focus();
                            return;
                        }
                    }

                    const shipments = loadShipments();
                    if (shipments[baseNumber]) {
                        shipments[baseNumber].totalPiecesExpected = newTotalExpected;
                        shipments[baseNumber].lastModified = new Date().toISOString();
                        saveShipments(shipments);
                        displayError(`Stückzahl für ${escapeHtml(baseNumber)} aktualisiert.`, 'green', 3000);
                        renderTable();
                        displayCurrentShipmentDetails(baseNumber);
                    }
                    pendingTotalUpdateInfo = null; // Status zurücksetzen
                    resetNewTotalSectionUI();

                } else {
                    // Fall: Neue Sendung erstellen (bisherige Logik)
                    completeNewShipmentSave(newTotalInputEl.value);
                }
            });

            skipNewTotalBtnEl.addEventListener('click', () => {
                if (pendingTotalUpdateInfo) {
                    // Fall: Aktualisierung einer bestehenden Sendung abbrechen
                    displayError('Aktualisierung abgebrochen.', 'orange', 2000);
                    pendingTotalUpdateInfo = null; // Status zurücksetzen
                    resetNewTotalSectionUI();
                    displayCurrentShipmentDetails(shipmentNumberInputEl.value); // Zeige Details der ursprünglichen Eingabe
                } else {
                    // Fall: Neue Sendung ohne Stückzahl erstellen (bisherige Logik)
                    completeNewShipmentSave(null);
                }
            });
            // --- ENDE DER ÄNDERUNG FÜR BUTTON-LOGIK ---

            newTotalInputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewTotalBtnEl.click(); }});
        function completeNewShipmentSave(totalValueInput) {
            if (!pendingScanDataForNewShipment) {
                toggleMainInputControls(true); return;
            }
            let totalExpectedPieces = null;
            if (totalValueInput !== null && totalValueInput.trim() !== '') {
                const parsedTotal = parseInt(totalValueInput, 10);
                if (!isNaN(parsedTotal) && parsedTotal > 0) {
                    totalExpectedPieces = parsedTotal;
                } else {
                    alert("Ungültige Eingabe für Stückzahl. Wird als 'N/A' gespeichert.");
                }
            }

            const shipments = loadShipments();
            const { baseNumber, rawInput, status, isCombination, note, timestamp } = pendingScanDataForNewShipment;
            
            shipments[baseNumber] = {
                hawb: baseNumber,
                lastModified: timestamp,
                totalPiecesExpected: totalExpectedPieces,
                scannedItems: [],
                mitarbeiter: MITARBEITER_NAME
            };
        const newScanItem = {
            rawInput, status, timestamp, isCombination,
            notes: note ? [note] : [], // Notiz als Array speichern
            isCancelled: false, cancelledTimestamp: null
        };
            shipments[baseNumber].scannedItems.push(newScanItem);
            saveShipments(shipments);

            toggleMainInputControls(true);
            resetSingleScanNoteInputState();
            shipmentNumberInputEl.value = '';
            updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
            renderTable();
            displayCurrentShipmentDetails(baseNumber);
            
            const totalMsgPart = totalExpectedPieces !== null ? ` mit ${totalExpectedPieces} erwarteten Stk.` : '';
            displayError(`${escapeHtml(rawInput)} hinzugefügt (Sendung ${escapeHtml(baseNumber)} neu erstellt${totalMsgPart}).`, 'green', 3000);

            const finalCount = calculateCurrentCountedPieces(shipments[baseNumber].scannedItems);
            if (totalExpectedPieces !== null && finalCount === totalExpectedPieces && !notifiedCompletions.has(baseNumber)) {
                notifyShipmentCompletion(shipments[baseNumber]);
            }
            pendingScanDataForNewShipment = null;
            focusShipmentInput();
        }

        function toggleMainInputControls(showMain) {
            const mainControls = [securityStatusSelectEl, comboCheckboxContainerEl, mainActionButtonEl, noteToggleButtonEl];
            if (showMain) {
                mainControls.forEach(el => { if(el) el.style.display = '';}); // NoteToggleButton wird durch updateNoteAndComboVisibility gesteuert
                updateNoteAndComboVisibility(); // Stellt sicher, dass Note-Toggle-Button und Kombi korrekt angezeigt werden
                newTotalSectionEl.classList.remove('visible');
                newTotalSectionEl.style.display = 'none';
                shipmentNumberInputEl.disabled = false;
            } else { // NewTotal Section wird angezeigt
                mainControls.forEach(el => { if(el) el.style.display = 'none';});
                if(noteInputContainerEl) noteInputContainerEl.style.display = 'none'; // Auch das Einzelnotizfeld ausblenden
                newTotalSectionEl.classList.add('visible');
                newTotalSectionEl.style.display = 'flex';
                shipmentNumberInputEl.disabled = true;
                // shipmentNumberInputEl.value = ''; // Wert nicht unbedingt leeren, da er zur Anzeige in NewTotalLabel verwendet wird
                updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
            }
        }


        function openNoteEditModal(targetElement) {
            removeActiveInlineNoteEditor(); // Entfernt ggf. noch alte Reste
        
            const baseNumber = targetElement.dataset.basenumber;
            const itemTimestamp = targetElement.dataset.timestamp;
            const noteIndex = targetElement.dataset.noteIndex; // Kann undefined sein (beim Hinzufügen)
            const isEditing = noteIndex !== undefined;
            
            // Finde das gescannte Item, um die Nummer anzuzeigen
            const shipments = loadShipments();
            const shipment = shipments[baseNumber];
            const item = shipment?.scannedItems.find(i => i.timestamp === itemTimestamp);
            if (!item) return;
        
            const currentNote = isEditing ? item.notes[noteIndex] : '';
        

            noteEditBaseNumberEl.value = baseNumber;
            noteEditTimestampEl.value = itemTimestamp;
            noteEditNoteIndexEl.value = isEditing ? noteIndex : ''; // Leerer String für "neu"
            noteEditTextareaEl.value = currentNote;
        
            // Modal anzeigen
            noteEditModalEl.classList.add('visible');
            document.body.classList.add('modal-open');
            setTimeout(() => noteEditTextareaEl.focus(), 100); // Fokus auf Textarea setzen
        }
        function closeNoteEditModal() {
            noteEditModalEl.classList.remove('visible');
            document.body.classList.remove('modal-open');
            focusShipmentInput();
        }
        

        function saveOrUpdateNote(baseNumber, itemTimestamp, noteIndex, newNoteValue) {
            const shipments = loadShipments();
            const shipment = shipments[baseNumber];
            if (!shipment || !shipment.scannedItems) return;

            const item = shipment.scannedItems.find(i => i.timestamp === itemTimestamp);
            if (!item) return;

            const noteText = newNoteValue.trim();
            const isEditing = noteIndex !== undefined && noteIndex !== null;

            if (isEditing) { // Bearbeiten einer existierenden Notiz
                if (noteText) {
                    item.notes[noteIndex] = noteText; // Aktualisieren
                } else {
                    item.notes.splice(noteIndex, 1); // Löschen, wenn leer gespeichert wird
                }
            } else { // Hinzufügen einer neuen Notiz
                if (noteText) {
                    if (!Array.isArray(item.notes)) item.notes = [];
                    item.notes.push(noteText);
                }
            }

            shipment.lastModified = new Date().toISOString();
            saveShipments(shipments);
            displayCurrentShipmentDetails(baseNumber); // UI neu zeichnen
            focusShipmentInput();
        }

        function requestDeleteNote(baseNumber, itemTimestamp, noteIndex) {
            const shipments = loadShipments();
            const noteToDelete = shipments[baseNumber]?.scannedItems?.find(i => i.timestamp === itemTimestamp)?.notes[noteIndex];
            if(confirm(`Notiz "${noteToDelete}" wirklich l\u00F6schen?`)) {
                 const item = shipments[baseNumber].scannedItems.find(i => i.timestamp === itemTimestamp);
                 item.notes.splice(noteIndex, 1);
                 shipments[baseNumber].lastModified = new Date().toISOString();
                 saveShipments(shipments);
                 displayCurrentShipmentDetails(baseNumber);
                 focusShipmentInput();
            }
        }

        // Reines Darstellungs-Hilfsmittel: Safari (iOS) übernimmt Größenänderungen von Nachbarspalten im Karten-Raster
        // nicht immer in die Zeilenhöhe. Kurzes display:none → Reflow → zurück erzwingt ein sauberes Layout (kein Flackern,
        // passiert innerhalb eines Frames), Daten und Handler bleiben unberührt.
        function forceListRelayout() {
            if (!tableBodyEl) return;
            tableBodyEl.style.display = 'none';
            void tableBodyEl.offsetHeight;
            tableBodyEl.style.display = '';
        }
        function toggleBatchMode(activate) {
            isBatchModeActive = activate;
            clearError();
            resetSingleScanNoteInputState();
            updateNoteAndComboVisibility(); // Combo und Einzelnotiz-Button aktualisieren
            document.body.classList.toggle('batch-mode-active', isBatchModeActive);
            forceListRelayout(); // Safari: Karten nach Ein-/Ausblenden des Stift-Icons frisch layouten (sonst veraltete Zeilenhöhe)


            if (isBatchModeActive) {
                batchStatus = securityStatusSelectEl.value;
                // Kombi-Checkbox-Status für Batch bei Aktivierung übernehmen
                batchIsCombination = (securityStatusSelectEl.value === 'XRY' && comboCheckboxEl.checked);
                const comboText = batchIsCombination ? ' (Kombi)' : '';
                const statusLabel = `${batchStatus}${comboText}`;

                batchModeStatusLabelEl.textContent = statusLabel;
                batchStatusDisplayEl.textContent = `Aktiv (${statusLabel})`;
                mainActionButtonEl.textContent = 'Zum Batch hinzufügen';
                batchAreaEl.classList.add('visible');
                securityStatusSelectEl.disabled = true;
                comboCheckboxEl.disabled = true; // Auch Kombi-Checkbox im Batch sperren
                
                batchNoteToggleEl.checked = false; // <-- HIER IST DIE HINZUGEFÜGTE ZEILE
                currentBatch = [];
                currentBatchGlobalNote = null;
                isBatchNotePromptRequired = true; // Batch-Notiz-Modal soll beim ersten Scan im neuen Batch kommen
                pendingFirstBatchScanData = null;
                updateBatchUI();
                displayCurrentShipmentDetails(''); // Keine Details im Batch Modus anzeigen
            } else {
                if (currentBatch.length > 0) {
                    if (!confirm("Batch-Modus deaktivieren? Nicht gespeicherte Scans im aktuellen Batch gehen verloren!")) {
                        batchModeToggleEl.checked = true; // Zurücksetzen, wenn User abbricht
                        isBatchModeActive = true; // Status beibehalten
                        document.body.classList.toggle('batch-mode-active', true);
                        return;
                    }
                }
                batchStatusDisplayEl.textContent = 'Inaktiv';
                mainActionButtonEl.textContent = 'Hinzuf\u00FCgen';
                batchAreaEl.classList.remove('visible');
                securityStatusSelectEl.disabled = false;
                comboCheckboxEl.disabled = securityStatusSelectEl.value !== 'XRY'; // Entsperren, wenn XRY
                currentBatch = [];
                updateBatchUI();
                // Ggf. Details der aktuellen Eingabe wieder anzeigen
                displayCurrentShipmentDetails(processShipmentNumber(shipmentNumberInputEl.value).baseNumber);
            }
            toggleMainInputControls(true); // Generelle UI-Controls (de)aktivieren
            updateEditButtonVisibilityInTable();
            filterTable(shipmentNumberInputEl.value);
            focusShipmentInput();
        }

        function updateBatchUI() {
            batchListEl.innerHTML = '';
            currentBatch.forEach((batchItem, index) => {
                const li = document.createElement('li');
                const itemDate = new Date(batchItem.scanTimestamp);
                let displayText = `${escapeHtml(batchItem.rawInput)} (${itemDate.toLocaleTimeString('de-DE')})`;
                if (batchItem.note) {
                    displayText += ` - Notiz: ${escapeHtml(batchItem.note)}`;
                }
                li.textContent = displayText;
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'X';
                removeBtn.classList.add('remove-batch-item');
                removeBtn.title = `${escapeHtml(batchItem.rawInput)} aus Batch entfernen`;
                removeBtn.onclick = () => {
                    // --- START DER ÄNDERUNG ---
                    if (confirm(`Soll "${escapeHtml(batchItem.rawInput)}" aus dem Batch entfernt werden?`)) {
                        currentBatch.splice(index, 1);
                        updateBatchUI();
                        if (currentBatch.length === 0) { // Wenn Batch leer wird
                            isBatchNotePromptRequired = true; // Für nächsten Batch wieder Modal
                            currentBatchGlobalNote = null;
                            updateCurrentBatchNoteDisplay();
                        }
                    }
                    // --- ENDE DER ÄNDERUNG ---
                };
                li.appendChild(removeBtn);
                batchListEl.appendChild(li);
            });
            batchItemCountEl.textContent = currentBatch.length;
            // Zähler im Speichern-Knopf (feste Leiste am Handy): „Batch Speichern (7)“; leer → Knopf gedämpft
            const saveCount = document.getElementById('saveBatchCount');
            if (saveCount) { saveCount.textContent = String(currentBatch.length); saveCount.classList.toggle('hidden', currentBatch.length === 0); }
            if (saveBatchButtonEl) saveBatchButtonEl.classList.toggle('is-empty', currentBatch.length === 0);
            updateCurrentBatchNoteDisplay();
        }

        
        function updateCurrentBatchNoteDisplay() {
            if (isBatchModeActive && currentBatchGlobalNote) {
                currentBatchNoteDisplayEl.textContent = `Batch-Notiz: ${escapeHtml(currentBatchGlobalNote)}`;
                currentBatchNoteDisplayEl.style.display = 'block';
            } else {
                currentBatchNoteDisplayEl.textContent = '';
                currentBatchNoteDisplayEl.style.display = 'none';
            }
        }
// --- START DER ÄNDERUNG: Neue Funktion zum Anzeigen des Batch Scan Feedback Modals ---
// --- START DER ÄNDERUNG: showBatchScanFeedback Funktion angepasst ---
// --- START DER ÄNDERUNG: showBatchScanFeedback Funktion angepasst (mit Font Sizing) ---
// --- START DER ÄNDERUNG: showBatchScanFeedback Funktion angepasst ---
// --- START DER ÄNDERUNG: showBatchScanFeedback Funktion angepasst (Land in neue Zeile) ---
function showBatchScanFeedback(scanNumber, isExpected, carrierInfo = null) {
    if (!batchScanFeedbackModalEl) return;

    feedbackScanNumberEl.textContent = scanNumber;
    
    // Aufbau des Carrier/Country Strings mit Zeilenumbruch
    let carrierAndCountryHtml = ''; // Ändern zu Html, da wir <br> verwenden
    if (carrierInfo && (carrierInfo.carrier || carrierInfo.country)) {
        let parts = [];
        if (carrierInfo.carrier) {
            parts.push(`Spediteur: ${carrierInfo.carrier}`);
        }
        if (carrierInfo.country) {
            // Füge <br> hinzu, wenn es bereits einen Spediteur gibt
            // oder wenn nur das Land angezeigt wird.
            parts.push(`Land: ${carrierInfo.country}`);
        }
        // Füge <br> nur dann ein, wenn sowohl Spediteur als auch Land vorhanden sind.
        carrierAndCountryHtml = parts.join('<br>'); 
    }
    feedbackCarrierEl.innerHTML = carrierAndCountryHtml; // innerHTML statt textContent verwenden

    // Hintergrund- und Textfarbe anpassen
    if (isExpected) {
        feedbackScanNumberEl.classList.remove('unexpected');
        batchScanFeedbackModalEl.querySelector('.modal-content').classList.remove('unexpected');
        feedbackScanNumberEl.style.color = 'lime';
    } else {
        feedbackScanNumberEl.classList.add('unexpected');
        batchScanFeedbackModalEl.querySelector('.modal-content').classList.add('unexpected');
        feedbackScanNumberEl.style.color = 'red';
    }

    batchScanFeedbackModalEl.classList.add('visible');
    document.body.classList.add('modal-open');

    setTimeout(() => {
        closeBatchScanFeedbackModalButtonEl.focus();
    }, 100);
}
// --- ENDE DER ÄNDERUNG: showBatchScanFeedback Funktion angepasst (Land in neue Zeile) ---
// ERSETZEN SIE IHRE GESAMTE 'addToBatch' FUNKTION MIT DIESER VERSION

// ERSETZEN SIE IHRE GESAMTE 'addToBatch' FUNKTION MIT DIESER VERSION

function addToBatch() {
    // Wenn das Verdachts-Modal offen ist und ein neuer Scan kommt, wird es geschlossen.
    // Das gilt als implizite "Nein"-Antwort für alle verbleibenden Vorschläge.
    if (suspicionModalEl.classList.contains('visible')) {
        closeSuspicionModal();
    }

    const rawInputFromField = shipmentNumberInputEl.value.trim();
    if (!rawInputFromField) { focusShipmentInput(); return; }

    const upperRawInput = rawInputFromField.toUpperCase();
    const { isValidFormat, raw: processedRawInput } = processShipmentNumber(upperRawInput);
    if (!isValidFormat) {
        displayError(`Ungültiges Format für Batch-Eingabe: ${escapeHtml(rawInputFromField)}`);
        focusShipmentInput();
        return;
    }

        const scanTimestamp = new Date().toISOString();
    const isCurrentHuExpected = isHuExpected(processedRawInput);

    // Sound-Logik
    if (unexpectedHuSoundToggleEl && unexpectedHuSoundToggleEl.checked) {
        // 1. Wir holen den Namen (die Variable heißt "parentHawb")
        const parentHawb = findShipmentByHuNumber(processedRawInput);
        
        // 2. Wir prüfen genau diese Variable "parentHawb"
        const isNachlieferungHu = parentHawb && parentHawb.toUpperCase().indexOf('NACHLIEFERUNG') !== -1;

        if (isNachlieferungHu) {
            playNachlieferungSound();
        } else if (!isCurrentHuExpected && hasActiveHuListOrders()) {
            // Überzählig-Ton: HU steht auf keiner aktiven Liste (im Batch landet sie als roter/„überzähliger“ Eintrag).
            // Bisher war der Ton zwar definiert, wurde aber nie ausgelöst. Ohne HU-Listen im System kein Ton.
            playShortErrorSound();
        }
    }

    
    // Optionales Feedback-Popup
    if (batchFeedbackToggleEl && batchFeedbackToggleEl.checked) {
        const carrier = findCarrierForHu(processedRawInput);
        showBatchScanFeedback(processedRawInput, isCurrentHuExpected, carrier);
    }
    
    // Logik für Notiz-Popup beim ersten Scan
    if (isBatchModeActive && currentBatch.length === 0 && isBatchNotePromptRequired && batchNoteToggleEl.checked) {
        pendingFirstBatchScanData = { rawInput: processedRawInput, scanTimestamp: scanTimestamp };
        batchNoteInputEl.value = currentBatchGlobalNote || ''; 
        batchNoteModalEl.classList.add('visible');
        document.body.classList.add('modal-open');
        batchNoteInputEl.focus();
        return;
    }

    // ===== HIER BEGINNT DIE ÜBERARBEITETE VERDACHTS-LOGIK =====
    if (!isCurrentHuExpected) {
        const similarItems = findAllSimilarExpectedHus(processedRawInput);
        if (similarItems.length > 0) {
            // Verdacht gefunden!
            suspicionQueue = similarItems;
            currentSuspicionIndex = 0;

            // Zuerst den gescannten Wert zum Batch hinzufügen
            const tempBatchItem = {
                rawInput: processedRawInput,
                scanTimestamp: scanTimestamp,
                note: currentBatchGlobalNote 
            };
            currentBatch.unshift(tempBatchItem);
            updateBatchUI();
            
            // Modal mit dem ersten Vorschlag anzeigen
            showSuspicionModal(processedRawInput, 0);

            // Eingabefeld leeren und beenden. Die weitere Logik passiert im Modal.
            shipmentNumberInputEl.value = '';
            updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
            clearError();
            return;
        }
    }
    // ===== ENDE DER ÜBERARBEITETEN VERDACHTS-LOGIK =====

    // Standard-Verhalten: HU zum Batch hinzufügen
    const batchItem = {
        rawInput: processedRawInput,
        scanTimestamp: scanTimestamp,
        note: currentBatchGlobalNote 
    };
    
    currentBatch.unshift(batchItem);
    
    updateBatchUI();
    shipmentNumberInputEl.value = '';
    updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
    clearError();
    focusShipmentInput();
}
    // ===== ENDE DER NEUEN VERDACHTS-LOGIK =====



        function confirmAndAddFirstBatchItemWithNote() {
            const newNote = batchNoteInputEl.value.trim() || null;
            currentBatchGlobalNote = newNote;
            currentBatch.forEach(item => { item.note = newNote; });
            isBatchNotePromptRequired = false;
            batchNoteModalEl.classList.remove('visible');
            document.body.classList.remove('modal-open'); // NEU
            updateBatchUI();
            batchNoteToggleEl.checked = false;

            if (pendingFirstBatchScanData) {
                const batchItem = { ...pendingFirstBatchScanData, note: currentBatchGlobalNote };
                currentBatch.push(batchItem);
                pendingFirstBatchScanData = null;
                updateBatchUI();
                shipmentNumberInputEl.value = '';
                updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
            }
            clearError();
            focusShipmentInput();
        }

function skipNoteAndAddFirstBatchItem() {
            currentBatchGlobalNote = null;
            currentBatch.forEach(item => { item.note = null; });
            isBatchNotePromptRequired = false;
            
            batchNoteModalEl.classList.remove('visible');
            document.body.classList.remove('modal-open'); // <-- DIESE ZEILE IST NEU/KORRIGIERT

            updateBatchUI();
            batchNoteToggleEl.checked = false;

            if (pendingFirstBatchScanData) {
                const batchItem = { ...pendingFirstBatchScanData, note: null };
                currentBatch.push(batchItem);
                pendingFirstBatchScanData = null;
                updateBatchUI();
                shipmentNumberInputEl.value = '';
                updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
            }
            clearError();
            focusShipmentInput();
        }

// --- ERSETZEN Sie die alte Funktion durch diese Version ---

        function skipNoteAndAddFirstBatchItem() {
            currentBatchGlobalNote = null; // Globale Notiz für zukünftige Scans entfernen

            // *** DIE WICHTIGE NEUE LOGIK ***
            // Entferne die Notiz von ALLEN bereits vorhandenen Items im Batch
            currentBatch.forEach(item => {
                item.note = null;
            });
            // *******************************
            
            isBatchNotePromptRequired = false;
            batchNoteModalEl.classList.remove('visible');
            updateBatchUI(); // UI aktualisieren, um die entfernten Notizen zu reflektieren
            batchNoteToggleEl.checked = false; // Schalter nach Benutzung immer deaktivieren

            // Nur wenn ein Scan auf die Verarbeitung wartet, wird er hinzugefügt.
            if (pendingFirstBatchScanData) {
                const batchItem = { ...pendingFirstBatchScanData, note: null };
                currentBatch.push(batchItem);
                pendingFirstBatchScanData = null;
                updateBatchUI(); // UI erneut aktualisieren
                shipmentNumberInputEl.value = '';
                updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
            }
            clearError();
            focusShipmentInput();
        }

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER KORRIGIERTEN VERSION ---

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER KORRIGIERTEN VERSION ---

// --- START DER ÄNDERUNG: Die komplette Funktion wird aktualisiert ---
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER NEUEN VERSION ---

let batchArchiveResolved = false; // Archiv-Rückholung für diesen Batch bereits erledigt
function saveBatch() {
    if (currentBatch.length === 0) { displayError("Batch ist leer."); focusShipmentInput(); return; }

    // Enthält der Batch Nummern archivierter Sendungen (lokal nicht vorhanden), diese ZUERST vom Server zurückholen –
    // sonst würden neue Sendungen mit denselben Nummern angelegt. Danach läuft die Verarbeitung wie gewohnt.
    if (!batchArchiveResolved && archiveAvailable() && archiveKnownBases.size > 0) {
        const local = loadShipments();
        const need = [...new Set(currentBatch.map(bi => processShipmentNumber(bi.rawInput).baseNumber))]
            .filter(b => b && isArchivedBase(b) && !local[b]);
        if (need.length > 0) {
            saveBatchButtonEl.disabled = true;
            displayError(`${need.length} Sendung(en) aus dem Batch liegen im Archiv – werden geholt …`, 'blue');
            fetchArchivedShipments(need).then(found => {
                Object.keys(found).forEach(b => restoreArchivedShipmentLocally(b, found[b]));
                need.forEach(b => { if (!found[b]) forgetArchivedBase(b); });
                clearError();
                batchArchiveResolved = true;
                saveBatch();
            }).catch(e => {
                if (isUnknownActionError(e)) { archiveUnsupported = true; batchArchiveResolved = true; saveBatch(); return; }
                displayError(`Archiv nicht erreichbar – Batch nicht gespeichert, bitte erneut versuchen. (${e.message})`, 'red', 6000);
            }).finally(() => { saveBatchButtonEl.disabled = false; });
            return;
        }
    }
    batchArchiveResolved = false;
    
    const statusesThatTriggerWE = STATUSES_THAT_TRIGGER_WE;

    let successCount = 0;
    let errorCount = 0;
    let errorMessages = [];
    let newBaseShipments = new Set();
    let affectedBaseNumbersForNotification = new Set();

    const shipmentsWorkingCopy = JSON.parse(JSON.stringify(loadShipments()));

    currentBatch.forEach(batchItem => {
        const { rawInput: rawInputFromBatch, scanTimestamp, note: itemNote } = batchItem;
        
        const parentHawb = findShipmentByHuNumber(rawInputFromBatch);

        // --- LOGIK FÜR HU-LISTEN-AUFTRÄGE ---
        if (parentHawb) {
            const parentShipment = shipmentsWorkingCopy[parentHawb];
            const isNewScanKombi = (batchStatus === 'XRY' && batchIsCombination);
            const isSecurityStatus = EXCLUSIVE_SECURITY_STATUSES.includes(batchStatus);
            const isFinalClearanceScan = isSecurityStatus && !isNewScanKombi;

            const packageLimitForThisHu = parentShipment.scannedItems.filter(item => 
                item.rawInput.toUpperCase() === rawInputFromBatch.toUpperCase() &&
                (item.status === 'Anstehend' || EXCLUSIVE_SECURITY_STATUSES.includes(item.status))
            ).length;

            if (isFinalClearanceScan) {
                const anstehendIndex = parentShipment.scannedItems.findIndex(i => i.rawInput.toUpperCase() === rawInputFromBatch.toUpperCase() && i.status === 'Anstehend' && !i.isCancelled);
                if (anstehendIndex === -1) {
                    errorCount++; errorMessages.push(`Alle (${packageLimitForThisHu}) Packstücke für HU ${rawInputFromBatch} bereits final erfasst.`); return;
                }
                const itemToUpdate = parentShipment.scannedItems[anstehendIndex];
                itemToUpdate.status = batchStatus; itemToUpdate.timestamp = scanTimestamp;
                itemToUpdate.isCombination = false; itemToUpdate.notes = itemNote ? [itemNote] : [];
                itemToUpdate.isCancelled = false; itemToUpdate.cancelledTimestamp = null;
            } else {
                let currentScansOfType = 0;
                if (isNewScanKombi) {
                    currentScansOfType = parentShipment.scannedItems.filter(item => item.rawInput.toUpperCase() === rawInputFromBatch.toUpperCase() && item.isCombination && !item.isCancelled).length;
                } else {
                    currentScansOfType = parentShipment.scannedItems.filter(item => item.rawInput.toUpperCase() === rawInputFromBatch.toUpperCase() && item.status === batchStatus && !item.isCancelled).length;
                }

                if (currentScansOfType >= packageLimitForThisHu) {
                    const scanTypeText = isNewScanKombi ? 'Kombi-Sicherung' : batchStatus;
                    errorCount++; errorMessages.push(`Limit (${packageLimitForThisHu}) für '${scanTypeText}' bei HU ${rawInputFromBatch} erreicht.`); return;
                }

                const originalItem = parentShipment.scannedItems.find(i => i.rawInput.toUpperCase() === rawInputFromBatch.toUpperCase());
                const newScanItem = {
                    rawInput: rawInputFromBatch, status: batchStatus, timestamp: scanTimestamp,
                    isCombination: isNewScanKombi, notes: itemNote ? [itemNote] : [],
                    isCancelled: false, cancelledTimestamp: null, position: originalItem.position, sendnr: originalItem.sendnr
                };
                parentShipment.scannedItems.push(newScanItem);
            }

            if (statusesThatTriggerWE.includes(batchStatus)) {
                const originalItemForWE = parentShipment.scannedItems.find(i => i.rawInput.toUpperCase() === rawInputFromBatch.toUpperCase());
                const weItem = {
                    rawInput: rawInputFromBatch, status: 'Wareneingang',
                    timestamp: new Date(new Date(scanTimestamp).getTime() + 1).toISOString(),
                    isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null,
                    position: originalItemForWE.position, sendnr: originalItemForWE.sendnr,
                    isAutoGeneratedWE: true // <-- NEUES FLAG
                };
                parentShipment.scannedItems.push(weItem);
            }

            parentShipment.lastModified = scanTimestamp;
            affectedBaseNumbersForNotification.add(parentHawb);
            successCount++;
            return;
        }
        
        // --- LOGIK FÜR NORMALE SENDUNGEN (NICHT-HU-LISTEN) ---
        const { baseNumber, isValidFormat, raw: processedRawInput, isSuffixFormat } = processShipmentNumber(rawInputFromBatch);
        if (!isValidFormat) {
            errorCount++; errorMessages.push(`Ungültiges Format: ${escapeHtml(rawInputFromBatch)}`); return;
        }
        if (!shipmentsWorkingCopy[baseNumber]) {
            newBaseShipments.add(baseNumber);
            shipmentsWorkingCopy[baseNumber] = {
                hawb: baseNumber, lastModified: scanTimestamp, totalPiecesExpected: null,
                scannedItems: [], mitarbeiter: MITARBEITER_NAME
            };
        }
        const shipmentToUpdate = shipmentsWorkingCopy[baseNumber];

        if (isSuffixFormat && !shipmentToUpdate.isHuListOrder) {
            const existingItemsForThisSuffix = shipmentToUpdate.scannedItems.filter(item => !item.isCancelled && item.rawInput.toUpperCase() === processedRawInput.toUpperCase());
            const isBatchScanCounting = EXCLUSIVE_SECURITY_STATUSES.includes(batchStatus) && !batchIsCombination;

            if (isBatchScanCounting && existingItemsForThisSuffix.some(item => EXCLUSIVE_SECURITY_STATUSES.includes(item.status) && !item.isCombination)) {
                errorCount++; errorMessages.push(`${escapeHtml(processedRawInput)}: bereits final gesichert`); return;
            }
            if (batchStatus === 'XRY' && batchIsCombination && existingItemsForThisSuffix.some(item => item.isCombination)) {
                errorCount++; errorMessages.push(`${escapeHtml(processedRawInput)}: bereits als Kombi erfasst`); return;
            }
            if (batchStatus === 'Dunkelalarm' && existingItemsForThisSuffix.some(item => item.status === 'Dunkelalarm')) {
                 errorCount++; errorMessages.push(`${escapeHtml(processedRawInput)}: bereits als Dunkelalarm erfasst`); return;
            }
        }
        const expectedTotal = shipmentToUpdate.totalPiecesExpected;
        if (!NON_COUNTING_STATUSES.includes(batchStatus) && !batchIsCombination && expectedTotal !== null) {
            if (calculateCurrentCountedPieces(shipmentToUpdate.scannedItems) >= expectedTotal) {
                errorCount++; errorMessages.push(`Limit (${expectedTotal}) für ${escapeHtml(baseNumber)} erreicht bei Scan ${escapeHtml(processedRawInput)}`); return;
            }
        }
        const newScanItem = {
            rawInput: processedRawInput, status: batchStatus, timestamp: scanTimestamp,
            isCombination: batchIsCombination, notes: itemNote ? [itemNote] : [],
            isCancelled: false, cancelledTimestamp: null
        };
        shipmentToUpdate.scannedItems.push(newScanItem);

        if (statusesThatTriggerWE.includes(batchStatus)) {
            const weItem = {
                rawInput: processedRawInput, status: 'Wareneingang',
                timestamp: new Date(new Date(scanTimestamp).getTime() + 1).toISOString(),
                isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null,
                isAutoGeneratedWE: true // <-- NEUES FLAG
            };
            shipmentToUpdate.scannedItems.push(weItem);
        }

        shipmentToUpdate.lastModified = scanTimestamp;
        affectedBaseNumbersForNotification.add(baseNumber);
        successCount++;
    });

    saveShipments(shipmentsWorkingCopy);
    affectedBaseNumbersForNotification.forEach(bn => {
        const finalShipmentState = shipmentsWorkingCopy[bn];
        if (finalShipmentState && finalShipmentState.totalPiecesExpected !== null) {
            const finalCount = calculateCurrentCountedPieces(finalShipmentState.scannedItems);
            if (finalCount === finalShipmentState.totalPiecesExpected && !notifiedCompletions.has(bn)) {
                notifyShipmentCompletion(finalShipmentState);
            }
        }
    });
    
    let alertMessage = `Batch Verarbeitung:\n- Erfolgreich: ${successCount}\n- Fehler/Übersprungen: ${errorCount}`;
    if (newBaseShipments.size > 0) {
        alertMessage += `\n- Neue Sendungen erstellt für: ${[...newBaseShipments].join(', ')}`;
    }
    if (errorMessages.length > 0) {
        alertMessage += `\n\nDetails:\n- ${errorMessages.join('\n- ')}`;
    }
    alert(alertMessage);
    
    renderTable();
    currentBatch = [];
    isBatchNotePromptRequired = true;
    currentBatchGlobalNote = null; 
    batchNoteToggleEl.checked = false; 
    updateBatchUI();
    displayCurrentShipmentDetails('');
    focusShipmentInput();
}













        // --- Sonstige Aktionen (Löschen, PDF, Edit Modal) ---
        function deleteShipment(baseNumber) {
            const shipments = loadShipments();
            if (shipments[baseNumber]) {
                delete shipments[baseNumber];
                saveShipments(shipments);
                renderTable();
                const currentInputBase = processShipmentNumber(shipmentNumberInputEl.value).baseNumber;
                if (currentInputBase === baseNumber) { // Wenn gelöschte Sendung angezeigt wurde
                    displayCurrentShipmentDetails('');
                } else {
                    displayCurrentShipmentDetails(currentInputBase);
                }
                clearError();
            }
            focusShipmentInput();
        }
        // --- START: NEUE HILFSFUNKTION FÜR DUNKELALARM ---
        function calculateDunkelalarmCount(scannedItems) {
            if (!Array.isArray(scannedItems)) return 0;
            // Zählt nur nicht-stornierte Scans mit dem Status "Dunkelalarm"
            return scannedItems.filter(item => 
                item.status === 'Dunkelalarm' && 
                !item.isCancelled
            ).length;
        }
        // OFFENE Dunkelalarme: ein Dunkelalarm gilt als erledigt, sobald dieselbe HU DANACH mit einem Sicherungsstatus
        // (XRY/ETD/EDD/PHS/VCK) erfasst wurde. Der Dunkelalarm-Eintrag bleibt als Protokoll in der Zeitleiste
        // (und auf der Seite „Dunkelalarm“) – nur Ampel, Zähler und Kachel werten ihn nicht mehr als offen.
        // Normale Sendungen (kein HU-Auftrag, alle Scans tragen dieselbe Nummer): erledigt, sobald genug
        // Sicherungsscans für die Stückzahl vorliegen – sonst: ein Dunkelalarm nach dem Zeitpunkt gilt als erledigt,
        // wenn danach eine Sicherung folgte.
        function calculateOpenDunkelalarmCount(scannedItems, shipment) {
            if (!Array.isArray(scannedItems)) return 0;
            const alarms = scannedItems.filter(item => item && item.status === 'Dunkelalarm' && !item.isCancelled);
            if (!alarms.length) return 0;
            const isSecured = it => it && !it.isCancelled && EXCLUSIVE_SECURITY_STATUSES.includes(it.status);
            if (shipment && !shipment.isHuListOrder) {
                const expected = shipment.totalPiecesExpected;
                const secured = scannedItems.filter(it => isSecured(it) && !it.isCombination).length;
                if (expected !== null && expected !== undefined && expected > 0 && secured >= expected) return 0;
            }
            return alarms.filter(a => {
                const t = Date.parse(a.timestamp) || 0;
                return !scannedItems.some(it => isSecured(it)
                    && String(it.rawInput).toUpperCase() === String(a.rawInput).toUpperCase()
                    && (Date.parse(it.timestamp) || 0) >= t);
            }).length;
        }
        // --- ENDE: NEUE HILFSFUNKTION FÜR DUNKELALARM ---
        function requestCancelScanItem(baseNumber, itemTimestamp) {
            if (confirm(`Soll dieser Scan-Eintrag wirklich storniert werden?\nZeit: ${new Date(itemTimestamp).toLocaleString('de-DE')}`)) {
                cancelScanItem(baseNumber, itemTimestamp);
            }
        }
        function cancelScanItem(baseNumber, itemTimestamp) {
            const shipments = loadShipments();
            const shipment = shipments[baseNumber];
            if (!shipment || !shipment.scannedItems) return;

            const itemToCancel = shipment.scannedItems.find(item => item.timestamp === itemTimestamp && !item.isCancelled);

            if (itemToCancel) {
                const now = new Date();
                itemToCancel.isCancelled = true;
                itemToCancel.cancelledTimestamp = now.toISOString();

                // *** HIER IST DIE KORREKTUR ***
                // Wenn es sich um einen HU-Auftrag handelt UND der stornierte Status ein exklusiver Sicherheitsstatus war,
                // erstellen wir einen neuen "Anstehend"-Platzhalter, um die HU wieder scannbar zu machen.
                // Kombi-Sicherungen zählen nicht und haben den Platz „Anstehend“ nie belegt → kein neuer Platzhalter
                if (shipment.isHuListOrder && EXCLUSIVE_SECURITY_STATUSES.includes(itemToCancel.status) && !itemToCancel.isCombination) {
                    const newPlaceholderItem = {
                        rawInput: itemToCancel.rawInput, // Die gleiche HU-Nummer
                        status: 'Anstehend',
                        timestamp: now.toISOString(), // Neuer Zeitstempel für den Platzhalter
                        isCombination: false,
                        notes: [],
                        isCancelled: false,
                        cancelledTimestamp: null,
                        // Platz behält seine Nummer und Packdaten – sonst rutscht er ohne Position ans Ende der Packstücktabelle
                        position: itemToCancel.position, sendnr: itemToCancel.sendnr,
                        packaging: itemToCancel.packaging || null, dimensions: itemToCancel.dimensions || null, grossWeight: itemToCancel.grossWeight || null
                    };
                    shipment.scannedItems.push(newPlaceholderItem);
                }
                // *** ENDE DER KORREKTUR ***

                shipment.lastModified = now.toISOString();
                saveShipments(shipments);
                displayCurrentShipmentDetails(baseNumber);
                renderTable();
                clearError();
            } else {
                displayError("Fehler: Eintrag zum Stornieren nicht gefunden oder bereits storniert.");
            }
            focusShipmentInput();
        }
        
        function openEditModal(baseNumber) {
            removeActiveInlineNoteEditor();
            const shipments = loadShipments();
            const shipment = shipments[baseNumber];
            if (!shipment) { displayError(`Sendung ${escapeHtml(baseNumber)} nicht gefunden.`); return; }
            
            editShipmentBaseNumberInputEl.value = baseNumber;
            editShipmentNumberDisplayEl.value = baseNumber;
            editTotalPiecesExpectedInputEl.value = shipment.totalPiecesExpected ?? '';
            editGoodsReceiptCountInputEl.value = ''; 
            
            editModalEl.classList.add('visible');
            document.body.classList.add('modal-open');
            // NEU: Diese Zeile auskommentieren, um die Tastatur zu unterdrücken.
            // editTotalPiecesExpectedInputEl.focus();
        }
        function closeEditModal() {
            editModalEl.classList.remove('visible');
            document.body.classList.remove('modal-open'); // NEU
            focusShipmentInput();
        }

        function saveShipmentChangesFromModal() {
            const baseNumber = editShipmentBaseNumberInputEl.value;
            const newTotalExpectedStr = editTotalPiecesExpectedInputEl.value.trim();
            const manualReceiptCountStr = editGoodsReceiptCountInputEl.value.trim();

            let newTotalExpected = null;
            if (!baseNumber) { displayError("Fehler: Keine Sendungsnummer zum Speichern."); return; }

            if (newTotalExpectedStr !== '') {
                const parsedNum = parseInt(newTotalExpectedStr, 10);
                if (!isNaN(parsedNum) && parsedNum > 0) {
                    newTotalExpected = parsedNum;
                } else {
                    alert("Ungültige Eingabe für Stückzahl. Bitte eine positive Zahl eingeben oder Feld leer lassen.");
                    editTotalPiecesExpectedInputEl.focus(); return;
                }
            }
            
            const shipments = loadShipments();
            if (!shipments[baseNumber]) { displayError(`Fehler: Sendung ${escapeHtml(baseNumber)} nicht mehr gefunden.`); closeEditModal(); return; }
            
            shipments[baseNumber].totalPiecesExpected = newTotalExpected;

            if (manualReceiptCountStr !== '') {
                const manualReceiptCount = parseInt(manualReceiptCountStr, 10);
                if (isNaN(manualReceiptCount) || manualReceiptCount < 0) {
                    alert("Ungültige Eingabe für Anzahl Wareneingang. Bitte eine positive Zahl eingeben.");
                    editGoodsReceiptCountInputEl.focus();
                    return;
                }
                
                shipments[baseNumber].scannedItems = shipments[baseNumber].scannedItems.filter(item => item.status !== 'Wareneingang');

                for (let i = 0; i < manualReceiptCount; i++) {
                    shipments[baseNumber].scannedItems.push({
                        // --- ÄNDERUNG HIER ---
                        rawInput: baseNumber, // Anstatt 'Manuell erfasst' wird die Sendungsnummer verwendet
                        // --- ENDE DER ÄNDERUNG ---
                        status: 'Wareneingang',
                        timestamp: new Date().toISOString(),
                        isCombination: false,
                        notes: [],
                        isCancelled: false,
                        cancelledTimestamp: null
                    });
                }
            }

            shipments[baseNumber].lastModified = new Date().toISOString();
            saveShipments(shipments);
            
            closeEditModal();
            renderTable();
            displayCurrentShipmentDetails(baseNumber);
            displayError(`Änderungen für ${escapeHtml(baseNumber)} gespeichert.`, 'green', 2500);

            const finalCount = calculateCurrentCountedPieces(shipments[baseNumber].scannedItems);
            if (newTotalExpected !== null && finalCount === newTotalExpected && !notifiedCompletions.has(baseNumber)) {
                notifyShipmentCompletion(shipments[baseNumber]);
            }
        }
        // --- script.js ---

// Fügen Sie DIESE NEUE KONSTANTE HIER OBEN IM SKRIPT EIN,
// idealerweise in der Nähe anderer Konstanten wie WEB_APP_URL, LOCAL_STORAGE_KEY etc.
// ERSETZEN SIE DEN PLATZHALTER MIT IHREM TATSÄCHLICHEN BASE64-STRING!
const FIRMENLOGO_BASE64 = 'data:image/png;base64,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'; // Beispiel-Placeholder, ERSETZEN!

// ... (bestehender Code VOR der generatePdf Funktion) ...

// --- START DER ÄNDERUNG: Die komplette generatePdf Funktion wird aktualisiert ---
function generatePdfInBrowser(event) {
    // Holen der Sendungs- und ggf. VVL-Nummer aus den data-Attributen des geklickten Buttons
    const clickedBaseNumber = event.target.dataset.basenumber;
    const parentOrderNumber = event.target.dataset.parentordernumber; // Die VVL-Nummer, falls vorhanden

    const allShipments = loadShipments(); // Alle gespeicherten Sendungen laden
    let shipmentsToProcess = []; // Liste der Sendungen, die ins PDF sollen
    let pdfTitlePrefix = ''; // Startet leer, wird dynamisch gesetzt

    if (parentOrderNumber) {
        pdfTitlePrefix = `Vorverladeliste ${parentOrderNumber}`;
        shipmentsToProcess = Object.values(allShipments).filter(
            s => s.parentOrderNumber === parentOrderNumber
        ).sort((a, b) => a.hawb.localeCompare(b.hawb)); // Nach Kundennummer sortieren
    } else {
        pdfTitlePrefix = `Sicherheitsprotokoll: ${clickedBaseNumber}`;
        const singleShipment = allShipments[clickedBaseNumber];
        if (singleShipment) {
            shipmentsToProcess.push(singleShipment);
        }
    }

    if (shipmentsToProcess.length === 0) {
        displayError(`Keine Scans für ${parentOrderNumber || clickedBaseNumber} für PDF gefunden.`);
        return;
    }

    if (!jsPDF || typeof jsPDF.API?.autoTable !== 'function') {
        displayError('PDF-Export nicht verfügbar: Die PDF-Bibliothek wurde nicht geladen. Bitte Seite neu laden.');
        return;
    }
    
    try {
        const doc = new jsPDF();
        let currentY = 15;

        doc.setFont('courier');
        const mainHeaderColor = '#333333';
        const subHeaderColor = '#445566';
        const textColor = '#333333';

        const logoWidth = 30;
        const logoHeight = 15;
        const margin = 10;

        if (FIRMENLOGO_BASE64 && FIRMENLOGO_BASE64 !== 'data:image/png;base64,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') {
            doc.addImage(
                FIRMENLOGO_BASE64, 
                'PNG', 
                doc.internal.pageSize.width - margin - logoWidth,
                margin,
                logoWidth, 
                logoHeight
            );
        }

        doc.setTextColor(mainHeaderColor);
        doc.setFontSize(16);
        doc.setFont('courier', 'bold');
        doc.text(pdfTitlePrefix, 14, currentY);
        currentY += 8;

        doc.setTextColor(textColor);
        doc.setFontSize(9);
        doc.setFont('courier', 'normal');
        doc.text(`Mitarbeiter: ${MITARBEITER_NAME}`, 14, currentY); currentY += 4;
        doc.text(`RegB Nummer: ${RAC_NUMMER}`, 14, currentY); currentY += 4;
        doc.text(`Generiert am: ${new Date().toLocaleString('de-DE')}`, 14, currentY); currentY += 8;

        if (parentOrderNumber) {
            let vvlTotalExpected = 0;
            let vvlSecurityScansCount = 0;
            let vvlReceiptScansCount = 0;
            let vvlDunkelalarmCount = 0;

            shipmentsToProcess.forEach(s => {
                if (s.totalPiecesExpected) vvlTotalExpected += s.totalPiecesExpected;
                vvlSecurityScansCount += calculateCurrentCountedPieces(s.scannedItems);
                vvlReceiptScansCount += calculateGoodsReceiptCount(s.scannedItems);
                vvlDunkelalarmCount += calculateDunkelalarmCount(s.scannedItems);
            });

            doc.setTextColor(subHeaderColor);
            doc.setFontSize(10);
            doc.setFont('courier', 'bold');
            doc.text(`Gesamt\u00FCersicht Vorverladeliste ${parentOrderNumber}:`, 14, currentY); currentY += 6;
            
            doc.setTextColor(textColor);
            doc.setFontSize(9);
            doc.setFont('courier', 'normal');
            doc.text(`Erwartete Gesamtstücke: ${vvlTotalExpected > 0 ? vvlTotalExpected : 'N/A'}`, 18, currentY); currentY += 4;
            doc.text(`WE erfasst: ${vvlReceiptScansCount} von ${vvlTotalExpected > 0 ? vvlTotalExpected : 'N/A'} Stk.`, 18, currentY); currentY += 4;
            doc.text(`Sich. erfasst: ${vvlSecurityScansCount} von ${vvlTotalExpected > 0 ? vvlTotalExpected : 'N/A'} Stk.`, 18, currentY); currentY += 4;
            doc.text(`Dunkelalarm: ${vvlDunkelalarmCount} Stk.`, 18, currentY); currentY += 8;
        }

        for (const shipment of shipmentsToProcess) {
            if (currentY + 60 > doc.internal.pageSize.height) { 
                doc.addPage();
                currentY = 15;
                 if (FIRMENLOGO_BASE64 && FIRMENLOGO_BASE64 !== 'data:image/png;base64,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') { // Platzhalter für Base64
                    doc.addImage(
                        FIRMENLOGO_BASE64, 
                        'PNG', 
                        doc.internal.pageSize.width - margin - logoWidth, 
                        margin, 
                        logoWidth, 
                        logoHeight
                    );
                }
            }

            doc.setTextColor(subHeaderColor);
            doc.setFontSize(11);
            doc.setFont('courier', 'bold');
            if (parentOrderNumber) {
                doc.text(`Kundennummer: ${shipment.hawb}`, 14, currentY);
            } else {
                doc.text(`Sendung: ${shipment.hawb}`, 14, currentY);
            }
            currentY += 6;

            doc.setTextColor(textColor);
            doc.setFontSize(9);
            doc.setFont('courier', 'normal');
            let summaryLine = `Erw.: ${shipment.totalPiecesExpected !== null ? shipment.totalPiecesExpected : 'N/A'} Stk. | WE: ${calculateGoodsReceiptCount(shipment.scannedItems)} Stk. | Sich.: ${calculateCurrentCountedPieces(shipment.scannedItems)} Stk. | DA: ${calculateDunkelalarmCount(shipment.scannedItems)} Stk.`;
            doc.text(summaryLine, 18, currentY); currentY += 4;

            if (shipment.plsoNumber && shipment.plsoNumber !== 'N/A') {
                doc.text(`PLSO: ${shipment.plsoNumber}`, 18, currentY); currentY += 4;
            }
            if (shipment.freightForwarder) {
                 doc.text(`Spediteur: ${shortenForwarderName(shipment.freightForwarder)}`, 18, currentY); currentY += 4;
            }
            if (shipment.destinationCountry) {
                doc.text(`Land: ${shipment.destinationCountry}`, 18, currentY); currentY += 4;
            }

            currentY += 5;

            if (shipment.isHuListOrder) {
                const missingReceiptHus = getMissingReceiptHusForShipment(shipment);
                if (missingReceiptHus.length > 0) {
                    const estimatedLines = missingReceiptHus.length * 4;
                    if (currentY + estimatedLines + 15 > doc.internal.pageSize.height) { 
                        doc.addPage();
                        currentY = 15;
                        if (FIRMENLOGO_BASE64 && FIRMENLOGO_BASE64 !== 'data:image/png;base64,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') { // Platzhalter für Base64
                            doc.addImage(
                                FIRMENLOGO_BASE64, 
                                'PNG', 
                                doc.internal.pageSize.width - margin - logoWidth, 
                                margin, 
                                logoWidth, 
                                logoHeight
                            );
                        }
                    }

                    doc.setTextColor(subHeaderColor);
                    doc.setFontSize(10);
                    doc.setFont('courier', 'bold');
                    doc.text(`Fehlender Wareneingang (${missingReceiptHus.length} Positionen):`, 14, currentY);
                    currentY += 6;

                    doc.setTextColor('#FF0000');
                    doc.setFontSize(9);
                    doc.setFont('courier', 'normal');
                    
                    const isManOrder = shipment.freightForwarder && shipment.destinationCountry;
                    missingReceiptHus.sort((a, b) => (a.position || 9999) - (b.position || 9999)).forEach(item => {
                        let huDisplay = `${item.rawInput}`;
                        if (item.sendnr) huDisplay += ` (Send.: ${item.sendnr})`;
                        if (isManOrder && item.position) huDisplay = `${item.position}. ${huDisplay}`;
                        
                        doc.text(huDisplay, 18, currentY);
                        currentY += 4;
                    });
                    currentY += 5;
                    doc.setTextColor(textColor);
                }
            }
            
            const scannedItemsForPdf = (shipment.scannedItems || [])
                .filter(item => item.status !== 'Anstehend')
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            if (scannedItemsForPdf.length > 0) {
                const tableData = scannedItemsForPdf.map(item => {
                    let statusText = item.status;
                    if (item.isCombination) statusText += ' (Kombi)';
                    if (item.isCancelled) statusText += ' (Storniert)';
                    let noteText = '';
                    if (item.notes && item.notes.length > 0) {
                        noteText = ` Notizen: ${item.notes.join('; ')}`;
                    }
                    const huOrVse = item.sendnr ? `${item.rawInput} (S: ${item.sendnr})` : item.rawInput;
                    return [
                        new Date(item.timestamp).toLocaleString('de-DE'),
                        huOrVse, 
                        RAC_NUMMER, 
                        MITARBEITER_NAME, 
                        statusText + noteText
                    ];
                });

                doc.autoTable({
                    head: [['Zeitstempel', 'Gescannte Nummer', 'RegB', 'Mitarbeiter', 'Status/Notiz']],
                    body: tableData, 
                    startY: currentY, 
                    theme: 'grid',
                    headStyles: { 
                        fillColor: [230, 230, 230],
                        textColor: 0, 
                        fontStyle: 'bold', 
                        fontSize: 8,
                        font: 'courier'
                    },
                    styles: { 
                        fontSize: 7,
                        cellPadding: 1,
                        overflow: 'linebreak',
                        font: 'courier',
                        textColor: textColor
                    },
                    columnStyles: { 
                        0:{cellWidth:28},
                        1:{cellWidth:45},
                        2:{cellWidth:25},
                        3:{cellWidth:25},
                        4:{cellWidth:'auto'}
                    },
                    didParseCell: function (data) {
                         const originalItem = scannedItemsForPdf[data.row.index];
                        if (originalItem && originalItem.isCancelled) { 
                            data.cell.styles.textColor = [150,150,150];
                            data.cell.styles.fontStyle = 'italic';
                        }
                    }
                });
                currentY = doc.autoTable.previous.finalY + 8;
            } else {
                doc.setTextColor(textColor);
                doc.setFontSize(9);
                doc.setFont('courier', 'italic');
                doc.text("Keine erfassten Scans für diesen Auftrag.", 14, currentY);
                currentY += 8;
            }
            currentY += 5;
        }

        let scansForFinalSummary = [];
        if (parentOrderNumber) {
            shipmentsToProcess.forEach(s => {
                scansForFinalSummary = scansForFinalSummary.concat(s.scannedItems);
            });
        } else {
            scansForFinalSummary = shipmentsToProcess[0].scannedItems;
        }
        
        const validScans = scansForFinalSummary.filter(item => 
            !item.isCombination && 
            !item.isCancelled && 
            !NON_COUNTING_STATUSES.includes(item.status)
        );

        let summaryString = "Sicherheitsstatus: ";

        if (validScans.length > 0) {
            const statusCounts = validScans.reduce((acc, item) => {
                acc[item.status] = (acc[item.status] || 0) + 1;
                return acc;
            }, {});

            const uniqueMethods = Object.keys(statusCounts).sort();

            if (uniqueMethods.length > 0) {
                const summaryParts = uniqueMethods.map(status => {
                    return `${status} (${statusCounts[status]}x)`;
                });
                summaryString += "SPX by " + summaryParts.join(', ');
            } else {
                summaryString += "Keine zählende Sicherungsmethode angewendet.";
            }
        } else {
            summaryString += "Keine zählende Sicherungsmethode angewendet.";
        }
        
        doc.setTextColor(subHeaderColor);
        doc.setFontSize(10); 
        doc.setFont('courier', 'bold');
        if (currentY + 10 > doc.internal.pageSize.height) { doc.addPage(); currentY = 15; }
        doc.text(summaryString, 14, currentY);

        // doc.output('dataurlnewwindow'); // PDF im Browser anzeigen (deaktiviert)
        clearError(); // Fehlermeldung löschen
    } catch (error) { 
        console.error("PDF Fehler:", error); 
        displayError("Fehler beim Erstellen/Öffnen des PDFs: " + error.message);
    }
    // focusShipmentInput(); // Fokus nicht sofort zurücksetzen, da das Senden asynchron ist
}
    
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER NEUEN VERSION ---

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER KORRIGIERTEN VERSION ---

// In script.js
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER VERSION ---

async function sendPdfEmailViaBackend(event, shipmentsPool) {
    const pdfButton = event.target;
    pdfButton.disabled = true;
    const originalText = pdfButton.textContent;
    pdfButton.textContent = 'Sende E-Mail...';

    const clickedBaseNumber = pdfButton.dataset.basenumber;
    const parentOrderNumber = pdfButton.dataset.parentordernumber;

    const allShipments = shipmentsPool || loadShipments(); // Archiv-Treffer liefern ihren eigenen Datenpool
    let shipmentsToProcess = [];
    let pdfTitlePrefix = '';

    if (parentOrderNumber) {
        pdfTitlePrefix = `Vorverladeliste ${parentOrderNumber}`;
        shipmentsToProcess = Object.values(allShipments).filter(
            s => s.parentOrderNumber === parentOrderNumber
        ).sort((a, b) => a.hawb.localeCompare(b.hawb));
    } else {
        pdfTitlePrefix = `Sicherheitsprotokoll: ${clickedBaseNumber}`;
        const singleShipment = allShipments[clickedBaseNumber];
        if (singleShipment) {
            shipmentsToProcess.push(singleShipment);
        }
    }

    if (shipmentsToProcess.length === 0) {
        displayError(`Keine Scans für ${parentOrderNumber || clickedBaseNumber} für PDF gefunden.`);
        pdfButton.disabled = false;
        pdfButton.textContent = originalText;
        return;
    }

    // WICHTIG: Es findet keine Filterung statt. Wir senden die kompletten Daten,
    // damit das Backend die korrekten Summen berechnen kann.
    const payload = {
        action: "sendPdfEmail",
        payload: {
            shipmentsToProcess: shipmentsToProcess, 
            pdfInfo: {
                clickedBaseNumber: clickedBaseNumber,
                parentOrderNumber: parentOrderNumber,
                pdfTitlePrefix: pdfTitlePrefix
            },
            mitarbeiter: MITARBEITER_NAME,
            racNummer: RAC_NUMMER,
            firmenlogoBase64: FIRMENLOGO_BASE64
        }
    };

    try {
        const response = await fetch(WEB_APP_URL_BACKEND, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server Verbindung: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();

        if (result.status === 'success') {
            displayError(`PDF per E-Mail gesendet: ${result.message || 'Erfolg!'}`, 'green', 5000);
        } else {
            throw new Error(`Apps Script Fehler: ${result.message || 'Unbekannt'}`);
        }
    } catch (error) {
        console.error("Fehler beim Senden des PDF per E-Mail:", error);
        displayError(`Fehler beim Senden des PDF: ${error.message}`, 'red', 10000);
    } finally {
        pdfButton.disabled = false;
        pdfButton.textContent = originalText;
        focusShipmentInput();
    }
}

        // --- START DER ÄNDERUNG: Neue Hilfsfunktion ---
        /**
         * Ermittelt alle HU-Nummern einer HU-Liste, für die noch kein Wareneingang erfasst wurde.
         * @param {object} shipment Das Sendungs-Objekt.
         * @returns {Array<object>} Eine Liste der fehlenden HU-Items (mit rawInput, sendnr, position etc.).
         */
        function getMissingReceiptHusForShipment(shipment) {
            // Nur für HU-Listen-Aufträge relevant
            if (!shipment.isHuListOrder || !shipment.scannedItems) {
                return [];
            }

            const securityClearanceStatuses = EXCLUSIVE_SECURITY_STATUSES;
            
            // Alle HUs, die entweder "Anstehend" sind oder bereits einen Sicherheitsstatus haben (aus der Originalliste)
            const manifestSlots = shipment.scannedItems.filter(item => 
                !item.isCancelled && (item.status === 'Anstehend' || securityClearanceStatuses.includes(item.status))
            );

            // Zählt, wie oft jede HU mit Status "Wareneingang" gescannt wurde
            const receiptCounts = shipment.scannedItems
                .filter(item => item.status === 'Wareneingang' && !item.isCancelled)
                .reduce((acc, item) => {
                    acc[item.rawInput] = (acc[item.rawInput] || 0) + 1;
                    return acc;
                }, {});
            
            const tempReceiptCounts = {...receiptCounts}; // Eine Kopie, da wir die Zählungen ändern werden

            const missingReceiptHus = [];
            manifestSlots.forEach(slot => {
                const hu = slot.rawInput;
                // Wenn ein Wareneingang für diese HU existiert, "verbrauchen" wir ihn
                if (tempReceiptCounts[hu] && tempReceiptCounts[hu] > 0) {
                    tempReceiptCounts[hu]--;
                } else {
                    // Andernfalls ist diese HU noch als "fehlender Wareneingang" zu betrachten
                    missingReceiptHus.push(slot);
                }
            });

            return missingReceiptHus;
        }
        // --- ENDE DER ÄNDERUNG: Neue Hilfsfunktion ---

// ... (Rest des bestehenden Codes) ...
        // --- Google Sheet & E-Mail Integration ---
        async function sendDataToSheet() {
            removeActiveInlineNoteEditor();
            if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_DEPLOYED_WEB_APP_URL_HERE')) {
                sheetStatusEl.textContent = 'Fehler: Web App URL fehlt.'; sheetStatusEl.style.color = 'red';
                alert("Fehler: Die Web App URL wurde nicht im Skript konfiguriert."); return;
            }
            showLoader(); 
            sheetStatusEl.textContent = 'Sende Daten an Google Sheet...'; sheetStatusEl.style.color = '#f0ad4e';
            sendToSheetButtonEl.disabled = true; clearError();
            try {
                const shipmentsData = loadShipments();
                if (Object.keys(shipmentsData).length === 0) {
                    sheetStatusEl.textContent = 'Keine Daten zum Senden.'; sheetStatusEl.style.color = 'blue'; return;
                }
                // Alle Sendungen vormerken und über den Server-Merge senden (überschreibt nichts von anderen Geräten)
                const pending = readPending();
                Object.keys(shipmentsData).forEach(b => { pending.changed[b] = true; });
                writePending(pending);
                await waitForSyncIdle();
                await flushPendingChanges();
                await waitForSyncIdle();
                if (hasPending()) throw new Error('Server nicht erreichbar – Daten bleiben lokal vorgemerkt.');
                await pullRemoteChanges();
                sheetStatusEl.textContent = 'Erfolg: Daten mit dem Server abgeglichen.'; sheetStatusEl.style.color = 'green';
                setTimeout(closeSideMenu, 1500);
            } catch (error) {
                console.error("Fehler beim Senden an Google Sheet:", error);
                sheetStatusEl.textContent = `Fehler: ${error.message}`; sheetStatusEl.style.color = 'red';
                alert(`Fehler beim Senden:\n${error.message}`);
            } finally {
                sendToSheetButtonEl.disabled = false;
                hideLoader();
                setTimeout(() => { if (sheetStatusEl.textContent && !sheetStatusEl.textContent.startsWith('Erfolg')) sheetStatusEl.textContent = ''; }, 7000);
            }
        }

        async function notifyShipmentCompletion(shipmentObject) {
            const baseNumber = shipmentObject.hawb;
            if (!baseNumber) { console.error("Konnte HAWB für Benachrichtigung nicht ermitteln."); return; }
            if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_DEPLOYED_WEB_APP_URL_HERE')) {
                console.warn("Web App URL fehlt, keine Abschluss-Benachrichtigung."); return;
            }
            if (notifiedCompletions.has(baseNumber)) return; // Bereits benachrichtigt

            console.log(`Sende Abschluss-Benachrichtigung für ${baseNumber}...`);
            notifiedCompletions.add(baseNumber); // Als benachrichtigt markieren
            
            const notificationData = { action: 'shipmentComplete', shipmentData: shipmentObject };
            try {
                const response = await fetch(WEB_APP_URL, {
                    method: 'POST', mode: 'cors', cache: 'no-cache',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(notificationData)
                });
                if (!response.ok) throw new Error(`Server Fehler (Mail): ${response.status} ${response.statusText}`);
                const result = await response.json();
                // Kennt das Server-Skript die Aktion nicht (Skript ohne Abschluss-Handler), ist das KEIN Fehler:
                // die Scans sind längst über saveShipments gespeichert – nur die Zusatz-Benachrichtigung entfällt.
                const serverHasNoHandler = result.status !== 'success' && isUnknownActionError(result);
                if (result.status === 'success' || serverHasNoHandler) {
                    if (serverHasNoHandler) console.info(`Server kennt 'shipmentComplete' nicht – Abschluss von ${baseNumber} nur lokal gemeldet.`);
                    else console.log(`Abschluss-Benachrichtigung für ${baseNumber} erfolgreich gesendet.`);
                    const count = calculateCurrentCountedPieces(shipmentObject.scannedItems || []);
                    const serverNote = (!serverHasNoHandler && result.message) ? ` ${result.message}` : '';
                    displayError(`Sendung ${escapeHtml(baseNumber)} vollständig erfasst (${count}/${shipmentObject.totalPiecesExpected}).${serverNote}`, 'blue', 4000);
                } else {
                    throw new Error(`Apps Script Fehler (Mail): ${result.message || 'Unbekannt'}`);
                }
            } catch (error) {
                console.error(`Fehler beim Senden der Abschluss-Benachrichtigung für ${baseNumber}:`, error);
                notifiedCompletions.delete(baseNumber); // Bei Fehler wieder freigeben für erneuten Versuch
                displayError(`Fehler beim Senden der Mail für ${escapeHtml(baseNumber)}.`);
            }
        }

        async function sendSummaryEmail() {
            removeActiveInlineNoteEditor();
            if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_DEPLOYED_WEB_APP_URL_HERE')) {
                 sheetStatusEl.textContent = 'Fehler: Web App URL fehlt.'; sheetStatusEl.style.color = 'red';
                 alert("Fehler: Web App URL fehlt."); return;
            }
            const shipmentsData = loadShipments();
            if (Object.keys(shipmentsData).length === 0) {
                sheetStatusEl.textContent = 'Keine Daten für Zusammenfassung.'; sheetStatusEl.style.color = 'blue';
                setTimeout(() => { if(sheetStatusEl.style.color === 'blue') sheetStatusEl.textContent = ''; }, 3000); return;
            }
            sheetStatusEl.textContent = 'Sende E-Mail-Zusammenfassung...'; sheetStatusEl.style.color = '#f0ad4e';
            sendSummaryEmailButtonEl.disabled = true; clearError();
            const payload = { action: 'sendSummaryEmail', allShipmentsData: shipmentsData, mitarbeiter: MITARBEITER_NAME };
            try {
                const response = await fetch(WEB_APP_URL, {
                    method: 'POST', mode: 'cors', cache: 'no-cache',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`Server Verbindung: ${response.status} ${response.statusText}`);
                const result = await response.json();
                if (result.status === 'success') {
                    sheetStatusEl.textContent = `Erfolg: ${result.message || 'Zusammenfassung gesendet.'}`; sheetStatusEl.style.color = 'green';
                    setTimeout(closeSideMenu, 1500);
                } else {
                    throw new Error(`Apps Script Fehler: ${result.message || 'Unbekannt'}`);
                }
            } catch (error) {
                console.error("Fehler beim Senden der E-Mail:", error);
                sheetStatusEl.textContent = `Fehler: ${error.message}`; sheetStatusEl.style.color = 'red';
                alert(`Fehler beim Senden der Zusammenfassung:\n${error.message}`);
            } finally {
                sendSummaryEmailButtonEl.disabled = false;
                setTimeout(() => { if (sheetStatusEl.textContent && !sheetStatusEl.textContent.startsWith('Erfolg')) sheetStatusEl.textContent = ''; }, 7000);
            }
        }

        // --- Seitenmenü ---
        function openSideMenu() { removeActiveInlineNoteEditor(); sideMenuEl.classList.add('open'); menuOverlayEl.classList.add('visible'); }
        function closeSideMenu() { sideMenuEl.classList.remove('open'); menuOverlayEl.classList.remove('visible'); sheetStatusEl.textContent = ''; focusShipmentInput(); }











// ERSETZEN SIE IHRE GESAMTE setupEventListeners FUNKTION MIT DIESEM CODE

function setupEventListeners() {

    // ===============================================================
    // NEU: Listener für die Master-Detail-Ansicht
    // ===============================================================

    // Listener für den "Zurück"-Button in der Detailansicht
    backToMainViewBtnEl.addEventListener('click', goBackFromDetail); // über den Verlauf (Zurück-Geste macht dasselbe)

    // ÄNDERUNG: Klick-Verhalten der Tabelle wurde überarbeitet
// ÄNDERUNG: Klick-Verhalten der Tabelle wurde überarbeitet
tableBodyEl.addEventListener('click', (event) => {
    const target = event.target;
    const row = target.closest('tr');
    if (!row) return;

    const baseNumber = row.dataset.basenumber;
    if (!baseNumber) return;

    // Fall 1: Klick auf einen Aktions-Button (Edit, PDF, Löschen)
    if (target.closest('button')) {
        if (target.classList.contains('edit-btn') && !isBatchModeActive) {
            openEditModal(baseNumber);
        } else if (target.classList.contains('pdf-btn')) {
            sendPdfEmailViaBackend(event); 
        } else if (target.classList.contains('main-delete-btn')) {
            if (confirm(`Sendung ${escapeHtml(baseNumber)} wirklich löschen?`)) {
                deleteShipment(baseNumber);
            }
        }
        return; // Wichtig: Verarbeitung hier beenden
    }
    
    // --- START DER ÄNDERUNG ---
    // Finde die genaue Zelle, die geklickt wurde.
    const cell = target.closest('td');

    // Fall 2: Nur wenn auf die ERSTE Zelle geklickt wurde, die Detailansicht zeigen.
    // (die HAWB-Zelle trägt die Klasse .hawb-cell – am Desktop stehen dahinter weitere Spalten)
    if (cell && cell.classList.contains('hawb-cell')) {
        showDetailView(baseNumber);
    }
    // Klicks auf andere Zellen (die keine Buttons sind) tun nun nichts mehr.
    // --- ENDE DER ÄNDERUNG ---
});


if (archiveTableBodyEl) archiveTableBodyEl.addEventListener('click', (event) => {
    const target = event.target;
    const row = target.closest('tr');
    if (!row || !row.dataset.basenumber) return;
    const baseNumber = row.dataset.basenumber;
    if (target.closest('button')) {
        if (target.classList.contains('restore-btn')) restoreArchivedShipment(baseNumber, false);
        else if (target.classList.contains('pdf-btn')) sendArchivedPdf(event, baseNumber);
        return;
    }
    const cell = target.closest('td');
    if (cell && cell.classList.contains('hawb-cell') && archiveResultsCache[baseNumber]) {
        detailArchived = { base: baseNumber, shipment: archiveResultsCache[baseNumber] };
        showDetailView(baseNumber);
    }
});

document.addEventListener('click', (event) => {
    const target = event.target;
    const detailContainer = target.closest('#currentShipmentDetails');
    if (!detailContainer) return;

    if (target.id === 'detailRestoreBtn') {
        event.preventDefault();
        restoreArchivedShipment(target.dataset.basenumber, true);
    }
    // Desktop-Kopfzeile: dieselben Aktionen wie die Icons in der Liste (gleiche Funktionen, gleiche Rückfragen)
    else if (target.closest('.detail-actions') && target.closest('button')) {
        const btn = target.closest('button');
        const base = btn.dataset.basenumber;
        if (!base) return;
        if (btn.classList.contains('edit-btn')) { if (!isBatchModeActive) openEditModal(base); }
        else if (btn.classList.contains('pdf-btn')) {
            if (detailArchived && detailArchived.base === base && !loadShipments()[base]) sendArchivedPdf({ target: btn }, base);
            else sendPdfEmailViaBackend({ target: btn });
        }
        else if (btn.classList.contains('main-delete-btn')) {
            if (confirm(`Sendung ${escapeHtml(base)} wirklich löschen?`)) { deleteShipment(base); goBackFromDetail(); }
        }
    }
    // Packstücktabelle: Auswahl-Kästchen und Leiste („Alle“, Zähler, Übernehmen, Aufheben)
    else if (target.classList.contains('pack-select') || target.classList.contains('pack-select-all')) {
        if (target.classList.contains('pack-select-all')) {
            const on = target.checked;
            detailContainer.querySelectorAll('.pack-select:not(:disabled)').forEach(cb => { cb.checked = on; });
        }
        updatePackSelectionBar();
    }
    else if (target.closest('.pack-select-clear')) {
        detailContainer.querySelectorAll('.pack-select, .pack-select-all').forEach(cb => { cb.checked = false; });
        updatePackSelectionBar();
    }
    else if (target.closest('.pack-select-apply')) {
        if (!isBatchModeActive) applyStatusToSelectedPacks(target.closest('.pack-select-bar'));
    }
    else if (target.closest('.pack-select-cancel')) {
        if (!isBatchModeActive) cancelSelectedPacks(target.closest('.pack-select-bar'));
    }
    // Packstücktabelle: „+ Packstück“ → weitere HU aufnehmen
    else if (target.closest('.pack-add-btn')) {
        if (!isBatchModeActive) openHuAddModal(target.closest('.pack-add-btn').dataset.basenumber);
    }
    // Packstücktabelle: Stift → Packstück bearbeiten
    else if (target.closest('.pack-edit-btn')) {
        const btn = target.closest('.pack-edit-btn');
        if (isBatchModeActive) return;
        if (btn.dataset.itemId) openPieceEditModal(btn.dataset.basenumber, btn.dataset.itemId, btn.dataset.partnerId || '', btn.dataset.piece, btn.dataset.pieceTotal);
        else openHuEditModal(btn.dataset.basenumber, btn.dataset.hu);
    }
    // Desktop-Kopfzeile: Pfad (Startseite › Anlieferung › LKW) – schließt die Details und zeigt die gewählte Seite
    else if (target.closest('.detail-crumb')) {
        event.preventDefault();
        const crumb = target.closest('.detail-crumb');
        const pageId = crumb.dataset.crumbPage;
        if (pageId === 'home') jumpFromDetail(null);
        else if (pageId === 'lkw') jumpFromDetail({ id: 'lkw', truckId: crumb.dataset.crumbTruck });
        else if (PAGE_RENDERERS[pageId]) jumpFromDetail({ id: pageId });
    }
    else if (target.classList.contains('editable-note') || target.classList.contains('add-note-link')) {
        event.preventDefault();
        openNoteEditModal(target);
    } 
    else if (target.classList.contains('cancel-button')) {
        event.preventDefault();
        requestCancelScanItem(target.dataset.basenumber, target.dataset.timestamp);
    } 
    else if (target.classList.contains('delete-note-btn')) {
        event.preventDefault();
        requestDeleteNote(target.dataset.basenumber, target.dataset.timestamp, target.dataset.noteIndex);
    }
    // --- START DER ÄNDERUNG ---
    // Neue Bedingung, um den Klick auf den Titel abzufangen
//... innerhalb von document.addEventListener('click', ...)
else if (target.id === 'shipmentDetailTitle') {
    const hawbToCopy = target.dataset.hawb;
    if (hawbToCopy && navigator.clipboard) {
        navigator.clipboard.writeText(hawbToCopy).then(() => {
            displayError(`'${hawbToCopy}' wurde in die Zwischenablage kopiert.`, 'green', 2000);
        }).catch(err => {
            console.error('Fehler beim Kopieren:', err);
            displayError('Kopieren fehlgeschlagen.', 'red', 2000);
        });
    }
}
// --- START DER ÄNDERUNG ---
// Neue Bedingung für Klicks auf eine HU/VSE-Nummer
else if (target.closest('.hu-value')) {
    const huElement = target.closest('.hu-value'); // Finde das Elternelement mit der Klasse
    const huToCopy = huElement.textContent.trim(); // Extrahiere den reinen Text
    
    if (huToCopy && navigator.clipboard) {
        navigator.clipboard.writeText(huToCopy).then(() => {
            // Füge die Klasse hinzu, um die CSS-Animation auszulösen
            huElement.classList.add('copied');
            // Entferne die Klasse nach der Animation, damit sie erneut ausgelöst werden kann
            setTimeout(() => {
                huElement.classList.remove('copied');
            }, 1500); // 1.5 Sekunden, passend zur CSS-Animation
        }).catch(err => {
            console.error('Fehler beim Kopieren:', err);
        });
    }
}

// --- ENDE DER ÄNDERUNG ---
    // --- ENDE DER ÄNDERUNG ---
});
// Auswahl-Leiste der Packstücktabelle: Kontrollmethode gewechselt → Häkchen „Kombi“ ein-/ausblenden
document.addEventListener('change', (event) => {
    const t = event.target;
    if (t && t.classList && t.classList.contains('pack-select-status') && t.closest('#currentShipmentDetails')) syncPackSelectCombo(t.closest('.pack-select-bar'));
});
    
    // ===============================================================
    mainActionButtonEl.addEventListener('click', () => {
        clearError();
        removeActiveInlineNoteEditor();
        if (isBatchModeActive) {
            addToBatch();
        } else {
            if (newTotalSectionEl.classList.contains('visible')) return;
            const rawInput = shipmentNumberInputEl.value;
            const status = securityStatusSelectEl.value;
            const isCombination = comboCheckboxEl.checked;
            // Archivierte Sendung gescannt (Nummer bekannt, lokal nicht vorhanden) → erst vom Server zurückholen,
            // dann ganz normal verbuchen. Ohne diesen Schritt würde eine NEUE Sendung mit derselben Nummer angelegt.
            {
                const scanBase = processShipmentNumber(rawInput).baseNumber;
                if (scanBase && archiveAvailable() && isArchivedBase(scanBase) && !loadShipments()[scanBase] && !findShipmentByHuNumber(rawInput)) {
                    if (mainActionButtonEl.disabled) return; // Rückholung läuft bereits
                    restoreArchivedBeforeScan(scanBase).then(ok => { if (ok && !isBatchModeActive) mainActionButtonEl.click(); });
                    return;
                }
            }
            const result = processAndSaveSingleScan(rawInput, status, isCombination);
            if (!result.waitingForTotal) {
                if (result.success) {
                    // Eingabefeld ZUERST leeren: renderTable() filtert die Liste nach dem Feldinhalt.
                    // Wurde erst danach geleert, blieben alle anderen Sendungen ausgeblendet („verschwunden“).
                    shipmentNumberInputEl.value = '';
                    updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
                    renderTable();
                    displayCurrentShipmentDetails(processShipmentNumber(rawInput).baseNumber);
                    displayError(result.message, 'green', 2000);
                } else {
                    displayError(result.message);
                }
                focusShipmentInput();
            } else {
                displayError(result.message, 'orange');
            }
        }
    });

    shipmentNumberInputEl.addEventListener('input', () => {
        const currentValue = shipmentNumberInputEl.value.trim();
        updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);

        if (currentValue.startsWith('FRT_MULTI_V1')) {
            if (!confirm("Ein Multi-Auftrags-QR-Code wurde erkannt.\n\nMöchtest du alle darin enthaltenen Aufträge jetzt importieren?")) {
                shipmentNumberInputEl.value = ''; 
                return;
            }
            const parts = currentValue.split(';;;').slice(1);
            
                        const shipments = loadShipments();
            const now = new Date().toISOString();
            let addedCount = 0, duplicateCount = 0, processedOrders = [];
            
            // --- START NEUE LOGIK FÜR FESTE MAN-NUMMERN ---
            // --- NEU (ERSETZEN MIT) ---
let maxMan = 0;
Object.values(shipments).forEach(s => {
    // Prüfe das UNVERÄNDERLICHE Feld originalManNumber
    if (typeof s.originalManNumber === 'number' && s.originalManNumber > maxMan) {
        maxMan = s.originalManNumber;
    }
    // Fallback für alte Daten ohne originalManNumber: truckId prüfen
    else if (s.truckId && s.truckId.startsWith('MAN ') && typeof s.originalManNumber === 'undefined') {
        const num = parseInt(s.truckId.replace('MAN ', ''), 10);
        if (!isNaN(num) && num > maxMan) {
            maxMan = num;
        }
    }
});
const newManNumber = maxMan + 1;
const manTruckId = 'MAN ' + newManNumber;



            
            
            parts.forEach(orderData => {
            const [metaAndOrder, huData] = orderData.split('|||');
            if (!metaAndOrder || !huData) return;
            
            const metaParts = metaAndOrder.split('|');
            let orderNumber = metaParts[0];

            // --- START: AUTOMATISCHE UMBENENNUNG FÜR NACHLIEFERUNGEN ---
            if (orderNumber.toUpperCase().includes('NACHLIEFERUNG')) {
                let suffixNum = 1;
                let proposedName = orderNumber;
                
                while (isBaseTaken(shipments, proposedName)) {
                    proposedName = `NACHLIEFERUNG ${suffixNum}`;
                    suffixNum++;
                }
                orderNumber = proposedName;
            }
            // Nummer liegt im Archiv (alter, abgeschlossener Auftrag) → neuen Auftrag unter „NUMMER (2)“ anlegen
            else if (!shipments[orderNumber] && isArchivedBase(orderNumber)) {
                orderNumber = nextFreeBaseName(shipments, orderNumber);
            }
                
                const hasFullMeta = metaParts.length >= 4;
                processedOrders.push(orderNumber);
                const hus = huData.split('~~~').filter(Boolean);

                if (!shipments[orderNumber]) {
    const newShipment = {
        hawb: orderNumber, lastModified: now, totalPiecesExpected: hus.length,
        scannedItems: [], mitarbeiter: MITARBEITER_NAME, isHuListOrder: true,
        truckId: manTruckId,
        originalManNumber: newManNumber, // <-- NEU: Unveränderliche Nummer
    };

                    if (hasFullMeta) {
                        newShipment.freightForwarder = metaParts[1];
                        newShipment.destinationCountry = metaParts[2];
                        newShipment.plsoNumber = metaParts[3];
                    }
                    shipments[orderNumber] = newShipment;
                    hus.forEach((huString, index) => {
                        const huData = parseComplexHuString(huString);
                        newShipment.scannedItems.push({ 
                            rawInput: huData.rawInput, status: 'Anstehend', timestamp: now, 
                            isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, 
                            position: huData.position || (index + 1),
                            packaging: huData.packaging, dimensions: huData.dimensions, grossWeight: huData.grossWeight
                        });
                    });
                    addedCount += hus.length;
                }
            });
            saveShipments(shipments);
            alert(`Multi-Import abgeschlossen:\n- Verarbeitete Aufträge: ${processedOrders.length}\n- Neue HUs hinzugefügt: ${addedCount}`);
            location.reload();
            return;
        } 
      







  
else if (currentValue.startsWith('FRT_VVL_V1')) {
    if (!confirm("Eine Vorverladeliste wurde erkannt.\n\nMöchtest du alle darin enthaltenen Kundenaufträge jetzt importieren?")) {
        shipmentNumberInputEl.value = '';
        return;
    }

    const parts = currentValue.split(';;;').slice(1);
    const shipments = loadShipments();
    const now = new Date().toISOString();
    let addedPositionsCount = 0;
    let newOrders = new Set();
    let updatedOrders = new Set();
    let processedVVLs = new Set();



    parts.forEach(orderData => {
        const [meta, huData] = orderData.split('|||');
        if (!meta || !huData) return;

        const [originalKundennr, vorverladelisteNr] = meta.split('|');
        let kundennr = originalKundennr;

        // --- START NEU: Verhindert das Überschreiben bestehender LKWs ---
        // Wenn die Kundennummer schon im System ist, aber zu einer ANDEREN Vorverladeliste gehört,
        // hängen wir eine Nummer an (z.B. "12345 (2)"), damit der alte LKW seinen Auftrag behält.
        // Gleiches gilt, wenn die Kundennummer im Archiv liegt (alte VVL, längst abgeschlossen): der Server würde sonst
        // den archivierten Auftrag mit dem neuen zusammenführen.
        const takenByOtherVvl = (shipments[kundennr] && shipments[kundennr].parentOrderNumber && shipments[kundennr].parentOrderNumber !== vorverladelisteNr)
            || (!shipments[kundennr] && isArchivedBase(kundennr));
        if (takenByOtherVvl) {
            let suffixNum = 2;
            while (isBaseTaken(shipments, `${originalKundennr} (${suffixNum})`)) {
                suffixNum++;
            }
            kundennr = `${originalKundennr} (${suffixNum})`;
        }
        // --- ENDE NEU ---

        const positionen = huData.split('~~~').filter(Boolean);
        processedVVLs.add(vorverladelisteNr);

        const parseVvlPosition = (pos) => {





            
            
            
            const [mainPart, grossWeightRaw = 'N/A', dimensionsRaw = 'N/A'] = pos.split('|').map(part => part.trim());
            const [vse, sendnr] = mainPart.split(':').map(part => part.trim());

            const grossWeight = grossWeightRaw && grossWeightRaw !== 'N/A'
                ? (grossWeightRaw.toUpperCase().includes('KG') ? grossWeightRaw.toUpperCase() : `${grossWeightRaw} KG`)
                : 'N/A';

            let dimensions = 'N/A';
            if (dimensionsRaw && dimensionsRaw !== 'N/A') {
                const dimParts = dimensionsRaw
                    .replace(/mm/gi, '')
                    .split('x')
                    .map(part => part.trim());

                if (dimParts.length === 3) {
                    const clean = (value) => {
                        const parsed = parseInt(value, 10);
                        return Number.isNaN(parsed) ? value : String(parsed);
                    };
                    dimensions = `${clean(dimParts[0])}x${clean(dimParts[1])}x${clean(dimParts[2])} MM`;
                }
            }

            return { vse, sendnr: sendnr || '', grossWeight, dimensions };
        };

        if (!shipments[kundennr]) {
            newOrders.add(kundennr);
            shipments[kundennr] = {
                hawb: kundennr,
                lastModified: now,
                totalPiecesExpected: positionen.length,
                scannedItems: [],
                mitarbeiter: MITARBEITER_NAME,
                isHuListOrder: true,
                parentOrderNumber: vorverladelisteNr,
                truckId: 'VVL-' + vorverladelisteNr,
            };

            if (KUNDENNR_CARRIER_MAP[kundennr]) {
                shipments[kundennr].freightForwarder = KUNDENNR_CARRIER_MAP[kundennr];
            }

            positionen.forEach(pos => {
                const { vse, sendnr, grossWeight, dimensions } = parseVvlPosition(pos);
                if (!vse) return;

                shipments[kundennr].scannedItems.push({
                    rawInput: vse,
                    sendnr: sendnr,
                    grossWeight: grossWeight,
                    dimensions: dimensions,
                    status: 'Anstehend',
                    timestamp: now,
                    isCombination: false,
                    notes: [],
                    isCancelled: false,
                    cancelledTimestamp: null
                });
            });

            addedPositionsCount += positionen.length;
        } else {
            updatedOrders.add(kundennr);
            const existingShipment = shipments[kundennr];
            let newPositionsAddedToThisCustomer = 0;

            if (KUNDENNR_CARRIER_MAP[kundennr] && !existingShipment.freightForwarder) {
                existingShipment.freightForwarder = KUNDENNR_CARRIER_MAP[kundennr];
            }

            existingShipment.parentOrderNumber = vorverladelisteNr;
            existingShipment.truckId = 'VVL-' + vorverladelisteNr;

            positionen.forEach(pos => {
                const { vse, sendnr, grossWeight, dimensions } = parseVvlPosition(pos);
                if (!vse) return;

                const alreadyExists = existingShipment.scannedItems.some(item => item.rawInput === vse);
                if (!alreadyExists) {
                    existingShipment.scannedItems.push({
                        rawInput: vse,
                        sendnr: sendnr,
                        grossWeight: grossWeight,
                        dimensions: dimensions,
                        status: 'Anstehend',
                        timestamp: now,
                        isCombination: false,
                        notes: [],
                        isCancelled: false,
                        cancelledTimestamp: null
                    });
                    newPositionsAddedToThisCustomer++;
                }
            });

            if (newPositionsAddedToThisCustomer > 0) {
                existingShipment.totalPiecesExpected = (existingShipment.totalPiecesExpected || 0) + newPositionsAddedToThisCustomer;
                existingShipment.lastModified = now;
                addedPositionsCount += newPositionsAddedToThisCustomer;
            }
        }
    });

    saveShipments(shipments);
    alert(`Import der Vorverladeliste(n) [${[...processedVVLs].join(', ')}] abgeschlossen:\n\n- ${addedPositionsCount} neue Positionen importiert.\n- ${newOrders.size} neue Aufträge angelegt.\n- ${updatedOrders.size} Aufträge aktualisiert.`);
    location.reload();
    return;
}




        if (isBatchModeActive) {
            if (currentValue.length > 0) mainActionButtonEl.click();
            return;
        }
        const shipments = loadShipments();
        const { baseNumber: processedDirectBase } = processShipmentNumber(currentValue);
        let baseNumberToShow = null;
        const parentHawbByHu = findShipmentByHuNumber(currentValue);
        if (parentHawbByHu) {
            baseNumberToShow = parentHawbByHu;
            displayError(`VSE '${escapeHtml(currentValue)}' gehört zu Kundennr: ${escapeHtml(baseNumberToShow)}`, 'blue', 3500);
        } else if (shipments[processedDirectBase.toUpperCase()]) {
            baseNumberToShow = processedDirectBase.toUpperCase();
            clearError();
        } else if (currentValue.length > 3) {
            const parentHawbByNote = findShipmentByNoteContent(currentValue);
            if (parentHawbByNote) {
                baseNumberToShow = parentHawbByNote;
                displayError(`Notiz '${escapeHtml(currentValue)}' gefunden für HAWB: ${escapeHtml(baseNumberToShow)}`, 'blue', 3500);
            }
        }
        displayCurrentShipmentDetails(baseNumberToShow || processedDirectBase);
        filterTable(baseNumberToShow || currentValue);
        if (!baseNumberToShow) scheduleArchiveAutoSearch(currentValue);
    });

    clearInputButtonEl.addEventListener('click', () => {
        shipmentNumberInputEl.value = '';
        updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
        clearError();
        displayCurrentShipmentDetails('');
        filterTable('');
        resetSingleScanNoteInputState();
        updateNoteAndComboVisibility();
        focusShipmentInput();
    });

    shipmentNumberInputEl.addEventListener('blur', () => {
        // Setzt den Modus IMMER zurück in den Scanner-Modus, wenn der Fokus verloren geht.
        // So ist das Feld für den nächsten Scan bereit.
        shipmentNumberInputEl.inputMode = 'none';
    
        // Bestehende Logik für den Batch-Modus beibehalten: Sofort neu fokussieren.
        if (isBatchModeActive) {
            setTimeout(focusShipmentInput, 10);
        }
    });
// NEU: Event Listener für das Absenden des Haupt-Formulars (Enter-Taste auf Tastatur)
// ... in der Funktion setupEventListeners() ...

// NEU: Listener für Doppelklick auf das Haupt-Eingabefeld, um die Tastatur zu öffnen
shipmentNumberInputEl.addEventListener('dblclick', () => {
    // Ändert den inputMode, um die Standard-Tastatur des Geräts anzufordern
    shipmentNumberInputEl.inputMode = 'text'; 
    
    // Ein kurzer Timeout stellt sicher, dass der Browser die Änderung verarbeitet hat,
    // bevor wir versuchen, den Fokus erneut zu setzen.
    setTimeout(() => {
        shipmentNumberInputEl.focus(); // Erneut fokussieren, um die Tastatur sicher zu triggern
    }, 50);
});
mainInputFormEl.addEventListener('submit', (event) => {
    // 1. Verhindern, dass die Seite durch die Formular-Aktion neu geladen wird
    event.preventDefault();
    
    // 2. Den Klick auf den Haupt-Aktionsbutton simulieren.
    //    Dies stellt sicher, dass die bestehende Logik (Einzelscan vs. Batch-Modus) korrekt verwendet wird.
    if (mainActionButtonEl) {
        mainActionButtonEl.click();
    }
});
    securityStatusSelectEl.addEventListener('change', () => {
        updateNoteAndComboVisibility();
        focusShipmentInput();
    });
    noteInputFormEl.addEventListener('submit', (e) => {
        e.preventDefault(); // Verhindert Neuladen der Seite
        focusShipmentInput(); // Setzt den Fokus zurück auf das Haupt-Eingabefeld
    });
    
// in setupEventListeners()

// KORRIGIERTER Listener für das Absenden des Notiz-Bearbeitungs-Modals (ersetzt BEIDE alten Blöcke)
noteEditFormEl.addEventListener('submit', (e) => {
    e.preventDefault(); // Verhindert Neuladen der Seite
    noteEditTextareaEl.blur(); // Tastatur schließen

    // Die Speicherlogik wird DIREKT hier ausgeführt, anstatt einen weiteren Klick auszulösen.
    const baseNumber = noteEditBaseNumberEl.value;
    const timestamp = noteEditTimestampEl.value;
    const noteIndex = noteEditNoteIndexEl.value === '' ? undefined : parseInt(noteEditNoteIndexEl.value, 10);
    const newNoteValue = noteEditTextareaEl.value;

    saveOrUpdateNote(baseNumber, timestamp, noteIndex, newNoteValue); // Speichert die Notiz EINMAL
    closeNoteEditModal(); // Schließt das Modal
});

const huEditFormEl = document.getElementById('hu-edit-form');
if (huEditFormEl) {
    huEditFormEl.addEventListener('submit', (e) => { e.preventDefault(); saveHuEditFromModal(); });
    document.getElementById('cancelHuEditButton').addEventListener('click', closeHuEditModal);
    document.getElementById('huEditModal').addEventListener('click', (e) => { if (e.target.id === 'huEditModal') closeHuEditModal(); });
    const huAddFormEl = document.getElementById('hu-add-form');
    if (huAddFormEl) {
        huAddFormEl.addEventListener('submit', (e) => { e.preventDefault(); saveHuAddFromModal(); });
        document.getElementById('cancelHuAddButton').addEventListener('click', closeHuAddModal);
        const huAddBackEl = document.getElementById('huAddBackBtn'); if (huAddBackEl) huAddBackEl.addEventListener('click', closeHuAddModal);
        document.getElementById('huAddModal').addEventListener('click', (e) => { if (e.target.id === 'huAddModal') closeHuAddModal(); });
        const rowsEl = document.getElementById('huAddRows');
        // Enter (auch vom Scanner) in einer HU-Zelle → nächste Zeile; in anderen Zellen → nächstes Feld der Zeile
        rowsEl.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const tr = e.target.closest('tr'); if (!tr) return;
            if (e.target.classList.contains('hu-add-hu')) {
                if (!e.target.value.trim()) return; // leere HU: Enter macht nichts (verhindert Leerzeilen-Sprünge)
                huAddEnsureTrailingEmptyRow();
                const next = tr.nextElementSibling;
                if (next) next.querySelector('.hu-add-hu').focus();
            } else {
                const fields = Array.from(tr.querySelectorAll('input'));
                const i = fields.indexOf(e.target);
                if (i >= 0 && i < fields.length - 1) fields[i + 1].focus();
                else { huAddEnsureTrailingEmptyRow(); const next = tr.nextElementSibling; if (next) next.querySelector('.hu-add-hu').focus(); }
            }
        });
        rowsEl.addEventListener('input', (e) => {
            if (e.target.classList.contains('hu-add-hu')) { huAddEnsureTrailingEmptyRow(); huAddValidateRows(); huAddUpdateCount(); }
            const err = document.getElementById('huAddError'); if (err && !err.classList.contains('hidden')) { err.textContent = ''; err.classList.add('hidden'); }
        });
        rowsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.hu-add-remove'); if (!btn) return;
            const tr = btn.closest('tr');
            if (rowsEl.rows.length > HU_ADD_MIN_ROWS) tr.remove(); else tr.querySelectorAll('input').forEach(i => { i.value = ''; i.title = ''; });
            tr.classList.remove('hu-add-row-bad');
            huAddRenumber(); huAddEnsureTrailingEmptyRow(); huAddValidateRows(); huAddUpdateCount();
            const first = rowsEl.querySelector('.hu-add-hu'); if (first) first.focus();
        });
    }
    const orderAddFormEl = document.getElementById('order-add-form');
    if (orderAddFormEl) {
        orderAddFormEl.addEventListener('submit', (e) => { e.preventDefault(); saveOrderAddFromModal(); });
        document.getElementById('cancelOrderAddButton').addEventListener('click', closeOrderAddModal);
        document.getElementById('orderAddModal').addEventListener('click', (e) => { if (e.target.id === 'orderAddModal') closeOrderAddModal(); });
    }
    const lkwRenameFormEl = document.getElementById('lkw-rename-form');
    if (lkwRenameFormEl) {
        lkwRenameFormEl.addEventListener('submit', (e) => { e.preventDefault(); saveLkwRenameFromModal(); });
        document.getElementById('cancelLkwRenameButton').addEventListener('click', closeLkwRenameModal);
        document.getElementById('lkwRenameModal').addEventListener('click', (e) => { if (e.target.id === 'lkwRenameModal') closeLkwRenameModal(); });
    }
}

// Der separate 'click'-Listener für saveNoteEditButtonEl wird komplett entfernt.

    
    comboCheckboxEl.addEventListener('change', focusShipmentInput);

    noteToggleButtonEl.addEventListener('click', () => {
        const isVisible = noteInputContainerEl.style.display === 'block';
        noteInputContainerEl.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) noteInputEl.focus(); else focusShipmentInput();
    });

    noteInputEl.addEventListener('input', () => {
        const noteValue = noteInputEl.value.trim();
        noteToggleButtonEl.classList.toggle('note-active', noteValue !== '');
        updateClearButtonVisibility(noteInputEl, clearNoteButtonEl);
        const suggestions = document.getElementById('noteSuggestions').options;
        for (let i = 0; i < suggestions.length; i++) {
            if (suggestions[i].value === noteInputEl.value) {
                focusShipmentInput();
                break;
            }
        }
    });

    clearNoteButtonEl.addEventListener('click', () => {
        resetSingleScanNoteInputState();
        focusShipmentInput();
    });


    
    cancelNoteEditButtonEl.addEventListener('click', closeNoteEditModal);
    noteEditModalEl.addEventListener('click', (e) => {
        if (e.target === noteEditModalEl) closeNoteEditModal();
    });

    // Modals
    saveEditButtonEl.addEventListener('click', saveShipmentChangesFromModal);
    cancelEditButtonEl.addEventListener('click', closeEditModal);
    editModalEl.addEventListener('click', (e) => { if (e.target === editModalEl) closeEditModal(); });


    // Batch Modus
    batchModeToggleEl.addEventListener('change', (e) => toggleBatchMode(e.target.checked));
    saveBatchButtonEl.addEventListener('click', saveBatch);
    clearBatchButtonEl.addEventListener('click', () => {
        if (currentBatch.length > 0 && confirm("Aktuellen Batch wirklich leeren?")) {
            currentBatch = [];
            isBatchNotePromptRequired = true;
            currentBatchGlobalNote = null;
            batchNoteToggleEl.checked = false;
            updateBatchUI(); clearError(); displayCurrentShipmentDetails('');
        } else if (currentBatch.length === 0) {
            displayError("Batch ist bereits leer.");
        }
        focusShipmentInput();
    });

    batchNoteToggleEl.addEventListener('change', () => {
        if (batchNoteToggleEl.checked && isBatchModeActive) {
            batchNoteInputEl.value = currentBatchGlobalNote || '';
            batchNoteModalEl.classList.add('visible');
            document.body.classList.add('modal-open');
        }
    });

    confirmBatchNoteButtonEl.addEventListener('click', confirmAndAddFirstBatchItemWithNote);
    skipBatchNoteButtonEl.addEventListener('click', skipNoteAndAddFirstBatchItem);
    batchNoteModalEl.addEventListener('click', (e) => { if (e.target === batchNoteModalEl) skipNoteAndAddFirstBatchItem(); });
   suspicionConfirmBtnEl.addEventListener('click', () => {
        const batchIndex = parseInt(suspicionBatchIndexEl.value, 10);
        const expectedHu = suspicionExpectedHuValueEl.value;
    
        // Prüfen, ob die Werte gültig sind
        if (!isNaN(batchIndex) && currentBatch[batchIndex] && expectedHu) {
            // Die HU im Batch-Array ersetzen
            currentBatch[batchIndex].rawInput = expectedHu;
            // UI aktualisieren, um die korrigierte HU anzuzeigen
            updateBatchUI();
        }
        closeSuspicionModal();
    });
    
    suspicionDeclineBtnEl.addEventListener('click', () => {
        // Zum nächsten Vorschlag in der Warteschlange gehen
        currentSuspicionIndex++;
        
        const scannedInput = suspicionScannedHuEl.textContent;
        const batchIndex = parseInt(suspicionBatchIndexEl.value, 10);
    
        // Nächsten Vorschlag anzeigen (die Funktion prüft selbst, ob es noch einen gibt)
        showSuspicionModal(scannedInput, batchIndex);
    });
    
    
    // Schließt das Modal auch, wenn daneben geklickt wird
    suspicionModalEl.addEventListener('click', (e) => {
        if (e.target === suspicionModalEl) {
            closeSuspicionModal();
        }
    });
    // Seitenmenü
    menuToggleBtnEl.addEventListener('click', (e) => { e.stopPropagation(); sideMenuEl.classList.contains('open') ? closeSideMenu() : openSideMenu(); });
    
    menuOverlayEl.addEventListener('click', closeSideMenu);
    sendToSheetButtonEl.addEventListener('click', sendDataToSheet);
    resetDataButtonEl.addEventListener('click', async () => {
        removeActiveInlineNoteEditor();
        if (confirm("WARNUNG!\n\n M\u00F6schtest du wirklich ALLE erfassten Sendungsdaten auf diesem Ger\u00E4t UND auf dem Server unwiderruflich L\u00F6schen?")) {
            showLoader(); 
            sheetStatusEl.textContent = 'Lösche Daten auf dem Server...';
            sheetStatusEl.style.color = 'orange';
            try {
                const response = await fetch(WEB_APP_URL, {
                    method: 'POST', mode: 'cors', cache: 'no-cache',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: "clearAllData" })
                });
                if (!response.ok) throw new Error(`Server-Fehler: ${response.status}`);
                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message);
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                clearSyncState();
                location.reload(); 
            } catch (error) {
                console.error("Fehler beim Zurücksetzen der Daten:", error);
                sheetStatusEl.textContent = `Fehler: ${error.message}`;
                sheetStatusEl.style.color = 'red';
                alert("Die Daten konnten auf dem Server nicht gelöscht werden. Bitte prüfen Sie Ihre Verbindung.");
                hideLoader();
            }
        } else {
            sheetStatusEl.textContent = 'Zurücksetzen abgebrochen.';
            sheetStatusEl.style.color = 'blue';
            setTimeout(() => { if (sheetStatusEl.textContent.includes('abgebrochen')) sheetStatusEl.textContent = ''; }, 3000);
        }
    });

    importHuListButtonEl.addEventListener('click', () => {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
        sideMenuEl.classList.remove('open');
        menuOverlayEl.classList.remove('visible');
        mainOrderNumberInputEl.inputMode = 'none';
        huListTextareaEl.inputMode = 'none';
        mainOrderNumberInputEl.setAttribute('tabindex', '-1');
        huListTextareaEl.setAttribute('tabindex', '-1');
        mainOrderNumberInputEl.value = '';
        huListTextareaEl.value = '';
        importHuModalEl.classList.add('visible');
        document.body.classList.add('modal-open');
    });

    cancelHuImportButtonEl.addEventListener('click', () => {
        importHuModalEl.classList.remove('visible');
        document.body.classList.remove('modal-open'); 
        focusShipmentInput();
    });

    mainOrderNumberInputEl.addEventListener('dblclick', () => {
        mainOrderNumberInputEl.inputMode = 'text';
        mainOrderNumberInputEl.focus();
    });

    huListTextareaEl.addEventListener('dblclick', () => {
        huListTextareaEl.inputMode = 'text';
        huListTextareaEl.focus();
    });

    huListTextareaEl.addEventListener('input', () => {
        if (huListTextareaEl.inputMode === 'none') {
            huListTextareaEl.value += '\n';
            huListTextareaEl.scrollTop = huListTextareaEl.scrollHeight;
        }
    });

    showOpenHusButtonEl.addEventListener('click', (e) => {
        e.preventDefault();
        showOpenHusSummary();
    });
    
    closeOpenHusModalButtonEl.addEventListener('click', () => {
        openHusModalEl.classList.remove('visible');
        document.body.classList.remove('modal-open');
        focusShipmentInput();
    });
    
    openHusModalEl.addEventListener('click', (e) => {
        if (e.target === openHusModalEl) {
            openHusModalEl.classList.remove('visible');
            document.body.classList.remove('modal-open');
            focusShipmentInput();
        }
    });

   // --- START DES KORRIGIERTEN BLOCKS ---

   showOpenSecurityHusBtnEl.addEventListener('click', () => {
    showOpenSecurityHusBtnEl.classList.add('active');
    showMissingReceiptHusBtnEl.classList.remove('active');
    showDunkelalarmHusBtnEl.classList.remove('active');
    showUeberzaehligHusBtnEl.classList.remove('active'); // KORREKTUR

    openHusListContainerEl.style.display = 'block';
    missingReceiptHusListContainerEl.style.display = 'none';
    dunkelalarmHusListContainerEl.style.display = 'none';
    ueberzaehligHusListContainerEl.style.display = 'none'; // KORREKTUR
});

showMissingReceiptHusBtnEl.addEventListener('click', () => {
    showMissingReceiptHusBtnEl.classList.add('active');
    showOpenSecurityHusBtnEl.classList.remove('active');
    showDunkelalarmHusBtnEl.classList.remove('active');
    showUeberzaehligHusBtnEl.classList.remove('active'); // KORREKTUR

    missingReceiptHusListContainerEl.style.display = 'block';
    openHusListContainerEl.style.display = 'none';
    dunkelalarmHusListContainerEl.style.display = 'none';
    ueberzaehligHusListContainerEl.style.display = 'none'; // KORREKTUR
});

showDunkelalarmHusBtnEl.addEventListener('click', () => {
    showDunkelalarmHusBtnEl.classList.add('active');
    showOpenSecurityHusBtnEl.classList.remove('active');
    showMissingReceiptHusBtnEl.classList.remove('active');
    showUeberzaehligHusBtnEl.classList.remove('active'); // KORREKTUR

    dunkelalarmHusListContainerEl.style.display = 'block';
    openHusListContainerEl.style.display = 'none';
    missingReceiptHusListContainerEl.style.display = 'none';
    ueberzaehligHusListContainerEl.style.display = 'none'; // KORREKTUR
});

showUeberzaehligHusBtnEl.addEventListener('click', () => {
    showUeberzaehligHusBtnEl.classList.add('active');
    showOpenSecurityHusBtnEl.classList.remove('active');
    showMissingReceiptHusBtnEl.classList.remove('active');
    showDunkelalarmHusBtnEl.classList.remove('active');

    ueberzaehligHusListContainerEl.style.display = 'block';
    openHusListContainerEl.style.display = 'none';
    missingReceiptHusListContainerEl.style.display = 'none';
    dunkelalarmHusListContainerEl.style.display = 'none';
});

// --- ENDE DES KORRIGIERTEN BLOCKS ---

    batchFeedbackToggleEl.addEventListener('change', () => {
        if (!isBatchModeActive && batchFeedbackToggleEl.checked) {
            alert("Scan-Feedback-Popup ist nur im Batch-Modus verfügbar. Bitte aktivieren Sie zuerst den Batch-Modus.");
            batchFeedbackToggleEl.checked = false;
        }
    });

    closeBatchScanFeedbackModalButtonEl.addEventListener('click', () => {
        batchScanFeedbackModalEl.classList.remove('visible');
        document.body.classList.remove('modal-open');
        focusShipmentInput();
    });

    batchScanFeedbackModalEl.addEventListener('click', (e) => {
        if (e.target === batchScanFeedbackModalEl) {
            batchScanFeedbackModalEl.classList.remove('visible');
            document.body.classList.remove('modal-open');
            focusShipmentInput();
        }
    });


    saveHuListButtonEl.addEventListener('click', () => {
        const result = saveAndProcessHuListData();
        if (result.success) {
            displayCurrentShipmentDetails(result.baseNumber);
            importHuModalEl.classList.remove('visible');
            document.body.classList.remove('modal-open');
            if (result.message) {
                displayError(result.message, result.messageType, 5000);
            }
            focusShipmentInput();
        }
    });

    addAndContinueHuButtonEl.addEventListener('click', () => {
        const result = saveAndProcessHuListData();
        if (result.success) {
            displayCurrentShipmentDetails(result.baseNumber);
            if (result.message) {
               displayError(result.message, result.messageType, 5000);
            }
            mainOrderNumberInputEl.value = '';
            huListTextareaEl.value = '';
            mainOrderNumberInputEl.focus();
        }
    });

} // Ende der setupEventListeners Funktion
            // --- ENDE DER ÄNDERUNG: Event Listener für Batch Scan Feedback Toggle und Close Button ---

            // --- START: NEUE LOGIK FÜR HU-DETAIL-MODAL ---
            
            // Hilfsfunktion zum Finden eines Items anhand der HU-Nummer
            function findShipmentAndItemByHu(huNumber) {
                const shipments = loadShipments();
                const upperHu = huNumber.trim().toUpperCase();
                for (const baseNumber in shipments) {
                    const shipment = shipments[baseNumber];
                    if (shipment.scannedItems) {
                        const foundItem = shipment.scannedItems.find(item => item.rawInput.toUpperCase() === upperHu);
                        if (foundItem) {
                            return { shipment, item: foundItem };
                        }
                    }
                }
                return null;
            }

            // Funktion zum Öffnen des Modals
            function openHuDetailsModal(event) {
                const target = event.target.closest('.hu-value, .pending-vse');
                if (!target) return;

                const huNumber = target.textContent.trim();
                const data = findShipmentAndItemByHu(huNumber);

                if (data && data.item) showHuDetailsModal(data.item);
            }
            // Modal mit den Daten eines HU-Eintrags füllen und öffnen (Anzeige unverändert)
            function showHuDetailsModal(item) {
                huDetailsNumberEl.textContent = item.rawInput || 'N/A';
                huDetailsPackagingEl.textContent = item.packaging || 'N/A';
                huDetailsDimensionsEl.textContent = item.dimensions || 'N/A';
                huDetailsWeightEl.textContent = item.grossWeight || 'N/A';

                huDetailsModalEl.classList.add('visible');
                document.body.classList.add('modal-open');
            }
            // HU-Details zu einer bestimmten Sendung (Info-Suche: Gewichts-Treffer, auch aus dem Archiv)
            function showHuDetailsFromShipment(base, huNumber, archived, itemId) {
                const s = (archived && infoArchiveCache[base]) || loadShipments()[base] || infoArchiveCache[base];
                const items = s && Array.isArray(s.scannedItems) ? s.scannedItems : [];
                const key = String(huNumber || '').trim().toUpperCase();
                const same = items.filter(it => it && String(it.rawInput || '').toUpperCase() === key);
                const item = (itemId && same.find(it => it.id === itemId)) || same.find(it => it.grossWeight) || same[0];
                if (item) showHuDetailsModal(item);
            }

            // Event Listeners für die drei Listen im "Offene HUs"-Modal
            openHusListContainerEl.addEventListener('click', openHuDetailsModal);
            missingReceiptHusListContainerEl.addEventListener('click', openHuDetailsModal);
            dunkelalarmHusListContainerEl.addEventListener('click', openHuDetailsModal);

            huDetailsModalEl.addEventListener('click', (e) => {
                // Klick auf die HU-Nummer zum Kopieren abfangen
                if (e.target.id === 'huDetailsNumber') {
                    const huToCopy = e.target.textContent.trim();
                    if (huToCopy && huToCopy !== 'N/A' && navigator.clipboard) {
                        navigator.clipboard.writeText(huToCopy).then(() => {
                            // CSS-Klasse für visuelles Feedback hinzufügen
                            e.target.classList.add('copied');
                            // Klasse nach der Animation wieder entfernen
                            setTimeout(() => {
                                e.target.classList.remove('copied');
                            }, 1500); 
                        }).catch(err => {
                            console.error('Kopieren fehlgeschlagen:', err);
                        });
                    }
                    return; // Verhindert, dass das Modal geschlossen wird
                }
            
                // Bestehende Logik zum Schließen des Modals
                if (e.target === huDetailsModalEl || e.target.closest('[data-close-modal="huDetailsModal"]')) {
                    huDetailsModalEl.classList.remove('visible');
                    document.body.classList.remove('modal-open');
                }
            });


// =========================================================================
// HIER IST DIE KORREKTUR: Die fehlenden Zeilen werden hinzugefügt
// =========================================================================
initializeApp();

});








// Screen Orientation Lock (optional, mit geringer Erfolgschance ohne User Interaktion)
/*
function attemptLockOrientation() {
  if (screen.orientation && typeof screen.orientation.lock === 'function') {
    screen.orientation.lock(screen.orientation.type)
      .then(() => console.log('Bildschirmausrichtung gesperrt: ' + screen.orientation.type))
      .catch((error) => console.error('Sperren der Bildschirmausrichtung fehlgeschlagen:', error));
  } else { console.warn('Screen Orientation Lock API nicht unterstützt.'); }
}
// window.addEventListener('load', attemptLockOrientation);
*/

