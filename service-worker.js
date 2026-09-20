// Minimal service worker — mainly here to satisfy "installable app" requirements
// and give a basic offline fallback. Squad/chat data still needs a live connection,
// so this doesn't make the app fully offline-capable, just keeps the shell loadable.
const CACHE = 'roster-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', './index.html']).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Real push notifications — shows an OS-level notification even if the app
// tab isn't open or focused, as long as the browser process is running.
self.addEventListener('push', (event) => {
  let data = { title: 'Roster', body: '' };
  try { data = event.data ? event.data.json() : data; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Roster', {
      body: data.body || '',
      icon: 'icon.svg',
      badge: 'icon.svg',
      tag: 'roster-notification',
      data: data.data || null
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickData = event.notification.data;
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // If Roster's already open, just tell it what to do — faster than reloading.
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if (clickData) client.postMessage({ type: 'notification-click', data: clickData });
          return;
        }
      }
      // Not open anywhere — open it fresh, passing the same info via the URL
      // so the app can act on it as soon as it loads.
      if (self.clients.openWindow) {
        let url = './';
        if (clickData && clickData.type === 'call' && clickData.squadId) {
          url = './?join=' + encodeURIComponent(clickData.squadId);
        }
        return self.clients.openWindow(url);
      }
    })
  );
});
