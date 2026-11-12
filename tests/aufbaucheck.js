// Aufbau der aufgeteilten Dateien passt zusammen (kein Chrome/Server nötig):
//  - js/*.js und css/*.css werden von index.html vollständig und in Nummern-Reihenfolge eingebunden
//  - die Skripte stehen ganz am Ende von <body> (sie greifen beim Laden direkt auf alle Elemente zu)
//  - jeder Teil beginnt mit seinem Kopfkommentar „Teil N/M“
//  - sw.js lädt alle lokalen Dateien aus index.html vor (sonst startet die App offline nicht vollständig)
//  - Code.gs: Abschnitte 1–12 in Reihenfolge, jede bekannte Aktion hat einen case in doPost
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let fails = 0, count = 0;
const ok = (cond, msg) => { count++; console.log((cond ? 'ok  : ' : 'FAIL: ') + msg); if (!cond) fails++; };

const html = read('index.html');
const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).sort();
const cssFiles = fs.readdirSync(path.join(ROOT, 'css')).filter(f => f.endsWith('.css')).sort();
const scriptSrcs = Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g)).map(m => m[1]);
const cssHrefs = Array.from(html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)).map(m => m[1]);

ok(jsFiles.length >= 2 && JSON.stringify(scriptSrcs.filter(s => s.startsWith('js/'))) === JSON.stringify(jsFiles.map(f => 'js/' + f)),
  `index.html bindet alle ${jsFiles.length} Teile aus js/ in Nummern-Reihenfolge ein`);
ok(cssFiles.length >= 2 && JSON.stringify(cssHrefs.filter(s => s.startsWith('css/'))) === JSON.stringify(cssFiles.map(f => 'css/' + f)),
  `index.html bindet alle ${cssFiles.length} Teile aus css/ in Nummern-Reihenfolge ein`);
ok(!fs.existsSync(path.join(ROOT, 'script.js')) && !fs.existsSync(path.join(ROOT, 'styles.css')), 'keine alte script.js / styles.css mehr neben den Teilen (sonst zwei Stände)');

// Skripte am Ende: nach dem ersten <script src="js/…"> darf kein Element mit id="…" mehr folgen
const firstScript = html.indexOf('<script src="js/');
const tailIds = Array.from(html.slice(firstScript).matchAll(/<(?!script)[a-z]+[^>]*\sid="([^"]+)"/g)).map(m => m[1]);
ok(firstScript > 0 && tailIds.length === 0, `Skripte stehen nach allen Elementen (danach keine ids mehr: ${tailIds.join(', ') || '–'})`);
const vendorIdx = html.indexOf('assets/vendor/');
ok(vendorIdx > 0 && vendorIdx < firstScript, 'Bibliotheken (assets/vendor) werden vor den App-Teilen geladen');

jsFiles.forEach((f, i) => {
  const head = read('js/' + f).split('\n')[0];
  ok(head === `// Fracht Tracker – Teil ${i + 1}/${jsFiles.length}: ${f}`, `js/${f} beginnt mit Kopfkommentar „Teil ${i + 1}/${jsFiles.length}“`);
});
cssFiles.forEach((f, i) => {
  const head = read('css/' + f).split('\n')[0];
  ok(head === `/* Fracht Tracker – Stylesheet Teil ${i + 1}/${cssFiles.length}: ${f}`, `css/${f} beginnt mit Kopfkommentar „Teil ${i + 1}/${cssFiles.length}“`);
});
// Versions-Konstanten nur im ersten Teil (die anderen Teile sollen sie nicht erneut deklarieren)
jsFiles.slice(1).forEach(f => ok(!/const APP_VERSION\b/.test(read('js/' + f)), `js/${f} deklariert APP_VERSION nicht erneut`));
// Start nur im letzten Teil
ok(/^initializeApp\(\);/m.test(read('js/' + jsFiles[jsFiles.length - 1])), `Start (initializeApp()) steht im letzten Teil js/${jsFiles[jsFiles.length - 1]}`);
ok(jsFiles.slice(0, -1).every(f => !/^initializeApp\(\);/m.test(read('js/' + f))), 'kein anderer Teil ruft initializeApp() auf');

// sw.js: alle lokalen Dateien aus index.html + Manifest-Icons vorladen
const sw = read('sw.js');
const precache = Array.from(/const PRECACHE = \[([\s\S]*?)\];/.exec(sw)[1].matchAll(/'([^']+)'/g)).map(m => m[1]);
const local = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g)).map(m => m[1]).filter(u => !/^(https?:|data:|#|mailto:)/.test(u) && u !== 'sw.js');
const manifest = JSON.parse(read('manifest.webmanifest'));
(manifest.icons || []).forEach(i => local.push(i.src));
const missing = Array.from(new Set(local)).filter(u => !precache.includes(u.replace(/^\.\//, '')));
ok(missing.length === 0, `sw.js PRECACHE enthält alle lokalen Dateien aus index.html + Manifest (fehlt: ${missing.join(', ') || '–'})`);
const notThere = precache.filter(u => u !== './' && !fs.existsSync(path.join(ROOT, u)));
ok(notThere.length === 0, `alle PRECACHE-Dateien existieren (fehlt: ${notThere.join(', ') || '–'})`);

// Code.gs: Abschnitte in Reihenfolge, Aktionen vollständig verteilt
const gas = read('backend/Code.gs');
const sections = Array.from(gas.matchAll(/^\/\/ (\d{1,2})\. [A-ZÄÖÜ]/gm)).map(m => Number(m[1]));
ok(sections.length === 12 && sections.every((n, i) => n === i + 1), `Code.gs: Abschnitte 1–12 in Reihenfolge (${sections.join(',')})`);
const known = Array.from(/const KNOWN_ACTIONS_ = \[([\s\S]*?)\];/.exec(gas)[1].matchAll(/'([^']+)'/g)).map(m => m[1]);
const cases = Array.from(gas.matchAll(/case "([A-Za-z]+)":/g)).map(m => m[1]);
const noCase = known.filter(a => !cases.includes(a));
ok(known.length > 10 && noCase.length === 0, `Code.gs: jede bekannte Aktion hat einen case in doPost (fehlt: ${noCase.join(', ') || '–'})`);
ok(!known.includes('authUsers') && !/function authUsers\b/.test(gas), 'Code.gs: öffentliche Aktion authUsers gibt es nicht mehr (2.10, Anmeldung nur mit PIN)');

// Keine persönlichen Daten und keine feste Kundennummern-Zuordnung im Repo (9.7 / 2.10)
const allJs = jsFiles.map(f => read('js/' + f)).join('\n');
ok(/const MITARBEITER_NAME_DEFAULT = "";/.test(read('js/01-start.js')), 'js/01-start.js: Standard-Mitarbeitername ist leer');
ok(!/KUNDENNR_CARRIER_MAP/.test(allJs) && !/["']\d{3,7}["']\s*:\s*["'][A-Za-zÄÖÜ]/.test(allJs), 'js/: keine feste Zuordnung Kundennummer → Spediteur (kommt vom Server, Blatt kundennr_carrier)');
ok(!/BOOTSTRAP_ADMIN\s*=/.test(gas) && /getProperty\('BOOTSTRAP_ADMIN_NAME'\)/.test(gas) && /getProperty\('BOOTSTRAP_ADMIN_EMAIL'\)/.test(gas), 'Code.gs: Haupt-Administrator nur aus den Skript-Eigenschaften BOOTSTRAP_ADMIN_NAME/BOOTSTRAP_ADMIN_EMAIL');
// E-Mail-Adressen nur als neutrale Platzhalter (example.com, name@firma.de als Eingabehilfe); Bibliotheken unter assets/vendor ausgenommen
const textFiles = ['index.html', 'README.md', 'CHANGELOG.md', 'sw.js', 'backend/Code.gs', 'backend/README.md', 'backend/ANLEITUNG-Drive-Import.md', 'backend/PROMPT-MAN-Ladeliste.md', 'tests/README.md']
  .concat(jsFiles.map(f => 'js/' + f), fs.readdirSync(path.join(ROOT, 'tests')).filter(f => f.endsWith('.js')).map(f => 'tests/' + f));
const realMails = [];
textFiles.forEach(f => (read(f).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g) || [])
  .filter(m => !/@example\.com$/i.test(m) && m.toLowerCase() !== 'name@firma.de').forEach(m => realMails.push(`${f}: ${m}`)));
ok(realMails.length === 0, `keine echten E-Mail-Adressen in Code, Tests und Doku (gefunden: ${realMails.join(', ') || '–'})`);

console.log(fails ? `SOME FAILED (${fails} von ${count})` : `ALL GOOD (${count})`);
process.exit(fails ? 1 : 0);
