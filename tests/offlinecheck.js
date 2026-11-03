// Offline-Prüfung (Service Worker sw.js): eigener Mini-Webserver auf :8011, damit „kein Netz“ echt nachgestellt werden
// kann (Server stoppen – page.setOfflineMode wirkt nicht auf Abrufe aus dem Service Worker).
//  1) App laden → Service Worker aktiv, alle PRECACHE-Dateien im Cache „fracht-tracker-<Version>“
//  2) Server stoppen + Backend offline → Seite neu laden → App öffnet sich aus dem Cache (auch mit ?seite=…)
//  3) Scan offline → Änderung lokal gespeichert + als unbestätigt vorgemerkt, kein JS-Fehler
//  4) Backend wieder da → Scan wird nachgeschickt (saveShipments), Vormerkung leer
//  5) Neue Version (anderer Cache-Name) → alter Cache wird beim Aktivieren gelöscht
// Start: node tests/offlinecheck.js   (Chrome siehe README; :8000 wird NICHT benötigt)
const http = require('http'), fs = require('fs'), path = require('path');
const { launch, makeBackend, openApp, scan, assert, finish } = require('./helpers');
const wait = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.join(__dirname, '..');
const PORT = 8011;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json' };

// Mini-Server; serverState.version lässt sw.js mit einer anderen APP_VERSION ausliefern (Schritt 5)
const serverState = { swVersion: null, hits: [] };
function makeServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = decodeURIComponent(url.pathname); if (file.endsWith('/')) file += 'index.html';
    const abs = path.join(ROOT, file);
    serverState.hits.push(file);
    if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    let body = fs.readFileSync(abs);
    if (file.endsWith('/sw.js') && serverState.swVersion) body = Buffer.from(body.toString('utf8').replace(/const APP_VERSION = '[^']+';/, `const APP_VERSION = '${serverState.swVersion}';`));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' });
    res.end(body);
  });
}
const listen = srv => new Promise(r => srv.listen(PORT, '127.0.0.1', r));
const close = srv => new Promise(r => srv.close(() => r()));

const swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const appVersion = /const APP_VERSION = '([^']+)';/.exec(fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8'))[1];
const precacheBlock = /const PRECACHE = \[([\s\S]*?)\];/.exec(swSrc)[1];
const precache = Array.from(precacheBlock.matchAll(/'([^']+)'/g)).map(m => m[1]);
// Alle in index.html eingebundenen Dateien müssen vorgeladen werden (sonst fehlt offline etwas)
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const referenced = Array.from(html.matchAll(/(?:src|href)="([^"#?]+)"/g)).map(m => m[1]).filter(u => !/^(https?:|data:|mailto:|sw\.js$)/.test(u));
const missing = referenced.filter(u => !precache.includes(u));
assert(missing.length === 0, `sw.js PRECACHE enthält alle in index.html eingebundenen Dateien (${missing.join(', ') || 'vollständig'})`);
const notOnDisk = precache.filter(u => u !== './' && !fs.existsSync(path.join(ROOT, u)));
assert(notOnDisk.length === 0, `Alle PRECACHE-Dateien existieren (${notOnDisk.join(', ') || 'ja'})`);
assert(/const APP_VERSION = '([^']+)';/.exec(swSrc)[1] === appVersion, `sw.js APP_VERSION = script.js APP_VERSION (${appVersion})`);

(async () => {
  let server = makeServer(); await listen(server);
  const browser = await launch();
  const url = `http://127.0.0.1:${PORT}/index.html`;
  try {
    // 1) Laden mit Service Worker
    let be = makeBackend({}, {});
    let page = await openApp(browser, be, { url, serviceWorker: true }); await wait(500);
    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      for (let i = 0; i < 50 && !navigator.serviceWorker.controller; i++) await new Promise(r => setTimeout(r, 100));
      let keys = [], entries = [];
      for (let i = 0; i < 50; i++) { keys = await caches.keys(); const k = keys.find(x => x.startsWith('fracht-tracker-')); if (k) { entries = (await (await caches.open(k)).keys()).map(r => r.url); if (entries.length >= 14) break; } await new Promise(r => setTimeout(r, 100)); }
      return { active: !!reg.active, controlled: !!navigator.serviceWorker.controller, keys, entries: entries.map(u => u.replace(/^.*:\d+\//, '')) };
    });
    assert(swState.active && swState.keys.includes(`fracht-tracker-${appVersion}`), `Service Worker aktiv, Cache „fracht-tracker-${appVersion}“ angelegt (${swState.keys.join(', ')})`);
    const expected = precache.map(u => u === './' ? '' : u).sort();
    assert(JSON.stringify(swState.entries.sort()) === JSON.stringify(expected), `Alle ${expected.length} App-Dateien vorgeladen (${swState.entries.length})`);
    assert(page.__errors.length === 0, `Keine JS-Fehler beim Laden mit Service Worker (${page.__errors.join(' | ')})`);
    await page.close();

    // 2) Kein Netz: Server weg, Backend offline → App startet trotzdem (aus dem Cache), auch per Unterseiten-Adresse
    await close(server); server = null;
    be = makeBackend({}, {}); be.offline = true;
    page = await openApp(browser, be, { url, serviceWorker: true, query: '?seite=anlieferung' }); await wait(800);
    const off = await page.evaluate(() => ({
      title: document.title, controlled: !!navigator.serviceWorker.controller, input: !!document.getElementById('shipmentNumberInput'),
      page: document.getElementById('pageTitle') ? document.getElementById('pageTitle').textContent.trim() : '', loader: document.getElementById('loadingOverlay').classList.contains('visible'),
      css: getComputedStyle(document.querySelector('.app-bar')).position, lib: !!(window.jspdf && window.jspdf.jsPDF) && typeof window.QRCode !== 'undefined'
    }));
    assert(/Fracht Tracker/.test(off.title) && off.input && off.controlled, `Offline neu geladen: App öffnet sich aus dem Cache (${off.title})`);
    assert(off.page === 'Anlieferung', `Offline: Adresse ?seite=anlieferung funktioniert (Seite „${off.page}“)`);
    assert(off.css === 'sticky' || off.css === 'fixed' || off.css === 'relative', `Offline: Stylesheet geladen (.app-bar position=${off.css})`);
    assert(off.lib, 'Offline: Bibliotheken (jsPDF, QRCode) aus dem Cache geladen');
    assert(off.loader === false, 'Offline: Lade-Spinner verschwindet, App ist bedienbar');
    // 3) Scan offline → lokal gespeichert + vorgemerkt
    await page.evaluate(() => document.getElementById('pageBackBtn').click()); await wait(300);
    await page.evaluate(() => { document.getElementById('securityStatusSelect').value = 'XRY'; });
    await scan(page, '9100000077+0001', 400);
    assert(await page.$eval('#newTotalSection', e => e.classList.contains('visible')), 'Offline-Scan: neue Sendung → Stückzahl-Abfrage wie online');
    await page.evaluate(() => { document.getElementById('newTotalInput').value = '1'; document.getElementById('confirmNewTotalBtn').click(); }); await wait(700);
    const local = await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored') || '{}');
      const pending = JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored_syncPending') || '{}');
      const s = store['9100000077'];
      return { saved: !!(s && s.scannedItems && s.scannedItems.some(i => i.rawInput === '9100000077+0001' && i.status === 'XRY')), pending: !!(pending.changed && pending.changed['9100000077']), sync: (document.getElementById('syncIndicator').className || '') };
    });
    assert(local.saved, 'Offline-Scan: Sendung 9100000077 mit XRY lokal gespeichert');
    assert(local.pending, 'Offline-Scan: Änderung als unbestätigt vorgemerkt (syncPending)');
    assert(be.actions.some(a => a.startsWith('(offline) saveShipments')), `Offline-Scan: Speichern wurde versucht und scheiterte am Netz (${be.actions.filter(a => a.startsWith('(offline)')).length} Versuche)`);
    assert(page.__errors.length === 0, `Keine JS-Fehler offline (${page.__errors.join(' | ')})`);
    // 4) Netz wieder da → Nachschicken
    be.offline = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    let delivered = false;
    for (let i = 0; i < 60 && !delivered; i++) { await wait(500); delivered = be.requests.some(r => r.action === 'saveShipments' && r.payload && r.payload.shipments && r.payload.shipments['9100000077']); }
    assert(delivered, 'Wieder online: offline erfasster Scan wird an den Server nachgeschickt (saveShipments)');
    const pendingAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored_syncPending') || '{}'));
    assert(!(pendingAfter.changed && pendingAfter.changed['9100000077']), 'Wieder online: Vormerkung nach Bestätigung geleert');
    assert(be.store['9100000077'] && be.store['9100000077'].scannedItems.length === 1, 'Server hat die Sendung mit dem Offline-Scan');
    await page.close();

    // 5) Neue Version: sw.js mit anderer APP_VERSION → neuer Cache, alter wird gelöscht
    server = makeServer(); await listen(server);
    serverState.swVersion = appVersion + '.99';
    be = makeBackend({}, {});
    page = await openApp(browser, be, { url, serviceWorker: true }); await wait(500);
    const upd = await page.evaluate(async (oldName, newName) => {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg.update();
      let keys = [];
      for (let i = 0; i < 80; i++) { keys = await caches.keys(); if (keys.includes(newName) && !keys.includes(oldName)) break; await new Promise(r => setTimeout(r, 100)); }
      return keys;
    }, `fracht-tracker-${appVersion}`, `fracht-tracker-${appVersion}.99`);
    assert(upd.includes(`fracht-tracker-${appVersion}.99`) && !upd.includes(`fracht-tracker-${appVersion}`), `Neue Version: Cache „fracht-tracker-${appVersion}.99“ angelegt, alter gelöscht (${upd.join(', ')})`);
    // Online: Dateien kommen vom Server (Netz zuerst), nicht aus dem Cache
    serverState.hits.length = 0;
    await page.reload({ waitUntil: 'networkidle0' }); await wait(400);
    assert(serverState.hits.includes('/script.js') && serverState.hits.includes('/index.html'), `Online: App-Dateien werden vom Server geholt, nicht aus dem Cache (${serverState.hits.filter(h => /index|script/.test(h)).join(', ')})`);
    await page.close();
  } catch (e) {
    console.log('ERR', e);
    assert(false, 'Ausnahme im Testlauf: ' + (e && e.message));
  } finally {
    await browser.close();
    if (server) await close(server);
    finish();
  }
})();
