// Test-Helfer für Headless-Chrome-Tests (puppeteer-core).
// Aufruf:  node tests/<test>.js   – erwartet: http.server auf :8000 im Repo-Root, Chromium unter /tmp/chromium
// (Aufbau siehe tests/README.md). Der Google-Apps-Script-Backend wird per Request-Interception nachgestellt.
const path = require('path');
const puppeteer = require(process.env.PUPPETEER_MODULE || '/tmp/chrome/package/node_modules/puppeteer-core');

async function launch() {
  process.env.LD_LIBRARY_PATH = '/tmp/chromelibs/lib:/tmp';
  return puppeteer.launch({
    executablePath: process.env.CHROMIUM || '/tmp/chromium', headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--single-process', '--no-zygote', '--autoplay-policy=no-user-gesture-required'],
  });
}

// Beispieldaten: MAN 1 mit HU-Liste (9007000001 + 9007000002), Einzelsendung 123
function sampleData() {
  const now = new Date().toISOString();
  const item = (hu, w) => ({ rawInput: hu, status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, grossWeight: w });
  return {
    '9007000001': { hawb: '9007000001', lastModified: now, totalPiecesExpected: 3, scannedItems: [item('HU1001', '19.5 KG'), item('HU1002', '25 KG'), item('HU1003', '20,8 KG')], mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1 },
    '9007000002': { hawb: '9007000002', lastModified: now, totalPiecesExpected: 1, scannedItems: [item('HU2001', '5 KG')], mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1 },
    '123': { hawb: '123', lastModified: now, totalPiecesExpected: 1, scannedItems: [{ rawInput: '123+0001', status: 'XRY', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null }], mitarbeiter: 'T', isHuListOrder: false },
  };
}

// Nachgestelltes Backend. Antwortformate wie backend/Code.gs:
//  loadChanges → { status, version, changed:{base:shipment}, deleted:[], archived:[], full, lkwStatus, archivedBases }
//  loadLkwStatus → { status, data:{truckId:bool} }
function makeBackend(initial, lkwStatus) {
  const state = { store: JSON.parse(JSON.stringify(initial || {})), lkwStatus: lkwStatus || {}, version: 1, actions: [] };
  state.handler = async (req) => {
    if (!/script\.google\.com/.test(req.url())) return req.continue();
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
    const action = body.action || ''; state.actions.push(action);
    let resp = { status: 'success' };
    if (action === 'loadChanges') resp = { status: 'success', version: state.version, changed: JSON.parse(JSON.stringify(state.store)), deleted: [], archived: [], full: true, lkwStatus: state.lkwStatus, archivedBases: [] };
    else if (action === 'saveShipments') { // wie das Backend: Sendungen kommen unter payload.shipments; Antwort enthält den übernommenen Stand
      const incoming = (body.payload && body.payload.shipments) || {};
      state.version++; Object.keys(incoming).forEach(b => { state.store[b] = JSON.parse(JSON.stringify(incoming[b])); });
      resp = { status: 'success', version: state.version, merged: JSON.parse(JSON.stringify(incoming)) };
    }
    else if (action === 'deleteShipment') { // wie das Backend: Löschvermerk → Sendung ist ab jetzt weg (loadChanges liefert sie nicht mehr)
      const b = body.payload && body.payload.baseNumber; if (b) delete state.store[b]; state.version++; resp = { status: 'success', version: state.version };
    }
    else if (action === 'loadLkwStatus') resp = { status: 'success', data: state.lkwStatus };
    else if (action === 'saveLkwStatus') { state.lkwStatus = (body.payload && body.payload.lkwStatus) || body.lkwStatus || {}; resp = { status: 'success' }; }
    else if (action === 'searchArchive') resp = { status: 'success', results: {}, order: [], total: 0, truncated: false };
    await req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(resp) });
  };
  return state;
}

// Vor jedem Szenario wird der localStorage der App geleert (opts.keepStorage = true unterdrückt das) – sonst
// „erben“ spätere Szenarien lokal vorgemerkte Änderungen aus früheren, und die Datenlage stimmt nicht mehr mit
// dem Backend-Stub überein. (Getrennte Browser-Kontexte gehen mit --single-process nicht.)
async function openApp(browser, backend, opts = {}) {
  const page = await browser.newPage();
  if (!opts.keepStorage) await page.evaluateOnNewDocument(() => { if (!window.__storageCleared) { window.__storageCleared = true; try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} } });
  await page.setViewport(opts.viewport || { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page.__errors = [];
  page.on('pageerror', e => page.__errors.push(String(e)));
  page.on('dialog', d => d.accept());
  if (opts.console) page.on('console', m => console.log('  [page]', m.text()));
  await page.setRequestInterception(true);
  page.on('request', backend.handler);
  await page.goto((process.env.APP_URL || 'http://127.0.0.1:8000/index.html') + (opts.query || ''), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  return page;
}

// Scan über das Eingabefeld + Hauptbutton (wie ein Scanner mit Enter)
async function scan(page, value, waitMs = 300) {
  await page.evaluate((v) => { const i = document.getElementById('shipmentNumberInput'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('mainActionButton').click(); }, value);
  await new Promise(r => setTimeout(r, waitMs));
}
async function setBatchMode(page, on) {
  await page.evaluate((on) => { const t = document.getElementById('batchModeToggle'); if (t.checked !== on) t.click(); const n = document.getElementById('batchNoteToggle'); if (on && n && n.checked) n.click(); }, on);
}

// Mini-Testrunner: ok()/fail() zählen, finish() setzt Exit-Code ≠ 0 bei Fehlern (damit "&&"-Ketten abbrechen)
const results = { ok: 0, fail: 0 };
function assert(cond, msg) { if (cond) { results.ok++; console.log('ok  :', msg); } else { results.fail++; console.log('FAIL:', msg); } }
function finish() { console.log(results.fail ? `SOME FAILED (${results.fail} von ${results.ok + results.fail})` : `ALL GOOD (${results.ok})`); process.exitCode = results.fail ? 1 : 0; }

module.exports = { launch, makeBackend, openApp, sampleData, scan, setBatchMode, assert, finish };
