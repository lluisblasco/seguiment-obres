// Service worker: l'app funciona sense connexió.
// Estratègia "primer la xarxa": si el servidor respon, s'agafa la versió nova i es guarda; si no, es fa servir la guardada.
const CACHE = 'seguiment-obres-v6';
const BASE = ['./', 'index.html', 'css/app.css', 'css/vistes.css', 'manifest.webmanifest',
  'js/main.js', 'js/rutes.js', 'js/util.js', 'js/model.js', 'js/db.js', 'js/seed.js', 'js/fotos.js',
  'js/ui/arrencada.js', 'js/ui/shell.js', 'js/ui/icones.js', 'js/ui/inici.js', 'js/ui/obra.js', 'js/ui/element.js',
  'js/ui/dibuix.js', 'js/ui/reparacions.js', 'js/ui/config.js',
  'fonts/inter-400.woff2', 'fonts/inter-500.woff2', 'fonts/inter-600.woff2', 'fonts/inter-700.woff2',
  'icons/icona-192.png', 'icons/icona-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    // cache:'no-cache' → sempre pregunta al servidor si hi ha versió nova (evita quedar-se amb l'antiga)
    fetch(req, { cache: 'no-cache' }).then(resp => {
      if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return resp;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
