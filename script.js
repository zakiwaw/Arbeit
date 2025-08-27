
    const { jsPDF } = window.jspdf;

    document.addEventListener('DOMContentLoaded', function() {
        // --- DOM Elemente ---
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
const batchNoteToggleEl = document.getElementById('batchNoteToggle'); // <-- DIESE ZEILE HINZUFÜGEN
        const currentBatchNoteDisplayEl = document.getElementById('currentBatchNoteDisplay');
	 const containerEl = document.querySelector('.container'); // <-- DIESE ZEILE HINZUFÜGEN
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
// In der Nähe der anderen Modal-Variablen einfügen
const showOpenSecurityHusBtnEl = document.getElementById('showOpenSecurityHusBtn');
const showMissingReceiptHusBtnEl = document.getElementById('showMissingReceiptHusBtn');
const missingReceiptHusListContainerEl = document.getElementById('missingReceiptHusListContainer');
const showDunkelalarmHusBtnEl = document.getElementById('showDunkelalarmHusBtn');
const dunkelalarmHusListContainerEl = document.getElementById('dunkelalarmHusListContainer');
const errorSoundEl = document.getElementById('errorSound');
const unexpectedHuSoundToggleEl = document.getElementById('unexpectedHuSoundToggle');

        // --- Konstanten & Konfiguration ---

        const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbweFC3K1wgksWq3Dd79bJDkbsBdYaORycXSlbIGvQ5JDe6eYj7PtTti3gpBJArRSdp63Q/exec';
        const LOCAL_STORAGE_KEY = 'frachtSicherungMobile_V8_18_Refactored';
        const SUFFIX_LENGTH = 4;
        const MITARBEITER_NAME = "Zakaria Bisbiss";
        const RAC_NUMMER = "DE/RA/00151-20";
        const NON_COUNTING_STATUSES = ['Dunkelalarm', 'Anstehend', 'NichtSichern', 'Abgelehnt', 'Wareneingang']; // <-- WARENEINGANG HINZUGEFÜGT
        const NOTE_ALLOWED_STATUSES = ['XRY', 'Abgelehnt', 'Dunkelalarm', 'ETD', 'EDD'];
	        // In der Nähe von const NON_COUNTING_STATUSES = ... einfügen
        const EXCLUSIVE_SECURITY_STATUSES = ['XRY', 'ETD', 'EDD']; // Status, die nur einmal vergeben werden dürfen

        // --- Anwendungsstatus ---
        let isBatchModeActive = false;
        let currentBatch = [];
        let batchStatus = '';
        let batchIsCombination = false;
        let pendingScanDataForNewShipment = null;
let pendingTotalUpdateInfo = null; 
        let sessionFirstSuffixScans = {}; // Trackt erste Suffix-Scans pro HAWB in der Session
        let notifiedCompletions = new Set(); // Trackt HAWBs, für die schon eine Abschlussmail gesendet wurde
        let currentBatchGlobalNote = null;
        let isBatchNotePromptRequired = true;
        let pendingFirstBatchScanData = null;

        // --- Hilfsfunktionen: Persistenz ---
   function loadShipments() {
            const data = localStorage.getItem(LOCAL_STORAGE_KEY);
            const shipments = data ? JSON.parse(data) : {};

            // Datenmigration: Konvertiert alte 'note' (string) zu neuer 'notes' (array)
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
    // Zählt nur Scans mit dem Status "Wareneingang", die nicht storniert sind
    return scannedItems.filter(item => item.status === 'Wareneingang' && !item.isCancelled).length;
}
// --- START DER ÄNDERUNG: Die gesamte Funktion wird aktualisiert ---
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESEM CODE ---

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESEM CODE ---

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER FINALEN KORREKTUR ---

function showOpenHusSummary() {
    removeActiveInlineNoteEditor();
    const shipments = loadShipments();
    const securityClearanceStatuses = ['XRY', 'ETD', 'EDD'];
    let openSecurityHusByOrder = [], missingReceiptHusByOrder = [], dunkelalarmItemsByOrder = {};

    Object.keys(shipments).forEach(baseNumber => {
        const shipment = shipments[baseNumber];
        
        if (shipment.scannedItems && shipment.scannedItems.length > 0) {
            const itemsWithDunkelalarm = shipment.scannedItems.filter(item => item.status === 'Dunkelalarm' && !item.isCancelled);
            if (itemsWithDunkelalarm.length > 0) {
                if (!dunkelalarmItemsByOrder[baseNumber]) dunkelalarmItemsByOrder[baseNumber] = { items: [], ...shipment };
                itemsWithDunkelalarm.forEach(item => {
                    const enhancedItem = {...item, orderNumber: baseNumber};
                    dunkelalarmItemsByOrder[baseNumber].items.push(enhancedItem);
                });
            }
        }

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
            
            const tempReceiptCounts = {...receiptCounts};
            
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

    const sortByCountryAndOrder = (a, b) => (a.destinationCountry || 'zz').localeCompare(b.destinationCountry || 'zz') || (a.orderNumber || a.hawb).localeCompare(b.orderNumber || a.hawb);
    
    // HILFSFUNKTION - JETZT MIT ROBUSTER DUNKELALARM-PRÜFUNG
    const generateHuListHtml = (items, allScannedItemsForContext) => {
        if (!items || items.length === 0) return '';

        // Schritt 1: Erstelle eine Liste (Set) aller Nummern, die einen Dunkelalarm haben.
        const dunkelalarmedNumbers = new Set(
            allScannedItemsForContext
                .filter(scan => scan.status === 'Dunkelalarm' && !scan.isCancelled)
                .map(scan => scan.rawInput)
        );

        const sortedItems = items.sort((a, b) => (a.position || 9999) - (b.position || 9999));
        
        const isVvlList = sortedItems[0] && sortedItems[0].sendnr;

        if (isVvlList) { // Für VW-Vorverladelisten
            let html = '<div class="hu-list-header"><span>VSE-Nummer</span><span>Sendungs-Nr.</span></div>';
            const listItems = sortedItems.map(item => {
                // Schritt 2: Prüfe direkt, ob die VSE-Nummer in der Dunkelalarm-Liste ist.
                const hasDunkelalarm = dunkelalarmedNumbers.has(item.rawInput);
                const alarmClass = hasDunkelalarm ? 'has-dunkelalarm' : '';
                return `
                    <li>
                        <div class="pending-item-details">
                            <span class="pending-vse ${alarmClass}">${escapeHtml(item.rawInput)}</span>
                            <span class="pending-sendnr">${escapeHtml(item.sendnr)}</span>
                        </div>
                    </li>`;
            }).join('');
            return html + `<ul class="hu-list vvl-list">${listItems}</ul>`;
        } else { // Für alle anderen Listen (MAN, etc.)
            const listItems = sortedItems.map(item => {
                const parentOrder = shipments[item.orderNumber] || shipments[Object.keys(shipments).find(key => shipments[key].scannedItems && shipments[key].scannedItems.some(i => i.rawInput === item.rawInput))];
                const isManOrderContext = parentOrder && parentOrder.freightForwarder;
                const positionHtml = isManOrderContext && item.position ? `<span class="position-number">${item.position}.</span>` : ``;

                // Schritt 2 (hier auch): Prüfe, ob die HU-Nummer in der Dunkelalarm-Liste ist.
                const hasDunkelalarm = dunkelalarmedNumbers.has(item.rawInput);
                const alarmClass = hasDunkelalarm ? 'has-dunkelalarm' : '';

                return `<li>${positionHtml}<span class="hu-value ${alarmClass}">${escapeHtml(item.rawInput)}</span></li>`;
            }).join('');
            return `<ul class="hu-list">${listItems}</ul>`;
        }
    };
    
    const generateHtmlForOrderGroup = (order, listItemsHtml, forDunkelalarm = false) => {
        const orderNumber = order.orderNumber || order.hawb;
        let countText = '';
        if (!forDunkelalarm) {
             countText = order.receiptCount !== undefined ? `(${order.receiptCount} von ${order.totalHus} erfasst)`: `(${(order.totalHus - order.pendingHus.length)} von ${order.totalHus} erfasst)`;
        }

        let titleHtml = '';
        if (order.parentOrderNumber) {
            titleHtml = `VVL: ${escapeHtml(order.parentOrderNumber)}<br><small>Kundennr: ${escapeHtml(orderNumber)} ${countText}</small>`;
        } else {
            const isManOrder = order.freightForwarder && order.destinationCountry;
            const titlePrefix = isManOrder ? 'Rechnung: ' : '';
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
    
    openSecurityHusByOrder.sort(sortByCountryAndOrder);
    missingReceiptHusByOrder.sort(sortByCountryAndOrder);
    const dunkelalarmArray = Object.values(dunkelalarmItemsByOrder).sort(sortByCountryAndOrder);

    openHusListContainerEl.innerHTML = openSecurityHusByOrder.map(order => generateHtmlForOrderGroup(order, generateHuListHtml(order.pendingHus, order.scannedItems))).join('') || '<p class="no-open-hus-message">Glückwunsch! Alle HUs sind sicherheitstechnisch bearbeitet.</p>';
    missingReceiptHusListContainerEl.innerHTML = missingReceiptHusByOrder.map(order => generateHtmlForOrderGroup(order, generateHuListHtml(order.pendingHus, order.scannedItems))).join('') || '<p class="no-open-hus-message">Perfekt! Alle HUs wurden im Wareneingang erfasst.</p>';
    dunkelalarmHusListContainerEl.innerHTML = dunkelalarmArray.map(data => generateHtmlForOrderGroup(data, generateHuListHtml(data.items, data.scannedItems), true)).join('') || '<p class="no-open-hus-message">Keine Einträge mit Status "Dunkelalarm" gefunden.</p>';

    showOpenSecurityHusBtnEl.classList.add('active');
    missingReceiptHusListContainerEl.style.display = 'none';
    openHusListContainerEl.style.display = 'block';
    showMissingReceiptHusBtnEl.classList.remove('active');
    dunkelalarmHusListContainerEl.style.display = 'none';
    showDunkelalarmHusBtnEl.classList.remove('active');
    openHusModalEl.classList.add('visible');
    document.body.classList.add('modal-open');
    closeSideMenu(); 
}       
        
        
        
        
        
        
// --- ENDE DER ÄNDERUNG ---
// --- ENDE DER ÄNDERUNG ---
        // --- START: NEUE HILFSFUNKTION ---
        function calculateXryKombiCount(scannedItems) {
            if (!Array.isArray(scannedItems)) return 0;
            // Zählt nur nicht-stornierte Scans, die explizit als XRY Kombi markiert sind.
            return scannedItems.filter(item => 
                item.status === 'XRY' && 
                item.isCombination && 
                !item.isCancelled
            ).length;
        }
        // --- ENDE: NEUE HILFSFUNKTION ---

        function saveShipments(shipments) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shipments));
        }
/**
 * Prüft, ob eine HU-Nummer in irgendeinem HU-Listen-Auftrag existiert.
 * Spielt nur einen Ton, wenn überhaupt HU-Listen-Aufträge existieren.
 * @param {string} huNumber Die zu prüfende HU-Nummer.
 * @returns {boolean} True, wenn die HU erwartet wird, sonst false.
 */
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
        // --- HIER IST DIE NEUE ZEILE ---
        // Setzt die Lautstärke auf den maximalen Wert (100%)
        errorSoundEl.volume = 1.0;
        // --- ENDE DER NEUEN ZEILE ---
        
        // Stelle sicher, dass der Ton am Anfang ist, falls er vorher schon lief
        errorSoundEl.currentTime = 0;
        
        // Spiele den Ton ab
        const playPromise = errorSoundEl.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                // Wenn das Abspielen erfolgreich gestartet wurde, setze einen Timer, um es zu stoppen.
                setTimeout(() => {
                    errorSoundEl.pause();
                }, 500); // Stoppt nach 500 Millisekunden (halbe Sekunde)
            }).catch(error => {
                // Verhindert Konsolenfehler, wenn der Browser das Abspielen blockiert
                console.warn("Audio playback was interrupted or failed:", error);
            });
        }
    }
}
function shortenForwarderName(fullName) {
    if (!fullName) return ''; // Leere Eingaben abfangen

    const lowerCaseName = fullName.toLowerCase();

    if (lowerCaseName.includes('kühne + nagel')) return 'Kühne + Nagel';
    if (lowerCaseName.includes('dhl global forwarding')) return 'DHL';
    if (lowerCaseName.includes('ups')) return 'UPS';
    if (lowerCaseName.includes('maersk') && lowerCaseName.includes('senator')) return 'Maersk/Senator';
    if (lowerCaseName.includes('freight consol')) return 'Freight Consol';
    if (lowerCaseName.includes('logwin')) return 'Logwin';
    if (lowerCaseName.includes('hartrodt')) return 'Hartrodt';
    if (lowerCaseName.includes('db schenker')) return 'DB Schenker';
    if (lowerCaseName.includes('ait worldwide')) return 'AIT Worldwide';
    if (lowerCaseName.includes('dachser')) return 'Dachser';
	if (lowerCaseName.includes('dsv')) return 'DSV';
    if (lowerCaseName.includes('hermes')) return 'HERMES';
    if (lowerCaseName.includes('wws freight')) return 'WWS';

    // Wenn keine Regel zutrifft, den Originalnamen zurückgeben
    return fullName;
}
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

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESEM CODE ---

function displayCurrentShipmentDetails(baseNumberToDisplay) {
    clearError();
    removeActiveInlineNoteEditor();

    const shipments = loadShipments();
    const shipment = baseNumberToDisplay ? shipments[baseNumberToDisplay] : null;

    if (!baseNumberToDisplay || !shipment) {
        currentDetailsDivEl.innerHTML = 'Geben Sie eine Sendungsnummer ein oder wählen Sie eine aus der Liste.';
        currentDetailsDivEl.style.borderColor = '#aac';
        return;
    }
    
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
        detailsHtml += `<strong>Details für ${escapeHtml(baseNumberToDisplay)}:</strong>`;
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
            
            // NEU: Kopfzeile nur für VVL-Listen hinzufügen
            const isVvlList = pendingHuNumbers.some(item => item.sendnr);
            if (isVvlList) {
                detailsHtml += `<div class="pending-list-header"><span>VSE-Nummer</span><span>Sendungs-Nr.</span></div>`;
            }

            const listItemsHtml = pendingHuNumbers.sort((a,b) => (a.position || 9999) - (b.position || 9999)).map(item => {
                const positionHtml = isManOrder && item.position ? `<span class="position-number">${item.position}.</span>` : `<span class="position-number"></span>`;
                
                let itemContentHtml = '';
                // NEU: Prüfen, ob eine Sendungsnummer vorhanden ist und das Layout anpassen
                if (item.sendnr) {
                    // Zweispaltiges Layout für Vorverladelisten
                    itemContentHtml = `
                        <div class="pending-item-details">
                            <span class="pending-vse">${escapeHtml(item.rawInput)}</span>
                            <span class="pending-sendnr">${escapeHtml(item.sendnr)}</span>
                        </div>
                    `;
                } else {
                    // Standard-Layout für normale HU-Listen
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
        let numberPart = isManOrder && item.position ? `<span class="position-number">${item.position}.</span> ` : '';
        let sendnrHtml = item.sendnr ? `<span class="sendnr-display"> (Send.: ${escapeHtml(item.sendnr)})</span>` : '';
        detailsHtml += `${numberPart}<span class="hu-value">${escapeHtml(item.rawInput)}</span>${sendnrHtml} → <span class="status">${escapeHtml(item.status)}</span>${item.isCombination ? ` <span class="combo">(Kombi)</span>` : ''}`;
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
    
    currentDetailsDivEl.innerHTML = detailsHtml;

    if (expected !== null && expected !== undefined) {
        if (receiptScansCount > expected || securityScansCount > expected) currentDetailsDivEl.style.borderColor = 'red';
        else if (receiptScansCount < expected || securityScansCount < expected) currentDetailsDivEl.style.borderColor = 'orange';
        else if (receiptScansCount === expected && securityScansCount === expected) currentDetailsDivEl.style.borderColor = 'green';
        else currentDetailsDivEl.style.borderColor = '#aac';
    } else {
        currentDetailsDivEl.style.borderColor = '#aac';
    }
}
// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER NEUEN VERSION ---

// --- ERSETZEN SIE DIE KOMPLETTE, ALTE FUNKTION MIT DIESER NEUEN VERSION ---

function renderTable() {
    const shipments = loadShipments();
    tableBodyEl.innerHTML = '';
    Object.keys(shipments).sort((a, b) => new Date(shipments[b].lastModified || 0) - new Date(shipments[a].lastModified || 0))
        .forEach(baseNumber => {
            const shipment = shipments[baseNumber];
            if (!shipment) return;
            const row = tableBodyEl.insertRow();
            
            const securityCount = calculateCurrentCountedPieces(shipment.scannedItems || []);
            const receiptCount = calculateGoodsReceiptCount(shipment.scannedItems || []);
            const expected = shipment.totalPiecesExpected;
            const expectedText = expected ?? 'N/A';

            let hawbCellHtml = '';
            if (shipment.parentOrderNumber) {
                hawbCellHtml = `<td data-label="HAWB.">
                    <div class="vvl-table-entry">
                         ${escapeHtml(shipment.parentOrderNumber)} | 
                         ${escapeHtml(baseNumber)}
                    </div>
                </td>`;
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

            // --- HIER IST DIE ÄNDERUNG ---
            // Das | wird durch ein div mit der Klasse "summary-divider" ersetzt.
            let summaryHtml = `
                <strong class="${receiptClass}">WE: ${receiptCount}/${expectedText}</strong>
                <div class="summary-divider"></div>
                <strong class="${securityClass}">Sich.: ${securityCount}/${expectedText}</strong>
            `;
            // --- ENDE DER ÄNDERUNG ---
            
            row.insertCell().outerHTML = `<td data-label="Übersicht" class="summary-cell">${summaryHtml}</td>`;
            
            row.insertCell().outerHTML = `<td data-label="Letzte Änd.">${shipment.lastModified ? new Date(shipment.lastModified).toLocaleString('de-DE') : '-'}</td>`;
            
            const actionsCell = row.insertCell();
            actionsCell.setAttribute('data-label', 'Aktionen');
            actionsCell.classList.add('actions-cell');
            actionsCell.innerHTML = `
                <button class="edit-btn" data-basenumber="${escapeHtml(baseNumber)}" title="Sendung ${escapeHtml(baseNumber)} bearbeiten">Edit</button>
                <button class="pdf-btn" data-basenumber="${escapeHtml(baseNumber)}">PDF</button>
                <button class="delete-btn main-delete-btn" data-basenumber="${escapeHtml(baseNumber)}">Löschen</button>
            `;
        });
    updateEditButtonVisibilityInTable();
    filterTable(shipmentNumberInputEl.value);
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

function processAndSaveSingleScan(rawInputToSave, statusToUse, isCombinationFromCheckbox) {
    const { baseNumber, suffix, isValidFormat, raw: processedRawInput, isSuffixFormat } = processShipmentNumber(rawInputToSave);
    if (!isValidFormat) { return { success: false, waitingForTotal: false, message: `Ungültiges Format: ${escapeHtml(rawInputToSave)}` }; }

    const shipments = loadShipments();
    const parentHawb = findShipmentByHuNumber(processedRawInput);

    // --- LOGIK FÜR HU-LISTEN-AUFTRÄGE ---
    if (parentHawb) {
        const parentShipment = shipments[parentHawb];
        const now = new Date();
        const noteText = noteInputEl.value.trim() || null;
        const isNewScanKombi = (statusToUse === 'XRY' && isCombinationFromCheckbox);
        const isSecurityStatus = EXCLUSIVE_SECURITY_STATUSES.includes(statusToUse);
        const isFinalClearanceScan = isSecurityStatus && !isNewScanKombi;

        // KORREKTE ZÄHLUNG: Zählt, wie oft diese HU in der Originalliste vorkam (physische Slots).
        // Das ist das absolute Limit für jeden Scan-Typ.
        const packageLimitForThisHu = parentShipment.scannedItems.filter(item => 
            item.rawInput.toUpperCase() === processedRawInput.toUpperCase() && 
            (item.status === 'Anstehend' || EXCLUSIVE_SECURITY_STATUSES.includes(item.status))
        ).length;

        // Fall 1: Finale Sicherung (verbraucht einen "Anstehend"-Slot)
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
        
        // Fall 2: Zusätzlicher Scan (wird hinzugefügt, mit präziser Limit-Prüfung)
        } else {
            // Zählt, wie viele Scans des ZIEL-TYPS bereits existieren
            let currentScansOfType = 0;
            if(isNewScanKombi) {
                currentScansOfType = parentShipment.scannedItems.filter(item => item.rawInput.toUpperCase() === processedRawInput.toUpperCase() && item.isCombination && !item.isCancelled).length;
            } else {
                 currentScansOfType = parentShipment.scannedItems.filter(item => item.rawInput.toUpperCase() === processedRawInput.toUpperCase() && item.status === statusToUse && !item.isCancelled).length;
            }
            
            // Vergleicht die aktuelle Anzahl mit dem Limit
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
        // Logik für neue Sendungen
        const tempIsCombination = (statusToUse === 'XRY' && !isBatchModeActive && isCombinationFromCheckbox);
        const tempFinalIsCombination = NON_COUNTING_STATUSES.includes(statusToUse) ? false : tempIsCombination;
        pendingScanDataForNewShipment = { baseNumber, rawInput: processedRawInput, status: statusToUse, isCombination: tempFinalIsCombination, note: noteInputEl.value.trim() || null, timestamp: new Date().toISOString(), suffix };
        newTotalLabelEl.textContent = `Erwartete Gesamtstückzahl für NEUE Sendung ${escapeHtml(baseNumber)}:`; newTotalInputEl.value = ''; newTotalSectionEl.classList.remove('warning-existing'); toggleMainInputControls(false); newTotalInputEl.focus();
        return { success: false, waitingForTotal: true, message: `Bitte Gesamtstückzahl für ${escapeHtml(baseNumber)} eingeben oder überspringen.` };
    }
    
    // Logik für bereits existierende, normale Sendungen
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


      function showInlineNoteEditor(targetElement) {
            removeActiveInlineNoteEditor(); // Zuerst bestehenden Editor entfernen

            const liElement = targetElement.closest('li');
            if (!liElement) return;

            const baseNumber = targetElement.dataset.basenumber;
            const itemTimestamp = targetElement.dataset.timestamp;
            const noteIndex = targetElement.dataset.noteIndex; // Kann undefined sein (beim Hinzufügen)
            const isEditing = noteIndex !== undefined;
            const currentNote = isEditing ? liElement.querySelector(`.editable-note[data-note-index="${noteIndex}"]`).textContent : '';

            // Editor nach "Notiz hinzufügen" oder nach der Notizliste einfügen
            const placeholderDiv = liElement.querySelector('.inline-note-editor-placeholder');
            if (!placeholderDiv) return;

            liElement.classList.add('editing-note'); // Versteckt Links, während editiert wird

            const editorHtml = `
                <div class="inline-note-editor">
                    <input type="text" class="inline-note-input" value="${escapeHtml(currentNote)}" placeholder="Notiz eingeben...">
                    <div class="inline-note-editor-actions">
                        <button class="inline-note-save-btn" data-basenumber="${escapeHtml(baseNumber)}" data-timestamp="${itemTimestamp}" ${isEditing ? `data-note-index="${noteIndex}"` : ''}>Speichern</button>
                        <button class="inline-note-cancel-btn">Abbrechen</button>
                    </div>
                </div>`;
            placeholderDiv.innerHTML = editorHtml;

            const inputField = placeholderDiv.querySelector('.inline-note-input');
            if (inputField) {
                inputField.focus(); inputField.select();
                inputField.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); placeholderDiv.querySelector('.inline-note-save-btn')?.click(); }});
                inputField.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); placeholderDiv.querySelector('.inline-note-cancel-btn')?.click(); }});
            }
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
                    currentBatch.splice(index, 1);
                    updateBatchUI();
                    if (currentBatch.length === 0) { // Wenn Batch leer wird
                        isBatchNotePromptRequired = true; // Für nächsten Batch wieder Modal
                        currentBatchGlobalNote = null;
                        updateCurrentBatchNoteDisplay();
                    }
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

function addToBatch() {
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

    if (unexpectedHuSoundToggleEl && unexpectedHuSoundToggleEl.checked) {
        if (!isHuExpected(processedRawInput)) {
            // --- HIER IST DIE ÄNDERLUNG ---
            // Anstatt direkt .play() aufzurufen, rufen wir unsere neue Hilfsfunktion auf.
            playShortErrorSound();
            // --- ENDE DER ÄNDERUNG ---
        }
    }

    if (isBatchModeActive && currentBatch.length === 0 && isBatchNotePromptRequired && batchNoteToggleEl.checked) {
        pendingFirstBatchScanData = { rawInput: processedRawInput, scanTimestamp: scanTimestamp };
        batchNoteInputEl.value = currentBatchGlobalNote || ''; 
        batchNoteModalEl.classList.add('visible');
        document.body.classList.add('modal-open');
        batchNoteInputEl.focus();
        return;
    }

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

function saveBatch() {
    if (currentBatch.length === 0) { displayError("Batch ist leer."); focusShipmentInput(); return; }
    
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
    function generatePdf(baseNumber) {
        const shipments = loadShipments();
        const shipment = shipments[baseNumber];
        if (!shipment || !shipment.scannedItems || shipment.scannedItems.length === 0) {
            displayError(`Keine Scans für ${escapeHtml(baseNumber)} für PDF.`); return;
        }
        try {
            const doc = new jsPDF();
            const expected = shipment.totalPiecesExpected;
            const securityScansCount = calculateCurrentCountedPieces(shipment.scannedItems);
            const receiptScansCount = calculateGoodsReceiptCount(shipment.scannedItems);

            doc.setFontSize(18); doc.text(`Sicherheitsprotokoll: ${baseNumber}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Mitarbeiter: ${MITARBEITER_NAME}`, 14, 30);
            doc.text(`RegB Nummer: ${RAC_NUMMER}`, 14, 35);
            doc.text(`Gesamtstücke erwartet: ${expected !== null ? expected : 'N/A'}`, 14, 40);
            
            // --- NEUE ZEILEN FÜR PDF-HEADER ---
            doc.text(`Wareneingang erfasst: ${receiptScansCount} von ${expected !== null ? expected : 'N/A'} Stk.`, 14, 45);
            doc.text(`Sicherheitskontrolle: ${securityScansCount} von ${expected !== null ? expected : 'N/A'} Stk.`, 14, 50);
            
            doc.text(`Letzte Änderung: ${new Date(shipment.lastModified).toLocaleString('de-DE')}`, 14, 55);
            doc.text(`Generiert am: ${new Date().toLocaleString('de-DE')}`, 14, 60);

            let startY = 70; // Etwas mehr Platz nach oben
            if (doc.autoTable) {
                const tableData = shipment.scannedItems
                    .filter(item => item.status !== 'Anstehend')
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .map(item => {
                        let statusText = item.status;
                        if (item.isCombination) statusText += ' (Kombi)';
                        if (item.isCancelled) statusText += ' (Storniert)';
                        let noteText = '';
                        if (item.notes && item.notes.length > 0) {
                            noteText = `\nNotizen: ${item.notes.join('; ')}`;
                        }
                        return [
                            new Date(item.timestamp).toLocaleString('de-DE'),
                            item.rawInput, RAC_NUMMER, MITARBEITER_NAME, statusText + noteText
                        ];
                    });
                doc.autoTable({
                    head: [['Zeitstempel', 'Gescannte Nummer', 'RegB Nummer', 'Mitarbeiter', 'Status/Notiz']],
                    body: tableData, startY: startY, theme: 'grid',
                    headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
                    columnStyles: { 0:{cellWidth:28}, 1:{cellWidth:'auto'}, 2:{cellWidth:35}, 3:{cellWidth:30}, 4:{cellWidth:'auto'} },
                    didParseCell: function (data) {
                         const originalItem = shipment.scannedItems
                            .filter(item => item.status !== 'Anstehend')
                            .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp))[data.row.index];
                        if (originalItem && originalItem.isCancelled) { data.cell.styles.textColor = [150,150,150]; }
                    }
                });
                startY = doc.autoTable.previous.finalY + 10;
            } else { alert("PDF AutoTable nicht verfügbar."); return; }

// --- NEUER, INTELLIGENTER CODE-BLOCK ---
const validScans = shipment.scannedItems.filter(item => 
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

    const uniqueMethods = Object.keys(statusCounts);

    if (uniqueMethods.length === 1) {
        // Fall 1: Nur eine Methode wurde verwendet
        summaryString += "SPX by " + uniqueMethods[0];
    } else {
        // Fall 2: Mehrere Methoden wurden verwendet, mit Zählung
        const summaryParts = uniqueMethods.sort().map(status => {
            return `${status} (${statusCounts[status]}x)`;
        });
        summaryString += "SPX by " + summaryParts.join(', ');
    }
} else {
    summaryString += "Keine zählende Sicherungsmethode angewendet.";
}
// --- ENDE DES NEUEN BLOCKS ---
            
            doc.setFontSize(11); doc.setFont(undefined, 'bold');
            if (startY > 280) { doc.addPage(); startY = 20; }
            doc.text(summaryString, 14, startY);
            doc.output('dataurlnewwindow');
            clearError();
        } catch (error) { console.error("PDF Fehler:", error); displayError("Fehler beim Erstellen/Öffnen des PDFs."); }
        focusShipmentInput();
    }        
        // --- Google Sheet & E-Mail Integration ---
        async function sendDataToSheet() {
            removeActiveInlineNoteEditor();
            if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_DEPLOYED_WEB_APP_URL_HERE')) {
                sheetStatusEl.textContent = 'Fehler: Web App URL fehlt.'; sheetStatusEl.style.color = 'red';
                alert("Fehler: Die Web App URL wurde nicht im Skript konfiguriert."); return;
            }
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










        // --- Event Listener Setup ---
        function setupEventListeners() {
            mainActionButtonEl.addEventListener('click', () => {
                clearError();
                removeActiveInlineNoteEditor();
                if (isBatchModeActive) {
                    addToBatch();
                } else {
                    if (newTotalSectionEl.classList.contains('visible')) return; // Warten auf Total-Eingabe
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
                    } else { // Warten auf Gesamtstückzahl
                        displayError(result.message, 'orange');
                        // Fokus ist auf newTotalInputEl
                    }
                }
            });

// --- ERSETZEN SIE DEN GESAMTEN addEventListener-BLOCK MIT DIESEM CODE ---

// --- ERSETZEN SIE DEN GESAMTEN addEventListener-BLOCK MIT DIESEM CODE ---

// --- ERSETZEN SIE DEN GESAMTEN addEventListener-BLOCK MIT DIESER KORRIGIERTEN VERSION ---

shipmentNumberInputEl.addEventListener('input', () => {
    const currentValue = shipmentNumberInputEl.value.trim();

    // --- QR-CODE-VERARBEITUNG ---
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
            const hus = huData.split(' ').filter(Boolean);

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
                hus.forEach((hu, index) => {
                    newShipment.scannedItems.push({ rawInput: hu, status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, position: index + 1 });
                    addedCount++;
                });
            } else {
                // Logik zum Hinzufügen zu bestehenden Aufträgen bleibt gleich
            }
        });
        saveShipments(shipments);
        alert(`Multi-Import abgeschlossen:\n- Verarbeitete Aufträge: ${processedOrders.length}\n- Neue HUs hinzugefügt: ${addedCount}\n- Duplikate übersprungen: ${duplicateCount}`);
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

        parts.forEach(orderData => {
            const [metaAndOrder, huData] = orderData.split('|||');
            if (!metaAndOrder || !huData) return;
            const metaParts = metaAndOrder.split('|');
            const kundennr = metaParts[0];
            const vorverladelisteNr = metaParts.length > 1 ? metaParts[1] : 'N/A';
            const positionen = huData.split(' ').filter(Boolean);

            // PRÜFUNG: Existiert der Kunde bereits?
            if (!shipments[kundennr]) {
                // NEUER KUNDE: Anlegen und alle Positionen hinzufügen
                newOrders.add(kundennr);
                shipments[kundennr] = {
                    hawb: kundennr, lastModified: now, totalPiecesExpected: positionen.length,
                    scannedItems: [], mitarbeiter: MITARBEITER_NAME, isHuListOrder: true,
                    parentOrderNumber: vorverladelisteNr
                };
                positionen.forEach(pos => {
                    const [vse, sendnr] = pos.split(':');
                    shipments[kundennr].scannedItems.push({
                        rawInput: vse, sendnr: sendnr, status: 'Anstehend', timestamp: now,
                        isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null
                    });
                    addedPositionsCount++;
                });
            } else {
                // BESTEHENDER KUNDE: Nur die NEUEN Positionen hinzufügen
                updatedOrders.add(kundennr);
                const existingShipment = shipments[kundennr];
                let newPositionsAddedToThisCustomer = 0;

                positionen.forEach(pos => {
                    const [vse, sendnr] = pos.split(':');
                    const alreadyExists = existingShipment.scannedItems.some(item => item.rawInput === vse);
                    if (!alreadyExists) {
                        existingShipment.scannedItems.push({
                            rawInput: vse, sendnr: sendnr, status: 'Anstehend', timestamp: now,
                            isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null
                        });
                        addedPositionsCount++;
                        newPositionsAddedToThisCustomer++;
                    }
                });

                if (newPositionsAddedToThisCustomer > 0) {
                    existingShipment.totalPiecesExpected += newPositionsAddedToThisCustomer;
                    existingShipment.lastModified = now;
                }
            }
        });

        saveShipments(shipments);
        alert(`Import abgeschlossen:\n- ${addedPositionsCount} Positionen importiert.\n- ${newOrders.size} neue Aufträge angelegt.\n- ${updatedOrders.size} Aufträge aktualisiert.`);
        location.reload();
        return;
    }

    // --- MANUELLE EINGABE / BATCH-MODUS ---
    updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);

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
    } 
    else if (shipments[processedDirectBase.toUpperCase()]) {
        baseNumberToShow = processedDirectBase.toUpperCase();
        clearError();
    } 
    else if (currentValue.length > 3) {
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
                if (isBatchModeActive) {
                    setTimeout(focusShipmentInput, 10);
                }
            });
            securityStatusSelectEl.addEventListener('change', () => {
                updateNoteAndComboVisibility();
                focusShipmentInput();
            });
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
                let isSuggestionSelected = false;
                for (let i = 0; i < suggestions.length; i++) {
                    if (suggestions[i].value === noteInputEl.value) {
                        isSuggestionSelected = true;
                        break;
                    }
                }

                if (isSuggestionSelected) {
                    focusShipmentInput();
                }
            });
            clearNoteButtonEl.addEventListener('click', () => {
                resetSingleScanNoteInputState();
                focusShipmentInput();
            });

            currentDetailsDivEl.addEventListener('click', (event) => {
                const target = event.target;
                event.preventDefault();

                if (target.classList.contains('editable-note') || target.classList.contains('add-note-link')) {
                    showInlineNoteEditor(target);
                } else if (target.classList.contains('inline-note-save-btn')) {
                    const editorDiv = target.closest('.inline-note-editor');
                    if (editorDiv) {
                        const inputField = editorDiv.querySelector('.inline-note-input');
                        const noteIndex = target.dataset.noteIndex;
                        saveOrUpdateNote(target.dataset.basenumber, target.dataset.timestamp, noteIndex, inputField.value);
                    }
                } else if (target.classList.contains('inline-note-cancel-btn')) {
                    removeActiveInlineNoteEditor();
                    focusShipmentInput();
                } else if (target.classList.contains('cancel-button')) {
                    requestCancelScanItem(target.dataset.basenumber, target.dataset.timestamp);
                } else if (target.classList.contains('delete-note-btn')) {
                    requestDeleteNote(target.dataset.basenumber, target.dataset.timestamp, target.dataset.noteIndex);
                }
            });

            tableBodyEl.addEventListener('click', (event) => {
                const target = event.target;
                const baseNumber = target.dataset.basenumber;
                if (!baseNumber) return;

                if (target.classList.contains('edit-btn') && !isBatchModeActive) {
                    openEditModal(baseNumber);
                } else if (target.classList.contains('pdf-btn')) {
                    generatePdf(baseNumber);
                } else if (target.classList.contains('main-delete-btn')) {
                    if (confirm(`Sendung ${escapeHtml(baseNumber)} wirklich löschen?`)) {
                        deleteShipment(baseNumber);
                    }
                }
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
                    currentBatchGlobalNote = null; // <-- WICHTIGE ÄNDERUNG: Notiz zurücksetzen
                    batchNoteToggleEl.checked = false;
                    updateBatchUI(); clearError(); displayCurrentShipmentDetails('');
                } else if (currentBatch.length === 0) {
                    displayError("Batch ist bereits leer.");
                }
                focusShipmentInput();
            });            
            // Listener für den Notiz-Schalter, um das Modal auch mitten im Batch zu öffnen
            batchNoteToggleEl.addEventListener('change', () => {
                if (batchNoteToggleEl.checked && isBatchModeActive) {
                    batchNoteInputEl.value = currentBatchGlobalNote || '';
                    batchNoteModalEl.classList.add('visible');
                    document.body.classList.add('modal-open');
                    // NEU: Diese Zeile auskommentieren.
                    // batchNoteInputEl.focus();
                }
            });

            confirmBatchNoteButtonEl.addEventListener('click', confirmAndAddFirstBatchItemWithNote); // schließt Modal intern
            skipBatchNoteButtonEl.addEventListener('click', skipNoteAndAddFirstBatchItem);       // schließt Modal intern
            batchNoteModalEl.addEventListener('click', (e) => { if (e.target === batchNoteModalEl) skipNoteAndAddFirstBatchItem(); });

            // Seitenmenü
            menuToggleBtnEl.addEventListener('click', (e) => { e.stopPropagation(); sideMenuEl.classList.contains('open') ? closeSideMenu() : openSideMenu(); });
            menuOverlayEl.addEventListener('click', closeSideMenu);
            sendToSheetButtonEl.addEventListener('click', sendDataToSheet);
            resetDataButtonEl.addEventListener('click', () => {
                removeActiveInlineNoteEditor();
                if (confirm("WARNUNG!\n\nMöchtest du wirklich ALLE erfassten Sendungsdaten unwiderruflich löschen?")) {
                    // Die Hauptaktion bleibt: Lokalen Speicher leeren
                    localStorage.removeItem(LOCAL_STORAGE_KEY);
                    
                    // NEU: Seite neu laden, um den Reset abzuschließen.
                    // Die UI-Updates danach sind nicht mehr nötig, da die Seite von Grund auf neu lädt.
                    location.reload(); 
                } else {
                    sheetStatusEl.textContent = 'Zurücksetzen abgebrochen.';
                    sheetStatusEl.style.color = 'blue';
                    setTimeout(() => { if (sheetStatusEl.textContent.includes('abgebrochen')) sheetStatusEl.textContent = ''; }, 3000);
                }
            });
            sendSummaryEmailButtonEl.addEventListener('click', sendSummaryEmail);

            // Double-Click auf Input für manuelle Eingabe (optional)
            shipmentNumberInputEl.addEventListener('dblclick', () => {
                 if (!isBatchModeActive && !editModalEl.classList.contains('visible') && !batchNoteModalEl.classList.contains('visible')) {
                    shipmentNumberInputEl.inputMode = 'text';
                    setTimeout(() => shipmentNumberInputEl.focus(), 0);
                 }
            });

            importHuListButtonEl.addEventListener('click', () => {
                // 1. Zwingt die Tastatur zum Schließen, indem der Fokus vom aktuellen Element genommen wird.
                if (document.activeElement && typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur();
                }

                sideMenuEl.classList.remove('open');
                menuOverlayEl.classList.remove('visible');
                
                // 2. Setzt Felder in den "Scanner-Modus".
                mainOrderNumberInputEl.inputMode = 'none';
                huListTextareaEl.inputMode = 'none';
                
                // 3. NEU: Macht die Felder explizit un-fokussierbar, um Android daran zu hindern, die Tastatur zu öffnen.
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


            // --- Doppelklick-Logik für manuelle Eingabe im HU-Modal ---
            mainOrderNumberInputEl.addEventListener('dblclick', () => {
                mainOrderNumberInputEl.inputMode = 'text';
                mainOrderNumberInputEl.focus();
            });

            huListTextareaEl.addEventListener('dblclick', () => {
                huListTextareaEl.inputMode = 'text';
                huListTextareaEl.focus();
            });

            // --- HIER IST DER NEUE BLOCK ---
            // Automatischer Zeilenumbruch beim Scannen in der Textarea
            huListTextareaEl.addEventListener('input', () => {
                if (huListTextareaEl.inputMode === 'none') {
                    huListTextareaEl.value += '\n';
                    huListTextareaEl.scrollTop = huListTextareaEl.scrollHeight;
                }
            });
            // --- ENDE DES NEUEN BLOCKS ---
            // ===== START: NEUE EVENT LISTENER FÜR HU-ZUSAMMENFASSUNG =====
            showOpenHusButtonEl.addEventListener('click', (e) => {
                e.preventDefault();
                showOpenHusSummary();
            });
            
            closeOpenHusModalButtonEl.addEventListener('click', () => {
                openHusModalEl.classList.remove('visible');
                document.body.classList.remove('modal-open'); // NEU
                focusShipmentInput();
            });
            
            openHusModalEl.addEventListener('click', (e) => {
                if (e.target === openHusModalEl) {
                    openHusModalEl.classList.remove('visible');
                    document.body.classList.remove('modal-open'); // NEU
                    focusShipmentInput();
                }
            });
            
// --- START DER ÄNDERUNG: Die Event-Listener für die Modal-Tabs werden aktualisiert ---
            // ===== START: EVENT LISTENER FÜR HU-MODAL-TABS =====
            showOpenSecurityHusBtnEl.addEventListener('click', () => {
                showOpenSecurityHusBtnEl.classList.add('active');
                showMissingReceiptHusBtnEl.classList.remove('active');
                showDunkelalarmHusBtnEl.classList.remove('active');

                openHusListContainerEl.style.display = 'block';
                missingReceiptHusListContainerEl.style.display = 'none';
                dunkelalarmHusListContainerEl.style.display = 'none';
            });

            showMissingReceiptHusBtnEl.addEventListener('click', () => {
                showMissingReceiptHusBtnEl.classList.add('active');
                showOpenSecurityHusBtnEl.classList.remove('active');
                showDunkelalarmHusBtnEl.classList.remove('active');

                missingReceiptHusListContainerEl.style.display = 'block';
                openHusListContainerEl.style.display = 'none';
                dunkelalarmHusListContainerEl.style.display = 'none';
            });

            // Neuer Listener für den Dunkelalarm-Tab
            showDunkelalarmHusBtnEl.addEventListener('click', () => {
                showDunkelalarmHusBtnEl.classList.add('active');
                showOpenSecurityHusBtnEl.classList.remove('active');
                showMissingReceiptHusBtnEl.classList.remove('active');

                dunkelalarmHusListContainerEl.style.display = 'block';
                openHusListContainerEl.style.display = 'none';
                missingReceiptHusListContainerEl.style.display = 'none';
            });
            // ===== ENDE: EVENT LISTENER FÜR HU-MODAL-TABS =====
// --- ENDE DER ÄNDERUNG ---
        } // Ende der setupEventListeners Funktion








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

        // --- Initialisierung ---
        function initializeApp() {
            renderTable();
            isBatchModeActive = batchModeToggleEl.checked; // Zustand vom Toggle übernehmen
            sessionFirstSuffixScans = {}; // Reset bei jedem Laden
            notifiedCompletions = new Set(); // Reset bei jedem Laden
            
            resetSingleScanNoteInputState();
            toggleBatchMode(isBatchModeActive); // Initial Batch Mode anwenden (setzt auch Flags)
            // displayCurrentShipmentDetails(''); // Start mit leerem Details-Bereich
            updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
            updateClearButtonVisibility(noteInputEl, clearNoteButtonEl);
            updateCurrentBatchNoteDisplay(); // Initial Batch Notiz (leer)

            setupEventListeners();
            focusShipmentInput();
            console.log(`Fracht Tracker ${document.title.split('(')[1].split(')')[0]} initialized.`);
        }

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
