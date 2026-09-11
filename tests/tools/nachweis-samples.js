// Beispiel-Nachweise erzeugen (VW-Auftrag mit 20 Packstücken, MAN-Rechnung) → PDF-Dateien für die Sichtprüfung.
// Start: node tests/tools/nachweis-samples.js <outDir>   → <outDir>/vw.pdf, <outDir>/man.pdf
const { launch, makeBackend, openApp, sampleData } = require('../helpers');
const fs = require('fs'), path = require('path');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const outDir = process.argv[2] || '/tmp';
  const browser = await launch();
  const d = sampleData(); const now = Date.now(); const iso = ago => new Date(now - ago * 60e3).toISOString();
  const dims = ['2060x1135x745 MM', '1120x840x760 MM', '330x260x320 MM', '580x420x490 MM'];
  const w = ['42,000KG', '48,000KG', '89,000KG', '114,000KG', '112,000KG', '82,000KG', '56,000KG', '53,000KG', '10,600KG', '40,000KG'];
  const items = [];
  for (let i = 0; i < 20; i++) items.push({ rawInput: String(881213825 + i * 1117), sendnr: i % 3 === 2 ? '8385952' : '8386255', status: i < 3 ? 'XRY' : 'Anstehend', timestamp: iso(60 - i), isCombination: false, notes: i === 4 ? ['Ecke leicht eingedrückt'] : [], isCancelled: false, cancelledTimestamp: null, packaging: 'GLT', dimensions: dims[i % 4], grossWeight: w[i % 10] });
  d['938203'] = { hawb: '938203', lastModified: iso(1), totalPiecesExpected: 20, mitarbeiter: 'T', isHuListOrder: true, truckId: 'VVL-100004158949', parentOrderNumber: '100004158949', scannedItems: items };
  const vw = (vse, sn, st) => ({ rawInput: vse, sendnr: sn, status: st, timestamp: iso(30), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'GLT', dimensions: '1200x800x600 MM', grossWeight: '100 KG' });
  d['796201'] = { hawb: '796201', lastModified: iso(2), totalPiecesExpected: 1, mitarbeiter: 'T', isHuListOrder: true, truckId: 'VVL-100004158949', parentOrderNumber: '100004158949', scannedItems: [vw('881288686', '7000001', 'ETD'), vw('881288686', '7000001', 'Wareneingang')] };
  const mk = (hu, pos, st) => ({ rawInput: hu, position: pos, status: st, timestamp: iso(60 - pos), isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, packaging: 'Carton', dimensions: '120x80x60 CM', grossWeight: '35.5 KG' });
  d['9008295951'] = { hawb: '9008295951', lastModified: iso(1), totalPiecesExpected: 3, mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 1', originalManNumber: 1, freightForwarder: 'DHL', destinationCountry: 'AUSTRALIEN', plsoNumber: '318101', scannedItems: [mk('0926040918E1', 1, 'XRY'), mk('0926040918E2', 2, 'Anstehend'), mk('0926040918E3', 3, 'ETD')] };
  const be = makeBackend(d, {});
  const page = await openApp(browser, be, { viewport: { width: 1600, height: 900, deviceScaleFactor: 1 } }); await wait(500);
  const grab = async (base, out) => {
    await page.evaluate(() => { window.__opened = []; window.open = () => { const t = { closed: false, location: {}, close() {} }; Object.defineProperty(t.location, 'href', { set(v) { window.__opened.push(v); } }); return t; }; });
    await page.evaluate((b) => document.querySelector(`tr[data-basenumber="${b}"] .pdf-btn`).click(), base); await wait(1500);
    const b64 = await page.evaluate(async () => { const r = await fetch(window.__opened[0]); const b = await r.blob(); return await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(',')[1]); fr.readAsDataURL(b); }); });
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  };
  await grab('938203', path.join(outDir, 'vw.pdf')); await grab('9008295951', path.join(outDir, 'man.pdf'));
  console.log('errors', page.__errors);
  await browser.close();
})();
