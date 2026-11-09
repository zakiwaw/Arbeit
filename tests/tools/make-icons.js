// App-Symbole (PWA) aus dem Barcode-Zeichen des Scan-Felds rendern: assets/icons/icon-192.png, icon-512.png,
// icon-maskable-512.png (Android „maskable“: Motiv in der sicheren Mitte, 20 % Rand). Start: node tests/tools/make-icons.js
const { launch } = require('../helpers');
const fs = require('fs'), path = require('path');
const BARCODE = 'M4,6H6V18H4V6M7,6H8V18H7V6M9,6H12V18H9V6M13,6H14V18H13V6M16,6H18V18H16V6M19,6H20V18H19V6M2,4V8H0V4A2,2 0 0,1 2,2H6V4H2M22,2A2,2 0 0,1 24,4V8H22V4H18V2H22M2,16V20H6V22H2A2,2 0 0,1 0,20V16H2M22,20V16H24V20A2,2 0 0,1 22,22H18V20H22Z';
const svg = (size, maskable) => {
  const r = maskable ? 0 : Math.round(size * 0.22);          // maskable: Android schneidet selbst zu (Kreis/Squircle) → randlos
  const glyph = maskable ? size * 0.5 : size * 0.6;           // maskable: Motiv innerhalb der sicheren Zone (Ø 80 %)
  const off = (size - glyph) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#1e40af"/></linearGradient></defs>
    <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#g)"/>
    <g transform="translate(${off} ${off}) scale(${glyph / 24})"><path d="${BARCODE}" fill="#ffffff"/></g>
    <circle cx="${size * 0.76}" cy="${size * 0.76}" r="${size * 0.11}" fill="#16a34a" stroke="#ffffff" stroke-width="${size * 0.02}"/>
    <g transform="translate(${size * 0.76 - size * 0.055} ${size * 0.76 - size * 0.06}) scale(${size * 0.11 / 24})"><path fill="#ffffff" d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/></g>
  </svg>`;
};
(async () => {
  const browser = await launch();
  const page = await browser.newPage();
  const out = path.join(__dirname, '..', '..', 'assets', 'icons');
  for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true]]) {
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg(size, maskable)}</body></html>`);
    await page.screenshot({ path: path.join(out, name), omitBackground: !maskable, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('ok', name);
  }
  await browser.close();
})();
