// Fracht Tracker – Teil 10/10: 10-menue-events-start.js
// Seitenmenü, setupEventListeners (alle Bedienelemente, Modals, Scan-Feld, Batch), HU-Details-Dialog, Start (initializeApp())
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

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
            openSecurityReport(baseNumber);
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
            else openSecurityReport(base);
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
    else if (target.closest('.pack-select-delete')) {
        if (!isBatchModeActive) deleteSelectedPacks(target.closest('.pack-select-bar'));
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
            const r = importMultiOrdersPayload(currentValue);
            alert(`Multi-Import abgeschlossen:\n- Verarbeitete Aufträge: ${r.processedOrders.length}\n- Neue HUs hinzugefügt: ${r.addedCount}`);
            location.reload();
            return;
        } 
else if (currentValue.startsWith('FRT_VVL_V1')) {
    if (!confirm("Eine Vorverladeliste wurde erkannt.\n\nMöchtest du alle darin enthaltenen Kundenaufträge jetzt importieren?")) {
        shipmentNumberInputEl.value = '';
        return;
    }
    const r = importVvlPayload(currentValue);
    alert(`Import der Vorverladeliste(n) [${r.processedVVLs.join(', ')}] abgeschlossen:\n\n- ${r.addedPositionsCount} neue Positionen importiert.\n- ${r.newOrders} neue Aufträge angelegt.\n- ${r.updatedOrders} Aufträge aktualisiert.`);
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

    // Umschalter Scanner ↔ Tastatur (Symbol links im Scan-Feld). Scanner-Modus = inputMode „none“ (keine Bildschirmtastatur),
    // Tastatur-Modus = „text“. Die Anzeige (Barcode- bzw. Tastatur-Symbol) folgt immer dem tatsächlichen inputMode.
    const scanWrapperEl = shipmentNumberInputEl.closest('.scan-input-wrapper');
    const inputModeToggleEl = document.getElementById('inputModeToggle');
    function reflectInputMode() {
        const kb = shipmentNumberInputEl.inputMode === 'text';
        if (scanWrapperEl) scanWrapperEl.classList.toggle('keyboard-mode', kb);
        if (inputModeToggleEl) { inputModeToggleEl.setAttribute('aria-pressed', kb ? 'true' : 'false'); inputModeToggleEl.setAttribute('aria-label', kb ? 'Zurück zum Scanner' : 'Tastatur einblenden'); }
    }
    let inputModeSwitching = false;
    function setInputMode(mode) {
        inputModeSwitching = true;
        shipmentNumberInputEl.inputMode = mode;
        reflectInputMode();
        // Neu fokussieren, damit iOS/Android die geänderte Tastaturanforderung übernimmt (Tastatur auf bzw. zu)
        shipmentNumberInputEl.blur();
        setTimeout(() => { shipmentNumberInputEl.focus(); inputModeSwitching = false; }, 30);
    }
    if (inputModeToggleEl) {
        // pointerdown statt click: sonst nimmt der Tipp dem Feld erst den Fokus (blur → Scanner-Modus) und der Wechsel „springt“
        inputModeToggleEl.addEventListener('pointerdown', (e) => { e.preventDefault(); });
        inputModeToggleEl.addEventListener('click', (e) => {
            e.preventDefault();
            setInputMode(shipmentNumberInputEl.inputMode === 'text' ? 'none' : 'text');
        });
    }
    new MutationObserver(reflectInputMode).observe(shipmentNumberInputEl, { attributes: true, attributeFilter: ['inputmode'] });
    reflectInputMode();

    shipmentNumberInputEl.addEventListener('blur', () => {
        // Setzt den Modus IMMER zurück in den Scanner-Modus, wenn der Fokus verloren geht.
        // So ist das Feld für den nächsten Scan bereit. Ausnahme: der Umschalter selbst wechselt gerade (er fokussiert gleich neu).
        if (inputModeSwitching) return;
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
    const huEditDeleteEl = document.getElementById('deleteHuEditButton'); if (huEditDeleteEl) huEditDeleteEl.addEventListener('click', deleteHuFromEditModal);
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
    // Änderungsprotokoll (9.3): Knopf neben „Zuletzt bearbeitet“, Schließen, Klick auf den Hintergrund, Escape, HAWB → Sendung
    const changeLogModalEl = document.getElementById('changeLogModal');
    if (changeLogModalEl) {
        const openBtn = document.getElementById('changeLogBtn');
        if (openBtn) openBtn.addEventListener('click', showChangeLog);
        document.getElementById('closeChangeLogButton').addEventListener('click', closeChangeLog);
        changeLogModalEl.addEventListener('click', (e) => {
            if (e.target.id === 'changeLogModal') { closeChangeLog(); return; }
            const hawb = e.target.closest('.change-log-hawb');
            if (hawb) { const base = hawb.dataset.base; closeChangeLog(); if (base && loadShipments()[base]) showDetailView(base); }
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isChangeLogOpen()) { e.preventDefault(); closeChangeLog(); } });
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
    // Schnell speichern/abbrechen ohne die Knöpfe: Enter bzw. die ✓-Taste der Bildschirmtastatur (enterkeyhint="done")
    // speichert die Notiz, Umschalt+Enter macht einen Zeilenumbruch, Escape bricht ab.
    noteEditTextareaEl.addEventListener('keydown', (e) => {
        if (e.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            if (typeof noteEditFormEl.requestSubmit === 'function') noteEditFormEl.requestSubmit();
            else noteEditFormEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } else if (e.key === 'Escape') { e.preventDefault(); closeNoteEditModal(); }
    });
    // Batch-Notiz: Enter/✓ = „Übernehmen & Scannen“ (gleiche Bedienung wie bei der Notiz)
    batchNoteInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); confirmBatchNoteButtonEl.click(); }
    });

    // Modale über der Bildschirmtastatur halten: Android (Chrome) und iOS verkleinern bei offener Tastatur nur den
    // sichtbaren Ausschnitt (visualViewport), nicht das Layout – ein unten angedocktes Sheet läge sonst hinter der
    // Tastatur (Zebra: „Speichern/Abbrechen“ unsichtbar). Sichtbare Overlays werden auf den sichtbaren Ausschnitt
    // begrenzt; ist die Tastatur zu, werden die Maße wieder entfernt. Am Desktop passiert nichts (keine Differenz).
    (function keepModalsAboveKeyboard() {
        const vv = window.visualViewport;
        if (!vv) return;
        let raf = 0;
        const apply = () => {
            raf = 0;
            const keyboardOpen = (window.innerHeight - vv.height) > 80;   // kleinere Differenzen = Adressleiste/Rundung
            document.querySelectorAll('.modal-overlay').forEach(el => {
                if (keyboardOpen && el.classList.contains('visible')) {
                    el.style.top = Math.max(0, vv.offsetTop) + 'px'; el.style.height = Math.round(vv.height) + 'px'; el.style.bottom = 'auto';
                } else if (el.style.height) { el.style.top = ''; el.style.height = ''; el.style.bottom = ''; }
            });
            // Unterseite (z. B. „Aufträge erfassen“): iOS als installierte App verkleinert bei offener Tastatur die ganze
            // Ansicht und scrollt sie zum Textfeld; nach dem Schließen blieb der Inhalt teils unter der Kopfzeile stehen
            // (Reiter oben abgeschnitten). Scroll-Stand wieder auf das tatsächlich Mögliche begrenzen.
            if (!keyboardOpen && pageViewEl && !pageViewEl.classList.contains('hidden')) {
                const max = Math.max(0, pageViewEl.scrollHeight - pageViewEl.clientHeight);
                if (pageViewEl.scrollTop > max) pageViewEl.scrollTop = max;
            }
        };
        const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
        vv.addEventListener('resize', schedule);
        vv.addEventListener('scroll', schedule);
        document.addEventListener('focusin', schedule);
        document.addEventListener('focusout', () => setTimeout(schedule, 60));
    })();

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
    resetDataButtonEl.addEventListener('click', async () => {
        removeActiveInlineNoteEditor();
        if (confirm("WARNUNG!\n\n M\u00F6schtest du wirklich ALLE erfassten Sendungsdaten auf diesem Ger\u00E4t UND auf dem Server unwiderruflich L\u00F6schen?")) {
            showLoader(); 
            sheetStatusEl.textContent = 'Lösche Daten auf dem Server...';
            sheetStatusEl.style.color = 'orange';
            try {
                await postToServer('clearAllData');
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
    document.getElementById('erfassenButton')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeSideMenu();
        openPage({ id: 'erfassen' });
    });
    document.getElementById('manageUsersButton')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeSideMenu();
        if (!isAdmin()) return;
        if (detailViewEl && !detailViewEl.classList.contains('hidden')) hideDetailView();
        openPage({ id: 'mitarbeiter' });
    });
    document.getElementById('logoutButton')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    
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
