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
    // X im Suchfeld leert nur den Text; „Alle Filter zurücksetzen“ (Zeile unter dem Suchfeld am Handy) leert alles
    await page.evaluate(() => { const i = document.getElementById('infoSearchInput'); i.value = 'HU10'; i.dispatchEvent(new Event('input', { bubbles: true })); const s = document.getElementById('infoStatusSelect'); s.value = 'open'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await wait(500);
    const ir0 = await page.evaluate(() => ({ x: getComputedStyle(document.getElementById('infoSearchClear')).display, row: getComputedStyle(document.getElementById('infoResetRow')).display, sum: document.getElementById('infoResetSummary').textContent }));
    assert(ir0.x !== 'none' && ir0.row === 'flex' && ir0.sum === '2 Filter aktiv', `Info Handy: X im Suchfeld + Zeile „2 Filter aktiv · Alle Filter zurücksetzen“ (Suchtext zählt nicht) (${JSON.stringify(ir0)})`);
    await page.evaluate(() => document.getElementById('infoSearchClear').click()); await wait(400);
    const ir1 = await page.evaluate(() => ({ text: document.getElementById('infoSearchInput').value, x: getComputedStyle(document.getElementById('infoSearchClear')).display, status: document.getElementById('infoStatusSelect').value, wmin: document.getElementById('infoWeightMin').value, sum: document.getElementById('infoResetSummary').textContent }));
    assert(ir1.text === '' && ir1.x === 'none' && ir1.status === 'open' && ir1.wmin === '19' && ir1.sum === '2 Filter aktiv', `X leert nur den Suchtext, Filter bleiben (${JSON.stringify(ir1)})`);
    await page.evaluate(() => document.getElementById('infoResetAllBtn').click()); await wait(500);
    const ir2 = await page.evaluate(() => ({ text: document.getElementById('infoSearchInput').value, status: document.getElementById('infoStatusSelect').value, wmin: document.getElementById('infoWeightMin').value, wmax: document.getElementById('infoWeightMax').value, row: getComputedStyle(document.getElementById('infoResetRow')).display, hits: document.querySelectorAll('.weight-hit[data-hu]').length }));
    assert(ir2.text === '' && ir2.status === 'all' && ir2.wmin === '' && ir2.wmax === '' && ir2.row === 'none' && ir2.hits === 0, `„Alle Filter zurücksetzen“ leert Suchtext + Filter, Zeile verschwindet (${JSON.stringify(ir2)})`);
    // Nur Suchtext, keine Filter → nur das X, keine Zurücksetzen-Zeile
    await page.evaluate(() => { const i = document.getElementById('infoSearchInput'); i.value = 'TEST'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await wait(400);
    const ir3 = await page.evaluate(() => ({ x: getComputedStyle(document.getElementById('infoSearchClear')).display, row: getComputedStyle(document.getElementById('infoResetRow')).display }));
    assert(ir3.x !== 'none' && ir3.row === 'none', `Nur Suchtext: X sichtbar, „Alle Filter zurücksetzen“ bleibt aus (${JSON.stringify(ir3)})`);
    await page.evaluate(() => document.getElementById('infoSearchClear').click()); await wait(300);
    await page.goBack(); await wait(400);
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(300);
    assert(await page.$eval('#side-menu', e => e.classList.contains('open')), 'Seitenmenü öffnet');
    assert((await page.$$eval('.lkw-toggle', e => e.length)) >= 1, 'Seitenmenü zeigt LKW-Schalter');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join('; ')})`);

    // ---- Scan-Feld: Symbol links schaltet Scanner ↔ Tastatur um (inputMode none ↔ text), Verlassen → zurück zu Scanner ----
    {
      const be2 = makeBackend(sampleData(), {});
      const p2 = await openApp(browser, be2, { viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }); await wait(400);
      const st = () => p2.evaluate(() => { const i = document.getElementById('shipmentNumberInput'), w = i.closest('.scan-input-wrapper'), b = document.getElementById('inputModeToggle'); const r = b.getBoundingClientRect(); return { mode: i.inputMode, kb: w.classList.contains('keyboard-mode'), pressed: b.getAttribute('aria-pressed'), scanIcon: getComputedStyle(b.querySelector('.icon-scan')).display, kbIcon: getComputedStyle(b.querySelector('.icon-keyboard')).display, w: r.width, h: r.height, focused: document.activeElement === i }; });
      const s0 = await st();
      assert(s0.mode === 'none' && !s0.kb && s0.pressed === 'false' && s0.scanIcon !== 'none' && s0.kbIcon === 'none' && s0.w >= 44 && s0.h >= 44, `Start: Scanner-Modus, Barcode-Symbol, Trefferfläche ≥ 44 px (${JSON.stringify(s0)})`);
      await p2.evaluate(() => document.getElementById('inputModeToggle').click()); await wait(150);
      const s1 = await st();
      assert(s1.mode === 'text' && s1.kb && s1.pressed === 'true' && s1.scanIcon === 'none' && s1.kbIcon !== 'none' && s1.focused, `Tipp aufs Symbol: Tastatur-Modus (inputMode text), Tastatur-Symbol, Feld fokussiert (${JSON.stringify(s1)})`);
      await p2.evaluate(() => document.getElementById('inputModeToggle').click()); await wait(150);
      const s2 = await st();
      assert(s2.mode === 'none' && !s2.kb && s2.scanIcon !== 'none' && s2.focused, 'Erneuter Tipp: zurück zum Scanner-Modus, Feld bleibt fokussiert');
      await p2.evaluate(() => document.getElementById('inputModeToggle').click()); await wait(150);
      await p2.evaluate(() => { document.getElementById('shipmentNumberInput').blur(); }); await wait(100);
      const s3 = await st();
      assert(s3.mode === 'none' && !s3.kb, 'Feld verlassen → Scanner-Modus und Barcode-Symbol zurück');
      await p2.evaluate(() => document.getElementById('shipmentNumberInput').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))); await wait(150);
      const s4 = await st();
      assert(s4.mode === 'text' && s4.kb, 'Doppeltipp ins Feld schaltet weiterhin auf Tastatur (Anzeige folgt)');
      await p2.evaluate(() => { const i = document.getElementById('shipmentNumberInput'); i.value = '123'; i.dispatchEvent(new Event('input', { bubbles: true })); });
      await p2.evaluate(() => document.getElementById('mainActionButton').click()); await wait(600);
      assert(be2.store['123'] && be2.store['123'].scannedItems.length >= 1, 'Scan aus dem Tastatur-Modus wird wie gewohnt verbucht');
      await p2.evaluate(() => document.getElementById('inputModeToggle').click()); await wait(150);
      await p2.screenshot({ path: '.arena-shots/scan-toggle-keyboard.png', clip: { x: 0, y: 0, width: 390, height: 330 } });
      assert(p2.__errors.length === 0, `Keine JS-Fehler (Umschalter) (${p2.__errors.join(' | ')})`);
      await p2.close();
    }

    // Erste Seite schließen: alle Seiten teilen sich localStorage – ihr Sync-Abruf würde die Daten der folgenden Blöcke überschreiben
    await page.close();

    // ---- Scan-Zeitleiste auf schmalen Geräten (Zebra, 360 px): Methode neben der Nummer, Storno in der Aktionszeile ----
    {
      const now = Date.now(); const t = (min) => new Date(now - min * 60000).toISOString();
      const mk = (hu, pos, status, minAgo, extra = {}) => ({ rawInput: hu, position: pos, status, timestamp: t(minAgo), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, ...extra });
      const zebraData = () => ({ '9008295951': { hawb: '9008295951', lastModified: t(0), totalPiecesExpected: 4, isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, mitarbeiter: 'T', plsoNumber: 'PLSO1', freightForwarder: 'DHL', destinationCountry: 'US',
        scannedItems: [mk('09260409072F', 3, 'XRY', 5), mk('09260409176B', 4, 'Wareneingang', 11 + 24 * 60, { notes: ['Beschädigt'] }), mk('0926040955AA', 1, 'Anstehend', 0), mk('0926040955AB', 2, 'Anstehend', 0)] } });
      const zebra = { width: 360, height: 600, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
      // Start direkt per Adresse ?sendung=… (auch: Neuladen in den Details) – die Details müssen Inhalt zeigen, nicht den Platzhalter
      const bz = makeBackend(zebraData(), {});
      const pz = await openApp(browser, bz, { viewport: zebra, query: '?sendung=9008295951' }); await wait(1200);
      const start = await pz.evaluate(() => ({ open: !document.getElementById('detailView').classList.contains('hidden'), hus: document.querySelectorAll('#currentShipmentDetails .scan-main-info .hu-value').length, base: document.getElementById('currentShipmentDetails').dataset.base, placeholder: /Geben Sie eine Sendungsnummer/.test(document.getElementById('currentShipmentDetails').textContent) }));
      assert(start.open && start.hus === 2 && start.base === '9008295951' && !start.placeholder, `Start per ?sendung=…: Details zeigen die Sendung, nicht den Platzhalter (${JSON.stringify(start)})`);
      const row = await pz.evaluate(() => {
        const li = document.querySelector('#currentShipmentDetails > ul > li'); const info = li.querySelector('.scan-main-info');
        const b = (el) => { const r = el.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), h: Math.round(r.height) }; };
        const hu = b(info.querySelector('.hu-value')), st = b(info.querySelector('.status')), inf = b(info);
        const btn = li.querySelector('.cancel-button'), link = li.querySelector('.add-note-link');
        return { hu, st, inf, sameLine: Math.abs((hu.t + hu.h / 2) - (st.t + st.h / 2)) < 4, pillAfterHu: st.l > hu.r && st.r <= inf.r, arrow: getComputedStyle(info.querySelector('.scan-arrow')).display,
          btnInActions: !!btn && btn.parentElement.classList.contains('scan-actions-and-notes'), btnH: btn ? Math.round(btn.getBoundingClientRect().height) : 0, btnLeftOfLink: !!btn && !!link && btn.getBoundingClientRect().right < link.getBoundingClientRect().left, huWinsOverlap: document.elementFromPoint(hu.l + 6, hu.t + hu.h - 3)?.closest('.hu-value') === info.querySelector('.hu-value'), padRight: getComputedStyle(info).paddingRight };
      });
      assert(row.sameLine && row.pillAfterHu, `360 px: Kontrollmethode steht neben der HU-Nummer (12 Zeichen + Position) (${JSON.stringify({ hu: row.hu, st: row.st, inf: row.inf })})`);
      assert(row.arrow === 'none' && row.padRight === '0px', `Handy: Pfeil ausgeblendet, HU-Zeile nutzt die volle Kartenbreite (${row.arrow}, ${row.padRight})`);
      assert(row.btnInActions && row.btnH >= 44 && row.btnLeftOfLink && row.huWinsOverlap, `Storno sitzt in der Aktionszeile unten links vor „Notiz hinzufügen“, 44 px hoch; unterer Rand des HU-Kastens bleibt Kopier-Tippfläche (${JSON.stringify({ inActions: row.btnInActions, h: row.btnH, left: row.btnLeftOfLink, huWins: row.huWinsOverlap })})`);
      // Storno funktioniert von dort aus weiterhin (Dialog wird bestätigt)
      const beforeCancel = await pz.evaluate(() => document.querySelectorAll('#currentShipmentDetails li.cancelled-item').length);
      let dialogs = 0; pz.on('dialog', () => dialogs++);
      await pz.evaluate(() => document.querySelector('#currentShipmentDetails .cancel-button').click()); await wait(1000);
      const afterCancel = await pz.evaluate(() => ({ cancelled: document.querySelectorAll('#currentShipmentDetails li.cancelled-item').length, open: !document.getElementById('detailView').classList.contains('hidden') }));
      assert(afterCancel.cancelled === beforeCancel + 1 && afterCancel.open && bz.store['9008295951'].scannedItems.some(i => i.isCancelled), `Storno aus der Aktionszeile storniert den Scan und bleibt in den Details (${beforeCancel} → ${afterCancel.cancelled}, Dialoge: ${dialogs}, Server: ${bz.store['9008295951'].scannedItems.filter(i => i.isCancelled).length})`);
      assert(pz.__errors.length === 0, `Zebra-Ansicht: keine JS-Fehler (${pz.__errors.join(' | ')})`);
      await pz.close();
      // Desktop: Pfeil sichtbar, Storno ebenfalls in der Aktionszeile
      const pd = await openApp(browser, makeBackend(zebraData(), {}), { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 }, query: '?sendung=9008295951' }); await wait(1200);
      const desk = await pd.evaluate(() => { const li = document.querySelector('#currentShipmentDetails > ul > li'); return { arrow: getComputedStyle(li.querySelector('.scan-arrow')).display, btn: li.querySelector('.scan-actions-and-notes .cancel-button') !== null }; });
      assert(desk.arrow !== 'none' && desk.btn, `Desktop: Pfeil „→“ sichtbar, Storno in der Aktionszeile (${JSON.stringify(desk)})`);
      await pd.close();
    }

    // ---- Notiz-Sheet auf kleinem Display: bleibt über der Tastatur, Enter/✓ speichert, Escape bricht ab ----
    {
      const now = Date.now(); const t = (min) => new Date(now - min * 60000).toISOString();
      const mk = (hu, pos, status, minAgo, extra = {}) => ({ rawInput: hu, position: pos, status, timestamp: t(minAgo), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, ...extra });
      const bn = makeBackend({ '9008295951': { hawb: '9008295951', lastModified: t(0), totalPiecesExpected: 2, isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, mitarbeiter: 'T', plsoNumber: 'PLSO1', freightForwarder: 'DHL', destinationCountry: 'US', scannedItems: [mk('09260409072F', 1, 'XRY', 5), mk('0926040955AB', 2, 'Anstehend', 0)] } }, {});
      const pn = await openApp(browser, bn, { viewport: { width: 360, height: 600, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, query: '?sendung=9008295951' }); await wait(1200);
      await pn.evaluate(() => document.querySelector('#currentShipmentDetails .add-note-link').click()); await wait(400);
      // Tastatur simulieren: sichtbarer Ausschnitt nur noch 300 px hoch (Zebra: 600 − Tastatur)
      const kb = await pn.evaluate(async () => {
        Object.defineProperty(VisualViewport.prototype, 'height', { configurable: true, get: () => 300 });
        visualViewport.dispatchEvent(new Event('resize'));
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const ov = document.getElementById('noteEditModal'); const b = (el) => el.getBoundingClientRect();
        const save = b(document.getElementById('saveNoteEditButton')), cancel = b(document.getElementById('cancelNoteEditButton')), ta = b(document.getElementById('noteEditTextarea'));
        return { visible: ov.classList.contains('visible'), ovH: Math.round(b(ov).height), saveBottom: Math.round(save.bottom), cancelBottom: Math.round(cancel.bottom), saveH: Math.round(save.height), taH: Math.round(ta.height), focused: document.activeElement === document.getElementById('noteEditTextarea') };
      });
      assert(kb.visible && kb.ovH === 300 && kb.saveBottom <= 300 && kb.cancelBottom <= 300 && kb.saveH >= 44 && kb.taH >= 64, `Tastatur offen (300 px sichtbar): Speichern/Abbrechen liegen im sichtbaren Bereich, Textfeld schrumpft nur bis 64 px (${JSON.stringify(kb)})`);
      // Umschalt+Enter = Zeilenumbruch, Enter/✓ = speichern
      await pn.evaluate(() => { const ta = document.getElementById('noteEditTextarea'); ta.focus(); ta.value = 'Karton offen'; });
      await pn.keyboard.down('Shift'); await pn.keyboard.press('Enter'); await pn.keyboard.up('Shift'); await pn.keyboard.type('Foto gemacht'); await wait(100);
      const multi = await pn.evaluate(() => document.getElementById('noteEditTextarea').value);
      assert(multi === 'Karton offen\nFoto gemacht', `Umschalt+Enter macht einen Zeilenumbruch (${JSON.stringify(multi)})`);
      await pn.keyboard.press('Enter'); await wait(600);
      const saved = await pn.evaluate(() => ({ visible: document.getElementById('noteEditModal').classList.contains('visible'), notes: [...document.querySelectorAll('#currentShipmentDetails .note-item')].map(n => n.textContent.trim()) }));
      assert(!saved.visible && saved.notes.some(n => /Karton offen/.test(n)) && bn.store['9008295951'].scannedItems[0].notes.join('|') === 'Karton offen\nFoto gemacht', `Enter/✓ speichert die Notiz und schließt das Sheet (${JSON.stringify(saved)})`);
      // Tastatur zu → Overlay wieder in voller Höhe; Escape bricht ohne Speichern ab
      const closed = await pn.evaluate(async () => { Object.defineProperty(VisualViewport.prototype, 'height', { configurable: true, get: () => 600 }); visualViewport.dispatchEvent(new Event('resize')); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return document.getElementById('noteEditModal').style.height; });
      assert(closed === '', `Tastatur zu: Inline-Maße des Overlays werden entfernt (${JSON.stringify(closed)})`);
      await pn.evaluate(() => document.querySelector('#currentShipmentDetails .add-note-link').click()); await wait(400);
      await pn.evaluate(() => { const ta = document.getElementById('noteEditTextarea'); ta.focus(); ta.value = 'Verworfen'; });
      await pn.keyboard.press('Escape'); await wait(300);
      const esc = await pn.evaluate(() => ({ visible: document.getElementById('noteEditModal').classList.contains('visible'), n: document.querySelectorAll('#currentShipmentDetails .note-item').length }));
      assert(!esc.visible && esc.n === 1 && bn.store['9008295951'].scannedItems[0].notes.length === 1, `Escape schließt ohne zu speichern (${JSON.stringify(esc)})`);
      // Batch-Notiz: Enter = „Übernehmen & Scannen“
      await pn.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(300);
      await pn.evaluate(() => { const t = document.getElementById('batchModeToggle'); if (!t.checked) t.click(); const n = document.getElementById('batchNoteToggle'); if (n && !n.checked) n.click(); }); await wait(300);
      await scan(pn, '0926040955AB', 500);
      const bm = await pn.evaluate(() => ({ visible: document.getElementById('batchNoteModal').classList.contains('visible'), focused: document.activeElement === document.getElementById('batchNoteInput') }));
      await pn.keyboard.type('Palette 3'); await pn.keyboard.press('Enter'); await wait(500);
      const bm2 = await pn.evaluate(() => ({ visible: document.getElementById('batchNoteModal').classList.contains('visible'), items: document.querySelectorAll('#batchList li').length, text: document.getElementById('batchList').textContent }));
      assert(bm.visible && bm.focused && !bm2.visible && bm2.items === 1 && /Palette 3/.test(bm2.text), `Batch-Notiz: Enter übernimmt die Notiz und scannt weiter (${JSON.stringify({ bm, bm2: { visible: bm2.visible, items: bm2.items } })})`);
      assert(pn.__errors.length === 0, `Notiz-Sheet: keine JS-Fehler (${pn.__errors.join(' | ')})`);
      await pn.close();
    }

    // ---- Sync: geöffnete Details eines HU-Listen-Auftrags (MAN/VW) aktualisieren sich bei Fremdänderung ----
    {
      const bs = makeBackend(sampleData(), {});
      const ps = await openApp(browser, bs, {});
      await ps.evaluate(() => document.querySelector('#shipmentTableBody tr[data-basenumber="9007000001"] td.hawb-cell').click()); await wait(600);
      const s0 = await ps.evaluate(() => ({ open: !document.getElementById('detailView').classList.contains('hidden'), statuses: document.querySelectorAll('#currentShipmentDetails .scan-main-info .status').length, pending: document.querySelectorAll('#pendingHuList li').length }));
      // anderes Gerät sichert HU1001 mit XRY
      bs.store['9007000001'].scannedItems[0].status = 'XRY'; bs.store['9007000001'].scannedItems[0].timestamp = new Date().toISOString(); bs.store['9007000001'].lastModified = new Date().toISOString(); bs.version++;
      await wait(4500);
      const s1 = await ps.evaluate(() => ({ open: !document.getElementById('detailView').classList.contains('hidden'), statuses: [...document.querySelectorAll('#currentShipmentDetails .scan-main-info .status')].map(e => e.textContent), pending: document.querySelectorAll('#pendingHuList li').length }));
      assert(s0.open && s0.statuses === 0 && s0.pending === 3 && s1.open && s1.statuses.join() === 'XRY' && s1.pending === 2, `HU-Listen-Details offen: Fremd-Scan erscheint ohne Neuöffnen (${JSON.stringify(s0)} → ${JSON.stringify(s1)})`);
      await ps.close();
    }

    // ---- Installierbar (Manifest): Hochformat fest, Symbole vorhanden, Kopf-Verweise gesetzt ----
    {
      const be3 = makeBackend(sampleData(), {});
      const p3 = await openApp(browser, be3, {}); await wait(300);
      const head = await p3.evaluate(() => ({ manifest: document.querySelector('link[rel="manifest"]')?.getAttribute('href'), icon: document.querySelector('link[rel="icon"]')?.getAttribute('href'), apple: document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'), title: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content }));
      assert(head.manifest === 'manifest.webmanifest' && head.icon === 'assets/icons/icon-192.png' && head.apple === 'assets/icons/apple-touch-icon.png' && head.title === 'Fracht Tracker', `Kopf: Manifest + Symbole verlinkt (${JSON.stringify(head)})`);
      const mf = await p3.evaluate(async () => { const r = await fetch('manifest.webmanifest'); return { ok: r.ok, type: r.headers.get('content-type'), json: await r.json() }; });
      assert(mf.ok && mf.json.display === 'standalone' && mf.json.orientation === 'portrait' && mf.json.start_url === './' && mf.json.scope === './' && mf.json.name === 'Fracht Tracker' && mf.json.lang === 'de', `Manifest: standalone + Hochformat (orientation: portrait) (${JSON.stringify({ d: mf.json.display, o: mf.json.orientation, s: mf.json.start_url })})`);
      const icons = await p3.evaluate(async (list) => { const out = []; for (const i of list) { const r = await fetch(i.src); const b = new Uint8Array(await r.arrayBuffer()); const dv = new DataView(b.buffer); out.push({ src: i.src, ok: r.ok, png: b[0] === 0x89 && b[1] === 0x50, w: dv.getUint32(16), h: dv.getUint32(20), sizes: i.sizes, purpose: i.purpose }); } return out; }, mf.json.icons);
      const iconsOk = icons.length === 3 && icons.every(i => i.ok && i.png && `${i.w}x${i.h}` === i.sizes) && icons.some(i => i.sizes === '192x192') && icons.some(i => i.sizes === '512x512' && i.purpose === 'any') && icons.some(i => i.purpose === 'maskable');
      assert(iconsOk, `Symbole 192/512 + maskable vorhanden, Maße stimmen mit dem Manifest überein (${JSON.stringify(icons.map(i => [i.sizes, i.w + 'x' + i.h, i.purpose]))})`);
      assert(p3.__errors.length === 0, `Keine JS-Fehler (Manifest/Hochformat-Sperre im Tab ist still) (${p3.__errors.join(' | ')})`);
      await p3.close();
    }
  } finally { await browser.close(); finish(); }
})().catch(e => { console.error('ERR', e); process.exit(1); });
