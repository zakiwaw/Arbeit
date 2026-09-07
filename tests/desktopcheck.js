// Desktop-Tabelle (≥ 992 px): Zusatzspalten, Sortierung, Klicks; Handy-Darstellung unverändert
const { launch, makeBackend, openApp, sampleData, scan, assert, finish } = require('./helpers');
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
    let page = await openApp(browser, makeBackend(bigData(), {}), { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } });
    const rows = await page.$$eval('#shipmentTableBody tr[data-basenumber]', r => r.length);
    assert(rows === 15, `Desktop-Startseite zeigt 15 Zeilen (${rows})`);
    const head = await page.$eval('#shipmentTableBody', tb => [...tb.closest('table').querySelectorAll('thead th')].filter(t => getComputedStyle(t).display !== 'none').map(t => t.textContent.trim()));
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
    assert(page.__errors.length === 0, `Desktop: keine JS-Fehler (${page.__errors.join('; ')})`);
    await page.close();

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
    await page.goBack(); await wait(300);
    await page.evaluate(() => document.querySelector('.home-tile[data-page="info"]').click()); await wait(500);
    const mobInfo = await page.evaluate(() => ({ rows: document.querySelectorAll('#infoResults tr[data-basenumber]').length, head: getComputedStyle(document.querySelector('.info-form-head')).display, cols: getComputedStyle(document.querySelector('.info-layout')).gridTemplateColumns, note: document.getElementById('infoResultNote').textContent.slice(0, 20) }));
    assert(mobInfo.rows === 0 && mobInfo.head === 'none' && mobInfo.cols === 'none' && /Suchbegriff/.test(mobInfo.note), `Handy-Info unverändert: Filter oben, erst nach Eingabe Treffer (${JSON.stringify(mobInfo)})`);
    assert(page.__errors.length === 0, `Handy: keine JS-Fehler (${page.__errors.join('; ')})`);
  } finally { await browser.close(); finish(); }
})().catch(e => { console.error('ERR', e); process.exit(1); });
