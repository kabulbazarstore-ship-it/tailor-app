const CACHE_NAME = 'tailor-cache-v31'; // نسخه به v31 ارتقا یافت تا کش قدیمی پاک شود

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './activate.html',
  './admin.html',
  './backup.html',
  './bulk.html',
  './cutting.html',
  './accounting.html',
  './finance.html',
  './guide.json',
  './loans.html',
  './machine-guide.html',
  './manifest.json',
  './more.html',
  './office.html',
  './owner.html',
  './patterns.json',
  './payment.html',
  './production.html',
  './profile.html',
  './report.html',
  './retail.html',
  './samples.html',
  './students.html',
  './support.html',
  './assets/logo-192.png',
  './assets/logo-512.png'
];

/* ==================== INSTALL ==================== */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('⚠️ کش نشد:', url, err.message);
          })
        )
      );
      console.log('✅ کش جدید نصب شد:', CACHE_NAME);
    })
  );
  self.skipWaiting();
});

/* ==================== ACTIVATE ==================== */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== CACHE_NAME)
          .map((n) => {
            console.log('🗑 کش قدیمی پاک شد:', n);
            return caches.delete(n);
          })
      )
    )
  );
  self.clients.claim();
});

/* ==================== FETCH ==================== */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  if (req.method !== 'GET') return;
  if (!url.startsWith('http')) return;

  // Firebase و Google رو کش نمی‌کنیم
  if (
    url.includes('firebaseio.com') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firebaseapp.com')
  ) {
    return;
  }

  const accept = req.headers.get('accept') || '';
  const isHTML = accept.includes('text/html');
  const isNavigation = req.mode === 'navigate';

  /* ---------- HTML و ناوبری: Network-First (اول از اینترنت، بعد کش) ---------- */
  if (isHTML || isNavigation) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(async () => {
          const cached = (await caches.match(req)) || (await caches.match('./index.html'));
          return cached || new Response('آفلاین هستید', { status: 503 });
        })
    );
    return;
  }

  /* ---------- بقیه فایل‌ها: Cache-First (اول از کش، بعد اینترنت) ---------- */
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        fetch(req)
          .then((res) => {
            if (res && res.status === 200 && res.type === 'basic') {
              caches.open(CACHE_NAME).then((c) => c.put(req, res));
            }
          })
          .catch(() => {});
        return cached;
      }

      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => {
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});
