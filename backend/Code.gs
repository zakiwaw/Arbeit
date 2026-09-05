// ===================================================
// FRACHT TRACKER – Google Apps Script Backend
// Version 2: mehrgeräte-sicher.
//   - Jedes Gerät schickt nur die Sendungen, die es geändert hat (+ den Stand, von dem es ausging).
//   - Der Server führt zusammen (3-Wege-Merge) statt zu überschreiben; Schreibzugriffe laufen unter Sperre.
//   - Geräte holen regelmäßig nur die Änderungen ab ("loadChanges" seit Version X).
//   - Die alten Aktionen (loadAllData/saveAllData/…) funktionieren weiterhin für ältere App-Versionen.
//
// Sheet "shipments":  A = baseNumber | B = JSON | C = Version | D = geändert am | E = gelöscht (TRUE) | F… = JSON-Fortsetzung
//   (Spalten C–E werden automatisch mitgeschrieben; alte Zeilen ohne Version gelten als Version 0.
//    Sehr große Sendungen werden über mehrere Zellen verteilt, weil eine Zelle max. 50.000 Zeichen fasst.)
// Sheet "lkw_status": A1 = JSON (unverändert)
// Sheet "_meta":      A1 = globaler Versionszähler (wird automatisch angelegt, ausgeblendet)
// Script-Cache:       Versionszähler + LKW-Status für den Schnellpfad von loadChanges (siehe CACHE_TTL_S)
// ===================================================

// EINSTELLUNGEN
const SPREADSHEET_ID = "1uQJ2nHXyTP5Qen7jMW2UkRitKkqHto0ANg5NrBD1SOs";
const SHEET_NAME = "shipments";
const LKW_STATUS_SHEET_NAME = "lkw_status";
const META_SHEET_NAME = "_meta";

const COL_BASE = 1, COL_JSON = 2, COL_VERSION = 3, COL_UPDATED = 4, COL_DELETED = 5;
const COL_JSON_EXTRA = 6;        // ab Spalte F: Fortsetzung des JSON, falls eine Zelle nicht reicht
const CELL_LIMIT = 45000;        // Google Sheets erlaubt max. 50.000 Zeichen je Zelle
const LOCK_TIMEOUT_MS = 20000;

// Schnellpfad für den häufigen Abruf "gibt es etwas Neues?" (alle 3 s je Gerät):
// Versionszähler und LKW-Status liegen zusätzlich im Script-Cache. Ist die Version des Geräts aktuell,
// wird geantwortet, OHNE die Tabelle zu öffnen (~10× schneller, schont das Kontingent).
// Der Cache wird nur unter Sperre und erst NACH dem Schreiben gefüllt; die kurze Lebensdauer begrenzt
// den Schaden, falls ein Eintrag je veralten sollte (dann höchstens CACHE_TTL_S Sekunden Verzögerung).
const CACHE_TTL_S = 30;
const CACHE_KEY_VERSION = 'fracht_version';
const CACHE_KEY_LKW = 'fracht_lkw';

// ===================================================
// HAUPTFUNKTION
// ===================================================
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const payload = requestData.payload;
    let result = {};

    switch (requestData.action) {
      // ---- Neu (V2) ----
      case "saveShipments":   result = saveShipmentsMerged(payload); break;
      case "deleteShipment":  result = deleteShipmentRow(payload); break;
      case "loadChanges":     result = loadChangesSince(payload); break;

      // ---- Bestehend (kompatibel) ----
      case "loadAllData":     result = loadAllDataFromSheet(); break;
      case "saveAllData":     result = saveAllDataToSheet(payload); break;
      case "sendPdfEmail":    result = sendPdfEmail(payload); break;
      case "clearAllData":    result = clearAllDataInSheet(); break;
      case "saveLkwStatus":   saveLkwStatusToSheet(payload); result = { status: 'success', message: 'LKW-Status gespeichert.' }; break;
      case "loadLkwStatus":   result = { status: 'success', data: loadLkwStatusFromSheet() }; break;

      default:
        throw new Error("Unbekannte Aktion empfangen: " + requestData.action);
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log("Fehler in doPost: " + err.stack);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: "Verarbeitung serverseitig fehlgeschlagen: " + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===================================================
// HILFSFUNKTIONEN: Sheets, Versionen, Sperre
// ===================================================
// Tabelle nur einmal je Aufruf öffnen (spart je ~100 ms pro weiterem Zugriff)
function ss_() {
  if (!ss_.cache) ss_.cache = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss_.cache;
}

function getShipmentSheet_() {
  return ss_().getSheetByName(SHEET_NAME);
}

function getMetaSheet_() {
  const ss = ss_();
  let sheet = ss.getSheetByName(META_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(META_SHEET_NAME);
    // Startwert = höchste bereits vergebene Zeilen-Version (falls das Blatt je gelöscht wurde), sonst 0
    let start = 0;
    const sh = ss.getSheetByName(SHEET_NAME);
    if (sh && sh.getLastRow() > 1 && sh.getMaxColumns() >= COL_VERSION) {
      sh.getRange(2, COL_VERSION, sh.getLastRow() - 1, 1).getValues().forEach(function (r) { const n = Number(r[0]) || 0; if (n > start) start = n; });
    }
    sheet.getRange('A1').setValue(start);
    sheet.hideSheet();
  }
  return sheet;
}

function getGlobalVersion_() {
  const v = Number(getMetaSheet_().getRange('A1').getValue());
  return isNaN(v) ? 0 : v;
}
// Nur unter Sperre aufrufen (alle Schreibpfade tun das).
function setGlobalVersion_(v) {
  getMetaSheet_().getRange('A1').setValue(v);
  SpreadsheetApp.flush();                 // erst für alle sichtbar machen …
  cacheVersion_(v);                       // … dann den Schnellpfad informieren
  cacheLkw_(loadLkwStatusFromSheet());
}

// ---- Script-Cache (Schnellpfad) ----
function cache_() { return CacheService.getScriptCache(); }
function getCachedState_() {
  const vals = cache_().getAll([CACHE_KEY_VERSION, CACHE_KEY_LKW]) || {};
  const v = vals[CACHE_KEY_VERSION], l = vals[CACHE_KEY_LKW];
  return {
    version: (v === undefined || v === null || v === '') ? null : Number(v),
    lkw: (l === undefined || l === null) ? null : parseJsonSafe_(l)
  };
}
function cacheVersion_(v) {
  try { cache_().put(CACHE_KEY_VERSION, String(v), CACHE_TTL_S); }
  catch (e) { Logger.log('Cache (Version): ' + e.message); try { cache_().remove(CACHE_KEY_VERSION); } catch (e2) {} }
}
function cacheLkw_(obj) {
  try { cache_().put(CACHE_KEY_LKW, JSON.stringify(obj || {}), CACHE_TTL_S); }
  catch (e) { Logger.log('Cache (LKW): ' + e.message); try { cache_().remove(CACHE_KEY_LKW); } catch (e2) {} }
}
// Cache aus der Tabelle nachziehen – unter Sperre, damit nie ein älterer Stand einen neueren überschreibt.
// Ist gerade ein Schreiber aktiv, wird übersprungen: der füllt den Cache selbst.
function refreshCache_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return;
  try {
    cacheVersion_(getGlobalVersion_());
    cacheLkw_(loadLkwStatusFromSheet());
  } finally { lock.releaseLock(); }
}

// Führt fn unter einer Script-Sperre aus, damit zwei Geräte nie gleichzeitig schreiben.
// Wichtig: flush() VOR dem Freigeben, sonst sieht der nächste Aufruf evtl. noch nicht geschriebene Zeilen.
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_TIMEOUT_MS)) {
    throw new Error("Server ist gerade beschäftigt (Sperre). Bitte erneut versuchen.");
  }
  try { return fn(); } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

function ensureGrid_(sheet, row, width) {
  if (sheet.getMaxRows() < row) sheet.insertRowsAfter(sheet.getMaxRows(), row - sheet.getMaxRows());
  if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
}

function dataWidth_(sheet) { return Math.max(sheet.getLastColumn(), COL_DELETED); }

// JSON einer Zeile aus B + F, G, … zusammensetzen
function joinJson_(rowValues) {
  let s = String(rowValues[COL_JSON - 1] == null ? '' : rowValues[COL_JSON - 1]);
  for (let c = COL_JSON_EXTRA - 1; c < rowValues.length; c++) {
    const part = rowValues[c];
    if (part === '' || part === null || part === undefined) break;
    s += String(part);
  }
  return s;
}
function splitJson_(json) {
  const parts = [];
  for (let i = 0; i < json.length; i += CELL_LIMIT) parts.push(json.slice(i, i + CELL_LIMIT));
  return parts.length ? parts : [''];
}
// Baut eine komplette Zeile (volle Breite, damit alte Fortsetzungs-Zellen überschrieben werden)
function buildRow_(base, json, version, now, deleted, width) {
  const parts = splitJson_(json);
  const w = Math.max(width, COL_DELETED + parts.length - 1);
  const values = []; for (let i = 0; i < w; i++) values.push('');
  values[COL_BASE - 1] = base; values[COL_JSON - 1] = parts[0]; values[COL_VERSION - 1] = version;
  values[COL_UPDATED - 1] = now; values[COL_DELETED - 1] = deleted ? true : '';
  for (let i = 1; i < parts.length; i++) values[COL_JSON_EXTRA - 2 + i] = parts[i];
  return values;
}
function writeRows_(sheet, startRow, rows) {
  if (!rows.length) return;
  const width = rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
  rows.forEach(function (r) { while (r.length < width) r.push(''); });
  ensureGrid_(sheet, startRow + rows.length - 1, width);
  sheet.getRange(startRow, 1, rows.length, width).setValues(rows);
}

// Index ohne JSON-Spalte (billig): baseNumber → { row, version, deleted }
function readIndex_(sheet) {
  const lastRow = sheet.getLastRow();
  const map = {};
  if (lastRow < 2) return map;
  ensureGrid_(sheet, lastRow, COL_DELETED);
  const bases = sheet.getRange(2, COL_BASE, lastRow - 1, 1).getValues();
  const meta = sheet.getRange(2, COL_VERSION, lastRow - 1, 3).getValues(); // C, D, E
  for (let i = 0; i < bases.length; i++) {
    const base = String(bases[i][0] == null ? '' : bases[i][0]).trim();
    if (!base) continue;
    const del = meta[i][2];
    map[base] = { row: i + 2, version: Number(meta[i][0]) || 0, deleted: del === true || String(del).toUpperCase() === 'TRUE' };
  }
  return map;
}
function readRowJson_(sheet, row) {
  return joinJson_(sheet.getRange(row, 1, 1, dataWidth_(sheet)).getValues()[0]);
}
// Alle Zeilen inkl. JSON (für Komplett-Ladevorgänge): baseNumber → { row, json, version, deleted }
function readAllRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const map = {};
  if (lastRow < 2) return map;
  ensureGrid_(sheet, lastRow, COL_DELETED);
  const values = sheet.getRange(2, 1, lastRow - 1, dataWidth_(sheet)).getValues();
  for (let i = 0; i < values.length; i++) {
    const base = String(values[i][COL_BASE - 1] == null ? '' : values[i][COL_BASE - 1]).trim();
    if (!base) continue;
    const del = values[i][COL_DELETED - 1];
    map[base] = { row: i + 2, json: joinJson_(values[i]), version: Number(values[i][COL_VERSION - 1]) || 0, deleted: del === true || String(del).toUpperCase() === 'TRUE' };
  }
  return map;
}

function parseJsonSafe_(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch (e) { return null; }
}

// Stabile Kennung je Scan-Eintrag. Ältere Daten haben keine id → deterministisch aus Zeitstempel + Nummer
// (dieselbe Formel benutzt die App, daher stimmen die ids auf allen Geräten überein).
function ensureItemIds_(shipment) {
  if (!shipment || !Array.isArray(shipment.scannedItems)) return shipment;
  const seen = {};
  shipment.scannedItems.forEach(function (it) { if (it && it.id) seen[it.id] = true; });
  shipment.scannedItems.forEach(function (it) {
    if (!it || it.id) return;
    const baseKey = String(it.timestamp || '') + '|' + String(it.rawInput || '');
    let key = baseKey, n = 1;
    while (seen[key]) { n++; key = baseKey + '#' + n; }
    seen[key] = true;
    it.id = key;
  });
  return shipment;
}

function deepEqual_(a, b) { return JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b); }

// ===================================================
// V2: SENDUNGSWEISES SPEICHERN MIT MERGE
// payload: { shipments: { base: shipmentObj }, bases: { base: shipmentObjOderNull }, deviceId }
//   bases = der Serverstand, von dem das Gerät ausging (für den 3-Wege-Merge; darf fehlen).
// Antwort: { status, version, merged: { base: shipmentObj } }  → zusammengeführter Stand, den das Gerät übernimmt
// ===================================================
function saveShipmentsMerged(payload) {
  const incoming = (payload && payload.shipments) || {};
  const bases = (payload && payload.bases) || {};
  const baseNumbers = Object.keys(incoming);
  if (baseNumbers.length === 0) return { status: 'success', version: getGlobalVersion_(), merged: {} };

  return withLock_(function () {
    const sheet = getShipmentSheet_();
    const index = readIndex_(sheet);
    const now = new Date().toISOString();
    const width = dataWidth_(sheet);
    const merged = {};
    const appendRows = [];
    let version = getGlobalVersion_();

    baseNumbers.forEach(function (base) {
      const ours = incoming[base];
      if (!ours || typeof ours !== 'object') return;
      const current = index[base];
      const theirs = current && !current.deleted ? parseJsonSafe_(readRowJson_(sheet, current.row)) : null;
      const common = bases[base] || null;

      const result = theirs ? mergeShipment_(theirs, ours, common) : ensureItemIds_(ours);

      version += 1;
      merged[base] = result;
      const row = buildRow_(base, JSON.stringify(result), version, now, false, width);
      if (current) writeRows_(sheet, current.row, [row]);
      else appendRows.push(row);
    });

    if (appendRows.length > 0) writeRows_(sheet, sheet.getLastRow() + 1, appendRows);
    setGlobalVersion_(version); // zuletzt, damit Leser nie eine Version ohne die zugehörigen Zeilen sehen
    return { status: 'success', version: version, merged: merged };
  });
}

// ---------------------------------------------------
// Zusammenführung einer Sendung.
//   theirs = aktueller Serverstand, ours = eingehender Stand, base = gemeinsamer Ausgangsstand (oder null)
// Mit base: 3-Wege-Merge → nur das, was das Gerät WIRKLICH geändert hat, wird übernommen;
//   alles andere bleibt so, wie es (evtl. von anderen Geräten) auf dem Server steht.
//   Hat sich der Server seit base nicht geändert, gilt exakt der eingehende Stand (wie bisher auf einem Gerät).
// Ohne base: 2-Wege-Merge (Vereinigung aller Scans; Storno gewinnt; echter Scan schlägt Platzhalter; neuerer Kopf gewinnt).
// ---------------------------------------------------
function mergeShipment_(theirs, ours, base) {
  ensureItemIds_(theirs); ensureItemIds_(ours); if (base) ensureItemIds_(base);

  if (base && deepEqual_(theirs, base)) return ours; // keine Fremdänderung → unser Stand 1:1

  const result = {};
  const keys = {};
  Object.keys(theirs).concat(Object.keys(ours)).forEach(function (k) { keys[k] = true; });
  delete keys.scannedItems;

  if (base) {
    Object.keys(keys).forEach(function (k) {
      result[k] = deepEqual_(ours[k], base[k]) ? theirs[k] : ours[k]; // nur eigene Änderungen setzen sich durch
      if (result[k] === undefined) delete result[k];
    });
  } else {
    const oursNewer = (Date.parse(ours.lastModified || 0) || 0) >= (Date.parse(theirs.lastModified || 0) || 0);
    Object.assign(result, oursNewer ? theirs : ours, oursNewer ? ours : theirs);
  }

  result.scannedItems = mergeItems_(theirs.scannedItems || [], ours.scannedItems || [], base ? (base.scannedItems || []) : null);
  const t1 = Date.parse(theirs.lastModified || 0) || 0, t2 = Date.parse(ours.lastModified || 0) || 0;
  result.lastModified = new Date(Math.max(t1, t2) || Date.now()).toISOString();
  return result;
}

function indexById_(items) {
  const m = {}; const order = [];
  items.forEach(function (it) { if (it && it.id && !m[it.id]) { m[it.id] = it; order.push(it.id); } });
  return { map: m, order: order };
}

function mergeItems_(theirsItems, oursItems, baseItems) {
  const T = indexById_(theirsItems), O = indexById_(oursItems), B = baseItems ? indexById_(baseItems) : null;
  const out = [];

  // Reihenfolge: Server-Reihenfolge zuerst, dann unsere neuen Einträge
  T.order.forEach(function (id) {
    const t = T.map[id], o = O.map[id], b = B ? B.map[id] : null;
    if (o) { out.push(mergeItem_(t, o, b)); return; }
    if (B) {
      if (b) return;                 // wir kannten den Eintrag und haben ihn entfernt (z. B. Edit-Modal) → bleibt entfernt
      out.push(t);                   // anderes Gerät hat ihn hinzugefügt → behalten
    } else {
      out.push(t);                   // ohne Ausgangsstand: nie etwas verwerfen
    }
  });
  O.order.forEach(function (id) {
    if (T.map[id]) return;           // schon oben behandelt
    const b = B ? B.map[id] : null;
    if (B && b) {
      // Anderes Gerät hat den Eintrag entfernt; nur behalten, wenn wir ihn selbst verändert haben
      if (!deepEqual_(O.map[id], b)) out.push(O.map[id]);
      return;
    }
    out.push(O.map[id]);             // von uns neu angelegt
  });
  return out;
}

// Ein Eintrag, der auf beiden Seiten existiert
function mergeItem_(t, o, b) {
  let result;
  if (b) {
    result = {};
    const keys = {};
    Object.keys(t).concat(Object.keys(o)).forEach(function (k) { keys[k] = true; });
    Object.keys(keys).forEach(function (k) {
      if (k === 'notes') return;
      result[k] = deepEqual_(o[k], b[k]) ? t[k] : o[k];
      if (result[k] === undefined) delete result[k];
    });
    result.notes = mergeNotes_(t.notes || [], o.notes || [], b.notes || []);
  } else {
    // ohne Ausgangsstand: "weiter fortgeschrittener" Eintrag gewinnt, Notizen vereinigen
    const rank = function (it) { return (it.isCancelled ? 100 : 0) + (it.status !== 'Anstehend' ? 10 : 0); };
    const ts = function (it) { return Date.parse(it.timestamp || 0) || 0; };
    const oWins = rank(o) !== rank(t) ? rank(o) > rank(t) : ts(o) >= ts(t);
    result = Object.assign({}, oWins ? t : o, oWins ? o : t);
    result.notes = mergeNotes_(t.notes || [], o.notes || [], null);
  }
  // Storno geht nie verloren
  if (t.isCancelled || o.isCancelled) {
    result.isCancelled = true;
    result.cancelledTimestamp = result.cancelledTimestamp || t.cancelledTimestamp || o.cancelledTimestamp || null;
  }
  return result;
}

function mergeNotes_(t, o, b) {
  if (b) {
    if (deepEqual_(o, b)) return t.slice();   // wir haben nichts geändert → Serverstand
    if (deepEqual_(t, b)) return o.slice();   // nur wir haben geändert → unser Stand
  }
  const out = o.slice();
  t.forEach(function (n) { if (out.indexOf(n) === -1) out.push(n); });
  return out;
}

// ===================================================
// V2: LÖSCHEN (Tombstone – damit andere Geräte die Sendung nicht wiederbeleben)
// payload: { baseNumber }
// ===================================================
function deleteShipmentRow(payload) {
  const base = payload && String(payload.baseNumber || '').trim();
  if (!base) throw new Error("deleteShipment: baseNumber fehlt.");
  return withLock_(function () {
    const sheet = getShipmentSheet_();
    const index = readIndex_(sheet);
    const version = getGlobalVersion_() + 1;
    const now = new Date().toISOString();
    const row = buildRow_(base, '', version, now, true, dataWidth_(sheet));
    writeRows_(sheet, index[base] ? index[base].row : sheet.getLastRow() + 1, [row]);
    setGlobalVersion_(version);
    return { status: 'success', version: version };
  });
}

// ===================================================
// V2: ÄNDERUNGEN SEIT VERSION X
// payload: { sinceVersion: 123 }   (0/fehlend → kompletter Bestand, full = true)
// Antwort: { status, version, changed: { base: shipmentObj }, deleted: [base, …], full, lkwStatus }
// ===================================================
function loadChangesSince(payload) {
  const since = Number(payload && payload.sinceVersion) || 0;

  // Schnellpfad: Gerät ist auf dem Stand des Caches → antworten, ohne die Tabelle zu öffnen
  const cached = getCachedState_();
  if (since > 0 && cached.version !== null && cached.lkw !== null && since === cached.version) {
    return { status: 'success', version: cached.version, changed: {}, deleted: [], full: false, lkwStatus: cached.lkw, cached: true };
  }

  const version = getGlobalVersion_();          // ZUERST lesen (siehe saveShipmentsMerged)
  const lkwStatus = loadLkwStatusFromSheet();
  const changed = {};
  const deleted = [];
  if (since === 0) {
    const rows = readAllRows_(getShipmentSheet_());
    Object.keys(rows).forEach(function (base) {
      if (rows[base].deleted) return;
      const obj = parseJsonSafe_(rows[base].json);
      if (obj) changed[base] = obj;
    });
  } else if (since < version) {
    const sheet = getShipmentSheet_();
    const index = readIndex_(sheet);
    Object.keys(index).forEach(function (base) {
      const r = index[base];
      if (r.version <= since) return;
      if (r.deleted) { deleted.push(base); return; }
      const obj = parseJsonSafe_(readRowJson_(sheet, r.row));
      if (obj) changed[base] = obj;
    });
  }
  // Cache fehlt oder hinkt hinterher → nachziehen (damit die nächsten Abrufe wieder über den Schnellpfad gehen)
  if (cached.version === null || cached.lkw === null || cached.version < version) refreshCache_();

  return { status: 'success', version: version, changed: changed, deleted: deleted, full: since === 0, lkwStatus: lkwStatus };
}

// ===================================================
// BESTEHENDE FUNKTIONEN (V1 – kompatibel gehalten)
// ===================================================
function loadAllDataFromSheet() {
  const rows = readAllRows_(getShipmentSheet_());
  const shipments = {};
  Object.keys(rows).forEach(function (base) {
    if (rows[base].deleted) return;
    const obj = parseJsonSafe_(rows[base].json);
    if (obj) shipments[base] = obj;
    else Logger.log("Fehler beim Parsen der Daten für " + base);
  });
  return { status: 'success', data: shipments };
}

// V1-Vollspeicherung: läuft jetzt ebenfalls durch den Merge → ein altes Gerät kann nichts mehr überschreiben.
function saveAllDataToSheet(shipmentsData) {
  const r = saveShipmentsMerged({ shipments: shipmentsData || {} });
  return { status: 'success', message: 'Daten zusammengeführt und gespeichert.', version: r.version };
}

// Alle Sendungen als gelöscht markieren (Tombstones), damit alle Geräte den Reset mitbekommen.
function clearAllDataInSheet() {
  return withLock_(function () {
    const sheet = getShipmentSheet_();
    const version = getGlobalVersion_() + 1;
    const now = new Date().toISOString();
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const width = dataWidth_(sheet);
      const bases = sheet.getRange(2, COL_BASE, lastRow - 1, 1).getValues();
      const rows = bases.map(function (r) { return buildRow_(String(r[0] == null ? '' : r[0]), '', version, now, true, width); });
      writeRows_(sheet, 2, rows);
    }
    setGlobalVersion_(version);
    return { status: 'success', message: 'Alle Daten im Backend erfolgreich gelöscht.', version: version };
  });
}

// Optional von Hand im Editor ausführen: entfernt Lösch-Markierungen (Tombstones) physisch aus dem Sheet.
function purgeDeletedRows() {
  withLock_(function () {
    const sheet = getShipmentSheet_();
    const index = readIndex_(sheet);
    Object.keys(index).map(function (b) { return index[b]; }).filter(function (r) { return r.deleted; })
      .sort(function (a, b) { return b.row - a.row; })
      .forEach(function (r) { sheet.deleteRow(r.row); });
  });
}

// ===================================================
// LKW-STATUS-FUNKTIONEN (unverändert)
// ===================================================
function getOrCreateLkwSheet() {
  const ss = ss_();
  let sheet = ss.getSheetByName(LKW_STATUS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LKW_STATUS_SHEET_NAME);
    sheet.getRange('A1').setValue('{}');
    Logger.log("Neues Sheet '" + LKW_STATUS_SHEET_NAME + "' erstellt.");
  }
  return sheet;
}

function saveLkwStatusToSheet(statusObj) {
  withLock_(function () {
    getOrCreateLkwSheet().getRange('A1').setValue(JSON.stringify(statusObj));
    SpreadsheetApp.flush();
    cacheLkw_(statusObj);
  });
}

function loadLkwStatusFromSheet() {
  const sheet = getOrCreateLkwSheet();
  const val = sheet.getRange('A1').getValue();
  try { return JSON.parse(val || '{}'); } catch (e) { return {}; }
}

// ===================================================
// E-MAIL-FUNKTION (unverändert)
// ===================================================
function sendPdfEmail(payload) {
  const recipient = "bisbiss1992@gmail.com";
  const subject = "PDF Anhang: " + payload.pdfInfo.pdfTitlePrefix;
  const body = "Im Anhang finden Sie das angeforderte Sicherheitsprotokoll.";
  Logger.log("PDF-E-Mail-Anfrage für Betreff '" + subject + "' erhalten.");
  return { status: 'success', message: 'E-Mail-Anfrage wurde erfolgreich verarbeitet.' };
}
