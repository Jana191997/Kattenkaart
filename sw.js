// KattenKaart Service Worker
// Versie ophogen bij elke deploy zodat de cache ververst wordt
const CACHE = 'kattenkaart-v1';

const PRECACHE = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lato:wght@300;400;700&display=swap',
];

// Installeer: precache de core bestanden
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// Activeer: verwijder oude caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first voor statische assets, network-first voor API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Nominatim / Supabase API calls: altijd netwerk (nooit cachen)
  if (url.hostname.includes('nominatim') ||
      url.hostname.includes('supabase') ||
      url.hostname.includes('openstreetmap.org')) {
    return; // laat door zonder cache
  }

  // OpenStreetMap tiles: cache voor offline kaartweergave
  if (url.hostname.includes('tile.openstreetmap.org')) {
    e.respondWith(
      caches.open('osm-tiles').then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const response = await fetch(e.request);
          cache.put(e.request, response.clone());
          return response;
        } catch {
          return cached || new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // Alle andere requests: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});

// Push notifications (klaar voor later gebruik met Supabase)
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'KattenKaart', {
      body: data.body || 'Nieuwe melding',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'Bekijk' },
        { action: 'close', title: 'Sluiten' }
      ]
    })
  );
});

// Klik op notificatie opent de app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'open' || !e.action) {
    e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
  }
});
