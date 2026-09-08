// Desktop-Tabelle (≥ 992 px): Zusatzspalten, Sortierung, Klicks; Handy-Darstellung unverändert
const { launch, makeBackend, openApp, sampleData, scan, setBatchMode, assert, finish } = require('./helpers');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
function bigData() {
  const data = sampleData(); const now = Date.now();
  const item = (hu, w, st, notes) => ({ rawInput: hu, status: st || 'Anstehend', timestamp: new Date(now).toISOString(), isCombination: false, notes: notes || [], isCancelled: false, cancelledTimestamp: null, grossWeight: w });
  for (let i = 3; i <= 14; i++) {
    const st = i % 3 === 0 ? 'XRY' : (i % 4 === 0 ? 'Dunkelalarm' : 'Anstehend');
    data['90070000' + String(i).padStart(2, '0')] = { hawb: '90070000' + String(i).padStart(2, '0'), lastModified: new Date(now - i * 3600e3).toISOString(), totalPiecesExpected: 2, scannedItems: [item('HU' + i + '001', (i * 7.5) + ' KG', st, i % 5 === 0 ? ['Karton beschädigt'] : []), item('HU' + i + '002', '30 KG', i % 3 === 0 ? 'XRY' : 'Anstehend')], mitarbeiter: 'T', isHuListOrder: true, truckId: i < 9 ? 'MAN 1' : 'VVL-4711', originalManNumber: 1 };
  }
  return data;
}
(async () => {
  const browser = await launch();
  try {
    // ---- Desktop ----
    const backend = makeBackend(bigData(), {});
    let page = await openApp(browser, backend, { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } });
    const rows = await page.$$eval('#shipmentTableBody tr[data-basenumber]', r => r.length);
    assert(rows === 15, `Desktop-Startseite zeigt 15 Zeilen (${rows})`);
    const head = await page.$eval('#shipmentTableBody', tb => [...tb.closest('table').querySelectorAll('thead th')].filter(t => getComputedStyle(t).display !== 'none').map(t => [...t.childNodes].filter(n => n.nodeType === 3 || getComputedStyle(n).display !== 'none').map(n => n.textContent).join('').trim()));
    assert(head.join('|') === 'HAWB.|Status|LKW|WE|Sich.|Gewicht|✎|Übersicht|Letzte Änd.|Aktionen|QR-Code', `Spaltenköpfe: ${head.join(' | ')}`);
    const h = await page.$eval('#shipmentTableBody tr[data-basenumber]', r => r.getBoundingClientRect().height);
    assert(h >= 30 && h <= 44, `Zeilenhöhe dicht: ${Math.round(h)} px`);
    const r4 = await page.$eval('tr[data-basenumber="9007000004"]', r => ({ status: r.querySelector('.dt-status').textContent.trim(), light: r.querySelector('.dt-light').className, truck: r.querySelector('.dt-truck').textContent.trim(), sich: r.querySelector('.dt-num.over') ? r.querySelector('.dt-num.over').textContent.trim() : null, kg: r.querySelector('.dt-kg').textContent.trim() }));
    assert(r4.status === 'Dunkelalarm' && /danger/.test(r4.light) && r4.truck === 'MAN 1' && r4.sich === '1/2' && r4.kg === '60 kg', `Zeile 9007000004: ${JSON.stringify(r4)}`);
    const r5notes = await page.$eval('tr[data-basenumber="9007000005"] .dt-note-badge', b => b.textContent.trim()).catch(() => null);
    assert(r5notes === '1', `Notiz-Zähler bei 9007000005: ${r5notes}`);
    const r123 = await page.$eval('tr[data-basenumber="123"]', r => ({ status: r.querySelector('.dt-status').textContent.trim(), kg: r.querySelector('.dt-kg').textContent.trim(), truck: r.querySelector('.dt-truck').textContent.trim() }));
    assert(r123.status === 'Fertig' && r123.kg === '–' && r123.truck === '–', `Einzelsendung ohne LKW/Gewicht: ${JSON.stringify(r123)}`);
    // Sortierung
    await page.evaluate(() => document.querySelector('.shipment-table th[data-sort="kg"]').click()); await wait(200);
    let order = await page.$$eval('#shipmentTableBody tr', rs => rs.slice(0, 3).map(r => r.dataset.basenumber));
    assert(order.join() === '9007000014,9007000013,9007000012', `Klick „Gewicht“ → schwerste zuerst (${order.join(', ')})`);
    await page.evaluate(() => document.querySelector('.shipment-table th[data-sort="kg"]').click()); await wait(200);
    order = await page.$$eval('#shipmentTableBody tr', rs => rs.slice(0, 2).map(r => r.dataset.basenumber));
    assert(order[0] === '123' || order[0] === 'K123456', `Zweiter Klick → aufsteigend, ohne Gewicht zuerst (${order.join(', ')})`);
    await page.evaluate(() => document.querySelector('.shipment-table th[data-sort="status"]').click()); await wait(200);
    order = await page.$$eval('#shipmentTableBody tr', rs => rs.slice(0, 2).map(r => r.querySelector('.dt-status').textContent.trim()));
    assert(order.every(s => s === 'Dunkelalarm'), `Klick „Status“ → Dunkelalarm oben (${order.join(', ')})`);
    assert(await page.$eval('.shipment-table th[data-sort="status"]', th => th.getAttribute('aria-sort')) === 'ascending', 'Sortierter Kopf trägt aria-sort');
    // Klick auf HAWB öffnet Details, Klick auf andere Zellen nicht
    await page.evaluate(() => document.querySelector('tr[data-basenumber="9007000003"] .dt-kg').click()); await wait(300);
    assert(await page.$eval('#detailView', v => getComputedStyle(v).display === 'none'), 'Klick auf Gewichtszelle öffnet KEINE Detailansicht');
    await page.evaluate(() => document.querySelector('tr[data-basenumber="9007000003"] .hawb-cell').click()); await wait(400);
    assert(await page.$eval('#detailView', v => getComputedStyle(v).display !== 'none'), 'Klick auf HAWB öffnet Detailansicht');
    await page.goBack(); await wait(400);
    // Aktionen funktionieren weiterhin (Edit-Modal)
    await page.evaluate(() => document.querySelector('tr[data-basenumber="9007000003"] .edit-btn').click()); await wait(300);
    const editOpen = await page.evaluate(() => { const m = document.getElementById('editModal') || document.querySelector('.modal-overlay.visible'); return !!m && getComputedStyle(m).display !== 'none'; });
    assert(editOpen, 'Edit-Button in der Zeile öffnet weiterhin das Bearbeiten-Modal');
    await page.reload({ waitUntil: 'networkidle0' }); await wait(600);
    // Scan aktualisiert die Desktop-Zellen
    await scan(page, 'HU1001', 500);
    const after = await page.$eval('tr[data-basenumber="9007000001"]', r => ({ sich: r.querySelector('.dt-num.mismatch, .dt-num.ok') ? r.querySelectorAll('.dt-num')[1].textContent.trim() : null, status: r.querySelector('.dt-status').textContent.trim() }));
    assert(after.sich === '1/3' && after.status === 'Offen', `Nach Scan HU1001: Sich. ${after.sich}, Status ${after.status}`);
    // QR-Vorschau: Code wird gezeichnet, ist standardmäßig unsichtbar, bei Hover sichtbar
    const qrCell = await page.$('tr[data-basenumber="9007000001"] td.qr-code-cell');
    const before = await qrCell.$eval('div', d => getComputedStyle(d).opacity);
    await qrCell.hover(); await wait(400);
    const hover = await qrCell.$eval('div', d => ({ op: getComputedStyle(d).opacity, drawn: d.childElementCount > 0 }));
    assert(before === '0' && hover.op === '1' && hover.drawn, `QR-Code: unsichtbar → bei Hover sichtbar und gezeichnet (${before} → ${hover.op}, gezeichnet: ${hover.drawn})`);
    // Unterseite LKW: gleiche Tabelle
    await page.evaluate(() => document.querySelector('.home-tile[data-page="anlieferung"]').click()); await wait(400);
    await page.evaluate(() => document.querySelector('.page-row[data-truckid="MAN 1"]').click()); await wait(500);
    const pageCols = await page.$eval('#pageView .shipment-table tbody tr', tr => [...tr.cells].filter(t => getComputedStyle(t).display !== 'none').length);
    assert(pageCols === 11, `LKW-Seite: Tabelle mit allen Desktop-Spalten (${pageCols} Zellen sichtbar)`);
    // Info & Suche: Seitenleiste links, sofort alle Sendungen, Filter live, Zurücksetzen
    await page.goBack(); await wait(300); await page.goBack(); await wait(300);
    await page.evaluate(() => document.querySelector('.home-tile[data-page="info"]').click()); await wait(500);
    const layout = await page.evaluate(() => { const f = document.getElementById('infoForm'), m = document.querySelector('.info-main'); const a = f.getBoundingClientRect(), b = m.getBoundingClientRect(); return { side: a.right <= b.left, formW: Math.round(a.width), head: getComputedStyle(document.querySelector('.info-form-head')).display }; });
    assert(layout.side && layout.formW > 200 && layout.formW < 300 && layout.head !== 'none', `Info: Filter als Seitenleiste links (${layout.formW} px), Ergebnisse rechts`);
    assert((await page.$$eval('#infoResults tr[data-basenumber]', r => r.length)) === 15, 'Info am Desktop: ohne Filter sofort alle Sendungen (15)');
    assert(await page.$eval('#infoResetBtn', b => b.classList.contains('hidden')), 'Info: „Zurücksetzen“ ohne aktive Filter ausgeblendet');
    await page.evaluate(() => { const s = document.getElementById('infoStatusSelect'); s.value = 'dunkel'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await wait(400);
    const dunkel = await page.$$eval('#infoResults tr[data-basenumber]', r => r.map(x => x.dataset.basenumber));
    assert(dunkel.join() === '9007000004,9007000008', `Info-Filter „Mit Dunkelalarm“ live: ${dunkel.join(', ')}`);
    assert(!(await page.$eval('#infoResetBtn', b => b.classList.contains('hidden'))), 'Info: „Zurücksetzen“ erscheint bei aktivem Filter');
    await page.evaluate(() => document.getElementById('infoResetBtn').click()); await wait(400);
    assert((await page.$$eval('#infoResults tr[data-basenumber]', r => r.length)) === 15 && (await page.$eval('#infoStatusSelect', s => s.value)) === 'all', 'Info: „Zurücksetzen“ leert Filter und zeigt wieder alle');
    // ---- Detailansicht am Desktop: Kopfzeile (Pfad, Kennzahlen, Aktionen, QR) und Packstücktabelle ----
    await page.evaluate(() => document.querySelector('#infoResults tr[data-basenumber="9007000005"] .hawb-cell').click()); await wait(500);
    const det = await page.evaluate(() => ({
      open: getComputedStyle(document.getElementById('detailView')).display !== 'none',
      head: !!document.querySelector('.detail-head'),
      crumbs: [...document.querySelectorAll('.detail-crumb')].map(a => a.dataset.crumbPage).join(','),
      facts: [...document.querySelectorAll('.detail-fact-label')].map(l => l.textContent).join(','),
      actions: [...document.querySelectorAll('.detail-actions button')].map(b => b.className).join(','),
      qr: document.querySelectorAll('.detail-qr img, .detail-qr canvas').length > 0,
      packRows: document.querySelectorAll('.pack-table tbody tr').length,
      pendingBox: !!document.getElementById('pendingHuList'),
      firstRow: [...document.querySelectorAll('.pack-table tbody tr')[0].cells].map(c => c.textContent.trim()).slice(1, 6).join('|')   /* Zelle 0 = Auswahl-Kästchen */
    }));
    assert(det.open && det.head, 'Desktop-Details: Kopfzeile vorhanden');
    assert(det.crumbs === 'home,anlieferung,lkw', `Desktop-Details: Pfad Startseite › Anlieferung › LKW (${det.crumbs})`);
    assert(/^Status,LKW,Kolli,Gewicht,Notizen,Letzte Änd\./.test(det.facts), `Desktop-Details: Kennzahlen (${det.facts})`);
    assert(det.actions === 'edit-btn,pdf-btn,delete-btn main-delete-btn', `Desktop-Details: Aktionen Bearbeiten · PDF · Löschen (${det.actions})`);
    assert(det.qr, 'Desktop-Details: QR-Code gezeichnet');
    assert(det.packRows === 2 && !det.pendingBox, `Desktop-Details: Packstücktabelle mit 2 Zeilen statt gelbem Kasten (${det.packRows}, Kasten: ${det.pendingBox})`);
    assert(det.firstRow === 'HU5001|–|–|37.5 KG|–', `Desktop-Details: erste Packstückzeile (${det.firstRow})`);
    // Aktion im Kopf: Bearbeiten öffnet dasselbe Modal wie das Listen-Icon
    await page.evaluate(() => document.querySelector('.detail-actions .edit-btn').click()); await wait(300);
    assert(await page.evaluate(() => document.getElementById('editModal').classList.contains('visible')), 'Desktop-Details: „Bearbeiten“ im Kopf öffnet das Bearbeiten-Modal');
    await page.evaluate(() => document.getElementById('cancelEditButton') ? document.getElementById('cancelEditButton').click() : document.getElementById('editModal').classList.remove('visible')); await wait(200);
    // ---- Packstück bearbeiten (Stift in der Tabelle): Prüfungen, Umbenennen zieht alle Einträge mit, Sync ----
    await page.evaluate(() => document.querySelector('.pack-edit-btn[data-hu="HU5001"]').click()); await wait(300);
    assert(await page.evaluate(() => document.getElementById('huEditModal').classList.contains('visible') && document.getElementById('huEditNumber').value === 'HU5001' && document.activeElement.id === 'huEditNumber'), 'Packstück-Fenster öffnet mit HU-Nummer im Fokus');
    await page.evaluate(() => { document.getElementById('huEditNumber').value = 'HU5002'; document.getElementById('saveHuEditButton').click(); }); await wait(300);
    assert(/gibt es bereits/.test(await page.$eval('#huEditError', e => e.textContent)), 'Packstück: doppelte HU-Nummer wird abgelehnt');
    await page.evaluate(() => { document.getElementById('huEditNumber').value = 'HU5001'; document.getElementById('huEditWeight').value = 'schwer'; document.getElementById('saveHuEditButton').click(); }); await wait(300);
    assert(/Gewicht nicht lesbar/.test(await page.$eval('#huEditError', e => e.textContent)), 'Packstück: unlesbares Gewicht wird abgelehnt');
    await page.evaluate(() => { document.getElementById('huEditNumber').value = 'HU5001X'; document.getElementById('huEditWeight').value = '40'; document.getElementById('huEditPackaging').value = 'Gitterbox'; document.getElementById('saveHuEditButton').click(); }); await wait(1200);
    const edited = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9007000005'];
      return { modal: document.getElementById('huEditModal').classList.contains('visible'), items: s.scannedItems.map(i => i.rawInput + ':' + i.status + ':' + i.grossWeight + ':' + i.packaging).join(' '), row: [...document.querySelectorAll('.pack-table tbody tr')[0].cells].map(c => c.textContent.trim()).slice(1, 5).join('|'), kg: [...document.querySelectorAll('.detail-fact')].find(f => /Gewicht/.test(f.textContent)).textContent.replace(/\s+/g, ' ') };
    });
    assert(!edited.modal && edited.items === 'HU5001X:Anstehend:40 KG:Gitterbox HU5002:Anstehend:30 KG:undefined', `Packstück gespeichert – alle Einträge der HU umbenannt (${edited.items})`);
    assert(edited.row === 'HU5001X|Gitterbox|–|40 KG' && /70 kg/.test(edited.kg), `Tabelle und Kopf-Gewicht aktualisiert (${edited.row}; ${edited.kg})`);
    assert(backend.store['9007000005'] && backend.store['9007000005'].scannedItems.map(i => i.rawInput).join() === 'HU5001X,HU5002', 'Änderung ist beim Server angekommen (andere Geräte bekommen sie per Sync)');
    // Pfad: LKW-Krümel schließt die Details und öffnet die LKW-Seite
    await page.evaluate(() => document.querySelector('.detail-crumb[data-crumb-page="lkw"]').click()); await wait(500);
    const afterCrumb = await page.evaluate(() => ({ detail: getComputedStyle(document.getElementById('detailView')).display === 'none', title: document.getElementById('pageTitle').textContent.trim(), url: location.search }));
    assert(afterCrumb.detail && /MAN 1/.test(afterCrumb.title) && /seite=anlieferung/.test(afterCrumb.url) && /lkw=MAN/.test(afterCrumb.url), `Pfad „MAN 1“ → LKW-Seite (${JSON.stringify(afterCrumb)})`);
    assert(page.__errors.length === 0, `Desktop: keine JS-Fehler (${page.__errors.join('; ')})`);
    await page.close();

    // ---- ?sendung=… als frisch geladene Adresse (Daten kommen erst vom Server) ----
    page = await openApp(browser, makeBackend(bigData(), {}), { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 }, query: '?sendung=9007000006' });
    await wait(600);
    assert(await page.$eval('#detailView', v => getComputedStyle(v).display !== 'none'), 'Adresse ?sendung=… öffnet die Details auch beim ersten Laden');
    await page.close();

    // ---- Dunkelalarm gilt als erledigt, sobald dieselbe HU danach gesichert wurde (Ampel/Zähler/Kachel) ----
    {
      const d = bigData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
      const it = (hu, st, ago, extra) => Object.assign({ rawInput: hu, status: st, timestamp: iso(ago), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null }, extra || {});
      d['9008296222'] = { hawb: '9008296222', lastModified: iso(1), totalPiecesExpected: 2, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'AIT', destinationCountry: 'CHINA', plsoNumber: '1',
        scannedItems: [it('DA0001', 'Dunkelalarm', 30, { position: 1 }), it('DA0001', 'Wareneingang', 30, { position: 1 }), it('DA0001', 'EDD', 10, { position: 1 }), it('DA0002', 'Anstehend', 0, { position: 2 })] };
      d['9008296223'] = { hawb: '9008296223', lastModified: iso(1), totalPiecesExpected: 1, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'AIT', destinationCountry: 'CHINA', plsoNumber: '1',
        scannedItems: [it('DB0001', 'Dunkelalarm', 5, { position: 1 }), it('DB0001', 'Anstehend', 0, { position: 1 })] };
      d['123'].totalPiecesExpected = 2;
      d['123'].scannedItems = [it('123', 'Wareneingang', 50), it('123', 'Dunkelalarm', 40, { notes: ['Alarm Tor 3'] }), it('123', 'XRY', 30), it('123', 'EDD', 20)];
      page = await openApp(browser, makeBackend(d, {}), { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } }); await wait(500);
      const st = await page.evaluate(() => { const g = b => { const r = document.querySelector(`tr[data-basenumber="${b}"]`); return r.querySelector('.dt-status').textContent.trim() + '/' + r.querySelectorAll('.dt-num')[1].textContent.trim() + '/' + (r.querySelectorAll('.dt-num')[1].classList.contains('over') ? 'rot' : 'ok'); }; return { erledigt: g('9008296222'), offen: g('9008296223'), normal: g('123'), tile: document.getElementById('tileDunkelalarmCount').textContent }; });
      assert(st.erledigt === 'Offen/1/2/ok', `Dunkelalarm + danach EDD → Sendung „Offen“, Sich. nicht rot (${st.erledigt})`);
      assert(st.offen === 'Dunkelalarm/1/1/rot', `Dunkelalarm ohne Sicherung bleibt rot (${st.offen})`);
      assert(st.normal === 'Fertig/2/2/ok', `Normale Sendung: Dunkelalarm + volle Sicherung → „Fertig“ (${st.normal})`);
      assert(st.tile === '3', `Kachel zählt nur offene Dunkelalarme: 2 aus bigData + 1 neu, der erledigte nicht (${st.tile})`);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008296222"] .hawb-cell').click()); await wait(400);
      const pack = await page.$$eval('.pack-table tbody tr', rs => rs.map(r => r.className + ':' + r.cells[7].textContent.trim()).join(' '));
      assert(pack === 'pack-row-done:EDDnach Dunkelalarm pack-row-open:Offen', `Packstücktabelle: „EDD · nach Dunkelalarm“ statt rot (${pack})`);
      assert((await page.$eval('#detailViewContent', e => e.getBoundingClientRect().width)) > 1400, 'Detailansicht nutzt am Desktop die volle Breite');
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="123"] .hawb-cell').click()); await wait(400);
      const plain = await page.$$eval('.pack-table-plain tbody tr', rs => rs.map(r => [...r.cells].map(c => c.textContent.trim()).join('/')).join(' | '));
      assert(/^1\.\/–\/–\/–\/WE\/XRY\/(?:\d{1,2}\.\d{1,2}\.\d{4} )?\d\d:\d\d\/\/ \| 2\.\/–\/–\/–\/–\/EDD\/(?:\d{1,2}\.\d{1,2}\.\d{4} )?\d\d:\d\d\/\/ \| \/–\/–\/–\/\/Dunkelalarm \(erledigt\)\/(?:\d{1,2}\.\d{1,2}\.\d{4} )?\d\d:\d\d\/Alarm Tor 3\/$/.test(plain), `Normale Sendung: Stücktabelle mit Verpackung/Maße/Gewicht/WE/Sicherung/Zeit/Notiz (${plain})`);
      assert(page.__errors.length === 0, `Dunkelalarm-Szenario: keine JS-Fehler (${page.__errors.join('; ')})`);
      await page.close();
      // Handy: dieselbe Regel in der Karte (Sich.-Chip nicht rot) – Karte selbst unverändert
      page = await openApp(browser, makeBackend(d, {})); await wait(400);
      const mobChip = await page.$eval('tr[data-basenumber="9008296222"] .summary-cell strong:last-of-type', e => e.className + ':' + e.textContent.trim());
      assert(mobChip === 'mismatch:Sich.: 1/2', `Handy-Karte: Sich.-Chip nach erledigtem Dunkelalarm nicht rot (${mobChip})`);
      await page.close();
    }

    // ---- Stück bearbeiten (normale Sendung ohne HU-Liste): Verpackung/Maße/Gewicht am Scan-Eintrag ----
    {
      const d = bigData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
      const it = (st, ago, extra) => Object.assign({ rawInput: '123', status: st, timestamp: iso(ago), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null }, extra || {});
      d['123'].totalPiecesExpected = 3;
      d['123'].scannedItems = [it('Wareneingang', 50), it('Wareneingang', 49), it('XRY', 30), it('EDD', 20)];
      const be = makeBackend(d, {});
      page = await openApp(browser, be, { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } }); await wait(500);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="123"] .hawb-cell').click()); await wait(400);
      const head = await page.$$eval('.pack-table-plain thead th', th => th.map(x => x.textContent.trim()).join('|'));
      assert(head === 'Nr.|Verpackung|Maße|Gewicht|WE|Sicherung|Zeit|Notiz|', `Stücktabelle hat Verpackung/Maße/Gewicht (${head})`);
      const pens = await page.$$eval('.pack-table-plain .pack-edit-btn', b => b.map(x => x.dataset.piece).join());
      assert(pens === '1,2', `Stift nur an Stücken mit Scan-Eintrag, nicht am offenen Platz (${pens})`);
      await page.evaluate(() => document.querySelector('.pack-edit-btn[data-piece="1"]').click()); await wait(300);
      const m = await page.evaluate(() => ({ vis: document.getElementById('huEditModal').classList.contains('visible'), title: document.querySelector('#huEditModal h3').textContent, hu: getComputedStyle(document.querySelector('.hu-edit-number-group')).display, focus: document.activeElement.id, ctx: document.getElementById('huEditContext').textContent }));
      assert(m.vis && m.title === 'Stück bearbeiten' && m.hu === 'none' && m.focus === 'huEditPackaging' && /Stück 1 von 3 · XRY/.test(m.ctx), `Modal „Stück bearbeiten“ ohne HU-Feld, Fokus auf Verpackung (${JSON.stringify(m)})`);
      await page.evaluate(() => { document.getElementById('huEditWeight').value = 'viel'; document.getElementById('saveHuEditButton').click(); }); await wait(200);
      assert(/Gewicht nicht lesbar/.test(await page.$eval('#huEditError', e => e.textContent)), 'Stück: unlesbares Gewicht wird abgelehnt');
      await page.evaluate(() => { document.getElementById('huEditPackaging').value = 'Karton'; document.getElementById('huEditDimensions').value = '60 x 40 x 30 CM'; document.getElementById('huEditWeight').value = '12,5'; document.getElementById('saveHuEditButton').click(); }); await wait(600);
      const after = await page.evaluate(() => ({ modal: document.getElementById('huEditModal').classList.contains('visible'), row: [...document.querySelector('.pack-table-plain tbody tr').cells].slice(0, 4).map(c => c.textContent.trim()).join('|'), kg: [...document.querySelectorAll('.detail-fact')].map(f => f.textContent.replace(/\s+/g, ' ')).find(x => /Gewicht/.test(x)), items: JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['123'].scannedItems.map(i => i.status + ':' + (i.grossWeight || '')).join(' ') }));
      assert(!after.modal && after.row === '1.|Karton|60 x 40 x 30 CM|12,5 KG' && /12,5 kg/.test(after.kg), `Stück gespeichert: Zeile + Kopf-Gewicht (${after.row}; ${after.kg})`);
      assert(after.items === 'Wareneingang: Wareneingang: XRY:12,5 KG EDD:', `Gewicht hängt nur am Sicherungsscan des Stücks – Zählung unverändert (${after.items})`);
      assert(be.store['123'] && be.store['123'].scannedItems.some(i => i.grossWeight === '12,5 KG' && i.packaging === 'Karton'), 'Stück-Angaben sind beim Server angekommen');
      // Titel/HU-Feld nach Schließen wieder für MAN-Packstücke bereit
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9007000005"] .hawb-cell').click()); await wait(400);
      await page.evaluate(() => document.querySelector('.pack-edit-btn[data-hu="HU5001"]').click()); await wait(300);
      const man = await page.evaluate(() => ({ title: document.querySelector('#huEditModal h3').textContent, hu: getComputedStyle(document.querySelector('.hu-edit-number-group')).display, val: document.getElementById('huEditNumber').value }));
      assert(man.title === 'Packstück bearbeiten' && man.hu !== 'none' && man.val === 'HU5001', `MAN-Packstück: Modal wieder mit HU-Nummer (${JSON.stringify(man)})`);
      await page.evaluate(() => document.getElementById('cancelHuEditButton').click()); await wait(200);
      assert(page.__errors.length === 0, `Stück bearbeiten: keine JS-Fehler (${page.__errors.join('; ')})`);
      await page.close();
    }

    // ---- „+ Packstück“: mehrere HUs auf einmal (Zeilentabelle, Enter/Scan → nächste Zeile, Pos. fortlaufend, Kolli +n) ----
    {
      const d = bigData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
      const mk = (hu, pos, st, ago) => ({ rawInput: hu, position: pos, status: st, timestamp: iso(ago), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'Carton', dimensions: '10x10x10 CM', grossWeight: '3 KG' });
      d['9008296222'] = { hawb: '9008296222', lastModified: iso(1), totalPiecesExpected: 9, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'AIT', destinationCountry: 'CHINA', plsoNumber: '1',
        scannedItems: Array.from({ length: 9 }, (_, i) => mk('ADD00' + (10 + i), i + 1, i < 4 ? 'XRY' : 'Anstehend', 60 - i)) };
      const be = makeBackend(d, {});
      page = await openApp(browser, be, { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } }); await wait(500);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008296222"] .hawb-cell').click()); await wait(400);
      assert(await page.$eval('.detail-pack-head .pack-add-btn', b => b.textContent.trim()) === '+ Packstück', '„+ Packstück“ in der Kopfzeile der Packstücktabelle');
      await page.evaluate(() => document.querySelector('.pack-add-btn').click()); await wait(300);
      const m = await page.evaluate(() => ({ vis: document.getElementById('huAddModal').classList.contains('visible'), ctx: document.getElementById('huAddContext').textContent, rows: document.querySelectorAll('#huAddRows tr').length, pos: [...document.querySelectorAll('.hu-add-pos-no')].map(e => e.textContent).join(), focus: document.activeElement.className, width: Math.round(document.querySelector('#huAddModal .modal-content').getBoundingClientRect().width) }));
      assert(m.vis && m.ctx === 'Rechnung 9008296222 · ab Position 10 · bisher 9 Packstücke' && m.rows === 3 && m.pos === '10.,11.,12.' && m.focus === 'hu-add-hu' && m.width === 1600, `Eigene Vollbild-Seite (1600 px breit) mit 3 Leerzeilen ab Pos. 10, Fokus in der ersten HU-Zelle (${JSON.stringify(m)})`);
      const pg = await page.evaluate(() => {
        const m = document.getElementById('huAddModal'); const cs = getComputedStyle(m);
        const ex = document.getElementById('huAddExisting');
        return { align: cs.alignItems, pad: cs.padding, blur: cs.backdropFilter, header: !!m.querySelector('.hu-add-header #huAddBackBtn'), h2: m.querySelector('.hu-add-header h2').textContent,
          exRows: ex.querySelectorAll('tbody tr').length, exHead: ex.querySelector('h4').textContent, exPencil: !!ex.querySelector('.pack-edit-btn'), exAdd: !!ex.querySelector('.pack-add-btn'),
          actionsBottom: Math.round(document.querySelector('.hu-add-actions').getBoundingClientRect().bottom), count: document.getElementById('huAddCount').textContent };
      });
      assert(pg.align === 'stretch' && pg.pad === '0px' && pg.blur === 'none' && pg.header && pg.h2 === 'Packstücke hinzufügen', `Seite statt mittigem Fenster: Kopfzeile mit Zurück-Pfeil, kein Overlay-Rand (${JSON.stringify(pg)})`);
      assert(pg.exRows === 9 && pg.exHead === 'Bisherige Packstücke (9)' && !pg.exPencil && !pg.exAdd, `Rechts die 9 bisherigen Packstücke, nur lesend (${JSON.stringify(pg)})`);
      assert(pg.actionsBottom === 900 && pg.count === 'noch nichts eingetragen', `Speichern-Leiste fest am unteren Rand, Zähler leer (${JSON.stringify(pg)})`);
      // Zurück-Pfeil schließt ohne zu speichern; erneutes Öffnen startet frisch
      await page.evaluate(() => { document.querySelector('#huAddRows .hu-add-hu').value = 'ADD0099'; document.getElementById('huAddBackBtn').click(); }); await wait(200);
      assert(await page.evaluate(() => !document.getElementById('huAddModal').classList.contains('visible') && JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008296222'].totalPiecesExpected === 9), 'Zurück-Pfeil schließt die Seite ohne zu speichern');
      await page.evaluate(() => document.querySelector('.pack-add-btn').click()); await wait(300);
      assert(await page.evaluate(() => [...document.querySelectorAll('.hu-add-hu')].every(i => !i.value) && document.activeElement.classList.contains('hu-add-hu')), 'Erneut geöffnet: leere Zeilen, Fokus wieder in der ersten HU-Zelle');
      // Scanner-Simulation: HU + Enter, viermal
      for (const hu of ['ADD0091', 'ADD0092', 'ADD0093', 'ADD0094']) { await page.keyboard.type(hu); await page.keyboard.press('Enter'); await wait(60); }
      const typed = await page.evaluate(() => ({ rows: document.querySelectorAll('#huAddRows tr').length, hus: [...document.querySelectorAll('.hu-add-hu')].map(e => e.value).join('|'), focusRow: document.activeElement.closest('tr').rowIndex }));
      assert(typed.rows === 5 && typed.hus === 'ADD0091|ADD0092|ADD0093|ADD0094|' && typed.focusRow === 5, `Enter springt zur nächsten Zeile, neue Leerzeile wird angehängt (${JSON.stringify(typed)})`);
      assert(await page.$eval('#huAddCount', e => e.textContent) === '4 eingetragen', 'Zähler „4 eingetragen“ in der Kopfzeile der Eingabetabelle');
      await page.keyboard.type('ADD0092'); await wait(120);
      const bad = await page.$$eval('.hu-add-row-bad .hu-add-hu', e => e.map(x => x.value + ':' + x.title).join('|'));
      assert(bad === 'ADD0092:Doppelt in dieser Liste', `Doppelte HU wird sofort rot markiert (${bad})`);
      await page.evaluate(() => document.getElementById('saveHuAddButton').click()); await wait(200);
      assert(/rot markierten/.test(await page.$eval('#huAddError', e => e.textContent)), 'Speichern mit Duplikat wird abgelehnt');
      await page.evaluate(() => { document.querySelector('.hu-add-row-bad .hu-add-hu').value = 'HU5002'; document.querySelector('#huAddRows .hu-add-hu').dispatchEvent(new Event('input', { bubbles: true })); }); await wait(120);
      assert(/im Auftrag 9007000005/.test(await page.$eval('.hu-add-row-bad .hu-add-hu', e => e.title)), 'HU aus anderem Auftrag wird rot markiert');
      await page.evaluate(() => document.querySelector('.hu-add-row-bad .hu-add-remove').click()); await wait(100);
      await page.evaluate(() => { const rows = document.querySelectorAll('#huAddRows tr'); rows[1].querySelector('.hu-add-weight').value = '12,5'; rows[1].querySelector('.hu-add-pack').value = 'Palette'; rows[2].querySelector('.hu-add-weight').value = 'schwer'; });
      await page.evaluate(() => document.getElementById('saveHuAddButton').click()); await wait(200);
      assert(/Gewicht bei HU ADD0093 nicht lesbar/.test(await page.$eval('#huAddError', e => e.textContent)), 'Unlesbares Gewicht wird mit HU-Nummer gemeldet');
      await page.evaluate(() => { document.querySelectorAll('#huAddRows tr')[2].querySelector('.hu-add-weight').value = ''; document.getElementById('saveHuAddButton').click(); }); await wait(700);
      const after = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008296222'];
        return { modal: document.getElementById('huAddModal').classList.contains('visible'), tot: s.totalPiecesExpected, added: s.scannedItems.slice(9).map(i => i.rawInput + '@' + i.position + ':' + i.status + ':' + (i.grossWeight || '') + ':' + (i.packaging || '')).join(' '), rows: document.querySelectorAll('#detailView .pack-table tbody tr').length, stale: document.getElementById('huAddExisting').innerHTML.length, h4: document.querySelector('#detailView .detail-pack-head h4').textContent, kolli: [...document.querySelectorAll('.detail-fact')].map(f => f.textContent.replace(/\s+/g, ' ')).find(x => /Kolli/.test(x)) };
      });
      assert(!after.modal && after.tot === 13 && after.added === 'ADD0091@10:Anstehend:: ADD0092@11:Anstehend:12,5 KG:Palette ADD0093@12:Anstehend:: ADD0094@13:Anstehend::', `4 Packstücke auf einmal: Pos. 10–13 als „Anstehend“, Kolli 13 (${JSON.stringify(after)})`);
      assert(after.rows === 13 && after.stale === 0 && after.h4 === 'Packstücke (13)' && /Kolli ?13/.test(after.kolli), `Tabelle/Kopf zeigen 13 Packstücke, Seite aufgeräumt (${after.h4}, ${after.kolli}, stale ${after.stale})`);
      assert(be.store['9008296222'] && be.store['9008296222'].totalPiecesExpected === 13 && be.store['9008296222'].scannedItems.filter(i => /^ADD009/.test(i.rawInput)).length === 4, 'Neue Packstücke sind beim Server angekommen');
      // Scan einer neuen HU sichert ihren Platz ganz normal
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await scan(page, 'ADD0093', 600);
      const scanned = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008296222'].scannedItems.filter(i => i.rawInput === 'ADD0093').map(i => i.status + '@' + i.position).join(','));
      assert(scanned === 'XRY@12,Wareneingang@12', `Scan der neuen HU wird wie jede HU auf Platz 12 verbucht (${scanned})`);
      // Batch-Modus: die App leert die Detailansicht → kein „+ Packstück“; danach wieder da
      await page.evaluate(() => { const v = document.getElementById('detailView'); if (getComputedStyle(v).display !== 'none') document.getElementById('backToMainViewBtn').click(); }); await wait(300);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008296222"] .hawb-cell').click()); await wait(400);
      assert(await page.$eval('.pack-add-btn', b => getComputedStyle(b).display !== 'none'), 'Nach dem Scan: „+ Packstück“ wieder sichtbar');
      await setBatchMode(page, true); await wait(300);
      assert(await page.evaluate(() => !document.querySelector('.pack-add-btn') || getComputedStyle(document.querySelector('.pack-add-btn')).display === 'none'), 'Batch-Modus: „+ Packstück“ nicht erreichbar');
      await setBatchMode(page, false); await wait(300);
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008296222"] .hawb-cell').click()); await wait(400);
      assert(await page.evaluate(() => !!document.querySelector('.pack-add-btn') && getComputedStyle(document.querySelector('.pack-add-btn')).display !== 'none'), 'Batch-Modus aus, Details neu geöffnet: „+ Packstück“ wieder da');
      assert(page.__errors.length === 0, `Packstück hinzufügen: keine JS-Fehler (${page.__errors.join('; ')})`);
      await page.close();
    }

    // ---- Auswahl je Packstück: Kästchen + „Alle“, Kontrollmethode für die Auswahl wie ein Scan verbuchen ----
    {
      const d = bigData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
      const mk = (hu, pos, st) => ({ rawInput: hu, position: pos, status: st, timestamp: iso(30), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'Carton', dimensions: '10x10x10 CM', grossWeight: '5 KG' });
      d['9008295951'] = { hawb: '9008295951', lastModified: iso(1), totalPiecesExpected: 4, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'DHL', destinationCountry: 'AUSTRALIEN',
        scannedItems: [mk('SEL0001', 1, 'Anstehend'), mk('SEL0002', 2, 'Anstehend'), mk('SEL0003', 3, 'Anstehend'), mk('SEL0004', 4, 'Anstehend')] };
      const be = makeBackend(d, {});
      page = await openApp(browser, be, { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } }); await wait(500);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008295951"] .hawb-cell').click()); await wait(400);
      const sel0 = await page.evaluate(() => ({ boxes: document.querySelectorAll('.pack-table tbody .pack-select').length, all: !!document.querySelector('.pack-table thead .pack-select-all'), bar: document.querySelector('.pack-select-bar').classList.contains('hidden'),
        options: [...document.querySelectorAll('.pack-select-status option')].map(o => o.value).join(',') }));
      assert(sel0.boxes === 4 && sel0.all && sel0.bar && sel0.options === 'XRY,ETD,EDD,PHS,VCK,Wareneingang,Dunkelalarm', `Kästchen je Packstück + „Alle“, Leiste zunächst verborgen, Methoden wie im Scan-Feld (${JSON.stringify(sel0)})`);
      await page.evaluate(() => { const b = document.querySelectorAll('.pack-select'); b[1].click(); b[2].click(); }); await wait(150);
      const sel1 = await page.evaluate(() => ({ bar: !document.querySelector('.pack-select-bar').classList.contains('hidden'), count: document.querySelector('.pack-select-count').textContent, indet: document.querySelector('.pack-select-all').indeterminate }));
      assert(sel1.bar && sel1.count === '2 ausgewählt (2 offen)' && sel1.indet, `2 angehakt → Leiste „2 ausgewählt (2 offen)“, „Alle“ halb (${JSON.stringify(sel1)})`);
      await page.evaluate(() => { document.querySelector('.pack-select-status').value = 'ETD'; document.querySelector('.pack-select-apply').click(); }); await wait(700);
      const sel2 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008295951'];
        return { items: s.scannedItems.map(i => i.rawInput + ':' + i.status + '@' + i.position).join(' '), dis: [...document.querySelectorAll('.pack-select')].map(b => b.disabled ? 1 : 0).join(''), bar: document.querySelector('.pack-select-bar').classList.contains('hidden'), meta: document.querySelector('.detail-pack-meta').textContent }; });
      assert(sel2.items === 'SEL0001:Anstehend@1 SEL0002:ETD@2 SEL0003:ETD@3 SEL0004:Anstehend@4 SEL0002:Wareneingang@2 SEL0003:Wareneingang@3', `ETD für die Auswahl: Plätze 2+3 gesichert, Wareneingang automatisch – wie beim Scan (${sel2.items})`);
      assert(sel2.dis === '0000' && sel2.bar && sel2.meta === '2 offen', `Alle Kästchen bleiben anwählbar (gesicherte für Storno), Leiste wieder zu, „2 offen“ (${JSON.stringify(sel2)})`);
      assert(be.store['9008295951'].scannedItems.filter(i => i.status === 'ETD').length === 2, 'Manuell vergebene Leistungen sind beim Server angekommen');
      // „Alle“ → XRY für den Rest; danach Auftrag fertig und nichts mehr anwählbar
      await page.evaluate(() => document.querySelector('.pack-select-all').click()); await wait(150);
      assert(await page.$eval('.pack-select-count', e => e.textContent) === '4 ausgewählt (2 offen · 2 gesichert)', '„Alle“ wählt alle Packstücke; Zähler nennt offen/gesichert');
      assert(await page.evaluate(() => !document.querySelector('.pack-select-group-apply').classList.contains('hidden') && !document.querySelector('.pack-select-group-cancel').classList.contains('hidden')), 'Gemischte Auswahl: „Übernehmen“ und „Storno“ sichtbar');
      await page.evaluate(() => document.querySelector('.pack-select-apply').click()); await wait(700);
      const sel3 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008295951'];
        return { sec: s.scannedItems.filter(i => i.status !== 'Wareneingang').map(i => i.status).join(','), we: s.scannedItems.filter(i => i.status === 'Wareneingang').length, allDis: document.querySelector('.pack-select-all').disabled, status: document.querySelector('.detail-fact .status-text, .detail-fact')?.textContent.replace(/\s+/g, ' ') }; });
      assert(sel3.sec === 'XRY,ETD,ETD,XRY' && sel3.we === 4 && !sel3.allDis && /Fertig/.test(sel3.status), `„Übernehmen“ wirkt nur auf die offenen: Rest XRY, Auftrag fertig (${JSON.stringify(sel3)})`);
      // Storno für die Auswahl: nur gesicherte, Einträge bleiben als storniert, Packstücke wieder offen
      await page.evaluate(() => { const b = document.querySelectorAll('.pack-select'); b[1].click(); b[2].click(); }); await wait(150);
      const st0 = await page.evaluate(() => ({ count: document.querySelector('.pack-select-count').textContent, apply: !document.querySelector('.pack-select-group-apply').classList.contains('hidden'), cancel: !document.querySelector('.pack-select-group-cancel').classList.contains('hidden') }));
      assert(st0.count === '2 ausgewählt (2 gesichert)' && !st0.apply && st0.cancel, `Nur gesicherte gewählt → nur „Storno“ (${JSON.stringify(st0)})`);
      await page.evaluate(() => document.querySelector('.pack-select-cancel').click()); await wait(800);
      const st1 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008295951'];
        return { cancelled: s.scannedItems.filter(i => i.isCancelled).map(i => i.rawInput + ':' + i.status).join(','), open: s.scannedItems.filter(i => !i.isCancelled && i.status === 'Anstehend').map(i => i.rawInput).join(','), we: s.scannedItems.filter(i => i.status === 'Wareneingang' && !i.isCancelled).length, meta: document.querySelector('.detail-pack-meta').textContent, bar: document.querySelector('.pack-select-bar').classList.contains('hidden'), status: document.querySelector('.detail-fact')?.textContent.replace(/\s+/g, ' ') }; });
      assert(st1.cancelled === 'SEL0002:ETD,SEL0003:ETD' && st1.open === 'SEL0002,SEL0003' && st1.we === 4 && st1.meta === '2 offen' && st1.bar && /Offen/.test(st1.status), `Storno der Auswahl: ETD-Einträge storniert, HUs wieder offen, Wareneingang bleibt (${JSON.stringify(st1)})`);
      assert(be.store['9008295951'].scannedItems.filter(i => i.isCancelled).length === 2, 'Storno ist beim Server angekommen');
      // Abbruch im Bestätigungsdialog verbucht nichts
      await page.evaluate(() => document.querySelector('.pack-add-btn').click()); await wait(300);
      await page.keyboard.type('SEL0005'); await page.keyboard.press('Enter'); await page.evaluate(() => document.getElementById('saveHuAddButton').click()); await wait(600);
      page.off('dialog'); const declineOnce = dlg => { dlg.dismiss(); page.off('dialog', declineOnce); page.on('dialog', dd => dd.accept()); }; page.on('dialog', declineOnce);
      await page.evaluate(() => { document.querySelector('.pack-select:not(:disabled)').click(); document.querySelector('.pack-select-apply').click(); }); await wait(400);
      assert(await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008295951'].scannedItems.filter(i => i.rawInput === 'SEL0005').map(i => i.status).join() === 'Anstehend'), 'Rückfrage abgelehnt → nichts verbucht');
      // Batch-Modus: Auswahl nicht erreichbar
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await setBatchMode(page, true); await wait(300);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008295951"] .hawb-cell').click()); await wait(400);
      assert(await page.evaluate(() => { const c = document.querySelector('.pack-select-cell'); return !c || getComputedStyle(c).display === 'none'; }), 'Batch-Modus: keine Auswahl-Kästchen');
      await setBatchMode(page, false); await wait(300);
      assert(page.__errors.length === 0, `Auswahl: keine JS-Fehler (${page.__errors.join('; ')})`);
      await page.close();
    }

    // ---- „+ Auftrag“ (LKW-Seite): weiteren Auftrag zum MAN-LKW anlegen – wie ein Import, mit erstem Packstück ----
    {
      const d = bigData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
      d['9007000001'].freightForwarder = 'Spedition A'; d['9007000001'].destinationCountry = 'DE';
      const be = makeBackend(d, {});
      page = await openApp(browser, be, { query: '?seite=anlieferung&lkw=MAN%201', viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } }); await wait(600);
      const before = await page.evaluate(() => ({ rows: document.querySelectorAll('#pageContent tr[data-basenumber]').length, btn: document.querySelector('[data-order-add]') && document.querySelector('[data-order-add]').textContent.trim() }));
      assert(before.btn === '+ Auftrag', `„+ Auftrag“ auf der LKW-Seite neben „LKW deaktivieren“ (${before.btn})`);
      await page.evaluate(() => document.querySelector('[data-order-add]').click()); await wait(300);
      const m = await page.evaluate(() => ({ vis: document.getElementById('orderAddModal').classList.contains('visible'), focus: document.activeElement.id, fw: document.getElementById('orderAddForwarder').value, land: document.getElementById('orderAddCountry').value }));
      assert(m.vis && m.focus === 'orderAddNumber' && m.fw === '' && m.land === '', `Modal offen, Spediteur/Land LEER (keine Vorbelegung), Fokus Rechnungsnummer (${JSON.stringify(m)})`);
      const trySave = async () => { await page.evaluate(() => document.getElementById('saveOrderAddButton').click()); await wait(200); return page.$eval('#orderAddError', e => e.textContent); };
      assert(/Rechnungsnummer eingeben/.test(await trySave()), 'Auftrag: leere Rechnungsnummer wird abgelehnt');
      await page.evaluate(() => { document.getElementById('orderAddNumber').value = '9007000005'; document.getElementById('orderAddHu').value = 'NEU0001'; });
      assert(/Spediteur eingeben/.test(await trySave()), 'Auftrag: Spediteur ist Pflicht');
      await page.evaluate(() => { document.getElementById('orderAddForwarder').value = 'Spedition A'; });
      assert(/Land eingeben/.test(await trySave()), 'Auftrag: Land ist Pflicht');
      await page.evaluate(() => { document.getElementById('orderAddCountry').value = 'DE'; });
      assert(/9007000005 gibt es bereits/.test(await trySave()), 'Auftrag: vorhandene Rechnungsnummer wird abgelehnt');
      await page.evaluate(() => { document.getElementById('orderAddNumber').value = '9007000099'; document.getElementById('orderAddHu').value = 'HU5002'; });
      assert(/HU HU5002 gibt es bereits im Auftrag 9007000005/.test(await trySave()), 'Auftrag: HU aus anderem Auftrag wird abgelehnt');
      await page.evaluate(() => { document.getElementById('orderAddHu').value = 'NEU0001'; document.getElementById('orderAddCountry').value = 'china'; document.getElementById('orderAddPlso').value = '318101'; document.getElementById('orderAddWeight').value = '7,5'; document.getElementById('saveOrderAddButton').click(); }); await wait(700);
      const after = await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9007000099'];
        return { modal: document.getElementById('orderAddModal').classList.contains('visible'), detail: getComputedStyle(document.getElementById('detailView')).display, crumbs: document.querySelector('.detail-crumbs').textContent.replace(/\s+/g, ' ').trim(), s: s && { truck: s.truckId, man: s.originalManNumber, hu: s.isHuListOrder, fw: s.freightForwarder, land: s.destinationCountry, plso: s.plsoNumber, tot: s.totalPiecesExpected, items: s.scannedItems.map(i => i.rawInput + ':' + i.status + ':' + i.position + ':' + i.grossWeight).join() }, addBtn: !!document.querySelector('.pack-add-btn') };
      });
      assert(!after.modal && after.detail === 'block' && /MAN 1.*9007000099$/.test(after.crumbs) && after.addBtn, `Nach dem Anlegen: Detailansicht des neuen Auftrags mit „+ Packstück“ (${after.crumbs})`);
      assert(after.s && after.s.truck === 'MAN 1' && after.s.man === 1 && after.s.hu === true && after.s.fw === 'Spedition A' && after.s.land === 'CHINA' && after.s.plso === '318101' && after.s.tot === 1 && after.s.items === 'NEU0001:Anstehend:1:7,5 KG', `Auftrag wie ein Import angelegt (LKW, MAN-Nr., Spediteur, Land, PLSO, 1 Platz „Anstehend“) (${JSON.stringify(after.s)})`);
      assert(be.store['9007000099'] && be.store['9007000099'].truckId === 'MAN 1', 'Neuer Auftrag ist beim Server angekommen');
      await page.evaluate(() => document.querySelector('.detail-crumb[data-crumb-page="lkw"]').click()); await wait(500);
      const lkw = await page.evaluate(() => ({ rows: document.querySelectorAll('#pageContent tr[data-basenumber]').length, sum: document.querySelector('.page-summary').textContent.replace(/\s+/g, ' ').trim() }));
      assert(lkw.rows === before.rows + 1 && /HUs/.test(lkw.sum), `LKW-Seite zeigt den neuen Auftrag (${before.rows} → ${lkw.rows})`);
      // Scan der ersten HU landet im neuen Auftrag
      await page.evaluate(() => document.getElementById('backToMainViewBtn') && getComputedStyle(document.getElementById('detailView')).display !== 'none' ? document.getElementById('backToMainViewBtn').click() : null); await wait(200);
      await scan(page, 'NEU0001', 600);
      const scanned = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9007000099'].scannedItems.map(i => i.rawInput + ':' + i.status).join());
      assert(scanned === 'NEU0001:XRY,NEU0001:Wareneingang', `Scan der ersten HU sichert Platz 1 im neuen Auftrag (${scanned})`);
      assert(page.__errors.length === 0, `Auftrag hinzufügen: keine JS-Fehler (${page.__errors.join('; ')})`);
      await page.close();
      // Handy: LKW-Seite ohne „+ Auftrag“
      page = await openApp(browser, makeBackend(bigData(), {}), { query: '?seite=anlieferung&lkw=MAN%201' }); await wait(500);
      assert(await page.evaluate(() => !document.querySelector('[data-order-add]') && !!document.querySelector('[data-lkw-deactivate]')), 'Handy: LKW-Seite unverändert (kein „+ Auftrag“)');
      await page.close();
    }

    // ---- VW-LKW: VVL und Kundennr als zwei Spalten in der Liste, VSE und Sendungs-Nr. getrennt in der Packstücktabelle ----
    {
      const d = bigData(); const now = new Date().toISOString(); const vvl = '100004158949', tid = 'VVL-' + vvl;
      [['863', 3], ['959201', 9]].forEach(([k, cnt]) => { d[k] = { hawb: k, lastModified: now, totalPiecesExpected: cnt, mitarbeiter: 'T', isHuListOrder: true, truckId: tid, parentOrderNumber: vvl,
        scannedItems: Array.from({ length: cnt }, (_, i) => ({ rawInput: '88122' + (6843 + i), sendnr: '8386256', status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, grossWeight: '30 KG' })) }; });
      page = await openApp(browser, makeBackend(d, {}), { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 }, query: '?seite=anlieferung&lkw=' + encodeURIComponent(tid) }); await wait(600);
      const vw = await page.evaluate(() => {
        const cell = document.querySelector('tr[data-basenumber="959201"] .hawb-cell');
        const cols = [...cell.querySelectorAll('.vvl-col')];
        const t = document.querySelector('#pageContent .shipment-table');
        return { cls: cell.className, grid: getComputedStyle(cell.querySelector('.vvl-table-entry')).display, cols: cols.map(c => c.textContent.replace(/\s+/g, ' ').trim()).join(' | '),
          side: Math.round(cols[0].getBoundingClientRect().top) === Math.round(cols[1].getBoundingClientRect().top), rowH: Math.round(cell.getBoundingClientRect().height),
          qr: Math.round(t.rows[1].cells[t.rows[1].cells.length - 1].getBoundingClientRect().width), fits: t.scrollWidth <= t.clientWidth + 1 };
      });
      assert(/hawb-cell-vvl/.test(vw.cls) && vw.grid === 'grid' && vw.cols === 'VVL100004158949 | Kundennr959201' && vw.side, `VW-Liste: VVL und Kundennr nebeneinander in zwei Spalten (${JSON.stringify(vw)})`);
      assert(vw.rowH <= 44 && vw.qr >= 40 && vw.fits, `VW-Liste: Zeile bleibt flach, QR-Spalte vollständig, kein Querscrollen (${JSON.stringify(vw)})`);
      const vh = await page.evaluate(() => {
        const t = document.querySelector('#pageContent .shipment-table'); const th = t.querySelector('th[data-sort="hawb"]');
        const labels = [...th.querySelectorAll('.th-vvl span')]; const cell = t.querySelector('tr[data-basenumber="959201"] .hawb-cell'); const nos = [...cell.querySelectorAll('.vvl-col')];
        return { vwOnly: t.classList.contains('vw-only'), hawbHidden: getComputedStyle(th.querySelector('.th-hawb')).display === 'none', labels: labels.map(l => l.textContent).join('|'),
          prefixHidden: [...cell.querySelectorAll('.vvl-prefix, .kundennr-prefix')].every(e => getComputedStyle(e).display === 'none'),
          aligned: Math.abs(labels[0].getBoundingClientRect().left - nos[0].getBoundingClientRect().left) < 2 && Math.abs(labels[1].getBoundingClientRect().left - nos[1].getBoundingClientRect().left) < 2,
          rowH: Math.round(cell.getBoundingClientRect().height) };
      });
      assert(vh.vwOnly && vh.hawbHidden && vh.labels === 'VVL|Kundennr' && vh.prefixHidden && vh.aligned && vh.rowH <= 38, `VW-Liste: Kopf „VVL | Kundennr“ statt HAWB., Zeilen nur Nummern, bündig unter dem Kopf (${JSON.stringify(vh)})`);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="959201"] .hawb-cell').click()); await wait(500);
      const pk = await page.evaluate(() => ({ head: [...document.querySelectorAll('.pack-table thead th')].map(t => t.textContent.trim()).join('|'), row: [...document.querySelectorAll('.pack-table tbody tr')[0].cells].map(c => c.textContent.trim()).slice(1, 3).join('|'), inHu: !!document.querySelector('.pack-table td.pack-hu .pack-sendnr') }));
      assert(pk.head === '|VSE|Sendungs-Nr.|Verpackung|Maße|Gewicht|WE|Sicherung|Zeit|Notiz|' && pk.row === '881226843|8386256' && !pk.inHu, `VW-Packstücke: VSE und Sendungs-Nr. als eigene Spalten (${JSON.stringify(pk)})`);
      // Packstücktabelle sortierbar: Klick auf den Kopf dreht die Reihenfolge, Dreieck wie in der Sendungsliste, Wahl überlebt den Neuaufbau
      const firstHu = () => page.evaluate(() => document.querySelector('#detailView .pack-table tbody tr .hu-value').textContent.trim());
      const thState = (key) => page.evaluate((k) => { const th = document.querySelector(`#detailView .pack-table th[data-psort="${k}"]`); const ps = getComputedStyle(th, '::after'); return { cls: th.className, aria: th.getAttribute('aria-sort'), cursor: getComputedStyle(th).cursor, tri: ps.borderTopWidth, op: ps.opacity }; }, key);
      const ps0 = await thState('hu');
      assert(ps0.cursor === 'pointer' && ps0.tri === '5px' && ps0.op === '0' && !ps0.aria, `Packstück-Kopf VSE: klickbar, Dreieck vorhanden (unsortiert unsichtbar) (${JSON.stringify(ps0)})`);
      await page.evaluate(() => document.querySelector('#detailView .pack-table th[data-psort="hu"]').click()); await wait(150);
      const ps1 = await thState('hu');
      assert(/sorted-asc/.test(ps1.cls) && ps1.aria === 'ascending' && Number(ps1.op) > 0.9 && await firstHu() === '881226843', `Klick VSE: aufsteigend, Dreieck sichtbar (${JSON.stringify(ps1)})`);
      await page.evaluate(() => document.querySelector('#detailView .pack-table th[data-psort="hu"]').click()); await wait(150);
      assert(/sorted-desc/.test((await thState('hu')).cls) && await firstHu() === '881226851', `Zweiter Klick VSE: absteigend, höchste Nummer oben (${await firstHu()})`);
      assert(await page.evaluate(() => document.querySelectorAll('#detailView .pack-table tbody tr').length === 9 && document.querySelectorAll('#detailView .pack-table .pack-select').length === 9), 'Sortieren: alle 9 Zeilen und Kästchen noch da');
      // Neuaufbau der Details (Kästchen anhaken → Leiste, dann Details neu öffnen): Sortierung bleibt
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(200);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="959201"] .hawb-cell').click()); await wait(400);
      assert(await firstHu() === '881226851' && /sorted-desc/.test((await thState('hu')).cls), `Sortierung bleibt nach Neuaufbau der Details erhalten (${await firstHu()})`);
      await page.evaluate(() => document.querySelector('#detailView .pack-table th[data-psort="sendnr"]').click()); await wait(150);
      assert(/sorted-asc/.test((await thState('sendnr')).cls) && !/sorted/.test((await thState('hu')).cls) && await firstHu() === '881226843', 'Klick Sendungs-Nr.: nur eine Spalte sortiert, gleiche Sendungs-Nr. → wieder Ursprungsreihenfolge');
      assert(page.__errors.length === 0, `Packstück-Sortierung: keine JS-Fehler (${page.__errors.join('; ')})`);
      // MAN-Auftrag ohne VVL: keine Sendungs-Nr.-Spalte, Liste wie bisher
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await page.evaluate(() => document.getElementById('pageBackBtn').click()); await wait(300);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9007000001"] .hawb-cell').click()); await wait(400);
      assert(await page.evaluate(() => [...document.querySelectorAll('.pack-table thead th')].map(t => t.textContent.trim()).join('|')) === '|HU|Verpackung|Maße|Gewicht|WE|Sicherung|Zeit|Notiz|', 'MAN-Auftrag: Packstücktabelle unverändert (keine Sendungs-Nr.-Spalte)');
      // MAN-Auftrag: Sortierung nach Gewicht (erster Klick: Schwerstes oben; Gewichte „19.5 KG“, „25 KG“, „20,8 KG“ werden als Zahl verglichen)
      await page.evaluate(() => document.querySelector('#detailView .pack-table th[data-psort="kg"]').click()); await wait(150);
      const kgOrder = await page.evaluate(() => [...document.querySelectorAll('#detailView .pack-table tbody tr .hu-value')].map(e => e.textContent.trim()).join());
      assert(kgOrder === 'HU1002,HU1003,HU1001', `Klick Gewicht: schwerstes Packstück oben (${kgOrder})`);
      await page.evaluate(() => document.querySelector('#detailView .pack-table th[data-psort="kg"]').click()); await wait(150);
      assert(await page.evaluate(() => [...document.querySelectorAll('#detailView .pack-table tbody tr .hu-value')].map(e => e.textContent.trim()).join()) === 'HU1001,HU1003,HU1002', 'Zweiter Klick Gewicht: leichtestes oben');
      // Einzelsendung: Stück-Tabelle ebenfalls mit sortierbaren Köpfen
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(200);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="123"] .hawb-cell').click()); await wait(400);
      assert(await page.evaluate(() => document.querySelectorAll('#detailView .pack-table-plain th[data-psort]').length === 8 && document.querySelectorAll('#detailView .pack-table-plain tbody tr[data-ps-default]').length >= 1), 'Einzelsendung: Stück-Tabelle mit sortierbaren Spaltenköpfen');
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(200);
      assert(await page.evaluate(() => !document.querySelector('tr[data-basenumber="9007000001"] .hawb-cell').classList.contains('hawb-cell-vvl')), 'MAN-Zeile: HAWB-Zelle unverändert');
      assert(await page.evaluate(() => { const t = document.querySelector('#shipmentTableBody').closest('table'); const th = t.querySelector('th[data-sort="hawb"]'); return !t.classList.contains('vw-only') && getComputedStyle(th.querySelector('.th-hawb')).display !== 'none' && getComputedStyle(th.querySelector('.th-vvl')).display === 'none'; }), 'Startseite: Kopf weiterhin „HAWB.“');
      assert(page.__errors.length === 0, `VW-Spalten: keine JS-Fehler (${page.__errors.join('; ')})`);
      await page.close();
      // Handy: VW-Karte weiterhin untereinander (VVL über Kundennr)
      page = await openApp(browser, makeBackend(d, {}), { query: '?seite=anlieferung&lkw=' + encodeURIComponent(tid) }); await wait(600);
      const ph = await page.evaluate(() => { const e = document.querySelector('tr[data-basenumber="863"] .vvl-table-entry'); const c = [...e.querySelectorAll('.vvl-col')]; return { display: getComputedStyle(e).display, stacked: c[1].getBoundingClientRect().top > c[0].getBoundingClientRect().bottom - 2, text: e.textContent.replace(/\s+/g, ' ').trim() }; });
      assert(ph.display === 'block' && ph.stacked && ph.text === 'VVL100004158949 Kundennr863', `Handy: VW-Karte wie bisher untereinander (${JSON.stringify(ph)})`);
      await page.close();
    }

    // ---- Handy: unverändert ----
    page = await openApp(browser, makeBackend(bigData(), {}));
    const mob = await page.evaluate(() => {
      const r = document.querySelector('tr[data-basenumber]');
      const vis = [...r.cells].filter(c => getComputedStyle(c).display !== 'none').map(c => c.className.split(' ')[0]);
      return { rows: document.querySelectorAll('#shipmentTableBody tr[data-basenumber]').length, display: getComputedStyle(r).display, vis, thead: getComputedStyle(document.querySelector('.shipment-table thead')).display, h: r.getBoundingClientRect().height };
    });
    assert(mob.rows === 5, `Handy: weiterhin 5 zuletzt bearbeitete Karten (${mob.rows})`);
    assert(mob.display === 'grid' && mob.thead === 'none', 'Handy: Karten-Layout, kein Tabellenkopf');
    assert(mob.vis.join() === 'hawb-cell,summary-cell,time-cell,actions-cell', `Handy: nur die bisherigen 4 Zellen sichtbar (${mob.vis.join(', ')})`);
    assert(mob.h > 100 && mob.h < 170, `Handy: Kartenhöhe wie bisher (${Math.round(mob.h)} px)`);
    await page.evaluate(() => document.querySelector('tr[data-basenumber="9007000001"] .hawb-cell').click()); await wait(400);
    assert(await page.$eval('#detailView', v => getComputedStyle(v).display !== 'none'), 'Handy: Tipp auf HAWB öffnet Detailansicht');
    const mobDet = await page.evaluate(() => ({ head: !!document.querySelector('.detail-head'), pack: !!document.querySelector('.pack-table'), pending: !!document.getElementById('pendingHuList') }));
    assert(!mobDet.head && !mobDet.pack && mobDet.pending, `Handy-Details unverändert: kein Kopf, keine Tabelle, gelber Kasten (${JSON.stringify(mobDet)})`);
    await page.goBack(); await wait(300);
    await page.evaluate(() => document.querySelector('.home-tile[data-page="info"]').click()); await wait(500);
    const mobInfo = await page.evaluate(() => ({ rows: document.querySelectorAll('#infoResults tr[data-basenumber]').length, head: getComputedStyle(document.querySelector('.info-form-head')).display, cols: getComputedStyle(document.querySelector('.info-layout')).gridTemplateColumns, note: document.getElementById('infoResultNote').textContent.slice(0, 20) }));
    assert(mobInfo.rows === 0 && mobInfo.head === 'none' && mobInfo.cols === 'none' && /Suchbegriff/.test(mobInfo.note), `Handy-Info unverändert: Filter oben, erst nach Eingabe Treffer (${JSON.stringify(mobInfo)})`);
    assert(page.__errors.length === 0, `Handy: keine JS-Fehler (${page.__errors.join('; ')})`);
  } finally { await browser.close(); finish(); }
})().catch(e => { console.error('ERR', e); process.exit(1); });
