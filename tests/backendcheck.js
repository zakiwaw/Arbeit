// Server-Skript (backend/Code.gs) offline durchspielen (Nachbildung der Apps-Script-Dienste in tests/gas-env.js), dann die
// Anmelde-Logik, Sammel-Löschung und den Drive-Import Schritt für Schritt prüfen. Start: node tests/backendcheck.js
const env = require('./gas-env')();
const { api, call, sheets, cache, props, mails, log, drive, triggers, lockState, shipmentRows } = env;
const crypto = require('crypto');
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
// 3b) Sammel-Löschung (2.4): mehrere Löschvermerke in einem Aufruf, unbekannte Nummern toleriert, Abruf liefert sie als gelöscht
r = call('saveShipments', { shipments: { 'D1': { hawb: 'D1', scannedItems: [] }, 'D2': { hawb: 'D2', scannedItems: [] }, 'D3': { hawb: 'D3', scannedItems: [] } }, bases: {} }, adminTok);
ok(r.status === 'success' && Object.keys(r.merged).length === 3, 'Drei Sendungen angelegt');
const vBefore = r.version;
r = call('deleteShipments', { baseNumbers: ['D1', 'D2', 'D2', 'NIE-DA', ''] }, adminTok);
ok(r.status === 'success' && r.deleted === 3 && r.version === vBefore + 3, `deleteShipments: 3 Löschvermerke (D1, D2, NIE-DA – doppelt/leer ignoriert), Version +3 (${JSON.stringify(r)})`);
r = call('loadChanges', { sinceVersion: vBefore }, adminTok);
ok(r.status === 'success' && r.deleted.sort().join(',') === 'D1,D2,NIE-DA' && !r.changed.D1 && !r.changed.D2, `loadChanges seit vorher: D1, D2, NIE-DA gelöscht (${JSON.stringify(r.deleted)})`);
r = call('loadChanges', { sinceVersion: 0 }, adminTok);
ok(r.status === 'success' && !r.changed.D1 && !r.changed.D2 && r.changed.D3, 'Komplettabruf: D1/D2 weg, D3 bleibt');
ok(call('deleteShipments', { baseNumbers: [] }, adminTok).status === 'error', 'deleteShipments ohne Nummern → Fehler');
ok(call('deleteShipment', { baseNumber: 'D3' }, adminTok).status === 'success' && !call('loadChanges', { sinceVersion: 0 }, adminTok).changed.D3, 'Einzel-Löschung wie bisher');
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
env.mailFail = true;
r = call('adminResetPin', { userId: maxId }, adminTok); ok(r.status === 'success' && r.invited.mailSent === false && /einladung=/.test(r.invited.link), 'Reset ohne Mail liefert Link zum Weitergeben');
env.mailFail = false;
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
// 7) Drive-Import (2.5): Textdatei im Ordner → LKW „HYDAC <Datum>“ + Aufträge wie „Standard (Leerzeilen)“, Datei nach
//    „Verarbeitet“, Protokoll im Blatt _import, zweiter Durchlauf importiert nichts doppelt
const HYDAC_TXT = ['USA', '8118740144', '8118749096', '8118746244', '8118749072', '8118749073', '8118750973', '8118702767', '8118727982', '',
  'South Korea', '8118742798', '8118714422', '8118738692', '8118739783', '', 'Australien', '8118746213', '8118720897', '',
  'Kanada', '8118736972', '', 'China', '8118742479', '8118743550', '8118743961', '8118714956', '8118740155', ''].join('\n');
const FILE1 = 'HYDAC_2026-10-22_18-34_Scan_2026-10-22_18-55.txt';
const folder = drive.createFolder('HYDAC TXT');
folder.addFile(FILE1, HYDAC_TXT, new Date(2026, 9, 22, 18, 56));
folder.addFile('Scan.pdf', '%PDF-1.4', new Date(2026, 9, 22, 18, 50), 'application/pdf');   // kein Text → bleibt unangetastet
const vImp0 = call('loadChanges', { sinceVersion: 0 }, adminTok).version;
r = api.setupDriveImport();
ok(triggers.length === 1 && triggers[0].fn === 'runDriveImport' && triggers[0].every === 5, 'setupDriveImport: Zeit-Trigger runDriveImport alle 5 Minuten');
ok(r && r.files === 1 && r.ok === 1 && r.failed === 0, `Erster Durchlauf: 1 Datei verarbeitet (${JSON.stringify(r)})`);
let rows = shipmentRows();
const hydBases = Object.keys(rows).filter(b => rows[b].shipment && rows[b].shipment.truckId === 'HYDAC 22.10.2026');
ok(hydBases.join('|') === 'USA 22.10.|SOUTH KOREA 22.10.|AUSTRALIEN 22.10.|KANADA 22.10.|CHINA 22.10.', `LKW „HYDAC 22.10.2026“ mit 5 Aufträgen „<Land> 22.10.“ (${hydBases.join('|')})`);
const usa = rows['USA 22.10.'] && rows['USA 22.10.'].shipment;
ok(usa && usa.totalPiecesExpected === 8 && usa.scannedItems.length === 8 && usa.scannedItems[0].rawInput === '8118740144' && usa.scannedItems[7].rawInput === '8118727982' && usa.scannedItems[7].position === 8
  && usa.scannedItems.every(i => i.status === 'Anstehend' && i.id && i.isCancelled === false && Array.isArray(i.notes) && i.isCombination === false), 'USA: 8 Packstücke „Anstehend“ in Dateireihenfolge, mit id/position');
ok(usa && usa.hawb === 'USA 22.10.' && usa.isHuListOrder === true && usa.mitarbeiter === 'Automatik' && usa.freightForwarder === 'N/A' && usa.destinationCountry === 'N/A' && usa.plsoNumber === 'N/A'
  && usa.importFile === FILE1 && usa.importedAt && usa.lastModified && usa.originalManNumber === undefined, 'Felder wie „Direkt anlegen (Standard)“ + Herkunftsdatei, keine MAN-Nummer verbraucht');
ok(hydBases.reduce((n, b) => n + rows[b].shipment.scannedItems.length, 0) === 20, '20 Packstücke insgesamt (8+4+2+1+5)');
ok(folder.fileNames().join() === 'Scan.pdf' && folder.sub('Verarbeitet') && folder.sub('Verarbeitet').fileNames().join() === FILE1 && !folder.sub('Fehler'), 'Datei nach „Verarbeitet“ verschoben; PDF bleibt liegen; kein Ordner „Fehler“ nötig');
const impLog = () => (sheets['_import'] ? sheets['_import'].rows.slice(1) : []);
ok(sheets['_import'] && sheets['_import'].hidden && sheets['_import'].rows[0][0] === 'Zeitpunkt' && impLog().length === 1 && impLog()[0][1] === FILE1 && impLog()[0][2] === 'ok' && /HYDAC 22\.10\.2026: 5 Auftrag\/Aufträge, 20 Packstücke – USA 22\.10\. \(8 Pk\.\), SOUTH KOREA 22\.10\. \(4 Pk\.\)/.test(impLog()[0][3]),
  `Protokoll „_import“ (ausgeblendet): ok-Zeile mit Zusammenfassung (${impLog().length ? impLog()[0][3] : '–'})`);
r = call('loadChanges', { sinceVersion: vImp0 }, adminTok);
ok(r.status === 'success' && r.version === vImp0 + 5 && Object.keys(r.changed).sort().join('|') === hydBases.slice().sort().join('|') && r.lkwStatus['HYDAC 22.10.2026'] === undefined, 'Geräte bekommen die 5 Aufträge über loadChanges (Version +5), LKW gilt als aktiv');
ok(lockState.nested === 0, 'Import nimmt die Script-Sperre nie doppelt (kein Hänger in Apps Script)');
r = api.runDriveImport();
ok(r.files === 0 && Object.keys(shipmentRows()).length === Object.keys(rows).length && impLog().length === 1, 'Zweiter Durchlauf: nichts zu tun, nichts doppelt, kein Protokolleintrag');
// 7b) Zweite Datei am selben Tag (Korrektur): CRLF, Dublette, Leerzeichen in der Nummer, Kleinbuchstaben, Störzeile, Block ohne Packstücke
folder.addFile('HYDAC_2026-10-22_19-10_Scan.txt', 'USA\r\n8118740144\r\n8118740144\r\n81187 40199\r\nab12cd\r\nGesamt: 3 Stück\r\n\r\n\r\nMexiko\r\n', new Date(2026, 9, 22, 19, 12));
r = api.runDriveImport();
rows = shipmentRows();
const usa2 = rows['USA 22.10. (2)'] && rows['USA 22.10. (2)'].shipment;
ok(r.ok === 1 && usa2 && usa2.truckId === 'HYDAC 22.10.2026 (2)' && usa2.scannedItems.map(i => i.rawInput).join(',') === '8118740144,8118740199,AB12CD' && usa2.totalPiecesExpected === 3,
  `Selber Tag: LKW „HYDAC 22.10.2026 (2)“, Auftrag „USA 22.10. (2)“; Dublette einmal, Leerzeichen entfernt, Großschreibung (${usa2 ? usa2.scannedItems.map(i => i.rawInput).join(',') : '–'})`);
ok(!rows['MEXIKO 22.10.'] && impLog().length === 2 && /ignoriert: Gesamt: 3 Stück/.test(impLog()[1][3]) && /1 Auftrag/.test(impLog()[1][3]), 'Block ohne Packstücke übersprungen; Störzeile im Protokoll als „ignoriert“');
// 7c) Unbrauchbare Datei → Ordner „Fehler“ + Protokoll, keine Zeile im Sheet
const nRows = Object.keys(rows).length;
folder.addFile('HYDAC_2026-10-22_20-00_leer.txt', 'Keine Daten gefunden\n', new Date(2026, 9, 22, 20, 0));
r = api.runDriveImport();
ok(r.failed === 1 && Object.keys(shipmentRows()).length === nRows && folder.sub('Fehler') && folder.sub('Fehler').fileNames().join() === 'HYDAC_2026-10-22_20-00_leer.txt' && impLog()[2][2] === 'fehler' && /Keine Aufträge erkannt/.test(impLog()[2][3]),
  'Datei ohne Aufträge → „Fehler“-Ordner + Protokollzeile, Sheet unverändert');
// 7d) Dateiname ohne Kunde/Datum → Kunde aus dem Ordnernamen, Datum = Erstelldatum; Umlaute + Doppelpunkt in der Auftragsnummer; gleiche Nummer in zwei Blöcken wird zusammengelegt
folder.addFile('liste.txt', 'Südkorea:\n1001\n\nÖsterreich\n2001\n\nSüdkorea\n1002\n', new Date(2026, 10, 3, 8, 0));
r = api.runDriveImport();
rows = shipmentRows();
ok(r.ok === 1 && rows['SUEDKOREA 03.11.'] && rows['SUEDKOREA 03.11.'].shipment.truckId === 'HYDAC 03.11.2026' && rows['SUEDKOREA 03.11.'].shipment.scannedItems.map(i => i.rawInput).join(',') === '1001,1002' && rows['OESTERREICH 03.11.'],
  'Ohne Präfix/Datum: LKW „HYDAC 03.11.2026“ (Ordnername + Erstelldatum), Umlaute wie in der App ersetzt, Doppelpunkt entfernt, doppelter Block zusammengelegt');
// 7e) Nummer schon vergeben (auch gelöscht/archiviert zählt) → „ (2)“; Archiv-Durchlauf lässt aktive LKW-Aufträge in Ruhe
call('saveShipments', { shipments: { 'USA 23.10.': { hawb: 'USA 23.10.', scannedItems: [] } }, bases: {} }, adminTok);
call('deleteShipment', { baseNumber: 'USA 23.10.' }, adminTok);
folder.addFile('HYDAC_2026-10-23_07-00_Scan.txt', 'USA\n5001\n', new Date(2026, 9, 23, 7, 0));
r = api.runDriveImport();
rows = shipmentRows();
ok(r.ok === 1 && rows['USA 23.10. (2)'] && rows['USA 23.10. (2)'].shipment.truckId === 'HYDAC 23.10.2026' && rows['USA 23.10.'].flag === true, 'Gelöschte Nummer wird nicht wiederverwendet → „USA 23.10. (2)“');
api.runArchiveSweep();
rows = shipmentRows();
ok(hydBases.every(b => rows[b].flag === '' || rows[b].flag === false), 'Archiv-Durchlauf: importierte LKW-Aufträge bleiben aktiv (erst nach Deaktivieren + Frist)');
// 7e2) Vorübergehende Störung (Sperre belegt): Datei bleibt liegen und wird beim nächsten Lauf importiert; erst nach 3 Fehlversuchen „Fehler“
folder.addFile('HYDAC_2026-10-24_07-00_Scan.txt', 'USA\n6001\n', new Date(2026, 9, 24, 7, 0));
lockState.held = 1;
r = api.runDriveImport();
ok(r.retry === 1 && r.failed === 0 && folder.fileNames().includes('HYDAC_2026-10-24_07-00_Scan.txt') && impLog()[impLog().length - 1][2] === 'später', 'Sperre belegt → Datei bleibt liegen, Protokoll „später“');
lockState.held = 0; lockState.nested = 0;
r = api.runDriveImport();
ok(r.ok === 1 && shipmentRows()['USA 24.10.'] && folder.sub('Verarbeitet').fileNames().includes('HYDAC_2026-10-24_07-00_Scan.txt'), 'Nächster Lauf importiert die Datei normal');
folder.addFile('HYDAC_2026-10-25_07-00_Scan.txt', 'USA\n7001\n', new Date(2026, 9, 25, 7, 0));
lockState.held = 1;
api.runDriveImport(); api.runDriveImport(); r = api.runDriveImport();
lockState.held = 0; lockState.nested = 0;
ok(r.failed === 1 && folder.sub('Fehler').fileNames().includes('HYDAC_2026-10-25_07-00_Scan.txt') && !shipmentRows()['USA 25.10.'], 'Nach 3 Fehlversuchen → „Fehler“-Ordner, nichts angelegt');
// 7e3) Ruhefrist: eine gerade geänderte Datei wird erst beim nächsten Lauf angefasst (das andere Skript könnte noch schreiben)
const fresh = folder.addFile('HYDAC_2026-10-26_07-00_Scan.txt', 'USA\n8001\n', new Date(2026, 9, 26, 7, 0));
fresh.updated = new Date();
r = api.runDriveImport();
ok(r.files === 0 && !shipmentRows()['USA 26.10.'] && folder.fileNames().includes('HYDAC_2026-10-26_07-00_Scan.txt'), 'Vor < 2 Minuten geänderte Datei wird noch nicht importiert');
fresh.updated = new Date(Date.now() - 10 * 60000);
r = api.runDriveImport();
ok(r.ok === 1 && shipmentRows()['USA 26.10.'], 'Nach der Ruhefrist importiert');
// 7e4) Leere Datei (noch im Schreiben) → „später“, nicht „Fehler“; mit Inhalt beim nächsten Lauf importiert
const empty = folder.addFile('HYDAC_2026-10-27_07-00_Scan.txt', '', new Date(2026, 9, 27, 7, 0));
r = api.runDriveImport();
ok(r.retry === 1 && folder.fileNames().includes('HYDAC_2026-10-27_07-00_Scan.txt') && /leer/.test(impLog()[impLog().length - 1][3]), 'Leere Datei → „später“, bleibt liegen');
empty.content = 'USA\n9001\n';
r = api.runDriveImport();
ok(r.ok === 1 && shipmentRows()['USA 27.10.'] && Object.keys(props).filter(k => /^import_/.test(k)).length === 0, 'Gefüllt → importiert; Zähler/Merker aufgeräumt');
// 7e5) Verschieben scheitert (fehlende Berechtigung): trotzdem genau EIN Import, Datei bleibt, nächste Läufe legen nichts doppelt an
const stuck = folder.addFile('HYDAC_2026-10-28_07-00_Scan.txt', 'USA\n9101\n9102\n', new Date(2026, 9, 28, 7, 0));
stuck.failMove = true;
r = api.runDriveImport();
ok(r.ok === 1 && shipmentRows()['USA 28.10.'] && folder.fileNames().includes('HYDAC_2026-10-28_07-00_Scan.txt') && /nicht nach „Verarbeitet“ verschoben/.test(impLog()[impLog().length - 1][3]) && props['import_done_' + stuck.id],
  'Verschieben scheitert → Import trotzdem ok, Hinweis im Protokoll, Merker gesetzt');
const nLog = impLog().length, nRows2 = Object.keys(shipmentRows()).length;
r = api.runDriveImport(); r = api.runDriveImport();
ok(r.skipped === 1 && r.ok === 0 && Object.keys(shipmentRows()).length === nRows2 && impLog().length === nLog, 'Folgeläufe: Datei übersprungen – nichts doppelt, kein Protokoll-Spam');
stuck.failMove = false;
r = api.runDriveImport();
ok(r.skipped === 1 && folder.sub('Verarbeitet').fileNames().includes('HYDAC_2026-10-28_07-00_Scan.txt') && !props['import_done_' + stuck.id], 'Sobald das Verschieben klappt: Datei in „Verarbeitet“, Merker gelöscht');
// 7e6) Google-Docs-Dokument statt .txt wird ebenfalls gelesen; Bild/PDF bleiben unangetastet
folder.addFile('HYDAC_2026-10-29_07-00_Scan', 'Kanada\n9201\n', new Date(2026, 9, 29, 7, 0), 'application/vnd.google-apps.document');
folder.addFile('foto.jpg', 'JFIF', new Date(2026, 9, 29, 7, 1), 'image/jpeg');
r = api.runDriveImport();
ok(r.files === 1 && r.ok === 1 && shipmentRows()['KANADA 29.10.'] && folder.fileNames().join() === 'Scan.pdf,foto.jpg', 'Google Doc importiert; PDF und Bild bleiben im Ordner liegen');
// 7f) Ordner fehlt → Protokoll „fehler“, kein Absturz; Trigger entfernen
folder.name = 'anders';
r = api.runDriveImport();
ok(r.failed === 1 && /nicht gefunden/.test(impLog()[impLog().length - 1][3]), 'Ordner nicht gefunden → Protokollzeile statt Absturz');
folder.name = 'HYDAC TXT';
api.removeDriveImport();
ok(triggers.length === 0, 'removeDriveImport entfernt den Zeit-Trigger');
// 7g) Parser direkt
let p = api.parseStandardText_('\uFEFFTitelzeile\n\nUSA\n 123 \n\n\n\nChina\n456\n789\n');
ok(p.orders.length === 2 && p.orders[0].orderId === 'USA' && p.orders[0].hus.join() === '123' && p.orders[1].hus.join() === '456,789' && p.ignored.length === 0, 'parseStandardText_: BOM, Titelzeile ohne Packstücke, mehrere Leerzeilen');
p = api.parseStandardText_('');
ok(p.orders.length === 0, 'parseStandardText_: leer → keine Aufträge');
console.log(fails ? `SOME FAILED (${fails} von ${oks + fails})` : `ALL GOOD (${oks})`); process.exit(fails ? 1 : 0);
