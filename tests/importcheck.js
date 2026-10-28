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
// MAN-Ladeliste (Format „MAN Fracht“) mit dem Prüfbericht der KI am Ende – wie in der Datei des Anwenders
const MAN_TXT = ['DB SCHENKER, USA', '9008635201', '3181 0137310',
  '1 0926101212B2|Carton|91 x 20 x 42,500 CM|5,900 KG', '2 092610100800|Einwegpalette P102|120 x 40 x 49 CM|43 KG', '',
  'DHL GLOBAL FORWARDING, AUSTRALIEN', '9008635214', '3181 0137319', '1 0926101207FB|Carton M 371|38 x 18.500 x 25 CM|2.600 KG', '',
  'Abgleichprotokoll', '', 'Gesamtzahl extrahierte HUs (laut Detailseiten + Nachlieferungen): 53', '',
  'Aufträge, die verarbeitet wurden, aber NICHT in der Übersicht stehen:', 'Keine. Alle verarbeiteten Aufträge sind in der Übersicht enthalten.', 'Zeile 3', 'Zeile 4', ''].join('\n');
const manFolder = env.drive.createFolder('MAN Ladelisten TXT');
manFolder.addFile('MAN-Ladeliste_2026-10-19_22-47_Scan.txt', MAN_TXT, new Date(2026, 9, 19, 22, 50));
const run = env.api.runDriveImport();
assert(run.ok === 2 && run.failed === 0, `Server: HYDAC-Datei + MAN-Ladeliste importiert (${JSON.stringify(run)})`);
const served = env.call('loadChanges', { sinceVersion: 0 }, adminTok);          // das, was ein Gerät beim Start bekommt
const data = served.changed;
assert(Object.keys(data).length === 7 && data['USA 22.10.'] && data['USA 22.10.'].truckId === 'HYDAC 22.10.2026', 'Server liefert die 5 Aufträge des LKW „HYDAC 22.10.2026“ an die Geräte');
assert(data['9008635201'] && data['9008635201'].truckId === 'MAN 1' && data['9008635214'] && data['9008635214'].originalManNumber === 1 && Object.keys(data).filter(b => data[b].truckId === 'MAN 1').length === 2, 'MAN-Ladeliste → LKW „MAN 1“ mit 2 Rechnungen, Prüfbericht ergibt keine Aufträge');

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

    // 2b) MAN-LKW aus der Datei: Anlieferung + LKW-Seite mit Spediteur/Land/PLSO wie beim QR-Import; „+ Auftrag“ (Desktop) nur bei MAN
    be = makeBackend(data, {});
    page = await openApp(browser, be, { query: '?seite=anlieferung&lkw=' + encodeURIComponent('MAN 1') }); await wait(700);
    const manPage = await page.evaluate(() => ({
      title: document.getElementById('pageTitle').textContent.trim(), badge: document.getElementById('pageBadge').textContent.trim(),
      rows: Array.from(document.querySelectorAll('#pageContent table.page-shipments tr[data-basenumber]')).map(r => r.textContent.replace(/\s+/g, ' ').trim()),
      sum: (document.querySelector('.page-summary') || {}).textContent || '', note: (document.querySelector('.page-import-note') || {}).textContent || ''
    }));
    assert(/MAN 1/.test(manPage.title) && manPage.badge === '2 Aufträge' && /3 HUs/.test(manPage.sum), `MAN-LKW-Seite: „${manPage.title}“ / ${manPage.badge} / ${manPage.sum.replace(/\s+/g, ' ').trim()}`);
    assert(manPage.rows.length === 2 && manPage.rows.some(r => /^9008635214/.test(r) && /MAN 1/.test(r) && /0\/1/.test(r) && /2,6 kg/.test(r)) && manPage.rows.some(r => /^9008635201/.test(r) && /0\/2/.test(r) && /48,9 kg/.test(r)), `MAN-Auftragszeilen wie beim QR-Import: Rechnung, LKW, Zähler, Gewicht aus den Packstücken (${manPage.rows.join(' || ')})`);
    assert(/MAN-Ladeliste_2026-10-19_22-47_Scan\.txt/.test(manPage.note), 'Herkunftszeile nennt die MAN-Datei');
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
    // 3b) MAN-Rechnung am Desktop: Kopf mit Spediteur/Land/PLSO, Packstück-Tabelle mit Pos/Verpackung/Maße/Gewicht, Einheit CM
    be = makeBackend(data, {});
    page = await openApp(browser, be, { viewport: { width: 1400, height: 900, deviceScaleFactor: 1 }, query: '?sendung=9008635201' }); await wait(1200);
    const detMan = await page.evaluate(() => {
      const d = document.getElementById('currentShipmentDetails');
      const rows = Array.from(document.querySelectorAll('#detailView .pack-table tbody tr')).map(r => r.textContent.replace(/\s+/g, ' ').trim());
      return { head: d.textContent.replace(/\s+/g, ' ').trim(), all: document.getElementById('detailView').textContent.replace(/\s+/g, ' ').trim(), rows, base: d.dataset.base };
    });
    assert(detMan.base === '9008635201' && /DB SCHENKER/i.test(detMan.all) && /Land: USA/.test(detMan.all) && /3181 0137310/.test(detMan.all) && /MAN 1/.test(detMan.head) && /Automatik/.test(detMan.head), `Desktop MAN-Details: Spediteur, Land, PLSO, LKW, Ersteller „Automatik“ (${detMan.all.slice(0, 220)})`);
    assert(detMan.rows.length === 2 && /0926101212B2/.test(detMan.rows[0]) && /Carton/.test(detMan.rows[0]) && /91 x 20 x 42,500/.test(detMan.rows[0]) && /5,900/.test(detMan.rows[0]), `Desktop MAN-Packstücke: HU, Verpackung, Maße, Gewicht (${detMan.rows[0]})`);
    await page.close();
  } catch (e) {
    console.log('ERR', e);
    assert(false, 'Ausnahme im Testlauf: ' + (e && e.message));
  } finally {
    await browser.close();
    finish();
  }
})();
