// اسم ذاكرة التخزين المؤقت
const CACHE_NAME = 'tranZEUS-cache-v1';

// قائمة الملفات الأساسية لتخزينها مؤقتًا
const urlsToCache = [
  '/',
  'index.html',
  'translator.html',
  'محرر.html',
  'glossary_editor.html',
  'batch_translator.html',
  'manifest.json',
  
  // ملفات CSS
  'style.css',
  'translator.css',
  'batch_styles.css',
  'glossary_editor.css',
  
  // ملفات JS
  'config.js',
  'translator_core.js',
  'app.js',
  'batch_translator.js',
  'glossary_editor.js',
  'jszip.min.js',

  // الأيقونات
  'icons/icon-152x152.png',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// 1. تثبيت الـ Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. تفعيل الـ Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. اعتراض طلبات الشبكة (Fetch)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // إذا وجد في ذاكرة التخزين المؤقت، أعده
        if (response) {
          return response;
        }
        // وإلا، اطلبه من الشبكة
        return fetch(event.request);
      }
    )
  );
});