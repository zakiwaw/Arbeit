// Browser-Zoom ist unterbunden (Meta, touch-action, Gesten, Strg+Rad/Tasten); Scrollen/Tippen/App bleiben intakt
const { launch, makeBackend, openApp, sampleData, scan, assert, finish } = require('./helpers');
(async () => {
  const browser = await launch();
  try {
    const page = await openApp(browser, makeBackend(sampleData(), {}));
    const meta = await page.$eval('meta[name="viewport"]', m => m.content);
    assert(/user-scalable=no/.test(meta) && /maximum-scale=1/.test(meta), `Viewport-Meta verbietet Zoom: ${meta}`);
    const ta = await page.evaluate(() => ['html', 'body', '#side-menu', '.modal-content', '#shipmentNumberInput', 'table', '#pageView', '.home-tile', 'select', 'textarea', 'button', '#batchArea']
      .map(s => { const el = document.querySelector(s); return [s, el ? getComputedStyle(el).touchAction : 'MISSING']; }));
    assert(ta.every(([, v]) => v === 'pan-x pan-y'), `touch-action pan-x pan-y überall (${ta.filter(([, v]) => v !== 'pan-x pan-y').map(x => x.join('=')).join(', ') || 'ok'})`);
    const wheel = await page.evaluate(() => { const mk = (o) => { const e = new WheelEvent('wheel', Object.assign({ bubbles: true, cancelable: true, deltaY: -100 }, o)); document.body.dispatchEvent(e); return e.defaultPrevented; }; return { ctrl: mk({ ctrlKey: true }), meta: mk({ metaKey: true }), plain: mk({}) }; });
    assert(wheel.ctrl && wheel.meta && !wheel.plain, 'Strg/Cmd + Mausrad geblockt, normales Scrollen erlaubt');
    const keys = await page.evaluate(() => { const mk = (o) => { const e = new KeyboardEvent('keydown', Object.assign({ bubbles: true, cancelable: true }, o)); document.body.dispatchEvent(e); return e.defaultPrevented; }; return { plus: mk({ key: '+', ctrlKey: true }), minus: mk({ key: '-', ctrlKey: true }), zero: mk({ key: '0', ctrlKey: true }), plainMinus: mk({ key: '-' }) }; });
    assert(keys.plus && keys.minus && !keys.zero && !keys.plainMinus, 'Strg+Plus/Minus geblockt; Strg+0 und normales Minus erlaubt');
    const gest = await page.evaluate(() => ['gesturestart', 'gesturechange', 'gestureend'].map(t => { const e = new Event(t, { bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; }));
    assert(gest.every(Boolean), 'Safari-Gestenereignisse (Pinch) geblockt');
    const wk = await page.evaluate(async () => {
      window.GestureEvent = function () {};
      const src = await (await fetch('script.js')).text(); const m = src.match(/\(function preventBrowserZoom\(\) \{[\s\S]*?\n\}\)\(\);/); if (!m) return { found: false };
      new Function(m[0])();
      const mkTouch = (id, x) => new Touch({ identifier: id, target: document.body, clientX: x, clientY: 200 });
      const mk = (touches) => { const e = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches, targetTouches: touches, changedTouches: touches }); document.body.dispatchEvent(e); return e.defaultPrevented; };
      return { found: true, two: mk([mkTouch(1, 100), mkTouch(2, 200)]), one: mk([mkTouch(1, 100)]) };
    });
    assert(wk.found && wk.two && !wk.one, 'WebKit: Zwei-Finger-Bewegung geblockt, Ein-Finger-Scrollen erlaubt');
    await scan(page, 'HU1001', 500);
    const st = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtSicherungMobile_V8_18_Refactored'))['9007000001'].scannedItems.find(i => i.rawInput === 'HU1001').status);
    assert(st !== 'Anstehend', `Scan funktioniert weiterhin (HU1001 → ${st})`);
    await page.evaluate(() => document.querySelector('.home-tile[data-page="anlieferung"]').click()); await new Promise(r => setTimeout(r, 400));
    assert(await page.$eval('#pageView', el => getComputedStyle(el).display !== 'none'), 'Unterseite „Anlieferung“ öffnet weiterhin');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join('; ')})`);
  } finally { await browser.close(); finish(); }
})().catch(e => { console.error('ERR', e); process.exit(1); });
