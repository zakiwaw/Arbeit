// Fracht Tracker – Teil 1/10: 01-start.js
// Version, Bibliotheks-Prüfung, Zoom-Sperre, Hochformat, DOM-Elemente, initializeApp, HU-Listen-Import, Konstanten/Einstellungen, Zustand, lokaler Speicher, Lade-Spinner, Verdachts-Dialog, Übersicht „Offene HUs“
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

// App-Version (zentral). Bei jeder veröffentlichten Änderung hochzählen und in CHANGELOG.md, index.html (<title>),
// sw.js (Cache-Name) und backend/README.md nachziehen – tests/versioncheck.js prüft, dass alle Stellen übereinstimmen.
// APP_BACKEND_VERSION = Version von backend/Code.gs, zu der diese App gehört (nur Anzeige im Menü).
const APP_VERSION = '9.0';
const APP_VERSION_DATE = '2026-11-03';
const APP_BACKEND_VERSION = '2.7';

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

// Hochformat festhalten, wenn die App installiert ist (Startbildschirm, „standalone“). Im normalen Browser-Tab erlaubt
// Android das Sperren nicht (nur im Vollbild) – dort greift ausschließlich die Geräteeinstellung „Automatisch drehen“.
// Das Manifest (orientation: portrait) erledigt es beim Start der installierten App; dies ist die Absicherung, falls das
// System die Sperre zwischenzeitlich aufhebt (z. B. nach dem Zurückkehren aus einer anderen App).
(function lockPortraitWhenInstalled() {
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (!standalone || !screen.orientation || typeof screen.orientation.lock !== 'function') return;
    const lock = () => { try { screen.orientation.lock('portrait').catch(() => { /* nicht erlaubt/unterstützt → Manifest entscheidet */ }); } catch (e) { /* ältere Browser */ } };
    lock();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) lock(); });
})();


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
    const sheetStatusEl = document.getElementById('sheetStatus');
    // Version sichtbar machen: kleines Kürzel in der Kopfzeile, Details unten im Menü (so sieht man sofort, ob ein Gerät
    // noch eine alte Version offen hat)
    (function showAppVersion() {
        const tag = document.getElementById('appVersionTag');
        if (tag) { tag.textContent = `v${APP_VERSION}`; tag.title = `Version ${APP_VERSION} vom ${APP_VERSION_DATE}`; }
        const info = document.getElementById('appVersionInfo');
        if (info) info.textContent = `Version ${APP_VERSION} · Stand ${APP_VERSION_DATE.split('-').reverse().join('.')} · Server-Skript ${APP_BACKEND_VERSION}`;
        const auth = document.getElementById('authVersionTag');
        if (auth) auth.textContent = `Version ${APP_VERSION}`;
    })();
    const menuToggleBtnEl = document.getElementById('menu-toggle-btn');
    const sideMenuEl = document.getElementById('side-menu');
    const menuOverlayEl = document.getElementById('menu-overlay');
    const resetDataButtonEl = document.getElementById('resetDataButton');
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
        // Anmeldung zuerst: ohne gültige Sitzung liefert der Server keine Daten. Zeigt bei Bedarf die Anmeldeseite
        // (oder die Einladungsseite bei ?einladung=…) und kehrt erst nach erfolgreicher Anmeldung zurück.
        await ensureLoggedIn();
        const initialShipments = await loadDataFromServer();
        // LKW-Status: kommt normalerweise schon mit loadChanges (loadDataFromServer). Nur falls nicht (altes Server-Skript), extra laden –
        // über applyServerLkwStatus, damit eine noch unbestätigte eigene Änderung (z. B. offline deaktiviert) nicht überschrieben wird.
        if (!lkwStatusFetched) {
            try { applyServerLkwStatus((await postToServer('loadLkwStatus')).data); }
            catch (e) { console.warn('LKW-Status vom Server konnte nicht geladen werden. Nutze lokalen Cache.', e); }
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
        flushLkwStatus();      // … ebenso eine noch unbestätigte LKW-Statusänderung
        focusShipmentInput();
        console.log(`Fracht Tracker ${APP_VERSION} (${APP_VERSION_DATE}) initialisiert.`);
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
    // Daten-Backend (backend/Code.gs). Bereitstellung "Version 10" vom 05.09.2026 – bei einer NEUEN Bereitstellung hier die URL anpassen.
    // Vorherige Bereitstellung (altes Skript V1): AKfycbw_ug_levQ7LuOn27CijAdkabnz5utME2aEeN6s560RzSb8lKCsSo5VT4nyOebRJnd0gw
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyjaxBurmTWWJENUF2nr2WB5S6Le5ja-bcZ9OtBLktATx1zGAAZCa5IlvFaL1_yl6jjgA/exec';
    const LOCAL_STORAGE_KEY = 'frachtSicherungMobile_V8_18_Refactored';
const LKWSTATUSKEY = 'frachtLkwStatusV1';
    const SUFFIX_LENGTH = 4;
    // Name des angemeldeten Mitarbeiters (Anmeldung mit PIN, s. Abschnitt ANMELDUNG) – landet in Scans, Archiv und PDF.
    // Solange das Server-Skript noch keine Anmeldung kennt (AUTH_ENABLED = false / altes Skript), gilt der bisherige Standardname.
    const MITARBEITER_NAME_DEFAULT = "Zakaria Bisbiss";
    let MITARBEITER_NAME = MITARBEITER_NAME_DEFAULT;
    const RAC_NUMMER = "DE/RA/00889-07";
    // Firmenbezeichnung des reglementierten Beauftragten im Sicherungsnachweis (PDF) – zusammen mit RAC_NUMMER die Kennung nach DVO (EU) 2015/1998 Nr. 6.3.2.6 a)
    const REGB_NAME = "LFS Luftfrachtsicherheit-Service";
    const NON_COUNTING_STATUSES = ['Dunkelalarm', 'Anstehend', 'NichtSichern', 'Abgelehnt', 'Wareneingang'];
    // Sicherheits-Kontrollmethoden (zählen als Sicherung, schließen sich je Packstück gegenseitig aus,
    // lösen automatisch den Wareneingang aus). Neue Methoden NUR hier und im <select id="securityStatusSelect"> ergänzen.
    // Kürzel wie in der Sicherheitserklärung: XRY = Röntgen, ETD = Sprengstoffspurendetektion, EDD = Sprengstoffspürhund,
    // PHS = Handdurchsuchung, VCK = Sichtkontrolle. PHS/VCK verhalten sich in der App exakt wie ETD/EDD.
    const EXCLUSIVE_SECURITY_STATUSES = ['XRY', 'ETD', 'EDD', 'PHS', 'VCK'];
    // Klartext der Kontrollmethoden-Codes (DVO (EU) 2015/1998, Anhang Nr. 6.3.2.6 Buchst. e) – nur für den Sicherungsnachweis (PDF)
    const KONTROLLMETHODE_TEXT = { XRY: 'Röntgenkontrolle', ETD: 'Sprengstoffspurendetektion', EDD: 'Sprengstoffspürhund', PHS: 'Durchsuchung von Hand', VCK: 'Sichtkontrolle' };
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
// Schreibt sofort lokal und schickt den Stand an den Server – nie zwei Sendungen gleichzeitig, immer der jeweils neueste Stand.
// Bis der Server bestätigt hat, bleibt die Änderung vorgemerkt (überlebt Neuladen) und Abruf-Antworten überschreiben sie nicht;
// schlägt das Senden fehl, wird es beim nächsten Abruf erneut versucht (wie bei den Sendungen).
function saveLkwStatus(status) {
    localStorage.setItem(LKWSTATUSKEY, JSON.stringify(status));
    localStorage.setItem(LKW_PENDING_KEY, '1');
    lkwStatusRev++;
    return flushLkwStatus();
}
function flushLkwStatus() {
    if (!lkwStatusPending() || lkwStatusQueued) return lkwStatusChain;   // nichts offen – oder ein Senden mit dem aktuellen Stand steht schon an
    lkwStatusQueued = true;
    lkwStatusChain = lkwStatusChain.then(async () => {
        lkwStatusQueued = false;
        if (!lkwStatusPending() || isAuthViewOpen()) return;              // nach der Anmeldung holt der Abruf es nach
        const rev = lkwStatusRev;
        lkwStatusSaveInFlight++;
        try {
            await postToServer('saveLkwStatus', loadLkwStatus());
            lkwStatusLastAckAt = Date.now();
            if (lkwStatusRev === rev) localStorage.removeItem(LKW_PENDING_KEY);   // seitdem nichts Neues → bestätigt
        } catch (e) {
            syncLastErrorAt = Date.now();
            console.warn('LKW-Status Server-Sync fehlgeschlagen (bleibt vorgemerkt):', e.message);
        } finally { lkwStatusSaveInFlight--; }
    });
    return lkwStatusChain;
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
function showLoader(text) {
    if (loadingOverlayEl) {
        const t = document.getElementById('loadingText');
        if (t) t.textContent = text || '';
        loadingOverlayEl.classList.add('visible');
    }
}

function hideLoader() {
    if (loadingOverlayEl) {
        loadingOverlayEl.classList.remove('visible');
        const t = document.getElementById('loadingText');
        if (t) t.textContent = '';
    }
}
// Löschen / Deaktivieren / Umbenennen: Spinner mit Text, bis der Server bestätigt hat (höchstens maxMs) – so kann nichts
// dazwischenkommen, und man sieht, dass es durch ist. Ohne Verbindung bleibt die Änderung vorgemerkt (Sync-Anzeige) und geht später raus.
async function runBlocking(text, fn, maxMs = 12000) {
    showLoader(text);
    try { await fn(); await waitUntilSynced(maxMs); }
    finally { hideLoader(); }
}
function waitUntilSynced(maxMs = 12000) {
    return new Promise(resolve => {
        const t0 = Date.now();
        (function check() {
            const idle = !syncInFlight && !hasPending() && !lkwStatusPending() && lkwStatusSaveInFlight === 0;
            if (idle || syncLastErrorAt >= t0 || isAuthViewOpen() || Date.now() - t0 > maxMs) resolve(); else setTimeout(check, 80);
        })();
    });
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
    