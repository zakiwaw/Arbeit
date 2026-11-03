// Fracht Tracker – Teil 4/10: 04-sendungsdetails.js
// Sendungsdetails: Kopf, Packstück-/Scan-Tabelle, HU bearbeiten/hinzufügen/löschen, Auswahl-Leiste, „+ Auftrag“, displayCurrentShipmentDetails
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

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
        + `<span class="pack-select-group pack-select-group-delete"><button type="button" class="pack-select-delete" title="Gewählte Packstücke aus dem Auftrag entfernen (z. B. Kunde meldet: HU kommt nicht)">Löschen</button></span>`
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
    modal.dataset.unit = dimensionUnitOf(shipment); setDimensionUnit(modal, modal.dataset.unit);
    fillDimensionFields(modal, 'hu-edit-dim', detail.dimensions && detail.dimensions !== 'N/A' ? detail.dimensions : '');
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
    modal.dataset.unit = dimensionUnitOf(shipment); setDimensionUnit(modal, modal.dataset.unit);
    fillDimensionFields(modal, 'hu-edit-dim', detail.dimensions && detail.dimensions !== 'N/A' ? detail.dimensions : '');
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
    const modalEl = document.getElementById('huEditModal');
    const dim = readDimensionFields(modalEl, 'hu-edit-dim', modalEl.dataset.unit || 'CM');
    const weightRaw = document.getElementById('huEditWeight').value.trim();
    const err = document.getElementById('huEditError');
    const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };
    if (dim.error) return fail(dim.error);
    const dimensions = dim.value;
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
        + `<td class="hu-add-dim-cell">${dimensionFieldsHtml('hu-add-dim', document.getElementById('huAddRows').dataset.unit || 'CM')}</td>`
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
    tbody.dataset.unit = dimensionUnitOf(shipment);   // Maße-Felder speichern im Importformat des Auftrags (CM bzw. MM)
    // Kopfzeile passend zum Auftrag: VW = VSE · Sendungs-Nr. (ohne Pos.), sonst Pos. · HU-Nummer
    const thead = tbody.parentElement.tHead;
    if (thead) thead.innerHTML = `<tr>${isVvl ? '<th>VSE</th><th class="hu-add-sendnr-cell">Sendungs-Nr.</th>' : '<th class="hu-add-pos">Pos.</th><th>HU-Nummer</th>'}<th>Verpackung</th><th class="hu-add-dim-cell">Maße <span class="th-unit">(${tbody.dataset.unit})</span></th><th class="hu-add-kg">Gewicht</th><th class="hu-add-x"></th></tr>`;
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
        dim: readDimensionFields(tr, 'hu-add-dim', tbody.dataset.unit || 'CM'),
        weightRaw: tr.querySelector('.hu-add-weight').value.trim()
    })).filter(r => r.hu || r.sendnr || r.packaging || r.dim.value || r.dim.error || r.weightRaw);
    if (!rows.length) return fail(`Bitte mindestens eine ${label} eingeben (oder scannen).`);
    const noHu = rows.find(r => !r.hu);
    if (noHu) return fail(`Eine Zeile hat Angaben, aber keine ${label}.`);
    const badDim = rows.find(r => r.dim.error);
    if (badDim) return fail(`${badDim.dim.error} (${label} ${badDim.hu})`);
    rows.forEach(r => { r.dimensions = r.dim.value; });
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
// ---- Packstücke löschen (Desktop-Tabelle): HU komplett aus dem Auftrag nehmen --------------------------------------
// Anwendungsfall: der Kunde meldet, dass eine HU nicht (heute) kommt, sie steht aber in der Anlieferung. Anders als
// beim Storno bleibt nichts zurück: alle Einträge der HU (Platz „Anstehend“, Wareneingang, Sicherung, Dunkelalarm, Stornos)
// werden entfernt und die Kolli-Zahl sinkt um die gelöschten Packstücke. Kombi-Zeilen hängen an ihrer HU und gehen mit.
// Sync: Der Server-Merge kennt entfernte Einträge (bekannter Eintrag fehlt → bleibt entfernt), ein Scan derselben HU auf
// einem anderen Gerät zur gleichen Zeit bleibt als neuer Eintrag erhalten. Der letzte Platz eines Auftrags ist nicht
// löschbar – dafür gibt es „Sendung löschen“.
function deleteHusFromShipment(base, hus) {
    const shipments = loadShipments();
    const shipment = shipments[base];
    if (!shipment || !Array.isArray(shipment.scannedItems)) return { deleted: [], error: `Sendung ${escapeHtml(base)} nicht gefunden.` };
    const keys = Array.from(new Set(hus.map(h => String(h).toUpperCase())));
    const found = keys.filter(k => shipment.scannedItems.some(i => i && String(i.rawInput).toUpperCase() === k));
    if (!found.length) return { deleted: [], error: 'Packstück nicht gefunden – bitte Ansicht neu öffnen.' };
    // Plätze = Zeilen der Packstücktabelle (Anstehend oder gesichert, ohne Kombi/Storno) – so viele Kolli fallen weg
    const slotsAll = shipment.scannedItems.filter(i => i && !i.isCancelled && !i.isCombination && (i.status === 'Anstehend' || EXCLUSIVE_SECURITY_STATUSES.includes(i.status)));
    const removingSlots = slotsAll.filter(i => found.includes(String(i.rawInput).toUpperCase())).length;
    if (removingSlots >= slotsAll.length) return { deleted: [], error: 'Das letzte Packstück kann nicht gelöscht werden – dafür „Sendung löschen“ verwenden.' };
    shipment.scannedItems = shipment.scannedItems.filter(i => !(i && found.includes(String(i.rawInput).toUpperCase())));
    const expected = expectedPiecesOf(shipment);
    if (expected !== null) shipment.totalPiecesExpected = Math.max(0, expected - removingSlots);
    shipment.lastModified = new Date().toISOString();
    saveShipments(shipments);
    return { deleted: found, slots: removingSlots };
}
function deleteSelectedPacks(bar) {
    if (!bar) return;
    const base = bar.dataset.basenumber;
    const hus = Array.from(new Set(Array.from(currentDetailsDivEl.querySelectorAll('.pack-select:checked:not(:disabled)')).map(cb => cb.dataset.hu)));
    if (!hus.length) { displayError('Bitte zuerst Packstücke auswählen.'); return; }
    if (!confirm(`${pluralize(hus.length, 'Packstück', 'Packstücke')} aus ${base} löschen?\n\n${hus.join(', ')}\n\nAlle Einträge dieser HU-Nummern (auch Wareneingang, Sicherung und Zeitleiste) werden entfernt, die Kolli-Zahl sinkt entsprechend. Das lässt sich nicht rückgängig machen.`)) return;
    const r = deleteHusFromShipment(base, hus);
    if (r.error) { displayError(r.error, 'orange'); return; }
    renderTable();
    displayCurrentShipmentDetails(base);
    displayError(`${pluralize(r.deleted.length, 'Packstück', 'Packstücke')} gelöscht – ${r.deleted.join(', ')}.`, 'green', 3000);
}
// „Packstück löschen“ im Bearbeiten-Fenster (Stift): dieselbe Funktion für eine einzelne HU
function deleteHuFromEditModal() {
    const base = document.getElementById('huEditBaseNumber').value;
    const hu = document.getElementById('huEditOriginalHu').value;
    if (!base || !hu) return;
    const err = document.getElementById('huEditError');
    if (!confirm(`Packstück ${hu} aus ${base} löschen?\n\nAlle Einträge dieser HU (auch Wareneingang, Sicherung und Zeitleiste) werden entfernt, die Kolli-Zahl sinkt um 1. Das lässt sich nicht rückgängig machen.`)) return;
    const r = deleteHusFromShipment(base, [hu]);
    if (r.error) { err.textContent = r.error; err.classList.remove('hidden'); return; }
    closeHuEditModal();
    renderTable();
    displayCurrentShipmentDetails(base);
    displayError(`Packstück ${hu} gelöscht.`, 'green', 3000);
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
    ['orderAddNumber', 'orderAddForwarder', 'orderAddCountry', 'orderAddPlso', 'orderAddHu', 'orderAddPackaging', 'orderAddWeight'].forEach(id => { document.getElementById(id).value = ''; });
    modal.querySelectorAll('.order-add-dim').forEach(el => { el.value = ''; });   // neuer MAN-Auftrag: Maße in CM (wie die Rechnung)
    setDimensionUnit(modal, 'CM');
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
    const dim = readDimensionFields(document.getElementById('orderAddModal'), 'order-add-dim', 'CM');
    const weightRaw = document.getElementById('orderAddWeight').value.trim();
    const err = document.getElementById('orderAddError');
    const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };

    if (!number) return fail('Bitte die Rechnungsnummer eingeben.');
    if (!/^[0-9A-Z-]+$/.test(number)) return fail('Rechnungsnummer darf nur Ziffern, Großbuchstaben und Bindestrich enthalten.');
    if (dim.error) return fail(dim.error);
    const dimensions = dim.value;
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
    const modalEl = document.getElementById('huEditModal');
    const dim = readDimensionFields(modalEl, 'hu-edit-dim', modalEl.dataset.unit || 'CM');
    const weightRaw = document.getElementById('huEditWeight').value.trim();
    const err = document.getElementById('huEditError');
    const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };

    if (!newHu) return fail('Bitte eine HU-Nummer eingeben.');
    if (!/^[0-9A-Z-]+$/.test(newHu)) return fail('HU-Nummer darf nur Ziffern, Großbuchstaben und Bindestrich enthalten.');
    if (dim.error) return fail(dim.error);
    const dimensions = dim.value;
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

    // Merken, welche Sendung gerade angezeigt wird (für Sync-Aktualisierung und Start per Adresse) – gilt für alle
    // Sendungsarten; der Titel #shipmentDetailTitle existiert nur bei Einzelsendungen.
    displayTarget.dataset.base = shipment ? baseNumberToDisplay : '';
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
// Pfeil als eigenes Element: auf dem Handy ausgeblendet (Platz), am Desktop sichtbar
detailsHtml += `${numberPart}<span class="hu-value" style="cursor:pointer;" title="Klicken zum Kopieren">${escapeHtml(item.rawInput)}</span>${sendnrHtml}<span class="scan-arrow" aria-hidden="true">\u2192</span><span class="status">${escapeHtml(item.status)}</span>${item.isCombination ? ` <span class="combo">(Kombi)</span>` : ''}`;
// --- ENDE DER ÄNDERUNG ---
//...
        if (isCancelled) {
            const cancelDt = item.cancelledTimestamp ? new Date(item.cancelledTimestamp) : null;
            detailsHtml += `<span class="cancelled-info"> (storniert am ${cancelDt ? cancelDt.toLocaleString('de-DE') : 'Unbekannt'})</span>`;
        }
        detailsHtml += `</div>`;
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
            // Storno steht in der Aktionszeile unten links (nicht mehr oben rechts) – so hat die HU-Zeile die volle Breite
            // und die Kontrollmethode passt auch auf schmalen Geräten (Zebra, 360 px) neben die Nummer.
            detailsHtml += `<button class="cancel-button" data-basenumber="${escapeHtml(baseNumberToDisplay)}" data-timestamp="${item.timestamp}">Storno</button>`;
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


