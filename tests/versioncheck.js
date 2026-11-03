// Versionsangaben passen zusammen (kein Chrome/Server nötig): script.js (APP_VERSION, APP_BACKEND_VERSION), index.html
// (<title>), sw.js (Cache-Name), backend/Code.gs (Kopfzeile), backend/README.md und der oberste CHANGELOG-Eintrag.
// Start: node tests/versioncheck.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let oks = 0, fails = 0;
const ok = (cond, msg) => { if (cond) { oks++; console.log('ok  : ' + msg); } else { fails++; console.log('FAIL: ' + msg); } };
const grab = (text, re, what) => { const m = re.exec(text); if (!m) { ok(false, `${what}: Angabe nicht gefunden (${re})`); return null; } return m[1]; };

const js = read('script.js');
const appVersion = grab(js, /const APP_VERSION = '([^']+)';/, 'script.js APP_VERSION');
const appDate = grab(js, /const APP_VERSION_DATE = '(\d{4}-\d{2}-\d{2})';/, 'script.js APP_VERSION_DATE');
const backendVersion = grab(js, /const APP_BACKEND_VERSION = '([^']+)';/, 'script.js APP_BACKEND_VERSION');
ok(appVersion && /^\d+\.\d+(\.\d+)?$/.test(appVersion), `APP_VERSION ist eine Versionsnummer (${appVersion})`);
ok(appDate && !isNaN(Date.parse(appDate)), `APP_VERSION_DATE ist ein Datum (${appDate})`);

const title = grab(read('index.html'), /<title>([^<]+)<\/title>/, 'index.html <title>');
ok(title === `Fracht Tracker ${appVersion}`, `index.html <title> „${title}“ = „Fracht Tracker ${appVersion}“`);

const gsHead = grab(read('backend/Code.gs'), /^\/\/ Version (\d+\.\d+):/m, 'Code.gs Kopfzeile');
ok(gsHead === backendVersion, `Code.gs Kopfzeile ${gsHead} = APP_BACKEND_VERSION ${backendVersion}`);

const beReadme = read('backend/README.md');
ok(beReadme.includes(`**App ${appVersion} ↔ Code.gs ${backendVersion}**`), `backend/README.md nennt „App ${appVersion} ↔ Code.gs ${backendVersion}“`);
ok(!/[A-Za-z0-9_-]{40,}/.test(beReadme), 'backend/README.md enthält keine lange ID (Sheet-ID/Token)');

const changelog = read('CHANGELOG.md');
const top = grab(changelog, /^## (\d{4}-\d{2}-\d{2}) – App ([\d.]+), Code\.gs ([\d.]+)/m, 'CHANGELOG oberster Eintrag');
const topM = /^## (\d{4}-\d{2}-\d{2}) – App ([\d.]+), Code\.gs ([\d.]+)/m.exec(changelog);
ok(topM && topM[2] === appVersion && topM[3] === backendVersion, `CHANGELOG oberster Eintrag: App ${topM && topM[2]}, Code.gs ${topM && topM[3]} (erwartet ${appVersion} / ${backendVersion})`);
ok(topM && topM[1] === appDate, `CHANGELOG-Datum ${topM && topM[1]} = APP_VERSION_DATE ${appDate}`);

if (fs.existsSync(path.join(root, 'sw.js'))) {
  const sw = read('sw.js');
  const swVersion = grab(sw, /const APP_VERSION = '([^']+)';/, 'sw.js APP_VERSION');
  ok(swVersion === appVersion, `sw.js APP_VERSION ${swVersion} = script.js ${appVersion} (neuer Cache je Version)`);
} else {
  console.log('info: sw.js noch nicht vorhanden (Service Worker) – Cache-Version nicht geprüft');
}
ok(!/AKfycb[\w-]{20,}/.test(read('README.md')), 'README.md enthält keine Web-App-URL/Token');
console.log(fails ? `SOME FAILED (${fails} von ${oks + fails})` : `ALL GOOD (${oks})`); process.exit(fails ? 1 : 0);
