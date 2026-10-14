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
    await page.evaluate(() => { const i = document.getElementById('infoSearchInput'); i.value = 'HU1001'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await wait(400);
    const ix = await page.evaluate(() => ({ x: getComputedStyle(document.getElementById('infoSearchClear')).display, row: getComputedStyle(document.getElementById('infoResetRow')).display, rows: document.querySelectorAll('#infoResults tr[data-basenumber]').length }));
    assert(ix.x !== 'none' && ix.row === 'none' && ix.rows === 1, `Info Desktop: X im Suchfeld bei Text, Reset-Zeile bleibt aus (Kopf hat „Zurücksetzen“) (${JSON.stringify(ix)})`);
    await page.evaluate(() => document.getElementById('infoSearchClear').click()); await wait(400);
    const ix2 = await page.evaluate(() => ({ text: document.getElementById('infoSearchInput').value, x: getComputedStyle(document.getElementById('infoSearchClear')).display, focus: document.activeElement.id, rows: document.querySelectorAll('#infoResults tr[data-basenumber]').length }));
    assert(ix2.text === '' && ix2.x === 'none' && ix2.focus === 'infoSearchInput' && ix2.rows === 15, `X leert den Suchtext, Fokus bleibt im Feld, wieder alle Zeilen (${JSON.stringify(ix2)})`);
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
      await page.evaluate(() => { document.getElementById('huEditPackaging').value = 'Karton'; document.getElementById('huEditDimL').value = '60'; document.getElementById('huEditDimB').value = '40'; document.getElementById('huEditDimH').value = '30'; document.getElementById('huEditWeight').value = '12,5'; document.getElementById('saveHuEditButton').click(); }); await wait(600);
      const after = await page.evaluate(() => ({ modal: document.getElementById('huEditModal').classList.contains('visible'), row: [...document.querySelector('.pack-table-plain tbody tr').cells].slice(0, 4).map(c => c.textContent.trim()).join('|'), kg: [...document.querySelectorAll('.detail-fact')].map(f => f.textContent.replace(/\s+/g, ' ')).find(x => /Gewicht/.test(x)), items: JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['123'].scannedItems.map(i => i.status + ':' + (i.grossWeight || '')).join(' ') }));
      assert(!after.modal && after.row === '1.|Karton|60x40x30 CM|12,5 KG' && /12,5 kg/.test(after.kg), `Stück gespeichert: Zeile + Kopf-Gewicht (${after.row}; ${after.kg})`);
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
      assert(await page.evaluate(() => getComputedStyle(document.getElementById('batchActionBar')).position === 'static' && /^Batch Speichern/.test(document.getElementById('saveBatchButton').textContent.trim())), 'Desktop: Batch-Knöpfe bleiben in der Karte („Batch Speichern“)');
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

    // ---- Auswahl-Leiste: Häkchen „Kombi“ bei XRY/VCK – Kombi-Sicherung wie ein Kombi-Scan, Packstück bleibt offen ----
    {
      const d = bigData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
      const mk = (hu, pos, st) => ({ rawInput: hu, position: pos, status: st, timestamp: iso(30), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'Carton', dimensions: '10x10x10 CM', grossWeight: '5 KG' });
      d['9008295952'] = { hawb: '9008295952', lastModified: iso(1), totalPiecesExpected: 3, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'DHL', destinationCountry: 'AUSTRALIEN',
        scannedItems: [mk('KMB0001', 1, 'Anstehend'), mk('KMB0002', 2, 'Anstehend'), mk('KMB0003', 3, 'Anstehend')] };
      const be = makeBackend(d, {});
      page = await openApp(browser, be, { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } }); await wait(500);
      const dialogs = []; page.off('dialog'); page.on('dialog', dlg => { dialogs.push(dlg.message()); dlg.accept(); });
      const store = () => page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008295952']);
      const comboState = () => page.evaluate(() => { const w = document.querySelector('#detailView .pack-select-combo-wrap'); return { hidden: !w || w.classList.contains('hidden') || getComputedStyle(w).display === 'none', checked: !!(w && w.querySelector('.pack-select-combo').checked) }; });
      // Hilfen: offenes Packstück per HU anhaken, Kontrollmethode setzen (löst „change“ aus wie ein Nutzer), Kombi-Häkchen, Übernehmen
      const pick = hus => page.evaluate(hs => hs.forEach(h => document.querySelector(`#detailView .pack-select[data-hu="${h}"][data-state="open"]`).click()), hus);
      const method = v => page.evaluate(v => { const s = document.querySelector('#detailView .pack-select-status'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, v);
      const combo = () => page.evaluate(() => document.querySelector('#detailView .pack-select-combo').click());
      const apply = () => page.evaluate(() => document.querySelector('#detailView .pack-select-apply').click());
      const statuses = () => page.evaluate(() => [...document.querySelectorAll('#detailView .pack-table tbody tr')].map(r => r.querySelector('.pack-pos').textContent.trim() + r.querySelector('.pack-status').textContent.trim()).join('|'));
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008295952"] .hawb-cell').click()); await wait(400);
      await pick(['KMB0001', 'KMB0002']); await wait(150);
      const k0 = await comboState();
      assert(!k0.hidden && !k0.checked, `Kontrollmethode XRY (Standard) → Häkchen „Kombi“ sichtbar, nicht gesetzt (${JSON.stringify(k0)})`);
      // ETD → Häkchen weg (und abgewählt), VCK → wieder da, PHS → weg
      await combo(); await method('ETD'); await wait(100); const k1 = await comboState();
      await method('VCK'); await wait(100); const k2 = await comboState();
      await method('PHS'); await wait(100); const k3 = await comboState();
      assert(k1.hidden && !k1.checked && !k2.hidden && !k2.checked && k3.hidden, `Häkchen nur bei XRY/VCK: ETD verbirgt und löscht es, VCK zeigt es, PHS verbirgt es (${JSON.stringify([k1, k2, k3])})`);
      // XRY (Kombi) für Pos. 1+2: Rückfrage nennt „XRY (Kombi)“, Einträge isCombination, Plätze bleiben offen, WE automatisch
      await method('XRY'); await combo(); await apply(); await wait(700);
      const s1 = await store();
      const kombiRows = s1.scannedItems.filter(i => i.isCombination && !i.isCancelled).map(i => i.rawInput + ':' + i.status).sort().join(',');
      const openRows = s1.scannedItems.filter(i => !i.isCancelled && i.status === 'Anstehend').map(i => i.rawInput).sort().join(',');
      const dlg1 = dialogs[dialogs.length - 1] || '';
      assert(/^XRY \(Kombi\) für 2 Packstücke eintragen\?/.test(dlg1) && /bleiben für die finale Sicherung offen/.test(dlg1) && /KMB0001, KMB0002/.test(dlg1), `Rückfrage nennt „XRY (Kombi)“ und erklärt, dass die Packstücke offen bleiben (${dlg1.replace(/\n+/g, ' ')})`);
      assert(kombiRows === 'KMB0001:XRY,KMB0002:XRY' && openRows === 'KMB0001,KMB0002,KMB0003' && s1.scannedItems.filter(i => i.status === 'Wareneingang').length === 2, `XRY (Kombi): 2 Kombi-Einträge, alle 3 Plätze weiter offen, Wareneingang automatisch (${kombiRows} | offen ${openRows})`);
      const t1 = await page.evaluate(() => ({ rows: document.querySelectorAll('#detailView .pack-table tbody tr').length, head: document.querySelector('#detailView .detail-pack-head h4').textContent, meta: document.querySelector('#detailView .detail-pack-meta').textContent, fact: document.querySelector('#detailView .detail-fact')?.textContent.replace(/\s+/g, ' ') }));
      assert(t1.rows === 5 && t1.head === 'Packstücke (3)' && t1.meta === '3 offen' && await statuses() === '1.Offen|1.XRY (Kombi)|2.Offen|2.XRY (Kombi)|3.Offen' && /Offen/.test(t1.fact), `Tabelle: Kombi-Zeile „XRY (Kombi)“ direkt unter ihrem Packstück, Plätze offen, Kopf „Packstücke (3)“ / „3 offen“ (${JSON.stringify(t1)} ${await statuses()})`);
      assert(be.store['9008295952'].scannedItems.filter(i => i.isCombination).length === 2, 'Kombi-Einträge sind beim Server angekommen');
      assert(!(await comboState()).checked, 'Nach „Übernehmen“ ist das Häkchen „Kombi“ wieder leer (keine versehentliche zweite Kombi)');
      // VCK (Kombi) für Pos. 3
      await pick(['KMB0003']); await method('VCK'); await combo(); await apply(); await wait(700);
      const s3 = await store();
      const vck = s3.scannedItems.find(i => i.rawInput === 'KMB0003' && i.isCombination);
      assert(vck && vck.status === 'VCK' && /^VCK \(Kombi\) für 1 Packstück eintragen\?/.test(dialogs[dialogs.length - 1]) && s3.scannedItems.filter(i => !i.isCancelled && i.status === 'Anstehend').length === 3, `VCK (Kombi) über die Leiste verbucht, Platz bleibt offen (${(dialogs[dialogs.length - 1] || '').replace(/\n+/g, ' ')})`);
      assert(await statuses() === '1.Offen|1.XRY (Kombi)|2.Offen|2.XRY (Kombi)|3.Offen|3.VCK (Kombi)', `Tabelle zeigt „VCK (Kombi)“ unter Pos. 3 (${await statuses()})`);
      // Finale Sicherung danach weiterhin möglich – die Kombi verbraucht den Platz nicht
      await pick(['KMB0001']); await method('XRY'); await apply(); await wait(700);
      const s4 = await store();
      const f = s4.scannedItems.filter(i => i.rawInput === 'KMB0001' && !i.isCancelled).map(i => i.status + (i.isCombination ? '*' : '')).sort().join(',');
      assert(f === 'Wareneingang,XRY,XRY*' && /^XRY für 1 Packstück eintragen\?/.test(dialogs[dialogs.length - 1]), `Finale XRY nach der Kombi: Platz gesichert, Kombi bleibt daneben stehen (${f})`);
      assert(await statuses() === '1.XRY|1.XRY (Kombi)|2.Offen|2.XRY (Kombi)|3.Offen|3.VCK (Kombi)' && await page.evaluate(() => document.querySelector('#detailView .detail-pack-meta').textContent) === '2 offen', `Tabelle: Pos. 1 XRY + Kombi, Kopf „2 offen“ (${await statuses()})`);
      // Storno der Kombi-Zeile über die Leiste: Eintrag storniert, aber KEIN zusätzlicher offener Platz
      await page.evaluate(() => { const row = [...document.querySelectorAll('#detailView .pack-table tbody tr')].find(r => r.querySelector('.pack-status').textContent.trim() === 'VCK (Kombi)'); row.querySelector('.pack-select').click(); document.querySelector('#detailView .pack-select-cancel').click(); }); await wait(800);
      const s5 = await store();
      assert(s5.scannedItems.filter(i => i.isCancelled).length === 1 && s5.scannedItems.filter(i => !i.isCancelled && i.status === 'Anstehend').length === 2 && s5.scannedItems.filter(i => !i.isCancelled && i.isCombination).length === 2, 'Storno einer Kombi-Zeile: Eintrag storniert, kein zusätzlicher offener Platz');
      assert(await statuses() === '1.XRY|1.XRY (Kombi)|2.Offen|2.XRY (Kombi)|3.Offen' && await page.evaluate(() => document.querySelector('#detailView .detail-pack-head h4').textContent === 'Packstücke (3)'), `Tabelle nach Storno: Kombi-Zeile weg, Kopf weiter „Packstücke (3)“ (${await statuses()})`);
      // Scan-Feld unverändert: Kombi-Häkchen dort weiterhin nur bei XRY
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      const sf = await page.evaluate(() => { const sel = document.getElementById('securityStatusSelect'); const c = document.getElementById('comboCheckboxContainer'); const vis = () => getComputedStyle(c).display !== 'none';
        sel.value = 'VCK'; sel.dispatchEvent(new Event('change', { bubbles: true })); const vck = vis(); sel.value = 'XRY'; sel.dispatchEvent(new Event('change', { bubbles: true })); const xry = vis(); return { vck, xry }; });
      assert(!sf.vck && sf.xry, `Scan-Feld unverändert: Kombi-Häkchen nur bei XRY (${JSON.stringify(sf)})`);
      assert(page.__errors.length === 0, `Kombi-Auswahl: keine JS-Fehler (${page.__errors.join('; ')})`);
      page.off('dialog'); page.on('dialog', dd => dd.accept());
      await page.close();
    }

    // ---- Details von einer Unterseite geöffnet (LKW / Info & Suche): „Übernehmen“, Storno und Sync lassen die Details vorne ----
    {
      const d = bigData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
      const mk = (hu, pos, st) => ({ rawInput: hu, position: pos, status: st, timestamp: iso(30), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'pallet', dimensions: '120x80x61 CM', grossWeight: '664 KG' });
      d['9008296216'] = { hawb: '9008296216', lastModified: iso(1), totalPiecesExpected: 2, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'AIT', destinationCountry: 'CHINA',
        scannedItems: [mk('0926041005C7', 1, 'Anstehend'), mk('09260410086D', 2, 'Anstehend')] };
      const be = makeBackend(d, {});
      page = await openApp(browser, be, { viewport: { width: 1500, height: 820, deviceScaleFactor: 1 }, query: '?seite=anlieferung&lkw=MAN%201' }); await wait(600);
      const views = () => page.evaluate(() => ({ detail: !document.getElementById('detailView').classList.contains('hidden'), page: !document.getElementById('pageView').classList.contains('hidden'), main: !document.getElementById('mainView').classList.contains('hidden'),
        top: (document.elementFromPoint(700, 300) || document.body).closest('#detailView, #pageView, #mainView')?.id || '', url: location.search }));
      const v0 = await views();
      assert(v0.page && !v0.detail && v0.top === 'pageView', `LKW-Seite offen (${JSON.stringify(v0)})`);
      await page.evaluate(() => document.querySelector('#pageView tr[data-basenumber="9008296216"] .hawb-cell').click()); await wait(500);
      const v1 = await views();
      assert(v1.detail && !v1.page && v1.top === 'detailView' && /sendung=9008296216/.test(v1.url), `Details von der LKW-Seite geöffnet (${JSON.stringify(v1)})`);
      // Übernehmen → Buchung UND Details bleiben vorne (bisher schob sich die LKW-Seite darüber)
      await page.evaluate(() => { document.querySelector('#detailView .pack-select[data-hu="0926041005C7"]').click(); document.querySelector('#detailView .pack-select-apply').click(); }); await wait(800);
      const v2 = await views();
      const booked = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008296216'].scannedItems.filter(i => i.status === 'XRY').length);
      assert(booked === 1 && v2.detail && !v2.page && !v2.main && v2.top === 'detailView', `„Übernehmen“ von der LKW-Seite aus: gebucht, Sendungsdetails bleiben vorne (${JSON.stringify(v2)})`);
      assert(await page.evaluate(() => [...document.querySelectorAll('#detailView .pack-table tbody tr .pack-status')].map(e => e.textContent.trim()).join('|')) === 'XRY|Offen', 'Tabelle in den Details ist aktualisiert (XRY | Offen)');
      // Storno über die Leiste → ebenfalls vorne bleiben
      await page.evaluate(() => { document.querySelector('#detailView .pack-select[data-state="secured"]').click(); document.querySelector('#detailView .pack-select-cancel').click(); }); await wait(800);
      const v3 = await views();
      assert(v3.detail && !v3.page && v3.top === 'detailView', `Storno aus den Details: Details bleiben vorne (${JSON.stringify(v3)})`);
      // Sync von einem anderen Gerät, während die Details offen sind → Details bleiben vorne
      be.store['9007000001'].mitarbeiter = 'Anderes Gerät'; be.store['9007000001'].lastModified = new Date().toISOString(); be.version++;
      await wait(4200);
      const v4 = await views();
      assert(v4.detail && !v4.page && v4.top === 'detailView', `Sync im Hintergrund: Details bleiben vorne (${JSON.stringify(v4)})`);
      // Zurück-Pfeil → LKW-Seite kommt wieder, Details zu
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(500);
      const v5 = await views();
      assert(!v5.detail && v5.page && v5.top === 'pageView' && /seite=anlieferung/.test(v5.url) && !/sendung=/.test(v5.url), `Zurück-Pfeil: LKW-Seite wieder da, Details zu (${JSON.stringify(v5)})`);
      assert(await page.evaluate(() => document.getElementById('pageTitle').textContent.includes('MAN 1')), 'Zurück landet auf derselben LKW-Seite');
      // Dasselbe von „Info & Suche“ aus
      await page.evaluate(() => document.getElementById('pageBackBtn').click()); await wait(400);
      await page.evaluate(() => document.querySelector('.home-tile[data-page="info"]').click()); await wait(500);
      await page.evaluate(() => { const i = document.getElementById('infoSearchInput'); i.value = '9008296216'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await wait(500);
      await page.evaluate(() => document.querySelector('#infoResults tr[data-basenumber="9008296216"] .hawb-cell').click()); await wait(500);
      const i1 = await views();
      assert(i1.detail && !i1.page && /seite=info&sendung=9008296216/.test(i1.url), `Details aus „Info & Suche“ geöffnet (${JSON.stringify(i1)})`);
      await page.evaluate(() => { document.querySelector('#detailView .pack-select[data-hu="0926041005C7"]').click(); document.querySelector('#detailView .pack-select-apply').click(); }); await wait(800);
      const i2 = await views();
      assert(i2.detail && !i2.page && i2.top === 'detailView', `„Übernehmen“ aus „Info & Suche“: Details bleiben vorne (${JSON.stringify(i2)})`);
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(500);
      const i3 = await views();
      assert(!i3.detail && i3.page && /seite=info$/.test(i3.url) && await page.evaluate(() => document.getElementById('infoSearchInput').value === '9008296216'), `Zurück: „Info & Suche“ mit dem Suchtext wieder da (${JSON.stringify(i3)})`);
      assert(page.__errors.length === 0, `Unterseite + Details: keine JS-Fehler (${page.__errors.join('; ')})`);
      await page.close();
    }

    // ---- Maße als drei Felder L × B × H: Einheit je Auftrag (MAN → CM, VW → MM), gespeichert im Importformat ----
    {
      const d = bigData(); const now = new Date().toISOString(); const vvl = '100004158949';
      const mk = (hu, pos, st, dim) => ({ rawInput: hu, position: pos, status: st, timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'Carton', dimensions: dim, grossWeight: '3,200 KG' });
      d['9008295247'] = { hawb: '9008295247', lastModified: now, totalPiecesExpected: 2, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'DHL', destinationCountry: 'CHINA',
        scannedItems: [mk('0926040918D6', 1, 'XRY', '100x 45x10 CM'), mk('0926040918DF', 2, 'Anstehend', '49x33x 16 CM')] };
      d['796206'] = { hawb: '796206', lastModified: now, totalPiecesExpected: 2, mitarbeiter: 'T', isHuListOrder: true, truckId: 'VVL-' + vvl, parentOrderNumber: vvl,
        scannedItems: [{ rawInput: '881226843', sendnr: '8386256', status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, grossWeight: '30 KG', dimensions: '1200x800x600 MM' },
                       { rawInput: '881226844', sendnr: '8386256', status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, grossWeight: '12 KG', dimensions: 'N/A' }] };
      const be = makeBackend(d, {});
      page = await openApp(browser, be, { viewport: { width: 1568, height: 826, deviceScaleFactor: 1 } }); await wait(500);
      const store = base => page.evaluate(b => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))[b], base);
      // MAN „+ Packstück“: drei Felder, Einheit CM im Kopf und hinter den Feldern; Enter läuft L → B → H → Gewicht
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008295247"] .hawb-cell').click()); await wait(400);
      await page.evaluate(() => document.querySelector('#detailView .pack-add-btn').click()); await wait(400);
      const f0 = await page.evaluate(() => { const t = document.querySelector('#huAddModal .hu-add-table'); const r = t.tBodies[0].rows[0];
        return { th: t.tHead.querySelector('.hu-add-dim-cell').textContent.replace(/\s+/g, ' ').trim(), fields: r.querySelectorAll('.dim-field').length, ph: [...r.querySelectorAll('.dim-field')].map(i => i.placeholder).join(''), unit: r.querySelector('.dim-unit').textContent, old: !!r.querySelector('input.hu-add-dim:not(.dim-field)'), fits: t.scrollWidth <= t.closest('.hu-add-table-wrap').clientWidth + 1 }; });
      assert(f0.th === 'Maße (CM)' && f0.fields === 3 && f0.ph === 'LBH' && f0.unit === 'CM' && !f0.old && f0.fits, `MAN: Maße als L × B × H mit Einheit CM, Tabelle passt ohne Querscrollen (${JSON.stringify(f0)})`);
      await page.keyboard.type('0926040918E1'); await page.keyboard.press('Enter'); await wait(80);
      await page.evaluate(() => { const r = document.querySelectorAll('#huAddRows tr')[0]; r.querySelector('.hu-add-pack').value = 'Carton'; r.querySelector('.hu-add-dim-l').focus(); });
      await page.keyboard.type('100'); await page.keyboard.press('Enter'); await page.keyboard.type('45'); await page.keyboard.press('Enter'); await page.keyboard.type('10'); await page.keyboard.press('Enter');
      assert(await page.evaluate(() => document.activeElement.classList.contains('hu-add-weight')), 'Enter in den Maßfeldern: L → B → H → Gewicht');
      await page.keyboard.type('3,2');
      // unvollständige Maße in Zeile 2 → Meldung mit HU, nichts gespeichert
      await page.evaluate(() => { const r = document.querySelectorAll('#huAddRows tr')[1]; r.querySelector('.hu-add-hu').value = '0926040918E2'; r.querySelector('.hu-add-hu').dispatchEvent(new Event('input', { bubbles: true })); r.querySelector('.hu-add-dim-l').value = '50'; document.getElementById('saveHuAddButton').click(); }); await wait(200);
      const e1 = await page.evaluate(() => ({ err: document.getElementById('huAddError').textContent, open: document.getElementById('huAddModal').classList.contains('visible') }));
      assert(/Maße unvollständig/.test(e1.err) && /0926040918E2/.test(e1.err) && e1.open, `Nur Länge ausgefüllt → „Maße unvollständig“ mit HU-Nummer, Seite bleibt offen (${e1.err})`);
      await page.evaluate(() => { const r = document.querySelectorAll('#huAddRows tr')[1]; r.querySelector('.hu-add-dim-l').value = 'abc'; r.querySelector('.hu-add-dim-b').value = '1'; r.querySelector('.hu-add-dim-h').value = '2'; document.getElementById('saveHuAddButton').click(); }); await wait(200);
      assert(/Maße nicht lesbar/.test(await page.$eval('#huAddError', e => e.textContent)), 'Buchstaben in einem Maßfeld → „Maße nicht lesbar“');
      await page.evaluate(() => { const r = document.querySelectorAll('#huAddRows tr')[1]; r.querySelectorAll('.dim-field').forEach(i => { i.value = ''; }); document.getElementById('saveHuAddButton').click(); }); await wait(700);
      const s1 = await store('9008295247');
      const added = s1.scannedItems.slice(2).map(i => [i.rawInput, i.packaging, i.dimensions, i.grossWeight].join('|')).join(' ; ');
      assert(added === '0926040918E1|Carton|100x45x10 CM|3,2 KG ; 0926040918E2|||', `Gespeichert im Rechnungsformat „100x45x10 CM“; Zeile ohne Maße → keine Maße (${added})`);
      assert(await page.evaluate(() => [...document.querySelectorAll('#detailView .pack-table tbody tr')].some(r => /0926040918E1/.test(r.textContent) && /100x45x10 CM/.test(r.textContent))), 'Packstücktabelle zeigt „100x45x10 CM“');
      assert(be.store['9008295247'].scannedItems.some(i => i.dimensions === '100x45x10 CM'), 'Maße sind beim Server angekommen');
      // Stift: Felder werden aus „100x 45x10 CM“ (mit Leerzeichen) vorbelegt; Änderung speichert sauber
      await page.evaluate(() => document.querySelector('#detailView .pack-edit-btn[data-hu="0926040918D6"]').click()); await wait(300);
      const ed = await page.evaluate(() => ({ l: document.getElementById('huEditDimL').value, b: document.getElementById('huEditDimB').value, h: document.getElementById('huEditDimH').value, unit: document.querySelector('#huEditModal .dim-unit').textContent, label: document.querySelector('label[for="huEditDimL"]').textContent }));
      assert(ed.l === '100' && ed.b === '45' && ed.h === '10' && ed.unit === 'CM' && /L × B × H/.test(ed.label), `„Packstück bearbeiten“: Felder aus „100x 45x10 CM“ vorbelegt, Einheit CM (${JSON.stringify(ed)})`);
      await page.evaluate(() => { document.getElementById('huEditDimH').value = '12'; document.getElementById('saveHuEditButton').click(); }); await wait(600);
      assert((await store('9008295247')).scannedItems.find(i => i.rawInput === '0926040918D6').dimensions === '100x45x12 CM', 'Bearbeiten speichert „100x45x12 CM“');
      // Maße komplett leeren → null (keine Maße), kein Fehler
      await page.evaluate(() => document.querySelector('#detailView .pack-edit-btn[data-hu="0926040918D6"]').click()); await wait(300);
      await page.evaluate(() => { ['huEditDimL', 'huEditDimB', 'huEditDimH'].forEach(id => { document.getElementById(id).value = ''; }); document.getElementById('saveHuEditButton').click(); }); await wait(600);
      assert((await store('9008295247')).scannedItems.find(i => i.rawInput === '0926040918D6').dimensions === null && !(await page.evaluate(() => document.getElementById('huEditModal').classList.contains('visible'))), 'Alle drei Felder leer → Maße entfernt, Fenster zu');
      // VW-Auftrag: Einheit MM (aus dem Import), Speichern „1200x800x600 MM“; N/A → Felder leer; Dezimalzahl mit Komma
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="796206"] .hawb-cell').click()); await wait(400);
      await page.evaluate(() => document.querySelector('#detailView .pack-add-btn').click()); await wait(400);
      const v0 = await page.evaluate(() => { const t = document.querySelector('#huAddModal .hu-add-table'); return { th: t.tHead.querySelector('.hu-add-dim-cell').textContent.replace(/\s+/g, ' ').trim(), unit: t.querySelector('.dim-unit').textContent, fits: t.scrollWidth <= t.closest('.hu-add-table-wrap').clientWidth + 1, x: !!t.querySelector('.hu-add-remove') && t.querySelector('.hu-add-remove').getBoundingClientRect().right <= t.closest('.hu-add-table-wrap').getBoundingClientRect().right + 1 }; });
      assert(v0.th === 'Maße (MM)' && v0.unit === 'MM' && v0.fits && v0.x, `VW: Einheit MM, Tabelle mit Sendungs-Nr.-Spalte passt vollständig (${JSON.stringify(v0)})`);
      await page.keyboard.type('881226999'); await page.keyboard.press('Enter'); await wait(80);
      await page.evaluate(() => { const r = document.querySelectorAll('#huAddRows tr')[0]; r.querySelector('.hu-add-dim-l').value = '1200'; r.querySelector('.hu-add-dim-b').value = '800'; r.querySelector('.hu-add-dim-h').value = '600'; document.getElementById('saveHuAddButton').click(); }); await wait(700);
      assert((await store('796206')).scannedItems.find(i => i.rawInput === '881226999').dimensions === '1200x800x600 MM', 'VW: gespeichert als „1200x800x600 MM“ (wie der VVL-Import)');
      await page.evaluate(() => document.querySelector('#detailView .pack-edit-btn[data-hu="881226844"]').click()); await wait(300);
      const ve = await page.evaluate(() => ({ l: document.getElementById('huEditDimL').value, unit: document.querySelector('#huEditModal .dim-unit').textContent }));
      assert(ve.l === '' && ve.unit === 'MM', `VW-Packstück mit „N/A“: Felder leer, Einheit MM (${JSON.stringify(ve)})`);
      await page.evaluate(() => { document.getElementById('huEditDimL').value = '500'; document.getElementById('huEditDimB').value = '40'; document.getElementById('huEditDimH').value = '30,5'; document.getElementById('saveHuEditButton').click(); }); await wait(600);
      assert((await store('796206')).scannedItems.find(i => i.rawInput === '881226844').dimensions === '500x40x30,5 MM', 'Dezimalzahl mit Komma bleibt erhalten („500x40x30,5 MM“)');
      // „+ Auftrag“ (neuer MAN-Auftrag): Felder L × B × H, gespeichert in CM
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await page.evaluate(() => document.querySelector('.home-tile[data-page="anlieferung"]').click()); await wait(400);
      await page.evaluate(() => document.querySelector('.page-row[data-truckid="MAN 1"]').click()); await wait(500);
      await page.evaluate(() => document.querySelector('.page-summary-add').click()); await wait(400);
      const oa = await page.evaluate(() => { const g = document.querySelector('#orderAddModal .order-add-grid-3'); const fields = [...g.querySelectorAll('.dim-field')]; const gr = g.getBoundingClientRect();
        return { n: fields.length, unit: g.querySelector('.dim-unit').textContent, inside: fields.every(f => f.getBoundingClientRect().right <= gr.right + 1) && document.getElementById('orderAddWeight').getBoundingClientRect().right <= gr.right + 1, old: !!document.getElementById('orderAddDimensions') }; });
      assert(oa.n === 3 && oa.unit === 'CM' && oa.inside && !oa.old, `„+ Auftrag“: drei Maßfelder in CM, alles innerhalb des Fensters (${JSON.stringify(oa)})`);
      await page.evaluate(() => { document.getElementById('orderAddNumber').value = '9008299999'; document.getElementById('orderAddForwarder').value = 'DHL'; document.getElementById('orderAddCountry').value = 'CHINA'; document.getElementById('orderAddHu').value = 'NEU0001'; document.getElementById('orderAddDimL').value = '120'; document.getElementById('orderAddDimB').value = '80'; document.getElementById('orderAddDimH').value = '60'; document.getElementById('saveOrderAddButton').click(); }); await wait(800);
      assert((await store('9008299999')).scannedItems[0].dimensions === '120x80x60 CM', '„+ Auftrag“: erstes Packstück mit „120x80x60 CM“');
      assert(page.__errors.length === 0, `Maßfelder: keine JS-Fehler (${page.__errors.join('; ')})`);
      await page.close();
    }

    // ---- Packstücke löschen: Auswahl-Leiste + „Packstück löschen“ im Bearbeiten-Fenster (Kunde: HU kommt nicht) ----
    {
      const d = bigData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
      const mk = (hu, pos, st, extra) => Object.assign({ rawInput: hu, position: pos, status: st, timestamp: iso(30 - pos), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'Carton', dimensions: '10x10x10 CM', grossWeight: '5 KG' }, extra || {});
      d['9008295951'] = { hawb: '9008295951', lastModified: iso(1), totalPiecesExpected: 5, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'DHL', destinationCountry: 'AUSTRALIEN',
        scannedItems: [mk('DEL0001', 1, 'Anstehend'), mk('DEL0002', 2, 'XRY'), mk('DEL0002', 2, 'Wareneingang'), mk('DEL0003', 3, 'Anstehend'), mk('DEL0003', 3, 'VCK', { isCombination: true }), mk('DEL0004', 4, 'Anstehend', { notes: ['Notiz'] }), mk('DEL0005', 5, 'Anstehend')] };
      const be = makeBackend(d, {});
      page = await openApp(browser, be, { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } }); await wait(500);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008295951"] .hawb-cell').click()); await wait(400);
      const kolli = () => page.evaluate(() => ([...document.querySelectorAll('#detailView .detail-fact')].map(f => f.textContent.replace(/\s+/g, '')).find(t => /^Kolli/i.test(t)) || '').replace(/^Kolli/i, ''));
      assert(await kolli() === '5', `Kolli vor dem Löschen 5 (${await kolli()})`);
      // gesichertes (mit WE) + offenes Packstück (mit Kombi-Zeile) wählen → „Löschen“ in der Leiste
      await page.evaluate(() => { const b = [...document.querySelectorAll('#detailView .pack-select')]; b.find(x => x.dataset.hu === 'DEL0002').click(); b.find(x => x.dataset.hu === 'DEL0003' && x.dataset.state === 'open').click(); }); await wait(150);
      const db0 = await page.evaluate(() => ({ count: document.querySelector('.pack-select-count').textContent, del: !document.querySelector('.pack-select-group-delete').classList.contains('hidden'), text: document.querySelector('.pack-select-delete').textContent.trim() }));
      assert(db0.count === '2 ausgewählt (1 offen · 1 gesichert)' && db0.del && db0.text === 'Löschen', `Leiste zeigt „Löschen“ für offene wie gesicherte (${JSON.stringify(db0)})`);
      // Rückfrage abgelehnt → nichts passiert
      page.off('dialog'); const declineDel = dlg => { dlg.dismiss(); page.off('dialog', declineDel); page.on('dialog', dd => dd.accept()); }; page.on('dialog', declineDel);
      await page.evaluate(() => document.querySelector('#detailView .pack-select-delete').click()); await wait(400);
      assert(await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008295951'].scannedItems.length) === 7, 'Löschen abgelehnt → nichts entfernt');
      await page.evaluate(() => document.querySelector('#detailView .pack-select-delete').click()); await wait(800);
      const db1 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008295951']; return { items: s.scannedItems.map(i => i.rawInput + ':' + i.status).join(' '), exp: s.totalPiecesExpected, rows: document.querySelectorAll('#detailView .pack-table tbody tr').length, meta: document.querySelector('#detailView .detail-pack-meta').textContent, head: document.querySelector('#detailView .detail-pack-head h4').textContent, bar: document.querySelector('#detailView .pack-select-bar').classList.contains('hidden'), detail: getComputedStyle(document.getElementById('detailView')).display !== 'none' }; });
      assert(db1.items === 'DEL0001:Anstehend DEL0004:Anstehend DEL0005:Anstehend' && db1.exp === 3 && db1.rows === 3 && db1.meta === '3 offen' && db1.head === 'Packstücke (3)' && db1.bar && db1.detail, `Auswahl gelöscht: alle Einträge der HUs weg (auch WE + Kombi), Kolli 5 → 3, Details bleiben offen (${JSON.stringify(db1)})`);
      assert(await kolli() === '3', `Kopfzeile Kolli 3 (${await kolli()})`);
      assert(be.store['9008295951'].scannedItems.map(i => i.rawInput).join() === 'DEL0001,DEL0004,DEL0005' && be.store['9008295951'].totalPiecesExpected === 3, 'Löschung ist beim Server angekommen (Einträge + Kolli)');
      // Stift → „Packstück löschen“ für eine einzelne HU
      await page.evaluate(() => document.querySelector('#detailView .pack-edit-btn[data-hu="DEL0004"]').click()); await wait(300);
      assert(await page.evaluate(() => { const b = document.getElementById('deleteHuEditButton'); return !!b && b.offsetParent !== null && b.textContent.trim() === 'Packstück löschen'; }), 'Bearbeiten-Fenster zeigt „Packstück löschen“');
      await page.evaluate(() => document.getElementById('deleteHuEditButton').click()); await wait(800);
      const db2 = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008295951']; return { items: s.scannedItems.map(i => i.rawInput).join(), exp: s.totalPiecesExpected, modal: document.getElementById('huEditModal').classList.contains('visible'), detail: getComputedStyle(document.getElementById('detailView')).display !== 'none' }; });
      assert(db2.items === 'DEL0001,DEL0005' && db2.exp === 2 && !db2.modal && db2.detail, `Einzelnes Packstück über den Stift gelöscht, Kolli 2, Fenster zu, Details offen (${JSON.stringify(db2)})`);
      // Letztes Packstück: gesperrt (dafür „Sendung löschen“)
      await page.evaluate(() => document.querySelector('#detailView .pack-select-all').click()); await wait(150);
      await page.evaluate(() => document.querySelector('#detailView .pack-select-delete').click()); await wait(500);
      const db3 = await page.evaluate(() => ({ err: document.getElementById('errorDisplay').textContent, n: JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9008295951'].scannedItems.length }));
      assert(/letzte Packstück kann nicht gelöscht/.test(db3.err) && db3.n === 2, `Alle wählen + Löschen → gesperrt, nichts entfernt (${JSON.stringify(db3)})`);
      // Einzelsendung („Stück bearbeiten“): kein Löschen-Knopf
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await page.evaluate(() => document.querySelector('tr[data-basenumber="123"] .hawb-cell').click()); await wait(400);
      await page.evaluate(() => document.querySelector('#detailView .pack-edit-btn').click()); await wait(300);
      assert(await page.evaluate(() => document.getElementById('huEditModal').classList.contains('piece-mode') && getComputedStyle(document.getElementById('deleteHuEditButton').parentElement).display === 'none'), 'Stück einer Einzelsendung: kein „Packstück löschen“');
      await page.evaluate(() => document.getElementById('cancelHuEditButton').click()); await wait(200);
      assert(page.__errors.length === 0, `Keine JS-Fehler beim Löschen (${page.__errors.join(' | ')})`);
      await page.close();
    }

    // ---- Sicherungsnachweis: PDF-Knopf öffnet ein PDF im neuen Tab (Detail-Kopfzeile, Liste, VVL-Sammelnachweis) ----
    {
      const d = bigData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
      const mk = (hu, pos, st, extra) => Object.assign({ rawInput: hu, position: pos, status: st, timestamp: iso(60 - pos), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'Carton', dimensions: '10x10x10 CM', grossWeight: '5 KG' }, extra || {});
      d['9008295951'] = { hawb: '9008295951', lastModified: iso(1), totalPiecesExpected: 3, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'DHL', destinationCountry: 'AUSTRALIEN', plsoNumber: '318101',
        scannedItems: [mk('PDF0001', 1, 'XRY'), mk('PDF0001', 1, 'Wareneingang'), mk('PDF0002', 2, 'Anstehend'), mk('PDF0002', 2, 'VCK', { isCombination: true }), mk('PDF0003', 3, 'Anstehend', { notes: ['Notiz A'] })] };
      const vw = (vse, sn, st) => ({ rawInput: vse, sendnr: sn, status: st, timestamp: iso(30), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'GLT', dimensions: '1200x800x600 MM', grossWeight: '100 KG' });
      d['796201'] = { hawb: '796201', lastModified: iso(2), totalPiecesExpected: 1, mitarbeiter: 'T', isHuListOrder: true, truckId: 'VVL-100004158949', parentOrderNumber: '100004158949', scannedItems: [vw('881288686', '7000001', 'ETD'), vw('881288686', '7000001', 'Wareneingang')] };
      d['938203'] = { hawb: '938203', lastModified: iso(2), totalPiecesExpected: 2, mitarbeiter: 'T', isHuListOrder: true, truckId: 'VVL-100004158949', parentOrderNumber: '100004158949', scannedItems: [vw('881292001', '8000001', 'XRY'), vw('881292002', '8000002', 'Anstehend')] };
      const be = makeBackend(d, {});
      page = await openApp(browser, be, { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } }); await wait(500);
      // window.open abfangen (Tab sofort im Klick, URL danach) und PDF-Text auslesen
      const hook = () => page.evaluate(() => { window.__opened = []; window.__openCalls = 0; window.open = () => { window.__openCalls++; const t = { closed: false, location: {}, close() { this.closed = true; } }; Object.defineProperty(t.location, 'href', { set(v) { window.__opened.push(v); } }); return t; }; });
      const pdfText = async () => { const u = (await page.evaluate(() => window.__opened))[0]; if (!u) return null; const b64 = await page.evaluate(async (u) => { const r = await fetch(u); const b = await r.blob(); return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(b); }); }, u); const buf = Buffer.from(b64, 'base64'); const head = buf.slice(0, 5).toString(); // Textinhalt: unkomprimierte jsPDF-Streams enthalten die Strings als (…) Tj – hier reicht Größe/Typ + Seitenzahl
        return { pdf: head === '%PDF-', bytes: buf.length, pages: (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length }; };
      await hook();
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008295951"] .hawb-cell').click()); await wait(400);
      await page.evaluate(() => document.querySelector('#detailView .detail-actions .pdf-btn').click()); await wait(1200);
      const p1 = await pdfText(); const calls1 = await page.evaluate(() => ({ calls: window.__openCalls, urls: window.__opened.length, detail: getComputedStyle(document.getElementById('detailView')).display !== 'none', err: document.getElementById('errorDisplay').textContent }));
      assert(p1 && p1.pdf && p1.bytes > 20000 && p1.pages === 1 && calls1.calls === 1 && calls1.urls === 1 && calls1.detail && calls1.err === '', `Detail-Kopfzeile: PDF-Knopf öffnet neuen Tab mit 1-seitigem PDF (Erklärung + Packstückliste), Details bleiben offen (${JSON.stringify(Object.assign({}, p1, calls1))})`);
      // Kein Mail-Aufruf mehr an das Backend
      assert(!be.actions.some(a => a === 'sendPdfEmail'), 'Kein „sendPdfEmail“ mehr an den Server');
      // Liste: PDF-Knopf in der Zeile
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await hook();
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008295951"] .pdf-btn').click()); await wait(1200);
      const p2 = await pdfText();
      assert(p2 && p2.pdf && p2.pages === 1, `Liste: PDF-Knopf in der Zeile öffnet den Nachweis (${JSON.stringify(p2)})`);
      // VVL: ein Dokument für alle Aufträge der Vorverladeliste
      await hook();
      await page.evaluate(() => document.querySelector('tr[data-basenumber="796201"] .pdf-btn').click()); await wait(1200);
      const p3 = await pdfText();
      assert(p3 && p3.pdf && p3.pages === 3 && p3.bytes > p1.bytes * 0.8, `VW: Sammelnachweis für die VVL = Übersicht + je Auftrag eine Seite (${JSON.stringify(p3)})`);
      // Inhalt prüfen: jsPDF komprimiert nicht standardmäßig → Texte stehen als Klartext im PDF
      // PDF-Text liegt als WinAnsi (latin1) vor; Klammern sind mit Backslash maskiert → ohne Klammern prüfen
      const pdfRaw = async () => Buffer.from(await page.evaluate(async () => { const r = await fetch(window.__opened[0]); const b = await r.arrayBuffer(); return Array.from(new Uint8Array(b)); }), 'binary').toString('latin1');
      const raw = await pdfRaw();
      const has = t => raw.includes(t);
      assert(has('Vorverladeliste 100004158949') && has('Kundennr. 796201') && has('Kundennr. 938203') && has('881292002') && has('7000001'), 'VW-Nachweis enthält beide Kundennummern, VSE und Sendungs-Nr.');
      assert(has('bersicht Vorverladeliste 100004158949') && has('2 Aufträge') && has('noch nicht kontrolliert') && has('Auftrag 2 von 2'), 'VW-Nachweis: Übersicht der VVL, Hinweis auf offene Packstücke, Aufträge nummeriert');
      // Packstückliste einzeilig: VSE und Sendungs-Nr. als zwei Spalten, Einheit im Kopf „Maße (mm)“, Gewicht als „100 kg“ (statt „100 KG“ / „1200x800x600 MM“ in der Zelle)
      assert(has('Sendungs-Nr.') && !has('VSE\nSendungs') && has('Maße \\(mm\\)') && has('1200 × 800 × 600') && !has('1200x800x600 MM') && has('100 kg') && !has('100 KG'), 'VW-Nachweis: VSE/Sendungs-Nr. nebeneinander, Maße ohne Einheit in der Zelle, Gewicht normalisiert');
      // Übersicht: Gewicht je Auftrag + Summenzeile (796201 = 100 kg, 938203 = 200 kg → 300 kg); je Auftrag Summenzeile unter der Liste
      assert(has('Gewicht') && has('Gesamt') && has('300 kg') && has('200 kg') && has('Gesamt · 2 Packstücke') && has('Gesamt · 1 Packstück'), 'VW-Nachweis: Gewicht in der Übersicht mit Gesamtsumme, Summenzeile je Auftrag');
      assert(!has('PLSO'), 'VW-Nachweis: keine PLSO/Spediteur-Zeile (nur bei MAN)');
      // MAN-Inhalt
      await hook();
      await page.evaluate(() => document.querySelector('tr[data-basenumber="9008295951"] .pdf-btn').click()); await wait(1200);
      const raw2 = await pdfRaw();
      const h2 = t => raw2.includes(t);
      assert(h2('Rechnung 9008295951') && h2('PDF0001') && h2('PDF0003') && h2('Bemerkung zu PDF0003: Notiz A') && h2('VCK') && h2('Kombi'), 'MAN-Nachweis: Rechnung, HUs, Bemerkung als eigene Zeile, Kombi enthalten');
      assert(h2('NICHT ERTEILT') && h2('2 von 3 Packstücken noch nicht kontrolliert') && h2('Röntgenkontrolle') && h2('Sichtkontrolle'), 'MAN-Nachweis: Status NICHT ERTEILT bei offenen Packstücken, Kontrollmethoden im Klartext');
      assert(h2('Maße \\(cm\\)') && h2('10 × 10 × 10') && h2('5 kg') && !h2('5 KG'), 'MAN-Nachweis: Einheit cm im Spaltenkopf, Gewicht normalisiert');
      // MAN: PLSO · Spediteur · Land unter dem Titel; Summenzeile mit Gesamtgewicht (3 Packstücke × 5 kg)
      assert(h2('PLSO 318101') && h2('Spediteur DHL') && h2('Land AUSTRALIEN') && h2('Gesamt · 3 Packstücke') && h2('15 kg'), 'MAN-Nachweis: PLSO/Spediteur/Land unter dem Titel, Gesamtgewicht in der Summenzeile');
      // Genau vier Kopfzeilen (Status, Methode, erteilt von/am, RegB) – kein Erklärungsblock, keine Legende, keine Unterschriftsfelder
      assert(h2('Sicherheitsstatus') && h2('Kontrollmethode') && h2('Erteilt von / am') && h2('RegB-Nummer') && h2('DE/RA/00889-07') && h2('6.3.2.6') && h2('ohne Unterschrift') && !h2('Inhalt der Sendung') && !h2('Legende') && !h2('Unterschrift:'), 'MAN-Nachweis: vier Kopfzeilen + RegB-Nummer, kein Erklärungsblock/Legende/Unterschriftsfeld');
      // Vollständig gesicherte Einzelsendung → SPX mit Name + Zeitpunkt der Erteilung
      await hook();
      await page.evaluate(() => document.querySelector('tr[data-basenumber="123"] .pdf-btn').click()); await wait(1200);
      const raw3 = await pdfRaw();
      assert(raw3.includes('SPX') && raw3.includes('das Packstück wurde kontrolliert') && /Erteilt von \/ am/.test(raw3) && !raw3.includes('NICHT ERTEILT') && !raw3.includes('noch nicht erteilt'), 'Einzelsendung 123 vollständig gesichert: Status SPX, erteilt von/am gefüllt');
      assert(page.__errors.length === 0, `Keine JS-Fehler beim PDF (${page.__errors.join(' | ')})`);
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
      // „+ Packstück“ bei VW: Spalten VSE · Sendungs-Nr. (ohne Pos.), Sendungs-Nr. vorbelegt, gespeicherte Position trägt sendnr
      await page.evaluate(() => document.querySelector('#detailView .pack-add-btn').click()); await wait(300);
      const va = await page.evaluate(() => ({ head: [...document.querySelectorAll('#huAddModal .hu-add-table thead th')].map(t => t.textContent.trim()).join('|'), ctx: document.getElementById('huAddContext').textContent,
        sn: [...document.querySelectorAll('#huAddRows .hu-add-sendnr')].map(i => i.value).join(), pos: document.querySelectorAll('#huAddRows .hu-add-pos').length, ph: document.querySelector('#huAddRows .hu-add-hu').placeholder, focus: document.activeElement.className }));
      assert(va.head === 'VSE|Sendungs-Nr.|Verpackung|Maße (MM)|Gewicht|' && va.pos === 0 && va.sn === ',,' && /VSE/.test(va.ph) && va.focus === 'hu-add-hu' && va.ctx === 'Kundennr 959201 · VVL 100004158949 · bisher 9 Packstücke', `VW „+ Packstück“: VSE · Sendungs-Nr. statt Pos. · HU, Sendungs-Nr. leer (${JSON.stringify(va)})`);
      assert(await page.evaluate(() => document.querySelector('#huAddRows .hu-add-sendnr').placeholder === 'optional'), 'VW: Sendungs-Nr. als „optional“ gekennzeichnet');
      await page.keyboard.type('881226999'); await page.keyboard.press('Enter');
      await page.evaluate(() => { const rows = document.querySelectorAll('#huAddRows tr'); rows[1].querySelector('.hu-add-hu').value = '881227000'; rows[1].querySelector('.hu-add-sendnr').value = '8386300'; rows[1].querySelector('.hu-add-hu').dispatchEvent(new Event('input', { bubbles: true })); });
      // unlesbare Sendungs-Nr. wird abgelehnt, leere ist erlaubt
      await page.evaluate(() => { document.querySelectorAll('#huAddRows tr')[0].querySelector('.hu-add-sendnr').value = '83/86'; document.getElementById('saveHuAddButton').click(); }); await wait(200);
      assert(await page.evaluate(() => /nicht lesbar/.test(document.getElementById('huAddError').textContent) && document.getElementById('huAddModal').classList.contains('visible')), 'VW: unlesbare Sendungs-Nr. wird gemeldet');
      await page.evaluate(() => { document.querySelectorAll('#huAddRows tr')[0].querySelector('.hu-add-sendnr').value = ''; document.getElementById('saveHuAddButton').click(); }); await wait(700);
      const vs = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['959201']; const added = s.scannedItems.slice(9);
        return { modal: document.getElementById('huAddModal').classList.contains('visible'), tot: s.totalPiecesExpected, added: added.map(i => i.rawInput + ':' + ('sendnr' in i ? i.sendnr : '-') + ':' + i.status + ':' + i.position).join(' '), rows: document.querySelectorAll('#detailView .pack-table tbody tr').length,
          shown: [...document.querySelectorAll('#detailView .pack-table tbody tr')].filter(r => /88122(6999|7000)/.test(r.textContent)).map(r => r.cells[1].textContent.trim() + '|' + r.cells[2].textContent.trim()).join(' ') }; });
      assert(!vs.modal && vs.tot === 11 && vs.added === '881226999:-:Anstehend:null 881227000:8386300:Anstehend:null' && vs.rows === 11 && vs.shown === '881227000|8386300 881226999|–', `VW: 2 Positionen angelegt (Tabelle noch nach Sendungs-Nr. sortiert, leere unten) – eine ohne, eine mit Sendungs-Nr. (${JSON.stringify(vs)})`);
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

    // ---- Anlieferung (Desktop): LKW umbenennen (Anzeigename, per Sync überall) und LKW mit allen Aufträgen löschen ----
    {
      const be = makeBackend(bigData(), {});
      page = await openApp(browser, be, { viewport: { width: 1400, height: 900, deviceScaleFactor: 1 }, query: '?seite=anlieferung' }); await wait(600);
      const tools = await page.evaluate(() => ({ rows: document.querySelectorAll('.page-row[data-truckid]').length, rename: document.querySelectorAll('[data-lkw-rename]').length, del: document.querySelectorAll('[data-lkw-delete]').length,
        nested: !!document.querySelector('.page-row [data-lkw-rename]'), visible: getComputedStyle(document.querySelector('.page-row-tool')).display !== 'none', icon: getComputedStyle(document.querySelector('.page-row-rename'), '::before').maskImage !== 'none' }));
      assert(tools.rows === 2 && tools.rename === 2 && tools.del === 2 && !tools.nested && tools.visible && tools.icon, `Anlieferung: je LKW Stift und Papierkorb (nicht im Zeilen-Knopf verschachtelt) (${JSON.stringify(tools)})`);
      // Umbenennen: Dialog öffnet mit Standardname als Platzhalter, Speichern setzt truckName an alle Sendungen des LKW
      await page.evaluate(() => document.querySelector('[data-lkw-rename="MAN 1"]').click()); await wait(200);
      const dlg = await page.evaluate(() => ({ open: document.getElementById('lkwRenameModal').classList.contains('visible'), ph: document.getElementById('lkwRenameName').placeholder, val: document.getElementById('lkwRenameName').value, ctx: document.getElementById('lkwRenameContext').textContent, pageStill: !!document.querySelector('.page-row[data-truckid="MAN 1"]') }));
      assert(dlg.open && dlg.ph === 'MAN 1' && dlg.val === '' && /MAN 1 · 8 Aufträge/.test(dlg.ctx) && dlg.pageStill, `Umbenennen-Dialog: offen, Standardname als Platzhalter, Seite bleibt (${JSON.stringify(dlg)})`);
      await page.evaluate(() => { const i = document.getElementById('lkwRenameName'); i.value = '  Wolfsburg   Dienstag '; document.getElementById('saveLkwRenameButton').click(); }); await wait(500);
      const renamed = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored')); const man = Object.values(st).filter(s => s.truckId === 'MAN 1'); const vw = Object.values(st).filter(s => s.truckId === 'VVL-4711');
        return { closed: !document.getElementById('lkwRenameModal').classList.contains('visible'), names: [...new Set(man.map(s => s.truckName))].join(), ids: [...new Set(man.map(s => s.truckId))].join(), vwUntouched: vw.every(s => !s.truckName),
          title: document.querySelector('.page-row[data-truckid="MAN 1"] .page-row-title').textContent, sub: document.querySelector('.page-row[data-truckid="MAN 1"] .page-row-sub').textContent, menu: document.querySelector('.lkw-menu-item[data-truckid="MAN 1"]').textContent.replace(/\s+/g, ' ').trim() }; });
      assert(renamed.closed && renamed.names === 'Wolfsburg Dienstag' && renamed.ids === 'MAN 1' && renamed.vwUntouched, `Umbenennen: truckName an allen 8 MAN-Aufträgen, Kennung unverändert, VW unberührt (${JSON.stringify(renamed)})`);
      assert(renamed.title === 'Wolfsburg Dienstag' && /^MAN 1 · 8 Aufträge/.test(renamed.sub) && /Wolfsburg Dienstag/.test(renamed.menu), `Anzeigename in Anlieferung (mit Kennung darunter) und im Menü (${JSON.stringify({ title: renamed.title, sub: renamed.sub, menu: renamed.menu })})`);
      const sent = be.actions.filter(a => a === 'saveShipments').length;
      assert(sent >= 1 && Object.values(be.store).filter(s => s.truckId === 'MAN 1').every(s => s.truckName === 'Wolfsburg Dienstag'), `Anzeigename ging an den Server (saveShipments ×${sent}) – erreicht so alle Geräte`);
      // LKW-Seite, Sendungsliste, Info-Auswahl und Sendungsdetails zeigen den Namen; Adresse nutzt weiter die Kennung
      await page.evaluate(() => document.querySelector('.page-row[data-truckid="MAN 1"]').click()); await wait(500);
      const lkwPage = await page.evaluate(() => ({ title: document.getElementById('pageTitle').textContent.trim(), url: new URL(location.href).searchParams.get('lkw'), chip: document.querySelector('#pageContent tr[data-basenumber="9007000001"] .dt-truck-chip').textContent }));
      assert(/Wolfsburg Dienstag$/.test(lkwPage.title) && lkwPage.url === 'MAN 1' && lkwPage.chip === 'Wolfsburg Dienstag', `LKW-Seite: Titel und LKW-Spalte mit Anzeigename, Adresse ?lkw=MAN 1 (${JSON.stringify(lkwPage)})`);
      await page.evaluate(() => document.querySelector('#pageContent tr[data-basenumber="9007000001"] .hawb-cell').click()); await wait(500);
      assert(await page.evaluate(() => /Wolfsburg Dienstag/.test(document.querySelector('#detailView .detail-crumb[data-crumb-page="lkw"]').textContent)), 'Sendungsdetails: Pfad zeigt den Anzeigenamen');
      await page.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(200);
      await page.evaluate(() => document.getElementById('pageBackBtn').click()); await wait(300);
      // Doppelter Name wird abgelehnt; leer = zurück zum Standardnamen
      await page.evaluate(() => document.querySelector('[data-lkw-rename="VVL-4711"]').click()); await wait(200);
      await page.evaluate(() => { document.getElementById('lkwRenameName').value = 'Wolfsburg Dienstag'; document.getElementById('saveLkwRenameButton').click(); }); await wait(300);
      const dup = await page.evaluate(() => ({ open: document.getElementById('lkwRenameModal').classList.contains('visible'), err: document.getElementById('lkwRenameError').textContent }));
      assert(dup.open && /gibt es schon/.test(dup.err), `Doppelter Anzeigename wird abgelehnt (${JSON.stringify(dup)})`);
      await page.evaluate(() => document.getElementById('cancelLkwRenameButton').click()); await wait(200);
      await page.evaluate(() => document.querySelector('[data-lkw-rename="MAN 1"]').click()); await wait(200);
      assert(await page.evaluate(() => document.getElementById('lkwRenameName').value === 'Wolfsburg Dienstag'), 'Dialog zeigt den vergebenen Namen zum Ändern');
      await page.evaluate(() => { document.getElementById('lkwRenameName').value = ''; document.getElementById('saveLkwRenameButton').click(); }); await wait(500);
      const reset = await page.evaluate(() => ({ title: document.querySelector('.page-row[data-truckid="MAN 1"] .page-row-title').textContent, stored: Object.values(JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))).filter(s => s.truckId === 'MAN 1').every(s => !('truckName' in s)) }));
      assert(reset.title === 'MAN 1' && reset.stored, `Leer speichern = Standardname zurück, truckName entfernt (${JSON.stringify(reset)})`);
      // Löschen: Rückfrage (Dialoge werden im Test bestätigt) → alle Aufträge des LKW weg, LKW-Status-Eintrag weg, Löschvermerke an den Server
      await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('frachtLkwStatusV1') || '{}'); st['VVL-4711'] = false; localStorage.setItem('frachtLkwStatusV1', JSON.stringify(st)); });
      const beforeDel = be.actions.length;
      await page.evaluate(() => document.querySelector('[data-lkw-delete="VVL-4711"]').click()); await wait(800);
      const del = await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored')); return { left: Object.values(st).filter(s => s.truckId === 'VVL-4711').length, man: Object.values(st).filter(s => s.truckId === 'MAN 1').length, single: !!st['123'],
        rows: [...document.querySelectorAll('.page-row[data-truckid]')].map(r => r.dataset.truckid).join(), status: 'VVL-4711' in JSON.parse(localStorage.getItem('frachtLkwStatusV1') || '{}') }; });
      const delActions = be.actions.slice(beforeDel).filter(a => a === 'deleteShipment').length;
      assert(del.left === 0 && del.man === 8 && del.single && del.rows === 'MAN 1' && !del.status && delActions === 6, `LKW löschen: 6 VW-Aufträge weg (MAN 1 und Einzelsendung bleiben), Status-Eintrag entfernt, 6 Löschvermerke an den Server (${JSON.stringify(del)}, deleteShipment ×${delActions})`);
      assert(page.__errors.length === 0, `LKW umbenennen/löschen: keine JS-Fehler (${page.__errors.join('; ')})`);
      await page.close();
      // Handy: Anlieferung ohne Stift/Papierkorb, Karte unverändert
      page = await openApp(browser, makeBackend(bigData(), {}), { query: '?seite=anlieferung' }); await wait(500);
      assert(await page.evaluate(() => !document.querySelector('[data-lkw-rename], [data-lkw-delete], .page-row-wrap') && document.querySelectorAll('.page-row[data-truckid]').length === 2), 'Handy: Anlieferung unverändert (kein Umbenennen/Löschen)');
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
