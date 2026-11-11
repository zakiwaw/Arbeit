// Fracht Tracker – Teil 2/10: 02-sync-anmeldung.js
// Sync (Versionen, Vormerkungen, Archiv-Merkliste, postToServer), Anmeldung mit PIN/Sitzung/30-Minuten-Abmeldung, Seite „Mitarbeiter“, Speichern + Nachschicken, Abruf alle 3 s, Laden vom Server
// Alle Teile sind klassische Skripte mit gemeinsamem Geltungsbereich; index.html lädt sie in dieser Reihenfolge (keine Module, kein Build).

        // --- ENDE: NEUE HILFSFUNKTION ---

/**
 * Speichert Sendungen zuerst lokal und synchronisiert dann mit dem Server.
 * @param {object} shipments Das Objekt mit allen Sendungen.
 */
const SYNC_FAILED_MESSAGE = "Lokal gespeichert – Server nicht erreichbar. Wird beim nächsten Speichern erneut versucht.";
const SYNC_LEGACY_MESSAGE = "Server-Skript ist veraltet (backend/Code.gs neu bereitstellen). Mehrgeräte-Sync inaktiv – Daten werden wie bisher gespeichert.";

// ===================================================================
// MEHRGERÄTE-SYNC (siehe backend/Code.gs)
// - Jedes Gerät schickt nur die Sendungen, die es selbst geändert hat, zusammen mit dem
//   Server-Stand, von dem es ausging. Der Server führt zusammen (3-Wege-Merge) und liefert
//   den gemeinsamen Stand zurück – nichts wird mehr blind überschrieben.
// - Zusätzlich holt das Gerät regelmäßig nur die Änderungen der anderen Geräte ab.
// - Offline: Änderungen werden vorgemerkt und beim nächsten Kontakt nachgeschickt.
// ===================================================================
const SYNC_VERSION_KEY = LOCAL_STORAGE_KEY + '_syncVersion';    // zuletzt gesehene Server-Version
const SYNC_SNAPSHOT_KEY = LOCAL_STORAGE_KEY + '_syncSnapshot';  // Server-Stand je Sendung, von dem die lokalen Daten ausgehen
const SYNC_PENDING_KEY = LOCAL_STORAGE_KEY + '_syncPending';    // noch nicht bestätigte Änderungen/Löschungen
const ARCHIVE_BASES_KEY = LOCAL_STORAGE_KEY + '_archiveBases';  // Nummern der Sendungen, die auf dem Server im Archiv liegen (nur die Nummern)
const SYNC_POLL_INTERVAL_MS = 3000;      // Grundtakt des Abrufs (Server beantwortet "nichts Neues" aus dem Cache, ohne die Tabelle zu öffnen)
const SYNC_POLL_MAX_INTERVAL_MS = 30000; // bei Verbindungsfehlern schrittweise bis hierhin verlangsamen, danach wieder Grundtakt
const SYNC_DEVICE_ID = (function () {
    const k = 'frachtTracker_deviceId';
    let id = localStorage.getItem(k);
    if (!id) { id = 'dev-' + Math.random().toString(36).slice(2, 10); localStorage.setItem(k, id); }
    return id;
})();
let syncInFlight = false;   // gerade ein Senden/Abruf unterwegs?
let syncQueued = false;     // währenddessen erneut gespeichert → danach nochmal senden
let syncPollTimer = null;
let syncPollDelay = SYNC_POLL_INTERVAL_MS;
let syncPollFailures = 0;
let serverIsLegacy = false; // Backend noch V1 (kennt loadChanges/saveShipments nicht) → altes Verhalten
let lkwStatusSaveInFlight = 0;
const LKW_PENDING_KEY = LOCAL_STORAGE_KEY + '_lkwStatusPending'; // '1' = lokale LKW-Statusänderung noch nicht vom Server bestätigt (überlebt Neuladen)
let lkwStatusRev = 0;              // zählt lokale Statusänderungen (Senden bestätigt nur den Stand, der auch geschickt wurde)
let lkwStatusLastAckAt = 0;        // Zeitpunkt der letzten Server-Bestätigung; Abrufe, die davor gestartet wurden, können einen älteren Stand tragen
let lkwStatusChain = Promise.resolve();
let lkwStatusQueued = false;
let syncLastErrorAt = 0;           // Zeitpunkt des letzten fehlgeschlagenen Sendens (runBlocking wartet dann nicht bis zum Zeitlimit)
let serverHasBatchDelete = true;   // Server-Skript ab 2.4 kennt deleteShipments (alle Löschvermerke in EINEM Aufruf); sonst einzeln wie bisher
let lkwStatusFetched = false;      // LKW-Status kam beim Start mit loadChanges (sonst holt initializeApp ihn einzeln)
function lkwStatusPending() { return localStorage.getItem(LKW_PENDING_KEY) === '1'; }

function getSyncVersion() { return Number(localStorage.getItem(SYNC_VERSION_KEY)) || 0; }
function setSyncVersion(v) { if (typeof v === 'number' && !isNaN(v)) localStorage.setItem(SYNC_VERSION_KEY, String(v)); }
function readSnapshot() { try { return JSON.parse(localStorage.getItem(SYNC_SNAPSHOT_KEY) || '{}'); } catch (e) { return {}; } }
function writeSnapshot(snap) { localStorage.setItem(SYNC_SNAPSHOT_KEY, JSON.stringify(snap)); }
function writeSnapshotFrom(shipments) {
    const snap = {};
    Object.keys(shipments || {}).forEach(b => { snap[b] = JSON.stringify(shipments[b]); });
    writeSnapshot(snap);
}
// Vorgemerkte Änderungen = Offline-Warteschlange (9.3): changed/deleted je Sendung (keine Doppelten) + order = Reihenfolge,
// in der die Sendungen zuerst geändert wurden. Gesendet wird in dieser Reihenfolge; was nicht bestätigt wurde, bleibt stehen.
function readPending() {
    try {
        const p = JSON.parse(localStorage.getItem(SYNC_PENDING_KEY) || '{}');
        return normalizePending({ changed: p.changed || {}, deleted: p.deleted || {}, order: Array.isArray(p.order) ? p.order : [] });
    } catch (e) { return { changed: {}, deleted: {}, order: [] }; }
}
function normalizePending(p) {
    const seen = {};
    const order = [];
    p.order.concat(Object.keys(p.deleted), Object.keys(p.changed)).forEach(b => {
        if (seen[b] || !(p.changed[b] || p.deleted[b])) return;   // erledigte Einträge fallen aus der Reihenfolge
        seen[b] = true; order.push(b);
    });
    p.order = order;
    return p;
}
function writePending(p) { localStorage.setItem(SYNC_PENDING_KEY, JSON.stringify(normalizePending(p))); }
// Sendungs-Version, auf der der lokale Stand beruht (Ausgangsstand vom Server); 0 = auf diesem Gerät neu angelegt
function baseVersionOf(snapJson) {
    if (!snapJson) return 0;
    try { const v = Math.floor(Number(JSON.parse(snapJson).version)); return (isFinite(v) && v > 0) ? v : 1; } catch (e) { return 1; }
}
function currentUserName() { const u = currentUser(); return u && u.name ? String(u.name) : ''; }
function hasPending(p) { p = p || readPending(); return Object.keys(p.changed).length > 0 || Object.keys(p.deleted).length > 0; }
function clearSyncState() { [SYNC_VERSION_KEY, SYNC_SNAPSHOT_KEY, SYNC_PENDING_KEY, ARCHIVE_BASES_KEY].forEach(k => localStorage.removeItem(k)); archiveKnownBases = new Set(); }

// ===================================================================
// ARCHIV (siehe backend/Code.gs, Abschnitt ARCHIV)
// Fertige, alte Sendungen verschiebt der Server ins Archiv: sie bleiben vollständig im Google Sheet, werden aber
// nicht mehr an die Geräte ausgeliefert – das Gerät hält nur den laufenden Bestand. Lokal merken wir uns nur die
// NUMMERN der archivierten Sendungen (klein), damit ein Scan einer archivierten Nummer sofort erkannt wird.
// Regel (Server): Einzelsendung vollständig erfasst + 7 Tage unverändert; LKW-Sendungen (VVL/MAN) erst, wenn der
// LKW im Menü deaktiviert wurde (+ 7 Tage). Jede Änderung an einer archivierten Sendung (Scan, Storno, Notiz,
// „Wiederherstellen“) macht sie auf allen Geräten wieder aktiv. Gelöscht wird nie automatisch.
// ===================================================================
let archiveKnownBases = (() => { try { return new Set(JSON.parse(localStorage.getItem(ARCHIVE_BASES_KEY) || '[]')); } catch (e) { return new Set(); } })();
let archiveUnsupported = false;     // Server-Skript kennt 'searchArchive' nicht (alte Bereitstellung)
function saveArchiveKnownBases() { try { localStorage.setItem(ARCHIVE_BASES_KEY, JSON.stringify([...archiveKnownBases])); } catch (e) { console.warn('Archiv-Nummern konnten nicht gespeichert werden:', e); } }
function setArchiveKnownBases(list) { archiveKnownBases = new Set(Array.isArray(list) ? list : []); saveArchiveKnownBases(); }
function forgetArchivedBase(base) { if (archiveKnownBases.delete(base)) saveArchiveKnownBases(); }
function isArchivedBase(base) { return !!base && archiveKnownBases.has(base); }
// Für Importe: Nummer ist vergeben, wenn sie lokal existiert ODER im Archiv liegt. Sonst würde ein neuer Auftrag
// unter derselben Nummer angelegt und auf dem Server mit dem archivierten (alte HUs!) zusammengeführt.
function isBaseTaken(shipments, base) { return !!(shipments && shipments[base]) || isArchivedBase(base); }
// Nächste freie Variante „NUMMER (2)“, „NUMMER (3)“ … (wie bei doppelten Kundennummern verschiedener VVLs)
function nextFreeBaseName(shipments, base) {
    let n = 2, name = `${base} (${n})`;
    while (isBaseTaken(shipments, name)) { n++; name = `${base} (${n})`; }
    return name;
}
function archiveKnownPrefixCount(filter) {
    const head = String(filter || '').split('+')[0].toUpperCase();
    if (!head) return 0;
    let n = 0; archiveKnownBases.forEach(b => { if (String(b).toUpperCase().startsWith(head)) n++; }); return n;
}
// Archivierte Sendung wieder in den laufenden Bestand übernehmen. Sie wird als geändert vorgemerkt: der Server schreibt
// die Zeile ohne Archiv-Markierung zurück (= aktiv), alle anderen Geräte erhalten sie beim nächsten Abruf.
// Gehört die Sendung zu einem deaktivierten LKW, wird der LKW wieder aktiviert (sonst bliebe sie unsichtbar).
// Rückgabe: Kennung des reaktivierten LKW oder null.
function restoreArchivedShipmentLocally(base, shipmentObj) {
    ensureItemIds(shipmentObj);
    const shipments = loadShipments();
    shipments[base] = shipmentObj;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shipments));
    const snap = readSnapshot(); snap[base] = JSON.stringify(shipmentObj); writeSnapshot(snap); // Ausgangsstand = Serverstand (3-Wege-Merge)
    const pending = readPending(); pending.changed[base] = true; writePending(pending);
    forgetArchivedBase(base);
    let lkwReactivated = null;
    if (shipmentObj.truckId && !isLkwActive(shipmentObj.truckId)) {
        const status = loadLkwStatus(); status[shipmentObj.truckId] = true; saveLkwStatus(status);
        lkwReactivated = shipmentObj.truckId;
    }
    flushPendingChanges();
    return lkwReactivated;
}
// Holt genau diese Nummern aus dem Archiv (nur die, die dort liegen). Antwort: { base: shipmentObj }
async function fetchArchivedShipments(bases) {
    const r = await postToServer('searchArchive', { bases });
    return r.results || {};
}

// Stabile Kennung je Scan-Eintrag (gleiche Formel wie im Backend), damit Geräte denselben Eintrag erkennen –
// auch wenn sich Zeitstempel/Status ändern (z. B. "Anstehend"-Platzhalter, der gescannt wird).
function ensureItemIds(shipment) {
    if (!shipment || !Array.isArray(shipment.scannedItems)) return shipment;
    const seen = {};
    shipment.scannedItems.forEach(it => { if (it && it.id) seen[it.id] = true; });
    shipment.scannedItems.forEach(it => {
        if (!it || it.id) return;
        const baseKey = String(it.timestamp || '') + '|' + String(it.rawInput || '');
        let key = baseKey, n = 1;
        while (seen[key]) { n++; key = baseKey + '#' + n; }
        seen[key] = true;
        it.id = key;
    });
    return shipment;
}

function isUnknownActionError(err) { return /Unbekannte Aktion/i.test((err && err.message) || ''); }
function isAuthError(err) { return !!(err && err.code === 'AUTH_REQUIRED'); }

// Einzige Stelle, die mit dem Server-Skript spricht: schickt das Sitzungs-Token mit (Feld "auth"); antwortet der Server
// mit code AUTH_REQUIRED (kein/abgelaufenes Token, Zugang gesperrt), wird die Sitzung verworfen und die Anmeldeseite gezeigt.
async function postToServer(action, payload, authOverride) {
    const response = await fetch(WEB_APP_URL, {
        method: 'POST', mode: 'cors', cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload, auth: authOverride !== undefined ? authOverride : authToken() })
    });
    if (!response.ok) throw new Error(`Server-Fehler: ${response.status}`);
    const result = await response.json();
    if (result.status !== 'success') {
        const err = new Error(result.message || 'Unbekannter Serverfehler');
        if (result.code) err.code = result.code;
        if (isAuthError(err)) onAuthRequired(err.message);
        throw err;
    }
    return result;
}

// Kundennummer → Spediteur für den VVL-Import (Blatt „kundennr_carrier“ im Sheet, Code.gs 2.10 – bis 9.6 fest im Code).
// Läuft im Hintergrund nach dem Start bzw. nach einer Anmeldung; ohne Netz oder mit älterem Server-Skript bleibt der zuletzt
// gespeicherte Stand (localStorage, siehe CARRIER_MAP_KEY in 01-start.js).
let carrierMapLoaded = false;
async function loadCarrierMap() {
    try {
        const r = await postToServer('loadCarrierMap');
        const m = r && r.map;
        if (m && typeof m === 'object' && !Array.isArray(m)) {
            kundennrCarrierMap = m; carrierMapLoaded = true;
            try { localStorage.setItem(CARRIER_MAP_KEY, JSON.stringify(m)); } catch (e) { /* Speicher voll – Zuordnung gilt trotzdem für diese Sitzung */ }
        }
    } catch (e) {
        if (isUnknownActionError(e)) carrierMapLoaded = true;   // Server-Skript vor 2.10: nicht bei jeder Anmeldung erneut fragen
        console.warn('Spediteur-Zuordnung konnte nicht geladen werden – nutze den zuletzt gespeicherten Stand.', e);
    }
}

// ===================================================================
// ANMELDUNG (PIN) – siehe backend/Code.gs, Abschnitt ANMELDUNG
// Ablauf: Server-Skript verlangt für jede Daten-Aktion ein Sitzungs-Token. Ohne gültige Sitzung zeigt die App vor dem
// Laden die Anmeldeseite (nur die 6-stellige PIN, 9.7: keine Namensauswahl – der Server erkennt den Mitarbeiter an der PIN).
// Einladungslink ?einladung=<Token> → Mitarbeiter legt seine PIN
// selbst fest. Die PIN wird nie gespeichert – nur das Token (12 h) und Name/Rolle des Angemeldeten (localStorage).
// Administrator: Seite „Mitarbeiter“ im Menü (einladen, sperren, PIN zurücksetzen).
// ===================================================================
const AUTH_SESSION_KEY = 'frachtTracker_session';
const authViewEl = document.getElementById('authView');
const authContentEl = document.getElementById('authContent');
let authSession = (() => { try { return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null'); } catch (e) { return null; } })();
let authResolve = null;          // wartender initializeApp (ensureLoggedIn) – wird nach erfolgreicher Anmeldung aufgelöst
let authDisabled = false;        // Server-Skript ohne Anmeldung (AUTH_ENABLED = false oder altes Skript)
let authBusy = false;

// ---- Automatische Abmeldung bei Untätigkeit ----
// Jede Bedienung (Tippen, Scannen, Klicken, Scrollen) zählt als „noch da“. 30 Minuten ohne Bedienung → Abmeldung, danach ist
// die PIN nötig. Solange gearbeitet wird, verlängert die App die Sitzung beim Server (authRefresh, alle 10 Minuten), damit sie
// nie mitten in der Arbeit abläuft. Der Zeitpunkt der letzten Bedienung steht im localStorage: Browser zu und wieder auf →
// innerhalb der 30 Minuten geht es ohne PIN weiter, danach wird die PIN verlangt.
const AUTH_IDLE_LIMIT_MS = 30 * 60 * 1000;
const AUTH_REFRESH_EVERY_MS = 10 * 60 * 1000;
const AUTH_ACTIVITY_KEY = 'frachtTracker_lastActivity';
let authLastActivity = Number(localStorage.getItem(AUTH_ACTIVITY_KEY)) || 0;
let authLastActivityStored = authLastActivity;
let authLastRefresh = 0;
let authIdleTimer = null;
let authRefreshBusy = false;

function storeActivity(ts) { authLastActivityStored = ts; try { localStorage.setItem(AUTH_ACTIVITY_KEY, String(ts)); } catch (e) { /* voll/gesperrt */ } }
function noteActivity() {
    const now = Date.now();
    authLastActivity = now;
    if (now - authLastActivityStored > 15000) storeActivity(now);   // höchstens alle 15 s schreiben (Scroll/Tipp-Ereignisse kommen im Sekundentakt)
    if (authToken() && !isAuthViewOpen() && now - authLastRefresh > AUTH_REFRESH_EVERY_MS) refreshSession();
}
// Maßgeblich ist der gespeicherte Zeitpunkt (max. 15 s hinter der letzten Bedienung; beim Verlassen der Seite sofort gesichert) –
// so zählt auch die Bedienung in einem zweiten Tab desselben Geräts, und nach Schließen/Öffnen des Browsers stimmt die Rechnung.
function idleFor() { const last = Number(localStorage.getItem(AUTH_ACTIVITY_KEY)) || authLastActivity; return last ? Date.now() - last : 0; }
// Prüft alle 30 s (und beim Zurückkehren in den Vordergrund): zu lange nichts getan → abmelden
function checkIdle() {
    if (!authToken() || isAuthViewOpen()) return;
    if (idleFor() >= AUTH_IDLE_LIMIT_MS) logout(true);
}
function startIdleWatch() {
    ['pointerdown', 'keydown', 'touchstart', 'scroll', 'input'].forEach(ev => document.addEventListener(ev, noteActivity, { capture: true, passive: true }));
    // Seite verlassen / in den Hintergrund: letzte Bedienung sofort sichern (die 15-s-Drossel soll hier nichts verschlucken)
    const flush = () => { if (authLastActivity > authLastActivityStored) storeActivity(authLastActivity); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { flush(); return; }
        checkIdle();                                                    // zurück im Vordergrund: zu lange weg → abmelden …
        if (authToken() && !isAuthViewOpen()) noteActivity();          // … sonst zählt die Rückkehr als Bedienung
    });
    if (authIdleTimer) clearInterval(authIdleTimer);
    authIdleTimer = setInterval(checkIdle, 30000);
}
// Sitzung beim Server verlängern (neues Token, gleiche Sitzung). Fehler sind unkritisch – beim nächsten Mal erneut.
async function refreshSession() {
    if (authRefreshBusy || !authToken()) return;
    authRefreshBusy = true; authLastRefresh = Date.now();
    try {
        const r = await postToServer('authRefresh');
        if (r && r.token) setAuthSession({ token: r.token, user: r.user || currentUser(), expires: r.expires });
    } catch (e) {
        if (isUnknownActionError(e)) authLastRefresh = Infinity;                                   // Skript ohne authRefresh (2.2): Token läuft dort 12 h
        else if (!isAuthError(e)) authLastRefresh = Date.now() - AUTH_REFRESH_EVERY_MS + 60000;  // nicht erreichbar → in 1 Min erneut
    } finally { authRefreshBusy = false; }
}

function authToken() { return authSession && authSession.token ? authSession.token : ''; }
function currentUser() { return authSession && authSession.user ? authSession.user : null; }
function isAdmin() { const u = currentUser(); return !!(u && u.role === 'admin'); }
function isAuthViewOpen() { return !!(authViewEl && !authViewEl.classList.contains('hidden')); }
function setAuthSession(sess) {
    authSession = sess || null;
    if (authSession) localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authSession)); else localStorage.removeItem(AUTH_SESSION_KEY);
    MITARBEITER_NAME = (authSession && authSession.user && authSession.user.name) || MITARBEITER_NAME_DEFAULT;
    updateAuthMenu();
}
// Menüeinträge: Name des Angemeldeten, „Mitarbeiter“ nur für Administratoren, „Abmelden“ nur mit Sitzung
function updateAuthMenu() {
    const u = currentUser();
    const line = document.getElementById('authUserLine');
    if (line) { line.textContent = u ? `Angemeldet: ${u.name}${u.role === 'admin' ? ' (Administrator)' : ''}` : ''; line.classList.toggle('hidden', !u); }
    const mi = document.getElementById('manageUsersItem'); if (mi) mi.classList.toggle('hidden', !isAdmin());
    const li = document.getElementById('logoutItem'); if (li) li.classList.toggle('hidden', !u);
}
// Wird aus postToServer gerufen, sobald der Server ein Token ablehnt: Sitzung verwerfen, Anmeldeseite zeigen.
function onAuthRequired(message) {
    if (authSession) setAuthSession(null);
    if (!isAuthViewOpen()) showLoginPage(message || 'Bitte erneut anmelden.');
}
// Vor dem ersten Laden: Sitzung prüfen bzw. Anmeldung abwarten. Löst auf, sobald eine gültige Sitzung besteht
// (oder das Server-Skript keine Anmeldung verlangt).
function ensureLoggedIn() {
    return new Promise(async resolve => {
        authResolve = resolve;
        startIdleWatch();
        const invite = new URLSearchParams(location.search).get('einladung');
        if (invite) { showInvitePage(invite); return; }
        if (authSession && authSession.token && idleFor() >= AUTH_IDLE_LIMIT_MS) {
            // Browser/Tab war länger als 30 Minuten zu (oder offen, aber unbenutzt) → wie automatische Abmeldung
            const tok = authToken(); setAuthSession(null);
            postToServer('authLogout', null, tok).catch(() => { /* Sitzung läuft serverseitig ohnehin aus */ });
            showLoginPage('Automatisch abgemeldet – länger als 30 Minuten keine Bedienung.', 'info');
            return;
        }
        if (authSession && authSession.token) {
            try {
                const r = await postToServer('authCheck');
                if (r.authDisabled) { authDisabled = true; setAuthSession(null); }
                else if (r.user) setAuthSession({ token: authSession.token, user: r.user, expires: authSession.expires });
                finishAuth();
                authLastRefresh = 0;                      // Prüfung verlängert nicht → die erste Bedienung holt die Verlängerung nach
                return;
            } catch (e) {
                if (isAuthError(e)) return;               // postToServer hat die Anmeldeseite bereits geöffnet
                if (isUnknownActionError(e)) { authDisabled = true; setAuthSession(null); finishAuth(); return; }
                finishAuth(); return;                      // Server nicht erreichbar → offline mit lokalem Stand weiterarbeiten, Token behalten
            }
        }
        showLoginPage();
    });
}
function finishAuth() {
    hideAuthView();
    updateAuthMenu();
    authLastActivity = Date.now(); storeActivity(authLastActivity);   // Anmeldung/Start zählt als Bedienung
    authLastRefresh = Date.now();
    const r = authResolve; authResolve = null;
    if (r) { showLoader(); r(); }                          // App-Start geht weiter (loadDataFromServer …)
    else {                                                 // Anmeldung im laufenden Betrieb: sofort abgleichen (nachholen, was wartete)
        syncPollFailures = 0; pollNow();
        if (!carrierMapLoaded) loadCarrierMap();           // Start war ohne Netz/Sitzung → Spediteur-Zuordnung jetzt holen
    }
}
function showAuthView(html) {
    if (!authViewEl) return;
    authContentEl.innerHTML = html;
    authViewEl.classList.remove('hidden');
    document.body.classList.add('auth-open');
    hideLoader();
}
function hideAuthView() {
    if (!authViewEl) return;
    authViewEl.classList.add('hidden');
    authContentEl.innerHTML = '';
    document.body.classList.remove('auth-open');
}
function authMsg(text, kind) {
    const el = document.getElementById('authMessage');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'auth-message' + (text ? ` is-${kind || 'error'}` : '');
}
function pinField(id, label, autofocus) {
    return `<div class="form-group"><label for="${id}">${label}</label>`
        + `<input type="password" id="${id}" class="auth-pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="••••••" ${autofocus ? 'autofocus' : ''}></div>`;
}
function pinValue(id) { return (document.getElementById(id)?.value || '').replace(/\D/g, ''); }

// ---- Anmeldeseite ----
// Nur ein PIN-Feld (9.7). Vorab fragt die Seite authLogin ohne PIN: Das Server-Skript meldet damit „Anmeldung abgeschaltet“
// (authDisabled), „noch niemand eingerichtet“ (SETUP_PENDING – legt beim allerersten Aufruf den Administrator an) oder
// „bereit“ (PIN_REQUIRED). Ein altes Skript ohne Anmeldung antwortet „Unbekannte Aktion“ → App läuft ohne Anmeldung.
async function showLoginPage(message, kind) {
    if (isAuthViewOpen() && document.getElementById('authLoginForm')) { authMsg(message, kind || 'error'); return; }
    showAuthView('<h2 id="authTitle">Anmelden</h2><p class="auth-hint">PIN eingeben.</p><div id="authMessage" class="auth-message"></div><p class="page-note" id="authLoading">Verbindung wird geprüft …</p>');
    if (message) authMsg(message, kind || 'error');
    try {
        const r = await postToServer('authLogin', { deviceId: SYNC_DEVICE_ID });
        if (r.authDisabled) { authDisabled = true; setAuthSession(null); finishAuth(); return; }
    } catch (e) {
        if (isUnknownActionError(e)) { authDisabled = true; setAuthSession(null); finishAuth(); return; } // altes Skript ohne Anmeldung
        if (e.code === 'SETUP_PENDING') {
            if (document.getElementById('authLoading')) renderLoginError(e.message || 'Noch kein Mitarbeiter eingerichtet.', true);
            return;
        }
        if (!e.code) { if (document.getElementById('authLoading')) renderLoginError(`Server nicht erreichbar (${escapeHtml(e.message)}).`); return; }
        // PIN_REQUIRED (bereit) – oder eine andere Meldung des Skripts: PIN-Feld zeigen, die Anmeldung meldet Genaueres
    }
    if (!document.getElementById('authLoading')) return; // inzwischen anders weitergegangen
    authContentEl.innerHTML = `<h2 id="authTitle">Anmelden</h2><p class="auth-hint">PIN eingeben.</p>
        <form id="authLoginForm" novalidate>
            ${pinField('authPin', 'PIN (6 Ziffern)', true)}
            <div id="authMessage" class="auth-message"></div>
            <button type="submit" class="main-action-button" id="authLoginBtn">Anmelden</button>
        </form>`;
    if (message) authMsg(message, kind || 'error');
    const pinEl = document.getElementById('authPin');
    pinEl.addEventListener('input', () => { pinEl.value = pinEl.value.replace(/\D/g, '').slice(0, 6); if (pinEl.value.length === 6) document.getElementById('authLoginForm').requestSubmit(); });
    document.getElementById('authLoginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (authBusy) return;
        const pin = pinValue('authPin');
        if (pin.length !== 6) { authMsg('Bitte die 6-stellige PIN eingeben.'); pinEl.focus(); return; }
        authBusy = true; document.getElementById('authLoginBtn').disabled = true; authMsg('');
        try {
            const r = await postToServer('authLogin', { pin, deviceId: SYNC_DEVICE_ID });
            if (r.authDisabled) { authDisabled = true; setAuthSession(null); finishAuth(); return; }
            setAuthSession({ token: r.token, user: r.user, expires: r.expires });
            finishAuth();
        } catch (err) {
            pinEl.value = '';
            authMsg(err.message || 'Anmeldung fehlgeschlagen.');
            pinEl.focus();
        } finally { authBusy = false; const b = document.getElementById('authLoginBtn'); if (b) b.disabled = false; }
    });
    setTimeout(() => pinEl.focus(), 50);
}
function renderLoginError(text, info) {
    authContentEl.innerHTML = `<h2 id="authTitle">Anmelden</h2><div id="authMessage" class="auth-message is-${info ? 'info' : 'error'}">${escapeHtml(text)}</div>`
        + '<button type="button" class="main-action-button" id="authRetryBtn">Erneut versuchen</button>';
    document.getElementById('authRetryBtn').addEventListener('click', () => showLoginPage());
}

// ---- Einladungsseite (?einladung=<Token>): PIN zweimal eingeben ----
async function showInvitePage(invite) {
    showAuthView('<h2 id="authTitle">Einladung</h2><p class="page-note">Einladung wird geprüft …</p>');
    let info;
    try { info = await postToServer('authInviteInfo', { invite }); }
    catch (e) { renderInviteError(`Server nicht erreichbar (${escapeHtml(e.message)}).`); return; }
    if (!info.valid) { renderInviteError('Dieser Einladungslink ist ungültig oder abgelaufen (48 Stunden, einmalig). Bitte beim Administrator eine neue Einladung anfordern.'); return; }
    authContentEl.innerHTML = `<h2 id="authTitle">Willkommen, ${escapeHtml(info.name)}</h2>
        <p class="auth-hint">${info.isReset ? 'Lege deine neue PIN fest.' : 'Lege deine persönliche PIN fest – damit meldest du dich ab jetzt an.'} 6 Ziffern, bitte keine einfachen Folgen wie 123456.</p>
        <form id="authInviteForm" novalidate>
            ${pinField('authPin1', 'Neue PIN', true)}
            ${pinField('authPin2', 'PIN wiederholen', false)}
            <div id="authMessage" class="auth-message"></div>
            <button type="submit" class="main-action-button" id="authInviteBtn">PIN speichern und anmelden</button>
        </form>`;
    ['authPin1', 'authPin2'].forEach(id => { const el = document.getElementById(id); el.addEventListener('input', () => { el.value = el.value.replace(/\D/g, '').slice(0, 6); if (id === 'authPin1' && el.value.length === 6) document.getElementById('authPin2').focus(); }); });
    document.getElementById('authInviteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (authBusy) return;
        const p1 = pinValue('authPin1'), p2 = pinValue('authPin2');
        if (p1.length !== 6) { authMsg('Die PIN muss aus 6 Ziffern bestehen.'); document.getElementById('authPin1').focus(); return; }
        if (p1 !== p2) { authMsg('Die beiden Eingaben stimmen nicht überein.'); document.getElementById('authPin2').value = ''; document.getElementById('authPin2').focus(); return; }
        authBusy = true; document.getElementById('authInviteBtn').disabled = true; authMsg('');
        try {
            const r = await postToServer('authAccept', { invite, pin: p1, deviceId: SYNC_DEVICE_ID });
            setAuthSession({ token: r.token, user: r.user, expires: r.expires });
            // Einladungs-Token aus der Adresse nehmen (Neuladen soll nicht wieder die Einladungsseite zeigen)
            try { const u = new URL(location.href); u.searchParams.delete('einladung'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (err) { /* ignorieren */ }
            finishAuth();
        } catch (err) {
            authMsg(err.message || 'PIN konnte nicht gespeichert werden.');
            if (err.code === 'INVITE_INVALID') setTimeout(() => renderInviteError(err.message), 10);
        } finally { authBusy = false; const b = document.getElementById('authInviteBtn'); if (b) b.disabled = false; }
    });
    setTimeout(() => document.getElementById('authPin1').focus(), 50);
}
function renderInviteError(text) {
    authContentEl.innerHTML = `<h2 id="authTitle">Einladung</h2><div id="authMessage" class="auth-message is-error">${escapeHtml(text)}</div>`
        + '<button type="button" class="main-action-button" id="authToLoginBtn">Zur Anmeldung</button>';
    document.getElementById('authToLoginBtn').addEventListener('click', () => {
        try { const u = new URL(location.href); u.searchParams.delete('einladung'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (e) { /* ignorieren */ }
        showLoginPage();
    });
}

// ---- Abmelden ----
async function logout(automatic) {
    if (!automatic && !confirm('Abmelden?\n\nZum Weiterarbeiten ist danach die PIN nötig.')) return;
    closeSideMenu();
    const tok = authToken();
    setAuthSession(null);
    if (currentPage && currentPage.id === 'mitarbeiter') showHome();
    showLoginPage(automatic ? 'Automatisch abgemeldet – 30 Minuten keine Bedienung.' : '', 'info');
    if (tok) { try { await postToServer('authLogout', null, tok); } catch (e) { /* Sitzung ist lokal weg; serverseitig läuft sie spätestens nach 12 h ab */ } }
}

// ---- Administrator: Seite „Mitarbeiter“ ----
const adminState = { users: null, busy: false, notice: null };
function adminFmtTime(ms) { return ms ? new Date(ms).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'; }
async function adminLoadUsers() {
    try { const r = await postToServer('adminListUsers'); adminState.users = r.users || []; }
    catch (e) { adminState.users = []; adminState.notice = { kind: 'error', text: `Mitarbeiterliste konnte nicht geladen werden: ${e.message}` }; }
    if (currentPage && currentPage.id === 'mitarbeiter') renderCurrentPage(false);
}
function renderAdminPage() {
    setPageHeader('Mitarbeiter', adminState.users ? String(adminState.users.length) : '');
    const me = currentUser();
    const n = adminState.notice;
    let html = '<p class="page-note">Mitarbeiter einladen: Er bekommt eine E-Mail mit einem Link (48 Stunden gültig) und legt dort seine eigene 6-stellige PIN fest. '
        + '„PIN zurücksetzen“ schickt eine neue Einladung; „Sperren“ beendet sofort alle Anmeldungen des Mitarbeiters.</p>';
    if (n) html += `<div class="page-banner admin-notice is-${n.kind}"><span>${escapeHtml(n.text)}${n.link ? `<br><small>Link zum Weitergeben:</small> <code class="admin-link">${escapeHtml(n.link)}</code>` : ''}</span><button type="button" class="page-banner-btn" data-admin-dismiss="1">OK</button></div>`;
    html += `<form id="adminInviteForm" class="admin-invite" novalidate>
        <div class="form-group"><label for="adminName">Name</label><input type="text" id="adminName" autocomplete="off" placeholder="Vorname Nachname" maxlength="60"></div>
        <div class="form-group"><label for="adminEmail">E-Mail</label><input type="email" id="adminEmail" autocomplete="off" placeholder="name@firma.de" maxlength="120"></div>
        <button type="submit" class="main-action-button" id="adminInviteBtn" ${adminState.busy ? 'disabled' : ''}>Einladen</button>
    </form>`;
    if (!adminState.users) html += '<p class="page-note">Lade Mitarbeiter …</p>';
    else if (!adminState.users.length) html += '<p class="page-empty">Noch keine Mitarbeiter.</p>';
    else {
        html += '<h3 class="page-section-title">Mitarbeiter</h3><ul class="page-list admin-list">' + adminState.users.map(u => {
            const self = me && u.id === me.id;
            const state = !u.active ? '<span class="row-chip chip-danger">gesperrt</span>' : (!u.hasPin ? '<span class="row-chip chip-warn">Einladung offen</span>' : (u.locked ? '<span class="row-chip chip-warn">PIN-Sperre</span>' : '<span class="row-chip chip-ok">aktiv</span>'));
            const role = u.role === 'admin' ? '<span class="row-chip">Administrator</span>' : '';
            const meta = `${escapeHtml(u.email)} · letzte Anmeldung ${adminFmtTime(u.lastLogin)}${u.inviteOpen ? ` · Einladung gültig bis ${adminFmtTime(u.inviteExpires)}` : ''}`;
            const btns = self ? '<span class="admin-self">das bist du</span>'
                : `<button type="button" class="page-link-btn" data-admin-reset="${escapeHtml(u.id)}" ${adminState.busy ? 'disabled' : ''}>${u.hasPin ? 'PIN zurücksetzen' : 'Erneut einladen'}</button>`
                  + `<button type="button" class="page-link-btn ${u.active ? 'admin-danger' : ''}" data-admin-active="${escapeHtml(u.id)}" data-admin-to="${u.active ? '0' : '1'}" ${adminState.busy ? 'disabled' : ''}>${u.active ? 'Sperren' : 'Freigeben'}</button>`;
            return `<li class="page-row admin-row ${u.active ? '' : 'admin-inactive'}"><div class="admin-main"><div class="admin-name">${escapeHtml(u.name)}${role}${state}</div><div class="admin-meta">${meta}</div></div><div class="admin-actions">${btns}</div></li>`;
        }).join('') + '</ul>';
    }
    // Eingaben im Einladungsformular überleben ein Neuzeichnen (z. B. wenn die Liste nachträglich eintrifft)
    const keepName = document.getElementById('adminName')?.value || '', keepEmail = document.getElementById('adminEmail')?.value || '';
    pageContentEl.innerHTML = html;
    if (adminState.notice && adminState.notice.kind === 'ok') { /* Formular nach Erfolg leer */ }
    else { const a = document.getElementById('adminName'), b = document.getElementById('adminEmail'); if (a) a.value = keepName; if (b) b.value = keepEmail; }
    if (!adminState.users) adminLoadUsers();
    const form = document.getElementById('adminInviteForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); adminInvite(); });
}
async function adminRun(action, payload, okText) {
    if (adminState.busy) return;
    adminState.busy = true; adminState.notice = null; renderCurrentPage(false);
    try {
        const r = await postToServer(action, payload);
        adminState.users = r.users || adminState.users;
        const inv = r.invited;
        if (inv && !inv.mailSent) adminState.notice = { kind: 'warning', text: `${okText} – die E-Mail an ${inv.email} konnte nicht gesendet werden (${inv.mailError || 'unbekannt'}). Bitte den Link persönlich weitergeben.`, link: inv.link };
        else adminState.notice = { kind: 'ok', text: inv ? `${okText} – E-Mail an ${inv.email} gesendet.` : okText };
    } catch (e) { adminState.notice = { kind: 'error', text: e.message }; }
    finally { adminState.busy = false; if (currentPage && currentPage.id === 'mitarbeiter') renderCurrentPage(false); }
}
function adminInvite() {
    const name = (document.getElementById('adminName')?.value || '').trim(), email = (document.getElementById('adminEmail')?.value || '').trim();
    if (name.length < 2) { adminState.notice = { kind: 'error', text: 'Bitte einen Namen angeben.' }; renderCurrentPage(false); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { adminState.notice = { kind: 'error', text: 'Bitte eine gültige E-Mail-Adresse angeben.' }; renderCurrentPage(false); return; }
    adminRun('adminInvite', { name, email }, `${name} eingeladen`);
}

function showSyncOk() {
    setSyncIndicator('ok', 'Synchronisiert');
    if (errorDisplayEl.textContent === SYNC_FAILED_MESSAGE) clearError();
}

// Wird von allen Stellen aufgerufen, die etwas geändert haben (Signatur unverändert):
// 1) lokal speichern  2) geänderte/gelöschte Sendungen vormerken  3) an den Server schicken
async function saveShipments(shipments) {
    Object.values(shipments).forEach(ensureItemIds);
    const snap = readSnapshot();
    const pending = readPending();
    const me = currentUserName();
    Object.keys(shipments).forEach(b => {
        if (snap[b] === JSON.stringify(shipments[b])) return;
        // lokal geändert → sofort sichtbar, wer es war (der Server setzt den Namen beim Speichern endgültig)
        if (me && shipments[b] && typeof shipments[b] === 'object' && shipments[b].lastModifiedBy !== me) shipments[b].lastModifiedBy = me;
        if (snap[b] !== JSON.stringify(shipments[b])) pending.changed[b] = true;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(shipments));
    // Verschwundene Sendungen bekommen einen Löschvermerk, wenn der Server sie kennt (Ausgangsstand) ODER kennen könnte (Änderung
    // vorgemerkt bzw. gerade unterwegs) – sonst käme eine eben erst angelegte und sofort wieder gelöschte Sendung beim nächsten Abruf zurück.
    Object.keys(pending.changed).forEach(b => { if (!(b in shipments)) { delete pending.changed[b]; pending.deleted[b] = true; } });
    Object.keys(snap).forEach(b => { if (!(b in shipments)) pending.deleted[b] = true; });
    writePending(pending);

    await flushPendingChanges();
}

// Schickt alles Vorgemerkte an den Server; läuft nie doppelt parallel.
// Offline (navigator.onLine = false): nichts versuchen, warten – das Ereignis „online“ (startSyncPolling) stößt das Senden an.
// Reihenfolge: die Warteschlange (pending.order) wird von vorn abgearbeitet; aufeinanderfolgende Löschungen bzw. Änderungen
// gehen gebündelt in je einem Aufruf (Server-Skript hält die mitgeschickte Reihenfolge ein). Bricht die Verbindung ab,
// bleibt der Rest stehen und wird nach der Rückkehr in derselben Reihenfolge gesendet.
async function flushPendingChanges() {
    if (syncInFlight) { syncQueued = true; return; }
    if (!hasPending()) return;
    if (isAuthViewOpen()) { syncQueued = true; return; } // wird nach der Anmeldung nachgeholt (ensureLoggedIn → pollNow)
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { showOfflineWaiting(); return; }

    syncInFlight = true;
    setSyncIndicator('busy', 'Wird synchronisiert …');
    try {
        if (serverIsLegacy) {
            // Altes Backend: kompletter Datensatz wie früher
            await postToServer('saveAllData', loadShipments());
            writeSnapshotFrom(loadShipments());
            writePending({ changed: {}, deleted: {}, order: [] });
        } else {
            // Warteschlange in Gruppen: [{ kind: 'delete'|'change', bases: [...] }, …] in Änderungsreihenfolge
            const groups = [];
            const p0 = readPending();
            p0.order.forEach(b => {
                [['delete', p0.deleted[b]], ['change', p0.changed[b]]].forEach(([kind, on]) => {
                    if (!on) return;
                    const last = groups[groups.length - 1];
                    if (last && last.kind === kind) last.bases.push(b); else groups.push({ kind, bases: [b] });
                });
            });
            for (const g of groups) {
                if (g.kind === 'delete') await sendDeletes(g.bases);
                else await sendChanges(g.bases);
            }
        }
        if (!hasPending()) showSyncOk();
    } catch (error) {
        syncLastErrorAt = Date.now();
        console.warn("Server-Synchronisierung fehlgeschlagen:", error.message);
        if (isAuthError(error)) {
            setSyncIndicator('error', 'Anmeldung erforderlich – Daten sind lokal gespeichert'); // Anmeldeseite ist bereits offen (postToServer)
        } else if (isUnknownActionError(error) && !serverIsLegacy) {
            serverIsLegacy = true; displayError(SYNC_LEGACY_MESSAGE, 'orange'); syncQueued = true;
        } else if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            showOfflineWaiting();
        } else {
            setSyncIndicator('error', 'Server nicht erreichbar – Daten sind lokal gespeichert');
            displayError(SYNC_FAILED_MESSAGE, 'red');
        }
    } finally {
        syncInFlight = false;
        if (syncQueued) { syncQueued = false; flushPendingChanges(); }
        if (lkwStatusPending()) flushLkwStatus();
    }
}
function pendingCount(p) { p = p || readPending(); return p.order.length; }
function showOfflineWaiting() {
    const n = pendingCount();
    setSyncIndicator('error', `Offline – ${n === 1 ? '1 Änderung wartet' : n + ' Änderungen warten'} (werden gesendet, sobald Netz da ist)`);
}

// Löschungen (Tombstones), damit kein anderes Gerät die Sendung wiederbelebt – möglichst alle in EINEM Aufruf
// (Server-Skript ab 2.4), sonst einzeln wie bisher. Bestätigte Einträge verlassen die Warteschlange sofort.
async function sendDeletes(delBases) {
    delBases = delBases.slice();
    if (delBases.length > 1 && serverHasBatchDelete) {
        try {
            await postToServer('deleteShipments', { baseNumbers: delBases, modifiedBy: currentUserName() });
            const p = readPending(); const s = readSnapshot();
            delBases.forEach(b => { delete p.deleted[b]; delete s[b]; });
            writePending(p); writeSnapshot(s);
            delBases = [];
        } catch (e) {
            if (!isUnknownActionError(e)) throw e;
            serverHasBatchDelete = false;   // älteres Server-Skript → einzeln
        }
    }
    for (const b of delBases) {
        await postToServer('deleteShipment', { baseNumber: b, modifiedBy: currentUserName() });
        const p = readPending(); delete p.deleted[b]; writePending(p);
        const s = readSnapshot(); delete s[b]; writeSnapshot(s);
    }
}

// Geänderte Sendungen (9.3): je Sendung Stand + Ausgangsstand (3-Wege-Merge) + Version, auf der er beruht (versions)
// + Name (modifiedBy) + Reihenfolge (order). Antwort: merged = jetzt gültiger Stand, conflicts = was nicht zusammenpasste.
async function sendChanges(changedBases) {
    const local = loadShipments();
    const snap = readSnapshot();
    const toSend = {}, bases = {}, versions = {}, sentJson = {}, order = [];
    changedBases.forEach(b => {
        if (!local[b]) return;
        toSend[b] = local[b];
        sentJson[b] = JSON.stringify(local[b]);
        bases[b] = snap[b] ? JSON.parse(snap[b]) : null; // Ausgangsstand für den 3-Wege-Merge
        versions[b] = baseVersionOf(snap[b]);
        order.push(b);
    });
    if (order.length === 0) { const p = readPending(); changedBases.forEach(b => { delete p.changed[b]; }); writePending(p); return; }
    const r = await postToServer('saveShipments', { shipments: toSend, bases, versions, modifiedBy: currentUserName(), order, deviceId: SYNC_DEVICE_ID });

    // Zusammengeführten Stand übernehmen (enthält ggf. Scans anderer Geräte, Version, Name, Protokoll)
    const merged = r.merged || {};
    const after = loadShipments(); const snapNow = readSnapshot(); const p = readPending();
    let touched = false;
    Object.keys(merged).forEach(b => {
        const mj = JSON.stringify(merged[b]);
        if (JSON.stringify(after[b]) === sentJson[b]) {
            // lokal seit dem Senden unverändert → Server-Stand ist jetzt unser Stand
            snapNow[b] = mj;
            if (mj !== sentJson[b]) { after[b] = merged[b]; touched = true; }
            delete p.changed[b];
        }
        // sonst: währenddessen weiter geändert → bleibt vorgemerkt, wird mit altem Ausgangsstand erneut gesendet
    });
    changedBases.forEach(b => { if (!toSend[b]) delete p.changed[b]; });
    writeSnapshot(snapNow); writePending(p);
    { let k = false; Object.keys(merged).forEach(b => { if (archiveKnownBases.delete(b)) k = true; }); if (k) saveArchiveKnownBases(); } // gespeichert = (wieder) aktiv
    if (touched) { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(after)); refreshViewsAfterRemoteChange(); }
    if (Array.isArray(r.conflicts) && r.conflicts.length) showConflicts(r.conflicts);
    // Hinweis: die Server-Version wird bewusst NUR beim Abruf (pullRemoteChanges) weitergeschaltet,
    // sonst würden zwischenzeitliche Änderungen anderer Geräte übersprungen.
}

// Konflikt anzeigen: Welche Sendung, wer gleichzeitig geändert hat, was jetzt gilt. Nichts wird still verworfen –
// die Meldung bleibt stehen, bis die nächste Meldung sie ersetzt; das Protokoll (Startseite → „Protokoll“) hält es fest.
let lastConflicts = [];
function conflictText(c) {
    const who = c.serverBy ? ` – gleichzeitig von ${c.serverBy} geändert` : '';
    const parts = [];
    (c.lost || []).forEach(l => parts.push(`${l.what}: jetzt ${l.now} (deine Eingabe ${l.mine} nicht übernommen)`));
    (c.overridden || []).forEach(o => parts.push(`${o.what}: jetzt ${o.now} (Eingabe ${o.theirs}${c.serverBy ? ' von ' + c.serverBy : ''} überschrieben)`));
    return `Konflikt bei ${c.base}${who}: ${parts.join('; ') || 'Stände zusammengeführt'}. Gültig ist Version ${c.newVersion}.`;
}
function showConflicts(conflicts) {
    lastConflicts = conflicts.slice(0, 20);
    const lines = conflicts.map(conflictText);
    const text = lines.length > 2 ? lines.slice(0, 2).join(' ') + ` (+${lines.length - 2} weitere, siehe Protokoll)` : lines.join(' ');
    console.warn('Sync-Konflikt:', text);
    if (typeof displayError === 'function') displayError(text, 'orange');
}

// Übernimmt Sendungen vom Server in den lokalen Bestand.
// Sendungen mit lokal wartenden Änderungen werden NICHT angefasst (sie gehen beim Senden durch den Server-Merge).
function applyServerShipments(changed, deleted, fullSet, archived) {
    const local = loadShipments();
    const pending = readPending();
    const snap = readSnapshot();
    let touched = false, skipped = false, knownChanged = false;
    Object.keys(changed || {}).forEach(b => {
        if (archiveKnownBases.delete(b)) knownChanged = true; // wieder aktiv (z. B. von einem anderen Gerät wiederhergestellt)
        if (pending.changed[b] || pending.deleted[b]) { skipped = true; return; }
        ensureItemIds(changed[b]);
        const serverJson = JSON.stringify(changed[b]);
        snap[b] = serverJson;
        if (JSON.stringify(local[b]) !== serverJson) { local[b] = changed[b]; touched = true; }
    });
    (deleted || []).forEach(b => {
        if (archiveKnownBases.delete(b)) knownChanged = true;
        if (pending.changed[b]) { skipped = true; return; }
        delete snap[b];
        if (b in local) { delete local[b]; touched = true; }
    });
    // Vom Server archiviert → vom Gerät nehmen (bleibt im Sheet, per Archivsuche erreichbar).
    // Mit lokal wartender Änderung NICHT anfassen: unser Senden macht die Sendung auf dem Server ohnehin wieder aktiv.
    (archived || []).forEach(b => {
        if (pending.changed[b] || pending.deleted[b]) return;
        if (!archiveKnownBases.has(b)) { archiveKnownBases.add(b); knownChanged = true; }
        delete snap[b];
        if (b in local) { delete local[b]; touched = true; }
    });
    if (knownChanged) saveArchiveKnownBases();
    if (fullSet) { // kompletter Bestand: alles Unbekannte entfernen (außer lokal Vorgemerktes)
        Object.keys(local).forEach(b => {
            if (!(b in changed) && !pending.changed[b]) { delete local[b]; delete snap[b]; touched = true; }
        });
    }
    writeSnapshot(snap);
    if (touched) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
        refreshViewsAfterRemoteChange();
    }
    return { touched, skipped };
}

function applyServerLkwStatus(status, requestedAt) {
    if (!status || typeof status !== 'object') return;
    // Eigene Änderung noch unbestätigt oder gerade unterwegs → unser Stand ist neuer. Ebenso ein Abruf, der VOR der letzten Bestätigung
    // gestartet wurde: der Server kann ihn vor unserem Speichern beantwortet haben (Abruf läuft ohne Sperre), die Antwort käme dann zu spät an.
    if (lkwStatusPending() || lkwStatusSaveInFlight > 0 || (requestedAt !== undefined && requestedAt < lkwStatusLastAckAt)) return;
    const json = JSON.stringify(status);
    if (json === JSON.stringify(loadLkwStatus())) return;
    localStorage.setItem(LKWSTATUSKEY, json);
    refreshViewsAfterRemoteChange();
}

// Oberfläche nach Fremdänderung aktualisieren – ohne den Nutzer zu stören
function refreshViewsAfterRemoteChange() {
    const msg = errorDisplayEl.textContent, msgColor = errorDisplayEl.style.color;
    if (typeof renderTable === 'function') renderTable();
    if (typeof renderLkwMenu === 'function') renderLkwMenu();
    const detailOpen = detailViewEl && !detailViewEl.classList.contains('hidden');
    const editing = currentDetailsDivEl && currentDetailsDivEl.querySelector('.inline-note-editor');
    if (detailOpen && !editing) {
        const base = currentDetailsDivEl.dataset.base || '';   // auch HU-Listen-Aufträge (MAN/VW), nicht nur Einzelsendungen
        if (base && loadShipments()[base]) {
            displayCurrentShipmentDetails(base);
            if (msg) { errorDisplayEl.textContent = msg; errorDisplayEl.style.color = msgColor; } // Meldung nicht wegwischen
        }
    }
}

// Änderungen anderer Geräte abholen
async function pullRemoteChanges() {
    if (syncInFlight || document.hidden || isAuthViewOpen()) return;
    // Während der Stückzahl-Abfrage für eine NEUE Sendung nicht abrufen: die Sendung wird gleich lokal neu angelegt
    // und soll dann per Vereinigung (nicht per Ausgangsstand) mit einer evtl. gleichzeitig angelegten Fremd-Sendung zusammenlaufen.
    if (document.querySelector('#newTotalSection.visible')) return;
    syncInFlight = true;
    try {
        if (serverIsLegacy) {
            const r = await postToServer('loadAllData');
            applyServerShipments(r.data || {}, [], true);
        } else {
            const requestedAt = Date.now();
            const r = await postToServer('loadChanges', { sinceVersion: getSyncVersion() });
            if (r.full && Array.isArray(r.archivedBases)) setArchiveKnownBases(r.archivedBases);
            const skipped = applyServerShipments(r.changed || {}, r.deleted || [], !!r.full, r.archived || []).skipped;
            applyServerLkwStatus(r.lkwStatus, requestedAt);
            // Wurde eine Fremdänderung wegen lokal wartender Änderungen übersprungen, Version NICHT weiterschalten –
            // sie wird beim nächsten Abruf erneut geliefert (und ist dann nach dem Server-Merge längst enthalten).
            if (!skipped) setSyncVersion(r.version);
        }
        syncPollFailures = 0; syncPollDelay = SYNC_POLL_INTERVAL_MS;
        if (!hasPending()) showSyncOk();
    } catch (error) {
        console.warn("Abruf der Änderungen fehlgeschlagen:", error.message);
        syncPollFailures++;
        syncPollDelay = Math.min(syncPollDelay * 2, SYNC_POLL_MAX_INTERVAL_MS); // Server nicht mit Anfragen fluten
        if (isAuthError(error)) setSyncIndicator('error', 'Anmeldung erforderlich'); // Anmeldeseite ist bereits offen (postToServer)
        else if (isUnknownActionError(error) && !serverIsLegacy) { serverIsLegacy = true; displayError(SYNC_LEGACY_MESSAGE, 'orange'); }
        else if (typeof navigator !== 'undefined' && navigator.onLine === false && hasPending()) showOfflineWaiting(); // offline mit Warteschlange: das sagen, nicht „Server nicht erreichbar“
        else if (syncPollFailures >= 2) setSyncIndicator('error', 'Server nicht erreichbar'); // ein einzelner Aussetzer flackert nicht rot
    } finally {
        syncInFlight = false;
        if (syncQueued || hasPending()) { syncQueued = false; flushPendingChanges(); }
        if (lkwStatusPending()) flushLkwStatus();   // z. B. nach Verbindungsfehler oder Anmeldung nachsenden
    }
}

function scheduleNextPoll() {
    if (syncPollTimer) clearTimeout(syncPollTimer);
    syncPollTimer = setTimeout(async () => {
        try { await pullRemoteChanges(); } finally { scheduleNextPoll(); }
    }, syncPollDelay);
}
// Sofort abrufen (Vordergrund, Netz zurück) – und den Takt wieder auf den Grundwert setzen
function pollNow() {
    syncPollDelay = SYNC_POLL_INTERVAL_MS;
    if (syncPollTimer) clearTimeout(syncPollTimer);
    pullRemoteChanges().finally(scheduleNextPoll);
}
function startSyncPolling() {
    scheduleNextPoll();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pollNow(); });
    window.addEventListener('online', pollNow);
}

function waitForSyncIdle(maxMs = 20000) {
    return new Promise(resolve => {
        const t0 = Date.now();
        (function check() { if (!syncInFlight || Date.now() - t0 > maxMs) resolve(); else setTimeout(check, 100); })();
    });
}

// Start: kompletten Stand laden; lokal vorgemerkte (offline erfasste) Änderungen bleiben erhalten
async function loadDataFromServer() {
    console.log("Versuche Daten vom Server zu laden...");
    const localRaw = (() => { try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'); } catch (e) { return {}; } })();
    try {
        let serverData, version = null;
        try {
            const r = await postToServer('loadChanges', { sinceVersion: 0 });
            serverData = r.changed || {}; version = r.version;
            Object.values(serverData).forEach(ensureItemIds);
            applyServerLkwStatus(r.lkwStatus);
            lkwStatusFetched = !!(r.lkwStatus && typeof r.lkwStatus === 'object');
            setArchiveKnownBases(r.archivedBases || []); // Server ohne Archiv-Funktion → leere Liste
        } catch (e) {
            if (!isUnknownActionError(e)) throw e;
            serverIsLegacy = true;
            const r = await postToServer('loadAllData');
            serverData = r.data || {};
            Object.values(serverData).forEach(ensureItemIds);
            setArchiveKnownBases([]);
            displayError(SYNC_LEGACY_MESSAGE, 'orange');
        }
        const pending = readPending();
        const data = Object.assign({}, serverData);
        Object.keys(pending.changed).forEach(b => { if (localRaw[b]) data[b] = localRaw[b]; });
        Object.keys(pending.deleted).forEach(b => { delete data[b]; });
        { let k = false; Object.keys(pending.changed).concat(Object.keys(pending.deleted)).forEach(b => { if (archiveKnownBases.delete(b)) k = true; }); if (k) saveArchiveKnownBases(); }
        // Ausgangsstand = Serverstand (für Sendungen mit wartenden Änderungen bleibt der alte Ausgangsstand erhalten)
        const oldSnap = readSnapshot(); const snap = {};
        Object.keys(serverData).forEach(b => { snap[b] = pending.changed[b] && oldSnap[b] ? oldSnap[b] : JSON.stringify(serverData[b]); });
        writeSnapshot(snap);
        if (version !== null) setSyncVersion(version);
        console.log("Daten erfolgreich vom Server geladen.");
        return data;
    } catch (error) {
        console.error("Fehler beim Laden vom Server:", error);
        if (isAuthError(error)) { setSyncIndicator('error', 'Anmeldung erforderlich'); return localRaw; }
        displayError("Keine Serververbindung. Lade lokale Daten.", 'orange', 4000);
        setSyncIndicator('error', 'Server nicht erreichbar');
        return localRaw;
    }
}
// Gibt es mindestens einen HU-Listen-Auftrag (MAN/VVL) mit aktivem LKW? Nur dann ist „HU steht auf keiner Liste“
// eine sinnvolle Aussage – ohne Listen würde sonst jeder Scan als unerwartet gelten (und piepen).
function hasActiveHuListOrders() {
    const shipments = loadShipments();
    return Object.values(shipments).some(s => s && s.isHuListOrder && isLkwActive(s.truckId));
}
function isHuExpected(huNumber) {
    const upperHu = huNumber.trim().toUpperCase();
    if (!upperHu) return true;

    const shipments = loadShipments();

    // Zuerst prüfen, ob es überhaupt HU-Listen-Aufträge gibt
    for (const baseNumber in shipments) {
        const shipment = shipments[baseNumber];
        if (shipment.isHuListOrder && shipment.scannedItems) {
            // NEU: Wenn der LKW deaktiviert ist, wird er hier komplett übersprungen
            if (!isLkwActive(shipment.truckId)) continue; 
            
            if (shipment.scannedItems.some(item => item.rawInput.toUpperCase() === upperHu)) {
                return true;
            }
        }
    }

    // Die HU wurde in keiner der existierenden und aktiven Listen gefunden. Sie ist "unerwartet".
    return false;
}



    