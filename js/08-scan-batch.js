// Fracht Tracker – Teil 8/10: 08-scan-batch.js
// Verlauf beim Start, Detailansicht ein/aus, Einzelscan, Stückzahl-Abfrage, Notizen, Batch-Modus, Löschen, Dunkelalarm-Zähler, Storno, Bearbeiten-Dialog
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

// Verlauf beim Start normalisieren; eine offene Seite (Adresse ?seite=… – z. B. nach Neuladen/Import) wieder öffnen
let pendingDetailFromUrl = null; // ?sendung=… aus der Adresse, das beim Start noch nicht lokal vorlag (s. renderTable)
(function initHistory() {
    // Scroll-Stand verwalten wir selbst (lastScrollPosition): Der Browser würde beim Zurück (popstate) sonst die Position
    // des Verlaufseintrags wiederherstellen – und die ist 0, weil der Eintrag entsteht, während die Hauptansicht schon
    // ausgeblendet ist. Ergebnis war: nach „Zurück“ aus den Details stand die Liste immer ganz oben.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
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


let lastPageScrollTop = 0; // Scroll-Stand der Unterseite (eigener Scroll-Container), geht beim Ausblenden verloren
function showDetailView(baseNumber) {
    // 1. Aktuelle Scroll-Position merken: Startseite = Fenster-Scroll; von einer Unterseite aus deren eigenen Scroll-Stand
    //    (lastScrollPosition bleibt dann unangetastet – sie gehört der Startseite für das spätere „Zurück“ von der Unterseite)
    const pageOpen = !!(pageViewEl && !pageViewEl.classList.contains('hidden'));
    if (!pageOpen) lastScrollPosition = window.scrollY;
    lastPageScrollTop = pageOpen ? pageViewEl.scrollTop : 0;

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
    // 2. Zur gespeicherten Scroll-Position zurückkehren – der Fokus aufs Scan-Feld darf dabei nicht nach oben scrollen
    if (currentPage && pageViewEl) { pageViewEl.classList.remove('hidden'); pageViewEl.scrollTop = lastPageScrollTop; }
    else { mainViewEl.classList.remove('hidden'); window.scrollTo(0, lastScrollPosition); }
    focusShipmentInput();
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
                // Ggf. Details der aktuellen Eingabe wieder anzeigen. Eine bereits geöffnete Detailansicht (Start per Adresse
                // ?sendung=… oder Neuladen in den Details) bleibt stehen – sonst überschrieb der Startaufruf sie mit dem Platzhalter.
                const inputBase = processShipmentNumber(shipmentNumberInputEl.value).baseNumber;
                const openBase = (detailViewEl && !detailViewEl.classList.contains('hidden') && currentDetailsDivEl) ? (currentDetailsDivEl.dataset.base || '') : '';
                displayCurrentShipmentDetails(inputBase || openBase);
            }
            toggleMainInputControls(true); // Generelle UI-Controls (de)aktivieren
            updateEditButtonVisibilityInTable();
            filterTable(shipmentNumberInputEl.value);
            focusShipmentInput();
        }

        function updateBatchUI(animateNewest = false) {
            const previousScrollTop = batchListEl.scrollTop;
            batchListEl.innerHTML = '';
            currentBatch.forEach((batchItem, index) => {
                const li = document.createElement('li');
                if (animateNewest && index === 0) li.classList.add('is-newest');

                const itemDate = new Date(batchItem.scanTimestamp);
                const itemInfo = document.createElement('span');
                itemInfo.classList.add('batch-item-info');
                const number = document.createElement('strong');
                number.classList.add('batch-item-number');
                number.textContent = batchItem.rawInput;
                const time = document.createElement('time');
                time.classList.add('batch-item-time');
                time.dateTime = itemDate.toISOString();
                time.textContent = itemDate.toLocaleTimeString('de-DE');
                itemInfo.append(number, time);
                if (batchItem.note) {
                    const note = document.createElement('span');
                    note.classList.add('batch-item-note');
                    note.textContent = `Notiz: ${batchItem.note}`;
                    itemInfo.appendChild(note);
                }
                li.appendChild(itemInfo);

                const removeBtn = document.createElement('button');
                removeBtn.textContent = '×';
                removeBtn.setAttribute('aria-label', `${batchItem.rawInput} aus Batch entfernen`);
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
            // Zähler im Speichern-Knopf (feste Leiste im Batch-Modus): „Batch Speichern (7)“; leer → Knopf gedämpft
            const saveCount = document.getElementById('saveBatchCount');
            if (saveCount) { saveCount.textContent = String(currentBatch.length); saveCount.classList.toggle('hidden', currentBatch.length === 0); }
            if (saveBatchButtonEl) saveBatchButtonEl.classList.toggle('is-empty', currentBatch.length === 0);
            updateCurrentBatchNoteDisplay();
            // Nur ein neuer Scan holt die oberste Zeile ins Bild. Löschen/Notizänderungen erhalten den manuellen Scrollstand.
            batchListEl.scrollTop = animateNewest ? 0 : previousScrollTop;
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
            updateBatchUI(true);
            
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
    
    updateBatchUI(true);
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
                updateBatchUI(true);
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
            document.body.classList.remove('modal-open');
            updateBatchUI(); // UI aktualisieren, um die entfernten Notizen zu reflektieren
            batchNoteToggleEl.checked = false; // Schalter nach Benutzung immer deaktivieren

            // Nur wenn ein Scan auf die Verarbeitung wartet, wird er hinzugefügt.
            if (pendingFirstBatchScanData) {
                const batchItem = { ...pendingFirstBatchScanData, note: null };
                currentBatch.push(batchItem);
                pendingFirstBatchScanData = null;
                updateBatchUI(true); // Neuer Scan: markieren und nach oben holen
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
            if (!shipments[baseNumber]) { focusShipmentInput(); return; }
            delete shipments[baseNumber];
            runBlocking(`Sendung ${baseNumber} wird gelöscht …`, async () => {
                const saving = saveShipments(shipments);
                renderTable();
                const currentInputBase = processShipmentNumber(shipmentNumberInputEl.value).baseNumber;
                if (currentInputBase === baseNumber) { // Wenn gelöschte Sendung angezeigt wurde
                    displayCurrentShipmentDetails('');
                } else {
                    displayCurrentShipmentDetails(currentInputBase);
                }
                clearError();
                await saving;
            }).then(focusShipmentInput);
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