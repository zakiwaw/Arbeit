// Nachbildung der Apps-Script-Dienste, um backend/Code.gs offline (in Node) auszuführen: Sheet, Cache, Lock, Properties,
// Utilities, MailApp, ContentService, Logger – und seit 2.5 DriveApp (Ordner/Dateien/Verschieben) + ScriptApp (Trigger).
// Verwendung: const env = require('./gas-env')(); env.call('loadChanges', { sinceVersion: 0 }, token); env.api.runDriveImport();
const fs = require('fs'), crypto = require('crypto'), path = require('path');

module.exports = function createGasEnv() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'backend', 'Code.gs'), 'utf8');
  const mails = [], log = [];
  class Range { constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    setNumberFormat() { return this; }
    getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push((this.sh.rows[this.r - 1 + i] || [])[this.c - 1 + j] ?? ''); out.push(row); } return out; }
    setValues(v) { for (let i = 0; i < v.length; i++) { const ri = this.r - 1 + i; while (this.sh.rows.length <= ri) this.sh.rows.push([]); for (let j = 0; j < v[i].length; j++) this.sh.rows[ri][this.c - 1 + j] = v[i][j]; } return this; }
    getValue() { return this.getValues()[0][0]; } setValue(v) { return this.setValues([[v]]); } clearContent() { return this; } }
  class Sheet { constructor(n) { this.name = n; this.rows = []; } getName() { return this.name; } getLastRow() { return this.rows.length; } getMaxRows() { return Math.max(this.rows.length, 1000); } getMaxColumns() { return 26; }
    getRange(r, c, nr = 1, nc = 1) { if (typeof r === 'string') { const m = /^([A-Z]+)(\d+)$/.exec(r); return new Range(this, Number(m[2]), m[1].charCodeAt(0) - 64, 1, 1); } return new Range(this, r, c, nr, nc); }
    appendRow(values) { this.rows.push(values.slice()); return this; }
    setFrozenRows() {} hideSheet() { this.hidden = true; } getLastColumn() { return 26; } deleteRows() {} insertRowsAfter() {} }
  const sheets = { shipments: new Sheet('shipments'), lkw_status: new Sheet('lkw_status') };
  sheets.shipments.rows.push(['baseNumber', 'json', 'version', 'updatedAt', 'deleted']); // wie das echte Blatt: Zeile 1 = Überschriften, Daten ab Zeile 2
  const SpreadsheetApp = { openById: () => ({ getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet(n)) }), flush() {} };
  const cache = {}; const CacheService = { getScriptCache: () => ({ get: k => cache[k] ?? null, put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; }, getAll: ks => { const o = {}; ks.forEach(k => { if (cache[k] != null) o[k] = cache[k]; }); return o; }, putAll: o => Object.assign(cache, o), removeAll: ks => ks.forEach(k => delete cache[k]) }) };
  const lockState = { held: 0, nested: 0 }; // nested = Versuch, die Sperre erneut zu nehmen, während sie gehalten wird (in Apps Script ein Hänger)
  const LockService = { getScriptLock: () => ({ tryLock: () => { if (lockState.held) { lockState.nested++; return false; } lockState.held = 1; return true; }, waitLock() {}, releaseLock() { lockState.held = 0; } }) };
  const props = {}; const PropertiesService = { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) };
  const Utilities = { getUuid: () => crypto.randomUUID(), computeHmacSha256Signature: (d, k) => Array.from(crypto.createHmac('sha256', k).update(d, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
    base64EncodeWebSafe: s => Buffer.from(s, 'utf8').toString('base64url'), base64DecodeWebSafe: s => Buffer.from(s, 'base64url'), newBlob: b => ({ getDataAsString: () => Buffer.from(b).toString('utf8') }) };
  const env = { mailFail: false };
  const MailApp = { sendEmail: o => { if (env.mailFail) throw new Error('Mail-Quota'); mails.push(o); } };
  const ContentService = { createTextOutput: t => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } };
  const Logger = { log: m => log.push(String(m)) };

  // ---- DriveApp: Ordner mit Unterordnern und Dateien; moveTo verschiebt zwischen Ordnern ----
  const iter = arr => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
  let driveSeq = 0;
  class DriveFile {
    constructor(name, content, created, mime) { Object.assign(this, { id: 'f' + (++driveSeq), name, content, created: created || new Date(), mime: mime || 'text/plain', parent: null }); }
    getId() { return this.id; } getName() { return this.name; } getMimeType() { return this.mime; } getDateCreated() { return this.created; }
    getBlob() { return { getDataAsString: () => this.content }; }
    moveTo(folder) { if (this.parent) this.parent.files = this.parent.files.filter(f => f !== this); this.parent = folder; folder.files.push(this); return this; }
  }
  class DriveFolder {
    constructor(name) { Object.assign(this, { id: 'd' + (++driveSeq), name, files: [], folders: [] }); }
    getId() { return this.id; } getName() { return this.name; }
    getFiles() { return iter(this.files.slice()); }
    getFoldersByName(n) { return iter(this.folders.filter(f => f.name === n)); }
    createFolder(n) { const f = new DriveFolder(n); this.folders.push(f); return f; }
    addFile(name, content, created, mime) { const f = new DriveFile(name, content, created, mime); f.moveTo(this); return f; }
    fileNames() { return this.files.map(f => f.name).sort(); }
    sub(n) { return this.folders.find(f => f.name === n) || null; }
  }
  const drive = { root: [] };
  drive.createFolder = n => { const f = new DriveFolder(n); drive.root.push(f); return f; };
  const allFolders = () => { const out = []; const walk = f => { out.push(f); f.folders.forEach(walk); }; drive.root.forEach(walk); return out; };
  const DriveApp = { getFoldersByName: n => iter(allFolders().filter(f => f.name === n)), getFolderById: id => { const f = allFolders().find(x => x.id === id); if (!f) throw new Error('not found'); return f; } };

  // ---- ScriptApp: Trigger-Liste ----
  const triggers = [];
  const ScriptApp = {
    getProjectTriggers: () => triggers.slice(),
    deleteTrigger: t => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); },
    newTrigger: fn => { const t = { fn, every: null, getHandlerFunction: () => fn }; return { timeBased: () => ({ everyMinutes: m => { t.every = m; return { create: () => { triggers.push(t); return t; } }; } }) }; }
  };

  const ctx = { SpreadsheetApp, CacheService, LockService, PropertiesService, Utilities, MailApp, ContentService, Logger, DriveApp, ScriptApp };
  const api = new Function(...Object.keys(ctx), src + '\n;return { doPost, runDriveImport, setupDriveImport, removeDriveImport, parseStandardText_, runArchiveSweep };')(...Object.values(ctx));
  const call = (action, payload, auth) => JSON.parse(api.doPost({ postData: { contents: JSON.stringify({ action, payload, auth }) } }).text);
  // Zeilen des shipments-Blatts als { base: { shipment, version, flag } } (JSON ggf. über mehrere Zellen verteilt)
  const shipmentRows = () => { const out = {}; sheets.shipments.rows.slice(1).forEach(r => { const base = String(r[0] || '').trim(); if (!base) return; const json = [r[1]].concat(r.slice(5)).filter(x => x != null && x !== '').join(''); out[base] = { shipment: json ? JSON.parse(json) : null, version: Number(r[2]) || 0, flag: r[4] ?? '' }; }); return out; };
  Object.assign(env, { api, call, sheets, cache, props, mails, log, drive, triggers, lockState, shipmentRows });
  return env;
};
