
const { jsPDF } = window.jspdf;

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
    const suspicionModalEl = document.getElementById('suspicionModal');
    const suspicionScannedHuEl = document.getElementById('suspicionScannedHu');
    const suspicionExpectedHuEl = document.getElementById('suspicionExpectedHu');
    const suspicionQuestionEl = document.getElementById('suspicionQuestion');
    const suspicionConfirmBtnEl = document.getElementById('suspicionConfirmBtn');
    const suspicionDenyBtnEl = document.getElementById('suspicionDenyBtn');


    async function initializeApp() {
        showLoader(); // <<<< NEU: Lade-Spinner anzeigen
        const initialShipments = await loadDataFromServer();
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialShipments));
    
        renderTable();
        isBatchModeActive = batchModeToggleEl.checked;
        sessionFirstSuffixScans = {};
        notifiedCompletions = new Set();
        
        resetSingleScanNoteInputState();
        toggleBatchMode(isBatchModeActive);
        batchFeedbackToggleEl.checked = false;
        updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
        updateClearButtonVisibility(noteInputEl, clearNoteButtonEl);
        updateCurrentBatchNoteDisplay();
    
        setupEventListeners();
        focusShipmentInput();
        console.log(`Fracht Tracker ${document.title.split('(')[1].split(')')[0]} initialized.`);
        hideLoader(); // <<<< NEU: Lade-Spinner verstecken, wenn alles fertig ist
    }

    
                    // Wiederverwendbare Funktion zum Speichern der HU-Liste
                    function saveAndProcessHuListData() {
                        const mainOrderNumber = mainOrderNumberInputEl.value.trim().toUpperCase();
                        const huListText = huListTextareaEl.value.trim();
        
                        if (!mainOrderNumber || !huListText) {
                            alert("Bitte Auftragsnummer und mindestens eine HU-Nummer eingeben.");
                            return { success: false };
                        }
                        const hus = huListText.split(/[\s\n\r]+/).map(hu => hu.trim().toUpperCase()).filter(hu => hu.length > 0);
                        if (hus.length === 0) {
                            alert("Keine gültigen HU-Nummern in der Liste gefunden.");
                            return { success: false };
                        }
        
                        const shipments = loadShipments();
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
        
                    // Listener für den "Importieren & Speichern"-Button (schließt das Modal)
                    saveHuListButtonEl.addEventListener('click', () => {
                        const result = saveAndProcessHuListData();
                        if (result.success) {
                            displayCurrentShipmentDetails(result.baseNumber);
                            importHuModalEl.classList.remove('visible');
                            document.body.classList.remove('modal-open'); // <-- DIESE ZEILE IST NEU
                            if (result.message) {
                                displayError(result.message, result.messageType, 5000);
                            }
                            focusShipmentInput();
                        }
                    });
        
                    // Listener für den neuen "+"-Button (speichert und leert die Felder)
                    addAndContinueHuButtonEl.addEventListener('click', () => {
                        const result = saveAndProcessHuListData();
                        if (result.success) {
                            displayCurrentShipmentDetails(result.baseNumber);
                            if (result.message) {
                               displayError(result.message, result.messageType, 5000);
                            }
                            // Felder für die nächste Eingabe leeren
                            mainOrderNumberInputEl.value = '';
                            huListTextareaEl.value = '';
                            mainOrderNumberInputEl.focus();
                        }
                    });

    // --- Konstanten & Konfiguration ---
    const WEB_APP_URL_BACKEND = 'https://script.google.com/macros/s/AKfycbyBtlm37WxzXdFCDjQuSIWfnQiTny6gwrmXuoq_cacGY9_bkqZxuuW7aJEqLuHJhWYg/exec'; // Mail_13
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzudnkXw5mJu-l85XYtIOhTY-eahic4IYNKYyi1MsPk3jLxH9tmNWbOuv8-z0-saGAuEQ/exec';
    const LOCAL_STORAGE_KEY = 'frachtSicherungMobile_V8_18_Refactored';
    const SUFFIX_LENGTH = 4;
    const MITARBEITER_NAME = "Zakaria Bisbiss";
    const RAC_NUMMER = "DE/RA/00889-07";
    const NON_COUNTING_STATUSES = ['Dunkelalarm', 'Anstehend', 'NichtSichern', 'Abgelehnt', 'Wareneingang'];
    const NOTE_ALLOWED_STATUSES = ['XRY', 'Abgelehnt', 'Dunkelalarm', 'ETD', 'EDD'];
    const EXCLUSIVE_SECURITY_STATUSES = ['XRY', 'ETD', 'EDD'];
    // ... (Zeile 118) const EXCLUSIVE_SECURITY_STATUSES = ['XRY', 'ETD', 'EDD'];
    
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
    let suspicionContext = null;


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
            return shipments;
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


/**
 * Sucht nach einer erwarteten HU, die einer unbekannten HU sehr ähnlich ist.
 * @param {string} unknownHu Die gescannte, unbekannte HU.
 * @returns {object|null} Das vollständige Item-Objekt der ähnlichen HU oder null.
 */
function findSimilarExpectedHu(unknownHu) {
    const shipments = loadShipments();
    for (const baseNumber in shipments) {
        const shipment = shipments[baseNumber];
        if (shipment.isHuListOrder && shipment.scannedItems) {
            for (const item of shipment.scannedItems) {
                // Nur "anstehende" HUs sind relevant für den Abgleich
                if (item.status === 'Anstehend' && areStringsSimilar(unknownHu, item.rawInput)) {
                    return item; // Gibt das gesamte Item-Objekt zurück
                }
            }
        }
    }
    return null; // Keine Ähnlichkeit gefunden
}

/**
 * Zeigt das Modal für den Tippfehler-Verdacht an.
 * @param {string} scannedHu Die tatsächlich gescannte HU.
 * @param {object} suspectedHuItem Das Item-Objekt der vermuteten korrekten HU.
 */
function showSuspicionModal(scannedHu, suspectedHuItem) {
    suspicionContext = { scannedHu, suspectedHuItem }; // Kontext für die Button-Aktionen speichern

    const diffHtml = highlightDifference(scannedHu, suspectedHuItem.rawInput);
    suspicionScannedHuEl.innerHTML = diffHtml.html1;
    suspicionExpectedHuEl.innerHTML = diffHtml.html2;

    let question = "Unbekanntes Gewicht.";
    if (suspectedHuItem.grossWeight) {
        question = `Stimmt das Gewicht? (Erwartet: ${escapeHtml(suspectedHuItem.grossWeight)})`;
    }
    suspicionQuestionEl.textContent = question;

    suspicionModalEl.classList.add('visible');
    document.body.classList.add('modal-open');
    suspicionConfirmBtnEl.focus(); // Fokus auf den "Ja"-Button legen
}

/** Schließt das Verdachts-Modal und setzt den Kontext zurück. */
function closeSuspicionModal() {
    if (suspicionModalEl.classList.contains('visible')) {
        suspicionModalEl.classList.remove('visible');
        document.body.classList.remove('modal-open');
        suspicionContext = null;
        focusShipmentInput();
    }
}
// --- ENDE DER NEUEN HILFSFUNKTIONEN ---
// =========================================================================
// ERSETZEN SIE IHRE GESAMTE showOpenHusSummary FUNKTION MIT DIESER
// =========================================================================

// =========================================================================
// ERSETZEN SIE IHRE GESAMTE showOpenHusSummary FUNKTION MIT DIESER
// =========================================================================

function showOpenHusSummary() {
    removeActiveInlineNoteEditor();
    const shipments = loadShipments();
    const securityClearanceStatuses = ['XRY', 'ETD', 'EDD'];
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

    // 3. Badges aktualisieren
    const totalMissingReceipts = missingReceiptHusByOrder.reduce((sum, order) => sum + order.pendingHus.length, 0);
    const totalDunkelalarms = Object.values(dunkelalarmItemsByOrder).reduce((sum, data) => sum + data.items.length, 0);
    const totalUeberzaehlig = Object.values(ueberzaehligItemsByOrder).reduce((sum, data) => sum + data.items.length, 0) + suspiciousPairs.length;
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

    // 4. HTML für die Listen generieren
    const sortByCountryAndOrder = (a, b) => (a.destinationCountry || 'zz').localeCompare(b.destinationCountry || 'zz') || (a.orderNumber || a.hawb).localeCompare(b.orderNumber || a.hawb);
    const generateHuListHtml = (items, allScannedItemsForContext) => {
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
                        <span class="pending-vse hu-value ${alarmClass}" style="cursor:pointer;" title="Klicken zum Kopieren. Details für ${escapeHtml(item.rawInput)} anzeigen">${escapeHtml(item.rawInput)}</span>
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
               return `<li>${positionHtml}<span class="hu-value ${alarmClass}" style="cursor:pointer;" title="Details für ${escapeHtml(item.rawInput)} anzeigen">${escapeHtml(item.rawInput)}</span></li>`;
            }).join('');
            return `<ul class="hu-list">${listItems}</ul>`;
        }
    };
    const generateHtmlForOrderGroup = (order, listItemsHtml, forSpecialList = false) => {
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
    };

    // 5. Daten sortieren und in die Container rendern
    openSecurityHusByOrder.sort(sortByCountryAndOrder);
    missingReceiptHusByOrder.sort(sortByCountryAndOrder);
    const dunkelalarmArray = Object.values(dunkelalarmItemsByOrder).sort(sortByCountryAndOrder);
    const ueberzaehligArray = Object.values(ueberzaehligItemsByOrder).sort(sortByCountryAndOrder);

    openHusListContainerEl.innerHTML = openSecurityHusByOrder.map(order => generateHtmlForOrderGroup(order, generateHuListHtml(order.pendingHus, order.scannedItems))).join('') || '<p class="no-open-hus-message">Glückwunsch! Alle HUs sind sicherheitstechnisch bearbeitet.</p>';
    missingReceiptHusListContainerEl.innerHTML = missingReceiptHusByOrder.map(order => generateHtmlForOrderGroup(order, generateHuListHtml(order.pendingHus, order.scannedItems))).join('') || '<p class="no-open-hus-message">Perfekt! Alle HUs wurden im Wareneingang erfasst.</p>';
    dunkelalarmHusListContainerEl.innerHTML = dunkelalarmArray.map(data => generateHtmlForOrderGroup(data, generateHuListHtml(data.items, data.scannedItems), true)).join('') || '<p class="no-open-hus-message">Keine Einträge mit Status "Dunkelalarm" gefunden.</p>';
    
    // ERWEITERTE HTML-GENERIERUNG FÜR DEN "ÜBERZÄHLIG"-TAB
    
    // ===== ÄNDERUNG HIER =====
    // Wir rufen nicht mehr `generateHtmlForOrderGroup` auf, sondern generieren direkt die Listen.
    // Das entfernt die Titel (`hu-order-title`).
    let ueberzaehligHtml = ueberzaehligArray.map(data => generateHuListHtml(data.items, data.scannedItems)).join('');
    // ===== ENDE DER ÄNDERUNG =====

    console.log("Verdächtige Paare gefunden:", suspiciousPairs);
    if (suspiciousPairs.length > 0) {
        ueberzaehligHtml += `<h3 style="margin-top: 20px; color: var(--danger-color); border-top: 2px solid #eee; padding-top: 15px;">Mögliche Tippfehler (Verdachte):</h3>`;
        suspiciousPairs.forEach((pair, index) => {
            const diffHtml = highlightDifference(pair.surplus.rawInput, pair.expected);

            ueberzaehligHtml += `
                <div class="hu-order-group" style="border-left-color: var(--warning-color); padding-left: 10px; margin-bottom: 10px;">
                    <ul class="hu-list" style="font-family: monospace; padding-left: 5px; list-style-type: none;">
<li><strong style="color: #333;">Gescant: </strong>&nbsp;<span class="hu-value has-dunkelalarm" style="cursor:pointer;" title="Klicken zum Kopieren. Details für ${escapeHtml(pair.surplus.rawInput)} anzeigen">${diffHtml.html1}</span></li>
                        <li><strong style="color: #333;">Erwartet:</strong>&nbsp;<span class="hu-value" style="cursor:pointer;" title="Klicken zum Kopieren">${diffHtml.html2}</span></li>
                    </ul>
                    ${index < suspiciousPairs.length - 1 ? '<hr style="margin: 5px 0; border: none; border-top: 1px dashed #ccc;">' : ''}
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
async function saveShipments(shipments) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shipments));
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "saveAllData", payload: shipments })
        });
        if (!response.ok) throw new Error(`Server-Fehler: ${response.status}`);
        const result = await response.json();
        if (result.status === 'success') {
            console.log("Daten erfolgreich zum Server synchronisiert.");
            displayError("Gespeichert & Synchronisiert", 'green', 1500);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Fehler bei der Server-Synchronisierung:", error);
        displayError("Lokal gespeichert, aber Server-Sync fehlgeschlagen!", 'red', 5000);
    }
}
async function loadDataFromServer() {
    console.log("Versuche Daten vom Server zu laden...");
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: "loadAllData" })
        });
        if (!response.ok) throw new Error(`Server-Fehler: ${response.status}`);
        
        const result = await response.json();
        if (result.status === 'success') {
            console.log("Daten erfolgreich vom Server geladen.");
            return result.data || {};
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Fehler beim Laden vom Server:", error);
        displayError("Keine Serververbindung. Lade lokale Daten.", 'orange', 4000);
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        return localData ? JSON.parse(localData) : {};
    }
}
function isHuExpected(huNumber) {
    const upperHu = huNumber.trim().toUpperCase();
    if (!upperHu) return true;

    const shipments = loadShipments();
    let hasAnyHuListOrder = false; // Flag, um zu prüfen, ob es überhaupt Listen gibt

    // Zuerst prüfen, ob es überhaupt HU-Listen-Aufträge gibt
    for (const baseNumber in shipments) {
        if (shipments[baseNumber].isHuListOrder) {
            hasAnyHuListOrder = true;
            break; // Sobald einer gefunden wurde, können wir die Schleife verlassen
        }
    }

    // --- HIER IST DIE NEUE LOGIK ---
    // Wenn es keine HU-Listen gibt, ist JEDE HU quasi "erwartet" (löst keinen Fehler aus)
    if (!hasAnyHuListOrder) {
        return true;
    }
    // --- ENDE DER NEUEN LOGIK ---

    // Wenn es HU-Listen gibt, prüfen wir jetzt, ob die HU auf einer davon steht
    for (const baseNumber in shipments) {
        const shipment = shipments[baseNumber];
        if (shipment.isHuListOrder && shipment.scannedItems) {
            if (shipment.scannedItems.some(item => item.rawInput.toUpperCase() === upperHu)) {
                return true; // Gefunden! HU wird erwartet.
            }
        }
    }
    
    // Die HU wurde in keiner der existierenden Listen gefunden. Sie ist "unerwartet".
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
function playShortErrorSound() {
    if (errorSoundEl) {
        errorSoundEl.volume = 1.0;
        errorSoundEl.currentTime = 0;
        const playPromise = errorSoundEl.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                setTimeout(() => { errorSoundEl.pause(); }, 500);
            }).catch(error => { console.warn("Audio playback failed:", error); });
        }
    }
}

// NEUE FUNKTION HINZUFÜGEN
function playNachlieferungSound() {
    if (nachlieferungSoundEl) {
        nachlieferungSoundEl.volume = 1.0;
        nachlieferungSoundEl.currentTime = 0;
        const playPromise = nachlieferungSoundEl.play();
        
        // Die playPromise-Behandlung bleibt, aber ohne den setTimeout-Stopp
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Verhindert Konsolenfehler, wenn der Browser das Abspielen blockiert
                console.warn("Audio playback for 'nachlieferung' failed:", error);
            });
        }
    }
}



function shortenForwarderName(fullName) {
    if (!fullName) return ''; // Leere Eingaben abfangen

    const lowerCaseName = fullName.toLowerCase();

    if (lowerCaseName.includes('kühne + nagel') || lowerCaseName.includes('kühne')) return 'Kühne + Nagel';
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
        function displayError(message, color = 'red', autoClearTimeout = null) {
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
            if (isModalVisible('#editModal') || isModalVisible('#batchNoteModal') || isModalVisible('#importHuModal') ||
                (sideMenuEl && sideMenuEl.classList.contains('open')) ||
                (newTotalSectionEl && newTotalSectionEl.classList.contains('visible')) ||
                document.querySelector('#currentShipmentDetails .inline-note-editor')) {
                return; // Kein Fokus, wenn ein Modal, Menü oder Editor aktiv ist
            }
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
                        return baseNumber; // Treffer! Gib die HAWB/Auftragsnummer zurück.
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

function displayCurrentShipmentDetails(baseNumberToDisplay) {
    clearError();
    removeActiveInlineNoteEditor();

    // DIES IST DIE ENTSCHEIDENDE LOGIK:
    // Prüft, welche Ansicht (Haupt- oder Detailansicht) aktiv ist
    // und wählt das richtige Element aus, um die Details hineinzuschreiben.
    const isDetailViewVisible = !detailViewEl.classList.contains('hidden');
    const displayTarget = isDetailViewVisible
        ? detailViewContentEl.querySelector('#currentShipmentDetails') // Ziel in der Detailansicht
        : currentDetailsDivEl;                                      // Ziel in der Hauptansicht

    if (!displayTarget) {
        console.error("Fehler: Konnte kein Anzeige-Element für Details finden. Stellen Sie sicher, dass die HTML-Struktur korrekt ist.");
        return;
    }

    const shipments = loadShipments();
    const shipment = baseNumberToDisplay ? shipments[baseNumberToDisplay] : null;

    if (!baseNumberToDisplay || !shipment) {
        displayTarget.innerHTML = 'Geben Sie eine Sendungsnummer ein oder wählen Sie eine aus der Liste.';
        displayTarget.style.borderColor = '#aac';
        return;
    }
    
    // Ab hier ist der Code identisch zur Originalfunktion, aber alle
    // Änderungen werden auf die `displayTarget` Variable angewendet.

    let detailsHtml = '';

    if (shipment.parentOrderNumber) {
        detailsHtml += `<div style="font-size: 0.9em; color: #555; font-weight: bold; margin-bottom: 5px;">VVL: ${escapeHtml(shipment.parentOrderNumber)}</div>`;
    }

    const isManOrder = shipment.freightForwarder && shipment.destinationCountry;
    
    if (shipment.isHuListOrder) {
        const titlePrefix = isManOrder ? 'Rechnung: ' : 'Kundennr: ';
        detailsHtml += `<strong>${titlePrefix}${escapeHtml(baseNumberToDisplay)}</strong>`;
        if (shipment.plsoNumber && shipment.plsoNumber !== 'N/A') {
            detailsHtml += `<div style="font-size: 0.9em; color: #555;">PLSO: ${escapeHtml(shipment.plsoNumber)}</div>`;
        }
        if (isManOrder) {
            const shortForwarderName = shortenForwarderName(shipment.freightForwarder);
            detailsHtml += `<div style="font-size: 0.9em; color: #555;">Sped.: ${escapeHtml(shortForwarderName)} / Land: ${escapeHtml(shipment.destinationCountry)}</div>`;
        }
        detailsHtml += `<hr style="border: none; border-top: 1px dotted #ccc; margin: 8px 0;">`;
    } else {
        // --- START DER ÄNDERUNG ---
        // ID, data-Attribut und Titel für die Kopierfunktion hinzugefügt.
        // Der style-Tag sorgt für einen "Klick"-Cursor.
        detailsHtml += `<strong id="shipmentDetailTitle" 
                                style="cursor:pointer;" 
                                title="Klicken, um '${escapeHtml(baseNumberToDisplay)}' zu kopieren" 
                                data-hawb="${escapeHtml(baseNumberToDisplay)}">Details für ${escapeHtml(baseNumberToDisplay)}:</strong>`;
        // --- ENDE DER ÄNDERUNG ---
    }

    if (shipment.isHuListOrder) {
        const securityClearanceStatuses = ['XRY', 'ETD', 'EDD'];
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
    
    detailsHtml += `<ul>`;
    (shipment.scannedItems || []).filter(item => item.status !== 'Anstehend').sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(item => {
        const dt = new Date(item.timestamp);
        const timeStr = dt.toLocaleTimeString('de-DE');
        const dateStr = dt.toLocaleDateString('de-DE');
        const isCancelled = item.isCancelled;
        detailsHtml += `<li class="${isCancelled ? 'cancelled-item' : ''}">`;
        detailsHtml += `<div class="scan-main-info">`;
        detailsHtml += `<span class="timestamp">[${dateStr} ${timeStr}]</span> `;
//... innerhalb der Funktion displayCurrentShipmentDetails ...
let numberPart = isManOrder && item.position ? `<span class="position-number">${item.position}.</span> ` : '';
let sendnrHtml = item.sendnr ? `<span class="sendnr-display"> (${escapeHtml(item.sendnr)})</span>` : '';
// --- START DER ÄNDERUNG ---
// Cursor und Titel hinzugefügt, um Klickbarkeit zu signalisieren
detailsHtml += `${numberPart}<span class="hu-value" style="cursor:pointer;" title="Klicken zum Kopieren">${escapeHtml(item.rawInput)}</span>${sendnrHtml} → <span class="status">${escapeHtml(item.status)}</span>${item.isCombination ? ` <span class="combo">(Kombi)</span>` : ''}`;
// --- ENDE DER ÄNDERUNG ---
//...
        if (isCancelled) {
            const cancelDt = item.cancelledTimestamp ? new Date(item.cancelledTimestamp) : null;
            detailsHtml += `<span class="cancelled-info"> (storniert am ${cancelDt ? cancelDt.toLocaleString('de-DE') : 'Unbekannt'})</span>`;
        }
        detailsHtml += `</div>`;
        if (!isCancelled) {
            detailsHtml += `<button class="cancel-button" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}">Storno</button>`;
        }
        detailsHtml += `<div class="scan-actions-and-notes">`;
        if (Array.isArray(item.notes) && item.notes.length > 0) {
            let notesListHtml = '<div class="notes-container">';
            item.notes.forEach((note, index) => {
                if (isCancelled) {
                    notesListHtml += `<div class="note-item" style="color:var(--cancelled-color);">- ${escapeHtml(note)}</div>`;
                } else {
                    notesListHtml += `<div class="note-item"><span class="note-prefix">Notiz:</span><span class="editable-note" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}" data-note-index="${index}" title="Notiz bearbeiten">${escapeHtml(note)}</span><button class="delete-note-btn" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}" data-note-index="${index}" title="Notiz löschen">×</button></div>`;
                }
            });
            notesListHtml += '</div>';
            detailsHtml += notesListHtml;
        }
        if (!isCancelled) {
            detailsHtml += `<a href="#" class="add-note-link" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}" title="Weitere Notiz hinzufügen">Notiz hinzufügen</a>`;
        }
        detailsHtml += `<div class="inline-note-editor-placeholder"></div>`;
        detailsHtml += `</div>`;
        detailsHtml += `</li>`;
    });
    detailsHtml += `</ul>`;

    const expected = shipment.totalPiecesExpected;
    const securityScansCount = calculateCurrentCountedPieces(shipment.scannedItems || []);
    const receiptScansCount = calculateGoodsReceiptCount(shipment.scannedItems || []);
    detailsHtml += `<div class="summary">`;
    let expectedText = (expected !== null && expected !== undefined) ? `${expected} Stk.` : 'N/A';
    const receiptClass = getStatusClass(receiptScansCount, expected);
    detailsHtml += `<span>Wareneingang: <span class="${receiptClass}">${receiptScansCount} von ${expectedText}</span></span>`;
    const securityClass = getStatusClass(securityScansCount, expected);
    detailsHtml += `<span>Sicherung erfasst: <span class="${securityClass}">${securityScansCount} von ${expectedText}</span></span>`;
    detailsHtml += `</div>`;
    
    displayTarget.innerHTML = detailsHtml;

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

function renderTable() {
    const shipments = loadShipments();
    tableBodyEl.innerHTML = '';
    Object.keys(shipments).sort((a, b) => new Date(shipments[b].lastModified || 0) - new Date(shipments[a].lastModified || 0))
        .forEach(baseNumber => {
            const shipment = shipments[baseNumber];
            if (!shipment) return;
            const row = tableBodyEl.insertRow();
            
            // NEU: Füge die baseNumber als data-Attribut zur ganzen Zeile hinzu.
            // Das macht das Abgreifen beim Klick viel einfacher.
            row.dataset.basenumber = baseNumber;

            
            const securityCount = calculateCurrentCountedPieces(shipment.scannedItems || []);
            const receiptCount = calculateGoodsReceiptCount(shipment.scannedItems || []);
            const expected = shipment.totalPiecesExpected;
            const expectedText = expected ?? 'N/A';

            let hawbCellHtml = '';
            let pdfButtonData = ''; 

            if (shipment.parentOrderNumber) {
                hawbCellHtml = `<td data-label="HAWB.">
                    <div class="vvl-table-entry">
                         <span class="vvl-prefix">VVL: </span>${escapeHtml(shipment.parentOrderNumber)}<br>
                         <span class="kundennr-prefix">Kundennr: </span>${escapeHtml(baseNumber)}
                    </div>
                </td>`;
                pdfButtonData = `data-parentordernumber="${escapeHtml(shipment.parentOrderNumber)}"`;
            } else {
                hawbCellHtml = `<td data-label="HAWB.">${escapeHtml(baseNumber)}</td>`;
            }
            row.insertCell().outerHTML = hawbCellHtml;

            const receiptClass = getStatusClass(receiptCount, expected);
            const dunkelalarmCount = calculateDunkelalarmCount(shipment.scannedItems || []);
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
            
            row.insertCell().outerHTML = `<td data-label="Übersicht" class="summary-cell">${summaryHtml}</td>`;
            
            row.insertCell().outerHTML = `<td data-label="Letzte Änd.">${shipment.lastModified ? new Date(shipment.lastModified).toLocaleString('de-DE') : '-'}</td>`;
            
            const actionsCell = row.insertCell();
            actionsCell.setAttribute('data-label', 'Aktionen');
            actionsCell.classList.add('actions-cell');
            actionsCell.innerHTML = `
                <button class="edit-btn" data-basenumber="${escapeHtml(baseNumber)}" title="Sendung ${escapeHtml(baseNumber)} bearbeiten">Edit</button>
                <button class="pdf-btn" data-basenumber="${escapeHtml(baseNumber)}" ${pdfButtonData}>PDF</button>
                <button class="delete-btn main-delete-btn" data-basenumber="${escapeHtml(baseNumber)}">Löschen</button>
            `;
        });
    updateEditButtonVisibilityInTable();
    filterTable(shipmentNumberInputEl.value);
}

function showDetailView(baseNumber) {
    // 1. Aktuelle Scroll-Position der Hauptseite speichern
    lastScrollPosition = window.scrollY;

    // 2. Die Detail-Daten in den Container der Detail-Ansicht laden
    displayCurrentShipmentDetails(baseNumber);

    // 3. Ansichten umschalten
    mainViewEl.classList.add('hidden');
    detailViewEl.classList.remove('hidden');
    
    // 4. In der neuen Ansicht nach ganz oben scrollen
    detailViewEl.scrollTop = 0;
}


function hideDetailView() {
    // 1. Ansichten zurückschalten
    detailViewEl.classList.add('hidden');
    mainViewEl.classList.remove('hidden');

    // 2. Zur gespeicherten Scroll-Position zurückkehren
    window.scrollTo(0, lastScrollPosition);
    focusShipmentInput(); // Fokus wieder auf das Eingabefeld setzen
}




        function updateEditButtonVisibilityInTable() {
            // Dies wird über CSS body.batch-mode-active td.actions-cell button.edit-btn { display: none; } gesteuert.
            // Diese Funktion könnte für komplexere Logik dienen, ist hier aber implizit durch CSS.
             document.body.classList.toggle('batch-mode-active', isBatchModeActive);
        }

        function filterTable(filterText) {
            const rows = tableBodyEl.getElementsByTagName('tr');
            const trimmedFilter = filterText ? filterText.trim().toUpperCase() : "";

            if (isBatchModeActive) { // Im Batch Mode alle Zeilen zeigen
                for (let row of rows) row.style.display = '';
                return;
            }
            if (trimmedFilter === "") { // Kein Filter, alle Zeilen zeigen
                for (let row of rows) row.style.display = '';
                return;
            }

            const inputParts = trimmedFilter.split('+');
            const inputBaseNumber = inputParts[0];
            const inputHasSuffix = inputParts.length > 1 && inputParts[1].length === SUFFIX_LENGTH && /^\d+$/.test(inputParts[1]);

            for (let row of rows) {
                const cell = row.cells[0];
                if (cell) {
                    const fullCellText = (cell.textContent || cell.innerText).toUpperCase();
                    const cellBaseNumber = fullCellText.split('+')[0].trim();
                    let showRow = false;
                    if (inputHasSuffix) { // Bei Suffix genaue Übereinstimmung des Basenumbers
                        if (cellBaseNumber === inputBaseNumber) showRow = true;
                    } else { // Ohne Suffix, Präfix-Suche
                        if (cellBaseNumber.startsWith(inputBaseNumber)) showRow = true;
                    }
                    row.style.display = showRow ? '' : 'none';
                }
            }
        }

        
        
        
        
        
        
        
      // ERSETZEN SIE DIESE GESAMTE FUNKTION
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER KORRIGIERTEN VERSION ---

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER FINALEN KORREKTUR ---

// --- START DER ÄNDERUNG: Die komplette Funktion wird aktualisiert (mit WE-Prüfung) ---
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER NEUEN VERSION ---

function processAndSaveSingleScan(rawInputToSave, statusToUse, isCombinationFromCheckbox) {
    const statusesThatTriggerWE = ['XRY', 'ETD', 'EDD', 'Dunkelalarm'];

    const { baseNumber, suffix, isValidFormat, raw: processedRawInput, isSuffixFormat } = processShipmentNumber(rawInputToSave);
    if (!isValidFormat) { return { success: false, waitingForTotal: false, message: `Ungültiges Format: ${escapeHtml(rawInputToSave)}` }; }

    // --- START DER AKTUALISIERTEN SOUND-LOGIK ---
    if (unexpectedHuSoundToggleEl && unexpectedHuSoundToggleEl.checked) {
        const isCurrentHuExpected = isHuExpected(processedRawInput);
        const parentHawbByHu = findShipmentByHuNumber(processedRawInput);
        const isNachlieferungHu = parentHawbByHu && parentHawbByHu.toUpperCase() === 'NACHLIEFERUNG';

        // Fall 1: HU gehört zu einer Nachlieferung -> spiele den Nachlieferung-Sound
        if (isNachlieferungHu) {
            playNachlieferungSound();
        } 
        // Fall 2: HU ist unerwartet (und keine Nachlieferung) -> spiele den Fehler-Sound
        else if (!isCurrentHuExpected) {
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
        const isNewScanKombi = (statusToUse === 'XRY' && isCombinationFromCheckbox);
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
        newTotalLabelEl.textContent = `Erwartete Gesamtstückzahl für NEUE Sendung ${escapeHtml(baseNumber)}:`; newTotalInputEl.value = ''; newTotalSectionEl.classList.remove('warning-existing'); toggleMainInputControls(false); newTotalInputEl.focus();
        return { success: false, waitingForTotal: true, message: `Bitte Gesamtstückzahl für ${escapeHtml(baseNumber)} eingeben oder überspringen.` };
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
            if(confirm(`Notiz "${noteToDelete}" wirklich löschen?`)) {
                 const item = shipments[baseNumber].scannedItems.find(i => i.timestamp === itemTimestamp);
                 item.notes.splice(noteIndex, 1);
                 shipments[baseNumber].lastModified = new Date().toISOString();
                 saveShipments(shipments);
                 displayCurrentShipmentDetails(baseNumber);
                 focusShipmentInput();
            }
        }

        function toggleBatchMode(activate) {
            isBatchModeActive = activate;
            clearError();
            resetSingleScanNoteInputState();
            updateNoteAndComboVisibility(); // Combo und Einzelnotiz-Button aktualisieren
            document.body.classList.toggle('batch-mode-active', isBatchModeActive);


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
                mainActionButtonEl.textContent = 'Hinzufügen';
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
// =========================================================================
// ERSETZE DEINE KOMPLETTE `addToBatch` FUNKTION MIT DIESER VERSION
// =========================================================================
function addToBatch() {
    const rawInputFromField = shipmentNumberInputEl.value.trim();
    if (!rawInputFromField) {
        focusShipmentInput();
        return;
    }

    // --- NEU: Logik, um einen offenen Verdachtsfall durch einen neuen Scan abzubrechen ---
    // Wenn ein neues Item gescannt wird, während das Modal offen ist, wird der alte Fall
    // als "Nein" (nicht korrigieren) behandelt und das Item zur Liste hinzugefügt.
    if (suspicionModalEl.classList.contains('visible') && suspicionContext) {
        const itemToAddAsIs = {
            rawInput: suspicionContext.scannedHu, // Das ursprünglich verdächtige Item
            scanTimestamp: new Date().toISOString(),
            note: currentBatchGlobalNote
        };
        currentBatch.unshift(itemToAddAsIs);
        updateBatchUI();
        closeSuspicionModal(); // Schließt das Modal und löscht den alten Kontext
    }

    const upperRawInput = rawInputFromField.toUpperCase();
    const {
        isValidFormat,
        raw: processedRawInput
    } = processShipmentNumber(upperRawInput);
    if (!isValidFormat) {
        displayError(`Ungültiges Format für Batch-Eingabe: ${escapeHtml(rawInputFromField)}`);
        focusShipmentInput();
        return;
    }

    const scanTimestamp = new Date().toISOString();
    const isCurrentHuExpected = isHuExpected(processedRawInput);

    // --- NEU: Sound- und Verdachtslogik für unerwartete HUs ---
    if (!isCurrentHuExpected) {
        // Schritt 1: Sound wird IMMER bei einer unerwarteten HU abgespielt.
        if (unexpectedHuSoundToggleEl && unexpectedHuSoundToggleEl.checked) {
            const parentHawb = findShipmentByHuNumber(processedRawInput);
            const isNachlieferungHu = parentHawb && parentHawb.toUpperCase() === 'NACHLIEFERUNG';
            if (isNachlieferungHu) {
                playNachlieferungSound();
            } else {
                playShortErrorSound();
            }
        }

        // Schritt 2: DANACH wird auf Ähnlichkeit für einen möglichen Tippfehler geprüft.
        const similarHu = findSimilarExpectedHu(processedRawInput);
        if (similarHu) {
            // Ein Verdacht wurde gefunden!
            // Zeige das Modal an und unterbrich die Funktion hier.
            // Das Item wird erst später durch eine Aktion im Modal hinzugefügt.
            showSuspicionModal(processedRawInput, similarHu);
            shipmentNumberInputEl.value = '';
            updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
            return; // WICHTIG: Stoppt die weitere Ausführung.
        }
    }

    // Dieser Code wird nur erreicht, wenn die HU erwartet war ODER wenn sie
    // unerwartet war, aber KEIN Verdacht auf einen Tippfehler bestand.

    // Bestehende Logik für das Feedback-Popup
    if (batchFeedbackToggleEl && batchFeedbackToggleEl.checked) {
        const carrier = findCarrierForHu(processedRawInput);
        showBatchScanFeedback(processedRawInput, isCurrentHuExpected, carrier);
    }

    // Bestehende Logik für die Batch-Notiz beim ersten Scan
    if (isBatchModeActive && currentBatch.length === 0 && isBatchNotePromptRequired && batchNoteToggleEl.checked) {
        pendingFirstBatchScanData = {
            rawInput: processedRawInput,
            scanTimestamp: scanTimestamp
        };
        batchNoteInputEl.value = currentBatchGlobalNote || '';
        batchNoteModalEl.classList.add('visible');
        document.body.classList.add('modal-open');
        batchNoteInputEl.focus();
        return;
    }

    // Standard-Aktion: Item zur Batch-Liste hinzufügen
    const batchItem = {
        rawInput: processedRawInput,
        scanTimestamp: scanTimestamp,
        note: currentBatchGlobalNote
    };

    currentBatch.unshift(batchItem); // Fügt das neue Item am Anfang der Liste hinzu

    // UI aktualisieren und für den nächsten Scan vorbereiten
    updateBatchUI();
    shipmentNumberInputEl.value = '';
    updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
    clearError();
    focusShipmentInput();
}

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

function saveBatch() {
    if (currentBatch.length === 0) { displayError("Batch ist leer."); focusShipmentInput(); return; }
    
    const statusesThatTriggerWE = ['XRY', 'ETD', 'EDD', 'Dunkelalarm'];

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
                if (shipment.isHuListOrder && EXCLUSIVE_SECURITY_STATUSES.includes(itemToCancel.status)) {
                    const newPlaceholderItem = {
                        rawInput: itemToCancel.rawInput, // Die gleiche HU-Nummer
                        status: 'Anstehend',
                        timestamp: now.toISOString(), // Neuer Zeitstempel für den Platzhalter
                        isCombination: false,
                        notes: [],
                        isCancelled: false,
                        cancelledTimestamp: null
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
            doc.text(`Gesamtübersicht Vorverladeliste ${parentOrderNumber}:`, 14, currentY); currentY += 6;
            
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

async function sendPdfEmailViaBackend(event) {
    const pdfButton = event.target;
    pdfButton.disabled = true;
    const originalText = pdfButton.textContent;
    pdfButton.textContent = 'Sende E-Mail...';

    const clickedBaseNumber = pdfButton.dataset.basenumber;
    const parentOrderNumber = pdfButton.dataset.parentordernumber;

    const allShipments = loadShipments();
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

            const securityClearanceStatuses = ['XRY', 'ETD', 'EDD'];
            
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
                const response = await fetch(WEB_APP_URL, {
                    method: 'POST', mode: 'cors', cache: 'no-cache',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain für Gas POST
                    body: JSON.stringify({action: "saveAllData", payload: shipmentsData}) // Struktur für Gas
                });
                if (!response.ok) throw new Error(`Server Verbindung: ${response.status} ${response.statusText}`);
                const result = await response.json();
                if (result.status === 'success') {
                    sheetStatusEl.textContent = `Erfolg: ${result.message || 'Daten gesendet.'}`; sheetStatusEl.style.color = 'green';
                    setTimeout(closeSideMenu, 1500);
                } else {
                    throw new Error(`Apps Script Fehler: ${result.message || 'Unbekannt'}`);
                }
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
                if (result.status === 'success') {
                    console.log(`Abschluss-Benachrichtigung für ${baseNumber} erfolgreich gesendet.`);
                    displayError(`Sendung ${escapeHtml(baseNumber)} abgeschlossen! Benachrichtigung gesendet.`, 'blue', 4000);
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

            // --- START: Doppelklick-Logik für manuelle Eingabe im HU-Modal ---
            function enableManualInputOnDoubleClick(event) {
                const element = event.target;
                element.removeAttribute('readonly');
                element.setAttribute('inputmode', 'text');
                setTimeout(() => {
                    element.focus();
                    element.select();
                }, 50);
            }

            mainOrderNumberInputEl.addEventListener('dblclick', enableManualInputOnDoubleClick);
            huListTextareaEl.addEventListener('dblclick', enableManualInputOnDoubleClick);
            // --- ENDE: Doppelklick-Logik ---
        // --- Seitenmenü ---
        function openSideMenu() { removeActiveInlineNoteEditor(); sideMenuEl.classList.add('open'); menuOverlayEl.classList.add('visible'); }
        function closeSideMenu() { sideMenuEl.classList.remove('open'); menuOverlayEl.classList.remove('visible'); sheetStatusEl.textContent = ''; focusShipmentInput(); }
            // --- START: Doppelklick-Logik für manuelle Eingabe im HU-Modal ---
            function enableManualInput(event) {
                const element = event.target;
                element.removeAttribute('readonly');
                element.setAttribute('inputmode', 'text'); // Tastatur anfordern
                // Kleiner Timeout, damit der Browser die Änderung verarbeiten kann, bevor der Fokus gesetzt wird
                setTimeout(() => {
                    element.focus();
                    element.select(); // Text markieren für einfaches Überschreiben
                }, 50);
            }

            mainOrderNumberInputEl.addEventListener('dblclick', enableManualInput);
            huListTextareaEl.addEventListener('dblclick', enableManualInput);

            importHuListButtonEl.addEventListener('click', () => {
                sideMenuEl.classList.remove('open');
                menuOverlayEl.classList.remove('visible');

                // Inputmode für Scanner zurücksetzen
                mainOrderNumberInputEl.inputMode = 'none';
                huListTextareaEl.inputMode = 'none';

                mainOrderNumberInputEl.value = '';
                huListTextareaEl.value = '';
                importHuModalEl.classList.add('visible');
                document.body.classList.add('modal-open');
                // NEU: Diese Zeile auskommentieren, um das automatische Öffnen der Tastatur zu verhindern.
                // mainOrderNumberInputEl.focus(); 
            });










// ERSETZEN SIE IHRE GESAMTE setupEventListeners FUNKTION MIT DIESEM CODE

function setupEventListeners() {

    // ===============================================================
    // NEU: Listener für die Master-Detail-Ansicht
    // ===============================================================

    // Listener für den "Zurück"-Button in der Detailansicht
    backToMainViewBtnEl.addEventListener('click', hideDetailView);

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
    // row.cells[0] greift auf die erste <td> der Zeile zu.
    if (cell && cell === row.cells[0]) {
        showDetailView(baseNumber);
    }
    // Klicks auf andere Zellen (die keine Buttons sind) tun nun nichts mehr.
    // --- ENDE DER ÄNDERUNG ---
});


document.addEventListener('click', (event) => {
    const target = event.target;
    const detailContainer = target.closest('#currentShipmentDetails');
    if (!detailContainer) return;

    if (target.classList.contains('editable-note') || target.classList.contains('add-note-link')) {
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
            const result = processAndSaveSingleScan(rawInput, status, isCombination);
            if (!result.waitingForTotal) {
                if (result.success) {
                    renderTable();
                    displayCurrentShipmentDetails(processShipmentNumber(rawInput).baseNumber);
                    shipmentNumberInputEl.value = '';
                    updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
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

            parts.forEach(orderData => {
                const [metaAndOrder, huData] = orderData.split('|||');
                if (!metaAndOrder || !huData) return;
                const metaParts = metaAndOrder.split('|');
                const orderNumber = metaParts[0];
                const hasFullMeta = metaParts.length >= 4;
                processedOrders.push(orderNumber);
                const hus = huData.split('~~~').filter(Boolean);

                if (!shipments[orderNumber]) {
                    const newShipment = {
                        hawb: orderNumber, lastModified: now, totalPiecesExpected: hus.length,
                        scannedItems: [], mitarbeiter: MITARBEITER_NAME, isHuListOrder: true,
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

                const [kundennr, vorverladelisteNr] = meta.split('|');
                const positionen = huData.split(' ').filter(Boolean);
                processedVVLs.add(vorverladelisteNr);

                if (!shipments[kundennr]) {
                    newOrders.add(kundennr);
                    shipments[kundennr] = {
                        hawb: kundennr, lastModified: now, totalPiecesExpected: positionen.length,
                        scannedItems: [], mitarbeiter: MITARBEITER_NAME, isHuListOrder: true,
                        parentOrderNumber: vorverladelisteNr
                    };
                    if (KUNDENNR_CARRIER_MAP[kundennr]) {
                        shipments[kundennr].freightForwarder = KUNDENNR_CARRIER_MAP[kundennr];
                    }
                    positionen.forEach(pos => {
                        const [vse, sendnr] = pos.split(':');
                        shipments[kundennr].scannedItems.push({ rawInput: vse, sendnr: sendnr, status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null });
                    });
                    addedPositionsCount += positionen.length;
                } else {
                    updatedOrders.add(kundennr);
                    const existingShipment = shipments[kundennr];
                    let newPositionsAddedToThisCustomer = 0;
                    if (KUNDENNR_CARRIER_MAP[kundennr] && !existingShipment.freightForwarder) {
                        existingShipment.freightForwarder = KUNDENNR_CARRIER_MAP[kundennr];
                    }
                    if (!existingShipment.parentOrderNumber) {
                         existingShipment.parentOrderNumber = vorverladelisteNr;
                    }
                    positionen.forEach(pos => {
                        const [vse, sendnr] = pos.split(':');
                        const alreadyExists = existingShipment.scannedItems.some(item => item.rawInput === vse);
                        if (!alreadyExists) {
                            existingShipment.scannedItems.push({ rawInput: vse, sendnr: sendnr, status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null });
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

    confirmNewTotalBtnEl.addEventListener('click', () => completeNewShipmentSave(newTotalInputEl.value));
    skipNewTotalBtnEl.addEventListener('click', () => completeNewShipmentSave(null));
    newTotalInputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNewTotalBtnEl.click(); }});

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

    // Seitenmenü
    menuToggleBtnEl.addEventListener('click', (e) => { e.stopPropagation(); sideMenuEl.classList.contains('open') ? closeSideMenu() : openSideMenu(); });
    menuOverlayEl.addEventListener('click', closeSideMenu);
    sendToSheetButtonEl.addEventListener('click', sendDataToSheet);
    resetDataButtonEl.addEventListener('click', async () => {
        removeActiveInlineNoteEditor();
        if (confirm("WARNUNG!\n\nMöchtest du wirklich ALLE erfassten Sendungsdaten auf diesem Gerät UND auf dem Server unwiderruflich löschen?")) {
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

    openHusListContainerEl.addEventListener('click', openHuDetailsModal);
    missingReceiptHusListContainerEl.addEventListener('click', openHuDetailsModal);
    dunkelalarmHusListContainerEl.addEventListener('click', openHuDetailsModal);

    huDetailsModalEl.addEventListener('click', (e) => {
        if (e.target === huDetailsModalEl || e.target.closest('[data-close-modal="huDetailsModal"]')) {
            huDetailsModalEl.classList.remove('visible');
            document.body.classList.remove('modal-open');
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

                if (data && data.item) {
                    huDetailsNumberEl.textContent = data.item.rawInput || 'N/A';
                    huDetailsPackagingEl.textContent = data.item.packaging || 'N/A';
                    huDetailsDimensionsEl.textContent = data.item.dimensions || 'N/A';
                    huDetailsWeightEl.textContent = data.item.grossWeight || 'N/A';
                    
                    huDetailsModalEl.classList.add('visible');
                    document.body.classList.add('modal-open');
                }
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
