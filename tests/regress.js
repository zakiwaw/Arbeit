// Grundfunktionen: Laden, Einzelscan, neue Sendung, Batch-Modus, Startseite/Unterseiten, Info-Filter, Seitenmenü
const { launch, makeBackend, openApp, sampleData, scan, setBatchMode, assert, finish } = require('./helpers');
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Geometrie statt einer starren Mindesthöhe: Anzahl/Schalter bleiben stehen, die Liste bekommt genau den freien Rest.
async function batchGeometry(page) {
  return page.evaluate(() => {
    const isDesktop = innerWidth >= 992;
    const main = document.getElementById('mainView'), form = document.getElementById('main-input-form');
    const area = document.getElementById('batchArea'), list = document.getElementById('batchList');
    const summary = document.getElementById('batchSummary'), bar = document.getElementById('batchActionBar');
    const settingsHeader = document.getElementById('batchSettingsHeader');
    const settingsBody = document.getElementById('batchSettingsBody');
    const isExpanded = settingsBody && !settingsBody.classList.contains('hidden');
    const toggles = [...area.querySelectorAll('.toggle-row')];
    const statusContainer = document.querySelector('.status-and-button-container');
    const rect = e => e.getBoundingClientRect(), style = e => getComputedStyle(e);
    const mr = rect(main), fr = rect(form), ar = rect(area), lr = rect(list), br = rect(bar), sr = rect(settingsHeader);
    const marginY = e => parseFloat(style(e).marginTop) + parseFloat(style(e).marginBottom);
    const otherHeight = [...area.children].filter(e => e !== list && style(e).display !== 'none' && style(e).position !== 'fixed')
      .reduce((sum, e) => sum + rect(e).height + marginY(e), 0);
    const freeHeight = area.clientHeight - parseFloat(style(area).paddingTop) - parseFloat(style(area).paddingBottom) - otherHeight - marginY(list);
    const controls = [form, area.querySelector('h3'), summary, list, settingsHeader, document.getElementById('saveBatchButton'), document.getElementById('clearBatchButton')];
    if (isDesktop) {
      controls.push(document.getElementById('securityStatusSelect'), document.getElementById('mainActionButton'));
    }
    if (isExpanded) {
      controls.push(...toggles);
    }
    const visible = controls.every(e => {
      const r = rect(e), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight + 0.5 && r.left >= 0 && r.right <= innerWidth + 0.5 && !!hit && e.contains(hit);
    });
    const topOrdered = isDesktop
      ? (fr.bottom <= rect(statusContainer).top && rect(document.querySelector('.input-section')).bottom <= ar.top)
      : (rect(statusContainer).width === 0 && rect(statusContainer).height === 0 && style(statusContainer).display === 'none' &&
         rect(document.querySelector('.input-section')).bottom <= ar.top);
    const bottomOrdered = isExpanded
      ? (lr.bottom <= sr.top && sr.bottom <= rect(toggles[0]).top && rect(toggles[2]).bottom <= ar.bottom && ar.bottom <= br.top)
      : (lr.bottom <= sr.top && sr.bottom <= ar.bottom && ar.bottom <= br.top);
    return {
      fixed: [main, form, bar].every(e => style(e).position === 'fixed'), screenHeight: Math.abs(mr.height - innerHeight) < 1,
      atBottom: Math.abs(br.bottom - innerHeight) < 1, visible,
      ordered: topOrdered && ar.top <= rect(summary).top && rect(summary).bottom <= lr.top && bottomOrdered,
      listScroll: style(list).overflowY, maxHeight: style(list).maxHeight, listHeight: lr.height, freeHeight,
      cardNoScroll: area.scrollHeight <= area.clientHeight, mainNoScroll: main.scrollHeight <= main.clientHeight,
      bounds: [mr.top, mr.bottom, fr.top, fr.bottom, ar.top, ar.bottom, lr.top, lr.bottom, br.top, br.bottom], windowY: scrollY
    };
  });
}
function assertBatchViewport(g, label) {
  assert(g.fixed && g.screenHeight && g.atBottom && g.visible && g.ordered && g.listScroll === 'auto' && g.maxHeight === 'none' &&
    g.listHeight >= 50 && Math.abs(g.listHeight - g.freeHeight) <= 1 && g.cardNoScroll && g.mainNoScroll,
    `${label}: Scanfeld/Karte/Aktionen im Bild, nur Liste scrollt und füllt den Rest (${JSON.stringify(g)})`);
}
async function normalGeometry(page) {
  return page.evaluate(() => ({
    mainPosition: getComputedStyle(document.getElementById('mainView')).position,
    formPosition: getComputedStyle(document.getElementById('main-input-form')).position,
    workspace: getComputedStyle(document.querySelector('.batch-workspace')).display,
    barPosition: getComputedStyle(document.getElementById('batchActionBar')).position,
    paddingBottom: getComputedStyle(document.getElementById('mainView')).paddingBottom,
    boxes: [...document.querySelectorAll('#mainView, #mainView > .container, .input-section, #main-input-form, #homeHub, .list-caption-row, #mainView .shipment-table')]
      .map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height]; })
  }));
}
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
    assertBatchViewport(await batchGeometry(page), 'Batch leer (Handy)');
    // Handy: „Speichern“/„Leeren“ hängen im Batch-Modus als feste Leiste unten (dieselben Knöpfe, aus der Karte gelöst)
    const bar0 = await page.evaluate(() => { const bar = document.getElementById('batchActionBar'); const r = bar.getBoundingClientRect(); return { pos: getComputedStyle(bar).position, atBottom: Math.abs(innerHeight - r.bottom) < 1, save: document.getElementById('saveBatchButton').textContent.trim(), clear: document.getElementById('clearBatchButton').textContent.trim(), prefixHidden: [...document.querySelectorAll('#batchActionBar .batch-btn-prefix')].every(e => getComputedStyle(e).display === 'none'), cnt: getComputedStyle(document.getElementById('saveBatchCount')).display, pad: parseInt(getComputedStyle(document.getElementById('mainView')).paddingBottom) }; });
    assert(bar0.pos === 'fixed' && bar0.atBottom && bar0.save === 'Batch Speichern0' && bar0.clear === 'Batch Leeren' && bar0.prefixHidden && bar0.cnt === 'none' && bar0.pad > 40, `Batch-Leiste unten fest, Zähler bei leerem Batch versteckt, Liste bekommt unten Luft (${JSON.stringify(bar0)})`);
    await page.evaluate(() => { const f = document.getElementById('batchFeedbackToggle'); if (!f.checked) f.click(); }); // Feedback-Popup (Standard: aus) einschalten
    await scan(page, 'HU1002', 300);
    const batchRow = await page.evaluate(() => { const row = document.querySelector('#batchList li'); return !!row && row.classList.contains('is-newest') &&
      row.querySelector('.batch-item-number')?.tagName === 'STRONG' && !!row.querySelector('time.batch-item-time'); });
    assert(batchRow, 'Batch: neuester Scan wird markiert, HU-Nummer und Uhrzeit sind getrennt ausgezeichnet');
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
    await page.close(); // Kein Hintergrund-Sync des ersten Szenarios in den gemeinsam genutzten localStorage weiterer Seiten.

    // ---- Batch 9.6: feste Arbeitsfläche, kompakte Ansicht auf kleinen Bildschirmen, klappbare Einstellungen ----
    for (const viewport of [
      { width: 320, height: 568, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
      { width: 360, height: 640, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
      { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
      { width: 991, height: 800 }, { width: 992, height: 800 }, { width: 1440, height: 1200 }
    ]) {
      const label = `Batch ${viewport.width}×${viewport.height}`;
      const bb = makeBackend(sampleData(), {}), pb = await openApp(browser, bb, { viewport });
      assert(await pb.evaluate(() => getComputedStyle(document.querySelector('.status-and-button-container')).display !== 'none'), `${label}: im normalen Modus ist die Status-Zeile sichtbar`);
      const normalBefore = await normalGeometry(pb);
      await setBatchMode(pb, true);
      const empty = await batchGeometry(pb);
      assertBatchViewport(empty, `${label} leer`);

      // 9.6: Auf kleinen Bildschirmen (< 992 px) ist die Status-Zeile ausgeblendet und das Scanfeld voll breit; am Desktop sichtbar
      if (viewport.width < 992) {
        const statusMobile = await pb.evaluate(() => {
          const sc = document.querySelector('.status-and-button-container');
          const form = document.getElementById('main-input-form');
          const input = document.getElementById('shipmentNumberInput');
          return {
            hidden: getComputedStyle(sc).display === 'none',
            formFullWidth: form.getBoundingClientRect().width >= innerWidth - 32,
            inputWidth: input.getBoundingClientRect().width > 150
          };
        });
        assert(statusMobile.hidden && statusMobile.formFullWidth && statusMobile.inputWidth,
          `${label}: Status-Zeile im Batch-Modus ausgeblendet und Scanfeld voll breit`);
      } else {
        const statusDesktop = await pb.evaluate(() => getComputedStyle(document.querySelector('.status-and-button-container')).display !== 'none');
        assert(statusDesktop, `${label}: Status-Zeile am Desktop sichtbar`);
      }

      // 9.6: Einstell-Schalter standardmäßig zugeklappt, lassen sich aufklappen, Schalter-Werte bleiben beim Klappen erhalten
      const settingsCheck = await pb.evaluate(() => {
        const header = document.getElementById('batchSettingsHeader');
        const body = document.getElementById('batchSettingsBody');
        const soundToggle = document.getElementById('unexpectedHuSoundToggle');
        const feedbackToggle = document.getElementById('batchFeedbackToggle');

        const initiallyClosed = body.classList.contains('hidden') && header.getAttribute('aria-expanded') === 'false';
        const initialSound = soundToggle.checked;

        // Aufklappen
        header.click();
        const opened = !body.classList.contains('hidden') && header.getAttribute('aria-expanded') === 'true';

        // Schalter umschalten
        soundToggle.checked = !initialSound;
        soundToggle.dispatchEvent(new Event('change', { bubbles: true }));
        feedbackToggle.checked = true;
        feedbackToggle.dispatchEvent(new Event('change', { bubbles: true }));

        // Zuklappen
        header.click();
        const closedAgain = body.classList.contains('hidden') && header.getAttribute('aria-expanded') === 'false';
        const soundWhenClosed = soundToggle.checked;
        const feedbackWhenClosed = feedbackToggle.checked;

        // Erneut aufklappen
        header.click();
        const openedAgain = !body.classList.contains('hidden') && header.getAttribute('aria-expanded') === 'true';
        const soundAfterReopen = soundToggle.checked;
        const feedbackAfterReopen = feedbackToggle.checked;

        // Werte zurücksetzen und wieder zuklappen
        soundToggle.checked = initialSound;
        soundToggle.dispatchEvent(new Event('change', { bubbles: true }));
        feedbackToggle.checked = false;
        feedbackToggle.dispatchEvent(new Event('change', { bubbles: true }));
        header.click();

        return {
          initiallyClosed,
          opened,
          closedAgain,
          openedAgain,
          preserved: soundWhenClosed === !initialSound && feedbackWhenClosed === true &&
                     soundAfterReopen === !initialSound && feedbackAfterReopen === true
        };
      });
      assert(settingsCheck.initiallyClosed && settingsCheck.opened && settingsCheck.closedAgain &&
        settingsCheck.openedAgain && settingsCheck.preserved,
        `${label}: Einstellungen standardmäßig zugeklappt, klappbar und Schalter-Werte bleiben beim Klappen erhalten`);

      for (let i = 0; i < 35; i++) await scan(pb, 'ZZBATCH' + String(i).padStart(4, '0'), 0);
      const full = await batchGeometry(pb);
      assertBatchViewport(full, `${label} mit 35 Scans`);
      assert(JSON.stringify(empty.bounds) === JSON.stringify(full.bounds), `${label}: voller Batch verschiebt keine Bedienelemente`);
      const order = await pb.$$eval('#batchList .batch-item-number', es => es.map(e => e.textContent));
      assert(order.join('|') === Array.from({ length: 35 }, (_, i) => 'ZZBATCH' + String(34 - i).padStart(4, '0')).join('|'), `${label}: unverändert neuester Scan oben`);
      // Tatsächliches Mausrad im Listenfenster (nicht nur scrollTop setzen): manuelles Scrollen bleibt möglich.
      const listBox = await pb.$eval('#batchList', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await pb.mouse.move(listBox.x, listBox.y); await pb.mouse.wheel({ deltaY: 350 }); await wait(150);
      const manualTop = await pb.$eval('#batchList', e => e.scrollTop);
      assert(manualTop > 0 && JSON.stringify((await batchGeometry(pb)).bounds) === JSON.stringify(full.bounds), `${label}: nur der Listeninhalt scrollt manuell`);
      // Seiten-Scrollversuch außerhalb der Liste darf weder Karte noch Schalter aus dem Bild bewegen.
      await pb.evaluate(() => window.scrollTo(0, 10000));
      await pb.mouse.move(2, 200); await pb.mouse.wheel({ deltaY: 800 }); await wait(100);
      const afterPageScroll = await batchGeometry(pb);
      assert(afterPageScroll.windowY === 0 && JSON.stringify(afterPageScroll.bounds) === JSON.stringify(full.bounds) &&
        await pb.$eval('#batchList', e => e.scrollTop) === manualTop, `${label}: Seitenscroll lässt Arbeitsfläche und Listenposition unverändert`);
      // Löschen fragt weiterhin nach; sowohl Abbruch als auch bestätigtes Löschen dürfen nicht nach oben springen.
      let acceptDialog = false; const dialogs = [];
      pb.removeAllListeners('dialog');
      pb.on('dialog', async d => { dialogs.push(d.message()); await (acceptDialog ? d.accept() : d.dismiss()); });
      const beforeDelete = await pb.$eval('#batchList', e => { e.scrollTop = 300; return e.scrollTop; });
      await pb.evaluate(() => document.querySelectorAll('#batchList .remove-batch-item')[7].click());
      assert(dialogs.length === 1 && /aus dem Batch entfernt/.test(dialogs[0]) && await pb.$$eval('#batchList li', es => es.length) === 35 &&
        await pb.$eval('#batchList', e => e.scrollTop) === beforeDelete, `${label}: Löschen abgebrochen, Liste und Scrollstand bleiben`);
      acceptDialog = true;
      await pb.evaluate(() => document.querySelectorAll('#batchList .remove-batch-item')[7].click());
      assert(dialogs.length === 2 && await pb.$$eval('#batchList li', es => es.length) === 34 &&
        await pb.$eval('#batchList', e => e.scrollTop) === beforeDelete && !(await pb.$('#batchList .is-newest')), `${label}: Löschen bestätigt, kein Sprung/keine Scan-Markierung`);
      await scan(pb, 'ZZBATCHNEW', 0);
      const newest = await pb.$eval('#batchList', e => {
        const first = e.firstElementChild, r = first.getBoundingClientRect(), l = e.getBoundingClientRect();
        return { top: e.scrollTop, number: first.querySelector('.batch-item-number').textContent, marked: first.classList.contains('is-newest'),
          visible: r.top >= l.top && r.bottom <= l.bottom, count: e.children.length };
      });
      assert(newest.top === 0 && newest.number === 'ZZBATCHNEW' && newest.marked && newest.visible && newest.count === 35,
        `${label}: neuer Scan holt sofort die komplette oberste Zeile ins Bild (${JSON.stringify(newest)})`);
      // Ein zweiter Scan über Enter/Formular nimmt denselben Weg, auch wenn man erneut nach unten scrollt.
      await pb.$eval('#batchList', e => { e.scrollTop = e.scrollHeight; });
      await pb.evaluate(() => { const i = document.getElementById('shipmentNumberInput'); i.value = 'ZZBATCHENTER'; document.getElementById('main-input-form').requestSubmit(); });
      assert(await pb.$eval('#batchList', e => e.scrollTop === 0 && e.firstElementChild.querySelector('.batch-item-number').textContent === 'ZZBATCHENTER'), `${label}: auch der nächste Scanner-Enter zeigt den neuesten Eintrag`);
      if (viewport.width === 390 || viewport.width === 992) {
        const noteTop = await pb.$eval('#batchList', e => { e.scrollTop = 300; return e.scrollTop; });
        await pb.evaluate(() => { document.getElementById('batchNoteToggle').click(); document.getElementById('batchNoteInput').value = 'Palette 9.6'; document.getElementById('confirmBatchNoteButton').click(); });
        assert(await pb.$eval('#batchList', (e, top) => e.scrollTop === top && e.querySelector('.batch-item-note').textContent.includes('Palette 9.6'), noteTop), `${label}: Notiz ändern ohne neuen Scan erhält Scrollstand`);
        assertBatchViewport(await batchGeometry(pb), `${label} mit Batch-Notiz`);
      }
      // 100dvh statt einer alten 65-vh-/560-px-Kappe: jedes zusätzliche Pixel Höhe landet in der Liste.
      const beforeResize = await batchGeometry(pb);
      await pb.setViewport({ ...viewport, height: viewport.height + 120 }); await wait(100);
      const grown = await batchGeometry(pb);
      assertBatchViewport(grown, `${label} um 120 px höher`);
      assert(Math.abs(grown.listHeight - beforeResize.listHeight - 120) < 1, `${label}: zusätzliche Bildschirmhöhe vollständig für die Liste`);
      if (viewport.height === 1200) assert(full.listHeight > 560, `${label}: keine alte 560-px-Grenze mehr`);
      await pb.setViewport(viewport); await wait(100);
      await pb.screenshot({ path: `.arena-shots/batch-${viewport.width}x${viewport.height}.png` });
      // Auch ein abgebrochenes Ausschalten lässt den festen Batch-Arbeitsbereich bestehen.
      acceptDialog = false; await setBatchMode(pb, false);
      assert(await pb.evaluate(() => document.body.classList.contains('batch-mode-active') && document.getElementById('batchModeToggle').checked), `${label}: Ausschalten mit ungespeicherten Scans fragt weiterhin nach`);
      acceptDialog = true; await setBatchMode(pb, false);
      const normalAfter = await normalGeometry(pb), sameNormal = JSON.stringify(normalAfter) === JSON.stringify(normalBefore);
      assert(sameNormal && normalAfter.workspace === 'contents' && normalAfter.mainPosition === 'static' && normalAfter.formPosition === 'static' && normalAfter.barPosition === 'static' && normalAfter.paddingBottom === '0px',
        `${label}: Batch aus stellt die identische normale Geometrie wieder her${sameNormal ? '' : ' ' + JSON.stringify({ normalBefore, normalAfter })}`);
      assert(!bb.actions.includes('saveShipments'), `${label}: reine Batch-Anzeige verändert/speichert keine Sendungsdaten`);
      await setBatchMode(pb, true);
      assertBatchViewport(await batchGeometry(pb), `${label} erneut eingeschaltet`);
      assert(await pb.$$eval('#batchList li', es => es.length) === 0 && pb.__errors.length === 0, `${label}: neuer leerer Batch, keine JS-Fehler (${pb.__errors.join(' | ')})`);
      await pb.close();
    }

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
      assertBatchViewport(await batchGeometry(pn), 'Batch nach übernommener Notiz');
      await pn.evaluate(() => document.getElementById('clearBatchButton').click());
      await pn.evaluate(() => document.getElementById('batchNoteToggle').click());
      await scan(pn, '0926040955AB', 0);
      await pn.evaluate(() => document.getElementById('skipBatchNoteButton').click());
      const skipped = await pn.evaluate(() => ({ modal: document.getElementById('batchNoteModal').classList.contains('visible'),
        locked: document.body.classList.contains('modal-open'), marked: !!document.querySelector('#batchList li.is-newest'),
        count: document.querySelectorAll('#batchList li').length, note: !!document.querySelector('#batchList .batch-item-note') }));
      assert(!skipped.modal && !skipped.locked && skipped.marked && skipped.count === 1 && !skipped.note, `Batch-Notiz überspringen: neuer Scan sichtbar, kein hängen gebliebenes Modal (${JSON.stringify(skipped)})`);
      assertBatchViewport(await batchGeometry(pn), 'Batch nach übersprungener Notiz');
      assert(pn.__errors.length === 0, `Notiz-Sheet: keine JS-Fehler (${pn.__errors.join(' | ')})`);
      await pn.close();
    }

    // ---- Zurück aus den Details: Liste/Unterseite stehen wieder dort, wo man vorher gescrollt hatte ----
    {
      const nowIso = new Date().toISOString(); const many = {};
      for (let i = 1; i <= 25; i++) many['S' + String(i).padStart(2, '0')] = { hawb: 'S' + String(i).padStart(2, '0'), lastModified: new Date(Date.now() - i * 60000).toISOString(), totalPiecesExpected: 3, mitarbeiter: 'T', isHuListOrder: false, scannedItems: [{ rawInput: 'S' + String(i).padStart(2, '0') + '+0001', status: 'Wareneingang', timestamp: nowIso, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null }] };
      const bsc = makeBackend(many, {});
      const psc = await openApp(browser, bsc, {}); await wait(500);
      // 1) Startseite: nach unten scrollen, unterste Karte öffnen, zurück
      const y0 = await psc.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); return window.scrollY; });
      await psc.evaluate(() => { const rows = document.querySelectorAll('#shipmentTableBody tr[data-basenumber]'); rows[rows.length - 1].querySelector('td.hawb-cell').click(); }); await wait(400);
      const opened = await psc.evaluate(() => !document.getElementById('detailView').classList.contains('hidden'));
      await psc.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(600);
      const y1 = await psc.evaluate(() => ({ y: window.scrollY, detail: !document.getElementById('detailView').classList.contains('hidden'), focus: document.activeElement?.id, restoration: history.scrollRestoration }));
      assert(y0 > 300 && opened && !y1.detail && Math.abs(y1.y - y0) <= 2 && y1.focus === 'shipmentNumberInput' && y1.restoration === 'manual', `Startseite: nach „Zurück“ aus den Details bleibt die Scroll-Position (${y0} → ${y1.y}), Scan-Feld wieder fokussiert`);
      // 2) Unterseite (Offene Sendungen): scrollen, Zeile öffnen, zurück → Unterseite an alter Stelle; nochmal zurück → Startseite an alter Stelle
      await psc.evaluate(() => window.scrollTo(0, 200)); await wait(100);
      await psc.evaluate(() => document.querySelector('.home-tile[data-page="offen"], [data-home-tile="offen"], #homeHub [data-page="offen"]')?.click()); await wait(600);
      const pv = await psc.evaluate(() => { const pv = document.getElementById('pageView'); pv.scrollTop = 500; return { open: !pv.classList.contains('hidden'), st: pv.scrollTop, rows: pv.querySelectorAll('tr[data-basenumber]').length }; });
      await psc.evaluate(() => { const rows = document.querySelectorAll('#pageView tr[data-basenumber]'); rows[rows.length - 1].querySelector('td.hawb-cell').click(); }); await wait(400);
      const d2 = await psc.evaluate(() => !document.getElementById('detailView').classList.contains('hidden'));
      await psc.evaluate(() => document.getElementById('backToMainViewBtn').click()); await wait(600);
      const pv2 = await psc.evaluate(() => { const pv = document.getElementById('pageView'); return { open: !pv.classList.contains('hidden'), st: pv.scrollTop, detail: !document.getElementById('detailView').classList.contains('hidden') }; });
      assert(pv.open && pv.st === 500 && pv.rows >= 20 && d2 && pv2.open && !pv2.detail && Math.abs(pv2.st - 500) <= 2, `Unterseite: nach „Zurück“ aus den Details bleibt der Scroll-Stand der Seite (${pv.st} → ${pv2.st})`);
      await psc.evaluate(() => document.getElementById('pageBackBtn').click()); await wait(600);
      const home = await psc.evaluate(() => ({ y: window.scrollY, page: !document.getElementById('pageView').classList.contains('hidden') }));
      assert(!home.page && Math.abs(home.y - 200) <= 2, `Unterseite schließen: Startseite steht wieder bei der alten Position (200 → ${home.y})`);
      // 3) Aktionen auf der Startseite (Löschen, Bearbeiten-Abbrechen) lassen die Seite ebenfalls stehen – auch wenn das Scan-Feld
      //    den Fokus verloren hatte (so ist es auf dem Handy nach einem Tipp auf einen Knopf)
      await psc.evaluate(() => { window.scrollTo(0, 500); document.activeElement && document.activeElement.blur(); }); await wait(100);
      const delBase = await psc.evaluate(() => { const row = document.querySelectorAll('#shipmentTableBody tr[data-basenumber]')[2]; row.querySelector('.main-delete-btn').click(); return row.dataset.basenumber; }); await wait(600);
      const afterDel = await psc.evaluate(() => ({ y: window.scrollY, focus: document.activeElement?.id, rows: document.querySelectorAll('#shipmentTableBody tr[data-basenumber]').length }));
      assert(Math.abs(afterDel.y - 500) <= 2 && afterDel.focus === 'shipmentNumberInput' && !bsc.store[delBase] && afterDel.rows === 5, `Startseite: Sendung löschen springt nicht nach oben (500 → ${afterDel.y}), Scan-Feld wieder fokussiert, ${delBase} gelöscht`);
      await psc.evaluate(() => { document.activeElement && document.activeElement.blur(); document.querySelectorAll('#shipmentTableBody tr[data-basenumber]')[2].querySelector('.edit-btn').click(); }); await wait(300);
      await psc.evaluate(() => document.getElementById('cancelEditButton').click()); await wait(400);
      const afterEdit = await psc.evaluate(() => ({ y: window.scrollY, modal: document.getElementById('editModal').classList.contains('visible') }));
      assert(Math.abs(afterEdit.y - 500) <= 2 && !afterEdit.modal, `Startseite: Bearbeiten → Abbrechen springt nicht nach oben (500 → ${afterEdit.y})`);
      assert(psc.__errors.length === 0, `Scroll-Rückkehr: keine JS-Fehler (${psc.__errors.join(' | ')})`);
      await psc.close();
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

    // ---- LKW-Seite: ⋮-Menü in der Kopfzeile (Umbenennen · Deaktivieren/Aktivieren · Löschen) statt Knopf „LKW deaktivieren“ ----
    {
      const bm = makeBackend(sampleData(), {});
      const pm = await openApp(browser, bm, { query: '?seite=anlieferung&lkw=MAN 1' }); await wait(500);
      const menuState = () => pm.evaluate(() => {
        const btn = document.querySelector('#pageHeaderActions .page-menu-btn[data-lkw-menu]');
        const menu = document.querySelector('#pageHeaderActions .page-action-menu');
        return { title: document.getElementById('pageTitle').textContent.trim(), btn: !!btn, expanded: btn && btn.getAttribute('aria-expanded'),
          open: !!menu && !menu.classList.contains('hidden'), items: [...document.querySelectorAll('.page-action-item')].map(b => b.textContent.trim()),
          dangerLast: !!document.querySelector('.page-action-item:last-child.is-danger[data-lkw-delete]'),
          summaryBtn: !!document.querySelector('.page-summary [data-lkw-deactivate]'), banner: !!document.querySelector('.page-banner') };
      });
      const m0 = await menuState();
      assert(m0.title.endsWith('MAN 1') && m0.btn && m0.expanded === 'false' && !m0.open && !m0.summaryBtn && m0.items.join('|') === 'LKW umbenennen|LKW deaktivieren|LKW löschen' && m0.dangerLast,
        `LKW-Seite: ⋮ in der Kopfzeile, kein „LKW deaktivieren“-Knopf mehr in der Zeile, Menü zu, Reihenfolge Umbenennen · Deaktivieren · Löschen (rot, zuletzt) (${JSON.stringify(m0)})`);
      await pm.evaluate(() => document.querySelector('.page-menu-btn').click()); await wait(250);
      const m1 = await menuState();
      const m1Rect = await pm.evaluate(() => { const b = document.querySelector('.page-menu-btn').getBoundingClientRect(); const m = document.querySelector('.page-action-menu').getBoundingClientRect(); return { below: m.top >= b.bottom, rightAligned: Math.abs(m.right - b.right) < 2, inView: m.right <= innerWidth && m.left >= 0 }; });
      assert(m1.open && m1.expanded === 'true' && m1Rect.below && m1Rect.rightAligned && m1Rect.inView, `⋮ antippen: Menü klappt direkt unter dem Knopf auf, rechtsbündig, im Bild (${JSON.stringify(m1Rect)})`);
      await pm.evaluate(() => document.getElementById('pageTitle').click()); await wait(150);
      assert(!(await menuState()).open, 'Tippen außerhalb schließt das Menü');
      await pm.evaluate(() => document.querySelector('.page-menu-btn').click()); await wait(150);
      await pm.keyboard.press('Escape'); await wait(150);
      assert(!(await menuState()).open && await pm.evaluate(() => document.activeElement.classList.contains('page-menu-btn')), 'Escape schließt das Menü, Fokus zurück auf ⋮');
      // Deaktivieren (Rückfrage wird bestätigt) → Banner + Menü sagt jetzt „LKW aktivieren“; Aktivieren → wieder normal
      await pm.evaluate(() => document.querySelector('.page-menu-btn').click()); await wait(150);
      await pm.evaluate(() => document.querySelector('.page-action-item[data-lkw-deactivate]').click()); await wait(700);
      const m2 = await menuState();
      assert(!m2.open && m2.banner && m2.items.join('|') === 'LKW umbenennen|LKW aktivieren|LKW löschen' && bm.lkwStatus['MAN 1'] === false, `„LKW deaktivieren“: Menü zu, Hinweis-Banner, Eintrag wird zu „LKW aktivieren“, Status am Server (${JSON.stringify(m2)} ${JSON.stringify(bm.lkwStatus)})`);
      await pm.evaluate(() => document.querySelector('.page-menu-btn').click()); await wait(150);
      await pm.evaluate(() => document.querySelector('.page-action-item[data-lkw-activate]').click()); await wait(700);
      const m3 = await menuState();
      assert(!m3.open && !m3.banner && m3.items[1] === 'LKW deaktivieren' && bm.lkwStatus['MAN 1'] === true, `„LKW aktivieren“ aus dem Menü: Banner weg, Eintrag wieder „LKW deaktivieren“ (${JSON.stringify(m3)})`);
      // Umbenennen → bekanntes Modal, Menü zu
      await pm.evaluate(() => document.querySelector('.page-menu-btn').click()); await wait(150);
      await pm.evaluate(() => document.querySelector('.page-action-item[data-lkw-rename]').click()); await wait(300);
      const ren = await pm.evaluate(() => ({ modal: document.getElementById('lkwRenameModal').classList.contains('visible'), id: document.getElementById('lkwRenameTruckId').value, open: !document.querySelector('.page-action-menu').classList.contains('hidden') }));
      assert(ren.modal && ren.id === 'MAN 1' && !ren.open, `„LKW umbenennen“ öffnet das Umbenennen-Fenster für MAN 1, Menü zu (${JSON.stringify(ren)})`);
      await pm.evaluate(() => document.getElementById('lkwRenameModal').querySelector('button[type="button"]').click()); await wait(200);
      // Löschen (Rückfrage bestätigt) → Aufträge des LKW weg, leere LKW-Seite wird geschlossen (zurück zur Anlieferung)
      const before = Object.keys(bm.store).length;
      await pm.evaluate(() => document.querySelector('.page-menu-btn').click()); await wait(150);
      await pm.evaluate(() => document.querySelector('.page-action-item[data-lkw-delete]').click()); await wait(900);
      // (Seite kam hier direkt per Adresse → „zurück“ führt zur Startseite; aus der Anlieferung geöffnet ginge es dorthin zurück)
      const del = await pm.evaluate(() => ({ pageHidden: document.getElementById('pageView').classList.contains('hidden'), home: !document.getElementById('mainView').classList.contains('hidden'), menu: !!document.querySelector('#pageHeaderActions .page-menu-btn') }));
      assert(before === 3 && Object.keys(bm.store).length === 1 && !bm.store['9007000001'] && !bm.store['9007000002'] && del.pageHidden && del.home && !del.menu, `„LKW löschen“: beide Aufträge des LKW entfernt, die leere LKW-Seite schließt sich (zurück) (${JSON.stringify(del)})`);
      assert(pm.__errors.length === 0, `Keine JS-Fehler im ⋮-Menü (${pm.__errors.join(' | ')})`);
      await pm.close();
    }

    // ---- Sheet „Offene HUs“: vier Reiter nebeneinander ohne seitliches Scrollen (iOS schob sonst das ganze Sheet mit) ----
    {
      const bh = makeBackend(sampleData(), {});
      const ph = await openApp(browser, bh, {}); await wait(400);
      await ph.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(200);
      await ph.evaluate(() => document.getElementById('showOpenHusButton').click()); await wait(500);
      const hs = await ph.evaluate(() => {
        const mc = document.querySelector('#openHusModal .modal-content'); const tabs = mc.querySelector('.modal-tabs'); const r = [...tabs.children].map(b => b.getBoundingClientRect());
        return { visible: document.getElementById('openHusModal').classList.contains('visible'), n: r.length, inView: r.every(x => x.left >= 0 && x.right <= innerWidth + 0.5),
          tabsNoScroll: tabs.scrollWidth <= tabs.clientWidth && getComputedStyle(tabs).overflowX === 'hidden', sheetNoX: mc.scrollWidth <= mc.clientWidth && getComputedStyle(mc).overflowX === 'hidden',
          sameH: r.every(x => Math.abs(x.height - r[0].height) < 1), h: Math.round(r[0].height),
          labels: [...tabs.children].map(b => b.firstChild.textContent.replace(/\u00AD/g, '')), badgeIn: [...tabs.querySelectorAll('.tab-badge:not(.hidden)')].every(bd => { const b = bd.getBoundingClientRect(), p = bd.parentElement.getBoundingClientRect(); return b.right <= p.right + 0.5 && b.top >= p.top - 0.5; }) };
      });
      assert(hs.visible && hs.n === 4 && hs.inView && hs.tabsNoScroll && hs.sheetNoX && hs.sameH && hs.h <= 70 && hs.labels.join('|') === 'Offene Sicherung|Fehlende Eingänge|Dunkelalarm|Überzählig' && hs.badgeIn,
        `„Offene HUs“ 390 px: alle vier Reiter im Bild, Leiste und Sheet ohne waagerechten Überlauf, Zähler innerhalb des Reiters (${JSON.stringify(hs)})`);
      await ph.evaluate(() => document.getElementById('closeOpenHusModalButton').click()); await wait(200);
      assert(ph.__errors.length === 0, `Keine JS-Fehler im Sheet „Offene HUs“ (${ph.__errors.join(' | ')})`);
      await ph.close();
    }
  } finally { await browser.close(); finish(); }
})().catch(e => { console.error('ERR', e); process.exit(1); });
