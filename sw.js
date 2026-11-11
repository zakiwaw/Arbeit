// Service Worker des Fracht Trackers – macht die App offline startbar.
//
// Was er tut:
//  - Beim Installieren legt er alle App-Dateien (PRECACHE) in einen Cache, der nach der App-Version benannt ist.
//  - Bei einer neuen Version (anderer APP_VERSION-Wert → anderer Cache-Name) wird der alte Cache beim Aktivieren gelöscht.
//  - Anfragen nach App-Dateien beantwortet er „Netz zuerst“: Online kommt immer die aktuelle Datei vom Server (und
//    landet im Cache); ohne Netz oder bei hängender Verbindung (Zeitlimit) kommt die Datei aus dem Cache.
//    So bleibt das Verhalten online wie bisher (keine veralteten Dateien), und offline öffnet sich die App trotzdem.
//  - Alles, was nicht App-Datei ist – vor allem die POST-Aufrufe zum Google-Apps-Script (Sync, Scans, Anmeldung) –
//    fasst er NICHT an. Der Offline-Puffer der App (unbestätigte Änderungen im localStorage, Nachschicken beim nächsten
//    Abruf/„online“) arbeitet also unverändert.
//
// APP_VERSION hier und in js/01-start.js müssen gleich sein (tests/versioncheck.js prüft das). Registriert wird er in index.html.
const APP_VERSION = '9.7';
const CACHE_PREFIX = 'fracht-tracker-';
const CACHE_NAME = CACHE_PREFIX + APP_VERSION;
const NETWORK_TIMEOUT_MS = 6000;                 // „verbunden, aber kein Internet“ darf den Start nicht endlos blockieren
const PRECACHE = [
  './', 'index.html', 'manifest.webmanifest',
  'css/01-grundlagen.css', 'css/02-scan-batch.css', 'css/03-liste-seiten.css',
  'css/04-details-menue-modals.css', 'css/05-feedback-anmeldung-desktop.css', 'css/06-darkmode-js-klassen.css',
  'js/01-start.js', 'js/02-sync-anmeldung.js', 'js/03-toene-helfer.js',
  'js/04-sendungsdetails.js', 'js/05-liste-archiv.js', 'js/06-seiten.js',
  'js/07-import-erfassen.js', 'js/08-scan-batch.js', 'js/09-pdf.js',
  'js/10-menue-events-start.js',
  'assets/vendor/jspdf.umd.min.js', 'assets/vendor/jspdf.plugin.autotable.min.js', 'assets/vendor/qrcode.min.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/apple-touch-icon.png',
  'assets/error-sound.mp3', 'assets/nachlieferung-sound.mp3'
];
const SCOPE_PATH = new URL(self.registration ? self.registration.scope : './', self.location.href).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache: 'reload' – beim Vorladen am HTTP-Cache des Browsers vorbei, damit wirklich die neue Version im Cache liegt
      .then(cache => cache.addAll(PRECACHE.map(u => new Request(new URL(u, self.location.href).href, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                                  // POST zum Backend u. a. → unverändert ans Netz
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)) return;   // nur eigene App-Dateien
  if (url.pathname.endsWith('/sw.js')) return;                       // der Worker selbst wird vom Browser aktualisiert
  event.respondWith(networkFirst(req, url));
});

// Cache-Schlüssel ohne Suchteil: index.html?seite=…&lkw=… ist dieselbe Datei
function cacheKey(url) {
  const clean = new URL(url.href); clean.search = ''; clean.hash = '';
  return clean.href;
}

async function networkFirst(req, url) {
  const key = cacheKey(url);
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetchWithTimeout(req, NETWORK_TIMEOUT_MS);
    if (res && res.ok && res.type === 'basic' && !req.headers.has('range')) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) return req.headers.has('range') ? rangeFromCache(hit, req.headers.get('range')) : hit;
    if (req.mode === 'navigate') {                                   // z. B. /Arbeit/ ohne index.html im Pfad
      const index = await cache.match(new URL('index.html', self.location.href).href);
      if (index) return index;
    }
    throw err;
  }
}

function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Zeitlimit')), ms);
    fetch(req).then(res => { clearTimeout(timer); resolve(res); }, err => { clearTimeout(timer); reject(err); });
  });
}

// Tondateien werden von <audio> teilweise mit „Range“ angefordert – aus dem Cache den passenden Ausschnitt liefern (206)
async function rangeFromCache(hit, rangeHeader) {
  const buf = await hit.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader || '');
  if (!m) return new Response(buf, { status: 200, headers: hit.headers });
  const start = m[1] ? parseInt(m[1], 10) : Math.max(0, buf.byteLength - parseInt(m[2], 10));
  const end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), buf.byteLength - 1) : buf.byteLength - 1;
  const headers = new Headers(hit.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${buf.byteLength}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers });
}
