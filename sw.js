// KattenKaart Service Worker — minimale versie
// Doet niets behalve zichzelf registreren, zodat de PWA werkt
// Uitgebreide caching kan later worden ingeschakeld

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', () => {});
