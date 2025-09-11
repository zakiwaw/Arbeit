document.addEventListener('DOMContentLoaded', function() {
    
    // --- Firebase & Globale Variablen ---
    const db = firebase.firestore();
    const auth = firebase.auth();
    let currentUser = null;
    let allShipments = {};

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
    const batchNoteToggleEl = document.getElementById('batchNoteToggle');
    const currentBatchNoteDisplayEl = document.getElementById('currentBatchNoteDisplay');
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
    const errorSoundEl = document.getElementById('errorSound');
    const unexpectedHuSoundToggleEl = document.getElementById('unexpectedHuSoundToggle');
    const noteEditModalEl = document.getElementById('noteEditModal');
    const noteEditContextEl = document.getElementById('noteEditContext');
    const noteEditBaseNumberEl = document.getElementById('noteEditBaseNumber');
    const noteEditTimestampEl = document.getElementById('noteEditTimestamp');
    const noteEditNoteIndexEl = document.getElementById('noteEditNoteIndex');
    const noteEditTextareaEl = document.getElementById('noteEditTextarea');
    const saveNoteEditButtonEl = document.getElementById('saveNoteEditButton');
    const cancelNoteEditButtonEl = document.getElementById('cancelNoteEditButton');

    // --- Konstanten & Konfiguration ---
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbweFC3K1wgksWq3Dd79bJDkbsBdYaORycXSlbIGvQ5JDe6eYj7PtTti3gpBJArRSdp63Q/exec';
    const SUFFIX_LENGTH = 4;
    const RAC_NUMMER = "DE/RA/00151-20";
    const NON_COUNTING_STATUSES = ['Dunkelalarm', 'Anstehend', 'NichtSichern', 'Abgelehnt', 'Wareneingang'];
    const NOTE_ALLOWED_STATUSES = ['XRY', 'Abgelehnt', 'Dunkelalarm', 'ETD', 'EDD'];
    const EXCLUSIVE_SECURITY_STATUSES = ['XRY', 'ETD', 'EDD'];

    // --- Anwendungsstatus ---
    let isBatchModeActive = false;
    let currentBatch = [];
    let batchStatus = '';
    let batchIsCombination = false;
    let pendingScanDataForNewShipment = null;
    let notifiedCompletions = new Set();
    let currentBatchGlobalNote = null;
    let isBatchNotePromptRequired = true;
    let pendingFirstBatchScanData = null;

    // --- Authentifizierung ---
    function setupAuthListeners() {
        const loginContainer = document.getElementById('login-container');
        const appContainer = document.getElementById('app-container');
        const userNameEl = document.getElementById('userName');

        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                loginContainer.style.display = 'none';
                appContainer.style.display = 'block';
                userNameEl.textContent = user.displayName || user.email;
                initializeApp();
                listenForShipmentUpdates();
            } else {
                currentUser = null;
                loginContainer.style.display = 'block';
                appContainer.style.display = 'none';
            }
        });
    }

    function signIn() {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(error => {
            console.error("Fehler bei der Anmeldung:", error);
            alert("Anmeldung fehlgeschlagen: " + error.message);
        });
    }

    function signOut() {
        auth.signOut().catch(error => console.error("Fehler bei der Abmeldung:", error));
    }

    // --- Firestore Daten-Handling ---
    function listenForShipmentUpdates() {
        db.collection('shipments').orderBy('lastModified', 'desc').onSnapshot(snapshot => {
            const shipmentsFromDb = {};
            snapshot.forEach(doc => {
                shipmentsFromDb[doc.id] = doc.data();
            });
            allShipments = shipmentsFromDb;
            renderTable();
            const { baseNumber } = processShipmentNumber(shipmentNumberInputEl.value);
            if (allShipments[baseNumber]) {
                displayCurrentShipmentDetails(baseNumber);
            }
        }, error => {
            console.error("Fehler beim Laden der Sendungen aus Firestore:", error);
            displayError("Datenbank-Verbindungsfehler!");
        });
    }

    async function saveShipmentToFirestore(baseNumber, shipmentData) {
        if (!currentUser) {
            console.error("Nicht angemeldet. Speichern nicht möglich.");
            return;
        }
        shipmentData.lastModifiedBy = currentUser.displayName;
        shipmentData.lastModified = new Date().toISOString();
        try {
            await db.collection('shipments').doc(baseNumber).set(shipmentData, { merge: true });
        } catch (error) {
            console.error("Fehler beim Speichern in Firestore:", error);
            displayError("Synchronisationsfehler!");
        }
    }
    
    async function deleteShipmentFromFirestore(baseNumber) {
        try {
            await db.collection('shipments').doc(baseNumber).delete();
        } catch (error) {
            console.error("Fehler beim Löschen aus Firestore:", error);
            displayError("Fehler beim Löschen!");
        }
    }

    // --- Hilfsfunktionen ---
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
        if (isModalVisible('#editModal') || isModalVisible('#batchNoteModal') || isModalVisible('#importHuModal') ||
            (sideMenuEl && sideMenuEl.classList.contains('open')) ||
            (newTotalSectionEl && newTotalSectionEl.classList.contains('visible')) ||
             isModalVisible('#noteEditModal')) {
            return;
        }
        if (shipmentNumberInputEl && !shipmentNumberInputEl.disabled) {
            shipmentNumberInputEl.inputMode = 'none';
            setTimeout(() => shipmentNumberInputEl.focus(), 0);
        }
    }

    function processShipmentNumber(rawInput) {
        if (!rawInput) return { baseNumber: '', suffix: null, isValidFormat: false, raw: '', isSuffixFormat: false };
        const raw = rawInput.trim().toUpperCase();
        
        let baseNumber = '';
        let suffix = null;
        let isValidFormat = false;
        let isSuffixFormat = false;
        
        const MIN_LENGTH_FOR_IMPLICIT_SUFFIX = 12;

        if (raw.includes('+')) {
            const parts = raw.split('+');
            if (parts.length === 2 && parts[0].length > 0 && parts[1].length === SUFFIX_LENGTH && /^\d+$/.test(parts[1])) {
                baseNumber = parts[0];
                suffix = parts[1];
                isValidFormat = true;
                isSuffixFormat = true;
            }
        } 
        else if (raw.length >= MIN_LENGTH_FOR_IMPLICIT_SUFFIX && /\d{4}$/.test(raw.slice(-SUFFIX_LENGTH))) {
            suffix = raw.slice(-SUFFIX_LENGTH);
            let preSuffixPart = raw.slice(0, -SUFFIX_LENGTH);
            baseNumber = preSuffixPart.replace(/0+$/, '');
            if (baseNumber.length > 0) {
                isValidFormat = true;
                isSuffixFormat = true;
            }
        } 
        else if (raw.length > 0) {
            baseNumber = raw;
            suffix = null;
            isValidFormat = true;
            isSuffixFormat = false;
        }

        if (baseNumber.length === 0) {
             isValidFormat = false;
        }

        return { baseNumber, suffix, isValidFormat, raw, isSuffixFormat };
    }

    function findShipmentByHuNumber(huNumber) {
        const shipments = allShipments;
        const upperHuNumber = huNumber.trim().toUpperCase();
        if (!upperHuNumber) return null;
        for (const baseNumber in shipments) {
            const shipment = shipments[baseNumber];
            if (shipment.isHuListOrder && shipment.scannedItems && Array.isArray(shipment.scannedItems)) {
                const foundItem = shipment.scannedItems.find(item => item.rawInput.toUpperCase() === upperHuNumber);
                if (foundItem) {
                    return baseNumber;
                }
            }
        }
        return null;
    }
    
    function findShipmentByNoteContent(searchText) {
        const shipments = allShipments;
        const upperSearchText = searchText.trim().toUpperCase();
        if (!upperSearchText) return null;
        for (const baseNumber in shipments) {
            const shipment = shipments[baseNumber];
            if (shipment.scannedItems && Array.isArray(shipment.scannedItems)) {
                for (const item of shipment.scannedItems) {
                    if (item.notes && Array.isArray(item.notes)) {
                        for (const note of item.notes) {
                            if (note && note.trim().toUpperCase() === upperSearchText) {
                                return baseNumber;
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    function calculateCurrentCountedPieces(scannedItems) {
        if (!Array.isArray(scannedItems)) return 0;
        return scannedItems.filter(item => !item.isCombination && !item.isCancelled && !NON_COUNTING_STATUSES.includes(item.status)).length;
    }
    
    function calculateGoodsReceiptCount(scannedItems) {
        if (!Array.isArray(scannedItems)) return 0;
        return scannedItems.filter(item => item.status === 'Wareneingang' && !item.isCancelled).length;
    }
    
    function calculateXryKombiCount(scannedItems) {
        if (!Array.isArray(scannedItems)) return 0;
        return scannedItems.filter(item => item.status === 'XRY' && item.isCombination && !item.isCancelled).length;
    }
    
    function calculateDunkelalarmCount(scannedItems) {
        if (!Array.isArray(scannedItems)) return 0;
        return scannedItems.filter(item => item.status === 'Dunkelalarm' && !item.isCancelled).length;
    }

    function getStatusClass(count, expected) {
        if (expected === null || expected === undefined || count === 0) { return ''; }
        if (count < expected) { return 'mismatch'; }
        if (count === expected) { return 'ok'; }
        if (count > expected) { return 'over'; }
        return '';
    }
    
    function playShortErrorSound() {
        if (errorSoundEl) {
            errorSoundEl.volume = 1.0;
            errorSoundEl.currentTime = 0;
            const playPromise = errorSoundEl.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setTimeout(() => { errorSoundEl.pause(); }, 500);
                }).catch(error => console.warn("Audio playback failed:", error));
            }
        }
    }
    
    function shortenForwarderName(fullName) {
        if (!fullName) return '';
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
        return fullName;
    }

    // --- UI Update Funktionen ---
    function renderTable() {
        const shipments = allShipments;
        tableBodyEl.innerHTML = '';
        Object.keys(shipments).forEach(baseNumber => {
            const shipment = shipments[baseNumber];
            if (!shipment) return;
            const row = tableBodyEl.insertRow();
            
            const securityCount = calculateCurrentCountedPieces(shipment.scannedItems || []);
            const receiptCount = calculateGoodsReceiptCount(shipment.scannedItems || []);
            const expected = shipment.totalPiecesExpected;
            const expectedText = expected ?? 'N/A';

            let hawbCellHtml = `<td data-label="HAWB.">${escapeHtml(baseNumber)}</td>`;
            row.insertCell().outerHTML = hawbCellHtml;

            const receiptClass = getStatusClass(receiptCount, expected);
            const securityClass = getStatusClass(securityCount, expected);
            
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
                <button class="edit-btn" data-basenumber="${escapeHtml(baseNumber)}">Edit</button>
                <button class="pdf-btn" data-basenumber="${escapeHtml(baseNumber)}">PDF</button>
                <button class="delete-btn main-delete-btn" data-basenumber="${escapeHtml(baseNumber)}">Löschen</button>
            `;
        });
        document.body.classList.toggle('batch-mode-active', isBatchModeActive);
        filterTable(shipmentNumberInputEl.value);
    }

    function displayCurrentShipmentDetails(baseNumberToDisplay) {
        clearError();
        
        const shipment = baseNumberToDisplay ? allShipments[baseNumberToDisplay] : null;

        if (!shipment) {
            currentDetailsDivEl.innerHTML = 'Geben Sie eine Sendungsnummer ein oder wählen Sie eine aus der Liste.';
            currentDetailsDivEl.style.borderColor = '#aac';
            return;
        }
        
        let detailsHtml = `<strong>Details für ${escapeHtml(baseNumberToDisplay)}:</strong>`;
        
        detailsHtml += `<ul>`;
        (shipment.scannedItems || []).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).forEach(item => {
            const dt = new Date(item.timestamp);
            const timeStr = dt.toLocaleTimeString('de-DE');
            const dateStr = dt.toLocaleDateString('de-DE');
            const isCancelled = item.isCancelled;

            detailsHtml += `<li class="${isCancelled ? 'cancelled-item' : ''}">`;
            detailsHtml += `<div class="scan-main-info">`;
            detailsHtml += `<span class="timestamp">[${dateStr} ${timeStr}]</span> ${escapeHtml(item.rawInput)} → <span class="status">${escapeHtml(item.status)}</span>${item.isCombination ? ` <span class="combo">(Kombi)</span>` : ''}`;
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
                    notesListHtml += `<div class="note-item"><span class="note-prefix">Notiz:</span><span class="editable-note" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}" data-note-index="${index}">${escapeHtml(note)}</span><button class="delete-note-btn" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}" data-note-index="${index}">×</button></div>`;
                });
                notesListHtml += '</div>';
                detailsHtml += notesListHtml;
            }
            if (!isCancelled) {
                detailsHtml += `<a href="#" class="add-note-link" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}">Notiz hinzufügen</a>`;
                detailsHtml += `<button class="photo-button" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}" title="Foto hinzufügen">📷</button>`;
            }
            detailsHtml += `</div>`;
            detailsHtml += `</li>`;
        });
        detailsHtml += `</ul>`;

        const expected = shipment.totalPiecesExpected;
        const securityCount = calculateCurrentCountedPieces(shipment.scannedItems || []);
        const receiptCount = calculateGoodsReceiptCount(shipment.scannedItems || []);
        detailsHtml += `<div class="summary">`;
        let expectedText = (expected !== null && expected !== undefined) ? `${expected} Stk.` : 'N/A';
        const receiptClass = getStatusClass(receiptCount, expected);
        detailsHtml += `<span>Wareneingang: <span class="${receiptClass}">${receiptCount} von ${expectedText}</span></span>`;
        const securityClass = getStatusClass(securityCount, expected);
        detailsHtml += `<span>Sicherung erfasst: <span class="${securityClass}">${securityCount} von ${expectedText}</span></span>`;
        detailsHtml += `</div>`;
        
        currentDetailsDivEl.innerHTML = detailsHtml;

        if (expected !== null && expected !== undefined) {
            if (receiptCount > expected || securityCount > expected) currentDetailsDivEl.style.borderColor = 'red';
            else if (receiptCount < expected || securityCount < expected) currentDetailsDivEl.style.borderColor = 'orange';
            else if (receiptCount === expected && securityCount === expected) currentDetailsDivEl.style.borderColor = 'green';
            else currentDetailsDivEl.style.borderColor = '#aac';
        } else {
            currentDetailsDivEl.style.borderColor = '#aac';
        }
    }

    function filterTable(filterText) {
        // Diese Funktion bleibt unverändert
    }

    // ... alle weiteren Hilfs- und UI-Funktionen ...
    
    // --- Initialisierung & Event Listener Setup ---
    function initializeApp() {
        isBatchModeActive = batchModeToggleEl.checked;
        notifiedCompletions = new Set();
        toggleBatchMode(isBatchModeActive);
        setupEventListeners();
        focusShipmentInput();
        console.log(`Fracht Tracker (Firebase Mode) initialized for user: ${currentUser.displayName}.`);
    }

    function setupEventListeners() {
        document.getElementById('loginButton').addEventListener('click', signIn);
        document.getElementById('logoutButton').addEventListener('click', signOut);

        mainActionButtonEl.addEventListener('click', async () => {
            if (isBatchModeActive) {
                addToBatch();
            } else {
                const rawInput = shipmentNumberInputEl.value;
                const status = securityStatusSelectEl.value;
                const isCombination = comboCheckboxEl.checked;
                const result = await processAndSaveSingleScan(rawInput, status, isCombination);
                if (!result.waitingForTotal) {
                    if (result.success) {
                        shipmentNumberInputEl.value = '';
                        updateClearButtonVisibility(shipmentNumberInputEl, clearInputButtonEl);
                        displayError(result.message, 'green', 2000);
                    } else {
                        displayError(result.message);
                    }
                    focusShipmentInput();
                }
            }
        });
        
        // Hier folgen alle anderen Event Listener aus deiner `setupEventListeners` Funktion.
        // Die Logik darin muss natürlich auch auf die neuen `async`-Funktionen und `allShipments` angepasst werden.
    }

    // --- STARTPUNKT DER APP ---
    setupAuthListeners();
});
