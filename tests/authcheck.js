// Anmeldung (nur PIN, 9.7): Anmeldeseite vor dem Laden, Einladungslink, Token an jeder Anfrage, Anmeldung bei abgelaufener Sitzung,
// Administrator-Seite „Mitarbeiter“, Abmelden, Name des Angemeldeten in Scans, altes Skript ohne Anmeldung.
// Start: node tests/authcheck.js  (Server auf :8000, Chrome siehe tests/README.md)
const { launch, makeBackend, openApp, sampleData, scan, assert, finish, TEST_TOKEN, TEST_USER, MA2_TOKEN, MA2_USER } = require('./helpers');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await launch();
  const authOpen = page => page.evaluate(() => !document.getElementById('authView').classList.contains('hidden'));
  const authText = page => page.evaluate(() => document.getElementById('authContent').innerText);
  const typePin = async (page, sel, pin) => { await page.evaluate((sel) => { document.querySelector(sel).value = ''; }, sel); await page.type(sel, pin); };
  let page, be;

  try {
    // 1) Ohne Sitzung: Anmeldeseite vor dem Laden, keine Daten-Aktion ohne Token
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, { loggedOut: true }); await wait(400);
    assert(await authOpen(page), 'Ohne Sitzung: Anmeldeseite sichtbar');
    assert(await page.evaluate(() => getComputedStyle(document.getElementById('resetDataButton').parentElement).display === 'none'), 'Ohne Anmeldung ist „Alles Zurücksetzen“ ausgeblendet');
    assert(await page.evaluate(() => !document.getElementById('loadingOverlay').classList.contains('visible')), 'Lade-Spinner ist hinter der Anmeldeseite ausgeblendet');
    assert(!be.actions.includes('loadChanges') && !be.actions.includes('loadLkwStatus'), `Vor der Anmeldung keine Daten-Aktion (${be.actions.join(',')})`);
    const form = await page.evaluate(() => ({ selects: document.querySelectorAll('#authContent select').length, inputs: Array.from(document.querySelectorAll('#authContent input')).map(i => i.id), text: document.getElementById('authContent').innerText }));
    assert(form.selects === 0 && form.inputs.join(',') === 'authPin' && !/Mitarbeiter 1|Mitarbeiter 2/.test(form.text), `Anmeldeseite zeigt nur das PIN-Feld – keine Namensauswahl, keine Namen (${JSON.stringify(form)})`);
    const probe = be.requests.find(r => r.action === 'authLogin');
    assert(probe && !probe.payload.pin && !probe.payload.userId && !be.actions.includes('authUsers'), 'Vorabprüfung über authLogin ohne PIN (kein authUsers mehr)');
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
    assert(focused === 'authPin', `PIN-Feld hat den Fokus, nicht das Scan-Feld (${focused})`);
    // falsche PIN
    await typePin(page, '#authPin', '000000'); await wait(500);
    assert(/PIN falsch – noch 4/.test(await authText(page)), 'Falsche PIN: Meldung mit Restversuchen');
    assert(await page.evaluate(() => document.getElementById('authPin').value) === '', 'PIN-Feld nach Fehlversuch geleert');
    assert(await authOpen(page), 'Anmeldeseite bleibt offen');
    // richtige PIN (6. Ziffer löst die Anmeldung aus)
    await typePin(page, '#authPin', '778812'); await wait(1200);
    assert(!(await authOpen(page)), 'Richtige PIN: Anmeldeseite geschlossen');
    const loginReq = be.requests.filter(r => r.action === 'authLogin').pop();
    assert(loginReq && loginReq.payload.pin === '778812' && loginReq.payload.deviceId && !('userId' in loginReq.payload), 'authLogin nur mit PIN und Gerätekennung (keine Nutzer-ID)');
    assert((await page.evaluate(() => document.getElementById('authUserLine').textContent)) === 'Angemeldet: Mitarbeiter 2', 'Server erkennt den Mitarbeiter an der PIN');
    assert(be.actions.includes('loadChanges') && !be.actions.includes('loadLkwStatus'), 'Nach der Anmeldung werden die Daten geladen (LKW-Status kommt mit loadChanges – kein Extra-Aufruf)');
    const rows = await page.evaluate(() => document.querySelectorAll('#shipmentTableBody tr[data-basenumber]').length);
    assert(rows > 0, `Sendungen sichtbar (${rows})`);
    const dataReqs = be.requests.filter(r => !['authLogin', 'authInviteInfo', 'authAccept'].includes(r.action));
    assert(dataReqs.length > 0 && dataReqs.every(r => r.auth && be.tokens[r.auth] === 'u-ma2'), `Jede Daten-Anfrage trägt das Token (${dataReqs.length})`);
    const sess = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtTracker_session')));
    assert(sess && sess.token && sess.user.name === 'Mitarbeiter 2' && !JSON.stringify(sess).includes('778812'), 'Sitzung gespeichert – ohne PIN');
    // Name des Angemeldeten landet im Scan
    await scan(page, '555', 600);
    await page.evaluate(() => { const b = document.getElementById('confirmNewTotalBtn'); const i = document.getElementById('newTotalInput'); if (i) i.value = '1'; if (b) b.click(); });
    await wait(900);
    const saved = be.store['555'];
    assert(saved && saved.mitarbeiter === 'Mitarbeiter 2', `Neue Sendung trägt den angemeldeten Mitarbeiter (${saved && saved.mitarbeiter})`);
    // Menü: normaler Mitarbeiter sieht „Abmelden“, aber nicht „Mitarbeiter“
    const menu = await page.evaluate(() => ({ user: document.getElementById('authUserLine').textContent, admin: document.getElementById('manageUsersItem').classList.contains('hidden'), logout: document.getElementById('logoutItem').classList.contains('hidden') }));
    assert(menu.user === 'Angemeldet: Mitarbeiter 2' && menu.admin === true && menu.logout === false, `Menü für Mitarbeiter (${JSON.stringify(menu)})`);
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click());
    assert(await page.evaluate(() => getComputedStyle(document.getElementById('resetDataButton').parentElement).display === 'none'), 'Mitarbeiter sieht „Alles Zurücksetzen“ auch im geöffneten Menü nicht');
    const employeeClick = await page.evaluate(() => {
      let asked = false; const previous = window.confirm; window.confirm = () => { asked = true; return true; };
      document.getElementById('resetDataButton').click(); window.confirm = previous; return asked;
    });
    await wait(200);
    assert(!employeeClick && !be.actions.includes('clearAllData'), 'Auch ein künstlicher Klick durch einen Mitarbeiter startet kein Zurücksetzen');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    const ma2Session = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtTracker_session')));
    await page.close();
    // Neu öffnen mit der gespeicherten Sitzung → keine Anmeldeseite, Sitzung wird zuerst geprüft
    be.actions.length = 0;
    page = await openApp(browser, be, { session: ma2Session }); await wait(300);
    assert(!(await authOpen(page)), 'Start mit gültiger Sitzung: direkt in die App');
    assert(be.actions[0] === 'authCheck' && be.actions.includes('loadChanges'), `Sitzung wird beim Start geprüft, dann geladen (${be.actions.slice(0, 3).join(',')})`);
    assert((await page.evaluate(() => document.getElementById('authUserLine').textContent)) === 'Angemeldet: Mitarbeiter 2', 'Weiterhin als Mitarbeiter 2 angemeldet');
    await page.close();

    // 2) Sitzung serverseitig ungültig (abgelaufen / gesperrt) → Anmeldeseite, danach weiter ohne Neuladen
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be); await wait(300);
    assert(!(await authOpen(page)), 'Angemeldet gestartet');
    delete be.tokens[TEST_TOKEN]; // Server kennt das Token nicht mehr (z. B. abgelaufen oder Nutzer gesperrt)
    await wait(4000);             // nächster Abruf (3 s)
    assert(await authOpen(page), 'Token ungültig → Anmeldeseite erscheint im laufenden Betrieb');
    assert(await page.evaluate(() => !localStorage.getItem('frachtTracker_session')), 'Ungültige Sitzung lokal verworfen');
    const before = be.actions.length; await wait(3500);
    const during = be.actions.slice(before).filter(a => a === 'loadChanges').length;
    assert(during === 0, `Solange die Anmeldeseite offen ist, kein Abruf (${during})`);
    await typePin(page, '#authPin', '482913'); await wait(1500);
    assert(!(await authOpen(page)), 'Erneute Anmeldung schließt die Seite');
    assert(be.actions.slice(before).includes('loadChanges'), 'Nach der Anmeldung wird sofort wieder abgerufen');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();

    // 3) Einladungslink: PIN 2× wählen → angemeldet, Token aus Adresse entfernt; ungültiger Link
    be = makeBackend(sampleData(), {}); be.users[1].hasPin = false; be.users[1].pin = '';
    page = await openApp(browser, be, { loggedOut: true, query: '?einladung=inv-ma2' }); await wait(400);
    assert(await authOpen(page) && /Willkommen, Mitarbeiter 2/.test(await authText(page)), 'Einladungsseite mit Namen');
    await typePin(page, '#authPin1', '123456'); await typePin(page, '#authPin2', '123456');
    await page.click('#authInviteBtn'); await wait(500);
    assert(/zu einfache PIN/.test(await authText(page)), 'Zu einfache PIN wird abgelehnt');
    await typePin(page, '#authPin1', '482913'); await typePin(page, '#authPin2', '482913');
    await page.click('#authInviteBtn'); await wait(500);
    assert(/schon vergeben/.test(await authText(page)) && await authOpen(page) && be.users[1].hasPin === false, 'PIN eines anderen Mitarbeiters wird abgelehnt (Anmeldung nur mit PIN → jede PIN nur einmal)');
    await typePin(page, '#authPin1', '246813'); await typePin(page, '#authPin2', '246831');
    await page.click('#authInviteBtn'); await wait(300);
    assert(/stimmen nicht überein/.test(await authText(page)), 'Ungleiche Eingaben werden abgefangen (ohne Server)');
    await typePin(page, '#authPin1', '246813'); await typePin(page, '#authPin2', '246813');
    await page.click('#authInviteBtn'); await wait(1500);
    assert(!(await authOpen(page)), 'PIN festgelegt → angemeldet');
    assert(be.users[1].pin === '246813' && be.users[1].hasPin, 'Server hat die neue PIN (authAccept)');
    assert(!(await page.evaluate(() => location.search)).includes('einladung'), 'Einladungs-Token aus der Adresse entfernt');
    assert((await page.evaluate(() => document.getElementById('authUserLine').textContent)) === 'Angemeldet: Mitarbeiter 2', 'Angemeldet als Mitarbeiter 2');
    await page.close();
    page = await openApp(browser, be, { loggedOut: true, query: '?einladung=inv-falsch' }); await wait(400);
    assert(/ungültig oder abgelaufen/.test(await authText(page)), 'Ungültiger Einladungslink: Hinweis');
    await page.click('#authToLoginBtn'); await wait(500);
    assert(await page.evaluate(() => !!document.getElementById('authLoginForm')), '„Zur Anmeldung“ zeigt die Anmeldeseite');
    await page.close();

    // 4) Administrator: Seite „Mitarbeiter“ – einladen, sperren, freigeben, PIN zurücksetzen
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be); await wait(300);
    const adminMenu = await page.evaluate(() => ({ user: document.getElementById('authUserLine').textContent, admin: document.getElementById('manageUsersItem').classList.contains('hidden') }));
    assert(adminMenu.user === 'Angemeldet: Mitarbeiter 1 (Administrator)' && adminMenu.admin === false, `Menü für Administrator (${JSON.stringify(adminMenu)})`);
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(200);
    assert(await page.evaluate(() => getComputedStyle(document.getElementById('resetDataButton').parentElement).display !== 'none'), 'Administrator sieht „Alles Zurücksetzen“ im Menü');
    const cancelledPrompt = await page.evaluate(() => {
      let message = ''; const previous = window.confirm; window.confirm = text => { message = text; return false; };
      document.getElementById('resetDataButton').click(); window.confirm = previous; return message;
    });
    assert(/alle Sendungsdaten/i.test(cancelledPrompt) && /gelöscht/i.test(cancelledPrompt) && /vorher.*Backup/i.test(cancelledPrompt) && !be.actions.includes('clearAllData'),
      'Warnung nennt Löschung und vorheriges Backup; Abbrechen sendet keine Anfrage');
    await page.evaluate(() => document.getElementById('manageUsersButton').click()); await wait(700);
    const pg = await page.evaluate(() => ({ title: document.getElementById('pageTitle').textContent, hidden: document.getElementById('pageView').classList.contains('hidden'), rows: Array.from(document.querySelectorAll('.admin-row .admin-name')).map(e => e.textContent), url: location.search }));
    assert(pg.title === 'Mitarbeiter' && !pg.hidden && pg.rows.length === 2 && /Mitarbeiter 1Administratoraktiv/.test(pg.rows[0]) && pg.url.includes('seite=mitarbeiter'), `Seite „Mitarbeiter“ mit Liste (${JSON.stringify(pg)})`);
    assert(await page.evaluate(() => document.querySelector('.admin-row .admin-self') !== null && document.querySelectorAll('.admin-row')[0].querySelector('[data-admin-active]') === null), 'Eigene Zeile ohne Sperren-Knopf');
    // einladen – Prüfung ohne Server
    await page.type('#adminName', 'Mitarbeiter 3'); await page.type('#adminEmail', 'mitarbeiter3@');
    await page.click('#adminInviteBtn'); await wait(300);
    assert(/gültige E-Mail/.test(await page.evaluate(() => document.querySelector('.admin-notice')?.textContent || '')), 'Ungültige E-Mail wird abgefangen');
    assert(!be.actions.includes('adminInvite'), 'Kein Server-Aufruf bei ungültiger Eingabe');
    await page.evaluate(() => { document.getElementById('adminEmail').value = 'Mitarbeiter3@Example.com'; });
    assert((await page.evaluate(() => document.getElementById('adminName').value)) === 'Mitarbeiter 3', 'Name blieb nach dem Neuzeichnen erhalten');
    await page.click('#adminInviteBtn'); await wait(800);
    const afterInvite = await page.evaluate(() => ({ notice: document.querySelector('.admin-notice')?.textContent || '', rows: document.querySelectorAll('.admin-row').length, chips: Array.from(document.querySelectorAll('.admin-row .row-chip')).map(c => c.textContent) }));
    assert(be.mails.includes('Mitarbeiter3@Example.com') && /Mitarbeiter 3 eingeladen – E-Mail an mitarbeiter3@example.com gesendet/.test(afterInvite.notice), `Einladung verschickt (${afterInvite.notice})`);
    assert(afterInvite.rows === 3 && afterInvite.chips.includes('Einladung offen'), `Neue Zeile mit „Einladung offen“ (${JSON.stringify(afterInvite)})`);
    assert((await page.evaluate(() => document.getElementById('adminName').value + document.getElementById('adminEmail').value)) === '', 'Formular nach Erfolg geleert');
    // sperren (Bestätigung wird angenommen) → Sitzungen des Nutzers weg, danach freigeben
    await page.evaluate(() => document.querySelector('[data-admin-active="u-ma2"]').click()); await wait(800);
    assert(be.users[1].active === false && /gesperrt/.test(await page.evaluate(() => document.querySelector('.admin-row.admin-inactive .admin-name')?.textContent || '')), 'Mitarbeiter 2 gesperrt');
    await page.evaluate(() => document.querySelector('[data-admin-active="u-ma2"]').click()); await wait(800);
    assert(be.users[1].active === true && (await page.evaluate(() => document.querySelectorAll('.admin-row.admin-inactive').length)) === 0, 'Mitarbeiter 2 wieder freigegeben');
    // PIN zurücksetzen
    await page.evaluate(() => document.querySelector('[data-admin-reset="u-ma2"]').click()); await wait(800);
    assert(be.actions.includes('adminResetPin') && /PIN-Reset für Mitarbeiter 2 angestoßen/.test(await page.evaluate(() => document.querySelector('.admin-notice')?.textContent || '')), 'PIN-Reset schickt neue Einladung');
    // Mail schlägt fehl → Link zum Weitergeben
    be.mailFail = true;
    await page.type('#adminName', 'Ohne Mail'); await page.type('#adminEmail', 'ohne@example.com'); await page.click('#adminInviteBtn'); await wait(800);
    const noMail = await page.evaluate(() => ({ notice: document.querySelector('.admin-notice')?.textContent || '', link: document.querySelector('.admin-link')?.textContent || '' }));
    assert(/konnte nicht gesendet werden/.test(noMail.notice) && /einladung=inv-/.test(noMail.link), `Ohne Mail: Link zum Weitergeben (${noMail.link})`);
    // Zurück → Startseite; Adresse ?seite=mitarbeiter öffnet die Seite direkt (nur Admin)
    await page.evaluate(() => document.getElementById('pageBackBtn').click()); await wait(300);
    assert(await page.evaluate(() => document.getElementById('pageView').classList.contains('hidden') && !document.getElementById('mainView').classList.contains('hidden')), 'Zurück zur Startseite');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();
    page = await openApp(browser, be, { query: '?seite=mitarbeiter' }); await wait(600);
    assert((await page.evaluate(() => document.getElementById('pageTitle').textContent)) === 'Mitarbeiter', 'Adresse ?seite=mitarbeiter öffnet die Seite (Administrator)');
    await page.close();
    // Normaler Mitarbeiter: Seite nicht erreichbar
    be = makeBackend(sampleData(), {}); be.tokens['tok-ma2'] = 'u-ma2';
    page = await openApp(browser, be, { session: { token: 'tok-ma2', user: { id: 'u-ma2', name: 'Mitarbeiter 2', role: 'user' }, expires: Date.now() + 3600e3 }, query: '?seite=mitarbeiter' }); await wait(500);
    assert(!(await authOpen(page)) && (await page.evaluate(() => document.getElementById('pageView').classList.contains('hidden'))), 'Mitarbeiter ohne Admin-Rolle: Seite wird nicht geöffnet');
    assert(!be.actions.includes('adminListUsers'), 'Kein Admin-Aufruf durch normalen Mitarbeiter');
    await page.close();

    // Einzel- und LKW-Löschung: Sichtbarkeit, direkte/künstliche Aufrufe und Rollenwechsel gegen das echte Code.gs.
    {
      const employee = { token: MA2_TOKEN, user: MA2_USER, expires: Date.now() + 3600e3 };
      const admin = { token: TEST_TOKEN, user: TEST_USER, expires: Date.now() + 3600e3 };
      const b = makeBackend(sampleData(), { 'MAN 1': true }, { gas: true });
      const p = await openApp(browser, b, { session: employee, viewport: { width: 1400, height: 900, deviceScaleFactor: 1 } });
      const localState = () => p.evaluate(() => ({ shipments: localStorage.getItem(LOCAL_STORAGE_KEY), pending: JSON.stringify(readPending()), status: localStorage.getItem(LKWSTATUSKEY) }));
      const before = await localState(), serverBefore = JSON.stringify(b.gas.sheets.shipments.rows);
      const list = await p.evaluate(() => {
        const row = document.querySelector('#shipmentTableBody tr[data-basenumber="123"]');
        window.__deleteConfirms = 0; window.confirm = () => { window.__deleteConfirms++; return true; };
        const result = { del: getComputedStyle(row.querySelector('.main-delete-btn')).display, edit: getComputedStyle(row.querySelector('.edit-btn')).display, pdf: getComputedStyle(row.querySelector('.pdf-btn')).display };
        row.querySelector('.main-delete-btn').click();
        deleteShipment('123'); // direkter Funktionsaufruf darf nicht lokal löschen
        showDetailView('123');
        return result;
      });
      assert(list.del === 'none' && list.edit !== 'none' && list.pdf !== 'none', `Mitarbeiter: Listen-Löschen ausgeblendet, Bearbeiten und PDF bleiben (${JSON.stringify(list)})`);
      const detail = await p.evaluate(() => {
        const del = document.querySelector('#currentShipmentDetails .detail-actions .main-delete-btn');
        const result = { del: getComputedStyle(del).display, edit: getComputedStyle(del.parentElement.querySelector('.edit-btn')).display };
        del.click(); result.stillOpen = !document.getElementById('detailView').classList.contains('hidden');
        return result;
      });
      assert(detail.del === 'none' && detail.edit !== 'none' && detail.stillOpen, `Mitarbeiter: Detail-Löschen ausgeblendet und künstlicher Klick schließt die Ansicht nicht (${JSON.stringify(detail)})`);
      const roles = await p.evaluate(({ admin, employee }) => {
        const del = document.querySelector('#currentShipmentDetails .detail-actions .main-delete-btn');
        const display = () => getComputedStyle(del).display;
        setAuthSession(admin); const asAdmin = display();
        setAuthSession(null); const loggedOut = display();
        setAuthSession(employee); const asEmployee = display();
        return { asAdmin, loggedOut, asEmployee };
      }, { admin, employee });
      assert(roles.asAdmin !== 'none' && roles.loggedOut === 'none' && roles.asEmployee === 'none', `Rollenwechsel aktualisiert bestehende Knöpfe ohne Neuzeichnen (${JSON.stringify(roles)})`);
      const detailRoleLoss = await p.evaluate(({ admin, employee }) => {
        setAuthSession(admin); window.confirm = () => { setAuthSession(employee); return true; };
        document.querySelector('#currentShipmentDetails .detail-actions .main-delete-btn').click();
        window.confirm = () => { window.__deleteConfirms++; return true; };
        return !document.getElementById('detailView').classList.contains('hidden');
      }, { admin, employee });
      assert(detailRoleLoss && JSON.stringify(await localState()) === JSON.stringify(before), 'Rollenverlust bei der Sendungs-Bestätigung verhindert Löschen und Navigieren');
      await p.evaluate(() => { hideDetailView(); openPage({ id: 'anlieferung' }); });
      const truckRow = await p.evaluate(() => {
        const del = document.querySelector('#pageContent [data-lkw-delete="MAN 1"]');
        const rename = document.querySelector('#pageContent [data-lkw-rename="MAN 1"]');
        const result = { del: getComputedStyle(del).display, rename: getComputedStyle(rename).display };
        del.click(); result.direct = deleteTruckFromPage('MAN 1');
        return result;
      });
      assert(truckRow.del === 'none' && truckRow.rename !== 'none' && truckRow.direct === false, `Mitarbeiter: LKW-Zeilenwerkzeug versteckt, Umbenennen sichtbar, direkter Löschaufruf abgewiesen (${JSON.stringify(truckRow)})`);
      const truckPage = await p.evaluate(() => {
        openPage({ id: 'lkw', truckId: 'MAN 1' });
        document.querySelector('#pageHeaderActions [data-lkw-menu]').click();
        const del = document.querySelector('#pageHeaderActions [data-lkw-delete]');
        const rename = document.querySelector('#pageHeaderActions [data-lkw-rename]');
        const rowDel = document.querySelector('#pageContent tr[data-basenumber="9007000001"] .main-delete-btn');
        const result = { del: getComputedStyle(del).display, rename: getComputedStyle(rename).display,
          sep: getComputedStyle(document.querySelector('#pageHeaderActions .page-action-sep')).display, rowDel: getComputedStyle(rowDel).display };
        del.click(); rowDel.click();
        return result;
      });
      assert(truckPage.del === 'none' && truckPage.sep === 'none' && truckPage.rowDel === 'none' && truckPage.rename !== 'none',
        `Mitarbeiter: LKW-Menü- und Seitenlisten-Löschen ausgeblendet, Umbenennen verfügbar (${JSON.stringify(truckPage)})`);
      const truckRoles = await p.evaluate(({ admin, employee }) => {
        const del = document.querySelector('#pageHeaderActions [data-lkw-delete]'), sep = document.querySelector('#pageHeaderActions .page-action-sep');
        setAuthSession(admin); const asAdmin = [getComputedStyle(del).display, getComputedStyle(sep).display];
        setAuthSession(employee); const asEmployee = [getComputedStyle(del).display, getComputedStyle(sep).display];
        return { asAdmin, asEmployee };
      }, { admin, employee });
      assert(truckRoles.asAdmin.every(s => s !== 'none') && truckRoles.asEmployee.every(s => s === 'none'),
        `Rollenwechsel aktualisiert auch bestehendes LKW-Menü und Trennlinie (${JSON.stringify(truckRoles)})`);
      await wait(300);
      assert((await p.evaluate(() => window.__deleteConfirms)) === 0 && JSON.stringify(await localState()) === JSON.stringify(before) &&
        JSON.stringify(b.gas.sheets.shipments.rows) === serverBefore && !b.actions.some(a => /^deleteShipments?$/.test(a)),
        'Künstliche Klicks und direkte Löschaufrufe: keine Rückfrage, keine lokalen Änderungen, keine Warteschlangen- oder Server-Löschung');
      const roleLoss = await p.evaluate(({ admin, employee }) => {
        setAuthSession(admin);
        window.confirm = () => { setAuthSession(employee); return true; };
        const result = deleteTruckFromPage('MAN 1');
        window.confirm = () => { window.__deleteConfirms++; return true; };
        return result;
      }, { admin, employee });
      assert(roleLoss === false && JSON.stringify(await localState()) === JSON.stringify(before), 'Rollenverlust während der LKW-Bestätigung verhindert die lokale Löschung');

      // Nach den abgewiesenen Klicks muss eine erlaubte Mitarbeiter-Änderung synchronisierbar bleiben.
      const renameOpen = await p.evaluate(() => {
        document.querySelector('#pageHeaderActions [data-lkw-menu]').click();
        document.querySelector('#pageHeaderActions [data-lkw-rename]').click();
        return document.getElementById('lkwRenameModal').classList.contains('visible');
      });
      assert(renameOpen, 'Mitarbeiter kann den LKW weiterhin umbenennen');
      await p.evaluate(() => { document.getElementById('lkwRenameName').value = 'Test-LKW'; document.getElementById('saveLkwRenameButton').click(); });
      await p.waitForFunction(() => !hasPending() && !syncInFlight, { timeout: 8000 });
      const renamed = b.gas.shipmentRows(), pendingAfterRename = await p.evaluate(() => readPending());
      assert(['9007000001', '9007000002'].every(id => renamed[id].shipment.truckName === 'Test-LKW') && b.actions.includes('saveShipments') &&
        pendingAfterRename.order.length === 0 && !b.actions.some(a => /^deleteShipments?$/.test(a)),
        'Mitarbeiter-Umbenennung erreicht den Server nach den Löschversuchen, ohne blockierte Warteschlange');

      // Dieselben Bedienelemente sind nach dem Rollenwechsel zum Administrator wieder nutzbar.
      const adminList = await p.evaluate(admin => {
        setAuthSession(admin); showHome(); renderTable();
        const del = document.querySelector('#shipmentTableBody tr[data-basenumber="123"] .main-delete-btn');
        const display = getComputedStyle(del).display; del.click(); return display;
      }, admin);
      await p.waitForFunction(() => !hasPending() && !syncInFlight, { timeout: 8000 });
      assert(adminList !== 'none' && b.gas.shipmentRows()['123'].flag === true && !(await p.evaluate(() => loadShipments()['123'])),
        'Administrator kann eine einzelne Sendung sichtbar und erfolgreich löschen');
      const adminTruck = await p.evaluate(() => {
        openPage({ id: 'lkw', truckId: 'MAN 1' }); document.querySelector('#pageHeaderActions [data-lkw-menu]').click();
        const del = document.querySelector('#pageHeaderActions [data-lkw-delete]'), display = getComputedStyle(del).display;
        del.click(); return display;
      });
      await p.waitForFunction(() => !hasPending() && !syncInFlight && !lkwStatusPending(), { timeout: 8000 });
      assert(adminTruck !== 'none' && ['9007000001', '9007000002'].every(id => b.gas.shipmentRows()[id].flag === true) &&
        (await p.evaluate(() => readPending().order.length)) === 0, 'Administrator kann den LKW mit seinen Sendungen löschen und synchronisieren');
      assert(p.__errors.length === 0, `Keine JS-Fehler bei Lösch-Rechten (${p.__errors.join(' | ')})`);
      await p.close();

      // Handy-Menü: langer Druck führt für Mitarbeiter direkt zum Umbenennen, für Administratoren bleibt Löschen möglich.
      for (const [session, label] of [[employee, 'Mitarbeiter'], [admin, 'Administrator']]) {
        const mb = makeBackend(sampleData(), {}, { gas: true });
        const mp = await openApp(browser, mb, { session });
        const hiddenOnMobile = await mp.evaluate(() => {
          const rowDel = document.querySelector('#shipmentTableBody tr[data-basenumber="123"] .main-delete-btn');
          openPage({ id: 'lkw', truckId: 'MAN 1' }); document.querySelector('#pageHeaderActions [data-lkw-menu]').click();
          return { row: getComputedStyle(rowDel).display, truck: getComputedStyle(document.querySelector('#pageHeaderActions [data-lkw-delete]')).display };
        });
        assert(label === 'Mitarbeiter' ? hiddenOnMobile.row === 'none' && hiddenOnMobile.truck === 'none' : hiddenOnMobile.row !== 'none' && hiddenOnMobile.truck !== 'none',
          `${label}: Löschknöpfe auf dem Handy rollenabhängig (${JSON.stringify(hiddenOnMobile)})`);
        if (label === 'Administrator') {
          const beforeLong = JSON.stringify(mb.gas.sheets.shipments.rows);
          await mp.evaluate(employee => {
            window.__roleLossConfirms = 0;
            window.confirm = () => { if (++window.__roleLossConfirms === 2) setAuthSession(employee); return true; };
            openSideMenu();
            document.querySelector('#lkw-menu-container .lkw-menu-item[data-truckid="MAN 1"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          }, employee);
          await mp.waitForFunction(() => window.__roleLossConfirms === 2, { timeout: 8000 });
          assert(JSON.stringify(mb.gas.sheets.shipments.rows) === beforeLong && (await mp.evaluate(() => !hasPending())) &&
            !mb.actions.some(a => /^deleteShipments?$/.test(a)), 'Rollenverlust bei der letzten Long-Press-Bestätigung verhindert die Löschung');
          await mp.evaluate(admin => setAuthSession(admin), admin);
        }
        await mp.evaluate(() => {
          window.__longConfirms = 0; window.__longPrompts = 0;
          window.confirm = () => { window.__longConfirms++; return true; };
          window.prompt = () => { window.__longPrompts++; return 'MAN Test'; };
          openSideMenu();
          document.querySelector('#lkw-menu-container .lkw-menu-item[data-truckid="MAN 1"]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        });
        await mp.waitForFunction(label => label === 'Mitarbeiter' ? window.__longPrompts === 1 : window.__longConfirms === 2, { timeout: 8000 }, label);
        await mp.waitForFunction(() => !hasPending() && !syncInFlight && !lkwStatusPending(), { timeout: 8000 });
        const calls = await mp.evaluate(() => ({ confirms: window.__longConfirms, prompts: window.__longPrompts, pending: readPending().order.length }));
        const rows = mb.gas.shipmentRows();
        if (label === 'Mitarbeiter') {
          assert(calls.confirms === 0 && calls.prompts === 1 && calls.pending === 0 &&
            ['9007000001', '9007000002'].every(id => rows[id].shipment.truckId === 'MAN Test') && !mb.actions.some(a => /^deleteShipments?$/.test(a)),
            `Mitarbeiter langer Druck: direkt umbenannt und synchronisiert, keine Lösch-Auswahl (${JSON.stringify(calls)})`);
        } else {
          assert(calls.confirms === 2 && calls.prompts === 0 && calls.pending === 0 &&
            ['9007000001', '9007000002'].every(id => rows[id].flag === true) && rows['123'].shipment,
            `Administrator langer Druck: zwei Rückfragen, LKW gelöscht, Einzelsendung erhalten (${JSON.stringify(calls)})`);
        }
        assert(mp.__errors.length === 0, `${label}: keine JS-Fehler beim langen Druck (${mp.__errors.join(' | ')})`);
        await mp.close();
      }
    }

    // Zurücksetzen mit echtem Code.gs: Backup-Fehler erhält lokale und Server-Daten; Bestätigung danach sichert und löscht.
    be = makeBackend(sampleData(), {}, { gas: true });
    page = await openApp(browser, be);
    const originalCopy = be.gas.sheets.shipments.copyTo;
    const serverBefore = JSON.stringify(be.gas.sheets.shipments.rows);
    const localBefore = await page.evaluate(() => localStorage.getItem(LOCAL_STORAGE_KEY));
    be.gas.sheets.shipments.copyTo = () => { throw new Error('Test-Backupfehler'); };
    await page.evaluate(() => {
      window.__resetPrompt = ''; window.__resetAlert = '';
      window.confirm = text => { window.__resetPrompt = text; return true; };
      window.alert = text => { window.__resetAlert = text; };
      document.getElementById('resetDataButton').click();
    });
    await wait(800);
    const failedReset = await page.evaluate(() => ({ prompt: window.__resetPrompt, alert: window.__resetAlert,
      status: document.getElementById('sheetStatus').textContent, local: localStorage.getItem(LOCAL_STORAGE_KEY) }));
    assert(/alle Sendungsdaten/i.test(failedReset.prompt) && /vorher.*Backup/i.test(failedReset.prompt) && be.actions.includes('clearAllData'),
      'Bestätigter Reset sendet die Anfrage nach ausdrücklicher Backup-Warnung');
    assert(/Backup.*fehlgeschlagen/.test(failedReset.status) && /nicht gelöscht/.test(failedReset.alert) && failedReset.local === localBefore && JSON.stringify(be.gas.sheets.shipments.rows) === serverBefore,
      'Backup-Fehler: Server meldet den Fehler; lokale Daten und Sendungsblatt bleiben erhalten');
    be.gas.sheets.shipments.copyTo = originalCopy;
    const reload = page.waitForNavigation({ waitUntil: 'load', timeout: 10000 });
    await page.evaluate(() => document.getElementById('resetDataButton').click());
    await reload; await wait(1200);
    const backupName = Object.keys(be.gas.sheets).find(n => n.startsWith('shipments_backup_'));
    assert(backupName && JSON.stringify(be.gas.sheets[backupName].rows) === serverBefore && Object.values(be.gas.shipmentRows()).every(row => row.flag === true),
      'Administrator-Reset sichert das vollständige Blatt und markiert danach alle Sendungen als gelöscht');
    assert(Object.keys(await page.evaluate(() => loadShipments())).length === 0, 'Nach erfolgreichem Reset startet die App ohne lokale Sendungen');
    await page.close();

    // 5) Abmelden: Sitzung weg, Server informiert, Anmeldeseite
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be); await wait(300);
    await page.evaluate(() => document.getElementById('menu-toggle-btn').click()); await wait(200);
    await page.evaluate(() => document.getElementById('logoutButton').click()); await wait(800);
    assert(await authOpen(page), 'Abmelden zeigt die Anmeldeseite');
    assert(be.actions.includes('authLogout') && !be.tokens[TEST_TOKEN], 'Server hat die Sitzung beendet (authLogout)');
    assert(await page.evaluate(() => !localStorage.getItem('frachtTracker_session') && !document.getElementById('side-menu').classList.contains('open')), 'Sitzung lokal gelöscht, Menü zu');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();

    // 6) Altes Skript ohne Anmeldung (2.1): App läuft wie bisher, keine Anmeldeseite, Standardname
    be = makeBackend(sampleData(), {}); be.authDisabled = true;
    page = await openApp(browser, be, { loggedOut: true }); await wait(500);
    assert(!(await authOpen(page)), 'Skript ohne Anmeldung: keine Anmeldeseite');
    const rows2 = await page.evaluate(() => document.querySelectorAll('#shipmentTableBody tr[data-basenumber]').length);
    assert(rows2 > 0, `Daten geladen (${rows2})`);
    const menu2 = await page.evaluate(() => ({ user: document.getElementById('authUserLine').classList.contains('hidden'), logout: document.getElementById('logoutItem').classList.contains('hidden') }));
    assert(menu2.user && menu2.logout, 'Ohne Anmeldung keine Nutzerzeile/„Abmelden“ im Menü');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();

    // 7) Automatische Abmeldung nach 30 Minuten ohne Bedienung; Bedienung verlängert die Sitzung
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, { idleMs: 31 * 60 * 1000 }); await wait(500);
    assert(await authOpen(page) && /Automatisch abgemeldet/.test(await authText(page)), 'Start nach >30 Min Untätigkeit (Browser war zu): Anmeldeseite mit Hinweis');
    assert(be.actions.includes('authLogout') && !be.actions.includes('loadChanges'), 'Alte Sitzung serverseitig beendet, keine Daten geladen');
    await page.close();
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, { idleMs: 20 * 60 * 1000 }); await wait(500);
    assert(!(await authOpen(page)), 'Start nach 20 Min Untätigkeit: ohne PIN weiter');
    assert((be.actions.filter(a => a === 'authRefresh').length) === 0, 'Beim Start ohne Bedienung keine Verlängerung');
    // Bedienung → Sitzung verlängert (Start prüft nur, verlängert nicht) und Zeitpunkt beim Verlassen der Seite gesichert
    await page.evaluate(() => document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))); await wait(600);
    assert(be.actions.filter(a => a === 'authRefresh').length === 1, 'Erste Bedienung verlängert die Sitzung beim Server (authRefresh)');
    const sessAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('frachtTracker_session')));
    assert(sessAfter.token !== TEST_TOKEN && be.tokens[sessAfter.token] === 'u-admin', 'Neues Token übernommen');
    await page.evaluate(() => document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))); await wait(400);
    assert(be.actions.filter(a => a === 'authRefresh').length === 1, 'Weitere Bedienung kurz danach: keine erneute Verlängerung (höchstens alle 10 Min)');
    const dataAfter = be.requests.filter(r => r.action === 'loadChanges').pop();
    await wait(3500);
    const lastPoll = be.requests.filter(r => r.action === 'loadChanges').pop();
    assert(lastPoll !== dataAfter && lastPoll.auth === sessAfter.token, 'Abruf läuft mit dem neuen Token weiter');
    // Zeitpunkt der letzten Bedienung: gedrosselt gespeichert, beim Verlassen der Seite sofort
    await page.evaluate(() => localStorage.setItem('frachtTracker_lastActivity', String(Date.now() - 5 * 60 * 1000)));
    await page.evaluate(() => { document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true })); window.dispatchEvent(new Event('pagehide')); }); await wait(200);
    const stamp = await page.evaluate(() => Number(localStorage.getItem('frachtTracker_lastActivity')));
    assert(Date.now() - stamp < 5000, 'Beim Verlassen der Seite wird die letzte Bedienung sofort gesichert');
    // Untätigkeit im laufenden Betrieb: gespeicherten Zeitpunkt zurückdrehen → Prüfung beim Zurückkehren meldet ab
    await page.evaluate(() => localStorage.setItem('frachtTracker_lastActivity', String(Date.now() - 31 * 60 * 1000)));
    await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); });   // Rückkehr in den Vordergrund prüft sofort
    await wait(600);
    assert(await authOpen(page) && /Automatisch abgemeldet/.test(await authText(page)), 'Im Betrieb: 30 Min ohne Bedienung → Anmeldeseite mit Hinweis');
    assert(!be.tokens[sessAfter.token], 'Sitzung serverseitig beendet');
    await typePin(page, '#authPin', '482913'); await wait(1200);
    assert(!(await authOpen(page)), 'Erneute Anmeldung ohne Neuladen');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();

    // 7b) PIN passt zu mehreren aktiven Mitarbeitern → klare Meldung, keine Sitzung
    be = makeBackend(sampleData(), {}); be.users[1].pin = '482913';
    page = await openApp(browser, be, { loggedOut: true }); await wait(400);
    await typePin(page, '#authPin', '482913'); await wait(800);
    assert(await authOpen(page) && /PIN nicht eindeutig/.test(await authText(page)) && /Administrator/.test(await authText(page)), 'Doppelte PIN: Anmeldung schlägt fehl mit klarer Meldung');
    assert(await page.evaluate(() => !localStorage.getItem('frachtTracker_session')) && !be.actions.includes('loadChanges'), 'Doppelte PIN: keine Sitzung, keine Daten');
    assert(page.__errors.length === 0, `Keine JS-Fehler (${page.__errors.join(' | ')})`);
    await page.close();
    // 7c) Noch niemand eingerichtet (Vorabprüfung meldet SETUP_PENDING) → Hinweis statt PIN-Feld
    be = makeBackend(sampleData(), {}); be.users.forEach(u => { u.hasPin = false; u.pin = ''; });
    page = await openApp(browser, be, { loggedOut: true }); await wait(400);
    assert(await authOpen(page) && /Noch kein Mitarbeiter eingerichtet/.test(await authText(page)) && !(await page.$('#authPin')), 'Noch niemand mit PIN: Hinweis auf die Einladung, kein PIN-Feld');
    await page.close();
    // 7d) Server nicht erreichbar beim Öffnen der Anmeldeseite → Meldung + „Erneut versuchen“
    be = makeBackend(sampleData(), {}); be.offline = true;
    page = await openApp(browser, be, { loggedOut: true }); await wait(400);
    assert(/Server nicht erreichbar/.test(await authText(page)) && !!(await page.$('#authRetryBtn')), 'Ohne Netz: Hinweis „Server nicht erreichbar“ mit „Erneut versuchen“');
    be.offline = false; await page.click('#authRetryBtn'); await wait(600);
    assert(!!(await page.$('#authPin')), 'Erneut versuchen mit Netz: PIN-Feld erscheint');
    await page.close();

    // 8) Sichtbarkeit: Anmeldeseite auf dem Handy (Screenshot für die Sichtprüfung)
    be = makeBackend(sampleData(), {});
    page = await openApp(browser, be, { loggedOut: true }); await wait(400);
    try { await page.screenshot({ path: '.arena-shots/auth-login-phone.png' }); } catch (e) { /* .arena-shots fehlt → nur Sichtprüfung entfällt */ }
    await page.close();
  } catch (e) {
    console.error('Testlauf abgebrochen:', e);
    assert(false, 'Testlauf ohne Ausnahme');
  }
  await browser.close();
  finish();
})();
