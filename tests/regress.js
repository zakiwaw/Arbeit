// Grundfunktionen: Laden, Einzelscan, neue Sendung, Batch-Modus, Startseite/Unterseiten, Info-Filter, Seitenmenü
const { launch, makeBackend, openApp, sampleData, scan, setBatchMode, assert, finish } = require('./helpers');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await launch();
  try {
    const be = makeBackend(sampleData(), {});
    const page = await openApp(browser, be);
    assert((await page.$$eval('tr[data-basenumber]', r => r.length)) === 3, 'Startseite zeigt 3 Sendungen');
    assert((await page.$eval('#tileOffenCount', e => e.textContent.trim())) !== '', 'Kachel „Offene Sendungen“ hat einen Zähler');
    await scan(page, 'HU1001', 500);
    let store = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored')));
    assert(store['9007000001'].scannedItems.find(i => i.rawInput === 'HU1001').status !== 'Anstehend', 'Einzelscan HU1001 setzt Status');
    await wait(600);
    assert(be.actions.includes('saveShipments'), 'Scan wird zum Backend gespeichert (saveShipments)');
    await scan(page, '55512345+0001', 400);
    assert(await page.$eval('#newTotalSection', e => e.classList.contains('visible')), 'Neue Sendung → Stückzahl-Abfrage');
    await page.evaluate(() => { document.getElementById('newTotalInput').value = '2'; document.getElementById('confirmNewTotalBtn').click(); }); await wait(500);
    store = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored')));
    assert(store['55512345'] && store['55512345'].totalPiecesExpected === 2, 'Neue Sendung 55512345 mit 2 Stück angelegt');
    await setBatchMode(page, true);
    assert(await page.evaluate(() => document.body.classList.contains('batch-mode-active')), 'Batch-Modus aktiv');
    // Handy: „Speichern“/„Leeren“ hängen im Batch-Modus als feste Leiste unten (dieselben Knöpfe, aus der Karte gelöst)
    const bar0 = await page.evaluate(() => { const bar = document.getElementById('batchActionBar'); const r = bar.getBoundingClientRect(); return { pos: getComputedStyle(bar).position, atBottom: Math.abs(innerHeight - r.bottom) < 1, save: document.getElementById('saveBatchButton').textContent.trim(), clear: document.getElementById('clearBatchButton').textContent.trim(), prefixHidden: [...document.querySelectorAll('#batchActionBar .batch-btn-prefix')].every(e => getComputedStyle(e).display === 'none'), cnt: getComputedStyle(document.getElementById('saveBatchCount')).display, pad: parseInt(getComputedStyle(document.getElementById('mainView')).paddingBottom) }; });
    assert(bar0.pos === 'fixed' && bar0.atBottom && bar0.save === 'Batch Speichern0' && bar0.clear === 'Batch Leeren' && bar0.prefixHidden && bar0.cnt === 'none' && bar0.pad > 40, `Batch-Leiste unten fest, Zähler bei leerem Batch versteckt, Liste bekommt unten Luft (${JSON.stringify(bar0)})`);
    await page.evaluate(() => { const f = document.getElementById('batchFeedbackToggle'); if (!f.checked) f.click(); }); // Feedback-Popup (Standard: aus) einschalten
    await scan(page, 'HU1002', 300);
    assert(await page.evaluate(() => !document.querySelector('#batchScanFeedbackModal .modal-content').classList.contains('unexpected')), 'Batch: Feedback-Popup zeigt bekannte HU grün');
    await scan(page, 'UNBEKANNT1', 300);
    assert((await page.$$eval('.remove-batch-item', e => e.length)) === 2, 'Batch: 2 Einträge erfasst');
    assert(await page.evaluate(() => document.getElementById('saveBatchCount').textContent === '2' && getComputedStyle(document.getElementById('saveBatchCount')).display !== 'none' && !document.getElementById('saveBatchButton').classList.contains('is-empty')), 'Batch-Leiste: Zähler „2“ am Speichern-Knopf');
    assert(await page.evaluate(() => document.querySelector('#batchScanFeedbackModal .modal-content').classList.contains('unexpected')), 'Batch: Feedback-Popup markiert unbekannte HU als überzählig (rot)');
    await page.evaluate(() => { const f = document.getElementById('batchFeedbackToggle'); if (f.checked) f.click(); });
    await setBatchMode(page, false);
    assert(await page.evaluate(() => getComputedStyle(document.getElementById('batchActionBar')).position === 'static' && getComputedStyle(document.getElementById('mainView')).paddingBottom === '0px'), 'Batch aus: Leiste weg, kein Extra-Abstand');
    await page.evaluate(() => document.querySelector('.home-tile[data-page="anlieferung"]').click()); await wait(400);
    assert((await page.$$eval('.page-row[data-truckid]', r => r.length)) >= 1, 'Anlieferung: LKW-Zeilen vorhanden');
    await page.evaluate(() => document.querySelector('.page-row[data-truckid]').click()); await wait(400);
    assert(new URL(page.url()).searchParams.get('lkw') !== null, 'LKW-Zeile öffnet LKW-Ansicht (?lkw=…)');
    await page.goBack(); await wait(300); await page.goBack(); await wait(400);
    await page.evaluate(() => document.querySelector('.home-tile[data-page="info"]').click()); await wait(400);
    await page.evaluate(() => { const i = document.getElementById('infoWeightMin'); i.value = '19'; i.dispatchEvent(new Event('input', { bubbles: true })); const j = document.getElementById('infoWeightMax'); j.value = '21'; j.dispatchEvent(new Event('input', { bubbles: true })); }); await wait(600);
    const hits = await page.$$eval('.weight-hit[data-hu]', e => e.map(x => x.dataset.hu));
    assert(hits.includes('HU1001') && hits.includes('HU1003') && !hits.includes('HU1002'), `Info: Gewichtsfilter 19–21 kg → ${hits.join(', ')}`);
    await page.goBack(); await wait(400);
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(300);
    assert(await page.$eval('#side-menu', e => e.classList.contains('open')), 'Seitenmenü öffnet');
    assert((await page.$$eval('.lkw-toggle', e => e.length)) >= 1, 'Seitenmenü zeigt LKW-Schalter');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join('; ')})`);
  } finally { await browser.close(); finish(); }
})().catch(e => { console.error('ERR', e); process.exit(1); });
