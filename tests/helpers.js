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
// Anmeldung (Backend 2.2): Der Stub kennt einen Administrator (Token TEST_TOKEN, PIN 482913) und einen Mitarbeiter (PIN 778812).
// Öffentliche Aktionen: authUsers/authLogin/authAccept/authInviteInfo; alles andere verlangt body.auth = gültiges Token,
// sonst { status:'error', code:'AUTH_REQUIRED' } – wie das echte Skript. state.authDisabled = true → alles ohne Anmeldung (Skript 2.1).
const TEST_TOKEN = 'tok-admin-test';
const TEST_USER = { id: 'u-admin', name: 'Zakaria Bisbiss', role: 'admin' };
function makeBackend(initial, lkwStatus) {
  const state = { store: JSON.parse(JSON.stringify(initial || {})), lkwStatus: lkwStatus || {}, version: 1, actions: [], requests: [],
    authDisabled: false, tokens: { [TEST_TOKEN]: 'u-admin' }, invites: { 'inv-max': 'u-max' }, mails: [], failed: 0,
    users: [ { id: 'u-admin', name: 'Zakaria Bisbiss', email: 'bisbiss-92@hotmail.de', role: 'admin', pin: '482913', active: true, hasPin: true },
             { id: 'u-max', name: 'Max Muster', email: 'max@example.com', role: 'user', pin: '778812', active: true, hasPin: true } ] };
  const pub = u => ({ id: u.id, name: u.name, role: u.role });
  const list = () => state.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, hasPin: u.hasPin, lastLogin: 0, inviteOpen: false, inviteExpires: 0, locked: false }));
  state.handler = async (req) => {
    if (!/script\.google\.com/.test(req.url())) return req.continue();
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (e) {}
    const action = body.action || ''; state.actions.push(action); state.requests.push(body);
    let resp = { status: 'success' };
    const isPublic = ['authUsers', 'authLogin', 'authAccept', 'authInviteInfo'].includes(action);
    const me = state.authDisabled ? null : state.users.find(u => u.id === state.tokens[body.auth] && u.active);
    if (!state.authDisabled && !isPublic && !me) resp = { status: 'error', code: 'AUTH_REQUIRED', message: 'Anmeldung erforderlich.' };
    else if (action === 'authUsers') resp = state.authDisabled ? { status: 'success', users: [], authDisabled: true } : { status: 'success', users: state.users.filter(u => u.active && u.hasPin).map(u => ({ id: u.id, name: u.name })), setupPending: false };
    else if (action === 'authCheck') resp = state.authDisabled ? { status: 'success', user: null, authDisabled: true } : { status: 'success', user: pub(me) };
    else if (action === 'authLogin') {
      const p = body.payload || {}; const u = state.users.find(x => x.id === p.userId && x.active && x.hasPin);
      if (u && u.pin === p.pin) { const t = 'tok-' + Math.random().toString(36).slice(2); state.tokens[t] = u.id; state.failed = 0; resp = { status: 'success', token: t, expires: Date.now() + 3600e3, user: pub(u) }; }
      else { state.failed++; resp = state.failed >= 5 ? { status: 'error', code: 'LOCKED', message: 'Zu viele Fehlversuche – Zugang für 15 Minuten gesperrt.' } : { status: 'error', code: 'LOGIN_FAILED', message: `PIN falsch – noch ${5 - state.failed} Versuch(e).` }; }
    }
    else if (action === 'authInviteInfo') { const uid = state.invites[(body.payload || {}).invite]; const u = uid && state.users.find(x => x.id === uid); resp = u ? { status: 'success', valid: true, name: u.name, isReset: u.hasPin } : { status: 'success', valid: false }; }
    else if (action === 'authAccept') {
      const p = body.payload || {}; const uid = state.invites[p.invite]; const u = uid && state.users.find(x => x.id === uid);
      if (!u) resp = { status: 'error', code: 'INVITE_INVALID', message: 'Dieser Einladungslink ist ungültig oder abgelaufen.' };
      else if (!/^\d{6}$/.test(p.pin)) resp = { status: 'error', code: 'PIN_INVALID', message: 'Die PIN muss aus genau 6 Ziffern bestehen.' };
      else if (/^(\d)\1{5}$/.test(p.pin) || '01234567890'.includes(p.pin)) resp = { status: 'error', code: 'PIN_WEAK', message: 'Bitte keine zu einfache PIN (z. B. 111111 oder 123456).' };
      else { u.pin = p.pin; u.hasPin = true; delete state.invites[p.invite]; const t = 'tok-' + Math.random().toString(36).slice(2); state.tokens[t] = u.id; resp = { status: 'success', token: t, expires: Date.now() + 3600e3, user: pub(u) }; }
    }
    else if (action === 'authLogout') { delete state.tokens[body.auth]; resp = { status: 'success' }; }
    else if (action === 'authRefresh') { const t = 'tok-' + Math.random().toString(36).slice(2); state.tokens[t] = me.id; state.refreshes = (state.refreshes || 0) + 1; resp = { status: 'success', token: t, expires: Date.now() + 7200e3, user: pub(me) }; }
    else if (action === 'adminListUsers' || action === 'adminInvite' || action === 'adminSetActive' || action === 'adminResetPin') {
      if (me.role !== 'admin') resp = { status: 'error', code: 'FORBIDDEN', message: 'Nur für Administratoren.' };
      else if (action === 'adminListUsers') resp = { status: 'success', users: list() };
      else if (action === 'adminInvite') { const p = body.payload || {}; const id = 'u-' + Math.random().toString(36).slice(2, 6); state.users.push({ id, name: p.name, email: String(p.email).toLowerCase(), role: 'user', pin: '', active: true, hasPin: false }); state.invites['inv-' + id] = id; state.mails.push(p.email); resp = { status: 'success', users: list(), invited: { id, name: p.name, email: String(p.email).toLowerCase(), mailSent: !state.mailFail, mailError: state.mailFail ? 'Mail-Quota' : '', link: state.mailFail ? 'https://zakiwaw.github.io/Arbeit/?einladung=inv-' + id : '' } }; }
      else if (action === 'adminSetActive') { const p = body.payload || {}; const u = state.users.find(x => x.id === p.userId); if (u) { u.active = !!p.active; if (!u.active) Object.keys(state.tokens).forEach(t => { if (state.tokens[t] === u.id) delete state.tokens[t]; }); } resp = { status: 'success', users: list() }; }
      else { const p = body.payload || {}; const u = state.users.find(x => x.id === p.userId); state.invites['inv-reset-' + u.id] = u.id; state.mails.push(u.email); resp = { status: 'success', users: list(), invited: { id: u.id, name: u.name, email: u.email, mailSent: true, mailError: '', link: '' } }; }
    }
    else if (action === 'loadChanges') resp = { status: 'success', version: state.version, changed: JSON.parse(JSON.stringify(state.store)), deleted: [], archived: [], full: true, lkwStatus: state.lkwStatus, archivedBases: [] };
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
// Anmeldung: standardmäßig ist der Administrator bereits angemeldet (Sitzung im localStorage); opts.loggedOut = true
// startet ohne Sitzung (Anmeldeseite), opts.session = { token, user, expires } startet mit einer bestimmten Sitzung.
// Achtung: page.reload() leert den Speicher erneut (Schutz gegen Übernahme aus früheren Szenarien) – Sitzung also per opts setzen.
async function openApp(browser, backend, opts = {}) {
  const page = await browser.newPage();
  const seed = opts.session ? JSON.stringify(opts.session) : (opts.loggedOut ? null : JSON.stringify({ token: TEST_TOKEN, user: TEST_USER, expires: Date.now() + 3600e3 }));
  const lastActivity = opts.idleMs ? Date.now() - opts.idleMs : Date.now();
  if (!opts.keepStorage) await page.evaluateOnNewDocument((seed, lastActivity) => { if (!window.__storageCleared) { window.__storageCleared = true; try { localStorage.clear(); sessionStorage.clear(); if (seed) { localStorage.setItem('frachtTracker_session', seed); localStorage.setItem('frachtTracker_lastActivity', String(lastActivity)); } } catch (e) {} } }, seed, lastActivity);
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

module.exports = { launch, makeBackend, openApp, sampleData, scan, setBatchMode, assert, finish, TEST_TOKEN, TEST_USER };
