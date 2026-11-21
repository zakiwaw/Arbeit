// Sync-Prüfungen: Löschen / Deaktivieren / Umbenennen kommen auch bei schnellem Bedienen und langsamen oder gestörten
// Serverantworten zuverlässig durch – nichts kommt zurück. Außerdem die blockierende Rückmeldung (Spinner mit Text).
// Voraussetzung: Server auf :8000 (siehe tests/README.md). Start: node tests/synccheck.js
const { launch, makeBackend, openApp, sampleData, scan, MA2_TOKEN, MA2_USER } = require('./helpers');
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, oks = 0;
const assert = (c, m) => { console.log((c ? 'ok  : ' : 'FAIL: ') + m); if (c) oks++; else fails++; };
const STORE = 'frachtSicherungMobile_V8_18_Refactored', LKW = 'frachtLkwStatusV1';
const localShipments = page => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), STORE);
const localLkw = page => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), LKW);
const lkwPending = page => page.evaluate((k) => localStorage.getItem(k + '_lkwStatusPending') === '1', STORE);
const syncPending = page => page.evaluate((k) => JSON.parse(localStorage.getItem(k + '_syncPending') || '{"changed":{},"deleted":{}}'), STORE).then(p => Object.assign({ order: [] }, p));
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
    // Server lehnt ab, solange failNext > 0 – hoch ansetzen, damit nicht schon der nächste 3-s-Abruf die Änderung
    // nachschickt, bevor der Zwischenstand geprüft ist (sonst hängt das Ergebnis von der Abruf-Phase ab)
    be.delay.loadChanges = 0; be.delay.saveLkwStatus = 0; be.failNext.saveLkwStatus = 99;
    assert(await clickToggle(page, 'MAN 1'), 'Schalter „MAN 1“ wieder aktivieren – Server antwortet diesmal mit Fehler (Sperre)');
    assert(await waitOverlayGone(page, 3000), 'Spinner wartet nach dem Fehler nicht bis zum Zeitlimit');
    assert(be.lkwStatus['MAN 1'] === false && (await localLkw(page))['MAN 1'] === true && (await lkwPending(page)), 'Nach dem Fehler: lokal aktiv + vorgemerkt, Server noch alt');
    be.failNext.saveLkwStatus = 0;
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
    be.failNext.saveLkwStatus = 99;                      // ablehnen, bis der Zwischenstand geprüft ist (s. o.)
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(300);
    assert(await clickToggle(page, 'MAN 1'), 'Deaktivieren – Server lehnt ab');
    assert(await waitOverlayGone(page, 3000) && (await lkwPending(page)) && be.lkwStatus['MAN 1'] !== false, 'Änderung vorgemerkt, Server noch alt');
    be.failNext.saveLkwStatus = 0;
    await page.close();
    page = await openApp(browser, be, { keepStorage: true }); await wait(600);
    assert((await localLkw(page))['MAN 1'] === false, 'Nach Neuladen: lokal weiterhin deaktiviert (Serverstand hat die vorgemerkte Änderung nicht überschrieben)');
    assert(await waitFor(async () => be.lkwStatus['MAN 1'] === false, 8000) && !(await lkwPending(page)), 'Vorgemerkte Änderung wurde nachgeschickt und bestätigt');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();

    // ================= 9.3: sichere Synchronisation – zwei Geräte, echtes Code.gs 2.9 (tests/gas-env.js) =================
    // Gerät A = Mitarbeiter 1 (127.0.0.1), Gerät B = Mitarbeiter 2 (localhost → eigener localStorage). Beide reden mit demselben Server.
    // „Ohne Netz“ je Gerät: be.blockUsers (Anfragen dieses Benutzers scheitern); navigator.onLine ist im Testbrowser prozessweit,
    // deshalb wird page.setOfflineMode nur mit einem einzelnen Gerät geprüft (Schritt 8).
    be = makeBackend(sampleData(), {}, { gas: true });
    const pageA = await openApp(browser, be, {}); await wait(800);
    const serverRow = base => be.gas.shipmentRows()[base];
    const indicator = page => page.evaluate(() => (document.getElementById('syncIndicator') || {}).title || '');
    const errorText = page => page.evaluate(() => (document.getElementById('errorDisplay') || {}).textContent || '');
    const nameCell = (page, base) => page.evaluate((b) => { const r = document.querySelector(`#shipmentTableBody tr[data-basenumber="${b}"]`); const n = r && r.querySelector('td.time-cell .modified-by'); return n ? n.textContent.trim() : (r ? '' : null); }, base);
    const itemStatus = (page, base, hu) => page.evaluate((k, b, h) => { const s = JSON.parse(localStorage.getItem(k) || '{}')[b]; const it = s && s.scannedItems.find(i => i.rawInput === h); return it ? it.status : null; }, STORE, base, hu);
    const setStatus = (page, v) => page.evaluate((v) => { const sel = document.getElementById('securityStatusSelect'); sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    const netBack = (page, userId) => { be.blockUsers.delete(userId); return page.evaluate(() => window.dispatchEvent(new Event('online'))); }; // Netz zurück → Browser-Ereignis „online“
    const saves = () => be.requests.filter(r => r.action === 'saveShipments');
    const newShipment = async (pg, base, total) => { await scan(pg, base, 400); await pg.evaluate((t) => { document.getElementById('newTotalInput').value = t; document.getElementById('confirmNewTotalBtn').click(); }, String(total)); await wait(400); };
    const O = '9007000001', O2 = '9007000002';

    // ---------- 7) Startseite zeigt den Namen aus lastModifiedBy; Server-Stand trägt Version 1 ----------
    let sA = await localShipments(pageA);
    assert(sA[O] && sA[O].version === 1 && sA[O].lastModifiedBy === 'Mitarbeiter 1', `Gerät A hat die Sendung mit version 1 + lastModifiedBy (${sA[O] && sA[O].version}, ${sA[O] && sA[O].lastModifiedBy})`);
    assert((await nameCell(pageA, O)) === 'Mitarbeiter 1', `„Zuletzt bearbeitet“ zeigt den Namen unter der Zeit (${await nameCell(pageA, O)})`);
    const cardHeights = await pageA.evaluate(() => [...document.querySelectorAll('#shipmentTableBody tr')].map(tr => Math.round(tr.getBoundingClientRect().height)));
    assert(cardHeights.length === 3 && cardHeights.every(h => h === cardHeights[0]), `Kartenhöhe mit Namen unverändert gleich hoch (${cardHeights.join('/')})`);

    // ---------- 8) Offline (navigator.onLine = false): nichts wird gesendet, Sync-Punkt sagt es, nach „online“ geht es raus ----------
    be.offline = true; await pageA.setOfflineMode(true);
    const sends0 = saves().length;
    await setStatus(pageA, 'XRY'); await scan(pageA, 'HU1001', 500);
    assert((await itemStatus(pageA, O, 'HU1001')) === 'XRY', 'Offline gescannt: HU1001 = XRY (lokal gespeichert)');
    let pA = await syncPending(pageA);
    assert(pA.changed[O] === true && Array.isArray(pA.order) && pA.order[0] === O, `Warteschlange: ${JSON.stringify(pA)}`);
    assert(await waitFor(async () => /Offline – 1 Änderung wartet/.test(await indicator(pageA)), 8000), `Sync-Punkt: „Offline – 1 Änderung wartet“ (${await indicator(pageA)})`);
    assert(saves().length === sends0 && !be.actions.slice(-6).some(a => a === 'saveShipments'), 'Offline wird kein Speichern versucht');
    be.offline = false; await pageA.setOfflineMode(false);
    assert(await waitFor(async () => serverRow(O).shipment.version === 2, 6000), 'Netz zurück → Sendung auf dem Server in Version 2');
    const req1 = saves().slice(-1)[0].payload;
    assert(req1.versions && req1.versions[O] === 1 && req1.modifiedBy === 'Mitarbeiter 1' && Array.isArray(req1.order) && req1.order[0] === O, `Gesendet mit versions/modifiedBy/order (${JSON.stringify({ v: req1.versions, by: req1.modifiedBy, o: req1.order })})`);
    assert(await waitFor(async () => !(await syncPending(pageA)).order.length, 4000) && /Synchronisiert/.test(await indicator(pageA)), 'Warteschlange leer, Sync-Punkt „Synchronisiert“');

    // ---------- 9) Zwei Geräte ohne Netz an derselben HAWB, verschiedene HUs → beides bleibt, kein Konflikt ----------
    const pageB = await openApp(browser, be, { url: 'http://localhost:8000/index.html', session: { token: MA2_TOKEN, user: MA2_USER, expires: Date.now() + 3600e3 } }); await wait(800);
    assert((await itemStatus(pageB, O, 'HU1001')) === 'XRY' && (await nameCell(pageB, O)) === 'Mitarbeiter 1', 'Gerät B (Mitarbeiter 2) sieht den Stand von A samt Namen');
    be.blockUsers.add('u-admin'); be.blockUsers.add('u-ma2');
    await setStatus(pageA, 'XRY'); await scan(pageA, 'HU1002', 500);
    await setStatus(pageB, 'XRY'); await scan(pageB, 'HU1003', 500);
    assert((await syncPending(pageA)).changed[O] === true && (await syncPending(pageB)).changed[O] === true && serverRow(O).shipment.version === 2, 'Beide Änderungen warten lokal, Server noch bei Version 2');
    await pageA.bringToFront(); await wait(300);
    await netBack(pageA, 'u-admin');
    assert(await waitFor(async () => serverRow(O).shipment.version === 3, 6000), 'A zuerst: Version 3');
    await pageB.bringToFront(); await wait(300);
    await netBack(pageB, 'u-ma2');
    assert(await waitFor(async () => serverRow(O).shipment.version === 4, 6000), 'B danach (Ausgangsstand Version 2 → Merge): Version 4');
    let row = serverRow(O);
    const huStatus = hu => row.shipment.scannedItems.find(i => i.rawInput === hu).status;
    assert(huStatus('HU1001') === 'XRY' && huStatus('HU1002') === 'XRY' && huStatus('HU1003') === 'XRY', 'Server: alle drei Scans vorhanden, nichts verloren');
    assert(row.shipment.lastModifiedBy === 'Mitarbeiter 2' && row.modifiedBy === 'Mitarbeiter 2', `lastModifiedBy = Mitarbeiter 2 (JSON + Spalte F: ${row.modifiedBy})`);
    assert(!/Konflikt/.test(await errorText(pageB)) && !/Konflikt/.test(await errorText(pageA)), 'Kein Konflikt gemeldet (verschiedene HUs lassen sich sauber zusammenführen)');
    const reqB = saves().slice(-1)[0].payload;
    assert(reqB.versions[O] === 2 && reqB.modifiedBy === 'Mitarbeiter 2', `B hat Version 2 als Ausgangsstand geschickt (${JSON.stringify(reqB.versions)}, ${reqB.modifiedBy})`);
    await pageA.bringToFront(); await wait(300);
    assert(await waitFor(async () => (await itemStatus(pageA, O, 'HU1003')) === 'XRY', 6000), 'A sieht den Scan von B');
    assert(await waitFor(async () => (await itemStatus(pageB, O, 'HU1002')) === 'XRY', 6000), 'B sieht den Scan von A');
    sA = await localShipments(pageA);
    assert(sA[O].version === 4 && sA[O].lastModifiedBy === 'Mitarbeiter 2' && (await nameCell(pageA, O)) === 'Mitarbeiter 2', `A: version 4, Name Mitarbeiter 2 in der Liste (${await nameCell(pageA, O)})`);
    assert(!(await syncPending(pageA)).order.length && !(await syncPending(pageB)).order.length, 'Warteschlangen beider Geräte leer');

    // ---------- 10) Echter Konflikt: beide setzen ohne Netz DIESELBE HU verschieden → Meldung auf B, Protokoll, nichts still verworfen ----------
    be.blockUsers.add('u-admin'); be.blockUsers.add('u-ma2');
    await setStatus(pageA, 'XRY'); await scan(pageA, 'HU2001', 500);
    await setStatus(pageB, 'ETD'); await scan(pageB, 'HU2001', 500);
    await pageA.bringToFront(); await wait(300);
    await netBack(pageA, 'u-admin');
    assert(await waitFor(async () => serverRow(O2).shipment.version === 2, 6000), 'A zuerst: HU2001 = XRY (Version 2)');
    await pageB.bringToFront(); await wait(300);
    await netBack(pageB, 'u-ma2');
    assert(await waitFor(async () => serverRow(O2).shipment.version === 3, 6000), 'B danach: Version 3');
    row = serverRow(O2);
    assert(huStatus('HU2001') === 'ETD' && row.shipment.lastModifiedBy === 'Mitarbeiter 2', `Gültig ist der eingehende Stand von B (HU2001 = ${huStatus('HU2001')})`);
    const lastChange = row.shipment.changes[row.shipment.changes.length - 1];
    assert(lastChange.k === 'conflict' && lastChange.u === 'Mitarbeiter 2' && lastChange.by === 'Mitarbeiter 1' && lastChange.n === 1, `Protokoll: Konflikt-Eintrag (${JSON.stringify(lastChange)})`);
    const errB = await errorText(pageB);
    assert(/Konflikt bei 9007000002/.test(errB) && /gleichzeitig von Mitarbeiter 1/.test(errB) && /HU HU2001 Status: jetzt ETD \(Eingabe XRY von Mitarbeiter 1 überschrieben\)/.test(errB) && /Version 3/.test(errB), `B zeigt die Konfliktmeldung: „${errB}“`);
    await pageA.bringToFront(); await wait(300);
    assert(await waitFor(async () => (await itemStatus(pageA, O2, 'HU2001')) === 'ETD', 6000), 'A übernimmt den gültigen Stand (ETD)');
    assert(!/Konflikt/.test(await errorText(pageA)), 'A (dessen Eingabe überschrieben wurde) bekommt keine Fehlermeldung – der Protokolleintrag hält es fest');

    // ---------- 11) Änderungsprotokoll (Modal) auf A ----------
    await pageA.bringToFront(); await wait(300);
    await pageA.evaluate(() => document.getElementById('changeLogBtn').click());
    await waitFor(async () => await pageA.evaluate(() => document.querySelectorAll('#changeLogList tbody tr').length >= 7), 8000);
    let log = await pageA.evaluate(() => ({ open: document.getElementById('changeLogModal').classList.contains('visible'), rows: [...document.querySelectorAll('#changeLogList tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim())), hint: document.getElementById('changeLogHint').textContent }));
    assert(log.open && log.rows.length >= 7, `Protokoll offen, ${log.rows.length} Einträge (${log.hint})`);
    assert(log.rows[0][1] === O2 && log.rows[0][2] === 'Mitarbeiter 2' && log.rows[0][5] === 'Konflikt mit Mitarbeiter 1' && /^Fertig · WE 1\/1 · Sich\. 1\/1$/.test(log.rows[0][3]) && /^Fertig · WE 2\/1 · Sich\. 1\/1$/.test(log.rows[0][4]), `Neuester Eintrag: HAWB, Benutzer, alter → neuer Status, Art (${JSON.stringify(log.rows[0])})`);
    assert(log.rows[1][1] === O2 && log.rows[1][2] === 'Mitarbeiter 1' && log.rows[1][5] === 'Änderung' && /^Offen · WE 0\/1 · Sich\. 0\/1$/.test(log.rows[1][3]), `Eintrag davor: Änderung von Mitarbeiter 1 (${JSON.stringify(log.rows[1])})`);
    assert(log.rows.every(r => r[0] && r[1] && r[2]) && log.rows.some(r => r[5] === 'Neu'), 'Jeder Eintrag hat Zeit, HAWB und Benutzer; Anlage als „Neu“');
    await pageA.evaluate(() => document.getElementById('closeChangeLogButton').click()); await wait(200);
    assert(!(await pageA.evaluate(() => document.getElementById('changeLogModal').classList.contains('visible'))), 'Protokoll geschlossen');

    // ---------- 12) Dieselbe NEUE Sendung auf beiden Geräten ohne Netz angelegt → eine Zeile, beide Packstücke, kein Duplikat ----------
    be.blockUsers.add('u-admin'); be.blockUsers.add('u-ma2');
    await setStatus(pageA, 'XRY'); await newShipment(pageA, 'N777', 2);
    await setStatus(pageB, 'XRY'); await newShipment(pageB, 'N777', 2);
    assert((await localShipments(pageA)).N777 && (await localShipments(pageB)).N777 && !serverRow('N777'), 'N777 auf beiden Geräten angelegt (ohne Netz), Server kennt sie noch nicht');
    await pageA.bringToFront(); await wait(300);
    await netBack(pageA, 'u-admin');
    assert(await waitFor(async () => serverRow('N777') && serverRow('N777').shipment.version === 1, 6000), 'A: N777 neu auf dem Server (Version 1)');
    await pageB.bringToFront(); await wait(300);
    await netBack(pageB, 'u-ma2');
    assert(await waitFor(async () => serverRow('N777').shipment.version === 2, 6000), 'B: zusammengeführt (Version 2)');
    row = serverRow('N777');
    assert(be.gas.sheets.shipments.rows.filter(r => r[0] === 'N777').length === 1 && row.shipment.scannedItems.length === 2 && row.shipment.totalPiecesExpected === 2, `Eine Zeile, beide Packstücke (${row.shipment.scannedItems.length}), Stückzahl 2`);
    assert(!/Konflikt/.test(await errorText(pageB)), `Kein Konflikt (gleiche Stückzahl, verschiedene Packstücke): „${await errorText(pageB)}“`);
    await pageA.bringToFront(); await wait(300);
    assert(await waitFor(async () => ((await localShipments(pageA)).N777 || {}).scannedItems?.length === 2, 6000), 'A sieht beide Packstücke');

    // ---------- 13) Alte Sendungen ohne Version (Zeilen aus Code.gs ≤ 2.8) → Version 1, kein Name; Speichern klappt ----------
    const gv = be.gas.call('loadChanges', { sinceVersion: 0 }, be.gasTokens['u-admin']).version;
    const oldRow = (base, total) => [base, JSON.stringify({ hawb: base, totalPiecesExpected: total, lastModified: new Date().toISOString(), scannedItems: [] }), gv + 1, new Date().toISOString(), ''];   // Zeile ohne version/lastModifiedBy/Spalte F
    be.gas.sheets.shipments.rows.push(oldRow('ALT8', 2), oldRow('ALT9', 1));
    be.gas.sheets._meta.rows[0][0] = gv + 1; delete be.gas.cache['fracht_version'];
    await pageA.bringToFront(); await wait(300);
    assert(await waitFor(async () => !!(await localShipments(pageA)).ALT9 && !!(await localShipments(pageA)).ALT8, 6000), 'ALT8/ALT9 kommen per Abruf an');
    sA = await localShipments(pageA);
    assert(sA.ALT9.version === 1 && sA.ALT9.lastModifiedBy === '' && Array.isArray(sA.ALT9.changes) && (await nameCell(pageA, 'ALT9')) === '', `ALT9: Version 1, kein Name (Liste zeigt nur die Zeit) (${sA.ALT9.version}, „${sA.ALT9.lastModifiedBy}“, Zelle ${JSON.stringify(await nameCell(pageA, 'ALT9'))})`);
    await setStatus(pageA, 'XRY'); await scan(pageA, 'ALT9', 500);
    assert(await waitFor(async () => { const r = serverRow('ALT9'); return r && r.shipment && r.shipment.version === 2; }, 6000), 'ALT9 gespeichert → Version 2');
    assert(serverRow('ALT9').modifiedBy === 'Mitarbeiter 1' && serverRow('ALT9').shipment.lastModifiedBy === 'Mitarbeiter 1', 'ALT9: Name in Spalte F und im JSON');
    assert(!/Konflikt/.test(await errorText(pageA)), 'Kein Konflikt beim ersten Speichern einer alten Sendung');

    // ---------- 14) Antwort geht verloren → Wiederholung ändert nichts (keine Doppelten, keine zweite Version) ----------
    be.dropNext.saveShipments = 1;
    await setStatus(pageA, 'XRY'); await scan(pageA, 'ALT8', 500);
    assert(await waitFor(async () => serverRow('ALT8').shipment.version === 2, 4000), 'Server hat den Scan verarbeitet (Version 2), Antwort ging verloren');
    assert((await syncPending(pageA)).changed.ALT8 === true, 'A hält die Änderung weiter vorgemerkt');
    assert(await waitFor(async () => !(await syncPending(pageA)).changed.ALT8, 10000), 'Wiederholung beim nächsten Abruf bestätigt');
    row = serverRow('ALT8');
    // ein Scan = Sicherungs-Eintrag + automatischer Wareneingangs-Eintrag (App-Logik) → genau 2 Einträge, ein Protokolleintrag (alte Sendung hatte keinen „Neu“-Eintrag)
    assert(row.shipment.version === 2 && row.shipment.scannedItems.length === 2 && row.shipment.changes.length === 1 && be.actions.includes('(antwort verloren) saveShipments'), `Keine zweite Version, kein doppeltes Packstück (v${row.shipment.version}, ${row.shipment.scannedItems.length} Einträge, ${row.shipment.changes.length} Protokolleintrag)`);
    assert(!/Konflikt/.test(await errorText(pageA)), 'Wiederholung meldet keinen Konflikt');

    // ---------- 15) Warteschlange hält die Reihenfolge: ohne Netz Q1 anlegen, Q2 anlegen, Q1 löschen → Löschung vor Q2 ----------
    be.blockUsers.add('u-admin');
    await newShipment(pageA, 'Q1', 1); await newShipment(pageA, 'Q2', 1);
    assert(await clickDelete(pageA, 'Q1'), 'Q1 gelöscht (ohne Netz)'); await wait(400);
    pA = await syncPending(pageA);
    assert(pA.deleted.Q1 === true && !pA.changed.Q1 && pA.changed.Q2 === true && pA.order.indexOf('Q1') >= 0 && pA.order.indexOf('Q1') < pA.order.indexOf('Q2'),
      `Warteschlange: Q1 (Löschung) steht vor Q2 (Anlegen): ${JSON.stringify(pA)}`);
    const n0 = be.actions.length;
    await netBack(pageA, 'u-admin');
    assert(await waitFor(async () => !(await syncPending(pageA)).order.length, 8000), 'Nach „online“ alles gesendet');
    // Beide Einträge gehen raus (Q1 als Löschvermerk, Q2 als Anlegen); die Löschung steht in der Warteschlange vor Q2.
    const seq = be.actions.slice(n0).filter(a => /^(deleteShipment|deleteShipments|saveShipments)$/.test(a));
    assert(seq.some(a => /^deleteShipment/.test(a)) && seq.lastIndexOf('saveShipments') > seq.findIndex(a => /^deleteShipment/.test(a)),
      `Löschvermerk vor dem Speichern der Änderung gesendet (${seq.join(' → ')})`);
    assert(serverRow('Q2') && serverRow('Q2').shipment.version === 1 && (!serverRow('Q1') || serverRow('Q1').flag === true), 'Server: Q2 angelegt, Q1 nicht (mehr) vorhanden');
    assert(pageA.__errors.length === 0 && pageB.__errors.length === 0, `Keine JS-Fehler auf beiden Geräten (${pageA.__errors.concat(pageB.__errors).join(' | ')})`);
    await pageA.close(); await pageB.close();

    // ================= 9.9: ungültige Sendungsnummer blockiert die Warteschlange nicht mehr =================
    // Live nachgestellt am 21.11.2026: „=USERS01“ gescannt → Server (2.11) lehnt ab, App versucht endlos, nichts synchronisiert
    // mehr. Jetzt: Eingabe wird sofort abgelehnt; kommt so ein Eintrag trotzdem in die Warteschlange (alte Fassung auf dem
    // Gerät), wird nur dieser Eintrag weggeworfen – der Rest geht durch, ohne roten Banner.
    const indicatorCls = pg => pg.evaluate(() => document.getElementById('syncIndicator').className);
    const msgOf = pg => pg.evaluate(() => ({ text: document.getElementById('errorDisplay').textContent, color: document.getElementById('errorDisplay').style.color }));
    // pageA/pageB sind const → für die neuen Szenarien eigene Variablen
    let pgA = null, pgB = null;
    // ---------- 16) Eingabe: ungültige Nummer wird gar nicht erst angelegt (Scanfeld + „Hinzufügen“) ----------
    be = makeBackend(sampleData(), {}, { gas: true });
    pgA = await openApp(browser, be, {}); await wait(800);   // neues Gerät (eigener Speicher je Seitenaufruf)
    const pend0 = JSON.stringify(await syncPending(pgA));   // Gerät ist neu → Warteschlange muss leer bleiben
    const sendsInput = be.requests.filter(r => r.action === 'saveShipments').length;
    await scan(pgA, '=USERS01', 600);
    let storeA = await localShipments(pgA);
    assert(!storeA['=USERS01'], 'Scan „=USERS01“: keine Sendung angelegt');
    assert(await pgA.evaluate(() => !document.getElementById('newTotalSection').classList.contains('visible')), 'Keine Stückzahl-Abfrage für eine ungültige Nummer (auch kein „Hinzufügen“-Weg)');
    let m16 = await msgOf(pgA);
    assert(m16.text === 'Ungültige Sendungsnummer: Sie darf nicht mit =, +, - oder @ beginnen.', `Klare Meldung bei der Eingabe („${m16.text}“)`);
    assert(JSON.stringify(await syncPending(pgA)) === pend0 && be.requests.filter(r => r.action === 'saveShipments').length === sendsInput, 'Kein Eintrag in der Warteschlange, nichts gespeichert');
    await scan(pgA, '@ABC', 400); await scan(pgA, '-77', 400); await scan(pgA, '+1', 400);
    storeA = await localShipments(pgA);
    assert(!storeA['@ABC'] && !storeA['-77'] && !storeA['+1'], 'Auch @ABC, -77 und +1 werden nicht angelegt');
    await scan(pgA, 'GUT123', 600);   // gültige, neue Nummer: Stückzahl-Abfrage wie bisher
    assert(await pgA.evaluate(() => document.getElementById('newTotalSection').classList.contains('visible')), 'Gültige Nummer → normale Stückzahl-Abfrage');
    await pgA.evaluate(() => { document.getElementById('newTotalInput').value = '1'; document.getElementById('confirmNewTotalBtn').click(); }); await wait(700);
    storeA = await localShipments(pgA);
    assert(!!storeA.GUT123 && storeA.GUT123.hawb === 'GUT123', 'Gültige Nummer GUT123 wird normal angelegt (wie bisher)');
    assert(await waitFor(async () => { const r = serverRow('GUT123'); return r && r.shipment && r.shipment.version === 1; }, 6000), 'GUT123 geht normal zum Server');
    assert(pgA.__errors.length === 0, `Keine JS-Fehler (${pgA.__errors.join(' | ')})`);
    await pgA.close();

    // ---------- 17) Blockierte Warteschlange (ALTER Eintrag =USERS01 + gültige 123) → 123 geht durch, =USERS01 fällt weg ----------
    // wie auf einem Gerät mit App 9.8: der Eintrag liegt schon in der Warteschlange (ohne Netz erfasst), die App startet damit.
    // „Neu laden“ geht hier nicht (die Tests leeren dabei den Speicher) → Warteschlange im laufenden Betrieb füllen und
    // das Senden mit dem Browser-Ereignis „online“ anstoßen.
    be = makeBackend(sampleData(), {}, { gas: true });
    pgA = await openApp(browser, be, {}); await wait(800);
    await pgA.evaluate((STORE) => {
        const st = JSON.parse(localStorage.getItem(STORE) || '{}');
        const now = new Date().toISOString();
        st['=USERS01'] = { hawb: '=USERS01', lastModified: now, totalPiecesExpected: null, scannedItems: [{ rawInput: '=USERS01', status: 'XRY', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null }], mitarbeiter: 'Mitarbeiter 1' };
        st['123'].lastModified = now;
        localStorage.setItem(STORE, JSON.stringify(st));
        const p = JSON.parse(localStorage.getItem(STORE + '_syncPending') || '{"changed":{},"deleted":{},"order":[]}');
        p.changed['=USERS01'] = true; p.changed['123'] = true; p.order = ['=USERS01', '123'];
        localStorage.setItem(STORE + '_syncPending', JSON.stringify(p));
        window.dispatchEvent(new Event('online'));   // → pollNow() → flushPendingChanges()
    }, STORE);
    assert(await waitFor(async () => !(await syncPending(pgA)).order.length, 10000), `Warteschlange läuft leer (${JSON.stringify(await syncPending(pgA))})`);
    storeA = await localShipments(pgA);
    assert(!storeA['=USERS01'], 'Ungültiger CHANGE ohne Serverstand: lokal entfernt');
    assert(!!serverRow('123') && serverRow('123').shipment.version === 1 && (await syncPending(pgA)).order.length === 0, `Gültige Sendung 123 war schon auf dem Server und bleibt dort (v${((serverRow('123') || {}).shipment || {}).version})`);
    const banner17 = await msgOf(pgA);
    assert(!/Server nicht erreichbar/.test(banner17.text) && banner17.color !== 'red' && !/is-error/.test(await indicatorCls(pgA)), `Kein roter Banner „Server nicht erreichbar“ (${JSON.stringify(banner17)})`);
    assert(banner17.text.includes('Sendungsnummer =USERS01 wurde nicht gespeichert, weil sie ungültig ist.') && banner17.text.includes('Die anderen Sendungen wurden normal synchronisiert.'),
      `Meldung mit der betroffenen Nummer („${banner17.text}“)`);
    assert(pgA.__errors.length === 0, `Keine JS-Fehler (${pgA.__errors.join(' | ')})`);
    await pgA.close();

    // ---------- 18) Umbenennen auf eine ungültige Nummer: lokaler Stand wird auf den Serverstand zurückgesetzt ----------
    be = makeBackend(sampleData(), {});   // Stub speichert ungeprüft – so bleibt der Stand „auf dem Server“ erhalten
    pgA = await openApp(browser, be, {}); await wait(700);
    await pgA.evaluate((STORE) => {   // Umbenennen: Server kennt „123“, lokal heißt die Sendung jetzt „=UMB“
        const st = JSON.parse(localStorage.getItem(STORE) || '{}');
        const s = st['123'];
        st['=UMB'] = Object.assign({}, s, { hawb: '=UMB', lastModified: new Date().toISOString() });
        delete st['123'];
        localStorage.setItem(STORE, JSON.stringify(st));
        const p = JSON.parse(localStorage.getItem(STORE + '_syncPending') || '{"changed":{},"deleted":{},"order":[]}');
        delete p.changed['123']; p.changed['=UMB'] = true; p.order = ['=UMB'];
        localStorage.setItem(STORE + '_syncPending', JSON.stringify(p));
        window.dispatchEvent(new Event('online'));
    }, STORE);
    assert(await waitFor(async () => !(await syncPending(pgA)).order.length, 10000), 'Umbenennen auf eine ungültige Nummer: Eintrag fällt aus der Warteschlange');
    storeA = await localShipments(pgA);
    assert(!storeA['=UMB'] && !!storeA['123'], `Lokaler Stand auf den Serverstand zurückgesetzt (123 wieder da, =UMB weg: ${Object.keys(storeA).join(',')})`);
    const t18 = await msgOf(pgA);
    assert(t18.text.includes('Sendungsnummer =UMB wurde nicht gespeichert, weil sie ungültig ist.') && !/Server nicht erreichbar/.test(t18.text), `Meldung ohne roten Banner („${t18.text}“)`);
    assert(pgA.__errors.length === 0, `Keine JS-Fehler (${pgA.__errors.join(' | ')})`);
    await pgA.close();

    // ---------- 19) DELETE-Vermerk mit ungültiger Nummer, die es nie auf dem Server gab → nur lokal erledigt, kein Aufruf ----------
    be = makeBackend(sampleData(), {}, { gas: true });
    pgA = await openApp(browser, be, {}); await wait(800);
    const delReqs0 = be.requests.length;
    await pgA.evaluate((STORE) => {
        const p = JSON.parse(localStorage.getItem(STORE + '_syncPending') || '{"changed":{},"deleted":{},"order":[]}');
        p.deleted['=GONE'] = true; p.order = ['=GONE'];
        localStorage.setItem(STORE + '_syncPending', JSON.stringify(p));
        window.dispatchEvent(new Event('online'));
    }, STORE);
    assert(await waitFor(async () => !(await syncPending(pgA)).order.length, 8000), 'Löschvermerk für eine nie vorhandene ungültige Nummer: lokal erledigt');
    assert(!be.requests.slice(delReqs0).some(r => r.action === 'deleteShipments' || r.action === 'deleteShipment'), 'Dafür wurde kein Server-Aufruf gemacht');
    assert(!Object.keys(be.gas.shipmentRows()).includes('=GONE'), 'Keine Zeile für die ungültige Nummer angelegt');
    assert(pgA.__errors.length === 0, `Keine JS-Fehler (${pgA.__errors.join(' | ')})`);
    await pgA.close();

    // ---------- 20) DELETE-Vermerk für eine ungültige Nummer, die auf dem Server liegt → Server nimmt ihn an ----------
    // Rettung für ein Gerät mit der Sendung aus 2.11: Löschen hilft jetzt, statt denselben Fehler zu bekommen.
    be = makeBackend(sampleData(), {}, { gas: true });
    pgA = await openApp(browser, be, {}); await wait(800);
    // Zeile existiert schon (vor 2.11 angelegt; 2.12 würde sie beim Speichern überspringen) → direkt ins Blatt schreiben
    const gvRow = be.gas.call('loadChanges', { sinceVersion: 0 }, be.gasTokens['u-admin']).version + 1;
    be.gas.sheets.shipments.rows.push(['=ALTBESTAND', JSON.stringify({ hawb: '=ALTBESTAND', scannedItems: [] }), gvRow, new Date().toISOString(), '']);
    be.gas.sheets._meta.rows[0][0] = gvRow; delete be.gas.cache['fracht_version'];
    await pgA.evaluate((STORE) => {
        // Ausgangsstand wie beim Server (Sendung bekannt) – sonst gilt der Vermerk als „nie auf dem Server“ und wird lokal erledigt
        const st = JSON.parse(localStorage.getItem(STORE) || '{}');
        st['=ALTBESTAND'] = { hawb: '=ALTBESTAND', scannedItems: [] };
        localStorage.setItem(STORE, JSON.stringify(st));
        const snap = JSON.parse(localStorage.getItem(STORE + '_syncSnapshot') || '{}');
        snap['=ALTBESTAND'] = JSON.stringify(st['=ALTBESTAND']);
        localStorage.setItem(STORE + '_syncSnapshot', JSON.stringify(snap));
        const p = JSON.parse(localStorage.getItem(STORE + '_syncPending') || '{"changed":{},"deleted":{},"order":[]}');
        p.deleted['=ALTBESTAND'] = true; p.order = ['=ALTBESTAND'];
        localStorage.setItem(STORE + '_syncPending', JSON.stringify(p));
        window.dispatchEvent(new Event('online'));
    }, STORE);
    assert(await waitFor(async () => (serverRow('=ALTBESTAND') || {}).flag === true, 6000), `Server nimmt den Löschvermerk für die vorhandene (ungültige) Nummer an (${JSON.stringify((serverRow('=ALTBESTAND') || {}).flag)})`);
    assert(await waitFor(async () => !(await syncPending(pgA)).order.length, 8000), 'Danach ist der Vermerk aus der Warteschlange');
    assert(pgA.__errors.length === 0, `Keine JS-Fehler (${pgA.__errors.join(' | ')})`);
    await pgA.close();

    // ---------- 21) FORBIDDEN beim Löschen (Mitarbeiter): nur dieser Vermerk fällt weg, die Änderung geht durch ----------
    be = makeBackend(sampleData(), {}, { gas: true });
    pgA = await openApp(browser, be, { session: { token: MA2_TOKEN, user: MA2_USER, expires: Date.now() + 3600e3 } }); await wait(800);
    await pgA.evaluate((STORE) => {   // Mitarbeiter hat gelöscht (nur Admin) und parallel gescannt
        const st = JSON.parse(localStorage.getItem(STORE) || '{}');
        delete st['9007000002'];
        st['9007000001'].scannedItems.push({ rawInput: 'HU1001', status: 'XRY', timestamp: new Date().toISOString(), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null });
        localStorage.setItem(STORE, JSON.stringify(st));
        const p = JSON.parse(localStorage.getItem(STORE + '_syncPending') || '{"changed":{},"deleted":{},"order":[]}');
        p.deleted['9007000002'] = true; p.changed['9007000001'] = true;
        p.order = ['9007000002', '9007000001'];
        localStorage.setItem(STORE + '_syncPending', JSON.stringify(p));
        window.dispatchEvent(new Event('online'));
    }, STORE);
    assert(await waitFor(async () => !(await syncPending(pgA)).order.length, 10000), `FORBIDDEN: Warteschlange läuft leer (${JSON.stringify(await syncPending(pgA))})`);
    storeA = await localShipments(pgA);
    assert(!!storeA['9007000002'] && storeA['9007000002'].hawb === '9007000002', 'FORBIDDEN-Löschung: Sendung kommt lokal aus dem Serverstand zurück');
    assert((serverRow('9007000002') || {}).flag !== true && !!(serverRow('9007000002') || {}).shipment, 'Server: Sendung ist nicht gelöscht');
    assert(serverRow('9007000001').shipment.scannedItems.some(i => i.rawInput === 'HU1001' && i.status === 'XRY'), 'Die Änderung an der anderen Sendung wurde normal synchronisiert');
    const t21 = await msgOf(pgA);
    assert(t21.text.includes('Sendungsnummer 9007000002 wurde nicht gelöscht – Löschen ist nur für Administratoren erlaubt.') && !/Server nicht erreichbar/.test(t21.text), `Meldung zum weggeworfenen Vermerk („${t21.text}“)`);
    assert(pgA.__errors.length === 0, `Keine JS-Fehler (${pgA.__errors.join(' | ')})`);
    await pgA.close();

    // ---------- 22) Vorübergehende Fehler werden NICHT weggeworfen: „Sperre“ und offline werden weiter versucht ----------
    be = makeBackend(sampleData(), {}, { gas: true });
    pgB = await openApp(browser, be, {}); await wait(800);
    be.failNext.saveShipments = 2;                       // Server meldet „beschäftigt (Sperre)“ → vorübergehend
    await setStatus(pgB, 'XRY'); await scan(pgB, 'HU1002', 400);
    assert((await syncPending(pgB)).changed['9007000001'] === true, 'Sperre: Änderung bleibt in der Warteschlange (nicht weggeworfen)');
    assert(await waitFor(async () => ((serverRow('9007000001') || {}).shipment || {}).scannedItems && serverRow('9007000001').shipment.scannedItems.some(i => i.rawInput === 'HU1002' && i.status === 'XRY'), 12000), 'Sperre: wird weiter versucht und kommt durch');
    assert(!(await syncPending(pgB)).changed['9007000001'], 'Danach aus der Warteschlange entfernt (bestätigt)');
    be.offline = true; await pgB.setOfflineMode(true);
    await setStatus(pgB, 'XRY'); await scan(pgB, 'HU1003', 500);
    assert((await syncPending(pgB)).changed['9007000001'] === true, 'Offline: Änderung bleibt in der Warteschlange');
    assert(await waitFor(async () => /Offline – 1 Änderung wartet/.test(await indicator(pgB)), 8000), `Offline: Sync-Punkt sagt es (${await indicator(pgB)})`);
    be.offline = false; await pgB.setOfflineMode(false);
    assert(await waitFor(async () => !(await syncPending(pgB)).order.length, 10000), 'Netz zurück: wird nachgeschickt');
    assert(serverRow('9007000001').shipment.scannedItems.some(i => i.rawInput === 'HU1003' && i.status === 'XRY'), 'Offline-Scan ist auf dem Server angekommen');
    assert(pgB.__errors.length === 0, `Keine JS-Fehler (${pgB.__errors.join(' | ')})`);
    await pgB.close();

    // ---------- 23) Antwort „skipped“ des Servers (2.12): die genannte Nummer fällt weg, statt ewig wiederholt zu werden ----------
    // Der Abruf filtert ungültige Nummern schon vorher weg; überspringt der Server trotzdem eine (z. B. strengere Regel oder
    // Vermerk eines anderen Geräts), muss die App sie aus der Warteschlange nehmen – sonst stünde die Warteschlange wieder.
    be = makeBackend(sampleData(), {}, {});   // Stub; die Antwort für saveShipments wird unten nachgestellt
    pgA = await openApp(browser, be, {}); await wait(800);
    await pgA.evaluate((STORE) => {
        const st = JSON.parse(localStorage.getItem(STORE) || '{}');
        const now = new Date().toISOString();
        st['555'] = { hawb: '555', lastModified: now, totalPiecesExpected: 1, scannedItems: [{ rawInput: '555', status: 'XRY', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null }] };
        localStorage.setItem(STORE, JSON.stringify(st));
        const p = JSON.parse(localStorage.getItem(STORE + '_syncPending') || '{"changed":{},"deleted":{},"order":[]}');
        p.changed['555'] = true; p.order = ['555'];
        localStorage.setItem(STORE + '_syncPending', JSON.stringify(p));
        // Server (2.12) überspringt „555“ und meldet das in skipped – so tun als käme genau diese Antwort
        window.__origPostToServer = postToServer;
        window.postToServer = async function (action, payload) {
            if (action === 'saveShipments') return { status: 'success', version: 1, merged: {}, conflicts: [], skipped: [{ base: '555', reason: 'Ungültige Sendungsnummer: Sie darf nicht mit =, +, - oder @ beginnen.' }] };
            return window.__origPostToServer(action, payload);
        };
        window.dispatchEvent(new Event('online'));
    }, STORE);
    assert(await waitFor(async () => !(await syncPending(pgA)).order.length, 8000), `skipped: Nummer verlässt die Warteschlange (${JSON.stringify(await syncPending(pgA))})`);
    await wait(3500);   // ein bis zwei Abrufe abwarten: nichts darf wieder auftauchen
    assert((await syncPending(pgA)).order.length === 0, 'skipped: bleibt draußen (kein ewiger Neuversuch)');
    storeA = await localShipments(pgA);
    assert(!storeA['555'], 'skipped: Sendung ohne Serverstand lokal entfernt');
    const t23 = await msgOf(pgA);
    assert(t23.text.includes('Sendungsnummer 555 wurde nicht gespeichert, weil sie ungültig ist.') && !/Server nicht erreichbar/.test(t23.text) && t23.color !== 'red',
      `skipped: Meldung ohne roten Banner („${t23.text}“)`);
    assert(pgA.__errors.length === 0, `Keine JS-Fehler (${pgA.__errors.join(' | ')})`);
    await pgA.close();
  } catch (e) {
    console.log('Testlauf abgebrochen: ' + (e && e.stack || e)); fails++;
  }
  await browser.close();
  console.log(fails ? `SOME FAILED (${fails} von ${oks + fails})` : `ALL GOOD (${oks})`);
  process.exit(fails ? 1 : 0);
})();
