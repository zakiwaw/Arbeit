// Fracht Tracker – Teil 9/10: 09-pdf.js
// Sicherungsnachweis (PDF): Firmenlogo, Packstück-Zeilen, openSecurityReport; Fehlmengen/Vollständigkeits-Hinweis
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

// Firmenlogo (PNG, Base64) für den Kopf des Sicherungsnachweises
const FIRMENLOGO_BASE64 = 'data:image/png;base64,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'; // Beispiel-Placeholder, ERSETZEN!
    
// ---- Sicherungsnachweis (PDF im Browser-Tab) ---------------------------------------------------------------------
// Der PDF-Knopf (Liste, Detail-Kopfzeile, Archiv-Treffer) öffnet das Dokument direkt in einem neuen Tab – von dort
// drucken oder speichern. Inhalt je Sendung: Kopf (Nummer, LKW, Spediteur/Land, PLSO, Kolli, Gewicht), Kennzahlen
// (Wareneingang / Sicherung / Dunkelalarm), Tabelle je Packstück (wie die Packstücktabelle am Desktop) und die
// Zusammenfassung der Kontrollmethoden. Offene Packstücke stehen als „Offen“ drin – mit Hinweis im Kopf.
// VVL-Aufträge (VW): ein Dokument für alle Aufträge der Vorverladeliste, je Auftrag ein Abschnitt.
// ---- Sicherungsnachweis (PDF) ----------------------------------------------------------------------------------
// Packstückzeilen für den Nachweis – gleiche Regeln wie die Desktop-Packstücktabelle: HU-Listen eine Zeile je Position
// (Anstehend oder zählende Sicherung), Einzelsendung eine Zeile je erwartetem Stück (n-ter Sicherungsscan).
function pdfPackRows(shipment) {
    const items = (Array.isArray(shipment.scannedItems) ? shipment.scannedItems : []).filter(i => i);
    const same = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();
    const val = v => (v && v !== 'N/A') ? String(v) : '';
    const isSec = i => EXCLUSIVE_SECURITY_STATUSES.includes(i.status);
    if (shipment.isHuListOrder) {
        const byHu = (hu, pred) => items.filter(i => !i.isCancelled && same(i.rawInput, hu) && pred(i));
        const slots = items.filter(i => !i.isCancelled && !i.isCombination && (i.status === 'Anstehend' || isSec(i)))
            .sort((a, b) => ((a.position || 9999) - (b.position || 9999)) || String(a.rawInput).localeCompare(String(b.rawInput)));
        return slots.map(item => {
            const hu = item.rawInput;
            const detail = items.find(i => same(i.rawInput, hu) && (i.packaging || i.dimensions || i.grossWeight)) || item;
            const secured = byHu(hu, isSec);
            const kombi = byHu(hu, i => i.isCombination && isSec(i)).map(k => k.status);
            const dunkelOpen = byHu(hu, i => i.status === 'Dunkelalarm').some(a => !secured.some(x => (Date.parse(x.timestamp) || 0) >= (Date.parse(a.timestamp) || 0)));
            const open = item.status === 'Anstehend';
            const notes = byHu(hu, () => true).reduce((arr, i) => arr.concat(Array.isArray(i.notes) ? i.notes : []), []);
            return { pos: item.position ? `${item.position}.` : '', nr: String(hu), sub: item.sendnr ? String(item.sendnr) : '',
                packaging: val(detail.packaging), dimensions: val(detail.dimensions), weight: val(detail.grossWeight),
                we: byHu(hu, i => i.status === 'Wareneingang').length > 0, state: open ? (dunkelOpen ? 'dunkel' : 'open') : 'secured',
                method: open ? '' : item.status, kombi, time: open ? '' : item.timestamp, notes };
        });
    }
    const live = items.filter(i => !i.isCancelled && i.status !== 'Anstehend');
    const byTime = (a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0);
    const secured = live.filter(i => isSec(i) && !i.isCombination).sort(byTime);
    const receipts = live.filter(i => i.status === 'Wareneingang').sort(byTime);
    const dunkelOpen = calculateOpenDunkelalarmCount(items, shipment);
    const expected = expectedPiecesOf(shipment);
    const n = Math.max(expected || 0, secured.length, receipts.length);
    const rows = [];
    for (let k = 0; k < n; k++) {
        const sec = secured[k], we = receipts[k];
        const d = [sec, we].find(i => i && (i.packaging || i.dimensions || i.grossWeight)) || null;
        const notes = [sec, we].reduce((arr, i) => arr.concat(i && Array.isArray(i.notes) ? i.notes : []), []);
        rows.push({ pos: `${k + 1}.`, nr: String(shipment.hawb), sub: '', packaging: d ? val(d.packaging) : '', dimensions: d ? val(d.dimensions) : '', weight: d ? val(d.grossWeight) : '',
            we: !!we, state: sec ? 'secured' : (k - secured.length < dunkelOpen ? 'dunkel' : 'open'), method: sec ? sec.status : '', kombi: [], time: sec ? sec.timestamp : '', notes });
    }
    return rows;
}
// Sicherungsnachweis als PDF im neuen Browser-Tab. Bewusst knapp: je Sendung Titel + Status-Badge, vier Zeilen
// (Sicherheitsstatus, Kontrollmethode, erteilt von/am, RegB-Nummer) und die Packstückliste mit Methode und Zeitpunkt
// je Packstück – damit sind die Angaben nach DVO (EU) 2015/1998, Anhang Nr. 6.3.2.6 abgedeckt (Kennung des RegB,
// Kennung der Sendung, Inhalt, Status, Grund der Erteilung, Name + Zeitpunkt). Bei einer Vorverladeliste zuerst eine
// Übersicht, dann je Kundennummer eine eigene Seite. Offene Packstücke → Status „NICHT ERTEILT“, Nachweis trotzdem.
function openSecurityReport(base, shipmentsPool, preopenedTab) {
    const all = shipmentsPool || loadShipments();
    const clicked = all[base];
    if (!clicked) { if (preopenedTab) preopenedTab.close(); displayError(`Sendung ${escapeHtml(base)} nicht gefunden.`); return false; }
    const parent = clicked.parentOrderNumber || null;
    const list = parent ? Object.values(all).filter(s => s && s.parentOrderNumber === parent).sort((a, b) => String(a.hawb).localeCompare(String(b.hawb))) : [clicked];
    if (!jsPDF || typeof jsPDF.API?.autoTable !== 'function') { if (preopenedTab) preopenedTab.close(); displayError('PDF nicht verfügbar: Die PDF-Bibliothek wurde nicht geladen. Bitte Seite neu laden.'); return false; }
    // Neuen Tab SOFORT im Klick öffnen (Popup-Blocker) – die URL kommt, sobald das PDF fertig ist
    const tab = preopenedTab || window.open('', '_blank');
    try {
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
        const M = 15, TOP = 36, BOTTOM = 24, CW = W - 2 * M;   // Seitenränder; TOP/BOTTOM = Platz für Kopf- und Fußzeile
        const fmtDT = d => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
        const now = fmtDT(new Date());
        const isMan = s => !!(s.freightForwarder && s.destinationCountry);
        const refOf = s => s.parentOrderNumber ? `Kundennr. ${s.hawb}` : (isMan(s) ? `Rechnung ${s.hawb}` : `Sendung ${s.hawb}`);
        const docRef = parent ? `Vorverladeliste ${parent}` : refOf(clicked);
        const dark = [30, 41, 59], mid = [71, 85, 105], line = [203, 213, 225], fillLabel = [248, 250, 252], fillHead = [241, 245, 249];
        const red = [185, 28, 28], amber = [180, 83, 9], green = [21, 128, 61], fillOpen = [255, 251, 235], fillDunkel = [254, 226, 226];
        const pcs = n => pluralize(n, 'Packstück', 'Packstücke');
        const methodText = code => KONTROLLMETHODE_TEXT[code] ? `${code} – ${KONTROLLMETHODE_TEXT[code]}` : code;
        let y = TOP;
        const header = () => {
            if (FIRMENLOGO_BASE64) { try { doc.addImage(FIRMENLOGO_BASE64, 'PNG', W - M - 46, M - 2, 46, 10); } catch (e) { /* Logo optional */ } }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...dark); doc.text('Sicherungsnachweis', M, M + 5);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...mid); doc.text(docRef, M, M + 12);
            doc.setDrawColor(...line); doc.setLineWidth(0.4); doc.line(M, M + 16, W - M, M + 16);
            y = TOP;
        };
        const footer = () => {
            const pages = doc.getNumberOfPages();
            for (let p = 1; p <= pages; p++) {
                doc.setPage(p);
                doc.setDrawColor(...line); doc.setLineWidth(0.3); doc.line(M, H - 17, W - M, H - 17);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...mid);
                doc.text(`${docRef} · ${REGB_NAME} · Reglementierter Beauftragter ${RAC_NUMMER}`, M, H - 12.5);
                doc.text(`Seite ${p} von ${pages}`, W - M, H - 12.5, { align: 'right' });
                doc.text(`Maschinell erstellt am ${now} Uhr von ${MITARBEITER_NAME} · ohne Unterschrift gültig · Angaben nach DVO (EU) 2015/1998, Anhang Nr. 6.3.2.6`, M, H - 8.5);
            }
        };
        const ensure = need => { if (y + need > H - BOTTOM) { doc.addPage(); header(); } };
        // Gemeinsame Tabellen-Einstellungen: Kopfzeile auch auf Seiten, die die Tabelle selbst umbricht; Zeilen nicht teilen
        const tableBase = { margin: { left: M, right: M, top: TOP, bottom: BOTTOM }, theme: 'grid', rowPageBreak: 'avoid', didDrawPage: data => { if (data.pageNumber > 1) header(); } };
        const badge = (text, color, xRight, yTop) => {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            const w = doc.getTextWidth(text) + 8;
            doc.setFillColor(...color); doc.roundedRect(xRight - w, yTop, w, 7, 1.5, 1.5, 'F');
            doc.setTextColor(255, 255, 255); doc.text(text, xRight - w / 2, yTop + 4.8, { align: 'center' });
        };
        const sectionTitle = (text, st, sub) => {
            ensure(sub ? 46 : 40);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...dark); doc.text(text, M, y + 5);
            if (st) badge(st.badge, st.color, W - M, y);
            y += 12;
            if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...mid); doc.text(sub, M, y - 3); y += 5; }
        };
        // MAN-Auftrag: PLSO · Spediteur · Land als Zeile unter dem Titel (die vier Kopfzeilen bleiben unverändert)
        const subtitleOf = s => isMan(s) ? [s.plsoNumber ? `PLSO ${s.plsoNumber}` : '', `Spediteur ${s.freightForwarder}`, `Land ${s.destinationCountry}`].filter(Boolean).join('   ·   ') : '';
        // Gesamtgewicht aus den Zeilen der Packstückliste (je Packstück einmal; nur Zeilen mit lesbarer Angabe)
        const rowsKg = rows => rows.reduce((a, r) => { const kg = parseWeightKg(r.weight); if (kg !== null) { a.sum += kg; a.n++; } return a; }, { sum: 0, n: 0 });
        // Sicherheitsstatus der Sendung (SPX nur, wenn alle Packstücke kontrolliert sind)
        const stateOf = p => {
            if (p.dunkel > 0) return { key: 'dunkel', color: red, badge: 'DUNKELALARM', status: `NICHT ERTEILT – Dunkelalarm offen (${pcs(p.dunkel)}), andere Kontrollmethode erforderlich` };
            if (p.open) return { key: 'open', color: amber, badge: 'NICHT ERTEILT', status: p.counted ? `NICHT ERTEILT – ${p.pending} von ${p.expected} Packstücken noch nicht kontrolliert` : `NICHT ERTEILT – noch kein Packstück kontrolliert (${pcs(p.expected)})` };
            if (p.unknown) return p.counted > 0 ? { key: 'unknown', color: amber, badge: 'STÜCKZAHL FEHLT', status: `Stückzahl nicht hinterlegt – ${pcs(p.counted)} kontrolliert` } : { key: 'open', color: amber, badge: 'NICHT ERTEILT', status: 'NICHT ERTEILT – keine Kontrolle erfasst' };
            return { key: 'ok', color: green, badge: 'SPX', status: p.expected === 1 ? 'SPX – das Packstück wurde kontrolliert' : `SPX – alle ${p.expected} Packstücke kontrolliert` };
        };
        const methodSummary = s => {
            const counts = {}, kombi = {};
            (s.scannedItems || []).forEach(i => { if (!i || i.isCancelled || !EXCLUSIVE_SECURITY_STATUSES.includes(i.status)) return; const t = i.isCombination ? kombi : counts; t[i.status] = (t[i.status] || 0) + 1; });
            const fmt = o => Object.keys(o).sort().map(k => `${methodText(k)} (${pcs(o[k])})`);
            return { main: fmt(counts), kombi: fmt(kombi), codes: Object.keys(counts).sort() };
        };
        const lastSecured = s => (s.scannedItems || []).filter(i => i && !i.isCancelled && !i.isCombination && EXCLUSIVE_SECURITY_STATUSES.includes(i.status)).reduce((m, i) => Math.max(m, Date.parse(i.timestamp) || 0), 0);
        const summaryLines = (s, st, ms) => {
            const t = lastSecured(s), who = s.mitarbeiter || MITARBEITER_NAME;
            return [
                ['Sicherheitsstatus', st.status, st.color],
                ['Kontrollmethode', ms.main.length ? ms.main.join(' · ') + (ms.kombi.length ? `\nzusätzlich Kombi: ${ms.kombi.join(', ')}` : '') : 'keine Kontrolle erfasst'],
                ['Erteilt von / am', (st.key === 'ok' || st.key === 'unknown') ? `${who} · ${fmtDT(t)} Uhr` : (t ? `noch nicht erteilt · letzte Kontrolle ${fmtDT(t)} Uhr, ${who}` : 'noch nicht erteilt')],
                ['RegB-Nummer', `${RAC_NUMMER} · ${REGB_NAME}`]
            ];
        };
        const drawShipment = (s, idx) => {
            const p = shipmentProgress(s), st = stateOf(p), rows = pdfPackRows(s), ms = methodSummary(s);
            sectionTitle(parent ? `${refOf(s)} – Auftrag ${idx + 1} von ${list.length}` : refOf(s), st, subtitleOf(s));
            // Vier Zeilen: Status, Methode, erteilt von/am, RegB
            const LW = 42;
            summaryLines(s, st, ms).forEach(([label, value, color]) => {
                const lines = doc.splitTextToSize(value, CW - LW);
                ensure(lines.length * 4.6 + 3);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...mid); doc.text(label, M, y);
                doc.setFont('helvetica', color ? 'bold' : 'normal'); doc.setTextColor(...(color || dark)); doc.text(lines, M + LW, y);
                y += lines.length * 4.6 + 2.2;
            });
            y += 6;
            // Packstückliste
            ensure(45);
            const hasPos = rows.some(r => r.pos), hasSub = rows.some(r => r.sub);
            // Maße: Einheit in die Spaltenüberschrift (wenn alle Zeilen dieselbe haben), Zelle „L × B × H“ – bleibt einzeilig.
            // Gewicht: normalisiert als „42 kg“ (Importwerte wie „42,000KG“ brachen sonst mitten im Wort um).
            const dimsOf = r => splitDimensions(r.dimensions);
            const units = Array.from(new Set(rows.map(r => { const d = dimsOf(r); return d ? d.unit : ''; }).filter(u => u)));
            const dimUnit = (units.length === 1 && rows.every(r => !r.dimensions || dimsOf(r))) ? units[0] : '';
            const dimText = r => { const d = dimsOf(r); return d ? `${d.l} × ${d.b} × ${d.h}${(dimUnit || !d.unit) ? '' : ' ' + d.unit.toLowerCase()}` : r.dimensions; };
            const weightText = r => { const kg = parseWeightKg(r.weight); return kg === null ? r.weight : formatKg(kg); };
            const cols = [];
            if (hasPos) cols.push({ h: 'Pos.', w: 12, get: r => r.pos, st: { halign: 'right' } });
            // VW: VSE und Sendungs-Nr. nebeneinander (zwei Spalten) statt untereinander – jede Zeile bleibt einzeilig
            cols.push({ h: hasSub ? 'VSE' : (s.isHuListOrder ? 'HU-Nummer' : 'Sendungsnummer'), w: 'auto', get: r => r.nr, st: { fontStyle: 'bold' } });
            if (hasSub) cols.push({ h: 'Sendungs-Nr.', w: 'auto', get: r => r.sub });
            if (rows.some(r => r.packaging)) cols.push({ h: 'Verpackung', w: hasSub ? 22 : 28, get: r => r.packaging });
            if (rows.some(r => r.dimensions)) cols.push({ h: dimUnit ? `Maße (${dimUnit.toLowerCase()})` : 'Maße', w: 33, get: dimText });
            if (rows.some(r => r.weight)) cols.push({ h: 'Gewicht', w: 19, get: weightText, st: { halign: 'right' } });
            cols.push({ h: 'WE', w: 9, get: r => r.we ? 'Ja' : '–', st: { halign: 'center' } });
            cols.push({ h: 'Kontrolle', w: 24, get: r => (r.state === 'secured' ? r.method : (r.state === 'dunkel' ? 'Dunkelalarm' : 'Offen')) + (r.kombi.length ? `\n+ ${r.kombi.join('/')} (Kombi)` : ''), st: { fontStyle: 'bold' } });
            cols.push({ h: 'Datum / Uhrzeit', w: 28, get: r => r.time ? fmtDT(r.time) : '' });
            const colKontrolle = cols.findIndex(c => c.h === 'Kontrolle'), colWe = cols.findIndex(c => c.h === 'WE'), colKg = cols.findIndex(c => c.h === 'Gewicht');
            // Summenzeile: Anzahl + Gesamtgewicht (auf der letzten Seite der Liste)
            const kgTot = rowsKg(rows);
            const foot = colKg > 0 ? [[{ content: `Gesamt · ${pcs(rows.length)}` + (kgTot.n < rows.length ? ` · Gewicht aus ${kgTot.n} Angaben` : ''), colSpan: colKg }, { content: formatKg(kgTot.sum), styles: { halign: 'right' } }, { content: '', colSpan: cols.length - colKg - 1 }]] : null;
            const body = [], meta = [];
            rows.forEach(r => {
                body.push(cols.map(c => c.get(r))); meta.push({ r, note: false });
                if (r.notes.length) { body.push([{ content: `Bemerkung zu ${r.nr}: ${r.notes.join('; ')}`, colSpan: cols.length, styles: { fontStyle: 'italic', textColor: mid, halign: 'left' } }]); meta.push({ r, note: true }); }
            });
            const columnStyles = {}; cols.forEach((c, i) => { columnStyles[i] = Object.assign({ cellWidth: c.w }, c.st || {}); });
            if (body.length) {
                doc.autoTable(Object.assign({}, tableBase, {
                    startY: y, head: [cols.map(c => c.h)], body, foot: foot || undefined, showFoot: 'lastPage',
                    footStyles: { fillColor: fillHead, textColor: dark, fontStyle: 'bold' },
                    margin: { left: M, right: M, top: TOP + 8, bottom: BOTTOM },
                    didDrawPage: data => { if (data.pageNumber > 1) { header(); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...dark); doc.text(`${refOf(s)} – Packstückliste (Fortsetzung)`, M, TOP + 3); } },
                    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 }, textColor: dark, lineColor: line, lineWidth: 0.25, overflow: 'linebreak', valign: 'middle' },
                    headStyles: { fillColor: fillHead, textColor: dark, fontStyle: 'bold', valign: 'middle' },
                    columnStyles,
                    didParseCell: data => {
                        if (data.section !== 'body') return;
                        const m = meta[data.row.index]; if (!m) return;
                        if (m.r.state !== 'secured') data.cell.styles.fillColor = m.r.state === 'dunkel' ? fillDunkel : fillOpen;
                        if (m.note) return;
                        if (data.column.index === colKontrolle) data.cell.styles.textColor = m.r.state === 'dunkel' ? red : (m.r.state === 'open' ? amber : green);
                        if (data.column.index === colWe && m.r.we) data.cell.styles.textColor = green;
                    }
                }));
                y = doc.lastAutoTable.finalY + 8;
            } else {
                doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...mid); doc.text('Keine Packstücke erfasst.', M, y + 2); y += 8;
            }
        };
        header();
        if (parent) {
            // Übersicht der Vorverladeliste, danach je Auftrag (Einzelsendung) eine eigene Seite
            const tot = list.reduce((a, s) => { const p = shipmentProgress(s); a.exp += p.expected || 0; a.we += p.we; a.sec += p.counted; a.open += p.pending || 0; a.dunkel += p.dunkel; return a; }, { exp: 0, we: 0, sec: 0, open: 0, dunkel: 0 });
            const totState = tot.dunkel ? { badge: 'DUNKELALARM', color: red } : (tot.open ? { badge: 'NICHT ERTEILT', color: amber } : { badge: 'SPX', color: green });
            sectionTitle(`Übersicht Vorverladeliste ${parent}`, totState);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...mid);
            doc.text(`LKW ${truckShortName(clicked.truckId)} · ${pluralize(list.length, 'Auftrag', 'Aufträge')} · ${pcs(tot.exp)} · Wareneingang ${tot.we} von ${tot.exp} · kontrolliert ${tot.sec} von ${tot.exp}` + (tot.open ? ` · offen ${tot.open}` : '') + (tot.dunkel ? ` · Dunkelalarm ${tot.dunkel}` : ''), M, y);
            y += 6;
            const ovKg = list.map(s => rowsKg(pdfPackRows(s)));
            const ovKgTot = ovKg.reduce((a, k) => { a.sum += k.sum; a.n += k.n; return a; }, { sum: 0, n: 0 });
            const ovBody = list.map((s, i) => { const p = shipmentProgress(s), st = stateOf(p), ms = methodSummary(s); return [String(s.hawb), p.expected === null ? '–' : String(p.expected), String(p.we), String(p.counted), ovKg[i].n ? formatKg(ovKg[i].sum) : '–', ms.codes.join(', ') || '–', st.badge + (p.pending ? `\n${p.pending} offen` : '')]; });
            const ovColors = list.map(s => stateOf(shipmentProgress(s)).color);
            doc.autoTable(Object.assign({}, tableBase, {
                startY: y, head: [['Kundennr.', 'Packstücke', 'Wareneingang', 'Kontrolliert', 'Gewicht', 'Methode(n)', 'Sicherheitsstatus']], body: ovBody,
                foot: [['Gesamt', String(tot.exp), String(tot.we), String(tot.sec), ovKgTot.n ? formatKg(ovKgTot.sum) : '–', { content: '', colSpan: 2 }]], showFoot: 'lastPage',
                styles: { font: 'helvetica', fontSize: 9.5, cellPadding: { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 }, textColor: dark, lineColor: line, lineWidth: 0.25, overflow: 'linebreak', valign: 'middle' },
                headStyles: { fillColor: fillHead, textColor: dark, fontStyle: 'bold', fontSize: 9, halign: 'left' },
                footStyles: { fillColor: fillHead, textColor: dark, fontStyle: 'bold', fontSize: 9.5 },
                columnStyles: { 0: { cellWidth: 24, fontStyle: 'bold' }, 1: { cellWidth: 23, halign: 'right' }, 2: { cellWidth: 28, halign: 'right' }, 3: { cellWidth: 24, halign: 'right' }, 4: { cellWidth: 23, halign: 'right' }, 5: { cellWidth: 'auto' }, 6: { cellWidth: 34, fontStyle: 'bold' } },
                didParseCell: data => {
                    if (data.section === 'body' && data.column.index === 6) data.cell.styles.textColor = ovColors[data.row.index];
                    if ((data.section === 'head' || data.section === 'foot') && data.column.index >= 1 && data.column.index <= 4) data.cell.styles.halign = 'right';   // Zahlenspalten: Kopf/Summe wie Werte rechtsbündig
                }
            }));
            y = doc.lastAutoTable.finalY + 8;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
            if (tot.open || tot.dunkel) {
                doc.setTextColor(...amber);
                const hint = doc.splitTextToSize(`Hinweis: ${tot.open} von ${tot.exp} Packstücken noch nicht kontrolliert` + (tot.dunkel ? `, ${pluralize(tot.dunkel, 'offener Dunkelalarm', 'offene Dunkelalarme')}` : '') + ' – für die betroffenen Aufträge ist kein Sicherheitsstatus erteilt.', CW);
                doc.text(hint, M, y); y += hint.length * 4.2 + 3;
            }
            list.forEach((s, idx) => { doc.addPage(); header(); drawShipment(s, idx); });
        } else {
            drawShipment(clicked, 0);
        }
        footer();
        const url = doc.output('bloburl');
        if (tab) { tab.location.href = url; }
        else { window.open(url, '_blank') || displayError('Der Browser hat das PDF-Fenster blockiert – bitte Pop-ups für diese Seite erlauben.', 'orange', 6000); }
        clearError();
        return true;
    } catch (error) {
        if (tab) tab.close();
        console.error('PDF Fehler:', error);
        displayError('Fehler beim Erstellen des PDFs: ' + error.message);
        return false;
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
        // (Der manuelle Menüpunkt „An Google Sheet senden“ ist entfallen: jede Änderung geht sofort über die Sync-Vormerkung
        //  an den Server, Ausstehendes wird beim nächsten Abgleich/Start automatisch nachgeschickt – s. flushPendingChanges.)
        async function notifyShipmentCompletion(shipmentObject) {
            const baseNumber = shipmentObject.hawb;
            if (!baseNumber) { console.error("Konnte HAWB für Benachrichtigung nicht ermitteln."); return; }
            if (!WEB_APP_URL || WEB_APP_URL.includes('YOUR_DEPLOYED_WEB_APP_URL_HERE')) {
                console.warn("Web App URL fehlt, keine Abschluss-Benachrichtigung."); return;
            }
            if (notifiedCompletions.has(baseNumber)) return; // Bereits benachrichtigt

            console.log(`Sende Abschluss-Benachrichtigung für ${baseNumber}...`);
            notifiedCompletions.add(baseNumber); // Als benachrichtigt markieren
            
            try {
                // Kennt das Server-Skript die Aktion nicht (Skript ohne Abschluss-Handler), ist das KEIN Fehler:
                // die Scans sind längst über saveShipments gespeichert – nur die Zusatz-Benachrichtigung entfällt.
                let result, serverHasNoHandler = false;
                try { result = await postToServer('shipmentComplete', { shipmentData: shipmentObject }); }
                catch (e) { if (!isUnknownActionError(e)) throw e; serverHasNoHandler = true; result = { status: 'error', message: e.message }; }
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
