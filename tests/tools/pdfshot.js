// PDF → PNG je Seite, gerendert mit pdf.js im Headless-Chrome (echte Canvas). Nur Werkzeug für die Sichtprüfung, kein Test.
// Voraussetzung: .arena-shots/pdfjs/pdf.mjs + pdf.worker.mjs (aus npm pdfjs-dist@4 build/), Server auf :8000.
// Start: node tests/tools/pdfshot.js <pdf> <outPrefix> [maxPages]
const fs = require('fs');
const { launch } = require('../helpers');
(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:8000/.arena-shots/pdfjs/', { waitUntil: 'load' }).catch(() => {});
  const b64 = fs.readFileSync(process.argv[2]).toString('base64');
  const max = Number(process.argv[4] || 3);
  const out = await page.evaluate(async (b64, max) => {
    const pdfjs = await import('/.arena-shots/pdfjs/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = '/.arena-shots/pdfjs/pdf.worker.mjs';
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const doc = await pdfjs.getDocument({ data: bytes }).promise;
    const n = Math.min(doc.numPages, max); const pngs = [];
    for (let i = 1; i <= n; i++) {
      const p = await doc.getPage(i); const vp = p.getViewport({ scale: 1.6 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await p.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      pngs.push(c.toDataURL('image/png').split(',')[1]);
    }
    return { pages: doc.numPages, pngs };
  }, b64, max);
  out.pngs.forEach((p, i) => fs.writeFileSync(`${process.argv[3]}-${i + 1}.png`, Buffer.from(p, 'base64')));
  console.log('pages', out.pages, 'rendered', out.pngs.length);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
