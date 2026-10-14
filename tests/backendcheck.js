// Server-Skript (backend/Code.gs) offline durchspielen: kleine Nachbildung der Apps-Script-Dienste (Sheet, Cache, Lock,
// Properties, Utilities, MailApp), dann die Anmelde-Logik Schritt für Schritt prüfen. Start: node tests/backendcheck.js
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'backend', 'Code.gs'), 'utf8');
const mails = [], log = [];
class Range { constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  setNumberFormat() { return this; }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push((this.sh.rows[this.r - 1 + i] || [])[this.c - 1 + j] ?? ''); out.push(row); } return out; }
  setValues(v) { for (let i = 0; i < v.length; i++) { const ri = this.r - 1 + i; while (this.sh.rows.length <= ri) this.sh.rows.push([]); for (let j = 0; j < v[i].length; j++) this.sh.rows[ri][this.c - 1 + j] = v[i][j]; } return this; }
  getValue() { return this.getValues()[0][0]; } setValue(v) { return this.setValues([[v]]); } clearContent() { return this; } }
class Sheet { constructor(n) { this.name = n; this.rows = []; } getName() { return this.name; } getLastRow() { return this.rows.length; } getMaxRows() { return Math.max(this.rows.length, 1000); } getMaxColumns() { return 26; }
  getRange(r, c, nr = 1, nc = 1) { if (typeof r === 'string') { const m = /^([A-Z]+)(\d+)$/.exec(r); return new Range(this, Number(m[2]), m[1].charCodeAt(0) - 64, 1, 1); } return new Range(this, r, c, nr, nc); }
  setFrozenRows() {} hideSheet() { this.hidden = true; } getLastColumn() { return 26; } deleteRows() {} insertRowsAfter() {} }
const sheets = { shipments: new Sheet('shipments'), lkw_status: new Sheet('lkw_status') };
const SpreadsheetApp = { openById: () => ({ getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)) }), flush() {} };
const cache = {}; const CacheService = { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; }, getAll: ks => { const o = {}; ks.forEach(k => { if (cache[k] != null) o[k] = cache[k]; }); return o; }, putAll: o => Object.assign(cache, o), removeAll: ks => ks.forEach(k => delete cache[k]) }) };
const LockService = { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) };
const props = {}; const PropertiesService = { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) };
const Utilities = { getUuid: () => crypto.randomUUID(), computeHmacSha256Signature: (d, k) => Array.from(crypto.createHmac('sha256', k).update(d, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
  base64EncodeWebSafe: s => Buffer.from(s, 'utf8').toString('base64url'), base64DecodeWebSafe: s => Buffer.from(s, 'base64url'), newBlob: b => ({ getDataAsString: () => Buffer.from(b).toString('utf8') }) };
let mailFail = false;
const MailApp = { sendEmail: o => { if (mailFail) throw new Error('Mail-Quota'); mails.push(o); } };
const ContentService = { createTextOutput: t => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } };
const Logger = { log: m => log.push(String(m)) };
const ctx = { SpreadsheetApp, CacheService, LockService, PropertiesService, Utilities, MailApp, ContentService, Logger };
const api = new Function(...Object.keys(ctx), src + '\n;return { doPost };')(...Object.values(ctx));
const call = (action, payload, auth) => JSON.parse(api.doPost({ postData: { contents: JSON.stringify({ action, payload, auth }) } }).text);
let fails = 0, oks = 0; const ok = (c, m) => { console.log((c ? 'ok  : ' : 'FAIL: ') + m); if (c) oks++; else fails++; };
const tokenExp = t => JSON.parse(Buffer.from(t.split('.')[0], 'base64url').toString()).e;
const usersSheet = () => sheets['_users'];

// 1) Ohne Anmeldung
let r = call('loadChanges', { sinceVersion: 0 });
ok(r.status === 'error' && r.code === 'AUTH_REQUIRED', 'loadChanges ohne Token → AUTH_REQUIRED');
r = call('quatsch', {});
ok(r.status === 'error' && /Unbekannte Aktion/.test(r.message) && !r.code, 'Unbekannte Aktion bleibt erkennbar (Legacy-Erkennung der App)');
// 2) Erster Aufruf legt Administrator an + Einladung
r = call('authUsers');
ok(r.status === 'success' && r.users.length === 0 && r.setupPending === true, 'authUsers: noch niemand mit PIN, setupPending');
ok(mails.length === 1 && mails[0].to === 'bisbiss-92@hotmail.de' && /einladung=[0-9a-f]{64}/.test(mails[0].body), 'Admin-Einladung per Mail');
const inv = /einladung=([0-9a-f]+)/.exec(mails[0].body)[1];
r = call('authInviteInfo', { invite: inv }); ok(r.valid === true && r.name === 'Zakaria Bisbiss' && r.isReset === false, 'authInviteInfo gültig');
r = call('authInviteInfo', { invite: 'x' }); ok(r.valid === false, 'authInviteInfo ungültig');
r = call('authAccept', { invite: inv, pin: '123456' }); ok(r.code === 'PIN_WEAK', 'Schwache PIN abgelehnt');
r = call('authAccept', { invite: inv, pin: '12345' }); ok(r.code === 'PIN_INVALID', '5-stellige PIN abgelehnt');
r = call('authAccept', { invite: inv, pin: '482913', deviceId: 'dev1' });
ok(r.status === 'success' && r.token && r.user.role === 'admin' && r.user.name === 'Zakaria Bisbiss', 'PIN gesetzt + angemeldet');
const adminTok = r.token;
r = call('authAccept', { invite: inv, pin: '482913' }); ok(r.code === 'INVITE_INVALID', 'Einladung nur einmal nutzbar');
// 3) Mit Token
ok(call('loadChanges', { sinceVersion: 0 }, adminTok).status === 'success', 'loadChanges mit Token ok');
ok(call('authCheck', {}, adminTok).user.id, 'authCheck ok');
ok(call('authCheck', {}, adminTok + 'x').code === 'AUTH_REQUIRED', 'Manipuliertes Token abgelehnt');
// 4) Login
r = call('authUsers'); ok(r.users.length === 1 && r.users[0].name === 'Zakaria Bisbiss' && !r.users[0].email, 'authUsers liefert nur id+Name');
const uid = r.users[0].id;
r = call('authLogin', { userId: uid, pin: '000000' }); ok(r.code === 'LOGIN_FAILED' && /noch 4/.test(r.message), 'Falsche PIN: ' + r.message);
for (let i = 0; i < 4; i++) r = call('authLogin', { userId: uid, pin: '000000' });
ok(r.code === 'LOCKED', 'Nach 5 Fehlversuchen gesperrt');
ok(call('authLogin', { userId: uid, pin: '482913' }).code === 'LOCKED', 'Auch richtige PIN während der Sperre abgelehnt');
usersSheet().rows[1][11] = String(Date.now() - 1000); delete cache['fracht_users'];   // Sperre ablaufen lassen
r = call('authLogin', { userId: uid, pin: '482913', deviceId: 'dev2' }); ok(r.status === 'success' && r.token, 'Nach Ablauf der Sperre Anmeldung ok');
const tok2 = r.token;
ok(call('loadChanges', { sinceVersion: 0 }, adminTok).status === 'success', 'Sitzung des anderen Geräts bleibt parallel gültig');
r = call('authLogin', { userId: uid, pin: '482913', deviceId: 'dev2' }); const tok2b = r.token;
ok(call('loadChanges', { sinceVersion: 0 }, tok2).code === 'AUTH_REQUIRED' && call('loadChanges', { sinceVersion: 0 }, tok2b).status === 'success', 'Neue Anmeldung desselben Geräts ersetzt dessen alte Sitzung');
// 5) Verlängern (authRefresh)
const expBefore = tokenExp(tok2b);
const sleep = ms => { const t = Date.now(); while (Date.now() - t < ms) { /* warten, damit das neue Ablaufdatum messbar später liegt */ } };
sleep(5);
r = call('authRefresh', {}, tok2b);
ok(r.status === 'success' && r.token && r.token !== tok2b && r.user.id === uid, 'authRefresh liefert neues Token');
ok(tokenExp(r.token) > expBefore && r.expires === tokenExp(r.token), 'Neues Token läuft später ab');
const tokR = r.token;
ok(call('loadChanges', { sinceVersion: 0 }, tokR).status === 'success', 'Verlängertes Token gültig');
ok(call('loadChanges', { sinceVersion: 0 }, tok2b).status === 'success', 'Altes Token gilt bis zu seinem eigenen Ablauf weiter (gleiche Sitzung)');
ok(call('authRefresh', {}, 'kaputt').code === 'AUTH_REQUIRED', 'authRefresh ohne gültiges Token abgelehnt');
r = call('authLogout', {}, tokR); ok(r.status === 'success', 'Logout mit verlängertem Token');
ok(call('loadChanges', { sinceVersion: 0 }, tok2b).code === 'AUTH_REQUIRED' && call('loadChanges', { sinceVersion: 0 }, tokR).code === 'AUTH_REQUIRED', 'Logout beendet die Sitzung für altes UND neues Token');
ok(call('authRefresh', {}, tokR).code === 'AUTH_REQUIRED', 'Abgemeldete Sitzung lässt sich nicht verlängern');
ok(call('loadChanges', { sinceVersion: 0 }, adminTok).status === 'success', 'Andere Sitzung des Admins bleibt');
// 6) Administrator: einladen
r = call('adminInvite', { name: 'Max Muster', email: 'MAX@example.com' }, adminTok);
ok(r.status === 'success' && r.users.length === 2 && r.invited.mailSent && !r.invited.link && mails.length === 2 && mails[1].to === 'max@example.com', 'adminInvite: Nutzer angelegt + Mail, kein Link in der Antwort');
const invMax = /einladung=([0-9a-f]+)/.exec(mails[1].body)[1];
r = call('authAccept', { invite: invMax, pin: '778812' }); ok(r.status === 'success' && r.user.role === 'user', 'Max setzt PIN');
const tokMax = r.token, maxId = r.user.id;
ok(call('adminInvite', { name: 'X', email: 'y@z.de' }, tokMax).code === 'FORBIDDEN', 'Normaler Nutzer darf nicht einladen');
ok(call('adminListUsers', {}, tokMax).code === 'FORBIDDEN', 'Normaler Nutzer darf Liste nicht sehen');
ok(call('saveLkwStatus', { 'MAN 1': true }, tokMax).status === 'success', 'Normaler Nutzer darf Daten schreiben');
// 7) Sperren / Freigeben
ok(call('adminSetActive', { userId: maxId, active: false }, adminTok).status === 'success', 'Max gesperrt');
ok(call('loadChanges', { sinceVersion: 0 }, tokMax).code === 'AUTH_REQUIRED', 'Gesperrter Nutzer sofort ausgesperrt');
ok(call('authUsers').users.length === 1, 'Gesperrter Nutzer nicht in der Namensliste');
ok(call('authLogin', { userId: maxId, pin: '778812' }).code === 'LOGIN_FAILED', 'Gesperrter Nutzer kann sich nicht anmelden');
ok(call('adminSetActive', { userId: maxId, active: true }, adminTok).status === 'success', 'Max freigegeben');
r = call('authLogin', { userId: maxId, pin: '778812' }); ok(r.status === 'success', 'Nach Freigabe Anmeldung ok (alte PIN)');
const tokMax2 = r.token;
// 8) PIN-Reset (Mail schlägt fehl → Link zum Weitergeben)
mailFail = true;
r = call('adminResetPin', { userId: maxId }, adminTok); ok(r.status === 'success' && r.invited.mailSent === false && /einladung=/.test(r.invited.link), 'Reset ohne Mail liefert Link zum Weitergeben');
mailFail = false;
ok(call('loadChanges', { sinceVersion: 0 }, tokMax2).status === 'success', 'Alte PIN/Sitzung gilt bis zum Setzen der neuen');
const invR = /einladung=([0-9a-f]+)/.exec(r.invited.link)[1];
ok(call('authInviteInfo', { invite: invR }).isReset === true, 'Reset-Einladung erkannt');
ok(call('authAccept', { invite: invR, pin: '901276' }).status === 'success', 'Neue PIN gesetzt');
ok(call('loadChanges', { sinceVersion: 0 }, tokMax2).code === 'AUTH_REQUIRED', 'Nach PIN-Reset alte Sitzung ungültig');
ok(call('adminSetActive', { userId: uid, active: false }, adminTok).code === 'INVALID', 'Selbst-Sperren abgelehnt');
// 9) Abgelaufenes, korrekt signiertes Token
const d = JSON.parse(Buffer.from(adminTok.split('.')[0], 'base64url').toString()); d.e = Date.now() - 1;
const nb = Buffer.from(JSON.stringify(d)).toString('base64url'); const sig = crypto.createHmac('sha256', props.AUTH_SECRET).update(nb).digest('hex');
ok(call('loadChanges', { sinceVersion: 0 }, nb + '.' + sig).code === 'AUTH_REQUIRED', 'Abgelaufenes Token abgelehnt');
// 10) Sheet
const flat = JSON.stringify(usersSheet().rows);
ok(!/482913|778812|901276/.test(flat), 'Keine PIN im Klartext im Sheet');
ok(usersSheet().hidden === true, 'Sheet _users ausgeblendet');
console.log(fails ? `SOME FAILED (${fails} von ${oks + fails})` : `ALL GOOD (${oks})`); process.exit(fails ? 1 : 0);
