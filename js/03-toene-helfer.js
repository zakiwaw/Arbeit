// Fracht Tracker – Teil 3/10: 03-toene-helfer.js
// Töne (Fehler/Nachlieferung), Spediteur-Namen, Fehleranzeige + Sync-Punkt, escapeHtml, HU-Zeichenketten, Scan-Feld, Nummern-Verarbeitung, Status-Helfer
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

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
        // Fokus immer OHNE Scrollen: Nach jeder Aktion weiter unten auf der Seite (Löschen, Bearbeiten-Abbrechen, Zurück aus
        // Details …) wird das Scan-Feld wieder scharf gemacht – ein normaler focus() würde die Seite dabei nach oben springen
        // lassen. Der Scanner braucht nur den Fokus, nicht die Sicht aufs Feld; wer tippen will, tippt das Feld selbst an.
        function focusShipmentInput() {
            if (isAuthViewOpen()) return; // Anmeldeseite hat den Fokus (PIN-Feld)
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
                setTimeout(() => shipmentNumberInputEl.focus({ preventScroll: true }), 0);
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



