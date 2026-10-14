// Töne: Wann kommt welcher Ton, laufen sie parallel und vollständig, greift Freischaltung + Fallback?
const { launch, makeBackend, openApp, sampleData, scan, setBatchMode, assert, finish } = require('./helpers');

function dataWithNachlieferung() {
  const data = sampleData();
  const now = new Date().toISOString();
  const item = (hu) => ({ rawInput: hu, status: 'Anstehend', timestamp: now, isCombination: false, notes: [], isCancelled: false, cancelledTimestamp: null, grossWeight: '10 KG' });
  data['NACHLIEFERUNG'] = { hawb: 'NACHLIEFERUNG', lastModified: now, totalPiecesExpected: 3, scannedItems: [item('NL0001'), item('NL0002'), item('NL0003')], mitarbeiter: 'T', isHuListOrder: true, truckId: 'MAN 2', originalManNumber: 2 };
  return data;
}

// Protokolliert Web-Audio-Starts (AudioBufferSourceNode.start) und <audio>.play() mit Zeitstempel
async function instrument(page) {
  await page.evaluate(() => {
    window.__ev = []; const t0 = performance.now();
    const S = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function () {
      const src = this; const dur = src.buffer ? src.buffer.duration : 0;
      const kind = dur < 1.5 ? 'error' : 'nachlieferung';
      const e = { t: Math.round(performance.now() - t0), via: 'webaudio', kind, dur: +dur.toFixed(2), endedAt: null };
      window.__ev.push(e);
      const prev = src.onended; src.onended = function (ev) { e.endedAt = Math.round(performance.now() - t0); if (prev) prev.call(this, ev); };
      return S.apply(this, arguments);
    };
    const P = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const el = this; const kind = (el.getAttribute('src') || '').includes('nachlieferung') ? 'nachlieferung' : 'error';
      if (!el.muted) window.__ev.push({ t: Math.round(performance.now() - t0), via: 'element', kind, dur: +(el.duration || 0).toFixed(2) });
      return P.apply(this, arguments);
    };
  });
}
const take = (page) => page.evaluate(() => window.__ev.splice(0));
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await launch();
  try {
    // ---------- A) Normalfall: Nutzer hat die Seite berührt → Web Audio ----------
    let page = await openApp(browser, makeBackend(dataWithNachlieferung(), {}));
    await instrument(page);
    await page.evaluate(() => document.body.dispatchEvent(new Event('touchend', { bubbles: true }))); // erste Berührung
    await wait(700); // Dateien laden/dekodieren
    assert(await page.evaluate(() => !!(window.AudioContext || window.webkitAudioContext)), 'Web Audio verfügbar, Freischaltung ausgelöst');

    await scan(page, 'HU1001'); let ev = await take(page);
    assert(ev.length === 0, 'Bekannte HU HU1001 → kein Ton');

    await scan(page, 'NL0001'); ev = await take(page);
    assert(ev.length === 1 && ev[0].kind === 'nachlieferung' && ev[0].via === 'webaudio', `Nachlieferungs-HU NL0001 → Nachlieferungs-Ton über Web Audio (${JSON.stringify(ev)})`);
    assert(ev[0] && ev[0].dur > 2.0 && ev[0].dur < 2.4, `Nachlieferungs-Ton ist ${ev[0] && ev[0].dur} s lang (gekürzt, ohne Vorlaufstille)`);

    await scan(page, 'UNBEKANNT99'); ev = await take(page);
    assert(ev.length === 1 && ev[0].kind === 'error' && ev[0].via === 'webaudio', 'Einzelscan unbekannte HU → Fehlerton über Web Audio');
    assert(ev[0] && ev[0].dur > 0.6 && ev[0].dur < 0.8, `Fehlerton ist ${ev[0] && ev[0].dur} s lang (gekürzt)`);
    assert(await page.$eval('#newTotalSection', e => e.classList.contains('visible')), '… Stückzahl-Abfrage erscheint weiterhin');
    await page.evaluate(() => document.getElementById('skipNewTotalBtn').click()); await wait(300);

    await scan(page, '98765432+0001'); ev = await take(page);
    assert(ev.length === 0, 'Neue Einzelsendung (Suffix-Format) → kein Ton');
    await page.evaluate(() => document.getElementById('skipNewTotalBtn').click()); await wait(300);

    // Batch: schnelle Folge → alle sofort, parallel, vollständig
    await setBatchMode(page, true);
    await scan(page, 'UNBEKANNT01', 120); await scan(page, 'UNBEKANNT02', 120); await scan(page, 'UNBEKANNT03', 0);
    await wait(1500); ev = await take(page);
    const errs = ev.filter(e => e.kind === 'error');
    assert(errs.length === 3 && errs.every(e => e.via === 'webaudio'), `Batch: 3 schnelle unbekannte HUs → 3 Fehlertöne über Web Audio (${errs.length})`);
    assert(errs.length === 3 && errs[2].t - errs[0].t < 700, `… alle drei starten sofort (Spanne ${errs.length === 3 ? errs[2].t - errs[0].t : '?'} ms, kein Warten)`);
    assert(errs.length === 3 && errs.every(e => e.endedAt !== null && e.endedAt - e.t >= 650), `… jeder läuft vollständig (${errs.map(e => (e.endedAt - e.t) + 'ms').join(', ')})`);
    assert(errs.length === 3 && errs[1].t < errs[0].endedAt, '… Ton 2 startet, während Ton 1 noch läuft (Überlagerung)');

    await scan(page, 'HU1002'); ev = await take(page);
    assert(ev.length === 0, 'Batch: bekannte HU → kein Ton');
    await scan(page, 'UNBEKANNT04', 100); await scan(page, 'NL0002', 0); await wait(2600); ev = await take(page);
    assert(ev.length === 2 && ev[0].kind === 'error' && ev[1].kind === 'nachlieferung' && ev[1].t - ev[0].t < 600, 'Batch: Fehlerton + Nachlieferungs-Ton direkt hintereinander, beide sofort');
    assert(ev.length === 2 && ev[1].endedAt - ev[1].t >= 2100, `… Nachlieferungs-Ton läuft vollständig (${ev[1] && (ev[1].endedAt - ev[1].t)} ms)`);

    for (let i = 10; i < 20; i++) await scan(page, 'UNBEKANNT' + i, 40);
    await wait(1200); ev = await take(page);
    assert(ev.length >= 3 && ev.length <= 4, `10 Scans in 0,4 s → ${ev.length} gleichzeitige Töne (Deckel 4)`);
    await wait(200); await scan(page, 'UNBEKANNT30'); ev = await take(page);
    assert(ev.length === 1, 'Danach: nächster Scan startet sofort wieder einen Ton');

    await page.evaluate(() => document.getElementById('unexpectedHuSoundToggle').click());
    await scan(page, 'UNBEKANNT40'); await scan(page, 'NL0003'); ev = await take(page);
    assert(ev.length === 0, 'Schalter „Überzählig-Ton“ aus → gar kein Ton');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join('; ')})`);
    await page.close();

    // ---------- B) Ohne HU-Listen im System → kein Fehlerton ----------
    page = await openApp(browser, makeBackend({ '123': sampleData()['123'] }, {}));
    await instrument(page); await page.evaluate(() => document.body.dispatchEvent(new Event('touchend', { bubbles: true }))); await wait(700);
    await scan(page, 'IRGENDWAS1', 500); ev = await take(page);
    assert(ev.length === 0, `Ohne HU-Listen: neuer Scan → kein Ton (${JSON.stringify(ev)})`);
    await page.close();

    // ---------- C) Freischaltung durch Scanner-Enter (keydown) statt Berührung ----------
    page = await openApp(browser, makeBackend(dataWithNachlieferung(), {}));
    await instrument(page);
    const before = await page.evaluate(() => typeof AudioContext !== 'undefined');
    await page.keyboard.press('Enter'); await wait(700);
    await scan(page, 'UNBEKANNT50'); ev = await take(page);
    assert(before && ev.length === 1 && ev[0].via === 'webaudio', 'Nur Tastatur/Scanner (Enter, keine Berührung): Audio freigeschaltet, Ton über Web Audio');
    await page.close();

    // ---------- D) Fallback: Web Audio noch nicht bereit (Puffer fehlt) → <audio>-Kopie, Ton kommt trotzdem ----------
    const be = makeBackend(dataWithNachlieferung(), {});
    const origHandler = be.handler;
    be.handler = (req) => { if (/assets\/error-sound\.mp3/.test(req.url()) && req.resourceType() === 'fetch') return req.respond({ status: 404, body: 'blocked for test' }); return origHandler(req); };
    page = await openApp(browser, be);
    await instrument(page); await page.evaluate(() => document.body.dispatchEvent(new Event('touchend', { bubbles: true }))); await wait(600);
    await scan(page, 'UNBEKANNT60'); ev = await take(page);
    assert(ev.length === 1 && ev[0].via === 'element' && ev[0].kind === 'error', `Web-Audio-Puffer nicht verfügbar → Fehlerton kommt über <audio>-Fallback (${JSON.stringify(ev)})`);
    await page.evaluate(() => document.getElementById('skipNewTotalBtn').click()); await wait(300); // Stückzahl-Abfrage schließen
    await scan(page, 'NL0001'); ev = await take(page);
    assert(ev.length === 1 && ev[0].via === 'webaudio', 'Nachlieferungs-Ton (Puffer vorhanden) weiterhin über Web Audio');
    await page.close();
  } finally { await browser.close(); finish(); }
})().catch(e => { console.error('ERR', e); process.exit(1); });
