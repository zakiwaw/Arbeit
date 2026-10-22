// Drive-Import Ende-zu-Ende: backend/Code.gs legt aus der HYDAC-Textdatei Aufträge an (offline-Nachbildung aus gas-env.js);
// genau diese Datensätze bekommt die App vom (nachgebildeten) Server – LKW-Seite, Scan, Hinweiszeile, Seitenmenü, Desktop-Tabelle.
// Start: node tests/importcheck.js (Server auf :8000, Chrome siehe README)
const { launch, makeBackend, openApp, scan, assert, finish } = require('./helpers');
const wait = ms => new Promise(r => setTimeout(r, ms));

// 1) Serverseite: Datei → Sheet-Zeilen
const env = require('./gas-env')();
env.call('authUsers'); const inv = /einladung=([0-9a-f]+)/.exec(env.mails[0].body)[1];
const adminTok = env.call('authAccept', { invite: inv, pin: '482913', deviceId: 'dev1' }).token;
const HYDAC_TXT = ['USA', '8118740144', '8118749096', '8118746244', '8118749072', '8118749073', '8118750973', '8118702767', '8118727982', '',
  'South Korea', '8118742798', '8118714422', '8118738692', '8118739783', '', 'Australien', '8118746213', '8118720897', '',
  'Kanada', '8118736972', '', 'China', '8118742479', '8118743550', '8118743961', '8118714956', '8118740155', ''].join('\n');
const FILE1 = 'HYDAC_2026-10-22_18-34_Scan.txt';
const folder = env.drive.createFolder('HYDAC TXT');
folder.addFile(FILE1, HYDAC_TXT, new Date(2026, 9, 22, 18, 56));
const run = env.api.runDriveImport();
assert(run.ok === 1, 'Server: HYDAC-Datei importiert');
const served = env.call('loadChanges', { sinceVersion: 0 }, adminTok);          // das, was ein Gerät beim Start bekommt
const data = served.changed;
assert(Object.keys(data).length === 5 && data['USA 22.10.'] && data['USA 22.10.'].truckId === 'HYDAC 22.10.2026', 'Server liefert die 5 Aufträge des LKW „HYDAC 22.10.2026“ an die Geräte');

(async () => {
  const browser = await launch();
  try {
    // 2) Handy: Anlieferung → LKW-Seite → Scan
    let be = makeBackend(data, {});
    let page = await openApp(browser, be, { query: '?seite=anlieferung' }); await wait(600);
    const row = await page.evaluate(() => { const r = document.querySelector('.page-row[data-truckid="HYDAC 22.10.2026"]'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; });
    assert(row && /HYDAC 22\.10\.2026/.test(row) && /5 Aufträge/.test(row) && /20 HUs/.test(row), `Anlieferung: LKW-Zeile „HYDAC 22.10.2026 · 5 Aufträge · 20 HUs“ (${row})`);
    await page.evaluate(() => document.querySelector('.page-row[data-truckid="HYDAC 22.10.2026"]').click()); await wait(500);
    const lkw = await page.evaluate(() => ({
      title: document.getElementById('pageTitle').textContent.trim(), badge: document.getElementById('pageBadge').textContent.trim(),
      orders: Array.from(document.querySelectorAll('#pageContent table.page-shipments tr[data-basenumber]')).map(o => o.dataset.basenumber),
      sum: document.querySelector('.page-summary') ? document.querySelector('.page-summary').textContent.replace(/\s+/g, ' ').trim() : '',
      note: document.querySelector('.page-import-note') ? document.querySelector('.page-import-note').textContent : ''
    }));
    assert(/HYDAC 22\.10\.2026/.test(lkw.title) && lkw.badge === '5 Aufträge', `LKW-Seite: Kopf „${lkw.title}“ / ${lkw.badge}`);
    assert(lkw.orders.length === 5 && lkw.orders.includes('USA 22.10.') && lkw.orders.includes('SOUTH KOREA 22.10.') && lkw.orders.includes('CHINA 22.10.'), `LKW-Seite: 5 Aufträge (${lkw.orders.join(', ')})`);
    assert(/20 HUs/.test(lkw.sum) && /Sich\. 0\/20/.test(lkw.sum) && /5 offen/.test(lkw.sum), `LKW-Seite: Zusammenfassung „${lkw.sum}“`);
    assert(/Automatisch übernommen aus „HYDAC_2026-10-22_18-34_Scan\.txt“/.test(lkw.note) && /\d{2}\.\d{2}\., \d{2}:\d{2}/.test(lkw.note), `LKW-Seite: Hinweiszeile zur Herkunft (${lkw.note})`);
    // Scan eines Packstücks aus der Datei (wie am Zebra/Handy): Sicherung zählt, Auftrag „USA 22.10.“ 1/8
    await page.goBack(); await wait(300); await page.goBack(); await wait(400);   // zurück zur Startseite (Scanfeld)
    await page.evaluate(() => { const s = document.getElementById('securityStatusSelect'); s.value = 'XRY'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await scan(page, '8118740144', 700);
    const store = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored')));
    const it = store['USA 22.10.'] && store['USA 22.10.'].scannedItems.find(i => i.rawInput === '8118740144');
    assert(it && it.status === 'XRY' && store['USA 22.10.'].scannedItems.filter(i => i.status === 'Anstehend').length === 7, `Scan 8118740144 → Status XRY im Auftrag „USA 22.10.“, 7 bleiben Anstehend (${it && it.status})`);
    await wait(800);
    const saved = be.requests.filter(r => r.action === 'saveShipments').some(r => r.payload && r.payload.shipments && r.payload.shipments['USA 22.10.']);
    assert(saved, 'Scan wird für „USA 22.10.“ zum Server gespeichert (sichtbar auf allen Geräten)');
    const errs = await page.evaluate(() => (window.__errors || []).length);
    assert(errs === 0, 'Keine JS-Fehler am Handy');
    // Seitenmenü: LKW mit Schalter vorhanden (Deaktivieren später → Archivregel wie bei MAN/VW)
    const menu = await page.evaluate(() => { const li = document.querySelector('li.lkw-menu-item[data-truckid="HYDAC 22.10.2026"]'); return li ? { text: li.textContent.replace(/\s+/g, ' ').trim(), toggle: !!li.querySelector('.lkw-toggle') } : null; });
    assert(menu && menu.toggle && /HYDAC 22\.10\.2026/.test(menu.text), `Seitenmenü: LKW-Eintrag mit Schalter (${menu && menu.text})`);
    await page.close();

    // 3) Direktlink zur Sendung + Desktop-Tabelle
    be = makeBackend(data, {});
    page = await openApp(browser, be, { viewport: { width: 1400, height: 900, deviceScaleFactor: 1 }, query: '?sendung=' + encodeURIComponent('USA 22.10.') }); await wait(1200);
    const det = await page.evaluate(() => ({
      visible: getComputedStyle(document.getElementById('detailView')).display !== 'none',
      title: (document.getElementById('currentShipmentDetails').dataset.base || '') + ' | ' + document.getElementById('currentShipmentDetails').textContent.replace(/\s+/g, ' ').trim().slice(0, 120),
      rows: document.querySelectorAll('#detailView .pack-table tbody tr').length,
      first: (document.querySelector('#detailView .pack-table tbody tr') || {}).textContent || ''
    }));
    assert(det.visible && /USA 22\.10\./.test(det.title), `Desktop ?sendung=USA 22.10. öffnet die Sendungsdetails (${det.title})`);
    assert(det.rows === 8 && /8118740144/.test(det.first), `Desktop: Packstück-Tabelle mit 8 Zeilen, erste 8118740144 (${det.rows})`);
    const errs2 = await page.evaluate(() => (window.__errors || []).length);
    assert(errs2 === 0, 'Keine JS-Fehler am Desktop');
    await page.close();
  } catch (e) {
    console.log('ERR', e);
    assert(false, 'Ausnahme im Testlauf: ' + (e && e.message));
  } finally {
    await browser.close();
    finish();
  }
})();
