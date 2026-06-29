const CACHE_NAME = 'gradea-v2';
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/checklist',
  '/temperatures',
  '/offline.html',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // Never cache API calls

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL))
      )
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'GradeA Alert';
  const options = {
    body: data.body || 'You have a new alert.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'gradea-alert',
    data: { url: data.url || '/dashboard' },
    actions: [
      { action: 'view', title: 'View Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    vibrate: data.severity === 'critical' ? [200, 100, 200, 100, 200] : [200],
    requireInteraction: data.severity === 'critical',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Background sync (submit offline checklist when back online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checklist') {
    event.waitUntil(syncOfflineChecklists());
  }
});

async function syncOfflineChecklists() {
  const db = await openDB();
  const tx = db.transaction('offline_checklists', 'readonly');
  const store = tx.objectStore('offline_checklists');
  const items = await store.getAll();

  for (const item of items) {
    try {
      await fetch('/api/checklists/staff/' + item.token + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      const deleteTx = db.transaction('offline_checklists', 'readwrite');
      await deleteTx.objectStore('offline_checklists').delete(item.id);
    } catch {
      // Will retry on next sync
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('gradea-offline', 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('offline_checklists', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}
