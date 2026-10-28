// Sync-Prüfungen: Löschen / Deaktivieren / Umbenennen kommen auch bei schnellem Bedienen und langsamen oder gestörten
// Serverantworten zuverlässig durch – nichts kommt zurück. Außerdem die blockierende Rückmeldung (Spinner mit Text).
// Voraussetzung: Server auf :8000 (siehe tests/README.md). Start: node tests/synccheck.js
const { launch, makeBackend, openApp, sampleData, scan } = require('./helpers');
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, oks = 0;
const assert = (c, m) => { console.log((c ? 'ok  : ' : 'FAIL: ') + m); if (c) oks++; else fails++; };
const STORE = 'frachtSicherungMobile_V8_18_Refactored', LKW = 'frachtLkwStatusV1';
const localShipments = page => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), STORE);
const localLkw = page => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), LKW);
const lkwPending = page => page.evaluate((k) => localStorage.getItem(k + '_lkwStatusPending') === '1', STORE);
const syncPending = page => page.evaluate((k) => JSON.parse(localStorage.getItem(k + '_syncPending') || '{"changed":{},"deleted":{}}'), STORE);
const overlay = page => page.evaluate(() => ({ visible: document.getElementById('loadingOverlay').classList.contains('visible'), text: document.getElementById('loadingText').textContent }));
const clickToggle = (page, truckId) => page.evaluate((id) => { const t = document.querySelector(`.lkw-toggle[data-truckid="${id}"]`); if (!t) return false; t.click(); return true; }, truckId);
const toggleChecked = (page, truckId) => page.evaluate((id) => document.querySelector(`.lkw-toggle[data-truckid="${id}"]`)?.checked, truckId);
const clickDelete = (page, base) => page.evaluate((b) => { const el = document.querySelector(`#detailView:not(.hidden) .main-delete-btn[data-basenumber="${b}"]`) || document.querySelector(`.main-delete-btn[data-basenumber="${b}"]`); if (!el) return false; el.click(); return true; }, base);
async function waitFor(fn, maxMs = 8000, step = 80) { const t0 = Date.now(); while (Date.now() - t0 < maxMs) { if (await fn()) return true; await wait(step); } return false; }
async function waitOverlayGone(page, maxMs = 8000) { return waitFor(async () => !(await overlay(page)).visible, maxMs); }

(async () => {
  const browser = await launch();
  let page;
  try {
    // ---------- 1) Deaktivieren, während ein Abruf mit dem ALTEN Stand unterwegs ist → bleibt deaktiviert ----------
    let be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, {}); await wait(600);
    be.delay.loadChanges = 1500; be.delay.saveLkwStatus = 600;
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(300);
    assert(await waitFor(async () => be.inFlight.loadChanges > 0, 5000), 'Ein Abruf (loadChanges) ist unterwegs');
    assert(await clickToggle(page, 'MAN 1'), 'Schalter „MAN 1“ im Menü umgelegt (deaktivieren)');
    await wait(120);
    let ov = await overlay(page);
    assert(ov.visible && ov.text === 'LKW wird deaktiviert …', `Spinner mit Text, solange der Server nicht bestätigt hat (${JSON.stringify(ov)})`);
    assert(await waitOverlayGone(page, 4000), 'Spinner verschwindet nach der Bestätigung');
    assert(be.lkwStatus['MAN 1'] === false, 'Server hat den Status „deaktiviert“');
    await wait(2200); // jetzt ist auch die verspätete Abruf-Antwort (alter Stand: aktiv) angekommen
    let st = await localLkw(page);
    assert(st['MAN 1'] === false && (await toggleChecked(page, 'MAN 1')) === false, `Verspätete Antwort mit altem Stand macht den LKW NICHT wieder aktiv (${JSON.stringify(st)})`);
    assert(!(await lkwPending(page)), 'Statusänderung gilt als bestätigt (nicht mehr vorgemerkt)');
    await wait(3500);
    st = await localLkw(page);
    assert(st['MAN 1'] === false && be.lkwStatus['MAN 1'] === false, 'Auch nach weiteren Abrufen: deaktiviert (lokal + Server)');

    // ---------- 2) Senden des Status schlägt fehl → bleibt lokal, wird nachgeschickt, Abruf setzt ihn nicht zurück ----------
    be.delay.loadChanges = 0; be.delay.saveLkwStatus = 0; be.failNext.saveLkwStatus = 1;
    assert(await clickToggle(page, 'MAN 1'), 'Schalter „MAN 1“ wieder aktivieren – Server antwortet diesmal mit Fehler (Sperre)');
    assert(await waitOverlayGone(page, 3000), 'Spinner wartet nach dem Fehler nicht bis zum Zeitlimit');
    assert(be.lkwStatus['MAN 1'] === false && (await localLkw(page))['MAN 1'] === true && (await lkwPending(page)), 'Nach dem Fehler: lokal aktiv + vorgemerkt, Server noch alt');
    assert(await waitFor(async () => be.lkwStatus['MAN 1'] === true, 8000), 'Status wird mit dem nächsten Abruf nachgeschickt');
    await wait(3500);
    assert((await localLkw(page))['MAN 1'] === true && (await toggleChecked(page, 'MAN 1')) === true && !(await lkwPending(page)), 'Lokal weiterhin aktiv, nicht mehr vorgemerkt – kein Zurückspringen durch den Abruf');
    await page.evaluate(() => document.getElementById('menu-overlay').click()); await wait(300);

    // ---------- 3) Neue Sendung anlegen und SOFORT löschen (Anlegen noch unterwegs) → kommt nicht zurück ----------
    be.delay.saveShipments = 1500;
    await scan(page, 'S900', 400);
    assert(await page.$eval('#newTotalSection', e => e.classList.contains('visible')), 'Neue Sendung S900 → Stückzahl-Abfrage');
    await page.evaluate(() => { document.getElementById('newTotalInput').value = '1'; document.getElementById('confirmNewTotalBtn').click(); }); await wait(300);
    assert(!!(await localShipments(page)).S900 && be.inFlight.saveShipments > 0, 'S900 lokal angelegt, Senden an den Server läuft noch');
    assert(await clickDelete(page, 'S900'), 'S900 sofort wieder gelöscht (Papierkorb)');
    await wait(100);
    ov = await overlay(page);
    assert(ov.visible && ov.text === 'Sendung S900 wird gelöscht …', `Spinner „Sendung S900 wird gelöscht …“ (${JSON.stringify(ov)})`);
    assert(await waitOverlayGone(page, 8000), 'Spinner verschwindet, sobald der Server die Löschung bestätigt hat');
    assert(!be.store.S900 && be.actions.some((a, i) => (a === 'deleteShipment' && be.requests[i].payload.baseNumber === 'S900') || (a === 'deleteShipments' && be.requests[i].payload.baseNumbers.includes('S900'))), 'Server hat einen Löschvermerk für S900 bekommen');
    await wait(4000); // zwei Abrufe (Komplettbestand vom Stub) – ohne Löschvermerk käme S900 hier zurück
    assert(!(await localShipments(page)).S900, 'S900 kommt NICHT zurück');
    const pend = await syncPending(page);
    assert(!Object.keys(pend.changed).length && !Object.keys(pend.deleted).length, 'Nichts mehr vorgemerkt');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();

    // ---------- 4) LKW löschen (2 Aufträge) = EIN Sammel-Aufruf; direkt danach die nächste Löschung ----------
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, { query: '?seite=anlieferung&lkw=MAN%201' }); await wait(600);
    be.delay.deleteShipments = 800;
    await page.evaluate(() => document.querySelector('#pageHeaderActions [data-lkw-menu]').click()); await wait(200);
    await page.evaluate(() => document.querySelector('#pageHeaderActions [data-lkw-delete]').click()); await wait(150);
    ov = await overlay(page);
    assert(ov.visible && ov.text === 'LKW „MAN 1“ wird gelöscht …', `Spinner „LKW „MAN 1“ wird gelöscht …“ (${JSON.stringify(ov)})`);
    // „schnell hintereinander“: die nächste Löschung folgt, bevor die erste bestätigt ist
    assert(await clickDelete(page, '123'), 'Direkt danach: Einzelsendung 123 gelöscht');
    assert(await waitOverlayGone(page, 8000), 'Spinner verschwindet, wenn alles bestätigt ist');
    const local4 = await localShipments(page);
    assert(!local4['9007000001'] && !local4['9007000002'] && !local4['123'] && Object.keys(local4).length === 0, `Lokal alles weg (${Object.keys(local4)})`);
    assert(!be.store['9007000001'] && !be.store['9007000002'] && !be.store['123'], 'Server: alle drei gelöscht');
    const batch = be.actions.filter(a => a === 'deleteShipments').length, single = be.actions.filter(a => a === 'deleteShipment').length;
    assert(batch >= 1 && batch <= 2 && batch + single <= 3 && !be.actions.includes('saveAllData'), `Löschvermerke gebündelt: ${batch}× deleteShipments, ${single}× deleteShipment (kein Rückfall auf altes Backend)`);
    await wait(4000);
    assert(Object.keys(await localShipments(page)).length === 0, 'Nach weiteren Abrufen kommt nichts zurück');
    assert(!('MAN 1' in be.lkwStatus), 'LKW-Status des gelöschten LKW ist auf dem Server entfernt');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();

    // ---------- 5) Älteres Server-Skript ohne Sammel-Löschung → einzeln wie bisher, kein Rückfall auf „Legacy“ ----------
    be = makeBackend(sampleData(), {});
    be.noBatchDelete = true;
    page = await openApp(browser, be, { query: '?seite=anlieferung&lkw=MAN%201' }); await wait(600);
    await page.evaluate(() => document.querySelector('#pageHeaderActions [data-lkw-menu]').click()); await wait(200);
    await page.evaluate(() => document.querySelector('#pageHeaderActions [data-lkw-delete]').click()); await wait(150);
    assert(await waitOverlayGone(page, 8000), 'Spinner verschwindet (einzelne Löschvermerke)');
    assert(!be.store['9007000001'] && !be.store['9007000002'] && be.actions.filter(a => a === 'deleteShipments').length === 1 && be.actions.filter(a => a === 'deleteShipment').length === 2, 'Unbekannte Sammel-Aktion → einmal probiert, dann 2× einzeln');
    assert(!be.actions.includes('saveAllData') && !be.actions.includes('loadAllData'), 'Kein Rückfall auf das alte Backend (saveAllData/loadAllData)');
    assert(await clickDelete(page, '123'), 'Weitere Löschung');
    assert(await waitOverlayGone(page, 8000) && !be.store['123'] && be.actions.filter(a => a === 'deleteShipments').length === 1, 'Danach direkt einzeln (Sammel-Aktion nicht erneut probiert)');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();

    // ---------- 6) Neuladen mit unbestätigter Statusänderung: Serverstand überschreibt sie nicht, sie wird nachgeschickt ----------
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, {}); await wait(600);
    be.failNext.saveLkwStatus = 1;
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(300);
    assert(await clickToggle(page, 'MAN 1'), 'Deaktivieren – Server lehnt einmal ab');
    assert(await waitOverlayGone(page, 3000) && (await lkwPending(page)) && be.lkwStatus['MAN 1'] !== false, 'Änderung vorgemerkt, Server noch alt');
    await page.close();
    page = await openApp(browser, be, { keepStorage: true }); await wait(600);
    assert((await localLkw(page))['MAN 1'] === false, 'Nach Neuladen: lokal weiterhin deaktiviert (Serverstand hat die vorgemerkte Änderung nicht überschrieben)');
    assert(await waitFor(async () => be.lkwStatus['MAN 1'] === false, 8000) && !(await lkwPending(page)), 'Vorgemerkte Änderung wurde nachgeschickt und bestätigt');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();
  } catch (e) {
    console.log('Testlauf abgebrochen: ' + (e && e.stack || e)); fails++;
  }
  await browser.close();
  console.log(fails ? `SOME FAILED (${fails} von ${oks + fails})` : `ALL GOOD (${oks})`);
  process.exit(fails ? 1 : 0);
})();
