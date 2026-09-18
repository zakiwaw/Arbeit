// Seite „Aufträge erfassen“ (ersetzt den externen „Multi-Auftrag QR-Code Generator“ und den toten Menüpunkt
// „Zusammenfassung per E-Mail“): Text einfügen → Aufträge erkennen → QR-Code (gleicher Inhalt wie der Generator) oder
// direkt anlegen (gleicher Import wie beim Scan). Start: node tests/erfassencheck.js
const { launch, makeBackend, openApp, sampleData } = require('./helpers');
const fs = require('fs'), path = require('path');
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, oks = 0;
const assert = (c, m) => { console.log((c ? 'ok  : ' : 'FAIL: ') + m); if (c) oks++; else fails++; };

const MAN_TEXT = `Maersk Logistics & Services/Senator, Südafrika
9007988206
3181 0128115
1 0925102219E2|Einwegpalette B03|120x80x60 CM|42 KG
2 0925102219E3|Karton|60x40x30 CM|12,5 KG

Logwin, Singapur
Nachlieferung
3181 0128082
1 9251021068F
2 92510210CB3`;
const VVL_TEXT = `Vorverladeliste-Nr.: 100004049786

Kundennr: 9974021
873227447 8255014
873227448:8255015|42|2060x1135x745mm

Kundennr: 9974022
873227449 8255016`;
const STD_TEXT = `AUFTRAG_A
HU1
HU2

AUFTRAG_B
HU3`;

// Referenz: die Parser des Original-Generators (tests/reference/…html) in der Seite ausführen und den QR-Inhalt abgreifen
async function referencePayload(page, mode, text) {
  const html = fs.readFileSync(path.join(__dirname, 'reference', 'multi-auftrag-qr-generator.html'), 'utf8');
  let script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  // DOM-Zugriffe des Generators auf einen unsichtbaren Container umbiegen; Ergebnis über einen QRCode-Fang abgreifen
  script = script.replace(/document\.getElementById\('([^']+)'\)/g, "host.querySelector('#$1')").replace("document.querySelectorAll('.tab-btn')", "host.querySelectorAll('.tab-btn')");
  return page.evaluate((script, mode, text) => {
    const host = document.createElement('div'); host.style.display = 'none';
    host.innerHTML = '<div class="tabs"><button class="tab-btn" data-mode="vvl"></button><button class="tab-btn" data-mode="man"></button><button class="tab-btn" data-mode="standard"></button></div><textarea id="dataInput"></textarea><button id="generateBtn"></button><div id="qrcode-container"></div>';
    document.body.appendChild(host);
    let captured = null;
    const RealQR = window.QRCode;
    window.QRCode = function (el, opts) { captured = opts.text; }; window.QRCode.CorrectLevel = { M: 0 };
    try {
      new Function('host', script)(host);
      host.querySelector(`.tab-btn[data-mode="${mode}"]`).click();
      host.querySelector('#dataInput').value = text;
      host.querySelector('#generateBtn').click();
    } finally { window.QRCode = RealQR; host.remove(); }
    return captured;
  }, script, mode, text);
}

(async () => {
  const browser = await launch();
  let page;
  try {
    // 1) Menüpunkt: „Zusammenfassung per E-Mail“ weg, „Aufträge erfassen“ öffnet die Seite (kein Modal)
    let be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, { viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }); await wait(500);
    assert(!(await page.$('#sendSummaryEmailButton')) && !!(await page.$('#erfassenButton')), 'Menü: „Zusammenfassung per E-Mail“ ersetzt durch „Aufträge erfassen“');
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(200);
    await page.evaluate(() => document.getElementById('erfassenButton').click()); await wait(400);
    const st1 = await page.evaluate(() => ({ page: getComputedStyle(document.getElementById('pageView')).display !== 'none', title: document.getElementById('pageTitle').textContent, url: location.search, modal: !!document.querySelector('.modal.visible'), menu: document.getElementById('side-menu').classList.contains('open'), tabs: [...document.querySelectorAll('.erf-tab')].map(b => b.textContent), active: document.querySelector('.erf-tab.is-active')?.dataset.erfMode, ta: !!document.getElementById('erfInput') }));
    assert(st1.page && st1.title === 'Aufträge erfassen' && st1.url === '?seite=erfassen' && !st1.modal && !st1.menu, `Eigene Seite mit Adresse ?seite=erfassen, kein Modal (${JSON.stringify(st1)})`);
    assert(st1.tabs.join('|') === 'MAN Fracht|Vorverladeliste (VW)|Standard (Leerzeilen)' && st1.active === 'man' && st1.ta, 'Drei Modi wie im Generator, MAN vorausgewählt, Textfeld vorhanden');
    // leer → Hinweis
    await page.evaluate(() => document.getElementById('erfAnalyzeBtn').click()); await wait(200);
    assert(/Bitte zuerst den Text einfügen/.test(await page.$eval('#pageContent', e => e.textContent)), 'Ohne Text: Hinweis statt Fehler');
    // 2) MAN-Text → Aufträge erkannt, QR-Inhalt identisch zum Generator
    await page.evaluate((t) => { const ta = document.getElementById('erfInput'); ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); }, MAN_TEXT);
    await page.evaluate(() => document.getElementById('erfAnalyzeBtn').click()); await wait(300);
    const man = await page.evaluate(() => ({ badge: document.getElementById('pageBadge').textContent, rows: [...document.querySelectorAll('.erf-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()), head: document.querySelector('.erf-result h3')?.textContent, create: document.getElementById('erfCreateBtn')?.textContent, qr: !document.getElementById('erfQrBtn')?.disabled, qrHidden: document.getElementById('erfQr')?.classList.contains('hidden') }));
    assert(man.badge === '2 Aufträge' && man.head === 'Erkannt: 2 Aufträge, 4 Packstücke' && man.rows.length === 2, `MAN: 2 Aufträge / 4 Packstücke erkannt (${JSON.stringify(man)})`);
    assert(/9007988206 · Maersk Logistics & Services\/Senator · Südafrika · PLSO 3181 0128115 · 2 Packstücke/.test(man.rows[0]) && /1 0925102219E2 · 2 0925102219E3/.test(man.rows[0]), `MAN-Zeile 1: Rechnung, Spediteur, Land, PLSO, HUs (${man.rows[0]})`);
    assert(/Nachlieferung · Logwin · Singapur/.test(man.rows[1]), 'MAN-Zeile 2: Nachlieferung erkannt');
    assert(man.create === 'Direkt anlegen (neuer MAN-LKW)' && man.qr && man.qrHidden, 'Knöpfe: „Direkt anlegen (neuer MAN-LKW)“ + „QR-Code anzeigen“ (QR zunächst zu)');
    const refMan = await referencePayload(page, 'man', MAN_TEXT);
    // QR anzeigen → Inhalt aus dem Bild-Title/Canvas nicht lesbar, daher über „Inhalt kopieren“ (prompt-Fallback ohne Clipboard) prüfen
    await page.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = t => { window.__copied = t; return Promise.resolve(); }; });
    await page.evaluate(() => document.getElementById('erfCopyBtn').click()); await wait(200);
    const copiedMan = await page.evaluate(() => window.__copied);
    assert(refMan && copiedMan === refMan && copiedMan.startsWith('FRT_MULTI_V1;;;9007988206|MAERSK LOGISTICS & SERVICES/SENATOR|SUEDAFRIKA|3181 0128115|||1 0925102219E2|Einwegpalette B03|120x80x60 CM|42 KG~~~2 0925102219E3'), `QR-Inhalt MAN identisch mit dem Original-Generator (${(copiedMan || '').slice(0, 60)}…)`);
    assert(/Kopiert!/.test(await page.$eval('#erfCopyBtn', b => b.textContent)), '„Inhalt kopieren“ meldet „Kopiert!“');
    await page.evaluate(() => document.getElementById('erfQrBtn').click()); await wait(400);
    const qrShown = await page.evaluate(() => { const q = document.getElementById('erfQr'); const img = q && (q.querySelector('img') || q.querySelector('canvas')); return { hidden: q?.classList.contains('hidden'), img: !!img, w: img ? img.getBoundingClientRect().width : 0 }; });
    assert(!qrShown.hidden && qrShown.img && qrShown.w > 200, `QR-Code wird gezeichnet (${JSON.stringify(qrShown)})`);
    await page.screenshot({ path: '.arena-shots/erfassen-phone-man.png', fullPage: true });
    // 3) Direkt anlegen (MAN): neuer MAN-LKW mit beiden Aufträgen, Daten am Server, Seite bleibt offen, kein Neuladen
    await page.evaluate(() => { window.__reloaded = false; window.confirm = () => true; });
    const beforeActions = be.actions.length;
    await page.evaluate(() => document.getElementById('erfCreateBtn').click()); await wait(1500);
    const after = await page.evaluate(() => ({ notice: document.querySelector('.erf-notice')?.textContent.trim(), title: document.getElementById('pageTitle').textContent, ta: document.getElementById('erfInput')?.value, rows: document.querySelectorAll('.erf-row').length, url: location.search }));
    assert(after.title === 'Aufträge erfassen' && after.url === '?seite=erfassen' && /MAN \d+ angelegt: 2 Aufträge, 4 Packstücke/.test(after.notice) && after.ta === '' && after.rows === 0, `Direkt anlegen: Meldung, Seite bleibt offen, Feld geleert (${JSON.stringify(after)})`);
    const saved = be.requests.filter(r => r.action === 'saveShipments').slice(beforeActions >= 0 ? 0 : 0);
    const s1 = be.store['9007988206'], s2 = be.store['NACHLIEFERUNG'];
    assert(s1 && s2 && s1.truckId === s2.truckId && /^MAN \d+$/.test(s1.truckId) && typeof s1.originalManNumber === 'number', `Beide Aufträge am Server auf demselben neuen MAN-LKW (${s1 && s1.truckId})`);
    assert(s1.freightForwarder === 'MAERSK LOGISTICS & SERVICES/SENATOR' && s1.destinationCountry === 'SUEDAFRIKA' && s1.plsoNumber === '3181 0128115' && s1.isHuListOrder && s1.totalPiecesExpected === 2, 'Auftrag 1: Spediteur/Land/PLSO/Stückzahl wie beim QR-Import');
    const i1 = s1.scannedItems.find(i => i.rawInput === '0925102219E2');
    assert(i1 && i1.position === 1 && i1.packaging === 'Einwegpalette B03' && i1.dimensions === '120x80x60 CM' && i1.grossWeight === '42 KG' && i1.status === 'Anstehend', `HU mit Position, Verpackung, Maßen, Gewicht (${JSON.stringify(i1 && { p: i1.position, v: i1.packaging, m: i1.dimensions, g: i1.grossWeight })})`);
    assert(s2.scannedItems.length === 2 && s2.scannedItems[1].rawInput === '92510210CB3' && s2.scannedItems[1].position === 2, 'Nachlieferung: 2 HUs mit Positionen');
    // Startseite/Anlieferung zeigt den neuen LKW
    await page.evaluate(() => document.getElementById('pageBackBtn').click()); await wait(400);
    const home = await page.evaluate(() => ({ lkw: [...document.querySelectorAll('#lkw-menu-container .lkw-menu-item')].map(l => l.textContent.replace(/\s+/g, ' ').trim()), rows: [...document.querySelectorAll('#shipmentTableBody tr[data-basenumber]')].map(r => r.dataset.basenumber) }));
    assert(home.rows.includes('9007988206') && home.rows.includes('NACHLIEFERUNG') && home.lkw.some(l => /MAN \d+/.test(l)), `Ohne Neuladen: Aufträge in der Liste, LKW im Menü (${JSON.stringify(home.lkw)})`);
    // 4) Zweiter Durchlauf legt einen WEITEREN MAN-LKW an (Nachlieferung wird umbenannt)
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(150);
    await page.evaluate(() => document.getElementById('erfassenButton').click()); await wait(300);
    await page.evaluate((t) => { const ta = document.getElementById('erfInput'); ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); }, MAN_TEXT.split('\n\n')[1]);
    await page.evaluate(() => document.getElementById('erfAnalyzeBtn').click()); await wait(200);
    await page.evaluate(() => document.getElementById('erfCreateBtn').click()); await wait(1500);
    const n2 = await page.evaluate(() => document.querySelector('.erf-notice')?.textContent.trim());
    const s3 = be.store['NACHLIEFERUNG 1'];
    assert(/MAN \d+ angelegt: 1 Auftrag, 2 Packstücke/.test(n2) && s3 && s3.truckId !== s2.truckId && s3.originalManNumber === s2.originalManNumber + 1, `Zweiter Durchlauf: neuer MAN-LKW, „NACHLIEFERUNG 1“ (${n2}; ${s3 && s3.truckId})`);
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();

    // 5) VVL-Modus: Erkennung, QR-Inhalt wie Generator, direkt anlegen → VW-LKW mit Kundenaufträgen
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, { query: '?seite=erfassen', viewport: { width: 1400, height: 900, deviceScaleFactor: 1 } }); await wait(500);
    assert((await page.$eval('#pageTitle', e => e.textContent)) === 'Aufträge erfassen', 'Adresse ?seite=erfassen öffnet die Seite direkt (Desktop)');
    await page.evaluate(() => document.querySelector('[data-erf-mode="vvl"]').click()); await wait(150);
    const ph = await page.$eval('#erfInput', t => t.placeholder);
    assert(/Vorverladeliste-Nr\./.test(ph), 'VVL-Modus: passender Platzhalter');
    await page.evaluate((t) => { const ta = document.getElementById('erfInput'); ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); }, VVL_TEXT);
    await page.evaluate(() => document.getElementById('erfAnalyzeBtn').click()); await wait(300);
    const vvl = await page.evaluate(() => ({ head: document.querySelector('.erf-result h3')?.textContent, rows: [...document.querySelectorAll('.erf-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()), create: document.getElementById('erfCreateBtn')?.textContent }));
    assert(vvl.head === 'Erkannt: 2 Aufträge, 3 Packstücke' && /Kundennr\. 9974021 · VVL 100004049786 · 2 Packstücke/.test(vvl.rows[0]) && vvl.create === 'Direkt anlegen (VW-LKW)', `VVL: Kundenaufträge erkannt (${JSON.stringify(vvl)})`);
    await page.evaluate(() => { window.__copied = null; navigator.clipboard.writeText = t => { window.__copied = t; return Promise.resolve(); }; });
    await page.evaluate(() => document.getElementById('erfCopyBtn').click()); await wait(200);
    const copiedVvl = await page.evaluate(() => window.__copied);
    const refVvl = await referencePayload(page, 'vvl', VVL_TEXT);
    assert(refVvl && copiedVvl === refVvl && copiedVvl === 'FRT_VVL_V1;;;9974021|100004049786|||873227447:8255014|N/A|N/A~~~873227448:8255015|42 KG|2060x1135x745 MM;;;9974022|100004049786|||873227449:8255016|N/A|N/A', `QR-Inhalt VVL identisch mit dem Original-Generator (${copiedVvl})`);
    await page.screenshot({ path: '.arena-shots/erfassen-desktop-vvl.png', fullPage: true });
    await page.evaluate(() => { window.confirm = () => true; });
    await page.evaluate(() => document.getElementById('erfCreateBtn').click()); await wait(1500);
    const nv = await page.evaluate(() => document.querySelector('.erf-notice')?.textContent.trim());
    const k1 = be.store['9974021'], k2 = be.store['9974022'];
    assert(/Vorverladeliste 100004049786 angelegt: 2 neue Aufträge, 0 ergänzt, 3 Positionen/.test(nv) && k1 && k2 && k1.truckId === 'VVL-100004049786' && k1.parentOrderNumber === '100004049786' && k2.truckId === 'VVL-100004049786', `VVL direkt angelegt: VW-LKW mit 2 Kundenaufträgen (${nv})`);
    const p2 = k1.scannedItems.find(i => i.rawInput === '873227448');
    assert(p2 && p2.sendnr === '8255015' && p2.grossWeight === '42 KG' && p2.dimensions === '2060x1135x745 MM' && k1.scannedItems[0].sendnr === '8255014', 'VVL-Positionen mit Sendungs-Nr., Gewicht und Maßen (MM)');
    // Standard-Modus: einfache Blöcke
    await page.evaluate(() => document.querySelector('[data-erf-mode="standard"]').click()); await wait(150);
    await page.evaluate((t) => { const ta = document.getElementById('erfInput'); ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); }, STD_TEXT);
    await page.evaluate(() => document.getElementById('erfAnalyzeBtn').click()); await wait(200);
    const std = await page.evaluate(() => ({ head: document.querySelector('.erf-result h3')?.textContent, create: document.getElementById('erfCreateBtn')?.textContent }));
    const refStd = await referencePayload(page, 'standard', STD_TEXT);
    await page.evaluate(() => { window.__copied = null; }); await page.evaluate(() => document.getElementById('erfCopyBtn').click()); await wait(150);
    const copiedStd = await page.evaluate(() => window.__copied);
    assert(std.head === 'Erkannt: 2 Aufträge, 3 Packstücke' && std.create === 'Direkt anlegen (neuer MAN-LKW)' && copiedStd === refStd && copiedStd === 'FRT_MULTI_V1;;;AUFTRAG_A|N/A|N/A|N/A|||HU1~~~HU2;;;AUFTRAG_B|N/A|N/A|N/A|||HU3', `Standard-Modus wie im Generator (${copiedStd})`);
    // Fehlertext bei unbrauchbarem Text
    await page.evaluate(() => document.querySelector('[data-erf-mode="vvl"]').click()); await wait(100);
    await page.evaluate(() => { const ta = document.getElementById('erfInput'); ta.value = 'nur irgendwas'; ta.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('erfAnalyzeBtn').click(); }); await wait(150);
    assert(/Keine „Vorverladeliste-Nr\.:“ im Text gefunden/.test(await page.$eval('#pageContent', e => e.textContent)), 'VVL ohne Nummer: verständliche Fehlermeldung');
    // Zu groß für QR: Knopf gesperrt, Hinweis, Direkt anlegen bleibt möglich
    await page.evaluate(() => document.querySelector('[data-erf-mode="standard"]').click()); await wait(100);
    const big = Array.from({ length: 5 }, (_, k) => `AUFTRAG_${k}\n` + Array.from({ length: 40 }, (__, j) => `HU${k}_${String(j).padStart(9, '0')}`).join('\n')).join('\n\n');
    await page.evaluate((t) => { const ta = document.getElementById('erfInput'); ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('erfAnalyzeBtn').click(); }, big); await wait(200);
    const tooBig = await page.evaluate(() => ({ qr: document.getElementById('erfQrBtn')?.disabled, note: document.querySelector('.erf-toobig')?.textContent, create: !document.getElementById('erfCreateBtn')?.disabled }));
    assert(tooBig.qr && /Zu groß für einen QR-Code \(\d+ von max\. 2300 Zeichen\)/.test(tooBig.note) && tooBig.create, `Zu groß für QR: Knopf gesperrt, Hinweis, „Direkt anlegen“ weiterhin möglich (${tooBig.note})`);
    // Sync-Neuzeichnen verwirft die Eingabe nicht (update() lässt die Seite stehen)
    await page.evaluate(() => { const ta = document.getElementById('erfInput'); ta.value = 'bleibt stehen'; ta.dispatchEvent(new Event('input', { bubbles: true })); });
    await wait(3500);
    assert((await page.$eval('#erfInput', t => t.value)) === 'bleibt stehen', 'Eingabe überlebt den Sync-Abruf (3 s)');
    assert(page.__errors.length === 0, `Keine JS-Fehler (Desktop) (${page.__errors.join(' | ')})`);
    await page.close();

    // 6) Scan-Weg unverändert: QR-Inhalt ins Scan-Feld → Rückfrage → Import + Neuladen (Regression)
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, {}); await wait(500);
    await page.evaluate(() => { window.confirm = () => true; window.alert = () => {}; });
    const nav = page.waitForNavigation({ timeout: 8000 }).catch(() => null);
    await page.evaluate((p) => { const i = document.getElementById('shipmentNumberInput'); i.value = p; i.dispatchEvent(new Event('input', { bubbles: true })); }, refMan);
    await nav; await wait(800);
    assert(be.store['9007988206'] && be.store['NACHLIEFERUNG'] && be.store['9007988206'].plsoNumber === '3181 0128115', 'Scan-Weg (FRT_MULTI_V1 im Scan-Feld) importiert weiterhin wie bisher');
    await page.close();
  } catch (e) {
    console.log('Testlauf abgebrochen: ' + (e && e.stack || e)); fails++;
  } finally { await browser.close(); }
  console.log(fails ? `SOME FAILED (${fails} von ${oks + fails})` : `ALL GOOD (${oks})`);
  process.exit(fails ? 1 : 0);
})();
