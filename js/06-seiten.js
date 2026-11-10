// Fracht Tracker – Teil 6/10: 06-seiten.js
// Startseite (Kacheln), Seiten-Navigation + Verlauf (?seite=…), LKW-Seite (umbenennen, löschen, aktiv/inaktiv), Info-Filter (Zeitraum, Gewicht), Maße
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

// ===================================================================
// STARTSEITE (Kacheln) UND UNTERSEITEN
// Kacheln: Anlieferung (LKW → seine Sendungen), Dunkelalarm, Offene Sendungen, Info (Suche mit Filtern).
// Die Unterseiten sind eigene Vollbild-Ansichten (#pageView) wie die Sendungsdetails – die Hauptansicht ist dabei
// ausgeblendet. Sie liegen im Browser-Verlauf mit eigener Adresse (?seite=anlieferung usw.): Zurück-Geste/-Taste
// schließt sie, Neuladen öffnet sie wieder. Keine getrennten HTML-Dateien: Daten, Sync und Scan-Logik bleiben
// an einer Stelle. Nach jedem Zeichnen der Liste (drawShipmentList) – also nach Scan, Sync, Löschen, Import –
// werden Kacheln und eine offene Seite mit aktualisiert. Tippt man im Scan-Feld, weichen die Kacheln den Treffern.
// ===================================================================
const homeHubEl = document.getElementById('homeHub');
const pageViewEl = document.getElementById('pageView');
const pageTitleEl = document.getElementById('pageTitle');
const pageBadgeEl = document.getElementById('pageBadge');
const pageHeaderActionsEl = document.getElementById('pageHeaderActions'); // rechts in der Kopfzeile, z. B. ⋮-Menü der LKW-Seite
const pageContentEl = document.getElementById('pageContent');
const pageBackBtnEl = document.getElementById('pageBackBtn');
const listCaptionEl = document.getElementById('listCaption');

const PAGE_LIST_STEP = LIST_PAGE_SIZE;
let currentPage = null;          // { id: 'anlieferung'|'lkw'|'dunkelalarm'|'offen'|'info', truckId }
let pageLimit = PAGE_LIST_STEP;  // wie viele Sendungskarten die offene Seite gerade zeigt
let infoArchiveCache = {};       // base → Sendung (Archiv-Treffer der Info-Suche)
const infoState = { text: '', status: 'all', truck: 'all', period: 'all', dateFrom: '', dateTo: '', weightMin: '', weightMax: '', archive: false,
                    archiveQuery: '', archiveOrder: [], archiveTotal: 0, archiveTruncated: false, archiveBusy: false, archiveNote: '' };
let infoTimer = null, infoArchiveTimer = null, infoArchiveSeq = 0;

// ---- Datenhilfen -------------------------------------------------------
function expectedPiecesOf(s) {
    const raw = s ? s.totalPiecesExpected : null;
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}
// Fortschritt einer Sendung – gleiche Regeln wie Karten und Server-Archiv: HU-Listen-Auftrag offen, solange eine
// Position „Anstehend“ ist; Einzelsendung offen, solange erfasste Stück + Dunkelalarm unter der Stückzahl liegen.
// Ohne Stückzahl (null/0) ist der Abschluss nicht bestimmbar (unknown).
function shipmentProgress(s) {
    const items = Array.isArray(s && s.scannedItems) ? s.scannedItems : [];
    const counted = calculateCurrentCountedPieces(items);
    const dunkel = calculateOpenDunkelalarmCount(items, s); // nur OFFENE Dunkelalarme (erledigt = danach gesichert)
    const we = calculateGoodsReceiptCount(items);
    const expected = expectedPiecesOf(s);
    if (s && s.isHuListOrder) {
        const pending = items.filter(i => i && i.status === 'Anstehend' && !i.isCancelled).length;
        return { counted, dunkel, we, expected, pending, unknown: false, open: pending > 0 };
    }
    if (expected === null || expected <= 0) return { counted, dunkel, we, expected: null, pending: null, unknown: true, open: false };
    const pending = Math.max(0, expected - counted - dunkel);
    return { counted, dunkel, we, expected, pending, unknown: false, open: pending > 0 };
}
// LKW mit Kennzahlen; Bezeichnung und Reihenfolge wie im Seitenmenü (renderLkwMenu)
function collectTrucks(shipments, lkwStatus) {
    const trucks = {};
    const names = refreshTruckNames(shipments);
    let manCount = 1;
    Object.keys(shipments).forEach(base => {
        const s = shipments[base];
        if (!s || !s.truckId) return;
        let t = trucks[s.truckId];
        if (!t) {
            const id = s.truckId;
            let icon = '🚚', name = id;
            if (id.startsWith('VVL-')) { name = 'VW ' + id.replace('VVL-', ''); }
            else if (id === 'MAN-legacy') { icon = '🚛'; name = 'MAN importiert'; }
            else if (id.startsWith('MAN-')) { icon = '🚛'; name = 'MAN ' + (manCount++); }
            else if (id.startsWith('MAN ')) { icon = '🚛'; }
            t = trucks[id] = { truckId: id, icon, name: names[id] || name, defaultName: name, custom: !!names[id], active: lkwStatus[id] !== false, bases: [], hus: 0,
                               counted: 0, dunkel: 0, we: 0, expected: 0, openOrders: 0, unknown: 0, lastModified: 0 };
        }
        const p = shipmentProgress(s);
        t.bases.push(base);
        t.hus += s.isHuListOrder ? (expectedPiecesOf(s) || 0) : 1; // gleiche Zählung wie der Zähler im Menü
        t.counted += p.counted; t.dunkel += p.dunkel; t.we += p.we;
        if (p.expected) t.expected += p.expected;
        if (p.open) t.openOrders++;
        if (p.unknown) t.unknown++;
        const ts = Date.parse(s.lastModified) || 0;
        if (ts > t.lastModified) t.lastModified = ts;
    });
    return Object.values(trucks);
}
// Hinweiszeile für LKWs, die der Server automatisch aus einer Textdatei in Google Drive angelegt hat (backend/Code.gs 2.5):
// Datei + Zeitpunkt, damit erkennbar ist, woher die Aufträge stammen. Für von Hand erfasste LKWs leer.
function importOriginNoteHtml(shipmentList) {
    const src = (shipmentList || []).find(s => s && s.importFile);
    if (!src) return '';
    const when = Date.parse(src.importedAt || src.lastModified || '');
    const whenText = isNaN(when) ? '' : ` · ${new Date(when).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    return `<p class="page-import-note" title="Automatisch aus Google Drive übernommen">Automatisch übernommen aus „${escapeHtml(src.importFile)}“${whenText}</p>`;
}
function truckLabel(t) { return `${t.icon} ${t.name}`; }
function truckLabelHtml(t) { return `<span class="emoji">${t.icon}</span> ${escapeHtml(t.name)}`; }
function chipClass(count, expected) { return expected > 0 ? getStatusClass(count, expected) : ''; }
function ratioText(count, expected) { return expected > 0 ? `${count}/${expected}` : String(count); }
function pluralize(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

// ---- Kacheln -------------------------------------------------------------
function computeHomeStats() {
    const shipments = loadShipments();
    const lkwStatus = loadLkwStatus();
    const st = { total: 0, open: 0, unknown: 0, dunkel: 0, trucksActive: 0, trucksInactive: 0, archived: archiveKnownBases.size };
    const seen = new Set();
    Object.keys(shipments).forEach(base => {
        const s = shipments[base];
        if (!s) return;
        if (s.truckId && !seen.has(s.truckId)) { seen.add(s.truckId); if (lkwStatus[s.truckId] !== false) st.trucksActive++; else st.trucksInactive++; }
        if (s.truckId && lkwStatus[s.truckId] === false) return; // deaktivierter LKW → wie in der Liste ausgeblendet
        st.total++;
        const p = shipmentProgress(s);
        if (p.open) st.open++;
        if (p.unknown) st.unknown++;
        st.dunkel += p.dunkel;
    });
    return st;
}
function setTileText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setTileCount(id, n) { const el = document.getElementById(id); if (!el) return; el.textContent = n > 99 ? '99+' : String(n); el.classList.toggle('hidden', !(n > 0)); }
function updateHomeTiles() {
    if (!homeHubEl) return;
    const st = computeHomeStats();
    setTileText('tileAnlieferungMeta', st.trucksActive === 0
        ? (st.trucksInactive ? `${st.trucksInactive} deaktiviert` : 'Keine LKW importiert')
        : `${st.trucksActive} aktiv${st.trucksInactive ? ` · ${st.trucksInactive} deaktiviert` : ''}`);
    setTileCount('tileDunkelalarmCount', st.dunkel);
    setTileText('tileDunkelalarmMeta', st.dunkel === 0 ? 'Keine Alarme' : pluralize(st.dunkel, 'HU betroffen', 'HUs betroffen'));
    setTileCount('tileOffenCount', st.open);
    setTileText('tileOffenMeta', st.open === 0 ? (st.total ? 'Alles erfasst' : 'Keine Sendungen') : `von ${st.total} Sendungen`);
    setTileText('tileInfoMeta', `${pluralize(st.total, 'Sendung', 'Sendungen')}${st.archived ? ` · ${st.archived} im Archiv` : ''}`);
}

// ---- Sichtbarkeit: Kacheln ↔ Treffer, Seite (Vollbild) ↔ Hauptansicht ------------------------------
function updateHomeLayout() {
    const filter = isBatchModeActive ? '' : listFilterText;
    const pageOpen = !!currentPage;
    const detailOpen = detailViewEl && !detailViewEl.classList.contains('hidden');
    if (homeHubEl) homeHubEl.classList.toggle('hidden', !!filter);
    // Solange die Sendungsdetails offen sind, bleibt die Unterseite (LKW, Offen, Dunkelalarm, Info) dahinter verborgen –
    // sonst schöbe sich die Seite nach jedem Neuzeichnen (Übernehmen/Storno/Bearbeiten/Sync) über die Details.
    // hideDetailView() blendet sie beim Zurück wieder ein.
    if (pageViewEl) pageViewEl.classList.toggle('hidden', !pageOpen || detailOpen);
    if (mainViewEl) mainViewEl.classList.toggle('hidden', pageOpen || detailOpen);
    if (listCaptionEl) listCaptionEl.textContent = filter ? `Treffer zu „${filter}“` : (isBatchModeActive ? 'Sendungen' : 'Zuletzt bearbeitet');
}
// Wird am Ende von drawShipmentList aufgerufen – also nach jedem Scan, Sync, Löschen, Import …
function refreshHomeViews() {
    updateHomeTiles();
    if (currentPage) renderCurrentPage(false);
    updateHomeLayout();
}

// ---- Navigation (Browser-Verlauf, Adresse ?seite=…) --------------------------------------------
function pageKey(p) { return p ? p.id + (p.truckId ? ':' + p.truckId : '') : ''; }
function pageUrl(page, detail) {
    const u = new URL(location.href);
    u.searchParams.delete('seite'); u.searchParams.delete('lkw'); u.searchParams.delete('sendung');
    if (page) { u.searchParams.set('seite', page.id === 'lkw' ? 'anlieferung' : page.id); if (page.truckId) u.searchParams.set('lkw', page.truckId); }
    if (detail) u.searchParams.set('sendung', detail);
    return u.pathname + u.search + u.hash;
}
function pushHistory(state) { try { history.pushState(state, '', pageUrl(state.frtPage, state.frtDetail)); } catch (e) { /* z. B. file:// */ } }
function replaceHistory(state) { try { history.replaceState(state, '', pageUrl(state.frtPage, state.frtDetail)); } catch (e) { /* ignorieren */ } }
function openPage(page) {
    if (!pageViewEl || !page || !PAGE_RENDERERS[page.id]) return;
    const next = { id: page.id, truckId: page.truckId || null };
    const same = pageKey(currentPage) === pageKey(next);
    currentPage = next;
    if (!same) pushHistory({ frtPage: currentPage });
    lastScrollPosition = window.scrollY;
    renderCurrentPage(true);
    pageViewEl.scrollTop = 0;
}
function showHome() {
    currentPage = null;
    if (pageContentEl) pageContentEl.innerHTML = '';
    updateHomeLayout();
    window.scrollTo(0, lastScrollPosition);
    focusShipmentInput(); // Scanner wieder scharf – ohne nach oben zu springen
}
// Zurück-Knopf der Seite: über den Verlauf schließen, damit Verlauf und Anzeige zusammenpassen
function closePage() {
    if (history.state && history.state.frtPage) history.back();
    else showHome();
}
function goBackFromDetail() {
    if (history.state && history.state.frtDetail) history.back();
    else hideDetailView();
}
// Aus der Detailansicht direkt zu einer Seite springen (Pfad in der Desktop-Kopfzeile). Der Verlaufseintrag der Details
// wird ERSETZT (kein history.back(): das käme asynchron und würde die neue Seite gleich wieder überschreiben) –
// „Zurück“ führt danach dorthin, wo man vor den Details war.
function jumpFromDetail(page) {
    detailViewEl.classList.add('hidden');
    if (page && PAGE_RENDERERS[page.id]) {
        currentPage = { id: page.id, truckId: page.truckId || null };
        replaceHistory({ frtPage: currentPage });
        renderCurrentPage(true);
        if (pageViewEl) pageViewEl.scrollTop = 0;
    } else {
        replaceHistory({ frtHome: true });
        showHome();
    }
    focusShipmentInput();
}
window.addEventListener('popstate', (e) => {
    const st = (e.state && typeof e.state === 'object') ? e.state : {};
    if (!st.frtDetail && detailViewEl && !detailViewEl.classList.contains('hidden')) hideDetailView();
    if (st.frtPage && st.frtPage.id && PAGE_RENDERERS[st.frtPage.id]) {
        const next = { id: st.frtPage.id, truckId: st.frtPage.truckId || null };
        const same = pageKey(currentPage) === pageKey(next);
        currentPage = next;
        renderCurrentPage(!same);
    } else if (currentPage) {
        showHome();
    }
    // Vorwärts-Navigation zu einer Detailansicht (showDetailView ersetzt dann nur den Eintrag)
    if (st.frtDetail && detailViewEl && detailViewEl.classList.contains('hidden') && loadShipments()[st.frtDetail]) showDetailView(st.frtDetail);
});

// ---- Seiten zeichnen ----------------------------------------------------------
function setPageHeader(title, badge, titleHtml, actionsHtml) {
    if (pageTitleEl) { if (titleHtml) pageTitleEl.innerHTML = titleHtml; else pageTitleEl.textContent = title; }
    if (pageBadgeEl) { pageBadgeEl.textContent = badge || ''; pageBadgeEl.classList.toggle('hidden', !badge); }
    if (pageHeaderActionsEl) {
        const keepOpen = isLkwActionMenuOpen();      // offenes ⋮-Menü übersteht ein Neuzeichnen (z. B. Sync-Änderung)
        pageHeaderActionsEl.innerHTML = actionsHtml || '';
        if (keepOpen) setLkwActionMenu(true);
    }
}
function renderCurrentPage(fresh) {
    if (!currentPage || !pageContentEl) return;
    const r = PAGE_RENDERERS[currentPage.id];
    if (!r) { showHome(); return; }
    if (fresh) pageLimit = PAGE_LIST_STEP;
    if (fresh || !r.update) r.render(); else r.update();
    updateHomeLayout();
}
const SHIPMENT_TABLE_HEAD = '<thead><tr><th data-sort="hawb"><span class="th-hawb">HAWB.</span><span class="th-vvl"><span>VVL</span><span>Kundennr</span></span></th>'
    + '<th class="dt-cell" data-sort="status">Status</th><th class="dt-cell" data-sort="truck">LKW</th><th class="dt-cell dt-num" data-sort="we" title="Wareneingang erfasst / erwartet">WE</th>'
    + '<th class="dt-cell dt-num" data-sort="sich" title="Gesichert (inkl. Dunkelalarm) / erwartet">Sich.</th><th class="dt-cell dt-num" data-sort="kg">Gewicht</th><th class="dt-cell dt-notes" title="Notizen">✎</th>'
    + '<th>Übersicht</th><th data-sort="time">Letzte Änd.</th><th>Aktionen</th><th class="qr-code-header">QR-Code</th></tr></thead>';
// Eine Sendungskarte (gleiche Vorlage wie in der Liste) in eine Seitentabelle; chip = Zusatzkennzeichen (z. B. LKW)
function appendPageShipmentRow(tbody, base, s, archived, chip, hits) {
    appendShipmentRow(tbody, base, s, !!archived);
    const row = tbody.rows[tbody.rows.length - 1];
    if (!row) return;
    const qr = row.querySelector('.qr-code-cell div');
    if (qr) qr.id = 'qrcode-page-' + base.replace(/[^a-zA-Z0-9]/g, ''); // eigener Namensraum (Liste kann dieselbe Sendung zeigen)
    if (chip) row.querySelector('.hawb-cell').insertAdjacentHTML('beforeend', `<span class="row-chip">${escapeHtml(chip)}</span>`);
    if (hits && hits.length) { // Gewichtsfilter: die passenden HUs mit Gewicht in der Übersichtszelle (Tippen → HU-Details)
        const shown = hits.slice(0, 6);
        let html = shown.map(h => `<button type="button" class="weight-hit" data-hu="${escapeHtml(h.hu)}" data-item-id="${escapeHtml(h.id || '')}" title="HU ${escapeHtml(h.hu)}: ${escapeHtml(h.raw)}"><span class="weight-hit-hu">${escapeHtml(h.hu)}</span>${escapeHtml(formatKg(h.kg))}</button>`).join('');
        if (hits.length > shown.length) html += `<span class="weight-hit weight-hit-more">+${hits.length - shown.length} weitere</span>`;
        row.querySelector('.summary-cell').insertAdjacentHTML('beforeend', `<span class="weight-hits">${html}</span>`);
    }
}
// Gruppen von Sendungskarten mit gemeinsamer Seitenblätterung („Weitere anzeigen“)
function appendShipmentGroups(container, groups) {
    let budget = pageLimit, total = 0, shown = 0;
    groups.forEach(g => {
        total += g.rows.length;
        if (!g.rows.length || budget <= 0) return;
        if (g.title) { const h = document.createElement('h4'); h.className = 'page-section-title'; h.textContent = g.title; container.appendChild(h); }
        const slice = g.rows.slice(0, budget);
        budget -= slice.length; shown += slice.length;
        const table = document.createElement('table');
        table.className = 'shipment-table page-shipments';
        table.innerHTML = SHIPMENT_TABLE_HEAD + '<tbody></tbody>';
        const tbody = table.tBodies[0];
        slice.forEach(r => appendPageShipmentRow(tbody, r.b, r.s, r.archived, r.chip, r.hits));
        // Nur VW-Sendungen (alle mit VVL) → Kopf „VVL | Kundennr“ statt „HAWB.“, Beschriftung nicht mehr in jeder Zeile
        if (slice.length && slice.every(r => r.s && r.s.parentOrderNumber)) table.classList.add('vw-only');
        container.appendChild(table);
    });
    if (shown < total) {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'list-more-btn page-more-btn';
        btn.textContent = `Weitere ${Math.min(PAGE_LIST_STEP, total - shown)} anzeigen (${shown} von ${total})`;
        container.appendChild(btn);
    }
    return { total, shown };
}
function truckRowHtml(t) {
    const progress = t.expected > 0 ? Math.min(100, Math.round((t.counted + t.dunkel) / t.expected * 100)) : 0;
    const state = t.openOrders > 0 ? `<span class="page-chip warn">${t.openOrders} offen</span>`
        : (t.unknown ? `<span class="page-chip">${t.unknown} ohne Stückzahl</span>` : `<span class="page-chip ok">fertig</span>`);
    // Desktop: Stift (Anzeigename) und Papierkorb (LKW mit allen Aufträgen löschen) rechts in der Karte – als Geschwister
    // des Zeilen-Knopfs (kein Knopf im Knopf); Klicks landen im pageContent-Handler (data-lkw-rename / data-lkw-delete)
    const tools = isDesktopLayout() ? `<span class="page-row-tools">`
        + `<button type="button" class="page-row-tool page-row-rename" data-lkw-rename="${escapeHtml(t.truckId)}" title="LKW umbenennen – Anzeigename auf allen Geräten" aria-label="LKW umbenennen">Umbenennen</button>`
        + `<button type="button" class="page-row-tool page-row-delete" data-lkw-delete="${escapeHtml(t.truckId)}" title="LKW mit allen Aufträgen löschen" aria-label="LKW löschen">Löschen</button></span>` : '';
    return `<li${tools ? ' class="page-row-wrap"' : ''}><button type="button" class="page-row" data-truckid="${escapeHtml(t.truckId)}" title="Sendungen von ${escapeHtml(t.name)} anzeigen">
        <span class="page-row-icon emoji" aria-hidden="true">${t.icon}</span>
        <span class="page-row-body">
            <span class="page-row-title">${escapeHtml(t.name)}</span>
            <span class="page-row-sub">${t.custom ? escapeHtml(t.defaultName) + ' · ' : ''}${pluralize(t.bases.length, 'Auftrag', 'Aufträge')} · ${t.hus} HUs · WE ${ratioText(t.we, t.expected)} · Sich. ${ratioText(t.counted, t.expected)}${t.dunkel ? ` · <span class="text-danger">${t.dunkel} Dunkelalarm</span>` : ''}</span>
            <span class="page-progress"><span style="width:${progress}%"></span></span>
        </span>
        <span class="page-row-end">${state}<span class="page-chevron" aria-hidden="true"></span></span>
    </button>${tools}</li>`;
}
// ---- LKW umbenennen / löschen (Seite „Anlieferung“, Desktop) ---------------------------------------------------------
// Der Anzeigename liegt als truckName an jeder Sendung des LKW und wandert über den normalen Sync auf alle Geräte.
// Die Kennung (truckId: „VVL-…“ / „MAN n“) bleibt unverändert – Importe, Adressen (?lkw=…) und der Archivlauf arbeiten damit.
function openLkwRenameModal(truckId) {
    const modal = document.getElementById('lkwRenameModal');
    if (!modal) return;
    const t = collectTrucks(loadShipments(), loadLkwStatus()).find(x => x.truckId === truckId);
    if (!t) { displayError(`LKW ${escapeHtml(truckId)} nicht gefunden.`); return; }
    document.getElementById('lkwRenameTruckId').value = truckId;
    const input = document.getElementById('lkwRenameName');
    input.value = t.custom ? t.name : '';
    input.placeholder = t.defaultName;
    document.getElementById('lkwRenameContext').textContent = `${t.icon} ${t.defaultName} · ${pluralize(t.bases.length, 'Auftrag', 'Aufträge')}`;
    const err = document.getElementById('lkwRenameError'); err.textContent = ''; err.classList.add('hidden');
    modal.classList.add('visible');
    document.body.classList.add('modal-open');
    setTimeout(() => { input.focus(); input.select(); }, 50);
}
function closeLkwRenameModal() {
    const modal = document.getElementById('lkwRenameModal');
    if (modal) modal.classList.remove('visible');
    document.body.classList.remove('modal-open');
    focusShipmentInput();
}
function saveLkwRenameFromModal() {
    const truckId = document.getElementById('lkwRenameTruckId').value;
    const name = document.getElementById('lkwRenameName').value.trim().replace(/\s+/g, ' ');
    const err = document.getElementById('lkwRenameError');
    const fail = msg => { err.textContent = msg; err.classList.remove('hidden'); };
    if (name.length > 40) return fail('Höchstens 40 Zeichen.');
    const shipments = loadShipments();
    const trucks = collectTrucks(shipments, loadLkwStatus());
    const t = trucks.find(x => x.truckId === truckId);
    if (!t) { closeLkwRenameModal(); displayError(`LKW ${escapeHtml(truckId)} nicht mehr gefunden.`); return; }
    const custom = name && name !== t.defaultName ? name : null;   // leer oder Standardname → Anzeigename entfernen
    // Kein doppelter Name – sonst wären zwei LKW in Listen und Auswahlfeldern nicht mehr zu unterscheiden
    if (custom && trucks.some(x => x.truckId !== truckId && x.name === custom)) return fail(`„${custom}“ gibt es schon – bitte einen anderen Namen wählen.`);
    t.bases.forEach(b => { const s = shipments[b]; if (!s) return; if (custom) s.truckName = custom; else delete s.truckName; });
    runBlocking('LKW wird umbenannt …', async () => {
        const saving = saveShipments(shipments);   // nur tatsächlich geänderte Sendungen gehen an den Server; lastModified bleibt (kein „zuletzt bearbeitet“-Sprung)
        closeLkwRenameModal();
        renderTable(); renderLkwMenu();
        await saving;
    }).then(() => displayError(custom ? `LKW heißt jetzt „${custom}“.` : `LKW heißt wieder „${t.defaultName}“.`, 'green', 3000));
}
// LKW löschen = alle seine Aufträge löschen (wie das Papierkorb-Symbol je Sendung, nur für den ganzen LKW) – mit Rückfrage.
// Läuft über saveShipments → Löschvermerke → auf allen Geräten weg. Bereits archivierte Aufträge bleiben im Archiv suchbar.
function deleteTruckFromPage(truckId) {
    const shipments = loadShipments();
    const t = collectTrucks(shipments, loadLkwStatus()).find(x => x.truckId === truckId);
    if (!t || !t.bases.length) { displayError(`LKW ${escapeHtml(truckId)} nicht mehr gefunden.`); renderTable(); return false; }
    const what = `${pluralize(t.bases.length, 'Auftrag', 'Aufträge')} mit ${t.hus} HUs`;
    if (!confirm(`LKW „${t.name}“ löschen?\n\n${what} werden mit allen Scans auf allen Geräten entfernt. Das lässt sich nicht rückgängig machen.`)) return false;
    t.bases.forEach(b => { delete shipments[b]; });
    const status = loadLkwStatus();
    if (truckId in status) { delete status[truckId]; saveLkwStatus(status); }   // sonst gälte ein später neu importierter LKW gleicher Kennung als deaktiviert
    runBlocking(`LKW „${t.name}“ wird gelöscht …`, async () => {
        const saving = saveShipments(shipments);
        renderTable(); renderLkwMenu();
        await saving;
    }).then(() => displayError(`LKW „${t.name}“ gelöscht (${what}).`, 'green', 3000));
    return true;
}
// ⋮-Menü rechts in der Kopfzeile der LKW-Seite: Umbenennen · Deaktivieren/Aktivieren · Löschen. Die Einträge tragen dieselben
// data-Attribute wie die bisherigen Knöpfe (data-lkw-rename / -deactivate / -activate / -delete) → gleiche Handler, gleiche Rückfragen.
const LKW_MENU_ICONS = {
    dots: 'M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z',
    rename: 'M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z',
    off: 'M11.83,9L15,12.16C15,12.11 15,12.05 15,12A3,3 0 0,0 12,9C11.94,9 11.89,9 11.83,9M7.53,9.8L9.08,11.35C9.03,11.56 9,11.77 9,12A3,3 0 0,0 12,15C12.22,15 12.44,14.97 12.65,14.92L14.2,16.47C13.53,16.8 12.79,17 12,17A5,5 0 0,1 7,12C7,11.21 7.2,10.47 7.53,9.8M2,4.27L4.28,6.55L4.73,7C3.08,8.3 1.78,10 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L16.81,19.08L19.73,22L21,20.73L3.27,3M12,7A5,5 0 0,1 17,12C17,12.64 16.87,13.26 16.64,13.82L19.57,16.75C21.07,15.5 22.27,13.86 23,12C21.27,7.61 17,4.5 12,4.5C10.6,4.5 9.26,4.75 8,5.2L10.17,7.35C10.74,7.13 11.35,7 12,7Z',
    on: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z',
    del: 'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z'
};
const lkwMenuIcon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${LKW_MENU_ICONS[k]}"/></svg>`;
function lkwActionMenuHtml(t) {
    const id = escapeHtml(t.truckId);
    const item = (k, attr, label, cls) => `<button type="button" class="page-action-item${cls ? ' ' + cls : ''}" role="menuitem" ${attr}="${id}">${lkwMenuIcon(k)}<span>${label}</span></button>`;
    return `<div class="page-action-wrap">
        <button type="button" class="page-menu-btn" data-lkw-menu="${id}" aria-haspopup="menu" aria-expanded="false" aria-label="Aktionen für ${escapeHtml(t.name)}" title="Aktionen für diesen LKW">${lkwMenuIcon('dots')}</button>
        <div class="page-action-menu hidden" role="menu" aria-label="LKW-Aktionen">
            ${item('rename', 'data-lkw-rename', 'LKW umbenennen')}
            ${t.active ? item('off', 'data-lkw-deactivate', 'LKW deaktivieren') : item('on', 'data-lkw-activate', 'LKW aktivieren')}
            <div class="page-action-sep" role="separator"></div>
            ${item('del', 'data-lkw-delete', 'LKW löschen', 'is-danger')}
        </div>
    </div>`;
}
function lkwActionMenuEls() {
    const wrap = pageHeaderActionsEl && pageHeaderActionsEl.querySelector('.page-action-wrap');
    return wrap ? { wrap, btn: wrap.querySelector('[data-lkw-menu]'), menu: wrap.querySelector('.page-action-menu') } : null;
}
function setLkwActionMenu(open) {
    const els = lkwActionMenuEls();
    if (!els) return;
    els.menu.classList.toggle('hidden', !open);
    els.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function isLkwActionMenuOpen() { const els = lkwActionMenuEls(); return !!(els && !els.menu.classList.contains('hidden')); }
async function setLkwActiveFromPage(truckId, active) {
    const status = loadLkwStatus();
    status[truckId] = active;
    await runBlocking(active ? 'LKW wird aktiviert …' : 'LKW wird deaktiviert …', async () => {
        const saving = saveLkwStatus(status); // schreibt sofort lokal, dann Server (wie der Schalter im Menü)
        renderTable(); renderLkwMenu();
        await saving;
    });
}
function infoPeriodStart(period) {
    const now = new Date();
    if (period === 'today') { now.setHours(0, 0, 0, 0); return now.getTime(); }
    if (period === '7d') return Date.now() - 7 * 86400000;
    if (period === '30d') return Date.now() - 30 * 86400000;
    return 0;
}
// Zeitraum als [start, end] in ms (Ortszeit) oder null (kein Zeitfilter). Bei „Datum wählen“ zählen ganze Tage:
// „von“ ab 00:00, „bis“ einschließlich bis 23:59:59; nur ein Feld = offene Grenze; vertauschte Daten werden sortiert.
function infoDateBounds() {
    if (infoState.period === 'custom') {
        const day = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
        let from = day(infoState.dateFrom), to = day(infoState.dateTo);
        if (!from && !to) return null;
        if (from && to && from > to) { const t = from; from = to; to = t; }
        return { start: from ? from.getTime() : 0, end: to ? to.getTime() + 86400000 - 1 : Infinity, from, to };
    }
    const start = infoPeriodStart(infoState.period);
    return start ? { start, end: Infinity } : null;
}
function dateRangeText(b) {
    if (!b || !b.from && !b.to) return '';
    const f = (d) => d.toLocaleDateString('de-DE');
    if (b.from && b.to) return b.from.getTime() === b.to.getTime() ? `am ${f(b.from)}` : `${f(b.from)} – ${f(b.to)}`;
    return b.from ? `ab ${f(b.from)}` : `bis ${f(b.to)}`;
}
// ---- Gewicht (Info-Suche) ---------------------------------------------------------------------
// Gewicht einer HU steht als Text am Eintrag (grossWeight: „19.5 KG“, „19,500 KG“, „1.250,5 KG“, „N/A“ …).
// Liefert Kilogramm als Zahl oder null (kein/unlesbares Gewicht). Dient auch zum Lesen der Eingabefelder „von/bis“.
// ---- Maße als drei Zahlenfelder (L × B × H) --------------------------------------------------------------------
// Gespeichert wird weiterhin EIN Text im Importformat des Auftrags: MAN-Rechnungen „100x45x10 CM“, VW-Positionen
// „1200x800x600 MM“. Die Einheit kommt aus den vorhandenen Maßen des Auftrags; ohne Vorbild gilt VW → MM, sonst CM.
function dimensionUnitOf(shipment) {
    const items = shipment && Array.isArray(shipment.scannedItems) ? shipment.scannedItems : [];
    for (const it of items) {
        const m = it && typeof it.dimensions === 'string' && it.dimensions.match(/\b(MM|CM|M)\b/i);
        if (m) return m[1].toUpperCase();
    }
    const isVvl = !!(shipment && (shipment.parentOrderNumber || items.some(i => i && i.sendnr)));
    return isVvl ? 'MM' : 'CM';
}
// „100x 45x10 CM“ / „49x33x 16 CM“ / „1200 x 800 x 600 MM“ / „15 15 50“ → { l, b, h, unit } (null, wenn nicht 3 Zahlen)
function splitDimensions(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const str = raw.trim().toUpperCase();
    if (!str || str === 'N/A') return null;
    const unitMatch = str.match(/\b(MM|CM|M)\b/);
    const nums = (str.replace(/\b(MM|CM|M)\b/g, ' ').match(/\d+(?:[.,]\d+)?/g) || []);
    if (nums.length !== 3) return null;
    return { l: nums[0].replace('.', ','), b: nums[1].replace('.', ','), h: nums[2].replace('.', ','), unit: unitMatch ? unitMatch[1] : '' };
}
// Drei Felder → gespeicherter Text („100x45x10 CM“). Alle leer → null; nur teilweise gefüllt oder keine Zahl → Error-Text
function joinDimensions(l, b, h, unit) {
    const vals = [l, b, h].map(v => String(v === null || v === undefined ? '' : v).trim().replace(',', '.'));
    if (vals.every(v => !v)) return { value: null };
    if (vals.some(v => !v)) return { error: 'Maße unvollständig – bitte Länge, Breite und Höhe angeben (oder alle drei leer lassen).' };
    if (vals.some(v => !/^\d+(?:\.\d+)?$/.test(v) || Number(v) <= 0)) return { error: 'Maße nicht lesbar – bitte nur Zahlen eintragen, z. B. 100 · 45 · 10.' };
    const fmt = v => { const n = Number(v); return Number.isInteger(n) ? String(n) : String(n).replace('.', ','); };
    return { value: `${fmt(vals[0])}x${fmt(vals[1])}x${fmt(vals[2])} ${unit || 'CM'}` };
}
// Drei nebeneinanderliegende Felder für ein Formular (Klassen *-l/*-b/*-h, gemeinsame Einheit als Text dahinter)
function dimensionFieldsHtml(cls, unit, opts) {
    const o = opts || {};
    const inp = (part, label) => `<input type="text" class="${cls} ${cls}-${part} dim-field" inputmode="decimal" autocomplete="off" placeholder="${label}" aria-label="${label} in ${unit}"${o.ids ? ` id="${o.ids[part]}"` : ''}>`;
    return `<span class="dim-fields"${o.attrs || ''}>${inp('l', 'L')}<span class="dim-x">×</span>${inp('b', 'B')}<span class="dim-x">×</span>${inp('h', 'H')}<span class="dim-unit">${unit}</span></span>`;
}
// Felder aus gespeichertem Text befüllen (Text ohne 3 Zahlen → Felder leer, Original steht als Titel dran)
function fillDimensionFields(root, cls, raw) {
    const parts = splitDimensions(raw);
    ['l', 'b', 'h'].forEach(p => { const el = root.querySelector(`.${cls}-${p}`); if (el) { el.value = parts ? parts[p] : ''; el.title = parts || !raw ? '' : `Bisher: ${raw}`; } });
}
function readDimensionFields(root, cls, unit) {
    const v = p => { const el = root.querySelector(`.${cls}-${p}`); return el ? el.value : ''; };
    return joinDimensions(v('l'), v('b'), v('h'), unit);
}
function setDimensionUnit(root, unit) {
    root.querySelectorAll('.dim-unit').forEach(el => { el.textContent = unit; });
    root.querySelectorAll('.dim-field').forEach(el => { el.setAttribute('aria-label', `${el.placeholder} in ${unit}`); });
}
function parseWeightKg(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
    const str = String(raw).trim().toUpperCase();
    if (!str || str === 'N/A') return null;
    const m = str.match(/\d[\d.,]*/);
    if (!m) return null;
    let num = m[0];
    const lastDot = num.lastIndexOf('.'), lastComma = num.lastIndexOf(',');
    if (lastDot !== -1 && lastComma !== -1) {
        // beide Zeichen vorhanden: das hintere ist das Dezimalzeichen, das andere ein Tausenderpunkt/-komma
        num = lastDot > lastComma ? num.replace(/,/g, '') : num.replace(/\./g, '').replace(',', '.');
    } else if (lastComma !== -1) {
        num = num.slice(0, lastComma).replace(/,/g, '') + '.' + num.slice(lastComma + 1);
    } else if (num.indexOf('.') !== lastDot) {
        num = num.slice(0, lastDot).replace(/\./g, '') + '.' + num.slice(lastDot + 1);
    }
    const n = parseFloat(num);
    if (!Number.isFinite(n)) return null;
    const unit = str.slice(m.index + m[0].length).trim();
    if (/^G(\b|R)/.test(unit)) return n / 1000;    // Gramm
    if (/^T(\b|O)/.test(unit)) return n * 1000;    // Tonnen
    return n;                                      // Kilogramm (Standard, auch ohne Einheit)
}
function formatKg(n) { return `${Number(n).toLocaleString('de-DE', { maximumFractionDigits: 3 })} kg`; }
// Eingaben „von/bis“ als Bereich in kg; null = kein Gewichtsfilter. Vertauschte Grenzen werden sortiert.
function infoWeightRange() {
    const a = parseWeightKg(infoState.weightMin), b = parseWeightKg(infoState.weightMax);
    if (a === null && b === null) return null;
    if (a !== null && b !== null) return { min: Math.min(a, b), max: Math.max(a, b) };
    return { min: a, max: b };
}
function weightRangeText(range) {
    if (!range) return '';
    if (range.min !== null && range.max !== null) return range.min === range.max ? formatKg(range.min) : `${formatKg(range.min).replace(' kg', '')}–${formatKg(range.max)}`;
    return range.min !== null ? `ab ${formatKg(range.min)}` : `bis ${formatKg(range.max)}`;
}
// HUs einer Sendung, deren Gewicht im Bereich liegt – je HU-Nummer ein Eintrag (weitere Scans derselben HU tragen kein Gewicht)
function shipmentWeightHits(s, range) {
    const items = Array.isArray(s && s.scannedItems) ? s.scannedItems : [];
    const hits = [], seen = new Set();
    items.forEach(it => {
        if (!it || !it.rawInput) return;
        const kg = parseWeightKg(it.grossWeight);
        if (kg === null) return;
        if (it.isCancelled && !s.isHuListOrder) return; // Stück einer normalen Sendung: Storno zählt nicht
        const key = s.isHuListOrder ? String(it.rawInput).toUpperCase() : String(it.id || it.timestamp);
        if (seen.has(key)) return;
        seen.add(key);
        if ((range.min !== null && kg < range.min - 1e-9) || (range.max !== null && kg > range.max + 1e-9)) return;
        hits.push({ hu: String(it.rawInput), kg, raw: String(it.grossWeight), id: it.id || '' });
    });
    return hits;
}
function infoMatches(base, s, text, range) {
    if (text && !shipmentMatchesListFilter(base, s, text)) return false;
    if (range && shipmentWeightHits(s, range).length === 0) return false;
    if (infoState.truck !== 'all') {
        if (infoState.truck === 'none' ? !!s.truckId : s.truckId !== infoState.truck) return false;
    }
    const bounds = infoDateBounds();
    if (bounds) { const t = Date.parse(s.lastModified) || 0; if (t < bounds.start || t > bounds.end) return false; }
    if (infoState.status !== 'all') {
        const p = shipmentProgress(s);
        if (infoState.status === 'open' && !p.open) return false;
        if (infoState.status === 'done' && !(!p.unknown && !p.open)) return false;
        if (infoState.status === 'dunkel' && p.dunkel === 0) return false;
        if (infoState.status === 'unknown' && !p.unknown) return false;
    }
    return true;
}
function scheduleInfoArchiveSearch() {
    if (infoArchiveTimer) { clearTimeout(infoArchiveTimer); infoArchiveTimer = null; }
    const q = infoState.text;
    if (!infoState.archive || !archiveAvailable() || q.length < 3) {
        infoState.archiveQuery = ''; infoState.archiveOrder = []; infoState.archiveNote = ''; infoArchiveCache = {};
        infoState.archiveBusy = false; infoArchiveSeq++;
        return;
    }
    if (infoState.archiveQuery === q) return;
    infoState.archiveBusy = true;
    const seq = ++infoArchiveSeq;
    infoArchiveTimer = setTimeout(async () => {
        try {
            const r = await postToServer('searchArchive', { query: q, mode: 'prefix' });
            if (seq !== infoArchiveSeq) return;
            infoArchiveCache = r.results || {};
            infoState.archiveOrder = (Array.isArray(r.order) ? r.order : Object.keys(infoArchiveCache)).filter(b => infoArchiveCache[b]);
            infoState.archiveTotal = r.total || infoState.archiveOrder.length;
            infoState.archiveTruncated = !!r.truncated;
            infoState.archiveQuery = q; infoState.archiveNote = '';
            let k = false; infoState.archiveOrder.forEach(b => { if (!archiveKnownBases.has(b)) { archiveKnownBases.add(b); k = true; } }); if (k) saveArchiveKnownBases();
        } catch (e) {
            if (seq !== infoArchiveSeq) return;
            infoState.archiveOrder = []; infoArchiveCache = {}; infoState.archiveQuery = q;
            if (isUnknownActionError(e)) { archiveUnsupported = true; infoState.archiveNote = 'Archivsuche benötigt das neue Server-Skript (backend/Code.gs neu bereitstellen).'; }
            else infoState.archiveNote = `Archiv nicht erreichbar: ${e.message}`;
        } finally {
            if (seq === infoArchiveSeq) { infoState.archiveBusy = false; if (currentPage && currentPage.id === 'info') PAGE_RENDERERS.info.update(); }
        }
    }, 400);
}
function infoOptionsHtml(options, selected) {
    return options.map(o => `<option value="${escapeHtml(o[0])}"${o[0] === selected ? ' selected' : ''}>${escapeHtml(o[1])}</option>`).join('');
}

