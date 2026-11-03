// Fracht Tracker – Teil 7/10: 07-import-erfassen.js
// Import aus QR (MAN-Mehrfachauftrag, VVL), Seite „Aufträge erfassen“ (Parser, QR, Direkt anlegen), Seiten-Renderer (PAGE_RENDERERS), Klick-Handler der Seiten
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

    // MAN-Aufträge aus dem QR-Inhalt „FRT_MULTI_V1;;;Rechnung|Spediteur|Land|PLSO|||Pos HU|Verpackung|Maße|Gewicht~~~…“ anlegen:
    // ein neuer MAN-LKW mit allen Aufträgen. Gleicher Code für den Scan und für die Seite „Aufträge erfassen“ (Direkt anlegen).
    function importMultiOrdersPayload(payload) {
            const parts = payload.split(';;;').slice(1);
            
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
            return { processedOrders, addedCount, truckId: manTruckId };
    }

    // Vorverladeliste aus dem QR-Inhalt „FRT_VVL_V1;;;Kundennr|VVL|||VSE:Sendungsnr|Gewicht|Maße~~~…“ anlegen/ergänzen.
    // Gleicher Code für den Scan und für die Seite „Aufträge erfassen“ (Direkt anlegen).
    function importVvlPayload(payload) {
    const parts = payload.split(';;;').slice(1);
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
    return { processedVVLs: [...processedVVLs], addedPositionsCount, newOrders: newOrders.size, updatedOrders: updatedOrders.size };
    }

// ---- Seite „Aufträge erfassen“ (ehem. externer „Multi-Auftrag QR-Code Generator“) ----------------------------------
// Text aus dem MAN-Dokument / der Vorverladeliste einfügen → Aufträge werden erkannt (Parser 1:1 aus dem Generator) →
// wahlweise als QR-Code anzeigen (für ein anderes Gerät) oder direkt in der App anlegen (gleicher Import wie beim Scan).
// \u00AD = weiches Trennzeichen: unsichtbar, erlaubt auf schmalen Handys den Zeilenumbruch „Vorverlade-liste“ im Reiter
const ERF_MODES = { man: 'MAN Fracht', vvl: 'Vorverlade\u00ADliste (VW)', standard: 'Standard (Leer\u00ADzeilen)' };
const ERF_PLACEHOLDERS = {
    vvl: 'Daten aus der Vorverladeliste hier einfügen …\nErkannt werden Vorverladeliste-Nr., Kundennr. und die Positionen.\n\nBeispiel:\nVorverladeliste-Nr.: 100004049786\n\nKundennr: 9974021\n873227447 8255014\n…',
    man: 'Daten vom MAN-Dokument hier einfügen …\nErkannt werden Spediteur, Rechnung, PLSO und HUs – auch das „Nachlieferung“-Format.\n\nBeispiel:\nMaersk Logistics & Services/Senator, Südafrika\n9007988206\n3181 0128115\n1 0925102219E2|Einwegpalette B03|120x80x60 CM|42 KG\n\nBeispiel Nachlieferung:\nLogwin, Singapur\nNachlieferung\n3181 0128082\n1 9251021068F\n2 92510210CB3',
    standard: 'Aufträge hier einfügen – jeder Auftrag durch eine LEERZEILE getrennt.\nDie ERSTE Zeile pro Auftrag ist die Auftragsnummer.\n\nBeispiel:\nAUFTRAGSNUMMER_1\nHU1\nHU2\n\nAUFTRAGSNUMMER_2\nHU3\n…'
};
const ERF_QR_MAX_CHARS = 2300;   // wie im Generator: darüber ist der QR-Code für Handykameras nicht mehr zuverlässig lesbar
const erfState = { mode: 'man', text: '', result: null, notice: null };
function erfReplaceUmlauts(str) { return String(str).replace(/ä/g, 'ae').replace(/Ä/g, 'Ae').replace(/ö/g, 'oe').replace(/Ö/g, 'Oe').replace(/ü/g, 'ue').replace(/Ü/g, 'Ue').replace(/ß/g, 'ss'); }
function erfParseVvl(inputText) {
    const lines = inputText.split('\n').map(l => l.trim()).filter(Boolean);
    let mainVvlNr = null, currentOrder = null; const finalOrders = [];
    const normalizeDimensionPart = value => { const cleaned = String(value || '').trim(); return cleaned ? String(parseInt(cleaned, 10)) : '0'; };
    for (const line of lines) {
        if (line.toLowerCase().startsWith('vorverladeliste-nr.')) { mainVvlNr = line.split(':')[1].trim(); continue; }
        if (line.toLowerCase().startsWith('kundennr')) {
            if (currentOrder) finalOrders.push(currentOrder);
            currentOrder = { orderId: line.split(':')[1].trim(), parentVvl: mainVvlNr, hus: [] }; continue;
        }
        if (currentOrder && /^\d/.test(line)) {
            if (line.includes('|') && line.includes(':')) {
                const [mainPart, grossWeightRaw = 'N/A', dimensionsRaw = 'N/A'] = line.split('|').map(p => p.trim());
                const [vse, sendnr] = mainPart.split(':').map(p => p.trim());
                if (vse && sendnr) {
                    let normalizedDimensions = 'N/A';
                    if (dimensionsRaw !== 'N/A') {
                        const dimParts = dimensionsRaw.split('x').map(p => normalizeDimensionPart(p.replace(/mm/i, '').trim()));
                        if (dimParts.length === 3) normalizedDimensions = `${dimParts[0]}x${dimParts[1]}x${dimParts[2]} MM`;
                    }
                    const normalizedGrossWeight = grossWeightRaw.toUpperCase().includes('KG') ? grossWeightRaw.toUpperCase() : `${grossWeightRaw} KG`;
                    currentOrder.hus.push(`${vse}:${sendnr}|${normalizedGrossWeight}|${normalizedDimensions}`);
                }
            } else {
                const [vse, sendnr] = line.split(/\s+/);
                if (vse && sendnr) currentOrder.hus.push(`${vse}:${sendnr}|N/A|N/A`);
            }
        }
    }
    if (currentOrder) finalOrders.push(currentOrder);
    if (!mainVvlNr) return { error: 'Keine „Vorverladeliste-Nr.:“ im Text gefunden.' };
    if (!finalOrders.length) return { error: 'Keine „Kundennr:“ mit Positionen gefunden.' };
    return { orders: finalOrders.map(o => Object.assign(o, { parentVvl: o.parentVvl || mainVvlNr })) };
}
function erfParseMan(inputText) {
    const finalOrders = [];
    for (const block of inputText.trim().split(/\n\s*\n/)) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 3) continue;                       // Spediteur, Rechnung und PLSO sind das Minimum
        const spediteurLandLine = lines.shift(), orderIdLine = lines.shift(), plsoLine = lines.shift();
        const [spediteur, land] = spediteurLandLine.split(',');
        finalOrders.push({ orderId: orderIdLine, plso: plsoLine, spediteur: spediteur ? spediteur.trim() : 'Unbekannt', land: land ? land.trim() : 'Unbekannt', hus: lines });
    }
    if (!finalOrders.length) return { error: 'Kein Auftrag erkannt. Je Auftrag: Zeile 1 „Spediteur, Land“, Zeile 2 Rechnung, Zeile 3 PLSO, danach die HUs – Aufträge durch eine Leerzeile trennen.' };
    return { orders: finalOrders };
}
function erfParseStandard(inputText) {
    const orders = inputText.split(/\n\s*\n/).map(block => { const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean); if (!lines.length) return null; return { orderId: lines.shift(), hus: lines }; }).filter(Boolean);
    if (!orders.length) return { error: 'Kein Auftrag erkannt.' };
    return { orders };
}
// QR-Inhalt genau wie der Generator: FRT_MULTI_V1 / FRT_VVL_V1 + je Auftrag ;;;Kopf|||HU~~~HU
function erfBuildPayload(mode, orders) {
    let allData = '';
    for (const order of orders) {
        let head;
        if (mode === 'vvl') head = `;;;${erfReplaceUmlauts(order.orderId).toUpperCase()}|${erfReplaceUmlauts(order.parentVvl).toUpperCase()}|||`;
        else head = `;;;${erfReplaceUmlauts(order.orderId).toUpperCase()}|${erfReplaceUmlauts(order.spediteur || 'N/A').toUpperCase()}|${erfReplaceUmlauts(order.land || 'N/A').toUpperCase()}|${erfReplaceUmlauts(order.plso || 'N/A').toUpperCase()}|||`;
        allData += head + order.hus.join('~~~');
    }
    return (mode === 'vvl' ? 'FRT_VVL_V1' : 'FRT_MULTI_V1') + allData;
}
// Prüfbericht der KI am Textende („Abgleichprotokoll …“) gehört nicht zu den Aufträgen – ab dieser Zeile wird nichts mehr gelesen
// (dieselbe Regel wie beim automatischen Drive-Import im Server-Skript).
const ERF_STOP_MARKERS = ['abgleichprotokoll'];
function erfStripReport(text) {
    const lines = String(text || '').split('\n');
    const i = lines.findIndex(l => { const t = l.trim().toLowerCase(); return ERF_STOP_MARKERS.some(m => t.startsWith(m)); });
    return i < 0 ? String(text || '') : lines.slice(0, i).join('\n');
}
function erfParse(mode, text) { text = erfStripReport(text); return mode === 'vvl' ? erfParseVvl(text) : (mode === 'man' ? erfParseMan(text) : erfParseStandard(text)); }
function erfAnalyze() {
    const text = erfState.text.trim();
    if (!text) { erfState.result = { error: 'Bitte zuerst den Text einfügen.' }; return; }
    const r = erfParse(erfState.mode, text);
    erfState.result = r.error ? r : { orders: r.orders, payload: erfBuildPayload(erfState.mode, r.orders) };
}
function erfOrderSummary(o) {
    const n = o.hus.length, pieces = pluralize(n, 'Packstück', 'Packstücke');
    if (erfState.mode === 'vvl') return `<strong>Kundennr. ${escapeHtml(o.orderId)}</strong> · VVL ${escapeHtml(o.parentVvl)} · ${pieces}`;
    if (erfState.mode === 'man') return `<strong>${escapeHtml(o.orderId)}</strong> · ${escapeHtml(o.spediteur)} · ${escapeHtml(o.land)} · PLSO ${escapeHtml(o.plso)} · ${pieces}`;
    return `<strong>${escapeHtml(o.orderId)}</strong> · ${pieces}`;
}
function renderErfassenPage() {
    const st = erfState, r = st.result;
    setPageHeader('Aufträge erfassen', r && r.orders ? pluralize(r.orders.length, 'Auftrag', 'Aufträge') : '');
    let html = `<div class="erf-tabs" role="tablist">${Object.keys(ERF_MODES).map(m => `<button type="button" class="erf-tab ${st.mode === m ? 'is-active' : ''}" data-erf-mode="${m}" role="tab" aria-selected="${st.mode === m}">${ERF_MODES[m]}</button>`).join('')}</div>`;
    html += `<textarea id="erfInput" class="erf-input" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="${escapeHtml(ERF_PLACEHOLDERS[st.mode])}">${escapeHtml(st.text)}</textarea>`;
    html += `<div class="erf-actions"><button type="button" class="main-action-button" id="erfAnalyzeBtn">Aufträge erkennen</button><button type="button" class="page-link-btn" id="erfClearBtn">Leeren</button></div>`;
    if (st.notice) html += `<div class="page-banner erf-notice is-${st.notice.kind}"><span>${escapeHtml(st.notice.text)}</span><button type="button" class="page-link-btn" data-erf-notice-close>OK</button></div>`;
    if (r && r.error) html += `<div class="page-banner is-error"><span>${escapeHtml(r.error)}</span></div>`;
    else if (r && r.orders) {
        const tooBig = r.payload.length > ERF_QR_MAX_CHARS;
        const hus = r.orders.reduce((n, o) => n + o.hus.length, 0);
        html += `<section class="erf-result"><h3 class="page-section-title">Erkannt: ${pluralize(r.orders.length, 'Auftrag', 'Aufträge')}, ${pluralize(hus, 'Packstück', 'Packstücke')}</h3>`;
        html += `<ul class="page-list erf-list">${r.orders.map(o => `<li class="page-row erf-row"><div>${erfOrderSummary(o)}</div><div class="erf-hus">${escapeHtml(o.hus.slice(0, 3).map(h => h.split('|')[0]).join(' · '))}${o.hus.length > 3 ? ` · +${o.hus.length - 3} weitere` : ''}</div></li>`).join('')}</ul>`;
        html += `<div class="erf-buttons">
            <button type="button" class="main-action-button erf-create" id="erfCreateBtn">${st.mode === 'vvl' ? 'Direkt anlegen (VW-LKW)' : 'Direkt anlegen (neuer MAN-LKW)'}</button>
            <button type="button" class="main-action-button erf-secondary" id="erfQrBtn" ${tooBig ? 'disabled' : ''}>QR-Code anzeigen</button>
            <button type="button" class="page-link-btn" id="erfCopyBtn">Inhalt kopieren</button>
        </div>`;
        if (tooBig) html += `<p class="page-note erf-toobig">Zu groß für einen QR-Code (${r.payload.length} von max. ${ERF_QR_MAX_CHARS} Zeichen) – bitte „Direkt anlegen“ nutzen oder den Inhalt kopieren.</p>`;
        html += `<div id="erfQr" class="erf-qr ${st.showQr && !tooBig ? '' : 'hidden'}"><div id="erfQrCode"></div><p class="page-note">Mit dem anderen Gerät im Scan-Feld abscannen.</p></div>`;
        html += '</section>';
    }
    pageContentEl.innerHTML = html;
    if (st.showQr && r && r.orders && r.payload.length <= ERF_QR_MAX_CHARS && typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById('erfQrCode'), { text: r.payload, width: 300, height: 300, correctLevel: QRCode.CorrectLevel.M });
    }
    const ta = document.getElementById('erfInput');
    if (ta) ta.addEventListener('input', (e) => {
        erfState.text = ta.value;
        // Eingesetzter Text (Gedrückthalten → Einsetzen, Strg+V) wird sofort erkannt – „Aufträge erkennen“ entfällt
        if (e.inputType === 'insertFromPaste' && ta.value.trim()) { erfState.showQr = false; erfState.notice = null; erfAnalyze(); renderErfassenPage(); }
    });
}
function handleErfassenPageClick(event) {
    const t = event.target;
    const tab = t.closest('[data-erf-mode]');
    if (tab) { erfState.mode = tab.dataset.erfMode; erfState.result = null; erfState.showQr = false; renderErfassenPage(); return; }
    if (t.closest('[data-erf-notice-close]')) { erfState.notice = null; renderErfassenPage(); return; }
    if (t.closest('#erfAnalyzeBtn')) { erfState.showQr = false; erfState.notice = null; erfAnalyze(); renderErfassenPage(); return; }
    if (t.closest('#erfClearBtn')) { erfState.text = ''; erfState.result = null; erfState.showQr = false; erfState.notice = null; renderErfassenPage(); return; }
    if (t.closest('#erfQrBtn')) { erfState.showQr = !erfState.showQr; renderErfassenPage(); if (erfState.showQr) document.getElementById('erfQr')?.scrollIntoView({ block: 'nearest' }); return; }
    if (t.closest('#erfCopyBtn')) {
        const btn = t.closest('#erfCopyBtn'), txt = erfState.result && erfState.result.payload;
        if (!txt) return;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { btn.textContent = 'Kopiert!'; setTimeout(() => { btn.textContent = 'Inhalt kopieren'; }, 2000); })
            .catch(() => { window.prompt('Inhalt zum Kopieren:', txt); });
        return;
    }
    if (t.closest('#erfCreateBtn')) { erfCreateDirect(); }
}
// „Direkt anlegen“: exakt derselbe Import wie beim Scannen des QR-Codes – nur ohne Kamera und ohne Neuladen der Seite
function erfCreateDirect() {
    const r = erfState.result; if (!r || !r.orders) return;
    if (isBatchModeActive) { erfState.notice = { kind: 'error', text: 'Bitte zuerst den Batch-Modus beenden.' }; renderErfassenPage(); return; }
    const n = r.orders.length, hus = r.orders.reduce((a, o) => a + o.hus.length, 0);
    const what = erfState.mode === 'vvl' ? `Vorverladeliste ${r.orders[0].parentVvl}: ${pluralize(n, 'Kundenauftrag', 'Kundenaufträge')}` : `${pluralize(n, 'Auftrag', 'Aufträge')} als neuer MAN-LKW`;
    if (!confirm(`${what} mit ${pluralize(hus, 'Packstück', 'Packstücken')} jetzt anlegen?`)) return;
    try {
        let text;
        if (erfState.mode === 'vvl') {
            const res = importVvlPayload(r.payload);
            text = `Vorverladeliste ${res.processedVVLs.join(', ')} angelegt: ${res.newOrders} neue Aufträge, ${res.updatedOrders} ergänzt, ${res.addedPositionsCount} Positionen.`;
        } else {
            const res = importMultiOrdersPayload(r.payload);
            text = `${truckShortName(res.truckId)} angelegt: ${pluralize(res.processedOrders.length, 'Auftrag', 'Aufträge')}, ${pluralize(res.addedCount, 'Packstück', 'Packstücke')}.`;
        }
        renderTable(); renderLkwMenu(); refreshHomeViews();
        erfState.text = ''; erfState.result = null; erfState.showQr = false; erfState.notice = { kind: 'ok', text };
    } catch (e) {
        console.error('Direkt anlegen fehlgeschlagen:', e);
        erfState.notice = { kind: 'error', text: `Anlegen fehlgeschlagen: ${e.message}` };
    }
    renderErfassenPage();
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
            setPageHeader(truckLabel(t), pluralize(t.bases.length, 'Auftrag', 'Aufträge'), truckLabelHtml(t), lkwActionMenuHtml(t));
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
            </div>`;
            html += importOriginNoteHtml(t.bases.map(b => shipments[b]));
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
    mitarbeiter: {
        render() { if (!isAdmin()) { showHome(); return; } adminState.users = null; adminState.notice = null; renderAdminPage(); },
        update() { if (!isAdmin()) { showHome(); return; } renderAdminPage(); }
    },
    erfassen: {
        render() { renderErfassenPage(); },
        update() { /* Eingabe bleibt stehen – Sync-Neuzeichnen darf den Text nicht verwerfen */ }
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
                        <button type="button" id="infoSearchClear" class="clear-input-btn info-search-clear${infoState.text ? ' visible' : ''}" title="Suchtext löschen" aria-label="Suchtext löschen">×</button>
                    </div>
                    <div class="info-reset-row hidden" id="infoResetRow">
                        <span class="info-reset-summary" id="infoResetSummary"></span>
                        <button type="button" id="infoResetAllBtn" class="info-reset-btn" title="Suchtext und alle Filter zurücksetzen">Alle Filter zurücksetzen</button>
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
            const clearBtn = document.getElementById('infoSearchClear');
            input.addEventListener('input', () => { infoState.text = input.value.trim().toUpperCase(); clearBtn.classList.toggle('visible', !!input.value); debounced(); });
            // X im Suchfeld: nur den Suchtext leeren – die Filter darunter bleiben; Fokus zurück ins Feld (Desktop), am Handy ohne Tastatur
            clearBtn.addEventListener('click', () => {
                input.value = ''; infoState.text = ''; clearBtn.classList.remove('visible');
                if (infoTimer) clearTimeout(infoTimer);
                setAndUpdate();
                if (!('ontouchstart' in window)) input.focus();
            });
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
            // „Zurücksetzen“: Suchtext UND alle Filter auf Anfang (Kopf der Desktop-Seitenleiste / Zeile unter dem Suchfeld am Handy)
            const resetAll = () => {
                Object.assign(infoState, { text: '', status: 'all', truck: 'all', period: 'all', dateFrom: '', dateTo: '', weightMin: '', weightMax: '' });
                if (infoTimer) clearTimeout(infoTimer);
                this.render(); // Formular mit leeren Werten neu aufbauen
            };
            document.getElementById('infoResetBtn').addEventListener('click', resetAll);
            document.getElementById('infoResetAllBtn').addEventListener('click', resetAll);
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
            const resetRow = document.getElementById('infoResetRow');
            if (resetRow) {
                // Nur bei gesetzten Filtern (Status/LKW/Zeitraum/Gewicht) – für reinen Suchtext genügt das X im Feld
                resetRow.classList.toggle('hidden', !anyFilter);
                const active = (infoState.status !== 'all' ? 1 : 0) + (infoState.truck !== 'all' ? 1 : 0) + (infoState.period !== 'all' ? 1 : 0) + (range ? 1 : 0);
                document.getElementById('infoResetSummary').textContent = active ? `${active} Filter aktiv` : '';
            }
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
// Seite „Mitarbeiter“ (Administrator): Knöpfe je Zeile
function handleAdminPageClick(event) {
    const t = event.target;
    if (t.closest('[data-admin-dismiss]')) { adminState.notice = null; renderCurrentPage(false); return; }
    const reset = t.closest('[data-admin-reset]');
    if (reset) {
        const u = (adminState.users || []).find(x => x.id === reset.dataset.adminReset); if (!u) return;
        if (confirm(`${u.hasPin ? 'PIN zurücksetzen' : 'Erneut einladen'}: ${u.name}?\n\n${u.name} bekommt eine neue Einladung per E-Mail und legt dort ${u.hasPin ? 'eine neue' : 'seine'} PIN fest.${u.hasPin ? ' Die bisherige PIN gilt, bis die neue gesetzt ist.' : ''}`))
            adminRun('adminResetPin', { userId: u.id }, u.hasPin ? `PIN-Reset für ${u.name} angestoßen` : `${u.name} erneut eingeladen`);
        return;
    }
    const act = t.closest('[data-admin-active]');
    if (act) {
        const u = (adminState.users || []).find(x => x.id === act.dataset.adminActive); if (!u) return;
        const to = act.dataset.adminTo === '1';
        if (to || confirm(`${u.name} sperren?\n\nAlle Anmeldungen werden sofort beendet; der Zugang kann später wieder freigegeben werden.`))
            adminRun('adminSetActive', { userId: u.id, active: to }, to ? `${u.name} freigegeben` : `${u.name} gesperrt`);
    }
}
// LKW-Aktionen – aus den Zeilenwerkzeugen der Anlieferung, dem Banner „LKW aktivieren“ und dem ⋮-Menü in der Kopfzeile.
// Liefert true, wenn der Klick verarbeitet wurde.
function handleLkwActionClick(target) {
    // ⋮-Menü: auf/zu; ein gewählter Eintrag schließt es und läuft dann in die bekannten Handler darunter
    if (target.closest('[data-lkw-menu]')) { setLkwActionMenu(!isLkwActionMenuOpen()); return true; }
    if (target.closest('.page-action-item')) setLkwActionMenu(false);
    const rename = target.closest('[data-lkw-rename]');
    if (rename) { if (!isBatchModeActive) openLkwRenameModal(rename.dataset.lkwRename); return true; }
    const delTruck = target.closest('[data-lkw-delete]');
    if (delTruck) {
        // aus dem ⋮-Menü der LKW-Seite heraus gelöscht → die nun leere Seite schließen (zurück zur Anlieferung / Startseite)
        const id = delTruck.dataset.lkwDelete;
        if (!isBatchModeActive && deleteTruckFromPage(id) && currentPage && currentPage.id === 'lkw' && currentPage.truckId === id) closePage();
        return true;
    }
    const act = target.closest('[data-lkw-activate]');
    if (act) { setLkwActiveFromPage(act.dataset.lkwActivate, true); return true; }
    const addOrder = target.closest('[data-order-add]');
    if (addOrder) { if (!isBatchModeActive) openOrderAddModal(addOrder.dataset.orderAdd); return true; }
    const deact = target.closest('[data-lkw-deactivate]');
    if (deact) {
        if (confirm('LKW deaktivieren?\n\nSeine Sendungen werden in der Liste ausgeblendet; nach 7 Tagen wandern sie ins Archiv (bleiben suchbar).')) setLkwActiveFromPage(deact.dataset.lkwDeactivate, false);
        return true;
    }
    return false;
}
if (pageHeaderActionsEl) pageHeaderActionsEl.addEventListener('click', (e) => { handleLkwActionClick(e.target); });
document.addEventListener('click', (e) => { if (isLkwActionMenuOpen() && !e.target.closest('.page-action-wrap')) setLkwActionMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isLkwActionMenuOpen()) { setLkwActionMenu(false); const els = lkwActionMenuEls(); if (els) els.btn.focus(); } });
if (pageContentEl) pageContentEl.addEventListener('click', (event) => {
    const target = event.target;
    if (currentPage && currentPage.id === 'mitarbeiter') { handleAdminPageClick(event); return; }
    if (currentPage && currentPage.id === 'erfassen') { handleErfassenPageClick(event); return; }
    const truckBtn = target.closest('.page-row[data-truckid]');
    if (truckBtn) { openPage({ id: 'lkw', truckId: truckBtn.dataset.truckid }); return; }
    if (handleLkwActionClick(target)) return;
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
        else if (target.classList.contains('pdf-btn')) openSecurityReport(base);
        else if (target.classList.contains('main-delete-btn')) { if (confirm(`Sendung ${escapeHtml(base)} wirklich löschen?`)) deleteShipment(base); }
        return;
    }
    const cell = target.closest('td');
    if (cell && cell.classList.contains('hawb-cell')) showDetailView(base);
}
// Menü-Links (href="#") sollen keinen Verlaufseintrag „#“ erzeugen – sonst schließt die Zurück-Geste erst den Hash
if (sideMenuEl) sideMenuEl.addEventListener('click', (e) => { const a = e.target.closest('a[href="#"]'); if (a) e.preventDefault(); });
